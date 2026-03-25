#!/usr/bin/env bash
# TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1
# learning（KG0→KG2B）+ runtime seal + improvement OS を 1 周
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
PY="$API/automation/kokuzo_learning_improvement_os_integrated_v1.py"
OUT="${KOKUZO_LEARNING_IMPROVEMENT_OUT_DIR:-$API/automation/out/tenmon_kokuzo_learning_improvement_os_v1}"

echo "[$CARD] out=$OUT"

mkdir -p "$OUT"

EXTRA=()
if [[ "${KOKUZO_LEARNING_BOOTSTRAP:-0}" == "1" ]] || [[ "${TENMON_KOKUZO_LEARNING_BOOTSTRAP:-0}" == "1" ]]; then
  EXTRA+=(--bootstrap)
  OUT="${KOKUZO_LEARNING_BOOTSTRAP_OUT_DIR:-$API/automation/out/tenmon_kokuzo_learning_os_bootstrap_v1}"
  CARD="TENMON_KOKUZO_LEARNING_OS_BOOTSTRAP_VPS_V1"
  mkdir -p "$OUT"
  echo "[bootstrap] card=$CARD out=$OUT"
fi
if [[ "${KOKUZO_ALLOW_SYSTEMD_RESTART:-0}" == "1" ]]; then
  EXTRA+=(--allow-systemd-restart)
fi

set +e
python3 "$PY" --out-dir "$OUT" "${EXTRA[@]}" --stdout-json | tee "$OUT/runner_stdout.json"
RC=$?
set -e

echo "[$CARD] exit=$RC artifacts → $OUT"
exit "$RC"
