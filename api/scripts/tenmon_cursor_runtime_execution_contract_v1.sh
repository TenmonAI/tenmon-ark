#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
echo "[CARD] TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_CURSOR_AUTO_V1"
set +e
python3 "$API/automation/tenmon_cursor_runtime_execution_contract_v1.py"
RC=$?
set -e
echo "[SUMMARY] $API/automation/tenmon_cursor_runtime_execution_contract_summary.json"
echo "[STATE]   $API/automation/cursor_runtime_state_v1.json"
echo "[MANIFEST] $API/automation/cursor_runtime_capability_manifest_v1.json"
exit "$RC"

