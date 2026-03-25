#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
キュー内カードをブラックリスト観点で再スキャン（read-only レポート）。
実際の reject は API 投入時に実施 — ここは drift / 手編集検知用。
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from remote_cursor_common_v1 import CARD, VERSION, api_automation, read_json, utc_now_iso

RULES: List[tuple[str, re.Pattern[str], str]] = [
    ("dist", re.compile(r"\bdist/|\bdist\b\s*\*\*", re.I), "dist/**"),
    ("schema", re.compile(r"ALTER\s+TABLE|migration|マイグレーション", re.I), "DB schema"),
    ("kokuzo", re.compile(r"kokuzo_pages.*正文", re.I), "kokuzo_pages 正文"),
    ("systemd", re.compile(r"\bsystemd\b|\.service\b", re.I), "system env"),
    ("chat_ts", re.compile(r"api/src/routes/chat\.ts\s*本体|rewrite\s+chat\.ts", re.I), "chat.ts 本体"),
]


def scan_item(it: Dict[str, Any]) -> Dict[str, Any]:
    text = f"{it.get('card_name','')}\n{it.get('card_body_md','')}"
    hits: List[Dict[str, str]] = []
    for rid, pat, note in RULES:
        if pat.search(text):
            hits.append({"rule": rid, "note": note})
    return {"id": it.get("id"), "state": it.get("state"), "hits": hits, "would_reject": len(hits) > 0}


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_cursor_queue_guard_v1")
    ap.add_argument("--queue", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()

    auto = api_automation()
    qp = Path(args.queue) if args.queue else auto / "remote_cursor_queue.json"
    q = read_json(qp)
    items = q.get("items") or []
    active_states = {"approval_required", "ready", "delivered", "in_progress"}  # in_progress 後方互換
    findings = [scan_item(it) for it in items[-200:]]
    flagged = [f for f in findings if f["would_reject"] and f.get("state") in active_states]

    body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "queue_path": str(qp),
        "items_scanned": len(findings),
        "flagged": flagged,
        "findings": findings[-80:],
    }
    out = Path(args.out) if args.out else auto / "remote_cursor_guard_report.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
