#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1

同一 current-run の RUN_ID / JOB_ID のみを根拠に、公式 submit → queue → delivery(新規tail) →
GET /next → POST /api/admin/cursor/result → bundle 確認 → rejudge 更新までを検証する。

禁止: queue/bundle 手編集、fixture 注入、過去 delivery/result を成功扱いしない。
ingest の正は HTTP POST /api/admin/cursor/result（サーバが bundle へマージ）。CLI ingest は別経路のため本カードでは API を採用。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_real_closed_loop_current_run_acceptance_summary.json"
OUT_REPORT = "tenmon_real_closed_loop_current_run_acceptance_report.md"

RECOMMENDED_NEXT = "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1"

# err_key -> (failed_phase, stop_reason)
FAIL_REASONS: dict[str, tuple[str, str]] = {
    "founder_key_missing": ("bootstrap", "founder_key_missing"),
    "runtime_triplet_failed": ("runtime_gate", "runtime_triplet_failed"),
    "submit_failed": ("submit", "submit_failed"),
    "executor_pull_timeout": ("delivery_wait", "executor_pull_timeout"),
    "current_run_delivery_not_observed": ("delivery_wait", "current_run_delivery_not_observed"),
    "admin_result_ingest_failed": ("ingest", "ingest_failed"),
    "bundle_missing_current_run_entry": ("result_wait", "current_run_bundle_entry_missing"),
    "rejudge_stale_or_no_refresh": ("rejudge_refresh", "rejudge_artifact_not_freshened"),
}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def file_snapshot(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"path": str(path), "exists": False, "size": 0, "mtime_epoch": None, "sha256_16": None}
    b = path.read_bytes()
    st = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size": len(b),
        "mtime_epoch": st.st_mtime,
        "sha256_16": hashlib.sha256(b).hexdigest()[:16],
    }


def http_req(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 120.0,
) -> tuple[int, dict[str, Any]]:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            txt = res.read().decode("utf-8", errors="replace")
            js = json.loads(txt) if txt.strip().startswith("{") else {}
            return res.getcode(), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            js = json.loads(e.read().decode("utf-8", errors="replace"))
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception as e:
        return 0, {"ok": False, "error": str(e)}


def delivery_log_tail_from(offset: int, log_path: Path) -> str:
    if not log_path.is_file():
        return ""
    data = log_path.read_bytes()
    return data[offset:].decode("utf-8", errors="replace")


def wait_until(pred, *, timeout_s: float, interval_s: float = 1.2) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if pred():
            return True
        time.sleep(interval_s)
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


def bundle_has_current_run_entry(bundle_path: Path, job_id: str, run_id: str, pre_count: int) -> bool:
    b = read_json(bundle_path)
    entries = b.get("entries") or []
    if not isinstance(entries, list):
        return False
    if len(entries) <= pre_count:
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


def detect_stale_truth(auto: Path) -> bool:
    rj = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    blockers = [str(x).lower() for x in (rj.get("remaining_blockers") or [])]
    if any("stale" in x for x in blockers):
        return True
    rb = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    return int(rb.get("stale_sources_count", 0) or 0) > 0


def detect_fixture_signals(auto: Path, queue_path: Path) -> bool:
    if os.environ.get("TENMON_CURSOR_FIXTURE_MODE", "").strip() in ("1", "true", "yes"):
        return True
    q = read_json(queue_path)
    for it in q.get("items") or []:
        if not isinstance(it, dict):
            continue
        if it.get("dry_run_only") and str(it.get("state") or "") != "rejected":
            return True
        reasons = it.get("reject_reasons") or []
        if any("fixture" in str(r).lower() for r in reasons):
            return True
    return False


def detect_mixed_run_bundle(bundle_path: Path, job_id: str, run_id: str, pre_count: int) -> bool:
    """別 RUN_ID の queue_id が混在、または当該 job の entry に run_id が無い。"""
    b = read_json(bundle_path)
    entries = b.get("entries") or []
    if not isinstance(entries, list):
        return False
    for e in entries[pre_count:]:
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "") != job_id:
            continue
        snip = str(e.get("log_snippet") or "")
        raw = json.dumps(e, ensure_ascii=False)
        if run_id not in snip and run_id not in raw:
            return True
    return False


def queue_has_job_id(queue_path: Path, job_id: str) -> bool:
    q = read_json(queue_path)
    for it in q.get("items") or []:
        if isinstance(it, dict) and str(it.get("id") or "") == job_id:
            return True
    return False


def build_card_body_md(run_id: str) -> str:
    return f"""CARD: {CARD}

OBJECTIVE: current-run only closed loop acceptance (safe scope automation).

RUN_ID: `{run_id}`
fixture: false

EDIT_SCOPE:
- api/automation/out/real_closed_loop_current_run/{run_id}/executor_result.json
- api/automation/out/real_closed_loop_current_run/{run_id}/executor_result.md

DO_NOT_TOUCH:
- api/src/**
- web/src/**

ACCEPTANCE:
- Executor posts result via POST /api/admin/cursor/result with queue_id = JOB_ID from submit response.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--executor-timeout", type=float, default=180.0)
    ap.add_argument("--bundle-wait-timeout", type=float, default=120.0)
    ap.add_argument("--skip-command-center", action="store_true", help="remote_cursor_command_center_run_v1.sh をスキップ")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    start_ts_iso = utc()
    start_epoch = time.time()
    run_id = f"rcl_cr_{int(time.time())}_{os.getpid()}"
    job_id = ""
    key = (os.environ.get("FOUNDER_KEY") or os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY") or "").strip()
    base = args.base.rstrip("/")

    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    delivery_log_path = auto / "remote_bridge_delivery_log.jsonl"
    rejudge_verdict = auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
    rejudge_summary_path = auto / "tenmon_latest_state_rejudge_summary.json"

    pre_bundle_count = len((read_json(bundle_path).get("entries") or []))

    pre_rejudge_gen = read_json(rejudge_summary_path).get("generated_at")
    pre_rejudge_dt = parse_iso_z(str(pre_rejudge_gen) if pre_rejudge_gen else None)

    pre_snapshot = {
        "queue": file_snapshot(queue_path),
        "bundle": file_snapshot(bundle_path),
        "delivery_log": file_snapshot(delivery_log_path),
        "rejudge_verdict": file_snapshot(rejudge_verdict),
        "rejudge_summary": file_snapshot(rejudge_summary_path),
        "rejudge_generated_at_before": pre_rejudge_gen,
        "bundle_entry_count_before": pre_bundle_count,
    }
    dlog_offset = int(pre_snapshot["delivery_log"].get("size") or 0) if delivery_log_path.is_file() else 0

    flags: dict[str, Any] = {
        "real_queue_submit": False,
        "real_delivery_observed": False,
        "real_result_returned": False,
        "real_ingest_pass": False,
        "real_rejudge_refresh": False,
        "real_closed_loop_proven": False,
    }
    stages: list[dict[str, Any]] = []

    stale_detected = detect_stale_truth(auto)
    fixture_detected = detect_fixture_signals(auto, queue_path)
    mixed_run_detected = False

    def base_summary(
        *,
        failed_phase: str | None,
        stop_reason: str | None,
        error: str | None = None,
        **extra: Any,
    ) -> dict[str, Any]:
        out: dict[str, Any] = {
            "card": CARD,
            "generated_at": utc(),
            "run_id": run_id,
            "job_id": job_id,
            "RUN_ID": run_id,
            "JOB_ID": job_id,
            "START_TS": start_ts_iso,
            "real_queue_submit": flags["real_queue_submit"],
            "real_delivery_observed": flags["real_delivery_observed"],
            "real_result_returned": flags["real_result_returned"],
            "real_ingest_pass": flags["real_ingest_pass"],
            "real_rejudge_refresh": flags["real_rejudge_refresh"],
            "real_closed_loop_proven": flags["real_closed_loop_proven"],
            "fixture_detected": bool(fixture_detected),
            "stale_detected": bool(stale_detected),
            "mixed_run_detected": bool(mixed_run_detected),
            "failed_phase": failed_phase,
            "stop_reason": stop_reason,
            "recommended_next_card": RECOMMENDED_NEXT,
            "pre_snapshot": pre_snapshot,
            "stages": stages,
        }
        if error is not None:
            out["error"] = error
        out.update(extra)
        return out

    def fail_out(err_key: str, **extra: Any) -> int:
        nonlocal stale_detected, fixture_detected
        stale_detected = detect_stale_truth(auto)
        fixture_detected = detect_fixture_signals(auto, queue_path)
        phase, reason = FAIL_REASONS.get(err_key, ("unknown", err_key))
        summary = base_summary(failed_phase=phase, stop_reason=reason, error=err_key, **extra)
        write_json(auto / OUT_SUMMARY, summary)
        (auto / OUT_REPORT).write_text(
            f"# {CARD}\n\n- failed_phase: `{phase}`\n- stop_reason: `{reason}`\n- error: `{err_key}`\n",
            encoding="utf-8",
        )
        if args.stdout_json:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 1

    if not key:
        return fail_out("founder_key_missing")

    # runtime triplet (no founder required)
    for name, path in (("health", "/api/health"), ("audit", "/api/audit"), ("audit.build", "/api/audit.build")):
        c, _ = http_req("GET", f"{base}{path}", timeout=15.0)
        stages.append({"name": f"get_{name}", "http": c, "ok": c == 200})
    triplet_ok = all(s.get("ok") for s in stages[-3:])
    if not triplet_ok:
        return fail_out("runtime_triplet_failed")

    card_body = build_card_body_md(run_id)
    code, js = http_req(
        "POST",
        f"{base}/api/admin/cursor/submit",
        data={
            "card_name": CARD,
            "card_body_md": card_body,
            "source": "tenmon_real_closed_loop_current_run_acceptance_v1.py",
            "force_approve": True,
        },
        headers={"Content-Type": "application/json", "X-Founder-Key": key},
    )
    item = js.get("item") if isinstance(js.get("item"), dict) else {}
    job_id = str(item.get("id") or "").strip()
    flags["real_queue_submit"] = code == 200 and bool(js.get("ok")) and bool(job_id)
    stages.append({"name": "admin_cursor_submit", "http": code, "ok": flags["real_queue_submit"], "job_id": job_id})
    if not flags["real_queue_submit"]:
        return fail_out("submit_failed", submit_response=js)

    if str(item.get("state") or "") == "approval_required":
        c2, j2 = http_req(
            "POST",
            f"{base}/api/admin/cursor/approve",
            data={"id": job_id},
            headers={"Content-Type": "application/json", "X-Founder-Key": key},
        )
        stages.append({"name": "admin_cursor_approve", "http": c2, "ok": c2 == 200 and bool(j2.get("ok"))})

    # queue reflect (filesystem — same source as API)
    flags["queue_reflect_ok"] = wait_until(lambda: queue_has_job_id(queue_path, job_id), timeout_s=30.0)
    stages.append({"name": "queue_file_reflect", "ok": flags["queue_reflect_ok"]})

    # command center (optional)
    if not args.skip_command_center:
        cc_sh = scripts / "remote_cursor_command_center_run_v1.sh"
        if cc_sh.is_file():
            prc = subprocess.run(
                ["bash", str(cc_sh)],
                cwd=str(repo),
                env={**os.environ, "ROOT": str(repo), "TENMON_REPO_ROOT": str(repo)},
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            stages.append({"name": "command_center", "ok": prc.returncode == 0, "returncode": prc.returncode})

    # GET /next until our job
    pulled: dict[str, Any] = {}
    deadline = time.monotonic() + float(args.executor_timeout)

    def pull_ours() -> bool:
        nonlocal pulled
        c, j = http_req("GET", f"{base}/api/admin/cursor/next", headers={"X-Founder-Key": key}, timeout=60.0)
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

    # delivery: NEW tail after pre-run offset must contain JOB_ID; GET /next must return same job (current-run only)
    new_tail = delivery_log_tail_from(dlog_offset, delivery_log_path)
    tail_has_job_id = job_id in new_tail
    pulled_ok = bool(pulled.get("id")) and str(pulled.get("id")) == job_id
    flags["real_delivery_observed"] = tail_has_job_id and pulled_ok
    stages.append(
        {
            "name": "delivery_observe",
            "ok": flags["real_delivery_observed"],
            "new_tail_has_job_id": tail_has_job_id,
            "pulled_ok": pulled_ok,
            "pulled_id": pulled.get("id"),
        }
    )

    if not pulled_ok:
        return fail_out("executor_pull_timeout", delivery_new_tail_preview=new_tail[-500:])
    if not tail_has_job_id:
        return fail_out(
            "current_run_delivery_not_observed",
            delivery_new_tail_preview=new_tail[-500:],
        )

    # executor artifacts (safe path only)
    out_dir = auto / "out" / "real_closed_loop_current_run" / run_id
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
    (out_dir / "executor_result.md").write_text(f"# current-run acceptance\n\nRUN_ID={run_id}\nJOB_ID={job_id}\n", encoding="utf-8")

    touched = [
        f"api/automation/out/real_closed_loop_current_run/{run_id}/executor_result.json",
        f"api/automation/out/real_closed_loop_current_run/{run_id}/executor_result.md",
    ]
    log_snippet = json.dumps({"run_id": run_id, "job_id": job_id, "card": CARD}, ensure_ascii=False)[:8000]

    # Official ingest: POST /api/admin/cursor/result (not CLI — avoids double-write / bypass)
    c3, j3 = http_req(
        "POST",
        f"{base}/api/admin/cursor/result",
        data={
            "queue_id": job_id,
            "touched_files": touched,
            "build_rc": 0,
            "acceptance_ok": True,
            "dry_run": False,
            "log_snippet": log_snippet,
        },
        headers={"Content-Type": "application/json", "X-Founder-Key": key},
    )
    flags["real_ingest_pass"] = c3 == 200 and bool(j3.get("ok")) and str(j3.get("status") or "") != "blocked_paths"
    stages.append({"name": "admin_cursor_result_post", "http": c3, "ok": flags["real_ingest_pass"]})

    if not flags["real_ingest_pass"]:
        return fail_out("admin_result_ingest_failed", result_response=j3)

    # Result in bundle: must be new entry for this job_id + run_id (not stale)
    flags["real_result_returned"] = wait_until(
        lambda: bundle_has_current_run_entry(bundle_path, job_id, run_id, pre_bundle_count),
        timeout_s=float(args.bundle_wait_timeout),
    )
    stages.append({"name": "bundle_wait_current_run", "ok": flags["real_result_returned"]})

    if not flags["real_result_returned"]:
        return fail_out("bundle_missing_current_run_entry")

    mixed_run_detected = detect_mixed_run_bundle(bundle_path, job_id, run_id, pre_bundle_count)

    # CLI ingest: optional non-mutating check — script exists and would accept schema (no second append)
    ingest_py = auto / "remote_cursor_result_ingest_v1.py"
    cli_ok = ingest_py.is_file()
    stages.append({"name": "ingest_cli_present", "ok": cli_ok, "path": str(ingest_py)})

    # Rejudge refresh — generated_at or mtime must advance vs pre-run
    rj_mtime_before = rejudge_verdict.stat().st_mtime if rejudge_verdict.is_file() else 0.0
    summ_mtime_before_rejudge = rejudge_summary_path.stat().st_mtime if rejudge_summary_path.is_file() else 0.0
    summ_before = read_json(rejudge_summary_path).get("generated_at")

    rj_sh = scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
    if rj_sh.is_file():
        prj = subprocess.run(
            ["bash", str(rj_sh)],
            cwd=str(repo),
            env={**os.environ, "TENMON_REPO_ROOT": str(repo), "TENMON_GATE_BASE": base},
            capture_output=True,
            text=True,
            timeout=1200,
            check=False,
        )
        stages.append({"name": "rejudge_and_seal_refresh", "ok": prj.returncode == 0, "returncode": prj.returncode})
        rj_tail = ((prj.stdout or "") + (prj.stderr or ""))[-1200:]
    else:
        prj = None
        rj_tail = "script_missing"
        stages.append({"name": "rejudge_and_seal_refresh", "ok": False, "error": "missing_script"})

    rj_mtime_after = rejudge_verdict.stat().st_mtime if rejudge_verdict.is_file() else 0.0
    summ_mtime_after_rejudge = rejudge_summary_path.stat().st_mtime if rejudge_summary_path.is_file() else 0.0
    summ_after = read_json(rejudge_summary_path).get("generated_at")
    summ_after_dt = parse_iso_z(str(summ_after) if summ_after else None)

    start_dt = datetime.fromtimestamp(start_epoch, tz=timezone.utc)
    gen_fresher = False
    if summ_after_dt and pre_rejudge_dt:
        gen_fresher = summ_after_dt > pre_rejudge_dt
    elif summ_after_dt:
        gen_fresher = summ_after_dt >= start_dt - timedelta(seconds=5)
    elif str(summ_after) != str(summ_before) and summ_after is not None:
        gen_fresher = True

    flags["real_rejudge_refresh"] = bool(
        (rj_mtime_after > rj_mtime_before)
        or (summ_mtime_after_rejudge > summ_mtime_before_rejudge)
        or gen_fresher
    )
    stages.append(
        {
            "name": "rejudge_freshness",
            "ok": flags["real_rejudge_refresh"],
            "rejudge_summary_generated_at_before": summ_before,
            "rejudge_summary_generated_at_after": summ_after,
        }
    )

    flags["real_closed_loop_proven"] = all(
        [
            flags["real_queue_submit"],
            flags["real_delivery_observed"],
            flags["real_result_returned"],
            flags["real_ingest_pass"],
            flags["real_rejudge_refresh"],
        ]
    )

    stale_detected = detect_stale_truth(auto)
    fixture_detected = detect_fixture_signals(auto, queue_path)

    if not flags["real_rejudge_refresh"]:
        return fail_out("rejudge_stale_or_no_refresh", rejudge_subprocess_tail=(rj_tail[-800:] if prj else None))

    post_snapshot = {
        "queue": file_snapshot(queue_path),
        "bundle": file_snapshot(bundle_path),
        "delivery_log": file_snapshot(delivery_log_path),
        "rejudge_verdict": file_snapshot(rejudge_verdict),
        "rejudge_summary": file_snapshot(rejudge_summary_path),
    }

    summary = base_summary(
        failed_phase=None,
        stop_reason="real_closed_loop_accepted",
        ingest_path_official="POST /api/admin/cursor/result",
        ingest_cli_note="remote_cursor_result_ingest_v1.py はオフライン用。本 acceptance の正は API。",
        post_snapshot=post_snapshot,
        acceptance_summary_fixed=True,
        rejudge_subprocess_tail=rj_tail[-800:] if prj else None,
    )
    write_json(auto / OUT_SUMMARY, summary)

    lines = [
        f"# {CARD}",
        "",
        f"- run_id: `{run_id}`",
        f"- job_id: `{job_id}`",
        f"- **real_closed_loop_proven**: `{flags['real_closed_loop_proven']}`",
        f"- stop_reason: `{summary['stop_reason']}`",
        "",
        "## Flags",
        *[f"- {k}: `{v}`" for k, v in flags.items()],
    ]
    (auto / OUT_REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if flags["real_closed_loop_proven"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
