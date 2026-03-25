#!/usr/bin/env bash
# TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
mkdir -p "$LOG_ROOT" 2>/dev/null || LOG_ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}/api/automation/out/logs"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"

set +e
python3 "$API/automation/tenmon_operations_level_autonomy_v1.py" \
  --repo-root "$ROOT" \
  --base "${TENMON_GATE_BASE:-http://127.0.0.1:3000}" \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_operations_level_autonomy_summary.json"
echo "[REPORT] $API/automation/tenmon_operations_level_autonomy_report.md"
echo "[STATE] $API/automation/operations_level_autonomy_state_v1.json"
exit "$RC"
