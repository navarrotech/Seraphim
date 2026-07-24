#!/usr/bin/env bash
# Boot a throwaway backend for UI visual review (issue #351).
#
# Data-backed pages (the repositories page, the board, task views) need a live API
# with some data to review in a browser. This wires the pieces the agent otherwise
# starts by hand: a throwaway PostgreSQL 17 (via `pg-ephemeral`), the API built and
# run against it, a few seeded dev repositories, and a board of dev tasks spread
# across every column. Pair it with the frontend dev server (`cd frontend && yarn
# dev`), which proxies `/api` to this backend, then drive the visual self-review loop.
#
# Verbs mirror `pg-ephemeral`, and every command returns (the API runs in the
# background), so it scripts cleanly:
#   dev-api.sh up          start PG, run the API, seed repos + board tasks (default)
#   dev-api.sh seed        re-seed the dev repos and board tasks against the running API
#   dev-api.sh seed-tasks  re-seed only the board tasks
#   dev-api.sh logs        tail the API log
#   dev-api.sh down        stop the API, leave PG running for a fast restart
#   dev-api.sh stop        stop the API and PG
#   dev-api.sh reset       stop the API and delete the PG data dir for a clean slate
#
# The data is disposable dev fixtures only; never point this at production data.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${SERAPHIM_DEV_API_URL:-http://localhost:27182}"
API="${API_URL%/}/api/v1"
PID_FILE="${SERAPHIM_DEV_PID_FILE:-/tmp/seraphim-dev-api.pid}"
LOG_FILE="${SERAPHIM_DEV_LOG_FILE:-/tmp/seraphim-dev-api.log}"
# Cargo honors CARGO_TARGET_DIR; fall back to the crate's default target dir.
TARGET_DIR="${CARGO_TARGET_DIR:-${REPO_DIR}/api/target}"
API_BIN="${TARGET_DIR}/debug/seraphim-api"
# How long to wait for the freshly launched API to answer /ping, in seconds.
HEALTH_TIMEOUT="${SERAPHIM_DEV_HEALTH_TIMEOUT:-60}"

log() { printf '[dev-api] %s\n' "$*"; }
die() { printf '[dev-api] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

api_healthy() {
  curl -fsS --max-time 3 "${API}/ping" >/dev/null 2>&1
}

api_pid() {
  [ -f "$PID_FILE" ] && cat "$PID_FILE" 2>/dev/null || true
}

api_running() {
  local pid
  pid="$(api_pid)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# --- Seed data ---------------------------------------------------------------

# A handful of dev repositories with varied fields, so the repositories page shows
# real variety (enabled/disabled, issue-sync on/off, a review policy, a setup
# script, labels). Upsert is keyed on full_name, so re-seeding is idempotent.
seed_repos() {
  api_healthy || die "the API is not responding at ${API_URL}; run 'dev-api.sh up' first."
  log "Seeding dev repositories..."
  local payloads=(
    '{"full_name":"JalapenoLabs/yearloom","clone_url":"https://github.com/JalapenoLabs/yearloom.git","default_branch":"main","setup_script":"yarn install","review_policy":"auto_squash_merge","enabled":true,"sync_issues":true,"issue_labels":["agent"]}'
    '{"full_name":"JalapenoLabs/plunder","clone_url":"https://github.com/JalapenoLabs/plunder.git","default_branch":"develop","setup_script":"yarn install","review_policy":"auto_squash_merge","enabled":true,"sync_issues":true,"setup_script_always_run":true}'
    '{"full_name":"MooreslabAI/runewood","clone_url":"https://github.com/MooreslabAI/runewood.git","default_branch":"main","review_policy":"human_review","enabled":true,"sync_issues":false}'
    '{"full_name":"acme/legacy-api","clone_url":"https://github.com/acme/legacy-api.git","default_branch":"master","review_policy":"none","enabled":false,"sync_issues":false}'
  )
  local payload name
  for payload in "${payloads[@]}"; do
    name="$(printf '%s' "$payload" | sed -n 's/.*"full_name":"\([^"]*\)".*/\1/p')"
    if curl -fsS --max-time 10 -X POST "${API}/repos" \
      -H 'content-type: application/json' -d "$payload" >/dev/null; then
      log "  seeded ${name}"
    else
      die "failed to seed ${name} (is the API healthy?)"
    fi
  done
  log "Seeded ${#payloads[@]} dev repositories."
}

# Create an internal ticket and echo its id. Args: title, body. Every internal
# task lands in Available; the caller moves it onward. Uses jq to build the JSON
# and read the id back, so titles and bodies with punctuation stay safe.
create_task() {
  local title="$1" body="$2" id
  id="$(curl -fsS --max-time 10 -X POST "${API}/tasks" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg t "$title" --arg b "$body" '{title: $t, body: $b}')" \
    | jq -r '.id')" || die "failed to create task \"${title}\" (is the API healthy?)"
  [ -n "$id" ] && [ "$id" != "null" ] || die "task \"${title}\" created but returned no id."
  printf '%s' "$id"
}

# Place a card in a column at a rank. Args: id, column, position. Available cards
# need no move (create lands them there); every other column is reached this way.
move_card() {
  local id="$1" column="$2" position="$3"
  curl -fsS --max-time 10 -X POST "${API}/tasks/${id}/move" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg c "$column" --argjson p "$position" '{column: $c, position: $p}')" \
    >/dev/null || die "failed to move task ${id} to ${column}."
}

# Append an internal comment to a ticket. Args: id, author (user|agent), body.
comment_on() {
  local id="$1" author="$2" body="$3"
  curl -fsS --max-time 10 -X POST "${API}/tasks/${id}/comment" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg a "$author" --arg b "$body" '{author: $a, body: $b}')" \
    >/dev/null || die "failed to comment on task ${id}."
}

# Save the operator's private notes on a ticket. Args: id, notes.
set_notes_on() {
  local id="$1" notes="$2"
  curl -fsS --max-time 10 -X PUT "${API}/tasks/${id}/notes" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg n "$notes" '{notes: $n}')" \
    >/dev/null || die "failed to set notes on task ${id}."
}

# A board of internal tasks, one card in each column, so the kanban board shows a
# populated lane for every state (Available, To Do, In Progress, In Review, Done).
# The In Progress card also carries a two-way comment thread and operator notes, so
# the task view has real content to review. The live activity feed (Claude stream
# events) comes only from actual agent turns and cannot be seeded, so the comment
# thread stands in as that card's reviewable history.
#
# Unlike repositories (upserted on full_name), internal tickets have no natural key
# to upsert on, so re-seeding appends a fresh board rather than replacing it. Use
# `dev-api.sh reset` for a clean slate.
seed_tasks() {
  api_healthy || die "the API is not responding at ${API_URL}; run 'dev-api.sh up' first."
  require_cmd curl
  require_cmd jq
  log "Seeding dev board tasks..."

  # Available: two cards, no move needed (create lands them here and auto-stacks).
  create_task "Add a dark mode toggle to Settings" \
    "Operators want a dark theme. Add a toggle in Settings that persists the choice and respects the system preference by default." >/dev/null
  create_task "Write the on-call runbook" \
    "The recovery steps live only in people's heads. Capture them in docs/oncall.md so anyone can follow the playbook." >/dev/null
  log "  seeded 2 cards in Available"

  # To Do: queued for the agent to pick up next.
  local todo_id
  todo_id="$(create_task "Fix the flaky checkout integration test" \
    "The checkout test fails intermittently in CI, roughly one run in five. Track down the race and make it deterministic.")"
  move_card "$todo_id" todo 1.0
  log "  seeded 1 card in To Do"

  # In Progress: the rich card, with a comment thread and notes to review.
  local wip_id
  wip_id="$(create_task "Migrate file uploads to object storage" \
    "Uploads currently sit on the API host's local disk, which does not survive a redeploy. Move them to object storage and stream through a signed URL.")"
  move_card "$wip_id" in_progress 1.0
  comment_on "$wip_id" agent \
    "Starting on this. Plan: add an object-storage client behind the existing upload trait, then backfill the on-disk files in a one-off migration."
  comment_on "$wip_id" user \
    "Sounds right. Keep the local-disk path as a fallback until the backfill is verified, then remove it in a follow-up."
  comment_on "$wip_id" agent \
    "Done: uploads now write to object storage behind a signed URL, with the disk path kept as a fallback. Backfill migration is next."
  set_notes_on "$wip_id" "Verify the backfill against staging before dropping the local-disk fallback."
  log "  seeded 1 card in In Progress (with a comment thread and notes)"

  # In Review: a card with work awaiting sign-off.
  local review_id
  review_id="$(create_task "Add rate limiting to the public API" \
    "The public endpoints have no throttle. Add a per-client rate limit with a clear 429 response so a single caller cannot starve the others.")"
  move_card "$review_id" in_review 1.0
  log "  seeded 1 card in In Review"

  # Done: a finished card, so the terminal lane is not empty.
  local done_id
  done_id="$(create_task "Upgrade the database to Postgres 17" \
    "Move the stack from Postgres 16 to 17 and confirm the migrations, extensions, and backups all still work.")"
  move_card "$done_id" done 1.0
  log "  seeded 1 card in Done"

  log "Seeded 6 dev board tasks across every column."
}

# --- Lifecycle ---------------------------------------------------------------

start_api() {
  if api_healthy; then
    log "API already responding at ${API_URL}; reusing it."
    return 0
  fi

  require_cmd cargo
  require_cmd curl
  require_cmd pg-ephemeral

  log "Starting ephemeral PostgreSQL 17..."
  local database_url
  database_url="$(pg-ephemeral)" || die "pg-ephemeral failed to start (run as a non-root user)."

  log "Building the API (first build may take a while)..."
  ( cd "${REPO_DIR}/api" && cargo build --quiet --bin seraphim-api ) || die "cargo build failed."
  [ -x "$API_BIN" ] || die "built binary not found at ${API_BIN} (set CARGO_TARGET_DIR if you use a custom target dir)."

  log "Launching the API on ${API_URL}..."
  (
    cd "${REPO_DIR}/api"
    DATABASE_URL="$database_url" RUST_LOG="${RUST_LOG:-info,sqlx=warn}" \
      nohup "$API_BIN" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  log "Waiting for the API to become healthy..."
  local waited=0
  until api_healthy; do
    if ! api_running; then
      log "The API exited during startup. Last log lines:" >&2
      tail -n 20 "$LOG_FILE" >&2 || true
      die "API failed to start."
    fi
    if [ "$waited" -ge "$HEALTH_TIMEOUT" ]; then
      die "API did not become healthy within ${HEALTH_TIMEOUT}s (see ${LOG_FILE})."
    fi
    sleep 1
    waited=$((waited + 1))
  done
  log "API is up (pid $(api_pid), logs at ${LOG_FILE})."
}

stop_api() {
  local pid
  pid="$(api_pid)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    log "Stopped the API (pid ${pid})."
  else
    log "No tracked API process to stop."
  fi
  rm -f "$PID_FILE"
}

case "${1:-up}" in
  up | "")
    start_api
    seed_repos
    seed_tasks
    cat <<EOF
[dev-api] Ready. Next steps for visual review:
[dev-api]   1. In another terminal: cd frontend && yarn dev
[dev-api]   2. Open http://localhost:5173/ for the board, /repos for repositories
[dev-api]      (vite proxies /api to ${API_URL}; click a card to open its task view)
[dev-api]   3. When done: scripts/dev-api.sh down   (or 'stop' to also stop PG)
EOF
    ;;
  seed)
    seed_repos
    seed_tasks
    ;;
  seed-tasks)
    seed_tasks
    ;;
  logs)
    [ -f "$LOG_FILE" ] || die "no log file at ${LOG_FILE}; is the API running?"
    tail -f "$LOG_FILE"
    ;;
  down)
    stop_api
    ;;
  stop)
    stop_api
    pg-ephemeral stop || true
    log "Stopped PG (data dir kept; use 'reset' to delete it)."
    ;;
  reset)
    stop_api
    pg-ephemeral reset || true
    log "Reset: API stopped and PG data dir deleted."
    ;;
  *)
    die "usage: dev-api.sh [up|seed|seed-tasks|logs|down|stop|reset]"
    ;;
esac
