#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_QUALITY — Phase C
analyzer 出力のみを入力とし、**安全な範囲**の次カード候補（JSON / md 断片）を生成する。
api/src/routes/chat.ts の自動パッチは行わない（high-risk 禁止）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

CARD = "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1"
SUMMARY_NAME = "conversation_quality_analyzer_summary.json"
GENERATED_NAME = "conversation_quality_generated_cards.json"


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_summary(api_root: Path) -> Dict[str, Any]:
    p = api_root / "automation" / SUMMARY_NAME
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except json.JSONDecodeError:
        return {}


def _safe_probe_card() -> Dict[str, Any]:
    return {
        "card_id": "CONV_QUALITY_SAFE_PROBE_PACK_V1",
        "title": "会話品質フォロー用プローブ（低リスク・観測のみ）",
        "safe_auto_fix": True,
        "edit_scope": ["api/automation/conversation_quality_safe_probe_pack_v1.json"],
        "markdown_body": (
            "## CONV_QUALITY_SAFE_PROBE_PACK_V1\n\n"
            "次を同一 threadId で実行し、`ku.routeReason` を記録する。\n\n"
            "1. 言霊とは何か → 教えて / 続けて / もっと\n"
            "2. 今日の大分の天気は？\n"
            "3. それは違います\n"
            "4. こんにちは（【天聞の所見】先頭の有無）\n"
        ),
        "json_payload": {
            "probes": [
                {"thread_hint": "same_thread", "sequence": ["言霊とは何か", "教えて"], "expect_route_contains": "CONTINUITY"},
                {"thread_hint": "fresh", "sequence": ["今日の大分の天気は？"], "expect_route": "FACTUAL_WEATHER_V1"},
                {"thread_hint": "fresh", "sequence": ["それは違います"], "expect_route": "FACTUAL_CORRECTION_V1"},
                {"thread_hint": "fresh", "sequence": ["こんにちは"], "expect_response_prefix": "【天聞の所見】"},
            ]
        },
    }


def _human_card_for_pattern(p: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "card_id": f"HUMAN_{p.get('type', 'UNKNOWN')}_V1",
        "title": f"要人間承認: {p.get('type')}",
        "safe_auto_fix": False,
        "requires_human_approval": True,
        "target_file": p.get("target_file"),
        "fix_hint": p.get("fix_hint"),
        "sample_messages": p.get("sample_messages") or [],
        "markdown_body": (
            f"### {p.get('type')}\n"
            f"- count: {p.get('count')}\n"
            f"- hint: {p.get('fix_hint')}\n"
            f"- **chat.ts 手動レビュー**（自動適用禁止）\n"
        ),
    }


def run_generator(api_root: Path) -> Dict[str, Any]:
    summary = _read_summary(api_root)
    patterns = [p for p in (summary.get("patterns") or []) if int(p.get("count") or 0) > 0]

    candidates: List[Dict[str, Any]] = [_safe_probe_card()]
    requires_human: List[Dict[str, Any]] = []

    for p in patterns:
        if p.get("auto_fixable"):
            continue
        requires_human.append(_human_card_for_pattern(p))

    out = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "candidates": candidates,
        "requires_human_approval_cards": requires_human,
        "auto_fix_cards_generated": len(candidates) >= 1,
        "safe_auto_fix_only": True,
    }

    (api_root / "automation" / GENERATED_NAME).write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    summary["auto_fix_cards_generated"] = bool(out["auto_fix_cards_generated"])
    summary["generated_card_candidate_count"] = len(candidates)
    summary["requires_human_approval_card_count"] = len(requires_human)
    summary["requires_human_approval_separated"] = True
    (api_root / "automation" / SUMMARY_NAME).write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return out


def main() -> int:
    argparse.ArgumentParser().parse_args()
    api_root = _repo_api()
    if not (api_root / "automation" / SUMMARY_NAME).is_file():
        print(json.dumps({"ok": False, "error": "missing_summary_run_analyzer_first"}, ensure_ascii=False))
        return 1
    run_generator(api_root)
    print(json.dumps({"ok": True, "path": str(api_root / "automation" / GENERATED_NAME)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
