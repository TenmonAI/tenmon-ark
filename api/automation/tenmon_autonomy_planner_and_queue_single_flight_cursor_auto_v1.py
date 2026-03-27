#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_PLANNER_AND_QUEUE_SINGLE_FLIGHT_CURSOR_AUTO_V1

planner / remote queue / single-flight の fail-closed 検証（観測・JSON 出力）。
stale running / blocked reason / orphan id / policy 同期を検査。product core 非改変。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

_auto_here = Path(__file__).resolve().parent
if str(_auto_here) not in sys.path:
    sys.path.insert(0, str(_auto_here))

from tenmon_autonomy_queue_single_flight_helpers_v1 import (
    blocked_items_missing_reason,
    list_stale_running_ids,
    orphaned_queue_items,
)

CARD = "TENMON_AUTONOMY_PLANNER_AND_QUEUE_SINGLE_FLIGHT_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.json"

ACTIVE_MAINLINE_STATES = frozenset({"ready", "queued", "running", "blocked"})
PENDING_DUP_STATES = frozenset({"ready", "queued", "running", "blocked"})
REQUIRED_POLICY_KINDS = frozenset({"failed", "running", "queued", "blocked", "done"})
POLICY_KEYS = (
    "nextOnPass",
    "nextOnFail",
    "mainline_max_concurrent",
    "reject_duplicate_enqueue",
    "reject_second_run_while_locked",
    "high_risk_requires_approval_or_escrow",
)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="validate only, no output file write")
    ap.add_argument("--verbose", action="store_true", help="stdout に checks を含める")
    ap.add_argument("--repo-root", type=Path, default=None)
    args = ap.parse_args()
    repo = args.repo_root or Path(__file__).resolve().parents[2]
    auto = repo / "api" / "automation"
    rollback_used = False

    catalog = _read_json(auto / "card_catalog_v1.json")
    dag = _read_json(auto / "card_dependency_graph_v1.json")
    queue = _read_json(auto / "remote_cursor_queue.json")
    sf_state = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")

    planner_ready = False
    cat_next_pass: str | None = None
    cat_next_fail: str | None = None
    cards = catalog.get("cards") if isinstance(catalog.get("cards"), list) else []
    for c in cards:
        if isinstance(c, dict) and c.get("cardName") == CARD:
            cat_next_pass = str(c.get("nextOnPass") or "").strip() or None
            cat_next_fail = str(c.get("nextOnFail") or "").strip() or None
            planner_ready = bool(cat_next_pass) and bool(cat_next_fail)
            break
    nodes = dag.get("nodes") if isinstance(dag.get("nodes"), list) else []
    planner_ready = planner_ready and (CARD in nodes)

    queue_ready = isinstance(queue.get("autonomy_single_flight_policy_v1"), dict)

    items = queue.get("items") if isinstance(queue.get("items"), list) else []

    ids: list[str] = []
    job_ids: list[str] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        iid = it.get("id") or it.get("job_id")
        jid = it.get("job_id") or it.get("id")
        if isinstance(iid, str) and iid.strip():
            ids.append(iid.strip())
        if isinstance(jid, str) and jid.strip():
            job_ids.append(jid.strip())
    duplicate_reject_ok = len(ids) == len(set(ids)) and len(job_ids) == len(set(job_ids))

    pending_cards: list[str] = []
    running_current_run = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        cc = str(it.get("cursor_card") or "").strip()
        if st in PENDING_DUP_STATES and cc:
            pending_cards.append(cc)
        if st == "running" and it.get("current_run") is True:
            running_current_run += 1
    pending_duplicate_card_ok = len(pending_cards) == len(set(pending_cards))
    duplicate_reject_ok = duplicate_reject_ok and pending_duplicate_card_ok
    running_single_ok = running_current_run <= 1

    mainline_count = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st not in ACTIVE_MAINLINE_STATES:
            continue
        if it.get("current_run") is True:
            mainline_count += 1

    lease_lock_count = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st not in ACTIVE_MAINLINE_STATES:
            continue
        lu = it.get("leased_until")
        if lu is not None and str(lu).strip():
            lease_lock_count += 1

    policy = sf_state.get("autonomy_single_flight_policy_v1")
    policy_q = queue.get("autonomy_single_flight_policy_v1")
    max_main = 1
    if isinstance(policy, dict):
        try:
            max_main = int(policy.get("mainline_max_concurrent") or 1)
        except (TypeError, ValueError):
            max_main = 1
    single_flight_ready = (
        mainline_count <= max_main
        and lease_lock_count <= max_main
        and running_single_ok
    )

    policy_sync_ok = False
    if isinstance(policy, dict) and isinstance(policy_q, dict):
        policy_sync_ok = all(str(policy.get(k)) == str(policy_q.get(k)) for k in POLICY_KEYS)
        sk1 = policy.get("state_kinds")
        sk2 = policy_q.get("state_kinds")
        policy_sync_ok = policy_sync_ok and isinstance(sk1, list) and isinstance(sk2, list) and sk1 == sk2
    kinds_ok = False
    sk = policy.get("state_kinds") if isinstance(policy, dict) else None
    if isinstance(sk, list):
        kinds_ok = REQUIRED_POLICY_KINDS.issubset({str(x).strip().lower() for x in sk})
    catalog_policy_ok = False
    if isinstance(policy, dict) and cat_next_pass and cat_next_fail:
        catalog_policy_ok = (
            str(policy.get("nextOnPass") or "") == cat_next_pass
            and str(policy.get("nextOnFail") or "") == cat_next_fail
        )

    state_persist_ok = (auto / "tenmon_cursor_single_flight_queue_state.json").is_file() and (
        auto / "remote_cursor_queue.json"
    ).is_file()
    try:
        if state_persist_ok:
            p1 = auto / "tenmon_cursor_single_flight_queue_state.json"
            p2 = auto / "remote_cursor_queue.json"
            probe = p1.parent / ".tenmon_queue_persist_probe"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
            _ = p1.read_text(encoding="utf-8")[:1]
            _ = p2.read_text(encoding="utf-8")[:1]
    except OSError:
        state_persist_ok = False

    stale_h = float(os.environ.get("TENMON_SINGLE_FLIGHT_STALE_RUNNING_H", "48"))
    stale_ids = list_stale_running_ids(items, stale_h)
    stale_running_cleanup_ok = len(stale_ids) == 0

    blocked_missing = blocked_items_missing_reason(items)
    blocked_reason_ok = len(blocked_missing) == 0

    orphan_ids = orphaned_queue_items(items)
    orphan_cleanup_ok = len(orphan_ids) == 0

    sfl = sf_state.get("single_flight_lock_v1")
    lock_resolved: str | None = None
    single_flight_lock_ok = False
    if isinstance(sfl, dict) and str(sfl.get("relative_path") or "").strip() and sfl.get("exclusive_mainline") is True:
        lp = (repo / str(sfl["relative_path"]).strip()).resolve()
        lock_resolved = str(lp)
        single_flight_lock_ok = lp.parent.is_dir()

    hr_ok = True
    for it in items:
        if not isinstance(it, dict):
            continue
        st = str(it.get("state") or "").lower()
        if st not in ACTIVE_MAINLINE_STATES:
            continue
        src = str(it.get("source") or "")
        enq = str(it.get("enqueue_reason") or "").lower()
        if "HIGH_RISK_ESCROW" in src or "escrow" in enq:
            if not (it.get("escrow_approved") is True or it.get("escrow_package")):
                hr_ok = False

    state_policy_ok = isinstance(sf_state.get("autonomy_single_flight_policy_v1"), dict)

    ok = (
        planner_ready
        and queue_ready
        and duplicate_reject_ok
        and single_flight_ready
        and hr_ok
        and state_policy_ok
        and policy_sync_ok
        and kinds_ok
        and catalog_policy_ok
        and state_persist_ok
        and stale_running_cleanup_ok
        and blocked_reason_ok
        and orphan_cleanup_ok
        and single_flight_lock_ok
    )

    out_min: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "planner_ready": planner_ready,
        "queue_ready": queue_ready,
        "single_flight_ready": single_flight_ready,
        "duplicate_reject_ok": duplicate_reject_ok,
        "stale_running_cleanup_ok": stale_running_cleanup_ok,
        "state_persistence_ok": state_persist_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
    }
    out_verbose = {
        **out_min,
        "checks": {
            "next_on_pass": cat_next_pass,
            "next_on_fail": cat_next_fail,
            "mainline_current_run_count": mainline_count,
            "lease_lock_active_count": lease_lock_count,
            "high_risk_escrow_ok": hr_ok,
            "single_flight_state_policy_ok": state_policy_ok,
            "policy_sync_ok": policy_sync_ok,
            "state_kinds_cover_required": kinds_ok,
            "catalog_matches_queue_policy": catalog_policy_ok,
            "pending_duplicate_card_ok": pending_duplicate_card_ok,
            "running_current_run_count": running_current_run,
            "state_persistence_ok": state_persist_ok,
            "stale_running_ids": stale_ids,
            "blocked_missing_reason_ids": blocked_missing,
            "orphan_queue_ids": orphan_ids,
            "blocked_reason_ok": blocked_reason_ok,
            "orphan_cleanup_ok": orphan_cleanup_ok,
            "single_flight_lock_ok": single_flight_lock_ok,
            "single_flight_lock_resolved": lock_resolved,
        },
    }

    if not args.dry_run:
        out_path = auto / OUT_JSON
        try:
            tmp = out_path.with_suffix(out_path.suffix + ".tmp")
            tmp.write_text(json.dumps(out_min, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            tmp.replace(out_path)
        except OSError:
            rollback_used = True
            out_min["ok"] = False
            out_min["rollback_used"] = True
            out_min["next_card_if_fail"] = NEXT_ON_FAIL

    print(json.dumps(out_verbose if args.verbose else out_min, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
