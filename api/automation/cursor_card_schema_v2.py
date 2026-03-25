#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""cursor_card_schema_v2.json — Cursor 完全自動構築用カードスキーマ（markdown 1 source）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from cursor_autobuild_common_v2 import REQUIRED_CARD_FIELDS, VERSION, api_automation, utc_now_iso


def build_schema() -> Dict[str, Any]:
    return {
        "version": VERSION,
        "card_format": "markdown_single_source",
        "generatedAt": utc_now_iso(),
        "required_fields": list(REQUIRED_CARD_FIELDS),
        "field_conventions": {
            "CARD_NAME": "先頭付近に `CARD_NAME: TENMON_...` 形式",
            "sections": "各フィールドは見出し `## OBJECTIVE` または行 `OBJECTIVE:` で開始",
        },
        "outputs_expected": [
            "cursor_campaign_manifest.json",
            "cursor_result_bundle.json",
            "cursor_retry_queue.json",
        ],
        "notes": [
            "VPS bash と Cursor 指示を混在させない — 本スキーマに従う 1 ファイルに統一",
            "multi-card campaign は cursor_campaign_manifest.json で 1→N 分解",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="cursor_card_schema_v2")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = build_schema()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "cursor_card_schema_v2.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
