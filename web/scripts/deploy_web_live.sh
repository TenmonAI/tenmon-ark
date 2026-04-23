#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/web"
# nginx root と一致（infra/nginx/tenmon-ark.com.conf の /var/www/tenmon-pwa/pwa）
LIVE="${WEB_LIVE_DIR:-/var/www/tenmon-pwa/pwa}"
MC_LANDING_SRC="${MC_LANDING_SRC:-/opt/tenmon-ark-repo/static/mc-landing}"
MC_LANDING_LIVE="${MC_LANDING_LIVE:-/var/www/mc-landing}"

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
sudo install -d -m 0755 "$LIVE"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/"

# build stamp を残す
GIT_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
ISO8601="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
echo "WEB_BUILD_MARK:${GIT_SHA} ${ISO8601}" | sudo tee "$LIVE/build.txt" >/dev/null

echo "[deploy-web] sync /mc/ static landing → $MC_LANDING_LIVE"
if [ -d "$MC_LANDING_SRC" ]; then
  sudo install -d -m 0755 "$MC_LANDING_LIVE"
  sudo rsync -a "$MC_LANDING_SRC/" "$MC_LANDING_LIVE/"
else
  echo "[deploy-web] WARN: mc landing source missing: $MC_LANDING_SRC"
fi

echo "[deploy-web] reload nginx"
sudo systemctl reload nginx

echo "[deploy-web] SUCCESS"
