#!/usr/bin/env bash
# CHAT_TS_EXIT_CONTRACT_LOCK_V1 — 5 probe の HTTP 200 + 表面ヒューリスティクス（read-only）
set -euo pipefail
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${CHAT_TS_EXIT_CONTRACT_OUT:-${1:-$ROOT/automation/out/chat_ts_exit_contract_lock_v1}}"
CANON_JSON="${CHAT_TS_PROBE_CANON_JSON:-$ROOT/automation/chat_ts_probe_canon_v1.json}"
mkdir -p "$OUT"

python3 - "$BASE" "$OUT" "$CANON_JSON" <<'PY'
import json, os, pathlib, sys, time, urllib.request, urllib.error

base = sys.argv[1].rstrip("/")
out = pathlib.Path(sys.argv[2])
canon = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding="utf-8"))
exit5 = canon.get("exit_contract_probe_5") or {}
order = ["general_1", "compare_1", "longform_1", "scripture_1", "selfaware_1"]
tests = [(n, exit5[n]) for n in order if n in exit5]
if len(tests) != 5:
    raise SystemExit(f"canon exit_contract_probe_5 incomplete (got {len(tests)}/5)")

noise = (
    "この問いについて、今回は",
    "一貫の手がかりは",
    "いまの答えは、典拠は",
    "（補助）次の一手",
    "還元として、いまの主題を一句に圧し",
)

def post(url, payload, timeout=45.0):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")

def discover():
    for path in ("/chat", "/api/chat"):
        u = base + path
        try:
            post(u, {"message": "ping", "threadId": "exit-lock-discover"}, 12.0)
            return u
        except Exception:
            continue
    return None

chat_url = discover()
matrix = {"_meta": {"chat_url_used": chat_url, "base": base}, "probes": {}}
all_ok = True

if not chat_url:
    for name, _ in tests:
        matrix["probes"][name] = {"http_ok": False, "error": "no_chat_url"}
    all_ok = False
else:
    for name, msg in tests:
        row = {"http_ok": False, "noise_hits": [], "response_len": 0}
        try:
            st, raw = post(chat_url, {"message": msg, "threadId": f"exit-{name}"}, 55.0)
            row["http_status"] = st
            row["http_ok"] = 200 <= st < 300
            obj = json.loads(raw)
            resp = str(obj.get("response") or "")
            row["response_len"] = len(resp)
            row["noise_hits"] = [n for n in noise if n in resp]
            row["noise_ok"] = len(row["noise_hits"]) == 0
            if name == "compare_1":
                paras = [p.strip() for p in resp.split("\n\n") if p.strip()]
                norm = {}
                dup = 0
                for p in paras:
                    k = " ".join(p.split())
                    if len(k) >= 12 and k in norm:
                        dup += 1
                    norm[k] = True
                row["duplicate_paragraph_hint"] = dup
                row["dedupe_ok"] = dup == 0
            else:
                row["dedupe_ok"] = True
            row["overall_row_ok"] = row["http_ok"] and row["noise_ok"] and row.get("dedupe_ok", True)
            if not row["overall_row_ok"]:
                all_ok = False
        except Exception as e:
            row["error"] = str(e)
            all_ok = False
        matrix["probes"][name] = row
        time.sleep(0.15)

(out / "probe_matrix_5x5.json").write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
accept = {
    "card": "CHAT_TS_EXIT_CONTRACT_LOCK_V1",
    "all_probes_ok": all_ok,
    "probe_matrix": str(out / "probe_matrix_5x5.json"),
}
(out / "acceptance_exit_contract.json").write_text(json.dumps(accept, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# OUT は .../api/automation/out/<run> を想定 → generated_cursor_apply は automation 直下
_gc_base = out.parents[1] if len(out.parts) >= 2 else out
gc = _gc_base / "generated_cursor_apply" / "CHAT_TS_EXIT_CONTRACT_LOCK_NEXT_PDCA_AUTO_V1.md"
if not all_ok:
    gc.parent.mkdir(parents=True, exist_ok=True)
    gc.write_text(
        "# CHAT_TS_EXIT_CONTRACT_LOCK_NEXT_PDCA_AUTO_V1\n\n"
        "exit contract probe が失敗しました。`probe_matrix_5x5.json` を確認してください。\n\n"
        "- FAIL_NEXT: `CHAT_TS_EXIT_CONTRACT_LOCK_RETRY_CURSOR_AUTO_V1`\n"
        "- 調整: `tenmonConversationSurfaceV2.applyExitContractLockV1` / `finalize.ts` / `cleanLlmFrameV1`+ctx\n",
        encoding="utf-8",
    )
print(json.dumps(accept, ensure_ascii=False, indent=2))
sys.exit(0 if all_ok else 2)
PY
RC=$?
echo "[CHAT_TS_EXIT_CONTRACT_LOCK_V1] OUT=$OUT RC=$RC"
exit "$RC"
