#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
route_learning_relevance / conversation_return_quality を read-only で束ねる。
学習成果 → route / surface / longform への還元カード候補。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from learning_integration_common_v1 import (
    CARD,
    VERSION,
    api_automation,
    orchestrator_dir,
    priority_queue_path,
    read_json,
    utc_now_iso,
)


def _route_relevance_score(pq: Dict[str, Any], orch: Dict[str, Any]) -> int:
    """route + learning が同時に pending にいるほど橋は生きているとみなす。"""
    if "queue" in orch:
        orch = orch["queue"]
    route_hits = 0
    learn_hits = 0
    for bucket in ("ready", "pending"):
        for row in pq.get(bucket) or []:
            tid = str(row.get("taxonomy_id") or "")
            if tid == "route":
                route_hits += 1
            if tid in ("learning_input_quality", "learning_seed_quality", "evidence_grounding"):
                learn_hits += 1
    for key in ("next_queue", "pending_queue"):
        for row in orch.get(key) or []:
            bts = " ".join(str(x) for x in (row.get("blocker_types") or [])).lower()
            if "route" in bts:
                route_hits += 1
            if str(row.get("system") or "") == "kokuzo_learning":
                learn_hits += 1
    # 両方あるとき高め、片方だけなら中程度
    if route_hits and learn_hits:
        return min(100, 78 + min(22, route_hits + learn_hits))
    if learn_hits or route_hits:
        return 55 + min(20, max(route_hits, learn_hits) * 3)
    return 72


def _conversation_return_score(
    lq: Dict[str, Any], seed: Dict[str, Any], ev: Dict[str, Any]
) -> int:
    """学習品質スコアの平均から会話還元の代理指標。"""
    s1 = int(lq.get("score") or 0)
    s2 = int(seed.get("score") or 0)
    s3 = int(ev.get("score") or 0)
    return int((s1 + s2 + s3) / 3)


def build() -> Dict[str, Any]:
    auto = api_automation()
    pq = read_json(priority_queue_path())
    orch_path = orchestrator_dir() / "full_orchestrator_queue.json"
    if not orch_path.is_file():
        alt = orchestrator_dir() / "orchestrator_snap" / "full_orchestrator_queue.json"
        if alt.is_file():
            orch_path = alt
    orch = read_json(orch_path)
    if "queue" in orch:
        orch = orch["queue"]

    lq = read_json(auto / "learning_quality_report.json")
    seed = read_json(auto / "seed_quality_report.json")
    ev = read_json(auto / "evidence_grounding_report.json")

    rlr = _route_relevance_score(pq, orch)
    crq = _conversation_return_score(lq, seed, ev)

    suggested: List[Dict[str, Any]] = [
        {"surface": "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1", "when": "kg2b_fractal_linked"},
        {"route": "CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2", "when": "candidate_return_green"},
        {"longform": "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1", "when": "evidence_grounding_green"},
    ]

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "metrics": {
            "route_learning_relevance": {
                "score": rlr,
                "note": "route 系と learning 系の同時顕在性（read-only 近似）",
            },
            "conversation_return_quality": {
                "score": crq,
                "note": "learning_input / seed / evidence スコアの合成（会話への還元代理）",
            },
        },
        "suggested_conversation_cards_after_learning": suggested,
        "inputs": {
            "priority_queue": str(priority_queue_path()),
            "orchestrator_queue": str(orch_path),
            "learning_quality_report": str(auto / "learning_quality_report.json"),
            "seed_quality_report": str(auto / "seed_quality_report.json"),
            "evidence_grounding_report": str(auto / "evidence_grounding_report.json"),
        },
        "policy": "read-only bridge; chat.ts 非改変",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="learning_to_route_bridge_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "learning_route_bridge.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
