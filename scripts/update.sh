#!/usr/bin/env bash
# Keep a Seraphim host deployment up to date (issue #346).
#
# One safe, idempotent update pass:
#   1. Confirm the checkout is on an updatable branch (main/develop) and clean.
#   2. Fetch and confirm the branch is behind its upstream (there is work to pull).
#   3. Wait for the agent to reach a natural lull (nothing left to do), then pause
#      it so nothing new starts while the stack is coming down and back up.
#   4. git pull --ff-only, then rebuild and relaunch the compose stack.
#   5. Resume the agent, unless the operator had it paused before we started.
#
# Run it directly for a one-off update:  bash ./scripts/update.sh
# Install it to run on a timer instead:  bash ./scripts/install.sh
#
# Every knob is an environment variable with a sensible default, so the installer
# can pin them per host without editing this file. See scripts/README.md.
set -euo pipefail

# --- Configuration -----------------------------------------------------------

# The repo to update. Defaults to the checkout this script lives in.
REPO_DIR="${SERAPHIM_REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
# The API base URL (host port 27182 by default). Used to pause/resume the agent
# and read its "caught up" state; the update still runs if the API is unreachable.
API_URL="${SERAPHIM_API_URL:-http://localhost:27182}"
# Branches this updater is allowed to fast-forward. Space-separated.
UPDATE_BRANCHES="${SERAPHIM_UPDATE_BRANCHES:-main develop}"
# How long to wait for the agent to become caught up before pausing anyway, in
# seconds. 0 waits indefinitely. After the wait we still pause and drain the live
# turn, so a busy board updates at the next turn boundary rather than never.
CAUGHT_UP_TIMEOUT="${SERAPHIM_CAUGHT_UP_TIMEOUT:-3600}"
# How long to wait for the in-flight turn to finish after pausing, in seconds.
DRAIN_TIMEOUT="${SERAPHIM_DRAIN_TIMEOUT:-1800}"
# How long to wait for the API to come back healthy after the rebuild, in seconds.
HEALTH_TIMEOUT="${SERAPHIM_HEALTH_TIMEOUT:-300}"
# Seconds between status polls while waiting.
POLL_SECONDS="${SERAPHIM_POLL_SECONDS:-10}"

API="${API_URL%/}/api/v1"

# --- Helpers -----------------------------------------------------------------

log() {
  printf '%s [seraphim-update] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

# Ensure a required command exists, or explain how to install it and stop.
require_cmd() {
  local cmd="$1" hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "Missing required command: $cmd" >&2
    log "Install it, then re-run: $hint" >&2
    exit 1
  fi
}

# Read one top-level boolean field from a flat JSON response, without needing jq
# (the /update/status body is flat, so a targeted match is safe and dependency
# free). Prints "true", "false", or nothing when the field is absent.
json_bool() {
  local field="$1" body="$2"
  printf '%s' "$body" | grep -o "\"${field}\":[[:space:]]*\(true\|false\)" | head -n1 |
    grep -o '\(true\|false\)' || true
}

api_reachable() {
  curl -fsS --max-time 5 "${API}/ping" >/dev/null 2>&1
}

api_status() {
  curl -fsS --max-time 10 "${API}/update/status" 2>/dev/null || true
}

set_paused() {
  local paused="$1"
  curl -fsS --max-time 10 -X POST "${API}/settings/pause" \
    -H 'Content-Type: application/json' \
    -d "{\"paused\":${paused}}" >/dev/null 2>&1
}

# --- Preconditions -----------------------------------------------------------

require_cmd git "https://git-scm.com/downloads"
require_cmd curl "sudo dnf install curl  (RHEL)  |  sudo apt install curl  (Debian)"
require_cmd docker "https://docs.docker.com/engine/install/"
if ! docker compose version >/dev/null 2>&1; then
  die "The Docker Compose plugin is missing. Install it (see https://docs.docker.com/compose/install/)."
fi

cd "$REPO_DIR" || die "Repo directory not found: $REPO_DIR"
[ -d .git ] || die "$REPO_DIR is not a git checkout."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if ! printf '%s' " $UPDATE_BRANCHES " | grep -q " $BRANCH "; then
  log "On branch '$BRANCH', which is not in updatable branches ($UPDATE_BRANCHES). Nothing to do."
  exit 0
fi

# The working tree must be clean so a fast-forward never clobbers local edits.
if [ -n "$(git status --porcelain)" ]; then
  log "Working tree is not clean; refusing to update. Commit or stash local changes first."
  exit 0
fi

# --- Is there anything to pull? ----------------------------------------------

log "Fetching $BRANCH from origin..."
git fetch --quiet origin "$BRANCH" || die "git fetch failed (check network and repo access)."

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/${BRANCH}")"
BASE="$(git merge-base HEAD "origin/${BRANCH}")"

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Already up to date (${LOCAL:0:7}). Nothing to do."
  exit 0
fi
if [ "$LOCAL" != "$BASE" ]; then
  log "Local $BRANCH has diverged from origin (can't fast-forward); refusing to update. Reconcile manually."
  exit 0
fi
log "Update available: ${LOCAL:0:7} -> ${REMOTE:0:7}."

# --- Reach a stopping point, then pause --------------------------------------

# When we pause the agent ourselves, we resume it after the rebuild; when the
# operator already had it paused, we leave it paused.
was_paused="unknown"

if api_reachable; then
  status="$(api_status)"
  was_paused="$(json_bool agent_paused "$status")"
  [ -n "$was_paused" ] || was_paused="unknown"

  # Nudge the UI to re-check for updates so the "update available" indicator
  # reflects reality while we work (best effort).
  curl -fsS --max-time 10 -X POST "${API}/update/check" >/dev/null 2>&1 || true

  log "Waiting for the agent to catch up (no To Do / In Progress / In Review action items)..."
  waited=0
  while :; do
    status="$(api_status)"
    caught_up="$(json_bool agent_caught_up "$status")"
    [ "$caught_up" = "true" ] && { log "Agent is caught up."; break; }
    if [ "$CAUGHT_UP_TIMEOUT" -ne 0 ] && [ "$waited" -ge "$CAUGHT_UP_TIMEOUT" ]; then
      log "Still busy after ${CAUGHT_UP_TIMEOUT}s; pausing and draining the current turn instead."
      break
    fi
    sleep "$POLL_SECONDS"
    waited=$((waited + POLL_SECONDS))
  done

  log "Pausing the agent for the update."
  set_paused true || log "Could not pause the agent via the API; continuing anyway." >&2

  # Draining: pausing stops new work but never aborts the current turn, so wait
  # for any in-flight turn to finish before we take the stack down.
  log "Waiting for the current turn to finish..."
  waited=0
  while :; do
    status="$(api_status)"
    working="$(json_bool agent_working "$status")"
    [ "$working" != "true" ] && { log "No turn in flight."; break; }
    if [ "$waited" -ge "$DRAIN_TIMEOUT" ]; then
      log "Turn still running after ${DRAIN_TIMEOUT}s; proceeding with the update."
      break
    fi
    sleep "$POLL_SECONDS"
    waited=$((waited + POLL_SECONDS))
  done
else
  log "API not reachable at ${API_URL}; updating without pausing (the stack may be down)."
fi

# --- Pull and relaunch -------------------------------------------------------

log "Pulling latest source..."
git pull --ff-only --quiet origin "$BRANCH" || die "git pull failed."

log "Rebuilding and relaunching the stack..."
# start.sh stamps GIT_SHA/GIT_BRANCH/HOST_REPO_DIR and runs `docker compose up -d
# --build`, so reuse it rather than duplicating that logic here.
"$REPO_DIR/scripts/start.sh"

# --- Resume ------------------------------------------------------------------

if [ "$was_paused" = "false" ]; then
  log "Waiting for the API to come back healthy before resuming the agent..."
  waited=0
  while ! api_reachable; do
    if [ "$waited" -ge "$HEALTH_TIMEOUT" ]; then
      log "API did not become healthy within ${HEALTH_TIMEOUT}s; leaving the agent paused." >&2
      exit 0
    fi
    sleep "$POLL_SECONDS"
    waited=$((waited + POLL_SECONDS))
  done
  log "Resuming the agent."
  set_paused false || log "Could not resume the agent via the API; resume it from the UI." >&2
elif [ "$was_paused" = "true" ]; then
  log "Agent was paused before the update; leaving it paused."
fi

log "Update complete: now on ${REMOTE:0:7}."
