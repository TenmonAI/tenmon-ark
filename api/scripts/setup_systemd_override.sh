#!/usr/bin/env bash
set -euo pipefail

# systemd override.conf を作成して WorkingDirectory と DB パスを固定
# 実行: sudo bash api/scripts/setup_systemd_override.sh

LIVE="/opt/tenmon-ark-live"
DATA_DIR="/opt/tenmon-ark-data"
OVERRIDE_DIR="/etc/systemd/system/tenmon-ark-api.service.d"
OVERRIDE_FILE="$OVERRIDE_DIR/override.conf"

echo "[setup] create systemd override directory"
sudo mkdir -p "$OVERRIDE_DIR"

echo "[setup] create override.conf"
sudo tee "$OVERRIDE_FILE" > /dev/null <<EOF
[Service]
WorkingDirectory=$LIVE
Environment=TENMON_DATA_DIR=$DATA_DIR
EOF

echo "[setup] create data directory"
sudo mkdir -p "$DATA_DIR"

echo "[setup] reload systemd daemon"
sudo systemctl daemon-reload

echo "[setup] restart service"
sudo systemctl restart tenmon-ark-api.service

echo "[setup] verify DB paths in logs"
echo "---- [DB] ready logs (should show $LIVE/db/...) ----"
sudo journalctl -u tenmon-ark-api.service -n 80 --no-pager | grep '\[DB\] ready' || true

echo "[setup] verify WorkingDirectory"
echo "---- systemctl show WorkingDirectory ----"
sudo systemctl show tenmon-ark-api.service -p WorkingDirectory || true

echo "[PASS] systemd override setup complete"
