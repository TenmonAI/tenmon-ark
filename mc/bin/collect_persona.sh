#!/bin/bash
# ============================================================
# TENMON-MC §10: ペルソナシステム
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  echo '{"section":"persona_system","error":"db not found"}'
  exit 0
fi

# テーブル存在確認
PP_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='persona_profiles';")
MU_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='memory_units';")
TPL_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='thread_persona_links';")
PD_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='persona_deployments';")

# persona_profiles からの指標
TOTAL_PERSONAS="0"
ACTIVE_PERSONAS="0"

if [ "$PP_EXISTS" = "1" ]; then
  TOTAL_PERSONAS=$(sql_ro "SELECT COUNT(*) FROM persona_profiles;")
  ACTIVE_PERSONAS=$(sql_ro "SELECT COUNT(*) FROM persona_profiles WHERE status='active';")
fi

# memory_units からの指標
TOTAL_MEMORY_UNITS="0"

if [ "$MU_EXISTS" = "1" ]; then
  TOTAL_MEMORY_UNITS=$(sql_ro "SELECT COUNT(*) FROM memory_units;")
fi

# thread_persona_links からの指標
THREAD_LINKS="0"

if [ "$TPL_EXISTS" = "1" ]; then
  THREAD_LINKS=$(sql_ro "SELECT COUNT(*) FROM thread_persona_links;")
fi

# persona_deployments からの指標
LAST_DEPLOY="null"

if [ "$PD_EXISTS" = "1" ]; then
  LAST_DEPLOY=$(sql_ro "SELECT MAX(created_at) FROM persona_deployments;")
fi

cat <<JSON
{
  "section": "persona_system",
  "total_personas": $(ensure_num "$TOTAL_PERSONAS"),
  "active_personas": $(ensure_num "$ACTIVE_PERSONAS"),
  "total_memory_units": $(ensure_num "$TOTAL_MEMORY_UNITS"),
  "thread_persona_links": $(ensure_num "$THREAD_LINKS"),
  "last_deployment": "$(json_string_safe "$LAST_DEPLOY")"
}
JSON
