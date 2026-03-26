#!/usr/bin/env bash
# TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1 — サンプル生成・seal から ledger 追記・collect 用 final_verdict
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/improvement_ledger_v1.py"
RETRY_MD="$API/automation/generated_cursor_apply/TENMON_IMPROVEMENT_LEDGER_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_ledger_collect 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"

COLLECT_OK=1
APPEND_OK=0
SEAL_DIR="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
REASON=""

python3 "$PY" emit-sample --out "$DIR/improvement_ledger_sample.json" --stdout-json | tee "$DIR/emit_sample_stdout.json"

if [ -z "$SEAL_DIR" ] || [ ! -d "$SEAL_DIR" ]; then
  COLLECT_OK=0
  REASON="no_seal_symlink_use_primary_card"
  echo "[WARN] /var/log/tenmon/card 不在 — 追記スキップ（直近 seal 実行後に再試行）"
else
  SRC_CARD="${IMPROVEMENT_LEDGER_SOURCE_CARD:-$CARD}"
  EXTRA=()
  [ -n "${IMPROVEMENT_LEDGER_TOUCHED_LIST:-}" ] && EXTRA+=(--touched-files "$IMPROVEMENT_LEDGER_TOUCHED_LIST")
  [ -n "${IMPROVEMENT_LEDGER_GIT_SINCE:-}" ] && EXTRA+=(--git-since "$IMPROVEMENT_LEDGER_GIT_SINCE")
  [ -n "${IMPROVEMENT_LEDGER_JSONL:-}" ] && EXTRA+=(--jsonl-out "$IMPROVEMENT_LEDGER_JSONL")
  SEAL_RC="${IMPROVEMENT_LEDGER_SEAL_EXIT_CODE:-0}"
  set -o pipefail
  if python3 "$PY" append-from-seal \
    --seal-dir "$SEAL_DIR" \
    --card-name "$SRC_CARD" \
    --seal-exit-code "$SEAL_RC" \
    --repo-root "$ROOT" \
    "${EXTRA[@]}" \
    --stdout-json | tee "$DIR/append_from_seal_stdout.json"
  then
    APPEND_OK=1
  else
    COLLECT_OK=0
    REASON="append_from_seal_failed"
  fi
  set +o pipefail
fi

python3 - <<'PY' "$DIR/improvement_ledger_append_result.json" "$COLLECT_OK" "$APPEND_OK" "$REASON" "$SEAL_DIR" "$CARD"
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
collect_ok = int(sys.argv[2])
append_ok = int(sys.argv[3])
reason = sys.argv[4]
seal_dir = sys.argv[5]
card = sys.argv[6]
body = {
    "version": 1,
    "card": "TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1",
    "collect_ok": bool(collect_ok),
    "append_ok": bool(append_ok),
    "reason": reason or None,
    "seal_dir_used": seal_dir or None,
    "vps_card": card,
}
out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(body, ensure_ascii=False, indent=2))
PY

FV_OK=0
if [ "$COLLECT_OK" = "1" ] && [ "$APPEND_OK" = "1" ]; then
  FV_OK=1
fi

python3 - <<'PY' "$DIR/final_verdict.json" "$FV_OK" "$CARD"
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
ok = int(sys.argv[2])
card = sys.argv[3]
fv = {
    "version": 1,
    "card": card,
    "improvement_ledger_collect_pass": bool(ok),
    "chat_ts_overall_100": bool(ok),
    "notes": ["improvement_ledger_collect_v1: append と sample 生成が完了したとき pass"],
}
p.write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(fv, ensure_ascii=False, indent=2))
PY

if [ "$FV_OK" != "1" ]; then
  mkdir -p "$(dirname "$RETRY_MD")"
  cat > "$RETRY_MD" <<EOF
# TENMON_IMPROVEMENT_LEDGER_RETRY_CURSOR_AUTO_V1

> 自動生成（\`improvement_ledger_collect_v1.sh\` FAIL）

- generatedAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- reason: ${REASON:-collect_or_append_failed}
- collect dir: ${DIR}

## DO

1. 直近 seal を実行し \`/var/log/tenmon/card\` を有効にする
2. \`IMPROVEMENT_LEDGER_SEAL_EXIT_CODE\` を必要なら設定
3. \`api/scripts/improvement_ledger_collect_v1.sh\` を再実行

## CHECK

\`\`\`bash
jq . ${DIR}/improvement_ledger_append_result.json
\`\`\`
EOF
  echo "[FAIL] → $RETRY_MD"
  exit 1
fi

echo "[PASS] $DIR"
exit 0
