-- Kotodama Law Corpus Schema

PRAGMA foreign_keys = ON;

-- 1) 1ページ単位の原文保存（後で再抽出できるように）
CREATE TABLE IF NOT EXISTS kotodama_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc TEXT NOT NULL,               -- "言霊秘書.pdf" 等
  pdf_page INTEGER NOT NULL,       -- 1-based
  book_page TEXT,                  -- "P6-10" のような推定/手入力も可
  section TEXT,                    -- "水穂伝附言" など
  text_raw TEXT NOT NULL,
  text_norm TEXT,                  -- 正規化（全角/半角・改行整理）
  hash TEXT,                       -- 再処理判定
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(doc, pdf_page)
);

-- 2) 法則（最小単位）
CREATE TABLE IF NOT EXISTS kotodama_laws (
  id TEXT PRIMARY KEY,             -- "KHS-P0006-001" など
  doc TEXT NOT NULL,
  pdf_page INTEGER NOT NULL,
  title TEXT NOT NULL,             -- 法則の短名
  quote TEXT NOT NULL,             -- 原文抜粋（短く）
  normalized TEXT NOT NULL,        -- 現代語の要点（短く）
  tags TEXT NOT NULL,              -- JSON配列文字列 ["operation","taiyo"] 等
  confidence REAL NOT NULL,        -- 0.0-1.0（抽出の確度）
  created_at INTEGER NOT NULL
);

-- 3) 参照リンク（フラクタル：法則文の中の語が別法則へ繋がる）
CREATE TABLE IF NOT EXISTS kotodama_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL,               -- "defines" "uses" "expands" "inverse" "same_as" 等
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(from_id) REFERENCES kotodama_laws(id),
  FOREIGN KEY(to_id) REFERENCES kotodama_laws(id)
);

-- 4) 他資料との照合（古事記/いろは/カタカムナ）
CREATE TABLE IF NOT EXISTS cross_refs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_law_id TEXT NOT NULL,
  target_doc TEXT NOT NULL,        -- "古事記原文解読.docx" "いろは最終原稿.docx" "カタカムナ言灵解.pdf"
  target_locator TEXT NOT NULL,    -- "章/頁/見出し/行" を自由形式
  relation TEXT NOT NULL,          -- "aligns" "supports" "derives" "same_process" 等
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(from_law_id) REFERENCES kotodama_laws(id)
);


