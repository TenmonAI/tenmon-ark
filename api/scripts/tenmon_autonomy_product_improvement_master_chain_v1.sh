#!/usr/bin/env bash
# TENMON_AUTONOMY_PRODUCT_IMPROVEMENT_MASTER_CHAIN_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] TENMON_AUTONOMY_PRODUCT_IMPROVEMENT_MASTER_CHAIN_CURSOR_AUTO_V1"
echo "[ROOT] $ROOT"

set +e
python3 "$API/automation/tenmon_autonomy_product_improvement_master_chain_v1.py" \
  --repo-root "$ROOT" \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_autonomy_product_improvement_master_chain_summary.json"
echo "[REPORT]  $API/automation/tenmon_autonomy_product_improvement_master_chain_report.md"
if [ -f "$API/automation/tenmon_autonomy_product_improvement_master_chain_fail_next_card.json" ]; then
  echo "[FAIL_NEXT] $API/automation/tenmon_autonomy_product_improvement_master_chain_fail_next_card.json"
fi
exit "$RC"

