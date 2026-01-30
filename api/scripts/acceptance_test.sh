#!/usr/bin/env bash
set -euo pipefail

# symlinkでも必ず実体の api/ に入る
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[1] build"
pnpm -s build

echo "[2] restart"
sudo systemctl restart tenmon-ark-api.service

# restart直後（これ以降のログだけを見る）
SINCE="$(date '+%Y-%m-%d %H:%M:%S')"
sleep 0.2

echo "[3] wait /api/audit"
for i in $(seq 1 80); do
  if curl -fsS "$BASE_URL/api/audit" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done
curl -fsS "$BASE_URL/api/audit" | jq -e 'type=="object"' >/dev/null

echo "[4] /api/chat decisionFrame contract"
resp=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"hello"}')
echo "$resp" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null

post_chat_raw() {
  curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"t\",\"message\":\"$1\"}"
}

post_chat_raw_tid() {
  local msg="$1"
  local tid="$2"
  curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"$tid\",\"message\":\"$msg\"}"
}

assert_natural() {
  local json="$1"
  echo "$json" | jq -e '.decisionFrame.mode=="NATURAL" and .decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' >/dev/null
}

echo "[19] NATURAL mode (hello / date / help)"
r1="$(post_chat_raw "hello")"
assert_natural "$r1"

r2="$(post_chat_raw "date")"
assert_natural "$r2"
echo "$r2" | jq -r '.response' | grep -E 'JST' >/dev/null

r3="$(post_chat_raw "help")"
assert_natural "$r3"
echo "$r3" | jq -r '.response' | grep -E '1\)|2\)|3\)' >/dev/null

echo "[PASS] Phase19 NATURAL"

echo "[19-0] NATURAL Japanese greeting gate"
r0="$(post_chat_raw "おはよう")"
assert_natural "$r0"
echo "$r0" | jq -r '.response' | grep -E 'おはよう|天聞アーク' >/dev/null
echo "[PASS] Phase19-0"

echo "[20] CorePlan container (HYBRID detailPlan) gate"
r20="$(post_chat_raw "coreplan test")"
# Phase4契約（decisionFrame）に加えて detailPlan を確認
echo "$r20" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' >/dev/null
echo "$r20" | jq -e 'has("detailPlan") and (.detailPlan|type)=="object"' >/dev/null
echo "$r20" | jq -e '(.detailPlan.centerClaim|type)=="string"' >/dev/null
echo "$r20" | jq -e '(.detailPlan.claims|type)=="array"' >/dev/null
echo "$r20" | jq -e '(.detailPlan.evidenceIds|type)=="array"' >/dev/null
echo "$r20" | jq -e '(.detailPlan.warnings|type)=="array"' >/dev/null
echo "$r20" | jq -e '(.detailPlan.chainOrder|type)=="array"' >/dev/null
echo "[PASS] Phase20 CorePlan"

echo "[21] Truth-Core applied (detailPlan.chainOrder contains TRUTH_CORE)"
r21="$(post_chat_raw "coreplan test")"
echo "$r21" | jq -e '(.detailPlan.chainOrder|type)=="array" and (.detailPlan.chainOrder|index("TRUTH_CORE")!=null)' >/dev/null
echo "[PASS] Phase21 Truth-Core"

echo "[22] Verifier applied (detailPlan.chainOrder contains VERIFIER)"
r22="$(post_chat_raw "coreplan test")"
echo "$r22" | jq -e '(.detailPlan.chainOrder|index("VERIFIER")!=null)' >/dev/null
echo "$r22" | jq -e '(.detailPlan.warnings|type)=="array"' >/dev/null
echo "$r22" | jq -e '(.detailPlan.warnings|join(" ")|test("VERIFIER: evidence missing"))' >/dev/null
echo "[PASS] Phase22 Verifier"

echo "[23] Kokuzo recall (same threadId)"
tid="t-kokuzo"
r231="$(post_chat_raw_tid "coreplan test" "$tid")"
r232="$(post_chat_raw_tid "coreplan test" "$tid")"
echo "$r232" | jq -e 'has("detailPlan") and (.detailPlan.chainOrder|index("KOKUZO_RECALL")!=null)' >/dev/null
echo "[PASS] Phase23 Kokuzo recall"

echo "[24] GROUNDED with evidenceIds (doc+pdfPage)"
r24="$(post_chat_raw "言霊秘書.pdf pdfPage=6 テスト #詳細")"
echo "$r24" | jq -e '.decisionFrame.mode=="GROUNDED"' >/dev/null
echo "$r24" | jq -e 'has("detailPlan") and (.detailPlan.evidenceIds|type)=="array" and (.detailPlan.evidenceIds|length)>=0' >/dev/null
echo "[PASS] Phase24 GROUNDED evidenceIds"

echo "[25] HYBRID candidates gate (#詳細 shows candidates)"
r25="$(post_chat_raw "言灵とは何？ #詳細")"
echo "$r25" | jq -e '(.decisionFrame.mode=="HYBRID")' >/dev/null
echo "$r25" | jq -e 'has("candidates") and (.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
echo "[PASS] Phase25 candidates"

echo "[GATE] No Runtime LLM usage in logs"
if sudo journalctl -u tenmon-ark-api.service --since "$SINCE" --no-pager | grep -q "\[KANAGI-LLM\]"; then
  echo "[FAIL] Runtime LLM usage detected in logs."
  exit 1
fi
echo "[PASS] No Runtime LLM usage detected."

echo "[PASS] acceptance_test.sh"
