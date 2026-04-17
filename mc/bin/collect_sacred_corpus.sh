#!/bin/bash
# ============================================================
# TENMON-MC §11: 神聖典籍コーパス
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  echo '{"section":"sacred_corpus","error":"db not found"}'
  exit 0
fi

# テーブル存在確認
SCR_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sacred_corpus_registry';")
SS_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sacred_segments';")
PU_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='philology_units';")
TAB_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='truth_axes_bindings';")
CSL_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='comparative_sacred_links';")

# sacred_corpus_registry
TOTAL_CORPUS="0"
if [ "$SCR_EXISTS" = "1" ]; then
  TOTAL_CORPUS=$(sql_ro "SELECT COUNT(*) FROM sacred_corpus_registry;")
fi

# sacred_segments
TOTAL_SEGMENTS="0"
if [ "$SS_EXISTS" = "1" ]; then
  TOTAL_SEGMENTS=$(sql_ro "SELECT COUNT(*) FROM sacred_segments;")
fi

# philology_units
TOTAL_PHILOLOGY="0"
if [ "$PU_EXISTS" = "1" ]; then
  TOTAL_PHILOLOGY=$(sql_ro "SELECT COUNT(*) FROM philology_units;")
fi

# truth_axes_bindings
TOTAL_AXIS_BINDINGS="0"
AXIS_JSON=""
if [ "$TAB_EXISTS" = "1" ]; then
  TOTAL_AXIS_BINDINGS=$(sql_ro "SELECT COUNT(*) FROM truth_axes_bindings;")

  # 7真理軸別集計
  AXIS_DIST=$(sql_ro "
    SELECT axis_key, COUNT(*) FROM truth_axes_bindings 
    GROUP BY axis_key ORDER BY COUNT(*) DESC;
  ")

  if [ "$AXIS_DIST" != "null" ] && [ -n "$AXIS_DIST" ]; then
    AXIS_JSON=$(echo "$AXIS_DIST" | awk -F'|' 'NF==2 && $1 != "" && $2 != "" {printf "\"%s\":%s,", $1, $2}' | sed 's/,$//')
  fi
fi

# comparative_sacred_links
COMP_LINKS="0"
if [ "$CSL_EXISTS" = "1" ]; then
  COMP_LINKS=$(sql_ro "SELECT COUNT(*) FROM comparative_sacred_links;")
fi

cat <<JSON
{
  "section": "sacred_corpus",
  "total_corpus_registered": $(ensure_num "$TOTAL_CORPUS"),
  "total_segments": $(ensure_num "$TOTAL_SEGMENTS"),
  "total_philology_units": $(ensure_num "$TOTAL_PHILOLOGY"),
  "total_axis_bindings": $(ensure_num "$TOTAL_AXIS_BINDINGS"),
  "truth_axes_distribution": {${AXIS_JSON:-}},
  "comparative_links": $(ensure_num "$COMP_LINKS")
}
JSON
