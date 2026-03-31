#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NOTION_AUTOBUILD_WATCH_LOOP — intake → compile → allowlist → 空キュー時のみ 1 枚 enqueue。
TENMON_NOTION_AUTOBUILD_READY_SELECTION_FIX_CURSOR_AUTO_V1:
compile 成功の代表行のみを母集団に allowlist/tier を先に確定し、lane / Ready / run_state 順で 1 枚を安定選定。
no_allowlisted_ready_manifest は compile 成功かつ allowlist 通過が 0 のときのみ。
single-flight（lock ファイル）・fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import infinite_growth_queue_manager_v1 as qm_mod
import infinite_growth_runtime_tuning_v1 as tuning_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod
import notion_autobuild_intake_v1 as intake_mod
import notion_autobuild_manifest_compiler_v1 as manifest_mod

CARD = "TENMON_NOTION_ORCHESTRATED_AUTOBUILD_LOOP_CURSOR_AUTO_V1"
LOCK_FN = "notion_autobuild_lock_v1.json"
RUNTIME_FN = "notion_autobuild_runtime_state_v1.json"
PROGRESS_FN = "notion_autobuild_progress_report_v1.json"
RESULT_FN = "notion_autobuild_last_intake_result_v1.json"
QUEUE_FN = "multi_ai_autonomy_queue.json"
TRIAGE_DEFAULT = "autonomy_triage.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def acquire_lock(auto_dir: Path, holder: str) -> tuple[bool, str]:
    p = auto_dir / LOCK_FN
    lock = _read_json(p)
    lock.setdefault("schema", "TENMON_NOTION_AUTOBUILD_LOCK_V1")
    if lock.get("held") is True:
        pid = int(lock.get("pid") or 0)
        if pid and _pid_alive(pid):
            return False, f"lock_held_by_pid_{pid}"
        lock["held"] = False
    lock["held"] = True
    lock["holder"] = holder
    lock["pid"] = os.getpid()
    lock["since"] = _utc_iso()
    _write_json(p, lock)
    return True, "ok"


def release_lock(auto_dir: Path) -> None:
    p = auto_dir / LOCK_FN
    lock = _read_json(p)
    lock["held"] = False
    lock["holder"] = ""
    lock["pid"] = None
    lock["since"] = ""
    lock["schema"] = "TENMON_NOTION_AUTOBUILD_LOCK_V1"
    _write_json(p, lock)


def _write_runtime(auto_dir: Path, **kwargs: Any) -> None:
    rt = _read_json(auto_dir / RUNTIME_FN)
    rt.setdefault("schema", "TENMON_NOTION_AUTOBUILD_RUNTIME_STATE_V1")
    for k, v in kwargs.items():
        rt[k] = v
    rt["updated_at"] = _utc_iso()
    _write_json(auto_dir / RUNTIME_FN, rt)


def _write_progress(auto_dir: Path, **kwargs: Any) -> None:
    pr = _read_json(auto_dir / PROGRESS_FN)
    pr.setdefault("schema", "TENMON_NOTION_AUTOBUILD_PROGRESS_REPORT_V1")
    for k, v in kwargs.items():
        pr[k] = v
    pr["updated_at"] = _utc_iso()
    _write_json(auto_dir / PROGRESS_FN, pr)


def _merge_watch_selection_into_last_intake(
    auto_dir: Path,
    *,
    chosen: str,
    sel_block: str,
    compiled_ids: list[str],
    chr_hold: str,
    cver: str,
) -> None:
    ir = _read_json(auto_dir / RESULT_FN)
    if str(ir.get("schema") or "") != "TENMON_NOTION_AUTOBUILD_LAST_INTAKE_RESULT_V1":
        return
    ir["watch_selection"] = {
        "selected_manifest_card_id": chosen,
        "selection_block_reason": sel_block,
        "compiled_manifest_card_ids": compiled_ids,
        "last_hold_reason": chr_hold,
        "last_cycle_verdict": cver,
    }
    ir["watch_selection_updated_at"] = _utc_iso()
    _write_json(auto_dir / RESULT_FN, ir)


def _priority_sort_key(m: dict[str, Any]) -> tuple[int, str]:
    p = str(m.get("priority", "")).strip()
    order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    if p in order:
        return (order[p], str(m.get("card_name", "")))
    try:
        return (-int(float(p)), str(m.get("card_name", "")))
    except (TypeError, ValueError):
        return (99, str(m.get("card_name", "")))


def _triage_tier_map(triage: dict[str, Any]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in triage.get("cards") or []:
        if isinstance(e, dict) and e.get("card_id") and e.get("automation_tier"):
            m[str(e["card_id"])] = str(e["automation_tier"])
    return m


def _require_tier_and_triage(auto_dir: Path) -> tuple[str, dict[str, str]]:
    q = _read_json(auto_dir / QUEUE_FN)
    fn = str(q.get("triage_file") or TRIAGE_DEFAULT)
    triage = _read_json(auto_dir / fn)
    require = str(q.get("require_tier") or "A_full_auto_safe")
    return require, _triage_tier_map(triage)


def _best_manifest_per_card(ok_manifests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """同一 card_name の重複 Notion 行は優先度最良 1 行だけ選ぶ（安定選定）。"""
    by_c: dict[str, dict[str, Any]] = {}
    for m in sorted(ok_manifests, key=_priority_sort_key):
        cid = str(m.get("card_name") or "").strip()
        if not cid:
            continue
        if cid not in by_c:
            by_c[cid] = m
    return sorted(by_c.values(), key=_priority_sort_key)


def _selection_block_reason(
    *,
    raw_nonempty: bool,
    ok_manifests: list[dict[str, Any]],
    queue_empty: bool,
    chosen: str,
    traces: list[dict[str, Any]],
    dry_run: bool,
    skip_enqueue: bool,
    any_allowlisted_in_compile_pool: bool,
) -> str:
    if dry_run or skip_enqueue:
        return ""
    if not queue_empty:
        return "queue_not_empty"
    if chosen:
        return ""
    if raw_nonempty and not ok_manifests:
        return "compile_failed_all"
    compile_ok = [t for t in traces if t.get("compile_ok")]
    if not compile_ok:
        return "unknown_selection_block"
    if ok_manifests and not any_allowlisted_in_compile_pool:
        return "no_allowlisted_ready_manifest"
    eligible = [t for t in compile_ok if t.get("allowlist_evaluated") and t.get("allowlist_ok")]
    if not eligible:
        return "allowlist_failed_all"
    reasons = [str(t.get("enqueue_reason") or "") for t in eligible]
    if all(r == "status_not_ready" for r in reasons):
        return "no_ready_manifest"
    if all(r == "queue_not_allowlisted_for_enqueue" for r in reasons):
        return "no_ready_manifest"
    if all(r == "run_state_not_allowlisted_for_enqueue" for r in reasons):
        return "no_ready_manifest"
    if reasons and all("tier_not" in r for r in reasons):
        return "tier_mismatch"
    if all(r == "skipped_same_as_last_enqueued" for r in reasons):
        return "duplicate_last_enqueue_skipped"
    if all(r == "skipped_card_already_in_queue" for r in reasons):
        return "card_already_in_queue_order"
    if any_allowlisted_in_compile_pool and chosen == "":
        return "no_enqueueable_ready_manifest"
    return "unknown_selection_block"


def run_once(
    *,
    auto_dir: Path,
    dry_run: bool,
    fixture_sample: bool,
    skip_enqueue: bool,
) -> dict[str, Any]:
    out: dict[str, Any] = {"ok": False, "message": "", "enqueued": ""}
    ok, why = acquire_lock(auto_dir, CARD)
    if not ok:
        out["message"] = why
        _write_runtime(auto_dir, status="HOLD", current_phase="lock_busy", last_error=why)
        return out
    try:
        _write_runtime(auto_dir, status="RUNNING", current_phase="intake", last_error="")
        intake = intake_mod.run_intake(auto_dir=auto_dir, dry_run=dry_run, fixture_sample=fixture_sample)
        if not intake.get("ok"):
            out["message"] = str(intake.get("hold_reason") or "intake_failed")
            _write_progress(
                auto_dir,
                last_cycle_verdict="HOLD",
                last_hold_reason=out["message"],
            )
            _write_runtime(auto_dir, status="HOLD", current_phase="intake", last_error=out["message"])
            return out

        raw_rows = intake.get("machine_candidates")
        if not isinstance(raw_rows, list):
            raw_rows = []

        ok_manifests, bad, candidate_traces = manifest_mod.compile_many(auto_dir, raw_rows)
        allow, deny = preflight_mod.load_allowlist_denylist(auto_dir)
        q = qm_mod.load_queue(auto_dir)
        queue_empty = tuning_mod.card_order_is_empty(q)

        schx = manifest_mod.load_schema(auto_dir)
        aq_list = schx.get("allowed_queue_for_autobuild_enqueue")
        if not isinstance(aq_list, list):
            aq_list = ["autobuild"]
        aq_ok = {str(x).lower() for x in aq_list}
        ars_list = schx.get("allowed_run_state_for_enqueue")
        if not isinstance(ars_list, list):
            ars_list = ["", "pending"]
        ars_ok = {str(x).lower() for x in ars_list}

        trace_by_page: dict[str, dict[str, Any]] = {}
        for tr in candidate_traces:
            pid = str(tr.get("notion_page_id") or "")
            if pid:
                trace_by_page[pid] = tr

        for tr in candidate_traces:
            if not tr.get("compile_ok"):
                tr["allowlist_ok"] = False
                tr["allowlist_evaluated"] = False
                tr["allowlist_reason"] = "skipped_compile_failed"
                tr["tier_ok"] = False
                tr["tier_reason"] = "skipped_compile_failed"
                tr["enqueue_selected"] = False
                tr["enqueue_reason"] = "skipped_compile_failed"

        prog_before = _read_json(auto_dir / PROGRESS_FN)
        last_eq = str(prog_before.get("last_enqueued_card_id") or "").strip()
        require_tier, tier_map = _require_tier_and_triage(auto_dir)

        ok_pool = _best_manifest_per_card(ok_manifests)
        rep_pids = {str(m.get("source_notion_page_id") or "") for m in ok_pool}

        for m in ok_manifests:
            pid = str(m.get("source_notion_page_id") or "")
            tr = trace_by_page.get(pid)
            if not tr or not tr.get("compile_ok"):
                continue
            tr.setdefault("tier_ok", False)
            tr.setdefault("tier_reason", "")
            if pid not in rep_pids:
                tr["allowlist_ok"] = False
                tr["allowlist_evaluated"] = False
                tr["allowlist_reason"] = "skipped_duplicate_notion_row"
                tr["tier_ok"] = False
                tr["tier_reason"] = "skipped_duplicate_notion_row"
                tr["enqueue_selected"] = False
                tr["enqueue_reason"] = "duplicate_notion_row_skipped"

        # compile 成功の代表行ごとに allowlist / tier を先に確定（lane / Ready / run_state より前）
        for m in ok_pool:
            cid = str(m.get("card_name") or "").strip()
            pid = str(m.get("source_notion_page_id") or "")
            tr = trace_by_page.get(pid)
            if not tr or not tr.get("compile_ok"):
                continue
            perm_ok, pw = preflight_mod.is_autonomy_card_permitted(cid, allow, deny)
            tr["allowlist_evaluated"] = True
            tr["allowlist_ok"] = perm_ok
            tr["allowlist_reason"] = "ok" if perm_ok else pw
            tier_ok = tier_map.get(cid) == require_tier
            tr["tier_ok"] = tier_ok
            tr["tier_reason"] = "ok" if tier_ok else "tier_not_require_tier"
            tr["enqueue_selected"] = False
            tr["enqueue_reason"] = ""

        any_allowlisted_compile_pool = False
        for m in ok_pool:
            tr_a = trace_by_page.get(str(m.get("source_notion_page_id") or ""))
            if isinstance(tr_a, dict) and tr_a.get("allowlist_ok") is True:
                any_allowlisted_compile_pool = True
                break

        co_cards = q.get("card_order") if isinstance(q.get("card_order"), list) else []
        queue_card_set = {str(x).strip() for x in co_cards if isinstance(x, str) and str(x).strip()}

        chosen = ""
        for m in ok_pool:
            cid = str(m.get("card_name") or "").strip()
            pid = str(m.get("source_notion_page_id") or "")
            tr = trace_by_page.get(pid)
            qn = str(m.get("queue", "")).strip().lower()
            if qn not in aq_ok:
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "queue_not_allowlisted_for_enqueue"
                continue
            if str(m.get("status") or "") != "Ready":
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "status_not_ready"
                continue
            rs = str(m.get("run_state", "")).strip().lower()
            if rs not in ars_ok:
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "run_state_not_allowlisted_for_enqueue"
                continue
            if tr is not None and not tr.get("allowlist_ok"):
                tr["enqueue_selected"] = False
                tr["enqueue_reason"] = "allowlist_not_permitted"
                continue
            if tr is not None and not tr.get("tier_ok"):
                tr["enqueue_selected"] = False
                tr["enqueue_reason"] = "tier_not_require_tier"
                continue
            if last_eq and cid == last_eq:
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "skipped_same_as_last_enqueued"
                continue
            if cid and cid in queue_card_set:
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "skipped_card_already_in_queue"
                continue
            if not chosen:
                chosen = cid
                if tr is not None:
                    tr["enqueue_selected"] = True
                    tr["enqueue_reason"] = "selected_first_in_priority_order"
            else:
                if tr is not None:
                    tr["enqueue_selected"] = False
                    tr["enqueue_reason"] = "passed_all_gates_but_lower_priority"

        cver = "PASS"
        chr_hold = ""
        if raw_rows and not ok_manifests:
            cver = "HOLD"
            chr_hold = "all_candidates_failed_compile"
        elif ok_manifests and not chosen and queue_empty and not dry_run and not skip_enqueue:
            cver = "HOLD"
            if not any_allowlisted_compile_pool:
                chr_hold = "no_allowlisted_ready_manifest"
            else:
                chr_hold = "no_enqueueable_ready_manifest"

        sel_block = _selection_block_reason(
            raw_nonempty=bool(raw_rows),
            ok_manifests=ok_manifests,
            queue_empty=queue_empty,
            chosen=chosen,
            traces=candidate_traces,
            dry_run=dry_run,
            skip_enqueue=skip_enqueue,
            any_allowlisted_in_compile_pool=any_allowlisted_compile_pool,
        )
        if chr_hold == "all_candidates_failed_compile":
            sel_block = "compile_failed_all"
        elif chr_hold == "no_allowlisted_ready_manifest" and sel_block == "":
            sel_block = "no_allowlisted_ready_manifest"
        elif chr_hold == "no_enqueueable_ready_manifest" and sel_block in ("", "unknown_selection_block"):
            sel_block = "no_enqueueable_ready_manifest"

        compiled_ids: list[str] = []
        _seen_c = set()
        for m in ok_manifests:
            c = str(m.get("card_name") or "").strip()
            if c and c not in _seen_c:
                _seen_c.add(c)
                compiled_ids.append(c)
        rejected_reasons = [
            {
                "notion_page_id": str(b.get("notion_page_id") or ""),
                "card_name": str(b.get("card_name") or ""),
                "errors": b.get("errors") if isinstance(b.get("errors"), list) else [],
            }
            for b in bad
        ]

        _write_progress(
            auto_dir,
            last_cycle_verdict=cver,
            last_hold_reason=chr_hold,
            manifests_compiled_ok=len(ok_manifests),
            manifests_rejected=len(bad),
            last_intake_page_count=int(intake.get("machine_candidates_raw_count") or 0),
            compiled_manifest_card_ids=compiled_ids,
            rejected_manifest_reasons=rejected_reasons,
            selected_manifest_card_id=chosen,
            selection_block_reason=sel_block,
            candidate_selection_trace=candidate_traces,
        )
        _merge_watch_selection_into_last_intake(
            auto_dir,
            chosen=chosen,
            sel_block=sel_block,
            compiled_ids=compiled_ids,
            chr_hold=chr_hold,
            cver=cver,
        )

        if skip_enqueue or dry_run:
            out["ok"] = True
            out["message"] = "skip_enqueue_or_dry_run"
            _write_runtime(auto_dir, status="PASS", current_phase="compile_only", last_error="")
            return out

        if not queue_empty:
            out["ok"] = True
            out["message"] = "queue_nonempty_no_enqueue"
            _write_runtime(auto_dir, status="PASS", current_phase="queue_busy", last_error="")
            return out

        if not chosen:
            out["ok"] = cver != "HOLD"
            out["message"] = chr_hold or "no_eligible_manifest"
            _write_runtime(
                auto_dir,
                status="HOLD" if cver == "HOLD" else "PASS",
                current_phase="no_candidate",
                last_error=chr_hold,
            )
            return out

        qm_mod.enqueue_single_card_front(auto_dir, chosen)
        out["ok"] = True
        out["enqueued"] = chosen
        out["message"] = "enqueued_one"
        _write_progress(
            auto_dir,
            last_enqueued_card_id=chosen,
            last_cycle_verdict="PASS",
            last_hold_reason="",
            selection_block_reason="",
            selected_manifest_card_id=chosen,
        )
        _merge_watch_selection_into_last_intake(
            auto_dir,
            chosen=chosen,
            sel_block="",
            compiled_ids=compiled_ids,
            chr_hold="",
            cver="PASS",
        )
        _write_runtime(auto_dir, status="PASS", current_phase="enqueued", last_error="")
        return out
    finally:
        release_lock(auto_dir)


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD + " watch")
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--fixture-sample", action="store_true")
    ap.add_argument("--skip-enqueue", action="store_true", help="compile まで（投入しない）")
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir) if args.auto_dir else _AUTO
    r = run_once(
        auto_dir=auto_dir,
        dry_run=bool(args.dry_run),
        fixture_sample=bool(args.fixture_sample),
        skip_enqueue=bool(args.skip_enqueue),
    )
    print(json.dumps(r, ensure_ascii=False))
    sys.exit(0 if r.get("ok") else 2)


if __name__ == "__main__":
    main()
