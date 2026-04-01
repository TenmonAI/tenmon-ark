PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS writing_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  topic TEXT,
  bookSpec TEXT,
  continuitySummary TEXT,
  totalChars INTEGER NOT NULL DEFAULT 0,
  total_blocks INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_projects_state ON writing_projects(state);
CREATE INDEX IF NOT EXISTS idx_writing_projects_updatedAt ON writing_projects(updatedAt);

CREATE TABLE IF NOT EXISTS writing_draft_blocks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  chapterIndex INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  goal TEXT,
  content TEXT NOT NULL,
  chars INTEGER NOT NULL DEFAULT 0,
  continuitySummary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_draft_blocks_projectId ON writing_draft_blocks(projectId);
CREATE INDEX IF NOT EXISTS idx_writing_draft_blocks_project_chapter ON writing_draft_blocks(projectId, chapterIndex);

CREATE TABLE IF NOT EXISTS writing_review_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_review_logs_projectId ON writing_review_logs(projectId);

CREATE TABLE IF NOT EXISTS export_artifacts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown',
  content TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_export_artifacts_projectId ON export_artifacts(projectId);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  message TEXT,
  artifactId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_export_jobs_projectId ON export_jobs(projectId);

CREATE TABLE IF NOT EXISTS source_registry (
  id TEXT PRIMARY KEY,
  sourceType TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '',
  uri TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metaJson TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_source_registry_type ON source_registry(sourceType);

CREATE TABLE IF NOT EXISTS writing_sources (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  sourceId TEXT,
  sourceType TEXT,
  source_type TEXT,
  doc TEXT,
  pdfPage INTEGER,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_sources_projectId ON writing_sources(projectId);

CREATE TABLE IF NOT EXISTS writing_outline_nodes (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  parentId TEXT,
  parent_id TEXT,
  idx INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  goal TEXT,
  depth INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_outline_nodes_projectId ON writing_outline_nodes(projectId);

CREATE TABLE IF NOT EXISTS writing_style_contracts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  mode TEXT,
  persona TEXT,
  policy TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_style_contracts_projectId ON writing_style_contracts(projectId);

CREATE TABLE IF NOT EXISTS writing_progress_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  prevState TEXT,
  prev_state TEXT,
  nextState TEXT NOT NULL,
  next_state TEXT NOT NULL DEFAULT '',
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_progress_logs_projectId ON writing_progress_logs(projectId);
CREATE INDEX IF NOT EXISTS idx_writing_progress_logs_createdAt ON writing_progress_logs(createdAt);

CREATE TABLE IF NOT EXISTS source_analysis_logs (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  sourceId TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_source_analysis_logs_projectId ON source_analysis_logs(projectId);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  seedUrl TEXT,
  seed_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_projectId ON crawl_runs(projectId);

CREATE TABLE IF NOT EXISTS crawl_pages (
  id TEXT PRIMARY KEY,
  crawlRunId TEXT,
  crawl_run_id TEXT,
  url TEXT NOT NULL,
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'fetched',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_crawlRunId ON crawl_pages(crawlRunId);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_url ON crawl_pages(url);
