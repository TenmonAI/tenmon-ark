#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:3000"

echo "[smoke] audit build mark"
A="$(curl -fsS "$BASE/api/audit")"
if command -v jq >/dev/null 2>&1; then
  echo "$A" | jq -e '.ok==true' >/dev/null
  echo "$A" | jq -e '.build != null' >/dev/null
echo "[smoke] audit build mark"
curl -fsS http://127.0.0.1:3000/api/audit | grep -q "BUILD_MARK:DET_RECALL_V1" || { echo "[smoke] FAIL: build mark missing"; curl -fsS http://127.0.0.1:3000/api/audit | head -c 500; echo; exit 1; }
else
  echo "$A" | grep -q '"ok":true'
  echo "$A" | grep -q 'BUILD_MARK:'
fi

echo "[smoke] ping must be NATURAL fallback"
R1="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke","message":"ping"}')"
echo "$R1" | grep -q "お手伝い" || { echo "[smoke] FAIL ping fallback"; echo "$R1"; exit 1; }
echo "$R1" | grep -qE "(正中|内集|外発|圧縮|凝縮|発酵)" && { echo "[smoke] FAIL kanagi meta in ping"; echo "$R1"; exit 1; } || true

echo "[smoke] passphrase set + recall"
curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' \
  | jq -r '.response' | grep -qE "(登録しました|設定しました)" \
  || { echo "[smoke] FAIL passphrase set"; exit 1; }

curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}' \
  | jq -r '.response' | grep -q "青い鳥" \
  || { echo "[smoke] FAIL passphrase recall"; exit 1; }

echo "[smoke] NATURAL short japanese chat gate"
R3="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-nat","message":"今日は何をすればいい？"}')"

# mode must be NATURAL
echo "$R3" | jq -e '.decisionFrame.mode=="NATURAL"' >/dev/null \
  || { echo "[smoke] FAIL nat mode"; echo "$R3"; exit 1; }

# response must not be the fixed menu text
echo "$R3" | jq -r '.response' | grep -q "どの方向で話しますか" && \
  { echo "[smoke] FAIL nat is menu"; echo "$R3"; exit 1; } || true

# response must not contain kanagi meta words
echo "$R3" | jq -r '.response' | grep -qE "(正中|内集|外発|圧縮|凝縮|発酵)" && \
  { echo "[smoke] FAIL nat contains kanagi meta"; echo "$R3"; exit 1; } || true


echo "[smoke] NATURAL short japanese must NOT show menu"
N2="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-nat2","message":"不安で動けない"}')"
echo "$N2" | grep -q "どの方向で話しますか" && { echo "[smoke] FAIL nat2 menu leaked"; echo "$N2"; exit 1; } || true

N3="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-nat3","message":"やることが多すぎる"}')"
echo "$N3" | grep -q "どの方向で話しますか" && { echo "[smoke] FAIL nat3 menu leaked"; echo "$N3"; exit 1; } || true



echo "[smoke] hybrid NON_TEXT must not leak + must end with question"
H1="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-hybrid1","message":"言霊と断捨離の視点で相談です。最近、情報が多すぎて判断が鈍っています。優先順位の付け方をどう組み立てればいいですか？"}')"
echo "$H1" | jq -r '.decisionFrame.mode' | grep -qx "HYBRID" || { echo "[smoke] FAIL hybrid not HYBRID"; echo "$H1"; exit 1; }
echo "$H1" | jq -r '.response' | grep -q "\[NON_TEXT_PAGE_OR_OCR_FAILED\]" && { echo "[smoke] FAIL NON_TEXT leaked"; echo "$H1"; exit 1; } || true
echo "$H1" | jq -r '.response' | tail -n 1 | grep -q "？" || { echo "[smoke] FAIL hybrid must end with ?"; echo "$H1"; exit 1; }

echo "[smoke] OK"
