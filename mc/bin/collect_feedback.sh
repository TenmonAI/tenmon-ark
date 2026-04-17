#!/bin/bash
# ============================================================
# TENMON-MC §12: ユーザーフィードバック
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

FEEDBACK_DIR="${REPO_PATH}/api/data/feedback"
TOTAL_FEEDBACK=0
RECENT_7D=0
RATING_SUM=0
RATING_COUNT=0

if [ -d "$FEEDBACK_DIR" ]; then
  TOTAL_FEEDBACK=$(find "$FEEDBACK_DIR" -name "FB-*.json" 2>/dev/null | wc -l)
  RECENT_7D=$(find "$FEEDBACK_DIR" -name "FB-*.json" -mtime -7 2>/dev/null | wc -l)

  # rating 平均（JSON内にratingフィールドがあれば）
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    RATING=$(jq -r '.rating // empty' "$file" 2>/dev/null)
    if [ -n "$RATING" ] && [ "$RATING" != "null" ]; then
      RATING_SUM=$(echo "$RATING_SUM + $RATING" | bc 2>/dev/null || echo "$RATING_SUM")
      RATING_COUNT=$((RATING_COUNT + 1))
    fi
  done < <(find "$FEEDBACK_DIR" -name "FB-*.json" -mtime -30 2>/dev/null)
fi

AVG_RATING="0"
if [ "$RATING_COUNT" -gt 0 ]; then
  AVG_RATING=$(echo "scale=2; $RATING_SUM / $RATING_COUNT" | bc 2>/dev/null || echo "0")
fi

cat <<JSON
{
  "section": "user_feedback",
  "total_feedback_files": $(ensure_num "$TOTAL_FEEDBACK"),
  "feedback_last_7days": $(ensure_num "$RECENT_7D"),
  "avg_rating_last_30days": "$(json_string_safe "$AVG_RATING")",
  "rating_sample_size": $(ensure_num "$RATING_COUNT")
}
JSON
