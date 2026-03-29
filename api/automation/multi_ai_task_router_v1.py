#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA — task router

課題テキストと observation を見て、層の実行順と各層の入力束を決める。
fail-closed: 不明瞭な課題は structure 前に HOLD 推奨フラグを立てる（executor が最終判定）。
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def _read_contract(auto_dir: Path) -> dict[str, Any]:
    p = auto_dir / "multi_ai_role_contract_v1.json"
    if not p.is_file():
        return {}
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def route_task(
    *,
    issue_text: str,
    observation: dict[str, Any],
    auto_dir: Path,
) -> dict[str, Any]:
    """
    返却: task_router_result.json 相当（層順・推奨エージェント・HOLD ヒント）
    """
    contract = _read_contract(auto_dir)
    text = (issue_text or "").strip()
    low = text.lower()

    needs_browser = bool(
        re.search(r"http|api\.|stripe|oauth|外部|仕様|ライブラリ|バージョン", text, re.I)
        or re.search(r"browser|fetch|curl", low)
    )
    vague = len(text) < 8

    layers_order = [
        "observation",
        "structure",
        "audit",
        "arbitration",
        "card_synthesis",
        "execution",
        "reality",
        "feedback",
    ]

    return {
        "schema": "MULTI_AI_TASK_ROUTER_RESULT_V1",
        "issue_excerpt": text[:2000],
        "layers_order": layers_order,
        "flags": {
            "suggest_browser_ai": needs_browser,
            "suggest_hold_vague_issue": vague,
            "one_loop_one_card": bool(contract.get("one_loop_one_card", True)),
        },
        "per_layer_inputs": {
            "structure": {
                "from": ["observation_bundle.json"],
                "agent": "gemini",
            },
            "audit": {
                "from": ["structured_summary.md", "comparison_table.json", "options.json"],
                "agent": "claude",
            },
            "arbitration": {
                "from": ["design_risks.json", "acceptance_refined.md", "options.json"],
                "agent": "gpt_tenmon",
            },
            "card_synthesis": {
                "from": ["adopted_plan.json", "center_decision.md"],
                "agents": ["gemini", "claude_assist"],
            },
        },
        "observation_keys_present": sorted(observation.keys()) if observation else [],
    }
