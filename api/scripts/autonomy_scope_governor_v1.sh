#!/usr/bin/env bash
# TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1"
echo "[ROOT] $ROOT"

set +e
python3 "$API/automation/autonomy_scope_governor_v1.py" \
  --repo-root "$ROOT" \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_autonomy_scope_governor_summary.json"
echo "[REPORT]  $API/automation/tenmon_autonomy_scope_governor_report.md"
exit "$RC"

