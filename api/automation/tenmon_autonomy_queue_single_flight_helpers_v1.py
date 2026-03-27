#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tenmon_autonomy_queue_single_flight_helpers_v1

planner / repair 共有の最小検知（stale running・blocked reason・orphan id）。
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _parse_iso(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _age_hours(created_at: Any) -> float:
    d = _parse_iso(created_at)
    if not d:
        return 0.0
    return (datetime.now(timezone.utc) - d).total_seconds() / 3600.0


def is_stale_running_item(it: dict[str, Any], stale_run_h: float) -> bool:
    if it.get("fixture") or it.get("ignored_fixture"):
        return False
    st = str(it.get("state") or "").lower()
    if st != "running":
        return False
    lu = it.get("leased_until")
    lease_dt = _parse_iso(lu) if lu not in (None, "") else None
    now = datetime.now(timezone.utc)
    if lease_dt is not None and lease_dt < now:
        return True
    if lease_dt is None and _age_hours(it.get("createdAt")) > stale_run_h:
        return True
    return False


def list_stale_running_ids(items: list[Any], stale_run_h: float) -> list[str]:
    out: list[str] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        if is_stale_running_item(raw, stale_run_h):
            iid = raw.get("id") or raw.get("job_id")
            out.append(str(iid) if iid is not None else "?")
    return out


def blocked_items_missing_reason(items: list[Any]) -> list[str]:
    bad: list[str] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        if raw.get("fixture") or raw.get("ignored_fixture"):
            continue
        st = str(raw.get("state") or "").lower()
        if st != "blocked":
            continue
        br = raw.get("blocked_reason")
        ok = False
        if isinstance(br, list) and any(str(x).strip() for x in br):
            ok = True
        elif isinstance(br, str) and br.strip():
            ok = True
        if not ok:
            iid = raw.get("id") or raw.get("job_id")
            bad.append(str(iid) if iid is not None else "unknown")
    return bad


def orphaned_queue_items(items: list[Any]) -> list[str]:
    """id/job_id 欠落の非 fixture を列挙。"""
    bad: list[str] = []
    for i, raw in enumerate(items):
        if not isinstance(raw, dict):
            bad.append(f"idx_{i}_not_object")
            continue
        if raw.get("fixture") or raw.get("ignored_fixture"):
            continue
        iid = raw.get("id")
        jid = raw.get("job_id")
        if (not isinstance(iid, str) or not iid.strip()) and (not isinstance(jid, str) or not jid.strip()):
            bad.append(f"idx_{i}_no_id")
    return bad
