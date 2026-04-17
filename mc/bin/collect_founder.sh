#!/bin/bash
# ============================================================
# TENMON-MC §4: ファウンダー運用状況
# 出力: JSON (stdout)
#
# 実テーブル: auth_users, synced_chat_threads,
#             synced_sukuyou_rooms, member_status
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  cat <<JSON
{
  "section": "founder",
  "error": "db not found at ${DB_PATH}"
}
JSON
  exit 0
fi

# 総ユーザー数 (auth_users)
TOTAL_USERS=$(sql_ro "SELECT COUNT(*) FROM auth_users;")

# メンバーステータス別集計
ACTIVE_MEMBERS=$(sql_ro "SELECT COUNT(*) FROM member_status WHERE status='active';")
TOTAL_MEMBERS=$(sql_ro "SELECT COUNT(*) FROM member_status;")

# 7日間アクティブユーザー (synced_chat_threads の updatedAt で判定)
ACTIVE_7D=$(sql_ro "SELECT COUNT(DISTINCT userId) FROM synced_chat_threads WHERE updatedAt > datetime('now', '-7 days');")

# 7日間の鑑定数 (synced_sukuyou_rooms)
KANTEI_7D=$(sql_ro "SELECT COUNT(*) FROM synced_sukuyou_rooms WHERE updatedAt > datetime('now', '-7 days');")

# 宿分布 (synced_sukuyou_rooms.honmeiShuku)
SHUKU_DIST=$(sql_ro "SELECT honmeiShuku, COUNT(*) FROM synced_sukuyou_rooms WHERE honmeiShuku IS NOT NULL AND honmeiShuku != '' GROUP BY honmeiShuku ORDER BY COUNT(*) DESC;" | awk -F'|' '{printf "\"%s\":%s,", $1, $2}' | sed 's/,$//')

# 総鑑定数
TOTAL_KANTEI=$(sql_ro "SELECT COUNT(*) FROM synced_sukuyou_rooms WHERE honmeiShuku IS NOT NULL AND honmeiShuku != '';")

cat <<JSON
{
  "section": "founder",
  "total_users": $(ensure_num "$TOTAL_USERS"),
  "active_members": $(ensure_num "$ACTIVE_MEMBERS"),
  "total_members": $(ensure_num "$TOTAL_MEMBERS"),
  "active_last_7days": $(ensure_num "$ACTIVE_7D"),
  "kantei_count_7days": $(ensure_num "$KANTEI_7D"),
  "total_kantei": $(ensure_num "$TOTAL_KANTEI"),
  "shuku_distribution": {${SHUKU_DIST:-}}
}
JSON
