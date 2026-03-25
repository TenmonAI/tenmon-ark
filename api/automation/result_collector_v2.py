#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pass/fail・触ファイル・blockers・next card を束ねる cursor_result_bundle.json"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from cursor_autobuild_common_v2 import VERSION, utc_now_iso


def _git_touched_files(repo: Path) -> List[str]:
    try:
        p = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
        if p.returncode != 0:
            return []
        return [x.strip() for x in (p.stdout or "").splitlines() if x.strip()]
    except Exception:
        return []


def build_bundle(
    *,
    pass_: bool,
    blockers: List[str],
    next_card: str | None,
    touched_override: List[str] | None = None,
) -> Dict[str, Any]:
    root = Path(__file__).resolve().parents[2]
    touched = touched_override if touched_override is not None else _git_touched_files(root)
    return {
        "version": VERSION,
        "generatedAt": utc_now_iso(),
        "status": "pass" if pass_ else "fail",
        "pass": pass_,
        "touched_files": touched[:200],
        "blockers": blockers[:20],
        "suggested_next_card": next_card,
        "env": {
            "CHAT_TS_PROBE_BASE_URL": os.environ.get("CHAT_TS_PROBE_BASE_URL", ""),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="result_collector_v2")
    ap.add_argument("--status", choices=("pass", "fail"), default="pass")
    ap.add_argument("--blocker", action="append", default=[])
    ap.add_argument("--next-card", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = build_bundle(
        pass_=args.status == "pass",
        blockers=list(args.blocker),
        next_card=args.next_card or None,
    )
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else Path(__file__).resolve().parent / "cursor_result_bundle.json"
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
