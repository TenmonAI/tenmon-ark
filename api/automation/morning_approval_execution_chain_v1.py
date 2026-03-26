#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1

morning approval list を鎖順（K1 → SUBCONCEPT → GENERAL）で観測し、
queue / bundle から execution chain を 1 本で追える JSON を出す。
enqueue は人間が high_risk_escrow_approval_bridge_v1.sh --approve で行う前提（自動承認しない）。
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1"
OUT_JSON = "morning_approval_execution_chain_summary.json"

# 主線の固定順（morning list に無い ID はスキップ）
DEFAULT_CHAIN_ORDER: list[str] = [
    "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
    "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
]


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


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_list(x: Any) -> list[Any]:
    return x if isinstance(x, list) else []


def chain_rank(card_id: str) -> tuple[int, str]:
    """K1 → SUBCONCEPT → GENERAL の順序。未知は最後。"""
    c = str(card_id or "").strip()
    if "TENMON_K1_" in c or c.startswith("TENMON_K1"):
        return (0, c)
    if "SUBCONCEPT" in c:
        return (1, c)
    if "GENERAL_KNOWLEDGE" in c or ("TENMON_GENERAL_" in c and "KNOWLEDGE" in c):
        return (2, c)
    return (99, c)


def sort_chain_ids(ids: list[str]) -> list[str]:
    return sorted(set(ids), key=lambda x: chain_rank(x))


def find_queue_item(queue: dict[str, Any], card_id: str) -> dict[str, Any] | None:
    best: dict[str, Any] | None = None
    pri = -1
    state_pri = {"executed": 4, "delivered": 3, "ready": 2, "approval_required": 1, "rejected": 0}
    for it in safe_list(queue.get("items")):
        if not isinstance(it, dict):
            continue
        if str(it.get("cursor_card") or "").strip() != card_id:
            continue
        st = str(it.get("state") or "")
        p = state_pri.get(st, 0)
        if p >= pri:
            pri = p
            best = it
    return best


def bundle_entries_for_queue(bundle: dict[str, Any], queue_id: str) -> int:
    qid = str(queue_id or "").strip()
    n = 0
    for e in safe_list(bundle.get("entries")):
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "").strip() == qid:
            n += 1
    return n


def classify_card(
    card_id: str,
    morning_item: dict[str, Any] | None,
    queue: dict[str, Any],
    bundle: dict[str, Any],
) -> dict[str, Any]:
    escrow_path = str((morning_item or {}).get("escrow_package") or "").strip()
    pkg = read_json(Path(escrow_path)) if escrow_path else {}
    human_approved_pkg = pkg.get("approved") is True

    qit = find_queue_item(queue, card_id)
    qid = str(qit.get("id") or qit.get("job_id") or "") if qit else ""
    st = str(qit.get("state") or "") if qit else ""

    bundle_n = bundle_entries_for_queue(bundle, qid) if qid else 0

    queue_ready = st == "ready"
    mac_delivered = st == "delivered"
    executed = st == "executed"
    result_entry = bundle_n > 0

    phase = "not_in_queue"
    if qit is not None:
        if executed and result_entry:
            phase = "complete"
        elif executed and not result_entry:
            phase = "executed_awaiting_bundle_entry"
        elif mac_delivered:
            phase = "mac_delivered"
        elif queue_ready:
            phase = "queue_ready"
        elif st == "approval_required":
            phase = "approval_required"
        elif st == "rejected":
            phase = "rejected"

    return {
        "card_id": card_id,
        "morning_list_escrow_package": escrow_path or None,
        "escrow_package_approved_flag": human_approved_pkg,
        "recommended_decision": pkg.get("recommended_decision"),
        "queue_item_id": qid or None,
        "queue_state": st or None,
        "checks": {
            "queue_ready": queue_ready,
            "mac_pickup_delivered": mac_delivered,
            "result_bundle_entries": bundle_n,
            "result_entry": result_entry,
        },
        "phase": phase,
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    morning_path = Path(
        os.environ.get("TENMON_MORNING_APPROVAL_LIST", str(auto / "tenmon_high_risk_morning_approval_list.json"))
    )
    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    bridge_sh = repo / "api" / "scripts" / "high_risk_escrow_approval_bridge_v1.sh"

    raw_order = os.environ.get("TENMON_MORNING_CHAIN_ORDER_JSON", "").strip()
    if raw_order:
        try:
            parsed = json.loads(raw_order)
            chain_order = [str(x).strip() for x in parsed if str(x).strip()]
        except Exception:
            chain_order = list(DEFAULT_CHAIN_ORDER)
    else:
        chain_order = list(DEFAULT_CHAIN_ORDER)

    morning = read_json(morning_path)
    morning_items = safe_list(morning.get("items"))
    by_card: dict[str, dict[str, Any]] = {}
    for it in morning_items:
        if not isinstance(it, dict):
            continue
        cid = str(it.get("card_id") or "").strip()
        if cid:
            by_card[cid] = it

    # morning list にあるカードを鎖順で並べる（既定 3 枚 + morning にあれば追加）
    ids_from_morning = [str(x.get("card_id") or "").strip() for x in morning_items if isinstance(x, dict)]
    ids_from_morning = [x for x in ids_from_morning if x]
    from_chain = [x for x in chain_order if x in by_card]
    extras = sort_chain_ids([x for x in ids_from_morning if x not in from_chain])
    ordered = from_chain + extras

    queue = read_json(queue_path)
    bundle = read_json(bundle_path)

    per: list[dict[str, Any]] = []
    for cid in ordered:
        per.append(classify_card(cid, by_card.get(cid), queue, bundle))

    executed_cards: list[dict[str, Any]] = []
    pending_cards: list[dict[str, Any]] = []
    failed_cards: list[dict[str, Any]] = []

    ph = {r["card_id"]: r["phase"] for r in per}
    order_violation: list[str] = []
    for cid in ordered:
        if ph.get(cid) != "complete":
            continue
        idx = ordered.index(cid)
        for prev in ordered[:idx]:
            if ph.get(prev) != "complete":
                order_violation.append(f"{cid}_complete_before_{prev}_incomplete")
                break

    for row in per:
        cid = row["card_id"]
        phase = row["phase"]

        if phase == "complete":
            executed_cards.append(
                {
                    "card_id": cid,
                    "queue_item_id": row["queue_item_id"],
                    "queue_state": row["queue_state"],
                    "bundle_entries": row["checks"]["result_bundle_entries"],
                }
            )
            continue

        if phase == "rejected":
            failed_cards.append({"card_id": cid, "reason": "queue_rejected", "detail": row})
            continue

        gate_blocked_by: str | None = None
        if cid in ordered:
            idx = ordered.index(cid)
            for prev in ordered[:idx]:
                if ph.get(prev) != "complete":
                    gate_blocked_by = prev
                    break

        pending_cards.append(
            {
                "card_id": cid,
                "phase": phase,
                "escrow_package_approved_flag": row["escrow_package_approved_flag"],
                "chain_gate_blocked_by": gate_blocked_by,
                "approve_command": (by_card.get(cid) or {}).get("approve_command"),
                "observation": row,
            }
        )

    chain_order_ok = len(order_violation) == 0

    def infer_next_step(phase: str) -> str:
        return {
            "not_in_queue": "human_run_bridge_approve_to_enqueue",
            "approval_required": "queue_policy_or_human_approval_required",
            "queue_ready": "mac_executor_pickup_expected",
            "mac_delivered": "mac_execution_in_progress",
            "executed_awaiting_bundle_entry": "ingest_result_bundle_then_result_bind",
            "rejected": "investigate_rejected",
        }.get(phase, "observe")

    next_human_enqueue_hint: dict[str, Any] | None = None
    for cid in ordered:
        row = next((x for x in per if x["card_id"] == cid), None)
        if not row or row["phase"] == "complete":
            continue
        gate_ok = True
        idx = ordered.index(cid)
        for prev in ordered[:idx]:
            if ph.get(prev) != "complete":
                gate_ok = False
                break
        if gate_ok and row["phase"] in (
            "not_in_queue",
            "approval_required",
            "queue_ready",
            "mac_delivered",
            "executed_awaiting_bundle_entry",
        ):
            next_human_enqueue_hint = {
                "card_id": cid,
                "phase": row["phase"],
                "inferred_next_step": infer_next_step(str(row["phase"])),
                "note": "enqueue の本体は api/scripts/high_risk_escrow_approval_bridge_v1.sh（--approve は人間のみ）",
                "approve_command": (by_card.get(cid) or {}).get("approve_command"),
            }
            break

    out = {
        "card": CARD,
        "generated_at": utc(),
        "morning_approval_list_path": str(morning_path),
        "queue_path": str(queue_path),
        "bundle_path": str(bundle_path),
        "bridge_script": str(bridge_sh),
        "chain_order_declared": chain_order,
        "chain_order_effective": ordered,
        "chain_order_ok": chain_order_ok,
        "chain_order_violations": order_violation,
        "executed_cards": executed_cards,
        "pending_cards": pending_cards,
        "failed_cards": failed_cards,
        "per_card": per,
        "next_human_enqueue_hint": next_human_enqueue_hint,
        "next_on_pass": "TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1",
        "next_on_fail": "停止。approval chain retry 1枚のみ生成。",
    }
    write_json(auto / OUT_JSON, out)
    print(
        json.dumps(
            {
                "ok": True,
                "chain_order_ok": chain_order_ok,
                "executed": len(executed_cards),
                "pending": len(pending_cards),
                "failed": len(failed_cards),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
