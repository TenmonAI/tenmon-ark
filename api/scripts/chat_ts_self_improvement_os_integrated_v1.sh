#!/usr/bin/env bash
# TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1 — build/health/audit/runtime/worldclass seal + 4 系統 + 統合成果物
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1"
  fi
fi

ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
GOV="$API/automation/tenmon_self_improvement_seal_governor_v1.py"
RES="$API/automation/tenmon_self_improvement_residual_adapter_v1.py"
LED="$API/automation/tenmon_self_improvement_ledger_v1.py"
CMP="$API/automation/tenmon_self_improvement_integrated_compose_v1.py"
AUT="$API/automation/tenmon_self_improvement_card_autogen_v1.py"
SEAL="$API/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"

echo "[SELF_IMPROVEMENT_OS] CARD=$CARD"

set +e
bash "$SEAL"
SEAL_RC=$?
set -e

DIR="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
  echo "[ERROR] seal dir symlink missing after run" >&2
  exit "${SEAL_RC:-1}"
fi

OS="$DIR/_self_improvement_os"
mkdir -p "$OS"

python3 "$GOV" --seal-dir "$DIR" --out-dir "$OS" --stdout-json | tee "$OS/seal_governor_stdout.json" || true

python3 "$RES" --seal-dir "$DIR" --out-dir "$OS/residual" --stdout-json | tee "$OS/residual_adapter_stdout.json" || true

python3 "$CMP" --seal-dir "$DIR" --seal-exit-code "$SEAL_RC" --out-dir "$OS" --vps-card "$CARD" --stdout-json | tee "$OS/integrated_compose_stdout.json"

python3 "$LED" --seal-dir "$DIR" --out-dir "$OS" --seal-exit-code "$SEAL_RC" --vps-card "$CARD" --stdout-json | tee "$OS/ledger_stdout.json"

RUN_FAIL_AUTOGEN=0
if [ "$SEAL_RC" -ne 0 ]; then
  RUN_FAIL_AUTOGEN=1
elif [ ! -f "$OS/integrated_final_verdict.json" ]; then
  RUN_FAIL_AUTOGEN=1
elif ! python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); sys.exit(0 if d.get('overall_loop_ok') else 1)" "$OS/integrated_final_verdict.json"; then
  RUN_FAIL_AUTOGEN=1
fi

if [ "$RUN_FAIL_AUTOGEN" = "1" ]; then
  python3 "$AUT" --seal-dir "$DIR" --out-dir "$OS" --integrated-path "$OS/integrated_final_verdict.json" --stdout-json | tee "$OS/card_autogen_stdout.json" || true
else
  # PASS 時: os_fail_next_dispatch.json のみ更新（RETRY スタブは上書きしない）
  python3 "$AUT" --seal-dir "$DIR" --out-dir "$OS" --integrated-path "$OS/integrated_final_verdict.json" --force --stdout-json | tee "$OS/card_autogen_stdout.json" || true
fi

echo "[SELF_IMPROVEMENT_OS] artifacts → $OS"
echo "[SELF_IMPROVEMENT_OS] integrated_final_verdict.json / self_improvement_os_manifest.json"

exit "$SEAL_RC"
