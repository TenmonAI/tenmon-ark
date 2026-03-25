#!/usr/bin/env bash
# TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
if ! mkdir -p "$LOG_DIR" 2>/dev/null; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  API="$(cd "$SCRIPT_DIR/.." && pwd)"
  ROOT="$(cd "$API/.." && pwd)"
  LOG_DIR="${ROOT}/api/automation/out/logs/card_${CARD}/${TS}"
  mkdir -p "$LOG_DIR"
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

if [[ -z "${FOUNDER_KEY:-${TENMON_REMOTE_CURSOR_FOUNDER_KEY:-}}" ]]; then
  echo "[ERROR] FOUNDER_KEY or TENMON_REMOTE_CURSOR_FOUNDER_KEY required for full proof" >&2
fi

set +e
python3 "$API/automation/tenmon_self_build_real_closed_loop_proof_v1.py" --repo-root "$ROOT" "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_self_build_real_closed_loop_proof_summary.json"
echo "[REPORT] $API/automation/tenmon_self_build_real_closed_loop_proof_report.md"
echo "[VERDICT] $API/automation/tenmon_self_build_real_closed_loop_proof_verdict.json"
exit "$RC"
