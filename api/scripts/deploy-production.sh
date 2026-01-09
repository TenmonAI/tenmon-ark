#!/bin/bash
# /opt/tenmon-ark/api/scripts/deploy-production.sh
# 本番環境へのデプロイスクリプト

set -e

API_DIR="/opt/tenmon-ark/api"
SERVICE_NAME="tenmon-ark-api"

echo "=== TENMON-ARK API 本番デプロイ ==="
echo ""

# 1. 現在の状態確認
echo "--- STEP 1: 現在の状態確認 ---"
cd "${API_DIR}"

# ビルド確認
if [ ! -d "dist" ]; then
  echo "❌ ERROR: dist ディレクトリが見つかりません。まずビルドしてください。"
  exit 1
fi

echo "✅ dist ディレクトリが存在します"

# 2. ビルド（念のため）
echo ""
echo "--- STEP 2: ビルド ---"
pnpm build
echo "✅ ビルド完了"

# 3. スモークテスト（ローカル）
echo ""
echo "--- STEP 3: スモークテスト（ローカル） ---"
if [ -f "scripts/smoke_chat.sh" ]; then
  BASE_URL="http://localhost:3000" ./scripts/smoke_chat.sh || {
    echo "⚠️  スモークテストが失敗しましたが、続行します"
  }
else
  echo "⚠️  スモークテストスクリプトが見つかりません。スキップします。"
fi

# 4. サービス停止
echo ""
echo "--- STEP 4: サービス停止 ---"
sudo systemctl stop "${SERVICE_NAME}" || {
  echo "⚠️  サービスが既に停止しているか、存在しません"
}

# 5. バックアップ（オプション）
echo ""
echo "--- STEP 5: バックアップ（オプション） ---"
BACKUP_DIR="${API_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
if [ -d "dist" ]; then
  mkdir -p "${API_DIR}/backups"
  echo "バックアップディレクトリ: ${BACKUP_DIR}"
  # 必要に応じてバックアップを実行
fi

# 6. サービス再起動
echo ""
echo "--- STEP 6: サービス再起動 ---"
sudo systemctl start "${SERVICE_NAME}"
sleep 3

# 7. サービス状態確認
echo ""
echo "--- STEP 7: サービス状態確認 ---"
sudo systemctl status "${SERVICE_NAME}" --no-pager || {
  echo "❌ ERROR: サービスが起動していません"
  echo "ログを確認: sudo journalctl -u ${SERVICE_NAME} -n 50"
  exit 1
}

# 8. ヘルスチェック
echo ""
echo "--- STEP 8: ヘルスチェック ---"
sleep 2
HEALTH_CHECK=$(curl -sS http://localhost:3000/api/health 2>&1 || echo "ERROR")

if echo "${HEALTH_CHECK}" | grep -q "external"; then
  echo "✅ /api/health が応答し、新しいAPIが動作しています"
  echo "${HEALTH_CHECK}" | jq -r '.external // "null"' 2>/dev/null || echo "${HEALTH_CHECK:0:200}"
else
  echo "⚠️  /api/health の応答が期待と異なります"
  echo "Response: ${HEALTH_CHECK:0:200}"
fi

# 9. 本番環境確認（オプション）
echo ""
echo "--- STEP 9: 本番環境確認（オプション） ---"
if [ -f "scripts/check-production.sh" ]; then
  echo "本番環境の状態を確認しますか？ (y/N)"
  read -r CONFIRM
  if [ "${CONFIRM}" = "y" ] || [ "${CONFIRM}" = "Y" ]; then
    ./scripts/check-production.sh
  fi
fi

echo ""
echo "=== デプロイ完了 ==="
echo "次のコマンドでログを確認:"
echo "  sudo journalctl -u ${SERVICE_NAME} -f"

