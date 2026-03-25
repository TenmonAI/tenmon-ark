#!/usr/bin/env bash
# TENMON_MASTER_VERDICT_UNIFICATION_VPS_V1 — master verdict 統一
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$API"

OUT="${TENMON_MASTER_VERDICT_UNIFY_OUT:-$API/automation/out/master_verdict_unification_v1}"
mkdir -p "$OUT"

python3 automation/master_verdict_unifier_v1.py --out-dir "$OUT" --stdout-json

echo "[DONE] TENMON_MASTER_VERDICT_UNIFICATION_VPS_V1"
echo "out: $OUT"
