# Seraphim host scripts

Wrappers the operator runs on the host that hosts the Docker stack.

| Script | Platform | Purpose |
|---|---|---|
| `start.sh` / `stop.sh` / `restart.sh` | Linux, macOS, Git Bash | Bring the compose stack up, down, or restart it. |
| `update.sh` / `update.ps1` | Linux + macOS / Windows | Run one safe self-update pass. |
| `install.sh` / `install.ps1` | Linux (systemd) / Windows | Install the updater to run on a timer. |
| `uninstall.sh` / `uninstall.ps1` | Linux / Windows | Remove the scheduled updater. |
| `dev-api.sh` | Linux, macOS, Git Bash | Boot a throwaway backend (ephemeral PG + API + seeded dev repos) for UI review. |

## Contributor git hooks (issue #394)

`install-git-hooks.sh` points this clone at the committed `.githooks/` directory
(`git config core.hooksPath .githooks`), so the `pre-commit` hook runs
`check-control-chars.py` on every commit. That catches a stray NUL or other
control byte from a paste artifact locally, before a push round-trips through
CI's **Source hygiene** job. Run it once per clone:

```sh
scripts/install-git-hooks.sh
```

The hook mirrors CI exactly (same script, same exit codes) and skips cleanly when
`python3` is absent. Bypass a single commit with `git commit --no-verify`.

## Self-updater (issue #346)

Keeps a deployment current with its branch. One pass:

1. Confirm the checkout is on an updatable branch (`main` or `develop`) and the
   working tree is clean.
2. `git fetch` and confirm the branch is behind its upstream (there is work to pull).
3. Wait for the agent to reach a lull (no To Do / In Progress / In Review action
   items), then pause it and wait for any in-flight turn to finish.
4. `git pull --ff-only`, then rebuild and relaunch the compose stack.
5. Resume the agent, unless the operator had it paused before the update.

The agent's "caught up" and "working" states come from `GET /api/v1/update/status`;
the pause/resume calls hit `POST /api/v1/settings/pause`. If the API is
unreachable, the update still runs (without the graceful pause).

### One-off

```bash
# Linux / macOS / Git Bash
bash ./scripts/update.sh
```

```powershell
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1
```

### Install on a timer

```bash
# Linux (systemd timer, default every 15 min). Uses sudo to write unit files.
bash ./scripts/install.sh
```

```powershell
# Windows (Scheduled Task, default every 15 min). Docker Desktop must be running.
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

On Linux the installer writes `/etc/systemd/system/seraphim-update.{service,timer}`
and enables the timer. If `systemctl` is absent it prints ready-to-paste cron
instructions instead (including how to install `cronie`/`cron`). Windows registers
a Scheduled Task named `SeraphimSelfUpdater`.

### Configuration

Both updaters read these environment variables (defaults in parentheses):

| Variable | Default | Meaning |
|---|---|---|
| `SERAPHIM_REPO_DIR` | the script's repo | Path to the Seraphim checkout to update. |
| `SERAPHIM_API_URL` | `http://localhost:27182` | API base URL for pause/status. |
| `SERAPHIM_UPDATE_BRANCHES` | `main develop` | Branches the updater may fast-forward. |
| `SERAPHIM_CAUGHT_UP_TIMEOUT` | `3600` | Seconds to wait for a lull before pausing anyway (`0` = forever). |
| `SERAPHIM_DRAIN_TIMEOUT` | `1800` | Seconds to wait for the current turn to finish after pausing. |
| `SERAPHIM_HEALTH_TIMEOUT` | `300` | Seconds to wait for the API after the rebuild before resuming. |
| `SERAPHIM_POLL_SECONDS` | `10` | Seconds between status polls while waiting. |

Installer-only knobs:

| Variable | Default | Meaning |
|---|---|---|
| `SERAPHIM_UPDATE_INTERVAL` (Linux) | `15min` | systemd time span between runs. |
| `SERAPHIM_UPDATE_INTERVAL_MINUTES` (Windows) | `15` | Minutes between runs. |
| `SERAPHIM_UPDATE_USER` (Linux) | invoking user | Account the timer runs as (must be in the `docker` group). |

### Requirements

`git`, `curl` (Linux), and Docker with the Compose plugin. The updater checks for
each and prints an install command if one is missing. systemd (`systemctl`) is
used on Linux and ships on RHEL and Debian; the Windows path uses the built-in
`ScheduledTasks` module.

## Dev backend for UI visual review (issue #351)

Data-backed pages (the repositories page, the board, task views) need a live API
with data to review in a browser. `dev-api.sh` wires up the pieces you would
otherwise start by hand: a throwaway PostgreSQL 17 (`pg-ephemeral`), the API built
and run against it, and a few seeded dev repositories. Pair it with the frontend
dev server, which proxies `/api` to this backend.

```bash
scripts/dev-api.sh up            # start PG, run the API, seed dev repos (default)
cd frontend && yarn dev          # in another terminal; serves the UI on :5173
# open http://localhost:5173/repos to review, then:
scripts/dev-api.sh down          # stop the API (keeps PG for a fast restart)
```

Verbs mirror `pg-ephemeral`, and every command returns (the API runs in the
background):

| Verb | Effect |
|---|---|
| `up` (default) | Start PG, build and run the API, seed dev repos. Idempotent: reuses a running API and re-seeds. |
| `seed` | Re-seed the dev repos against the running API. |
| `logs` | Tail the API log. |
| `down` | Stop the API; leave PG running for a fast restart. |
| `stop` | Stop the API and PG (keeps the PG data dir). |
| `reset` | Stop the API and delete the PG data dir for a clean slate. |

The seeded repositories are disposable dev fixtures with varied fields (enabled or
disabled, issue-sync on or off, a review policy, a setup script, labels), so the
page shows real variety. Requires `cargo`, `curl`, and `pg-ephemeral` (baked into
the workspace image). Overridable via `SERAPHIM_DEV_API_URL`,
`SERAPHIM_DEV_HEALTH_TIMEOUT`, `SERAPHIM_DEV_PID_FILE`, and `SERAPHIM_DEV_LOG_FILE`.
This is a local dev tool, never for production data.
