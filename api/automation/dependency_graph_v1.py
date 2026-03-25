#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""full_dependency_graph.json — automation/*.py の import 依存（read-only 静的解析）"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Set

from observation_os_common_v1 import CARD, VERSION, api_root, utc_now_iso


def _scan() -> Dict[str, Any]:
    api = api_root()
    auto = api / "automation"
    py_files = sorted(auto.glob("*.py"))
    stems: Set[str] = {p.stem for p in py_files}
    edges: List[Dict[str, str]] = []
    nodes: List[str] = [p.stem for p in py_files]

    pat = re.compile(r"^(?:from|import)\s+([a-zA-Z0-9_]+)", re.MULTILINE)
    for p in py_files:
        if p.name.startswith("_") and p.name != "_observation_os_common_v1.py":
            pass
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in pat.finditer(text):
            mod = m.group(1)
            if mod in stems and mod != p.stem:
                edges.append({"from": p.stem, "to": mod, "kind": "import"})

    # 重複除去
    seen = set()
    uniq: List[Dict[str, str]] = []
    for e in edges:
        k = (e["from"], e["to"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(e)

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "scope": "api/automation/*.py",
        "node_count": len(nodes),
        "edge_count": len(uniq),
        "nodes": nodes,
        "edges": uniq,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="dependency_graph_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--write-md", type=str, default="")
    args = ap.parse_args()

    body = _scan()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    if args.write_md:
        lines = [
            "# Dependency graph (automation)",
            "",
            f"nodes: {body['node_count']} edges: {body['edge_count']}",
            "",
        ]
        for e in body["edges"][:80]:
            lines.append(f"- `{e['from']}` → `{e['to']}`")
        Path(args.write_md).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
