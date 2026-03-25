#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1

単一起動点から manifest に基づく計画・検証・verdict 束ねを行う（v1 はローカル合成中心）。
remote VPS 実実行は既存 queue / admin route に委譲し、本モジュールは契約・状態・最終裁定を固定する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1"
MANIFEST = "tenmon_full_autopilot_manifest_v1.json"
STATE = "tenmon_full_autopilot_state_v1.json"
VERDICT_OUT = "tenmon_full_autopilot_verdict_v1.json"
RETRY_OUT = "tenmon_full_autopilot_retry_v1.json"
HARDSTOP_VERDICT = "tenmon_execution_gate_hardstop_verdict.json"
ROLLBACK_VERDICT = "tenmon_rollback_autotrigger_and_restore_verdict.json"


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def repo_root() -> Path:
    return Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()


def auto_dir() -> Path:
    return repo_root() / "api" / "automation"


def read_json(p: Path) -> dict[str, Any]:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(p: Path, d: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_manifest(m: dict[str, Any]) -> tuple[bool, list[str]]:
    errs: list[str] = []
    if not m.get("ordered_cards"):
        errs.append("missing ordered_cards")
    oc = m.get("ordered_cards")
    if isinstance(oc, list):
        cards_meta = m.get("cards") or {}
        for cid in oc:
            if cid not in cards_meta:
                errs.append(f"ordered card not in cards map: {cid}")
    return len(errs) == 0, errs


def load_or_init_state(path: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    st = read_json(path)
    if not st.get("version"):
        ec = manifest.get("entry_cards")
        first = ec[0] if isinstance(ec, list) and ec else None
        st = {
            "version": 1,
            "card": "TENMON_FULL_AUTOPILOT_STATE_V1",
            "state": "pending",
            "current_card": first,
            "completed_cards": [],
            "failed_cards": [],
            "retry_cards": [],
            "last_remote_job_id": None,
            "last_result_bundle": None,
            "final_gate": "open",
            "last_hardstop_verdict_path": None,
            "last_hardstop_retry_card": None,
            "last_rollback_verdict_path": None,
            "updated_at": _utc(),
        }
    return st


def run_hardstop(repo: Path) -> tuple[bool, dict[str, Any]]:
    """TENMON_EXECUTION_GATE_HARDSTOP — FAIL なら autopilot 継続不可"""
    py = repo / "api" / "automation" / "tenmon_execution_gate_hardstop_v1.py"
    vp = repo / "api" / "automation" / HARDSTOP_VERDICT
    if not py.is_file():
        return True, {"skipped": True, "reason": "hardstop_script_missing"}
    p = subprocess.run(
        [sys.executable, str(py), "--repo-root", str(repo)],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    body = read_json(vp) if vp.is_file() else {}
    body["subprocess_rc"] = p.returncode
    allowed = bool(body.get("allowed_to_continue")) and not bool(body.get("must_block"))
    ok = p.returncode == 0 and allowed
    return ok, body


def run_rollback_assess(repo: Path, auto: Path) -> dict[str, Any]:
    """campaign FAIL 後の rollback 要否を assess（git は実行しない）"""
    py = repo / "api" / "automation" / "tenmon_rollback_autotrigger_and_restore_v1.py"
    if not py.is_file():
        return {}
    subprocess.run(
        [sys.executable, str(py), "--repo-root", str(repo), "--mode", "assess"],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    return read_json(auto / ROLLBACK_VERDICT)


def run_execution_gate(repo: Path) -> tuple[bool, dict[str, Any]]:
    py = repo / "api" / "automation" / "execution_gate_v1.py"
    rep_path = repo / "api" / "automation" / "reports" / "execution_gate_v1.json"
    if not py.is_file():
        return True, {"skipped": True, "reason": "execution_gate_v1.py missing"}
    try:
        p = subprocess.run(
            [sys.executable, str(py), "--repo-root", str(repo), "--emit-report"],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        body: dict[str, Any] = {"rc": p.returncode, "stdout_tail": (p.stdout or "")[-2000:]}
        if rep_path.is_file():
            body["report"] = read_json(rep_path)
        report = body.get("report") or {}
        decision = str(report.get("decision") or "")
        # executable のみ dangerous / scope 違反なしとして通過
        gate_ok = decision == "executable"
        body["gate_ok"] = gate_ok
        body["decision"] = decision
        return gate_ok, body
    except Exception as e:
        return False, {"error": str(e)}


def synthesize_verdict(
    repo: Path,
    *,
    state: dict[str, Any],
    manifest: dict[str, Any],
    gate_ok: bool,
    gate_body: dict[str, Any],
) -> dict[str, Any]:
    auto = repo / "api" / "automation"
    sysv = read_json(auto / "tenmon_system_verdict.json")
    reg = read_json(auto / "tenmon_regression_memory.json")
    last_run = reg.get("last_run") if isinstance(reg.get("last_run"), dict) else {}
    regression_detected = bool(last_run.get("regression_detected"))
    hy = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    wc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    seal = read_json(auto / "pwa_final_seal_and_regression_guard_verdict.json")
    sig = seal.get("signals") if isinstance(seal.get("signals"), dict) else {}

    sys_pass = bool(sysv.get("pass") or sysv.get("completion_gate"))
    worldclass_ready = bool(wc.get("worldclass_ready"))
    sealed_operable = bool(wc.get("sealed_operable_ready"))
    repo_clean = bool(hy.get("watchdog_clean")) and not bool(hy.get("must_block_seal"))
    seal_pass = bool(seal.get("pass", sig.get("unified_pass")))

    gb_rep = gate_body.get("report") if isinstance(gate_body.get("report"), dict) else {}
    dangerous_blocked = str(gb_rep.get("decision") or "") == "blocked"

    campaign_pass = bool(
        gate_ok
        and not dangerous_blocked
        and not regression_detected
        and repo_clean
        and seal_pass
        and sealed_operable
        and worldclass_ready
        and sys_pass
    )

    completed = list(state.get("completed_cards") or [])
    failed = list(state.get("failed_cards") or [])
    retry_gen = list(state.get("retry_cards") or [])

    rec = wc.get("recommended_next_card") or sysv.get("final_recommended_card")
    if not rec:
        rec = manifest.get("entry_cards", [None])[0]

    return {
        "card": CARD,
        "generated_at": _utc(),
        "campaign_name": manifest.get("campaign_name"),
        "campaign_pass": campaign_pass,
        "sealed": bool(state.get("final_gate") == "sealed" and campaign_pass),
        "completed_cards": completed,
        "failed_cards": failed,
        "retry_cards_generated": retry_gen,
        "dangerous_blocked": dangerous_blocked,
        "execution_gate_ok": gate_ok,
        "system_verdict_pass": sys_pass,
        "worldclass_ready": worldclass_ready,
        "sealed_operable_ready": sealed_operable,
        "repo_hygiene_clean": repo_clean,
        "pwa_final_seal_pass": seal_pass,
        "regression_detected": regression_detected,
        "final_recommended_next_card": rec,
        "inputs": {
            "manifest": str(auto / MANIFEST),
            "state": str(auto / STATE),
            "tenmon_system_verdict": str(auto / "tenmon_system_verdict.json"),
            "tenmon_regression_memory": str(auto / "tenmon_regression_memory.json"),
            "tenmon_repo_hygiene_watchdog_verdict": str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
            "tenmon_worldclass_acceptance_scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "pwa_final_seal_and_regression_guard_verdict": str(
                auto / "pwa_final_seal_and_regression_guard_verdict.json"
            ),
        },
        "notes": [
            "campaign_pass は v1 で厳密ゲート（worldclass + seal + hygiene + system + regression + execution_gate）。",
            "remote job 実体は queue / admin API に委譲。state の advancing は --step で段階的に。",
        ],
    }


def write_retry_stub(auto: Path, verdict: dict[str, Any]) -> None:
    body = {
        "version": 1,
        "card": "TENMON_FULL_AUTOPILOT_RETRY_V1",
        "generated_at": _utc(),
        "campaign_pass": verdict.get("campaign_pass"),
        "fail_reasons": [] if verdict.get("campaign_pass") else ["campaign_pass_false"],
        "recommended_next_card": verdict.get("final_recommended_next_card"),
        "policy": "invoke_retry_generator_v2_or_manual_card",
    }
    write_json(auto / RETRY_OUT, body)


def advance_state_one(st: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    oc = list(manifest.get("ordered_cards") or [])
    cur = st.get("current_card")
    if not oc:
        st["state"] = "pass"
        return st
    if cur is None:
        st["current_card"] = oc[0]
        st["state"] = "running_local"
        st["updated_at"] = _utc()
        return st
    try:
        idx = oc.index(cur)
    except ValueError:
        st["current_card"] = oc[0]
        st["state"] = "running_local"
        st["updated_at"] = _utc()
        return st
    if idx + 1 < len(oc):
        st["completed_cards"] = list(dict.fromkeys(list(st.get("completed_cards") or []) + [cur]))
        st["current_card"] = oc[idx + 1]
        st["state"] = "running_local"
    else:
        st["completed_cards"] = list(dict.fromkeys(list(st.get("completed_cards") or []) + [cur]))
        st["current_card"] = None
        st["state"] = "pass"
        st["final_gate"] = "pending_seal_review"
    st["updated_at"] = _utc()
    return st


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="execution_gate / state advance を軽量化")
    ap.add_argument(
        "--phase",
        type=str,
        default="full",
        choices=("full", "validate", "verdict", "init", "step"),
    )
    ap.add_argument("--reset-state", action="store_true")
    ap.add_argument(
        "--skip-hardstop",
        action="store_true",
        help="TENMON_EXECUTION_GATE_HARDSTOP をスキップ（緊急時のみ）",
    )
    ap.add_argument(
        "--skip-rollback",
        action="store_true",
        help="campaign fail 時の rollback assess をスキップ",
    )
    args = ap.parse_args()

    root = Path(args.repo_root).resolve() if args.repo_root else repo_root()
    auto = root / "api" / "automation"
    mpath = auto / MANIFEST
    spath = auto / STATE

    manifest = read_json(mpath)
    ok, errs = validate_manifest(manifest)
    if not ok:
        out = {"ok": False, "errors": errs}
        if args.stdout_json:
            print(json.dumps(out, ensure_ascii=False, indent=2))
        return 2

    if args.phase == "validate":
        if args.stdout_json:
            print(json.dumps({"ok": True, "manifest": str(mpath)}, ensure_ascii=False, indent=2))
        return 0

    if args.reset_state:
        spath.unlink(missing_ok=True)

    state = load_or_init_state(spath, manifest)

    # --- Hard stop（fabric 本運用の前段）---
    if args.phase in ("full", "step") and not args.dry_run and not args.skip_hardstop:
        hs_ok, hs_body = run_hardstop(root)
        state["last_hardstop_verdict_path"] = str(auto / HARDSTOP_VERDICT)
        state["last_hardstop_retry_card"] = hs_body.get("recommended_retry_card")
        state["updated_at"] = _utc()
        if not hs_ok:
            state["state"] = "blocked_hardstop"
            write_json(spath, state)
            out = {
                "ok": False,
                "error": "execution_gate_hardstop_failed",
                "hardstop": hs_body,
                "state": str(spath),
            }
            if args.stdout_json:
                print(json.dumps(out, ensure_ascii=False, indent=2))
            return 3
        write_json(spath, state)
    if args.phase == "init":
        write_json(spath, state)
        if args.stdout_json:
            print(json.dumps({"ok": True, "state": str(spath)}, ensure_ascii=False, indent=2))
        return 0

    gate_ok, gate_body = (True, {"skipped": True, "dry_run": True})
    if args.phase == "verdict":
        gate_ok, gate_body = True, {"skipped": True, "phase": "verdict_only"}
    elif not args.dry_run:
        gate_ok, gate_body = run_execution_gate(root)

    if args.phase == "step":
        state = advance_state_one(state, manifest)
        write_json(spath, state)

    verdict = synthesize_verdict(root, state=state, manifest=manifest, gate_ok=gate_ok, gate_body=gate_body)
    write_json(auto / VERDICT_OUT, verdict)
    write_retry_stub(auto, verdict)

    if args.phase == "full" and not args.dry_run:
        if not verdict.get("campaign_pass") and not args.skip_rollback:
            rb = run_rollback_assess(root, auto)
            state["last_rollback_verdict_path"] = str(auto / ROLLBACK_VERDICT)
            state["updated_at"] = _utc()
            if rb.get("rollback_required"):
                if rb.get("rollback_executed") and rb.get("rollback_success") is False:
                    state["state"] = "blocked_rollback"
                elif rb.get("rollback_possible") is False:
                    state["state"] = "rollback_manual_required"
        write_json(spath, state)

    slim = {
        "ok": True,
        "campaign_pass": verdict.get("campaign_pass"),
        "verdict": str(auto / VERDICT_OUT),
        "state": str(spath),
    }
    if args.stdout_json:
        print(json.dumps(slim, ensure_ascii=False, indent=2))

    if args.dry_run or args.phase == "verdict":
        return 0
    return 0 if verdict.get("campaign_pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
