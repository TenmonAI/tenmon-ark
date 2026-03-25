#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
learning_input_quality を read-only 集計（priority_queue / orchestrator）。
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
    score_from_blockers,
    status_multiplier,
    utc_now_iso,
)


def _count_taxonomy(pq: Dict[str, Any], tid: str) -> int:
    n = 0
    for bucket in ("ready", "pending", "blocked"):
        for row in pq.get(bucket) or []:
            if str(row.get("taxonomy_id") or "") == tid:
                n += 1
            elif tid == "learning_input_quality":
                bts = row.get("blocker_types") or []
                if any("learning_input" in str(x).lower() or "kg0" in str(x).lower() for x in bts):
                    n += 1
    return n


def _orchestrator_learning_hints(orch: Dict[str, Any]) -> List[str]:
    hints: List[str] = []
    if "queue" in orch:
        orch = orch["queue"]
    for key in ("next_queue", "pending_queue"):
        for row in orch.get(key) or []:
            sys = str(row.get("system") or "")
            bts = row.get("blocker_types") or []
            if sys == "kokuzo_learning" or any("learning_input" in str(b).lower() for b in bts):
                hints.append(str(row.get("cursor_card") or row.get("vps_card") or "learning_row"))
    return hints[:20]


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

    unified = str(orch.get("unified_status") or "")
    raw_count = _count_taxonomy(pq, "learning_input_quality")
    base = score_from_blockers(raw_count, weight=4.0)
    score = int(base * status_multiplier(unified))

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "metric": "learning_input_quality",
        "score": score,
        "raw_blocker_taxonomy_hits": raw_count,
        "unified_status": unified or None,
        "inputs": {
            "priority_queue": str(priority_queue_path()),
            "orchestrator_queue": str(orch_path),
        },
        "hints": {
            "orchestrator_learning_rows": _orchestrator_learning_hints(orch),
        },
        "notes": "read-only: priority_queue の taxonomy + orchestrator の learning 系行",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="learning_quality_scorer_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "learning_quality_report.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
