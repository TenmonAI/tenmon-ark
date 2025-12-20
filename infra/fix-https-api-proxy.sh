#!/usr/bin/env bash
set -e

echo "=== TENMON-ARK HTTPS API Proxy Fix START ==="

### 0. 前提チェック
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: root で実行してください"
  exit 1
fi

### 1. nginx 設定ファイルを特定
NGINX_CONF="/etc/nginx/sites-available/tenmon-ark.com"

if [ ! -f "$NGINX_CONF" ]; then
  echo "ERROR: $NGINX_CONF が見つかりません"
  exit 1
fi

echo "=== 現在の設定を確認 ==="
if grep -q "listen 443" "$NGINX_CONF"; then
  echo "HTTPS (443) 設定が見つかりました"
  grep -A 10 "listen 443" "$NGINX_CONF" | head -15
else
  echo "ERROR: HTTPS (443) 設定が見つかりません"
  exit 1
fi

### 2. バックアップ
BACKUP_FILE="${NGINX_CONF}.bak-$(date +%F_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "=== バックアップ作成: $BACKUP_FILE ==="

### 3. HTTPS (443) server block 内の location /api/ を修正
# 一時ファイルを作成
TMP_FILE=$(mktemp)

# Python スクリプトで nginx 設定を修正
python3 << 'PYTHON_SCRIPT'
import re
import sys

nginx_conf = "/etc/nginx/sites-available/tenmon-ark.com"

# ファイルを読み込む
with open(nginx_conf, 'r') as f:
    content = f.read()

# HTTPS (443) server block を検出
https_block_match = re.search(
    r'(server\s*\{[^}]*listen\s+443[^}]*?server_name[^}]*?\{)(.*?)(\})',
    content,
    re.DOTALL
)

if not https_block_match:
    print("ERROR: HTTPS (443) server block が見つかりません", file=sys.stderr)
    sys.exit(1)

server_start = https_block_match.group(1)
server_content = https_block_match.group(2)
server_end = https_block_match.group(3)

# location /api/ が既に存在するか確認
api_location_pattern = r'location\s+/api/\s*\{[^}]*?\}'
api_location_match = re.search(api_location_pattern, server_content, re.DOTALL)

# 新しい location /api/ 設定
new_api_location = '''    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }'''

if api_location_match:
    # 既存の location /api/ を置き換え
    server_content = re.sub(api_location_pattern, new_api_location, server_content, flags=re.DOTALL)
    print("=== 既存の location /api/ を更新 ===")
else:
    # location /api/ を追加（location / の前に）
    location_root_pattern = r'(location\s+/\s*\{[^}]*try_files[^}]*?\})'
    if re.search(location_root_pattern, server_content, re.DOTALL):
        server_content = re.sub(
            location_root_pattern,
            new_api_location + '\n\n    ' + r'\1',
            server_content,
            flags=re.DOTALL
        )
        print("=== location /api/ を追加（location / の前） ===")
    else:
        # location / が見つからない場合は、server block の最後に追加
        server_content = server_content.rstrip() + '\n\n' + new_api_location
        print("=== location /api/ を追加（server block の最後） ===")

# 全体を再構築
new_content = content[:https_block_match.start()] + server_start + server_content + server_end + content[https_block_match.end():]

# ファイルに書き込む
with open(nginx_conf, 'w') as f:
    f.write(new_content)

print("=== nginx 設定を更新しました ===")
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
  echo "ERROR: nginx 設定の更新に失敗しました"
  echo "バックアップから復元: cp $BACKUP_FILE $NGINX_CONF"
  exit 1
fi

### 4. nginx 構文チェック
echo ""
echo "=== nginx 構文チェック ==="
nginx -t

if [ $? -ne 0 ]; then
  echo "ERROR: nginx 構文エラーが発生しました"
  echo "バックアップから復元: cp $BACKUP_FILE $NGINX_CONF"
  exit 1
fi

### 5. nginx リロード
echo ""
echo "=== nginx をリロード ==="
systemctl reload nginx

if [ $? -ne 0 ]; then
  echo "ERROR: nginx のリロードに失敗しました"
  exit 1
fi

### 6. 検証
echo ""
echo "=== 検証開始 ==="
sleep 2

echo ""
echo "--- 1. Node 直接アクセス (POST /api/chat) ---"
NODE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは、天聞アーク"}')
HTTP_CODE=$(echo "$NODE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$NODE_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Node 直接アクセス: HTTP $HTTP_CODE"
  echo "Response: $BODY"
else
  echo "❌ Node 直接アクセス: HTTP $HTTP_CODE"
  echo "Response: $BODY"
fi

echo ""
echo "--- 2. HTTPS 経由アクセス (POST /api/chat) ---"
HTTPS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは、天聞アーク"}' 2>&1)
HTTPS_HTTP_CODE=$(echo "$HTTPS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
HTTPS_BODY=$(echo "$HTTPS_RESPONSE" | grep -v "HTTP_CODE" | grep -v "^$" | tail -1)

if [ "$HTTPS_HTTP_CODE" = "200" ]; then
  echo "✅ HTTPS 経由アクセス: HTTP $HTTPS_HTTP_CODE"
  echo "Response: $HTTPS_BODY"
elif [ "$HTTPS_HTTP_CODE" = "405" ]; then
  echo "❌ HTTPS 経由アクセス: HTTP $HTTPS_HTTP_CODE (Not Allowed)"
  echo "Response: $HTTPS_BODY"
  echo ""
  echo "ERROR: 405 Not Allowed が発生しています。nginx 設定を再確認してください。"
  exit 1
else
  echo "⚠️ HTTPS 経由アクセス: HTTP $HTTPS_HTTP_CODE"
  echo "Response: $HTTPS_BODY"
fi

echo ""
echo "=== TENMON-ARK HTTPS API Proxy Fix COMPLETE ==="
echo ""
echo "✅ 修復完了"
echo "   バックアップ: $BACKUP_FILE"
echo "   設定ファイル: $NGINX_CONF"
