#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""high-risk ファイル / 大 diff / 契約違反候補を拒否フラグ（自動適用はしない）"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from self_repair_common_v1 import CARD, VERSION, api_automation, utc_now_iso

HIGH_RISK_FILES = frozenset(
    {
        "api/src/routes/chat.ts",
        "api/src/db/schema.sql",
    }
)
FORBIDDEN_PATTERNS = [
    (re.compile(r"DROP\s+TABLE", re.I), "sql_drop"),
    (re.compile(r"\brm\s+(-[rf]+\s+)?/"), "rm_root"),
]


def _repo_root() -> Path:
    return api_automation().parents[1]


def git_changed_files() -> List[str]:
    try:
        p = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        return [x.strip() for x in (p.stdout or "").splitlines() if x.strip()]
    except Exception:
        return []


def git_diff_text() -> str:
    try:
        p = subprocess.run(
            ["git", "diff", "HEAD"],
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
        return (p.stdout or "")[-100000:]
    except Exception as e:
        return str(e)


def analyze() -> Dict[str, Any]:
    files = git_changed_files()
    hit_risk: List[str] = []
    for f in files:
        rel = f.replace("\\", "/")
        if rel in HIGH_RISK_FILES or "kokuzo_pages" in rel:
            hit_risk.append(rel)

    diff_text = git_diff_text()
    pat_hits: List[str] = []
    for pat, name in FORBIDDEN_PATTERNS:
        if pat.search(diff_text):
            pat_hits.append(name)

    # 極端に大きい diff のみ block（通常開発の作業ツリーは通す）
    large_diff = len(diff_text) > 1_000_000
    blocked = bool(hit_risk) or bool(pat_hits) or large_diff
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "changed_files": files[:50],
        "high_risk_hits": hit_risk,
        "pattern_hits": pat_hits,
        "large_diff": large_diff,
        "blocked": blocked,
        "contract_note": "/api/chat 契約は chat.ts の無差別改変を禁止",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="dangerous_patch_blocker_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = analyze()
    out = Path(args.out) if args.out else api_automation() / "dangerous_patch_blocker_report.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "blocked": body["blocked"], "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
