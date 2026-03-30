#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH_CARD_LOOP_ORCHESTRATOR_CURSOR_AUTO_V1

1 cycle = 1 card（生成または実行のどちらか一方のみ）。

- card_order が空 → generation のみ（supervisor は呼ばない）
- card_order が非空 → execution のみ（supervisor が未完なら 1 loop）。枯渇時はアイドルで次周期へ（生成しない）

fail-closed: HOLD/FAIL で停止し evidence を progress に記録。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import infinite_growth_card_generator_v1 as gen_mod
import infinite_growth_gap_judge_v1 as gap_mod
import infinite_growth_learning_ledger_v1 as ledger_mod
import infinite_growth_queue_manager_v1 as qm_mod
import infinite_growth_runtime_tuning_v1 as tuning_mod
import infinite_growth_schedule_reader_v1 as sched_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod
import schedule_state_observer_v1 as obs_mod

CARD = "TENMON_INFINITE_GROWTH_CARD_LOOP_ORCHESTRATOR_CURSOR_AUTO_V1"

RUNTIME_FN = "infinite_growth_runtime_state.json"
PROGRESS_FN = "infinite_growth_progress_report.json"
GEN_HIST_FN = "infinite_growth_generation_history.json"
STOP_FN = "infinite_growth_stop_conditions_v1.json"
MULTI_RUNTIME_FN = "multi_ai_autonomy_runtime_state.json"
MULTI_PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
LAST_GEN_MD = "infinite_growth_last_generated_card.md"
LAST_GEN_JSON = "infinite_growth_last_generated_card.json"
SUPERVISOR_SCRIPT = "multi_ai_autonomy_supervisor_v1.py"


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


def _load_stop(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / STOP_FN)


def _load_gen_history(auto_dir: Path) -> dict[str, Any]:
    d = _read_json(auto_dir / GEN_HIST_FN)
    d.setdefault("schema", "INFINITE_GROWTH_GENERATION_HISTORY_V1")
    d.setdefault("entries", [])
    return d


def _append_gen_history(auto_dir: Path, entry: dict[str, Any]) -> None:
    gh = _load_gen_history(auto_dir)
    ent = gh.get("entries")
    if not isinstance(ent, list):
        ent = []
    ent.append({"at": _utc_iso(), **entry})
    gh["entries"] = ent[-2000:]
    _write_json(auto_dir / GEN_HIST_FN, gh)


def _write_ig_runtime(
    auto_dir: Path,
    *,
    status: str,
    current_phase: str,
    current_card: str,
    last_generated: str,
    last_executed: str,
    last_verdict: str,
    last_hold_reason: str,
    evidence_dir: str,
    cycle_count: int,
) -> None:
    rt = _read_json(auto_dir / RUNTIME_FN)
    rt["schema"] = "INFINITE_GROWTH_RUNTIME_STATE_V1"
    rt["status"] = status
    rt["current_phase"] = current_phase
    rt["current_card"] = current_card
    rt["last_generated_card"] = last_generated
    rt["last_executed_card"] = last_executed
    rt["last_verdict"] = last_verdict
    rt["last_hold_reason"] = last_hold_reason
    rt["last_evidence_dir"] = evidence_dir
    rt["cycle_count"] = cycle_count
    rt["updated_at"] = _utc_iso()
    _write_json(auto_dir / RUNTIME_FN, rt)


def _update_ig_progress(
    auto_dir: Path,
    *,
    verdict: str,
    hold_reason: str,
    frontier: str,
    issue_sig: str,
    sup_log: str | None,
    last_executed_card: str | None = None,
) -> None:
    pr = _read_json(auto_dir / PROGRESS_FN)
    pr["schema"] = "INFINITE_GROWTH_PROGRESS_REPORT_V1"
    pr["updated_at"] = _utc_iso()
    pr["last_cycle_verdict"] = verdict
    pr["frontier_card"] = frontier
    pr["last_issue_signature"] = issue_sig
    if sup_log:
        pr["supervisor_log_dir"] = sup_log
    if last_executed_card is not None:
        pr["last_executed_card"] = last_executed_card

    prev_hr = str(pr.get("consecutive_hold_reason") or "")
    hr = hold_reason or ""
    if verdict in ("HOLD", "FAIL") and hr:
        if hr == prev_hr:
            pr["consecutive_hold_reason_count"] = int(pr.get("consecutive_hold_reason_count") or 0) + 1
        else:
            pr["consecutive_hold_reason"] = hr
            pr["consecutive_hold_reason_count"] = 1
    else:
        pr["consecutive_hold_reason"] = ""
        pr["consecutive_hold_reason_count"] = 0

    pr.setdefault("consecutive_same_card_hold_count", 0)
    _write_json(auto_dir / PROGRESS_FN, pr)


def _observe_bundle(
    *,
    auto_dir: Path,
    repo: Path,
    api_dir: Path,
    base_url: str | None,
    skip_npm: bool,
) -> dict[str, Any]:
    obs = obs_mod.observe(
        repo=repo,
        api_dir=api_dir,
        auto_dir=auto_dir,
        base_url=base_url,
        config={},
        run_build_check=not skip_npm,
    )
    q = qm_mod.load_queue(auto_dir)
    pending, qmeta = qm_mod.execution_work_pending(auto_dir)
    ledger = ledger_mod.load_ledger(auto_dir)
    multi_rt = _read_json(auto_dir / MULTI_RUNTIME_FN)
    multi_pr = _read_json(auto_dir / MULTI_PROGRESS_FN)
    gen_hist = _load_gen_history(auto_dir)
    q0 = qm_mod.load_queue(auto_dir)
    return {
        "observer": obs,
        "queue_pending": pending,
        "queue_order_empty": tuning_mod.card_order_is_empty(q0),
        "queue_meta": qmeta,
        "multi_ai_runtime": multi_rt,
        "multi_ai_progress": multi_pr,
        "learning_ledger_tail": ledger_mod.entries_list(ledger)[-12:],
        "generation_history_tail": (gen_hist.get("entries") or [])[-8:] if isinstance(gen_hist.get("entries"), list) else [],
        "raw_queue_require_tier": q.get("require_tier"),
    }


def _bundle_summary(bundle: dict[str, Any]) -> str:
    try:
        return json.dumps(bundle, ensure_ascii=False, indent=2)[:16000]
    except Exception:
        return str(bundle)[:8000]


def _multi_ai_verdict(auto_dir: Path) -> tuple[str, str, str, str | None]:
    rt = _read_json(auto_dir / MULTI_RUNTIME_FN)
    st = str(rt.get("status") or "")
    lr = str(rt.get("last_result") or "")
    hr = str(rt.get("last_hold_reason") or rt.get("last_failure_bundle") or "")
    ev = str(rt.get("last_evidence_dir") or "")
    if lr == "PASS_queue_exhausted":
        return "QUEUE_DRAINED", "ok", "", ev or None
    if st == "PASS" and "PASS" in lr.upper():
        return "PASS", lr, "", ev or None
    if st == "HOLD":
        return "HOLD", lr, hr or str(_read_json(auto_dir / MULTI_PROGRESS_FN).get("hold_reason") or ""), ev or None
    if st == "FAIL":
        return "FAIL", lr, hr or str(_read_json(auto_dir / MULTI_PROGRESS_FN).get("hold_reason") or ""), ev or None
    return "UNKNOWN", lr, hr, ev or None


def _stop_hit(
    *,
    auto_dir: Path,
    bundle: dict[str, Any],
    stop: dict[str, Any],
    ig_progress: dict[str, Any],
) -> tuple[bool, str]:
    obs = bundle.get("observer") if isinstance(bundle.get("observer"), dict) else {}
    dirty = int(obs.get("dirty_files_count") or -1)
    lim = int(stop.get("abort_on_repo_dirty_over") or 99999)
    if dirty >= lim >= 0:
        return True, "repo_dirty_over"

    au = obs.get("audit_status") if isinstance(obs.get("audit_status"), dict) else {}
    if stop.get("abort_on_audit_fail") and not au.get("skipped") and au.get("ok") is False:
        return True, "audit_failed"

    ch = int(ig_progress.get("consecutive_hold_reason_count") or 0)
    mx = int(stop.get("consecutive_same_hold_reason_max") or 99)
    if ch >= mx >= 1:
        return True, "repeated_hold_reason"

    cch = int(ig_progress.get("consecutive_same_card_hold_count") or 0)
    cmx = int(stop.get("consecutive_same_card_hold_max") or 99)
    if cch >= cmx >= 1:
        return True, "repeated_same_card"

    return False, ""


def _recent_sig_suppressed(entries: list[dict[str, Any]], sig: str, n: int = 3) -> bool:
    if not sig:
        return False
    tail = [e for e in entries[-n:] if str(e.get("event") or "") == "enqueued"]
    return len(tail) >= n and all(str(e.get("issue_signature") or "") == sig for e in tail)


def run_cycle(
    *,
    auto_dir: Path,
    base_url: str | None,
    skip_npm: bool,
    dry_run: bool,
    run_supervisor: bool,
    orchestra_dry_run: bool,
    cursor_dry_run: bool,
    bypass_dryrun_gate: bool,
    skip_preflight: bool,
    cycle_index: int,
) -> tuple[int, str]:
    repo = _repo_root(auto_dir)
    api_dir = repo / "api"
    stop = _load_stop(auto_dir)
    ig_pr = _read_json(auto_dir / PROGRESS_FN)

    bundle = _observe_bundle(auto_dir=auto_dir, repo=repo, api_dir=api_dir, base_url=base_url, skip_npm=skip_npm)
    hit, why = _stop_hit(auto_dir=auto_dir, bundle=bundle, stop=stop, ig_progress=ig_pr)
    if hit:
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="stop_conditions",
            current_card="",
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=why,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "stop",
                "card_id": "",
                "issue_signature": "",
                "verdict": "HOLD",
                "hold_reason": why,
                "fix_type": "orchestrator_gate",
            },
        )
        return 2, why

    q_now = qm_mod.load_queue(auto_dir)
    order_empty = tuning_mod.card_order_is_empty(q_now)
    pending, qmeta = qm_mod.execution_work_pending(auto_dir)
    elig = qmeta.get("eligible") if isinstance(qmeta.get("eligible"), list) else []
    qc = int(qmeta.get("queue_cursor") or 0)
    eligible_len = len(elig)
    # eligible 空 = tier 不一致等で frontier 不在。pending = カーソルが eligible 内。
    pending_execution = bool(eligible_len and qc < eligible_len)
    # カーソル枯渇だが eligible があり run_supervisor なら、supervisor を起動して PASS_queue_exhausted 等を確定させる
    supervisor_bind_exhausted = bool(run_supervisor and eligible_len > 0 and qc >= eligible_len)
    supervisor_lane = pending_execution or supervisor_bind_exhausted

    if not order_empty and not supervisor_lane:
        _write_ig_runtime(
            auto_dir,
            status="IDLE",
            current_phase="queue_nonempty_execution_idle",
            current_card="",
            last_generated="",
            last_executed="",
            last_verdict="SKIPPED",
            last_hold_reason="",
            evidence_dir="",
            cycle_count=cycle_index,
        )
        return 0, "queue_nonempty_no_pending_execution"

    if not order_empty and supervisor_lane:
        if dry_run and not run_supervisor:
            _write_ig_runtime(
                auto_dir,
                status="IDLE",
                current_phase="dry_run_skip_supervisor",
                current_card="",
                last_generated="",
                last_executed="",
                last_verdict="SKIPPED",
                last_hold_reason="dry_run_queue_non_empty",
                evidence_dir="",
                cycle_count=cycle_index,
            )
            return 0, "dry_run_queue_non_empty_no_supervisor"

        sup = auto_dir / SUPERVISOR_SCRIPT
        if not sup.is_file():
            _write_ig_runtime(
                auto_dir,
                status="HOLD",
                current_phase="missing_supervisor",
                current_card="",
                last_generated="",
                last_executed="",
                last_verdict="HOLD",
                last_hold_reason="runtime_contract_missing",
                evidence_dir="",
                cycle_count=cycle_index,
            )
            return 2, "missing_supervisor"

        cmd = [
            sys.executable,
            str(sup),
            "--auto-dir",
            str(auto_dir),
            "--max-loops",
            "1",
        ]
        if base_url:
            cmd.extend(["--api-base-url", base_url])
        if skip_npm:
            cmd.append("--skip-npm")
        if not orchestra_dry_run:
            cmd.append("--orchestra-no-dry-run")
        if cursor_dry_run:
            cmd.append("--cursor-dry-run")
        if bypass_dryrun_gate:
            cmd.append("--bypass-dryrun-gate")
        if skip_preflight:
            cmd.append("--skip-preflight")

        subprocess.run(cmd, cwd=str(repo), timeout=3600)

        v, lr, hr, ev = _multi_ai_verdict(auto_dir)
        current_card = str(elig[qc]) if qc < len(elig) else ""

        multi_pr = _read_json(auto_dir / MULTI_PROGRESS_FN)
        sup_log = str(multi_pr.get("supervisor_log_dir") or "")
        last_ex = current_card or str(multi_pr.get("last_card") or "")

        _update_ig_progress(
            auto_dir,
            verdict=v,
            hold_reason=hr,
            frontier=last_ex,
            issue_sig="",
            sup_log=sup_log or None,
            last_executed_card=last_ex,
        )

        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "executed",
                "card_id": last_ex,
                "issue_signature": "",
                "verdict": v,
                "hold_reason": hr,
                "acceptance_outcome": lr,
                "fix_type": "supervisor",
            },
        )

        _append_gen_history(
            auto_dir,
            {
                "event": "executed",
                "card_id": last_ex,
                "verdict": v,
                "hold_reason": hr,
            },
        )

        if v == "HOLD" and last_ex:
            led2 = ledger_mod.load_ledger(auto_dir)
            sc = ledger_mod.recent_same_card_hold_count(led2, last_ex)
            pr2 = _read_json(auto_dir / PROGRESS_FN)
            pr2["consecutive_same_card_hold_count"] = sc
            pr2["last_hold_card_id"] = last_ex
            _write_json(auto_dir / PROGRESS_FN, pr2)
            scm = int(stop.get("consecutive_same_card_hold_max") or 99)
            if sc >= scm >= 1:
                _write_ig_runtime(
                    auto_dir,
                    status="HOLD",
                    current_phase="stop_same_card",
                    current_card=last_ex,
                    last_generated="",
                    last_executed=last_ex,
                    last_verdict="HOLD",
                    last_hold_reason="repeated_same_card",
                    evidence_dir=ev or "",
                    cycle_count=cycle_index,
                )
                return 2, "repeated_same_card"
        else:
            pr2 = _read_json(auto_dir / PROGRESS_FN)
            pr2["consecutive_same_card_hold_count"] = 0
            _write_json(auto_dir / PROGRESS_FN, pr2)

        sup_phase = "supervisor_queue_exhausted" if v == "QUEUE_DRAINED" else "supervisor"
        _write_ig_runtime(
            auto_dir,
            status=v if v in ("PASS", "FAIL", "HOLD", "QUEUE_DRAINED") else "HOLD",
            current_phase=sup_phase,
            current_card=last_ex or current_card,
            last_generated="",
            last_executed=last_ex,
            last_verdict=v,
            last_hold_reason=hr,
            evidence_dir=ev or "",
            cycle_count=cycle_index,
        )

        if v == "HOLD":
            return 2, "queue_nonempty_supervisor_hold"
        if v == "FAIL":
            return 2, "queue_nonempty_supervisor_fail"
        if v == "UNKNOWN":
            return 2, "queue_nonempty_supervisor_fail"
        return 0, "queue_nonempty_supervisor_executed"

    # --- generation lane（card_order が空のときのみ） ---
    schedule = sched_mod.load_schedule(auto_dir)
    q = qm_mod.load_queue(auto_dir)
    require_tier = str(q.get("require_tier") or "A_full_auto_safe")
    ledger = ledger_mod.load_ledger(auto_dir)
    pass_cards = ledger_mod.passed_card_ids_from_ledger(ledger)
    gh_entries = _load_gen_history(auto_dir).get("entries")
    gh_list = gh_entries if isinstance(gh_entries, list) else []

    row, why = gap_mod.pick_next_row(
        auto_dir=auto_dir,
        schedule=schedule,
        require_tier=require_tier,
        ledger_pass_cards=pass_cards,
        dry_run=dry_run,
        generation_history_entries=[x for x in gh_list if isinstance(x, dict)],
    )
    if row is None:
        code = str(why or "empty_queue_no_generatable_next")
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="gap_judge",
            current_card="",
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=code,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        _update_ig_progress(
            auto_dir,
            verdict="HOLD",
            hold_reason=code,
            frontier="",
            issue_sig="",
            sup_log=None,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "gap",
                "card_id": "",
                "issue_signature": "",
                "verdict": "HOLD",
                "hold_reason": code,
                "fix_type": "gap_judge",
            },
        )
        return 2, code

    sig = str(row.get("issue_signature") or "")
    cid = str(row.get("card_id") or "")

    if not tuning_mod.acceptance_defined_for_row(row):
        hr = "acceptance_undefined"
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="acceptance_gate",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "generator",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
            },
        )
        return 2, hr

    if tuning_mod.is_broad_scope_card_id(cid):
        hr = "broad_card_forbidden"
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="broad_scope_gate",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "generator",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
            },
        )
        return 2, hr

    lb, lbw = ledger_mod.ledger_blocks_repeat_failure(ledger, issue_signature=sig)
    if lb:
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="ledger_suppress",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=lbw,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "suppressed",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": lbw,
                "redundant_generation_avoided": True,
            },
        )
        return 2, lbw

    allow, deny = preflight_mod.load_allowlist_denylist(auto_dir)
    ok_p, p_why = preflight_mod.is_autonomy_card_permitted(cid, allow, deny)
    if not ok_p:
        hr = f"queue_not_allowlisted:{p_why}"
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="allowlist",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "allowlist",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
            },
        )
        return 2, hr

    proxy = str(stop.get("dry_run_enqueue_safe_proxy_card") or "").strip()
    enqueue_id = cid
    if dry_run and proxy.startswith("TENMON_"):
        enqueue_id = proxy

    if tuning_mod.consecutive_enqueues_same_card_without_executed(gh_list, enqueue_id):
        hr = "same_card_consecutive_enqueue_forbidden"
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="same_card_enqueue_gate",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "suppressed",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
                "redundant_generation_avoided": True,
            },
        )
        return 2, hr

    if _recent_sig_suppressed(gh_list, sig, n=3):
        hr = "repeated_generation_signature"
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="generation_suppressed",
            current_card="",
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "suppressed",
                "card_id": str(row.get("card_id") or ""),
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
                "redundant_generation_avoided": True,
            },
        )
        return 2, hr

    obs_txt = _bundle_summary(bundle)
    md = gen_mod.build_cursor_card_markdown(
        row=row,
        observation_summary=obs_txt,
        next_card_on_pass=gen_mod.NEXT_CARD_ON_PASS_DEFAULT,
    )
    bad, bwhy = gen_mod.dangerous_scope_scan(
        str(row.get("acceptance") or "") + "\n" + str(row.get("card_id") or "")
    )
    if bad:
        hr = bwhy
        _write_ig_runtime(
            auto_dir,
            status="HOLD",
            current_phase="dangerous_scope",
            current_card=cid,
            last_generated="",
            last_executed="",
            last_verdict="HOLD",
            last_hold_reason=hr,
            evidence_dir="",
            cycle_count=cycle_index,
        )
        ledger_mod.append_ledger_entry(
            auto_dir,
            {
                "event": "generator",
                "card_id": cid,
                "issue_signature": sig,
                "verdict": "HOLD",
                "hold_reason": hr,
            },
        )
        return 2, hr

    issue = f"[{CARD}] schedule_card={cid} issue_signature={sig}"
    orch_ev = gen_mod.run_orchestra_stub(repo=repo, auto_dir=auto_dir, issue=issue, dry_run=True)
    stub = gen_mod.synthesize_acceptance_bundle_stub(row)

    md_path = str(auto_dir / LAST_GEN_MD)
    (auto_dir / LAST_GEN_MD).write_text(md, encoding="utf-8")
    side = gen_mod.build_card_sidecar_json(row=row, md_path=md_path, orchestra_evidence=orch_ev)
    side["acceptance_bundle_stub"] = stub.get("acceptance_bundle")
    _write_json(auto_dir / LAST_GEN_JSON, side)

    _append_gen_history(
        auto_dir,
        {
            "event": "generated",
            "card_id": cid,
            "enqueued_card_id": enqueue_id,
            "issue_signature": sig,
            "dry_run": dry_run,
        },
    )

    qm_mod.append_card_to_queue(auto_dir, enqueue_id)

    _append_gen_history(
        auto_dir,
        {
            "event": "enqueued",
            "card_id": enqueue_id,
            "issue_signature": sig,
            "dry_run": dry_run,
        },
    )

    ledger_mod.append_ledger_entry(
        auto_dir,
        {
            "event": "generated",
            "card_id": enqueue_id,
            "issue_signature": sig,
            "verdict": "ENQUEUED",
            "hold_reason": "",
            "fix_type": "enqueue",
            "redundant_generation_avoided": False,
        },
    )

    _write_ig_runtime(
        auto_dir,
        status="QUEUED",
        current_phase="generation",
        current_card=cid,
        last_generated=cid,
        last_executed="",
        last_verdict="PASS",
        last_hold_reason="",
        evidence_dir=orch_ev or "",
        cycle_count=cycle_index,
    )
    _update_ig_progress(
        auto_dir,
        verdict="PASS",
        hold_reason="",
        frontier=enqueue_id,
        issue_sig=sig,
        sup_log=None,
    )

    return 0, "generated_and_enqueued"


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--api-base-url", type=str, default=os.environ.get("TENMON_API_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument("--max-cycles", type=int, default=1)
    ap.add_argument("--dry-run", action="store_true", help="gap+生成のみ（supervisor は queue 非空時スキップ可）")
    ap.add_argument(
        "--run-supervisor",
        action="store_true",
        help="dry-run でも supervisor を許可 / queue_cursor 枯渇時も eligible ありなら supervisor を起動して状態確定",
    )
    ap.add_argument("--skip-npm", action="store_true")
    ap.add_argument("--orchestra-no-dry-run", action="store_true", help="supervisor に orchestra --no-dry-run を伝播")
    ap.add_argument("--cursor-dry-run", action="store_true")
    ap.add_argument("--bypass-dryrun-gate", action="store_true")
    ap.add_argument("--skip-preflight", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    base_url = (args.api_base_url or "").strip() or None
    max_c = max(1, int(args.max_cycles))

    last_rc = 0
    last_msg = ""
    cycle_log: list[dict[str, Any]] = []
    for i in range(max_c):
        rc, msg = run_cycle(
            auto_dir=auto_dir,
            base_url=base_url,
            skip_npm=bool(args.skip_npm),
            dry_run=bool(args.dry_run),
            run_supervisor=bool(args.run_supervisor),
            orchestra_dry_run=not bool(args.orchestra_no_dry_run),
            cursor_dry_run=bool(args.cursor_dry_run),
            bypass_dryrun_gate=bool(args.bypass_dryrun_gate),
            skip_preflight=bool(args.skip_preflight),
            cycle_index=i + 1,
        )
        last_rc = rc
        last_msg = msg
        cycle_log.append({"cycle": i + 1, "rc": rc, "message": msg})
        if rc != 0:
            break

    out: dict[str, Any] = {"ok": last_rc == 0, "rc": last_rc, "message": last_msg}
    if max_c > 1:
        out["cycles"] = cycle_log
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(last_rc)


if __name__ == "__main__":
    main()
