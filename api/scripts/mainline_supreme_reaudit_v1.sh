#!/usr/bin/env bash
# MAINLINE_SUPREME_REAUDIT_V1 — baseline と比較して axis_delta を付与
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BASELINE="${TENMON_SUPREME_AUDIT_BASELINE:?set TENMON_SUPREME_AUDIT_BASELINE to prior OUT_DIR}"
OUT_DIR="${1:-/tmp/mainline_supreme_reaudit_${TS}}"
export TENMON_SUPREME_AUDIT_BASELINE="${BASELINE}"
export BASE
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "${ROOT}/scripts/mainline_supreme_completion_audit_v1.sh" "${OUT_DIR}"
if [[ -f "${OUT_DIR}/before_after_diff.json" ]]; then
  echo "before_after_diff.json=${OUT_DIR}/before_after_diff.json"
fi
echo "REAUDIT complete. baseline=${BASELINE} new=${OUT_DIR}"
