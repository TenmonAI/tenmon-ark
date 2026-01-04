#!/bin/bash
# Nginx設定：index.html キャッシュ対策スクリプト
# 使用方法: sudo bash scripts/fix-nginx-index-html-cache.sh

set -e

NGINX_CONFIG="/etc/nginx/sites-enabled/tenmon-ark"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Nginx設定：index.html キャッシュ対策を適用します..."

# バックアップ作成
if [ -f "$NGINX_CONFIG" ]; then
    echo "📦 バックアップを作成: $BACKUP_FILE"
    sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
else
    echo "❌ エラー: $NGINX_CONFIG が見つかりません"
    exit 1
fi

# 設定を追加（443側のserverブロック内）
# 注意: このスクリプトは手動で設定を追加する必要があります
# 自動化が難しいため、設定内容を表示します

echo ""
echo "=========================================="
echo "以下の設定を $NGINX_CONFIG に追加してください："
echo "=========================================="
echo ""
echo "# index.html は常に最新を取りに行く"
echo "location = /index.html {"
echo "    add_header Cache-Control \"no-store\" always;"
echo "    try_files \$uri =404;"
echo "}"
echo ""
echo "# Vite のハッシュ付き資産は長期キャッシュOK"
echo "location /assets/ {"
echo "    add_header Cache-Control \"public, max-age=31536000, immutable\" always;"
echo "    try_files \$uri =404;"
echo "}"
echo ""
echo "=========================================="
echo ""
echo "📝 編集方法:"
echo "   sudo nano $NGINX_CONFIG"
echo ""
echo "   上記の設定を server { ... listen 443 ... } ブロック内に追加"
echo ""
echo "✅ 設定後、以下を実行:"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""

