#!/usr/bin/env bash
# TENMON_RESIDUAL_QUALITY_SCORER_VPS_V1 — residual_quality_score.json / residual_priority_result.json / final_verdict.json
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_RESIDUAL_QUALITY_SCORER_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
PY="$API/automation/residual_quality_scorer_v1.py"
RETRY_MD="$API/automation/generated_cursor_apply/TENMON_RESIDUAL_QUALITY_SCORER_RETRY_CURSOR_AUTO_V1.md"

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

FAIL_REASON=""
if [ -z "$SEAL_DIR" ] || [ ! -d "$SEAL_DIR" ]; then
  FAIL_REASON="missing_seal_dir"
elif [ ! -f "$SEAL_DIR/final_verdict.json" ]; then
  FAIL_REASON="missing_final_verdict"
fi

if [ -n "$FAIL_REASON" ]; then
  mkdir -p "$(dirname "$RETRY_MD")"
  cat > "$RETRY_MD" <<EOF
# TENMON_RESIDUAL_QUALITY_SCORER_RETRY_CURSOR_AUTO_V1

> 自動生成（\`residual_quality_score_v1.sh\`）— \`$FAIL_REASON\`

- time_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- collect dir: $DIR

## DO

1. seal を実行し \`/var/log/tenmon/card\` を有効にする
2. \`python3 $PY score --seal-dir "\$(readlink -f /var/log/tenmon/card)" --out-dir "$DIR"\`

EOF
  python3 - <<'PY' "$DIR/final_verdict.json" "$FAIL_REASON" "$CARD"
import json, pathlib, sys
p, reason, card = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
body = {
    "version": 1,
    "card": card,
    "residual_scorer_pass": False,
    "fail_reason": reason,
    "chat_ts_overall_100": False,
}
p.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(body, ensure_ascii=False, indent=2))
PY
  echo "[FAIL] $FAIL_REASON → $RETRY_MD"
  exit 1
fi

EXTRA=()
[ -n "${RESIDUAL_SCORER_WORLDCLASS:-}" ] && EXTRA+=(--worldclass-report "$RESIDUAL_SCORER_WORLDCLASS")
[ -n "${RESIDUAL_SCORER_LEDGER:-}" ] && EXTRA+=(--ledger-jsonl "$RESIDUAL_SCORER_LEDGER")
[ -n "${RESIDUAL_SCORER_LEDGER_TAIL:-}" ] && EXTRA+=(--ledger-tail "$RESIDUAL_SCORER_LEDGER_TAIL")

set +e
python3 "$PY" score \
  --seal-dir "$SEAL_DIR" \
  --out-dir "$DIR" \
  "${EXTRA[@]}" \
  --stdout-json | tee "$DIR/scorer_stdout.json"
RC=$?
set -e

if [ "$RC" -ne 0 ]; then
  FAIL_REASON="python_scorer_exit_$RC"
  mkdir -p "$(dirname "$RETRY_MD")"
  echo "# TENMON_RESIDUAL_QUALITY_SCORER_RETRY_CURSOR_AUTO_V1
> python exit $RC
" > "$RETRY_MD"
  python3 - <<'PY' "$DIR/final_verdict.json" "$FAIL_REASON" "$CARD"
import json, pathlib, sys
p, reason, card = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
body = {
    "version": 1,
    "card": card,
    "residual_scorer_pass": False,
    "fail_reason": reason,
    "chat_ts_overall_100": False,
}
p.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
  exit "$RC"
fi

echo "[PASS] $DIR"
exit 0
