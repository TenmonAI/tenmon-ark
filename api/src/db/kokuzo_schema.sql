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

-- =========================================
-- kokuzo_pages (required by HYBRID search)
-- =========================================
CREATE TABLE IF NOT EXISTS kokuzo_pages (
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (doc, pdfPage)
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_pages_doc ON kokuzo_pages(doc);
CREATE INDEX IF NOT EXISTS idx_kokuzo_pages_page ON kokuzo_pages(pdfPage);

-- Optional but recommended: FTS for page text
CREATE VIRTUAL TABLE IF NOT EXISTS kokuzo_pages_fts USING fts5(
  text,
  doc UNINDEXED,
  pdfPage UNINDEXED,
  content='kokuzo_pages',
  content_rowid='rowid'
);

-- Keep FTS in sync (safe even if no inserts happen)
CREATE TRIGGER IF NOT EXISTS kokuzo_pages_ai AFTER INSERT ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(rowid, text, doc, pdfPage)
  VALUES (new.rowid, new.text, new.doc, new.pdfPage);
END;

CREATE TRIGGER IF NOT EXISTS kokuzo_pages_ad AFTER DELETE ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(kokuzo_pages_fts, rowid, text, doc, pdfPage)
  VALUES('delete', old.rowid, old.text, old.doc, old.pdfPage);
END;

CREATE TRIGGER IF NOT EXISTS kokuzo_pages_au AFTER UPDATE ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(kokuzo_pages_fts, rowid, text, doc, pdfPage)
  VALUES('delete', old.rowid, old.text, old.doc, old.pdfPage);
  INSERT INTO kokuzo_pages_fts(rowid, text, doc, pdfPage)
  VALUES (new.rowid, new.text, new.doc, new.pdfPage);
END;

-- =========================================
-- kokuzo_laws (Phase40/41: LawEntry storage)
-- =========================================
CREATE TABLE IF NOT EXISTS kokuzo_laws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId TEXT NOT NULL,
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  quote TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array of KotodamaTag
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_laws_threadId ON kokuzo_laws(threadId);
CREATE INDEX IF NOT EXISTS idx_kokuzo_laws_doc_page ON kokuzo_laws(doc, pdfPage);

-- =========================================
-- kokuzo_algorithms (Phase43: Algorithm storage)
-- =========================================
CREATE TABLE IF NOT EXISTS kokuzo_algorithms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId TEXT NOT NULL,
  title TEXT NOT NULL,
  steps TEXT NOT NULL, -- JSON array
  summary TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_algorithms_threadId ON kokuzo_algorithms(threadId);
CREATE INDEX IF NOT EXISTS idx_kokuzo_algorithms_createdAt ON kokuzo_algorithms(createdAt);

-- writer runs/artifacts (K1)
CREATE TABLE IF NOT EXISTS writer_runs (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  mode TEXT,
  title TEXT,
  targetChars INTEGER,
  tolerancePct REAL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writer_artifacts (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  proofJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(runId) REFERENCES writer_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_writer_runs_threadId ON writer_runs(threadId);
CREATE INDEX IF NOT EXISTS idx_writer_artifacts_runId ON writer_artifacts(runId);

-- KAMU-GAKARI: OCR/QC storage (do NOT overwrite kokuzo_pages.text automatically)
CREATE TABLE IF NOT EXISTS kokuzo_ocr_pages (
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  engine TEXT NOT NULL,                 -- tesseract / gpt4o / gemini / claude / custom
  text_raw TEXT,
  text_norm TEXT,
  qc_json TEXT,                         -- JSON: mojibakeRate/jpRate/missingRate/confidence/etc
  createdAt TEXT NOT NULL,
  PRIMARY KEY (doc, pdfPage, engine)
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_ocr_pages_doc_page
  ON kokuzo_ocr_pages(doc, pdfPage);

CREATE TABLE IF NOT EXISTS kokuzo_restore_suggestions (
  id TEXT PRIMARY KEY,                  -- UUID/ULID
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  span TEXT,                            -- range/line/regex etc
  suggestion TEXT NOT NULL,
  basis_evidenceIds TEXT,               -- JSON array string
  method TEXT NOT NULL,                 -- regex / kotodama-law / fts-neighbor / llm-assist
  confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed/accepted/rejected
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_restore_doc_page
  ON kokuzo_restore_suggestions(doc, pdfPage);

