#!/usr/bin/env bash
# R10_POST_RELEASE_MONITORING_SOAK_V1: release freeze 後の監視 soak。read-only。代表7問で audit/rr/self/ledger を採取し md レポート出力。
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/var/log/tenmon/POST_RELEASE_SOAK_${TS}.md"

mkdir -p /var/log/tenmon

ledger_count() {
  if [[ -f "${DB}" ]]; then
    sqlite3 "$DB" "SELECT COUNT(*) FROM kanagi_growth_ledger;" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

echo "[post_release_soak] BASE_URL=$BASE_URL DB=$DB TS=$TS OUT=$OUT"

BEFORE_LEDGER="$(ledger_count)"

# audit
AUDIT_JSON=""
if curl -fsS --max-time 15 "$BASE_URL/api/audit" >/tmp/soak_audit_$$.json 2>/dev/null; then
  AUDIT_JSON="$(cat /tmp/soak_audit_$$.json)"
fi
rm -f /tmp/soak_audit_$$.json

AUDIT_STAGE=""
AUDIT_SHA=""
if command -v jq >/dev/null 2>&1 && [[ -n "$AUDIT_JSON" ]]; then
  AUDIT_STAGE="$(echo "$AUDIT_JSON" | jq -r '.readiness.stage // .stage // "unknown"' 2>/dev/null)"
  AUDIT_SHA="$(echo "$AUDIT_JSON" | jq -r '.gitSha // "unknown"' 2>/dev/null)"
fi

# 代表7問
PROBES=(
  "言霊とは何ですか?:post_soak_1"
  "魂とは何ですか?:post_soak_2"
  "言霊秘書とは何ですか？:post_soak_3"
  "ウタヒとは？:post_soak_4"
  "カタカムナとは何ですか？:post_soak_5"
  "少し落ち込んでいます…:post_soak_6"
  "この件をどう整理すればいい？:post_soak_7"
)

PROBE_RESULTS=""
for entry in "${PROBES[@]}"; do
  msg="${entry%%:*}"
  tid="${entry##*:}"
  resp=""
  payload=""
  if command -v jq >/dev/null 2>&1; then
    payload="$(jq -n --arg t "$tid" --arg m "$msg" '{threadId:$t, message:$m}')"
  else
    payload="{\"threadId\":\"$tid\",\"message\":\"$msg\"}"
  fi
  if curl -fsS --max-time 30 -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "$payload" >/tmp/soak_resp_$$.json 2>/dev/null; then
    resp="$(cat /tmp/soak_resp_$$.json)"
  fi
  rm -f /tmp/soak_resp_$$.json
  rr=""; tc=""; sp=""; ip=""; sk=""
  if command -v jq >/dev/null 2>&1 && [[ -n "$resp" ]]; then
    rr="$(echo "$resp" | jq -r '.decisionFrame.ku.routeReason // ""' 2>/dev/null)"
    tc="$(echo "$resp" | jq -r '.decisionFrame.ku.meaningFrame.topicClass // ""' 2>/dev/null)"
    sp="$(echo "$resp" | jq -r '.decisionFrame.ku.kanagiSelf.selfPhase // ""' 2>/dev/null)"
    ip="$(echo "$resp" | jq -r '.decisionFrame.ku.kanagiSelf.intentPhase // ""' 2>/dev/null)"
    sk="$(echo "$resp" | jq -r '.decisionFrame.ku.scriptureKey // ""' 2>/dev/null)"
  fi
  PROBE_RESULTS="${PROBE_RESULTS}
| $msg | ${rr} | ${tc} | ${sp} | ${ip} | ${sk} |"
done

AFTER_LEDGER="$(ledger_count)"
LEDGER_DELTA=$((AFTER_LEDGER - BEFORE_LEDGER))

# auto runner status (optional)
RUNNER_SVC=""
RUNNER_TIMER=""
if systemctl show tenmon-auto-runner.service --property=ActiveState 2>/dev/null | grep -q ActiveState; then
  RUNNER_SVC="$(systemctl show tenmon-auto-runner.service --property=ActiveState --value 2>/dev/null || echo "n/a")"
fi
if systemctl show tenmon-auto-runner.timer --property=ActiveState 2>/dev/null | grep -q ActiveState; then
  RUNNER_TIMER="$(systemctl show tenmon-auto-runner.timer --property=ActiveState --value 2>/dev/null || echo "n/a")"
fi

# write report
{
  echo "# R10_POST_RELEASE_MONITORING_SOAK_V1"
  echo ""
  echo "- **generated_utc**: $TS"
  echo "- **out**: $OUT"
  echo ""
  echo "## 1. audit"
  echo "- stage: ${AUDIT_STAGE:-unknown}"
  echo "- gitSha: ${AUDIT_SHA:-unknown}"
  echo ""
  echo "## 2. ledger"
  echo "- before_count: $BEFORE_LEDGER"
  echo "- after_count: $AFTER_LEDGER"
  echo "- **delta**: $LEDGER_DELTA"
  echo ""
  echo "## 3. major routes / kanagiSelf (代表7問)"
  echo "| message | routeReason | topicClass | selfPhase | intentPhase | scriptureKey |"
  echo "|---------|-------------|------------|-----------|-------------|--------------|"
  echo "$PROBE_RESULTS"
  echo ""
  echo "## 4. ledger recent (直近7件)"
  echo "\`\`\`"
  if [[ -f "$DB" ]]; then
    sqlite3 "$DB" ".mode line" "SELECT id, created_at, substr(input_text,1,60) AS input_head, route_reason, self_phase, intent_phase FROM kanagi_growth_ledger ORDER BY id DESC LIMIT 7;" 2>/dev/null || echo "(query failed)"
  else
    echo "(DB not found)"
  fi
  echo "\`\`\`"
  echo ""
  echo "## 5. auto runner (health-only)"
  echo "- tenmon-auto-runner.service ActiveState: ${RUNNER_SVC:-not installed}"
  echo "- tenmon-auto-runner.timer ActiveState: ${RUNNER_TIMER:-not installed}"
  echo ""
  echo "## 6. PWA manual confirm"
  echo "- URL: \`/pwa/?debug=1\`"
  echo "- 手動確認: /var/log/tenmon/PWA_MANUAL_FINAL_CONFIRM_V1.md"
  echo ""
  echo "---"
  echo "*R10_POST_RELEASE_MONITORING_SOAK_V1 | read-only*"
} > "$OUT"

echo "[post_release_soak] wrote $OUT"
echo "audit_stage=$AUDIT_STAGE ledger_delta=$LEDGER_DELTA"
