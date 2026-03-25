#!/usr/bin/env bash
# TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

CARD="TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_ROLLBACK_AUTOTRIGGER_LOG_ROOT:-/var/log/tenmon}"
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
python3 "$API/automation/tenmon_rollback_autotrigger_and_restore_v1.py" --repo-root "$REPO" "${EXTRA_PY[@]}"
RC=$?
set -e

echo "[EXIT] rollback_rc=$RC"

if [[ -f "$API/automation/tenmon_rollback_autotrigger_and_restore_verdict.json" ]]; then
  echo "--- tenmon_rollback_autotrigger_and_restore_verdict.json ---"
  cat "$API/automation/tenmon_rollback_autotrigger_and_restore_verdict.json"
  cp -f "$API/automation/tenmon_rollback_autotrigger_and_restore_verdict.json" "$LOG_DIR/" || true
fi
cp -f "$API/automation/tenmon_rollback_autotrigger_and_restore_report.md" "$LOG_DIR/" 2>/dev/null || true

exit "$RC"
