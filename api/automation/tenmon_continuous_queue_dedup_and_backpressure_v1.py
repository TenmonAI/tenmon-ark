#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1
(legacy: TENMON_CONTINUOUS_QUEUE_DEDUP_AND_BACKPRESSURE_CURSOR_AUTO_V1)

queue の pending 重複を掃除（同一 cursor_card は non-fixture 優先）、
backpressure、stale delivered fixture の ready 戻し、ready 連続範囲内で non-fixture 優先順。
成功の捏造はしない（観測・JSON 更新のみ）。
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1"
LEGACY_CARD = "TENMON_CONTINUOUS_QUEUE_DEDUP_AND_BACKPRESSURE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_continuous_queue_dedup_and_backpressure_summary.json"
PENDING_STATES = frozenset({"approval_required", "ready", "delivered"})


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def is_fixture_item(it: dict[str, Any]) -> bool:
    if it.get("dry_run_only") is True:
        return True
    f = it.get("fixture")
    if f is True:
        return True
    if isinstance(f, str) and f.lower() == "true":
        return True
    return False


def parse_iso_ms(s: str | None) -> int:
    if not s or not isinstance(s, str):
        return 0
    t = s.strip()
    if not t:
        return 0
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        from datetime import datetime

        dt = datetime.fromisoformat(t)
        return int(dt.timestamp() * 1000)
    except Exception:
        return 0


def reorder_ready_runs(items: list[Any]) -> tuple[list[Any], bool]:
    """各連続 ready ブロック内で non-fixture を先に（契約・ID は維持）。"""
    out: list[Any] = []
    changed = False
    i = 0
    n = len(items)
    while i < n:
        it = items[i]
        if not isinstance(it, dict):
            out.append(it)
            i += 1
            continue
        if str(it.get("state") or "") != "ready":
            out.append(it)
            i += 1
            continue
        j = i
        chunk: list[dict[str, Any]] = []
        while j < n and isinstance(items[j], dict) and str(items[j].get("state") or "") == "ready":
            chunk.append(items[j])
            j += 1
        nf = [x for x in chunk if not is_fixture_item(x)]
        fx = [x for x in chunk if is_fixture_item(x)]
        new_chunk = nf + fx
        if new_chunk != chunk:
            changed = True
        out.extend(new_chunk)
        i = j
    return out, changed


def drain_stale_fixture_delivered(
    items: list[Any], now_ms: int, max_age_sec: int
) -> tuple[list[Any], int, bool]:
    """fixture かつ delivered でリース切れ or 長期滞留 → ready（release 相当）。non-fixture は触らない。"""
    drained = 0
    changed = False
    out: list[Any] = []
    max_age_ms = max(0, int(max_age_sec)) * 1000
    for it in items:
        if not isinstance(it, dict):
            out.append(it)
            continue
        st = str(it.get("state") or "")
        if st != "delivered" or not is_fixture_item(it):
            out.append(it)
            continue
        lease_ms = parse_iso_ms(str(it.get("leased_until") or ""))
        created_ms = parse_iso_ms(str(it.get("createdAt") or ""))
        stale_lease = lease_ms > 0 and lease_ms <= now_ms
        stale_age = max_age_ms > 0 and created_ms > 0 and (now_ms - created_ms) >= max_age_ms
        no_lease_old = lease_ms <= 0 and max_age_ms > 0 and created_ms > 0 and (now_ms - created_ms) >= max_age_ms
        if stale_lease or stale_age or no_lease_old:
            it2 = dict(it)
            it2["state"] = "ready"
            it2["leased_until"] = None
            out.append(it2)
            drained += 1
            changed = True
        else:
            out.append(it)
    return out, drained, changed


def dedup_pending_by_card(items: list[Any]) -> tuple[list[Any], list[str], int, bool]:
    """pending 内の同一 cursor_card は 1 件に。non-fixture を fixture より優先して残す。"""
    card_pos: dict[str, int] = {}
    new_items: list[Any] = []
    removed_ids: list[str] = []
    duplicates_removed = 0
    changed = False
    for it in items:
        if not isinstance(it, dict):
            new_items.append(it)
            continue
        st = str(it.get("state") or "")
        if st not in PENDING_STATES:
            new_items.append(it)
            continue
        card = str(it.get("cursor_card") or "").strip()
        if not card:
            new_items.append(it)
            continue
        if card not in card_pos:
            card_pos[card] = len(new_items)
            new_items.append(it)
            continue
        pos = card_pos[card]
        prev = new_items[pos]
        if not isinstance(prev, dict):
            new_items.append(it)
            continue
        if is_fixture_item(prev) and not is_fixture_item(it):
            rid = str(prev.get("id") or prev.get("job_id") or "")
            if rid:
                removed_ids.append(rid)
            new_items[pos] = it
            duplicates_removed += 1
            changed = True
        else:
            rid = str(it.get("id") or it.get("job_id") or "")
            if rid:
                removed_ids.append(rid)
            duplicates_removed += 1
            changed = True
    return new_items, removed_ids, duplicates_removed, changed


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    qpath = auto / "remote_cursor_queue.json"
    threshold = int(os.environ.get("TENMON_QUEUE_PENDING_THRESHOLD", "3"))
    fixture_delivered_max_age = int(os.environ.get("TENMON_QUEUE_FIXTURE_DELIVERED_MAX_AGE_SEC", "3600"))

    queue = read_json(qpath)
    items: list[Any] = queue.get("items") if isinstance(queue.get("items"), list) else []

    now_ms = int(time.time() * 1000)

    removed_ids: list[str] = []
    duplicates_removed = 0
    fixture_drained = 0
    changed = False

    items, dcnt, dch = drain_stale_fixture_delivered(items, now_ms, fixture_delivered_max_age)
    fixture_drained = dcnt
    changed = changed or dch

    items, removed_ids, duplicates_removed, ddup = dedup_pending_by_card(items)
    changed = changed or ddup

    items, ro = reorder_ready_runs(items)
    changed = changed or ro

    new_items = items

    if changed:
        out_q = {
            "version": int(queue.get("version") or 1),
            "card": str(queue.get("card") or "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1"),
            "updatedAt": utc(),
            "items": new_items,
            "state_schema": str(queue.get("state_schema") or "approval_required|ready|rejected|delivered|executed"),
        }
        qpath.write_text(json.dumps(out_q, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    after_items = new_items
    after_pending = [x for x in after_items if isinstance(x, dict) and str(x.get("state") or "") in PENDING_STATES]
    nonfixture_delivered = [
        x
        for x in after_pending
        if isinstance(x, dict) and not is_fixture_item(x) and str(x.get("state") or "") == "delivered"
    ]

    blocked_reason: list[str] = []
    if len(after_pending) > threshold:
        blocked_reason.append(f"pending_queue_count_gt_{threshold}")
    if nonfixture_delivered:
        blocked_reason.append("nonfixture_delivered_exists")

    out = {
        "card": CARD,
        "legacy_card": LEGACY_CARD,
        "generated_at": utc(),
        "queue_changed": changed,
        "duplicates_removed": duplicates_removed,
        "removed_duplicate_pending_ids": removed_ids,
        "fixture_drained": fixture_drained,
        "pending_count": len(after_pending),
        "pending_threshold": threshold,
        "nonfixture_delivered_count": len(nonfixture_delivered),
        "enqueue_allowed": len(blocked_reason) == 0,
        "blocked_reason": blocked_reason,
        "queue_path": str(qpath),
        "next_on_pass": "TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1",
        "next_on_fail_note": "停止。queue retry 1枚のみ生成。",
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "ok": True,
                "enqueue_allowed": out["enqueue_allowed"],
                "queue_changed": changed,
                "duplicates_removed": duplicates_removed,
                "fixture_drained": fixture_drained,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
