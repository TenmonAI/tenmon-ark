#!/bin/bash
# ============================================================
# TENMON-MC Phase 5: 会話品質サンプラー
# 毎日5件の対話をランダムサンプリングし quality.db に記録
# cron: 毎日深夜2時
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

QUALITY_DB="/var/www/tenmon-mc/quality.db"

# quality.db 初期化（冪等）
sqlite3 "$QUALITY_DB" <<'SQL'
CREATE TABLE IF NOT EXISTS quality_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_date TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  thread_id TEXT,
  content TEXT NOT NULL,
  length INTEGER NOT NULL,
  has_suika_word INTEGER DEFAULT 0,
  has_iroha_word INTEGER DEFAULT 0,
  has_kanji2_classical INTEGER DEFAULT 0,
  emoji_count INTEGER DEFAULT 0,
  evaluated INTEGER DEFAULT 0,
  score REAL,
  judge_comment TEXT
);
SQL

chmod 644 "$QUALITY_DB"
chown www-data:www-data "$QUALITY_DB" 2>/dev/null || true

# legacy_messages テーブル存在確認
TABLE_EXISTS=$(sql_ro "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='legacy_messages';")
if [ "$TABLE_EXISTS" != "1" ]; then
  echo "legacy_messages テーブルが存在しません — スキップ"
  exit 0
fi

# サンプリング対象: 直近24時間のassistant応答（最大5件）
# legacy_messages.created_at がUNIXタイムスタンプ(ms)の場合
SAMPLES=$(sql_ro "
  SELECT id, thread_id, role, content, created_at
  FROM legacy_messages
  WHERE role='assistant'
  AND CAST(created_at AS INTEGER) > (CAST(strftime('%s', 'now') AS INTEGER) - 86400) * 1000
  ORDER BY RANDOM() LIMIT 5;
")

# created_at が ISO文字列の場合のフォールバック
if [ -z "$SAMPLES" ]; then
  SAMPLES=$(sql_ro "
    SELECT id, thread_id, role, content, created_at
    FROM legacy_messages
    WHERE role='assistant'
    AND created_at > datetime('now', '-1 day')
    ORDER BY RANDOM() LIMIT 5;
  ")
fi

if [ -z "$SAMPLES" ]; then
  echo "直近24時間のassistant応答が見つかりません"
  exit 0
fi

SAMPLE_COUNT=0

echo "$SAMPLES" | while IFS='|' read -r msg_id thread_id role content created_at; do
  [ -z "$content" ] && continue

  LENGTH=${#content}

  # 水火言霊キーワード検出
  HAS_SUIKA=$(printf '%s' "$content" | grep -cE "水火|水と火|すいか" || true)
  HAS_SUIKA=$(printf '%s' "$HAS_SUIKA" | tr -d '\r\n' | grep -oE '^[0-9]+' | head -1)
  HAS_SUIKA="${HAS_SUIKA:-0}"

  # いろは・色葉キーワード検出
  HAS_IROHA=$(printf '%s' "$content" | grep -cE "いろは|イロハ|色葉" || true)
  HAS_IROHA=$(printf '%s' "$HAS_IROHA" | tr -d '\r\n' | grep -oE '^[0-9]+' | head -1)
  HAS_IROHA="${HAS_IROHA:-0}"

  # 古典的表現検出
  HAS_CLASSICAL=$(printf '%s' "$content" | grep -cE "なり|たる|べし|けり|ごとし" || true)
  HAS_CLASSICAL=$(printf '%s' "$HAS_CLASSICAL" | tr -d '\r\n' | grep -oE '^[0-9]+' | head -1)
  HAS_CLASSICAL="${HAS_CLASSICAL:-0}"

  # 絵文字カウント（簡易版: 基本的なUnicode絵文字範囲）
  EMOJI_COUNT=0

  # SQLインジェクション対策
  SAFE_CONTENT=$(printf '%s' "$content" | sed "s/'/''/g")
  SAFE_THREAD=$(printf '%s' "$thread_id" | sed "s/'/''/g")

  sqlite3 "$QUALITY_DB" "
    INSERT INTO quality_samples
    (sample_date, source_message_id, thread_id, content, length, has_suika_word, has_iroha_word, has_kanji2_classical, emoji_count)
    VALUES
    ('$(date +%Y-%m-%d)', '${msg_id}', '${SAFE_THREAD}', '${SAFE_CONTENT}', ${LENGTH}, ${HAS_SUIKA}, ${HAS_IROHA}, ${HAS_CLASSICAL}, ${EMOJI_COUNT});
  "

  SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
done

echo "品質サンプリング完了: $(date +%Y-%m-%d)"

exit 0
