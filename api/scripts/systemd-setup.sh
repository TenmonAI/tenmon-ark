#!/bin/bash
# /opt/tenmon-ark/api/scripts/systemd-setup.sh
# systemd サービス設定スクリプト

set -e

SERVICE_NAME="tenmon-ark-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
OVERRIDE_DIR="/etc/systemd/system/${SERVICE_NAME}.service.d"
OVERRIDE_FILE="${OVERRIDE_DIR}/override.conf"
API_DIR="/opt/tenmon-ark/api"

echo "=== TENMON-ARK API systemd セットアップ ==="

# 1. サービスファイルが存在するか確認
if [ ! -f "${SERVICE_FILE}" ]; then
  echo "❌ ERROR: ${SERVICE_FILE} が見つかりません"
  echo "まずサービスファイルを作成してください"
  exit 1
fi

# 2. override ディレクトリを作成
echo "Creating override directory: ${OVERRIDE_DIR}"
sudo mkdir -p "${OVERRIDE_DIR}"

# 3. override.conf のテンプレートを作成（secretsは含めない）
echo "Creating override.conf template..."
sudo tee "${OVERRIDE_FILE}" > /dev/null <<EOF
[Service]
# 環境変数（secretsは手動で設定してください）
# Environment=OPENAI_API_KEY=your_key_here
# Environment=LIVE_SEARCH_API_KEY=your_key_here
# Environment=TENMON_LLM_MODEL=gpt-4o-mini
# Environment=SQLITE_PATH=/opt/tenmon-ark/api/db/threads.sqlite
# Environment=BING_SEARCH_API_KEY=your_key_here
# Environment=LIVE_SEARCH_PROVIDER=bing

# 作業ディレクトリ
WorkingDirectory=${API_DIR}

# リソース制限（オプション）
# LimitNOFILE=65536
# LimitNPROC=4096
EOF

echo "✅ Created ${OVERRIDE_FILE}"
echo ""
echo "⚠️  重要: secrets を手動で設定してください"
echo "   sudo nano ${OVERRIDE_FILE}"
echo "   以下の環境変数を設定:"
echo "   - OPENAI_API_KEY"
echo "   - LIVE_SEARCH_API_KEY (Bing Search API)"
echo "   - TENMON_LLM_MODEL (オプション、デフォルト: gpt-4o-mini)"
echo ""

# 4. systemd をリロード
echo "Reloading systemd..."
sudo systemctl daemon-reload

# 5. サービスを有効化
echo "Enabling service..."
sudo systemctl enable "${SERVICE_NAME}"

# 6. サービス状態を確認
echo ""
echo "=== サービス状態 ==="
sudo systemctl status "${SERVICE_NAME}" --no-pager || true

echo ""
echo "=== 次のステップ ==="
echo "1. secrets を設定: sudo nano ${OVERRIDE_FILE}"
echo "2. サービスを起動: sudo systemctl start ${SERVICE_NAME}"
echo "3. ログを確認: sudo journalctl -u ${SERVICE_NAME} -f"
echo ""

