#!/usr/bin/env bash
# TENMON_REMOTE_CURSOR — Mac 上の Cursor エージェント: ready カードを pull して inbox に保存
set -euo pipefail
BASE_URL="${TENMON_REMOTE_CURSOR_BASE_URL:-http://127.0.0.1:3000}"
KEY="${FOUNDER_KEY:-${TENMON_REMOTE_CURSOR_FOUNDER_KEY:-}}"
INBOX="${TENMON_REMOTE_CURSOR_INBOX:-$HOME/TenmonRemoteCursor/inbox}"
# 空: 通常キュー。1: 高リスク dry_run のみ
DRY="${TENMON_REMOTE_CURSOR_DRY_ONLY:-0}"

if [[ -z "$KEY" ]]; then
  echo "Set FOUNDER_KEY or TENMON_REMOTE_CURSOR_FOUNDER_KEY" >&2
  exit 1
fi

mkdir -p "$INBOX"
QS=""
if [[ "$DRY" == "1" ]]; then
  QS="?dry_run_only=1"
fi

resp=$(curl -sS "$BASE_URL/api/admin/cursor/next$QS" -H "X-Founder-Key: $KEY")
ok=$(echo "$resp" | jq -r '.ok // false')
item=$(echo "$resp" | jq -c '.item // empty')
if [[ "$ok" != "true" || -z "$item" || "$item" == "null" ]]; then
  echo "$resp" | jq .
  exit 0
fi

id=$(echo "$resp" | jq -r '.item.id')
name=$(echo "$resp" | jq -r '.item.card_name')
ts=$(date -u +%Y%m%dT%H%M%SZ)
safe=$(echo "$name" | tr -c 'A-Za-z0-9._-' '_')
out="$INBOX/${ts}__${id}__${safe}.md"
echo "$resp" | jq -r '.item | "# " + .card_name + "\n\n<!-- remote_cursor_queue_id: " + .id + " -->\n<!-- leased_until: " + (.leased_until // "") + " -->\n\n" + (.card_body_md // "")' > "$out"

echo "Wrote $out"
jq -n --arg p "$out" '{ok:true,path:$p}'
