#!/usr/bin/env bash
# ============================================================
# collect_db_inventory.sh — DB 解析スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - SQLite (kokuzo.sqlite) のテーブル一覧・行数・スキーマ
#   - MySQL/TiDB (server/ 側 Drizzle) のテーブル統計 (接続可能な場合)
# 出力: $OUTPUT_DIR/db_inventory.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/safe_query.sh"
source "${SCRIPT_DIR}/lib/mask_personal_info.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

validate_salt

echo "[collect_db_inventory] Starting DB inventory..." >&2

# --- 1. SQLite (kokuzo.sqlite) ---
SQLITE_RESULT="$OUTPUT_DIR/db_inventory_sqlite.json"

if [[ -f "$KOKUZO_DB" ]]; then
  echo "[collect_db_inventory] Found SQLite DB: $KOKUZO_DB" >&2
  DB_SIZE=$(stat -c%s "$KOKUZO_DB" 2>/dev/null || echo "0")

  # テーブル一覧
  TABLES_JSON=$(list_tables "$KOKUZO_DB")

  # 各テーブルの行数を収集
  TABLE_STATS="["
  FIRST=true
  while IFS= read -r table_name; do
    [[ -z "$table_name" ]] && continue
    ROW_COUNT=$(safe_sqlite_query "$KOKUZO_DB" "SELECT COUNT(*) as c FROM \"${table_name}\";" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['c'])" 2>/dev/null || echo "0")
    SCHEMA_SQL=$(sqlite3 -readonly "$KOKUZO_DB" ".schema ${table_name}" 2>/dev/null | head -20 || echo "N/A")

    if [[ "$FIRST" == "true" ]]; then
      FIRST=false
    else
      TABLE_STATS+=","
    fi
    TABLE_STATS+=$(python3 -c "
import json, sys
print(json.dumps({
    'table': sys.argv[1],
    'row_count': int(sys.argv[2]),
    'schema_preview': sys.argv[3][:500]
}))
" "$table_name" "$ROW_COUNT" "$SCHEMA_SQL")
  done < <(sqlite3 -readonly "$KOKUZO_DB" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null)
  TABLE_STATS+="]"

  # FTS テーブル
  FTS_TABLES=$(sqlite3 -readonly "$KOKUZO_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%fts%' ORDER BY name;" 2>/dev/null || echo "")

  # 最終JSON
  python3 -c "
import json, sys
result = {
    'db_type': 'SQLite',
    'db_path': sys.argv[1],
    'db_size_bytes': int(sys.argv[2]),
    'db_size_mb': round(int(sys.argv[2]) / 1024 / 1024, 2),
    'tables': json.loads(sys.argv[3]),
    'fts_tables': sys.argv[4].strip().split('\n') if sys.argv[4].strip() else [],
    'total_tables': len(json.loads(sys.argv[3]))
}
print(json.dumps(result, indent=2, ensure_ascii=False))
" "$KOKUZO_DB" "$DB_SIZE" "$TABLE_STATS" "$FTS_TABLES" > "$SQLITE_RESULT"

  echo "[collect_db_inventory] SQLite inventory saved to $SQLITE_RESULT" >&2
else
  echo "[collect_db_inventory] WARNING: SQLite DB not found at $KOKUZO_DB" >&2
  echo '{"db_type":"SQLite","error":"DB file not found","db_path":"'"$KOKUZO_DB"'"}' > "$SQLITE_RESULT"
fi

# --- 2. MySQL/TiDB (server/ 側) ---
MYSQL_RESULT="$OUTPUT_DIR/db_inventory_mysql.json"

# .env から DATABASE_URL を読み取り (値はマスクして記録)
ENV_FILE="/opt/tenmon-ark/tenmon-ark/.env"
if [[ -f "$ENV_FILE" ]]; then
  DB_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "")
  if [[ -n "$DB_URL" ]]; then
    MASKED_URL=$(mask_env_value "DATABASE_URL" "$DB_URL")
    echo "[collect_db_inventory] MySQL connection found: $MASKED_URL" >&2

    # mysql コマンドが利用可能か確認
    if command -v mysql &>/dev/null; then
      # DATABASE_URL パース (mysql://user:pass@host:port/dbname)
      DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|' || echo "")
      DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|' || echo "3306")
      DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|' || echo "")
      DB_USER=$(echo "$DB_URL" | sed -E 's|.*://([^:]+):.*|\1|' || echo "")
      DB_PASS=$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|' || echo "")

      if [[ -n "$DB_HOST" && -n "$DB_NAME" ]]; then
        MYSQL_TABLES=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
          -N -e "SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' ORDER BY TABLE_NAME;" 2>/dev/null || echo "")

        if [[ -n "$MYSQL_TABLES" ]]; then
          python3 -c "
import json, sys
lines = sys.argv[1].strip().split('\n')
tables = []
for line in lines:
    parts = line.split('\t')
    if len(parts) >= 4:
        tables.append({
            'table': parts[0],
            'estimated_rows': int(parts[1]) if parts[1].isdigit() else 0,
            'data_length_bytes': int(parts[2]) if parts[2].isdigit() else 0,
            'index_length_bytes': int(parts[3]) if parts[3].isdigit() else 0
        })
result = {
    'db_type': 'MySQL/TiDB',
    'connection': '[MASKED]',
    'database': sys.argv[2],
    'tables': tables,
    'total_tables': len(tables)
}
print(json.dumps(result, indent=2, ensure_ascii=False))
" "$MYSQL_TABLES" "$DB_NAME" > "$MYSQL_RESULT"
          echo "[collect_db_inventory] MySQL inventory saved to $MYSQL_RESULT" >&2
        else
          echo '{"db_type":"MySQL/TiDB","error":"Query failed or no tables found"}' > "$MYSQL_RESULT"
        fi
      else
        echo '{"db_type":"MySQL/TiDB","error":"Could not parse DATABASE_URL"}' > "$MYSQL_RESULT"
      fi
    else
      echo '{"db_type":"MySQL/TiDB","error":"mysql command not available"}' > "$MYSQL_RESULT"
    fi
  else
    echo '{"db_type":"MySQL/TiDB","error":"DATABASE_URL not found in .env"}' > "$MYSQL_RESULT"
  fi
else
  echo '{"db_type":"MySQL/TiDB","error":".env file not found"}' > "$MYSQL_RESULT"
fi

# --- 3. 統合結果 ---
python3 -c "
import json
sqlite_data = json.load(open('$SQLITE_RESULT'))
mysql_data = json.load(open('$MYSQL_RESULT'))
combined = {
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'sqlite': sqlite_data,
    'mysql': mysql_data
}
with open('$OUTPUT_DIR/db_inventory.json', 'w') as f:
    json.dump(combined, f, indent=2, ensure_ascii=False)
"

echo "[collect_db_inventory] Combined inventory saved to $OUTPUT_DIR/db_inventory.json" >&2
echo "[collect_db_inventory] Done." >&2
