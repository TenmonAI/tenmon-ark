#!/usr/bin/env bash
# TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/chat_architecture_observer_v1.py"
RETRY="$API/automation/generated_cursor_apply/TENMON_CHAT_ARCHITECTURE_OBSERVER_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

EXTRA=()
[ -n "${CHAT_ARCH_OBSERVER_CHAT_PATH:-}" ] && EXTRA+=(--chat-path "$CHAT_ARCH_OBSERVER_CHAT_PATH")
[ "${CHAT_ARCH_OBSERVER_SAMPLE:-0}" = "1" ] && EXTRA+=(--sample)

set +e
python3 "$PY" "${EXTRA[@]}" --out-dir "$DIR" --stdout-json | tee "$DIR/observer_stdout.json"
RC=$?
set -e

if [ "$RC" -ne 0 ]; then
  mkdir -p "$(dirname "$RETRY")"
  cat > "$RETRY" <<EOF
# TENMON_CHAT_ARCHITECTURE_OBSERVER_RETRY_CURSOR_AUTO_V1

> 自動生成（chat_architecture_observer_v1.sh） exit=$RC

- dir: $DIR
- time: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## DO

1. \`chat.ts\` パスを \`CHAT_ARCH_OBSERVER_CHAT_PATH\` で明示
2. \`python3 $PY --out-dir /tmp/t --stdout-json\` で単体確認

EOF
  exit "$RC"
fi

echo "[PASS] $DIR"
exit 0
