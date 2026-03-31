#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REAL_3H_AUTOBUILD_PARENT_GUARDED_LOOP_CURSOR_AUTO_V1
TENMON_REAL_3H_AUTOBUILD_PARENT_GUARDED_LOOP_RETEST_CURSOR_AUTO_V1
TENMON_PARENT_LOOP_QUEUE_FORWARD_PROGRESS_FIX_CURSOR_AUTO_V1

live Notion intake（空キュー時のみ）→ EXPECTED_HEAD 同期 → supervisor 1 card（--max-loops 1）
を繰り返す fail-closed 親ループ。3h 運転向け。既存 queue / supervisor / notion 契約は変更しない。

公式再試験: 10分 → 30分 → 3時間の各 tier で本 report を保存し retest_verdict を比較する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import infinite_growth_runtime_tuning_v1 as tuning_mod

CARD = "TENMON_REAL_3H_AUTOBUILD_PARENT_GUARDED_LOOP_CURSOR_AUTO_V1"
RETEST_CARD = "TENMON_REAL_3H_AUTOBUILD_PARENT_GUARDED_LOOP_RETEST_CURSOR_AUTO_V1"
QUEUE_FN = "multi_ai_autonomy_queue.json"
RUNTIME_FN = "multi_ai_autonomy_runtime_state.json"
PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
EXEC_HISTORY_FN = "multi_ai_autonomy_execution_history.json"
NOTION_PROGRESS_FN = "notion_autobuild_progress_report_v1.json"
STOP_FN = "multi_ai_autonomy_stop_conditions_v1.json"
REPORT_FN = "real_3h_autobuild_parent_guarded_loop_report_v1.json"
WATCH_SCRIPT = "notion_autobuild_watch_loop_v1.py"
SUPERVISOR_SCRIPT = "multi_ai_autonomy_supervisor_v1.py"

# 公式段階運転（秒）— report に固定記録
OFFICIAL_RETEST_TIERS = (
    {"id": "10min_smoke", "max_seconds": 600, "label": "10分スモーク"},
    {"id": "30min_stress", "max_seconds": 1800, "label": "30分ストレス"},
    {"id": "3h_production", "max_seconds": 10800, "label": "3時間本番相当"},
)


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


def _repo_root(auto_dir: Path) -> Path:
    return auto_dir.parents[1]


def _queue_len(queue: dict[str, Any]) -> int:
    co = queue.get("card_order")
    if not isinstance(co, list):
        return 0
    return len([x for x in co if isinstance(x, str) and x.strip()])


def _queue_head(queue: dict[str, Any]) -> str:
    co = queue.get("card_order") if isinstance(queue.get("card_order"), list) else []
    for x in co:
        if isinstance(x, str) and x.strip():
            return x.strip()
    return ""


def _queue_card_order_snapshot(queue: dict[str, Any]) -> list[str]:
    co = queue.get("card_order") if isinstance(queue.get("card_order"), list) else []
    return [str(x).strip() for x in co if isinstance(x, str) and str(x).strip()]


def _execution_history_len(auto_dir: Path) -> int:
    h = _read_json(auto_dir / EXEC_HISTORY_FN)
    ent = h.get("entries")
    return len(ent) if isinstance(ent, list) else 0


def _execution_history_last_card_id(auto_dir: Path) -> str:
    h = _read_json(auto_dir / EXEC_HISTORY_FN)
    ent = h.get("entries")
    if not isinstance(ent, list) or not ent:
        return ""
    last = ent[-1]
    if isinstance(last, dict):
        return str(last.get("card_id") or "").strip()
    return ""


def _parse_watch_enqueued(stdout: str) -> str:
    if not (stdout or "").strip():
        return ""
    for line in reversed(stdout.splitlines()):
        chunk = line.strip()
        if not chunk.startswith("{"):
            continue
        try:
            j = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        if isinstance(j, dict):
            e = j.get("enqueued")
            if isinstance(e, str) and e.strip():
                return e.strip()
    return ""


def _git_head(repo: Path) -> str:
    try:
        p = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        return (p.stdout or "").strip()
    except Exception:
        return ""


def _final_frontier_snapshot(auto_dir: Path) -> dict[str, Any]:
    prog = _read_json(auto_dir / PROGRESS_FN)
    rt = _read_json(auto_dir / RUNTIME_FN)
    nprog = _read_json(auto_dir / NOTION_PROGRESS_FN)
    au = prog.get("audit_status") if isinstance(prog.get("audit_status"), dict) else {}
    last_res = str(prog.get("last_result") or rt.get("last_result") or "")
    return {
        "multi_ai_autonomy_status": str(rt.get("status") or ""),
        "multi_ai_last_result": last_res,
        "notion_last_hold_reason": str(nprog.get("last_hold_reason") or "").strip(),
        "notion_last_cycle_verdict": str(nprog.get("last_cycle_verdict") or ""),
        "audit_skipped": bool(au.get("skipped")),
        "audit_ok": au.get("ok"),
        "dirty_files_count": int(prog.get("dirty_files_count") or -1),
        "queue_len": _queue_len(_read_json(auto_dir / QUEUE_FN)),
    }


def _load_dirty_threshold(auto_dir: Path, override: int | None) -> int:
    if override is not None and override > 0:
        return override
    sc = _read_json(auto_dir / STOP_FN)
    v = int(sc.get("dirty_cumulative_abort_threshold") or 80)
    return max(1, v)


def _tier_id_for_seconds(max_sec: int, *, extra_tiers: tuple[dict[str, Any], ...] = ()) -> str:
    for t in OFFICIAL_RETEST_TIERS:
        if int(t["max_seconds"]) == max_sec:
            return str(t["id"])
    for t in extra_tiers:
        ms = int(t.get("max_seconds") or 0)
        if ms == max_sec:
            return str(t.get("id") or "custom")
    return "custom"


def _compute_retest_verdict(
    *,
    max_sec: int,
    stopped_by: str,
    same_max: int,
    same_card_streak_max_seen: int,
    queue_moved: bool,
    final_notion_hold: str,
    notion_verdict_final: str,
    audit_skipped: bool,
    audit_ok: Any,
    final_autonomy_status: str,
    tier_id: str | None = None,
) -> dict[str, Any]:
    """3時間 PASS 相当: 満タン走破 + 再試験コア5軸（queue 前進・same-card・hold 空・audit・autonomy）。notion_cycle_verdict は別枠 checks.notion_hold_clear で参照のみ。"""
    stopped_same = stopped_by == "same_card_streak"
    no_infinite_same_card = (not stopped_same) and same_card_streak_max_seen < same_max
    hold_empty = not str(final_notion_hold or "").strip()
    notion_clear = hold_empty and str(notion_verdict_final or "") == "PASS"
    audit_fine = bool(audit_skipped) or audit_ok is True
    autonomy_ok = str(final_autonomy_status or "") != "FAIL"
    completed_planned = stopped_by == "max_seconds"
    full_duration = max_sec >= int(OFFICIAL_RETEST_TIERS[-1]["max_seconds"])

    core_checks = {
        "no_same_card_infinite_loop": no_infinite_same_card,
        "queue_forward_progress_once": queue_moved,
        "hold_reason_empty": hold_empty,
        "audit_normal": audit_fine,
        "autonomy_not_fail": autonomy_ok,
    }
    retest_core_pass = all(core_checks.values())
    checks = {
        **core_checks,
        "notion_hold_clear": notion_clear,
    }
    fail_reasons = [k for k, v in core_checks.items() if not v]
    if stopped_same:
        fail_reasons.append("stopped_by_same_card_streak")

    smoke_pass = retest_core_pass and not stopped_same
    three_hour_equivalent = full_duration and completed_planned and retest_core_pass
    retest_criteria_all = retest_core_pass and notion_clear

    overall = "FAIL"
    if three_hour_equivalent:
        overall = "PASS"
    elif smoke_pass and completed_planned:
        overall = "PASS_SMOKE"
    elif smoke_pass and not completed_planned:
        overall = "INCONCLUSIVE_GUARD_STOP"
    elif retest_core_pass:
        overall = "INCONCLUSIVE"

    return {
        "overall": overall,
        "three_hour_pass_equivalent": three_hour_equivalent,
        "retest_core_pass": retest_core_pass,
        "smoke_frontier_pass": smoke_pass,
        "completed_full_planned_duration": completed_planned,
        "scheduled_max_seconds": max_sec,
        "tier_id": tier_id if tier_id is not None else _tier_id_for_seconds(max_sec),
        "fail_reasons": fail_reasons,
        "checks": checks,
        "retest_criteria_observed": {
            "description": "再試験カード記載の観測 5 条件（hold_reason 空・queue 前進・same-card・audit・autonomy）",
            "all_five": retest_core_pass,
            "all_five_plus_notion_verdict_pass": retest_criteria_all,
        },
        "pass_fail_readable": {
            "three_hour_pass_equivalent": three_hour_equivalent,
            "retest_core_pass": retest_core_pass,
            "overall": overall,
            "stopped_by": stopped_by,
        },
        "notes": "three_hour_pass_equivalent は max_seconds>=10800 かつ stopped_by=max_seconds かつ retest_core_pass（5軸）のとき True。notion last_cycle_verdict は checks.notion_hold_clear で追跡。10/30/3h は official_retest_procedure.steps を参照。",
    }


def add_parent_loop_args(ap: argparse.ArgumentParser, default_max_seconds: int) -> None:
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument(
        "--max-seconds",
        type=int,
        default=default_max_seconds,
        help=f"既定 {default_max_seconds} 秒",
    )
    ap.add_argument("--dirty-threshold", type=int, default=0, help="0 なら stop_conditions の dirty_cumulative_abort_threshold")
    ap.add_argument("--empty-queue-streak-max", type=int, default=6)
    ap.add_argument("--same-card-streak-max", type=int, default=3)
    ap.add_argument("--sleep-seconds", type=int, default=30)
    ap.add_argument(
        "--supervisor-timeout-seconds",
        type=int,
        default=7200,
        help="1 cycle の supervisor 子プロセス上限",
    )
    ap.add_argument("--notion-watch-timeout-seconds", type=int, default=600)


def run_guarded_parent_loop(
    args: argparse.Namespace,
    *,
    card: str,
    report_schema: str,
    report_path: Path,
    prerequisite_note: str = "",
    extra_official_tiers: tuple[dict[str, Any], ...] = (),
    report_output_basename: str | None = None,
    extra_report_fields: dict[str, Any] | None = None,
) -> int:
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO
    repo_root = _repo_root(auto_dir)
    max_sec = max(1, int(args.max_seconds))
    sleep_sec = max(0, int(args.sleep_seconds))
    empty_max = max(1, int(args.empty_queue_streak_max))
    same_max = max(1, int(args.same_card_streak_max))
    dirty_thr = _load_dirty_threshold(auto_dir, int(args.dirty_threshold) if args.dirty_threshold else None)

    end_ts = time.time() + max_sec
    started_at = _utc_iso()
    cycle_idx = 0
    prev_last_card = ""
    same_card_streak = 0
    empty_after_cycle = 0
    stopped_by = ""
    last_card = ""
    final_queue_len = 0
    final_autonomy_status = ""
    final_notion_hold = ""

    distinct_cards: set[str] = set()
    intake_pass_count = 0
    queue_refill_count = 0
    supervisor_pass_count = 0
    same_card_streak_max_seen = 0
    queue_moved = False
    last_card_snapshot_end_prev_cycle = ""
    prev_notion_enqueued = ""

    tiers_list = [dict(x) for x in OFFICIAL_RETEST_TIERS]
    if extra_official_tiers:
        tiers_list.extend(dict(x) for x in extra_official_tiers)
    proc_desc = "段階運転: 10分 → 30分 → 3時間。各段階で本 report を保存し frontier を確認する。"
    if prerequisite_note:
        proc_desc += " " + prerequisite_note

    tier_ids_in_steps: set[str] = {str(t["id"]) for t in OFFICIAL_RETEST_TIERS}
    retest_steps: list[dict[str, Any]] = [
        {
            "order": i + 1,
            "tier_id": t["id"],
            "label": t["label"],
            "max_seconds": int(t["max_seconds"]),
            "suggested_command": (
                "python3 api/automation/real_3h_autobuild_parent_guarded_loop_v1.py "
                f"--auto-dir {auto_dir} --max-seconds {int(t['max_seconds'])}"
            ),
        }
        for i, t in enumerate(OFFICIAL_RETEST_TIERS)
    ]
    for t in tiers_list:
        tid = str(t.get("id") or "")
        if not tid or tid in tier_ids_in_steps:
            continue
        tier_ids_in_steps.add(tid)
        max_s = int(t.get("max_seconds") or 0)
        script = (
            "real_8h_autobuild_parent_guarded_loop_v1.py"
            if tid == "8h_extended"
            else "real_3h_autobuild_parent_guarded_loop_v1.py"
        )
        retest_steps.append(
            {
                "order": len(retest_steps) + 1,
                "tier_id": tid,
                "label": str(t.get("label") or tid),
                "max_seconds": max_s,
                "suggested_command": (
                    f"python3 api/automation/{script} --auto-dir {auto_dir} --max-seconds {max_s}"
                ),
            }
        )

    scheduled_tier_id = _tier_id_for_seconds(max_sec, extra_tiers=extra_official_tiers)

    official_retest_procedure: dict[str, Any] = {
        "description": proc_desc,
        "tiers": tiers_list,
        "retest_spec_card": RETEST_CARD,
        "report_filename": report_output_basename or REPORT_FN,
        "steps": retest_steps,
    }

    last_cycle_detail: dict[str, Any] = {}
    base_report: dict[str, Any] = {
        "schema": report_schema,
        "card": card,
        "official_retest_procedure": official_retest_procedure,
        "scheduled_max_seconds": max_sec,
        "started_at": started_at,
        "finished_at": "",
        "total_cycles": 0,
        "last_card": "",
        "same_card_streak": 0,
        "distinct_cards_seen": [],
        "queue_moved": False,
        "intake_pass_count": 0,
        "queue_refill_count": 0,
        "supervisor_pass_count": 0,
        "same_card_streak_max_seen": 0,
        "final_queue_len": 0,
        "final_autonomy_status": "",
        "final_notion_hold_reason": "",
        "final_frontier_state": {},
        "retest_verdict": {},
        "stopped_by": "",
        "last_cycle": {},
    }
    if prerequisite_note:
        base_report["prerequisite_note"] = prerequisite_note
    _write_json(report_path, base_report)

    print(f"{_utc_iso()} {card} start max_seconds={max_sec} auto_dir={auto_dir}", flush=True)

    while time.time() < end_ts and not stopped_by:
        cycle_idx += 1
        t_rem = int(end_ts - time.time())
        q_before = _read_json(auto_dir / QUEUE_FN)
        queue_empty = tuning_mod.card_order_is_empty(q_before)
        qlen = _queue_len(q_before)
        head_b = _queue_head(q_before)
        hist_len_b = _execution_history_len(auto_dir)
        q_snap_before = _queue_card_order_snapshot(q_before)

        notion_stdout = ""
        notion_rc: int | None = None
        sup_rc: int | None = None
        sup_exc = ""
        hold_reason = ""
        last_result = ""

        if queue_empty:
            try:
                wp = subprocess.run(
                    [
                        sys.executable,
                        str(auto_dir / WATCH_SCRIPT),
                        "--auto-dir",
                        str(auto_dir),
                    ],
                    cwd=str(repo_root),
                    capture_output=True,
                    text=True,
                    timeout=max(1, int(args.notion_watch_timeout_seconds)),
                    check=False,
                )
                notion_rc = wp.returncode
                notion_stdout = (wp.stdout or "").strip()[:8000]
                if wp.stderr:
                    notion_stdout += ("\n[stderr]\n" + wp.stderr.strip())[:4000]
            except subprocess.TimeoutExpired:
                notion_rc = -1
                sup_exc = "notion_watch_timeout"
                stopped_by = "notion_watch_exception"
            except Exception as e:
                notion_rc = -1
                sup_exc = str(e)
                stopped_by = "notion_watch_exception"
        else:
            notion_stdout = "(skipped_queue_nonempty)"

        if queue_empty and notion_rc == 0:
            intake_pass_count += 1
            q_mid = _read_json(auto_dir / QUEUE_FN)
            if not tuning_mod.card_order_is_empty(q_mid):
                queue_refill_count += 1

        nprog = _read_json(auto_dir / NOTION_PROGRESS_FN)
        hold_reason = str(nprog.get("last_hold_reason") or "").strip()
        nver = str(nprog.get("last_cycle_verdict") or "")
        final_notion_hold = hold_reason

        if not stopped_by and hold_reason and nver != "PASS":
            stopped_by = "notion_hold"

        head = _git_head(repo_root)
        if head:
            os.environ["TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD"] = head

        if not stopped_by:
            try:
                sp = subprocess.run(
                    [
                        sys.executable,
                        str(auto_dir / SUPERVISOR_SCRIPT),
                        "--auto-dir",
                        str(auto_dir),
                        "--skip-preflight",
                        "--bypass-dryrun-gate",
                        "--max-loops",
                        "1",
                    ],
                    cwd=str(repo_root),
                    capture_output=True,
                    text=True,
                    timeout=max(1, int(args.supervisor_timeout_seconds)),
                    check=False,
                )
                sup_rc = sp.returncode
            except subprocess.TimeoutExpired:
                sup_rc = -1
                stopped_by = "supervisor_timeout"
            except Exception as e:
                sup_rc = -1
                sup_exc = sup_exc or str(e)
                stopped_by = "supervisor_exception"

        rt = _read_json(auto_dir / RUNTIME_FN)
        prog = _read_json(auto_dir / PROGRESS_FN)
        final_autonomy_status = str(rt.get("status") or "")
        last_result = str(prog.get("last_result") or rt.get("last_result") or "")
        last_card = str(prog.get("last_card") or "").strip()
        lr_lower = last_result.lower()
        queue_exhausted_cycle = "queue_exhausted" in lr_lower
        au = prog.get("audit_status") if isinstance(prog.get("audit_status"), dict) else {}
        audit_ok = au.get("ok")
        audit_skipped = bool(au.get("skipped"))
        dirty_n = int(prog.get("dirty_files_count") or -1)

        q_after = _read_json(auto_dir / QUEUE_FN)
        final_queue_len = _queue_len(q_after)
        head_a = _queue_head(q_after)
        hist_len_a = _execution_history_len(auto_dir)
        q_snap_after = _queue_card_order_snapshot(q_after)
        enq_card = _parse_watch_enqueued(notion_stdout)

        forward_reasons: list[str] = []
        if qlen != final_queue_len:
            forward_reasons.append("queue_length_changed")
        if head_b != head_a:
            forward_reasons.append("queue_head_changed")
        if last_card and last_card != last_card_snapshot_end_prev_cycle and sup_rc is not None and sup_rc == 0:
            forward_reasons.append("last_card_changed_vs_prev_cycle_end")
        if hist_len_a > hist_len_b:
            forward_reasons.append("execution_history_appended")
        if queue_empty and notion_rc == 0 and enq_card:
            if enq_card != prev_notion_enqueued:
                forward_reasons.append("notion_enqueue_card_vs_prev_cycle")
            prev_notion_enqueued = enq_card

        cycle_forward = bool(forward_reasons)
        if cycle_forward:
            queue_moved = True

        for x in (head_b, head_a, enq_card, last_card):
            if isinstance(x, str) and x.strip():
                distinct_cards.add(x.strip())
        if hist_len_a > hist_len_b:
            hc = _execution_history_last_card_id(auto_dir)
            if hc:
                distinct_cards.add(hc)

        if tuning_mod.card_order_is_empty(q_after):
            empty_after_cycle += 1
        else:
            empty_after_cycle = 0

        if not stopped_by:
            if final_autonomy_status == "FAIL":
                stopped_by = "autonomy_fail"
            elif not audit_skipped and audit_ok is not True:
                stopped_by = "audit_abnormal"
            elif dirty_n >= dirty_thr:
                stopped_by = "dirty_threshold"
            elif empty_after_cycle >= empty_max:
                stopped_by = "empty_queue_streak"
            elif sup_rc is not None and sup_rc != 0:
                stopped_by = "supervisor_nonzero_exit"

        # queue_exhausted / PASS_queue_exhausted では last_card が据え置きになり得るため、
        # 本当に前進が無い同一カード連続のみ streak を進める。
        if queue_exhausted_cycle:
            same_card_streak = 0
            prev_last_card = last_card or prev_last_card
        elif last_card:
            if cycle_forward:
                same_card_streak = 1
                prev_last_card = last_card
            elif last_card == prev_last_card and prev_last_card:
                same_card_streak += 1
                prev_last_card = last_card
            else:
                same_card_streak = 1
                prev_last_card = last_card
        else:
            same_card_streak = 0
            prev_last_card = ""
        if last_card:
            last_card_snapshot_end_prev_cycle = last_card
        if not stopped_by and same_card_streak >= same_max:
            stopped_by = "same_card_streak"

        if sup_rc is not None and sup_rc == 0:
            supervisor_pass_count += 1
        same_card_streak_max_seen = max(same_card_streak_max_seen, same_card_streak)

        print(
            json.dumps(
                {
                    "cycle": cycle_idx,
                    "time_remaining_s": t_rem,
                    "queue_len_before": qlen,
                    "queue_empty_ran_notion": queue_empty,
                    "notion_rc": notion_rc,
                    "supervisor_rc": sup_rc,
                    "last_card": last_card,
                    "last_result": last_result,
                    "hold_reason": hold_reason,
                    "notion_verdict": nver,
                    "same_card_streak": same_card_streak,
                    "empty_queue_streak": empty_after_cycle,
                    "autonomy_status": final_autonomy_status,
                    "dirty_files_count": dirty_n,
                    "stopped_by": stopped_by or None,
                },
                ensure_ascii=False,
            ),
            flush=True,
        )

        last_cycle_detail = {
            "cycle": cycle_idx,
            "queue_len_before_intake": qlen,
            "queue_before": q_snap_before,
            "queue_after": q_snap_after,
            "queue_head_before": head_b,
            "queue_head_after": head_a,
            "execution_history_len_before": hist_len_b,
            "execution_history_len_after": hist_len_a,
            "forward_progress_detected_by": forward_reasons,
            "notion_enqueued_card": enq_card,
            "notion_watch_rc": notion_rc,
            "notion_watch_stdout_tail": notion_stdout[-4000:] if notion_stdout else "",
            "supervisor_rc": sup_rc,
            "supervisor_exception": sup_exc,
            "last_card": last_card,
            "last_result": last_result,
            "hold_reason": hold_reason,
            "same_card_streak": same_card_streak,
            "empty_queue_streak": empty_after_cycle,
        }
        ffs_cycle = _final_frontier_snapshot(auto_dir)
        rv_cycle = _compute_retest_verdict(
            max_sec=max_sec,
            stopped_by="",
            same_max=same_max,
            same_card_streak_max_seen=same_card_streak_max_seen,
            queue_moved=queue_moved,
            final_notion_hold=str(ffs_cycle.get("notion_last_hold_reason") or ""),
            notion_verdict_final=str(ffs_cycle.get("notion_last_cycle_verdict") or ""),
            audit_skipped=bool(ffs_cycle.get("audit_skipped")),
            audit_ok=ffs_cycle.get("audit_ok"),
            final_autonomy_status=str(ffs_cycle.get("multi_ai_autonomy_status") or ""),
            tier_id=scheduled_tier_id,
        )
        rep = dict(base_report)
        rep.update(
            {
                "scheduled_max_seconds": max_sec,
                "total_cycles": cycle_idx,
                "last_card": last_card,
                "same_card_streak": same_card_streak,
                "distinct_cards_seen": sorted(distinct_cards),
                "queue_moved": queue_moved,
                "intake_pass_count": intake_pass_count,
                "queue_refill_count": queue_refill_count,
                "supervisor_pass_count": supervisor_pass_count,
                "same_card_streak_max_seen": same_card_streak_max_seen,
                "final_queue_len": final_queue_len,
                "final_autonomy_status": final_autonomy_status,
                "final_notion_hold_reason": final_notion_hold,
                "final_frontier_state": ffs_cycle,
                "retest_verdict": rv_cycle,
                "stopped_by": stopped_by,
                "last_cycle": last_cycle_detail,
            }
        )
        _write_json(report_path, rep)

        if stopped_by:
            break

        if time.time() >= end_ts:
            stopped_by = "max_seconds"
            break

        if sleep_sec:
            time.sleep(sleep_sec)

    if not stopped_by:
        stopped_by = "max_seconds"

    finished_at = _utc_iso()
    final_frontier_state = _final_frontier_snapshot(auto_dir)
    notion_hold_end = str(final_frontier_state.get("notion_last_hold_reason") or "")
    notion_verdict_end = str(final_frontier_state.get("notion_last_cycle_verdict") or "")

    retest_verdict = _compute_retest_verdict(
        max_sec=max_sec,
        stopped_by=stopped_by,
        same_max=same_max,
        same_card_streak_max_seen=same_card_streak_max_seen,
        queue_moved=queue_moved,
        final_notion_hold=notion_hold_end,
        notion_verdict_final=notion_verdict_end,
        audit_skipped=bool(final_frontier_state.get("audit_skipped")),
        audit_ok=final_frontier_state.get("audit_ok"),
        final_autonomy_status=str(final_frontier_state.get("multi_ai_autonomy_status") or ""),
        tier_id=scheduled_tier_id,
    )

    final: dict[str, Any] = {
        "schema": report_schema,
        "card": card,
        "official_retest_procedure": official_retest_procedure,
        "scheduled_max_seconds": max_sec,
        "started_at": started_at,
        "finished_at": finished_at,
        "total_cycles": cycle_idx,
        "last_card": last_card,
        "same_card_streak": same_card_streak,
        "distinct_cards_seen": sorted(distinct_cards),
        "queue_moved": queue_moved,
        "intake_pass_count": intake_pass_count,
        "queue_refill_count": queue_refill_count,
        "supervisor_pass_count": supervisor_pass_count,
        "same_card_streak_max_seen": same_card_streak_max_seen,
        "final_queue_len": final_queue_len,
        "final_autonomy_status": str(final_frontier_state.get("multi_ai_autonomy_status") or ""),
        "final_notion_hold_reason": notion_hold_end,
        "final_frontier_state": final_frontier_state,
        "retest_verdict": retest_verdict,
        "stopped_by": stopped_by,
        "last_cycle": last_cycle_detail,
    }
    if prerequisite_note:
        final["prerequisite_note"] = prerequisite_note
        final["report_summary"] = {
            "total_cycles": cycle_idx,
            "distinct_cards_seen": sorted(distinct_cards),
            "queue_refill_count": queue_refill_count,
            "supervisor_pass_count": supervisor_pass_count,
            "stopped_by": stopped_by,
            "final_queue_len": _queue_len(_read_json(auto_dir / QUEUE_FN)),
            "final_autonomy_status": str(final_frontier_state.get("multi_ai_autonomy_status") or ""),
            "final_notion_hold_reason": notion_hold_end,
        }
    if extra_report_fields:
        final.update(extra_report_fields)
    _write_json(report_path, final)

    print(
        json.dumps({"summary": final, "retest_verdict": retest_verdict}, ensure_ascii=False),
        flush=True,
    )
    return 0 if stopped_by == "max_seconds" else 2


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    add_parent_loop_args(ap, 10800)
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO
    sys.exit(
        run_guarded_parent_loop(
            args,
            card=CARD,
            report_schema="TENMON_REAL_3H_AUTOBUILD_PARENT_GUARDED_LOOP_REPORT_V1",
            report_path=auto_dir / REPORT_FN,
        )
    )


if __name__ == "__main__":
    main()
