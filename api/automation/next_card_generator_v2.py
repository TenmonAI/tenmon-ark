#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ready キューを 1〜3 枚に整形（priority_queue.json / orchestrator 由来）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from cursor_autobuild_common_v2 import VERSION, api_automation, utc_now_iso


def pick_ready(pq_path: Path, limit: int = 3) -> List[Dict[str, Any]]:
    data = json.loads(pq_path.read_text(encoding="utf-8"))
    ready = data.get("ready") or []
    out: List[Dict[str, Any]] = []
    for r in ready[:limit]:
        out.append(
            {
                "cursor_card": r.get("cursor_card"),
                "vps_card": r.get("vps_card"),
                "source": r.get("source"),
                "blocker_types": r.get("blocker_types") or [],
            }
        )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="next_card_generator_v2")
    ap.add_argument(
        "--priority-queue",
        type=str,
        default="",
        help="既定: api/automation/priority_queue.json",
    )
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--max", type=int, default=3)
    args = ap.parse_args()
    pq = Path(args.priority_queue) if args.priority_queue else api_automation() / "priority_queue.json"
    if not pq.is_file():
        body = {
            "version": VERSION,
            "generatedAt": utc_now_iso(),
            "ready_next_cards": [],
            "note": "priority_queue.json missing — run observation_os_v1 first",
        }
    else:
        body = {
            "version": VERSION,
            "generatedAt": utc_now_iso(),
            "ready_next_cards": pick_ready(pq, min(3, max(1, args.max))),
            "source": str(pq),
        }
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "cursor_ready_next_cards_v2.json"
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out), "count": len(body.get("ready_next_cards", []))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
