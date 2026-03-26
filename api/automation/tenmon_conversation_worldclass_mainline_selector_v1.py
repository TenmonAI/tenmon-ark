#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_WORLDCLASS_MAINLINE_SELECTOR_CURSOR_AUTO_V1

会話品質の観測結果から safe_next_cards / manual_gate_cards / next_best_card を
single-source JSON/MD に集約する（観測専用）。
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_WORLDCLASS_MAINLINE_SELECTOR_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_conversation_worldclass_mainline_selector.json"
OUT_MD = "tenmon_conversation_worldclass_mainline_selector.md"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    analyzer = read_json(auto / "tenmon_conversation_quality_priority_summary.json")
    generated = read_json(auto / "conversation_quality_generated_cards.json")
    world = read_json(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json")
    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    forensic = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    score = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    rj_blockers = rejudge.get("remaining_blockers") if isinstance(rejudge.get("remaining_blockers"), list) else []
    rj_stale = bool(rejudge.get("stale_sources_present")) or any(str(x) == "stale_sources_present" for x in rj_blockers)
    stale = rj_stale if rejudge else (bool(analyzer.get("stale_sources_present")) or bool((world.get("dialogue_quality") or {}).get("stale_sources_present")))
    stale_sources = list({str(x) for x in (analyzer.get("stale_sources") or []) + ((world.get("dialogue_quality") or {}).get("stale_sources") or []) if str(x).strip()})

    safe_next_cards: list[str] = []
    for c in (world.get("outputs") or {}).get("safe_next_cards") or []:
        if isinstance(c, str) and c.strip():
            safe_next_cards.append(c.strip())
    if not safe_next_cards:
        for c in analyzer.get("recommended_next_cards") or []:
            if isinstance(c, str) and c.strip():
                safe_next_cards.append(c.strip())
    if not safe_next_cards:
        for c in generated.get("candidates") or []:
            if isinstance(c, dict) and c.get("safe_auto_fix") is True:
                cid = str(c.get("card_id") or "").strip()
                if cid:
                    safe_next_cards.append(cid)

    manual_gate_cards: list[str] = []
    for c in generated.get("requires_human_approval_cards") or []:
        if isinstance(c, dict):
            cid = str(c.get("card_id") or "").strip()
            if cid:
                manual_gate_cards.append(cid)

    next_best_card = (
        (world.get("outputs") or {}).get("next_best_card")
        or analyzer.get("next_best_card")
        or forensic.get("next_best_card")
    )
    if not isinstance(next_best_card, str) or not next_best_card.strip():
        next_best_card = safe_next_cards[0] if safe_next_cards else None

    out = {
        "card": CARD,
        "generated_at": utc(),
        "stale_sources_present": stale,
        "stale_sources": stale_sources,
        "primary_gap": score.get("primary_gap"),
        "current_blockers": list((world.get("outputs") or {}).get("current_blockers") or [])[:80],
        "quality_findings_axes": [str(x) for x in (world.get("dialogue_quality") or {}).get("quality_findings_axes") or [] if str(x).strip()],
        "safe_next_cards": safe_next_cards[:32],
        "manual_gate_cards": manual_gate_cards[:32],
        "next_best_card": next_best_card,
        "inputs": {
            "analyzer": str(auto / "tenmon_conversation_quality_priority_summary.json"),
            "generated_cards": str(auto / "conversation_quality_generated_cards.json"),
            "worldclass_loop": str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"),
            "forensic": str(auto / "tenmon_autonomy_current_state_forensic.json"),
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        },
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- stale_sources_present: `{out['stale_sources_present']}`",
        f"- next_best_card: `{out['next_best_card']}`",
        "",
        "## safe_next_cards",
        "",
    ]
    for c in out["safe_next_cards"]:
        md.append(f"- `{c}`")
    md.extend(["", "## manual_gate_cards", ""])
    for c in out["manual_gate_cards"]:
        md.append(f"- `{c}`")
    md.extend(["", "## stale_sources", ""])
    for s in out["stale_sources"]:
        md.append(f"- {s}")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(auto / OUT_JSON), "next_best_card": next_best_card}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

