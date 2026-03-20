-- TENMON-ARK Persona State Schema (SQLite)

CREATE TABLE IF NOT EXISTS persona_state (
  persona_id TEXT PRIMARY KEY,
  tone_level REAL NOT NULL CHECK(tone_level BETWEEN 0.8 AND 1.2),
  stance_level REAL NOT NULL CHECK(stance_level BETWEEN 0.8 AND 1.2),
  boundary_level REAL NOT NULL CHECK(boundary_level BETWEEN 0.8 AND 1.2),
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_naming (
  userId TEXT PRIMARY KEY,
  userName TEXT,
  assistantName TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- N1_NAMING_FLOW_V1: 名付けフロー中間状態（STEP1→STEP2→保存で削除）
CREATE TABLE IF NOT EXISTS naming_flow (
  userId TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  userName TEXT,
  assistantName TEXT,
  updatedAt TEXT NOT NULL
);

-- USER_DEVICE_MEMORY_SYNC_ENGINE_V1 (persona.sqlite — kokuzo_schema.sql は no-touch)
CREATE TABLE IF NOT EXISTS user_shared_profile_slice (
  userId TEXT NOT NULL,
  sliceKey TEXT NOT NULL CHECK(sliceKey IN ('naming','persona','style','inheritance')),
  payloadJson TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (userId, sliceKey)
);

CREATE TABLE IF NOT EXISTS user_sync_committed_item (
  userId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('fact','seed')),
  contentHash TEXT NOT NULL,
  payloadJson TEXT NOT NULL,
  committedAt TEXT NOT NULL,
  PRIMARY KEY (userId, kind, itemId)
);

CREATE TABLE IF NOT EXISTS user_device_sync_state (
  userId TEXT NOT NULL,
  deviceId TEXT NOT NULL,
  lastPullAt TEXT,
  lastPushAt TEXT,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (userId, deviceId)
);

CREATE TABLE IF NOT EXISTS user_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  deviceId TEXT,
  eventType TEXT NOT NULL,
  payloadJson TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sync_conflict_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  deviceId TEXT,
  kind TEXT NOT NULL,
  detailJson TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sync_log_uid ON user_sync_log(userId, createdAt);
CREATE INDEX IF NOT EXISTS idx_user_sync_conflict_uid ON user_sync_conflict_log(userId, createdAt);
