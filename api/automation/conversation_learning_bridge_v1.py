#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
会話側 blocker と学習側 blocker を automation 層で接続（chat.ts 非改変）。
verdict + 将来の会話改善 queue へ流す learning_blocker_dispatch。
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

from learning_integration_common_v1 import (
    CARD,
    VERSION,
    api_automation,
    orchestrator_dir,
    priority_queue_path,
    read_json,
    utc_now_iso,
)

# 会話 taxonomy → 学習で相乗効果のあるカード（full_orchestrator TYPE_DEFAULT と整合）
CONV_TO_LEARNING: List[Tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"surface|noise|worldclass", re.I), "surface", "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1"),
    (re.compile(r"route|authority", re.I), "route", "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1"),
    (re.compile(r"longform", re.I), "longform", "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1"),
    (re.compile(r"density|static", re.I), "density", "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1"),
]


def _gather_blockers(pq: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    conv: List[str] = []
    learn: List[str] = []
    conv_tax = {"surface", "route", "longform", "density", "runtime"}
    learn_tax = {"learning_input_quality", "learning_seed_quality", "evidence_grounding"}

    for bucket in ("ready", "pending", "blocked"):
        for row in pq.get(bucket) or []:
            tid = str(row.get("taxonomy_id") or "")
            bl = str(row.get("blocker") or row.get("reason") or "")
            if tid in conv_tax or (bl and tid in ("seal_contract", "")):
                if bl and bl not in conv:
                    conv.append(bl)
            if tid in learn_tax:
                if bl and bl not in learn:
                    learn.append(bl)
            elif tid in conv_tax:
                pass
            elif "kg" in bl.lower() or "seed" in bl.lower() or "evidence" in bl.lower():
                if bl and bl not in learn:
                    learn.append(bl)
    return conv[:40], learn[:40]


def _bridge_edges(conv_blockers: List[str]) -> List[Dict[str, Any]]:
    edges: List[Dict[str, Any]] = []
    for b in conv_blockers:
        for pat, dom, card in CONV_TO_LEARNING:
            if pat.search(b):
                edges.append(
                    {
                        "conversation_blocker": b,
                        "conversation_domain": dom,
                        "suggested_learning_vps_card": card,
                        "relation": "cross_domain_support",
                    }
                )
                break
    return edges[:30]


def _dispatch_learning_for_queue(
    pq: Dict[str, Any], orch: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """next 会話改善 queue に載せる learning blocker カード候補。"""
    out: List[Dict[str, Any]] = []
    if "queue" in orch:
        orch = orch["queue"]
    for row in orch.get("next_queue") or []:
        if str(row.get("system") or "") == "kokuzo_learning":
            out.append(
                {
                    "kind": "learning_improvement_card",
                    "cursor_card": row.get("cursor_card"),
                    "vps_card": row.get("vps_card"),
                    "blocker_types": row.get("blocker_types") or [],
                    "source_blockers": row.get("source_blockers") or [],
                    "target_queue": "conversation_improvement_next",
                    "note": "orchestrator next_queue から learning を会話改善フローへ橋渡し",
                }
            )
    # pending に learning があれば secondary
    for row in orch.get("pending_queue") or []:
        if str(row.get("system") or "") != "kokuzo_learning":
            continue
        out.append(
            {
                "kind": "learning_improvement_card_pending",
                "cursor_card": row.get("cursor_card"),
                "vps_card": row.get("vps_card"),
                "blocker_types": row.get("blocker_types") or [],
                "target_queue": "conversation_improvement_next_secondary",
            }
        )
        if len(out) >= 12:
            break

    # priority_queue から learning taxonomy を直接 dispatch
    for bucket in ("ready", "pending"):
        for row in pq.get(bucket) or []:
            tid = str(row.get("taxonomy_id") or "")
            if tid in ("learning_input_quality", "learning_seed_quality", "evidence_grounding"):
                out.append(
                    {
                        "kind": "learning_blocker_from_priority_queue",
                        "taxonomy_id": tid,
                        "blocker": row.get("blocker"),
                        "source": row.get("source"),
                        "target_queue": "conversation_improvement_next",
                    }
                )
    return out[:25]


def build() -> Dict[str, Any]:
    pq = read_json(priority_queue_path())
    orch_path = orchestrator_dir() / "full_orchestrator_queue.json"
    if not orch_path.is_file():
        alt = orchestrator_dir() / "orchestrator_snap" / "full_orchestrator_queue.json"
        if alt.is_file():
            orch_path = alt
    orch = read_json(orch_path)

    conv_b, learn_b = _gather_blockers(pq)
    edges = _bridge_edges(conv_b)
    dispatch = _dispatch_learning_for_queue(pq, orch)

    gap = bool(conv_b and not learn_b) or bool(learn_b and not conv_b)
    if conv_b and learn_b:
        verdict = "connect"
    elif gap:
        verdict = "gap"
    else:
        verdict = "idle"

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "verdict": verdict,
        "summary": {
            "conversation_blocker_count": len(conv_b),
            "learning_blocker_count": len(learn_b),
        },
        "conversation_blockers_sample": conv_b[:15],
        "learning_blockers_sample": learn_b[:15],
        "conversation_to_learning_edges": edges,
        "learning_blocker_dispatch_for_improvement_queue": dispatch,
        "inputs": {
            "priority_queue": str(priority_queue_path()),
            "orchestrator_queue": str(orch_path),
        },
        "policy": "chat.ts 非改変; automation のみで verdict と dispatch を生成",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="conversation_learning_bridge_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "conversation_learning_bridge.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
