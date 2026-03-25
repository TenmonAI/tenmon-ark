#!/usr/bin/env bash
# TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1"
echo "[ROOT] $ROOT"

set +e
python3 "$API/automation/auto_rollback_restore_guard_v1.py" \
  --repo-root "$ROOT" \
  "$@"
RC=$?
set -e

echo "[SUMMARY]  $API/automation/tenmon_auto_rollback_restore_guard_summary.json"
echo "[REPORT]   $API/automation/tenmon_auto_rollback_restore_guard_report.md"
echo "[EVIDENCE] $API/automation/tenmon_auto_rollback_restore_guard_evidence_bundle.json"
exit "$RC"

