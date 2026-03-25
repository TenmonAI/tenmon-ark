#!/usr/bin/env python3
"""
TENMON_PWA_LIVED_COMPLETION_SEAL_CURSOR_AUTO_V1
実API lived 観測 → readiness / blockers / seal（PASS時のみ）
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_LIVED_COMPLETION_SEAL_V1"


def get_url(url: str, timeout: int = 45) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}


def post_json(url: str, payload: dict, timeout: int = 180) -> dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": e.code, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}


def parse_json(s: str):
    try:
        return json.loads(s)
    except Exception:
        return None


def dig(obj: Any, *path: str):
    cur = obj
    for p in path:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur


def extract_response_text(parsed: dict | None) -> str:
    if not isinstance(parsed, dict):
        return ""
    return str(
        parsed.get("response")
        or parsed.get("answer")
        or parsed.get("text")
        or dig(parsed, "result", "response")
        or ""
    )


def extract_thread_id(parsed: dict | None) -> str | None:
    if not isinstance(parsed, dict):
        return None
    tid = parsed.get("threadId") or dig(parsed, "decisionFrame", "ku", "threadCore", "threadId")
    if tid is None:
        return None
    s = str(tid).strip()
    return s if s else None


META_LEAK_PATTERNS = [
    "さっき見ていた中心",
    "いまの話を見ていきましょう",
    "routeReason",
    "responsePlan",
    "R22_NEXTSTEP_FOLLOWUP_V1",
    "直前ターンの中心（記録薄）",
    "shadow facts はまだ空",
]


def has_meta_leak(text: str) -> list[str]:
    t = text or ""
    return [p for p in META_LEAK_PATTERNS if p in t]


def has_duplicate_lines(text: str) -> bool:
    lines = [x.strip() for x in (text or "").splitlines() if len(x.strip()) >= 12]
    seen: set[str] = set()
    for ln in lines:
        if ln in seen:
            return True
        seen.add(ln)
    return False


def gate_ok(body: str) -> bool:
    if not (body or "").strip():
        return False
    try:
        j = json.loads(body)
        if isinstance(j, dict) and j.get("ok") is False:
            return False
        return True
    except Exception:
        return len(body.strip()) > 2


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_root", type=str)
    ap.add_argument("outdir", type=str, nargs="?", default="")
    ap.add_argument("base", type=str, nargs="?", default="http://127.0.0.1:3000")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root)
    outdir = Path(args.outdir) if args.outdir else (root / "api" / "automation")
    base = str(args.base or "http://127.0.0.1:3000").rstrip("/")
    automation = root / "api" / "automation"
    automation.mkdir(parents=True, exist_ok=True)
    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)
    outdir.mkdir(parents=True, exist_ok=True)

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    report: dict[str, Any] = {
        "card": CARD,
        "generated_at": ts,
        "base": base,
        "gates": {},
        "chat_probes": {},
    }

    blockers: list[str] = []

    # --- /api/health（優先）→ 互換で /health ---
    h_api = get_url(base + "/api/health")
    if bool(h_api.get("ok")) and int(h_api.get("status") or 0) == 200:
        h = h_api
        health_path = "/api/health"
    else:
        h = get_url(base + "/health")
        health_path = "/health"
    report["gates"]["health"] = {
        "ok": h.get("ok"),
        "status": h.get("status"),
        "path": health_path,
    }
    health_ok = bool(h.get("ok")) and gate_ok(h.get("body") or "")
    if not health_ok:
        blockers.append("gate:health")

    # --- /api/audit (補助) ---
    a = get_url(base + "/api/audit")
    report["gates"]["audit"] = {"ok": a.get("ok"), "status": a.get("status")}
    audit_ok = bool(a.get("ok")) and gate_ok(a.get("body") or "")
    if not audit_ok:
        blockers.append("gate:audit")

    # --- /api/audit.build ---
    ab = get_url(base + "/api/audit.build")
    report["gates"]["audit_build"] = {"ok": ab.get("ok"), "status": ab.get("status")}
    audit_build_ok = bool(ab.get("ok")) and gate_ok(ab.get("body") or "")
    if not audit_build_ok:
        blockers.append("gate:audit_build")

    chat_endpoint = base + "/api/chat"
    uid = "tenmon-pwa-lived-completion-seal-v1"

    def chat(msg: str, tid: str | None) -> dict[str, Any]:
        pl: dict[str, Any] = {
            "message": msg,
            "messages": [{"role": "user", "content": msg}],
            "userId": uid,
        }
        if tid:
            pl["threadId"] = tid
        r = post_json(chat_endpoint, pl)
        parsed = parse_json(r.get("body") or "")
        return {
            "http_ok": r.get("ok"),
            "status": r.get("status"),
            "parsed": parsed,
            "response_text": extract_response_text(parsed if isinstance(parsed, dict) else None),
            "thread_id": extract_thread_id(parsed if isinstance(parsed, dict) else None),
            "raw_body_preview": (r.get("body") or "")[:8000],
        }

    # --- threadId presence ---
    tid_a = f"pwa-seal-{int(time.time() * 1000)}"
    p1 = chat("今の総理大臣は？", tid_a)
    report["chat_probes"]["factual_with_threadId"] = p1
    rt1 = extract_response_text(p1.get("parsed") if isinstance(p1.get("parsed"), dict) else None)
    factual_response_ok = bool(p1.get("http_ok")) and bool((rt1 or "").strip())
    if p1.get("http_ok") and not (rt1 or "").strip():
        blockers.append("chat:factual_empty_response")
    tid_out = p1.get("thread_id")
    thread_id_presence_ok = bool(p1.get("http_ok")) and bool(tid_out)
    if not thread_id_presence_ok:
        blockers.append("chat:threadId_missing_in_response")

    # URL sync readiness: 応答に threadId があり、クライアントが URL と同期可能
    url_sync_readiness = bool(tid_out)
    if tid_out and tid_a and str(tid_out) != str(tid_a):
        blockers.append("chat:request_response_threadId_mismatch")
        url_sync_readiness = False

    # --- refresh restore: 同一 threadId で再送信 ---
    p_refresh = chat("同じスレッドの確認です。短く答えて。", tid_a)
    report["chat_probes"]["refresh_same_thread"] = p_refresh
    rt_refresh = extract_response_text(p_refresh.get("parsed") if isinstance(p_refresh.get("parsed"), dict) else None)
    refresh_restore_readiness = bool(p_refresh.get("http_ok")) and bool((rt_refresh or "").strip())
    if not p_refresh.get("http_ok"):
        blockers.append("chat:refresh_second_request_failed")
    if not (rt_refresh or "").strip():
        blockers.append("chat:refresh_empty_response")

    # --- new chat: 新 threadId ---
    tid_b = f"pwa-seal-new-{int(time.time() * 1000)}"
    p_new = chat("はい。", tid_b)
    report["chat_probes"]["new_chat_thread"] = p_new
    new_chat_readiness = bool(p_new.get("http_ok")) and bool(p_new.get("thread_id"))
    if new_chat_readiness and str(p_new.get("thread_id")) != tid_b:
        blockers.append("chat:new_chat_thread_mismatch")
        new_chat_readiness = False
    if not p_new.get("http_ok"):
        blockers.append("chat:new_chat_failed")

    # --- continuity: seed + followup ---
    tid_c = f"pwa-seal-cont-{int(time.time() * 1000)}"
    p_seed = chat("これから短い話の続きをします。覚えておいて", tid_c)
    report["chat_probes"]["continuity_seed"] = p_seed
    p_follow = chat("さっきの話を踏まえて一言で。", tid_c)
    report["chat_probes"]["continuity_followup"] = p_follow
    continuity_readiness = bool(p_seed.get("http_ok")) and bool(p_follow.get("http_ok"))
    if not continuity_readiness:
        blockers.append("chat:continuity_failed")

    # --- surface: meta / duplicate / bleed heuristic ---
    surface_blockers: list[str] = []
    for name, probe in [
        ("factual", p1),
        ("refresh", p_refresh),
        ("new_chat", p_new),
        ("followup", p_follow),
    ]:
        txt = probe.get("response_text") or ""
        leaks = has_meta_leak(txt)
        if leaks:
            surface_blockers.append(f"surface:meta_leak:{name}")
            blockers.extend([f"surface:meta_leak:{name}:{x}" for x in leaks[:3]])
        if has_duplicate_lines(txt):
            surface_blockers.append(f"surface:duplicate_lines:{name}")
            blockers.append(f"surface:duplicate_lines:{name}")
        if re.search(r"\bR22_[A-Z0-9_]+_V1\b", txt):
            surface_blockers.append(f"surface:route_token_literal:{name}")
            blockers.append(f"surface:route_token_literal:{name}")

    surface_clean = len(surface_blockers) == 0

    readiness = {
        "card": CARD,
        "generated_at": ts,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "thread_id_presence_ok": thread_id_presence_ok,
        "url_sync_readiness": url_sync_readiness,
        "refresh_restore_readiness": refresh_restore_readiness,
        "new_chat_readiness": new_chat_readiness,
        "continuity_readiness": continuity_readiness,
        "surface_meta_duplicate_bleed_clean": surface_clean,
        "factual_response_ok": factual_response_ok,
        "final_ready": False,
    }

    readiness["final_ready"] = (
        health_ok
        and audit_ok
        and audit_build_ok
        and factual_response_ok
        and thread_id_presence_ok
        and url_sync_readiness
        and refresh_restore_readiness
        and new_chat_readiness
        and continuity_readiness
        and surface_clean
    )

    try:
        pf = json.loads((automation / "pwa_playwright_preflight.json").read_text(encoding="utf-8"))
    except Exception:
        pf = {}
    usable_pf = bool(pf.get("usable", True))
    env_failure = bool(pf.get("env_failure")) or not usable_pf
    readiness["env_failure"] = env_failure
    readiness["driver_selected"] = pf.get("driver_selected") or pf.get("selected_driver")
    readiness["playwright_preflight_usable"] = usable_pf
    if env_failure:
        readiness["env_failure_reason"] = (pf.get("reason") or "").strip() or ";".join(
            pf.get("reasons", []) if isinstance(pf.get("reasons"), list) else []
        )
        readiness["final_ready"] = False

    blockers = sorted(set(blockers))
    blockers_path = automation / "pwa_lived_completion_blockers.json"
    readiness_path = automation / "pwa_lived_completion_readiness.json"
    report_path = automation / "pwa_lived_completion_seal_report.json"

    blockers_path.write_text(json.dumps({"card": CARD, "blockers": blockers}, ensure_ascii=False, indent=2), encoding="utf-8")
    readiness_path.write_text(json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # FAIL next PDCA
    (gen / "TENMON_PWA_LIVED_FAIL_NEXT_PDCA_AUTO_V1.md").write_text(
        "\n".join(
            [
                "# TENMON_PWA_LIVED_FAIL_NEXT_PDCA_AUTO_V1",
                "",
                f"- generated_at: {ts}",
                f"- final_ready: {readiness['final_ready']}",
                f"- blockers: {blockers}",
                "- next_cards (max 3): TENMON_PWA_SURFACE_LAST_MILE_CURSOR_AUTO_V1, TENMON_GATE_HEALTH_AUDIT_RECOVERY_V1",
                "",
            ]
        ),
        encoding="utf-8",
    )

    seal_pass_path = gen / "TENMON_PWA_LIVED_COMPLETION_SEAL_PASS_V1.md"
    if readiness["final_ready"]:
        seal_pass_path.write_text(
            "\n".join(
                [
                    "# TENMON_PWA_LIVED_COMPLETION_SEAL_PASS_V1",
                    "",
                    f"- card: {CARD}",
                    f"- sealed_at: {ts}",
                    f"- base: {base}",
                    "- status: **PASS** — lived completion seal 成立（API 観測）",
                    "",
                    "観測範囲: /health, /api/audit, /api/audit.build, /api/chat representative probes",
                    "",
                ]
            ),
            encoding="utf-8",
        )
    else:
        if seal_pass_path.is_file():
            try:
                seal_pass_path.unlink()
            except Exception:
                pass

    for fn in [
        "pwa_lived_completion_seal_report.json",
        "pwa_lived_completion_readiness.json",
        "pwa_lived_completion_blockers.json",
    ]:
        try:
            src = automation / fn
            if src.is_file():
                (outdir / fn).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    summary = {
        "ok": readiness["final_ready"],
        "final_ready": readiness["final_ready"],
        "card": CARD,
        "blocker_count": len(blockers),
        "blockers": blockers,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if readiness["final_ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
