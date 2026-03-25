#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

CARD = "TENMON_PWA_THREAD_NAMING_UNIFICATION_V1"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_root", type=str)
    ap.add_argument("outdir", type=str)
    ap.add_argument("--gate-json", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    automation = root / "api" / "automation"
    automation.mkdir(parents=True, exist_ok=True)

    gate = {}
    if args.gate_json:
        gp = Path(args.gate_json)
        if gp.is_file():
            try:
                gate = json.loads(gp.read_text(encoding="utf-8"))
            except Exception:
                gate = {}

    health_ok = bool(gate.get("health_ok", False))
    audit_ok = bool(gate.get("audit_ok", False))
    audit_build_ok = bool(gate.get("audit_build_ok", False))

    f_use_chat = root / "web" / "src" / "hooks" / "useChat.ts"
    f_api_chat = root / "web" / "src" / "api" / "chat.ts"
    f_types = root / "web" / "src" / "types" / "chat.ts"
    f_page = root / "web" / "src" / "pages" / "ChatPage.tsx"

    t_use_chat = read_text(f_use_chat)
    t_api = read_text(f_api_chat)
    t_types = read_text(f_types)
    t_page = read_text(f_page)

    blockers: list[str] = []

    if "threadId: string" not in t_types:
        blockers.append("types:missing_threadId_request")
    if "threadId?: string" not in t_types:
        blockers.append("types:missing_threadId_response_optional")
    if re.search(r"\bsessionId\b", t_api):
        blockers.append("api_chat:sessionId_found")
    if not re.search(r"threadId\s*:\s*req\.threadId", t_api):
        blockers.append("api_chat:not_sending_req_threadId")
    if re.search(r"\bsessionId\b", t_use_chat):
        blockers.append("useChat:sessionId_found")
    if not re.search(r"postChat\(\{\s*message:\s*text,\s*threadId\s*\}\)", t_use_chat):
        blockers.append("useChat:postChat_not_threadId")
    if re.search(r"\bsessionId\b", t_page):
        blockers.append("ChatPage:sessionId_found")
    if "threadId" not in t_page:
        blockers.append("ChatPage:threadId_missing")

    # grep snapshot (allowlist includes training domain only)
    web_src = root / "web" / "src"
    session_hits: list[dict] = []
    for p in web_src.rglob("*.tsx"):
        txt = read_text(p)
        if not txt:
            continue
        for i, line in enumerate(txt.splitlines(), start=1):
            if re.search(r"\bsessionId\b", line):
                session_hits.append({"path": str(p.relative_to(root)), "line": i, "text": line.strip()[:200]})
    for p in web_src.rglob("*.ts"):
        txt = read_text(p)
        if not txt:
            continue
        for i, line in enumerate(txt.splitlines(), start=1):
            if re.search(r"\bsessionId\b", line):
                session_hits.append({"path": str(p.relative_to(root)), "line": i, "text": line.strip()[:200]})

    allow_prefixes = {
        "web/src/pages/TrainingPage.tsx": "training API の session_id 契約",
        "web/src/pages/TrainPage.tsx": "training API の session_id 契約",
    }
    non_allow = []
    for hit in session_hits:
        path = hit["path"]
        if path not in allow_prefixes:
            non_allow.append(hit)
    if non_allow:
        blockers.append("grep:web_src_sessionId_non_allowlisted")

    if not health_ok:
        blockers.append("gate:health")
    if not audit_ok:
        blockers.append("gate:audit")
    if not audit_build_ok:
        blockers.append("gate:audit_build")

    blockers = sorted(set(blockers))
    naming_clean = not any(b.startswith(("types:", "api_chat:", "useChat:", "ChatPage:", "grep:")) for b in blockers)
    final_ready = naming_clean and health_ok and audit_ok and audit_build_ok

    trace = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sessionId_hits": session_hits,
        "allowlist_reason": allow_prefixes,
    }
    readiness = {
        "card": CARD,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "naming_clean": naming_clean,
        "final_ready": final_ready,
        "blockers": blockers,
    }
    verdict = {"ok": final_ready, "final_ready": final_ready, "card": CARD, "blockers": blockers}

    (automation / "pwa_thread_naming_unification_trace.json").write_text(
        json.dumps(trace, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_thread_naming_unification_readiness.json").write_text(
        json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_thread_naming_unification_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)
    next_cards = []
    if not final_ready:
        if any(b.startswith(("types:", "api_chat:", "useChat:", "ChatPage:", "grep:")) for b in blockers):
            next_cards.append("TENMON_PWA_THREAD_NAMING_UNIFICATION_RESIDUAL_FIX_V1")
        if any(b.startswith("gate:") for b in blockers):
            next_cards.append("TENMON_GATE_HEALTH_AUDIT_RECOVERY_V1")
    next_cards = next_cards[:3]
    (gen / "TENMON_PWA_THREAD_NAMING_UNIFICATION_NEXT_PDCA_AUTO_V1.md").write_text(
        "\n".join(
            [
                "# TENMON_PWA_THREAD_NAMING_UNIFICATION_NEXT_PDCA_AUTO_V1",
                "",
                f"- final_ready: {final_ready}",
                f"- blockers: {blockers}",
                f"- next_cards: {next_cards}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    for name in [
        "pwa_thread_naming_unification_trace.json",
        "pwa_thread_naming_unification_readiness.json",
        "pwa_thread_naming_unification_verdict.json",
    ]:
        try:
            (outdir / name).write_text((automation / name).read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    summary = {
        "ok": final_ready,
        "final_ready": final_ready,
        "blocker_count": len(blockers),
        "blockers": blockers,
        "next_cards": next_cards,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if final_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
