#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
remote_cursor_queue.json の job state を正規形に揃える（in_progress→delivered, done→executed）。
API と Python ガードが同じ契約を参照するための骨格。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from remote_cursor_common_v1 import CARD, VERSION, api_automation, read_json, utc_now_iso

CANONICAL_STATES = frozenset(
    {"approval_required", "ready", "rejected", "delivered", "executed"}
)


def _normalize_state(s: str) -> str:
    m = {
        "in_progress": "delivered",
        "done": "executed",
    }
    out = m.get(s, s)
    return out if out in CANONICAL_STATES else "ready"


def normalize_queue(q: Dict[str, Any]) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = list(q.get("items") or [])
    for it in items:
        st = str(it.get("state") or "")
        it["state"] = _normalize_state(st)
    q["items"] = items
    q["version"] = int(q.get("version") or 1)
    q["card"] = q.get("card") or CARD
    q["updatedAt"] = utc_now_iso()
    q["state_schema"] = "approval_required|ready|rejected|delivered|executed"
    return q


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_cursor_job_normalizer_v1")
    ap.add_argument("--queue", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    qp = Path(args.queue) if args.queue else auto / "remote_cursor_queue.json"
    raw = read_json(qp)
    if not raw:
        body = {
            "version": 1,
            "card": CARD,
            "updatedAt": utc_now_iso(),
            "items": [],
            "state_schema": "approval_required|ready|rejected|delivered|executed",
        }
    else:
        body = normalize_queue(raw)
    qp.parent.mkdir(parents=True, exist_ok=True)
    qp.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps({"ok": True, "path": str(qp), "items": len(body["items"])}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
