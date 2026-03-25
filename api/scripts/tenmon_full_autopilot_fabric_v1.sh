#!/usr/bin/env bash
# TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1
# 単一起動点: manifest / state / verdict 束ね（証拠は /var/log/tenmon）
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

CARD="TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_FULL_AUTOPILOT_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"

STDOUT_JSON=0
EXTRA_PY=()
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
    *) EXTRA_PY+=("$__arg") ;;
  esac
done

mkdir -p "$LOG_DIR"
ln -sfn "$LOG_DIR" "${LOG_ROOT}/card_${CARD}" 2>/dev/null || true
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[LOG_DIR] $LOG_DIR"
echo "[REPO] $REPO"

export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$REPO}"

if [[ "$STDOUT_JSON" -eq 1 ]]; then
  EXTRA_PY+=(--stdout-json)
fi

set +e
python3 "$API/automation/tenmon_full_autopilot_fabric_v1.py" --repo-root "$REPO" "${EXTRA_PY[@]}"
RC=$?
set -e

echo "[EXIT] fabric_rc=$RC"

cp -f "$API/automation/tenmon_full_autopilot_verdict_v1.json" "$LOG_DIR/" 2>/dev/null || true
cp -f "$API/automation/tenmon_full_autopilot_retry_v1.json" "$LOG_DIR/" 2>/dev/null || true
cp -f "$API/automation/tenmon_full_autopilot_state_v1.json" "$LOG_DIR/" 2>/dev/null || true

exit "$RC"
