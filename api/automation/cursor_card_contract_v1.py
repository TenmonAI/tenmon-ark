#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_03 — Cursor カード標準契約（必須フィールド固定）
出力: cursor_card_schema.json（kernel 正本。v2 の cursor_card_schema_v2.json と併存）
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1"

REQUIRED_CARD_FIELDS: Tuple[str, ...] = (
    "CARD_NAME",
    "OBJECTIVE",
    "WHY_NOW",
    "EDIT_SCOPE",
    "DO_NOT_TOUCH",
    "IMPLEMENTATION_POLICY",
    "ACCEPTANCE",
    "VPS_VALIDATION_OUTPUTS",
    "FAIL_NEXT_CARD",
)


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_schema_machine() -> Dict[str, Any]:
    props = {
        fid: {"type": "string", "description": f"必須セクション `{fid}`（見出しまたは行ラベルで出現）"}
        for fid in REQUIRED_CARD_FIELDS
    }
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "format": "markdown_single_file",
        "required": list(REQUIRED_CARD_FIELDS),
        "properties": props,
        "conventions": {
            "CARD_NAME": "先頭付近 `CARD_NAME: TENMON_...` または `## CARD_NAME`",
            "sections": "各フィールドは `## OBJECTIVE` または行 `OBJECTIVE:` で検出",
        },
        "canonical_output_dir": "api/automation/generated_cursor_apply",
        "notes": [
            "kernel 経由で生成された MD のみを正とする（手編集は PR で契約検証）",
            "v2 bridge の REQUIRED_CARD_FIELDS と同一 9 項目",
        ],
    }


def validate_card_markdown(text: str) -> Dict[str, Any]:
    missing: List[str] = []
    for f in REQUIRED_CARD_FIELDS:
        if f not in text:
            missing.append(f)
    return {
        "ok": len(missing) == 0,
        "missing_fields": missing,
        "required_count": len(REQUIRED_CARD_FIELDS),
        "found_count": len(REQUIRED_CARD_FIELDS) - len(missing),
    }


def validate_card_file(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {"ok": False, "error": "file_not_found", "path": str(path)}
    return {**validate_card_markdown(path.read_text(encoding="utf-8", errors="replace")), "path": str(path)}


def main() -> int:
    ap = argparse.ArgumentParser(description="cursor_card_contract_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--validate", type=str, default="", help="検証する .md パス")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    body = build_schema_machine()
    out = Path(args.out) if args.out else auto / "cursor_card_schema.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.validate:
        v = validate_card_file(Path(args.validate))
        (auto / "cursor_card_contract_validation.json").write_text(
            json.dumps(v, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
        if args.stdout_json:
            print(json.dumps(v, ensure_ascii=False, indent=2))
        return 0 if v.get("ok") else 1

    if args.stdout_json:
        print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
