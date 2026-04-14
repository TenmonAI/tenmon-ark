#!/usr/bin/env bash
# ============================================================
# TENMON-ARK 統一デプロイスクリプト v1.0
# TENMON_ARK_REFLECTION_BREAK_ROOTCAUSE_FIX_V1
#
# 用途: git pull → API build → Web build → live publish → verify
# 使い方: sudo bash /opt/tenmon-ark-repo/scripts/deploy_all.sh
# ============================================================
set -euo pipefail

# ── 設定 ──────────────────────────────────────────────────────
REPO="/opt/tenmon-ark-repo"
BRANCH="${DEPLOY_BRANCH:-2026-03-04-e5hp}"

# API
API_SRC="$REPO/api"
API_LIVE="/opt/tenmon-ark-live"

# Web (PWA)
WEB_SRC="$REPO/web"
# VPS上の実際のnginx rootを自動検出
# 優先順: /var/www/tenmon-pwa/pwa > /opt/tenmon-ark-live/web > /var/www/html
detect_web_live() {
  for d in "/var/www/tenmon-pwa/pwa" "/opt/tenmon-ark-live/web" "/var/www/html"; do
    if [ -d "$d" ]; then echo "$d"; return; fi
  done
  echo "/var/www/tenmon-pwa/pwa"  # デフォルト
}
WEB_LIVE="${WEB_LIVE_DIR:-$(detect_web_live)}"

# systemd
SERVICE_NAME="tenmon-ark-api"

echo "============================================================"
echo " TENMON-ARK 統一デプロイ"
echo " REPO:     $REPO"
echo " BRANCH:   $BRANCH"
echo " API_LIVE: $API_LIVE"
echo " WEB_LIVE: $WEB_LIVE"
echo "============================================================"

# ── 0. 事前チェック ──────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  echo "[WARN] root権限なし。sudo で再実行してください。"
  echo "       sudo bash $0"
  exit 1
fi

# ── 1. git pull ──────────────────────────────────────────────
echo ""
echo "[1/7] git pull (branch: $BRANCH)"
cd "$REPO"
git fetch origin
git checkout "$BRANCH" 2>/dev/null || true
git reset --hard "origin/$BRANCH"
GIT_SHA="$(git rev-parse --short HEAD)"
echo "  HEAD: $GIT_SHA"

# ── 2. API build ─────────────────────────────────────────────
echo ""
echo "[2/7] API build"
cd "$API_SRC"
npm install --omit=dev 2>/dev/null || npm install
npm run build

# ── 3. API deploy (atomic swap) ──────────────────────────────
echo ""
echo "[3/7] API deploy → $API_LIVE"
mkdir -p "$API_LIVE"

# dist の原子入替
rm -rf "$API_LIVE/dist.new"
rsync -a --delete "$API_SRC/dist/" "$API_LIVE/dist.new/"
if [ -d "$API_LIVE/dist" ]; then
  rm -rf "$API_LIVE/dist.bak"
  mv "$API_LIVE/dist" "$API_LIVE/dist.bak"
fi
mv "$API_LIVE/dist.new" "$API_LIVE/dist"

# node_modules も同期（必要な場合）
if [ -d "$API_SRC/node_modules" ]; then
  rsync -a --delete "$API_SRC/node_modules/" "$API_LIVE/node_modules/"
fi

# package.json コピー
cp "$API_SRC/package.json" "$API_LIVE/package.json" 2>/dev/null || true

# ── 4. API restart ───────────────────────────────────────────
echo ""
echo "[4/7] API restart ($SERVICE_NAME)"
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
sleep 1

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "  ✅ $SERVICE_NAME is running"
else
  echo "  ❌ $SERVICE_NAME failed to start"
  journalctl -u "$SERVICE_NAME" -n 20 --no-pager
  exit 1
fi

# ── 5. Web build ─────────────────────────────────────────────
echo ""
echo "[5/7] Web build"
cd "$WEB_SRC"
npm install 2>/dev/null || true
npm run build

if [ ! -f "$WEB_SRC/dist/index.html" ]; then
  echo "  ❌ web/dist/index.html not found (build failed)"
  exit 1
fi
echo "  ✅ web build OK"

# ── 6. Web publish (rsync → live) ────────────────────────────
echo ""
echo "[6/7] Web publish → $WEB_LIVE"
mkdir -p "$WEB_LIVE"
rsync -av --delete "$WEB_SRC/dist/" "$WEB_LIVE/"
chown -R www-data:www-data "$WEB_LIVE" 2>/dev/null || true

# build stamp
echo "WEB_BUILD_MARK:${GIT_SHA} $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$WEB_LIVE/build.txt"

# nginx reload
echo "  nginx -t && reload"
nginx -t
systemctl reload nginx
echo "  ✅ Web published & nginx reloaded"

# ── 7. 検証 ──────────────────────────────────────────────────
echo ""
echo "[7/7] 検証"
echo ""

# API health
echo "--- API health ---"
if curl -fsS -m 3 http://127.0.0.1:3000/api/health 2>/dev/null | grep -q '"status"'; then
  echo "  ✅ API health OK"
else
  echo "  ⚠️  API health check failed (may still be starting)"
fi

# Live asset 確認
echo ""
echo "--- Live asset comparison ---"
echo "  [repo dist]"
grep -o 'assets/[^"]*' "$WEB_SRC/dist/index.html" 2>/dev/null | head -5
echo "  [live]"
grep -o 'assets/[^"]*' "$WEB_LIVE/index.html" 2>/dev/null | head -5

DIST_HASH=$(md5sum "$WEB_SRC/dist/index.html" 2>/dev/null | awk '{print $1}')
LIVE_HASH=$(md5sum "$WEB_LIVE/index.html" 2>/dev/null | awk '{print $1}')
if [ "$DIST_HASH" = "$LIVE_HASH" ]; then
  echo "  ✅ index.html match (md5: $DIST_HASH)"
else
  echo "  ❌ index.html MISMATCH (dist: $DIST_HASH, live: $LIVE_HASH)"
fi

# build.txt
echo ""
echo "--- build.txt ---"
cat "$WEB_LIVE/build.txt" 2>/dev/null || echo "  (not found)"

# env check
echo ""
echo "--- Environment check ---"
echo "  systemd EnvironmentFile:"
grep -i "EnvironmentFile" /etc/systemd/system/"$SERVICE_NAME".service 2>/dev/null || echo "  (not in unit file)"
grep -ri "EnvironmentFile" /etc/systemd/system/"$SERVICE_NAME".service.d/ 2>/dev/null || echo "  (no drop-in)"
echo "  NOTION_TOKEN set:"
systemctl show "$SERVICE_NAME" --property=Environment 2>/dev/null | grep -o "NOTION_TOKEN=[^ ]*" | sed 's/=.*/=***/' || echo "  (not found)"

echo ""
echo "============================================================"
echo " ✅ デプロイ完了: $GIT_SHA @ $(date)"
echo "============================================================"
echo ""
echo "次のステップ:"
echo "  1. ブラウザで https://tenmon-ark.com/pwa/login-local を開く"
echo "  2. 「パスワードを忘れた方」リンクが見えることを確認"
echo "  3. 左メニューにチャットフォルダーが見えることを確認"
echo "  4. feedback送信テスト:"
echo "     curl -s -X POST http://localhost:3000/api/feedback \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"category\":\"test\",\"priority\":\"medium\",\"title\":\"deploy test\",\"body\":\"test\",\"device\":\"curl\"}'"
echo ""
