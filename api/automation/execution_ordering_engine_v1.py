#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""depends_on に基づきトポロジカル順序・レイヤーを計算。"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from feature_autobuild_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def topological_sort(card_ids: List[str], depends: Dict[str, List[str]]) -> Tuple[List[str], bool]:
    """depends[a]=[b] means a depends on b（b を先に実行）。"""
    in_deg: Dict[str, int] = defaultdict(int)
    nodes: Set[str] = set(card_ids)
    for c in card_ids:
        in_deg[c] = 0
    adj: Dict[str, List[str]] = defaultdict(list)
    for c in card_ids:
        for d in depends.get(c, []):
            if d in nodes:
                adj[d].append(c)
                in_deg[c] += 1
    q = deque([n for n in card_ids if in_deg[n] == 0])
    out: List[str] = []
    while q:
        n = q.popleft()
        out.append(n)
        for m in adj[n]:
            in_deg[m] -= 1
            if in_deg[m] == 0:
                q.append(m)
    ok = len(out) == len(card_ids)
    return out, ok


def build(manifest: Dict[str, Any]) -> Dict[str, Any]:
    cards = manifest.get("cards") or []
    ids = [str(c["id"]) for c in cards]
    depends: Dict[str, List[str]] = {str(c["id"]): list(c.get("depends_on") or []) for c in cards}
    order, dag_ok = topological_sort(ids, depends)

    layers: List[List[str]] = []
    if dag_ok:
        placed: Set[str] = set()
        id_set = set(ids)
        while len(placed) < len(id_set):
            layer: List[str] = []
            for cid in order:
                if cid in placed:
                    continue
                preds = set(depends.get(cid, [])) & id_set
                if preds <= placed:
                    layer.append(cid)
            if not layer:
                break
            for x in layer:
                placed.add(x)
            layers.append(layer)

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "feature_id": manifest.get("feature_id"),
        "execution_order": order,
        "dag_ok": dag_ok,
        "layers": layers if dag_ok else [],
        "cards": [
            {
                **c,
                "order_index": order.index(str(c["id"])) if str(c["id"]) in order else -1,
            }
            for c in cards
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="execution_ordering_engine_v1")
    ap.add_argument("--manifest-file", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    path = Path(args.manifest_file) if args.manifest_file else auto / "feature_cards_manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    body = build(manifest)
    out = Path(args.out) if args.out else auto / "feature_execution_order.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
