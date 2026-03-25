#!/usr/bin/env python3
"""
TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1
静的契約 + gate（health / audit）検証。ブラウザ E2E は手動 lived に委譲。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

CARD = "TENMON_PWA_THREAD_URL_CONSTITUTION_V1"


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def fetch_url(url: str, timeout: int = 45) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return True, r.read().decode("utf-8", errors="replace")
    except Exception as e:
        return False, str(e)


def ok_json_body(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    try:
        j = json.loads(t)
        if isinstance(j, dict) and j.get("ok") is False:
            return False
        return True
    except Exception:
        return len(t) > 2


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_root", type=str, help="repository root")
    ap.add_argument("outdir", type=str, help="log output dir")
    ap.add_argument("base", type=str, help="API base e.g. http://127.0.0.1:3000")
    ap.add_argument("--gate-json", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true", help="reserved; summary is always JSON on stdout")
    args = ap.parse_args()

    root = Path(args.repo_root)
    outdir = Path(args.outdir)
    base = args.base.rstrip("/")
    automation = root / "api" / "automation"
    automation.mkdir(parents=True, exist_ok=True)

    gate_path = Path(args.gate_json) if args.gate_json else None
    gate: dict = {}
    if gate_path and gate_path.is_file():
        try:
            gate = json.loads(gate_path.read_text(encoding="utf-8"))
        except Exception:
            gate = {}

    health_ok = bool(gate.get("health_ok", False))
    audit_ok = bool(gate.get("audit_ok", False))
    audit_build_ok = bool(gate.get("audit_build_ok", False))

    use_chat = root / "web" / "src" / "hooks" / "useChat.ts"
    api_chat = root / "web" / "src" / "api" / "chat.ts"
    types_chat = root / "web" / "src" / "types" / "chat.ts"
    uc = read_text(use_chat)
    ac = read_text(api_chat)
    tc = read_text(types_chat)

    static_blockers: list[str] = []

    for name, text, needles in [
        ("useChat.ts", uc, ["readThreadIdFromUrl", "writeThreadIdToUrl", "resolveCanonicalThreadId", "getThreadId"]),
        ("types/chat.ts", tc, ["threadId", "ChatRequest"]),
        ("api/chat.ts", ac, ["req.threadId", "JSON.stringify"]),
    ]:
        for nd in needles:
            if nd not in text:
                static_blockers.append(f"static:{name}:missing:{nd}")

    if not re.search(r"threadId\s*:\s*req\.threadId", ac):
        static_blockers.append("static:api/chat.ts:body_threadId")

    if not re.search(r"threadId\s*:\s*string", tc):
        static_blockers.append("static:types:threadId_field")

    # sessionId を POST ボディに使っていないこと
    if re.search(r"sessionId", ac):
        static_blockers.append("static:api/chat.ts:sessionId_forbidden_in_body")

    trace = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "files": {
            "useChat.ts": str(use_chat),
            "api_chat.ts": str(api_chat),
            "types_chat.ts": str(types_chat),
        },
        "static_blockers": static_blockers,
    }

    blockers = list(static_blockers)
    if not health_ok:
        blockers.append("gate:health")
    if not audit_ok:
        blockers.append("gate:audit")
    if not audit_build_ok:
        blockers.append("gate:audit_build")

    static_clean = len(static_blockers) == 0
    final_ready = static_clean and health_ok and audit_ok and audit_build_ok

    readiness = {
        "card": CARD,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "static_contract_ok": static_clean,
        "final_ready": final_ready,
        "blockers": sorted(set(blockers)),
    }

    verdict = {
        "ok": final_ready,
        "final_ready": final_ready,
        "card": CARD,
        "blockers": readiness["blockers"],
    }

    (automation / "pwa_thread_url_constitution_trace.json").write_text(
        json.dumps(trace, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "pwa_thread_url_constitution_readiness.json").write_text(
        json.dumps(readiness, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "pwa_thread_url_constitution_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)
    next_cards: list[str] = []
    if not final_ready:
        if static_blockers:
            next_cards.append("TENMON_PWA_THREAD_URL_FRONTEND_CONTRACT_FIX_V1")
        if not health_ok or not audit_ok or not audit_build_ok:
            next_cards.append("TENMON_GATE_HEALTH_AUDIT_RECOVERY_V1")
        next_cards = next_cards[:3]
    (gen / "TENMON_PWA_THREAD_URL_CONSTITUTION_NEXT_PDCA_AUTO_V1.md").write_text(
        "\n".join(
            [
                "# TENMON_PWA_THREAD_URL_CONSTITUTION_NEXT_PDCA_AUTO_V1",
                "",
                f"- final_ready: {final_ready}",
                f"- blockers: {readiness['blockers']}",
                f"- next_cards: {next_cards}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    for fn in [
        "pwa_thread_url_constitution_trace.json",
        "pwa_thread_url_constitution_readiness.json",
        "pwa_thread_url_constitution_verdict.json",
    ]:
        try:
            (outdir / fn).write_text((automation / fn).read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    summary = {
        "ok": final_ready,
        "final_ready": final_ready,
        "blocker_count": len(readiness["blockers"]),
        "blockers": readiness["blockers"],
        "next_cards": next_cards,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if final_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
