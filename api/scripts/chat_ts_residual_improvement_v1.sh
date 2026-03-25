#!/usr/bin/env bash
# CHAT_TS_RESIDUAL_IMPROVEMENT — seal 出力から残差採点・focused manifest（本体非変更）
set -euo pipefail
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/tenmon_chat_ts_residual_quality_score_v1.py"

if [ -n "${1:-}" ]; then
  SEAL_DIR="$(readlink -f "$1")"
else
  SEAL_DIR="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
fi
if [ -z "$SEAL_DIR" ] || [ ! -d "$SEAL_DIR" ]; then
  echo "[ERROR] seal dir required" >&2
  exit 2
fi

OUT="${CHAT_TS_RESIDUAL_OUT:-$SEAL_DIR/_residual_improvement}"
mkdir -p "$OUT"

EXTRA=()
[ "${CHAT_TS_RESIDUAL_MIRROR_ARTIFACTS:-1}" = "1" ] && EXTRA+=(--mirror-artifacts)
[ "${CHAT_TS_RESIDUAL_WRITE_STUBS:-0}" = "1" ] && EXTRA+=(--write-stubs)

python3 "$PY" --seal-dir "$SEAL_DIR" --out-dir "$OUT" "${EXTRA[@]}" --stdout-json | tee "$OUT/residual_stdout.json"
echo "[RESIDUAL] $OUT"
