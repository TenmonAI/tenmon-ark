#!/usr/bin/env bash
# api/systemd/install-mc-timers.sh
# Install and enable MC systemd timers on VPS
# Usage: sudo bash install-mc-timers.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

echo "[MC] Installing systemd units..."

for unit in mc-collect-live mc-collect-git mc-build-handoff mc-collect-all; do
  echo "  Installing ${unit}.service + ${unit}.timer"
  cp "${SCRIPT_DIR}/${unit}.service" "${SYSTEMD_DIR}/"
  cp "${SCRIPT_DIR}/${unit}.timer" "${SYSTEMD_DIR}/"
done

echo "[MC] Reloading systemd daemon..."
systemctl daemon-reload

echo "[MC] Enabling and starting timers..."
for unit in mc-collect-live mc-collect-git mc-build-handoff mc-collect-all; do
  systemctl enable "${unit}.timer"
  systemctl start "${unit}.timer"
  echo "  ${unit}.timer: $(systemctl is-active ${unit}.timer)"
done

echo "[MC] Running initial collection..."
systemctl start mc-collect-all.service || echo "  (initial collection may fail if API not running)"

echo "[MC] Timer status:"
systemctl list-timers --no-pager | grep mc-

echo "[MC] Installation complete."
