#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mac ローカル: 任意依存の有無を JSON で出す（VPS では platform で即終了）。"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description="mac_local_env_probe_v1")
    ap.add_argument("--out", default="", help="default: api/automation/mac_local_env_probe_summary.json")
    args = ap.parse_args()
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    out = Path(args.out) if args.out else auto / "mac_local_env_probe_summary.json"

    plat = sys.platform
    row: dict[str, object] = {"platform": plat, "darwin": plat == "darwin"}

    def try_import(name: str) -> bool:
        try:
            __import__(name)
            return True
        except Exception:
            return False

    row["pyautogui"] = try_import("pyautogui")
    row["PIL"] = try_import("PIL")
    row["pyperclip"] = try_import("pyperclip")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(row, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
