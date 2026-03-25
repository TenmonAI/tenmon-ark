#!/usr/bin/env bash
# TENMON_REMOTE_CURSOR — VPS / スマホ経由でカード投入（X-Founder-Key）
set -euo pipefail
BASE_URL="${TENMON_REMOTE_CURSOR_BASE_URL:-http://127.0.0.1:3000}"
KEY="${FOUNDER_KEY:-${TENMON_REMOTE_CURSOR_FOUNDER_KEY:-}}"
CARD_NAME="${1:-}"
BODY_FILE="${2:-}"

if [[ -z "$KEY" ]]; then
  echo "Set FOUNDER_KEY or TENMON_REMOTE_CURSOR_FOUNDER_KEY" >&2
  exit 1
fi
if [[ -z "$CARD_NAME" ]]; then
  echo "usage: $0 CARD_NAME [body.md]" >&2
  exit 1
fi

BODY=""
if [[ -n "$BODY_FILE" && -f "$BODY_FILE" ]]; then
  BODY=$(cat "$BODY_FILE")
else
  BODY="${TENMON_REMOTE_CURSOR_CARD_BODY:-}"
fi

export CARD_NAME BODY
# TENMON_REMOTE_CURSOR_FORCE_APPROVE=1 で即 ready（high 以外・本文ガード通過時）
JSON=$(python3 <<'PY'
import json, os
body = {
  "card_name": os.environ["CARD_NAME"],
  "card_body_md": os.environ.get("BODY", ""),
  "source": "remote_cursor_submit_v1.sh",
}
if os.environ.get("TENMON_REMOTE_CURSOR_FORCE_APPROVE", "").strip() in ("1", "true", "yes"):
  body["force_approve"] = True
extra = os.environ.get("TENMON_REMOTE_CURSOR_SUBMIT_EXTRA_JSON", "").strip()
if extra:
  try:
    body.update(json.loads(extra))
  except Exception as e:
    raise SystemExit(f"invalid TENMON_REMOTE_CURSOR_SUBMIT_EXTRA_JSON: {e}")
print(json.dumps(body, ensure_ascii=False))
PY
)

curl -sS -X POST "$BASE_URL/api/admin/cursor/submit" \
  -H "Content-Type: application/json" \
  -H "X-Founder-Key: $KEY" \
  -d "$JSON" | (command -v jq >/dev/null && jq . || cat)
