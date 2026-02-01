-- KOKŪZŌ v1.1: Persistent Wisdom Storage System Schema

PRAGMA foreign_keys = ON;

-- Files table: Uploaded files metadata
CREATE TABLE IF NOT EXISTS kokuzo_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL UNIQUE,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_files_uploaded_at
  ON kokuzo_files(uploaded_at);

-- Chunks table: Semantic chunks extracted from files
CREATE TABLE IF NOT EXISTS kokuzo_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT, -- JSON array
  thinking_axis TEXT NOT NULL CHECK(thinking_axis IN ('observe', 'reflect', 'build', 'act')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES kokuzo_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_chunks_file_id
  ON kokuzo_chunks(file_id);

CREATE INDEX IF NOT EXISTS idx_kokuzo_chunks_thinking_axis
  ON kokuzo_chunks(thinking_axis);

-- Seeds table: Compressed meaning and algorithmic hints
CREATE TABLE IF NOT EXISTS kokuzo_seeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('chat', 'file')),
  source_id INTEGER NOT NULL,
  essence TEXT NOT NULL, -- compressed meaning
  ruleset TEXT, -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_seeds_source
  ON kokuzo_seeds(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_kokuzo_seeds_created_at
  ON kokuzo_seeds(created_at);

-- === kokuzo_pages (FTS5) : minimal for HYBRID search ===
CREATE VIRTUAL TABLE IF NOT EXISTS kokuzo_pages
USING fts5(
  doc,
  pdfPage UNINDEXED,
  text
);
