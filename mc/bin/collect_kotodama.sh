#!/bin/bash
# ============================================================
# TENMON-MC §3: 言霊連携 発火率
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

# chat.ts 内の言霊連携コード確認
CHAT_TS="${REPO_PATH}/api/src/routes/chat.ts"
KOTODAMA_REFS=0
if [ -f "$CHAT_TS" ]; then
  KOTODAMA_REFS=$(grep -c -iE "kotodama|水火|いろは|iroha" "$CHAT_TS" 2>/dev/null || true)
fi

# 直近24時間のログで「水火」が応答に含まれた回数
FIRE_WATER_24H=$(journalctl -u "$SERVICE_NAME" --since "24 hours ago" --no-pager 2>/dev/null | grep -c "水火" || true)
KOTODAMA_24H=$(journalctl -u "$SERVICE_NAME" --since "24 hours ago" --no-pager 2>/dev/null | grep -c -E "kotodama_fire|iroha_sound|kotodama" || true)

# kotodamaConnector.ts が git tracked か
KOTODAMA_TRACKED=0
if cd "${REPO_PATH}" 2>/dev/null; then
  KOTODAMA_TRACKED=$(git ls-files "api/src/kotodama/kotodamaConnector.ts" 2>/dev/null | wc -l)
fi

# 言霊関連ファイルの存在確認
KOTODAMA_FILES=$(find "${REPO_PATH}/api/src" -name "*kotodama*" -o -name "*iroha*" 2>/dev/null | wc -l)

cat <<JSON
{
  "section": "kotodama",
  "chat_ts_references": $(ensure_num "$KOTODAMA_REFS"),
  "fire_water_in_logs_24h": $(ensure_num "$FIRE_WATER_24H"),
  "kotodama_fire_in_logs_24h": $(ensure_num "$KOTODAMA_24H"),
  "connector_tracked_in_git": $(ensure_num "$KOTODAMA_TRACKED"),
  "kotodama_related_files": $(ensure_num "$KOTODAMA_FILES")
}
JSON
