#!/usr/bin/env bash
# kokuzo_pages の存在確認とデータ投入スクリプト

set -euo pipefail

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"

echo "[CHECK] kokuzo_pages existence"
if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

# doc="KHS" の存在確認
echo "[CHECK] doc='KHS' in kokuzo_pages"
KHS_COUNT="$(sqlite3 "$KOKUZO_DB" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='KHS' LIMIT 1;" 2>/dev/null || echo "0")"
echo "KHS pages count: $KHS_COUNT"

if [ "$KHS_COUNT" = "0" ]; then
  echo "[WARN] No KHS pages found. Need to ingest data."
  echo ""
  echo "To ingest KHS data, run:"
  echo "  cd /opt/tenmon-ark-repo/api"
  echo "  # Insert sample page (example)"
  echo "  sqlite3 $KOKUZO_DB << 'EOF'"
  echo "INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES"
  echo "  ('KHS', 1, '言霊秘書 表紙', 'sha1', datetime('now'));"
  echo "EOF"
  echo ""
  echo "  # Update FTS5 index"
  echo "  sqlite3 $KOKUZO_DB << 'EOF'"
  echo "INSERT OR REPLACE INTO kokuzo_pages_fts (doc, pdfPage, text, rowid)"
  echo "  SELECT doc, pdfPage, text, rowid FROM kokuzo_pages WHERE doc='KHS';"
  echo "EOF"
else
  echo "[PASS] KHS pages found: $KHS_COUNT"
fi

# 全docの一覧（doc別件数・上位20）
echo ""
echo "[INFO] All docs in kokuzo_pages (top 20 by page count):"
sqlite3 "$KOKUZO_DB" "SELECT DISTINCT doc, COUNT(*) as pages FROM kokuzo_pages GROUP BY doc ORDER BY pages DESC LIMIT 20;" 2>/dev/null || echo "No data"
