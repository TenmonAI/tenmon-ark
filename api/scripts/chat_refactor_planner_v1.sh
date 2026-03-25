#!/usr/bin/env bash
# TENMON_CHAT_REFACTOR_PLANNER_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CHAT_REFACTOR_PLANNER_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/chat_refactor_planner_v1.py"
RETRY="$API/automation/generated_cursor_apply/TENMON_CHAT_REFACTOR_PLANNER_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

ARCH="${CHAT_REFACTOR_PLANNER_ARCH_REPORT:-}"
if [ -z "$ARCH" ]; then
  LATEST="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
  if [ -n "$LATEST" ] && [ -f "$LATEST/chat_architecture_report.json" ]; then
    ARCH="$LATEST/chat_architecture_report.json"
  elif [ -n "$LATEST" ] && [ -f "$LATEST/chat_architecture_observation.json" ]; then
    ARCH="$LATEST/chat_architecture_observation.json"
  fi
fi

EXTRA=()
if [ -n "${CHAT_REFACTOR_PLANNER_LEDGER:-}" ]; then
  EXTRA+=(--ledger-jsonl "$CHAT_REFACTOR_PLANNER_LEDGER")
fi
if [ -n "${CHAT_REFACTOR_PLANNER_RESIDUAL:-}" ]; then
  EXTRA+=(--residual-quality-json "$CHAT_REFACTOR_PLANNER_RESIDUAL")
fi
if [ "${CHAT_REFACTOR_PLANNER_SAMPLE:-0}" = "1" ]; then
  set +e
  python3 "$PY" --sample --out-dir "$DIR" --stdout-json | tee "$DIR/planner_stdout.json"
  RC=$?
  set -e
else
  if [ -z "$ARCH" ] || [ ! -f "$ARCH" ]; then
    mkdir -p "$(dirname "$RETRY")"
    cat > "$RETRY" <<EOF
# TENMON_CHAT_REFACTOR_PLANNER_RETRY_CURSOR_AUTO_V1

> architecture report 不明 — \`CHAT_REFACTOR_PLANNER_ARCH_REPORT\` を指定するか Observer を先に実行

EOF
    echo '{"planner_pass":false,"reason":"missing_architecture_report"}' | jq . > "$DIR/final_verdict.json" || true
    exit 1
  fi
  set +e
  python3 "$PY" --architecture-report "$ARCH" --out-dir "$DIR" "${EXTRA[@]}" --stdout-json | tee "$DIR/planner_stdout.json"
  RC=$?
  set -e
fi

if [ "$RC" -ne 0 ]; then
  mkdir -p "$(dirname "$RETRY")"
  echo "# TENMON_CHAT_REFACTOR_PLANNER_RETRY_CURSOR_AUTO_V1
> planner exit $RC
" > "$RETRY"
  exit "$RC"
fi

echo "[PASS] $DIR"
exit 0
