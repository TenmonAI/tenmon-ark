#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — 学習台帳（再生成抑制・失敗パターン記録）。
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

LEDGER_FN = "infinite_growth_learning_ledger_v1.json"
SCHEMA = "INFINITE_GROWTH_LEARNING_LEDGER_V1"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_ledger(auto_dir: Path) -> dict[str, Any]:
    d = _read_json(auto_dir / LEDGER_FN)
    if not d.get("schema"):
        d["schema"] = SCHEMA
    d.setdefault("entries", [])
    return d


def entries_list(ledger: dict[str, Any]) -> list[dict[str, Any]]:
    e = ledger.get("entries")
    if not isinstance(e, list):
        return []
    return [x for x in e if isinstance(x, dict)]


def append_ledger_entry(auto_dir: Path, entry: dict[str, Any]) -> None:
    ledger = load_ledger(auto_dir)
    row = {"at": _utc_iso(), **entry}
    ent = entries_list(ledger)
    ent.append(row)
    ledger["entries"] = ent[-2000:]
    _write_json(auto_dir / LEDGER_FN, ledger)


def passed_card_ids_from_ledger(ledger: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for e in entries_list(ledger):
        if str(e.get("verdict") or "").upper() == "PASS" and e.get("card_id"):
            out.add(str(e["card_id"]))
    return out


def recent_same_hold_reason_count(ledger: dict[str, Any], hold_reason: str, n: int = 8) -> int:
    if not hold_reason:
        return 0
    tail = entries_list(ledger)[-n:]
    c = 0
    for e in reversed(tail):
        if str(e.get("hold_reason") or "") == hold_reason:
            c += 1
        else:
            break
    return c


def ledger_blocks_repeat_failure(
    ledger: dict[str, Any],
    *,
    issue_signature: str,
    min_fail_tail: int = 2,
    lookback: int = 40,
) -> tuple[bool, str]:
    """
    同一 issue_signature の直近エントリを新しい順に見て、
    成功境界（generated+ENQUEUED または executed+PASS）に当たるまでの連続 HOLD/FAIL が閾値以上なら抑止。
    """
    sig = (issue_signature or "").strip()
    if not sig:
        return False, ""
    chunk = entries_list(ledger)[-lookback:]
    m = [e for e in chunk if str(e.get("issue_signature") or "") == sig]
    n = 0
    for e in reversed(m):
        v = str(e.get("verdict") or "").upper()
        evt = str(e.get("event") or "")
        if v in ("HOLD", "FAIL"):
            n += 1
        elif v == "ENQUEUED" and evt == "generated":
            break
        elif v == "PASS" and evt == "executed":
            break
        else:
            break
    if n >= min_fail_tail >= 1:
        return True, "ledger_repeat_failure_suppresses_generation"
    return False, ""


def recent_same_card_hold_count(ledger: dict[str, Any], card_id: str, n: int = 12) -> int:
    if not card_id:
        return 0
    tail = entries_list(ledger)[-n:]
    c = 0
    for e in reversed(tail):
        if str(e.get("card_id") or "") == card_id and str(e.get("verdict") or "").upper() == "HOLD":
            c += 1
        else:
            break
    return c


