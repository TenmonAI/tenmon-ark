#!/bin/bash
# TENMON-ARK nginx設定自動修正スクリプト
# 問題: /api/* が HTML を返す → Node にプロキシされていない

set -e

echo "=========================================="
echo "TENMON-ARK nginx設定自動修正スクリプト"
echo "=========================================="
echo ""

# 設定ファイルのパス
NGINX_CONFIG="/etc/nginx/sites-available/tenmon-ark.com"
BACKUP_DIR="/etc/nginx/sites-available/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# バックアップディレクトリを作成
sudo mkdir -p "$BACKUP_DIR"

echo "[1/8] nginx設定をバックアップ..."
sudo cp "$NGINX_CONFIG" "$BACKUP_DIR/tenmon-ark.com.backup.$TIMESTAMP"
echo "  ✓ バックアップ完了: $BACKUP_DIR/tenmon-ark.com.backup.$TIMESTAMP"

echo ""
echo "[2/8] 現在の設定を確認..."
if grep -q "location /api/" "$NGINX_CONFIG"; then
    echo "  ✓ location /api/ は存在します"
    API_LOCATION_EXISTS=true
else
    echo "  ✗ location /api/ が存在しません"
    API_LOCATION_EXISTS=false
fi

# location / と location /api/ の順序を確認
LOCATION_API_LINE=$(grep -n "location /api/" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "")
LOCATION_ROOT_LINE=$(grep -n "location / {" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "")

if [ -n "$LOCATION_API_LINE" ] && [ -n "$LOCATION_ROOT_LINE" ]; then
    if [ "$LOCATION_API_LINE" -lt "$LOCATION_ROOT_LINE" ]; then
        echo "  ✓ location /api/ は location / より前に定義されています"
        ORDER_CORRECT=true
    else
        echo "  ✗ location /api/ が location / より後に定義されています（修正が必要）"
        ORDER_CORRECT=false
    fi
else
    ORDER_CORRECT=false
fi

echo ""
echo "[3/8] 修正が必要か確認..."
if [ "$API_LOCATION_EXISTS" = true ] && [ "$ORDER_CORRECT" = true ]; then
    echo "  ✓ 設定は正しいようです"
    echo "  → proxy_pass の設定を確認します..."
    
    if grep -q "proxy_pass http://127.0.0.1:3000" "$NGINX_CONFIG"; then
        echo "  ✓ proxy_pass は正しく設定されています"
        echo ""
        echo "  設定は正しいようです。念のため nginx をリロードします..."
        sudo nginx -t
        sudo systemctl reload nginx
        echo "  ✓ nginx をリロードしました"
        
        echo ""
        echo "[4/8] 動作確認..."
        if curl -s http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
            echo "  ✓ APIが正常に動作しています"
            echo ""
            echo "=========================================="
            echo "修正完了！"
            echo "=========================================="
            exit 0
        else
            echo "  ✗ APIが正常に動作していません"
            echo "  → 詳細な診断が必要です"
        fi
    else
        echo "  ✗ proxy_pass が正しく設定されていません"
        NEEDS_FIX=true
    fi
else
    echo "  ✗ 修正が必要です"
    NEEDS_FIX=true
fi

if [ "$NEEDS_FIX" = true ]; then
    echo ""
    echo "[4/8] 正しい設定を生成..."
    
    # 一時ファイルに正しい設定を書き込む
    TEMP_CONFIG=$(mktemp)
    
    cat > "$TEMP_CONFIG" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name tenmon-ark.com www.tenmon-ark.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tenmon-ark.com www.tenmon-ark.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/tenmon-ark.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tenmon-ark.com/privkey.pem;

    # 静的ファイル（フロントエンド）
    root /var/www/html;
    index index.html;

    # ★重要: location /api/ は location / より前に定義する
    # APIプロキシ（Express）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket（Socket.IO）
    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静的ファイル（SPA）- location / は最後に定義
    location / {
        try_files $uri $uri/ /index.html;
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF
    
    echo "  ✓ 正しい設定を生成しました"
    
    echo ""
    echo "[5/8] 現在の設定と比較..."
    echo "  現在の設定ファイル: $NGINX_CONFIG"
    echo "  新しい設定ファイル: $TEMP_CONFIG"
    echo ""
    echo "  以下のコマンドで確認できます:"
    echo "    diff $NGINX_CONFIG $TEMP_CONFIG"
    echo ""
    read -p "  新しい設定を適用しますか？ (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "[6/8] 新しい設定を適用..."
        sudo cp "$TEMP_CONFIG" "$NGINX_CONFIG"
        echo "  ✓ 設定を適用しました"
        
        echo ""
        echo "[7/8] nginx設定をテスト..."
        if sudo nginx -t; then
            echo "  ✓ nginx設定の構文チェック成功"
        else
            echo "  ✗ nginx設定の構文エラー"
            echo "  → バックアップから復元します..."
            sudo cp "$BACKUP_DIR/tenmon-ark.com.backup.$TIMESTAMP" "$NGINX_CONFIG"
            exit 1
        fi
        
        echo ""
        echo "[8/8] nginxをリロード..."
        sudo systemctl reload nginx
        echo "  ✓ nginx をリロードしました"
        
        echo ""
        echo "=========================================="
        echo "動作確認"
        echo "=========================================="
        echo ""
        echo "ヘルスチェックを実行します..."
        sleep 2
        
        RESPONSE=$(curl -s http://127.0.0.1:3000/api/health || echo "")
        if echo "$RESPONSE" | grep -q '"status":"ok"'; then
            echo "  ✓ APIが正常に動作しています"
            echo ""
            echo "  レスポンス:"
            echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
            echo ""
            echo "=========================================="
            echo "修正完了！"
            echo "=========================================="
        else
            echo "  ✗ APIが正常に動作していません"
            echo ""
            echo "  レスポンス:"
            echo "$RESPONSE"
            echo ""
            echo "  トラブルシューティング:"
            echo "    1. Node サーバーのステータス確認: sudo systemctl status tenmon-ark-api"
            echo "    2. Node サーバーのログ確認: sudo journalctl -u tenmon-ark-api -n 50"
            echo "    3. ポート3000でリスニングしているか確認: sudo lsof -i :3000"
            exit 1
        fi
    else
        echo ""
        echo "  設定の適用をキャンセルしました"
        echo "  一時ファイル: $TEMP_CONFIG"
        exit 0
    fi
    
    # 一時ファイルを削除
    rm -f "$TEMP_CONFIG"
fi



