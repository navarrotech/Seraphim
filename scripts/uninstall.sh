#!/usr/bin/env bash
# Remove the Seraphim host self-updater systemd timer (issue #346).
#
#   bash ./scripts/uninstall.sh
set -euo pipefail

SERVICE_NAME="seraphim-update"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"

log() { printf '[seraphim-uninstall] %s\n' "$*"; }

if ! command -v systemctl >/dev/null 2>&1; then
  log "systemd not found. If you installed a cron entry, remove it with 'crontab -e'."
  exit 0
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

$SUDO systemctl disable --now "${SERVICE_NAME}.timer" 2>/dev/null || true
$SUDO rm -f "$TIMER_PATH" "$SERVICE_PATH"
$SUDO systemctl daemon-reload

log "Removed the Seraphim self-updater timer and service."
