#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA_FULL_AUTONOMY_SUPERVISOR_CURSOR_AUTO_V1

封印基準の autonomy 契約群を束ね、1 loop = 1 card で
観測 → multi_ai_orchestra（Gemini/Claude/GPT 層）→ GPT 裁定ゲート →（任意）Cursor →
result return 検証 → multi_ai_autonomy_judge → VPS 観測までを fail-closed で監督する。

- 前提 JSON/PY 欠落・dryrun 本番ゲート未達は即 HOLD（--bypass-dryrun-gate / SKIP で緩和可）。
- Claude/Gemini の raw 採用はせず、execution_authority（GPT/天聞）が無い限り Cursor に進まない。
- overnight 本番は段階投入（手動監視 → dry-run → 半日）。未登録カードは allowlist で deny。
- 実行能力の真偽は api/automation/execution_capability_audit_report_v1.json / .md を正とする（憶測禁止）。
- --orchestra-no-dry-run 時は GPT のみ OpenAI 実 HTTP（OPENAI_API_KEY 必須）。Claude/Gemini 実装は別カード。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import multi_ai_autonomy_judge_v1 as judge_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod
import schedule_state_observer_v1 as obs_mod

CARD = "TENMON_MULTI_AI_ORCHESTRA_FULL_AUTONOMY_SUPERVISOR_CURSOR_AUTO_V1"
RUNTIME_FN = "multi_ai_autonomy_runtime_state.json"
PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
STOP_FN = "multi_ai_autonomy_stop_conditions_v1.json"
RETRY_FN = "multi_ai_autonomy_retry_policy_v1.json"
QUEUE_FN = "multi_ai_autonomy_queue.json"
FAILURE_FN = "multi_ai_autonomy_last_failure_bundle.json"
TRIAGE_FN = "autonomy_triage.json"
DRYRUN_REPORT_FN = "multi_ai_autonomy_dryrun_report_v1.json"
EXEC_HISTORY_FN = "multi_ai_autonomy_execution_history.json"

PREREQUISITE_JSON_FILES = [
    "multi_ai_autonomy_guardrail_contract_v1.json",
    "multi_ai_autonomy_verdict_schema_v1.json",
    "multi_ai_autonomy_failure_bundle_schema_v1.json",
    "multi_ai_autonomy_hold_policy_v1.json",
    "multi_ai_autonomy_allowlist_v1.json",
    "multi_ai_autonomy_denylist_v1.json",
    "multi_ai_autonomy_preflight_result_v1.json",
    "multi_ai_autonomy_result_return_contract_v1.json",
    "multi_ai_autonomy_acceptance_gate_v1.json",
    "multi_ai_autonomy_last_judgement.json",
    "multi_ai_autonomy_dryrun_report_v1.json",
]
PREREQUISITE_PY_FILES = [
    "multi_ai_autonomy_preflight_v1.py",
    "multi_ai_autonomy_judge_v1.py",
    "multi_ai_autonomy_dryrun_harness_v1.py",
]

ORCH_SCRIPT = "multi_ai_orchestra_executor_v1.py"
BRIDGE_SCRIPT = "cursor_executor_bridge_v1.py"
SCHED_SCRIPT = "schedule_executor_orchestrator_v1.py"


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


def _log(log_dir: Path, msg: str) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    with (log_dir / "supervisor.log").open("a", encoding="utf-8") as f:
        f.write(f"{_utc_iso()} {msg}\n")


def _audit(base_url: str | None) -> dict[str, Any]:
    out: dict[str, Any] = {"skipped": True, "ok": None, "http_code": None, "error": None}
    if not base_url:
        return out
    url = base_url.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            code = resp.getcode()
            body = resp.read(8000).decode("utf-8", errors="replace")
        try:
            j = json.loads(body)
            ok = bool(j.get("ok")) if isinstance(j, dict) else 200 <= code < 300
        except Exception:
            ok = 200 <= code < 300
        out = {"skipped": False, "ok": ok, "http_code": code, "error": None, "url": url}
    except urllib.error.HTTPError as e:
        out = {"skipped": False, "ok": False, "http_code": e.code, "error": str(e), "url": url}
    except Exception as e:
        out = {"skipped": False, "ok": False, "http_code": None, "error": str(e), "url": url}
    return out


def _dirty_count(repo: Path) -> int:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
        )
        return len([x for x in (r.stdout or "").splitlines() if x.strip()])
    except Exception:
        return -1


def _porcelain_paths(repo: Path) -> set[str]:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception:
        return set()
    out: set[str] = set()
    for line in (r.stdout or "").splitlines():
        line = line.rstrip()
        if len(line) < 4:
            continue
        rest = line[3:].strip()
        if " -> " in rest:
            rest = rest.split(" -> ", 1)[-1].strip()
        if rest:
            out.add(rest)
    return out


def _triage_tier_map(triage: dict[str, Any]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in triage.get("cards") or []:
        if isinstance(e, dict) and e.get("card_id") and e.get("automation_tier"):
            m[str(e["card_id"])] = str(e["automation_tier"])
    return m


def _path_matches_prefix(path: str, prefixes: list[str]) -> bool:
    p = path.replace("\\", "/")
    for pre in prefixes:
        if pre and (p == pre or p.startswith(pre)):
            return True
    return False


def _path_matches_broad(path: str, subs: list[str]) -> bool:
    p = path.replace("\\", "/")
    for s in subs:
        if s and s in p:
            return True
    return False


def _eligible_cards(queue: dict[str, Any], triage: dict[str, Any]) -> list[str]:
    require = str(queue.get("require_tier") or "A_full_auto_safe")
    order = queue.get("card_order") if isinstance(queue.get("card_order"), list) else []
    tm = _triage_tier_map(triage)
    out: list[str] = []
    for c in order:
        if not isinstance(c, str) or not c.startswith("TENMON_"):
            continue
        if tm.get(c) == require:
            out.append(c)
    return out


def _dequeue_eligible_slot(
    queue: dict[str, Any],
    triage: dict[str, Any],
    qc: int,
    executed_card: str,
) -> tuple[dict[str, Any], bool]:
    """
    card_order から、eligible 上の qc 番目（tier 整合）のスロットを 1 枚除去する。
    PASS 後に cursor を進めるだけだと card_order 残存で exhausted 誤判定になるため。
    """
    require = str(queue.get("require_tier") or "A_full_auto_safe")
    order = list(queue.get("card_order") if isinstance(queue.get("card_order"), list) else [])
    tm = _triage_tier_map(triage)
    target_j: int | None = None
    elig_i = 0
    for j, c in enumerate(order):
        if not isinstance(c, str) or not c.startswith("TENMON_"):
            continue
        if tm.get(c) != require:
            continue
        if elig_i == qc:
            target_j = j
            break
        elig_i += 1
    if target_j is None or order[target_j] != executed_card:
        return dict(queue), False
    new_order = order[:target_j] + order[target_j + 1 :]
    q = dict(queue)
    q["card_order"] = new_order
    q["updated_at"] = _utc_iso()
    return q, True


def _forbidden_targets(adopted: dict[str, Any], forbidden: list[str]) -> tuple[bool, str]:
    targets = adopted.get("target_paths") if isinstance(adopted.get("target_paths"), list) else []
    for t in targets:
        u = str(t).replace("\\", "/")
        for f in forbidden:
            if f and f in u:
                return True, f"forbidden_target_substring:{f}:{u}"
    return False, ""


def _contradiction_hold(evidence: Path, stop: dict[str, Any]) -> tuple[bool, str]:
    if not stop.get("enforce_ai_layer_consistency", True):
        return False, ""
    gpt = _read_json(evidence / "gpt_arbitration_normalized.json")
    auth = gpt.get("execution_authority") if isinstance(gpt.get("execution_authority"), dict) else {}
    if auth.get("contradictions_unresolved") is True:
        return True, "gpt_contradictions_unresolved"
    claude = _read_json(evidence / "claude_audit_normalized.json")
    for r in claude.get("design_risks") or []:
        if not isinstance(r, dict):
            continue
        cat = str(r.get("category") or "").lower()
        sev = str(r.get("severity") or "").lower()
        if cat == "contradiction" and sev in ("high", "medium", "med"):
            return True, "claude_contradiction_unresolved"
    return False, ""


def _orchestra_verdict_from_evidence(evidence: Path) -> tuple[str, str]:
    fb = _read_json(evidence / "failure_bundle.json")
    if fb.get("verdict") == "HOLD":
        return "HOLD", str(fb.get("hold_reason") or "failure_bundle_hold")
    if fb.get("verdict") == "FAIL":
        return "FAIL", str(fb.get("reason") or "failure_bundle_fail")
    acc = _read_json(evidence / "acceptance_bundle.json")
    v = str(acc.get("verdict") or "")
    if v == "FAIL":
        return "FAIL", str(acc.get("reason") or "acceptance_fail")
    return "PASS", "ok"


def _check_supervisor_prerequisites(auto_dir: Path) -> tuple[bool, str]:
    for fn in PREREQUISITE_JSON_FILES:
        p = auto_dir / fn
        if not p.is_file():
            return False, f"guardrail_missing:{fn}"
        try:
            json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            return False, f"prerequisite_parse_error:{fn}:{e}"
    for fn in PREREQUISITE_PY_FILES:
        if not (auto_dir / fn).is_file():
            return False, f"guardrail_missing:{fn}"
    return True, "ok"


def _check_dryrun_production_gate(auto_dir: Path, bypass: bool) -> tuple[bool, str]:
    if bypass or os.environ.get("TENMON_SUPERVISOR_BYPASS_DRYRUN_GATE", "").strip() == "1":
        return True, "bypassed"
    dr = _read_json(auto_dir / DRYRUN_REPORT_FN)
    if dr.get("full_autonomy_supervisor_ready") is True:
        return True, "dryrun_report_ready"
    return False, "dryrun_gate_not_ready_run_harness_strict_preflight"


def _claude_high_severity_hold(evidence_dir: Path) -> tuple[bool, str]:
    c = _read_json(evidence_dir / "claude_audit_normalized.json")
    for r in c.get("design_risks") or []:
        if isinstance(r, dict) and str(r.get("severity") or "").lower() == "high":
            return True, "claude_severity_high"
    return False, ""


def _gpt_execution_gate(evidence_dir: Path) -> tuple[bool, str]:
    auth = _read_json(evidence_dir / "execution_authority.json")
    if auth.get("authorized") is not True:
        return False, "gpt_execution_not_authorized"
    arb = str(auth.get("arbiter") or "").lower()
    if "gpt" not in arb and "tenmon" not in arb and "orchestra" not in arb:
        return False, "gpt_arbiter_not_attested"
    apb = auth.get("approved_by")
    if apb is not None and str(apb).strip():
        aps = str(apb).lower()
        if "gpt" not in aps and "tenmon" not in aps:
            return False, "approved_by_not_gpt_tenmon"
    return True, "ok"


def _load_cursor_result_return(auto_dir: Path, lr: dict[str, Any]) -> tuple[dict[str, Any] | None, Path | None, str]:
    evp = lr.get("evidence_bundle_path")
    if not evp:
        return None, None, "cursor_evidence_bundle_path_missing"
    p = Path(str(evp)) / "multi_ai_autonomy_result_return.json"
    if not p.is_file():
        return None, p, "cursor_result_return_missing"
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return None, p, "cursor_result_return_not_object"
        return raw, p, "ok"
    except Exception as e:
        return None, p, f"cursor_result_return_parse_error:{e}"


def _strict_result_return_for_pass(
    rr: dict[str, Any],
    contract: dict[str, Any],
    path: Path,
) -> tuple[bool, str]:
    ok_v, errs = judge_mod.validate_result_return_payload(rr, contract)
    if not ok_v:
        return False, "contract:" + ",".join(errs)
    st = str(rr.get("status") or "").upper()
    if st != "PASS":
        return False, f"result_return_status_not_pass:{st}"
    summ = str(rr.get("summary") or "").strip()
    if len(summ) < 4:
        return False, "acceptance_ambiguous_summary"
    if "diff_stat" not in rr:
        return False, "diff_stat_key_missing"
    if not isinstance(rr.get("files_changed"), list):
        return False, "files_changed_not_list"
    lp = rr.get("result_log_path")
    if not lp:
        return False, "result_log_path_missing"
    if not Path(str(lp)).is_file():
        return False, "result_log_path_not_file"
    return True, "ok"


def _append_execution_history(auto_dir: Path, entry: dict[str, Any]) -> None:
    p = auto_dir / EXEC_HISTORY_FN
    hist = _read_json(p)
    if hist.get("schema") != "MULTI_AI_AUTONOMY_EXECUTION_HISTORY_V1":
        hist = {"schema": "MULTI_AI_AUTONOMY_EXECUTION_HISTORY_V1", "entries": []}
    ent = hist.get("entries")
    if not isinstance(ent, list):
        ent = []
    entry = dict(entry)
    entry.setdefault("at", _utc_iso())
    ent.append(entry)
    hist["entries"] = ent[-500:]
    _write_json(p, hist)


def _write_runtime(
    path: Path,
    *,
    status: str,
    current_card: str,
    current_phase: str,
    loop_count: int,
    last_result: str,
    last_evidence_dir: str,
    last_failure_bundle: str = "",
    last_hold_reason: str = "",
) -> None:
    _write_json(
        path,
        {
            "schema": "MULTI_AI_AUTONOMY_RUNTIME_STATE_V1",
            "status": status,
            "current_card": current_card,
            "current_phase": current_phase,
            "loop_count": loop_count,
            "last_result": last_result,
            "last_evidence_dir": last_evidence_dir,
            "last_failure_bundle": last_failure_bundle or "",
            "last_hold_reason": last_hold_reason or "",
            "updated_at": _utc_iso(),
        },
    )


def run_supervisor(
    *,
    auto_dir: Path,
    base_url: str | None,
    max_loops_override: int | None,
    skip_npm: bool,
    orchestra_dry_run: bool,
    orchestra_probe_vps: bool,
    cursor_dry_run: bool,
    cursor_poll_timeout: int,
    skip_preflight: bool,
    expected_head: str | None,
    bypass_dryrun_gate: bool,
) -> int:
    repo = _repo_root(auto_dir)
    api_dir = repo / "api"
    stop = _read_json(auto_dir / STOP_FN)
    retry = _read_json(auto_dir / RETRY_FN)
    queue = _read_json(auto_dir / QUEUE_FN)
    triage_path = auto_dir / str(queue.get("triage_file") or TRIAGE_FN)
    triage = _read_json(triage_path)

    max_loops = int(max_loops_override or stop.get("max_supervisor_loops") or 8)
    max_loops = max(1, min(max_loops, 64))
    wall_max = int(stop.get("max_wall_clock_seconds") or 0)
    t0 = time.time()

    dirty_cum = int(stop.get("dirty_cumulative_abort_threshold") or 80)
    dirty_loop = int(stop.get("dirty_per_loop_abort_threshold") or 40)
    sens = [str(x) for x in (stop.get("sensitive_path_prefixes") or []) if x]
    route_prefs = [str(x) for x in (stop.get("route_contract_watch_prefixes") or []) if x]
    route_max = int(stop.get("route_contract_max_new_dirty_per_loop") or 6)
    broad_subs = [str(x) for x in (stop.get("broad_change_path_substrings") or []) if x]
    broad_max = int(stop.get("broad_change_max_new_matches_per_loop") or 3)
    forbidden = [str(x) for x in (stop.get("forbidden_path_substrings_auto_abort") or []) if x]

    pre_audit = bool(stop.get("pre_flight_audit_if_configured", True))
    audit_abort = bool(stop.get("audit_fail_aborts_supervisor", True))
    post_audit = bool(stop.get("post_phase_audit_fail_aborts", True))
    enable_cursor = bool(stop.get("enable_cursor_bridge_phase", False))
    enable_sched = bool(stop.get("enable_schedule_executor_step", False))
    probe_default = bool(stop.get("orchestra_probe_vps_default", False))

    orch_timeout = int(retry.get("timeout_orchestra_seconds") or 7200)
    cur_timeout = int(retry.get("timeout_cursor_bridge_seconds") or 3600)
    sched_timeout = int(retry.get("timeout_schedule_executor_seconds") or 7200)
    max_card_retry = int(retry.get("max_retries_same_card") or 1)
    abort_same_err = bool(retry.get("abort_on_consecutive_identical_error", True))

    ts = _utc_iso().replace(":", "").replace("-", "")[:13]
    sup_log = Path("/var/log/tenmon/multi_ai_autonomy_supervisor") / ts
    _log(sup_log, f"start max_loops={max_loops} orchestra_dry_run={orchestra_dry_run}")

    ok_pre, why_pre = _check_supervisor_prerequisites(auto_dir)
    if not ok_pre:
        _write_runtime(
            auto_dir / RUNTIME_FN,
            status="HOLD",
            current_card="",
            current_phase="prerequisites",
            loop_count=0,
            last_result="HOLD",
            last_evidence_dir=str(sup_log),
            last_hold_reason=why_pre,
        )
        prog_e = _read_json(auto_dir / PROGRESS_FN)
        prog_e["hold_reason"] = why_pre
        prog_e["last_result"] = "HOLD"
        prog_e["updated_at"] = _utc_iso()
        prog_e["supervisor_log_dir"] = str(sup_log)
        _write_json(auto_dir / PROGRESS_FN, prog_e)
        _write_json(
            auto_dir / FAILURE_FN,
            {
                "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                "verdict": "HOLD",
                "reason": why_pre,
                "generated_at": _utc_iso(),
            },
        )
        _log(sup_log, f"HOLD prerequisites {why_pre}")
        return 12

    dg_ok, dg_why = _check_dryrun_production_gate(auto_dir, bypass_dryrun_gate)
    if not dg_ok:
        _write_runtime(
            auto_dir / RUNTIME_FN,
            status="HOLD",
            current_card="",
            current_phase="dryrun_gate",
            loop_count=0,
            last_result="HOLD",
            last_evidence_dir=str(sup_log),
            last_hold_reason=dg_why,
        )
        prog0 = _read_json(auto_dir / PROGRESS_FN)
        prog0["hold_reason"] = dg_why
        prog0["last_result"] = "HOLD"
        prog0["updated_at"] = _utc_iso()
        prog0["supervisor_log_dir"] = str(sup_log)
        _write_json(auto_dir / PROGRESS_FN, prog0)
        _write_json(
            auto_dir / FAILURE_FN,
            {
                "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                "verdict": "HOLD",
                "reason": dg_why,
                "generated_at": _utc_iso(),
            },
        )
        _log(sup_log, f"HOLD dryrun_gate {dg_why}")
        return 13

    strict_loop_pf = bool(stop.get("strict_preflight_each_loop", False))

    progress = _read_json(auto_dir / PROGRESS_FN)
    progress.setdefault("retry_count_by_card", {})
    progress.setdefault("queue_cursor", 0)
    if not isinstance(progress["retry_count_by_card"], dict):
        progress["retry_count_by_card"] = {}

    initial_dirty = _dirty_count(repo)

    def _fail_bundle(obj: dict[str, Any]) -> None:
        obj["generated_at"] = _utc_iso()
        _write_json(auto_dir / FAILURE_FN, obj)
        snap = sup_log / "evidence_last_failure_bundle.json"
        try:
            shutil.copy2(auto_dir / FAILURE_FN, snap)
        except Exception:
            pass

    if not skip_preflight and os.environ.get("TENMON_MULTI_AI_AUTONOMY_SKIP_PREFLIGHT", "").strip() != "1":
        pr, prc = preflight_mod.run_preflight(
            auto_dir=auto_dir,
            base_url=base_url,
            expected_head=expected_head,
            allow_missing_expected_head=os.environ.get("TENMON_PREFLIGHT_ALLOW_MISSING_SEALED_HEAD", "").strip() == "1",
            allow_dirty_repo=os.environ.get("TENMON_PREFLIGHT_ALLOW_DIRTY_REPO", "").strip() == "1",
            allow_no_audit=os.environ.get("TENMON_PREFLIGHT_ALLOW_NO_AUDIT", "").strip() == "1",
            write_result=True,
        )
        if prc != 0:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="FAIL",
                current_card="",
                current_phase="preflight_gate",
                loop_count=0,
                last_result="FAIL",
                last_evidence_dir=str(sup_log),
            )
            progress["hold_reason"] = "preflight_failed"
            progress["last_result"] = "FAIL"
            progress["updated_at"] = _utc_iso()
            progress["supervisor_log_dir"] = str(sup_log)
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle(
                {
                    "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                    "verdict": "FAIL",
                    "reason": "preflight_gate",
                    "preflight_verdict": pr.get("verdict"),
                    "preflight_checks_failed": [c for c in (pr.get("checks") or []) if not c.get("ok")],
                },
            )
            _log(sup_log, "FAIL preflight_gate")
            return 11

    allow_map, deny_map = preflight_mod.load_allowlist_denylist(auto_dir)

    sched_cfg = _read_json(auto_dir / "schedule_executor_config_v1.json")

    for i in range(max_loops):
        if wall_max > 0 and (time.time() - t0) > wall_max:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card="",
                current_phase="wall_clock_exceeded",
                loop_count=i + 1,
                last_result="HOLD",
                last_evidence_dir=str(sup_log),
            )
            progress["hold_reason"] = "max_wall_clock_seconds"
            progress["supervisor_log_dir"] = str(sup_log)
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _log(sup_log, "HOLD wall_clock")
            return 0

        loop_n = i + 1
        queue = _read_json(auto_dir / QUEUE_FN)
        eligible = _eligible_cards(queue, triage)
        qc = int(progress.get("queue_cursor") or 0)
        raw_co = queue.get("card_order") if isinstance(queue.get("card_order"), list) else []
        queue_len = len([x for x in raw_co if isinstance(x, str) and str(x).strip()])
        exhausted_reason = ""
        residual_queue_detected = False
        if qc >= len(eligible) and eligible:
            residual_queue_detected = True
            exhausted_reason = "stale_queue_cursor_residual_eligible"
            progress["queue_cursor"] = 0
            qc = 0
        selected_for_diag = eligible[qc] if (eligible and qc < len(eligible)) else ""
        progress["supervisor_queue_diag"] = {
            "queue_len": queue_len,
            "queue_cursor": qc,
            "eligible_len": len(eligible),
            "selected_card": selected_for_diag,
            "exhausted_reason": exhausted_reason,
            "residual_queue_detected": residual_queue_detected,
        }
        progress["updated_at"] = _utc_iso()
        progress["supervisor_log_dir"] = str(sup_log)
        _write_json(auto_dir / PROGRESS_FN, progress)
        _log(
            sup_log,
            f"queue_diag queue_len={queue_len} queue_cursor={qc} eligible_len={len(eligible)} "
            f"selected_card={selected_for_diag} residual_queue_detected={1 if residual_queue_detected else 0} "
            f"exhausted_reason={exhausted_reason or 'none'}",
        )

        _write_runtime(
            auto_dir / RUNTIME_FN,
            status="RUNNING",
            current_card="",
            current_phase="observe",
            loop_count=loop_n,
            last_result="",
            last_evidence_dir="",
        )

        if not eligible:
            has_tenmon_in_order = any(
                isinstance(c, str) and c.strip().startswith("TENMON_") for c in raw_co
            )
            if not has_tenmon_in_order:
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="PASS",
                    current_card="",
                    current_phase="queue_exhausted",
                    loop_count=loop_n,
                    last_result="PASS_queue_exhausted",
                    last_evidence_dir=str(sup_log),
                )
                progress["hold_reason"] = None
                progress["last_result"] = "PASS_queue_exhausted"
                progress["updated_at"] = _utc_iso()
                progress["supervisor_log_dir"] = str(sup_log)
                _write_json(auto_dir / PROGRESS_FN, progress)
                _log(
                    sup_log,
                    "PASS queue exhausted (no_TENMON_cards_in_order) queue_len=0 eligible_len=0",
                )
                return 0
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card="",
                current_phase="queue_selection",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(sup_log),
            )
            progress["hold_reason"] = "no_eligible_A_tier_cards_in_queue"
            progress["last_result"] = "HOLD"
            progress["updated_at"] = _utc_iso()
            progress["supervisor_log_dir"] = str(sup_log)
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle(
                {
                    "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                    "verdict": "HOLD",
                    "reason": progress["hold_reason"],
                    "queue": queue,
                },
            )
            _log(sup_log, "HOLD no eligible (tier_mismatch_or_triage)")
            return 0

        if strict_loop_pf and not skip_preflight:
            lpr, lprc = preflight_mod.run_preflight(
                auto_dir=auto_dir,
                base_url=base_url,
                expected_head=expected_head,
                allow_missing_expected_head=False,
                allow_dirty_repo=False,
                allow_no_audit=not bool((base_url or "").strip()),
                write_result=True,
            )
            if lprc != 0:
                hr = "strict_preflight_each_loop_failed"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card="",
                    current_phase="preflight_loop_gate",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(sup_log),
                    last_hold_reason=hr,
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle(
                    {
                        "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                        "verdict": "HOLD",
                        "reason": hr,
                        "preflight": lpr,
                    },
                )
                _log(sup_log, hr)
                return 14

        card_id = eligible[qc]
        perm_ok, perm_why = preflight_mod.is_autonomy_card_permitted(card_id, allow_map, deny_map)
        if not perm_ok:
            hr = f"allowlist_gate:{perm_why}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="allowlist_gate",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(sup_log),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            progress["supervisor_log_dir"] = str(sup_log)
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            _log(sup_log, hr)
            return 0

        dirty_now = _dirty_count(repo)
        if initial_dirty >= 0 and dirty_now >= 0 and (dirty_now - initial_dirty) > dirty_cum:
            hr = f"dirty_cumulative {dirty_now}-{initial_dirty}>{dirty_cum}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="pre_loop_gates",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(sup_log),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            _log(sup_log, hr)
            return 4

        if pre_audit and base_url and audit_abort:
            au = _audit(base_url)
            if not au.get("skipped") and not au.get("ok"):
                hr = f"preflight_audit:{au.get('error') or au.get('http_code')}"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="pre_loop_gates",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(sup_log),
                )
                progress["hold_reason"] = hr
                progress["audit_status"] = au
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                _log(sup_log, hr)
                return 5

        paths_before = _porcelain_paths(repo)
        dirty_before = dirty_now

        evidence_root = Path("/var/log/tenmon/multi_ai_autonomy")
        evidence_root.mkdir(parents=True, exist_ok=True)
        issue = (
            f"[{CARD}] target_card={card_id} tier=A_full_auto_safe. "
            f"1 loop 1 card. No canon/scripture/persona/chat meaning change; automation-only minimal diff."
        )

        _write_runtime(
            auto_dir / RUNTIME_FN,
            status="RUNNING",
            current_card=card_id,
            current_phase="multi_ai_orchestra",
            loop_count=loop_n,
            last_result="",
            last_evidence_dir="",
        )
        _log(sup_log, f"orchestra card={card_id}")

        orch_py = auto_dir / ORCH_SCRIPT
        if not orch_py.is_file():
            hr = f"missing_script:{ORCH_SCRIPT}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="FAIL",
                current_card=card_id,
                current_phase="multi_ai_orchestra",
                loop_count=loop_n,
                last_result="FAIL",
                last_evidence_dir=str(evidence_root),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": hr})
            return 2

        ocmd = [
            sys.executable,
            str(orch_py),
            "--issue",
            issue,
            "--evidence-base",
            str(evidence_root),
        ]
        if orchestra_dry_run:
            ocmd.append("--dry-run")
        else:
            ocmd.append("--no-dry-run")
        if orchestra_probe_vps or probe_default:
            ocmd.append("--probe-vps")
        if base_url:
            ocmd.extend(["--vps-base", base_url.rstrip("/")])

        try:
            r_orch = subprocess.run(
                ocmd,
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=orch_timeout,
            )
        except subprocess.TimeoutExpired:
            hr = "orchestra_timeout"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="multi_ai_orchestra",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_root),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            _log(sup_log, hr)
            return 6

        evidence_dir: Path | None = None
        last_line = (r_orch.stdout or "").strip().splitlines()[-1] if r_orch.stdout else ""
        try:
            parsed = json.loads(last_line)
            if isinstance(parsed, dict) and parsed.get("evidence_dir"):
                evidence_dir = Path(str(parsed["evidence_dir"]))
        except Exception:
            evidence_dir = None
        if evidence_dir is None or not evidence_dir.is_dir():
            candidates = [p for p in evidence_root.iterdir() if p.is_dir()]
            candidates.sort(key=lambda p: p.stat().st_mtime_ns, reverse=True)
            evidence_dir = candidates[0] if candidates else evidence_root

        if r_orch.stdout:
            (sup_log / f"orchestra_L{loop_n}.stdout.log").write_text(r_orch.stdout[-24000:], encoding="utf-8")
        if r_orch.stderr:
            (sup_log / f"orchestra_L{loop_n}.stderr.log").write_text(r_orch.stderr[-24000:], encoding="utf-8")

        sig_orch = f"orch_rc={r_orch.returncode}"
        err_sig = f"{card_id}:{sig_orch}"

        if r_orch.returncode == 2:
            fb = _read_json(evidence_dir / "failure_bundle.json")
            hr = str(fb.get("hold_reason") or "orchestra_hold")
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="multi_ai_orchestra",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["last_orchestra_evidence"] = str(evidence_dir)
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr, "evidence": str(evidence_dir)})
            _log(sup_log, f"HOLD orchestra {hr}")
            return 0

        if r_orch.returncode == 1:
            if (
                int(progress["retry_count_by_card"].get(card_id, 0) or 0) < max_card_retry
            ):
                progress["retry_count_by_card"][card_id] = int(progress["retry_count_by_card"].get(card_id, 0) or 0) + 1
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _log(sup_log, f"retry orchestra card={card_id}")
                continue
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="FAIL",
                current_card=card_id,
                current_phase="multi_ai_orchestra",
                loop_count=loop_n,
                last_result="FAIL",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = "orchestra_fail_exhausted_retries"
            progress["last_orchestra_evidence"] = str(evidence_dir)
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": "orchestra_rc_1", "evidence": str(evidence_dir)})
            return 3

        if r_orch.returncode not in (0,):
            if abort_same_err and progress.get("last_error_signature") == err_sig:
                hr = f"consecutive_same_error:{err_sig}"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="multi_ai_orchestra",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["last_error_signature"] = err_sig
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 7
            progress["last_error_signature"] = err_sig
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": f"orchestra_rc_{r_orch.returncode}"})
            return 3

        ov, ow = _orchestra_verdict_from_evidence(evidence_dir)
        if ov != "PASS":
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD" if ov == "HOLD" else "FAIL",
                current_card=card_id,
                current_phase="multi_ai_orchestra",
                loop_count=loop_n,
                last_result=ov,
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = ow
            progress["last_orchestra_evidence"] = str(evidence_dir)
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle(
                {
                    "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
                    "verdict": ov,
                    "reason": ow,
                    "evidence": str(evidence_dir),
                },
            )
            _log(sup_log, f"{ov} evidence_verdict {ow}")
            return 0 if ov == "HOLD" else 3

        adopted = _read_json(evidence_dir / "adopted_plan.json")
        fb_hit, fb_why = _forbidden_targets(adopted, forbidden)
        if fb_hit:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="forbidden_scope_gate",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = fb_why
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": fb_why})
            return 0

        ch, ch_why = _contradiction_hold(evidence_dir, stop)
        if ch:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="ai_consistency_gate",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = ch_why
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": ch_why})
            return 0

        ch_hi, ch_hi_why = _claude_high_severity_hold(evidence_dir)
        if ch_hi:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="claude_severity_gate",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
                last_hold_reason=ch_hi_why,
            )
            progress["hold_reason"] = ch_hi_why
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": ch_hi_why})
            return 0

        gpt_ok, gpt_why = _gpt_execution_gate(evidence_dir)
        if not gpt_ok:
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="gpt_arbitration_gate",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
                last_hold_reason=gpt_why,
            )
            progress["hold_reason"] = gpt_why
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": gpt_why})
            return 0

        synth_md = evidence_dir / "synthesized_card.md"
        if enable_cursor:
            if not synth_md.is_file():
                hr = "missing_synthesized_card_md"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="cursor_bridge",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 0

            bridge = auto_dir / BRIDGE_SCRIPT
            if not bridge.is_file():
                hr = f"missing_script:{BRIDGE_SCRIPT}"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="FAIL",
                    current_card=card_id,
                    current_phase="cursor_bridge",
                    loop_count=loop_n,
                    last_result="FAIL",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": hr})
                return 2

            bridge_card = f"{card_id}_MULTI_AI_SYNTH"
            bcmd = [
                sys.executable,
                str(bridge),
                "--auto-dir",
                str(auto_dir),
                "--repo-root",
                str(repo),
                "--card-id",
                bridge_card,
                "--card-body-file",
                str(synth_md),
                "--poll-timeout",
                str(cursor_poll_timeout),
                "--fill-observation",
            ]
            if cursor_dry_run:
                bcmd.append("--dry-run")

            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="RUNNING",
                current_card=card_id,
                current_phase="cursor_bridge",
                loop_count=loop_n,
                last_result="",
                last_evidence_dir=str(evidence_dir),
            )
            try:
                r_br = subprocess.run(
                    bcmd,
                    cwd=str(repo),
                    capture_output=True,
                    text=True,
                    timeout=cur_timeout,
                )
            except subprocess.TimeoutExpired:
                hr = "cursor_bridge_timeout"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="cursor_bridge",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 6

            if r_br.stdout:
                (sup_log / f"bridge_L{loop_n}.stdout.log").write_text(r_br.stdout[-12000:], encoding="utf-8")
            lr_path = auto_dir / "cursor_executor_last_result.json"
            lr = _read_json(lr_path)
            fv = str(lr.get("final_verdict") or lr.get("status") or "")
            if fv == "HOLD" or r_br.returncode not in (0,):
                hr = str(lr.get("summary") or "cursor_bridge_hold_or_nonzero")
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="cursor_bridge",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["last_cursor_evidence"] = str(lr.get("evidence_bundle_path") or "")
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 0
            if fv == "FAIL":
                hr = str(lr.get("summary") or "cursor_bridge_fail")
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="FAIL",
                    current_card=card_id,
                    current_phase="cursor_bridge",
                    loop_count=loop_n,
                    last_result="FAIL",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": hr})
                return 3
            progress["last_cursor_evidence"] = str(lr.get("evidence_bundle_path") or "")

            if not cursor_dry_run:
                lr2 = _read_json(auto_dir / "cursor_executor_last_result.json")
                rr_d, rr_path, rr_why = _load_cursor_result_return(auto_dir, lr2)
                if rr_d is None:
                    hr = f"cursor_result_return_gate:{rr_why}"
                    _write_runtime(
                        auto_dir / RUNTIME_FN,
                        status="HOLD",
                        current_card=card_id,
                        current_phase="cursor_result_return",
                        loop_count=loop_n,
                        last_result="HOLD",
                        last_evidence_dir=str(evidence_dir),
                        last_hold_reason=hr,
                    )
                    progress["hold_reason"] = hr
                    progress["updated_at"] = _utc_iso()
                    _write_json(auto_dir / PROGRESS_FN, progress)
                    _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                    return 0
                contract_rr = judge_mod.load_contract(auto_dir)
                sr_ok, sr_why = _strict_result_return_for_pass(rr_d, contract_rr, rr_path)
                if not sr_ok:
                    hr = f"cursor_result_return_strict:{sr_why}"
                    _write_runtime(
                        auto_dir / RUNTIME_FN,
                        status="HOLD",
                        current_card=card_id,
                        current_phase="cursor_result_return",
                        loop_count=loop_n,
                        last_result="HOLD",
                        last_evidence_dir=str(evidence_dir),
                        last_hold_reason=hr,
                    )
                    progress["hold_reason"] = hr
                    progress["updated_at"] = _utc_iso()
                    _write_json(auto_dir / PROGRESS_FN, progress)
                    _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                    return 0

        sched_log = ""
        if enable_sched:
            sp = auto_dir / SCHED_SCRIPT
            if not sp.is_file():
                hr = f"missing_script:{SCHED_SCRIPT}"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="FAIL",
                    current_card=card_id,
                    current_phase="schedule_executor",
                    loop_count=loop_n,
                    last_result="FAIL",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": hr})
                return 2
            scmd = [sys.executable, str(sp), "--auto-dir", str(auto_dir)]
            if base_url:
                scmd.extend(["--api-base-url", base_url])
            if skip_npm:
                scmd.append("--skip-npm-after-script")
            try:
                r_sc = subprocess.run(
                    scmd,
                    cwd=str(repo),
                    capture_output=True,
                    text=True,
                    timeout=sched_timeout,
                )
            except subprocess.TimeoutExpired:
                hr = "schedule_executor_timeout"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="schedule_executor",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = hr
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 6
            sched_log = (r_sc.stdout or "")[-8000:]
            if r_sc.returncode not in (0,):
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="FAIL",
                    current_card=card_id,
                    current_phase="schedule_executor",
                    loop_count=loop_n,
                    last_result="FAIL",
                    last_evidence_dir=str(evidence_dir),
                )
                progress["hold_reason"] = f"schedule_executor_rc_{r_sc.returncode}"
                progress["last_schedule_evidence"] = sched_log
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": "schedule_executor"})
                return 3
            progress["last_schedule_evidence"] = sched_log[:2000]

        paths_after = _porcelain_paths(repo)
        dirty_after = _dirty_count(repo)
        new_paths = paths_after - paths_before

        if dirty_before >= 0 and dirty_after >= 0 and (dirty_after - dirty_before) > dirty_loop:
            hr = f"dirty_per_loop {(dirty_after - dirty_before)}>{dirty_loop}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="post_loop_geometry",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            return 6

        sens_b = {p for p in paths_before if _path_matches_prefix(p, sens)}
        sens_a = {p for p in paths_after if _path_matches_prefix(p, sens)}
        if sens_a - sens_b:
            hr = f"sensitive_new:{sorted(sens_a - sens_b)[:8]}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="post_loop_geometry",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            return 7

        route_new = [p for p in new_paths if _path_matches_prefix(p, route_prefs)]
        if len(route_new) > route_max:
            hr = f"route_contract_suspect_{len(route_new)}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="post_loop_geometry",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            return 8

        broad_new = [p for p in new_paths if _path_matches_broad(p, broad_subs)]
        if len(broad_new) > broad_max:
            hr = f"broad_change_suspect_{len(broad_new)}"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="post_loop_geometry",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            return 9

        obs = obs_mod.observe(
            repo=repo,
            api_dir=api_dir,
            auto_dir=auto_dir,
            base_url=base_url,
            config=sched_cfg if sched_cfg else {},
            run_build_check=not skip_npm,
        )
        if post_audit and base_url:
            au2 = obs.get("audit_status") if isinstance(obs.get("audit_status"), dict) else {}
            if not au2.get("skipped") and not au2.get("ok"):
                hr = "post_loop_audit_not_ok"
                _write_runtime(
                    auto_dir / RUNTIME_FN,
                    status="HOLD",
                    current_card=card_id,
                    current_phase="vps_observe",
                    loop_count=loop_n,
                    last_result="HOLD",
                    last_evidence_dir=str(evidence_dir),
                    last_hold_reason=hr,
                )
                progress["hold_reason"] = hr
                progress["audit_status"] = au2
                progress["updated_at"] = _utc_iso()
                _write_json(auto_dir / PROGRESS_FN, progress)
                _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
                return 10

        require_aud = bool(post_audit and base_url)
        base_set = bool(base_url)
        if enable_cursor and not cursor_dry_run:
            lr_j = _read_json(auto_dir / "cursor_executor_last_result.json")
            rr_j, rr_p_j, _ = _load_cursor_result_return(auto_dir, lr_j)
            jd = judge_mod.judge_combined(
                auto_dir=auto_dir,
                result_return=rr_j,
                result_return_source=str(rr_p_j) if rr_p_j else None,
                observer=obs,
                base_url_set=base_set,
                require_audit=require_aud,
            )
        else:
            jd = judge_mod.judge_observer_only_bundle(
                auto_dir=auto_dir,
                observer=obs,
                base_url_set=base_set,
                require_audit=require_aud,
            )
        judge_mod.write_last_judgement(auto_dir, jd)
        progress["last_autonomy_judgement"] = jd.get("verdict")

        jv = str(jd.get("verdict") or "")
        if jv == "FAIL":
            hr = str(jd.get("reason") or "autonomy_judge_fail")
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="FAIL",
                current_card=card_id,
                current_phase="autonomy_judge",
                loop_count=loop_n,
                last_result="FAIL",
                last_evidence_dir=str(evidence_dir),
                last_failure_bundle=str(auto_dir / FAILURE_FN),
                last_hold_reason=hr,
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "FAIL", "reason": hr, "judgement": jd})
            _append_execution_history(
                auto_dir,
                {"loop": loop_n, "card_id": card_id, "verdict": "FAIL", "reason": hr, "evidence_dir": str(evidence_dir)},
            )
            return 3
        if jv == "HOLD":
            hr = str(jd.get("reason") or "autonomy_judge_hold")
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="autonomy_judge",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
                last_hold_reason=hr,
            )
            progress["hold_reason"] = hr
            progress["updated_at"] = _utc_iso()
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr, "judgement": jd})
            _append_execution_history(
                auto_dir,
                {"loop": loop_n, "card_id": card_id, "verdict": "HOLD", "reason": hr, "evidence_dir": str(evidence_dir)},
            )
            return 0

        new_q, dq_ok = _dequeue_eligible_slot(queue, triage, qc, card_id)
        if not dq_ok:
            hr = "queue_dequeue_post_pass_invariant_failed"
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="HOLD",
                current_card=card_id,
                current_phase="queue_post_pass_dequeue",
                loop_count=loop_n,
                last_result="HOLD",
                last_evidence_dir=str(evidence_dir),
                last_hold_reason=hr,
            )
            progress["hold_reason"] = hr
            progress["last_result"] = "HOLD"
            progress["updated_at"] = _utc_iso()
            progress["supervisor_log_dir"] = str(sup_log)
            _write_json(auto_dir / PROGRESS_FN, progress)
            _fail_bundle({"schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1", "verdict": "HOLD", "reason": hr})
            _log(sup_log, hr)
            return 0
        queue = new_q
        _write_json(auto_dir / QUEUE_FN, queue)
        progress["queue_cursor"] = 0
        progress["loops_completed"] = int(progress.get("loops_completed") or 0) + 1
        progress["last_card"] = card_id
        progress["last_result"] = "PASS"
        progress["last_orchestra_evidence"] = str(evidence_dir)
        progress["audit_status"] = obs.get("audit_status")
        progress["git_sha"] = obs.get("git_sha")
        progress["dirty_files_count"] = obs.get("dirty_files_count")
        progress["hold_reason"] = None
        progress["last_error_signature"] = None
        progress["retry_count_by_card"][card_id] = 0
        progress["updated_at"] = _utc_iso()
        progress["supervisor_log_dir"] = str(sup_log)
        _write_json(auto_dir / PROGRESS_FN, progress)
        _write_json(sup_log / f"observe_pass_L{loop_n}.json", obs)

        _write_runtime(
            auto_dir / RUNTIME_FN,
            status="PASS",
            current_card=card_id,
            current_phase="loop_complete",
            loop_count=loop_n,
            last_result="PASS",
            last_evidence_dir=str(evidence_dir),
        )
        _log(sup_log, f"PASS card={card_id}")
        _append_execution_history(
            auto_dir,
            {
                "loop": loop_n,
                "card_id": card_id,
                "verdict": "PASS",
                "reason": "loop_ok",
                "evidence_dir": str(evidence_dir),
                "queue_dequeued": True,
            },
        )

        if loop_n >= max_loops:
            progress["last_result"] = "PASS"
            progress["updated_at"] = _utc_iso()
            progress["supervisor_log_dir"] = str(sup_log)
            _write_json(auto_dir / PROGRESS_FN, progress)
            _write_runtime(
                auto_dir / RUNTIME_FN,
                status="PASS",
                current_card=card_id,
                current_phase="supervisor_completed",
                loop_count=loop_n,
                last_result="PASS",
                last_evidence_dir=str(evidence_dir),
            )
            _log(sup_log, "supervisor completed (max_loops reached after PASS)")
            return 0

    _write_runtime(
        auto_dir / RUNTIME_FN,
        status="FAIL",
        current_card="",
        current_phase="supervisor_internal",
        loop_count=max_loops,
        last_result="FAIL",
        last_evidence_dir=str(sup_log),
    )
    progress["last_result"] = "FAIL_supervisor_no_return"
    progress["hold_reason"] = "supervisor_loop_fallthrough"
    progress["updated_at"] = _utc_iso()
    progress["supervisor_log_dir"] = str(sup_log)
    _write_json(auto_dir / PROGRESS_FN, progress)
    _fail_bundle(
        {
            "schema": "MULTI_AI_AUTONOMY_FAILURE_BUNDLE_V1",
            "verdict": "FAIL",
            "reason": "supervisor_loop_fallthrough",
        },
    )
    _log(sup_log, "FAIL internal fallthrough")
    return 99


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument(
        "--max-loops",
        type=int,
        default=0,
        help="0 なら stop_conditions の max_supervisor_loops",
    )
    ap.add_argument(
        "--api-base-url",
        type=str,
        default=os.environ.get("TENMON_API_BASE_URL", "http://127.0.0.1:3000"),
    )
    ap.add_argument("--skip-npm", action="store_true", help="observe で npm run check をスキップ")
    ap.add_argument(
        "--orchestra-no-dry-run",
        action="store_true",
        help="multi_ai_orchestra_executor に --no-dry-run（外部AI接続前提。未接続時は失敗しうる）",
    )
    ap.add_argument("--orchestra-probe-vps", action="store_true", help="executor に --probe-vps を付与")
    ap.add_argument("--cursor-dry-run", action="store_true", help="cursor bridge を dry-run（結果束なしでも安全）")
    ap.add_argument("--cursor-poll-timeout", type=int, default=120)
    ap.add_argument("--skip-preflight", action="store_true", help="multi_ai_autonomy_preflight をスキップ（開発用）")
    ap.add_argument(
        "--expected-head",
        type=str,
        default="",
        help="封印 sealed head（短 SHA 可）。未指定時は環境変数 TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD",
    )
    ap.add_argument(
        "--bypass-dryrun-gate",
        action="store_true",
        help="dryrun_report の full_autonomy_supervisor_ready を要せず起動（開発用。本番非推奨）",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    base_url = (args.api_base_url or "").strip() or None
    mxl = int(args.max_loops) if args.max_loops else None
    exp_h = (args.expected_head or os.environ.get("TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD") or "").strip() or None

    rc = run_supervisor(
        auto_dir=auto_dir,
        base_url=base_url,
        max_loops_override=mxl,
        skip_npm=bool(args.skip_npm),
        orchestra_dry_run=not bool(args.orchestra_no_dry_run),
        orchestra_probe_vps=bool(args.orchestra_probe_vps),
        cursor_dry_run=bool(args.cursor_dry_run),
        cursor_poll_timeout=int(args.cursor_poll_timeout),
        skip_preflight=bool(args.skip_preflight),
        expected_head=exp_h,
        bypass_dryrun_gate=bool(args.bypass_dryrun_gate),
    )
    sys.exit(rc)


if __name__ == "__main__":
    main()
