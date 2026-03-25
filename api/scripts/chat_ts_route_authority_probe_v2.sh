#!/usr/bin/env bash
# CHAT_TS_STAGE2_ROUTE_AUTHORITY — v2: 5 focused probes + JSON artifacts + verdict (exit!=0 on fail)
set -euo pipefail
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
OUT="${CHAT_TS_ROUTE_AUTHORITY_OUT:-.}"
mkdir -p "$OUT"

curl -fsS "$BASE/health" >"$OUT/health.json" || {
  echo '{"ok":false,"err":"health"}' >"$OUT/health.json"
  exit 3
}
curl -fsS "$BASE/api/audit" >"$OUT/audit.json" || {
  echo '{"ok":false,"err":"audit"}' >"$OUT/audit.json"
  exit 4
}

python3 - <<'PY' "$BASE" "$OUT"
import json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

base = sys.argv[1]
out = Path(sys.argv[2])


def post(url: str, payload: dict, timeout: float = 60.0) -> dict:
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
            post(url, {"message": "ping", "threadId": "route-probe-v2-discover"}, timeout=15.0)
            return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            continue
    return None


chat_url = discover_chat_url()
if not chat_url:
    (out / "final_verdict.json").write_text(
        json.dumps({"ok": False, "err": "no_chat_url"}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("ERROR: could not discover POST /chat or /api/chat", file=sys.stderr)
    sys.exit(2)

tests = [
    ("general_1", "AIとは何？"),
    ("selfaware_1", "天聞アークに意識はあるの？"),
    ("scripture_1", "法華経とは何を説くの？"),
    ("compare_1", "GPTと天聞アークの違いを比較して"),
    ("longform_1", "天聞アークが世界最高AIになるための未達点を800字で詳しく説明して"),
]

matrix = []
failures = []

for name, msg in tests:
    tid = f"route-auth-v2-{name}-{int(time.time() * 1000) % 100000}"
    row = {"probe": name, "message": msg, "ok": True, "err": None}
    try:
        data = post(chat_url, {"message": msg, "threadId": tid})
    except Exception as e:
        row["ok"] = False
        row["err"] = str(e)
        matrix.append(row)
        failures.append(f"{name}:post:{e}")
        continue

    df = data.get("decisionFrame") if isinstance(data.get("decisionFrame"), dict) else {}
    ku = df.get("ku") if isinstance(df.get("ku"), dict) else {}
    rr = ku.get("routeReason")
    rp = ku.get("responsePlan") if isinstance(ku.get("responsePlan"), dict) else {}
    text = str(data.get("response") or "")

    row["routeReason"] = rr
    row["responsePlan"] = {
        "kind": rp.get("kind"),
        "stance": rp.get("stance"),
        "mode": rp.get("mode"),
        "closeStyle": rp.get("closeStyle"),
        "followupPolicy": rp.get("followupPolicy"),
        "lengthBand": rp.get("lengthBand") or rp.get("answerLength"),
    }
    row["response_head"] = text[:400]

    # --- authority heuristics (Stage2 card) ---
    if rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1" and name in (
        "compare_1",
        "longform_1",
        "selfaware_1",
        "scripture_1",
    ):
        row["ok"] = False
        row["err"] = "diagnosis_preempt_on_non_diag_probe"
        failures.append(f"{name}:SYSTEM_DIAGNOSIS_PREEMPT_V1")

    if name == "general_1" and rr in (
        "SYSTEM_DIAGNOSIS_PREEMPT_V1",
        "DEF_FASTPATH_VERIFIED_V1",
        "AI_CONSCIOUSNESS_LOCK_V1",
        "TENMON_CONSCIOUSNESS_LOCK_V1",
    ):
        row["ok"] = False
        row["err"] = "general_absorbed_into_lock_or_fastpath_or_diag"
        failures.append(f"{name}:{rr}")

    if name == "scripture_1" and rr in ("SYSTEM_DIAGNOSIS_PREEMPT_V1", "DEF_FASTPATH_VERIFIED_V1"):
        row["ok"] = False
        row["err"] = "scripture_misrouted"
        failures.append(f"{name}:{rr}")

    if name == "compare_1":
        allowed_rr = (
            "R22_COMPARE_ASK_V1",
            "R22_COMPARE_FOLLOWUP_V1",
            "NATURAL_GENERAL_LLM_TOP",
            "DEF_LLM_TOP",
            "CONVERSATION_ENGINE_V1",
        )
        if rr not in allowed_rr and not (isinstance(rp, dict) and rp.get("stance") == "separate_fact_and_view"):
            row["ok"] = False
            row["err"] = "compare_route_unexpected"
            failures.append(f"{name}:unexpected_rr:{rr}")

    # longform: Stage2 は診断誤吸い込み防止が主目的（長文 band は Stage3 で精密化）

    matrix.append(row)
    time.sleep(0.15)

# seal / chat_ts_stage2_route_snapshot_v1.py 互換: probe 名トップレベル + "routeReason" を含む body 文字列
compat = {}
for r in matrix:
    pname = r.get("probe")
    if not pname:
        continue
    rr = r.get("routeReason")
    compat[pname] = {
        "ok": bool(r.get("ok")),
        "body": json.dumps({"decisionFrame": {"ku": {"routeReason": rr}}}, ensure_ascii=False),
        "error": r.get("err"),
    }
compat["_meta_route_authority_v2"] = {"chat_url": chat_url, "probes": matrix}

(out / "runtime_matrix.json").write_text(
    json.dumps(compat, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

extract = {r["probe"]: r.get("routeReason") for r in matrix if "probe" in r}
(out / "route_reason_extract.json").write_text(
    json.dumps(extract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

(out / "route_authority_audit.json").write_text(
    json.dumps(
        {
            "failures": failures,
            "probes": {r["probe"]: {"routeReason": r.get("routeReason"), "ok": r.get("ok"), "err": r.get("err")} for r in matrix},
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

verdict_ok = len(failures) == 0
(out / "final_verdict.json").write_text(
    json.dumps(
        {"ok": verdict_ok, "failures": failures, "card": "CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2"},
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

for r in matrix:
    print("==", r.get("probe"), "==")
    print("routeReason:", r.get("routeReason"), "ok:", r.get("ok"), r.get("err") or "")
    print((r.get("response_head") or "")[:800])
    print()

sys.exit(0 if verdict_ok else 1)
PY

echo "[chat_ts_route_authority_probe_v2] artifacts in $OUT"
