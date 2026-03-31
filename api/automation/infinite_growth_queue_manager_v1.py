#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — multi_ai_autonomy_queue.json を唯一の投入口として扱う薄層。
queue_cursor は eligible リスト上のインデックス（supervisor と同義）。
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

QUEUE_FN = "multi_ai_autonomy_queue.json"
PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
TRIAGE_DEFAULT = "autonomy_triage.json"


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


def _triage_tier_map(triage: dict[str, Any]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in triage.get("cards") or []:
        if isinstance(e, dict) and e.get("card_id") and e.get("automation_tier"):
            m[str(e["card_id"])] = str(e["automation_tier"])
    return m


def eligible_cards(queue: dict[str, Any], triage: dict[str, Any]) -> list[str]:
    require = str(queue.get("require_tier") or "A_full_auto_safe")
    order = queue.get("card_order") if isinstance(queue.get("card_order"), list) else []
    tm = _triage_tier_map(triage)
    out: list[str] = []
    for c in order:
        if not isinstance(c, str) or not c.startswith("TENMON_"):
            continue
        if tm.get(c) == require:
            out.append(c)
    return out


def load_queue(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / QUEUE_FN)


def load_progress(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / PROGRESS_FN)


def load_triage(auto_dir: Path, queue: dict[str, Any]) -> dict[str, Any]:
    fn = str(queue.get("triage_file") or TRIAGE_DEFAULT)
    return _read_json(auto_dir / fn)


def execution_work_pending(auto_dir: Path) -> tuple[bool, dict[str, Any]]:
    q = load_queue(auto_dir)
    triage = load_triage(auto_dir, q)
    prog = load_progress(auto_dir)
    elig = eligible_cards(q, triage)
    qc = int(prog.get("queue_cursor") or 0)
    pending = bool(elig) and qc < len(elig)
    return pending, {
        "queue_cursor": qc,
        "eligible": elig,
        "eligible_len": len(elig),
        "card_order_len": len(q.get("card_order") or []),
        "require_tier": q.get("require_tier"),
    }


def append_card_to_queue(auto_dir: Path, card_id: str) -> dict[str, Any]:
    q = load_queue(auto_dir)
    co = q.get("card_order")
    if not isinstance(co, list):
        co = []
    cid = (card_id or "").strip()
    if cid and (not co or co[-1] != cid):
        co = list(co) + [cid]
    q["card_order"] = co
    q["updated_at"] = _utc_iso()
    _write_json(auto_dir / QUEUE_FN, q)
    return q


def write_queue(auto_dir: Path, queue: dict[str, Any]) -> None:
    queue = dict(queue)
    queue["updated_at"] = _utc_iso()
    _write_json(auto_dir / QUEUE_FN, queue)


def reset_queue_card_order_and_multi_ai_cursor(auto_dir: Path) -> None:
    """
    QUEUE_DRAINED 後の次カード投入用: card_order を空にし multi_ai の queue_cursor を 0 に戻す。
    MULTI_AI_AUTONOMY_QUEUE_V1 / PROGRESS の契約は維持する。
    """
    q = load_queue(auto_dir)
    q = dict(q)
    q["card_order"] = []
    q["updated_at"] = _utc_iso()
    _write_json(auto_dir / QUEUE_FN, q)

    prog = load_progress(auto_dir)
    prog = dict(prog)
    prog["queue_cursor"] = 0
    prog["updated_at"] = _utc_iso()
    if "hold_reason" in prog and prog.get("hold_reason"):
        prog["hold_reason"] = None
    _write_json(auto_dir / PROGRESS_FN, prog)


def enqueue_single_card_front(auto_dir: Path, card_id: str) -> dict[str, Any]:
    """空キュー想定で 1 枚だけ投入（先頭 = 唯一の要素）。"""
    q = load_queue(auto_dir)
    co = q.get("card_order")
    if isinstance(co, list) and len([x for x in co if isinstance(x, str) and x.strip()]) > 0:
        return q
    cid = (card_id or "").strip()
    if not cid:
        return q
    q = dict(q)
    q["card_order"] = [cid]
    q["updated_at"] = _utc_iso()
    _write_json(auto_dir / QUEUE_FN, q)
    return q
