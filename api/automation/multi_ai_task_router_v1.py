#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA — task router
TENMON_CURSOR_AUTOBUILD_OPERATOR_BIND_CURSOR_AUTO_V1

課題テキストと observation を見て、層の実行順と各層の入力束を決める。
fail-closed: 不明瞭な課題は structure 前に HOLD 推奨フラグを立てる（executor が最終判定）。
Cursor オペレータ向けに VPS acceptance と課題テキスト blocklist ヒューリスティックを併記する。
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import cursor_executor_bridge_v1 as op_bridge


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
    candidate_card_id: str = "",
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

    vps_ok, vps_why = op_bridge.truth_vps_acceptance_pass_for_cursor(auto_dir)
    issue_blocked = op_bridge.cursor_operator_text_blocked(text[:12000]) is not None

    cand = (candidate_card_id or "").strip()
    card_gate: dict[str, Any] | None = None
    if cand:
        gok, gwhy, gate_hits = op_bridge.evaluate_cursor_operator_execution_gate(auto_dir, cand, text[:12000])
        card_gate = {
            "ok": gok,
            "reason": gwhy,
            "candidate_card_id": cand,
            "blocklist_hits": gate_hits,
        }

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
            "cursor_operator_issue_text_blocked": issue_blocked,
            "cursor_operator_vps_acceptance_pass": vps_ok,
        },
        "cursor_operator": {
            "bind_card": op_bridge.OPERATOR_BIND_CARD,
            "vps_acceptance_pass": vps_ok,
            "vps_acceptance_reason": vps_why,
            "issue_text_suggests_forbid": issue_blocked,
            "candidate_card_gate": card_gate,
            "result_return_contract_file": op_bridge.RESULT_RETURN_CONTRACT_FN,
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
