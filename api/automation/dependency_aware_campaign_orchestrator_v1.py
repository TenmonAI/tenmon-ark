#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""マニフェスト + 実行順序を統合し feature_execution_queue.json を生成。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from execution_ordering_engine_v1 import build as order_build
from feature_autobuild_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def build(manifest: Dict[str, Any], ordered: Dict[str, Any]) -> Dict[str, Any]:
    cards = ordered.get("cards") or manifest.get("cards") or []
    queue: List[Dict[str, Any]] = []
    for c in sorted(cards, key=lambda x: int(x.get("order_index") or 0)):
        queue.append(
            {
                "id": str(c.get("id")),
                "card_name": c.get("card_name"),
                "objective": c.get("objective"),
                "depends_on": list(c.get("depends_on") or []),
                "order_index": c.get("order_index"),
                "parallel_group": _parallel_group(ordered, str(c.get("id"))),
                "status": "pending",
            }
        )

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "feature_id": manifest.get("feature_id"),
        "parallel_policy": manifest.get("parallel_policy") or "dependency_aware",
        "dag_ok": bool(ordered.get("dag_ok")),
        "execution_order": ordered.get("execution_order") or [],
        "layers": ordered.get("layers") or [],
        "queue": queue,
        "campaign": {
            "source_manifest": "feature_cards_manifest.json",
            "source_order": "feature_execution_order.json",
        },
    }


def _parallel_group(ordered: Dict[str, Any], cid: str) -> int:
    layers: List[List[str]] = ordered.get("layers") or []
    for i, layer in enumerate(layers):
        if cid in layer:
            return i
    return -1


def main() -> int:
    ap = argparse.ArgumentParser(description="dependency_aware_campaign_orchestrator_v1")
    ap.add_argument("--manifest-file", type=str, default="")
    ap.add_argument("--order-file", type=str, default="", help="未指定時は manifest から再計算")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    mpath = Path(args.manifest_file) if args.manifest_file else auto / "feature_cards_manifest.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8", errors="replace"))

    if args.order_file:
        ordered = json.loads(Path(args.order_file).read_text(encoding="utf-8", errors="replace"))
    else:
        ordered = order_build(manifest)

    body = build(manifest, ordered)
    out = Path(args.out) if args.out else auto / "feature_execution_queue.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
