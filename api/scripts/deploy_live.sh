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

if [ "${NO_RESTART:-}" = "1" ]; then
  echo "[deploy] NO_RESTART=1 (skip start)"
  exit 0
fi

echo "[deploy] start service"
sudo systemctl start tenmon-ark-api.service
sleep 0.3
echo "[deploy] verify listener"
sudo ss -lptn 'sport = :3000' || true
sudo journalctl -u tenmon-ark-api.service -n 30 --no-pager || true
echo "[deploy] audit gate"
if command -v jq >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:3000/api/audit | jq -e '.ok==true' >/dev/null
  curl -fsS http://127.0.0.1:3000/api/audit | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null
else
  curl -fsS http://127.0.0.1:3000/api/audit | grep -q 'BUILD_MARK:DET_RECALL_V1'
fi

echo "[deploy] smoke"
bash /opt/tenmon-ark-repo/api/scripts/smoke.sh
