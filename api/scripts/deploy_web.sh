#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo"
LIVE="/opt/tenmon-ark-live"
WEB_DIST="$REPO/web/dist"

test -d "$WEB_DIST" || { echo "[ERR] missing $WEB_DIST (run: pnpm -C web build)"; exit 1; }

echo "[deploy-web] sync web/dist -> live/web"
sudo mkdir -p "$LIVE/web"
sudo rsync -a --delete "$WEB_DIST"/ "$LIVE/web"/
sudo systemctl reload nginx 2>/dev/null || true
echo "[deploy-web] done"
