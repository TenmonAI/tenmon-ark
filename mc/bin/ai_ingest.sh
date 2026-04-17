#!/bin/bash
# ============================================================
# TENMON-MC Phase 4: AI Agent Inbox 取り込み
# /var/www/tenmon-mc/inbox/*.json → agents.db
# cron で 1分毎に実行
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

INBOX="/var/www/tenmon-mc/inbox"
AGENT_DB="/var/www/tenmon-mc/agents.db"
ARCHIVE="/var/www/tenmon-mc/inbox_archive"

mkdir -p "$ARCHIVE"
[ ! -d "$INBOX" ] && exit 0
[ ! -f "$AGENT_DB" ] && exit 0

for file in "$INBOX"/*.json; do
  [ ! -f "$file" ] && continue

  # JSONが妥当か確認
  if ! jq empty "$file" 2>/dev/null; then
    mv "$file" "${ARCHIVE}/invalid_$(basename "$file")"
    continue
  fi

  # トークン検証
  TOKEN=$(jq -r '.token // empty' "$file")
  AGENT=$(jq -r '.agent_name // empty' "$file")

  if [ -z "$TOKEN" ] || [ -z "$AGENT" ]; then
    mv "$file" "${ARCHIVE}/no_auth_$(basename "$file")"
    continue
  fi

  # トークンハッシュ検証
  TOKEN_HASH=$(echo -n "$TOKEN" | sha256sum | cut -d' ' -f1)
  VALID=$(sqlite3 "$AGENT_DB" "
    SELECT COUNT(*) FROM agent_tokens
    WHERE token_hash='${TOKEN_HASH}'
    AND agent_name='${AGENT}'
    AND is_active=1;
  ")

  if [ "$VALID" != "1" ]; then
    mv "$file" "${ARCHIVE}/invalid_token_$(basename "$file")"
    continue
  fi

  # フィールド抽出（SQLインジェクション対策: シングルクォートをエスケープ）
  ACTION_TYPE=$(jq -r '.action_type // "observation"' "$file" | tr -d "'\"")
  TARGET_AREA=$(jq -r '.target_area // ""' "$file" | tr -d "'\"")
  TITLE=$(jq -r '.title // "Untitled"' "$file" | sed "s/'/''/g")
  CONTENT=$(jq -r '.content // ""' "$file" | sed "s/'/''/g")
  PRIORITY=$(jq -r '.priority // "medium"' "$file" | tr -d "'\"")
  REF_URL=$(jq -r '.reference_url // ""' "$file" | sed "s/'/''/g")
  AGENT_VER=$(jq -r '.agent_version // ""' "$file" | tr -d "'\"")

  # 挿入
  sqlite3 "$AGENT_DB" "
    INSERT INTO agent_logs
    (agent_name, agent_version, action_type, target_area, title, content, priority, reference_url)
    VALUES
    ('${AGENT}', '${AGENT_VER}', '${ACTION_TYPE}', '${TARGET_AREA}', '${TITLE}', '${CONTENT}', '${PRIORITY}', '${REF_URL}');

    UPDATE agent_tokens SET last_used_at = datetime('now') WHERE token_hash='${TOKEN_HASH}';
  "

  mv "$file" "${ARCHIVE}/$(date +%Y%m%d_%H%M%S)_$(basename "$file")"
done

# 30日以上前のアーカイブ削除
find "$ARCHIVE" -name "*.json" -mtime +30 -delete 2>/dev/null

exit 0
