#!/usr/bin/env bash
set -euo pipefail

# VPS側で実行するスクリプト：最新コミットを反映して Phase28 を確実にPASSさせる

cd /opt/tenmon-ark/api
set +H

echo "=========================================="
echo "A. 原因同定（リポジトリと origin の確認）"
echo "=========================================="

echo "[1] 現在のリポジトリと origin の確認"
pwd
git rev-parse --is-inside-work-tree
echo ""
echo "--- git remote -v ---"
git remote -v
echo ""
echo "--- git branch -vv ---"
git branch -vv
echo ""
echo "--- git status -sb ---"
git status -sb
echo ""
echo "--- git log -3 --oneline --decorate ---"
git log -3 --oneline --decorate
echo ""
echo "--- git show -s --format='%H %d %s' HEAD ---"
git show -s --format='%H %d %s' HEAD

echo ""
echo "[2] リモートの最新コミット確認"
git fetch --all --prune
echo ""
echo "--- git ls-remote --heads origin | head -n 20 ---"
git ls-remote --heads origin | head -n 20
echo ""
echo "--- git ls-remote --heads origin main ---"
git ls-remote --heads origin main
echo ""
echo "--- git ls-remote --heads origin master ---"
git ls-remote --heads origin master

echo ""
echo "=========================================="
echo "A-2. origin/branch の修正（必要に応じて）"
echo "=========================================="

# origin が正しいURLか確認
CURRENT_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
EXPECTED_ORIGIN="https://github.com/TenmonAI/tenmon-ark.git"

if [ "$CURRENT_ORIGIN" != "$EXPECTED_ORIGIN" ]; then
  echo "[修正] origin を $EXPECTED_ORIGIN に設定"
  git remote set-url origin "$EXPECTED_ORIGIN"
  git fetch --all --prune
fi

# 現在のブランチを確認
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "[修正] ブランチを main に切り替え"
  git checkout main
fi

echo ""
echo "=========================================="
echo "A-3. main を origin/main に完全同期"
echo "=========================================="

echo "[3] ローカルを origin/main に強制同期"
git reset --hard origin/main
git clean -fd

echo ""
echo "=========================================="
echo "B. 反映後の検証"
echo "=========================================="

echo "[4] HEADが 9b05121 以上になったことを確認"
git log -1 --oneline
HEAD_HASH=$(git rev-parse HEAD)
EXPECTED_HASH="9b05121"
if git merge-base --is-ancestor "$EXPECTED_HASH" "$HEAD_HASH" 2>/dev/null; then
  echo "[OK] HEAD ($HEAD_HASH) は $EXPECTED_HASH 以降です"
else
  echo "[WARN] HEAD ($HEAD_HASH) が $EXPECTED_HASH 以降か確認が必要です"
fi

echo ""
echo "[5] ビルド→再起動→受入テスト"
pnpm -s build
sudo systemctl restart tenmon-ark-api.service
sleep 0.5
bash scripts/acceptance_test.sh
EXIT_CODE=$?
echo "EXIT=$EXIT_CODE"

echo ""
echo "[6] Phase28 手動確認（cand0がP1にならない）"
BASE_URL="http://127.0.0.1:3000"
RESPONSE=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"p28","message":"言霊とは何？ #詳細"}')
echo "$RESPONSE" | jq '{cand0:(.candidates[0]//null)}'
CAND0_PAGE=$(echo "$RESPONSE" | jq -r '.candidates[0].pdfPage // 0')
if [ "$CAND0_PAGE" = "1" ]; then
  echo "[WARN] cand0.pdfPage が 1 です（表紙が上位に来ています）"
else
  echo "[OK] cand0.pdfPage = $CAND0_PAGE (P1 ではありません)"
fi

echo ""
echo "=========================================="
echo "C. コード未反映の確認"
echo "=========================================="

echo "[7] VPS側の search.ts が本当に更新されているか確認"
if grep -q "tie-break" src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] tie-break が見つかりました"
else
  echo "[FAIL] tie-break が見つかりません（古いコードの可能性）"
fi

if grep -q "pageTextStmt" src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] pageTextStmt が見つかりました"
else
  echo "[FAIL] pageTextStmt が見つかりません（古いコードの可能性）"
fi

if grep -q "penalty += 80" src/kokuzo/search.ts 2>/dev/null; then
  echo "[OK] penalty += 80 が見つかりました"
else
  echo "[FAIL] penalty += 80 が見つかりません（古いコードの可能性）"
fi

echo ""
echo "=========================================="
echo "D. 完了"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ] && [ "$CAND0_PAGE" != "1" ]; then
  echo "[SUCCESS] Phase28 を封印完了"
  echo ""
  echo "[8] 受入テストのPASSログを保存"
  mkdir -p logs
  bash scripts/acceptance_test.sh 2>&1 | tee -a "logs/acc_$(date +%F_%H%M%S).log"
else
  echo "[FAIL] Phase28 がまだ PASS していません"
  echo "EXIT_CODE=$EXIT_CODE, CAND0_PAGE=$CAND0_PAGE"
  exit 1
fi
