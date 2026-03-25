#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_COMPLETION_ORACLE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def axis(name: str, ok: bool, blockers: list[str]) -> dict[str, Any]:
    return {
        "code_present": True,
        "runtime_proven": ok,
        "accepted_complete": ok,
        "band": "green" if ok else "yellow",
        "primary_blockers": blockers,
        "staleness_risk": False,
        "name": name,
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    rjv = rj(auto / "tenmon_latest_state_rejudge_summary.json")
    chat = rj(auto / "tenmon_chat_surface_stopbleed_summary.json")
    scr = rj(auto / "tenmon_scripture_naturalizer_summary.json")
    hyg = rj(auto / "tenmon_repo_hygiene_final_seal_summary.json")

    meta_ok = int(chat.get("meta_leak_count", 1)) == 0
    tech_ok = int(chat.get("technical_misroute_count", chat.get("natural_misdrop_count", 1))) == 0
    scr_ok = bool(scr.get("autoprobe_pass") or scr.get("scripture_surface_naturalized"))
    hyg_ok = bool(hyg.get("repo_hygiene_clean"))
    rem = [str(x) for x in (rjv.get("remaining_blockers") or []) if str(x).strip()]
    overall_green = meta_ok and tech_ok and scr_ok and hyg_ok and not rem
    overall_band = "AUTONOMY_BRAINSTEM_READY" if overall_green else "YELLOW_REMEDIATION_REQUIRED"

    subsystems = {
        "conversation_continuity": axis("conversation_continuity", meta_ok, [] if meta_ok else ["meta_leak"]),
        "technical_route": axis("technical_route", tech_ok, [] if tech_ok else ["technical_misroute"]),
        "scripture_surface": axis("scripture_surface", scr_ok, [] if scr_ok else ["scripture_not_naturalized"]),
        "repo_hygiene": axis("repo_hygiene", hyg_ok, [] if hyg_ok else ["repo_hygiene_unclean"]),
        "autonomy_brainstem": axis("autonomy_brainstem", overall_green, rem),
    }

    policy = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "route_surface_only": not any(("infra" in b.lower() or "build" in b.lower()) for b in rem),
        "subsystem_count": len(subsystems),
    }
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "subsystems": subsystems,
        "seal_ready": overall_green,
        "operable_ready": overall_green,
        "worldclass_ready": overall_green,
        "overall_band": overall_band,
        "next_single_best_card": "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1" if not meta_ok else (
            "TENMON_SCRIPTURE_K1_SYNTHESIS_NATURALIZER_CURSOR_AUTO_V1" if not scr_ok else "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"
        ),
    }
    wj(auto / "worldclass_oracle_policy_v1.json", policy)
    wj(auto / "tenmon_worldclass_completion_oracle_summary.json", summary)
    (auto / "tenmon_worldclass_completion_oracle_report.md").write_text(
        f"# {CARD}\n\n- overall_band: `{overall_band}`\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

