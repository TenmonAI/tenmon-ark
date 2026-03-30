#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_AUTONOMY_DRYRUN_HARNESS_CURSOR_AUTO_V1

full autonomy supervisor 前の乾式運転: preflight / allowlist / 契約ファイル / judge 接続のみ。
deploy・restart・実 orchestra は実行しない（実害ゼロ優先）。
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

import multi_ai_autonomy_judge_v1 as judge_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod

CARD = "TENMON_MULTI_AI_AUTONOMY_DRYRUN_HARNESS_CURSOR_AUTO_V1"
DRYRUN_QUEUE_FN = "multi_ai_autonomy_dryrun_queue.json"
DRYRUN_REPORT_FN = "multi_ai_autonomy_dryrun_report_v1.json"
RUNTIME_FN = "multi_ai_autonomy_runtime_state.json"
PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
VERDICT_SCHEMA_FN = "multi_ai_autonomy_verdict_schema_v1.json"
RESULT_CONTRACT_FN = "multi_ai_autonomy_result_return_contract_v1.json"
ACCEPT_GATE_FN = "multi_ai_autonomy_acceptance_gate_v1.json"
NEXT_CARD = "TENMON_MULTI_AI_AUTONOMY_FULL_SUPERVISOR_BIND_CURSOR_AUTO_V1"


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


def _contract_files_ok(auto_dir: Path) -> tuple[bool, list[str]]:
    phases: list[str] = []
    bad: list[str] = []
    for fn, schema in (
        (VERDICT_SCHEMA_FN, "MULTI_AI_AUTONOMY_VERDICT_SCHEMA_V1"),
        (RESULT_CONTRACT_FN, "MULTI_AI_AUTONOMY_RESULT_RETURN_CONTRACT_V1"),
        (ACCEPT_GATE_FN, "MULTI_AI_AUTONOMY_ACCEPTANCE_GATE_V1"),
    ):
        p = auto_dir / fn
        phases.append(f"contract:{fn}")
        d = _read_json(p)
        if not p.is_file() or d.get("schema") != schema:
            bad.append(fn)
    return len(bad) == 0, bad


def _synthetic_result_return(card_id: str, log_dir: Path) -> dict[str, Any]:
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "run.log").write_text("dryrun harness synthetic log\n", encoding="utf-8")
    return {
        "schema": "MULTI_AI_AUTONOMY_RESULT_RETURN_V1",
        "card": card_id,
        "status": "PASS",
        "files_changed": [],
        "summary": "dryrun_harness_synthetic_ok",
        "diff_stat": {},
        "result_log_path": str((log_dir / "run.log").resolve()),
        "updated_at": _utc_iso(),
    }


def _minimal_observer_pass() -> dict[str, Any]:
    return {
        "git_sha": "dryrun",
        "build_status": {"ran_check": True, "ok": True, "tail": "dryrun_skipped_real_npm"},
        "audit_status": {"skipped": True, "ok": None},
        "service_status": {"skipped": True},
        "last_probe_status": {"aggregate_ok_signal": False, "entries": []},
    }


def run_harness(
    *,
    auto_dir: Path,
    base_url: str | None,
    strict_preflight: bool,
    expected_head: str | None,
) -> tuple[dict[str, Any], int]:
    repo = _repo_root(auto_dir)
    ev_root = Path("/var/log/tenmon/multi_ai_autonomy_dryrun") / _utc_iso().replace(":", "").replace("-", "")[:13]
    ev_root.mkdir(parents=True, exist_ok=True)

    report: dict[str, Any] = {
        "schema": "MULTI_AI_AUTONOMY_DRYRUN_REPORT_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "harness_verdict": "PENDING",
        "full_autonomy_supervisor_ready": False,
        "strict_preflight_passed": None,
        "relaxed_preflight_used": None,
        "entered_phases": [],
        "loops": [],
        "allowlist_deny_smoke": None,
        "contract_files_ok": None,
        "blocked_reason": None,
        "hold_reason": None,
        "state_updates": {"runtime_state_written": False, "progress_report_written": False},
        "disconnected_or_unverified": [],
        "next_action": "",
        "evidence_dir": str(ev_root),
    }
    phases: list[str] = report["entered_phases"]
    disconnected: list[str] = report["disconnected_or_unverified"]

    phases.append("contracts")
    c_ok, c_bad = _contract_files_ok(auto_dir)
    report["contract_files_ok"] = c_ok
    if not c_ok:
        report["harness_verdict"] = "FAIL"
        report["blocked_reason"] = f"missing_or_invalid_contracts:{c_bad}"
        report["next_action"] = "restore_contract_json_files"
        _write_runtime_progress(auto_dir, report, repo)
        _write_json(auto_dir / DRYRUN_REPORT_FN, report)
        return report, 3

    phases.append("preflight")
    allow_miss = not strict_preflight
    allow_dirty = not strict_preflight
    allow_no_audit = not strict_preflight or not (base_url or "").strip()
    if not strict_preflight:
        report["relaxed_preflight_used"] = True
        disconnected.append("preflight_relaxed_allowances_active")
    else:
        report["relaxed_preflight_used"] = False

    pr, prc = preflight_mod.run_preflight(
        auto_dir=auto_dir,
        base_url=base_url,
        expected_head=expected_head,
        allow_missing_expected_head=allow_miss,
        allow_dirty_repo=allow_dirty,
        allow_no_audit=allow_no_audit,
        write_result=True,
    )
    report["preflight_verdict"] = pr.get("verdict")
    report["preflight_exit"] = prc
    strict_ok = strict_preflight and prc == 0
    report["strict_preflight_passed"] = strict_ok
    if strict_preflight and prc != 0:
        report["harness_verdict"] = "HOLD"
        report["hold_reason"] = "strict_preflight_failed"
        report["blocked_reason"] = "preflight_gate"
        report["next_action"] = "fix_preflight_conditions_then_rerun_with_strict"
        _write_runtime_progress(auto_dir, report, repo)
        _write_json(auto_dir / DRYRUN_REPORT_FN, report)
        return report, 2

    phases.append("allowlist_deny_smoke")
    allow, deny = preflight_mod.load_allowlist_denylist(auto_dir)
    fake = "TENMON_DRYRUN_NOT_ON_ALLOWLIST_FAKE_CURSOR_AUTO_V1"
    ok_fake, why_fake = preflight_mod.is_autonomy_card_permitted(fake, allow, deny)
    smoke_ok = not ok_fake
    report["allowlist_deny_smoke"] = {"ok": smoke_ok, "fake_card": fake, "detail": why_fake}
    if not smoke_ok:
        report["harness_verdict"] = "FAIL"
        report["blocked_reason"] = "allowlist_deny_smoke_failed"
        _write_runtime_progress(auto_dir, report, repo)
        _write_json(auto_dir / DRYRUN_REPORT_FN, report)
        return report, 3

    dq = _read_json(auto_dir / DRYRUN_QUEUE_FN)
    scenarios = dq.get("scenarios") if isinstance(dq.get("scenarios"), list) else []
    max_lp = int(dq.get("max_loops") or 2)
    scenarios = scenarios[:max_lp]
    phases.append("dryrun_loops")

    all_loop_ok = True
    for i, sc in enumerate(scenarios):
        if not isinstance(sc, dict):
            continue
        sid = str(sc.get("scenario_id") or f"L{i+1}")
        card_id = str(sc.get("card_id") or "")
        kind = str(sc.get("kind") or "")
        loop_ev = ev_root / f"loop_{i+1}"
        loop_rec: dict[str, Any] = {
            "index": i + 1,
            "scenario_id": sid,
            "card_id": card_id,
            "kind": kind,
            "verdict": "PENDING",
            "reason": "",
        }

        perm_ok, perm_why = preflight_mod.is_autonomy_card_permitted(card_id, allow, deny)
        if not perm_ok:
            loop_rec["verdict"] = "HOLD"
            loop_rec["reason"] = f"allowlist_gate:{perm_why}"
            all_loop_ok = False
            report["loops"].append(loop_rec)
            continue

        if kind == "not_on_allowlist":
            loop_rec["verdict"] = "HOLD"
            loop_rec["reason"] = "scenario_not_on_allowlist"
            all_loop_ok = False
            report["loops"].append(loop_rec)
            continue

        if kind == "missing_result_return":
            j = judge_mod.judge_combined(
                auto_dir=auto_dir,
                result_return=None,
                result_return_source=None,
                observer=_minimal_observer_pass(),
                base_url_set=bool((base_url or "").strip()),
                require_audit=False,
            )
            loop_rec["judge_verdict"] = j.get("verdict")
            loop_rec["reason"] = str(j.get("reason"))
            if j.get("verdict") == "HOLD":
                loop_rec["verdict"] = "PASS"
                loop_rec["expectation_met"] = True
            else:
                loop_rec["verdict"] = "FAIL"
                loop_rec["expectation_met"] = False
                all_loop_ok = False
            report["loops"].append(loop_rec)
            continue

        if kind == "happy_judge":
            rr = _synthetic_result_return(card_id, loop_ev)
            rr_path = loop_ev / "multi_ai_autonomy_result_return.json"
            _write_json(rr_path, rr)
            j = judge_mod.judge_combined(
                auto_dir=auto_dir,
                result_return=rr,
                result_return_source=str(rr_path),
                observer=_minimal_observer_pass(),
                base_url_set=bool((base_url or "").strip()),
                require_audit=False,
            )
            loop_rec["judge_verdict"] = j.get("verdict")
            loop_rec["reason"] = str(j.get("reason"))
            if j.get("verdict") == "PASS":
                loop_rec["verdict"] = "PASS"
                loop_rec["expectation_met"] = True
            else:
                loop_rec["verdict"] = j.get("verdict")
                loop_rec["expectation_met"] = False
                all_loop_ok = False
            report["loops"].append(loop_rec)
            continue

        loop_rec["verdict"] = "HOLD"
        loop_rec["reason"] = f"unknown_kind:{kind}"
        all_loop_ok = False
        report["loops"].append(loop_rec)

    if all_loop_ok and c_ok and smoke_ok:
        report["harness_verdict"] = "PASS"
        report["hold_reason"] = None
    else:
        report["harness_verdict"] = "FAIL" if not all_loop_ok else "HOLD"
        report["hold_reason"] = "one_or_more_loop_failed" if not all_loop_ok else None

    report["full_autonomy_supervisor_ready"] = bool(strict_ok and all_loop_ok and c_ok and smoke_ok and prc == 0)
    if not report["full_autonomy_supervisor_ready"]:
        if not strict_preflight:
            report["next_action"] = "run_again_with_strict_preflight_and_live_audit_for_production_gate"
        elif not strict_ok:
            report["next_action"] = "fix_strict_preflight"
        else:
            report["next_action"] = "fix_failed_loops_or_contracts"
    else:
        report["next_action"] = "proceed_full_multi_ai_autonomy_supervisor"
    report["suggested_next_card"] = NEXT_CARD

    _write_runtime_progress(auto_dir, report, repo)
    _write_json(auto_dir / DRYRUN_REPORT_FN, report)

    rc = 0 if report["harness_verdict"] == "PASS" else (3 if report["harness_verdict"] == "FAIL" else 2)
    return report, rc


def _write_runtime_progress(auto_dir: Path, report: dict[str, Any], repo: Path) -> None:
    hv = str(report.get("harness_verdict") or "PENDING")
    st = "PASS" if hv == "PASS" else ("FAIL" if hv == "FAIL" else "HOLD")
    rt = {
        "schema": "MULTI_AI_AUTONOMY_RUNTIME_STATE_V1",
        "status": st,
        "current_card": CARD,
        "current_phase": "dryrun_harness_complete",
        "loop_count": len(report.get("loops") or []),
        "last_result": f"DRYRUN_{hv}",
        "last_evidence_dir": str(report.get("evidence_dir") or ""),
        "updated_at": _utc_iso(),
    }
    _write_json(auto_dir / RUNTIME_FN, rt)
    report["state_updates"]["runtime_state_written"] = True

    prog = _read_json(auto_dir / PROGRESS_FN)
    prog["schema"] = "MULTI_AI_AUTONOMY_PROGRESS_REPORT_V1"
    prog["updated_at"] = _utc_iso()
    prog["last_result"] = f"DRYRUN_{hv}"
    prog["hold_reason"] = report.get("hold_reason")
    prog["dryrun_harness"] = {
        "harness_verdict": hv,
        "full_autonomy_supervisor_ready": report.get("full_autonomy_supervisor_ready"),
        "report_ref": str(auto_dir / DRYRUN_REPORT_FN),
    }
    _write_json(auto_dir / PROGRESS_FN, prog)
    report["state_updates"]["progress_report_written"] = True


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--api-base-url", type=str, default=os.environ.get("TENMON_API_BASE_URL", ""))
    ap.add_argument(
        "--strict-preflight",
        action="store_true",
        help="封印 head / clean / audit を要求。full_autonomy_supervisor_ready に必要。",
    )
    ap.add_argument("--expected-head", type=str, default=os.environ.get("TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD", ""))
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    base_url = (args.api_base_url or "").strip() or None
    exp = (args.expected_head or "").strip() or None

    rep, rc = run_harness(
        auto_dir=auto_dir,
        base_url=base_url,
        strict_preflight=bool(args.strict_preflight),
        expected_head=exp,
    )
    print(
        json.dumps(
            {
                "harness_verdict": rep.get("harness_verdict"),
                "full_autonomy_supervisor_ready": rep.get("full_autonomy_supervisor_ready"),
                "exit_code": rc,
                "report": str(auto_dir / DRYRUN_REPORT_FN),
            },
            ensure_ascii=False,
        )
    )
    sys.exit(rc)


if __name__ == "__main__":
    main()
