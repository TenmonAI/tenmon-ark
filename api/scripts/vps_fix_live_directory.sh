#!/usr/bin/env bash
set -euo pipefail

# VPS側で実行するスクリプト：実行実体を /opt/tenmon-ark-live に統一

# 1) VPSで常に cd /opt/tenmon-ark-live && set +H && pwd を最初に実行
cd /opt/tenmon-ark-live && set +H && pwd

LIVE_DIR="/opt/tenmon-ark-live"
SERVICE_NAME="tenmon-ark-api.service"
OVERRIDE_DIR="/etc/systemd/system/${SERVICE_NAME}.d"
OVERRIDE_CONF="$OVERRIDE_DIR/override.conf"

echo "=========================================="
echo "VPS 実行実体を /opt/tenmon-ark-live に統一"
echo "=========================================="

echo "[1] 現在のディレクトリ確認"
pwd
if [ "$(pwd)" != "$LIVE_DIR" ]; then
  echo "[ERROR] 現在のディレクトリが $LIVE_DIR ではありません"
  exit 1
fi

echo ""
echo "[2] dist の entry を確認"
if [ ! -d "$LIVE_DIR/dist" ]; then
  echo "[ERROR] $LIVE_DIR/dist が存在しません"
  exit 1
fi

echo "dist 直下のファイル:"
ls -la "$LIVE_DIR/dist" | head -n 20

echo ""
echo "[3] listen(3000) を探して entry を確定"
ENTRY_FILE=""
if [ -f "$LIVE_DIR/dist/index.js" ]; then
  if rg -q "listen\(3000\)" "$LIVE_DIR/dist/index.js" 2>/dev/null || grep -q "listen(3000)" "$LIVE_DIR/dist/index.js" 2>/dev/null; then
    ENTRY_FILE="$LIVE_DIR/dist/index.js"
    echo "[OK] dist/index.js に listen(3000) が見つかりました"
  fi
fi

if [ -z "$ENTRY_FILE" ]; then
  # dist 直下の .js ファイルを探す
  for js_file in "$LIVE_DIR/dist"/*.js; do
    if [ -f "$js_file" ]; then
      if rg -q "listen\(3000\)" "$js_file" 2>/dev/null || grep -q "listen(3000)" "$js_file" 2>/dev/null; then
        ENTRY_FILE="$js_file"
        echo "[OK] $js_file に listen(3000) が見つかりました"
        break
      fi
    fi
  done
fi

if [ -z "$ENTRY_FILE" ]; then
  echo "[WARN] listen(3000) が見つかりません。dist/index.js をデフォルトとして使用"
  ENTRY_FILE="$LIVE_DIR/dist/index.js"
fi

echo "ENTRY_FILE: $ENTRY_FILE"

# node のパスを確認
NODE_PATH=$(which node || echo "/usr/bin/node")
echo "NODE_PATH: $NODE_PATH"

echo ""
echo "[4] systemd override.conf を作成"
mkdir -p "$OVERRIDE_DIR"

# ExecStart= でリセットしてから上書き
cat > "$OVERRIDE_CONF" <<EOF
[Service]
# ExecStart をリセット
ExecStart=
# 新しい ExecStart を設定
ExecStart=$NODE_PATH $ENTRY_FILE
# WorkingDirectory を設定
WorkingDirectory=$LIVE_DIR
EOF

echo "override.conf の内容:"
cat "$OVERRIDE_CONF"

echo ""
echo "[5] systemctl daemon-reload"
systemctl daemon-reload

echo ""
echo "[6] 現在の設定を確認"
echo "WorkingDirectory:"
systemctl show "$SERVICE_NAME" -p WorkingDirectory --value
echo "ExecStart:"
systemctl show "$SERVICE_NAME" -p ExecStart --value

echo ""
echo "[7] ビルド"
cd "$LIVE_DIR"
pnpm -s build

echo ""
echo "[8] systemctl restart"
systemctl restart "$SERVICE_NAME"
sleep 1

echo "サービス状態:"
systemctl status "$SERVICE_NAME" --no-pager -l | head -n 10

echo ""
echo "[9] ポート3000の確認"
echo "sudo ss -lptn 'sport=:3000':"
sudo ss -lptn 'sport=:3000' || echo "ポート3000でリスニングしているプロセスが見つかりません"

# PID を取得
PID=$(sudo ss -lptn 'sport=:3000' | grep -oP 'pid=\K\d+' | head -n 1 || echo "")
if [ -n "$PID" ]; then
  echo "PID: $PID"
  echo "PID の cwd:"
  sudo readlink -f "/proc/$PID/cwd" 2>/dev/null || echo "cwd を取得できません"
  echo "PID の cmdline:"
  sudo cat "/proc/$PID/cmdline" 2>/dev/null | tr '\0' ' ' || echo "cmdline を取得できません"
  echo ""
else
  echo "[WARN] PID を取得できません"
fi

echo ""
echo "[10] 受入テスト"
cd "$LIVE_DIR"
if [ ! -f "scripts/acceptance_test.sh" ]; then
  echo "[ERROR] scripts/acceptance_test.sh が見つかりません"
  echo "現在のディレクトリ: $(pwd)"
  ls -la scripts/ 2>/dev/null || echo "scripts/ ディレクトリが存在しません"
  exit 1
fi

bash scripts/acceptance_test.sh
EXIT_CODE=$?
echo "EXIT=$EXIT_CODE"

echo ""
echo "[11] Phase28 手動確認（candidates[0] が null でないことを確認）"
BASE_URL="http://127.0.0.1:3000"
RESPONSE=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"p28","message":"言霊とは何？ #詳細"}')
echo "$RESPONSE" | jq '{cand0:(.candidates[0]//null)}'
CAND0=$(echo "$RESPONSE" | jq -r '.candidates[0] // "null"')
if [ "$CAND0" = "null" ]; then
  echo "[WARN] candidates[0] が null です"
else
  echo "[OK] candidates[0] が存在します"
  echo "$RESPONSE" | jq '.candidates[0] | {doc, pdfPage, snippet}'
fi

echo ""
echo "=========================================="
echo "完了"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ]; then
  echo "[SUCCESS] Phase28-30 を封印完了"
  echo "EXIT=$EXIT_CODE"
  echo ""
  echo "稼働ディレクトリ: $LIVE_DIR"
  echo "ENTRY_FILE: $ENTRY_FILE"
  exit 0
else
  echo "[FAIL] 受入テストが PASS していません"
  echo "EXIT_CODE=$EXIT_CODE"
  exit 1
fi
