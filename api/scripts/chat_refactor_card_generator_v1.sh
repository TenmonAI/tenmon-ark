#!/usr/bin/env bash
# TENMON_CHAT_REFACTOR_CARD_GENERATOR_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CHAT_REFACTOR_CARD_GENERATOR_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/chat_refactor_card_generator_v1.py"
RETRY="$API/automation/generated_cursor_apply/TENMON_CHAT_REFACTOR_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

PLAN="${CHAT_REFACTOR_CARD_GEN_PLAN:-}"
RP="${CHAT_REFACTOR_CARD_GEN_RISK_PARTITION:-}"
VD="${CHAT_REFACTOR_CARD_GEN_VERDICT:-}"

if [ "${CHAT_REFACTOR_CARD_GEN_SAMPLE:-0}" = "1" ]; then
  set +e
  python3 "$PY" --sample --ts-folder "$TS" --out-manifest "$DIR/card_manifest.json" --stdout-json | tee "$DIR/generator_stdout.json"
  RC=$?
  set -e
else
  if [ -z "$PLAN" ] || [ ! -f "$PLAN" ]; then
    mkdir -p "$(dirname "$RETRY")"
    cat > "$RETRY" <<'EOF'
# TENMON_CHAT_REFACTOR_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1

> `chat_refactor_plan.json` 不明 — `CHAT_REFACTOR_CARD_GEN_PLAN` を指定するか Planner を先に実行

EOF
    echo '{"generator_pass":false,"reason":"missing_plan_json"}' > "$DIR/final_verdict.json"
    exit 1
  fi
  EXTRA=()
  if [ -n "$RP" ] && [ -f "$RP" ]; then
    EXTRA+=(--risk-partition-json "$RP")
  fi
  if [ -n "$VD" ] && [ -f "$VD" ]; then
    EXTRA+=(--verdict-json "$VD")
  fi
  set +e
  python3 "$PY" --plan-json "$PLAN" "${EXTRA[@]}" --ts-folder "$TS" --out-manifest "$DIR/card_manifest.json" --stdout-json | tee "$DIR/generator_stdout.json"
  RC=$?
  set -e
fi

if [ "$RC" -ne 0 ]; then
  mkdir -p "$(dirname "$RETRY")"
  echo "# TENMON_CHAT_REFACTOR_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1
> generator exit $RC
" > "$RETRY"
  echo "{\"generator_pass\":false,\"reason\":\"exit_${RC}\"}" > "$DIR/final_verdict.json"
  exit "$RC"
fi

# VPS 検証成果物（命名は Cursor カード VPS_VALIDATION_OUTPUTS と整合）
cp -f "$API/automation/generated_vps_cards/${TS}/generated_cursor_card_sample.md" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_vps_cards/${TS}/generated_vps_card_sample.sh" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_vps_cards/${TS}/card_manifest.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_vps_cards/${TS}/final_verdict.json" "$DIR/" 2>/dev/null || true

echo "[PASS] $DIR"
exit 0
