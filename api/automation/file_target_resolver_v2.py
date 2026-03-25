#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EDIT_SCOPE / DO_NOT_TOUCH テキストから編集許可ルートを解決"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Set

from cursor_autobuild_common_v2 import VERSION, utc_now_iso

SCOPE_HINTS: List[tuple[str, str]] = [
    (r"api/automation", "api/automation/**"),
    (r"api/scripts", "api/scripts/**"),
    (r"api/docs", "api/docs/**"),
    (r"chat\.ts|routes/chat", "api/src/routes/chat.ts"),
    (r"constitution", "api/docs/constitution/**"),
    (r"generated_cursor_apply", "api/automation/generated_cursor_apply/**"),
]


def resolve_from_text(edit_scope: str, do_not_touch: str) -> Dict[str, Any]:
    allowed: Set[str] = set()
    forbidden: Set[str] = set()
    for pat, glob in SCOPE_HINTS:
        if re.search(pat, edit_scope, re.I):
            allowed.add(glob)
    # DO_NOT_TOUCH 明示
    for line in do_not_touch.splitlines():
        line = line.strip().strip("-•")
        if "dist" in line.lower():
            forbidden.add("dist/**")
        if "chat.ts" in line and "本体" in line:
            forbidden.add("api/src/routes/chat.ts")
        if "schema" in line.lower() and "db" in line.lower():
            forbidden.add("api/src/db/**")
        if "/api/chat" in line or "契約" in line:
            forbidden.add("api/src/routes/chat.ts:/api/chat contract")
    return {
        "version": VERSION,
        "generatedAt": utc_now_iso(),
        "allowed_globs": sorted(allowed) or ["api/automation/**"],
        "forbidden_globs": sorted(forbidden),
        "notes": "ヒューリスティクス — カード本文を人手で上書き可能",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="file_target_resolver_v2")
    ap.add_argument("--card-md", type=str, default="", help="カード markdown パス")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    edit_scope = "api/automation/**\napi/scripts/**\napi/docs/constitution/**\n"
    do_not = "dist/**\nchat.ts 本体\n"
    if args.card_md:
        raw = Path(args.card_md).read_text(encoding="utf-8", errors="replace")
        m = re.search(
            r"EDIT_SCOPE:?\s*([\s\S]*?)(?=DO_NOT_TOUCH|ACCEPTANCE|##\s*DO_NOT|$)",
            raw,
            re.I,
        )
        if m:
            edit_scope = m.group(1)
        m2 = re.search(
            r"DO_NOT_TOUCH:?\s*([\s\S]*?)(?=IMPLEMENTATION|ACCEPTANCE|##\s*IMPLEMENTATION|$)",
            raw,
            re.I,
        )
        if m2:
            do_not = m2.group(1)
    body = resolve_from_text(edit_scope, do_not)
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
