#!/usr/bin/env bash
# TENMON_KG0_KHS_HEALTH_GATE_VPS_V1 — KHS 健全性ゲート（監査 JSON 出力・DB 改変なし）
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_KG0_KHS_HEALTH_GATE_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
PY="$API/automation/khs_health_gate_v1.py"
OUT_DIR="${KG0_OUT_DIR:-$API/automation/out/tenmon_kg0_khs_health_gate_v1}"

echo "[$CARD] out=$OUT_DIR"

mkdir -p "$OUT_DIR"

EXTRA=()
if [[ -n "${TENMON_ARK_DB_KOKUZO_PATH:-}" ]]; then
  EXTRA+=(--db "$TENMON_ARK_DB_KOKUZO_PATH")
elif [[ -n "${KG0_DB:-}" ]]; then
  EXTRA+=(--db "$KG0_DB")
fi

# 既定ではゲート FAIL でもスクリプトは成功終了（CI は final_verdict.json を見る）
export KG0_EXIT_ZERO="${KG0_EXIT_ZERO:-1}"

python3 "$PY" --out-dir "$OUT_DIR" "${EXTRA[@]}"

echo "[$CARD] wrote khs_health_gate_report.json khs_passable_set.json final_verdict.json"
echo "[$CARD] done"
