#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_CONVERSATION_QUALITY_AUTO_PRIORITY_CARD_GENERATOR_CURSOR_AUTO_V1."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_QUALITY_AUTO_PRIORITY_CARD_GENERATOR_CURSOR_AUTO_V1"
SUMMARY_NAME = "tenmon_conversation_quality_priority_summary.json"
GENERATED_NAME = "conversation_quality_generated_cards.json"
CONVERGENCE_NAME = "state_convergence_next_cards.json"


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def run_generator(api_root: Path) -> dict[str, Any]:
    auto = api_root / "automation"
    summary = _read_json(auto / SUMMARY_NAME)
    priority_cards = [
        "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
        "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
        "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
        "TENMON_PWA_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1",
        "TENMON_FACTUAL_POLISH_AND_RESPONSE_NATURALIZATION_CURSOR_AUTO_V1",
    ]
    requested = [str(x) for x in (summary.get("recommended_next_cards") or []) if str(x).strip()]
    cards = [c for c in priority_cards if c in requested]
    for c in requested:
        if c not in cards:
            cards.append(c)

    manual_cards = [str(x) for x in (summary.get("manual_gate_cards") or []) if str(x).strip()]
    safe_cards = [str(x) for x in (summary.get("safe_next_cards") or []) if str(x).strip()]
    dialogue_findings = summary.get("dialogue_quality_findings") if isinstance(summary.get("dialogue_quality_findings"), dict) else {}
    requires_human = []
    for axis, arr in dialogue_findings.items():
        if not isinstance(arr, list) or not arr:
            continue
        target_file = "api/src/routes/chat.ts"
        if "subconcept" in axis:
            target_file = "api/src/routes/chat_refactor/finalize.ts"
        if "continuity" in axis:
            target_file = "web/src/**"
        requires_human.append(
            {
                "card_id": f"HUMAN_REVIEW_{axis.upper()}_V1",
                "title": f"要人間レビュー: {axis}",
                "safe_auto_fix": False,
                "requires_human_approval": True,
                "target_file": target_file,
                "evidence_count": len(arr),
            }
        )
    # manual_gate_cards で明示された high-risk を必ず review list に残す
    for c in manual_cards:
        if not any(str(x.get("card_id")) == c for x in requires_human):
            requires_human.append(
                {
                    "card_id": c,
                    "title": f"manual gate required: {c}",
                    "safe_auto_fix": False,
                    "requires_human_approval": True,
                    "target_file": "api/src/routes/chat.ts",
                    "evidence_count": 1,
                }
            )
    out = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "safe_auto_fix_only": True,
        "candidates": [{"card_id": c, "safe_auto_fix": True} for c in safe_cards] + [{"card_id": c, "safe_auto_fix": False} for c in cards if c in manual_cards],
        "safe_next_cards": safe_cards,
        "manual_gate_cards": manual_cards,
        "recommended_next_cards": cards,
        "requires_human_approval_cards": requires_human[:10],
        "auto_fix_cards_generated": bool(safe_cards or cards),
    }
    (auto / GENERATED_NAME).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    convergence = {
        "version": 3,
        "card": CARD,
        "generated_at": out["generated_at"],
        "next_cards": (safe_cards + cards)[:6],
    }
    (auto / CONVERGENCE_NAME).write_text(json.dumps(convergence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> int:
    api_root = _repo_api()
    p = api_root / "automation" / SUMMARY_NAME
    if not p.is_file():
        print(json.dumps({"ok": False, "error": "missing_priority_summary_run_analyzer_first"}, ensure_ascii=False))
        return 1
    out = run_generator(api_root)
    print(json.dumps({"ok": True, "path": str(api_root / "automation" / GENERATED_NAME), "count": len(out["candidates"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
