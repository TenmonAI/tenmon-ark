#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dry-run 検証用: watch loop が渡す item JSON を読み、何もせず成功終了する。"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: tenmon_cursor_executor_stub_v1.py <item.json>", file=sys.stderr)
        return 2
    p = Path(sys.argv[1])
    item = json.loads(p.read_text(encoding="utf-8"))
    print(json.dumps({"ok": True, "stub": True, "card": "TENMON_CURSOR_EXECUTOR_STUB_V1", "id": item.get("id")}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
