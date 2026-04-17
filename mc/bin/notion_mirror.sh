#!/bin/bash
# ============================================================
# TENMON-MC Phase 4: Notion ミラー
# agents.db の未同期ログを Notion AI協議ログDBに書き込む
# 1時間ごとに cron 実行
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

# Notion token とDB ID は mc.env から読み込む
NOTION_TOKEN="${NOTION_TOKEN:-}"
NOTION_DB_ID_AI_LOG="${NOTION_DB_ID_AI_LOG:-}"

if [ -z "$NOTION_TOKEN" ] || [ -z "$NOTION_DB_ID_AI_LOG" ]; then
  echo "NOTION_TOKEN または NOTION_DB_ID_AI_LOG が未設定 — スキップ"
  exit 0
fi

AGENT_DB="/var/www/tenmon-mc/agents.db"

if [ ! -f "$AGENT_DB" ]; then
  echo "agents.db が存在しません — スキップ"
  exit 0
fi

# テーブル存在確認
for tbl in agent_logs notion_synced; do
  EXISTS=$(sqlite3 "$AGENT_DB" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${tbl}';")
  if [ "$EXISTS" != "1" ]; then
    echo "テーブル ${tbl} が存在しません — スキップ"
    exit 0
  fi
done

# 未送信の agent_logs を取得（最大10件/回）
UNSYNCED=$(sqlite3 "$AGENT_DB" <<SQL
.mode json
SELECT id, agent_name, action_type, target_area, title, content, priority, timestamp
FROM agent_logs
WHERE id NOT IN (SELECT log_id FROM notion_synced WHERE log_id IS NOT NULL)
ORDER BY id ASC
LIMIT 10;
SQL
)

# 空結果チェック
if [ -z "$UNSYNCED" ] || [ "$UNSYNCED" = "[]" ]; then
  echo "未同期ログなし"
  exit 0
fi

# 各ログを Notion に POST
echo "$UNSYNCED" | jq -c '.[]' | while read -r log; do
  LOG_ID=$(echo "$log" | jq -r '.id')
  AGENT=$(echo "$log" | jq -r '.agent_name')
  ACTION=$(echo "$log" | jq -r '.action_type')
  TARGET=$(echo "$log" | jq -r '.target_area // ""')
  TITLE=$(echo "$log" | jq -r '.title')
  CONTENT=$(echo "$log" | jq -r '.content')
  PRIORITY=$(echo "$log" | jq -r '.priority')
  TIMESTAMP=$(echo "$log" | jq -r '.timestamp')

  # Notion API へ POST
  # target_area が空の場合は対象領域プロパティを省略
  if [ -n "$TARGET" ] && [ "$TARGET" != "null" ]; then
    TARGET_PROP="\"対象領域\": { \"select\": { \"name\": \"${TARGET}\" } },"
  else
    TARGET_PROP=""
  fi

  RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer ${NOTION_TOKEN}" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg db_id "$NOTION_DB_ID_AI_LOG" \
      --arg title "$TITLE" \
      --arg agent "$AGENT" \
      --arg action "$ACTION" \
      --arg priority "$PRIORITY" \
      --arg content "$CONTENT" \
      --arg timestamp "$TIMESTAMP" \
      '{
        parent: { database_id: $db_id },
        properties: {
          "タイトル": { title: [{ text: { content: $title } }] },
          "日時": { date: { start: $timestamp } },
          "AIエージェント": { select: { name: $agent } },
          "アクションタイプ": { select: { name: $action } },
          "優先度": { select: { name: $priority } },
          "内容": { rich_text: [{ text: { content: $content } }] }
        }
      }'
    )")

  # target_area がある場合は jq で追加（上のjq -nでは条件分岐が複雑なため後付け）
  if [ -n "$TARGET" ] && [ "$TARGET" != "null" ]; then
    # 再構築: target_area 付きで再POST
    RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
      -H "Authorization: Bearer ${NOTION_TOKEN}" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "$(jq -n \
        --arg db_id "$NOTION_DB_ID_AI_LOG" \
        --arg title "$TITLE" \
        --arg agent "$AGENT" \
        --arg action "$ACTION" \
        --arg target "$TARGET" \
        --arg priority "$PRIORITY" \
        --arg content "$CONTENT" \
        --arg timestamp "$TIMESTAMP" \
        '{
          parent: { database_id: $db_id },
          properties: {
            "タイトル": { title: [{ text: { content: $title } }] },
            "日時": { date: { start: $timestamp } },
            "AIエージェント": { select: { name: $agent } },
            "アクションタイプ": { select: { name: $action } },
            "対象領域": { select: { name: $target } },
            "優先度": { select: { name: $priority } },
            "内容": { rich_text: [{ text: { content: $content } }] }
          }
        }'
      )")
  fi

  # 成功したら notion_synced に記録
  if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    NOTION_PAGE_ID=$(echo "$RESPONSE" | jq -r '.id')
    sqlite3 "$AGENT_DB" "
      INSERT OR IGNORE INTO notion_synced (log_id, notion_page_id)
      VALUES (${LOG_ID}, '${NOTION_PAGE_ID}');
    "
    echo "Synced log #${LOG_ID} → Notion ${NOTION_PAGE_ID}"
  else
    echo "Failed to sync log #${LOG_ID}: $RESPONSE"
  fi
done

exit 0
