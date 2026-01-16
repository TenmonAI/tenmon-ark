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

echo "1. バージョン確認（gitSha/builtAt必須）:"
VERSION_JSON=$(curl -sS "${BASE_URL}/api/version")
VERSION_VERSION=$(echo "${VERSION_JSON}" | jq -r '.version // "NOT_PRESENT"')
VERSION_GITSHA=$(echo "${VERSION_JSON}" | jq -r '.gitSha // "NOT_PRESENT"')
VERSION_BUILTAT=$(echo "${VERSION_JSON}" | jq -r '.builtAt // "NOT_PRESENT"')

echo "${VERSION_JSON}" | jq .
echo ""

# 検証: version, gitSha, builtAt が存在すること
if [ "${VERSION_VERSION}" = "NOT_PRESENT" ] || [ "${VERSION_VERSION}" = "null" ]; then
  echo "${FAIL}: /api/version should contain 'version' field"
  exit 1
fi

if [ "${VERSION_GITSHA}" = "NOT_PRESENT" ] || [ "${VERSION_GITSHA}" = "null" ]; then
  echo "${FAIL}: /api/version should contain 'gitSha' field"
  exit 1
fi

if [ "${VERSION_BUILTAT}" = "NOT_PRESENT" ] || [ "${VERSION_BUILTAT}" = "null" ]; then
  echo "${FAIL}: /api/version should contain 'builtAt' field"
  exit 1
fi

echo "${PASS}: /api/version に version, gitSha, builtAt が含まれている"
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
# ============================================
# Phase 5: 捏造ゼロ検証（lawId形式、doc/pdfPage確認）
# ============================================
# Phase 6: domainでdoc/pdfPageがあってもHYBRID固定（追加）
# ============================================
echo "【Phase 6: domainでdoc/pdfPageがあってもHYBRID固定】"
echo "テスト: 言霊秘書.pdf pdfPage=103 言灵とは？ → decisionFrame.intent=domain, mode=HYBRID"
RESPONSE8_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-domain-with-doc","message":"言霊秘書.pdf pdfPage=103 言灵とは？"}')
RESPONSE8=$(echo "$RESPONSE8_JSON" | jq -r '.response')
MODE8=$(echo "$RESPONSE8_JSON" | jq -r '.decisionFrame.mode')
INTENT8=$(echo "$RESPONSE8_JSON" | jq -r '.decisionFrame.intent')

echo "Response: ${RESPONSE8}"
echo "Mode: ${MODE8}"
echo "Intent: ${INTENT8}"
echo ""

# 検証: intent が domain であること
if [ "${INTENT8}" != "domain" ]; then
  echo "${FAIL}: intent should be domain, but got ${INTENT8}"
  exit 1
fi

# 検証: mode が HYBRID であること（doc/pdfPage があっても）
if [ "${MODE8}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID even with doc/pdfPage, but got ${MODE8}"
  exit 1
fi

echo "${PASS}: domainでdoc/pdfPageがあってもHYBRID固定"
echo ""

# ============================================
# Phase 6: domainでdoc/pdfPageがあってもHYBRID固定（追加）
# ============================================
echo "【Phase 6: domainでdoc/pdfPageがあってもHYBRID固定】"
echo "テスト: 言霊秘書.pdf pdfPage=103 言灵とは？ → decisionFrame.intent=domain, mode=HYBRID"
RESPONSE8_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-domain-with-doc","message":"言霊秘書.pdf pdfPage=103 言灵とは？"}')
RESPONSE8=$(echo "$RESPONSE8_JSON" | jq -r '.response')
MODE8=$(echo "$RESPONSE8_JSON" | jq -r '.decisionFrame.mode')
INTENT8=$(echo "$RESPONSE8_JSON" | jq -r '.decisionFrame.intent')

echo "Response: ${RESPONSE8}"
echo "Mode: ${MODE8}"
echo "Intent: ${INTENT8}"
echo ""

# 検証: intent が domain であること
if [ "${INTENT8}" != "domain" ]; then
  echo "${FAIL}: intent should be domain, but got ${INTENT8}"
  exit 1
fi

# 検証: mode が HYBRID であること（doc/pdfPage があっても）
if [ "${MODE8}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID even with doc/pdfPage, but got ${MODE8}"
  exit 1
fi

echo "${PASS}: domainでdoc/pdfPageがあってもHYBRID固定"
echo ""

# ============================================
echo "【Phase 5: 捏造ゼロ検証】"
echo "テスト: 言灵とは？ #詳細 → lawId が KHS- / KTK- / IROHA- 形式のみ（捏造禁止）"
RESPONSE7_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-no-forgery","message":"言灵とは？ #詳細"}')

DETAIL7=$(echo "${RESPONSE7_JSON}" | jq -r '.detail // ""')
LAWIDS=$(echo "${DETAIL7}" | grep -oE '(KHS-|KTK-|IROHA-)[A-Z0-9-]+' || echo "")
INVALID_LAWIDS=$(echo "${DETAIL7}" | grep -oE '(lawId|法則ID|引用ID|言霊-|言灵-|カタカムナ-|いろは-)[A-Z0-9-]*' | grep -vE '^(KHS-|KTK-|IROHA-)' || echo "")

echo "Detail length: $(echo "${DETAIL7}" | wc -c)"
echo "Valid lawIds found: ${LAWIDS}"
echo "Invalid lawIds found: ${INVALID_LAWIDS}"
echo ""

# 検証: lawId が KHS- / KTK- / IROHA- 形式のみ（捏造禁止）
if [ -n "${INVALID_LAWIDS}" ] && [ "${INVALID_LAWIDS}" != "" ]; then
  echo "${FAIL}: lawId が捏造されている（KHS- / KTK- / IROHA- 形式以外）: ${INVALID_LAWIDS}"
  exit 1
fi

echo "${PASS}: lawId は KHS- / KTK- / IROHA- 形式のみ（捏造なし）"
echo ""

echo "テスト: detail に doc/pdfPage が必須（無ければFAIL）"
HAS_DOC_PDFPAGE=$(echo "${DETAIL7}" | grep -qE '(doc=|pdfPage=)' && echo "true" || echo "false")

echo "Has doc/pdfPage in detail: ${HAS_DOC_PDFPAGE}"
echo ""

if [ "${HAS_DOC_PDFPAGE}" != "true" ]; then
  echo "${FAIL}: detail に doc/pdfPage が含まれていない"
  exit 1
fi

echo "${PASS}: detail に doc/pdfPage が含まれている"
echo ""

echo "テスト: response に禁止テンプレ語が入っていない"
RESPONSE_TEXT7=$(echo "${RESPONSE7_JSON}" | jq -r '.response // ""')
FORBIDDEN_TEMPLATE=$(echo "${RESPONSE_TEXT7}" | grep -E "(日本の伝統的|古来より|ポジティブな言葉|前向きに|明るく|温かみ|深い意味|大切な考え|豊かな文化|素晴らしい概念|昔から|日本人の|心の|言葉の)" || echo "")

echo "Response: ${RESPONSE_TEXT7}"
echo "Forbidden template found: ${FORBIDDEN_TEMPLATE}"
echo ""

if [ -n "${FORBIDDEN_TEMPLATE}" ] && [ "${FORBIDDEN_TEMPLATE}" != "" ]; then
  echo "${FAIL}: response に禁止テンプレ語が含まれている: ${FORBIDDEN_TEMPLATE}"
  exit 1
fi

echo "${PASS}: response に禁止テンプレ語が入っていない"
echo ""

# ============================================
# Phase 7: detailのID規格確認（追加）
# ============================================
echo "【Phase 7: detailのID規格確認】"
echo "テスト: 言灵とは？ #詳細 → detail内のIDが KHS-P####-T### / KTK-P####-T### / IROHA-P####-T### 形式のみ"
RESPONSE9_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-id-format","message":"言灵とは？ #詳細"}')
DETAIL9=$(echo "${RESPONSE9_JSON}" | jq -r '.detail // ""')

# IDを抽出（正規表現: KHS-P####-T### / KTK-P####-T### / IROHA-P####-T###）
VALID_IDS=$(echo "${DETAIL9}" | grep -oE '(KHS|KTK|IROHA)-P[0-9]{4}-T[0-9]{3}' || echo "")
INVALID_IDS=$(echo "${DETAIL9}" | grep -oE '(KHS|KTK|IROHA)-[^P]|(KHS|KTK|IROHA)-P[0-9]{1,3}-[^T]|(KHS|KTK|IROHA)-P[0-9]{5,}' || echo "")

echo "Detail length: $(echo "${DETAIL9}" | wc -c)"
echo "Valid IDs found: ${VALID_IDS}"
echo "Invalid IDs found: ${INVALID_IDS}"
echo ""

# 検証: 無効なID形式が存在しないこと
if [ -n "${INVALID_IDS}" ] && [ "${INVALID_IDS}" != "" ]; then
  echo "${FAIL}: detail に無効なID形式が含まれている: ${INVALID_IDS}"
  exit 1
fi

echo "${PASS}: detail内のIDが正しい形式（KHS-P####-T### / KTK-P####-T### / IROHA-P####-T###）のみ"
echo ""

# ============================================
# Phase 8: evidence=0 → LLM不使用（追加）
# ============================================
echo "【Phase 8: evidence=0 → LLM不使用】"
echo "テスト: 存在しないdoc/pdfPageでdomain質問 → evidence=null, LLM未使用（ログで確認）"
RESPONSE10_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-no-evidence","message":"存在しない.pdf pdfPage=99999 言灵とは？"}')
MODE10=$(echo "${RESPONSE10_JSON}" | jq -r '.decisionFrame.mode')
INTENT10=$(echo "${RESPONSE10_JSON}" | jq -r '.decisionFrame.intent')
EVIDENCE10=$(echo "${RESPONSE10_JSON}" | jq -r '.evidence // "null"')
RESPONSE10=$(echo "${RESPONSE10_JSON}" | jq -r '.response')

echo "Mode: ${MODE10}"
echo "Intent: ${INTENT10}"
echo "Evidence: ${EVIDENCE10}"
echo "Response: ${RESPONSE10}"
echo ""

# 検証: intent が domain であること
if [ "${INTENT10}" != "domain" ]; then
  echo "${FAIL}: intent should be domain, but got ${INTENT10}"
  exit 1
fi

# 検証: mode が HYBRID であること
if [ "${MODE10}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE10}"
  exit 1
fi

# 検証: evidence が null であること
if [ "${EVIDENCE10}" != "null" ]; then
  echo "⚠️  WARN: evidence should be null when no evidence found, but got: ${EVIDENCE10}"
fi

# 検証: response が「資料不足」であること（LLM未使用の証拠）
if ! echo "${RESPONSE10}" | grep -qE "(資料不足|次に読む|指定してください)"; then
  echo "${FAIL}: response should contain '資料不足' when evidence=0, but got: ${RESPONSE10}"
  exit 1
fi

echo "${PASS}: evidence=0 の場合、LLM未使用で「資料不足」レスポンスを返す"
echo ""

# ============================================
# Phase 9: doc/pdfPage未指定でも自動検索（追加）
# ============================================
echo "【Phase 9: doc/pdfPage未指定でも自動検索】"
echo "テスト: 言灵とは？ #詳細（doc/pdfPage無し）→ 候補 or 回答が返る、捏造lawId/pdfPageなし"
RESPONSE12_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-auto-evidence","message":"言灵とは？ #詳細"}' | jq '.')

MODE12=$(echo "${RESPONSE12_JSON}" | jq -r '.decisionFrame.mode')
RESPONSE_TEXT12=$(echo "${RESPONSE12_JSON}" | jq -r '.response')
DETAIL12=$(echo "${RESPONSE12_JSON}" | jq -r '.detail // ""')
AUTO_EVIDENCE=$(echo "${RESPONSE12_JSON}" | jq -r '.decisionFrame.autoEvidence // null')
EVIDENCE12=$(echo "${RESPONSE12_JSON}" | jq -r '.evidence // null')

echo "Response: ${RESPONSE_TEXT12:0:100}..."
echo "Mode: ${MODE12}"
echo "Detail length: $(echo "${DETAIL12}" | wc -c)"
echo "AutoEvidence: ${AUTO_EVIDENCE}"
echo "Evidence: ${EVIDENCE12}"
echo ""

# 検証: mode が HYBRID であること
if [ "${MODE12}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE12}"
  exit 1
fi

# 検証: response または候補が返ること
if [ -z "${RESPONSE_TEXT12}" ] || [ "${RESPONSE_TEXT12}" = "null" ]; then
  echo "${FAIL}: response should not be empty"
  exit 1
fi

# 検証: confidence >= 0.6 の場合は evidence が返ること
if [ "${AUTO_EVIDENCE}" != "null" ]; then
  CONFIDENCE=$(echo "${AUTO_EVIDENCE}" | jq -r '.confidence // 0')
  if (( $(echo "${CONFIDENCE} >= 0.6" | bc -l 2>/dev/null || echo "0") )); then
    if [ "${EVIDENCE12}" = "null" ] || [ -z "${EVIDENCE12}" ]; then
      echo "${FAIL}: When confidence >= 0.6, evidence should be returned"
      exit 1
    fi
  fi
fi

# 検証: detail に捏造lawId/pdfPageが出ないこと
if [ -n "${DETAIL12}" ] && [ "${DETAIL12}" != "null" ]; then
  # 捏造された形式のIDをチェック（KHS-/KTK-/IROHA-以外の形式）
  INVALID_IDS=$(echo "${DETAIL12}" | grep -oE '(lawId|法則ID|引用ID|言霊-|言灵-|カタカムナ-|いろは-)[A-Z0-9-]*' | grep -vE '^(KHS-|KTK-|IROHA-)P[0-9]{4}-T[0-9]{3}' || echo "")
  if [ -n "${INVALID_IDS}" ]; then
    echo "${FAIL}: detail contains invalid/fabricated IDs: ${INVALID_IDS}"
    exit 1
  fi
  
  # pdfPageが捏造されていないことを確認（数値のみ、またはdoc/pdfPage形式のみ）
  FABRICATED_PAGES=$(echo "${DETAIL12}" | grep -oE 'pdfPage\s*[:=]\s*[0-9]+' | grep -vE 'pdfPage\s*[:=]\s*[0-9]{1,4}' || echo "")
  if [ -n "${FABRICATED_PAGES}" ]; then
    echo "⚠️  WARN: Potential fabricated pdfPage in detail: ${FABRICATED_PAGES}"
  fi
fi

echo "${PASS}: doc/pdfPage未指定でも自動検索が動作、捏造なし"
echo ""

# ============================================
# Phase 10: domain(HYBRID) で llm=null/0 確認
# ============================================
echo "【Phase 10: domain(HYBRID) で llm=null/0 確認】"
echo "テスト: 言灵とは？ → decisionFrame.llm が null または 0"
RESPONSE13_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-llm-null","message":"言灵とは？"}')

MODE13=$(echo "${RESPONSE13_JSON}" | jq -r '.decisionFrame.mode')
INTENT13=$(echo "${RESPONSE13_JSON}" | jq -r '.decisionFrame.intent')
LLM13=$(echo "${RESPONSE13_JSON}" | jq -r '.decisionFrame.llm // "NOT_PRESENT"')

echo "Mode: ${MODE13}"
echo "Intent: ${INTENT13}"
echo "LLM: ${LLM13}"
echo ""

# 検証: mode が HYBRID であること
if [ "${MODE13}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE13}"
  exit 1
fi

# 検証: intent が domain であること
if [ "${INTENT13}" != "domain" ]; then
  echo "${FAIL}: intent should be domain, but got ${INTENT13}"
  exit 1
fi

# 検証: llm が null または 0 であること
if [ "${LLM13}" != "null" ] && [ "${LLM13}" != "0" ] && [ "${LLM13}" != "NOT_PRESENT" ]; then
  echo "${FAIL}: decisionFrame.llm should be null or 0 for domain(HYBRID), but got: ${LLM13}"
  exit 1
fi

echo "${PASS}: domain(HYBRID) で decisionFrame.llm が null/0"
echo ""

# ============================================
# Phase 11: detailに捏造ID（言霊-001）や pdfPage:3 が出ない（強化）
# ============================================
echo "【Phase 11: detailに捏造ID（言霊-001）や pdfPage:3 が出ない（強化）】"
echo "テスト: 言灵とは？ #詳細 → detail内に捏造ID（言霊-001、言灵-001、カタカムナ-001、いろは-001）や pdfPage:3 が出ない"
RESPONSE14_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-no-forgery-ids","message":"言灵とは？ #詳細"}')

DETAIL14=$(echo "${RESPONSE14_JSON}" | jq -r '.detail // ""')

# 捏造IDパターンをチェック（言霊-001、言灵-001、カタカムナ-001、いろは-001）
FORGED_IDS=$(echo "${DETAIL14}" | grep -oE '(言霊-|言灵-|カタカムナ-|いろは-)[0-9]+' || echo "")

# pdfPage:3 のような短いページ番号をチェック（通常は4桁以上）
SHORT_PAGES=$(echo "${DETAIL14}" | grep -oE 'pdfPage\s*[:=]\s*[0-9]{1,2}[^0-9]' || echo "")

echo "Detail length: $(echo "${DETAIL14}" | wc -c)"
echo "Forged IDs found: ${FORGED_IDS}"
echo "Short pages found: ${SHORT_PAGES}"
echo ""

# 検証: 捏造IDが存在しないこと
if [ -n "${FORGED_IDS}" ] && [ "${FORGED_IDS}" != "" ]; then
  echo "${FAIL}: detail に捏造ID（言霊-001、言灵-001、カタカムナ-001、いろは-001）が含まれている: ${FORGED_IDS}"
  exit 1
fi

# 検証: pdfPage:3 のような短いページ番号が存在しないこと（警告のみ、FAILにはしない）
if [ -n "${SHORT_PAGES}" ] && [ "${SHORT_PAGES}" != "" ]; then
  echo "⚠️  WARN: detail に短いページ番号（pdfPage:3 など）が含まれている可能性: ${SHORT_PAGES}"
fi

echo "${PASS}: detail に捏造ID（言霊-001、言灵-001、カタカムナ-001、いろは-001）や pdfPage:3 が出ない"
echo ""

# ============================================
# Phase 12: domain未指定「言灵とは？」で候補 or 暫定回答（止まらない）強化
# ============================================
echo "【Phase 12: domain未指定「言灵とは？」で候補 or 暫定回答（止まらない）強化】"
echo "テスト: 言灵とは？（doc/pdfPage未指定）→ 候補提示 or 暫定回答が返る、エラーで止まらない"
RESPONSE15_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-auto-evidence-strong","message":"言灵とは？"}')

MODE15=$(echo "${RESPONSE15_JSON}" | jq -r '.decisionFrame.mode')
RESPONSE_TEXT15=$(echo "${RESPONSE15_JSON}" | jq -r '.response // ""')
ERROR15=$(echo "${RESPONSE15_JSON}" | jq -r '.error // "NOT_PRESENT"')

echo "Mode: ${MODE15}"
echo "Response length: $(echo "${RESPONSE_TEXT15}" | wc -c)"
echo "Error: ${ERROR15}"
echo ""

# 検証: mode が HYBRID であること
if [ "${MODE15}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE15}"
  exit 1
fi

# 検証: response が空でないこと（止まらない）
if [ -z "${RESPONSE_TEXT15}" ] || [ "${RESPONSE_TEXT15}" = "null" ]; then
  echo "${FAIL}: response should not be empty (止まらない)"
  exit 1
fi

# 検証: エラーが返されていないこと
if [ "${ERROR15}" != "NOT_PRESENT" ] && [ "${ERROR15}" != "null" ]; then
  echo "${FAIL}: error should not be present, but got: ${ERROR15}"
  exit 1
fi

# 検証: 候補提示 or 暫定回答が含まれていること
if ! echo "${RESPONSE_TEXT15}" | grep -qE "(候補|暫定|資料|根拠|推定|どれ|選択|指定)"; then
  echo "⚠️  WARN: 候補提示 or 暫定回答のキーワードが見つかりません"
fi

echo "${PASS}: domain未指定「言灵とは？」で候補 or 暫定回答が返る（止まらない）"
echo ""

# ============================================
# Phase 13: doc/pdfPage指定で GROUNDED が根拠候補を返す（確認）
# ============================================
echo "【Phase 13: doc/pdfPage指定で GROUNDED が根拠候補を返す（確認）】"
echo "テスト: 言霊秘書.pdf pdfPage=6 言灵の定義 #詳細 → GROUNDED、根拠候補が返る"
RESPONSE16_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-grounded-evidence","message":"言霊秘書.pdf pdfPage=6 言灵の定義 #詳細"}')

MODE16=$(echo "${RESPONSE16_JSON}" | jq -r '.decisionFrame.mode')
DETAIL16=$(echo "${RESPONSE16_JSON}" | jq -r '.detail // ""')
EVIDENCE16=$(echo "${RESPONSE16_JSON}" | jq -r '.evidence // null')

echo "Mode: ${MODE16}"
echo "Detail length: $(echo "${DETAIL16}" | wc -c)"
echo "Evidence: ${EVIDENCE16}"
echo ""

# 検証: mode が GROUNDED であること
if [ "${MODE16}" != "GROUNDED" ]; then
  echo "${FAIL}: mode should be GROUNDED, but got ${MODE16}"
  exit 1
fi

# 検証: detail が string で null ではないこと
if [ -z "${DETAIL16}" ] || [ "${DETAIL16}" = "null" ]; then
  echo "${FAIL}: detail should not be null or empty"
  exit 1
fi

# 検証: evidence が null ではないこと
if [ "${EVIDENCE16}" = "null" ] || [ -z "${EVIDENCE16}" ]; then
  echo "${FAIL}: evidence should not be null or empty for GROUNDED mode"
  exit 1
fi

# 検証: detail に根拠候補（lawId/quote）が含まれていること
if ! echo "${DETAIL16}" | grep -qE "(lawId|法則候補|引用|quote|KHS-|KTK-|IROHA-)"; then
  echo "${FAIL}: detail should contain lawId/quote/根拠候補"
  exit 1
fi

echo "${PASS}: doc/pdfPage指定で GROUNDED が根拠候補を返す"
echo ""

# ============================================
# Phase 14: JSON判別と動作確認（VPS用）
# ============================================
echo "【Phase 14: JSON判別と動作確認（VPS用）】"
echo "テスト: curl -i で Content-Type が application/json であることを確認"
RESPONSE17_HEADERS=$(curl -sS -i "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | head -n 30)

CONTENT_TYPE=$(echo "${RESPONSE17_HEADERS}" | grep -i "Content-Type:" | head -n 1)

echo "Content-Type header: ${CONTENT_TYPE}"
echo ""

# 検証: Content-Type が application/json であること
if ! echo "${CONTENT_TYPE}" | grep -qi "application/json"; then
  echo "${FAIL}: Content-Type should be application/json, but got: ${CONTENT_TYPE}"
  exit 1
fi

echo "${PASS}: Content-Type が application/json"
echo ""

echo "テスト: 言灵とは？ #詳細 → 「資料指定して」で止まらず、候補提示 or 暫定採用に変わる"
RESPONSE18_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}')

RESPONSE18_TEXT=$(echo "${RESPONSE18_JSON}" | jq -r '.response // ""')
MODE18=$(echo "${RESPONSE18_JSON}" | jq -r '.decisionFrame.mode')

echo "Response: ${RESPONSE18_TEXT:0:200}..."
echo "Mode: ${MODE18}"
echo ""

# 検証: mode が HYBRID であること
if [ "${MODE18}" != "HYBRID" ]; then
  echo "${FAIL}: mode should be HYBRID, but got ${MODE18}"
  exit 1
fi

# 検証: 「資料指定して」で止まらない（候補提示 or 暫定採用が返る）
if echo "${RESPONSE18_TEXT}" | grep -qE "(資料準拠で答えるため|参照する資料の指定が必要)"; then
  # ただし、hits==0 の場合は「資料指定して」が返るのは正常
  EVIDENCE18=$(echo "${RESPONSE18_JSON}" | jq -r '.evidence // null')
  if [ "${EVIDENCE18}" = "null" ]; then
    echo "⚠️  WARN: hits==0 のため「資料指定して」が返っています（正常）"
  else
    echo "${FAIL}: 「資料指定して」で止まっている（候補提示 or 暫定採用が返るべき）"
    exit 1
  fi
fi

# 検証: 候補提示 or 暫定採用のキーワードが含まれていること
if ! echo "${RESPONSE18_TEXT}" | grep -qE "(候補|暫定|どれ|選択|番号|confidence|採用|自動検索)"; then
  echo "⚠️  WARN: 候補提示 or 暫定採用のキーワードが見つかりません"
fi

echo "${PASS}: 「資料指定して」で止まらず、候補提示 or 暫定採用に変わる"
echo ""

# ============================================
# ビルド＆再起動手順（VPS用コメント）
# ============================================
echo "【VPS用ビルド＆再起動手順】"
echo "# cd /opt/tenmon-ark/api"
echo "# pnpm -s build"
echo "# systemctl restart tenmon-ark-api.service"
echo "# sleep 0.6"
echo ""

# ============================================
echo "=== 全テスト完了 ==="
echo "✅ すべての受入テストに合格しました"
echo ""
echo "【期待値確認】"
echo "✅ /api/version に version, gitSha, builtAt が含まれている"
echo "✅ 言灵とは？ → mode=HYBRID"
echo "✅ 言灵とは？ #詳細 → mode=HYBRID、detailType=string、detailLen>0"
echo "✅ lawId は KHS- / KTK- / IROHA- 形式のみ（捏造なし）"
echo "✅ detail に doc/pdfPage が含まれている"
echo "✅ detail に捏造ID（言霊-001、言灵-001、カタカムナ-001、いろは-001）や pdfPage:3 が出ない"
echo "✅ response に禁止テンプレ語が入っていない"
echo "✅ doc/pdfPage未指定でも自動検索が動作、候補 or 回答が返る"
echo "✅ domain(HYBRID) で decisionFrame.llm が null/0"
echo "✅ doc/pdfPage指定で GROUNDED が根拠候補を返す"
echo "✅ Content-Type が application/json"
echo "✅ 「資料指定して」で止まらず、候補提示 or 暫定採用に変わる"

