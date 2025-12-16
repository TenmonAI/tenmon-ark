#!/bin/bash
# TENMON-ARK API/SPA 分離構成 - デプロイスクリプト
# 使用方法: sudo ./deploy.sh

set -e

echo "=========================================="
echo "TENMON-ARK API/SPA 分離構成 - デプロイ開始"
echo "=========================================="

# 変数設定
PROJECT_ROOT="/path/to/os-tenmon-ai-v2-reset"  # 実際のパスに変更してください
API_DIR="/opt/tenmon-ark/api"
SPA_DIR="/var/www/tenmon-ark.com/current/dist"
NGINX_CONF="/etc/nginx/sites-available/tenmon-ark.com"
SYSTEMD_SERVICE="/etc/systemd/system/tenmon-ark-api.service"

# 1. ディレクトリ構造の準備
echo "[1/6] ディレクトリ構造を準備中..."
sudo mkdir -p "$API_DIR"
sudo mkdir -p "$SPA_DIR"
sudo chown -R www-data:www-data /opt/tenmon-ark
sudo chown -R www-data:www-data /var/www/tenmon-ark.com

# 2. API サーバーのデプロイ
echo "[2/6] API サーバーをデプロイ中..."
sudo cp -r "$PROJECT_ROOT/api"/* "$API_DIR/"
cd "$API_DIR"
sudo -u www-data npm install
sudo -u www-data npm run build

# .env ファイルが存在しない場合は作成
if [ ! -f "$API_DIR/.env" ]; then
    echo "[WARN] .env ファイルが見つかりません。作成してください:"
    echo "sudo -u www-data nano $API_DIR/.env"
fi

# 3. systemd サービスの設定
echo "[3/6] systemd サービスを設定中..."
sudo cp "$PROJECT_ROOT/infra/systemd/tenmon-ark-api.service" "$SYSTEMD_SERVICE"
sudo systemctl daemon-reload
sudo systemctl enable tenmon-ark-api
sudo systemctl restart tenmon-ark-api

# 4. nginx 設定の更新
echo "[4/6] nginx 設定を更新中..."
sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak-$(date +%F_%H%M%S)" 2>/dev/null || true
sudo cp "$PROJECT_ROOT/infra/nginx/tenmon-ark.com.conf" "$NGINX_CONF"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/tenmon-ark.com

# 5. nginx 構文チェック & reload
echo "[5/6] nginx 構文チェック中..."
if sudo nginx -t; then
    echo "構文チェック成功。nginx を reload します..."
    sudo systemctl reload nginx
else
    echo "[ERROR] nginx 構文チェックに失敗しました。"
    exit 1
fi

# 6. 検証
echo "[6/6] 検証中..."
sleep 2

echo ""
echo "=== 検証結果 ==="

# API が起動しているか確認
if systemctl is-active --quiet tenmon-ark-api; then
    echo "✅ tenmon-ark-api サービスは起動中"
else
    echo "❌ tenmon-ark-api サービスが起動していません"
    sudo systemctl status tenmon-ark-api
    exit 1
fi

# 直接 Node API にアクセス
echo ""
echo "--- 直接 Node API にアクセス ---"
if curl -s http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
    echo "✅ http://127.0.0.1:3000/api/health が JSON を返しています"
else
    echo "❌ http://127.0.0.1:3000/api/health が JSON を返していません"
    curl -i http://127.0.0.1:3000/api/health
    exit 1
fi

# nginx 経由で API にアクセス
echo ""
echo "--- nginx 経由で API にアクセス ---"
if curl -s http://127.0.0.1/api/health | grep -q '"status":"ok"'; then
    echo "✅ http://127.0.0.1/api/health が JSON を返しています（HTML ではありません）"
else
    echo "❌ http://127.0.0.1/api/health が JSON を返していません"
    curl -i http://127.0.0.1/api/health
    exit 1
fi

# HTML が返っていないことを確認
if curl -s http://127.0.0.1/api/health | grep -q "<!doctype html>"; then
    echo "❌ http://127.0.0.1/api/health が HTML を返しています（設定エラー）"
    exit 1
else
    echo "✅ http://127.0.0.1/api/health は HTML を返していません"
fi

echo ""
echo "=========================================="
echo "✅ デプロイ完了！"
echo "=========================================="
echo ""
echo "検証コマンド:"
echo "  curl -i http://127.0.0.1:3000/api/health"
echo "  curl -i http://127.0.0.1/api/health"
echo "  curl -i http://tenmon-ark.com/api/health"
echo ""
echo "ログ確認:"
echo "  sudo journalctl -u tenmon-ark-api -f"
echo ""

