#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""失敗理由を 1〜3 blocker に圧縮し retry キュー + スタブを生成"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from cursor_autobuild_common_v2 import FAIL_NEXT, VERSION, gen_apply_dir, utc_now_iso


def compress_blockers(reasons: List[str], limit: int = 3) -> List[str]:
    out: List[str] = []
    for r in reasons:
        s = str(r).strip()
        if s and s not in out:
            out.append(s)
        if len(out) >= limit:
            break
    if not out:
        out = ["unknown_failure"]
    return out[:limit]


def build_retry_queue(
    parent_card: str,
    fail_reasons: List[str],
    fail_next_card: str,
) -> Dict[str, Any]:
    top = compress_blockers(fail_reasons, 3)
    return {
        "version": VERSION,
        "generatedAt": utc_now_iso(),
        "parent_card": parent_card,
        "fail_next_card": fail_next_card,
        "top_blockers": top,
        "retry_policy": "regenerate_cursor_card_stub",
    }


def write_retry_stub(path: Path, parent: str, blockers: List[str], fail_next: str) -> None:
    lines = [
        f"# {fail_next}",
        "",
        f"> 親カード: `{parent}`",
        f"> 自動生成: `retry_generator_v2.py`",
        "",
        "## TOP_BLOCKERS (1〜3)",
    ]
    for b in blockers:
        lines.append(f"- {b}")
    lines.extend(
        [
            "",
            "## DO",
            "1. 上記 blocker を潰す",
            "2. `cursor_result_bundle.json` を再実行して pass を確認",
            "3. `cursor_executor_bridge_v2.py` で再集約",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="retry_generator_v2")
    ap.add_argument("--result-bundle", type=str, default="", help="cursor_result_bundle.json")
    ap.add_argument("--parent-card", type=str, default="TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1")
    ap.add_argument("--fail-next", type=str, default=FAIL_NEXT)
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    reasons: List[str] = []
    if args.result_bundle:
        data = json.loads(Path(args.result_bundle).read_text(encoding="utf-8"))
        if data.get("pass") is True:
            body = {
                "version": VERSION,
                "generatedAt": utc_now_iso(),
                "skipped": True,
                "reason": "result_bundle indicates pass — no retry",
            }
            out = Path(args.out) if args.out else Path(__file__).resolve().parent / "cursor_retry_queue.json"
            out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"ok": True, "path": str(out), "skipped": True}, ensure_ascii=False))
            return 0
        reasons = list(data.get("blockers") or [])
        reasons.append(str(data.get("status", "fail")))
    else:
        reasons = ["synthetic_placeholder"]
    body = build_retry_queue(args.parent_card, reasons, args.fail_next)
    out = Path(args.out) if args.out else Path(__file__).resolve().parent / "cursor_retry_queue.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    stub = gen_apply_dir() / f"{args.fail_next}.md"
    write_retry_stub(stub, args.parent_card, body["top_blockers"], args.fail_next)
    print(json.dumps({"ok": True, "path": str(out), "stub": str(stub)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
