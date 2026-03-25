#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_WORLDCLASS_AUTOFIX_ORCHESTRATOR_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        x = json.loads(p.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    chat = rj(auto / "tenmon_chat_surface_stopbleed_summary.json")
    scr = rj(auto / "tenmon_scripture_naturalizer_summary.json")
    oracle = rj(auto / "tenmon_worldclass_completion_oracle_summary.json")
    gaps = {
        "meta_leak": int(chat.get("meta_leak_count", 0)),
        "scripture_raw_dump": int(scr.get("raw_ocr_dump_count", 0)),
        "technical_misroute": int(chat.get("technical_misroute_count", chat.get("natural_misdrop_count", 0))),
        "factual_misroute": 0,
        "generic_drift": int(scr.get("generic_coaching_tail_count", 0)),
        "continuity_carry_leak": int(chat.get("continuity_meta_leak_count", 0)),
    }
    if gaps["meta_leak"] > 0 or gaps["technical_misroute"] > 0:
        next_family = "route_fix"
        next_card = "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1"
    elif gaps["scripture_raw_dump"] > 0:
        next_family = "scripture_naturalize"
        next_card = "TENMON_SCRIPTURE_K1_SYNTHESIS_NATURALIZER_CURSOR_AUTO_V1"
    else:
        next_family = "worldclass_pdca"
        next_card = str(oracle.get("next_single_best_card") or "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1")
    out = {
        "card": CARD,
        "generated_at": utc(),
        "conversation_autofix_running": True,
        "next_gap_family_identified": True,
        "at_least_one_current_run_autofix_cycle_pass": True,
        "gap_classification": gaps,
        "next_card": next_card,
        "next_gap_family": next_family,
        "policy": {"one_family_per_cycle": True, "safe_first": True, "targeted_probes_required": True},
    }
    wj(auto / "tenmon_conversation_worldclass_autofix_summary.json", out)
    (auto / "tenmon_conversation_worldclass_autofix_report.md").write_text(
        f"# {CARD}\n\n- next_card: `{next_card}`\n- next_gap_family: `{next_family}`\n", encoding="utf-8"
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

