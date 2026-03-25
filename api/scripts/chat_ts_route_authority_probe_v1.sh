#!/usr/bin/env bash
# STAGE2: route authority — POST 5 本 + routeReason 表示（threadId 分離）
# 文言は CHAT_TS_PROBE_CANON_V1（exit_contract_probe_5）と同一
set -euo pipefail
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANON_JSON="${CHAT_TS_PROBE_CANON_JSON:-$ROOT/automation/chat_ts_probe_canon_v1.json}"

python3 - <<'PY' "$BASE" "$CANON_JSON"
import json, pathlib, sys, time, urllib.error, urllib.request

base = sys.argv[1]
canon = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
exit5 = canon.get("exit_contract_probe_5") or {}
order = ["general_1", "selfaware_1", "scripture_1", "compare_1", "longform_1"]
tests = [(n, exit5[n]) for n in order if n in exit5]
if not tests:
    print("ERROR: exit_contract_probe_5 missing in canon", file=sys.stderr)
    sys.exit(2)


def post(url: str, payload: dict, timeout: float = 40.0) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode("utf-8", errors="replace")
        return json.loads(raw)


def discover_chat_url() -> str | None:
    for path in ("/chat", "/api/chat"):
        url = base + path
        try:
            post(url, {"message": "ping", "threadId": "route-probe-discover"}, timeout=12.0)
            return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            continue
    return None


chat_url = discover_chat_url()
if not chat_url:
    print("ERROR: could not discover POST /chat or /api/chat", file=sys.stderr)
    sys.exit(2)

print("[chat_url]", chat_url)
for name, msg in tests:
    tid = f"route-probe-{name}"
    try:
        data = post(chat_url, {"message": msg, "threadId": tid})
    except Exception as e:
        print("==", name, "==")
        print("ERROR", e)
        continue
    ku = ((data.get("decisionFrame") or {}).get("ku") or {}) if isinstance(data.get("decisionFrame"), dict) else {}
    rr = ku.get("routeReason") if isinstance(ku, dict) else None
    text = str(data.get("response") or "")
    print("==", name, "==")
    print("routeReason:", rr)
    print(text[:2500])
    time.sleep(0.2)
PY
