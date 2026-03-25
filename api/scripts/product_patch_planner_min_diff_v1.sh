#!/usr/bin/env bash
# TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1"
echo "[ROOT] $ROOT"

set +e
python3 "$API/automation/product_patch_planner_min_diff_v1.py" \
  --repo-root "$ROOT" \
  "$@"
RC=$?
set -e

echo "[SUMMARY] $API/automation/tenmon_product_patch_planner_min_diff_summary.json"
echo "[REPORT]  $API/automation/tenmon_product_patch_planner_min_diff_report.md"
echo "[QUEUE]   $API/automation/product_patch_plan_queue.json"
exit "$RC"

