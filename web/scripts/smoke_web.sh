#!/usr/bin/env bash
set -euo pipefail

# Web 禁止パターン: tenmon-ark.sessionId | session_id: | input: を src 配下の本体ファイルだけで検出（.bak* 除外）
WEB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WEB_ROOT"

# 禁止パターンは chat レイヤー（threadId/message に寄せる）のみ対象。.bak* 除外。
HITS="$(rg -g '!*.bak' -g '!*.bak.*' 'tenmon-ark\.sessionId|session_id:|input:' \
  src/api/chat.ts src/hooks/useChat.ts src/types/chat.ts src/App.tsx 2>/dev/null || true)"
if [ -n "$HITS" ]; then
  echo "[FAIL] smoke_web: forbidden pattern (tenmon-ark.sessionId | session_id: | input:) in src"
  echo "$HITS"
  exit 1
fi
echo "[PASS] smoke_web forbidden check"

# P1復元フックの存在ゲート（P1_PERSIST_GATE_V1 追記）
rg -n 'setRestored\(true\)' src/App.tsx >/dev/null || { echo "[FAIL] smoke_web P1: setRestored(true) not found"; exit 1; }
rg -n '<p>restored</p>' src/App.tsx >/dev/null || { echo "[FAIL] smoke_web P1: <p>restored</p> not found"; exit 1; }
echo "[PASS] smoke_web P1 restore hook gate"
