#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH_RUNTIME_TUNING_CURSOR_AUTO_V1

オーケストレータの安定化ルール（queue 判定・broad 抑止・連続 enqueue 検査）。
supervisor の契約 JSON や実行シェルは変更しない。
"""
from __future__ import annotations

from typing import Any

CARD = "TENMON_INFINITE_GROWTH_RUNTIME_TUNING_CURSOR_AUTO_V1"

# 広域・正典系に踏み込みやすいカード ID パターン（allowlist 通過後も生成抑止）
_BROAD_CARD_MARKERS = (
    "_MASTER_",
    "_12H_",
    "FULLY_AUTONOMOUS",
    "WORLDCLASS",
    "BOOK_CANON",
    "CANON_LEDGER",
    "KOKUZO",
    "SCRIPTURE",
)


def card_order_is_empty(queue: dict[str, Any]) -> bool:
    co = queue.get("card_order")
    if not isinstance(co, list):
        return True
    return len([x for x in co if isinstance(x, str) and x.strip()]) == 0


def is_broad_scope_card_id(card_id: str) -> bool:
    u = (card_id or "").upper()
    return any(m in u for m in _BROAD_CARD_MARKERS)


def acceptance_defined_for_row(row: dict[str, Any]) -> bool:
    acc = row.get("acceptance")
    if isinstance(acc, list):
        return any(str(x or "").strip() for x in acc)
    return bool(str(acc or "").strip())


def consecutive_enqueues_same_card_without_executed(
    gen_history_entries: list[dict[str, Any]],
    enqueue_id: str,
    *,
    tail_events: int = 14,
) -> bool:
    """
    末尾 tail_events 件の範囲だけを見て、同一 card_id の enqueued が 2 回あり、
    その間に当該 card の executed が無ければ True（短いループでの連投禁止）。
    """
    cid = (enqueue_id or "").strip()
    if not cid:
        return False
    tail = [e for e in gen_history_entries[-tail_events:] if isinstance(e, dict)]
    idx_enq: list[int] = []
    for i, e in enumerate(tail):
        if str(e.get("event") or "") != "enqueued":
            continue
        if str(e.get("card_id") or "") != cid:
            continue
        idx_enq.append(i)
    if len(idx_enq) < 2:
        return False
    i0, i1 = idx_enq[-2], idx_enq[-1]
    between = tail[i0 + 1 : i1]
    had_exec = any(
        str(e.get("event") or "") == "executed" and str(e.get("card_id") or "") == cid for e in between
    )
    return not had_exec
