#!/usr/bin/env bash
# TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1"
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

set +e
python3 "$API/automation/tenmon_fail_fast_campaign_governor_v1.py" --repo-root "$ROOT" --stdout-json "$@"
RC=$?
set -e
echo "[VERDICT] $API/automation/tenmon_fail_fast_campaign_governor_verdict.json"
echo "[REPORT] $API/automation/tenmon_fail_fast_campaign_governor_report.md"
if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] PASS campaign stop"
else
  echo "[RESULT] FAIL one more card allowed"
fi
exit "$RC"
