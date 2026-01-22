#!/usr/bin/env bash
set -euo pipefail

# Electron Linux SUID sandbox fixer
FILE="electron/node_modules/electron/dist/chrome-sandbox"

yarn constraints

# Only relevant on Linux
if [ "$(uname -s)" != "Linux" ]; then
  echo "[postinstall] Non-Linux OS detected; skipping sandbox permission fix."
  exit 0
fi

# If the binary isn't there yet (e.g., fresh install or different arch), skip
if [ ! -e "$FILE" ]; then
  echo "[postinstall] $FILE not found; nothing to do."
  exit 0
fi

# Cross-platform stat helpers (GNU coreutils and BSD/macOS variants)
get_owner() { stat -c '%U' "$1" 2>/dev/null || stat -f '%Su' "$1" 2>/dev/null; }
get_mode()  { stat -c '%a' "$1" 2>/dev/null || stat -f '%OLp' "$1" 2>/dev/null; }

current_owner="$(get_owner "$FILE" || true)"
current_mode="$(get_mode "$FILE"  || true)"

if [ "$current_owner" = "root" ] && [ "$current_mode" = "4755" ]; then
  echo "[postinstall] $FILE already owned by root and mode 4755; nothing to do."
  exit 0
fi

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "[postinstall] Need root privileges but 'sudo' is not available."
    echo "[postinstall] Please run manually: chown root \"$FILE\" && chmod 4755 \"$FILE\""
    exit 1
  fi
}

echo "[postinstall] Fixing ownership/permissions on $FILE (requires root)..."
run_as_root chown root "$FILE"
run_as_root chmod 4755 "$FILE"

# Verify
new_owner="$(get_owner "$FILE" || true)"
new_mode="$(get_mode "$FILE"  || true)"

if [ "$new_owner" = "root" ] && [ "$new_mode" = "4755" ]; then
  echo "[postinstall] Success: owner=root mode=4755"
  exit 0
else
  echo "[postinstall] Failed to set correct ownership/permissions (owner=$new_owner mode=$new_mode)."
  exit 1
fi
