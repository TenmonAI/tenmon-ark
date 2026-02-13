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
