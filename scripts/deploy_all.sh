#!/usr/bin/env bash
# ============================================================
# TENMON-ARK 統一デプロイスクリプト v1.1
# TENMON_ARK_EMERGENCY_FIX_CARD_V1
#
# 用途: git pull → API build → Web build → live publish → verify
# 使い方: sudo bash /opt/tenmon-ark-repo/scripts/deploy_all.sh
#
# v1.1 変更点:
#   - npm install (devDependencies含む) — tsc と @types/* が必要
#   - systemd WorkingDirectory 自動検出 → API_LIVE を正しく設定
#   - API build 失敗時にも Web build を続行するオプション
#   - curlテスト例のキー名を detail に修正
# ============================================================
set -euo pipefail

# ── 設定 ──────────────────────────────────────────────────────
REPO="/opt/tenmon-ark-repo"
BRANCH="${DEPLOY_BRANCH:-2026-03-04-e5hp}"

# API
API_SRC="$REPO/api"

# systemd から WorkingDirectory を自動検出
detect_api_live() {
  local wd
  wd=$(systemctl cat tenmon-ark-api.service 2>/dev/null \
       | grep -m1 "WorkingDirectory=" \
       | sed 's/.*WorkingDirectory=//' | xargs)
  if [ -n "$wd" ]; then
    # WorkingDirectory が /opt/tenmon-ark-repo/api の場合はそのまま使う
    echo "$wd"
  else
    echo "/opt/tenmon-ark-live"
  fi
}
API_LIVE="${API_LIVE_DIR:-$(detect_api_live)}"

# API_LIVE が REPO/api と同じならインプレースビルド（rsync不要）
INPLACE_API=false
if [ "$(realpath "$API_LIVE" 2>/dev/null)" = "$(realpath "$API_SRC" 2>/dev/null)" ]; then
  INPLACE_API=true
fi

# Web (PWA)
WEB_SRC="$REPO/web"
detect_web_live() {
  # 本番 PWA root（infra/nginx/tenmon-ark.com.conf と一致）
  for d in "/var/www/tenmon-pwa/pwa" "/var/www/tenmon-ark.com/current/dist" "/opt/tenmon-ark-live/web" "/var/www/html"; do
    if [ -d "$d" ]; then echo "$d"; return; fi
  done
  echo "/var/www/tenmon-pwa/pwa"
}
WEB_LIVE="${WEB_LIVE_DIR:-$(detect_web_live)}"

# systemd
SERVICE_NAME="tenmon-ark-api"

echo "============================================================"
echo " TENMON-ARK 統一デプロイ v1.1"
echo " REPO:       $REPO"
echo " BRANCH:     $BRANCH"
echo " API_LIVE:   $API_LIVE"
echo " INPLACE:    $INPLACE_API"
echo " WEB_LIVE:   $WEB_LIVE"
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
# devDependencies 含めてインストール（tsc, @types/* が必要）
npm install
API_BUILD_OK=true
if npm run build; then
  echo "  ✅ API build OK"
else
  echo "  ❌ API build FAILED"
  API_BUILD_OK=false
  echo "  ⚠️  Web build は続行します"
fi

# ── 3. API deploy (atomic swap) ──────────────────────────────
echo ""
echo "[3/7] API deploy → $API_LIVE"

if [ "$INPLACE_API" = true ]; then
  echo "  (inplace mode: API_LIVE = API_SRC, rsync skip)"
else
  if [ "$API_BUILD_OK" = true ]; then
    mkdir -p "$API_LIVE"
    rm -rf "$API_LIVE/dist.new"
    rsync -a --delete "$API_SRC/dist/" "$API_LIVE/dist.new/"
    if [ -d "$API_LIVE/dist" ]; then
      rm -rf "$API_LIVE/dist.bak"
      mv "$API_LIVE/dist" "$API_LIVE/dist.bak"
    fi
    mv "$API_LIVE/dist.new" "$API_LIVE/dist"

    if [ -d "$API_SRC/node_modules" ]; then
      rsync -a --delete "$API_SRC/node_modules/" "$API_LIVE/node_modules/"
    fi
    cp "$API_SRC/package.json" "$API_LIVE/package.json" 2>/dev/null || true
  else
    echo "  (skipped: API build failed)"
  fi
fi

# ── 4. API restart ───────────────────────────────────────────
echo ""
echo "[4/7] API restart ($SERVICE_NAME)"
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "  ✅ $SERVICE_NAME is running"
else
  echo "  ❌ $SERVICE_NAME failed to start"
  journalctl -u "$SERVICE_NAME" -n 20 --no-pager
  # API失敗でもWeb buildは続行
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

MC_LANDING_SRC="${MC_LANDING_SRC:-$REPO/static/mc-landing}"
MC_LANDING_LIVE="${MC_LANDING_LIVE:-/var/www/mc-landing}"
if [ -d "$MC_LANDING_SRC" ]; then
  echo "  mc landing → $MC_LANDING_LIVE"
  mkdir -p "$MC_LANDING_LIVE"
  rsync -av "$MC_LANDING_SRC/" "$MC_LANDING_LIVE/"
  chown -R www-data:www-data "$MC_LANDING_LIVE" 2>/dev/null || true
fi

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
if [ "$API_BUILD_OK" = true ]; then
  echo " ✅ デプロイ完了: $GIT_SHA @ $(date)"
else
  echo " ⚠️  デプロイ完了（API buildエラーあり）: $GIT_SHA @ $(date)"
fi
echo "============================================================"
echo ""
echo "次のステップ:"
echo "  1. ブラウザで https://tenmon-ark.com/pwa/login-local を開く"
echo "  2. Mission Control: https://tenmon-ark.com/mc/ と https://tenmon-ark.com/mc/vnext/ と /mc/sources"
echo "     （内部互換 path https://tenmon-ark.com/pwa/mc/vnext/ は残るが、正式入口は /mc/*）"
echo "  3. 「パスワードを忘れた方」リンクが見えることを確認"
echo "  4. 左メニューにチャットフォルダーが見えることを確認"
echo "  5. feedback送信テスト:"
echo "     curl -s -X POST http://localhost:3000/api/feedback \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"category\":\"宿曜鑑定\",\"priority\":\"中\",\"title\":\"deploy test\",\"detail\":\"テスト送信\",\"device\":\"curl\"}'"
echo ""
