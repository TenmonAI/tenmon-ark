#!/usr/bin/env bash
# kokuzo_pages にサンプルデータを投入するスクリプト

set -euo pipefail

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

echo "[INGEST] Inserting sample KHS pages"

# サンプルページを投入（言霊秘書の表紙と1ページ目）
sqlite3 "$KOKUZO_DB" << 'EOF'
-- 表紙
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES
  ('KHS', 1, '言霊秘書（水火の法則）', 'sha_sample_1', datetime('now'));

-- 1ページ目（サンプル）
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES
  ('KHS', 2, '言霊とは、言葉に宿る霊的な力である。水火の法則は、火（外発）と水（内集）の二元的な呼吸を表す。', 'sha_sample_2', datetime('now'));

-- 2ページ目（サンプル）
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES
  ('KHS', 3, '與合（よごう）とは、二つのものが合わさることを意味する。搦（からみ）は、絡み合うことである。', 'sha_sample_3', datetime('now'));
EOF

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

echo "[DONE] Sample data ingested successfully"
