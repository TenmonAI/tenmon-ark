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
    cards = [str(x) for x in (summary.get("recommended_next_cards") or []) if str(x).strip()]
    findings = summary.get("quality_findings") if isinstance(summary.get("quality_findings"), dict) else {}
    requires_human = []
    for axis, arr in findings.items():
        if not isinstance(arr, list) or not arr:
            continue
        requires_human.append(
            {
                "card_id": f"HUMAN_REVIEW_{axis.upper()}_V1",
                "title": f"要人間レビュー: {axis}",
                "safe_auto_fix": False,
                "requires_human_approval": True,
                "target_file": "api/src/routes/chat.ts",
                "evidence_count": len(arr),
            }
        )
    out = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "safe_auto_fix_only": True,
        "candidates": [{"card_id": c, "safe_auto_fix": True} for c in cards],
        "requires_human_approval_cards": requires_human[:10],
        "auto_fix_cards_generated": bool(cards),
    }
    (auto / GENERATED_NAME).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    convergence = {
        "version": 3,
        "card": CARD,
        "generated_at": out["generated_at"],
        "next_cards": cards[:6],
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
