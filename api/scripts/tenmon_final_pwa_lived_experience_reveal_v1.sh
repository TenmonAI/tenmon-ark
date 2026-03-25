#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_FINAL_PWA_LIVED_EXPERIENCE_REVEAL_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

say(){ printf '\n===== %s =====\n' "$1"; }

wait_http() {
  local url="$1"
  local tries="${2:-45}"
  local i=0
  while [ "$i" -lt "$tries" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i+1))
    sleep 1
  done
  return 1
}

say "CARD / IDENTITY"
echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] /opt/tenmon-ark-repo"
echo "[API]  $API"
echo "[BASE] $BASE"
git -C "$ROOT" rev-parse --short HEAD | tee "$DIR/git_sha_short.txt"
git -C "$ROOT" rev-parse HEAD | tee "$DIR/git_sha_full.txt"
git -C "$ROOT" status --short | tee "$DIR/git_status.txt" || true

say "BUILD / RESTART / HEALTH / AUDIT"
(
  cd "$API"
  npm run build
) | tee "$DIR/build.log"

sudo systemctl restart tenmon-ark-api.service
sudo systemctl status tenmon-ark-api.service --no-pager | tee "$DIR/systemctl_status.txt"
sudo journalctl -u tenmon-ark-api.service -n 120 --no-pager | tee "$DIR/journal_tail.txt"

wait_http "$BASE/health" 45 || true
wait_http "$BASE/api/audit" 45 || true
wait_http "$BASE/api/audit.build" 45 || true

curl -fsS "$BASE/health" | tee "$DIR/health.json" || echo '{"ok":false}' > "$DIR/health.json"
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" || echo '{"ok":false}' > "$DIR/audit.json"
curl -fsS "$BASE/api/audit.build" | tee "$DIR/audit_build.json" || echo '{"ok":false}' > "$DIR/audit_build.json"

say "PWA LIVED EXPERIENCE PY"
python3 "$API/automation/tenmon_final_pwa_lived_experience_reveal_v1.py" "$API" "$DIR" "$BASE" | tee "$DIR/python_stdout.json"

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"
echo
echo "[RUN_LOG] $DIR/run.log"
