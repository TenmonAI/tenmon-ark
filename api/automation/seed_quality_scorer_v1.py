#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""seed_quality（learning_seed_quality taxonomy）read-only 集計。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

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


def _count_seed(pq: Dict[str, Any]) -> int:
    n = 0
    for bucket in ("ready", "pending", "blocked"):
        for row in pq.get(bucket) or []:
            tid = str(row.get("taxonomy_id") or "")
            if tid == "learning_seed_quality":
                n += 1
                continue
            b = str(row.get("blocker") or "").lower()
            bts = row.get("blocker_types") or []
            if "seed" in b or "kg1" in b or any("kg1" in str(x).lower() or "seed" in str(x).lower() for x in bts):
                n += 1
    return n


def build() -> Dict[str, Any]:
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

    raw = _count_seed(pq)
    base = score_from_blockers(raw, weight=6.0)
    score = int(base * status_multiplier(unified))

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "metric": "seed_quality",
        "score": score,
        "raw_blocker_hits": raw,
        "unified_status": unified or None,
        "inputs": {
            "priority_queue": str(priority_queue_path()),
            "orchestrator_queue": str(orch_path),
        },
        "notes": "read-only: KG1 / deterministic seed 系 blocker 近似",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="seed_quality_scorer_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "seed_quality_report.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
