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

-- =========================================
-- Book Forge Unlimited / Writing Project Schema
-- =========================================
CREATE TABLE IF NOT EXISTS writing_projects (
  id TEXT PRIMARY KEY,
  projectType TEXT NOT NULL CHECK(projectType IN ('book', 'paper')),
  lane TEXT NOT NULL DEFAULT 'book_forge_unlimited' CHECK(lane IN ('normal_chat','deepread','book_forge_unlimited','paper_forge_unlimited')),
  state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN (
    'idle','collecting_sources','analyzing_sources','clarifying_intent','planning_outline',
    'locking_book_spec','drafting','reviewing','revising','export_ready','completed'
  )),
  title TEXT NOT NULL,
  subtitle TEXT,
  synopsis TEXT,
  audience TEXT,
  tone TEXT,
  rhetoric TEXT,
  mode TEXT,
  targetChars INTEGER,
  globalThesis TEXT,
  terminologyLock TEXT, -- JSON array
  continuitySummary TEXT,
  totalChars INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_writing_projects_updatedAt ON writing_projects(updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_writing_projects_state ON writing_projects(state);

CREATE TABLE IF NOT EXISTS source_registry (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  source_kind TEXT NOT NULL CHECK(source_kind IN (
    'uploaded_file','local_file','pdf_text_layer','pdf_ocr','notion_page',
    'google_drive_file','dropbox_file','web_url','web_crawl_page','thread_memory','generated_note'
  )),
  connector_type TEXT NOT NULL,
  title TEXT,
  provenance TEXT, -- JSON
  engine TEXT,
  confidence REAL,
  priority INTEGER NOT NULL DEFAULT 50,
  source_hash TEXT,
  page_range TEXT,
  extracted_ref TEXT,
  qc_summary TEXT, -- JSON
  uncertainty_flags TEXT, -- JSON array
  nas_locator TEXT,
  content TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_source_registry_project ON source_registry(project_id, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_source_registry_kind ON source_registry(source_kind);

CREATE TABLE IF NOT EXISTS writing_sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  selected INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, source_id),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(source_id) REFERENCES source_registry(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_analysis_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_id TEXT,
  source_summary TEXT,
  topic_clusters TEXT, -- JSON array
  thesis_candidates TEXT, -- JSON array
  repeated_claims TEXT, -- JSON array
  contradiction_map TEXT, -- JSON array
  reusable_quotes TEXT, -- JSON array
  style_signals TEXT, -- JSON array
  missing_topics TEXT, -- JSON array
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(source_id) REFERENCES source_registry(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS writing_outline_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  node_type TEXT NOT NULL CHECK(node_type IN ('chapter','section','block')),
  node_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  goal TEXT,
  summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_outline_project_order ON writing_outline_nodes(project_id, node_order);

CREATE TABLE IF NOT EXISTS writing_style_contracts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  rhetorical_contract TEXT,
  style_contract TEXT,
  prohibition_contract TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS writing_draft_blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  chapter_idx INTEGER NOT NULL DEFAULT 0,
  section_idx INTEGER NOT NULL DEFAULT 0,
  block_idx INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  content TEXT NOT NULL,
  chars INTEGER NOT NULL DEFAULT 0,
  continuity_summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_draft_blocks_project_order ON writing_draft_blocks(project_id, chapter_idx, section_idx, block_idx);

CREATE TABLE IF NOT EXISTS writing_progress_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  state_from TEXT,
  state_to TEXT,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS writing_review_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  chapter_idx INTEGER,
  block_id TEXT,
  review_kind TEXT NOT NULL,
  result TEXT NOT NULL, -- pass/fail/warn
  details TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
  artifact_ref TEXT,
  total_chars INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_export_jobs_project ON export_jobs(project_id, createdAt DESC);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  seed_url TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 2,
  max_pages INTEGER NOT NULL DEFAULT 100,
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crawl_pages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  project_id TEXT,
  url TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT,
  published_at TEXT,
  author TEXT,
  main_text TEXT,
  topic_tags TEXT, -- JSON array
  key_claims TEXT, -- JSON array
  source_hash TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(run_id) REFERENCES crawl_runs(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_run ON crawl_pages(run_id, createdAt);

CREATE TABLE IF NOT EXISTS book_continuation_memory (
  project_id TEXT PRIMARY KEY,
  continuity_summary TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES writing_projects(id) ON DELETE CASCADE
);

