#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""管理者向け自然言語要求を構造化 JSON に変換（ヒューリスティック）。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from feature_autobuild_common_v1 import CARD, VERSION, api_automation, parse_intent_text, utc_now_iso


def build(request: str) -> Dict[str, Any]:
    intent = parse_intent_text(request)
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "kind": "feature_intent",
        "intent": intent,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="feature_intent_parser_v1")
    ap.add_argument("--request", type=str, default="", help="自然言語 1 ブロック")
    ap.add_argument("--request-file", type=str, default="", help="要求テキストファイル")
    ap.add_argument("--out", type=str, default="", help="既定: api/automation/feature_intent.json")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    text = args.request
    if args.request_file:
        text = Path(args.request_file).read_text(encoding="utf-8", errors="replace")
    body = build(text)
    out = Path(args.out) if args.out else api_automation() / "feature_intent.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
