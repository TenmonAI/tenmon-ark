#!/usr/bin/env bash
# CHAT_TS_STAGE3_LONGFORM_STRUCTURE — response_len / 三弧 / 診断短答混入の監査
# longform メッセージは CHAT_TS_PROBE_CANON_V1（exit_contract longform_1）と同一（seal / route と一致）
set -euo pipefail
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANON_JSON="${CHAT_TS_PROBE_CANON_JSON:-$ROOT/automation/chat_ts_probe_canon_v1.json}"
OUT="${CHAT_TS_LONGFORM_PROBE_OUT:-.}"
mkdir -p "$OUT"

curl -fsS "$BASE/health" >"$OUT/health.json" || {
  echo '{"ok":false}' >"$OUT/health.json"
  exit 3
}
curl -fsS "$BASE/api/audit" >"$OUT/audit.json" || {
  echo '{"ok":false}' >"$OUT/audit.json"
  exit 4
}

python3 - <<'PY' "$BASE" "$OUT" "$CANON_JSON"
import json, sys, time, urllib.error, urllib.request
from pathlib import Path

base = sys.argv[1]
out = Path(sys.argv[2])
canon = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))
exit5 = canon.get("exit_contract_probe_5") or {}
LF_MSG = str(exit5.get("longform_1") or "")
if not LF_MSG:
    raise SystemExit("canon exit_contract_probe_5.longform_1 missing")

NOISE_FRAGS = [
    "この問いについて、今回は",
    "続きが求められているようですね",
    "一貫の手がかりは、",
    "（補助）次の一手",
    "還元として、いまの主題を一句に圧し",
]
SYS_DIAG_SNIP = "骨格層はかなり接続済み"


def post(url: str, payload: dict, timeout: float = 120.0) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))


def discover_chat_url() -> str | None:
    for path in ("/chat", "/api/chat"):
        url = base + path
        try:
            post(url, {"message": "ping", "threadId": "lf-probe-discover"}, timeout=15.0)
            return url
        except Exception:
            continue
    return None


chat_url = discover_chat_url()
if not chat_url:
    (out / "final_verdict.json").write_text(
        json.dumps({"ok": False, "err": "no_chat_url"}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("ERROR: no chat url", file=sys.stderr)
    sys.exit(2)

tid = f"longform-quality-{int(time.time())}"
raw = post(chat_url, {"message": LF_MSG, "threadId": tid})
body_str = json.dumps(raw, ensure_ascii=False)
text = str(raw.get("response") or "")
ku = ((raw.get("decisionFrame") or {}).get("ku") or {}) if isinstance(raw.get("decisionFrame"), dict) else {}
rr = ku.get("routeReason")

# runtime_matrix.json — chat_ts_longform_audit_v1.py 互換（longform_1.body に JSON 文字列）
compat = {
    "longform_1": {
        "ok": True,
        "body": body_str,
        "error": None,
    }
}
(out / "runtime_matrix.json").write_text(
    json.dumps(compat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

noise_hits = [f for f in NOISE_FRAGS if f in text]
surface_audit = {
    "response_len": len(text),
    "noise_fragments_matched": noise_hits,
    "noise_count": len(noise_hits),
}
(out / "surface_audit.json").write_text(
    json.dumps(surface_audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

has_m = "【見立て】" in text
has_t = "【展開】" in text
has_r = "【着地】" in text
three_arc = has_m and has_t and has_r
sys_diag_short = rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1" and len(text) < 900
sys_diag_body = SYS_DIAG_SNIP in text and len(text) < 1200

failures = []
# TENMON_SURFACE_CONTRACT_V1_MIN_DIFF: ku に surfaceContractKey が載ること（観測）
sc = ku.get("surfaceContractV1") if isinstance(ku, dict) else None
if not isinstance(sc, dict) or not str(sc.get("surfaceContractKey") or "").strip():
    failures.append("surface_contract_v1_missing_on_ku")

min_len = 420
if len(text) < min_len:
    failures.append(f"too_short:{len(text)}<{min_len}")
if not three_arc:
    failures.append("missing_tri_arc_labels")
if sys_diag_short or sys_diag_body:
    failures.append("fell_through_system_diagnosis_short")
if len(noise_hits) > 6:
    failures.append(f"excess_surface_noise:{len(noise_hits)}")

longform_audit = {
    "version": 1,
    "card": "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_V1",
    "message": LF_MSG,
    "routeReason": rr,
    "response_len": len(text),
    "has_mitate": has_m,
    "has_tenkai": has_t,
    "has_rakuchi": has_r,
    "three_arc_ok": three_arc,
    "system_diagnosis_short": bool(sys_diag_short or sys_diag_body),
    "response_head": text[:1200],
}
(out / "longform_audit.json").write_text(
    json.dumps(longform_audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

ok = len(failures) == 0
(out / "final_verdict.json").write_text(
    json.dumps(
        {"ok": ok, "failures": failures, "card": "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_VPS_V1"},
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

print(json.dumps(longform_audit, ensure_ascii=False, indent=2))
print("verdict ok=", ok, failures)
sys.exit(0 if ok else 1)
PY

echo "[chat_ts_longform_quality_probe_v1] artifacts in $OUT"
