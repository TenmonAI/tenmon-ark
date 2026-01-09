#!/bin/bash
# /opt/tenmon-ark/api/scripts/check-production.sh
# 本番環境のAPI状態を確認

set -e

BASE_URL="https://tenmon-ark.com"

echo "=== 本番環境API状態確認 ==="
echo "BASE_URL: ${BASE_URL}"
echo ""

echo "--- 1. /api/health チェック ---"
HEALTH_RESPONSE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/health" 2>&1)
HTTP_STATUS=$(echo "${HEALTH_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
HEALTH_BODY=$(echo "${HEALTH_RESPONSE}" | sed '/HTTP_STATUS:/d')

if [ "${HTTP_STATUS}" = "200" ]; then
  echo "✅ /api/health は応答しています"
  echo "Response: ${HEALTH_BODY:0:200}..."
  
  # external フィールドの確認
  if echo "${HEALTH_BODY}" | grep -q "external"; then
    echo "✅ 新しいAPI（external フィールドあり）"
    echo "${HEALTH_BODY}" | jq -r '.external // "null"' 2>/dev/null || echo "JSON parse error"
  else
    echo "⚠️  古いAPI（external フィールドなし）"
  fi
else
  echo "❌ /api/health が404またはエラー (HTTP ${HTTP_STATUS})"
  echo "Response: ${HEALTH_BODY:0:200}..."
fi
echo ""

echo "--- 2. /api/settings チェック ---"
SETTINGS_RESPONSE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/settings" 2>&1)
SETTINGS_STATUS=$(echo "${SETTINGS_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
SETTINGS_BODY=$(echo "${SETTINGS_RESPONSE}" | sed '/HTTP_STATUS:/d')

if [ "${SETTINGS_STATUS}" = "200" ]; then
  echo "✅ /api/settings は応答しています"
else
  echo "❌ /api/settings がエラー (HTTP ${SETTINGS_STATUS})"
fi
echo ""

echo "--- 3. /api/corpus/docs チェック ---"
CORPUS_RESPONSE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/corpus/docs" 2>&1)
CORPUS_STATUS=$(echo "${CORPUS_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
CORPUS_BODY=$(echo "${CORPUS_RESPONSE}" | sed '/HTTP_STATUS:/d')

if [ "${CORPUS_STATUS}" = "200" ]; then
  echo "✅ /api/corpus/docs は応答しています"
else
  echo "❌ /api/corpus/docs がエラー (HTTP ${CORPUS_STATUS})"
fi
echo ""

echo "--- 4. /api/chat チェック ---"
CHAT_RESPONSE=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"threadId":"check","message":"test"}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  "${BASE_URL}/api/chat" 2>&1)
CHAT_STATUS=$(echo "${CHAT_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
CHAT_BODY=$(echo "${CHAT_RESPONSE}" | sed '/HTTP_STATUS:/d')

if [ "${CHAT_STATUS}" = "200" ]; then
  echo "✅ /api/chat は応答しています"
  # decisionFrame の確認
  if echo "${CHAT_BODY}" | grep -q "decisionFrame"; then
    echo "✅ 新しいAPI（decisionFrame フィールドあり）"
  else
    echo "⚠️  古いAPI（decisionFrame フィールドなし）"
  fi
else
  echo "❌ /api/chat がエラー (HTTP ${CHAT_STATUS})"
fi
echo ""

echo "=== 判定結果 ==="
if [ "${HTTP_STATUS}" = "200" ] && echo "${HEALTH_BODY}" | grep -q "external"; then
  echo "✅ 本番APIは新しいバージョンです"
  echo "   - /api/health が応答"
  echo "   - external フィールドあり"
elif [ "${HTTP_STATUS}" = "404" ]; then
  echo "❌ 本番APIは古いバージョンです"
  echo "   - /api/health が404"
  echo "   - デプロイが必要です"
else
  echo "⚠️  本番APIの状態が不明です"
  echo "   - HTTP Status: ${HTTP_STATUS}"
fi

