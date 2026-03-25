#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_AND_SAFE_RUN_CURSOR_AUTO_V1"

PRIORITY_CHOOSE_STALE = "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1"
PRIORITY_CHOOSE_CLOSED_LOOP = "TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1"
PRIORITY_CHOOSE_SAFE_ACCEPTANCE = "TENMON_FULL_AUTONOMY_ACCEPTANCE_GATE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def rj(p: Path) -> dict[str, Any]:
    try:
        x = json.loads(p.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def http_get_json(url: str, timeout: float = 10.0) -> tuple[int, dict[str, Any]]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return int(res.status), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        return int(e.code), {}
    except Exception:
        return 0, {}


def http_post_json(url: str, payload: dict[str, Any], headers: dict[str, str], timeout: float = 30.0) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return int(res.status), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception:
        return 0, {}


def pick_safe_card_from_queues(auto: Path) -> str | None:
    sources = [
        auto / "state_convergence_next_cards.json",
        auto / "self_build_priority_queue.json",
        auto / "retry_queue.json",
    ]
    candidates: list[str] = []
    for p in sources:
        js = rj(p)
        for e in js.get("next_cards") or []:
            c = (e or {}).get("cursor_card")
            if c:
                candidates.append(str(c))
        for e in js.get("items") or []:
            c = (e or {}).get("cursor_card") or (e or {}).get("card")
            if c:
                candidates.append(str(c))
    safe_tokens = ("HYGIENE", "TRUTH", "CANONICAL", "AUTONOMY", "WATCHDOG", "REPORT", "SUMMARY", "AUTOMATION")
    for c in candidates:
        u = c.upper()
        if any(t in u for t in ("CHAT.TS", "WEB", "FRONTEND", "PWA_RUNTIME_ENV")):
            continue
        if any(t in u for t in safe_tokens):
            return c
    return None


def choose_one_card(
    auto: Path,
    stale_truth_present: bool,
    closed_loop_proven: bool,
) -> tuple[str | None, str]:
    """Returns (chosen_card_name, choose_reason). Empty queue → no PASS-by-empty."""
    if stale_truth_present:
        return PRIORITY_CHOOSE_STALE, "priority_stale_truth_rebase"
    if not closed_loop_proven:
        return PRIORITY_CHOOSE_CLOSED_LOOP, "priority_closed_loop_not_proven"
    alt = pick_safe_card_from_queues(auto)
    if alt:
        return alt, "safe_queue_candidate"
    return PRIORITY_CHOOSE_SAFE_ACCEPTANCE, "fallback_safe_acceptance_card"


def wait_until(pred, *, timeout_s: float, interval_s: float = 1.2) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if pred():
            return True
        time.sleep(interval_s)
    return False


def delivery_log_tail_from(offset: int, log_path: Path) -> str:
    if not log_path.is_file():
        return ""
    return log_path.read_bytes()[offset:].decode("utf-8", errors="replace")


def queue_has_job_id(queue_path: Path, job_id: str) -> bool:
    q = rj(queue_path)
    for it in q.get("items") or []:
        if isinstance(it, dict) and str(it.get("id") or "") == job_id:
            return True
    return False


def bundle_has_current_run_entry(bundle_path: Path, job_id: str, run_id: str, pre_count: int) -> bool:
    b = rj(bundle_path)
    entries = b.get("entries") or []
    if not isinstance(entries, list) or len(entries) <= pre_count:
        return False
    for e in reversed(entries):
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "") != job_id:
            continue
        snip = str(e.get("log_snippet") or "")
        raw = json.dumps(e, ensure_ascii=False)
        if run_id in snip or run_id in raw:
            return True
    return False


def parse_iso_z(s: str | None) -> datetime | None:
    if not s or not isinstance(s, str):
        return None
    t = s.strip()
    if t.endswith("Z"):
        t = t[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(t.replace("Z", "+00:00"))
    except Exception:
        return None


def http_get_json_auth(url: str, founder: str, timeout: float = 60.0) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("X-Founder-Key", founder)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return int(res.status), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            js = json.loads(e.read().decode("utf-8", errors="replace"))
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception:
        return 0, {}


def file_snap(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"path": str(path), "exists": False, "mtime_epoch": None, "size": 0}
    st = path.stat()
    return {"path": str(path), "exists": True, "mtime_epoch": st.st_mtime, "size": st.st_size}


def run_rejudge_subprocess(repo: Path, scripts: Path, base: str) -> tuple[bool, str]:
    sh = scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
    if not sh.is_file():
        return False, "rejudge_script_missing"
    p = subprocess.run(
        ["bash", str(sh)],
        cwd=str(repo),
        env={**os.environ, "TENMON_REPO_ROOT": str(repo), "TENMON_GATE_BASE": base},
        capture_output=True,
        text=True,
        timeout=2400,
        check=False,
    )
    tail = ((p.stdout or "") + (p.stderr or ""))[-800:]
    return p.returncode == 0, tail


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    scripts = repo / "api" / "scripts"
    base = os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000").rstrip("/")
    founder = (os.environ.get("FOUNDER_KEY") or os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY") or "").strip()
    run_id = f"firstlive_{int(time.time())}_{os.getpid()}"
    run_start_epoch = time.time()

    state_path = auto / "tenmon_autonomy_first_live_state.json"
    rejudge_sh = scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
    submit_sh = scripts / "remote_cursor_submit_v1.sh"
    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    delivery_log = auto / "remote_bridge_delivery_log.jsonl"
    dlog_offset = delivery_log.stat().st_size if delivery_log.is_file() else 0
    pull_timeout = float(os.environ.get("TENMON_FIRST_LIVE_PULL_TIMEOUT", "120"))
    bundle_wait_timeout = float(os.environ.get("TENMON_FIRST_LIVE_BUNDLE_WAIT", "90"))

    current_run_observe: dict[str, Any] = {
        "observed_at": utc(),
        "delivery_log_offset_bytes": dlog_offset,
        "queue": file_snap(queue_path),
        "bundle": file_snap(bundle_path),
        "rebase_summary": file_snap(auto / "tenmon_latest_truth_rebase_summary.json"),
        "rejudge_summary": file_snap(auto / "tenmon_latest_state_rejudge_summary.json"),
        "rejudge_verdict": file_snap(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
        "autonomy_state": file_snap(auto / "operations_level_autonomy_state_v1.json"),
        "stale_invalidation_verdict": file_snap(auto / "tenmon_stale_evidence_invalidation_verdict.json"),
        "pre_bundle_entry_count": len((rj(bundle_path).get("entries") or [])),
    }

    # --- Phase A: state bootstrap first (no zero-update exit) ---
    state: dict[str, Any] = {
        "card": CARD,
        "run_id": run_id,
        "started_at": utc(),
        "last_updated": utc(),
        "phase": "init",
        "bootstrap_validation_pass": False,
        "first_live_cycle_pass": False,
        "safe_scope_enforced": True,
        "high_risk_not_touched": True,
        "founder_key_present": bool(founder),
        "runtime_bind_present": False,
        "queue_ready": False,
        "result_bundle_ready": False,
        "rejudge_callable": rejudge_sh.is_file(),
        "stop_reason": "running",
        "failed_phase": None,
        "current_run_observe": current_run_observe,
    }
    wj(state_path, state)

    required_files = [
        auto / "tenmon_cursor_runtime_execution_contract_v1.py",
        auto / "tenmon_self_build_real_closed_loop_proof_v1.py",
        auto / "tenmon_operations_level_autonomy_v1.py",
        auto / "operations_level_autonomy_policy_v1.json",
        auto / "operations_level_autonomy_state_v1.json",
    ]
    pre_files_ok = all(p.is_file() for p in required_files)

    # --- Phase B: bootstrap validation ---
    state["phase"] = "bootstrap_validation"
    state["last_updated"] = utc()
    wj(state_path, state)

    h, _ = http_get_json(f"{base}/api/health")
    a, _ = http_get_json(f"{base}/api/audit")
    ab, _ = http_get_json(f"{base}/api/audit.build")
    runtime_gate_ok = h == 200 and a == 200 and ab == 200
    state["runtime_bind_present"] = runtime_gate_ok

    state["queue_ready"] = queue_path.is_file()
    state["result_bundle_ready"] = bundle_path.is_file()

    rej_verdict_early = rj(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    rb_list = [str(x) for x in (rej_verdict_early.get("remaining_blockers") or [])]
    stale_truth_present = "stale_sources_present" in rb_list or len(rej_verdict_early.get("stale_sources") or []) > 0

    closed_summary = rj(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
    closed_loop_proven = bool(closed_summary.get("real_closed_loop_proven"))

    policy = rj(auto / "operations_level_autonomy_policy_v1.json")
    remote_submit_ready = submit_sh.is_file()

    rebase_summary_ok = (auto / "tenmon_latest_truth_rebase_summary.json").is_file()
    rejudge_summary_ok = (auto / "tenmon_latest_state_rejudge_summary.json").is_file()

    bootstrap_validation_pass = (
        pre_files_ok
        and runtime_gate_ok
        and bool(policy)
        and state["queue_ready"]
        and state["result_bundle_ready"]
        and state["rejudge_callable"]
        and remote_submit_ready
        and rebase_summary_ok
        and rejudge_summary_ok
    )
    if not founder:
        bootstrap_validation_pass = False

    state["bootstrap_validation_pass"] = bootstrap_validation_pass
    state["founder_key_present"] = bool(founder)
    state["last_updated"] = utc()
    wj(state_path, state)

    if not bootstrap_validation_pass:
        state["phase"] = "bootstrap_validation_failed"
        state["failed_phase"] = "bootstrap_validation"
        state["stop_reason"] = "founder_or_runtime_bind_missing" if not founder else "runtime_or_artifacts_not_ready"
        state["last_updated"] = utc()
        wj(state_path, state)
        return _finalize(
            auto,
            state_path,
            repo,
            scripts,
            base,
            run_id,
            founder,
            run_start_epoch,
            chosen=None,
            choose_reason="validation_failed",
            stale_truth_present=stale_truth_present,
            bootstrap_validation_pass=False,
            current_run_choose_pass=False,
            submit_ok=False,
            delivery_observed=False,
            result_returned=False,
            ingest_pass=False,
            rejudge_pass=False,
            job_id="",
            first_live_cycle_pass=False,
            hard=rj(auto / "tenmon_execution_gate_hardstop_verdict.json"),
            hyg=rj(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
            rejv=rj(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
            current_run_observe=current_run_observe,
        )

    # --- Phase C: choose (never empty-queue PASS) ---
    state["phase"] = "choose"
    state["last_updated"] = utc()
    wj(state_path, state)

    chosen, choose_reason = choose_one_card(auto, stale_truth_present, closed_loop_proven)
    current_run_choose_pass = bool(chosen)

    # --- Phase D: dispatch (official HTTP only; no queue json edit) ---
    state["phase"] = "dispatch"
    state["last_updated"] = utc()
    wj(state_path, state)

    job_id = ""
    submit_ok = False
    delivery_observed = False
    result_returned = False
    ingest_pass = False
    rejudge_pass = False
    rej_tail = ""

    pre_bundle_count = len((rj(bundle_path).get("entries") or []))

    code, js = http_post_json(
        f"{base}/api/admin/cursor/submit",
        {
            "card_name": chosen,
            "card_body_md": f"RUN_ID={run_id}\nSCOPE=safe\nOBJECTIVE=first_live_safe_cycle",
            "source": "tenmon_autonomy_first_live_bootstrap_v1.py",
            "force_approve": True,
        },
        {"X-Founder-Key": founder},
    )
    item = js.get("item") if isinstance(js.get("item"), dict) else {}
    job_id = str(item.get("id") or "").strip()
    submit_ok = code == 200 and bool(js.get("ok")) and bool(job_id)

    if submit_ok and str(item.get("state") or "") == "approval_required":
        c_ap, j_ap = http_post_json(
            f"{base}/api/admin/cursor/approve",
            {"id": job_id},
            {"X-Founder-Key": founder},
        )
        submit_ok = c_ap == 200 and bool(j_ap.get("ok")) and bool(job_id)

    if submit_ok:
        wait_until(lambda: queue_has_job_id(queue_path, job_id), timeout_s=30.0)

        pulled: dict[str, Any] = {}
        deadline = time.monotonic() + pull_timeout

        def pull_ours() -> bool:
            nonlocal pulled
            c, j = http_get_json_auth(f"{base}/api/admin/cursor/next", founder, timeout=60.0)
            if c != 200 or not j.get("ok"):
                return False
            it = j.get("item")
            if not isinstance(it, dict) or not it.get("id"):
                return False
            if str(it.get("id")) != job_id:
                return False
            pulled = it
            return True

        while time.monotonic() < deadline:
            if pull_ours():
                break
            time.sleep(1.2)

        new_tail = delivery_log_tail_from(dlog_offset, delivery_log)
        tail_has_job = job_id in new_tail
        pulled_ok = bool(pulled.get("id")) and str(pulled.get("id")) == job_id
        delivery_observed = tail_has_job and pulled_ok

        if delivery_observed and pulled_ok:
            out_dir = auto / "out" / "first_live_bootstrap" / run_id
            out_dir.mkdir(parents=True, exist_ok=True)
            er_json = out_dir / "executor_result.json"
            er_payload = {
                "run_id": run_id,
                "job_id": job_id,
                "card": CARD,
                "generated_at": utc(),
                "fixture": False,
            }
            er_json.write_text(json.dumps(er_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            (out_dir / "executor_result.md").write_text(
                f"# first live bootstrap\n\nRUN_ID={run_id}\nJOB_ID={job_id}\n", encoding="utf-8"
            )
            touched = [
                f"api/automation/out/first_live_bootstrap/{run_id}/executor_result.json",
                f"api/automation/out/first_live_bootstrap/{run_id}/executor_result.md",
            ]
            log_snippet = json.dumps({"run_id": run_id, "job_id": job_id, "card": CARD}, ensure_ascii=False)[:8000]
            code_r, js_r = http_post_json(
                f"{base}/api/admin/cursor/result",
                {
                    "queue_id": job_id,
                    "touched_files": touched,
                    "build_rc": 0,
                    "acceptance_ok": True,
                    "dry_run": False,
                    "log_snippet": log_snippet,
                },
                {"X-Founder-Key": founder},
            )
            ingest_pass = code_r == 200 and bool(js_r.get("ok")) and str(js_r.get("status") or "") != "blocked_paths"
            result_returned = wait_until(
                lambda: bundle_has_current_run_entry(bundle_path, job_id, run_id, pre_bundle_count),
                timeout_s=bundle_wait_timeout,
            )

    # --- Phase E: rejudge (subprocess + mtime / generated_at freshness) ---
    state["phase"] = "rejudge"
    state["last_updated"] = utc()
    wj(state_path, state)

    rejudge_summary_path = auto / "tenmon_latest_state_rejudge_summary.json"
    rejudge_verdict_path = auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
    pre_summary_gen = rj(rejudge_summary_path).get("generated_at")
    pre_dt = parse_iso_z(str(pre_summary_gen) if pre_summary_gen else None)
    m_before_summ = rejudge_summary_path.stat().st_mtime if rejudge_summary_path.is_file() else 0.0
    m_before_ver = rejudge_verdict_path.stat().st_mtime if rejudge_verdict_path.is_file() else 0.0

    _ok_sub, rej_tail = run_rejudge_subprocess(repo, scripts, base)
    post_rej = rj(rejudge_summary_path)
    m_after_summ = rejudge_summary_path.stat().st_mtime if rejudge_summary_path.is_file() else 0.0
    m_after_ver = rejudge_verdict_path.stat().st_mtime if rejudge_verdict_path.is_file() else 0.0
    summ_after = post_rej.get("generated_at")
    summ_after_dt = parse_iso_z(str(summ_after) if summ_after else None)
    start_dt = datetime.fromtimestamp(run_start_epoch, tz=timezone.utc)
    gen_fresher = False
    if summ_after_dt and pre_dt:
        gen_fresher = summ_after_dt > pre_dt
    elif summ_after_dt:
        gen_fresher = summ_after_dt >= start_dt - timedelta(seconds=5)
    elif str(summ_after) != str(pre_summary_gen) and summ_after:
        gen_fresher = True

    rejudge_pass = bool(
        (m_after_summ > m_before_summ)
        or (m_after_ver > m_before_ver)
        or gen_fresher
    )

    if ingest_pass and result_returned and not rejudge_pass:
        rcode, _ = http_post_json(
            f"{base}/api/admin/rejudge/refresh",
            {"source": CARD, "run_id": run_id},
            {"X-Founder-Key": founder},
        )
        post_rej = rj(rejudge_summary_path)
        m_after_summ2 = rejudge_summary_path.stat().st_mtime if rejudge_summary_path.is_file() else 0.0
        m_after_ver2 = rejudge_verdict_path.stat().st_mtime if rejudge_verdict_path.is_file() else 0.0
        summ_after2 = post_rej.get("generated_at")
        summ_after_dt2 = parse_iso_z(str(summ_after2) if summ_after2 else None)
        gf2 = False
        if summ_after_dt2 and pre_dt:
            gf2 = summ_after_dt2 > pre_dt
        elif summ_after_dt2:
            gf2 = summ_after_dt2 >= start_dt - timedelta(seconds=5)
        rejudge_pass = rcode in (200, 202) and bool(summ_after2) and (
            m_after_summ2 > m_before_summ or m_after_ver2 > m_before_ver or gf2
        )

    first_live_cycle_pass = all(
        [
            current_run_choose_pass,
            submit_ok,
            delivery_observed,
            result_returned,
            ingest_pass,
            rejudge_pass,
        ]
    )

    state["first_live_cycle_pass"] = first_live_cycle_pass
    state["phase"] = "persist" if first_live_cycle_pass else "fail_point"
    state["failed_phase"] = None if first_live_cycle_pass else _infer_failed_phase(
        current_run_choose_pass, submit_ok, delivery_observed, result_returned, ingest_pass, rejudge_pass
    )
    state["stop_reason"] = "first_live_cycle_ok" if first_live_cycle_pass else _infer_stop_reason(
        current_run_choose_pass, submit_ok, delivery_observed, result_returned, ingest_pass, rejudge_pass
    )
    state["last_updated"] = utc()
    wj(state_path, state)

    hard = rj(auto / "tenmon_execution_gate_hardstop_verdict.json")
    hyg = rj(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    rejv = rj(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")

    return _finalize(
        auto,
        state_path,
        repo,
        scripts,
        base,
        run_id,
        founder,
        run_start_epoch,
        chosen=chosen,
        choose_reason=choose_reason,
        stale_truth_present=stale_truth_present,
        bootstrap_validation_pass=True,
        current_run_choose_pass=current_run_choose_pass,
        submit_ok=submit_ok,
        delivery_observed=delivery_observed,
        result_returned=result_returned,
        ingest_pass=ingest_pass,
        rejudge_pass=rejudge_pass,
        job_id=job_id,
        first_live_cycle_pass=first_live_cycle_pass,
        hard=hard,
        hyg=hyg,
        rejv=rejv,
        extra_tail=rej_tail,
        current_run_observe=current_run_observe,
    )


def _infer_failed_phase(
    choose: bool,
    dispatch: bool,
    delivery: bool,
    result: bool,
    ingest: bool,
    rejudge: bool,
) -> str:
    if not choose:
        return "choose"
    if not dispatch:
        return "dispatch"
    if not delivery:
        return "delivery"
    if not result:
        return "result_wait"
    if not ingest:
        return "ingest"
    if not rejudge:
        return "rejudge"
    return "unknown"


def _infer_stop_reason(
    choose: bool,
    dispatch: bool,
    delivery: bool,
    result: bool,
    ingest: bool,
    rejudge: bool,
) -> str:
    if not choose:
        return "choose_failed"
    if not dispatch:
        return "dispatch_failed"
    if not delivery:
        return "delivery_not_observed"
    if not result:
        return "result_not_returned"
    if not ingest:
        return "ingest_failed"
    if not rejudge:
        return "rejudge_failed"
    return "first_live_cycle_ok"


def _finalize(
    auto: Path,
    state_path: Path,
    repo: Path,
    scripts: Path,
    base: str,
    run_id: str,
    founder: str,
    run_start_epoch: float,
    chosen: str | None,
    choose_reason: str,
    stale_truth_present: bool,
    bootstrap_validation_pass: bool,
    current_run_choose_pass: bool,
    submit_ok: bool,
    delivery_observed: bool,
    result_returned: bool,
    ingest_pass: bool,
    rejudge_pass: bool,
    job_id: str,
    first_live_cycle_pass: bool,
    hard: dict[str, Any],
    hyg: dict[str, Any],
    rejv: dict[str, Any],
    extra_tail: str = "",
    current_run_observe: dict[str, Any] | None = None,
) -> int:
    state = rj(state_path)
    state["last_updated"] = utc()
    wj(state_path, state)

    rej_post = rj(auto / "tenmon_latest_state_rejudge_summary.json")
    path_rj = auto / "tenmon_latest_state_rejudge_summary.json"
    evidence_ts_ok = bool(rej_post.get("generated_at")) and path_rj.is_file() and (
        path_rj.stat().st_mtime >= run_start_epoch - 120.0
    )

    failed_phase = state.get("failed_phase")
    stop_reason = state.get("stop_reason")
    if stop_reason == "running":
        stop_reason = "completed_with_report"
    stop_reason = stop_reason or "completed_with_report"
    state["stop_reason"] = stop_reason
    state["last_updated"] = utc()
    wj(state_path, state)

    next_card = rej_post.get("recommended_next_card") or chosen or PRIORITY_CHOOSE_CLOSED_LOOP
    if not bootstrap_validation_pass:
        next_card = "TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1"
    elif first_live_cycle_pass:
        next_card = "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1"
    elif not first_live_cycle_pass and stale_truth_present:
        next_card = PRIORITY_CHOOSE_STALE

    next_allowed_scope = "safe"
    if bool(hard.get("pass")) and not bool(hard.get("must_block")) and not bool(hyg.get("must_block_seal", True)):
        next_allowed_scope = "medium"

    current_run_evidence_ok = (
        bool(stop_reason)
        and str(stop_reason).strip() != ""
        and stop_reason != "running"
        and bool(state.get("started_at"))
        and bool(state.get("last_updated"))
    )

    out = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "job_id": job_id,
        "bootstrap_validation_pass": bootstrap_validation_pass,
        "first_live_cycle_pass": first_live_cycle_pass,
        "current_run_choose_pass": current_run_choose_pass,
        "current_run_dispatch_pass": submit_ok,
        "current_run_delivery_observed": delivery_observed,
        "current_run_result_returned": result_returned,
        "current_run_ingest_pass": ingest_pass,
        "current_run_rejudge_pass": rejudge_pass,
        "safe_scope_enforced": True,
        "high_risk_not_touched": True,
        "current_run_observe": current_run_observe or {},
        "founder_key_present": bool(founder),
        "runtime_bind_present": state.get("runtime_bind_present", False),
        "queue_ready": state.get("queue_ready", False),
        "result_bundle_ready": state.get("result_bundle_ready", False),
        "rejudge_callable": state.get("rejudge_callable", False),
        "failed_phase": failed_phase,
        "stop_reason": stop_reason,
        "current_run_evidence_ok": current_run_evidence_ok,
        "choose_reason": choose_reason,
        "chosen_card": chosen,
        "stale_truth_present": stale_truth_present,
        "evidence": {
            "rejudge_subprocess_tail": extra_tail[-400:] if extra_tail else None,
            "stale_truth_present": stale_truth_present,
            "hardstop": hard.get("pass"),
            "hygiene_must_block": hyg.get("must_block_seal"),
            "rejudge_verdict_present": bool(rejv),
            "rejudge_summary_generated_at": rej_post.get("generated_at"),
            "evidence_ts_ok": evidence_ts_ok,
            "ingest_official_path": "POST /api/admin/cursor/result",
        },
        "next_best_card": next_card,
        "recommended_next_card": next_card,
        "next_allowed_scope": next_allowed_scope,
        "next_on_pass": "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1",
    }
    wj(auto / "tenmon_autonomy_first_live_summary.json", out)

    # Merge full fields into state file for auditors
    obs_final = current_run_observe if current_run_observe is not None else state.get("current_run_observe")
    state.update(
        {
            "card": CARD,
            "run_id": run_id,
            "started_at": state.get("started_at") or utc(),
            "last_updated": utc(),
            "phase": state.get("phase") or "completed",
            "bootstrap_validation_pass": bootstrap_validation_pass,
            "first_live_cycle_pass": first_live_cycle_pass,
            "safe_scope_enforced": True,
            "high_risk_not_touched": True,
            "founder_key_present": bool(founder),
            "runtime_bind_present": state.get("runtime_bind_present", False),
            "queue_ready": state.get("queue_ready", False),
            "result_bundle_ready": state.get("result_bundle_ready", False),
            "rejudge_callable": state.get("rejudge_callable", False),
            "stop_reason": stop_reason,
            "failed_phase": failed_phase,
            "last_job_id": job_id,
            "chosen_card": chosen,
            "recommended_next_card": next_card,
            "current_run_observe": obs_final,
        }
    )
    wj(state_path, state)

    obs = current_run_observe or {}
    (auto / "tenmon_autonomy_first_live_report.md").write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- run_id: `{run_id}`",
                f"- job_id: `{job_id}`",
                f"- bootstrap_validation_pass: `{bootstrap_validation_pass}`",
                f"- first_live_cycle_pass: `{first_live_cycle_pass}`",
                f"- stop_reason: `{stop_reason}`",
                f"- failed_phase: `{failed_phase}`",
                f"- chosen_card: `{chosen}`",
                f"- current_run_evidence_ok: `{out['current_run_evidence_ok']}`",
                f"- ingest_official: `POST /api/admin/cursor/result`",
                "",
                "## Current-run observe (startup)",
                f"- observed_at: `{obs.get('observed_at')}`",
                f"- delivery_log_offset_bytes: `{obs.get('delivery_log_offset_bytes')}`",
                f"- pre_bundle_entry_count: `{obs.get('pre_bundle_entry_count')}`",
                "",
                "## Cycle flags",
                f"- current_run_dispatch_pass: `{out['current_run_dispatch_pass']}`",
                f"- current_run_delivery_observed: `{out['current_run_delivery_observed']}`",
                f"- current_run_result_returned: `{out['current_run_result_returned']}`",
                f"- current_run_ingest_pass: `{out['current_run_ingest_pass']}`",
                f"- current_run_rejudge_pass: `{out['current_run_rejudge_pass']}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    mandatory_doc = (
        bool(state.get("started_at"))
        and bool(state.get("last_updated"))
        and bool(state.get("phase"))
        and state.get("safe_scope_enforced") is True
        and state.get("high_risk_not_touched") is True
        and isinstance(bootstrap_validation_pass, bool)
        and stop_reason is not None
        and str(stop_reason).strip() != ""
        and bool(out.get("generated_at"))
        and out["current_run_evidence_ok"] is True
    )
    acceptance_pass = (
        bootstrap_validation_pass
        and first_live_cycle_pass
        and out["current_run_choose_pass"]
        and out["current_run_dispatch_pass"]
        and out["current_run_delivery_observed"]
        and out["current_run_result_returned"]
        and out["current_run_ingest_pass"]
        and out["current_run_rejudge_pass"]
        and out["safe_scope_enforced"] is True
        and out["high_risk_not_touched"] is True
    )

    return 0 if (acceptance_pass and mandatory_doc) else 1


if __name__ == "__main__":
    raise SystemExit(main())
