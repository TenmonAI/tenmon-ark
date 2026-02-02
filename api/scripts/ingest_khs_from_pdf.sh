#!/usr/bin/env bash
# 言霊秘書PDFからページテキストを抽出して kokuzo_pages に投入するスクリプト
# まず 1〜3ページだけを抽出して投入し、導通確認する（全面OCRは後回し）

set -euo pipefail

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"
DOC_NAME="KHS"

# PDF パスの決定（環境変数 > 引数 > find コマンド）
PDF_PATH="${KHS_PDF_PATH:-${1:-}}"

if [ -z "$PDF_PATH" ]; then
  # find コマンドで検索
  PDF_PATH="$(bash "$(dirname "$0")/find_khs_pdf.sh" 2>/dev/null | tail -1 || echo "")"
fi

if [ -z "$PDF_PATH" ] || [ ! -f "$PDF_PATH" ]; then
  echo "[FAIL] PDF file not found. Please specify:"
  echo "  export KHS_PDF_PATH=/path/to/言霊秘書.pdf"
  echo "  bash scripts/ingest_khs_from_pdf.sh"
  exit 1
fi

echo "[INGEST] PDF path: $PDF_PATH"

# ページ範囲（デフォルト: 1-3ページ）
START_PAGE="${2:-1}"
END_PAGE="${3:-3}"

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

# pdftotext の存在確認
if ! command -v pdftotext >/dev/null 2>&1; then
  echo "[FAIL] pdftotext not found. Install poppler-utils:"
  echo "  sudo apt-get install -y poppler-utils  # Ubuntu/Debian"
  echo "  brew install poppler  # macOS"
  exit 1
fi

echo "[INGEST] Extracting pages $START_PAGE-$END_PAGE from $PDF_PATH"

# 一時ディレクトリ
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# 各ページを抽出して投入
for page in $(seq "$START_PAGE" "$END_PAGE"); do
  OUT_TXT="$TMP_DIR/page_${page}.txt"
  
  echo "[INGEST] Extracting page $page..."
  
  # pdftotext でページを抽出（timeout 30秒）
  if ! timeout 30s pdftotext -f "$page" -l "$page" "$PDF_PATH" "$OUT_TXT" 2>/dev/null; then
    echo "[WARN] Failed to extract page $page, skipping"
    continue
  fi
  
  # テキストを読み込み
  if [ ! -f "$OUT_TXT" ] || [ ! -s "$OUT_TXT" ]; then
    echo "[WARN] Page $page is empty, skipping"
    continue
  fi
  
  text=$(cat "$OUT_TXT")
  if [ -z "$text" ] || [ "${#text}" -lt 10 ]; then
    echo "[WARN] Page $page text is too short, skipping"
    continue
  fi
  
  # SHA を生成
  sha="khs_p${page}_$(echo -n "$text" | sha256sum | cut -d' ' -f1 | cut -c1-8)"
  
  # SQL インジェクション対策: テキストをエスケープ
  text_escaped=$(printf '%s\n' "$text" | sed "s/'/''/g")
  
  # kokuzo_pages テーブルに sha フィールドがあるか確認
  has_sha=$(sqlite3 "$KOKUZO_DB" "PRAGMA table_info(kokuzo_pages);" 2>/dev/null | grep -c "^sha" || echo "0")
  
  if [ "$has_sha" -gt 0 ]; then
    sqlite3 "$KOKUZO_DB" << EOF
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES
  ('$DOC_NAME', $page, '$text_escaped', '$sha', datetime('now'));
EOF
  else
    sqlite3 "$KOKUZO_DB" << EOF
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, updatedAt) VALUES
  ('$DOC_NAME', $page, '$text_escaped', datetime('now'));
EOF
  fi
  
  echo "[INGEST] Inserted page $page (text length: ${#text} chars)"
done

echo "[INGEST] Updating FTS5 index"

# FTS5 インデックスを更新
sqlite3 "$KOKUZO_DB" << 'EOF'
-- 既存のFTS5エントリを削除（doc='KHS'）
DELETE FROM kokuzo_pages_fts WHERE doc='KHS';

-- 新しいエントリを挿入
INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text)
  SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc='KHS';
EOF

echo "[INGEST] Verifying"

# 確認
KHS_COUNT="$(sqlite3 "$KOKUZO_DB" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='KHS';")"
echo "[PASS] KHS pages count: $KHS_COUNT"

FTS_COUNT="$(sqlite3 "$KOKUZO_DB" "SELECT COUNT(*) FROM kokuzo_pages_fts WHERE doc='KHS';")"
echo "[PASS] KHS FTS entries: $FTS_COUNT"

# 総件数確認
TOTAL_COUNT="$(sqlite3 "$KOKUZO_DB" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$TOTAL_COUNT" = "0" ]; then
  echo "[FAIL] kokuzo_pages is still empty after ingestion"
  exit 1
fi

echo "[DONE] KHS pages ingested successfully (total: $TOTAL_COUNT pages)"
