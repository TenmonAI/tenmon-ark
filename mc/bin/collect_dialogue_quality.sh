#!/bin/bash
# ============================================================
# TENMON-MC §8: 対話品質指標
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  echo '{"section":"dialogue_quality","error":"db not found"}'
  exit 0
fi

# legacy_messages テーブル存在確認
LM_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='legacy_messages';")
# ark_thread_seeds テーブル存在確認
ATS_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ark_thread_seeds';")

# legacy_messages からの指標
AVG_LEN_24H="0"
MAX_LEN_24H="0"
LONGFORM_COUNT="0"
TOTAL_RESPONSES_24H="0"

if [ "$LM_EXISTS" = "1" ]; then
  AVG_LEN_24H=$(sql_ro "
    SELECT AVG(LENGTH(content)) FROM legacy_messages 
    WHERE role='assistant' 
    AND created_at > (strftime('%s', 'now') - 86400);
  ")

  MAX_LEN_24H=$(sql_ro "
    SELECT MAX(LENGTH(content)) FROM legacy_messages 
    WHERE role='assistant' 
    AND created_at > (strftime('%s', 'now') - 86400);
  ")

  LONGFORM_COUNT=$(sql_ro "
    SELECT COUNT(*) FROM legacy_messages 
    WHERE role='assistant' 
    AND LENGTH(content) > 5000
    AND created_at > (strftime('%s', 'now') - 86400);
  ")

  TOTAL_RESPONSES_24H=$(sql_ro "
    SELECT COUNT(*) FROM legacy_messages 
    WHERE role='assistant' 
    AND created_at > (strftime('%s', 'now') - 86400);
  ")
fi

# ark_thread_seeds からの指標
SEEDS_WITH_SCRIPTURE="0"
TOTAL_SEEDS="0"

if [ "$ATS_EXISTS" = "1" ]; then
  SEEDS_WITH_SCRIPTURE=$(sql_ro "
    SELECT COUNT(*) FROM ark_thread_seeds 
    WHERE scriptureKey IS NOT NULL 
    AND createdAt > datetime('now', '-24 hours');
  ")

  TOTAL_SEEDS=$(sql_ro "
    SELECT COUNT(*) FROM ark_thread_seeds 
    WHERE createdAt > datetime('now', '-24 hours');
  ")
fi

cat <<JSON
{
  "section": "dialogue_quality",
  "avg_response_length_24h": "$(ensure_num "${AVG_LEN_24H%.*}")",
  "max_response_length_24h": $(ensure_num "$MAX_LEN_24H"),
  "longform_count_24h": $(ensure_num "$LONGFORM_COUNT"),
  "total_responses_24h": $(ensure_num "$TOTAL_RESPONSES_24H"),
  "seeds_with_scripture_24h": $(ensure_num "$SEEDS_WITH_SCRIPTURE"),
  "total_seeds_24h": $(ensure_num "$TOTAL_SEEDS")
}
JSON
