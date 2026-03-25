#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""危険パッチパターンを検出・正規化拒否（read-only チェック）"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

FORBIDDEN_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("rm_rf", re.compile(r"\brm\s+(-[rf]+\s+)?/")),
    ("drop_table", re.compile(r"\bDROP\s+TABLE\b", re.I)),
    ("truncate", re.compile(r"\bTRUNCATE\s+TABLE\b", re.I)),
    ("dd_disk", re.compile(r"\bdd\s+.*\bof=/dev/")),
    ("chmod_777", re.compile(r"\bchmod\s+[-+]?[rwxst]*777\b")),
    ("curl_pipe_sh", re.compile(r"curl\s+[^|]+\|\s*(ba)?sh")),
    ("eval_base64", re.compile(r"base64\s+-d.*\|\s*(ba)?sh")),
]


def analyze_patch(text: str) -> Dict[str, Any]:
    hits: List[Dict[str, str]] = []
    for name, pat in FORBIDDEN_PATTERNS:
        if pat.search(text):
            hits.append({"rule": name, "severity": "reject"})
    return {
        "ok": len(hits) == 0,
        "rejections": hits,
        "rules_checked": [n for n, _ in FORBIDDEN_PATTERNS],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="patch_safety_normalizer_v2")
    ap.add_argument("--patch-file", type=str, default="", help="検査するパッチ/スクリプト断片")
    ap.add_argument("--stdin", action="store_true")
    args = ap.parse_args()
    text = ""
    if args.patch_file:
        text = Path(args.patch_file).read_text(encoding="utf-8", errors="replace")
    elif args.stdin:
        import sys

        text = sys.stdin.read()
    body = analyze_patch(text)
    print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0 if body["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
