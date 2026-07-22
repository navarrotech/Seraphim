#!/usr/bin/env bash
# Install the Seraphim host self-updater as a systemd timer (issue #346).
#
# Registers a system service + timer that runs scripts/update.sh on an interval
# (default every 15 minutes), so the host keeps itself up to date. Both RHEL and
# Debian ship systemd, so a timer needs no extra packages; if systemd is absent,
# this prints ready-to-paste cron instructions instead.
#
#   bash ./scripts/install.sh            # install and start the timer
#   sudo bash ./scripts/install.sh       # same, if your user can't sudo unattended
#
# Uninstall with scripts/uninstall.sh.
set -euo pipefail

REPO_DIR="${SERAPHIM_REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
# How often to poll for updates, as a systemd time span (e.g. 15min, 1h).
INTERVAL="${SERAPHIM_UPDATE_INTERVAL:-15min}"
# The account the updater runs as. It must be in the docker group and able to run
# `docker compose`. Defaults to the invoking user (not root).
RUN_USER="${SERAPHIM_UPDATE_USER:-${SUDO_USER:-$USER}}"

SERVICE_NAME="seraphim-update"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"
UPDATE_SCRIPT="${REPO_DIR}/scripts/update.sh"

log() { printf '[seraphim-install] %s\n' "$*"; }

[ -f "$UPDATE_SCRIPT" ] || { echo "Cannot find $UPDATE_SCRIPT" >&2; exit 1; }
chmod +x "$UPDATE_SCRIPT"

# Prefer sudo only when we are not already root, so the script works both ways.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

# --- Fall back to cron instructions when systemd is unavailable ---------------
if ! command -v systemctl >/dev/null 2>&1; then
  cat >&2 <<EOF
[seraphim-install] systemd (systemctl) was not found on this host.

Install the updater with cron instead. Ensure cron is installed:
  RHEL:   sudo dnf install -y cronie && sudo systemctl enable --now crond
  Debian: sudo apt install -y cron   && sudo systemctl enable --now cron

Then add this line to your crontab ("crontab -e"), which runs the updater
every 15 minutes:
  */15 * * * * SERAPHIM_REPO_DIR='${REPO_DIR}' ${UPDATE_SCRIPT} >> /tmp/seraphim-update.log 2>&1
EOF
  exit 1
fi

log "Installing ${SERVICE_NAME}.service and .timer (runs as '${RUN_USER}', every ${INTERVAL})."

# The service is a oneshot that runs a single update pass. Config the updater
# reads from the environment is pinned here so timer runs match a manual run.
$SUDO tee "$SERVICE_PATH" >/dev/null <<EOF
[Unit]
Description=Seraphim host self-updater (one update pass)
Documentation=https://github.com/JalapenoLabs/Seraphim
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=${RUN_USER}
WorkingDirectory=${REPO_DIR}
Environment=SERAPHIM_REPO_DIR=${REPO_DIR}
ExecStart=${UPDATE_SCRIPT}
# A rebuild (docker compose --build) can run well past the 90s oneshot default,
# and the updater waits for the agent to drain; never time it out mid-update.
TimeoutStartSec=infinity
EOF

$SUDO tee "$TIMER_PATH" >/dev/null <<EOF
[Unit]
Description=Run the Seraphim host self-updater every ${INTERVAL}
Documentation=https://github.com/JalapenoLabs/Seraphim

[Timer]
OnBootSec=2min
OnUnitActiveSec=${INTERVAL}
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

$SUDO systemctl daemon-reload
$SUDO systemctl enable --now "${SERVICE_NAME}.timer"

log "Done. The updater is installed and scheduled."
log "Next runs:   systemctl list-timers ${SERVICE_NAME}.timer"
log "Run now:     sudo systemctl start ${SERVICE_NAME}.service"
log "View logs:   journalctl -u ${SERVICE_NAME}.service -f"
log "Uninstall:   bash ${REPO_DIR}/scripts/uninstall.sh"
