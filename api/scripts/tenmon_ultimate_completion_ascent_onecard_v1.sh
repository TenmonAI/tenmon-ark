#!/usr/bin/env bash
# TENMON_ULTIMATE_COMPLETION_ASCENT_ONECARD_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_ULTIMATE_COMPLETION_ASCENT_ONECARD_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
if [[ "${TENMON_ULTIMATE_ASCENT_SYMLINK_CARD_LOG:-}" == "1" ]]; then
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
echo "[LOG_DIR] $LOG_DIR"

set +e
python3 "$API/automation/tenmon_ultimate_completion_ascent_onecard_v1.py" \
  --repo-root "$ROOT" \
  --log-dir "$LOG_DIR" \
  --stdout-json \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/ultimate_completion_summary.json"
echo "[SUMMARY_LOG] $LOG_DIR/ultimate_completion_summary.json"
echo "[RC] $RC"
exit "$RC"
