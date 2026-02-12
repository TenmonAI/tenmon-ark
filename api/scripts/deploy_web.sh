#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo"
LIVE="/opt/tenmon-ark-live"
WEB_DIST="$REPO/web/dist"
LIVE_WEB="$LIVE/web"

# stopしない：汚染は掃除して続行
if [ -d "$REPO/api/web" ]; then
  echo "[WARN] repo polluted: $REPO/api/web exists -> auto remove"
  rm -rf "$REPO/api/web"
fi

test -d "$WEB_DIST" || { echo "[ERR] missing $WEB_DIST (run: pnpm -C web build)"; exit 1; }

echo "[deploy-web] sync $WEB_DIST -> $LIVE_WEB"
sudo mkdir -p "$LIVE_WEB"
sudo rsync -a --delete "$WEB_DIST"/ "$LIVE_WEB"/
sudo systemctl reload nginx 2>/dev/null || true
echo "[deploy-web] done"
