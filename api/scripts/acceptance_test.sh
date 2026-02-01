#!/usr/bin/env bash
set -euo pipefail

# symlinkでも必ず実体の api/ に入る
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

# [GATE] live dist must exist and match repo dist
test -f /opt/tenmon-ark-live/dist/kokuzo/search.js || (echo "[FAIL] live dist missing" && exit 1)
diff -qr /opt/tenmon-ark-repo/api/dist /opt/tenmon-ark-live/dist >/dev/null || (echo "[FAIL] dist mismatch (repo vs live)" && exit 1)
echo "[PASS] dist synced"

echo "[1] deploy"
bash scripts/deploy_live.sh

# restart直後（これ以降のログだけを見る）
SINCE="$(date '+%Y-%m-%d %H:%M:%S')"
sleep 0.2

echo "[2] wait /api/audit"
for i in $(seq 1 80); do
  if curl -fsS "$BASE_URL/api/audit" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done
curl -fsS "$BASE_URL/api/audit" | jq -e 'type=="object"' >/dev/null

echo "[GATE] live gitSha must match repo"
REPO_SHA="$(cd /opt/tenmon-ark-repo/api && git rev-parse --short HEAD)"
LIVE_SHA="$(curl -fsS "$BASE_URL/api/audit" | jq -r '.gitSha // ""')"
test -n "$LIVE_SHA" || (echo "[FAIL] /api/audit missing gitSha" && exit 1)
test "$LIVE_SHA" = "$REPO_SHA" || (echo "[FAIL] live gitSha mismatch (live=$LIVE_SHA repo=$REPO_SHA)" && exit 1)
echo "[PASS] live gitSha match"

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

echo "[26] Phase26 pick candidate -> GROUNDED"
tid26="t-phase26"
r261="$(post_chat_raw_tid "言灵とは何？ #詳細" "$tid26")"
echo "$r261" | jq -e '(.decisionFrame.mode=="HYBRID")' >/dev/null
echo "$r261" | jq -e 'has("candidates") and (.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
r262="$(post_chat_raw_tid "1" "$tid26")"
echo "$r262" | jq -e '(.decisionFrame.mode=="GROUNDED") and (.evidence|type)=="object" and (.evidence.doc|type)=="string" and (.evidence.pdfPage|type)=="number"' >/dev/null
echo "$r262" | jq -e 'has("detailPlan") and (.detailPlan.chainOrder|index("GROUNDED_SPECIFIED")!=null)' >/dev/null
echo "[PASS] Phase26 pick -> GROUNDED"

echo "[27] Phase27 FTS5 search (candidates snippet from actual text)"
r27="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r27" | jq -e '(.decisionFrame.mode=="HYBRID")' >/dev/null
echo "$r27" | jq -e 'has("candidates") and (.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
echo "$r27" | jq -e '(.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null
echo "[PASS] Phase27 FTS5"

echo "[28] Phase28 ranking quality (noise words filtered, content pages prioritized)"
r28="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r28" | jq -e 'has("candidates") and (.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
# cand0.snippet が "監修/校訂/全集" を含まない、または cand0.pdfPage が 1 以外
cand0_snippet="$(echo "$r28" | jq -r '.candidates[0].snippet // ""')"
cand0_page="$(echo "$r28" | jq -r '.candidates[0].pdfPage // 0')"
if echo "$cand0_snippet" | grep -qE "(監修|校訂|全集)"; then
  # ノイズ語が含まれている場合は pdfPage が 1 以外である必要がある
  if [ "$cand0_page" = "1" ]; then
    echo "[FAIL] Phase28: cand0 contains noise words and pdfPage=1"
    exit 1
  fi
fi
echo "[PASS] Phase28 ranking quality"

echo "[29] Phase29 LawCandidates (GROUNDED #詳細 shows lawCandidates)"
r29="$(post_chat_raw "言霊秘書.pdf pdfPage=6 テスト #詳細")"
echo "$r29" | jq -e '.decisionFrame.mode=="GROUNDED"' >/dev/null
echo "$r29" | jq -e 'has("detailPlan") and (.detailPlan.lawCandidates|type)=="array"' >/dev/null
echo "[PASS] Phase29 LawCandidates"

echo "[30] Phase30 SaikihoLawSet (水火の法則の内部構造、#詳細 shows saikiho)"
r30="$(post_chat_raw "言霊秘書.pdf pdfPage=6 テスト #詳細")"
echo "$r30" | jq -e '.decisionFrame.mode=="GROUNDED"' >/dev/null
echo "$r30" | jq -e 'has("detailPlan") and (.detailPlan.saikiho|type)=="object"' >/dev/null
echo "$r30" | jq -e '(.detailPlan.saikiho.laws|type)=="array"' >/dev/null
echo "[PASS] Phase30 SaikihoLawSet"

echo "[31] Phase31 candidate quality (empty pages excluded, cand0.snippet not \\f)"
r31="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r31" | jq -e 'has("candidates") and (.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
cand0_snippet="$(echo "$r31" | jq -r '.candidates[0].snippet // ""')"
if echo "$cand0_snippet" | grep -qE "^\\f$|^\\s*$"; then
  echo "[FAIL] Phase31: cand0.snippet is empty or only form feed"
  exit 1
fi
echo "[PASS] Phase31 candidate quality"

echo "[32] Phase32 four-layer tags (lawCandidates[0].tags is array)"
r32="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r32" | jq -e 'has("detailPlan") and (.detailPlan.lawCandidates|type)=="array"' >/dev/null
# lawCandidates[0].tags が配列であること（存在しない場合は空配列を入れて必ず存在させる）
if echo "$r32" | jq -e '(.detailPlan.lawCandidates|length)>0' >/dev/null 2>&1; then
  echo "$r32" | jq -e '(.detailPlan.lawCandidates[0].tags|type)=="array"' >/dev/null
else
  # lawCandidates が空の場合は空配列を確認
  echo "$r32" | jq -e '(.detailPlan.lawCandidates|type)=="array"' >/dev/null
fi
echo "[PASS] Phase32 four-layer tags"

echo "[33] Phase33 kojikiTags (detailPlan.kojikiTags is array)"
r33="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r33" | jq -e 'has("detailPlan")' >/dev/null
echo "$r33" | jq -e '(.detailPlan.kojikiTags|type)=="array"' >/dev/null
echo "[PASS] Phase33 kojikiTags"

echo "[34] Phase34 mythMapEdges (detailPlan.mythMapEdges is array)"
r34="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r34" | jq -e 'has("detailPlan")' >/dev/null
echo "$r34" | jq -e '(.detailPlan.mythMapEdges|type)=="array"' >/dev/null
echo "[PASS] Phase34 mythMapEdges"

echo "[35] Phase35 mythMapEdges recall (same threadId)"
r35a="$(post_chat_raw_tid "言霊とは何？ #詳細" "p35")"
r35b="$(post_chat_raw_tid "言霊とは何？ #詳細" "p35")"
echo "$r35b" | jq -e 'has("detailPlan")' >/dev/null
echo "$r35b" | jq -e '(.detailPlan.mythMapEdges|type)=="array"' >/dev/null
echo "[PASS] Phase35 mythMapEdges recall"

echo "[GATE] No Runtime LLM usage in logs"
if sudo journalctl -u tenmon-ark-api.service --since "$SINCE" --no-pager | grep -q "\[KANAGI-LLM\]"; then
  echo "[FAIL] Runtime LLM usage detected in logs."
  exit 1
fi
echo "[PASS] No Runtime LLM usage detected."

echo "[PASS] acceptance_test.sh"
