#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"

echo "[deploy] build in repo"
cd "$REPO"
pnpm -s build

echo "[deploy] stop service (prevent dist swap while running)"
sudo systemctl stop tenmon-ark-api.service || true
sleep 0.2

echo "[deploy] sync dist to live (atomic swap)"
sudo mkdir -p "$LIVE"
sudo rm -rf "$LIVE/dist.new"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/dist.new/"

# 原子入替（dist が壊れた瞬間を作らない）
if [ -d "$LIVE/dist" ]; then
  sudo rm -rf "$LIVE/dist.bak"
  sudo mv "$LIVE/dist" "$LIVE/dist.bak"
fi
sudo mv "$LIVE/dist.new" "$LIVE/dist"

echo "[deploy] start service"
sudo systemctl start tenmon-ark-api.service
sleep 0.3
echo "[deploy] verify listener"
sudo ss -lptn 'sport = :3000' || true
sudo journalctl -u tenmon-ark-api.service -n 30 --no-pager || true