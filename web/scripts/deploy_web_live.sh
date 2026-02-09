#!/usr/bin/env bash
set -euo pipefail

WEB_ROOT="/opt/tenmon-ark-repo/web"
OUT_DIR="/var/www/html"

cd "$WEB_ROOT"

echo "[web-deploy] node=$(node -v) npm=$(npm -v)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
TS="$(date -Is)"
echo "[web-deploy] git=$SHA"

# deps + build (必ずここで作る。distが無ければ失敗で止める)
if [ -f package-lock.json ]; then
  echo "[web-deploy] npm ci"
  npm ci
else
  echo "[web-deploy] npm install"
  npm install
fi

echo "[web-deploy] smoke
bash scripts/smoke_web.sh

[web-deploy] build"
npx vite -v
npm run build

test -f dist/index.html || { echo "[web-deploy] ERROR: dist/index.html missing"; exit 1; }

echo "[web-deploy] publish to $OUT_DIR"
rm -rf "$OUT_DIR"/*
cp -r dist/* "$OUT_DIR"/

# build mark
echo "WEB_BUILD_MARK: ${SHA} ${TS}" > "$OUT_DIR/build.txt"

echo "[web-deploy] nginx reload"
systemctl reload nginx
