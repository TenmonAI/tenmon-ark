#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""観測のみの rollback 提案（自動適用しない）"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def plan(repo: Path) -> Dict[str, Any]:
    suggestions: List[Dict[str, str]] = []
    try:
        p = subprocess.run(
            ["git", "log", "-3", "--format=%H %s"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        lines = [x.strip() for x in (p.stdout or "").splitlines() if x.strip()]
        for line in lines:
            suggestions.append(
                {
                    "action": "git_revert_or_checkout",
                    "hint": line,
                    "risk": "manual_only",
                }
            )
    except Exception as e:
        suggestions.append({"action": "error", "hint": str(e), "risk": "unknown"})

    return {
        "version": 1,
        "card": "TENMON_VPS_ACCEPTANCE_ROLLBACK_PLANNER_V1",
        "generatedAt": _utc(),
        "policy": "observation_only_no_auto_apply",
        "suggestions": suggestions[:5],
        "notes": [
            "本出力は提案のみ。本番 rollback は人手・別プロセスで実施すること。",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="rollback_planner_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--repo-root", type=str, default="")
    args = ap.parse_args()
    root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    body = plan(root)
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
