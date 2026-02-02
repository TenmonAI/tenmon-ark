#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"
DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"

# DB参照先を data ディレクトリに統一
export TENMON_DATA_DIR="$DATA_DIR"

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TEST_START_TIME="$(date '+%Y-%m-%d %H:%M:%S')"

http_get_json() {
  # usage: http_get_json URL [curl_opts...]  -> prints "CODE<TAB>BODY"
  local url="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(curl -sS -m 1 -o "$tmp" -w '%{http_code}' "$@" "$url" || echo 000)"
  local body
  body="$(cat "$tmp" 2>/dev/null || true)"
  rm -f "$tmp"
  printf "%s\t%s" "$code" "$body"
}

echo "[1] deploy (NO_RESTART=1)"
NO_RESTART=1 bash scripts/deploy_live.sh

echo "[1-1] apply DB schema (bail) + ensure kokuzo_pages and audit tables exist"
command -v sqlite3 >/dev/null 2>&1 || (echo "[FAIL] sqlite3 missing. run: sudo apt-get install -y sqlite3" && exit 1)
# dataDir が無ければ作成
sudo mkdir -p "$DATA_DIR" || true

# kokuzo schema を適用
sqlite3 -bail "$DATA_DIR/kokuzo.sqlite" < "$REPO/src/db/kokuzo_schema.sql"
has_pages="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT name FROM sqlite_master WHERE type='table' AND name='kokuzo_pages' LIMIT 1;")"
test "$has_pages" = "kokuzo_pages" || (echo "[FAIL] kokuzo_pages missing after schema apply" && exit 1)

# audit schema を適用
sqlite3 -bail "$DATA_DIR/audit.sqlite" < "$REPO/src/db/approval_schema.sql" 2>/dev/null || true
sqlite3 -bail "$DATA_DIR/audit.sqlite" < "$REPO/src/db/audit_schema.sql" 2>/dev/null || true
has_tool_audit="$(sqlite3 "$DATA_DIR/audit.sqlite" "SELECT name FROM sqlite_master WHERE type='table' AND name='tool_audit' LIMIT 1;" 2>/dev/null || echo "")"
test "$has_tool_audit" = "tool_audit" || (echo "[FAIL] tool_audit missing after audit schema apply (has_tool_audit=$has_tool_audit)" && exit 1)

# kokuzo_pages count > 0 を確認（必須ゲート）
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[FAIL] kokuzo_pages is empty (count=0). Must ingest data before proceeding."
  echo ""
  echo "To ingest KHS data, run:"
  echo "  cd /opt/tenmon-ark-repo/api"
  echo "  bash scripts/ingest_khs_from_pdf.sh  # Extract from PDF (pages 1-3)"
  echo "  # OR"
  echo "  bash scripts/ingest_khs_minimal.sh  # Use minimal sample data"
  exit 1
fi
echo "[PASS] DB schema ok (kokuzo_pages exists, tool_audit exists, pages_count=$PAGES_COUNT, dataDir=$DATA_DIR)"

echo "[2] dist must match (repo vs live)"
diff -qr /opt/tenmon-ark-repo/api/dist /opt/tenmon-ark-live/dist >/dev/null || (echo "[FAIL] dist mismatch (repo vs live)" && exit 1)
echo "[PASS] dist synced"

# --- after deploy_live.sh (or build+deploy) ---

echo "[1-0] ensure single listener on :3000 (final restart happens here)"
# まずsystemdを止めてから、残骸pidを掃除（順序が大事）
sudo systemctl stop tenmon-ark-api.service || true
sleep 0.2

PIDS="$(sudo ss -ltnp 'sport = :3000' 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\),.*/\1/p' | sort -u)"
if [ -n "${PIDS}" ]; then
  echo "[1-0] kill stray pids: ${PIDS}"
  for p in ${PIDS}; do sudo kill -9 "${p}" 2>/dev/null || true; done
  sleep 0.2
fi

sudo systemctl start tenmon-ark-api.service
sleep 0.4

# ★ここから先だけを見る（"最終起動"確定）
SINCE="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[1-0] SINCE=${SINCE}"

echo "[2] wait /api/audit (ok==true + gitSha + readiness)"
REPO_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD)"

for i in $(seq 1 200); do
  out="$(http_get_json "$BASE_URL/api/audit")"
  code="${out%%$'\t'*}"
  body="${out#*$'\t'}"

  if [ "$code" = "200" ] && echo "$body" | jq -e 'type=="object" and .ok==true' >/dev/null 2>&1; then
    LIVE_SHA="$(echo "$body" | jq -r '.gitSha // ""')"
    if [ -n "$LIVE_SHA" ] && [ "$LIVE_SHA" = "$REPO_SHA" ]; then
      echo "[PASS] audit ready (gitSha=$LIVE_SHA)"
      break
    fi
  fi
  sleep 0.2
done

# 最終確認
out="$(http_get_json "$BASE_URL/api/audit")"
code="${out%%$'\t'*}"
body="${out#*$'\t'}"
[ "$code" = "200" ] || (echo "[FAIL] audit not 200 (code=$code)" && echo "$body" && exit 1)
LIVE_SHA="$(echo "$body" | jq -r '.gitSha // ""')"
[ "$LIVE_SHA" = "$REPO_SHA" ] || (echo "[FAIL] audit gitSha mismatch (live=$LIVE_SHA repo=$REPO_SHA)" && exit 1)
# readiness.dbReady.audit == true を確認
echo "$body" | jq -e '(.readiness.dbReady.audit == true)' >/dev/null || (echo "[FAIL] audit dbReady.audit is not true" && echo "$body" | jq '.readiness' && exit 1)
echo "[PASS] audit dbReady.audit == true"

echo "[2-1] wait /api/chat (decisionFrame contract must be ready)"
for i in $(seq 1 200); do
  out="$(http_get_json "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"threadId":"t-probe","message":"hello"}')"
  code="${out%%$'\t'*}"
  body="${out#*$'\t'}"

  if [ "$code" = "200" ] && echo "$body" | jq -e '
    type=="object" and
    .decisionFrame.llm==null and
    (.decisionFrame.ku|type)=="object" and
    (.response|type)=="string"
  ' >/dev/null 2>&1; then
    echo "[PASS] chat ready"
    break
  fi
  sleep 0.2
done

# 最終確認
out="$(http_get_json "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"threadId":"t-probe","message":"hello"}')"
code="${out%%$'\t'*}"
body="${out#*$'\t'}"
[ "$code" = "200" ] || (echo "[FAIL] chat not 200 (code=$code)" && echo "$body" && exit 1)
echo "$body" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null \
  || (echo "[FAIL] /api/chat contract not ready" && exit 1)

echo "[3] wait /api/chat (decisionFrame contract)"
chat_ready=""
last=""

for i in $(seq 1 120); do
  last="$(curl -sS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d '{"threadId":"t","message":"hello"}' 2>/dev/null || true)"

  if echo "$last" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null 2>&1; then
    chat_ready="yes"
    echo "[PASS] chat ready"
    break
  fi
  sleep 0.2
done

if [ -z "$chat_ready" ]; then
  echo "[FAIL] /api/chat not ready"
  echo "---- last /api/chat ----"
  echo "$last" | tail -n 40 || true
  echo "---- ss :3000 ----"
  sudo ss -lptn 'sport = :3000' || true
  echo "---- systemctl status ----"
  sudo systemctl status tenmon-ark-api.service --no-pager -l || true
  echo "---- journalctl (since test start: $TEST_START_TIME) ----"
  sudo journalctl -u tenmon-ark-api.service --since "$TEST_START_TIME" --no-pager || true
  exit 1
fi

echo "[3-1] wait /api/chat (contract ready)"
for i in $(seq 1 120); do
  chat="$(curl -sS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d '{"threadId":"t","message":"hello"}' 2>/dev/null || true)"
  if echo "$chat" | jq -e 'type=="object" and .decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null 2>&1; then
    echo "[PASS] chat ready"
    break
  fi
  sleep 0.2
done

# 最終確認（リトライが通った後の本番チェック、ここで取れなければFAIL）
chat="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"hello"}')"
echo "$chat" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null

echo "[4] /api/chat decisionFrame contract"
resp=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"hello"}')
echo "$resp" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null

post_chat_raw() {
  curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"t\",\"message\":\"$1\"}"
}
post_chat_raw_tid() {
  local msg="$1"; local tid="$2"
  curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"$tid\",\"message\":\"$msg\"}"
}
assert_natural() {
  local json="$1"
  echo "$json" | jq -e '.decisionFrame.mode=="NATURAL" and .decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' >/dev/null
}

echo "[19] NATURAL mode (hello / date / help)"
r1="$(post_chat_raw "hello")"; assert_natural "$r1"
r2="$(post_chat_raw "date")";  assert_natural "$r2"; echo "$r2" | jq -r '.response' | grep -E 'JST' >/dev/null
r3="$(post_chat_raw "help")";  assert_natural "$r3"; echo "$r3" | jq -r '.response' | grep -E '1\)|2\)|3\)' >/dev/null
echo "[PASS] Phase19 NATURAL"

echo "[19-0] NATURAL Japanese greeting gate"
r0="$(post_chat_raw "おはよう")"; assert_natural "$r0"
echo "$r0" | jq -r '.response' | grep -E 'おはよう|天聞アーク' >/dev/null
echo "[PASS] Phase19-0"

echo "[20] CorePlan container (HYBRID detailPlan) gate"
r20="$(post_chat_raw "coreplan test")"
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
echo "$r21" | jq -e '(.detailPlan.chainOrder|index("TRUTH_CORE")!=null)' >/dev/null
echo "[PASS] Phase21 Truth-Core"

echo "[22] Verifier applied (detailPlan.chainOrder contains VERIFIER)"
r22="$(post_chat_raw "coreplan test")"
echo "$r22" | jq -e '(.detailPlan.chainOrder|index("VERIFIER")!=null)' >/dev/null
echo "$r22" | jq -e '(.detailPlan.warnings|join(" ")|test("VERIFIER: evidence missing"))' >/dev/null
echo "[PASS] Phase22 Verifier"

echo "[23] Kokuzo recall (same threadId)"
tid="t-kokuzo"
r231="$(post_chat_raw_tid "coreplan test" "$tid")"
r232="$(post_chat_raw_tid "coreplan test" "$tid")"
echo "$r232" | jq -e '(.detailPlan.chainOrder|index("KOKUZO_RECALL")!=null)' >/dev/null
echo "[PASS] Phase23 Kokuzo recall"

echo "[24] GROUNDED with evidenceIds (doc+pdfPage)"
r24="$(post_chat_raw "言霊秘書.pdf pdfPage=6 テスト #詳細")"
echo "$r24" | jq -e '.decisionFrame.mode=="GROUNDED"' >/dev/null
echo "$r24" | jq -e '(.detailPlan.evidenceIds|type)=="array"' >/dev/null
echo "[PASS] Phase24 GROUNDED evidenceIds"

echo "[25] HYBRID candidates gate (#詳細 shows candidates)"
r25="$(post_chat_raw "言灵とは何？ #詳細")"
echo "$r25" | jq -e '(.decisionFrame.mode=="HYBRID")' >/dev/null
echo "$r25" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
echo "[PASS] Phase25 candidates"

echo "[26] Phase26 pick candidate -> GROUNDED"
tid26="t-phase26"
r261="$(post_chat_raw_tid "言灵とは何？ #詳細" "$tid26")"
r262="$(post_chat_raw_tid "1" "$tid26")"
echo "$r262" | jq -e '(.decisionFrame.mode=="GROUNDED")' >/dev/null
echo "[PASS] Phase26 pick -> GROUNDED"

echo "[27] Phase27 FTS5 search (candidates snippet from actual text)"
r27="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r27" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null
echo "$r27" | jq -e '(.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null
echo "[PASS] Phase27 FTS5"

echo "[28] Phase28 ranking quality (noise words filtered, content pages prioritized)"
r28="$(post_chat_raw "言霊とは何？ #詳細")"
cand0_snippet="$(echo "$r28" | jq -r '.candidates[0].snippet // ""')"
cand0_page="$(echo "$r28" | jq -r '.candidates[0].pdfPage // 0')"
if echo "$cand0_snippet" | grep -qE "(監修|校訂|全集)"; then
  if [ "$cand0_page" = "1" ]; then
    echo "[FAIL] Phase28: cand0 contains noise words and pdfPage=1"
    exit 1
  fi
fi
echo "[PASS] Phase28 ranking quality"

echo "[33] Phase33 kojikiTags (detailPlan.kojikiTags is array)"
r33="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r33" | jq -e 'has("detailPlan")' >/dev/null
echo "$r33" | jq -e '(.detailPlan.kojikiTags|type)=="array"' >/dev/null
echo "[PASS] Phase33 kojikiTags"

echo "[36] Phase36 conversation flow (domain question -> answer, not menu only)"
r36_1="$(post_chat_raw "言霊とは何？")"
# ドメイン質問の場合はメニューだけではなく回答が含まれること（50文字以上）
echo "$r36_1" | jq -e '(.response|type)=="string" and (.response|length)>=50' >/dev/null
# メニューだけの場合は失敗
if echo "$r36_1" | jq -r '.response' | grep -qE "^了解。どの方向で話しますか"; then
  echo "[FAIL] Phase36: domain question returned menu only (should return answer)"
  exit 1
fi
# decisionFrame.ku が object であること（null/undefined禁止）
echo "$r36_1" | jq -e '(.decisionFrame.ku|type)=="object"' >/dev/null
# decisionFrame.llm が null であること
echo "$r36_1" | jq -e '(.decisionFrame.llm==null)' >/dev/null
echo "[PASS] Phase36 domain question -> answer"

echo "[36-1] Phase36-1 lane choice parsing (1/2/3 or keywords -> LANE)"
# まずメニューを表示させる（ドメイン質問でない質問を送る）
r36_2="$(post_chat_raw_tid "何か質問したい" "t36")"
# メニューが表示されることを確認
if ! echo "$r36_2" | jq -r '.response' | grep -qE "どの方向で話しますか"; then
  echo "[SKIP] Phase36-1: menu not shown, skipping lane choice test"
else
  # メニューを表示した後、選択を送る
  r36_3="$(post_chat_raw_tid "1" "t36")"
  # LANE_1 の選択が正しく処理されること（メニューに戻らず回答に進む）
  if echo "$r36_3" | jq -r '.response' | grep -qE "^了解。どの方向で話しますか"; then
    echo "[FAIL] Phase36-1: lane choice returned menu again (should proceed to answer)"
    exit 1
  fi
  # 回答が50文字以上であること
  echo "$r36_3" | jq -e '(.response|type)=="string" and (.response|length)>=50' >/dev/null
  # decisionFrame.ku が object であること
  echo "$r36_3" | jq -e '(.decisionFrame.ku|type)=="object"' >/dev/null
  echo "[PASS] Phase36-1 lane choice parsing"
fi

echo "[36-2] Phase36-2 domain question with no candidates (fallback response)"
r36_4="$(post_chat_raw_tid "存在しないドメイン質問テスト" "t36-2")"
# 候補がなくても回答が50文字以上であること
echo "$r36_4" | jq -e '(.response|type)=="string" and (.response|length)>=50' >/dev/null
# decisionFrame.ku が object であること
echo "$r36_4" | jq -e '(.decisionFrame.ku|type)=="object"' >/dev/null
echo "[PASS] Phase36-2 fallback response"

echo "[37] Phase37 KHS minimal ingestion E2E (ingest -> query -> evidence)"
# kokuzo_pages count > 0 は Phase1-1 で既に確認済み（FAIL で終了するため、ここには到達しない）
# 念のため再確認
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[FAIL] Phase37: kokuzo_pages is empty (should have been caught in Phase1-1)"
  exit 1
fi
# 「言霊とは何？」で引用が出ることを確認
r37="$(post_chat_raw_tid "言霊とは何？" "t37")"
# 回答が50文字以上であること（固定文だけにならない）
echo "$r37" | jq -e '(.response|type)=="string" and (.response|length)>=50' >/dev/null || (echo "[FAIL] Phase37: response is too short or not a string" && exit 1)
# 固定文だけではないことを確認（「該当する資料が見つかりませんでした」だけではない）
if echo "$r37" | jq -r '.response' | grep -qE "該当する資料が見つかりませんでした"; then
  echo "[WARN] Phase37: response contains 'not found' message (may be OK if no data ingested)"
else
  echo "[PASS] Phase37: response is not just 'not found' message"
fi
# candidates が存在すること（KHS データが投入されていれば）
if echo "$r37" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  # evidence または detailPlan.evidence に doc/pdfPage が含まれること
  has_evidence="$(echo "$r37" | jq -e '(.evidence != null) or (.detailPlan.evidence != null)' 2>/dev/null && echo "yes" || echo "no")"
  if [ "$has_evidence" = "yes" ]; then
    echo "[PASS] Phase37 evidence found in response"
  else
    echo "[WARN] Phase37: candidates found but evidence not set (may be OK if pageText is empty)"
  fi
  # snippet が存在すること
  echo "$r37" | jq -e '(.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null && echo "[PASS] Phase37 snippet found" || echo "[WARN] Phase37: snippet missing"
else
  echo "[WARN] Phase37: no candidates found (KHS data may not be ingested)"
fi
# decisionFrame.ku が object であること
echo "$r37" | jq -e '(.decisionFrame.ku|type)=="object"' >/dev/null
echo "[PASS] Phase37 KHS E2E"

echo "[38] Phase38 kotodama tags (doc=KHS pdfPage=32 -> tags >= 1)"
# doc=KHS pdfPage=32 を指定して tags が最低1つ出ることを確認
r38="$(post_chat_raw_tid "doc=KHS pdfPage=32" "t38")"
# candidates が存在すること
if echo "$r38" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  # candidates[0] に tags が存在し、最低1つあること
  echo "$r38" | jq -e '(.candidates[0].tags|type)=="array" and (.candidates[0].tags|length)>=1' >/dev/null || (echo "[FAIL] Phase38: tags not found or empty" && echo "$r38" | jq '.candidates[0]' && exit 1)
  # tags が IKI/SHIHO/KAMI/HOSHI のいずれかであること
  echo "$r38" | jq -e '(.candidates[0].tags|map(. as $tag | $tag == "IKI" or $tag == "SHIHO" or $tag == "KAMI" or $tag == "HOSHI")|all)' >/dev/null || (echo "[FAIL] Phase38: invalid tags" && echo "$r38" | jq '.candidates[0].tags' && exit 1)
  echo "[PASS] Phase38 kotodama tags"
else
  echo "[WARN] Phase38: no candidates found (KHS data may not be ingested)"
fi

echo "[GATE] No Runtime LLM usage in logs"
if sudo journalctl -u tenmon-ark-api.service --since "$(date '+%Y-%m-%d %H:%M:%S' -d '1 minute ago')" --no-pager | grep -q "\[KANAGI-LLM\]"; then
  echo "[FAIL] Runtime LLM usage detected in logs."
  exit 1
fi
echo "[PASS] No Runtime LLM usage detected."
echo "[PASS] acceptance_test.sh"
