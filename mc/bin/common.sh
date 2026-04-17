#!/bin/bash
# ============================================================
# TENMON-MC 共通関数ライブラリ
# ============================================================

# 設定ファイル読み込み
MC_ENV="${MC_ENV:-/opt/tenmon-mc/config/mc.env}"
if [ -f "$MC_ENV" ]; then
  # shellcheck disable=SC1090
  source "$MC_ENV"
fi

# デフォルト値
REPO_PATH="${REPO_PATH:-/opt/tenmon-ark-repo}"
DB_PATH="${DB_PATH:-/opt/tenmon-ark-data/kokuzo.sqlite}"
API_URL="${API_URL:-http://127.0.0.1:3000}"
SERVICE_NAME="${SERVICE_NAME:-tenmon-ark-api}"
DATA_DIR="${DATA_DIR:-/var/www/tenmon-mc/data}"
HISTORY_RETENTION_MIN="${HISTORY_RETENTION_MIN:-360}"

# JSON安全エスケープ（ダブルクォート、バックスラッシュ、改行）
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/}"
  printf '%s' "$s"
}

# SQLite read-only クエリ実行
# 引数: $1=SQL文
# 戻り値: 結果文字列 or "null"
sql_ro() {
  local result
  if [ ! -f "$DB_PATH" ]; then
    echo "null"
    return
  fi
  result=$(timeout 10 sqlite3 -readonly "$DB_PATH" "$1" 2>/dev/null) || result=""
  if [ -z "$result" ]; then
    echo "null"
  else
    echo "$result"
  fi
}

# JSON安全なstring値を返す (制御文字を除去・エスケープ)
json_string_safe() {
  local v="$1"
  # 制御文字 (0x00-0x1F) を除去
  v=$(printf '%s' "$v" | tr -d '\000-\037')
  # バックスラッシュと"をエスケープ (bash置換)
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf '%s' "$v"
}

# 数値保証（nullや空文字を0に変換）
ensure_num() {
  local v="$1"
  # 改行・CR・非数字を除去し、最初の整数トークンだけを取得
  v=$(printf '%s' "$v" | tr -d '\r\n' | grep -oE '^-?[0-9]+' | head -1)
  if [ -z "$v" ]; then
    echo "0"
  else
    echo "$v"
  fi
}
