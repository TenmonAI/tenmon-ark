#!/usr/bin/env bash
# TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1 — retry forensic のみ（seal MD / regression guard は触らない）
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

CARD="TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
GEN_DIR="$API/automation/generated_cursor_apply"
mkdir -p "$GEN_DIR"

FORENSIC_PY="$API/automation/tenmon_pwa_final_seal_retry_forensic_v1.py"
OUT_F="$API/automation/pwa_final_seal_retry_forensic.json"
OUT_P="$API/automation/pwa_final_seal_retry_plan.json"
VERDICT_JSON="$API/automation/pwa_final_seal_and_regression_guard_verdict.json"
RETRY_MD="$GEN_DIR/${CARD}.md"

echo "[CARD] $CARD"
echo "[ROOT] $ROOT"

if [ ! -f "$VERDICT_JSON" ]; then
  echo "[ERR] missing $VERDICT_JSON (run seal runner integrate 先に)" >&2
  exit 2
fi

python3 "$FORENSIC_PY" "$ROOT" \
  --out-forensic "$OUT_F" \
  --out-plan "$OUT_P" \
  --merge-unified-verdict "$VERDICT_JSON"

NOTE_KEY="## TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1"
REC="$(python3 -c "import json; print(json.load(open('$OUT_P')).get('recommended_retry_card',''))" 2>/dev/null || echo "")"

BLOCK="
${NOTE_KEY}

- generated: \`api/automation/pwa_final_seal_retry_forensic.json\` / \`api/automation/pwa_final_seal_retry_plan.json\`
- unified verdict に \`recommended_retry_card\` / \`retry_forensic\` をマージ済み（\`pwa_final_seal_and_regression_guard_verdict.json\`）
- **seal MD / pwa_final_regression_guard.json は更新しない**（PASS 専用）
- recommended_retry_card: \`${REC}\`
- 全文は \`api/automation/pwa_final_seal_retry_plan.json\` を参照

"

if [ -f "$RETRY_MD" ]; then
  prev="$(cat "$RETRY_MD")"
  if ! echo "$prev" | grep -qF "$NOTE_KEY"; then
    printf '%s\n' "$BLOCK" >>"$RETRY_MD"
  fi
else
  {
    echo "# ${CARD}"
    printf '%s\n' "$BLOCK"
  } >"$RETRY_MD"
fi

echo "[OK] $OUT_F"
echo "[OK] $OUT_P"
echo "[OK] merged into $VERDICT_JSON"
echo "[OK] $RETRY_MD"

if [ "$STDOUT_JSON" -eq 1 ]; then
  cat "$OUT_P"
fi
exit 0
