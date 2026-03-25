#!/usr/bin/env bash
# TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1
# 観測専用: git status --short を証拠として記録し、must_block_seal を単一 verdict に出す（自動削除なし）
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

CARD="TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_REPO_HYGIENE_WATCHDOG_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
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

echo "----- git status --short (証拠) -----"
git -C "$REPO" status --short | tee "$LOG_DIR/git_status_short.txt"

EXTRA_PY=()
if [[ "$STDOUT_JSON" -eq 1 ]]; then
  EXTRA_PY+=(--stdout-json)
fi

set +e
python3 "$API/automation/tenmon_repo_hygiene_watchdog_v1.py" "${EXTRA_PY[@]}" 2>&1 | tee "$LOG_DIR/watchdog_stdout.txt"
RC="${PIPESTATUS[0]}"
set -e

echo "[EXIT] watchdog_rc=$RC"

if [[ "$STDOUT_JSON" -eq 1 ]] && [[ -f "$API/automation/tenmon_repo_hygiene_watchdog_verdict.json" ]]; then
  echo "--- tenmon_repo_hygiene_watchdog_verdict.json ---"
  cat "$API/automation/tenmon_repo_hygiene_watchdog_verdict.json"
fi

cp -f "$API/automation/tenmon_repo_hygiene_watchdog_verdict.json" "$LOG_DIR/" 2>/dev/null || true
cp -f "$API/automation/tenmon_repo_hygiene_watchdog_report.md" "$LOG_DIR/" 2>/dev/null || true

exit "$RC"
