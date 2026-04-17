#!/bin/bash
# ============================================================
# TENMON-MC §6: データ整合性
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

cd "${REPO_PATH}" 2>/dev/null || {
  echo '{"section": "data_integrity", "error": "repo not found"}'
  exit 0
}

# Git状態
HEAD_COMMIT=$(git log -1 --format=%h 2>/dev/null || echo "unknown")
HEAD_MESSAGE=$(git log -1 --format=%s 2>/dev/null | tr '"' "'" | head -c 100)
HEAD_DATE=$(git log -1 --format=%ci 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
UNTRACKED_COUNT=$(git status --porcelain 2>/dev/null | grep -c "^??" || echo 0)
MODIFIED_COUNT=$(git status --porcelain 2>/dev/null | grep -c "^ M\|^M " || echo 0)

# バックアップファイルの数
BAK_COUNT=$(find "${REPO_PATH}" -name "*.bak_*" -o -name "*.bak" -type f 2>/dev/null | wc -l)

# feedback ファイル数
FEEDBACK_DIR="${REPO_PATH}/api/data/feedback"
FEEDBACK_FILES=0
if [ -d "$FEEDBACK_DIR" ]; then
  FEEDBACK_FILES=$(ls "$FEEDBACK_DIR" 2>/dev/null | wc -l)
fi

# SQLite ファイルサイズ
DB_SIZE="0"
if [ -f "$DB_PATH" ]; then
  DB_SIZE=$(du -h "$DB_PATH" 2>/dev/null | awk '{print $1}')
fi

# テーブル数
TABLE_COUNT=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")

# ── 期待テーブル差分検出 ──
EXPECTED_TABLES=(
  "auth_users"
  "synced_chat_threads"
  "synced_sukuyou_rooms"
  "member_status"
  "tenmon_audit_log"
  "tenmon_training_log"
  "scripture_learning_ledger"
  "kanagi_growth_ledger"
  "synapse_log"
  "khs_apply_log"
  "evolution_ledger_v1"
  "legacy_messages"
  "ark_thread_seeds"
  "kokuzo_pages"
  "reflection_queue_v1"
  "persona_profiles"
  "memory_units"
  "thread_persona_links"
  "persona_deployments"
  "sacred_corpus_registry"
  "sacred_segments"
  "philology_units"
  "truth_axes_bindings"
  "comparative_sacred_links"
)

MISSING_TABLES=""
EXPECTED_COUNT=${#EXPECTED_TABLES[@]}
FOUND_COUNT=0

for tbl in "${EXPECTED_TABLES[@]}"; do
  EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='${tbl}';")
  if [ "$EXISTS" = "1" ]; then
    FOUND_COUNT=$((FOUND_COUNT + 1))
  else
    MISSING_TABLES+="${tbl},"
  fi
done

MISSING_TABLES="${MISSING_TABLES%,}"
if [ -z "$MISSING_TABLES" ]; then
  MISSING_TABLES="none"
fi

cat <<JSON
{
  "section": "data_integrity",
  "git_head": "$(json_escape "$HEAD_COMMIT")",
  "git_head_message": "$(json_escape "$HEAD_MESSAGE")",
  "git_head_date": "$(json_escape "$HEAD_DATE")",
  "git_branch": "$(json_escape "$CURRENT_BRANCH")",
  "untracked_files": $(ensure_num "$UNTRACKED_COUNT"),
  "modified_files": $(ensure_num "$MODIFIED_COUNT"),
  "backup_files": $(ensure_num "$BAK_COUNT"),
  "feedback_files": $(ensure_num "$FEEDBACK_FILES"),
  "db_file_size": "$(json_escape "$DB_SIZE")",
  "db_table_count": $(ensure_num "$TABLE_COUNT"),
  "expected_tables_total": ${EXPECTED_COUNT},
  "expected_tables_found": ${FOUND_COUNT},
  "expected_tables_missing": "$(json_escape "$MISSING_TABLES")"
}
JSON
