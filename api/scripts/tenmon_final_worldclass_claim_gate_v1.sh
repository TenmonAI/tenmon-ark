#!/usr/bin/env bash
# TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[API] $API"

echo "[STEP] build"
(cd "$API" && npm run build)

echo "[STEP] latest rejudge"
set +e
bash "$API/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
REJUDGE_RC=$?
set -e
echo "[STEP] latest rejudge rc=$REJUDGE_RC (non-zero tolerated for gate evaluation)"

echo "[STEP] single-source seal"
set +e
bash "$API/scripts/tenmon_final_single_source_seal_v1.sh"
SS_RC=$?
set -e
echo "[STEP] single-source rc=$SS_RC (non-zero tolerated for gate evaluation)"

echo "[STEP] operable seal"
set +e
bash "$API/scripts/tenmon_final_operable_seal_v1.sh"
OP_RC=$?
set -e
echo "[STEP] operable rc=$OP_RC (non-zero tolerated for gate evaluation)"

set +e
python3 "$API/automation/tenmon_final_worldclass_claim_gate_v1.py" --repo-root "$ROOT" --stdout-json "$@"
RC=$?
set -e
echo "[JSON] $API/automation/tenmon_final_worldclass_claim_gate.json"
echo "[REPORT] $API/automation/tenmon_final_worldclass_claim_gate_report.md"
if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] PASS worldclass claim gate"
else
  echo "[RESULT] FAIL worldclass claim gate"
fi
exit "$RC"
