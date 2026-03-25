#!/usr/bin/env bash
# TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
GEN="$API/automation/kokuzo_self_learning_parent_generator_v1.py"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

cd "$API"
npm run build
python3 "$GEN" --ts-folder "$TS" --write-integrated "$DIR/integrated_final_verdict.json" --stdout-json | tee "$DIR/generator_stdout.json"
cp -f "$DIR/integrated_learning_os_manifest.json" "$DIR/" 2>/dev/null || true

# Optional: Kokuzo Learning OS bootstrap（runner 入口・最低統合成果物）
if [[ "${TENMON_KOKUZO_PARENT_RUN_BOOTSTRAP:-0}" == "1" ]]; then
  BOOT_OUT="${TENMON_KOKUZO_BOOTSTRAP_OUT:-$DIR/kokuzo_learning_bootstrap}"
  mkdir -p "$BOOT_OUT"
  python3 "$API/automation/kokuzo_learning_improvement_os_integrated_v1.py" \
    --bootstrap --out-dir "$BOOT_OUT" --stdout-json | tee "$BOOT_OUT/bootstrap_runner_stdout.json" || true
  for f in kokuzo_learning_manifest.json integrated_learning_verdict.json learning_steps.json next_card_dispatch.json bootstrap_final_verdict.json; do
    [[ -f "$BOOT_OUT/$f" ]] && cp -a "$BOOT_OUT/$f" "$DIR/" || true
  done
fi

echo "[PASS] $DIR"
exit 0
