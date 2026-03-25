#!/usr/bin/env bash
# TENMON_CARD_AUTO_GENERATOR_VPS_V1 — Cursor/VPS カード自動生成 + manifest + sample 成果物
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CARD_AUTO_GENERATOR_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/card_auto_generator_v1.py"
RETRY_MD="$API/automation/generated_cursor_apply/TENMON_CARD_AUTO_GENERATOR_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"

if [ -n "${2:-}" ]; then
  SEAL_DIR="$(readlink -f "$2")"
else
  SEAL_DIR="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
fi

write_fail() {
  local reason="$1"
  mkdir -p "$(dirname "$RETRY_MD")"
  cat > "$RETRY_MD" <<EOF
# TENMON_CARD_AUTO_GENERATOR_RETRY_CURSOR_AUTO_V1

> 自動生成（\`card_auto_generate_v1.sh\`）— $reason

- time_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- dir: $DIR

## DO

1. seal を実行し \`/var/log/tenmon/card\` を用意する
2. 任意で \`RESIDUAL_PRIORITY_JSON\` に \`residual_priority_result.json\` を指定
3. \`$PY generate --seal-dir "\$SEAL" --out-dir "$DIR"\` を再実行

EOF
  python3 - <<'PY' "$DIR/final_verdict.json" "$reason" "$CARD"
import json, pathlib, sys
p, reason, card = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
body = {
    "version": 1,
    "card": card,
    "card_auto_generator_pass": False,
    "fail_reason": reason,
    "chat_ts_overall_100": False,
}
p.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(body, ensure_ascii=False, indent=2))
PY
  echo "[FAIL] $reason → $RETRY_MD"
  exit 1
}

if [ -z "$SEAL_DIR" ] || [ ! -d "$SEAL_DIR" ]; then
  write_fail "missing_seal_dir"
fi

EXTRA=()
[ -n "${RESIDUAL_PRIORITY_JSON:-}" ] && EXTRA+=(--priority-json "$RESIDUAL_PRIORITY_JSON")
[ -n "${IMPROVEMENT_LEDGER_JSONL:-}" ] && EXTRA+=(--ledger-jsonl "$IMPROVEMENT_LEDGER_JSONL")
[ -n "${CARD_GEN_TS_FOLDER:-}" ] && EXTRA+=(--ts-folder "$CARD_GEN_TS_FOLDER")

set +e
python3 "$PY" generate \
  --seal-dir "$SEAL_DIR" \
  --out-dir "$DIR" \
  --ts-folder "${CARD_GEN_TS_FOLDER:-$TS}" \
  "${EXTRA[@]}" \
  --stdout-json | tee "$DIR/generator_stdout.json"
RC=$?
set -e

if [ "$RC" -ne 0 ]; then
  write_fail "python_exit_${RC}"
fi

if [ "${CARD_GEN_ALSO_SAMPLE:-0}" = "1" ]; then
  python3 "$PY" sample \
    --blocker "${CARD_GEN_SAMPLE_BLOCKER:-surface_noise_remaining}" \
    --out-dir "$DIR/sample_blocker_run" \
    --stdout-json | tee "$DIR/sample_stdout.json" || true
fi

echo "[PASS] $DIR"
exit 0
