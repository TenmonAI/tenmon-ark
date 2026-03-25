#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_PRIORITY_LOOP_TO_REMOTE_QUEUE_ENQUEUE_CURSOR_AUTO_V1

single-source truth / worldclass loop / single-flight / convergence から next を1本決め、
safe gate を満たす場合のみ remote_cursor_queue.json に non-fixture 実ジョブとして積む。

success 捏造禁止:
- high-risk card は enqueue しない（proposed に残すだけ）
- stale source 主導では enqueue しない
"""
from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_PRIORITY_LOOP_TO_REMOTE_QUEUE_ENQUEUE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_summary.json"
OUT_MD = "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_report.md"

PENDING_STATES = frozenset({"approval_required", "ready", "delivered"})
QUEUE_PENDING_MAX = 3
AUTOCOMPACT_MAX_AGE_H = 72.0


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_iso(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _is_high_risk_card(card_id: str) -> bool:
    c = (card_id or "").strip()
    if not c:
        return True
    # conservative: chat/finalize/web/auth/queue/token 系は自動投入しない
    hi = (
        "CHAT_TS",
        "CHAT_TS_",
        "CHAT_TRUNK",
        "CHAT_REFACTOR",
        "K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR",  # chat.ts 局所改変（high-risk）
        "GENERAL_KNOWLEDGE_SUBSTANCE_REPAIR",     # chat.ts 改変（high-risk）
        "AUTH",
        "FOUNDER",
        "EXECUTOR_TOKEN",
        "TOKEN",
        "QUEUE",
        "CURSOR_QUEUE",
        "WEB_",
        "PWA_",
    )
    cu = c.upper()
    return any(x in cu for x in hi)


def _queue_stats(queue: dict[str, Any]) -> dict[str, Any]:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    pending = [x for x in items if isinstance(x, dict) and str(x.get("state") or "") in PENDING_STATES]
    nonfix_delivered = [
        x
        for x in pending
        if str(x.get("state") or "") == "delivered" and x.get("fixture") is False
    ]
    return {
        "item_count": len(items),
        "pending_count": len(pending),
        "nonfixture_delivered_count": len(nonfix_delivered),
        "pending_cursor_cards": [str(x.get("cursor_card") or "") for x in pending if x.get("cursor_card")][:24],
    }


def _already_pending(queue: dict[str, Any], card_id: str) -> bool:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") not in PENDING_STATES:
            continue
        if str(it.get("cursor_card") or "").strip() == card_id:
            return True
    return False


def _pick_candidate(inputs: dict[str, Any]) -> tuple[str | None, str]:
    """returns (card_id, source_label)"""
    f = inputs.get("forensic") or {}
    wl = inputs.get("worldclass_loop") or {}
    sf = inputs.get("single_flight") or {}
    conv = inputs.get("convergence") or {}
    gen = inputs.get("generated_cards") or {}

    c = f.get("next_best_card")
    if isinstance(c, str) and c.strip():
        return c.strip(), "forensic.next_best_card"
    c = (wl.get("outputs") or {}).get("next_best_card")
    if isinstance(c, str) and c.strip():
        return c.strip(), "worldclass_loop.outputs.next_best_card"
    c = sf.get("next_card")
    if isinstance(c, str) and c.strip():
        return c.strip(), "single_flight.next_card"
    nc = conv.get("next_cards")
    if isinstance(nc, list) and nc:
        c0 = str(nc[0]).strip()
        if c0:
            return c0, "state_convergence_next_cards[0]"
    for cand in gen.get("candidates") or []:
        if isinstance(cand, dict) and cand.get("safe_auto_fix") is True:
            cid = str(cand.get("card_id") or "").strip()
            if cid:
                return cid, "conversation_quality_generated_cards.safe_candidate"
    return None, "none"


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    paths = {
        "forensic": auto / "tenmon_autonomy_current_state_forensic.json",
        "worldclass_loop": auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json",
        "single_flight": auto / "tenmon_cursor_single_flight_queue_state.json",
        "convergence": auto / "state_convergence_next_cards.json",
        "generated_cards": auto / "conversation_quality_generated_cards.json",
        "autocompact": auto / "tenmon_cursor_worktree_autocompact_summary.json",
        "queue": auto / "remote_cursor_queue.json",
    }

    inputs = {k: _read_json(p) for k, p in paths.items() if k != "queue"}
    queue = _read_json(paths["queue"])

    # gates
    blocked: list[str] = []
    forensic = inputs.get("forensic") or {}
    if forensic.get("system_ready") is not True:
        blocked.append("gate:system_ready!=true")
    if forensic.get("watch_loop_stable") is not True:
        blocked.append("gate:watch_loop_stable!=true")

    # autocompact freshness + pressure
    ac = inputs.get("autocompact") or {}
    ac_at = _parse_iso(ac.get("generated_at"))
    ac_stale = ac_at is None or (datetime.now(timezone.utc) - ac_at) > timedelta(hours=AUTOCOMPACT_MAX_AGE_H)
    if not ac:
        blocked.append("gate:autocompact_missing")
    elif ac_stale:
        blocked.append("gate:autocompact_stale")
    elif bool((ac.get("review_blockers") or {}).get("review_file_count_gt_120")):
        blocked.append("gate:review_file_count_gt_120_run_autocompact")

    qs = _queue_stats(queue)
    if int(qs["pending_count"]) > QUEUE_PENDING_MAX:
        blocked.append(f"gate:pending_queue_count>{QUEUE_PENDING_MAX}")
    if int(qs["nonfixture_delivered_count"]) > 0:
        blocked.append("gate:nonfixture_delivered_exists")

    # stale truth gating
    stale_list = forensic.get("stale_sources") if isinstance(forensic.get("stale_sources"), list) else []
    if stale_list:
        blocked.append("gate:forensic_stale_sources_present")
    wl = inputs.get("worldclass_loop") or {}
    if bool(((wl.get("dialogue_quality") or {}).get("stale_sources_present"))):
        blocked.append("gate:worldclass_loop_stale_sources_present")

    # pick next
    proposed, picked_from = _pick_candidate(inputs)
    if not proposed:
        blocked.append("no_candidate_card")

    enqueue_ok = False
    enqueued_item: dict[str, Any] | None = None

    if proposed:
        if _already_pending(queue, proposed):
            blocked.append("gate:duplicate_cursor_card_already_pending")
        if _is_high_risk_card(proposed):
            blocked.append("high_risk_card_requires_manual_gate")

    # enqueue only if fully unblocked
    if proposed and not blocked:
        # create item
        items = queue.get("items") if isinstance(queue.get("items"), list) else []
        used_ids = {str(x.get("id") or "") for x in items if isinstance(x, dict)}
        new_id = secrets.token_hex(8)
        while new_id in used_ids:
            new_id = secrets.token_hex(8)
        now = _utc_iso()
        enqueued_item = {
            "id": new_id,
            "job_id": new_id,
            "state": "ready",
            "createdAt": now,
            "source": CARD,
            "cursor_card": proposed,
            "objective": "auto-enqueue from single-source truth (safe gate)",
            "job_file": None,
            "fixture": False,
            "dry_run_only": False,
            "leased_until": None,
            "enqueue_reason": picked_from,
            "current_run": True,
        }
        items.insert(0, enqueued_item)
        queue_out = {
            "version": int(queue.get("version") or 1),
            "card": str(queue.get("card") or "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1"),
            "updatedAt": now,
            "items": items,
            "state_schema": str(queue.get("state_schema") or "approval_required|ready|rejected|delivered|executed"),
        }
        (paths["queue"]).write_text(json.dumps(queue_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        enqueue_ok = True

    out = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "enqueue_ok": enqueue_ok,
        "picked_from": picked_from,
        "proposed_next_card": proposed,
        "blocked_reason": blocked,
        "queue_stats": qs,
        "enqueued_item": enqueued_item,
        "inputs": {k: str(p) for k, p in paths.items()},
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **enqueue_ok**: `{enqueue_ok}`",
        f"- proposed_next_card: `{proposed}`",
        f"- picked_from: `{picked_from}`",
        "",
        "## blocked_reason",
        "",
    ]
    for b in blocked:
        md.append(f"- {b}")
    if not blocked:
        md.append("- (none)")
    md.extend(["", "## queue_stats", ""])
    md.append(f"- pending_count: `{qs['pending_count']}`")
    md.append(f"- nonfixture_delivered_count: `{qs['nonfixture_delivered_count']}`")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "enqueue_ok": enqueue_ok, "proposed_next_card": proposed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

