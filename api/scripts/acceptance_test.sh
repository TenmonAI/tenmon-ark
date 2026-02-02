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

echo "[1] deploy (NO_RESTART=1)"
NO_RESTART=1 bash scripts/deploy_live.sh

echo "[1-1] apply DB schema (bail) + ensure kokuzo_pages exists"
command -v sqlite3 >/dev/null 2>&1 || (echo "[FAIL] sqlite3 missing. run: sudo apt-get install -y sqlite3" && exit 1)
# dataDir が無ければ作成
sudo mkdir -p "$DATA_DIR" || true
# schema を dataDir の DB に適用
sqlite3 -bail "$DATA_DIR/kokuzo.sqlite" < "$REPO/src/db/kokuzo_schema.sql"
has_pages="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT name FROM sqlite_master WHERE type='table' AND name='kokuzo_pages' LIMIT 1;")"
test "$has_pages" = "kokuzo_pages" || (echo "[FAIL] kokuzo_pages missing after schema apply" && exit 1)
echo "[PASS] DB schema ok (kokuzo_pages exists, dataDir=$DATA_DIR)"

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

wait_audit() {
  local deadline=$((SECONDS + 90))
  while [ $SECONDS -lt $deadline ]; do
    # 503は仕様なので握りつぶす
    out="$(curl -sS -m 1.5 http://127.0.0.1:3000/api/audit || true)"
    # ok==true と gitSha が返るまで待つ
    echo "$out" | jq -e '.ok == true and (.gitSha|type=="string") and (.gitSha|length>0)' >/dev/null 2>&1 && return 0
    sleep 0.3
  done

  echo "[FAIL] /api/audit not ready"
  sudo journalctl -u tenmon-ark-api.service --since "${SINCE}" --no-pager | tail -n 120
  return 1
}

wait_chat() {
  local deadline=$((SECONDS + 90))
  while [ $SECONDS -lt $deadline ]; do
    out="$(curl -sS -m 2 http://127.0.0.1:3000/api/chat \
      -H 'Content-Type: application/json' \
      -d '{"threadId":"acc","message":"ping"}' || true)"

    # decisionFrame contract（例：ku object必須、llm null）
    echo "$out" | jq -e '.decisionFrame.ku|type=="object"' >/dev/null 2>&1 \
      && echo "$out" | jq -e '.decisionFrame.llm == null' >/dev/null 2>&1 \
      && return 0

    sleep 0.4
  done

  echo "[FAIL] /api/chat not ready"
  sudo journalctl -u tenmon-ark-api.service --since "${SINCE}" --no-pager | tail -n 120
  return 1
}

echo "[2] wait /api/audit"
wait_audit

echo "[2-1] wait /api/chat"
wait_chat

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

echo "[GATE] No Runtime LLM usage in logs"
if sudo journalctl -u tenmon-ark-api.service --since "$(date '+%Y-%m-%d %H:%M:%S' -d '1 minute ago')" --no-pager | grep -q "\[KANAGI-LLM\]"; then
  echo "[FAIL] Runtime LLM usage detected in logs."
  exit 1
fi
echo "[PASS] No Runtime LLM usage detected."
echo "[PASS] acceptance_test.sh"
