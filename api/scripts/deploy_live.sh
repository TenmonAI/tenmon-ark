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
echo "[deploy] wait 127.0.0.1:3000/api/audit"
OK=""
for i in $(seq 1 30); do
  if curl -fsS -m 1 http://127.0.0.1:3000/api/audit >/dev/null; then OK="1"; break; fi
  sleep 0.2
done
test -n "$OK" || { echo "[deploy] FAIL: api not ready after retry"; exit 1; }
  curl -fsS http://127.0.0.1:3000/api/audit | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null
else
  curl -fsS http://127.0.0.1:3000/api/audit | grep -q 'BUILD_MARK:DET_RECALL_V1'
fi

echo "[deploy] smoke"
bash /opt/tenmon-ark-repo/api/scripts/smoke.sh

# [E0-DEPLOY-01] ensure live/node_modules symlink (prevent ERR_MODULE_NOT_FOUND)
echo "[deploy] ensure live/node_modules symlink"
LIVE_DIR="/opt/tenmon-ark-live"
REPO_API_NODE_MODULES="/opt/tenmon-ark-repo/api/node_modules"

if [ -d "$REPO_API_NODE_MODULES" ]; then
  rm -rf "$LIVE_DIR/node_modules" 2>/dev/null || true
  ln -sfn "$REPO_API_NODE_MODULES" "$LIVE_DIR/node_modules"
  # quick sanity: express must be resolvable from live
  (cd "$LIVE_DIR" && node -e "import('express').then(()=>console.log('[deploy] OK express')).catch(e=>{console.error(e);process.exit(1)})")
else
  echo "[deploy] WARN: repo/api/node_modules not found (skip symlink)"
fi
