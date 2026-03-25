#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""retry_queue.json — 1 回で 1 変更=1 検証のキュー（最大 3）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from self_repair_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def build_queue() -> Dict[str, Any]:
    auto = api_automation()
    fc = _read(auto / "fail_classification.json")
    alt = _read(auto / "alternate_strategy.json")
    primary = fc.get("primary_fail_type") or "runtime_regression"
    steps: List[Dict[str, Any]] = []
    alts = alt.get("alternate_strategies") or []
    if alts:
        first = alts[0]
        for i, step in enumerate((first.get("steps") or [])[:3], start=1):
            steps.append(
                {
                    "order": i,
                    "verification": "single",
                    "action": step,
                    "fail_type": primary,
                }
            )
    if not steps:
        steps = [
            {"order": 1, "verification": "single", "action": "read fail_classification.json", "fail_type": primary},
        ]
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "policy": "one_change_one_verify",
        "max_steps": 3,
        "queue": steps[:3],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="retry_queue_orchestrator_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = build_queue()
    out = Path(args.out) if args.out else api_automation() / "retry_queue.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
