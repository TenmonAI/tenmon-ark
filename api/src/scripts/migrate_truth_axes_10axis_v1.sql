-- ============================================================
-- TRUTH_AXES_BINDINGS 10軸マイグレーション
-- 旧7軸 → 新10軸 (KHS_CORE_v1 正式)
-- 
-- 実行方法:
--   sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite < migrate_truth_axes_10axis_v1.sql
--
-- 安全設計:
--   - 旧テーブルは truth_axes_bindings_legacy として保存
--   - トランザクション保護
--   - 冪等（2回実行しても安全）
-- ============================================================

BEGIN TRANSACTION;

-- 1. 旧テーブルのバックアップ（存在する場合のみ）
CREATE TABLE IF NOT EXISTS truth_axes_bindings_legacy AS
  SELECT * FROM truth_axes_bindings WHERE 0;
INSERT OR IGNORE INTO truth_axes_bindings_legacy
  SELECT * FROM truth_axes_bindings;

-- 2. 旧テーブル削除
DROP TABLE IF EXISTS truth_axes_bindings;

-- 3. 新テーブル作成（10軸 CHECK 制約付き）
CREATE TABLE truth_axes_bindings (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  axis_key TEXT NOT NULL CHECK (
    axis_key IN (
      'cycle', 'polarity', 'center', 'breath', 'carami',
      'order', 'correspondence', 'manifestation',
      'purification', 'governance'
    )
  ),
  confidence REAL NOT NULL DEFAULT 0.5,
  binding_reason TEXT,
  evidence_refs TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (segment_id) REFERENCES sacred_segments(id)
);

-- 4. インデックス再作成
CREATE INDEX idx_truth_axes_bindings_segment_axis
  ON truth_axes_bindings(segment_id, axis_key);
CREATE INDEX idx_truth_axes_bindings_axis_conf
  ON truth_axes_bindings(axis_key, confidence);

-- 5. 旧データのうち新10軸に該当するものを移行
INSERT OR IGNORE INTO truth_axes_bindings
  (id, segment_id, axis_key, confidence, binding_reason, createdAt, updatedAt)
SELECT
  id, segment_id, axis_key, confidence, binding_reason, createdAt, updatedAt
FROM truth_axes_bindings_legacy
WHERE axis_key IN (
  'cycle', 'polarity', 'center', 'breath', 'carami',
  'order', 'correspondence', 'manifestation',
  'purification', 'governance'
);

COMMIT;

-- 確認
SELECT 'migration_complete' as status,
       (SELECT COUNT(*) FROM truth_axes_bindings) as new_count,
       (SELECT COUNT(*) FROM truth_axes_bindings_legacy) as legacy_count;
