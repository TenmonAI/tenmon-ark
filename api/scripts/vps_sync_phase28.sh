#!/usr/bin/env bash
set -euo pipefail

# VPS側で実行するスクリプト：GitHubの最新mainへ完全同期して Phase28 を確実にPASSさせる

# 注意: tmuxに入った後にディレクトリが ~ に落ちる事故がある。常に cd を最初に実行する。
cd /opt/tenmon-ark/api && set +H

echo "=========================================="
echo "現在のディレクトリ確認"
echo "=========================================="
pwd

echo ""
echo "=========================================="
echo "A) VPS同期のための診断ログ"
echo "=========================================="

echo "[A-1] git rev-parse --is-inside-work-tree"
git rev-parse --is-inside-work-tree || echo "ERROR: not a git repository"

echo ""
echo "[A-2] git remote -v"
git remote -v

echo ""
echo "[A-3] git branch -vv"
git branch -vv

echo ""
echo "[A-4] git status -sb"
git status -sb

echo ""
echo "[A-5] git log -5 --oneline --decorate"
git log -5 --oneline --decorate

echo ""
echo "[A-6] git show -s --format='%H %d %s' HEAD"
git show -s --format='%H %d %s' HEAD

echo ""
echo "=========================================="
echo "B) リモートの実態を確認"
echo "=========================================="

echo "[B-1] git fetch --all --prune"
git fetch --all --prune

echo ""
echo "[B-2] git ls-remote --heads origin main"
git ls-remote --heads origin main

echo ""
echo "[B-3] git ls-remote --heads origin | head -n 20"
git ls-remote --heads origin | head -n 20

echo ""
echo "=========================================="
echo "C) origin が違う場合は修正して再取得"
echo "=========================================="

CURRENT_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
EXPECTED_ORIGIN="https://github.com/TenmonAI/tenmon-ark.git"

echo "現在の origin: $CURRENT_ORIGIN"
echo "期待される origin: $EXPECTED_ORIGIN"

if [ "$CURRENT_ORIGIN" != "$EXPECTED_ORIGIN" ]; then
  echo "[修正] origin を $EXPECTED_ORIGIN に設定"
  git remote set-url origin "$EXPECTED_ORIGIN"
  git fetch --all --prune
else
  echo "[OK] origin は正しい"
fi

echo ""
echo "=========================================="
echo "D) main を origin/main に強制同期"
echo "=========================================="

echo "[D-1] git checkout -B main origin/main"
git checkout -B main origin/main

echo ""
echo "[D-2] git reset --hard origin/main"
git reset --hard origin/main

echo ""
echo "[D-3] git clean -fd"
git clean -fd

echo ""
echo "=========================================="
echo "E) HEADが最新になったことを確認"
echo "=========================================="

echo "[E-1] git log -1 --oneline --decorate"
git log -1 --oneline --decorate

HEAD_HASH=$(git rev-parse HEAD)
EXPECTED_HASH="5bd1e94"  # Phase30 の最新コミット
echo "HEAD: $HEAD_HASH"
echo "期待: $EXPECTED_HASH 以降"

if git merge-base --is-ancestor "$EXPECTED_HASH" "$HEAD_HASH" 2>/dev/null || [ "$HEAD_HASH" = "$EXPECTED_HASH" ]; then
  echo "[OK] HEAD は $EXPECTED_HASH 以降です"
else
  echo "[WARN] HEAD が $EXPECTED_HASH 以降か確認が必要です"
fi

echo ""
echo "=========================================="
echo "F) ビルド→再起動→受入"
echo "=========================================="

echo "[F-1] pnpm -s build"
pnpm -s build

echo ""
echo "[F-2] sudo systemctl restart tenmon-ark-api.service"
sudo systemctl restart tenmon-ark-api.service
sleep 0.5

echo ""
echo "[F-3] bash scripts/acceptance_test.sh"
bash scripts/acceptance_test.sh
EXIT_CODE=$?
echo "EXIT=$EXIT_CODE"

echo ""
echo "=========================================="
echo "G) Phase28 手動確認"
echo "=========================================="

BASE_URL="http://127.0.0.1:3000"
RESPONSE=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"p28","message":"言霊とは何？ #詳細"}')
echo "$RESPONSE" | jq '{cand0:(.candidates[0]//null)}'
CAND0_PAGE=$(echo "$RESPONSE" | jq -r '.candidates[0].pdfPage // 0')
echo "cand0.pdfPage = $CAND0_PAGE"
if [ "$CAND0_PAGE" = "1" ]; then
  echo "[WARN] cand0.pdfPage が 1 です（表紙が上位に来ています）"
else
  echo "[OK] cand0.pdfPage = $CAND0_PAGE (P1 ではありません)"
fi

echo ""
echo "=========================================="
echo "H) 反映確認（search.tsのシグネチャがあるか）"
echo "=========================================="

cd /opt/tenmon-ark/api
echo "[H-1] search.ts のシグネチャ確認"
if grep -q "pageTextStmt" src/kokuzo/search.ts 2>/dev/null || grep -q "pageTextStmt" api/src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] pageTextStmt が見つかりました"
else
  echo "[FAIL] pageTextStmt が見つかりません"
fi

if grep -q "tie-break" src/kokuzo/search.ts 2>/dev/null || grep -q "tie-break" api/src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] tie-break が見つかりました"
else
  echo "[FAIL] tie-break が見つかりません"
fi

if grep -q "penalty += 80" src/kokuzo/search.ts 2>/dev/null || grep -q "penalty += 80" api/src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] penalty += 80 が見つかりました"
else
  echo "[FAIL] penalty += 80 が見つかりません"
fi

echo ""
echo "=========================================="
echo "完了"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ] && [ "$CAND0_PAGE" != "1" ]; then
  echo "[SUCCESS] Phase28 を封印完了"
  echo "EXIT=$EXIT_CODE, cand0.pdfPage=$CAND0_PAGE"
  exit 0
else
  echo "[FAIL] Phase28 がまだ PASS していません"
  echo "EXIT_CODE=$EXIT_CODE, CAND0_PAGE=$CAND0_PAGE"
  exit 1
fi
