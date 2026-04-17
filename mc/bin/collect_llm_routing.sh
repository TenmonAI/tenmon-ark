#!/bin/bash
# ============================================================
# TENMON-MC §7: LLMルーティング統計
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  echo '{"section":"llm_routing","error":"db not found"}'
  exit 0
fi

# テーブル存在確認
TBL_EXISTS=$(sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='synapse_log';")

if [ "$TBL_EXISTS" != "1" ]; then
  cat <<JSON
{
  "section": "llm_routing",
  "total_synapse_24h": 0,
  "kantei_routes_24h": 0,
  "deep_reports_24h": 0,
  "route_distribution": {},
  "error": "synapse_log table not found"
}
JSON
  exit 0
fi

# synapse_log から24h ルート別集計
ROUTES_24H=$(sql_ro "
  SELECT routeReason, COUNT(*) 
  FROM synapse_log 
  WHERE createdAt > datetime('now', '-24 hours')
  GROUP BY routeReason 
  ORDER BY COUNT(*) DESC;
")

ROUTE_JSON=""
if [ "$ROUTES_24H" != "null" ] && [ -n "$ROUTES_24H" ]; then
  ROUTE_JSON=$(echo "$ROUTES_24H" | awk -F'|' 'NF==2 && $1 != "" && $2 != "" {printf "\"%s\":%s,", $1, $2}' | sed 's/,$//')
fi

# 鑑定関連route数
KANTEI_ROUTES=$(sql_ro "
  SELECT COUNT(*) FROM synapse_log 
  WHERE createdAt > datetime('now', '-24 hours') 
  AND (routeReason LIKE '%sukuyou%' OR routeReason LIKE '%kantei%');
")

# deep_report 発火数
DEEP_REPORTS_24H=$(sql_ro "
  SELECT COUNT(*) FROM synapse_log 
  WHERE createdAt > datetime('now', '-24 hours') 
  AND routeReason LIKE '%deep_report%';
")

# 総synapse数
TOTAL_SYNAPSE_24H=$(sql_ro "
  SELECT COUNT(*) FROM synapse_log 
  WHERE createdAt > datetime('now', '-24 hours');
")

cat <<JSON
{
  "section": "llm_routing",
  "total_synapse_24h": $(ensure_num "$TOTAL_SYNAPSE_24H"),
  "kantei_routes_24h": $(ensure_num "$KANTEI_ROUTES"),
  "deep_reports_24h": $(ensure_num "$DEEP_REPORTS_24H"),
  "route_distribution": {${ROUTE_JSON:-}}
}
JSON
