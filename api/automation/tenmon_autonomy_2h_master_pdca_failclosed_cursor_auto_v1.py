#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_2H_MASTER_PDCA_FAILCLOSED_CURSOR_AUTO_V1

会話完成（route→selfaware→surface→worldclass→seal）を優先し、その後 autonomy readiness
（planner/queue/single_flight→execution gate/result_return→rollback/forensic/supervisor→mac/cursor）を同一ループ内で順に観測。
各ループで build（任意）/ gates / probe；run ディレクトリに `loop_<N>_result.json` 等を必ず残す。最大 5 ループまたは 2 時間。
PASS のみ積み上げ、FAIL は next_card。worldclass は 2 軸以上不足で当ループ修理停止。fail-closed。
"""
from __future__ import annotations

import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from tenmon_conversation_pdca_2h_failclosed_autoloop_cursor_auto_v1 import (
    _autonomy_readiness_memo,
    _gates,
    _loop1_probes,
    _loop2_probes,
    _loop3_probes,
    _loop4_score,
    _loop5_seal,
    _pwa_static_audit,
    _read_json,
    _run_npm_build,
    _utc,
    _write_json,
)

CARD = "TENMON_AUTONOMY_2H_MASTER_PDCA_FAILCLOSED_CURSOR_AUTO_V1"
RUN_DIR_NAME = "autonomy_2h_master_pdca_failclosed_v1"
OUT_FINAL = "tenmon_autonomy_2h_master_pdca_failclosed_cursor_auto_v1.json"

# 最終出力（stdout / 契約）のキー順
FINAL_PUBLIC_KEYS = (
    "ok",
    "card",
    "loops_completed",
    "conversation_completion_level",
    "route_sovereignty_fixed",
    "selfaware_family_ok",
    "surface_contract_ok",
    "worldclass_ready",
    "single_source_sealed",
    "planner_ready",
    "queue_ready",
    "execution_gate_ready",
    "rollback_ready",
    "cursor_operator_ready",
    "mac_operator_ready",
    "rollback_used",
    "next_card_if_fail",
)

SCRIPTS = {
    "planner": "tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py",
    "execution_gate": "tenmon_autonomy_execution_gate_and_result_return_cursor_auto_v1.py",
    "supervisor": "tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py",
    "mac_readiness": "tenmon_mac_cursor_operator_readiness_cursor_auto_v1.py",
}


def _subpy_stdout_json(auto: Path, api: Path, script: str, argv: list[str], env: dict[str, str] | None) -> tuple[int, dict[str, Any]]:
    p = auto / script
    if not p.is_file():
        return 2, {"error": "missing_script", "path": str(p)}
    r = subprocess.run(
        [sys.executable, str(p), *argv],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
        env=env,
    )
    raw = (r.stdout or "").strip()
    if not raw:
        return r.returncode, {"error": "empty_stdout", "stderr_tail": (r.stderr or "")[-1500:]}
    try:
        return r.returncode, json.loads(raw)
    except json.JSONDecodeError:
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip().startswith("{")]
        for ln in reversed(lines):
            try:
                return r.returncode, json.loads(ln)
            except json.JSONDecodeError:
                continue
        return r.returncode, {"parse_error": True, "stdout_tail": raw[-2500:]}


def _merge_autonomy_readiness_for_loop(auto: Path, phase_result: dict[str, Any]) -> dict[str, Any]:
    """planner〜mac〜supervisor の stdout JSON を autonomy readiness 採取項目に反映。"""
    m = dict(_autonomy_readiness_memo(auto))
    pj = (phase_result.get("planner") or {}).get("json") if isinstance(phase_result.get("planner"), dict) else {}
    if isinstance(pj, dict):
        if pj.get("planner_ready") is True:
            m["planner"] = "ready"
        elif pj.get("planner_ready") is False:
            m["planner"] = "not_ready"
        if pj.get("queue_ready") is True:
            m["queue"] = "ready"
        elif pj.get("queue_ready") is False:
            m["queue"] = "not_ready"
        if pj.get("single_flight_ready") is True:
            m["single_flight"] = m["queue_single_flight"] = "ready"
        elif pj.get("single_flight_ready") is False:
            m["single_flight"] = m["queue_single_flight"] = "not_ready"
    ej = (phase_result.get("execution_gate") or {}).get("json") if isinstance(phase_result.get("execution_gate"), dict) else {}
    if isinstance(ej, dict):
        if ej.get("execution_gate_ready") is True:
            m["execution_gate"] = "ready"
        elif ej.get("execution_gate_ready") is False:
            m["execution_gate"] = "not_ready"
        if ej.get("result_return_ready") is True:
            m["result_return"] = "ready"
        elif ej.get("result_return_ready") is False:
            m["result_return"] = "not_ready"
    sj = (phase_result.get("supervisor") or {}).get("json") if isinstance(phase_result.get("supervisor"), dict) else {}
    if isinstance(sj, dict):
        if sj.get("rollback_ready") is True:
            m["rollback"] = "ready"
        elif sj.get("rollback_ready") is False:
            m["rollback"] = "not_ready"
        if sj.get("forensic_bundle_ready") is True:
            m["forensic"] = "ready"
        elif sj.get("forensic_bundle_ready") is False:
            m["forensic"] = "not_ready"
        if sj.get("ok") is True:
            m["failclosed_supervisor"] = "ready"
        elif sj.get("ok") is False:
            m["failclosed_supervisor"] = "not_ready"
    mj = (phase_result.get("mac_operator") or {}).get("json") if isinstance(phase_result.get("mac_operator"), dict) else {}
    if isinstance(mj, dict):
        if mj.get("cursor_operator_ready") is True:
            m["cursor_operator"] = "ready"
        elif mj.get("cursor_operator_ready") is False:
            m["cursor_operator"] = "not_ready"
        if mj.get("mac_operator_ready") is True:
            m["mac_operator"] = "ready"
        elif mj.get("mac_operator_ready") is False:
            m["mac_operator"] = "not_ready"
    return m


def _git_diff_stat(repo: Path) -> dict[str, Any]:
    try:
        r = subprocess.run(
            ["git", "diff", "--stat"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=25,
            check=False,
        )
        return {"rc": r.returncode, "stdout": (r.stdout or "")[-12000:]}
    except Exception as e:
        return {"error": str(e)}


def _write_loop_run_artifacts(
    *,
    out_dir: Path,
    ldir: Path,
    loop: int,
    gates: dict[str, Any],
    phase_result: dict[str, Any],
    passed: bool,
    next_card_if_fail: str | None,
    primary_fail_phase: str | None,
    flags: dict[str, bool],
    rollback_used: bool,
    build_info: dict[str, Any] | None,
    repo: Path,
    auto: Path,
) -> None:
    ts = _utc()
    pwa = _pwa_static_audit(repo)
    autonomy = _merge_autonomy_readiness_for_loop(auto, phase_result)
    probe_summary = {
        "loop": loop,
        "generated_at": ts,
        "gates": gates,
        "build": build_info,
        "git_diff_stat": _git_diff_stat(repo),
        "conversation_phases": {k: phase_result[k] for k in ("route", "selfaware", "surface", "worldclass", "seal") if k in phase_result},
        "autonomy_scripts": {k: phase_result[k] for k in ("planner", "execution_gate", "supervisor", "mac_operator") if k in phase_result},
    }
    _write_json(out_dir / f"loop_{loop}_probe_summary.json", probe_summary)

    ar = {
        "loop": loop,
        "generated_at": ts,
        "autonomy_readiness": autonomy,
        "pwa_static_audit": pwa,
        "next_card_if_fail": next_card_if_fail,
        "phase_scripts": {k: v for k, v in phase_result.items() if k not in ("route", "selfaware", "surface", "worldclass", "seal")},
    }
    _write_json(out_dir / f"loop_{loop}_autonomy_readiness.json", ar)

    loop_result = {
        "loop": loop,
        "pass": passed,
        "generated_at": ts,
        "next_card_if_fail": next_card_if_fail,
        "primary_fail_phase": primary_fail_phase,
        "flags": flags,
        "rollback_used": rollback_used,
        "probe_summary_ref": str(out_dir / f"loop_{loop}_probe_summary.json"),
        "autonomy_readiness_ref": str(out_dir / f"loop_{loop}_autonomy_readiness.json"),
    }
    _write_json(out_dir / f"loop_{loop}_result.json", loop_result)

    md = f"# loop {loop} next card\n\n"
    md += f"- next_card_if_fail: `{next_card_if_fail or 'null'}`\n"
    md += f"- primary_fail_phase: `{primary_fail_phase or 'null'}`\n"
    md += f"- pass: `{passed}`\n"
    if not passed and phase_result:
        md += "\n```json\n" + json.dumps(phase_result, ensure_ascii=False, indent=2)[:12000] + "\n```\n"
    (out_dir / f"loop_{loop}_next_card_if_fail.md").write_text(md, encoding="utf-8")

    try:
        if phase_result:
            _write_json(ldir / "phases.json", phase_result)
    except OSError:
        pass


def _next_card_for_phase(phase: str) -> str:
    return {
        "route": "TENMON_CONVERSATION_ROUTE_SOVEREIGNTY_REPAIR_CURSOR_AUTO_V1",
        "selfaware": "TENMON_SELFAWARE_FAMILY_STABILIZE_CURSOR_AUTO_V1",
        "surface": "TENMON_SURFACE_CONTRACT_MIN_STABILIZE_CURSOR_AUTO_V1",
        "worldclass": "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1",
        "seal": "TENMON_FINAL_CONVERSATION_COMPLETION_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1",
        "planner": "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1",
        "execution_gate": "TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1",
        "supervisor": "TENMON_AUTONOMY_FORENSIC_BUNDLE_REPAIR_CURSOR_AUTO_V1",
        "mac": "TENMON_MAC_OPERATOR_PATH_AND_WATCH_REPAIR_CURSOR_AUTO_V1",
    }.get(phase, "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_PDCA_BASE", "http://127.0.0.1:3000").strip()
    max_loops = int(os.environ.get("TENMON_MASTER_PDCA_MAX_LOOPS", os.environ.get("TENMON_PDCA_MAX_LOOPS", "5")))
    max_sec = float(os.environ.get("TENMON_MASTER_PDCA_MAX_SEC", os.environ.get("TENMON_PDCA_MAX_SEC", "7200")))
    skip_probes = os.environ.get("TENMON_PDCA_SKIP_PROBES", "").strip() in ("1", "true", "yes")
    skip_build = os.environ.get("TENMON_PDCA_SKIP_BUILD", "1").strip() in ("1", "true", "yes")
    run_build = os.environ.get("TENMON_PDCA_RUN_BUILD", "").strip() in ("1", "true", "yes")

    run_id = _utc().replace(":", "").replace("-", "")
    out_dir = auto / RUN_DIR_NAME / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.monotonic()
    rollback_used = False
    loops_completed = 0
    next_card_if_fail: str | None = None
    primary_fail_phase: str | None = None

    flags: dict[str, bool] = {
        "route_sovereignty_fixed": False,
        "selfaware_family_ok": False,
        "surface_contract_ok": False,
        "worldclass_ready": False,
        "single_source_sealed": False,
        "planner_ready": False,
        "queue_ready": False,
        "execution_gate_ready": False,
        "rollback_ready": False,
        "cursor_operator_ready": False,
        "mac_operator_ready": False,
    }

    env_base = os.environ.copy()
    if platform.system() != "Darwin":
        env_base["TENMON_MAC_OPERATOR_READINESS_NON_MAC_OK"] = "1"

    for loop in range(1, max_loops + 1):
        if time.monotonic() - t0 > max_sec:
            break
        flags = {k: False for k in flags}
        ldir = out_dir / f"loop_{loop}"
        ldir.mkdir(parents=True, exist_ok=True)
        phase_result: dict[str, Any] = {}
        passed = False
        gates: dict[str, Any] = {}
        build_info: dict[str, Any] | None = None

        try:
            if run_build and not skip_build:
                build_info = _run_npm_build(api)
                if not build_info.get("ok"):
                    rollback_used = True
                    next_card_if_fail = "TENMON_CONVERSATION_PDCA_2H_FAILCLOSED_AUTOLOOP_RETRY_CURSOR_AUTO_V1"
                    primary_fail_phase = "build"
                    loops_completed = loop
                    _write_json(ldir / "phase_build.json", build_info)
                    break

            if skip_probes:
                gates = {"ok": True, "skipped": True, "note": "TENMON_PDCA_SKIP_PROBES"}
            else:
                gates = _gates(base)
            if not gates.get("ok"):
                rollback_used = True
                next_card_if_fail = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
                primary_fail_phase = "gates"
                loops_completed = loop
                break

            ts = str(int(time.time()))

            if skip_probes:
                phase_result["skip_probes"] = True
                sk = {"skipped": True, "pass": True, "note": "TENMON_PDCA_SKIP_PROBES"}
                phase_result["route"] = sk.copy()
                phase_result["selfaware"] = sk.copy()
                phase_result["surface"] = sk.copy()
                phase_result["worldclass"] = sk.copy()
                phase_result["seal"] = sk.copy()
                flags["route_sovereignty_fixed"] = True
                flags["selfaware_family_ok"] = True
                flags["surface_contract_ok"] = True
                flags["worldclass_ready"] = True
                flags["single_source_sealed"] = True
            else:
                # 1 route
                pr = _loop1_probes(base, ts)
                if not pr.get("pass"):
                    pr_retry = _loop1_probes(base, ts + "_r")
                    pr["retry"] = pr_retry
                    passed = bool(pr_retry.get("pass"))
                else:
                    passed = True
                phase_result["route"] = pr
                flags["route_sovereignty_fixed"] = passed
                if not passed:
                    next_card_if_fail = _next_card_for_phase("route")
                    primary_fail_phase = "route"
                    loops_completed = loop
                    break

                # 2 selfaware
                p2 = _loop2_probes(base, ts)
                phase_result["selfaware"] = p2
                passed = bool(p2.get("pass"))
                flags["selfaware_family_ok"] = passed
                if not passed:
                    next_card_if_fail = _next_card_for_phase("selfaware")
                    primary_fail_phase = "selfaware"
                    loops_completed = loop
                    break

                # 3 surface
                p3 = _loop3_probes(base, ts)
                phase_result["surface"] = p3
                passed = bool(p3.get("pass"))
                flags["surface_contract_ok"] = passed
                if not passed:
                    next_card_if_fail = _next_card_for_phase("surface")
                    primary_fail_phase = "surface"
                    loops_completed = loop
                    break

                # 4 worldclass
                p4 = _loop4_score(auto, api)
                phase_result["worldclass"] = p4
                sj = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json")
                failed_axes = sj.get("failed_axes") if isinstance(sj.get("failed_axes"), list) else []
                if len(failed_axes) >= 2:
                    passed = False
                    phase_result["worldclass"]["repair_stop"] = "two_or_more_axes_missing"
                    next_card_if_fail = _next_card_for_phase("worldclass")
                    primary_fail_phase = "worldclass"
                    flags["worldclass_ready"] = False
                    loops_completed = loop
                    break
                passed = bool(p4.get("pass"))
                flags["worldclass_ready"] = bool(sj.get("worldclass_ready") and sj.get("ok"))
                if not passed:
                    next_card_if_fail = _next_card_for_phase("worldclass")
                    primary_fail_phase = "worldclass"
                    loops_completed = loop
                    break

                # 5 seal
                p5 = _loop5_seal(auto, api)
                phase_result["seal"] = p5
                passed = bool(p5.get("pass"))
                flags["single_source_sealed"] = passed
                if not passed:
                    next_card_if_fail = _next_card_for_phase("seal")
                    primary_fail_phase = "seal"
                    loops_completed = loop
                    break

            # 6 planner / queue / single-flight
            rc, pj = _subpy_stdout_json(auto, api, SCRIPTS["planner"], ["--dry-run"], env_base)
            phase_result["planner"] = {"exit_code": rc, "json": pj}
            flags["planner_ready"] = bool(pj.get("planner_ready") is True)
            flags["queue_ready"] = bool(pj.get("queue_ready") is True)
            if rc != 0 or not flags["planner_ready"] or not flags["queue_ready"]:
                passed = False
                next_card_if_fail = _next_card_for_phase("planner")
                primary_fail_phase = "planner"
                loops_completed = loop
                break

            # 7 execution gate / result return
            rc, ej = _subpy_stdout_json(auto, api, SCRIPTS["execution_gate"], ["--dry-run"], env_base)
            phase_result["execution_gate"] = {"exit_code": rc, "json": ej}
            flags["execution_gate_ready"] = bool(ej.get("execution_gate_ready") is True)
            if rc != 0 or not flags["execution_gate_ready"]:
                passed = False
                next_card_if_fail = _next_card_for_phase("execution_gate")
                primary_fail_phase = "execution_gate"
                loops_completed = loop
                break

            # 8 supervisor / rollback / forensic
            rc, sjf = _subpy_stdout_json(auto, api, SCRIPTS["supervisor"], ["--dry-run"], env_base)
            phase_result["supervisor"] = {"exit_code": rc, "json": sjf}
            flags["rollback_ready"] = bool(sjf.get("rollback_ready") is True)
            if sjf.get("rollback_used") is True:
                rollback_used = True
            if rc != 0 or not bool(sjf.get("ok") is True):
                passed = False
                next_card_if_fail = _next_card_for_phase("supervisor")
                primary_fail_phase = "supervisor"
                loops_completed = loop
                break

            # 9 mac / cursor operator readiness
            rc, mj = _subpy_stdout_json(auto, api, SCRIPTS["mac_readiness"], ["--dry-run"], env_base)
            phase_result["mac_operator"] = {"exit_code": rc, "json": mj}
            flags["cursor_operator_ready"] = bool(mj.get("cursor_operator_ready") is True)
            flags["mac_operator_ready"] = bool(mj.get("mac_operator_ready") is True)
            if rc != 0 or not bool(mj.get("ok") is True):
                passed = False
                next_card_if_fail = _next_card_for_phase("mac")
                primary_fail_phase = "mac"
                loops_completed = loop
                break

            passed = True

            loops_completed = loop
            next_card_if_fail = None
            primary_fail_phase = None

            if passed:
                break
        finally:
            try:
                _write_loop_run_artifacts(
                    out_dir=out_dir,
                    ldir=ldir,
                    loop=loop,
                    gates=gates,
                    phase_result=phase_result,
                    passed=passed,
                    next_card_if_fail=next_card_if_fail,
                    primary_fail_phase=primary_fail_phase,
                    flags=flags,
                    rollback_used=rollback_used,
                    build_info=build_info,
                    repo=repo,
                    auto=auto,
                )
            except OSError:
                pass

    ok = bool(
        loops_completed > 0
        and next_card_if_fail is None
        and all(flags[k] for k in flags)
    )

    level = "high" if ok else ("medium" if loops_completed >= 3 else "low")

    final_public: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "loops_completed": loops_completed,
        "conversation_completion_level": level,
        "route_sovereignty_fixed": flags["route_sovereignty_fixed"],
        "selfaware_family_ok": flags["selfaware_family_ok"],
        "surface_contract_ok": flags["surface_contract_ok"],
        "worldclass_ready": flags["worldclass_ready"],
        "single_source_sealed": flags["single_source_sealed"],
        "planner_ready": flags["planner_ready"],
        "queue_ready": flags["queue_ready"],
        "execution_gate_ready": flags["execution_gate_ready"],
        "rollback_ready": flags["rollback_ready"],
        "cursor_operator_ready": flags["cursor_operator_ready"],
        "mac_operator_ready": flags["mac_operator_ready"],
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else next_card_if_fail,
    }

    final: dict[str, Any] = {
        **final_public,
        "run_id": run_id,
        "generated_at": _utc(),
        "elapsed_sec": round(time.monotonic() - t0, 2),
        "max_loops": max_loops,
        "max_sec": max_sec,
        "primary_fail_phase": primary_fail_phase,
        "run_directory": str(out_dir),
    }

    _write_json(auto / OUT_FINAL, final)
    _write_json(out_dir / "final_summary.json", final)
    print(json.dumps({k: final_public[k] for k in FINAL_PUBLIC_KEYS}, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
