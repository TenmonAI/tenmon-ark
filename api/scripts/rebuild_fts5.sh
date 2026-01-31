#!/usr/bin/env bash
set -euo pipefail

# FTS5 テーブルを再構築するスクリプト（Phase27）
# 使い方: ./scripts/rebuild_fts5.sh

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."

DB_PATH="${TENMON_ARK_DB_KOKUZO_PATH:-db/kokuzo.sqlite}"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

echo "Rebuilding FTS5 index for kokuzo_pages..."

python3 - <<'PY' "$DB_PATH"
import sqlite3, sys

db_path = sys.argv[1]
db = sqlite3.connect(db_path)

# FTS5 テーブルを削除して再作成
print("Dropping existing FTS5 table...")
db.execute("DROP TABLE IF EXISTS kokuzo_pages_fts")

print("Creating FTS5 table...")
db.execute("""
CREATE VIRTUAL TABLE kokuzo_pages_fts USING fts5(
  doc,
  pdfPage,
  text,
  content='kokuzo_pages',
  content_rowid='rowid'
)
""")

# 既存の kokuzo_pages の内容を FTS5 に投入
print("Populating FTS5 from kokuzo_pages...")
cursor = db.execute("SELECT rowid, doc, pdfPage, text FROM kokuzo_pages")
count = 0
for row in cursor:
    rowid, doc, pdfPage, text = row
    db.execute(
        "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) VALUES (?, ?, ?, ?)",
        (rowid, doc, pdfPage, text)
    )
    count += 1

db.commit()
print(f"Done. Indexed {count} pages.")
PY

echo "FTS5 rebuild complete."
