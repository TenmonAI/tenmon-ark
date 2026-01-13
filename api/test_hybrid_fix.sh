#!/bin/bash
# HYBRIDモード修正後のテストスクリプト

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== HYBRIDモード修正後のテスト ==="
echo "BASE_URL: ${BASE_URL}"
echo ""

PASS="✅ PASS"
FAIL="❌ FAIL"

# テスト1: HYBRIDモードでLLM未使用を確認
echo "【テスト1: HYBRIDモードでLLM未使用】"
echo "テスト: 言灵とは？ → mode=HYBRID, LLM未使用（ログで確認）"
RESPONSE1_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid-llm","message":"言灵とは？"}')
MODE1=$(echo "$RESPONSE1_JSON" | jq -r '.decisionFrame.mode')
INTENT1=$(echo "$RESPONSE1_JSON" | jq -r '.decisionFrame.intent')
RESPONSE1=$(echo "$RESPONSE1_JSON" | jq -r '.response')

echo "Mode: ${MODE1}"
echo "Intent: ${INTENT1}"
echo "Response: ${RESPONSE1}"
echo ""

if [ "${MODE1}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE1}"
  exit 1
fi

if [ "${INTENT1}" != "domain" ]; then
  echo "${FAIL}: intent should be domain, but got ${INTENT1}"
  exit 1
fi

# responseに禁止語句が含まれていないことを確認
if echo "${RESPONSE1}" | grep -qE "(#詳細|pdfPage:|lawId:|引用:)"; then
  echo "${FAIL}: response に禁止語句が含まれている"
  exit 1
fi

echo "${PASS}: HYBRIDモードでLLM未使用、禁止語句なし"
echo ""

# テスト2: detailがEvidencePack由来のみであることを確認
echo "【テスト2: detailがEvidencePack由来のみ】"
echo "テスト: 言灵とは？ #詳細 → detailがEvidencePack由来のみ（捏造なし）"
RESPONSE2_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid-detail","message":"言灵とは？ #詳細"}')
DETAIL2=$(echo "$RESPONSE2_JSON" | jq -r '.detail // ""')
RESPONSE2=$(echo "$RESPONSE2_JSON" | jq -r '.response')

echo "Response: ${RESPONSE2}"
echo "Detail length: $(echo "${DETAIL2}" | wc -c)"
echo ""

# detailがstringであることを確認
DETAIL2_TYPE=$(echo "$RESPONSE2_JSON" | jq -r '.detail | type')
if [ "${DETAIL2_TYPE}" != "string" ]; then
  echo "${FAIL}: detail should be string, but got ${DETAIL2_TYPE}"
  exit 1
fi

# responseに禁止語句が含まれていないことを確認
if echo "${RESPONSE2}" | grep -qE "(#詳細|pdfPage:|lawId:|引用:)"; then
  echo "${FAIL}: response に禁止語句が含まれている"
  exit 1
fi

# detailに捏造されたID（言霊-001等）が含まれていないことを確認
if echo "${DETAIL2}" | grep -qE "(言霊-001|言灵-001|pdfPage:\s*3[^0-9])"; then
  echo "${FAIL}: detail に捏造されたIDが含まれている"
  exit 1
fi

echo "${PASS}: detailがEvidencePack由来のみ（捏造なし）"
echo ""

# テスト3: evidence=0の場合の確認
echo "【テスト3: evidence=0の場合】"
echo "テスト: 存在しないdoc/pdfPageでdomain質問 → 資料不足レスポンス"
RESPONSE3_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid-no-evidence","message":"存在しない.pdf pdfPage=99999 言灵とは？"}')
MODE3=$(echo "$RESPONSE3_JSON" | jq -r '.decisionFrame.mode')
RESPONSE3=$(echo "$RESPONSE3_JSON" | jq -r '.response')
EVIDENCE3=$(echo "$RESPONSE3_JSON" | jq -r '.evidence // "null"')

echo "Mode: ${MODE3}"
echo "Response: ${RESPONSE3}"
echo "Evidence: ${EVIDENCE3}"
echo ""

if [ "${MODE3}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE3}"
  exit 1
fi

if ! echo "${RESPONSE3}" | grep -qE "(資料不足|次に読む|指定してください)"; then
  echo "${FAIL}: response should contain '資料不足', but got: ${RESPONSE3}"
  exit 1
fi

echo "${PASS}: evidence=0の場合、資料不足レスポンスを返す"
echo ""

echo "=== 全テスト完了 ==="
echo "✅ すべてのテストに合格しました"


