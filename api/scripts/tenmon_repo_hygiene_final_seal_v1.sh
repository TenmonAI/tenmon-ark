#!/usr/bin/env bash
# TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
CARD_LEGACY="TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
if [[ "${TENMON_HYGIENE_FINAL_SEAL_SYMLINK_CARD_LOG:-}" == "1" ]]; then
  ln -sfn "$LOG_DIR" "/var/log/tenmon/card_${CARD}_latest"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD (alias: $CARD_LEGACY)"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[API] $API"

WG_PRE="$LOG_DIR/pre_watchdog_snapshot.json"
if [[ -f "$API/automation/tenmon_repo_hygiene_watchdog_verdict.json" ]]; then
  cp -a "$API/automation/tenmon_repo_hygiene_watchdog_verdict.json" "$WG_PRE" || true
  echo "[SNAPSHOT] $WG_PRE"
fi

set +e
python3 "$API/automation/tenmon_repo_hygiene_final_seal_v1.py" --repo-root "$ROOT" --stdout-json "$@"
RC=$?
set -e

echo "[VERDICT] $API/automation/tenmon_repo_hygiene_final_seal_verdict.json"
echo "[REPORT] $API/automation/tenmon_repo_hygiene_final_seal_report.md"
echo "[SUMMARY] $API/automation/tenmon_repo_hygiene_final_seal_summary.json"
if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] watchdog_clean_or_ok"
else
  echo "[RESULT] watchdog_still_blocking_rc=$RC"
fi
exit "$RC"
