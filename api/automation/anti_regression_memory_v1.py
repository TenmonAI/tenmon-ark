#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""anti_regression_memory.json — 過去に失敗したパターンを記録（再学習用）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from self_repair_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def _read(p: Path) -> Any:
    if not p.is_file():
        return {"version": VERSION, "entries": []}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {"version": VERSION, "entries": []}


def append_entry(
    fail_types: List[str],
    note: str = "",
    *,
    changed_files_fingerprint: List[str] | None = None,
    high_risk_hits: List[str] | None = None,
) -> Dict[str, Any]:
    auto = api_automation()
    path = auto / "anti_regression_memory.json"
    data = _read(path)
    if not isinstance(data, dict):
        data = {"version": VERSION, "entries": []}
    ent: Dict[str, Any] = {
        "generatedAt": utc_now_iso(),
        "fail_types": fail_types,
        "note": note,
    }
    if changed_files_fingerprint:
        ent["changed_files_fingerprint"] = changed_files_fingerprint[:40]
    if high_risk_hits:
        ent["high_risk_hits"] = high_risk_hits[:20]
    entries = list(data.get("entries") or [])
    entries.append(ent)
    data["version"] = VERSION
    data["card"] = CARD
    data["entries"] = entries[-200:]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def main() -> int:
    ap = argparse.ArgumentParser(description="anti_regression_memory_v1")
    ap.add_argument("--from-classification", action="store_true")
    ap.add_argument("--from-dangerous", action="store_true", help="dangerous_patch_blocker_report の変更ファイルを fingerprint に含める")
    ap.add_argument("--note", type=str, default="")
    args = ap.parse_args()
    auto = api_automation()
    ft: List[str] = []
    if args.from_classification:
        fc = _read(auto / "fail_classification.json")
        if isinstance(fc, dict):
            ft = list(fc.get("fail_types") or [])
    cf: List[str] | None = None
    hr: List[str] | None = None
    if args.from_dangerous:
        dpb = _read(auto / "dangerous_patch_blocker_report.json")
        if isinstance(dpb, dict):
            cf = [str(x) for x in (dpb.get("changed_files") or [])]
            hr = [str(x) for x in (dpb.get("high_risk_hits") or [])]
    body = append_entry(ft, args.note, changed_files_fingerprint=cf, high_risk_hits=hr)
    print(json.dumps({"ok": True, "entries": len(body.get("entries", []))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
