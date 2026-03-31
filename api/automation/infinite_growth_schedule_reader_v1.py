#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — schedule source 読取（phases/cards スキーマ厳格）。
Notion 経由の次カード供給は notion_autobuild_watch_loop が multi_ai キューへ直接投入し、
本 reader の JSON 正典を置き換えない。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

SCHEMA_V2 = "INFINITE_GROWTH_SCHEDULE_SOURCE_V2"
LEGACY_SCHEMA_V1 = "INFINITE_GROWTH_SCHEDULE_SOURCE_V1"
DEFAULT_FN = "infinite_growth_schedule_source.json"

ALLOWED_TIERS = frozenset({"A_full_auto_safe", "B_conditional_auto", "C_manual_required"})


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def load_schedule(auto_dir: Path, filename: str = DEFAULT_FN) -> dict[str, Any]:
    return _read_json(auto_dir / filename)


def _parse_completion_signal(raw: str) -> dict[str, Any]:
    s = (raw or "").strip()
    if not s:
        return {"type": "manual", "path": "", "field": ""}
    try:
        j = json.loads(s)
        if isinstance(j, dict) and j.get("type"):
            return j
    except Exception:
        pass
    return {"type": "manual", "path": "", "field": ""}


def _acceptance_join(card: dict[str, Any]) -> str:
    acc = card.get("acceptance")
    if isinstance(acc, list):
        parts = [str(x).strip() for x in acc if str(x).strip()]
        return "\n".join(parts)
    return str(acc or "").strip()


def schedule_rows(schedule: dict[str, Any]) -> list[dict[str, Any]]:
    """正規化行（phase / lane / acceptance 文字列 / completion_signal オブジェクト / gap 用フラグ）。"""
    sch = str(schedule.get("schema") or "")
    if sch == SCHEMA_V2:
        return _rows_from_phases(schedule)
    if sch == LEGACY_SCHEMA_V1:
        return _rows_legacy_v1(schedule)
    return []


def _rows_from_phases(schedule: dict[str, Any]) -> list[dict[str, Any]]:
    phases = schedule.get("phases")
    if not isinstance(phases, list):
        return []
    out: list[dict[str, Any]] = []
    for ph in phases:
        if not isinstance(ph, dict):
            continue
        pname = str(ph.get("name") or "").strip()
        plane = str(ph.get("lane") or "").strip()
        cards = ph.get("cards")
        if not isinstance(cards, list):
            continue
        for c in cards:
            if not isinstance(c, dict) or not c.get("card_id"):
                continue
            cs_raw = c.get("completion_signal")
            cs_str = cs_raw if isinstance(cs_raw, str) else ""
            acc_text = _acceptance_join(c)
            manual = bool(c.get("manual_only"))
            row = {
                **c,
                "phase": pname,
                "lane": plane,
                "acceptance": acc_text,
                "acceptance_items": c.get("acceptance") if isinstance(c.get("acceptance"), list) else [],
                "completion_signal": _parse_completion_signal(cs_str),
                "generation_allowed": not manual,
                "blocker_type": "runtime_contract" if manual else "none",
            }
            out.append(row)
    return out


def _rows_legacy_v1(schedule: dict[str, Any]) -> list[dict[str, Any]]:
    rows = schedule.get("rows")
    if not isinstance(rows, list):
        return []
    out: list[dict[str, Any]] = []
    for r in rows:
        if isinstance(r, dict) and r.get("card_id"):
            out.append(r)
    return out


def validate_schedule_shape(schedule: dict[str, Any]) -> tuple[bool, str]:
    sch = schedule.get("schema")
    if sch == LEGACY_SCHEMA_V1:
        for i, row in enumerate(schedule_rows(schedule)):
            cid = str(row.get("card_id") or "")
            if not cid.startswith("TENMON_"):
                return False, f"row_{i}_bad_card_id"
            if not str(row.get("acceptance") or "").strip():
                return False, f"row_{i}_missing_acceptance"
        return True, "ok"

    if sch != SCHEMA_V2:
        return False, f"unexpected_schema:{sch}"

    phases = schedule.get("phases")
    if not isinstance(phases, list) or not phases:
        return False, "phases_missing"

    seen: set[str] = set()
    pi = 0
    for ph in phases:
        if not isinstance(ph, dict):
            return False, f"phase_{pi}_not_object"
        if not str(ph.get("name") or "").strip():
            return False, f"phase_{pi}_missing_name"
        if not str(ph.get("lane") or "").strip():
            return False, f"phase_{pi}_missing_lane"
        cards = ph.get("cards")
        if not isinstance(cards, list) or not cards:
            return False, f"phase_{pi}_cards_missing"
        ci = 0
        for c in cards:
            if not isinstance(c, dict):
                return False, f"phase_{pi}_card_{ci}_not_object"
            cid = str(c.get("card_id") or "")
            if not cid.startswith("TENMON_") or "CURSOR_AUTO" not in cid:
                return False, f"phase_{pi}_card_{ci}_bad_card_id"
            if cid in seen:
                return False, f"duplicate_card_id:{cid}"
            seen.add(cid)
            tier = str(c.get("tier") or "")
            if tier not in ALLOWED_TIERS:
                return False, f"phase_{pi}_card_{ci}_bad_tier:{tier}"
            if not isinstance(c.get("prerequisites"), list):
                return False, f"phase_{pi}_card_{ci}_prerequisites_not_list"
            acc = c.get("acceptance")
            if not isinstance(acc, list) or not acc:
                return False, f"phase_{pi}_card_{ci}_acceptance_not_nonempty_array"
            for j, line in enumerate(acc):
                if not str(line or "").strip():
                    return False, f"phase_{pi}_card_{ci}_acceptance_line_{j}_empty"
            if "manual_only" not in c or not isinstance(c.get("manual_only"), bool):
                return False, f"phase_{pi}_card_{ci}_manual_only_bad"
            if "repeatable" not in c or not isinstance(c.get("repeatable"), bool):
                return False, f"phase_{pi}_card_{ci}_repeatable_bad"
            cs = c.get("completion_signal")
            if not isinstance(cs, str):
                return False, f"phase_{pi}_card_{ci}_completion_signal_not_string"
            if str(cs).strip():
                try:
                    j = json.loads(cs)
                    if not isinstance(j, dict) or not str(j.get("type") or ""):
                        return False, f"phase_{pi}_card_{ci}_completion_signal_json_bad"
                except Exception:
                    return False, f"phase_{pi}_card_{ci}_completion_signal_not_json"
            ci += 1
        pi += 1

    return True, "ok"
