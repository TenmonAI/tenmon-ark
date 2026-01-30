#!/usr/bin/env bash
set -euo pipefail

# PDF を kokuzo_pages テーブルに投入するスクリプト（安全版）
# 使い方: ./scripts/ingest_pdf_pages.sh "言霊秘書.pdf" "/path/to/言霊秘書.pdf" [start] [end]

DOC_NAME="${1:-}"
PDF_PATH="${2:-}"
START_PAGE="${3:-1}"
END_PAGE="${4:-}"

if [ -z "$DOC_NAME" ] || [ -z "$PDF_PATH" ]; then
  echo "Usage: $0 DOC_NAME PDF_PATH [START_PAGE] [END_PAGE]"
  exit 1
fi
if [ ! -f "$PDF_PATH" ]; then
  echo "Error: PDF file not found: $PDF_PATH"
  exit 1
fi
if [ -z "$END_PAGE" ]; then
  echo "Error: END_PAGE is required for deterministic ingest (avoid full-file scan)."
  echo "Example: $0 \"$DOC_NAME\" \"$PDF_PATH\" 1 50"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR/.."

DB_PATH="${TENMON_ARK_DB_KOKUZO_PATH:-db/kokuzo.sqlite}"

# テーブル作成（念のため）
sqlite3 "$DB_PATH" <<'SQL'
CREATE TABLE IF NOT EXISTS kokuzo_pages (
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  text TEXT NOT NULL,
  sha TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (doc, pdfPage)
);
CREATE INDEX IF NOT EXISTS idx_kokuzo_pages_doc_page ON kokuzo_pages(doc, pdfPage);
SQL

echo "Ingesting $DOC_NAME from $PDF_PATH (pages $START_PAGE-$END_PAGE)"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

for page in $(seq "$START_PAGE" "$END_PAGE"); do
  echo -n "Page $page... "

  OUT_TXT="$TMP_DIR/p${page}.txt"

  # pdftotext はページ単位＋timeout（詰まり防止）
  if ! timeout 30s pdftotext -f "$page" -l "$page" "$PDF_PATH" "$OUT_TXT" 2>/dev/null; then
    echo "timeout/fail, skipping"
    continue
  fi

  # 空ならスキップ
  if [ ! -s "$OUT_TXT" ]; then
    echo "empty, skipping"
    continue
  fi

  # Pythonで安全にUPSERT（SQLインジェクション/クォート問題/巨大TEXT問題を根絶）
  python3 - <<'PY' "$DB_PATH" "$DOC_NAME" "$page" "$OUT_TXT"
import sqlite3, hashlib, datetime, pathlib, sys

db_path, doc, page_s, txt_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
pdfPage = int(page_s)

text = pathlib.Path(txt_path).read_text(encoding="utf-8", errors="replace")
sha = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()
now = datetime.datetime.utcnow().isoformat() + "Z"

db = sqlite3.connect(db_path)
db.execute("""
INSERT INTO kokuzo_pages(doc, pdfPage, text, sha, updatedAt)
VALUES(?,?,?,?,?)
ON CONFLICT(doc,pdfPage) DO UPDATE SET
  text=excluded.text,
  sha=excluded.sha,
  updatedAt=excluded.updatedAt
""", (doc, pdfPage, text, sha, now))
db.commit()
print(f"OK (sha={sha[:8]})")
PY
done

echo "Done. Ingested pages $START_PAGE-$END_PAGE for $DOC_NAME"
