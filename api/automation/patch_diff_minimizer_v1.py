#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""git diff --stat を読み、分割・最小化提案（read-only）"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from self_repair_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def _repo_root() -> Path:
    return api_automation().parents[1]


def git_diff_stat() -> str:
    try:
        p = subprocess.run(
            ["git", "diff", "--stat", "HEAD"],
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        return (p.stdout or "")[-12000:]
    except Exception as e:
        return str(e)


def suggest() -> Dict[str, Any]:
    stat = git_diff_stat()
    lines = len(stat.splitlines())
    large = lines > 80 or len(stat) > 8000
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "git_diff_stat": stat[:4000],
        "large_diff_hint": large,
        "suggestions": [
            "ファイル単位でコミットを分割する",
            "1 PR = 1 検証に揃える",
            "chat.ts は触らず automation のみに限定する",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="patch_diff_minimizer_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = suggest()
    out = Path(args.out) if args.out else api_automation() / "patch_diff_minimizer_report.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
