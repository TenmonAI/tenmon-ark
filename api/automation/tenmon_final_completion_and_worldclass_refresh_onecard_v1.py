#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1

latest forensic → stale invalidation → hygiene → integrators → single source /
operable / worldclass を evidence ベースで一直線に再生成する（mainline は触らない）。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1"
SUMMARY_NAME = "tenmon_final_completion_worldclass_refresh_summary.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def run_cmd(
    argv: list[str],
    *,
    cwd: Path,
    env: dict[str, str],
    timeout: int = 900,
) -> dict[str, Any]:
    r = subprocess.run(
        argv,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return {
        "argv": argv[:8],
        "returncode": r.returncode,
        "stderr_tail": (r.stderr or "")[-3000:],
    }


def run_downstream_integrators(repo: Path, api: Path, auto: Path) -> list[dict[str, Any]]:
    log: list[dict[str, Any]] = []
    jobs: list[tuple[str, list[str]]] = [
        (
            str(auto / "tenmon_system_verdict_integrator_v1.py"),
            ["python3", str(auto / "tenmon_system_verdict_integrator_v1.py"), "--repo-root", str(repo), "--soft-exit-ok"],
        ),
        (
            str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py"),
            ["python3", str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")],
        ),
        (
            str(auto / "tenmon_total_completion_master_report_v1.py"),
            [
                "python3",
                str(auto / "tenmon_total_completion_master_report_v1.py"),
                "--repo-root",
                str(repo),
                "--no-live-probe",
                "--soft-exit-ok",
            ],
        ),
    ]
    env = {**os.environ, "TENMON_REPO_ROOT": str(repo)}
    for label, argv in jobs:
        p = Path(argv[1])
        if not p.is_file():
            log.append({"script": label, "skipped": True, "returncode": None})
            continue
        log.append({"script": label, **run_cmd(argv, cwd=str(repo), env=env, timeout=600)})
    return log


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--log-dir", default="", help="summary JSON もここへ複製")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--skip-phase-a",
        action="store_true",
        help="latest rejudge + seal refresh シェル（build/restart 含む）をスキップ",
    )
    ap.add_argument(
        "--phase-a-python-only",
        action="store_true",
        help="Phase A でシェルではなく Python のみ実行（build/restart なし）",
    )
    ap.add_argument(
        "--stale-with-downstream",
        action="store_true",
        help="stale 実行時に integrator も走らせる（既定は --no-refresh-downstream で Phase D に任せる）",
    )
    args = ap.parse_args()
    stale_no_ds = not args.stale_with_downstream

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    env = {**os.environ, "TENMON_REPO_ROOT": str(repo), "TENMON_GATE_BASE": args.base}

    stages: list[dict[str, Any]] = []

    # Phase A
    if args.skip_phase_a:
        stages.append({"name": "phase_a_latest_rejudge", "skipped": True})
    elif args.phase_a_python_only:
        stages.append(
            {
                "name": "phase_a_latest_rejudge_python_only",
                **run_cmd(
                    [
                        "python3",
                        str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py"),
                        "--repo-root",
                        str(repo),
                        "--base",
                        args.base,
                    ],
                    cwd=str(repo),
                    env=env,
                    timeout=300,
                ),
            }
        )
    else:
        stages.append(
            {
                "name": "phase_a_latest_rejudge_shell",
                **run_cmd(
                    ["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")],
                    cwd=str(api),
                    env=env,
                    timeout=900,
                ),
            }
        )

    # Phase B
    stale_argv = ["bash", str(scripts / "tenmon_stale_evidence_invalidation_v1.sh"), "--stdout-json"]
    if stale_no_ds:
        stale_argv.append("--no-refresh-downstream")
    stages.append({"name": "phase_b_stale_invalidation", **run_cmd(stale_argv, cwd=str(api), env=env)})

    # Phase C
    stages.append(
        {
            "name": "phase_c_hygiene_final_seal",
            **run_cmd(
                ["bash", str(scripts / "tenmon_repo_hygiene_final_seal_v1.sh"), "--stdout-json"],
                cwd=str(api),
                env=env,
                timeout=300,
            ),
        }
    )
    run_cmd(
        ["python3", str(auto / "tenmon_repo_hygiene_watchdog_v1.py")],
        cwd=str(repo),
        env=env,
        timeout=120,
    )

    # Phase D — integrators then seals
    stages.append(
        {
            "name": "phase_d_integrators",
            "detail": run_downstream_integrators(repo, api, auto),
        }
    )

    for name, sh in (
        ("phase_d_single_source", "tenmon_final_single_source_seal_v1.sh"),
        ("phase_d_operable_seal", "tenmon_final_operable_seal_v1.sh"),
        ("phase_d_worldclass_claim", "tenmon_final_worldclass_claim_gate_v1.sh"),
    ):
        stages.append(
            {
                "name": name,
                **run_cmd(
                    ["bash", str(scripts / sh), "--stdout-json"],
                    cwd=str(api),
                    env=env,
                    timeout=120,
                ),
            }
        )

    single = load_json(auto / "tenmon_final_single_source_seal.json")
    op = load_json(auto / "tenmon_final_operable_seal.json")
    wc = load_json(auto / "tenmon_final_worldclass_claim_gate.json")
    stale_v = load_json(auto / "tenmon_stale_evidence_invalidation_verdict.json")
    rej = load_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")

    seal_ready = bool(single.get("seal_ready"))
    wc_claim = bool(
        single.get("worldclass_claim_ready")
        or wc.get("claim_allowed")
        or wc.get("worldclass_ready")
        or wc.get("pass")
    )
    operable_ready = bool(single.get("operable_ready"))

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "operable_ready": operable_ready,
        "seal_ready": seal_ready,
        "worldclass_claim_ready": wc_claim,
        "remaining_blockers": single.get("remaining_blockers") or [],
        "recommended_next_card": single.get("recommended_next_card"),
        "superseded_sources": stale_v.get("superseded_sources") or [],
        "latest_rejudge_pass": rej.get("pass"),
        "operable_seal_pass": op.get("pass"),
        "worldclass_gate_pass": wc.get("pass"),
        "stages": stages,
        "artifacts": {
            "tenmon_latest_state_rejudge_and_seal_refresh_verdict": str(
                auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
            ),
            "tenmon_stale_evidence_invalidation_verdict": str(
                auto / "tenmon_stale_evidence_invalidation_verdict.json"
            ),
            "tenmon_final_single_source_seal": str(auto / "tenmon_final_single_source_seal.json"),
            "tenmon_final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
            "tenmon_final_worldclass_claim_gate": str(auto / "tenmon_final_worldclass_claim_gate.json"),
        },
    }

    dest = auto / SUMMARY_NAME
    dest.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    log_dir = Path(args.log_dir) if args.log_dir.strip() else None
    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        (log_dir / SUMMARY_NAME).write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    if seal_ready or wc_claim:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
