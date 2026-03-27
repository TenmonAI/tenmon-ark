#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1

queue / single-flight の状態修復のみ（automation JSON）。fail-closed。
stale running / duplicate cursor_card / current_run 多重 / policy 欠落を優先修復。
"""
from __future__ import annotations

import argparse
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_EXECUTION_GATE_AND_RESULT_RETURN_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_queue_state_repair_cursor_auto_v1.json"
QUEUE_JSON = "remote_cursor_queue.json"
SF_JSON = "tenmon_cursor_single_flight_queue_state.json"

PLANNER_CARD = "TENMON_AUTONOMY_PLANNER_AND_QUEUE_SINGLE_FLIGHT_CURSOR_AUTO_V1"
DEFAULT_POLICY: dict[str, Any] = {
    "version": 1,
    "card": PLANNER_CARD,
    "nextOnPass": "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1",
    "nextOnFail": "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1",
    "mainline_max_concurrent": 1,
    "reject_duplicate_enqueue": True,
    "reject_second_run_while_locked": True,
    "high_risk_requires_approval_or_escrow": True,
    "state_kinds": [
        "failed",
        "running",
        "queued",
        "blocked",
        "ready",
        "done",
        "executed",
        "released_fixture",
        "rejected",
        "delivered",
        "approval_required",
    ],
}

PENDING = frozenset({"ready", "queued", "running", "blocked"})


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


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


def _merge_policy(existing: dict[str, Any] | None) -> dict[str, Any]:
    out = dict(DEFAULT_POLICY)
    if isinstance(existing, dict):
        for k, v in existing.items():
            if v is not None and v != "":
                out[k] = v
    for req in ("nextOnPass", "nextOnFail"):
        if not str(out.get(req) or "").strip():
            out[req] = DEFAULT_POLICY[req]
    return out


def _normalize_blocked_reason(val: Any) -> list[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()]
    return [str(val).strip()] if str(val).strip() else []


def _repair_items(
    items: list[dict[str, Any]],
    stale_run_h: float,
) -> tuple[list[dict[str, Any]], list[str]]:
    actions: list[str] = []
    now = datetime.now(timezone.utc)
    out: list[dict[str, Any]] = []
    for raw in items:
        it = dict(raw) if isinstance(raw, dict) else {}
        out.append(it)

    for it in out:
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st != "running":
            continue
        lu = it.get("leased_until")
        lease_dt = _parse_iso(lu) if lu not in (None, "") else None
        stale = False
        if lease_dt is not None and lease_dt < now:
            stale = True
        elif lease_dt is None and _age_hours(it.get("createdAt")) > stale_run_h:
            stale = True
        if stale:
            it["state"] = "failed"
            it["current_run"] = False
            it["leased_until"] = None
            it["repair_note"] = "stale_running_cleanup"
            it["repaired_at"] = _utc()
            actions.append(f"stale_running:{it.get('id') or it.get('job_id')}")

    for it in out:
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st != "queued":
            continue
        cc = str(it.get("cursor_card") or "").strip()
        if not cc:
            it["state"] = "failed"
            it["current_run"] = False
            br = _normalize_blocked_reason(it.get("blocked_reason"))
            br.append("orphaned_queued_no_cursor_card")
            it["blocked_reason"] = br
            it["repair_note"] = "orphaned_queued_no_cursor_card"
            it["repaired_at"] = _utc()
            actions.append(f"orphan_queued:{it.get('id')}")

    pending_idx: list[tuple[int, dict[str, Any]]] = []
    for i, it in enumerate(out):
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st not in PENDING:
            continue
        cc = str(it.get("cursor_card") or "").strip()
        if not cc:
            continue
        pending_idx.append((i, it))

    by_card: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for i, it in pending_idx:
        cc = str(it.get("cursor_card") or "").strip()
        by_card.setdefault(cc, []).append((i, it))

    for cc, group in by_card.items():
        if len(group) <= 1:
            continue
        group.sort(key=lambda x: _parse_iso(x[1].get("createdAt")) or now)
        for _idx, it in group[1:]:
            it["state"] = "rejected"
            it["current_run"] = False
            it["leased_until"] = None
            it["repair_note"] = "duplicate_cursor_card_merge"
            it["repaired_at"] = _utc()
            actions.append(f"dup_merge:{cc}")

    cr: list[tuple[dict[str, Any], datetime]] = []
    for it in out:
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st not in PENDING:
            continue
        if it.get("current_run") is not True:
            continue
        dt = _parse_iso(it.get("createdAt")) or now
        cr.append((it, dt))
    if len(cr) > 1:
        cr.sort(key=lambda x: x[1])
        for it, _dt in cr[1:]:
            it["current_run"] = False
            prev = str(it.get("repair_note") or "").strip()
            it["repair_note"] = (prev + "|current_run_deduped").strip("|")
            it["repaired_at"] = _utc()
            actions.append("current_run_dedup")

    for it in out:
        st = str(it.get("state") or "").lower()
        if st not in ("blocked", "failed"):
            continue
        br = it.get("blocked_reason")
        if br is not None and not isinstance(br, list):
            it["blocked_reason"] = _normalize_blocked_reason(br)
            actions.append(f"blocked_reason_normalize:{it.get('id')}")

    for it in out:
        if it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st != "blocked":
            continue
        br = it.get("blocked_reason")
        ok_br = isinstance(br, list) and any(str(x).strip() for x in br)
        ok_br = ok_br or (isinstance(br, str) and br.strip())
        if not ok_br:
            it["blocked_reason"] = ["reason_required_autofill_repair"]
            prev = str(it.get("repair_note") or "").strip()
            it["repair_note"] = (prev + "|blocked_reason_required").strip("|") if prev else "blocked_reason_required"
            it["repaired_at"] = _utc()
            actions.append(f"blocked_reason_autofill:{it.get('id') or it.get('job_id')}")

    return out, actions


def _single_flight_ok(items: list[dict[str, Any]], max_main: int) -> bool:
    cr = 0
    for it in items:
        if not isinstance(it, dict) or it.get("fixture") or it.get("ignored_fixture"):
            continue
        st = str(it.get("state") or "").lower()
        if st not in PENDING:
            continue
        if it.get("current_run") is True:
            cr += 1
    return cr <= max_main


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="変更を書かず報告のみ")
    ap.add_argument("--stale-running-hours", type=float, default=48.0)
    ap.add_argument("--repo-root", type=Path, default=None)
    args = ap.parse_args()
    repo = args.repo_root or Path(__file__).resolve().parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    qpath = auto / QUEUE_JSON
    sfpath = auto / SF_JSON
    queue = _read_json(qpath)
    sf = _read_json(sfpath)
    rollback_used = False

    policy_before = queue.get("autonomy_single_flight_policy_v1")
    policy_merged = _merge_policy(policy_before if isinstance(policy_before, dict) else None)

    queue_after = dict(queue)
    queue_after["autonomy_single_flight_policy_v1"] = policy_merged

    items_before = queue_after.get("items") if isinstance(queue_after.get("items"), list) else []
    items_new, actions = _repair_items([dict(x) for x in items_before if isinstance(x, dict)], args.stale_running_hours)
    queue_after["items"] = items_new

    max_main = 1
    try:
        max_main = int(policy_merged.get("mainline_max_concurrent") or 1)
    except (TypeError, ValueError):
        max_main = 1

    sf_after = dict(sf)
    sf_after["autonomy_single_flight_policy_v1"] = dict(policy_merged)
    br = sf_after.get("blocked_reason")
    if br is not None and not isinstance(br, list):
        sf_after["blocked_reason"] = _normalize_blocked_reason(br)
        actions.append("sf_blocked_reason_normalize")

    def _q_sig(q: dict[str, Any]) -> str:
        return json.dumps(
            {
                "items": q.get("items"),
                "autonomy_single_flight_policy_v1": q.get("autonomy_single_flight_policy_v1"),
            },
            ensure_ascii=False,
            sort_keys=True,
        )

    def _sf_sig(s: dict[str, Any]) -> str:
        return json.dumps(
            {
                "autonomy_single_flight_policy_v1": s.get("autonomy_single_flight_policy_v1"),
                "blocked_reason": s.get("blocked_reason"),
            },
            ensure_ascii=False,
            sort_keys=True,
        )

    changed = _q_sig(queue) != _q_sig(queue_after) or _sf_sig(sf) != _sf_sig(sf_after)
    if changed:
        queue_after["updatedAt"] = _utc()
        sf_after["generated_at"] = _utc()

    single_ok = _single_flight_ok(items_new, max_main)
    queue_state_repaired = changed
    single_flight_restored = single_ok
    ok = bool(single_ok)

    out: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "queue_state_repaired": queue_state_repaired,
        "single_flight_restored": single_flight_restored,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
        "repair_actions": actions[:200],
        "generated_at": _utc(),
        "dry_run": bool(args.dry_run),
    }

    if not args.dry_run and changed:
        bak = auto / f"{QUEUE_JSON}.repair_bak.{int(time.time())}"
        try:
            if qpath.is_file():
                shutil.copy2(qpath, bak)
            qpath.write_text(json.dumps(queue_after, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            if sfpath.is_file():
                sfpath.write_text(json.dumps(sf_after, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        except OSError:
            rollback_used = True
            if bak.is_file():
                shutil.copy2(bak, qpath)
            out["rollback_used"] = True
            out["ok"] = False
            out["next_card_if_fail"] = NEXT_ON_FAIL
            out["repair_actions"].append("write_failed_rollback_attempted")

    if not args.dry_run:
        (auto / OUT_JSON).write_text(
            json.dumps({k: v for k, v in out.items() if k != "dry_run"}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print_payload = {k: v for k, v in out.items() if k != "dry_run"}
    print(json.dumps(print_payload, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
