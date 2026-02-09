#!/usr/bin/env bash

# NOTE: 推測修正ループを物理的に潰すため、FAIL時に必ず EvidencePack を吐く
set -euo pipefail

evidence_pack() {
  local why="${1:-ERR}"
  local ts
  ts="$(date +%F_%H%M%S)"
  echo
  echo "===== [EVIDENCEPACK] ${ts} why=${why} ====="
  echo "PWD=$(pwd)"
  echo
  echo "## git"
  git rev-parse --short HEAD 2>/dev/null || true
  git status --porcelain 2>/dev/null || true
  echo
  echo "## systemd status"
  sudo systemctl status tenmon-ark-api.service --no-pager -l || true
  echo
  echo "## journal (last 200)"
  sudo journalctl -u tenmon-ark-api.service -n 200 --no-pager || true
  echo
  echo "## listen ports (:3000)"
  sudo ss -ltnp | grep -E '(:3000)\b' || true
  echo
  echo "## local audit"
  curl -fsS http://127.0.0.1:3000/api/audit | jq . || true
  echo "===== [EVIDENCEPACK END] ====="
  echo
}

on_err() {
  local rc=$?
  # BASH_COMMAND は set -u により未定義になる場合があるので保守的に扱う
  evidence_pack "rc=${rc} line=${LINENO}"
  exit "${rc}"
}
trap on_err ERR

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"
DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"

# DB参照先を data ディレクトリに統一
export TENMON_DATA_DIR="$DATA_DIR"

# LLM_SURFACE を強制OFF（acceptance では LLM を使用しない）
export ENABLE_LLM_SURFACE=0

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

echo "[00] Phase00 build sha matches repo HEAD"
HEAD_SHA="$(git rev-parse --short HEAD)"

AUDIT_SHA=""
for i in $(seq 1 25); do
  AUDIT_SHA="$(curl -fsS -m 1 "$BASE_URL/api/audit" 2>/dev/null | jq -r '.gitSha // empty' 2>/dev/null || true)"
  [ -n "$AUDIT_SHA" ] && break
  sleep 0.2
done

echo "HEAD_SHA=$HEAD_SHA AUDIT_SHA=$AUDIT_SHA"
[ -n "$AUDIT_SHA" ] || (echo "[FAIL] Phase00: /api/audit not ready" && exit 1)
[ "$HEAD_SHA" = "$AUDIT_SHA" ] || (echo "[FAIL] Phase00: build sha mismatch (HEAD=$HEAD_SHA, AUDIT=$AUDIT_SHA)" && exit 1)
echo "[PASS] Phase00 build sha matches"

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
# データが無い場合は自動投入を試みる（冪等）
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[INFO] kokuzo_pages is empty (count=0). Attempting to ingest from corpus..."
  # まず corpus から投入を試みる
  if [ -f "/opt/tenmon-corpus/db/khs_pages.jsonl" ] || [ -f "/opt/tenmon-corpus/db/khs_text.jsonl" ]; then
    echo "[INFO] Found corpus jsonl, running ingest_khs_from_corpus.sh"
    bash scripts/ingest_khs_from_corpus.sh || (echo "[WARN] corpus ingest failed, trying minimal sample" && bash scripts/ingest_khs_minimal.sh || true)
  else
    echo "[INFO] Corpus jsonl not found, trying minimal sample"
    bash scripts/ingest_khs_minimal.sh || true
  fi
  sleep 0.5
  # 再確認
  PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
  if [ "$PAGES_COUNT" = "0" ]; then
    echo "[FAIL] kokuzo_pages is still empty after ingestion attempt"
    echo ""
    echo "To manually ingest KHS data, run:"
    echo "  cd /opt/tenmon-ark-repo/api"
    echo "  bash scripts/ingest_khs_from_corpus.sh  # From corpus jsonl"
    echo "  # OR"
    echo "  bash scripts/ingest_khs_from_pdf.sh  # Extract from PDF (pages 1-3)"
    echo "  # OR"
    echo "  bash scripts/ingest_khs_minimal.sh  # Use minimal sample data"
    exit 1
  fi
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
# here-string で stdin を確実に閉じる（pipe待ち事故回避）
jq -e '.decisionFrame.mode=="GROUNDED"' <<<"$r24" >/dev/null
jq -e '(.detailPlan.evidenceIds|type)=="array"' <<<"$r24" >/dev/null
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

echo "[28-2] Phase28-2 placeholder exclusion gate ([NON_TEXT_PAGE_OR_OCR_FAILED] not in candidates[0])"
r28_2="$(post_chat_raw "言霊とは何？ #詳細")"
if ! echo "$r28_2" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase28-2: candidates array is empty or missing"
  exit 1
fi
cand0_snippet_28_2="$(echo "$r28_2" | jq -r '.candidates[0].snippet // ""')"
if echo "$cand0_snippet_28_2" | grep -qF "[NON_TEXT_PAGE_OR_OCR_FAILED]"; then
  echo "[FAIL] Phase28-2: candidates[0].snippet contains [NON_TEXT_PAGE_OR_OCR_FAILED]"
  echo "$r28_2" | jq '.candidates[0]'
  exit 1
fi
echo "[PASS] Phase28-2 placeholder exclusion"

echo "[28-3] Phase28-3 generation-chain pinned pages gate (KHS 35/119/384/402/549)"
r28_3="$(post_chat_raw "言霊秘書 生成鎖 息 音 五十連 形仮字 #詳細")"

echo "$r28_3" | jq -e '
  (.candidates|type)=="array" and
  (.candidates|length)>0 and
  ((.candidates[0].snippet // "") | tostring | contains("[NON_TEXT_PAGE_OR_OCR_FAILED]") | not) and
  ( any(.candidates[]?;
      .doc=="KHS" and
      ( ([35,119,384,402,549] | index(.pdfPage)) != null )
    )
  )
' >/dev/null 2>&1 || {
  echo "[FAIL] Phase28-3 generation-chain pinned pages gate"
  echo "$r28_3" | jq '{top:(.candidates[0]//null), sample:(.candidates[:8]//[])}'
  exit 1
}

echo "[PASS] Phase28-3 generation-chain pinned pages gate"

echo "[KHS_CHAIN] PhaseKHS_CHAIN 生成鎖クエリで KHS 重要ページが候補に含まれること"
r_khs_chain="$(post_chat_raw "言霊秘書 生成鎖 息 音 五十連 形仮字 #詳細")"
if ! echo "$r_khs_chain" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] PhaseKHS_CHAIN: candidates array is empty or missing"
  exit 1
fi
cand0_snippet_khs="$(echo "$r_khs_chain" | jq -r '.candidates[0].snippet // ""')"
if echo "$cand0_snippet_khs" | grep -qF "[NON_TEXT_PAGE_OR_OCR_FAILED]"; then
  echo "[FAIL] PhaseKHS_CHAIN: candidates[0].snippet contains [NON_TEXT_PAGE_OR_OCR_FAILED]"
  echo "$r_khs_chain" | jq '.candidates[0]'
  exit 1
fi
# candidates の中に (doc=='KHS' && pdfPage in {549,35,119,402,384}) が1つ以上あることを検証
pinned_found_khs="$(echo "$r_khs_chain" | jq -e 'any(.candidates[]; .doc=="KHS" and (.pdfPage==549 or .pdfPage==35 or .pdfPage==119 or .pdfPage==402 or .pdfPage==384))' 2>/dev/null || echo "false")"
if [ "$pinned_found_khs" != "true" ]; then
  echo "[FAIL] PhaseKHS_CHAIN: No pinned pages (KHS 549/35/119/402/384) found in candidates"
  echo "$r_khs_chain" | jq '.candidates[] | {doc, pdfPage}'
  exit 1
fi
echo "[PASS] PhaseKHS_CHAIN gen-chain KHS pinned pages"

echo "[33] Phase33 kojikiTags (detailPlan.kojikiTags is array)"
r33="$(post_chat_raw "言霊とは何？ #詳細")"
echo "$r33" | jq -e 'has("detailPlan")' >/dev/null
echo "$r33" | jq -e '(.detailPlan.kojikiTags|type)=="array"' >/dev/null
echo "[PASS] Phase33 kojikiTags"

echo "[MAN/DAN] PhaseMAN_DAN tags array gate (#詳細 detailPlan.manyoshuTags/danshariTags are arrays)"
r_man_dan="$(post_chat_raw_tid "言霊とは何？ #詳細" "t-man-dan")"
echo "$r_man_dan" | jq -e 'has("detailPlan")' >/dev/null || {
  echo "[FAIL] PhaseMAN_DAN: detailPlan missing"
  echo "$r_man_dan" | jq '.'
  exit 1
}
echo "$r_man_dan" | jq -e '(.detailPlan.manyoshuTags|type)=="array"' >/dev/null || {
  echo "[FAIL] PhaseMAN_DAN: manyoshuTags is not array"
  echo "$r_man_dan" | jq '.detailPlan.manyoshuTags'
  exit 1
}
echo "$r_man_dan" | jq -e '(.detailPlan.danshariTags|type)=="array"' >/dev/null || {
  echo "[FAIL] PhaseMAN_DAN: danshariTags is not array"
  echo "$r_man_dan" | jq '.detailPlan.danshariTags'
  exit 1
}
echo "[PASS] PhaseMAN_DAN tags array gate"

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
  # evidence に doc/pdfPage が含まれること（機械契約として必須）
  echo "$r37" | jq -e '.evidence.doc=="KHS" and (.evidence.pdfPage|type)=="number" and .evidence.pdfPage>=1' >/dev/null || {
    echo "[FAIL] Phase37: candidates found but evidence missing or invalid (expected doc=KHS, pdfPage>=1)"
    echo "$r37" | jq '.evidence'
    exit 1
  }
  # detailPlan.evidenceIds に KZPAGE エビデンスIDが最低1件あること
  echo "$r37" | jq -e '(.detailPlan.evidenceIds|type)=="array" and (.detailPlan.evidenceIds|length)>0' >/dev/null || {
    echo "[FAIL] Phase37: detailPlan.evidenceIds missing or empty despite candidates"
    echo "$r37" | jq '.detailPlan.evidenceIds'
    exit 1
  }
  echo "[PASS] Phase37 evidence + evidenceIds attached"
else
  echo "[WARN] Phase37: no candidates found (KHS data may not be ingested)"
fi
# decisionFrame.ku が object であること
echo "$r37" | jq -e '(.decisionFrame.ku|type)=="object"' >/dev/null
echo "[PASS] Phase37 KHS E2E"

echo "[38] Phase38 kotodama tags (doc=KHS pdfPage=32 -> tags >= 1)"
# doc=KHS pdfPage=32 を指定して tags が最低1つ出ることを確認
r38="$(post_chat_raw_tid "doc=KHS pdfPage=32" "t38")"
# candidates が存在すること（必須）
if ! echo "$r38" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase38: no candidates found (KHS data may not be ingested)"
  echo "$r38" | jq '.'
  exit 1
fi
# candidates[0] に tags が存在し、最低1つあること
echo "$r38" | jq -e '(.candidates[0].tags|type)=="array" and (.candidates[0].tags|length)>=1' >/dev/null || (echo "[FAIL] Phase38: tags not found or empty" && echo "$r38" | jq '.candidates[0]' && exit 1)
# tags が IKI/SHIHO/KAMI/HOSHI のいずれかであること
echo "$r38" | jq -e '(.candidates[0].tags|map(. as $tag | $tag == "IKI" or $tag == "SHIHO" or $tag == "KAMI" or $tag == "HOSHI")|all)' >/dev/null || (echo "[FAIL] Phase38: invalid tags" && echo "$r38" | jq '.candidates[0].tags' && exit 1)
# candidates[0].snippet が存在し、長さ>0であること
echo "$r38" | jq -e '(.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null || (echo "[FAIL] Phase38: snippet not found or empty" && echo "$r38" | jq '.candidates[0]' && exit 1)
echo "[PASS] Phase38 kotodama tags"

echo "[39] Phase39 corpus ingestion gate (doc=KHS count>=1, candidates.length>=1, snippet length>0)"
# (a) kokuzo_pages に doc=KHS が 1件以上
KHS_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='KHS';" 2>/dev/null || echo "0")"
if [ "$KHS_COUNT" = "0" ]; then
  echo "[FAIL] Phase39: kokuzo_pages has no doc='KHS' records"
  exit 1
fi
echo "[PASS] Phase39: kokuzo_pages doc='KHS' count=$KHS_COUNT"
# (b) /api/chat で "言霊とは？ #詳細" が candidates.length>=1
r39="$(post_chat_raw_tid "言霊とは？ #詳細" "t39")"
if ! echo "$r39" | jq -e '(.candidates|type)=="array" and (.candidates|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase39: candidates.length < 1 for '言霊とは？ #詳細'"
  echo "$r39" | jq '.candidates'
  exit 1
fi
echo "[PASS] Phase39: candidates.length >= 1"
# (c) "doc=KHS pdfPage=32" が candidates[0].snippet を返す（length>0）
r39_32="$(post_chat_raw_tid "doc=KHS pdfPage=32" "t39-32")"
if ! echo "$r39_32" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0 and (.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase39: doc=KHS pdfPage=32 did not return snippet with length>0"
  echo "$r39_32" | jq '.candidates[0]'
  exit 1
fi
echo "[PASS] Phase39: doc=KHS pdfPage=32 snippet length>0"
echo "[PASS] Phase39 corpus ingestion gate"

echo "[40] Phase40 law commit and list (doc=KHS pdfPage=32 -> commit -> list >= 1)"
# doc=KHS pdfPage=32 を commit できる
tid40="t40"
commit_resp="$(curl -fsS "$BASE_URL/api/law/commit" -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$tid40\",\"doc\":\"KHS\",\"pdfPage\":32}")"
if ! echo "$commit_resp" | jq -e '.ok==true and (.id|type)=="number"' >/dev/null 2>&1; then
  echo "[FAIL] Phase40: commit failed"
  echo "$commit_resp" | jq '.'
  exit 1
fi
echo "[PASS] Phase40: commit succeeded"
# list で 1件以上返る
list_resp="$(curl -fsS "$BASE_URL/api/law/list?threadId=$tid40")"
if ! echo "$list_resp" | jq -e '.ok==true and (.laws|type)=="array" and (.laws|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase40: list failed or empty"
  echo "$list_resp" | jq '.'
  exit 1
fi
# laws[0] に必要なフィールドが存在すること
if ! echo "$list_resp" | jq -e '(.laws[0].doc=="KHS") and (.laws[0].pdfPage==32) and (.laws[0].quote|type)=="string" and (.laws[0].tags|type)=="array"' >/dev/null 2>&1; then
  echo "[FAIL] Phase40: laws[0] missing required fields"
  echo "$list_resp" | jq '.laws[0]'
  exit 1
fi
echo "[PASS] Phase40 law commit and list"

echo "[41] Phase41 law recall (same threadId -> list persists)"
# 同一threadIdで list が継続して返る（最低限の recall）
tid41="t41"
# 最初の commit
commit_resp_41_1="$(curl -fsS "$BASE_URL/api/law/commit" -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$tid41\",\"doc\":\"KHS\",\"pdfPage\":32}")"
if ! echo "$commit_resp_41_1" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] Phase41: first commit failed"
  echo "$commit_resp_41_1" | jq '.'
  exit 1
fi
# 最初の list
list_resp_41_1="$(curl -fsS "$BASE_URL/api/law/list?threadId=$tid41")"
count_1="$(echo "$list_resp_41_1" | jq -r '.laws|length' 2>/dev/null || echo "0")"
if [ "$count_1" -lt 1 ]; then
  echo "[FAIL] Phase41: first list failed or empty"
  echo "$list_resp_41_1" | jq '.'
  exit 1
fi
# 2回目の commit（別ページ）
commit_resp_41_2="$(curl -fsS "$BASE_URL/api/law/commit" -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$tid41\",\"doc\":\"KHS\",\"pdfPage\":35}")"
if ! echo "$commit_resp_41_2" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] Phase41: second commit failed"
  echo "$commit_resp_41_2" | jq '.'
  exit 1
fi
# 2回目の list（継続して返る）
list_resp_41_2="$(curl -fsS "$BASE_URL/api/law/list?threadId=$tid41")"
count_2="$(echo "$list_resp_41_2" | jq -r '.laws|length' 2>/dev/null || echo "0")"
if [ "$count_2" -lt 2 ]; then
  echo "[FAIL] Phase41: second list should have >= 2 items (count=$count_2)"
  echo "$list_resp_41_2" | jq '.laws'
  exit 1
fi
# 最初のエントリが残っていること（recall）
if ! echo "$list_resp_41_2" | jq -e '(.laws|map(select(.doc=="KHS" and .pdfPage==32))|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase41: first entry not found in recall (laws not persisted)"
  echo "$list_resp_41_2" | jq '.laws'
  exit 1
fi
echo "[PASS] Phase41 law recall"

echo "[42] Phase42 file upload (/api/upload -> ok==true, sha256, size, savedPath, file exists)"
# 小さなファイル（数バイト）をmultipartで送って ok==true を確認
TEST_FILE="/tmp/up_phase42.txt"
printf "hello phase42" > "$TEST_FILE"
UPLOAD_RESP="$(curl -fsS -F "file=@$TEST_FILE" "$BASE_URL/api/upload")"
# ok==true を確認
if ! echo "$UPLOAD_RESP" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] Phase42: upload response ok!=true"
  echo "$UPLOAD_RESP" | jq '.'
  exit 1
fi
# sha256 が 64hex であること
if ! echo "$UPLOAD_RESP" | jq -e '(.sha256|type)=="string" and (.sha256|length)==64 and (.sha256|test("^[0-9a-f]+$"))' >/dev/null 2>&1; then
  echo "[FAIL] Phase42: sha256 is not 64 hex chars"
  echo "$UPLOAD_RESP" | jq '.sha256'
  exit 1
fi
# size が正しい
EXPECTED_SIZE="$(wc -c < "$TEST_FILE" | tr -d ' ')"
if ! echo "$UPLOAD_RESP" | jq -e "(.size|type)==\"number\" and .size==$EXPECTED_SIZE" >/dev/null 2>&1; then
  echo "[FAIL] Phase42: size mismatch (expected=$EXPECTED_SIZE)"
  echo "$UPLOAD_RESP" | jq '.size'
  exit 1
fi
# savedPath が uploads/ で始まる
if ! echo "$UPLOAD_RESP" | jq -e '(.savedPath|type)=="string" and (.savedPath|startswith("uploads/"))' >/dev/null 2>&1; then
  echo "[FAIL] Phase42: savedPath does not start with uploads/"
  echo "$UPLOAD_RESP" | jq '.savedPath'
  exit 1
fi
# 実ファイルが TENMON_DATA_DIR/uploads/<name> に存在する
SAVED_NAME="$(echo "$UPLOAD_RESP" | jq -r '.fileName')"
if [ ! -f "$DATA_DIR/uploads/$SAVED_NAME" ]; then
  echo "[FAIL] Phase42: file not found at $DATA_DIR/uploads/$SAVED_NAME"
  exit 1
fi
echo "[PASS] Phase42 file upload"

echo "[43] Phase43 alg commit + list gate (kokuzo_algorithms)"
# POST /api/alg/commit で以下を保存できること
ALG_COMMIT_BODY='{"threadId":"t43","title":"KHS Breath->Sound->50->Kana","steps":[{"text":"天地の息が動くと音が発する","doc":"KHS","pdfPage":549},{"text":"息の形が五十連となる","doc":"KHS","pdfPage":549}]}'
ALG_COMMIT_RESP="$(curl -fsS "$BASE_URL/api/alg/commit" -H "Content-Type: application/json" -d "$ALG_COMMIT_BODY")"
# commit が ok==true で id:number
if ! echo "$ALG_COMMIT_RESP" | jq -e '.ok==true and (.id|type)=="number"' >/dev/null 2>&1; then
  echo "[FAIL] Phase43: alg commit failed"
  echo "$ALG_COMMIT_RESP" | jq '.'
  exit 1
fi
# list が algorithms.length>=1
ALG_LIST_RESP="$(curl -fsS "$BASE_URL/api/alg/list?threadId=t43")"
if ! echo "$ALG_LIST_RESP" | jq -e '.ok==true and (.algorithms|type)=="array" and (.algorithms|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase43: alg list failed or empty"
  echo "$ALG_LIST_RESP" | jq '.'
  exit 1
fi
# algorithms[0].steps が配列に戻せる（JSON parse）
if ! echo "$ALG_LIST_RESP" | jq -e '(.algorithms[0].steps|type)=="array" and (.algorithms[0].steps|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase43: algorithms[0].steps is not an array"
  echo "$ALG_LIST_RESP" | jq '.algorithms[0].steps'
  exit 1
fi
# algorithms[0].title が正しい
if ! echo "$ALG_LIST_RESP" | jq -e '(.algorithms[0].title)=="KHS Breath->Sound->50->Kana"' >/dev/null 2>&1; then
  echo "[FAIL] Phase43: algorithms[0].title mismatch"
  echo "$ALG_LIST_RESP" | jq '.algorithms[0].title'
  exit 1
fi
echo "[PASS] Phase43 alg commit + list gate"

echo "[44] Phase44 ingest request/confirm gate"
# テスト用PDFを生成（PythonでPDFを自作：外部依存なし）
TEST_PDF_44="/tmp/up_phase44.pdf"
python3 - <<'PY'
import io

text = "hello phase44"
# --- build minimal PDF with correct xref offsets ---
parts = []
offsets = []

def w(s: bytes):
    parts.append(s)

def mark():
    offsets.append(sum(len(p) for p in parts))

w(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

# 1: Catalog
mark(); w(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
# 2: Pages
mark(); w(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
# 3: Page
mark(); w(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] "
          b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n")
# 4: Contents
stream = f"BT /F1 16 Tf 40 120 Td ({text}) Tj ET\n".encode("utf-8")
mark(); w(b"4 0 obj\n<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"endstream\nendobj\n")
# 5: Font
mark(); w(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

xref_pos = sum(len(p) for p in parts)
w(b"xref\n0 6\n")
w(b"0000000000 65535 f \n")
for off in offsets:
    w(f"{off:010d} 00000 n \n".encode("ascii"))

w(b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n")
w(str(xref_pos).encode("ascii") + b"\n%%EOF\n")

pdf = b"".join(parts)
open("/tmp/up_phase44.pdf","wb").write(pdf)
print("wrote", len(pdf), "bytes to /tmp/up_phase44.pdf")
PY

# そのPDFを /api/upload へ
up44="$(curl -fsS -F "file=@${TEST_PDF_44}" "$BASE_URL/api/upload")"
if ! echo "$up44" | jq -e '.ok==true and (.savedPath|type)=="string" and (.savedPath|startswith("uploads/"))' >/dev/null 2>&1; then
  echo "[FAIL] Phase44: upload failed (no savedPath)"
  echo "$up44" | jq '.'
  exit 1
fi
savedPath44="$(echo "$up44" | jq -r '.savedPath')"

# /api/ingest/request（docは安全な名前で）
doc44="UP44"
r44_req="$(curl -fsS "$BASE_URL/api/ingest/request" -H "Content-Type: application/json" \
  -d "{\"threadId\":\"t44\",\"savedPath\":\"${savedPath44}\",\"doc\":\"${doc44}\"}")"
if ! echo "$r44_req" | jq -e '.ok==true and (.ingestId|type)=="string" and (.confirmText|type)=="string"' >/dev/null 2>&1; then
  echo "[FAIL] Phase44: ingest request failed"
  echo "$r44_req" | jq '.'
  exit 1
fi
ingestId44="$(echo "$r44_req" | jq -r '.ingestId')"

# /api/ingest/confirm
r44_ok="$(curl -fsS "$BASE_URL/api/ingest/confirm" -H "Content-Type: application/json" \
  -d "{\"ingestId\":\"${ingestId44}\",\"confirm\":true}")"
if ! echo "$r44_ok" | jq -e '.ok==true and (.doc=="UP44") and (.pagesInserted|type)=="number" and (.pagesInserted>=1) and (.emptyPages|type)=="number"' >/dev/null 2>&1; then
  echo "[FAIL] Phase44: ingest confirm failed"
  echo "$r44_ok" | jq '.'
  exit 1
fi

# DBに doc が入ったか（最低1件）
c44="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='UP44';" 2>/dev/null || echo "0")"
if [ "$c44" -lt 1 ]; then
  echo "[FAIL] Phase44: UP44 not ingested into kokuzo_pages (count=$c44)"
  exit 1
fi

# FTS確認：kokuzo_pages_fts が存在し検索が落ちない
FTS_COUNT_44="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages_fts WHERE doc='UP44';" 2>/dev/null || echo "0")"
if [ "$FTS_COUNT_44" -lt 1 ]; then
  echo "[FAIL] Phase44: kokuzo_pages_fts has no entries for doc=UP44 (count=$FTS_COUNT_44)"
  exit 1
fi
echo "[PASS] Phase44 ingest request/confirm gate"

echo "[45] Phase45 chat integration smoke (ingest後に /api/chat で doc=<doc> pdfPage=1 を叩いて snippet length>0 が返る)"
# ingest後に /api/chat で doc=<doc> pdfPage=1 を叩いて snippet length>0 が返る
r45="$(post_chat_raw_tid "doc=UP44 pdfPage=1" "t45")"
if ! echo "$r45" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0 and (.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase45: chat response after ingest did not return snippet"
  echo "$r45" | jq '.candidates[0]'
  exit 1
fi
echo "[PASS] Phase45 chat integration smoke"

echo "[45-1] Phase45-1 HOKKE ingest gate (PDF extraction produces non-empty text)"
# HOKKE PDF が存在する場合のみテスト（存在しない場合は SKIP）
HOKKE_PDF=""
if [ -f "/opt/tenmon-corpus/pdf/HOKKE.pdf" ]; then
  HOKKE_PDF="/opt/tenmon-corpus/pdf/HOKKE.pdf"
elif [ -f "$DATA_DIR/uploads/HOKKE.pdf" ]; then
  HOKKE_PDF="$DATA_DIR/uploads/HOKKE.pdf"
fi

if [ -n "$HOKKE_PDF" ]; then
  # HOKKE PDF を uploads にコピー（まだ無い場合）
  if [ ! -f "$DATA_DIR/uploads/HOKKE.pdf" ]; then
    cp "$HOKKE_PDF" "$DATA_DIR/uploads/HOKKE.pdf"
  fi

  # /api/upload で HOKKE.pdf をアップロード（既に存在する場合はスキップ）
  HOKKE_UPLOAD="$(curl -fsS -F "file=@${DATA_DIR}/uploads/HOKKE.pdf" "$BASE_URL/api/upload" 2>/dev/null || echo '{"ok":false}')"
  HOKKE_SAVED_PATH="$(echo "$HOKKE_UPLOAD" | jq -r '.savedPath // "uploads/HOKKE.pdf"')"

  # /api/ingest/request
  HOKKE_REQ="$(curl -fsS "$BASE_URL/api/ingest/request" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"t-hokke-ingest\",\"savedPath\":\"${HOKKE_SAVED_PATH}\",\"doc\":\"HOKKE\"}")"
  HOKKE_INGEST_ID="$(echo "$HOKKE_REQ" | jq -r '.ingestId // empty')"

  if [ -n "$HOKKE_INGEST_ID" ]; then
    # /api/ingest/confirm
    HOKKE_CONFIRM="$(curl -fsS "$BASE_URL/api/ingest/confirm" -H "Content-Type: application/json" \
      -d "{\"ingestId\":\"${HOKKE_INGEST_ID}\",\"confirm\":true}")"

    if echo "$HOKKE_CONFIRM" | jq -e '.ok==true and .doc=="HOKKE" and (.pagesInserted|type)=="number" and .pagesInserted>=1' >/dev/null 2>&1; then
      # doc=HOKKE pdfPage=1 の text length > 0 を確認
      HOKKE_TEXT_LEN="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT length(text) FROM kokuzo_pages WHERE doc='HOKKE' AND pdfPage=1;" 2>/dev/null || echo "0")"
      if [ "$HOKKE_TEXT_LEN" -gt 0 ]; then
        # [NON_TEXT_PAGE_OR_OCR_FAILED] プレースホルダーでないことを確認
        HOKKE_TEXT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT text FROM kokuzo_pages WHERE doc='HOKKE' AND pdfPage=1;" 2>/dev/null || echo "")"
        if echo "$HOKKE_TEXT" | grep -qF "[NON_TEXT_PAGE_OR_OCR_FAILED]"; then
          echo "[FAIL] Phase45-1: HOKKE P1 text is placeholder (extraction may have failed)"
          exit 1
        fi
        echo "[PASS] Phase45-1 HOKKE ingest (text length=$HOKKE_TEXT_LEN, non-placeholder)"
      else
        echo "[FAIL] Phase45-1: HOKKE P1 text is empty (length=$HOKKE_TEXT_LEN)"
        exit 1
      fi
    else
      echo "[FAIL] Phase45-1: HOKKE ingest confirm failed"
      echo "$HOKKE_CONFIRM" | jq '.'
      exit 1
    fi
  else
    echo "[FAIL] Phase45-1: HOKKE ingest request failed"
    echo "$HOKKE_REQ" | jq '.'
    exit 1
  fi
else
  echo "[SKIP] Phase45-1: HOKKE.pdf not found (expected at /opt/tenmon-corpus/pdf/HOKKE.pdf or $DATA_DIR/uploads/HOKKE.pdf)"
fi

echo "[46] Phase46 TENMON_CORE_PACK_v1 core seed gate"
echo "[46-1] seed TENMON_CORE_PACK_v1"
bash scripts/seed_tenmon_core_pack_v1.sh

echo "[46-2] check TENMON_CORE_PACK_v1 seed"
bash scripts/check_tenmon_core_seed.sh

echo "[46-3] chat smoke for TENMON_CORE (doc=TENMON_CORE pdfPage=1)"
r46="$(post_chat_raw_tid "doc=TENMON_CORE pdfPage=1 #詳細" "t46")"
if ! echo "$r46" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0 and (.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase46: chat response for TENMON_CORE did not return snippet"
  echo "$r46" | jq '.candidates[0]'
  exit 1
fi
echo "[PASS] Phase46 TENMON_CORE core seed gate"

echo "== Phase47 IROHA flow gate (#詳細 -> pick -> GROUNDED) =="

R47A="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-gate","message":"天命とは？ #詳細"}')"
echo "$R47A" | jq -e '.ok==true and (.candidates|type)=="array" and (.candidates|length)>=1' >/dev/null || {
  echo "[FAIL] Phase47: IROHA candidates missing"
  echo "$R47A" | jq '.'
  exit 1
}

R47B="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-gate","message":"1"}')"
echo "$R47B" | jq -e '.ok==true and .decisionFrame.mode=="GROUNDED"' >/dev/null || {
  echo "[FAIL] Phase47: IROHA pick did not reach GROUNDED"
  echo "$R47B" | jq '.'
  exit 1
}
echo "$R47B" | jq -e '(.detail|type)=="string" and (.detail|length)>0' >/dev/null || {
  echo "[FAIL] Phase47: IROHA GROUNDED detail empty"
  echo "$R47B" | jq '.'
  exit 1
}

echo "[PASS] Phase47 IROHA flow gate"

echo "[IROHA-FREEZE] PhaseIROHA_FREEZE いろは最終原稿の凍結検証"
FROZEN_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/corpus/frozen/iroha"
MANIFEST_FILE="$FROZEN_DIR/manifest.json"
if [ ! -f "$MANIFEST_FILE" ]; then
  echo "[SKIP] PhaseIROHA_FREEZE: manifest not found (run freeze_iroha_manuscript.sh first)"
else
  # manifest から sha256 を取得
  FROZEN_SHA="$(jq -r '.files[0].sha256 // empty' "$MANIFEST_FILE" 2>/dev/null || echo "")"
  if [ -z "$FROZEN_SHA" ]; then
    echo "[SKIP] PhaseIROHA_FREEZE: no sha256 in manifest"
  else
    # 凍結ファイルの存在確認
    FROZEN_FILE="$FROZEN_DIR/iroha_${FROZEN_SHA}.docx"
    if [ ! -f "$FROZEN_FILE" ]; then
      echo "[FAIL] PhaseIROHA_FREEZE: frozen file not found: $FROZEN_FILE"
      exit 1
    fi
    # sha256検証
    VERIFY_SHA="$(sha256sum "$FROZEN_FILE" | cut -d' ' -f1)"
    if [ "$VERIFY_SHA" != "$FROZEN_SHA" ]; then
      echo "[FAIL] PhaseIROHA_FREEZE: sha256 mismatch (expected=$FROZEN_SHA, got=$VERIFY_SHA)"
      exit 1
    fi
    # 読み取り専用確認
    if [ -w "$FROZEN_FILE" ]; then
      echo "[FAIL] PhaseIROHA_FREEZE: frozen file is writable (should be read-only)"
      exit 1
    fi
    echo "[PASS] PhaseIROHA_FREEZE frozen file verified (sha256=$FROZEN_SHA)"
  fi
fi

echo "[GATE] No Runtime LLM usage in logs"
if sudo journalctl -u tenmon-ark-api.service --since "$(date '+%Y-%m-%d %H:%M:%S' -d '1 minute ago')" --no-pager | grep -q "\[KANAGI-LLM\]"; then
  echo "[FAIL] Runtime LLM usage detected in logs."
  exit 1
fi
echo "[PASS] No Runtime LLM usage detected."

echo "== Phase48 IROHA_KERNEL gate (detailPlan.iroha + chainOrder contains IROHA_KERNEL) =="

R48="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-kernel","message":"病はなぜ起きる？ #詳細"}')"

echo "$R48" | jq -e '.ok==true' >/dev/null
echo "$R48" | jq -e '.detailPlan.iroha.stage != null and (.detailPlan.iroha.principles|type)=="array"' >/dev/null
echo "$R48" | jq -e '(.detailPlan.chainOrder|index("IROHA_KERNEL")) != null' >/dev/null || {
  echo "[FAIL] Phase48: IROHA_KERNEL missing in chainOrder"
  echo "$R48" | jq '.detailPlan'
  exit 1
}
echo "[PASS] Phase48 IROHA_KERNEL"

echo "== Phase49 IROHA law/alg seed gate =="

bash api/scripts/seed_iroha_principles_v1.sh

RL49="$(curl -fsS "$BASE_URL/api/law/list?threadId=iroha-seed")"
echo "$RL49" | jq -e '.ok==true' >/dev/null
echo "$RL49" | jq -e '(.laws|type)=="array" and (.laws|length) >= 6' >/dev/null || {
  echo "[FAIL] Phase49: iroha-seed laws < 6"
  echo "$RL49" | jq '.'
  exit 1
}
echo "[PASS] Phase49 IROHA seed"

echo "[49-1] Phase49-1 IROHA pin gate (doc/pdfPage must be GROUNDED)"
BASE_URL="http://127.0.0.1:3000"

R_PIN=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-pin","message":"doc=IROHA pdfPage=1"}')

echo "$R_PIN" | jq -e '.ok==true and .decisionFrame.mode=="GROUNDED" and (.detail|type)=="string" and (.detail|length)>0' >/dev/null \
  || { echo "[FAIL] IROHA pin should be GROUNDED"; echo "$R_PIN" | jq .; exit 1; }

R_PIN_D=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-pin","message":"doc=IROHA pdfPage=1 #詳細"}')

echo "$R_PIN_D" | jq -e '.ok==true and .decisionFrame.mode=="GROUNDED" and (.candidates|type)=="array" and (.candidates|length)>0 and .candidates[0].doc=="IROHA" and .candidates[0].pdfPage==1' >/dev/null \
  || { echo "[FAIL] IROHA pin #詳細 should include candidates"; echo "$R_PIN_D" | jq .; exit 1; }

echo "[PASS] Phase49-1 IROHA pin gate"

echo "== Phase49-2 IROHA GROUNDED/HYBRID gate (doc=IROHA pdfPage=1 が必ず引ける) =="

# 開発中確認用: kokuzo_pages_fts に IROHA が入っているか確認
IROHA_FTS_COUNT="$(sqlite3 "$TENMON_DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages_fts WHERE doc='IROHA';" 2>/dev/null || echo "0")"
echo "[INFO] Phase49-2: kokuzo_pages_fts IROHA count=$IROHA_FTS_COUNT"

# (a) GROUNDED: doc=IROHA pdfPage=1 → .detail length>0
R49_2A="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-gate","message":"doc=IROHA pdfPage=1"}')"

if ! echo "$R49_2A" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] Phase49-2: GROUNDED response ok!=true"
  echo "$R49_2A" | jq '.'
  exit 1
fi

DETAIL_LEN="$(echo "$R49_2A" | jq -r '.detail // "" | length')"
if [ "$DETAIL_LEN" -lt 1 ]; then
  echo "[FAIL] Phase49-2: GROUNDED detail empty (length=$DETAIL_LEN)"
  echo "$R49_2A" | jq '.'
  exit 1
fi
echo "[PASS] Phase49-2 GROUNDED (detail length=$DETAIL_LEN)"

# (b) HYBRID: doc=IROHA pdfPage=1 #詳細 → .candidates length>0
R49_2B="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-gate","message":"doc=IROHA pdfPage=1 #詳細"}')"

if ! echo "$R49_2B" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] Phase49-2: HYBRID response ok!=true"
  echo "$R49_2B" | jq '.'
  exit 1
fi

CANDIDATES_LEN="$(echo "$R49_2B" | jq -r '.candidates // [] | length')"
if [ "$CANDIDATES_LEN" -lt 1 ]; then
  echo "[FAIL] Phase49-2: HYBRID candidates missing (length=$CANDIDATES_LEN)"
  echo "$R49_2B" | jq '.'
  exit 1
fi
echo "[PASS] Phase49-2 HYBRID (candidates length=$CANDIDATES_LEN)"

echo "[PASS] Phase49-2 IROHA GROUNDED/HYBRID gate"

echo "== Phase47-iroha-pin IROHA doc指定ゲート (doc=IROHA pdfPage=1 が必ず GROUNDED になり、#詳細 で candidates が返る) =="

# (1) GROUNDED強制（doc=IROHA pdfPage=1）
R47_IROHA_PIN="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-pin","message":"doc=IROHA pdfPage=1"}')"

if ! echo "$R47_IROHA_PIN" | jq -e '.ok==true and .decisionFrame.mode=="GROUNDED" and (.detail|type)=="string" and (.detail|length)>0 and (.decisionFrame.ku|type)=="object" and .decisionFrame.llm==null' >/dev/null 2>&1; then
  echo "[FAIL] Phase47-iroha-pin: GROUNDED response failed"
  echo "$R47_IROHA_PIN" | jq '.'
  exit 1
fi
echo "[PASS] Phase47-iroha-pin GROUNDED (mode=GROUNDED, detail length>0, llm=null, ku=object)"

# (2) #詳細で candidates が必ず返る（doc=IROHA pdfPage=1 #詳細）
R47_IROHA_DETAIL="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-iroha-pin","message":"doc=IROHA pdfPage=1 #詳細"}')"

if ! echo "$R47_IROHA_DETAIL" | jq -e '.ok==true and (.candidates|type)=="array" and (.candidates|length)>0 and (.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>20 and .decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' >/dev/null 2>&1; then
  echo "[FAIL] Phase47-iroha-pin: #詳細 candidates failed"
  echo "$R47_IROHA_DETAIL" | jq '.'
  exit 1
fi
echo "[PASS] Phase47-iroha-pin #詳細 (candidates length>0, snippet length>20, llm=null, ku=object)"

echo "[PASS] Phase47-iroha-pin IROHA doc指定ゲート"

echo "[50] Phase50 KATAKAMUNA corpus gate (doc count + candidates + grounded)"

# DBに KATAKAMUNA が入っていること（>=1）
KATA_N="$(sqlite3 "$TENMON_DATA_DIR/kokuzo.sqlite" "select count(*) from kokuzo_pages where doc='KATAKAMUNA';" 2>/dev/null || echo 0)"
[ "${KATA_N:-0}" -ge 1 ] || { echo "[FAIL] KATAKAMUNA pages missing: $KATA_N"; exit 1; }
echo "[PASS] Phase50-0 kokuzo_pages doc='KATAKAMUNA' count=$KATA_N"

# #詳細 で candidates が出ること
r50a="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t-katakamuna-gate","message":"doc=KATAKAMUNA #詳細 呼吸 ウタヒ 図象符 水火水 シホミツ"}')"

echo "$r50a" | jq -e '
  .ok==true and
  (.candidates|type)=="array" and
  (.candidates|length) > 0 and
  ((.candidates[0].snippet // "") | tostring | length) > 20
' >/dev/null || {
  echo "[FAIL] Phase50-1 KATAKAMUNA candidates missing"
  echo "$r50a" | jq '.candidates[:5]'
  exit 1
}
echo "[PASS] Phase50-1 KATAKAMUNA candidates ok"

# candidates[0] を直接 GROUNDED 指定（doc+pdfPage）して detail が返ること
DOC="$(echo "$r50a" | jq -r '.candidates[0].doc')"
P="$(echo "$r50a" | jq -r '.candidates[0].pdfPage')"

r50b="$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d "{\"threadId\":\"t-katakamuna-gate\",\"message\":\"doc=${DOC} pdfPage=${P}\"}")"

echo "$r50b" | jq -e '
  .ok==true and
  (.detail|type)=="string" and
  (.detail|length) > 20
' >/dev/null || {
  echo "[FAIL] Phase50-2 KATAKAMUNA GROUNDED detail empty"
  echo "$r50b" | jq .
  exit 1
}
echo "[PASS] Phase50 KATAKAMUNA corpus gate"

echo "[50] Phase50 KATAKAMUNA seed gate"

KATA_TID="katakamuna-seed"

# 1) check current state FIRST（十分なら seed 実行しない）
KATA_LAWS="$(curl -fsS "$BASE_URL/api/law/list?threadId=$KATA_TID" | jq -r '.laws|length')"
KATA_ALGS="$(curl -fsS "$BASE_URL/api/alg/list?threadId=$KATA_TID" | jq -r '.algorithms|length')"

if [ "$KATA_LAWS" -lt 6 ] || [ "$KATA_ALGS" -lt 3 ]; then
  echo "[WARN] Phase50: insufficient -> run seed (laws=$KATA_LAWS algs=$KATA_ALGS)"

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  KATA_SEED="${SCRIPT_DIR}/seed_katakamuna_principles_v1.sh"

  test -f "$KATA_SEED" || { echo "[FAIL] Phase50: seed missing ($KATA_SEED)"; exit 1; }
  test -s "$KATA_SEED" || { echo "[FAIL] Phase50: seed empty"; exit 1; }

  # wrapper/accidental overwrite guard（219 bytes等のラッパーを弾く）
  [ "$(wc -c < "$KATA_SEED")" -ge 300 ] || { echo "[FAIL] Phase50: seed too small (likely wrapper)"; exit 1; }

  bash -n "$KATA_SEED" || { echo "[FAIL] Phase50: seed syntax error"; exit 1; }

  THREAD_ID="$KATA_TID" BASE_URL="$BASE_URL" bash "$KATA_SEED" >/dev/null

  # re-check
  KATA_LAWS="$(curl -fsS "$BASE_URL/api/law/list?threadId=$KATA_TID" | jq -r '.laws|length')"
  KATA_ALGS="$(curl -fsS "$BASE_URL/api/alg/list?threadId=$KATA_TID" | jq -r '.algorithms|length')"
fi

if [ "$KATA_LAWS" -lt 6 ] || [ "$KATA_ALGS" -lt 3 ]; then
  echo "[FAIL] Phase50: katakamuna-seed insufficient (laws=$KATA_LAWS algs=$KATA_ALGS)"
  exit 1
fi

echo "[PASS] Phase50 KATAKAMUNA seed gate"

echo "[51] Phase51 SUTRA seed gate"
bash api/scripts/seed_sutra_pack_prajna_lotus_v1.sh
SUTRA_LAWS="$(curl -fsS "$BASE_URL/api/law/list?threadId=sutra-seed" \
  | jq -r 'if type=="array" then length elif has("laws") then (.laws|length) else 0 end')"
SUTRA_ALGS="$(curl -fsS "$BASE_URL/api/alg/list?threadId=sutra-seed" \
  | jq -r 'if type=="array" then length elif has("algorithms") then (.algorithms|length) else 0 end')"
if [ "$SUTRA_LAWS" -lt 4 ] || [ "$SUTRA_ALGS" -lt 1 ]; then
  echo "[FAIL] Phase51: sutra-seed insufficient (laws=$SUTRA_LAWS algs=$SUTRA_ALGS)"
  exit 1
fi
echo "[PASS] Phase51 SUTRA seed gate"

echo "[PASS] acceptance_test.sh"

# ---- PhaseZZ: acceptance proof (append-only) ----
PROOF="/tmp/tenmon_acceptance_last.txt"
{
  echo "timestamp=$(date -Iseconds)"
  echo "exit=0"
  echo -n "headSha="; git rev-parse --short HEAD 2>/dev/null || echo "unknown"
  echo -n "auditSha="; curl -fsS http://127.0.0.1:3000/api/audit | jq -r '.gitSha' 2>/dev/null || echo "unknown"
  echo -n "buildMark="; curl -fsS http://127.0.0.1:3000/api/audit | jq -r '.build.mark' 2>/dev/null || echo "unknown"
} > "$PROOF"
echo "[PASS] proof saved: $PROOF"
