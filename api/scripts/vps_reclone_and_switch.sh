#!/usr/bin/env bash
set -euo pipefail

# VPS側で実行するスクリプト：正本リポジトリを新規クローンして切り替え
# 既存の /opt/tenmon-ark/api は触らない。新規正本に切替で事故を減らす。

REPO_URL="https://github.com/TenmonAI/tenmon-ark.git"
TARGET="/opt/tenmon-ark-repo"
LIVE="/opt/tenmon-ark-live"
SERVICE_NAME="tenmon-ark-api.service"
OVERRIDE_DIR="/etc/systemd/system/${SERVICE_NAME}.d"

echo "=========================================="
echo "VPS 正本リポジトリ再クローン・切り替え"
echo "=========================================="

echo "[1] 既存TARGETがあれば日時付きで退避"
if [ -d "$TARGET" ]; then
  BACKUP="${TARGET}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "既存の $TARGET を $BACKUP に退避"
  mv "$TARGET" "$BACKUP"
fi

echo ""
echo "[2] git clone --depth=1"
git clone --depth=1 "$REPO_URL" "$TARGET"

echo ""
echo "[3] HEADの確認"
cd "$TARGET"
git log -1 --oneline
HEAD_HASH=$(git rev-parse HEAD)
echo "HEAD: $HEAD_HASH"

echo ""
echo "[4] 依存関係のインストール（monorepoなら api に移動）"
if [ -d "$TARGET/api" ]; then
  cd "$TARGET/api"
  echo "monorepo を検出。api/ に移動"
else
  cd "$TARGET"
  echo "単一リポジトリとして処理"
fi

if [ -f "pnpm-lock.yaml" ] || [ -f "package.json" ]; then
  echo "pnpm install を実行"
  pnpm i --frozen-lockfile 2>/dev/null || pnpm i
else
  echo "[WARN] package.json が見つかりません"
fi

echo ""
echo "[5] ビルド"
pnpm -s build

echo ""
echo "[6] LIVEをTARGET/apiへ張る（シンボリックリンク）"
if [ -d "$TARGET/api" ]; then
  TARGET_API="$TARGET/api"
else
  TARGET_API="$TARGET"
fi

if [ -L "$LIVE" ] || [ -e "$LIVE" ]; then
  echo "既存の $LIVE を削除"
  rm -rf "$LIVE"
fi

echo "$LIVE -> $TARGET_API のシンボリックリンクを作成"
ln -sfn "$TARGET_API" "$LIVE"

echo "確認:"
ls -la "$LIVE" | head -n 1

echo ""
echo "[7] systemd override を作成"
mkdir -p "$OVERRIDE_DIR"

# 既存の ExecStart を確認
CURRENT_EXEC=$(systemctl show "$SERVICE_NAME" -p ExecStart --value 2>/dev/null || echo "")
echo "現在の ExecStart: $CURRENT_EXEC"

# override.conf を作成
OVERRIDE_CONF="$OVERRIDE_DIR/override.conf"
cat > "$OVERRIDE_CONF" <<EOF
[Service]
WorkingDirectory=$LIVE
EOF

# ExecStart が相対パスの場合はフルパスに変換
if echo "$CURRENT_EXEC" | grep -q "^node\|^pnpm\|^npm"; then
  # 相対パスの場合、LIVE からの相対パスに変換
  if echo "$CURRENT_EXEC" | grep -q "^node"; then
    NODE_PATH=$(which node)
    EXEC_START="$NODE_PATH ${CURRENT_EXEC#node }"
  elif echo "$CURRENT_EXEC" | grep -q "^pnpm"; then
    PNPM_PATH=$(which pnpm)
    EXEC_START="$PNPM_PATH ${CURRENT_EXEC#pnpm }"
  else
    EXEC_START="$CURRENT_EXEC"
  fi
  
  # WorkingDirectory が設定されているので、相対パスはそのまま使える
  # ただし、明示的にフルパスにする方が安全
  if [ -f "$LIVE/dist/index.js" ]; then
    EXEC_START="node $LIVE/dist/index.js"
  elif [ -f "$LIVE/index.js" ]; then
    EXEC_START="node $LIVE/index.js"
  fi
  
  echo "ExecStart=$EXEC_START" >> "$OVERRIDE_CONF"
fi

echo "override.conf を作成:"
cat "$OVERRIDE_CONF"

echo ""
echo "[8] systemctl daemon-reload && restart"
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
sleep 1

echo "サービス状態:"
systemctl status "$SERVICE_NAME" --no-pager -l | head -n 10

echo ""
echo "[9] 受入テスト"
cd "$LIVE"
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
echo "[10] Phase28 手動確認"
BASE_URL="http://127.0.0.1:3000"
RESPONSE=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"p28","message":"言霊とは何？ #詳細"}')
echo "$RESPONSE" | jq '{cand0:(.candidates[0]//null)}'
CAND0_PAGE=$(echo "$RESPONSE" | jq -r '.candidates[0].pdfPage // 0')
echo "cand0.pdfPage = $CAND0_PAGE"

if [ "$CAND0_PAGE" = "1" ]; then
  echo "[WARN] cand0.pdfPage が 1 です（表紙が上位に来ています）"
else
  echo "[OK] cand0.pdfPage = $CAND0_PAGE (P1 ではありません)"
fi

echo ""
echo "=========================================="
echo "完了"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ] && [ "$CAND0_PAGE" != "1" ]; then
  echo "[SUCCESS] Phase28 を封印完了"
  echo "EXIT=$EXIT_CODE, cand0.pdfPage=$CAND0_PAGE"
  echo ""
  echo "正本リポジトリ: $TARGET"
  echo "稼働ディレクトリ: $LIVE -> $TARGET_API"
  exit 0
else
  echo "[FAIL] Phase28 がまだ PASS していません"
  echo "EXIT_CODE=$EXIT_CODE, CAND0_PAGE=$CAND0_PAGE"
  exit 1
fi
