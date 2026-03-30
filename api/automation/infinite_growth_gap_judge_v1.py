#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — 観測束 + スケジュールから「最小次カード」1枚を fail-closed で選定。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import infinite_growth_schedule_reader_v1 as sched_mod

EXEC_HISTORY_FN = "multi_ai_autonomy_execution_history.json"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def passed_cards_from_execution_history(auto_dir: Path) -> set[str]:
    d = _read_json(auto_dir / EXEC_HISTORY_FN)
    ent = d.get("entries")
    if not isinstance(ent, list):
        return set()
    out: set[str] = set()
    for e in ent:
        if isinstance(e, dict) and str(e.get("verdict") or "").upper() == "PASS" and e.get("card_id"):
            out.add(str(e["card_id"]))
    return out


def _probe_complete(auto_dir: Path, row: dict[str, Any]) -> bool:
    cs = row.get("completion_signal")
    if not isinstance(cs, dict):
        return False
    typ = str(cs.get("type") or "")
    if typ == "probe_json":
        rel = str(cs.get("path") or "")
        field = str(cs.get("field") or "ok")
        p = auto_dir / rel
        if not p.is_file():
            return False
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return False
        if not isinstance(j, dict):
            return False
        return j.get(field) is True
    if typ == "always_pending":
        return False
    if typ == "manual":
        return False
    return False


def _row_completed(
    auto_dir: Path,
    row: dict[str, Any],
    pass_cards: set[str],
) -> bool:
    cid = str(row.get("card_id") or "")
    if cid and cid in pass_cards:
        return True
    return _probe_complete(auto_dir, row)


def _find_row(schedule: dict[str, Any], card_id: str) -> dict[str, Any] | None:
    for r in sched_mod.schedule_rows(schedule):
        if str(r.get("card_id") or "") == card_id:
            return r
    return None


def _prereqs_ok(auto_dir: Path, schedule: dict[str, Any], row: dict[str, Any], pass_cards: set[str]) -> bool:
    pre = row.get("prerequisites")
    if not isinstance(pre, list):
        return True
    for p in pre:
        ps = str(p)
        if ps in pass_cards:
            continue
        r2 = _find_row(schedule, ps)
        if r2 and _row_completed(auto_dir, r2, pass_cards):
            continue
        return False
    return True


def _priority_key(row: dict[str, Any]) -> tuple[int, int, str]:
    bt = str(row.get("blocker_type") or "none")
    blocker_rank = 0 if bt in ("runtime_contract", "unresolved_blocker") else 1 if bt == "none" else 2
    lane = str(row.get("lane") or "")
    lane_rank = (
        0
        if lane in ("mainline", "intent")
        else 1
        if lane == "quality"
        else 2
        if lane == "learning"
        else 3
        if lane == "orchestrator"
        else 5
    )
    return (blocker_rank, lane_rank, str(row.get("card_id") or ""))


def _acceptance_clear(row: dict[str, Any], min_len: int = 24) -> bool:
    return len(str(row.get("acceptance") or "").strip()) >= min_len


def _tier_matches(row: dict[str, Any], require_tier: str) -> bool:
    return str(row.get("tier") or "") == require_tier


def pick_next_row(
    *,
    auto_dir: Path,
    schedule: dict[str, Any],
    require_tier: str,
    ledger_pass_cards: set[str],
    dry_run: bool,
    generation_history_entries: list[dict[str, Any]],
) -> tuple[dict[str, Any] | None, str]:
    if dry_run:
        return {
            "phase": "dry_run",
            "lane": "infinite_growth",
            "card_id": "TENMON_INFINITE_GROWTH_DUMMY_CURSOR_AUTO_V1",
            "prerequisites": [],
            "acceptance": (
                "dry-run: infinite_growth が queue へ 1 枚投入し、generation_history / learning_ledger に記録される。"
                " multi_ai supervisor は別 cycle で実行。npm audit / 正典変更なし。"
            ),
            "tier": "A_full_auto_safe",
            "blocker_type": "none",
            "generation_allowed": True,
            "manual_only": False,
            "repeatable": True,
            "completion_signal": {"type": "manual", "path": "", "field": ""},
            "issue_signature": "infinite_growth_dry_run_v1",
        }, "ok"

    ok, why = sched_mod.validate_schedule_shape(schedule)
    if not ok:
        return None, f"schedule_invalid:{why}"

    pass_cards = set(ledger_pass_cards) | passed_cards_from_execution_history(auto_dir)
    rows = [r for r in sched_mod.schedule_rows(schedule) if isinstance(r, dict)]
    rows.sort(key=_priority_key)

    def _candidate(row: dict[str, Any]) -> bool:
        if row.get("manual_only"):
            return False
        if not row.get("generation_allowed", True):
            return False
        if not _acceptance_clear(row):
            return False
        if not _tier_matches(row, require_tier):
            return False
        if not _prereqs_ok(auto_dir, schedule, row, pass_cards):
            return False
        if _row_completed(auto_dir, row, pass_cards):
            return False
        return True

    for row in rows:
        if not _candidate(row):
            continue
        cid = str(row.get("card_id") or "")
        sig = f"ig_sched:{cid}"
        if not row.get("repeatable", True):
            for ge in generation_history_entries[-40:]:
                if str(ge.get("card_id") or "") == cid and str(ge.get("event") or "") == "enqueued":
                    return None, "repeatable_false_already_enqueued"
        row = dict(row)
        row["issue_signature"] = sig
        return row, "ok"

    incomplete_manual = any(
        bool(r.get("manual_only")) and not _row_completed(auto_dir, r, pass_cards) for r in rows
    )
    if incomplete_manual and not any(_candidate(r) for r in rows):
        return None, "manual_only_frontier"
    return None, "empty_queue_no_generatable_next"
