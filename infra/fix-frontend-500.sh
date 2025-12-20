#!/usr/bin/env bash
set -euo pipefail

echo "=== TENMON-ARK FRONTEND 500 FIX START ==="

# 0) sanity
if [ "$(id -u)" -ne 0 ]; then
  echo "[ERROR] root で実行してください（nginx reload / chown が必要）"
  exit 1
fi

DOMAIN="tenmon-ark.com"
NGINX_SITE="/etc/nginx/sites-enabled/tenmon-ark.com"

if [ ! -f "$NGINX_SITE" ]; then
  echo "[ERROR] sites-enabled が見つかりません: $NGINX_SITE"
  echo "       まず /etc/nginx/sites-enabled/tenmon-ark.com を作成してください"
  exit 1
fi

# 1) nginx root 抽出
NGINX_ROOT="$(grep -E '^\s*root\s+' "$NGINX_SITE" | head -n 1 | sed -E 's/^\s*root\s+([^;]+);.*/\1/')"
if [ -z "${NGINX_ROOT:-}" ]; then
  echo "[ERROR] nginx root を抽出できませんでした（$NGINX_SITE）"
  exit 1
fi
echo "[INFO] nginx root = $NGINX_ROOT"

# 2) 重複設定の検出（server_name tenmon-ark.com が複数あると事故る）
echo "[INFO] checking duplicated sites-enabled configs for server_name $DOMAIN ..."
mapfile -t DUPES < <(grep -R --line-number --no-messages -E "server_name\\s+.*\\b(${DOMAIN}|www\\.${DOMAIN})\\b" /etc/nginx/sites-enabled 2>/dev/null || true)
if [ "${#DUPES[@]}" -gt 1 ]; then
  echo "[WARN] server_name が複数定義されています（500の原因になり得ます）:"
  printf '  %s\n' "${DUPES[@]}"
  echo "[WARN] 原則: /etc/nginx/sites-enabled/tenmon-ark.com のみに統一してください"
fi

# 3) dist/index.html の存在確認
mkdir -p "$NGINX_ROOT"
if [ -f "$NGINX_ROOT/index.html" ]; then
  echo "[OK] index.html exists: $NGINX_ROOT/index.html"
else
  echo "[WARN] index.html missing: $NGINX_ROOT/index.html"
fi

# 4) Vite build を生成（候補ディレクトリを自動探索）
guess_web_dir() {
  local c
  for c in \
    "/opt/tenmon-ark/web" \
    "/opt/tenmon-ark/current/web" \
    "/var/www/${DOMAIN}/current/web" \
    "/opt/tenmon-ark/os-tenmon-ai-v2-reset/web"
  do
    if [ -f "$c/package.json" ] && [ -f "$c/vite.config.ts" ]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

WEB_DIR="$(guess_web_dir || true)"
if [ -z "${WEB_DIR:-}" ]; then
  echo "[ERROR] web ディレクトリを自動検出できませんでした。"
  echo "       /opt/tenmon-ark/web が存在する構成を推奨します。"
  exit 1
fi
echo "[INFO] web dir = $WEB_DIR"

echo "[INFO] building frontend..."
cd "$WEB_DIR"

# npm ci が失敗する環境もあるので fallback
if [ -f package-lock.json ]; then
  sudo -u www-data npm ci --silent
else
  sudo -u www-data npm install --silent
fi
sudo -u www-data npm run build --silent

if [ ! -f "$WEB_DIR/dist/index.html" ]; then
  echo "[ERROR] build succeeded but dist/index.html is missing: $WEB_DIR/dist/index.html"
  exit 1
fi
echo "[OK] build output exists: $WEB_DIR/dist/index.html"

# 5) nginx root へ配置
echo "[INFO] deploying dist -> nginx root..."
rsync -a --delete "$WEB_DIR/dist/" "$NGINX_ROOT/"

# 6) permission（www-data が読めること）
echo "[INFO] fixing permissions..."
chown -R www-data:www-data "$NGINX_ROOT"
find "$NGINX_ROOT" -type d -exec chmod 755 {} \;
find "$NGINX_ROOT" -type f -exec chmod 644 {} \;

sudo -u www-data test -r "$NGINX_ROOT/index.html" || {
  echo "[ERROR] www-data cannot read index.html (permission issue)"
  ls -la "$NGINX_ROOT/index.html" || true
  exit 1
}

# 7) nginx 構文チェック → reload
echo "[INFO] nginx -t ..."
nginx -t
echo "[INFO] reloading nginx ..."
systemctl reload nginx

# 8) 検証（必須）
echo "[INFO] verify: curl http://127.0.0.1/ ..."
curl -fsS -o /dev/null -D - http://127.0.0.1/ | head -n 20 || true
echo

echo "[INFO] verify: curl https://$DOMAIN/ ..."
curl -fsS -o /dev/null -D - "https://${DOMAIN}/" | head -n 20 || true
echo

echo "[INFO] If still failing, check nginx error log:"
echo "  tail -n 200 /var/log/nginx/error.log"

echo "=== TENMON-ARK FRONTEND 500 FIX COMPLETE ==="


