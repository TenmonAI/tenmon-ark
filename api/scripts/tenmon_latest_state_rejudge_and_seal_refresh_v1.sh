#!/usr/bin/env bash
# TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
if ! mkdir -p "$LOG_DIR" 2>/dev/null; then
  LOG_ROOT="${TENMON_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}/api/automation/out/logs"
  LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
  mkdir -p "$LOG_DIR"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${TENMON_GATE_BASE:-http://127.0.0.1:3000}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[API] $API"
echo "[BASE] $BASE"

cd "$API"
echo "== build =="
npm run build

echo "== cursor-local mode (no service restart) =="
echo "skip systemctl restart; use current local runtime at BASE"

echo "== short audit probes =="
curl -sS -i "$BASE/api/health" > "$LOG_DIR/health_raw.txt"
curl -sS "$BASE/api/audit" > "$LOG_DIR/audit_raw.json"
curl -sS "$BASE/api/audit.build" > "$LOG_DIR/audit_build_raw.json"

echo "== forensic orchestrator =="
set +e
python3 "$API/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py" \
  --repo-root "$ROOT" \
  --base "$BASE" \
  "$@"
RC=$?
set -e

echo "== artifacts =="
echo "$API/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
echo "$API/automation/tenmon_latest_state_rejudge_summary.json"
echo "$API/automation/tenmon_latest_state_rejudge_and_seal_refresh_report.md"

echo "== verdict tail =="
python3 - <<'PY'
import pathlib, json
p = pathlib.Path("/opt/tenmon-ark-repo/api/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
if p.exists():
    j = json.loads(p.read_text())
    print(json.dumps(j, ensure_ascii=False, indent=2))
else:
    print("verdict missing")
PY

exit "$RC"
