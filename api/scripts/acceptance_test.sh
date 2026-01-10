#!/bin/bash
# TENMON-ARK 受入テストスクリプト
# 実行方法: BASE_URL=http://localhost:3000 ./scripts/acceptance_test.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== TENMON-ARK 受入テスト ==="
echo "BASE_URL: ${BASE_URL}"
echo ""

# 色付き出力用
PASS="✅ PASS"
FAIL="❌ FAIL"

# ============================================
# Phase 4: NATURAL モード
# ============================================
echo "【Phase 4-1: NATURAL モード】"
echo "テスト: CHAGE&ASKAとは？ → 普通に短く答える（質問返しだけで終わらない）"
RESPONSE1_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural","message":"CHAGE&ASKAとは？"}')
RESPONSE1=$(echo "$RESPONSE1_JSON" | jq -r '.response')
MODE1=$(echo "$RESPONSE1_JSON" | jq -r '.decisionFrame.mode')

echo "Response: ${RESPONSE1}"
echo "Mode: ${MODE1}"
echo ""

# 検証: mode が NATURAL であること
if [ "${MODE1}" != "NATURAL" ]; then
  echo "${FAIL}: mode should be NATURAL, but got ${MODE1}"
  exit 1
fi

# 検証: 以下のキーワードが含まれていないことを確認
if echo "${RESPONSE1}" | grep -qE "(核心語|pdfPage=6|P6|言霊秘書|水穂伝)"; then
  echo "${FAIL}: 資料導線が混入している"
  exit 1
fi

if echo "${RESPONSE1}" | grep -qE "(状況を教えてください|もっと詳しく)"; then
  echo "${FAIL}: 曖昧返し（質問返しだけで終わっている）"
  exit 1
fi

# Phase 2-B: detail フィールドが存在しないこと（#詳細なし）
DETAIL1=$(echo "$RESPONSE1_JSON" | jq -r '.detail // "NOT_PRESENT"')
if [ "${DETAIL1}" != "NOT_PRESENT" ]; then
  echo "${FAIL}: detail should not be present when #詳細 is not requested, but got: ${DETAIL1}"
  exit 1
fi

echo "${PASS}: NATURAL モードで適切に応答"
echo ""

# ============================================
# Phase 4: domainはHYBRID固定（#詳細でも）
# ============================================
echo "【Phase 4-2: domainはHYBRID固定（#詳細なし）】"
echo "テスト: 言灵とは？ → decisionFrame.mode == HYBRID"
RESPONSE2_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid","message":"言灵とは？"}')
RESPONSE2=$(echo "$RESPONSE2_JSON" | jq -r '.response')
MODE2=$(echo "$RESPONSE2_JSON" | jq -r '.decisionFrame.mode')

echo "Response: ${RESPONSE2}"
echo "Mode: ${MODE2}"
echo ""

# Phase 2-A: 検証: mode が HYBRID であること（#詳細でも）
if [ "${MODE2}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE2}"
  exit 1
fi

# Phase 2-C: 資料不足 or 推定 が明示されていることを確認
if ! echo "${RESPONSE2}" | grep -qE "(資料不足|推定|Evidence|根拠|資料が不足)"; then
  echo "⚠️  WARN: 「資料不足」または「推定」が明示されていない可能性"
fi

# Phase 2-C: 一般知識的な断定（年代/固有名詞/数値）がないことを確認（簡易チェック）
if echo "${RESPONSE2}" | grep -qE "(○年|○世紀|○年代)"; then
  echo "${FAIL}: 年代などの一般知識的断定が含まれている"
  exit 1
fi

# Phase 2-B: detail フィールドが存在しないこと（#詳細なし）
DETAIL2=$(echo "$RESPONSE2_JSON" | jq -r '.detail // "NOT_PRESENT"')
if [ "${DETAIL2}" != "NOT_PRESENT" ]; then
  echo "${FAIL}: detail should not be present when #詳細 is not requested, but got: ${DETAIL2}"
  exit 1
fi

echo "${PASS}: HYBRID モードで適切に応答（#詳細なし）"
echo ""

echo "【Phase 4-2: domainはHYBRID固定（#詳細あり）】"
echo "テスト: 言灵とは？ #詳細 → decisionFrame.mode == HYBRID かつ .detail は string（null禁止）"
RESPONSE2_DETAIL_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid-detail","message":"言灵とは？ #詳細"}')
RESPONSE2_DETAIL=$(echo "$RESPONSE2_DETAIL_JSON" | jq -r '.response')
MODE2_DETAIL=$(echo "$RESPONSE2_DETAIL_JSON" | jq -r '.decisionFrame.mode')
DETAIL2_TYPE=$(echo "$RESPONSE2_DETAIL_JSON" | jq -r '.detail | type')
DETAIL2_LEN=$(echo "$RESPONSE2_DETAIL_JSON" | jq -r '.detail | length // 0')

echo "Response: ${RESPONSE2_DETAIL}"
echo "Mode: ${MODE2_DETAIL}"
echo "Detail type: ${DETAIL2_TYPE}"
echo "Detail length: ${DETAIL2_LEN}"
echo ""

# Phase 2-A: 検証: mode が HYBRID であること（#詳細でも）
if [ "${MODE2_DETAIL}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID even with #詳細, but got ${MODE2_DETAIL}"
  exit 1
fi

# Phase 2-B: detail が string で null ではないことを確認
if [ "${DETAIL2_TYPE}" != "string" ]; then
  echo "${FAIL}: detail should be string, but got type: ${DETAIL2_TYPE}"
  exit 1
fi

if [ "${DETAIL2_LEN}" -le 0 ]; then
  echo "${FAIL}: detail should have length > 0, but got: ${DETAIL2_LEN}"
  exit 1
fi

echo "${PASS}: HYBRID モードで適切に応答（#詳細あり、detail=null禁止）"
echo ""

# ============================================
# Phase 4: GROUNDED モード（明示doc/pdfPageのときだけ）
# ============================================
echo "【Phase 4-5: GROUNDED モード】"
echo "テスト: 言霊秘書.pdf pdfPage=6 言灵の定義 #詳細 → GROUNDED、detail引用が出る"
RESPONSE3_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-grounded","message":"言霊秘書.pdf pdfPage=6 言灵の定義 #詳細"}')

MODE3=$(echo "${RESPONSE3_JSON}" | jq -r '.decisionFrame.mode')
DETAIL3=$(echo "${RESPONSE3_JSON}" | jq -r '.detail // ""')
RESPONSE_TEXT3=$(echo "${RESPONSE3_JSON}" | jq -r '.response')

echo "Response: ${RESPONSE_TEXT3}"
echo "Mode: ${MODE3}"
echo "Detail length: $(echo "${DETAIL3}" | wc -c)"
echo ""

# Phase 2-A: 検証: mode が GROUNDED であること（明示doc/pdfPage + #詳細）
if [ "${MODE3}" != "GROUNDED" ]; then
  echo "${FAIL}: mode should be GROUNDED, but got ${MODE3}"
  exit 1
fi

# Phase 2-B: detail が string で null ではないことを確認
if [ -z "${DETAIL3}" ] || [ "${DETAIL3}" = "null" ]; then
  echo "${FAIL}: detail should not be null or empty (Phase 2-B: detail=null禁止)"
  exit 1
fi

if ! echo "${DETAIL3}" | grep -qE "(lawId|法則候補|引用|quote)"; then
  echo "${FAIL}: detail should contain lawId/quote"
  exit 1
fi

echo "${PASS}: GROUNDED モードで detail が返る（detail=null禁止）"
echo ""

# ============================================
# LIVE モード
# ============================================
echo "【LIVE モード】"
echo "テスト: 今日のドル円は？ → 取得時刻＋URL（取れないなら取れない）"
RESPONSE4=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-live","message":"今日のドル円は？"}')

MODE4=$(echo "${RESPONSE4}" | jq -r '.decisionFrame.mode')
RESPONSE_TEXT4=$(echo "${RESPONSE4}" | jq -r '.response')
EVIDENCE_LIVE=$(echo "${RESPONSE4}" | jq -r '.evidence.live // null')

echo "Response: ${RESPONSE_TEXT4}"
echo "Mode: ${MODE4}"
echo "Evidence live: ${EVIDENCE_LIVE}"
echo ""

# 検証
if [ "${MODE4}" != "LIVE" ]; then
  echo "${FAIL}: mode should be LIVE, but got ${MODE4}"
  exit 1
fi

if [ "${EVIDENCE_LIVE}" != "null" ]; then
  TIMESTAMP=$(echo "${RESPONSE4}" | jq -r '.evidence.timestamp // ""')
  SOURCES=$(echo "${RESPONSE4}" | jq -r '.evidence.sources // []')
  
  if [ -z "${TIMESTAMP}" ]; then
    echo "${FAIL}: evidence.timestamp should exist"
    exit 1
  fi
  
  SOURCE_COUNT=$(echo "${SOURCES}" | jq 'length')
  if [ "${SOURCE_COUNT}" -eq 0 ]; then
    echo "${FAIL}: evidence.sources should contain at least 1 URL"
    exit 1
  fi
  
  if ! echo "${RESPONSE_TEXT4}" | grep -qE "(取得時刻|JST|http|https)"; then
    echo "⚠️  WARN: 取得時刻/出典URLが明示されていない可能性"
  fi
else
  # LIVE 検索が失敗した場合
  if ! echo "${RESPONSE_TEXT4}" | grep -qE "(取得できません|検索|取れない)"; then
    echo "⚠️  WARN: 検索失敗時に「取れない」宣言がされていない可能性"
  fi
fi

echo "${PASS}: LIVE モードで適切に応答"
echo ""

# ============================================
# Phase 4: detail制御（Phase 2-B）
# ============================================
echo "【Phase 4-3: detail制御（#詳細なし）】"
echo "テスト: 言灵とは？ → detailフィールドが存在しない（nullも返さない）"
RESPONSE5_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-detail1","message":"言灵とは？"}')

DETAIL5_PRESENT=$(echo "${RESPONSE5_JSON}" | jq 'has("detail")')
DETAIL5_VALUE=$(echo "${RESPONSE5_JSON}" | jq -r '.detail // "NOT_PRESENT"')

echo "Detail present: ${DETAIL5_PRESENT}"
echo "Detail value: ${DETAIL5_VALUE}"
echo ""

# Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）
if [ "${DETAIL5_PRESENT}" = "true" ]; then
  if [ "${DETAIL5_VALUE}" = "null" ]; then
    echo "${FAIL}: detail should not be null (Phase 2-B: null禁止)"
    exit 1
  fi
  echo "${FAIL}: detail field should not be present when #詳細 is not requested"
  exit 1
fi

echo "${PASS}: #詳細なしで detail フィールドは存在しない"
echo ""

echo "【Phase 4-3: detail制御（#詳細あり）】"
echo "テスト: 言灵とは？ #詳細 → detail が string で長さ>0（null禁止）"
RESPONSE6_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-detail2","message":"言灵とは？ #詳細"}')

DETAIL6_TYPE=$(echo "${RESPONSE6_JSON}" | jq -r '.detail | type')
DETAIL6_LEN=$(echo "${RESPONSE6_JSON}" | jq -r '.detail | length // 0')
DETAIL6_VALUE=$(echo "${RESPONSE6_JSON}" | jq -r '.detail // "NOT_PRESENT"')

echo "Detail type: ${DETAIL6_TYPE}"
echo "Detail length: ${DETAIL6_LEN}"
echo ""

# Phase 2-B: detail が string で null ではないことを確認
if [ "${DETAIL6_VALUE}" = "NOT_PRESENT" ]; then
  echo "${FAIL}: detail should be present when #詳細 is requested"
  exit 1
fi

if [ "${DETAIL6_TYPE}" != "string" ]; then
  echo "${FAIL}: detail should be string, but got type: ${DETAIL6_TYPE} (Phase 2-B: null禁止)"
  exit 1
fi

if [ "${DETAIL6_LEN}" -le 0 ]; then
  echo "${FAIL}: detail should have length > 0, but got: ${DETAIL6_LEN}"
  exit 1
fi

echo "${PASS}: #詳細ありで detail が返る (type=${DETAIL6_TYPE}, length=${DETAIL6_LEN})"
echo ""

# ============================================
# Phase 4: 最終確認（必須3コマンド）
# ============================================
echo "【Phase 4: 最終確認（必須3コマンド）】"
echo ""

echo "1. バージョン確認:"
curl -sS "${BASE_URL}/api/version" | jq .
echo ""

echo "2. domain質問（HYBRID固定確認）:"
RESPONSE_FINAL1=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}')
echo "$RESPONSE_FINAL1" | jq '{mode:.decisionFrame.mode, response:.response, evidence:.evidence}'
MODE_FINAL1=$(echo "$RESPONSE_FINAL1" | jq -r '.decisionFrame.mode')
if [ "${MODE_FINAL1}" != "HYBRID" ]; then
  echo "${FAIL}: Final test 1 failed: mode should be HYBRID, but got ${MODE_FINAL1}"
  exit 1
fi
echo "✅ Final test 1 PASS: mode=HYBRID"
echo ""

echo "3. #詳細確認（detail=null禁止確認）:"
RESPONSE_FINAL2=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}')
echo "$RESPONSE_FINAL2" | jq '{mode:.decisionFrame.mode, detailType:(.detail|type), detailLen:(.detail|length)}'
MODE_FINAL2=$(echo "$RESPONSE_FINAL2" | jq -r '.decisionFrame.mode')
DETAIL_TYPE_FINAL2=$(echo "$RESPONSE_FINAL2" | jq -r '.detail | type')
DETAIL_LEN_FINAL2=$(echo "$RESPONSE_FINAL2" | jq -r '.detail | length // 0')
if [ "${MODE_FINAL2}" != "HYBRID" ]; then
  echo "${FAIL}: Final test 2 failed: mode should be HYBRID, but got ${MODE_FINAL2}"
  exit 1
fi
if [ "${DETAIL_TYPE_FINAL2}" != "string" ]; then
  echo "${FAIL}: Final test 2 failed: detailType should be string, but got ${DETAIL_TYPE_FINAL2}"
  exit 1
fi
if [ "${DETAIL_LEN_FINAL2}" -le 0 ]; then
  echo "${FAIL}: Final test 2 failed: detailLen should be > 0, but got ${DETAIL_LEN_FINAL2}"
  exit 1
fi
echo "✅ Final test 2 PASS: mode=HYBRID, detailType=string, detailLen=${DETAIL_LEN_FINAL2}"
echo ""

# ============================================
# テスト完了
# ============================================
echo "=== 全テスト完了 ==="
echo "✅ すべての受入テストに合格しました"
echo ""
echo "【期待値確認】"
echo "✅ 言灵とは？ → mode=HYBRID"
echo "✅ 言灵とは？ #詳細 → mode=HYBRID、detailType=string、detailLen>0"

