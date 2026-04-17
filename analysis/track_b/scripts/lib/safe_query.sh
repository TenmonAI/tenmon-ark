#!/usr/bin/env bash
# ============================================================
# safe_query.sh — READ-ONLY SQL 実行共通関数
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 使い方: source lib/safe_query.sh
# 前提: sqlite3 がインストールされていること

set -euo pipefail

# --- 定数 ---
SQLITE_TIMEOUT=10000  # 10秒
SQLITE_OPTS=".timeout ${SQLITE_TIMEOUT}"

# --- SQLite DB パス ---
# VPS上の実際のパス
KOKUZO_DB="${KOKUZO_DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
# server/ 側 (Drizzle/MySQL) は別途対応

# --- READ-ONLY SQL 検証 ---
# 引数: $1 = SQL文
# 戻り値: 0=安全, 1=危険
validate_readonly_sql() {
  local sql="${1:-}"
  local upper_sql
  upper_sql=$(echo "$sql" | tr '[:lower:]' '[:upper:]')

  # 禁止キーワードチェック
  local forbidden=("INSERT" "UPDATE" "DELETE" "DROP" "ALTER" "CREATE" "REPLACE" "TRUNCATE" "ATTACH" "DETACH" "VACUUM" "REINDEX")
  for kw in "${forbidden[@]}"; do
    if echo "$upper_sql" | grep -qw "$kw"; then
      echo "ERROR: SQL contains forbidden keyword: $kw" >&2
      echo "  SQL: $sql" >&2
      return 1
    fi
  done
  return 0
}

# --- 安全なSQLite SELECT実行 ---
# 引数: $1 = DBパス, $2 = SQL文
# 出力: クエリ結果 (JSON mode)
safe_sqlite_query() {
  local db_path="${1:-}"
  local sql="${2:-}"

  # DB存在チェック
  if [[ ! -f "$db_path" ]]; then
    echo "ERROR: Database not found: $db_path" >&2
    return 1
  fi

  # READ-ONLY検証
  if ! validate_readonly_sql "$sql"; then
    return 1
  fi

  # 実行 (JSON mode, timeout付き)
  sqlite3 -json -readonly "$db_path" \
    ".timeout ${SQLITE_TIMEOUT}" \
    "$sql" 2>/dev/null || {
    echo "ERROR: Query failed or timed out." >&2
    echo "  DB: $db_path" >&2
    echo "  SQL: $sql" >&2
    return 1
  }
}

# --- 安全なSQLite SELECT実行 (CSV mode) ---
safe_sqlite_csv() {
  local db_path="${1:-}"
  local sql="${2:-}"

  if [[ ! -f "$db_path" ]]; then
    echo "ERROR: Database not found: $db_path" >&2
    return 1
  fi

  if ! validate_readonly_sql "$sql"; then
    return 1
  fi

  sqlite3 -csv -header -readonly "$db_path" \
    ".timeout ${SQLITE_TIMEOUT}" \
    "$sql" 2>/dev/null || {
    echo "ERROR: Query failed or timed out." >&2
    return 1
  }
}

# --- テーブル一覧取得 ---
# 引数: $1 = DBパス
list_tables() {
  local db_path="${1:-}"
  safe_sqlite_query "$db_path" \
    "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name;"
}

# --- テーブル行数取得 ---
# 引数: $1 = DBパス, $2 = テーブル名
table_row_count() {
  local db_path="${1:-}"
  local table="${2:-}"
  # テーブル名のサニタイズ (英数字とアンダースコアのみ)
  if [[ ! "$table" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "ERROR: Invalid table name: $table" >&2
    return 1
  fi
  safe_sqlite_query "$db_path" "SELECT COUNT(*) as row_count FROM \"${table}\";"
}

# --- テーブルスキーマ取得 ---
# 引数: $1 = DBパス, $2 = テーブル名
table_schema() {
  local db_path="${1:-}"
  local table="${2:-}"
  if [[ ! "$table" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "ERROR: Invalid table name: $table" >&2
    return 1
  fi
  safe_sqlite_query "$db_path" \
    "SELECT sql FROM sqlite_master WHERE name='${table}';"
}

echo "[safe_query.sh] Loaded successfully." >&2
