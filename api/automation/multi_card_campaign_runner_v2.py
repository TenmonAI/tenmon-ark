#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""1 つのキャンペーンを 1→N カード手順へ分解し manifest を生成"""
from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List

from cursor_autobuild_common_v2 import VERSION, utc_now_iso


def build_manifest(steps: List[Dict[str, Any]], campaign_name: str) -> Dict[str, Any]:
    cid = str(uuid.uuid4())[:8]
    out_steps: List[Dict[str, Any]] = []
    for i, s in enumerate(steps, start=1):
        out_steps.append(
            {
                "order": i,
                "card_name": s.get("card_name", f"STEP_{i}"),
                "source_md": s.get("source_md", ""),
                "depends_on": s.get("depends_on", []),
            }
        )
    return {
        "version": VERSION,
        "generatedAt": utc_now_iso(),
        "campaign_id": f"{campaign_name}_{cid}",
        "campaign_name": campaign_name,
        "parallel_policy": "single_flight",
        "steps": out_steps,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="multi_card_campaign_runner_v2")
    ap.add_argument("--steps-json", type=str, default="", help='[{"card_name":"...", "source_md":"..."}, ...]')
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--name", type=str, default="default_campaign")
    args = ap.parse_args()
    steps: List[Dict[str, Any]] = []
    if args.steps_json:
        steps = json.loads(Path(args.steps_json).read_text(encoding="utf-8"))
    else:
        steps = [
            {
                "card_name": "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1",
                "source_md": "api/automation/generated_cursor_apply/TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1.md",
            }
        ]
    body = build_manifest(steps, args.name)
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else Path(__file__).resolve().parent / "cursor_campaign_manifest.json"
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out), "steps": len(body["steps"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
