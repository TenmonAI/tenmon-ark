CREATE TABLE IF NOT EXISTS persona_profiles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  role_summary TEXT,
  system_mantra TEXT,
  mission TEXT,
  answer_contract TEXT,
  forbidden_behaviors_json TEXT NOT NULL DEFAULT '[]',
  tone TEXT,
  verbosity TEXT,
  strictness REAL DEFAULT 0.8,
  creativity REAL DEFAULT 0.3,
  retrieval_mode TEXT DEFAULT 'grounded_first',
  evidence_threshold REAL DEFAULT 0.75,
  hallucination_fallback TEXT DEFAULT 'admit_unknown',
  preview_isolation INTEGER NOT NULL DEFAULT 1,
  memory_inheritance_mode TEXT NOT NULL DEFAULT 'user_plus_project',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persona_versions (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  change_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persona_knowledge_bindings (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_label TEXT,
  binding_mode TEXT NOT NULL DEFAULT 'retrieve',
  priority INTEGER NOT NULL DEFAULT 50,
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persona_memory_policies (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'user_plus_project',
  policy_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_units (
  id TEXT PRIMARY KEY,
  memory_scope TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  title TEXT,
  summary TEXT NOT NULL,
  structured_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  confidence REAL DEFAULT 0.7,
  freshness_score REAL DEFAULT 0.5,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS thread_persona_links (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  link_mode TEXT NOT NULL DEFAULT 'fixed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persona_preview_sessions (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  preview_thread_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_projection_logs (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  persona_id TEXT,
  projection_json TEXT NOT NULL DEFAULT '{}',
  source_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  source_binding_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persona_deployments (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  deployment_target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_persona_profiles_status ON persona_profiles(status);
CREATE INDEX IF NOT EXISTS idx_persona_profiles_slug ON persona_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_memory_units_scope ON memory_units(memory_scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_thread_persona_links_thread ON thread_persona_links(thread_id);
