#!/usr/bin/env bash
# TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_VPS_V1 — 出力契約の正規化レポート生成
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$API"

OUT="${TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_OUT:-$API/automation/out/os_output_contract_normalize_v1}"
mkdir -p "$OUT"

python3 automation/output_contract_normalizer_v1.py --out-dir "$OUT" --stdout-json

echo "[DONE] TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_VPS_V1"
echo "out: $OUT"
