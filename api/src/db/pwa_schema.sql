CREATE TABLE IF NOT EXISTS pwa_threads (
  threadId TEXT PRIMARY KEY,
  title TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS pwa_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT,
  FOREIGN KEY(threadId) REFERENCES pwa_threads(threadId)
);

CREATE INDEX IF NOT EXISTS idx_pwa_messages_threadId ON pwa_messages(threadId);

-- ============================================================
-- SYNC_PHASE_A_V1: Cross-device sync tables
-- ============================================================

CREATE TABLE IF NOT EXISTS synced_chat_threads (
  userId TEXT NOT NULL,
  threadId TEXT NOT NULL,
  title TEXT,
  folderId TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (userId, threadId)
);
CREATE INDEX IF NOT EXISTS idx_synced_threads_user_updated ON synced_chat_threads(userId, updatedAt);

CREATE TABLE IF NOT EXISTS synced_chat_folders (
  userId TEXT NOT NULL,
  folderId TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'user',
  color TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isDefault INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (userId, folderId)
);
CREATE INDEX IF NOT EXISTS idx_synced_folders_user_updated ON synced_chat_folders(userId, updatedAt);

CREATE TABLE IF NOT EXISTS synced_sukuyou_rooms (
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  threadId TEXT,
  birthDate TEXT,
  honmeiShuku TEXT,
  disasterType TEXT,
  reversalAxis TEXT,
  shortOracle TEXT,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (userId, roomId)
);
CREATE INDEX IF NOT EXISTS idx_synced_sukuyou_user_updated ON synced_sukuyou_rooms(userId, updatedAt);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  deviceId TEXT,
  eventType TEXT NOT NULL,
  detailJson TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_events_user ON sync_events(userId, createdAt);

CREATE TABLE IF NOT EXISTS sync_devices (
  userId TEXT NOT NULL,
  deviceId TEXT NOT NULL,
  lastSeenAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (userId, deviceId)
);
