#!/usr/bin/env bash
# TENMON_AUTONOMY_OPERATIONS_LEVEL_MASTER_CHAIN_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

MASTER="TENMON_AUTONOMY_OPERATIONS_LEVEL_MASTER_CHAIN_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${MASTER}/${TS}"
if ! mkdir -p "$LOG_DIR" 2>/dev/null; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  API="$(cd "$SCRIPT_DIR/.." && pwd)"
  ROOT="$(cd "$API/.." && pwd)"
  LOG_DIR="${ROOT}/api/automation/out/logs/card_${MASTER}/${TS}"
  mkdir -p "$LOG_DIR"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $MASTER"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[LOG_DIR] $LOG_DIR"

set +e
python3 "$API/automation/tenmon_autonomy_operations_level_master_chain_v1.py" \
  --repo-root "$ROOT" \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_autonomy_operations_level_master_chain_summary.json"
echo "[REPORT] $API/automation/tenmon_autonomy_operations_level_master_chain_report.md"
exit "$RC"
