#!/bin/bash
# TENMON-ARK 受入テストスクリプト（正本）
# 実行方法: BASE_URL=http://localhost:3000 ./scripts/acceptance_test.sh
# 
# ルール: 変更前後で必ずこのテストを通す。PASSしない変更は無効。
# - build → systemd restart → /api/audit ok:true → /api/chat decisionFrame(llm=null, ku object) を確認
# - 0.5s×10 retry を標準化（restart直後の接続拒否対策）
# - NATURAL 3ケース（hello/date/help）も確認
# - 出力は最後に [PASS] を1回だけ表示

set -euo pipefail
set +H

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_DIR="${API_DIR:-/opt/tenmon-ark/api}"

echo "=== TENMON-ARK 受入テスト（正本） ==="
echo "BASE_URL: ${BASE_URL}"
echo "API_DIR: ${API_DIR}"
echo ""

# 色付き出力用
PASS="✅ PASS"
FAIL="❌ FAIL"

# ============================================
# ヘルパー関数: 0.5s×10 retry（restart直後の接続拒否対策）
# ============================================
retry_curl() {
  local url="$1"
  local method="${2:-GET}"
  local data="${3:-}"
  local max_retries=10
  local retry_delay=0.5
  local retry_count=0

  while [ $retry_count -lt $max_retries ]; do
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
      response=$(curl -sS -f -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data" 2>&1) && echo "$response" && return 0
    else
      response=$(curl -sS -f "$url" 2>&1) && echo "$response" && return 0
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      sleep $retry_delay
    fi
  done
  
  echo "$response" >&2
  return 1
}

# ============================================
# ヘルパー関数: JSON判定（node -e で統一、jq依存を排除）
# ============================================
json_get() {
  local json="$1"
  local path="$2"
  node -e "
    try {
      const data = JSON.parse(process.argv[1]);
      const keys = process.argv[2].split('.');
      let value = data;
      for (const key of keys) {
        if (value === null || value === undefined) {
          process.exit(1);
        }
        value = value[key];
      }
      if (value === null || value === undefined) {
        process.exit(1);
      }
      if (typeof value === 'object') {
        console.log(JSON.stringify(value));
      } else {
        console.log(String(value));
      }
    } catch (e) {
      process.exit(1);
    }
  " "$json" "$path" 2>/dev/null || echo ""
}

json_type() {
  local json="$1"
  local path="$2"
  node -e "
    try {
      const data = JSON.parse(process.argv[1]);
      const keys = process.argv[2].split('.');
      let value = data;
      for (const key of keys) {
        if (value === null || value === undefined) {
          console.log('null');
          process.exit(0);
        }
        value = value[key];
      }
      console.log(value === null ? 'null' : typeof value);
    } catch (e) {
      console.log('null');
      process.exit(0);
    }
  " "$json" "$path" 2>/dev/null || echo "null"
}

# ============================================
# Phase 0: ビルドと再起動
# ============================================
echo "【Phase 0: ビルドと再起動】"
echo "テスト: pnpm build → systemctl restart → 0.5s×10 retry で接続確認"

if [ -d "$API_DIR" ]; then
  cd "$API_DIR"
  echo "ビルド中..."
  pnpm -s build > /dev/null 2>&1 || {
    echo "${FAIL}: pnpm build failed"
    exit 1
  }
  echo "✅ ビルド成功"
  
  echo "再起動中..."
  sudo systemctl restart tenmon-ark-api.service 2>/dev/null || {
    echo "${FAIL}: systemctl restart failed"
    exit 1
  }
  echo "✅ 再起動成功"
  
  echo "接続確認中（0.5s×10 retry）..."
  sleep 0.5
  for i in {1..10}; do
    if curl -sS -f "${BASE_URL}/health" > /dev/null 2>&1; then
      echo "✅ 接続確認成功（retry: ${i}回目）"
      break
    fi
    if [ $i -eq 10 ]; then
      echo "${FAIL}: 接続確認失敗（10回 retry 後も接続不可）"
      exit 1
    fi
    sleep 0.5
  done
else
  echo "⚠️  API_DIR (${API_DIR}) が存在しないため、ビルドと再起動をスキップ"
fi

echo ""

# ============================================
# Phase 1: /api/audit の確認
# ============================================
echo "【Phase 1: /api/audit の確認】"
echo "テスト: /api/audit が ok:true または status:ok を返す"

AUDIT_JSON=$(retry_curl "${BASE_URL}/api/audit")
AUDIT_OK=$(json_get "$AUDIT_JSON" "ok" || echo "")
AUDIT_STATUS=$(json_get "$AUDIT_JSON" "status" || echo "")

if [ -z "$AUDIT_OK" ] && [ -z "$AUDIT_STATUS" ]; then
  echo "${FAIL}: /api/audit が ok または status を返さない"
  echo "Response: ${AUDIT_JSON:0:200}"
  exit 1
fi

# ok または status が "ok" または true であることを確認
if [ -n "$AUDIT_OK" ]; then
  # ok が true であることを確認（boolean の true または文字列 "true"）
  if [ "$AUDIT_OK" != "true" ]; then
    echo "${FAIL}: /api/audit の ok が true ではない（got: ${AUDIT_OK}）"
    exit 1
  fi
elif [ -n "$AUDIT_STATUS" ]; then
  # status が "ok" であることを確認（文字列 "ok"）
  if [ "$AUDIT_STATUS" != "ok" ] && [ "$AUDIT_STATUS" != "\"ok\"" ]; then
    echo "${FAIL}: /api/audit の status が ok ではない（got: ${AUDIT_STATUS}）"
    exit 1
  fi
fi

echo "✅ /api/audit ok:true 確認成功"
echo ""

# ============================================
# Phase 2: /api/chat decisionFrame の確認
# ============================================
echo "【Phase 2: /api/chat decisionFrame の確認】"
echo "テスト: /api/chat が decisionFrame(llm=null, ku object) を返す"

CHAT_JSON=$(retry_curl "${BASE_URL}/api/chat" "POST" '{"threadId":"test-decisionframe","message":"言灵とは？"}')

CHAT_MODE=$(json_get "$CHAT_JSON" "decisionFrame.mode" || echo "")
CHAT_LLM=$(json_get "$CHAT_JSON" "decisionFrame.llm" || echo "")
CHAT_KU_TYPE=$(json_type "$CHAT_JSON" "decisionFrame.ku" || echo "null")

if [ -z "$CHAT_MODE" ]; then
  echo "${FAIL}: /api/chat が decisionFrame.mode を返さない"
  echo "Response: ${CHAT_JSON:0:200}"
  exit 1
fi

if [ "$CHAT_LLM" != "null" ] && [ "$CHAT_LLM" != "" ]; then
  echo "${FAIL}: /api/chat の decisionFrame.llm が null ではない（got: ${CHAT_LLM}）"
  exit 1
fi

if [ "$CHAT_KU_TYPE" != "object" ]; then
  echo "${FAIL}: /api/chat の decisionFrame.ku が object ではない（got type: ${CHAT_KU_TYPE}）"
  exit 1
fi

echo "✅ /api/chat decisionFrame(llm=null, ku object) 確認成功"
echo ""

# ============================================
# Phase 3: NATURAL モードの3ケース（hello/date/help）
# ============================================
echo "【Phase 3-1: NATURAL greeting テスト】"
echo "テスト: hello → mode=NATURAL, kuType=object, llm=null"

N1_JSON=$(retry_curl "${BASE_URL}/api/chat" "POST" '{"threadId":"test-natural-greeting","message":"hello"}')
N1_MODE=$(json_get "$N1_JSON" "decisionFrame.mode" || echo "")
N1_KU_TYPE=$(json_type "$N1_JSON" "decisionFrame.ku" || echo "null")
N1_LLM=$(json_get "$N1_JSON" "decisionFrame.llm" || echo "null")

if [ "$N1_MODE" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL greeting: mode should be NATURAL, but got ${N1_MODE}"
  exit 1
fi

if [ "$N1_KU_TYPE" != "object" ]; then
  echo "${FAIL}: NATURAL greeting: decisionFrame.ku should be object, but got type: ${N1_KU_TYPE}"
  exit 1
fi

if [ "$N1_LLM" != "null" ] && [ "$N1_LLM" != "" ]; then
  echo "${FAIL}: NATURAL greeting: decisionFrame.llm should be null, but got: ${N1_LLM}"
  exit 1
fi

echo "【Phase 3-2: NATURAL datetime テスト】"
echo "テスト: date → mode=NATURAL, kuType=object, responseにJST時刻が含まれる"

N2_JSON=$(retry_curl "${BASE_URL}/api/chat" "POST" '{"threadId":"test-natural-datetime","message":"date"}')
N2_MODE=$(json_get "$N2_JSON" "decisionFrame.mode" || echo "")
N2_KU_TYPE=$(json_type "$N2_JSON" "decisionFrame.ku" || echo "null")
N2_RESPONSE=$(json_get "$N2_JSON" "response" || echo "")

if [ "$N2_MODE" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL datetime: mode should be NATURAL, but got ${N2_MODE}"
  exit 1
fi

if [ "$N2_KU_TYPE" != "object" ]; then
  echo "${FAIL}: NATURAL datetime: decisionFrame.ku should be object, but got type: ${N2_KU_TYPE}"
  exit 1
fi

if ! echo "$N2_RESPONSE" | grep -qE "(JST|202[0-9]-[0-9]{2}-[0-9]{2}|（[月火水木金土日]）)"; then
  echo "${FAIL}: NATURAL datetime: response should contain JST, YYYY-MM-DD, or （曜）, but got: ${N2_RESPONSE:0:100}"
  exit 1
fi

echo "【Phase 3-3: NATURAL smalltalk誘導 テスト】"
echo "テスト: help → mode=NATURAL, kuType=object, responseに選択肢が含まれる"

N3_JSON=$(retry_curl "${BASE_URL}/api/chat" "POST" '{"threadId":"test-natural-smalltalk","message":"help"}')
N3_MODE=$(json_get "$N3_JSON" "decisionFrame.mode" || echo "")
N3_KU_TYPE=$(json_type "$N3_JSON" "decisionFrame.ku" || echo "null")
N3_RESPONSE=$(json_get "$N3_JSON" "response" || echo "")

if [ "$N3_MODE" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL smalltalk: mode should be NATURAL, but got ${N3_MODE}"
  exit 1
fi

if [ "$N3_KU_TYPE" != "object" ]; then
  echo "${FAIL}: NATURAL smalltalk: decisionFrame.ku should be object, but got type: ${N3_KU_TYPE}"
  exit 1
fi

if ! echo "$N3_RESPONSE" | grep -qE "(1\)|2\)|3\))"; then
  echo "${FAIL}: NATURAL smalltalk: response should contain choice options (1) 2) 3)), but got: ${N3_RESPONSE:0:100}"
  exit 1
fi

echo ""

# ============================================
# 全テスト完了
# ============================================
echo "=== 全テスト完了 ==="
echo "[PASS] すべての受入テストに合格しました"
echo ""
echo "【確認項目】"
echo "✅ build → systemd restart → 接続確認（0.5s×10 retry）"
echo "✅ /api/audit ok:true"
echo "✅ /api/chat decisionFrame(llm=null, ku object)"
echo "✅ NATURAL 3ケース（hello/date/help）"
