#!/usr/bin/env bash
# TENMON_CHAT_REFACTOR_GOVERNOR_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CHAT_REFACTOR_GOVERNOR_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/chat_refactor_governor_v1.py"
RETRY="$API/automation/generated_cursor_apply/TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

OBS="${CHAT_REFACTOR_GOV_OBSERVATION:-}"
PLAN="${CHAT_REFACTOR_GOV_PLAN:-}"
GEN="${CHAT_REFACTOR_GOV_GENERATOR_MANIFEST:-}"
RP="${CHAT_REFACTOR_GOV_RISK_PARTITION:-}"
SIG="${CHAT_REFACTOR_GOV_SIGNALS:-}"

if [ -z "$OBS" ] || [ ! -f "$OBS" ]; then
  mkdir -p "$(dirname "$RETRY")"
  cat > "$RETRY" <<'EOF'
# TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1

> 観測 JSON 不明 — `CHAT_REFACTOR_GOV_OBSERVATION` を指定

EOF
  echo '{"status":"FAIL","governor_pass":false,"reason":"missing_observation"}' > "$DIR/final_verdict.json"
  exit 1
fi
if [ -z "$PLAN" ] || [ ! -f "$PLAN" ]; then
  mkdir -p "$(dirname "$RETRY")"
  cat > "$RETRY" <<'EOF'
# TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1

> plan 不明 — `CHAT_REFACTOR_GOV_PLAN` を指定

EOF
  echo '{"status":"FAIL","governor_pass":false,"reason":"missing_plan"}' > "$DIR/final_verdict.json"
  exit 1
fi
if [ -z "$GEN" ] || [ ! -f "$GEN" ]; then
  mkdir -p "$(dirname "$RETRY")"
  cat > "$RETRY" <<'EOF'
# TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1

> generator manifest 不明 — `CHAT_REFACTOR_GOV_GENERATOR_MANIFEST` を指定

EOF
  echo '{"status":"FAIL","governor_pass":false,"reason":"missing_generator_manifest"}' > "$DIR/final_verdict.json"
  exit 1
fi

EXTRA=()
if [ -n "$RP" ] && [ -f "$RP" ]; then
  EXTRA+=(--risk-partition-json "$RP")
fi
if [ -n "$SIG" ] && [ -f "$SIG" ]; then
  EXTRA+=(--signals-json "$SIG")
fi

OUT="$DIR/chat_refactor_governor_verdict.json"
set +e
python3 "$PY" \
  --observation-json "$OBS" \
  --plan-json "$PLAN" \
  --generator-manifest "$GEN" \
  "${EXTRA[@]}" \
  --out-verdict "$OUT" \
  --enforce-exit
RC=$?
set -e

if [ "$RC" -ne 0 ]; then
  mkdir -p "$(dirname "$RETRY")"
  echo "# TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1
> governor exit $RC — \`governance_verdict.json\` / \`next_card_dispatch.json\` を確認

## VPS_VALIDATION_OUTPUTS

- \`TENMON_CHAT_REFACTOR_GOVERNOR_VPS_V1\`
- \`governance_verdict.json\`
- \`next_card_dispatch.json\`
- \`rollback_decision.json\`
- \`final_verdict.json\`
" > "$RETRY"
  exit "$RC"
fi

echo "[PASS] $DIR"
exit 0
