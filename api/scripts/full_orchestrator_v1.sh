#!/usr/bin/env bash
# TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_VPS_V1 — 統合優先順・next queue（司令塔のみ）
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
PY="$API/automation/full_orchestrator_v1.py"
OUT="${TENMON_FULL_ORCHESTRATOR_OUT_DIR:-$API/automation/out/tenmon_full_orchestrator_v1}"

echo "[$CARD] out=$OUT"

mkdir -p "$OUT"

EXTRA=()
if [[ -n "${TENMON_ORCHESTRATOR_SEAL_DIR:-}" ]]; then
  EXTRA+=(--seal-dir "$TENMON_ORCHESTRATOR_SEAL_DIR")
fi
if [[ -n "${TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR:-}" ]]; then
  EXTRA+=(--kokuzo-out-dir "$TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR")
fi
if [[ -n "${TENMON_ORCHESTRATOR_MAX_NEXT:-}" ]]; then
  EXTRA+=(--max-next "$TENMON_ORCHESTRATOR_MAX_NEXT")
fi

python3 "$PY" --out-dir "$OUT" "${EXTRA[@]}" --stdout-json | tee "$OUT/run_stdout.json"

echo "[$CARD] artifacts → $OUT"
