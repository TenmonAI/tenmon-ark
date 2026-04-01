CREATE TABLE IF NOT EXISTS writing_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  topic TEXT,
  bookSpec TEXT,
  continuitySummary TEXT,
  totalChars INTEGER NOT NULL DEFAULT 0,
  total_blocks INTEGER NOT NULL DEFAULT 0,
  outline_json TEXT,
  draft_json TEXT,
  total_chars INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_draft_blocks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  chapterIndex INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  goal TEXT,
  content TEXT NOT NULL DEFAULT '',
  chars INTEGER NOT NULL DEFAULT 0,
  continuitySummary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_review_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS export_artifacts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown',
  content TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  message TEXT,
  artifactId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source_registry (
  id TEXT PRIMARY KEY,
  sourceType TEXT NOT NULL DEFAULT 'manual',
  source_type TEXT NOT NULL DEFAULT 'manual',
  uri TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metaJson TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_sources (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  sourceId TEXT,
  sourceType TEXT,
  doc TEXT,
  pdfPage INTEGER,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_outline_nodes (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  parentId TEXT,
  idx INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  goal TEXT,
  depth INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_style_contracts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  mode TEXT,
  persona TEXT,
  policy TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_progress_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  prevState TEXT,
  nextState TEXT NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source_analysis_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  sourceId TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  seedUrl TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crawl_pages (
  id TEXT PRIMARY KEY,
  crawlRunId TEXT,
  url TEXT NOT NULL,
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'fetched',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
