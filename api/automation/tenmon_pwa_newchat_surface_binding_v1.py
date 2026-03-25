#!/usr/bin/env python3
"""
TENMON_PWA_NEWCHAT_SURFACE_BINDING_CURSOR_AUTO_V1
静的契約: reload 削除 / thread-switch 配線 / reset 同一 path
"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

CARD = "TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1"


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
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

    gate: dict = {}
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

    gpt = read_text(root / "web" / "src" / "components" / "gpt" / "GptShell.tsx")
    uc = read_text(root / "web" / "src" / "hooks" / "useChat.ts")

    blockers: list[str] = []

    if "window.location.reload" in gpt or "location.reload" in gpt:
        blockers.append("static:GptShell:reload_present")
    if "tenmon:thread-switch" not in gpt and "TENMON_THREAD_SWITCH_EVENT" not in gpt:
        blockers.append("static:GptShell:missing_thread_switch_dispatch")
    if "writeThreadIdToUrl" not in gpt:
        blockers.append("static:GptShell:missing_writeThreadIdToUrl")
    if "addEventListener" not in uc or "tenmon:thread-switch" not in uc:
        blockers.append("static:useChat:missing_thread_switch_listener")
    if "TENMON_THREAD_SWITCH_EVENT" not in uc:
        blockers.append("static:useChat:missing_event_constant")
    if not re.search(r"new\s+CustomEvent\(\s*TENMON_THREAD_SWITCH_EVENT", uc):
        blockers.append("static:useChat:reset_not_dispatching_custom_event")

    if not health_ok:
        blockers.append("gate:health")
    if not audit_ok:
        blockers.append("gate:audit")
    if not audit_build_ok:
        blockers.append("gate:audit_build")

    blockers = sorted(set(blockers))
    static_clean = not any(b.startswith("static:") for b in blockers)
    final_ready = static_clean and health_ok and audit_ok and audit_build_ok

    trace = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checks": {
            "gpt_reload_removed": "location.reload" not in gpt,
            "thread_switch_wired": "tenmon:thread-switch" in uc or "TENMON_THREAD_SWITCH_EVENT" in uc,
        },
    }
    readiness = {
        "card": CARD,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "static_contract_ok": static_clean,
        "final_ready": final_ready,
        "blockers": blockers,
    }
    verdict = {"ok": final_ready, "final_ready": final_ready, "card": CARD, "blockers": blockers}

    (automation / "pwa_newchat_surface_binding_trace.json").write_text(
        json.dumps(trace, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_newchat_surface_binding_readiness.json").write_text(
        json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_newchat_surface_binding_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)
    next_cards: list[str] = []
    if not final_ready:
        if any(b.startswith("static:") for b in blockers):
            next_cards.append("TENMON_PWA_NEWCHAT_SURFACE_BINDING_FIX_V1")
        if any(b.startswith("gate:") for b in blockers):
            next_cards.append("TENMON_GATE_HEALTH_AUDIT_RECOVERY_V1")
    next_cards = next_cards[:3]
    (gen / "TENMON_PWA_NEWCHAT_SURFACE_BINDING_NEXT_PDCA_AUTO_V1.md").write_text(
        "\n".join(
            [
                "# TENMON_PWA_NEWCHAT_SURFACE_BINDING_NEXT_PDCA_AUTO_V1",
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
        "pwa_newchat_surface_binding_trace.json",
        "pwa_newchat_surface_binding_readiness.json",
        "pwa_newchat_surface_binding_verdict.json",
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
