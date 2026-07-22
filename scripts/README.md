# Seraphim host scripts

Wrappers the operator runs on the host that hosts the Docker stack.

| Script | Platform | Purpose |
|---|---|---|
| `start.sh` / `stop.sh` / `restart.sh` | Linux, macOS, Git Bash | Bring the compose stack up, down, or restart it. |
| `update.sh` / `update.ps1` | Linux + macOS / Windows | Run one safe self-update pass. |
| `install.sh` / `install.ps1` | Linux (systemd) / Windows | Install the updater to run on a timer. |
| `uninstall.sh` / `uninstall.ps1` | Linux / Windows | Remove the scheduled updater. |

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
