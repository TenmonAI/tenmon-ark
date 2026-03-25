#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_ULTIMATE_COMPLETION_ASCENT_ONECARD_CURSOR_AUTO_V1 — lived → stale → hygiene → single source → optional claim gates。"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_ULTIMATE_COMPLETION_ASCENT_ONECARD_CURSOR_AUTO_V1"
SUMMARY_NAME = "ultimate_completion_summary.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def run_bash(script: Path, repo: Path, extra: list[str] | None = None) -> dict[str, Any]:
    extra = extra or []
    if not script.is_file():
        return {"script": str(script), "skipped": True, "returncode": None}
    r = subprocess.run(
        ["bash", str(script), *extra],
        cwd=str(repo / "api"),
        env={**os.environ, "TENMON_REPO_ROOT": str(repo)},
        capture_output=True,
        text=True,
        timeout=600,
        check=False,
    )
    return {
        "script": str(script),
        "returncode": r.returncode,
        "stderr_tail": (r.stderr or "")[-4000:],
    }


def run_python(py: Path, repo: Path, args: list[str]) -> dict[str, Any]:
    if not py.is_file():
        return {"script": str(py), "skipped": True, "returncode": None}
    r = subprocess.run(
        ["python3", str(py), "--repo-root", str(repo), *args],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    return {
        "script": str(py),
        "returncode": r.returncode,
        "stderr_tail": (r.stderr or "")[-2000:],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--log-dir", default="", help="追加で summary を書くディレクトリ")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--skip-optional-claim-gates",
        action="store_true",
        help="Stage 5（operable / worldclass）をスキップ",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    stages: list[dict[str, Any]] = []

    s1 = run_bash(scripts / "tenmon_phase3_completion_run_v1.sh", repo, [])
    stages.append({"name": "stage1_phase3_lived_seal_proof", **s1})

    s2 = run_bash(scripts / "tenmon_stale_evidence_invalidation_v1.sh", repo, ["--stdout-json"])
    stages.append({"name": "stage2_stale_invalidation", **s2})

    s3 = run_bash(scripts / "tenmon_repo_hygiene_final_seal_v1.sh", repo, ["--stdout-json"])
    stages.append({"name": "stage3_hygiene_final_seal", **s3})

    subprocess.run(
        ["python3", str(auto / "tenmon_repo_hygiene_watchdog_v1.py")],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )

    s4 = run_bash(scripts / "tenmon_final_single_source_seal_v1.sh", repo, ["--stdout-json"])
    stages.append({"name": "stage4_final_single_source_seal", **s4})

    single_path = auto / "tenmon_final_single_source_seal.json"
    single = load_json(single_path)
    seal_ready = bool(single.get("seal_ready"))

    stage5: list[dict[str, Any]] = []
    if seal_ready and not args.skip_optional_claim_gates:
        o = run_python(auto / "tenmon_final_operable_seal_v1.py", repo, ["--stdout-json"])
        stage5.append({"name": "stage5a_operable_seal", **o})
        w = run_python(auto / "tenmon_final_worldclass_claim_gate_v1.py", repo, ["--stdout-json"])
        stage5.append({"name": "stage5b_worldclass_claim_gate", **w})
    elif not seal_ready:
        stage5.append(
            {
                "name": "stage5_optional_claim_gates",
                "skipped": True,
                "reason": "seal_ready=false",
            }
        )
    else:
        stage5.append(
            {
                "name": "stage5_optional_claim_gates",
                "skipped": True,
                "reason": "--skip-optional-claim-gates",
            }
        )

    score = load_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    sysv = load_json(auto / "tenmon_system_verdict.json")
    operable_out = load_json(auto / "tenmon_final_operable_seal.json")
    claim_out = load_json(auto / "tenmon_final_worldclass_claim_gate.json")

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "operable_ready": single.get("operable_ready"),
        "seal_ready": single.get("seal_ready"),
        "worldclass_claim_ready": single.get("worldclass_claim_ready"),
        "remaining_blockers": single.get("remaining_blockers"),
        "score_percent": score.get("score_percent"),
        "system_overall_band": sysv.get("overall_band"),
        "recommended_next_card": single.get("recommended_next_card"),
        "operable_seal_pass": operable_out.get("pass"),
        "worldclass_claim_pass": claim_out.get("pass"),
        "stages": stages,
        "stage5": stage5,
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

    # パイプライン成功: single source が seal または worldclass を満たす
    if single.get("seal_ready") or single.get("worldclass_claim_ready"):
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
