PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS infra_asset_registry (
  asset_key TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  asset_group TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status_policy TEXT NOT NULL,
  probe_kind TEXT NOT NULL,
  probe_target TEXT NOT NULL,
  backup_policy TEXT NOT NULL,
  source_of_truth TEXT NOT NULL,
  notes TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS infra_asset_observation (
  id TEXT PRIMARY KEY,
  asset_key TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  diff_json TEXT,
  next_action TEXT,
  observer_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS infra_asset_backup_policy (
  asset_key TEXT PRIMARY KEY,
  backup_tier TEXT NOT NULL,
  backup_mode TEXT NOT NULL,
  retention_days INTEGER,
  remote_target TEXT,
  is_required INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_infra_asset_registry_group
  ON infra_asset_registry(asset_group);

CREATE INDEX IF NOT EXISTS idx_infra_asset_observation_asset_time
  ON infra_asset_observation(asset_key, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_infra_asset_observation_status
  ON infra_asset_observation(status);
