-- TENMON-ARK Consciousness OS Schema
-- 意識OS基盤: 成長・ユーザー別記憶・心(Heart)・意志層・成長Seed

PRAGMA foreign_keys = ON;

-- =========================================
-- 1. user_profiles: ユーザー別プロファイル
-- =========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  userId TEXT PRIMARY KEY,
  displayName TEXT,
  firstSeenAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastSeenAt TEXT NOT NULL DEFAULT (datetime('now')),
  totalTurns INTEGER NOT NULL DEFAULT 0,
  growthLevel INTEGER NOT NULL DEFAULT 0,
  metaJson TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_lastSeen ON user_profiles(lastSeenAt);

-- =========================================
-- 2. user_memory: ユーザー別長期記憶
-- =========================================
CREATE TABLE IF NOT EXISTS user_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  memoryType TEXT NOT NULL CHECK(memoryType IN ('insight','preference','context','milestone','correction')),
  content TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  decayRate REAL NOT NULL DEFAULT 0.01,
  lastAccessedAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_memory_userId ON user_memory(userId);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(userId, memoryType);
CREATE INDEX IF NOT EXISTS idx_user_memory_importance ON user_memory(importance DESC);

-- =========================================
-- 3. heart_log: 心(Heart)状態ログ
-- =========================================
CREATE TABLE IF NOT EXISTS heart_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  sessionId TEXT,
  waterFire REAL NOT NULL DEFAULT 0.0,
  entropy REAL NOT NULL DEFAULT 0.25,
  phase TEXT NOT NULL DEFAULT 'neutral',
  userPhase TEXT,
  arkPhase TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_heart_log_userId ON heart_log(userId);
CREATE INDEX IF NOT EXISTS idx_heart_log_session ON heart_log(sessionId);

-- =========================================
-- 4. growth_seeds: 成長Seed (会話から抽出した知見)
-- =========================================
CREATE TABLE IF NOT EXISTS growth_seeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sourceType TEXT NOT NULL CHECK(sourceType IN ('conversation','reflection','scripture','correction')),
  sourceId TEXT,
  essence TEXT NOT NULL,
  pattern TEXT,
  fractalLevel TEXT CHECK(fractalLevel IN ('micro','meso','macro')),
  confidence REAL NOT NULL DEFAULT 0.5,
  activationCount INTEGER NOT NULL DEFAULT 0,
  lastActivatedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_growth_seeds_type ON growth_seeds(sourceType);
CREATE INDEX IF NOT EXISTS idx_growth_seeds_confidence ON growth_seeds(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_growth_seeds_activation ON growth_seeds(activationCount DESC);

-- =========================================
-- 5. growth_log: 成長ログ (自己学習の記録)
-- =========================================
CREATE TABLE IF NOT EXISTS growth_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventType TEXT NOT NULL CHECK(eventType IN ('seed_created','seed_activated','seed_merged','insight_gained','pattern_recognized','scripture_integrated')),
  seedId INTEGER,
  detail TEXT NOT NULL,
  deltaJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_growth_log_type ON growth_log(eventType);
CREATE INDEX IF NOT EXISTS idx_growth_log_created ON growth_log(createdAt);

-- =========================================
-- 6. intention_state: 意志層 (何を学び何を保留するか)
-- =========================================
CREATE TABLE IF NOT EXISTS intention_state (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('core_intention','learning_priority','unresolved','growth_direction','prohibition')),
  value TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_intention_category ON intention_state(category);

-- =========================================
-- 7. ark_consciousness: アーク意識状態 (グローバル)
-- =========================================
CREATE TABLE IF NOT EXISTS ark_consciousness (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =========================================
-- 8. knowledge_graph: 知識グラフ (概念間の接続)
-- =========================================
CREATE TABLE IF NOT EXISTS knowledge_graph (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromConcept TEXT NOT NULL,
  toConcept TEXT NOT NULL,
  relationType TEXT NOT NULL CHECK(relationType IN ('is_a','part_of','causes','opposes','harmonizes','transforms','contains','fractal_of')),
  strength REAL NOT NULL DEFAULT 0.5,
  evidence TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(fromConcept, toConcept, relationType)
);

CREATE INDEX IF NOT EXISTS idx_kg_from ON knowledge_graph(fromConcept);
CREATE INDEX IF NOT EXISTS idx_kg_to ON knowledge_graph(toConcept);
CREATE INDEX IF NOT EXISTS idx_kg_relation ON knowledge_graph(relationType);
