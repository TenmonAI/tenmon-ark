#!/usr/bin/env bash
# TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
if [[ "${TENMON_FINAL_SINGLE_SOURCE_SEAL_SYMLINK:-}" == "1" ]]; then
  ln -sfn "$LOG_DIR" "/var/log/tenmon/card_${CARD}_latest"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"

echo "[STEP] build"
(cd "$API" && npm run build)

echo "[STEP] latest rejudge"
set +e
bash "$API/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
REJUDGE_RC=$?
set -e
echo "[STEP] latest rejudge rc=$REJUDGE_RC (non-zero tolerated for seal evaluation)"

set +e
python3 "$API/automation/tenmon_final_single_source_seal_v1.py" --repo-root "$ROOT" "$@"
RC=$?
set -e

echo "[OUTPUT] $API/automation/tenmon_final_single_source_seal.json"
echo "[REPORT] $API/automation/tenmon_final_single_source_seal_report.md"
if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] PASS seal or worldclass claim ready"
else
  echo "[RESULT] FAIL not seal_ready / not worldclass_claim_ready"
fi
exit "$RC"
