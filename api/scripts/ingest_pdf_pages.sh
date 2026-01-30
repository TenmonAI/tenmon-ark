#!/usr/bin/env bash
set -euo pipefail

# PDF を kokuzo_pages テーブルに投入するスクリプト
# 使い方: ./scripts/ingest_pdf_pages.sh "言霊秘書.pdf" "/path/to/言霊秘書.pdf" [start] [end]

DOC_NAME="${1:-}"
PDF_PATH="${2:-}"
START_PAGE="${3:-1}"
END_PAGE="${4:-}"

if [ -z "$DOC_NAME" ] || [ -z "$PDF_PATH" ]; then
  echo "Usage: $0 DOC_NAME PDF_PATH [START_PAGE] [END_PAGE]"
  echo "Example: $0 \"言霊秘書.pdf\" \"/path/to/言霊秘書.pdf\" 1 50"
  exit 1
fi

if [ ! -f "$PDF_PATH" ]; then
  echo "Error: PDF file not found: $PDF_PATH"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."

DB_PATH="${TENMON_ARK_DB_KOKUZO_PATH:-db/kokuzo.sqlite}"

# テーブル作成（自動作成されるが念のため）
sqlite3 "$DB_PATH" <<EOF
CREATE TABLE IF NOT EXISTS kokuzo_pages (
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  text TEXT NOT NULL,
  sha TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (doc, pdfPage)
);
CREATE INDEX IF NOT EXISTS idx_kokuzo_pages_doc_page ON kokuzo_pages(doc, pdfPage);
EOF

# ページ範囲の決定
if [ -z "$END_PAGE" ]; then
  # 最後のページを取得（pdftotext で確認）
  END_PAGE=$(pdftotext "$PDF_PATH" - 2>/dev/null | wc -l || echo "100")
fi

echo "Ingesting $DOC_NAME from $PDF_PATH (pages $START_PAGE-$END_PAGE)"

for page in $(seq "$START_PAGE" "$END_PAGE"); do
  echo -n "Page $page... "
  
  # pdftotext でページを抽出
  TEXT=$(pdftotext -f "$page" -l "$page" "$PDF_PATH" - 2>/dev/null || echo "")
  
  if [ -z "$TEXT" ]; then
    echo "empty, skipping"
    continue
  fi
  
  # sha256sum を計算
  SHA=$(echo -n "$TEXT" | sha256sum | cut -d' ' -f1)
  
  # SQLite に UPSERT
  sqlite3 "$DB_PATH" <<EOF
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt)
VALUES ('$DOC_NAME', $page, $(sqlite3 -quote "$TEXT"), '$SHA', datetime('now'));
EOF
  
  echo "OK (sha=${SHA:0:8})"
done

echo "Done. Ingested pages $START_PAGE-$END_PAGE for $DOC_NAME"
