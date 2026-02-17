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
OK=""
echo "[deploy] wait localhost /api/audit (post-smoke)"
for i in $(seq 1 50); do
  if curl -fsS -m 1 http://127.0.0.1:3000/api/audit >/dev/null; then OK="1"; break; fi
  sleep 0.2
done
test -n "$OK" || { echo "[deploy] FAIL: localhost audit not reachable after retry"; exit 1; }
  sleep 0.2
done
test -n "$OK" || { echo "[deploy] FAIL: api not ready after retry"; exit 1; }
#   curl -fsS http://127.0.0.1:3000/api/audit | jq -e '(.build.mark // \"\") | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null
else
  curl -fsS http://127.0.0.1:3000/api/audit | grep -q 'BUILD_MARK:DET_RECALL_V1'
fi

echo "[deploy] smoke"
POST_SMOKE_LOG="/tmp/tenmon_deploy_smoke_last.log"
echo "[deploy] POST_SMOKE: writing tail to $POST_SMOKE_LOG"
POST_SMOKE_LOG="/tmp/tenmon_deploy_smoke_last.log"
echo "[deploy] smoke (tee -> $POST_SMOKE_LOG)"
set +e
bash /opt/tenmon-ark-repo/api/scripts/smoke.sh 2>&1 | tee "$POST_SMOKE_LOG"
RC=${PIPESTATUS[0]}
set -e
if [ "$RC" -ne 0 ]; then echo "[deploy] FAIL smoke rc=$RC (see $POST_SMOKE_LOG)"; exit "$RC"; fi
{
  echo "[deploy] POST_SMOKE: audit:"; curl -fsS http://127.0.0.1:3000/api/audit | head -c 240; echo;
  echo "[deploy] POST_SMOKE: last journal:"; sudo journalctl -u tenmon-ark-api.service --no-pager -n 80 || true;
} >"$POST_SMOKE_LOG" 2>&1 || true
echo "[deploy] POST_SMOKE: saved $POST_SMOKE_LOG"
