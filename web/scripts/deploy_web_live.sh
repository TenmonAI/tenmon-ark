#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/web"
LIVE="/var/www/html"

echo "[deploy-web] build in repo"
cd "$REPO"

# npm ci（失敗したら npm install にフォールバック）
if ! npm ci 2>/dev/null; then
  echo "[deploy-web] npm ci failed, falling back to npm install"
  npm install
fi

echo "[deploy-web] build"
npm run build

echo "[deploy-web] sync dist to live"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/"

# build stamp を残す
GIT_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
ISO8601="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
echo "WEB_BUILD_MARK:${GIT_SHA} ${ISO8601}" | sudo tee "$LIVE/build.txt" >/dev/null

echo "[deploy-web] reload nginx"
sudo systemctl reload nginx

echo "[deploy-web] SUCCESS"
