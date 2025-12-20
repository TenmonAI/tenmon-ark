#!/usr/bin/env bash
set -e

echo "=== TENMON-ARK AUTO RECOVERY START ==="

### 0. 前提チェック
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: root で実行してください"
  exit 1
fi

### 1. systemd 定義
cat >/etc/systemd/system/tenmon-ark-api.service <<'EOF'
[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tenmon-ark/api
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node /opt/tenmon-ark/api/dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tenmon-ark-api
systemctl restart tenmon-ark-api

echo "=== systemd status ==="
systemctl --no-pager status tenmon-ark-api

### 2. nginx 設定バックアップ
if [ -f /etc/nginx/sites-available/tenmon-ark.com ]; then
  cp /etc/nginx/sites-available/tenmon-ark.com \
     /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)
fi

### 3. nginx 設定（正規・事故なし）
cat >/etc/nginx/sites-available/tenmon-ark.com <<'EOF'
server {
    listen 80;
    server_name tenmon-ark.com;

    root /var/www/tenmon-ark.com/current/dist;

    location /api/ {
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
    }

    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
EOF

ln -sf /etc/nginx/sites-available/tenmon-ark.com \
       /etc/nginx/sites-enabled/tenmon-ark.com

### 4. nginx 反映
nginx -t
systemctl reload nginx

### 4.5 SPA (Vite) build & deploy (front-only recovery)
echo "=== FRONTEND BUILD/DEPLOY ==="
WEB_DIR="/opt/tenmon-ark/web"
NGINX_ROOT="/var/www/tenmon-ark.com/current/dist"

if [ ! -d "$WEB_DIR" ]; then
  echo "[WARN] web dir not found: $WEB_DIR (skip frontend build)"
else
  mkdir -p "$NGINX_ROOT"
  echo "[INFO] building $WEB_DIR ..."
  cd "$WEB_DIR"
  if [ -f package-lock.json ]; then
    sudo -u www-data npm ci
  else
    sudo -u www-data npm install
  fi
  sudo -u www-data npm run build

  if [ -f "$WEB_DIR/dist/index.html" ]; then
    echo "[INFO] deploying dist -> $NGINX_ROOT"
    rsync -a --delete "$WEB_DIR/dist/" "$NGINX_ROOT/"
    chown -R www-data:www-data "$NGINX_ROOT"
  else
    echo "[ERROR] dist/index.html not found after build (frontend broken)"
    exit 1
  fi
fi

### 5. 検証
echo "=== HEALTH CHECKS ==="
curl -i http://127.0.0.1:3000/api/health
echo
curl -i http://127.0.0.1/api/health
echo
curl -i http://tenmon-ark.com/api/health

echo
echo "=== FRONTEND CHECKS ==="
curl -i http://127.0.0.1/ | head -n 20
echo
curl -i https://tenmon-ark.com/ | head -n 20

echo "=== TENMON-ARK AUTO RECOVERY COMPLETE ==="
