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
echo "[NEXT_ON_PASS] TENMON_AUTONOMY_CONSTITUTION_SEAL_V1"
if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] hygiene_gate_ok seal_candidate_ready (see summary)"
else
  echo "[RESULT] blocked_or_incomplete_rc=$RC (2=gate 3=watchdog 4=unsafe 5=generated 6=system 7=rejudge 8=not_seal_candidate)"
  if [[ -f "$API/automation/retry_cursor_card_hint.md" ]]; then
    echo "[RETRY_HINT] $API/automation/retry_cursor_card_hint.md"
  fi
fi
exit "$RC"
