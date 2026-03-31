#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — 観測束 + スケジュールから「最小次カード」1枚を fail-closed で選定。
投入後は evaluate_frontier_advance_acceptance で frontier 前進を acceptance 固定する。
generation 前は run_generation_quality_checks（hold_policy の generation_quality_guard）で品質ガードする。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import infinite_growth_learning_ledger_v1 as ledger_mod
import infinite_growth_queue_manager_v1 as qm_mod
import infinite_growth_runtime_tuning_v1 as tuning_mod
import infinite_growth_schedule_reader_v1 as sched_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod

EXEC_HISTORY_FN = "multi_ai_autonomy_execution_history.json"
HOLD_POLICY_FN = "infinite_growth_hold_policy_v1.json"


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


def _load_gq_policy(auto_dir: Path) -> dict[str, Any]:
    raw = _read_json(auto_dir / HOLD_POLICY_FN)
    g = raw.get("generation_quality_guard")
    return g if isinstance(g, dict) else {}


def _gq_int(policy: dict[str, Any], key: str, default: int) -> int:
    try:
        v = policy.get(key, default)
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _schedule_priority_index(schedule: dict[str, Any], card_id: str) -> int:
    rows = sorted(
        [r for r in sched_mod.schedule_rows(schedule) if isinstance(r, dict)],
        key=_priority_key,
    )
    cid = (card_id or "").strip()
    for i, r in enumerate(rows):
        if str(r.get("card_id") or "") == cid:
            return i
    return -1


def _generation_quality_frontier_ok(schedule: dict[str, Any], cid: str, last_ex: str) -> bool:
    last_ex = (last_ex or "").strip()
    if not last_ex:
        return True
    if cid == last_ex:
        return False
    i_g = _schedule_priority_index(schedule, cid)
    i_f = _schedule_priority_index(schedule, last_ex)
    if i_g < 0:
        return False
    if i_f < 0:
        return True
    row_g = _find_row(schedule, cid)
    row_f = _find_row(schedule, last_ex)
    if not row_g or not row_f:
        return i_g > i_f
    pk_g = _priority_key(row_g)
    pk_f = _priority_key(row_f)
    return i_g > i_f or pk_g < pk_f


def _ledger_quality_rejection(auto_dir: Path, cid: str, issue_signature: str, quality_code: str) -> None:
    ledger_mod.append_ledger_entry(
        auto_dir,
        {
            "event": "quality_guard",
            "card_id": cid,
            "issue_signature": issue_signature,
            "verdict": "HOLD",
            "hold_reason": quality_code,
            "quality_code": quality_code,
            "fix_type": "generation_quality_guard",
        },
    )


def run_generation_quality_checks(
    *,
    auto_dir: Path,
    schedule: dict[str, Any],
    row: dict[str, Any],
    cid: str,
    issue_signature: str,
    last_executed_card: str,
    generation_history_entries: list[dict[str, Any]],
    allow: dict[str, Any] | None,
    deny: dict[str, Any] | None,
    ledger: dict[str, Any],
    policy: dict[str, Any],
    queue_tenmon_count: int = 0,
) -> tuple[str | None, dict[str, Any]]:
    """品質ガード。通過時 (None, meta) / 失敗時 (quality_code, meta)。"""
    min_acc = _gq_int(policy, "min_acceptance_chars", 24)
    rh_max = _gq_int(policy, "repeated_same_card_hold_max", 2)
    max_q_slots = _gq_int(policy, "max_tenmon_queue_slots_for_generation", 0)
    drift_lb = _gq_int(policy, "selection_drift_lookback", 8)
    drift_min = _gq_int(policy, "selection_drift_min_rejects_same_card", 2)

    acc = str(row.get("acceptance") or "").strip()
    acc_ok = len(acc) >= min_acc
    scores: dict[str, Any] = {
        "acceptance_clarity": 1.0 if acc_ok else 0.0,
        "not_manual": 0.0 if row.get("manual_only") else 1.0,
        "generation_allowed": 1.0 if row.get("generation_allowed", True) else 0.0,
    }
    meta: dict[str, Any] = {
        "scores": scores,
        "detail": "",
        "card_id": cid,
        "generation_history_tail_len": len(generation_history_entries),
    }

    if queue_tenmon_count > max_q_slots:
        meta["detail"] = f"queue_tenmon={queue_tenmon_count}>{max_q_slots}"
        return "queue_pollution_risk", meta

    if row.get("manual_only"):
        return "manual_only", meta

    if not acc_ok:
        return "acceptance_missing", meta

    if allow is not None and deny is not None:
        perm_ok, perm_why = preflight_mod.is_autonomy_card_permitted(cid, allow, deny)
        scores["allowlist_fit"] = 1.0 if perm_ok else 0.0
        scores["denylist_clear"] = 1.0 if perm_ok else 0.0
        if not perm_ok:
            meta["detail"] = perm_why
            return "denylist_hit", meta
    else:
        scores["allowlist_fit"] = 1.0
        scores["denylist_clear"] = 1.0

    last_ex = (last_executed_card or "").strip()
    if last_ex and cid == last_ex:
        scores["same_card_low"] = 0.0
        return "same_card_signature", meta
    scores["same_card_low"] = 1.0

    if rh_max >= 1 and ledger_mod.recent_same_card_hold_count(ledger, cid) >= rh_max:
        meta["detail"] = f"same_card_holds>={rh_max}"
        scores["repeated_hold_low"] = 0.0
        return "repeated_hold_risk", meta
    scores["repeated_hold_low"] = 1.0

    n_drift = ledger_mod.quality_guard_reject_count(ledger, card_id=cid, lookback=drift_lb)
    if drift_min >= 1 and n_drift >= drift_min:
        meta["detail"] = f"quality_guard_rejects={n_drift}"
        scores["selection_stability"] = 0.0
        return "selection_drift", meta
    scores["selection_stability"] = 1.0

    if tuning_mod.is_broad_scope_card_id(cid):
        scores["broadness_low"] = 0.0
        return "broad_scope_risk", meta
    scores["broadness_low"] = 1.0

    if not _generation_quality_frontier_ok(schedule, cid, last_ex):
        meta["detail"] = "schedule_ordering_vs_frontier"
        scores["frontier_advance_ok"] = 0.0
        return "frontier_non_advance", meta
    scores["frontier_advance_ok"] = 1.0

    return None, meta


def pick_next_row(
    *,
    auto_dir: Path,
    schedule: dict[str, Any],
    require_tier: str,
    ledger_pass_cards: set[str],
    dry_run: bool,
    generation_history_entries: list[dict[str, Any]],
    last_executed_card: str = "",
    allow: dict[str, Any] | None = None,
    deny: dict[str, Any] | None = None,
    ledger: dict[str, Any] | None = None,
) -> tuple[dict[str, Any] | None, str, dict[str, Any]]:
    q_empty_report: dict[str, Any] = {
        "blocked_quality_reasons": [],
        "selected_quality_reason": "",
        "candidate_quality_summary": {},
    }
    if dry_run:
        dr = {
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
        }
        return dr, "ok", {
            "blocked_quality_reasons": [],
            "selected_quality_reason": "dry_run_quality_stub_ok",
            "candidate_quality_summary": {"dry_run": True, "scores": {"stub": 1.0}},
        }

    ok, why = sched_mod.validate_schedule_shape(schedule)
    if not ok:
        return None, f"schedule_invalid:{why}", q_empty_report

    policy = _load_gq_policy(auto_dir)
    pass_cards = set(ledger_pass_cards) | passed_cards_from_execution_history(auto_dir)
    rows = [r for r in sched_mod.schedule_rows(schedule) if isinstance(r, dict)]
    rows.sort(key=_priority_key)
    led = ledger if ledger is not None else ledger_mod.load_ledger(auto_dir)
    last_ex = (last_executed_card or "").strip()
    use_allow = allow is not None and deny is not None

    q = qm_mod.load_queue(auto_dir)
    co = q.get("card_order")
    queue_tenmon = 0
    if isinstance(co, list):
        queue_tenmon = len(
            [x for x in co if isinstance(x, str) and str(x).strip().startswith("TENMON_")]
        )

    blocked_q: list[dict[str, Any]] = []

    def _candidate(row: dict[str, Any]) -> bool:
        if row.get("manual_only"):
            return False
        if not row.get("generation_allowed", True):
            return False
        if not _acceptance_clear(row, min_len=_gq_int(policy, "min_acceptance_chars", 24)):
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
        qc, meta = run_generation_quality_checks(
            auto_dir=auto_dir,
            schedule=schedule,
            row=row,
            cid=cid,
            issue_signature=sig,
            last_executed_card=last_ex,
            generation_history_entries=generation_history_entries,
            allow=allow if use_allow else None,
            deny=deny if use_allow else None,
            ledger=led,
            policy=policy,
            queue_tenmon_count=queue_tenmon,
        )
        if qc:
            blocked_q.append(
                {
                    "card_id": cid,
                    "reason": qc,
                    "quality_code": qc,
                    "detail": str(meta.get("detail") or ""),
                }
            )
            _ledger_quality_rejection(auto_dir, cid, sig, qc)
            continue
        if not row.get("repeatable", True):
            rep_hit = False
            for ge in generation_history_entries[-40:]:
                if str(ge.get("card_id") or "") == cid and str(ge.get("event") or "") == "enqueued":
                    rep_hit = True
                    break
            if rep_hit:
                blocked_q.append(
                    {
                        "card_id": cid,
                        "reason": "repeatable_false_already_enqueued",
                        "quality_code": "repeatable_false_already_enqueued",
                        "detail": "",
                    }
                )
                _ledger_quality_rejection(auto_dir, cid, sig, "repeatable_false_already_enqueued")
                continue
        row = dict(row)
        row["issue_signature"] = sig
        scores = meta.get("scores") if isinstance(meta.get("scores"), dict) else {}
        return row, "ok", {
            "blocked_quality_reasons": blocked_q,
            "selected_quality_reason": f"quality_pass:{cid}:schedule_pick",
            "candidate_quality_summary": {"selected_card_id": cid, "scores": scores},
        }

    incomplete_manual = any(
        bool(r.get("manual_only")) and not _row_completed(auto_dir, r, pass_cards) for r in rows
    )
    if incomplete_manual and not any(_candidate(r) for r in rows):
        return None, "manual_only_frontier", {
            "blocked_quality_reasons": blocked_q,
            "selected_quality_reason": "",
            "candidate_quality_summary": {"outcome": "manual_only_frontier"},
        }
    return None, "empty_queue_no_generatable_next", {
        "blocked_quality_reasons": blocked_q,
        "selected_quality_reason": "",
        "candidate_quality_summary": {"outcome": "no_eligible_row"},
    }


def select_next_card_bind(
    *,
    auto_dir: Path,
    schedule: dict[str, Any],
    require_tier: str,
    ledger: dict[str, Any],
    last_executed_card: str,
    dry_run: bool,
    generation_history_entries: list[dict[str, Any]],
    allow: dict[str, Any],
    deny: dict[str, Any],
) -> dict[str, Any]:
    """
    QUEUE_DRAINED 後の次カード選定（schedule + 観測・台帳・allowlist）。
    戻り: ok, selected_card_id, row, selection_reason, selection_basis, blocked_candidates, frontier_shift, hold_reason
    """
    last_ex = (last_executed_card or "").strip()
    blocked: list[dict[str, Any]] = []
    basis = "schedule_source+execution_history_pass+probe+learning_ledger+allowlist_denylist"

    if dry_run:
        row, _why, qmeta = pick_next_row(
            auto_dir=auto_dir,
            schedule=schedule,
            require_tier=require_tier,
            ledger_pass_cards=ledger_mod.passed_card_ids_from_ledger(ledger),
            dry_run=True,
            generation_history_entries=generation_history_entries,
            last_executed_card=last_ex,
            allow=allow,
            deny=deny,
            ledger=ledger,
        )
        if not row:
            return {
                "ok": False,
                "selected_card_id": None,
                "row": None,
                "selection_reason": "",
                "selection_basis": basis,
                "blocked_candidates": blocked,
                "frontier_shift": "",
                "hold_reason": "no_generatable_next_card",
                "blocked_quality_reasons": qmeta.get("blocked_quality_reasons") or [],
                "selected_quality_reason": qmeta.get("selected_quality_reason") or "",
                "candidate_quality_summary": qmeta.get("candidate_quality_summary") or {},
            }
        cid = str(row.get("card_id") or "")
        return {
            "ok": True,
            "selected_card_id": cid,
            "row": row,
            "selection_reason": "dry_run_bind",
            "selection_basis": basis,
            "blocked_candidates": blocked,
            "frontier_shift": f"{last_ex or '(none)'}->{cid}",
            "hold_reason": None,
            "blocked_quality_reasons": qmeta.get("blocked_quality_reasons") or [],
            "selected_quality_reason": qmeta.get("selected_quality_reason") or "",
            "candidate_quality_summary": qmeta.get("candidate_quality_summary") or {},
        }

    ok_s, why_s = sched_mod.validate_schedule_shape(schedule)
    if not ok_s:
        return {
            "ok": False,
            "selected_card_id": None,
            "row": None,
            "selection_reason": "",
            "selection_basis": basis,
            "blocked_candidates": [{"reason": f"schedule_parse:{why_s}"}],
            "frontier_shift": "",
            "hold_reason": "no_generatable_next_card",
            "blocked_quality_reasons": [],
            "selected_quality_reason": "",
            "candidate_quality_summary": {},
        }

    policy = _load_gq_policy(auto_dir)
    pass_cards = set(ledger_mod.passed_card_ids_from_ledger(ledger)) | passed_cards_from_execution_history(auto_dir)
    rows = [r for r in sched_mod.schedule_rows(schedule) if isinstance(r, dict)]
    rows.sort(key=_priority_key)

    q = qm_mod.load_queue(auto_dir)
    co = q.get("card_order")
    queue_tenmon = 0
    if isinstance(co, list):
        queue_tenmon = len(
            [x for x in co if isinstance(x, str) and str(x).strip().startswith("TENMON_")]
        )

    def _candidate_bind(row: dict[str, Any]) -> bool:
        if row.get("manual_only"):
            return False
        if not row.get("generation_allowed", True):
            return False
        if not _acceptance_clear(row, min_len=_gq_int(policy, "min_acceptance_chars", 24)):
            return False
        if not _tier_matches(row, require_tier):
            return False
        if not _prereqs_ok(auto_dir, schedule, row, pass_cards):
            return False
        if _row_completed(auto_dir, row, pass_cards):
            return False
        return True

    for row in rows:
        if not _candidate_bind(row):
            continue
        cid = str(row.get("card_id") or "")
        sig = f"ig_sched:{cid}"
        qc, meta = run_generation_quality_checks(
            auto_dir=auto_dir,
            schedule=schedule,
            row=row,
            cid=cid,
            issue_signature=sig,
            last_executed_card=last_ex,
            generation_history_entries=generation_history_entries,
            allow=allow,
            deny=deny,
            ledger=ledger,
            policy=policy,
            queue_tenmon_count=queue_tenmon,
        )
        if qc:
            blocked.append(
                {
                    "card_id": cid,
                    "reason": qc,
                    "quality_code": qc,
                    "detail": str(meta.get("detail") or ""),
                }
            )
            _ledger_quality_rejection(auto_dir, cid, sig, qc)
            continue
        if not row.get("repeatable", True):
            rep_hit = False
            for ge in generation_history_entries[-40:]:
                if str(ge.get("card_id") or "") == cid and str(ge.get("event") or "") == "enqueued":
                    rep_hit = True
                    break
            if rep_hit:
                blocked.append(
                    {
                        "card_id": cid,
                        "reason": "repeatable_false_already_enqueued",
                        "quality_code": "repeatable_false_already_enqueued",
                        "detail": "",
                    }
                )
                _ledger_quality_rejection(auto_dir, cid, sig, "repeatable_false_already_enqueued")
                continue
        row = dict(row)
        row["issue_signature"] = sig
        scores = meta.get("scores") if isinstance(meta.get("scores"), dict) else {}
        return {
            "ok": True,
            "selected_card_id": cid,
            "row": row,
            "selection_reason": "schedule_priority_after_drain",
            "selection_basis": basis,
            "blocked_candidates": blocked,
            "frontier_shift": f"{last_ex or '(none)'}->{cid}",
            "hold_reason": None,
            "blocked_quality_reasons": blocked,
            "selected_quality_reason": f"quality_pass:{cid}:drain_bind",
            "candidate_quality_summary": {"selected_card_id": cid, "scores": scores},
        }

    incomplete_manual = any(
        bool(r.get("manual_only")) and not _row_completed(auto_dir, r, pass_cards) for r in rows
    )
    if incomplete_manual and not any(_candidate_bind(r) for r in rows):
        hr = "manual_only_frontier"
    else:
        hr = "no_generatable_next_card"
    return {
        "ok": False,
        "selected_card_id": None,
        "row": None,
        "selection_reason": "",
        "selection_basis": basis,
        "blocked_candidates": blocked,
        "frontier_shift": "",
        "hold_reason": hr,
        "blocked_quality_reasons": blocked,
        "selected_quality_reason": "",
        "candidate_quality_summary": {"outcome": hr},
    }


def evaluate_frontier_advance_acceptance(
    *,
    auto_dir: Path,
    schedule: dict[str, Any],
    require_tier: str,
    schedule_row_card_id: str,
    enqueued_card_id: str,
    frontier_from: str,
    selection_reason: str,
    allow: dict[str, Any],
    deny: dict[str, Any],
    row: dict[str, Any] | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    生成・投入後の frontier 前進 acceptance（fail-closed）。
    schedule_row_card_id: スケジュール上の論理カード ID（dry-run ダミー含む）
    enqueued_card_id: キュー先頭に載った ID（dry-run proxy 可）
    """
    logical = (schedule_row_card_id or "").strip()
    queued = (enqueued_card_id or "").strip()
    frontier_ex = (frontier_from or "").strip()
    sel = (selection_reason or "").strip()

    def fail(blocked: str, detail: str = "") -> dict[str, Any]:
        return {
            "frontier_advanced": False,
            "frontier_from": frontier_ex,
            "frontier_to": queued or logical,
            "acceptance_reason": "",
            "advance_blocked_by": blocked,
            "advance_detail": detail,
        }

    if not logical and not queued:
        return fail("missing_generated_card")

    if frontier_ex and (logical == frontier_ex or queued == frontier_ex):
        return fail("same_card_not_advance")

    ok_s, why_s = sched_mod.validate_schedule_shape(schedule)
    if not ok_s:
        return fail("schedule_invalid", why_s)

    row_g = _find_row(schedule, logical)
    in_schedule = row_g is not None
    if not row_g and dry_run and row is not None and str(row.get("card_id") or "").strip() == logical:
        row_g = row
    if not row_g:
        return fail("generated_not_in_schedule_source")

    if row_g.get("manual_only"):
        return fail("manual_only_not_advance")

    if not _acceptance_clear(row_g):
        return fail("acceptance_empty_not_advance")

    if not _tier_matches(row_g, require_tier):
        return fail("tier_mismatch_not_advance")

    perm_ok, perm_why = preflight_mod.is_autonomy_card_permitted(logical, allow, deny)
    if not perm_ok and dry_run and queued and queued != logical:
        perm_ok, perm_why = preflight_mod.is_autonomy_card_permitted(queued, allow, deny)
    if not perm_ok:
        return fail("denylist_or_allowlist_block", perm_why)
    if queued and queued != logical:
        q_ok, q_why = preflight_mod.is_autonomy_card_permitted(queued, allow, deny)
        if not q_ok:
            return fail("denylist_or_allowlist_block", f"enqueued:{q_why}")

    i_g = _schedule_priority_index(schedule, logical)
    if not frontier_ex:
        ordering_ok = True
        ord_note = "no_prior_frontier"
    elif not in_schedule and dry_run:
        ordering_ok = True
        ord_note = "dry_run_ordering_deferred"
    elif i_g < 0:
        return fail("generated_not_in_schedule_source")
    else:
        i_f = _schedule_priority_index(schedule, frontier_ex)
        if i_f < 0:
            return fail("frontier_not_in_schedule_source")
        row_f = _find_row(schedule, frontier_ex)
        if not row_f:
            return fail("frontier_not_in_schedule_source")
        pk_g = _priority_key(row_g)
        pk_f = _priority_key(row_f)
        ordering_ok = i_g > i_f or pk_g < pk_f
        ord_note = f"i_gen={i_g} i_frontier={i_f} pk_gen={pk_g} pk_frontier={pk_f}"

    if not ordering_ok:
        return fail("frontier_ordering_not_advanced", ord_note)

    if not sel.strip():
        return fail("selection_reason_empty")

    q = qm_mod.load_queue(auto_dir)
    co = q.get("card_order")
    if not isinstance(co, list):
        return fail("queue_not_singleton")
    tenmon = [str(x).strip() for x in co if isinstance(x, str) and str(x).strip().startswith("TENMON_")]
    if len(tenmon) != 1:
        return fail("queue_not_singleton", f"tenmon_count={len(tenmon)}")
    if tenmon[0] != queued:
        return fail("queue_head_mismatch_generated", f"expected={queued} actual={tenmon[0]}")

    ex = _read_json(auto_dir / EXEC_HISTORY_FN)
    ent = ex.get("entries")
    hist_tail = ""
    if isinstance(ent, list) and ent:
        tail_e = [e for e in ent[-5:] if isinstance(e, dict)]
        if tail_e:
            hist_tail = "exec_hist_tail=" + ",".join(
                f"{str(e.get('card_id') or '')}:{str(e.get('verdict') or '')}" for e in tail_e
            )

    acc = (
        f"frontier_advance_ok {frontier_ex or '(none)'} -> {queued or logical}; "
        f"ordering({ord_note}); logical={logical}; queue={queued}; selection={sel}"
    )
    if hist_tail:
        acc += f"; {hist_tail}"

    return {
        "frontier_advanced": True,
        "frontier_from": frontier_ex,
        "frontier_to": queued or logical,
        "acceptance_reason": acc,
        "advance_blocked_by": "",
        "advance_detail": ord_note,
    }

