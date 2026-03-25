#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""full_risk_map.json — シェル/Python の高リスクパターン検出（read-only grep）"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from observation_os_common_v1 import CARD, VERSION, api_root, utc_now_iso

PATTERNS: List[tuple[str, re.Pattern[str]]] = [
    ("systemd", re.compile(r"systemctl")),
    ("sudo", re.compile(r"\bsudo\b")),
    ("curl_http", re.compile(r"curl\s+.*https?://")),
    ("subprocess_shell", re.compile(r"shell\s*=\s*True")),
    ("database_sqlite", re.compile(r"sqlite|\.sqlite", re.I)),
    ("env_secret", re.compile(r"PASSWORD|SECRET|API_KEY|TOKEN", re.I)),
    ("remote_ssh", re.compile(r"\bssh\b|scp\b")),
]


def _scan_file(path: Path) -> List[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    tags: List[str] = []
    for name, pat in PATTERNS:
        if pat.search(text):
            tags.append(name)
    return tags


def _scan() -> Dict[str, Any]:
    api = api_root()
    hits: List[Dict[str, Any]] = []
    for base in (api / "automation", api / "scripts"):
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file():
                continue
            if p.name.startswith("."):
                continue
            if p.suffix not in (".py", ".sh", ".mjs"):
                continue
            if "node_modules" in str(p) or "dist" in p.parts:
                continue
            tags = _scan_file(p)
            if tags:
                rel = str(p.relative_to(api.parent))
                hits.append({"path": rel, "risk_tags": sorted(set(tags))})
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "pattern_names": [n for n, _ in PATTERNS],
        "files_with_risk_tags": sorted(hits, key=lambda x: x["path"])[:500],
        "file_count": len(hits),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="risk_map_v1")
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
        lines = ["# Risk map", "", f"- files tagged: {body['file_count']}", ""]
        for h in body["files_with_risk_tags"][:60]:
            lines.append(f"- `{h['path']}`: {', '.join(h['risk_tags'])}")
        Path(args.write_md).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
