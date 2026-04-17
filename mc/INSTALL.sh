#!/bin/bash
# ============================================================
# TENMON-MC Phase 4 — ワンショットインストーラ
#
# 冪等設計: 何度実行しても安全
# root 権限必須
#
# Usage:
#   cd /path/to/tenmon-ark/mc
#   sudo bash INSTALL.sh
# ============================================================
set -euo pipefail

# ── 色定義 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Step 0: 権限チェック ──
if [ "$(id -u)" -ne 0 ]; then
  log_err "root 権限が必要です。sudo bash INSTALL.sh で実行してください。"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
log_info "TENMON-MC Phase 4 インストーラ"
log_info "ソースディレクトリ: ${SCRIPT_DIR}"
echo ""

# ── Step 1: 必要パッケージの確認とインストール ──
log_info "Step 1: 必要パッケージの確認..."

MISSING_PKGS=()
for cmd in jq sqlite3 bc; do
  if ! command -v "$cmd" &>/dev/null; then
    MISSING_PKGS+=("$cmd")
  fi
done

# htpasswd は apache2-utils に含まれる
if ! command -v htpasswd &>/dev/null; then
  MISSING_PKGS+=("apache2-utils")
fi

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
  log_info "不足パッケージをインストール: ${MISSING_PKGS[*]}"
  apt-get update -qq
  apt-get install -y -qq "${MISSING_PKGS[@]}"
  log_ok "パッケージインストール完了"
else
  log_ok "全パッケージ確認済み (jq, sqlite3, bc, htpasswd)"
fi

# ── Step 2: /opt/tenmon-mc ディレクトリ作成 ──
log_info "Step 2: /opt/tenmon-mc ディレクトリ作成..."

mkdir -p /opt/tenmon-mc/bin
mkdir -p /opt/tenmon-mc/config
log_ok "/opt/tenmon-mc 作成済み"

# ── Step 3: bin/*.sh をコピー + 実行権限 ──
log_info "Step 3: 収集スクリプトを配置..."

cp -f "${SCRIPT_DIR}/bin/"*.sh /opt/tenmon-mc/bin/
chmod +x /opt/tenmon-mc/bin/*.sh
chown -R root:root /opt/tenmon-mc/bin/
log_ok "bin/*.sh 配置完了 ($(ls /opt/tenmon-mc/bin/*.sh | wc -l) files)"

# ── Step 3.5: 設定ファイル配置 ──
log_info "Step 3.5: 設定ファイル配置..."

if [ -f /opt/tenmon-mc/config/mc.env ]; then
  log_warn "既存の mc.env を保持します（上書きしません）"
else
  cp -f "${SCRIPT_DIR}/config/mc.env" /opt/tenmon-mc/config/mc.env
  log_ok "mc.env 配置完了"
fi

# mc.env の DB_PATH を対話式で確認
echo ""
CURRENT_DB_PATH=$(grep "^DB_PATH=" /opt/tenmon-mc/config/mc.env 2>/dev/null | cut -d'"' -f2)
CURRENT_DB_PATH="${CURRENT_DB_PATH:-/opt/tenmon-ark-data/kokuzo.sqlite}"

read -r -p "DB_PATH [${CURRENT_DB_PATH}]: " INPUT_DB_PATH
INPUT_DB_PATH="${INPUT_DB_PATH:-$CURRENT_DB_PATH}"

if [ ! -f "$INPUT_DB_PATH" ]; then
  log_warn "DB ファイルが見つかりません: ${INPUT_DB_PATH}"
  log_warn "collect_founder.sh / collect_learning.sh はエラーを返します"
fi

# mc.env を更新
sed -i "s|^DB_PATH=.*|DB_PATH=\"${INPUT_DB_PATH}\"|" /opt/tenmon-mc/config/mc.env
log_ok "DB_PATH = ${INPUT_DB_PATH}"

# REPO_PATH を確認
CURRENT_REPO_PATH=$(grep "^REPO_PATH=" /opt/tenmon-mc/config/mc.env 2>/dev/null | cut -d'"' -f2)
CURRENT_REPO_PATH="${CURRENT_REPO_PATH:-/opt/tenmon-ark-repo}"

read -r -p "REPO_PATH [${CURRENT_REPO_PATH}]: " INPUT_REPO_PATH
INPUT_REPO_PATH="${INPUT_REPO_PATH:-$CURRENT_REPO_PATH}"

sed -i "s|^REPO_PATH=.*|REPO_PATH=\"${INPUT_REPO_PATH}\"|" /opt/tenmon-mc/config/mc.env
log_ok "REPO_PATH = ${INPUT_REPO_PATH}"
echo ""

# ── Step 4: /var/www/tenmon-mc ディレクトリ作成 ──
log_info "Step 4: Web ディレクトリ作成..."

mkdir -p /var/www/tenmon-mc/data/history
mkdir -p /var/www/tenmon-mc/data/timeseries
mkdir -p /var/www/tenmon-mc/inbox
mkdir -p /var/www/tenmon-mc/inbox_archive
chown www-data:www-data /var/www/tenmon-mc/inbox
log_ok "/var/www/tenmon-mc 作成済み (inbox ディレクトリ含む)"

# ── Step 5: web/* をコピー ──
log_info "Step 5: HTML/CSS を配置..."

cp -f "${SCRIPT_DIR}/web/index.html" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/style.css" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/dashboard.html" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/dashboard.css" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/dashboard.js" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/ai_agents.html" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/ai_agents.js" /var/www/tenmon-mc/
cp -f "${SCRIPT_DIR}/web/ai_agents.css" /var/www/tenmon-mc/
chown -R www-data:www-data /var/www/tenmon-mc/
log_ok "Web資産配置完了 (index, dashboard, ai_agents, css, js)"

# ── Step 6: nginx 設定の追加 ──
log_info "Step 6: nginx 設定（include 方式）..."

SNIPPET_SRC="${SCRIPT_DIR}/nginx/tenmon-mc-locations.conf"
SNIPPET_DST="/etc/nginx/snippets/tenmon-mc-locations.conf"
INCLUDE_LINE="    include /etc/nginx/snippets/tenmon-mc-locations.conf;"
MARKER="# --- TENMON-MC INCLUDE ---"

# snippets ディレクトリ作成
mkdir -p /etc/nginx/snippets

# MC location 定義ファイルを配置（常に最新版で上書き）
cp -f "$SNIPPET_SRC" "$SNIPPET_DST"
chmod 644 "$SNIPPET_DST"
log_ok "snippets/tenmon-mc-locations.conf 配置完了"

# 既存の tenmon-ark.com 設定ファイルを検出
NGINX_CONF=""
for candidate in \
  /etc/nginx/sites-enabled/tenmon-ark.com \
  /etc/nginx/sites-enabled/tenmon-ark \
  /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark \
  /etc/nginx/conf.d/tenmon-ark.conf \
  /etc/nginx/conf.d/tenmon-ark.com.conf; do
  if [ -f "$candidate" ]; then
    NGINX_CONF="$candidate"
    break
  fi
done

if [ -z "$NGINX_CONF" ]; then
  log_warn "tenmon-ark.com の nginx 設定ファイルを自動検出できませんでした"
  echo ""
  echo "nginx 設定ファイル一覧:"
  ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -20
  echo ""
  read -r -p "tenmon-ark.com の nginx 設定ファイルパスを入力: " NGINX_CONF
fi

if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
  # 前回実行で sed が壊した可能性のある設定を復元
  LATEST_BAK=$(ls -t "${NGINX_CONF}.bak_mc_"* 2>/dev/null | head -1)
  if [ -n "$LATEST_BAK" ]; then
    # バックアップが存在し、かつ現在の設定が壊れている場合に復元
    if ! nginx -t 2>/dev/null; then
      cp "$LATEST_BAK" "$NGINX_CONF"
      log_info "前回失敗から復元: $LATEST_BAK → $NGINX_CONF"
    fi
  fi

  # 既に include 行が含まれているか確認
  if grep -qF "tenmon-mc-locations.conf" "$NGINX_CONF" 2>/dev/null; then
    log_warn "nginx 設定に既に TENMON-MC include が存在します（スキップ）"
  else
    # バックアップ
    cp "$NGINX_CONF" "${NGINX_CONF}.bak_mc_$(date +%Y%m%d_%H%M%S)"
    log_info "バックアップ: ${NGINX_CONF}.bak_mc_*"

    # 最後の } の直前に include 1行を挿入（awk使用、sed不使用）
    TMPFILE=$(mktemp)
    awk -v marker="$MARKER" -v inc="$INCLUDE_LINE" '
    {
      lines[NR] = $0
    }
    END {
      last = 0
      for (i = NR; i > 0; i--) {
        if (lines[i] ~ /^}/) {
          last = i
          break
        }
      }
      for (i = 1; i <= NR; i++) {
        if (i == last) {
          print marker
          print inc
        }
        print lines[i]
      }
    }' "$NGINX_CONF" > "$TMPFILE"
    mv "$TMPFILE" "$NGINX_CONF"

    log_ok "nginx 設定に include 1行を追加しました"
  fi

  # nginx -t で検証
  log_info "nginx 設定テスト..."
  if nginx -t 2>&1; then
    log_ok "nginx -t PASS"
    systemctl reload nginx 2>/dev/null && log_ok "nginx reload 完了" || log_warn "nginx reload 失敗 — 手動で実行してください"
  else
    log_err "nginx -t FAIL — 設定を確認してください"
    log_err "バックアップから復元: cp ${NGINX_CONF}.bak_mc_* ${NGINX_CONF}"
  fi
else
  log_warn "nginx 設定をスキップしました"
  log_warn "手動で以下を tenmon-ark.com の server {} 内に追加してください:"
  log_warn "  include /etc/nginx/snippets/tenmon-mc-locations.conf;"
fi
echo ""

# ── Step 7: Basic Auth パスワード設定 ──
log_info "Step 7: Basic Auth 設定..."

HTPASSWD_FILE="/var/www/tenmon-mc/.htpasswd"

if [ -f "$HTPASSWD_FILE" ]; then
  log_warn "既存の .htpasswd を検出しました"
  read -r -p "上書きしますか？ [y/N]: " OVERWRITE
  if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
    log_info ".htpasswd を保持します"
  else
    read -r -p "Basic Auth ユーザー名: " AUTH_USER
    htpasswd -c "$HTPASSWD_FILE" "$AUTH_USER"
    chown root:www-data "$HTPASSWD_FILE"
    chmod 640 "$HTPASSWD_FILE"
    log_ok "Basic Auth 設定完了: ${AUTH_USER}"
  fi
else
  read -r -p "Basic Auth ユーザー名 [tenmon]: " AUTH_USER
  AUTH_USER="${AUTH_USER:-tenmon}"
  htpasswd -c "$HTPASSWD_FILE" "$AUTH_USER"
  chown root:www-data "$HTPASSWD_FILE"
  chmod 640 "$HTPASSWD_FILE"
  log_ok "Basic Auth 設定完了: ${AUTH_USER}"
fi
echo ""

# ── Step 8: cron 登録 ──
log_info "Step 8: cron 登録..."

CRON_FILE="/etc/cron.d/tenmon-mc"
cp -f "${SCRIPT_DIR}/cron/tenmon-mc.cron" "$CRON_FILE"
chmod 644 "$CRON_FILE"
chown root:root "$CRON_FILE"

# cron デーモンに通知
systemctl reload cron 2>/dev/null || service cron reload 2>/dev/null || true
log_ok "cron 登録完了 (collect:5分, ingest:1分, notion:1時間, quality:深夜2時)"

# ログファイル初期化
for logfile in /var/log/tenmon-mc.log /var/log/tenmon-mc-ingest.log /var/log/tenmon-mc-notion.log /var/log/tenmon-mc-quality.log; do
  touch "$logfile"
  chown root:root "$logfile"
  chmod 644 "$logfile"
done
log_ok "ログファイル初期化完了 (4ファイル)"

# ── Step 8.5: 履歴DB初期化 ──
log_info "Step 8.5: 履歴DB初期化..."
/opt/tenmon-mc/bin/init_history_db.sh /var/www/tenmon-mc/history.db
log_ok "履歴DB初期化完了"

# ── Step 8.6: Agent DB初期化 (Phase 4) ──
log_info "Step 8.6: Agent DB初期化..."
/opt/tenmon-mc/bin/init_agent_db.sh /var/www/tenmon-mc/agents.db
log_ok "Agent DB初期化完了"

# ── Step 9: 初回 collect.sh 実行 ──
log_info "Step 9: 初回データ収集..."
echo ""

if /opt/tenmon-mc/bin/collect.sh; then
  log_ok "初回収集完了"
else
  log_warn "初回収集でエラーが発生しましたが、部分的なデータは生成されている可能性があります"
fi
echo ""

# ── Step 10: 結果の確認表示 ──
log_info "Step 10: 結果確認..."
echo ""
echo "============================================================"

if [ -f /var/www/tenmon-mc/data/report.txt ]; then
  log_ok "report.txt 生成済み"
  echo ""
  cat /var/www/tenmon-mc/data/report.txt
else
  log_err "report.txt が生成されませんでした"
fi

echo ""
echo "============================================================"

if [ -f /var/www/tenmon-mc/data/snapshot.json ]; then
  log_ok "snapshot.json 生成済み"
  # JSON 妥当性チェック
  if jq empty /var/www/tenmon-mc/data/snapshot.json 2>/dev/null; then
    log_ok "snapshot.json は有効な JSON です"
  else
    log_err "snapshot.json は無効な JSON です"
  fi
else
  log_err "snapshot.json が生成されませんでした"
fi

echo ""
echo "============================================================"
echo ""
log_info "インストール完了"
echo ""
echo "  Text:    https://tenmon-ark.com/mc/"
echo "  Dash:    https://tenmon-ark.com/mc/dashboard.html"
echo "  Agents:  https://tenmon-ark.com/mc/ai_agents.html"
echo "  Data:    /var/www/tenmon-mc/data/"
echo "  Config:  /opt/tenmon-mc/config/mc.env"
echo "  Logs:    /var/log/tenmon-mc.log"
echo "  Cron:    /etc/cron.d/tenmon-mc (collect:5m, ingest:1m, notion:1h, quality:2am)"
echo ""
echo "  次回の自動更新: 約5分後"
echo ""
log_ok "TENMON-MC Phase 4 セットアップ完了"
