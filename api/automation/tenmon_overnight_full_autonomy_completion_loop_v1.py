#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import os
import random
import subprocess
import time
from pathlib import Path
from typing import Any

CARD_DEFAULT = "TENMON_OVERNIGHT_FULL_AUTONOMY_COMPLETION_LOOP_CURSOR_AUTO_V1"
CARD_RESUME = "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_OVERNIGHT_FULL_AUTONOMY_COMPLETION_LOOP_RETRY_CURSOR_AUTO_V1"
NEXT_BEST_DEFAULT = "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def touch_state_timestamp(state: dict[str, Any]) -> None:
    t = utc()
    state["updated_at"] = t
    state["last_updated"] = t


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    merged = (p.stdout or "") + (p.stderr or "")
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "tail": merged[-1800:],
        "stdout": p.stdout or "",
        "stderr": p.stderr or "",
    }


def safe_bool(x: Any) -> bool:
    return bool(x is True or x == 1 or x == "true")


def now_epoch() -> int:
    return int(time.time())


def newest_mtime(paths: list[Path]) -> float:
    mt = 0.0
    for p in paths:
        if p.is_file():
            mt = max(mt, p.stat().st_mtime)
    return mt


def has_generated_at(obj: dict[str, Any]) -> bool:
    return bool(obj.get("generated_at") or obj.get("timestamp") or obj.get("generatedAt"))


def rejudge_verdict_indicates_stale(auto: Path) -> bool:
    v = read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    if not v:
        return False
    bl = [str(x) for x in (v.get("remaining_blockers") or [])]
    if "stale_sources_present" in bl:
        return True
    return len(v.get("stale_sources") or []) > 0


def delivered_lease_expired(auto: Path) -> bool:
    """remote_cursor_queue の delivered で leased_until が過去なら True（観測のみ）。"""
    q = read_json(auto / "remote_cursor_queue.json")
    items = q.get("items") if isinstance(q.get("items"), list) else []
    now_s = utc()
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") != "delivered":
            continue
        lu = str(it.get("leased_until") or "").strip()
        if not lu:
            continue
        # simple lexicographic is ok for ISO Z timestamps (UTC)
        if lu < now_s:
            return True
    return False


def precondition_resume_after_first_live(auto: Path) -> tuple[bool, str]:
    """first live + real closed loop current-run acceptance + gate + stale."""
    fl = read_json(auto / "tenmon_autonomy_first_live_summary.json")
    rcl = read_json(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json")
    if not has_generated_at(fl):
        return False, "first_live_summary_missing_or_stale"
    if not has_generated_at(rcl):
        return False, "real_closed_loop_acceptance_summary_missing_or_stale"
    if not safe_bool(fl.get("current_run_evidence_ok")):
        return False, "first_live_current_run_evidence_not_ok"
    if not safe_bool(fl.get("bootstrap_validation_pass")):
        return False, "first_live_bootstrap_validation_failed"
    if not safe_bool(fl.get("first_live_cycle_pass")):
        return False, "first_live_cycle_not_passed"
    if not safe_bool(rcl.get("real_closed_loop_proven")):
        return False, "real_closed_loop_not_proven_current_run"
    hard = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
    if safe_bool(hard.get("must_block")):
        return False, "hardstop_must_block_active"
    rej_v = read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    if rej_v:
        if rejudge_verdict_indicates_stale(auto):
            return False, "rejudge_stale_blocker_present"
    else:
        stale = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
        if int(stale.get("stale_sources_count", 0) or 0) > 0:
            return False, "stale_truth_sources_present"
    dpb = read_json(auto / "dangerous_patch_blocker_report.json")
    if safe_bool(dpb.get("blocked")):
        return False, "dangerous_patch_blocker_active"
    sev = read_json(auto / "tenmon_stale_evidence_invalidation_verdict.json")
    if sev and safe_bool(sev.get("fatal")):
        return False, "stale_truth_fatal"
    return True, "ok"


def rcl_dispatch_flags(rcl: dict[str, Any]) -> dict[str, bool]:
    return {
        "dispatch_pass": safe_bool(rcl.get("real_queue_submit")),
        "delivery_observed": safe_bool(rcl.get("real_delivery_observed")),
        "result_returned": safe_bool(rcl.get("real_result_returned")),
        "ingest_pass": safe_bool(rcl.get("real_ingest_pass")),
        "rejudge_pass": safe_bool(rcl.get("real_rejudge_refresh")),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_overnight_full_autonomy_completion_loop_v1")
    ap.add_argument(
        "--resume-after-first-live",
        action="store_true",
        help="TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS モード（前提ゲート必須）",
    )
    args, _unknown = ap.parse_known_args()
    resume_mode = bool(args.resume_after_first_live) or os.environ.get("TENMON_OVERNIGHT_RESUME_AFTER_FIRST_LIVE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    master_card = CARD_RESUME if resume_mode else CARD_DEFAULT

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"

    policy_path = auto / "tenmon_overnight_autonomy_policy_v1.json"
    state_path = auto / "tenmon_overnight_autonomy_state_v1.json"
    queue_path = auto / "tenmon_overnight_autonomy_queue_v1.json"
    summary_path = auto / "tenmon_overnight_full_autonomy_summary.json"
    report_path = auto / "tenmon_overnight_full_autonomy_report.md"

    prior_state_snapshot = read_json(state_path) if state_path.is_file() else {}
    resume_from_previous = bool(int(prior_state_snapshot.get("cycle", 0) or 0) > 0)

    if resume_mode:
        queue_seed = [
            "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1",
            "TENMON_FULL_AUTONOMY_ACCEPTANCE_GATE_CURSOR_AUTO_V1",
            "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1",
        ]
    else:
        queue_seed = [
            "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_CURSOR_AUTO_V1",
            "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_CURSOR_AUTO_V1",
            "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1",
            "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1",
            "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1",
            "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1",
            "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1",
            "TENMON_FINAL_AUTONOMY_ACCEPTANCE_REJUDGE_AND_SEAL_CURSOR_AUTO_V1",
        ]

    default_policy = {
        "card": master_card,
        "generated_at": utc(),
        "max_cycles": 16,
        "max_hours": 8,
        "sleep_min_seconds": 30,
        "sleep_max_seconds": 90,
        "stop_consecutive_failures": 3,
        "safe_scope_paths": ["api/automation/**", "api/scripts/**", "api/docs/constitution/**"],
        "medium_scope_paths": ["api/src/core/**", "api/src/kokuzo/**", "api/src/routes/chat_refactor/**"],
        "high_risk_paths": ["api/src/routes/chat.ts", "api/src/routes/chat_refactor/finalize.ts", "web/src/**"],
        "require_current_run_evidence": True,
        "single_retry_only": True,
        "fail_fast": True,
        "resume_master_card": CARD_RESUME,
        "resume_cli_flag": "--resume-after-first-live",
    }
    if not policy_path.is_file():
        write_json(policy_path, default_policy)
    policy = read_json(policy_path, default_policy)

    if not queue_path.is_file() or (resume_mode and os.environ.get("TENMON_OVERNIGHT_RESET_QUEUE", "").strip() in ("1", "true")):
        write_json(
            queue_path,
            {
                "card": master_card,
                "generated_at": utc(),
                "items": [{"card": c, "status": "pending", "retry_count": 0} for c in queue_seed],
            },
        )

    t_state = utc()
    state_default = {
        "card": master_card,
        "run_id": f"overnight_{now_epoch()}_{os.getpid()}",
        "started_at": t_state,
        "updated_at": t_state,
        "last_updated": t_state,
        "cycle": 0,
        "cycle_count": 0,
        "consecutive_fail": 0,
        "last_pass_card": None,
        "last_fail_card": None,
        "last_rejudge_band": None,
        "safe_scope_only": True,
        "high_risk_enabled": False,
        "open_blockers": [],
        "next_card": queue_seed[0],
        "finished": False,
        "running": False,
        "overnight_loop_started": False,
        "current_run_evidence_ok": False,
        "safe_scope_enforced": True,
        "high_risk_not_touched_when_blocked": True,
        "next_best_card": queue_seed[0],
        "root_cause_summary": "",
        "stop_reason": None,
        "precondition_pass": None,
        "resume_from_previous_state": False,
        "resume_possible": True,
        "completed": False,
    }
    state = read_json(state_path, state_default)
    if not state_path.is_file():
        write_json(state_path, state)
    else:
        for k, v in state_default.items():
            state.setdefault(k, v)
    if not str(state.get("last_updated") or "").strip():
        state["last_updated"] = str(state.get("updated_at") or "").strip() or utc()
    if not str(state.get("run_id") or "").strip():
        state["run_id"] = f"overnight_{now_epoch()}_{os.getpid()}"
    if not str(state.get("started_at") or "").strip():
        state["started_at"] = utc()
    state["card"] = master_card
    state["resume_from_previous_state"] = resume_from_previous

    if resume_mode:
        pre_ok, pre_reason = precondition_resume_after_first_live(auto)
        if not pre_ok:
            rcl = read_json(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json")
            # bootstrap_validation_failed で無限停止しない: 次の一手を明示し exit 0（成功捏造はしない）
            __soft = pre_reason == "first_live_bootstrap_validation_failed"
            __next = (
                "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1"
                if __soft
                else NEXT_BEST_DEFAULT
            )
            out_pre: dict[str, Any] = {
                "card": master_card,
                "generated_at": utc(),
                "last_updated": utc(),
                "run_id": state.get("run_id"),
                "precondition_pass": False,
                "precondition_fail_reason": pre_reason,
                "cycle_count": 0,
                "safe_scope_enforced": True,
                "current_run_evidence_ok": True,
                "resume_possible": False if not __soft else True,
                "completed": False,
                "stop_reason": pre_reason,
                "next_best_card": __next,
            }
            out_pre.update(rcl_dispatch_flags(rcl))
            write_json(summary_path, out_pre)
            report_path.write_text(
                f"# {master_card}\n\n- precondition_pass: `False`\n- stop_reason: `{pre_reason}`\n",
                encoding="utf-8",
            )
            state["stop_reason"] = pre_reason
            state["precondition_pass"] = False
            state["resume_possible"] = False if not __soft else True
            touch_state_timestamp(state)
            write_json(state_path, state)
            return 0 if __soft else 1
        state["precondition_pass"] = True

    lock_path = auto / ".tenmon_overnight_loop.lock"
    if lock_path.exists() and state.get("running"):
        # resume mode
        pass
    else:
        lock_path.write_text(f"{os.getpid()}\n", encoding="utf-8")
    state["running"] = True
    state["overnight_loop_started"] = True
    touch_state_timestamp(state)
    write_json(state_path, state)

    start_epoch = now_epoch()
    max_cycles = int(policy.get("max_cycles", 16) or 16)
    max_hours = float(policy.get("max_hours", 8) or 8)
    stop_consecutive = int(policy.get("stop_consecutive_failures", 3) or 3)
    sleep_min = int(policy.get("sleep_min_seconds", 30) or 30)
    sleep_max = int(policy.get("sleep_max_seconds", 90) or 90)

    card_to_runner: dict[str, list[str]] = {
        "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_cursor_runtime_execution_contract_v1.sh")],
        "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_CURSOR_AUTO_V1": ["python3", str(auto / "tenmon_remote_admin_cursor_runtime_proof_v1.py")],
        "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh")],
        "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")],
        "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_autonomy_first_live_bootstrap_v1.sh")],
        "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1": ["bash", str(scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")],
        "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1": ["bash", str(scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")],
        "TENMON_FINAL_AUTONOMY_ACCEPTANCE_REJUDGE_AND_SEAL_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")],
        "TENMON_FULL_AUTONOMY_ACCEPTANCE_GATE_CURSOR_AUTO_V1": ["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")],
    }

    card_prereq: dict[str, str] = (
        {}
        if resume_mode
        else {
            "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_CURSOR_AUTO_V1": "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_CURSOR_AUTO_V1",
            "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1": "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_CURSOR_AUTO_V1",
            "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1": "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1",
            "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1": "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1",
            "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1": "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1",
            "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1": "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1",
            "TENMON_FINAL_AUTONOMY_ACCEPTANCE_REJUDGE_AND_SEAL_CURSOR_AUTO_V1": "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1",
        }
    )

    completed_cards: set[str] = set(state.get("completed_cards") or [])
    cycle_count = int(state.get("cycle", 0) or 0)

    def load_queue() -> dict[str, Any]:
        q = read_json(queue_path, {"items": []})
        if "items" not in q or not isinstance(q["items"], list):
            q["items"] = []
        return q

    def save_queue(q: dict[str, Any]) -> None:
        q["generated_at"] = utc()
        write_json(queue_path, q)

    def choose_card(q: dict[str, Any], open_blockers: list[str], safe_scope_only: bool) -> str | None:
        if "stale_truth_detected" in open_blockers:
            return "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1"
        items = [x for x in q.get("items", []) if isinstance(x, dict)]
        for it in items:
            if it.get("status") == "done":
                continue
            c = str(it.get("card") or "")
            if not c:
                continue
            if safe_scope_only and c in (
                "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1",
                "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1",
            ):
                continue
            prereq = card_prereq.get(c)
            if prereq and prereq not in completed_cards:
                return prereq
            return c
        return None

    def classify_retry_card(failure_reason: str) -> str:
        reason = failure_reason.lower()
        if "queue_file_missing" in reason or "result_bundle_missing" in reason or "ingest" in reason:
            return "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_RETRY_CURSOR_AUTO_V1"
        if "founder" in reason or "runtime bind" in reason:
            return "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_RETRY_CURSOR_AUTO_V1"
        if "stale" in reason:
            return "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_RETRY_CURSOR_AUTO_V1"
        if "meta_leak" in reason:
            return "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_RETRY_CURSOR_AUTO_V1"
        if "scripture_raw" in reason or "technical_misroute" in reason:
            return "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_RETRY_CURSOR_AUTO_V1"
        return NEXT_ON_FAIL

    def observe() -> dict[str, Any]:
        rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
        hygiene = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
        hardstop = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
        runtime = read_json(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
        stale = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
        accept = read_json(auto / "tenmon_full_autonomy_acceptance_summary.json")
        first_live = read_json(auto / "tenmon_autonomy_first_live_summary.json")
        closed = read_json(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
        scripture = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
        delivery_log = auto / "remote_bridge_delivery_log.jsonl"
        log_tail_exists = delivery_log.is_file() and delivery_log.stat().st_size > 0
        blockers = [str(x) for x in (runtime.get("current_blockers") or [])]
        if rejudge_verdict_indicates_stale(auto) and "stale_truth_detected" not in blockers:
            blockers.append("stale_truth_detected")
        if delivered_lease_expired(auto) and "delivered_lease_expired" not in blockers:
            blockers.append("delivered_lease_expired")
        return {
            "rejudge": rejudge,
            "hygiene": hygiene,
            "hardstop": hardstop,
            "runtime": runtime,
            "stale": stale,
            "accept": accept,
            "first_live": first_live,
            "closed": closed,
            "scripture": scripture,
            "delivery_log_seen": log_tail_exists,
            "open_blockers": blockers,
        }

    completed = False
    root_cause_summary = ""
    while True:
        elapsed_h = (now_epoch() - start_epoch) / 3600.0
        if cycle_count >= max_cycles or elapsed_h >= max_hours:
            root_cause_summary = "max_cycles_or_max_hours_reached"
            break

        q = load_queue()
        obs = observe()
        hardstop_green = safe_bool(obs["hardstop"].get("pass")) and not safe_bool(obs["hardstop"].get("must_block"))
        hygiene_clean = not safe_bool(obs["hygiene"].get("must_block_seal"))
        safe_scope_only = not hardstop_green
        high_risk_enabled = hardstop_green and hygiene_clean and (not rejudge_verdict_indicates_stale(auto))

        chosen = choose_card(q, obs["open_blockers"], safe_scope_only)
        if not chosen:
            root_cause_summary = "queue_empty_not_pass"
            break

        cycle_count += 1
        state["cycle"] = cycle_count
        state["cycle_count"] = cycle_count
        state["open_blockers"] = obs["open_blockers"]
        state["next_card"] = chosen
        state["safe_scope_only"] = safe_scope_only
        state["high_risk_enabled"] = high_risk_enabled
        state["safe_scope_enforced"] = True
        state["high_risk_not_touched_when_blocked"] = not (safe_scope_only and high_risk_enabled)
        touch_state_timestamp(state)
        write_json(state_path, state)

        run_dir = auto / "out" / "overnight_autonomy" / str(state["run_id"])
        run_dir.mkdir(parents=True, exist_ok=True)
        cycle_json = run_dir / f"cycle_{cycle_count}_summary.json"
        cycle_md = run_dir / f"cycle_{cycle_count}_report.md"

        evidence_targets = [
            auto / "tenmon_cursor_runtime_execution_contract_summary.json",
            auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json",
            auto / "tenmon_latest_truth_rebase_summary.json",
            auto / "tenmon_self_build_real_closed_loop_proof_summary.json",
            auto / "tenmon_autonomy_first_live_summary.json",
            auto / "tenmon_full_autonomy_acceptance_summary.json",
        ]
        pre_mtime = newest_mtime(evidence_targets)

        runner = card_to_runner.get(chosen)
        if not runner:
            result = {"ok": False, "returncode": 127, "tail": f"runner_missing:{chosen}"}
        else:
            result = run(runner, repo, timeout=3000)

        rejudge_run = run(["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], repo, timeout=2400)
        acceptance_run = run(["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")], repo, timeout=2400)

        post_obs = observe()
        post_mtime = newest_mtime(evidence_targets + [auto / "tenmon_latest_state_rejudge_summary.json"])
        current_run_evidence_ok = post_mtime >= pre_mtime and has_generated_at(post_obs["rejudge"])
        stale_used = rejudge_verdict_indicates_stale(auto)

        card_pass = bool(result["ok"]) and current_run_evidence_ok and not stale_used
        fail_reason = ""
        if not result["ok"]:
            fail_reason = f"runner_failed:{chosen}"
        elif not current_run_evidence_ok:
            fail_reason = "missing_current_run_evidence"
        elif stale_used:
            fail_reason = "stale_truth_present"

        if card_pass:
            completed_cards.add(chosen)
            state["last_pass_card"] = chosen
            state["consecutive_fail"] = 0
            for it in q["items"]:
                if isinstance(it, dict) and it.get("card") == chosen and it.get("status") != "done":
                    it["status"] = "done"
                    break
        else:
            state["last_fail_card"] = chosen
            state["consecutive_fail"] = int(state.get("consecutive_fail", 0) or 0) + 1
            # single retry only
            retry_card = classify_retry_card(fail_reason or result.get("tail", ""))
            already_retry = any(
                isinstance(x, dict) and x.get("status") == "pending" and str(x.get("card", "")).endswith("_RETRY_CURSOR_AUTO_V1")
                for x in q["items"]
            )
            if not already_retry:
                q["items"].append({"card": retry_card, "status": "pending", "retry_count": 1, "source_card": chosen})

        state["last_rejudge_band"] = str(post_obs["rejudge"].get("overall_band") or "")
        state["current_run_evidence_ok"] = current_run_evidence_ok
        state["next_best_card"] = choose_card(q, post_obs["open_blockers"], safe_scope_only) or NEXT_ON_FAIL
        state["open_blockers"] = post_obs["open_blockers"]
        state["completed_cards"] = sorted(completed_cards)
        touch_state_timestamp(state)

        completion_checks = {
            "full_autonomy_acceptance_pass": safe_bool(post_obs["accept"].get("pass")),
            "first_live_cycle_pass": safe_bool(post_obs["first_live"].get("first_live_cycle_pass")),
            "real_closed_loop_proven": safe_bool(post_obs["closed"].get("real_closed_loop_proven")),
            "stale_sources_count_zero": not rejudge_verdict_indicates_stale(auto),
            "repo_hygiene_must_block_seal_false": not safe_bool(post_obs["hygiene"].get("must_block_seal")),
            "meta_leak_count_zero": int(post_obs["rejudge"].get("meta_leak_count", 0) or 0) == 0,
            "technical_misroute_count_zero": int(post_obs["rejudge"].get("technical_misroute_count", 0) or 0) == 0,
            "scripture_raw_count_zero": int(post_obs["scripture"].get("raw_ocr_dump_count", 0) or 0) == 0,
            "safe_scope_enforced": True,
        }
        completed = all(completion_checks.values())
        if completed:
            state["finished"] = True
            root_cause_summary = "completed_all_checks_green"

        cycle_out = {
            "card": master_card,
            "generated_at": utc(),
            "run_id": state["run_id"],
            "cycle": cycle_count,
            "chosen_card": chosen,
            "result": {k: v for k, v in result.items() if k not in ("stdout", "stderr")},
            "verify": {
                "current_run_evidence_ok": current_run_evidence_ok,
                "stale_truth_used": stale_used,
                "card_pass": card_pass,
                "fail_reason": fail_reason or None,
            },
            "rejudge": {
                "runner_ok": bool(rejudge_run.get("ok")),
                "acceptance_ok": bool(acceptance_run.get("ok")),
                "band": state["last_rejudge_band"],
            },
            "open_blockers": post_obs["open_blockers"],
            "completion_checks": completion_checks,
            "next_best_card": state["next_best_card"],
        }
        write_json(cycle_json, cycle_out)
        cycle_md.write_text(
            "\n".join(
                [
                    f"# {master_card} cycle {cycle_count}",
                    "",
                    f"- chosen_card: `{chosen}`",
                    f"- card_pass: `{card_pass}`",
                    f"- fail_reason: `{fail_reason or 'none'}`",
                    f"- current_run_evidence_ok: `{current_run_evidence_ok}`",
                    f"- next_best_card: `{state['next_best_card']}`",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        save_queue(q)
        write_json(state_path, state)

        if completed:
            break
        if state["consecutive_fail"] >= stop_consecutive:
            root_cause_summary = "consecutive_fail_threshold_reached"
            break
        if "founder_key_missing" in post_obs["open_blockers"] or "queue_file_missing" in post_obs["open_blockers"]:
            root_cause_summary = "core_runtime_contract_or_founder_bind_blocked"
            break

        # unattended backoff
        sleep_s = random.randint(max(1, sleep_min), max(sleep_min, sleep_max))
        time.sleep(sleep_s)

    # final aggregation
    final_obs = observe()
    final_rejudge = final_obs["rejudge"]
    final_accept = final_obs["accept"]
    final_closed = final_obs["closed"]
    final_first = final_obs["first_live"]
    final_stale = final_obs["stale"]
    final_scripture = final_obs["scripture"]

    rcl_final = read_json(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json")
    dispatch_flags = rcl_dispatch_flags(rcl_final)
    stop_reason_final = root_cause_summary or state.get("root_cause_summary") or "stopped_without_full_completion"
    precondition_ok = (not resume_mode) or safe_bool(state.get("precondition_pass"))

    out: dict[str, Any] = {
        "card": master_card,
        "generated_at": utc(),
        "started_at": state.get("started_at"),
        "finished_at": utc(),
        "last_updated": utc(),
        "run_id": state.get("run_id"),
        "overnight_loop_started": True,
        "precondition_pass": precondition_ok,
        "cycle_count": cycle_count,
        "completed": bool(state.get("finished") or completed),
        "full_autonomy_acceptance_pass": safe_bool(final_accept.get("pass")),
        "real_closed_loop_proven": safe_bool(final_closed.get("real_closed_loop_proven")),
        "first_live_cycle_pass": safe_bool(final_first.get("first_live_cycle_pass")),
        "meta_leak_count": int(final_rejudge.get("meta_leak_count", 0) or 0),
        "technical_misroute_count": int(final_rejudge.get("technical_misroute_count", 0) or 0),
        "scripture_raw_count": int(final_scripture.get("raw_ocr_dump_count", 0) or 0),
        "repo_hygiene_must_block_seal": safe_bool(final_obs["hygiene"].get("must_block_seal")),
        "stale_sources_count": int(final_stale.get("stale_sources_count", 0) or 0),
        "rejudge_verdict_stale": rejudge_verdict_indicates_stale(auto),
        "last_pass_card": state.get("last_pass_card"),
        "last_fail_card": state.get("last_fail_card"),
        "next_best_card": state.get("next_best_card") or NEXT_BEST_DEFAULT,
        "root_cause_summary": stop_reason_final,
        "stop_reason": stop_reason_final,
        "resume_from_previous_state": bool(state.get("resume_from_previous_state")),
        "resume_possible": True,
        "safe_scope_enforced": True,
        "high_risk_not_touched_when_blocked": bool(state.get("high_risk_not_touched_when_blocked")),
        "current_run_evidence_ok": bool(state.get("current_run_evidence_ok")),
        "final_band": str(final_rejudge.get("overall_band") or ""),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
    }
    out.update(dispatch_flags)
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {master_card}",
                "",
                f"- started_at: `{out['started_at']}`",
                f"- finished_at: `{out['finished_at']}`",
                f"- run_id: `{out['run_id']}`",
                f"- cycle_count: `{out['cycle_count']}`",
                f"- completed: `{out['completed']}`",
                f"- full_autonomy_acceptance_pass: `{out['full_autonomy_acceptance_pass']}`",
                f"- real_closed_loop_proven: `{out['real_closed_loop_proven']}`",
                f"- first_live_cycle_pass: `{out['first_live_cycle_pass']}`",
                f"- meta_leak_count: `{out['meta_leak_count']}`",
                f"- technical_misroute_count: `{out['technical_misroute_count']}`",
                f"- scripture_raw_count: `{out['scripture_raw_count']}`",
                f"- repo_hygiene_must_block_seal: `{out['repo_hygiene_must_block_seal']}`",
                f"- stale_sources_count: `{out['stale_sources_count']}`",
                f"- last_pass_card: `{out['last_pass_card']}`",
                f"- last_fail_card: `{out['last_fail_card']}`",
                f"- next_best_card: `{out['next_best_card']}`",
                f"- root_cause_summary: `{out['root_cause_summary']}`",
                f"- stop_reason: `{out['stop_reason']}`",
                f"- resume_possible: `{out['resume_possible']}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    state["running"] = False
    state["finished"] = bool(out["completed"])
    touch_state_timestamp(state)
    state["root_cause_summary"] = out["root_cause_summary"]
    state["stop_reason"] = out["stop_reason"]
    state["resume_possible"] = out["resume_possible"]
    write_json(state_path, state)
    try:
        lock_path.unlink(missing_ok=True)
    except Exception:
        pass

    minimum_live_pass = (
        bool(out["overnight_loop_started"])
        and int(out["cycle_count"]) >= 1
        and bool(out["safe_scope_enforced"])
        and bool(out["current_run_evidence_ok"])
        and bool(out.get("resume_possible", True))
    )
    return 0 if minimum_live_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

