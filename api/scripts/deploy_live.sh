#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"

SERVICE="tenmon-ark-api"
PORT="3000"
BASE_URL="http://127.0.0.1:${PORT}"

MAX_RETRIES=60        # 60 * 0.2s = 12s
RETRY_INTERVAL=0.2

echo "[deploy] build in repo"
cd "$REPO"
pnpm -s build

echo "[deploy] sync dist to live (atomic swap)"
sudo mkdir -p "$LIVE"
sudo rm -rf "$LIVE/dist.new"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/dist.new/"

if [ -d "$LIVE/dist" ]; then
  sudo rm -rf "$LIVE/dist.bak"
  sudo mv "$LIVE/dist" "$LIVE/dist.bak"
fi
sudo mv "$LIVE/dist.new" "$LIVE/dist"

# build mark が live/dist に入っているか（これが無いなら deploy 失敗扱い）
echo "[deploy] verify build mark in live/dist"
grep -R "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1" "$LIVE/dist" >/dev/null \
  || { echo "[deploy] ERROR: build mark missing in live/dist"; exit 1; }

echo "[deploy] restart service (exactly once)"
sudo systemctl restart "$SERVICE"

echo "[deploy] wait for ${BASE_URL}/api/audit"
ok=0
for i in $(seq 1 "$MAX_RETRIES"); do
  if curl -fsS "${BASE_URL}/api/audit" >/dev/null 2>&1; then
    ok=1
    echo "[deploy] /api/audit ready (attempt $i/$MAX_RETRIES)"
    break
  fi
  sleep "$RETRY_INTERVAL"
done

if [ "$ok" -ne 1 ]; then
  echo "[deploy] ERROR: api did not come up"
  echo "[deploy] ss -lntp | grep :${PORT}"
  ss -lntp | grep ":${PORT}" || true
  echo "[deploy] systemctl status:"
  sudo systemctl status "$SERVICE" --no-pager -l || true
  echo "[deploy] journalctl (last 200 lines):"
  sudo journalctl -u "$SERVICE" -n 200 --no-pager || true
  exit 1
fi

echo "[deploy] audit gate: build mark"
if command -v jq >/dev/null 2>&1; then
  curl -fsS "${BASE_URL}/api/audit" \
    | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
else
  curl -fsS "${BASE_URL}/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1' \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
fi
echo "OK: audit gate"

echo "[deploy] smoke tests"
bash "$REPO/scripts/smoke.sh" || { echo "[deploy] ERROR: smoke tests failed"; exit 1; }

echo "[deploy] SUCCESS"
