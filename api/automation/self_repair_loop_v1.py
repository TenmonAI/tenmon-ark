#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARENT_05: 失敗分類・rollback 計画・alternate・anti-regression・学習品質ブリッジを一巡させる共通ループ。
chat.ts / route 本体 / DB schema 非改変。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

from rollback_planner_v1 import plan as rollback_git_plan
from self_repair_common_v1 import api_automation, utc_now_iso

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_RETRY_CURSOR_AUTO_V1"


def _repo_root() -> Path:
    # api/automation -> parents[0]=api, parents[1]=repo root
    return api_automation().parents[1]


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _run_py(mod: str, extra: List[str] | None = None) -> Tuple[bool, str]:
    auto = api_automation()
    script = auto / mod
    if not script.is_file():
        return False, f"missing {mod}"
    p = subprocess.run(
        [sys.executable, str(script)] + (extra or []),
        cwd=str(auto),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    ok = p.returncode == 0
    return ok, (p.stderr or p.stdout or "")[:2000]


def _allowed_revert_path(rel: str) -> bool:
    r = rel.replace("\\", "/").strip()
    if not r or r.startswith("../"):
        return False
    if r == "api/src/routes/chat.ts" or "kokuzo_pages" in r:
        return False
    if r.startswith("dist/") or r == "dist":
        return False
    if r == "api/src/db/schema.sql":
        return False
    return True


def _dangerous_checkout_candidates(dpb: Dict[str, Any]) -> List[str]:
    if not dpb.get("blocked"):
        return []
    out: List[str] = []
    for f in dpb.get("changed_files") or []:
        s = str(f).replace("\\", "/")
        if _allowed_revert_path(s):
            out.append(s)
    return out[:30]


def _execute_dangerous_rollbacks(repo: Path, paths: List[str]) -> Dict[str, Any]:
    if os.environ.get("TENMON_AUTO_ROLLBACK_DANGEROUS", "").strip() != "1":
        return {
            "executed": False,
            "reason": "set TENMON_AUTO_ROLLBACK_DANGEROUS=1 to git checkout -- <paths> for blocked dangerous_patch",
            "paths_skipped": paths,
        }
    done: List[str] = []
    err: List[str] = []
    for rel in paths:
        p = subprocess.run(
            ["git", "checkout", "--", rel],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if p.returncode == 0:
            done.append(rel)
        else:
            err.append(f"{rel}: {(p.stderr or p.stdout or '').strip()[:500]}")
    return {"executed": True, "paths_reverted": done, "errors": err}


def build_rollback_plan_json(repo: Path, dpb: Dict[str, Any]) -> Dict[str, Any]:
    base = rollback_git_plan(repo)
    cands = _dangerous_checkout_candidates(dpb)
    revert_cmds = [{"action": "git_checkout", "path": p, "command": f"git checkout -- {p}"} for p in cands]
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "fail_next_cursor_card": FAIL_NEXT,
        "git_log_suggestions": base.get("suggestions") or [],
        "dangerous_patch_blocked": bool(dpb.get("blocked")),
        "dangerous_revert_candidates": revert_cmds,
        "policy": {
            "git_log": base.get("policy") or "observation_only",
            "dangerous_paths": "revert_allowed_paths_only; chat.ts/schema/kokuzo_pages/dist 禁止",
            "auto_apply_env": "TENMON_AUTO_ROLLBACK_DANGEROUS=1",
        },
        "notes": base.get("notes") or [],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="self_repair_loop_v1 (PARENT_05)")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    repo = _repo_root()
    steps: List[Dict[str, Any]] = []

    optional_scorers = [
        "learning_quality_scorer_v1.py",
        "seed_quality_scorer_v1.py",
        "evidence_grounding_scorer_v1.py",
        "conversation_learning_bridge_v1.py",
    ]
    for mod in optional_scorers:
        ok, msg = _run_py(mod)
        steps.append({"step": mod, "ok": ok, "detail": msg[:500] if not ok else "ok"})

    ok, msg = _run_py("improvement_quality_bridge_v1.py")
    steps.append({"step": "improvement_quality_bridge_v1.py", "ok": ok, "detail": msg[:500] if not ok else "ok"})

    for mod in ("dangerous_patch_blocker_v1.py", "patch_diff_minimizer_v1.py", "fail_classifier_v1.py"):
        ok, msg = _run_py(mod)
        steps.append({"step": mod, "ok": ok, "detail": msg[:500] if not ok else "ok"})

    dpb = _read(auto / "dangerous_patch_blocker_report.json")
    rb_body = build_rollback_plan_json(repo, dpb)
    cands = [x["path"] for x in rb_body.get("dangerous_revert_candidates") or []]
    rb_body["auto_rollback_execution"] = _execute_dangerous_rollbacks(repo, cands)
    rb_path = auto / "rollback_plan.json"
    rb_path.write_text(json.dumps(rb_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    steps.append({"step": "rollback_plan.json", "ok": True, "detail": str(rb_path)})

    for mod in (
        "alternate_strategy_generator_v1.py",
        "rollback_trigger_v1.py",
        "retry_queue_orchestrator_v1.py",
    ):
        ok, msg = _run_py(mod)
        steps.append({"step": mod, "ok": ok, "detail": msg[:500] if not ok else "ok"})

    ok, msg = _run_py(
        "anti_regression_memory_v1.py",
        ["--from-classification", "--from-dangerous", "--note", "parent_05_self_repair_loop"],
    )
    steps.append({"step": "anti_regression_memory_v1.py", "ok": ok, "detail": msg[:500] if not ok else "ok"})

    env = {**os.environ, "TENMON_SELF_REPAIR_SEAL_SKIP_ANTI_REGRESSION": "1"}
    p = subprocess.run(
        [sys.executable, str(auto / "self_repair_seal_v1.py")],
        cwd=str(auto),
        capture_output=True,
        text=True,
        timeout=180,
        env=env,
        check=False,
    )
    steps.append(
        {
            "step": "self_repair_seal_v1.py",
            "ok": p.returncode == 0,
            "detail": (p.stderr or p.stdout or "")[:500],
        },
    )

    seal = _read(auto / "self_repair_seal.json")
    fc = _read(auto / "fail_classification.json")
    alt = _read(auto / "alternate_strategy.json")
    mem = _read(auto / "anti_regression_memory.json")
    bridge = _read(auto / "learning_quality_bridge.json")

    parent_seal = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "self_repair_cycle_complete": seal.get("self_repair_cycle_complete"),
        "self_repair_seal_card": seal.get("card"),
        "artifacts": {
            "self_repair_result": str(auto / "self_repair_result.json"),
            "rollback_plan": str(rb_path),
            "fail_classification": str(auto / "fail_classification.json"),
            "alternate_strategy": str(auto / "alternate_strategy.json"),
            "anti_regression_memory": str(auto / "anti_regression_memory.json"),
            "learning_quality_bridge": str(auto / "learning_quality_bridge.json"),
            "self_repair_seal": str(auto / "self_repair_seal.json"),
        },
        "summary": {
            "primary_fail_type": fc.get("primary_fail_type"),
            "fail_types": fc.get("fail_types"),
            "unified_learning_score": (bridge.get("scores") or {}).get("unified_score"),
        },
    }
    (auto / "self_repair_loop_parent_05_seal.json").write_text(
        json.dumps(parent_seal, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    result = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "steps": steps,
        "paths": parent_seal["artifacts"],
        "primary_fail_type": fc.get("primary_fail_type"),
        "fail_types": fc.get("fail_types"),
    }
    (auto / "self_repair_result.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    (auto / VPS_MARKER).write_text(
        f"{VPS_MARKER}\n{utc_now_iso()}\nfail_next={FAIL_NEXT}\n",
        encoding="utf-8",
    )

    out = {"ok": True, "paths": result["paths"], "primary_fail_type": fc.get("primary_fail_type")}
    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
