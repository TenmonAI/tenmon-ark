#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_IMPROVEMENT_OS — Improvement Ledger
自己改善ループのイベントを JSONL に追記し、直近エントリのスナップショットを seal 配下にも複製。
"""
from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CARD = "TENMON_SELF_IMPROVEMENT_LEDGER_V1"
VERSION = 1


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--seal-exit-code", type=int, default=0)
    ap.add_argument("--vps-card", type=str, default="TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os")
    out.mkdir(parents=True, exist_ok=True)

    api = _repo_api()
    ledger_path = api / "automation" / "improvement_ledger_v1.jsonl"

    final = _read_json(seal / "final_verdict.json")
    gov = _read_json(out / "seal_governor_verdict.json")
    bridge = _read_json(out / "residual" / "residual_os_bridge.json")

    entry_id = str(uuid.uuid4())
    entry: Dict[str, Any] = {
        "version": VERSION,
        "ledger_card": CARD,
        "entryId": entry_id,
        "generatedAt": _utc_now_iso(),
        "vps_card": args.vps_card,
        "seal_dir": str(seal),
        "seal_exit_code": args.seal_exit_code,
        "chat_ts_overall_100": bool(final.get("chat_ts_overall_100")),
        "governor_structural_ok": bool(gov.get("structural_ok")),
        "residual_subprocess_rc": bridge.get("subprocess_rc"),
    }

    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with ledger_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    snap = out / "ledger_last_entry.json"
    snap.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = {"appended": True, "entry_id": entry_id, "ledger_path": str(ledger_path)}
    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
