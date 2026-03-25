#!/usr/bin/env bash
# TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
if ! mkdir -p "$LOG_DIR" 2>/dev/null; then
  LOG_ROOT="${TENMON_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}/api/automation/out/logs"
  LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
  mkdir -p "$LOG_DIR"
fi
if [[ "${TENMON_REFRESH_ONECARD_SYMLINK:-}" == "1" ]]; then
  ln -sfn "$LOG_DIR" "/var/log/tenmon/card_${CARD}_latest"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
export TENMON_GATE_BASE="${TENMON_GATE_BASE:-http://127.0.0.1:3000}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[BASE] $TENMON_GATE_BASE"
echo "[LOG_DIR] $LOG_DIR"

set +e
python3 "$API/automation/tenmon_final_completion_and_worldclass_refresh_onecard_v1.py" \
  --repo-root "$ROOT" \
  --base "$TENMON_GATE_BASE" \
  --log-dir "$LOG_DIR" \
  --stdout-json \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_final_completion_worldclass_refresh_summary.json"
echo "[SUMMARY_LOG] $LOG_DIR/tenmon_final_completion_worldclass_refresh_summary.json"
echo "[RC] $RC"
exit "$RC"
