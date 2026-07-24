# Self-update

> Decision record for keeping a deployment current. Current state and roadmap
> only, no history. `scripts/README.md` holds the operator how-to and every knob.

There are two ways to update a running Seraphim, both of which pause the agent
gracefully, pull the branch, rebuild the compose stack, and resume.

## In-app updater

Settings -> Updates drives this. The running image is stamped with `GIT_SHA` and
`GIT_BRANCH` (compose build args set by `scripts/start.sh` from host git). An
hourly check compares that stamp to the branch's latest commit through the GitHub
API. The "Update" button refuses while a turn is in progress, pauses the agent,
then launches a detached `docker:cli` updater container over the Docker socket
that bind-mounts the host repo (`HOST_REPO_DIR`), the socket, and `SSH_HOME` and
runs `git pull` plus `docker compose up -d --build`. Being outside the compose
project, the updater survives the API being rebuilt. The UI polls `/version` and
reloads when the commit changes. `HOST_REPO_DIR` is the only extra env this path
needs; the check works without it.

## Host self-updater

A host-side alternative for keeping a deployment current with no clicks.
`scripts/update.sh` (Linux, macOS, Git Bash) and `scripts/update.ps1` (Windows)
run one pass: only on `main` or `develop`, only when the tree is clean and behind
its upstream, they wait for the agent to reach a lull, pause it, drain the
in-flight turn, `git pull --ff-only`, relaunch the stack, then resume unless the
operator had it paused. The update still proceeds if the API is unreachable,
without the graceful pause. `scripts/install.sh` installs a systemd timer (or
prints cron instructions when `systemctl` is absent) and `scripts/install.ps1`
registers a Scheduled Task; the `uninstall.*` scripts remove them. This path does
its own pull and compose on the host, so it needs no `HOST_REPO_DIR` and no
updater container. Every knob is a `SERAPHIM_*` environment variable.

## Where it lives

- `api/src/update/`: the in-app version check and updater launch.
- `scripts/update.*`, `scripts/install.*`, `scripts/uninstall.*`: the host
  self-updater and its scheduler.
- `scripts/start.sh`, `scripts/stop.sh`, `scripts/restart.sh`: the compose
  wrappers.
- `scripts/README.md`: the full operator reference and the `SERAPHIM_*` knobs.
