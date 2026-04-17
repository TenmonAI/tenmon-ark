#!/bin/bash
# ============================================================
# TENMON-MC §9: Notion 同期状況
# Notion API 呼び出し不要、ローカルSQLiteのキャッシュから推定
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  echo '{"section":"notion_sync","error":"db not found"}'
  exit 0
fi

# テーブル存在確認
KP_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='kokuzo_pages';")
RQ_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='reflection_queue_v1';")

# kokuzo_pages からの指標
NOTION_PAGES="0"
LAST_NOTION_SYNC="null"

if [ "$KP_EXISTS" = "1" ]; then
  NOTION_PAGES=$(sql_ro "
    SELECT COUNT(DISTINCT doc) FROM kokuzo_pages 
    WHERE doc LIKE 'NOTION:PAGE:%';
  ")

  LAST_NOTION_SYNC=$(sql_ro "
    SELECT MAX(updatedAt) FROM kokuzo_pages 
    WHERE doc LIKE 'NOTION:PAGE:%';
  ")
fi

# reflection_queue からの指標
PENDING_REFLECTIONS="0"

if [ "$RQ_EXISTS" = "1" ]; then
  PENDING_REFLECTIONS=$(sql_ro "
    SELECT COUNT(*) FROM reflection_queue_v1 
    WHERE status='pending' 
    AND notion_mirror_page_id IS NULL;
  ")
fi

cat <<JSON
{
  "section": "notion_sync",
  "notion_pages_cached": $(ensure_num "$NOTION_PAGES"),
  "pending_reflections": $(ensure_num "$PENDING_REFLECTIONS"),
  "last_notion_sync": "$(json_string_safe "$LAST_NOTION_SYNC")",
  "known_dbs": {
    "27shuku_db": "faec16f53d024b9fa16ca893e0dd335a",
    "kyusei_sukuyou_matrix": "31daf1ad4d2b41e0964feaa8d9fef2e3"
  }
}
JSON
