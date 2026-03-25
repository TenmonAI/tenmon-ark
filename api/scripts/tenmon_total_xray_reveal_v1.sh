#!/usr/bin/env bash
# TENMON_TOTAL_XRAY_REVEAL_V1 — read-only full X-ray audit (no service mutation)
set -euo pipefail
API="$(cd "$(dirname "$0")/.." && pwd)"
PY="$API/automation/tenmon_total_xray_reveal_v1.py"
OUT="${TENMON_TOTAL_XRAY_OUT_DIR:-${1:-$API/automation/out/tenmon_total_xray_reveal_v1}}"
export CARD="${CARD:-TENMON_TOTAL_XRAY_REVEAL_VPS_V1}"
mkdir -p "$OUT"
python3 "$PY" --out-dir "$OUT"
echo "[tenmon_total_xray_reveal_v1] wrote under $OUT (marker: TENMON_TOTAL_XRAY_REVEAL_VPS_V1)"
