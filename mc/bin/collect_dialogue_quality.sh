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

# conversation_log テーブル存在確認 (§8 V2: legacy_messages → conversation_log 優先)
CL_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='conversation_log';")
# legacy_messages テーブル存在確認 (フォールバック)
LM_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='legacy_messages';")
# ark_thread_seeds テーブル存在確認
ATS_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ark_thread_seeds';")
# memory_projection_logs テーブル存在確認 (§14: 記憶循環健全性)
MPL_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='memory_projection_logs';")
# truth_axes_bindings テーブル存在確認 (§15: truth_axis 統計)
TAB_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='truth_axes_bindings';")

# 対話品質指標 (§8 V2: conversation_log 優先、legacy_messages フォールバック)
AVG_LEN_24H="0"
MAX_LEN_24H="0"
LONGFORM_COUNT="0"
TOTAL_RESPONSES_24H="0"

if [ "$CL_EXISTS" = "1" ]; then
  AVG_LEN_24H=$(sql_ro "
    SELECT COALESCE(CAST(AVG(LENGTH(content)) AS INTEGER), 0) FROM conversation_log 
    WHERE role='assistant' 
    AND created_at > datetime('now', '-24 hours');
  ")

  MAX_LEN_24H=$(sql_ro "
    SELECT COALESCE(MAX(LENGTH(content)), 0) FROM conversation_log 
    WHERE role='assistant' 
    AND created_at > datetime('now', '-24 hours');
  ")

  LONGFORM_COUNT=$(sql_ro "
    SELECT COUNT(*) FROM conversation_log 
    WHERE role='assistant' 
    AND LENGTH(content) > 5000
    AND created_at > datetime('now', '-24 hours');
  ")

  TOTAL_RESPONSES_24H=$(sql_ro "
    SELECT COUNT(*) FROM conversation_log 
    WHERE role='assistant' 
    AND created_at > datetime('now', '-24 hours');
  ")
elif [ "$LM_EXISTS" = "1" ]; then
  # フォールバック: legacy_messages
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

# §13: KHS_CORE 適用率 (truth_axes_bindings から)
KHS_CORE_APPLIED_24H="0"
TRUTH_AXES_UNIQUE_24H="0"

if [ "$TAB_EXISTS" = "1" ]; then
  KHS_CORE_APPLIED_24H=$(sql_ro "
    SELECT COUNT(*) FROM truth_axes_bindings
    WHERE created_at > datetime('now', '-24 hours');
  ")
  TRUTH_AXES_UNIQUE_24H=$(sql_ro "
    SELECT COUNT(DISTINCT axis_name) FROM truth_axes_bindings
    WHERE created_at > datetime('now', '-24 hours');
  ")
fi

# §14: 記憶循環健全性 (memory_projection_logs から)
MEMORY_PROJ_24H="0"
MEMORY_PROJ_AVG_ITEMS="0"

if [ "$MPL_EXISTS" = "1" ]; then
  MEMORY_PROJ_24H=$(sql_ro "
    SELECT COUNT(*) FROM memory_projection_logs
    WHERE created_at > datetime('now', '-24 hours');
  ")
  MEMORY_PROJ_AVG_ITEMS=$(sql_ro "
    SELECT COALESCE(CAST(AVG(item_count) AS INTEGER), 0) FROM memory_projection_logs
    WHERE created_at > datetime('now', '-24 hours');
  ")
fi

# §15: プロンプト品質 (satori_verdict から - conversation_log 内のメタデータ)
SATORI_AVG_SCORE="0"
SATORI_OMEGA_COMPLIANT_24H="0"

if [ "$CL_EXISTS" = "1" ]; then
  # satori_score カラムが存在する場合のみ
  HAS_SATORI_COL=$(sql_ro "SELECT COUNT(*) FROM pragma_table_info('conversation_log') WHERE name='satori_score';")
  if [ "$HAS_SATORI_COL" = "1" ]; then
    SATORI_AVG_SCORE=$(sql_ro "
      SELECT COALESCE(CAST(AVG(satori_score) * 100 AS INTEGER), 0) FROM conversation_log
      WHERE role='assistant' AND satori_score IS NOT NULL
      AND created_at > datetime('now', '-24 hours');
    ")
    SATORI_OMEGA_COMPLIANT_24H=$(sql_ro "
      SELECT COUNT(*) FROM conversation_log
      WHERE role='assistant' AND satori_score >= 0.7
      AND created_at > datetime('now', '-24 hours');
    ")
  fi
fi

# §16: コトダマ秘書活用率 (synapse_log から kotodama_hisho タグ)
KOTODAMA_HISHO_HITS_24H="0"
SYNAPSE_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='synapse_log';")
if [ "$SYNAPSE_EXISTS" = "1" ]; then
  KOTODAMA_HISHO_HITS_24H=$(sql_ro "
    SELECT COUNT(*) FROM synapse_log
    WHERE tag LIKE '%kotodama_hisho%'
    AND createdAt > datetime('now', '-24 hours');
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
  "total_seeds_24h": $(ensure_num "$TOTAL_SEEDS"),
  "khs_core_applied_24h": $(ensure_num "$KHS_CORE_APPLIED_24H"),
  "truth_axes_unique_24h": $(ensure_num "$TRUTH_AXES_UNIQUE_24H"),
  "memory_projection_24h": $(ensure_num "$MEMORY_PROJ_24H"),
  "memory_projection_avg_items": $(ensure_num "$MEMORY_PROJ_AVG_ITEMS"),
  "satori_avg_score_pct": $(ensure_num "$SATORI_AVG_SCORE"),
  "satori_omega_compliant_24h": $(ensure_num "$SATORI_OMEGA_COMPLIANT_24H"),
  "kotodama_hisho_hits_24h": $(ensure_num "$KOTODAMA_HISHO_HITS_24H")
}
JSON
