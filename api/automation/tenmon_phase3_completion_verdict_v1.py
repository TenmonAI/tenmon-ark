#!/usr/bin/env python3
"""
TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1
lived / seal / remote proof / worldclass を読み phase3_pass を一枚化する。
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_phase3_completion_verdict.json"


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def lived_recheck_pass(lived: dict[str, Any]) -> bool:
    if lived.get("env_failure"):
        return False
    return bool(lived.get("final_ready"))


def final_seal_pass(seal: dict[str, Any]) -> bool:
    sig = seal.get("signals") if isinstance(seal.get("signals"), dict) else {}
    return bool(seal.get("pass", sig.get("unified_pass")))


def pick_next(
    *,
    lived_ok: bool,
    seal_ok: bool,
    remote_ok: bool,
    wc_ready: bool,
    seal: dict[str, Any],
    plan: dict[str, Any],
) -> str:
    if not lived_ok:
        return "TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1"
    if not seal_ok:
        r = plan.get("recommended_retry_card") or seal.get("recommended_retry_card")
        if isinstance(r, str) and r.strip():
            return r.strip()
        return "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1"
    if not remote_ok:
        return "TENMON_REMOTE_ADMIN_CURSOR_RUNTIME_PROOF_CURSOR_AUTO_V1"
    if not wc_ready:
        return "TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1"
    return "TENMON_PHASE3_COMPLETION_DONE_V1"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    out_path = Path(args.out) if args.out else (auto / OUT_NAME)

    lived = read_json(auto / "pwa_lived_completion_readiness.json")
    seal = read_json(auto / "pwa_final_seal_and_regression_guard_verdict.json")
    plan = read_json(auto / "pwa_final_seal_retry_plan.json")
    remote = read_json(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")
    wc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    l_pass = lived_recheck_pass(lived)
    s_pass = final_seal_pass(seal)
    r_ok = bool(remote.get("remote_admin_runtime_proven"))
    w_ready = bool(wc.get("worldclass_ready"))

    phase3_pass = bool(l_pass and s_pass and r_ok and w_ready)

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": ts,
        "lived_recheck_pass": l_pass,
        "final_seal_pass": s_pass,
        "remote_admin_runtime_proven": r_ok,
        "worldclass_ready": w_ready,
        "phase3_pass": phase3_pass,
        "recommended_next_card": (
            "TENMON_PHASE3_COMPLETION_DONE_V1"
            if phase3_pass
            else pick_next(
                lived_ok=l_pass,
                seal_ok=s_pass,
                remote_ok=r_ok,
                wc_ready=w_ready,
                seal=seal,
                plan=plan,
            )
        ),
        "inputs": {
            "pwa_lived_completion_readiness": str(auto / "pwa_lived_completion_readiness.json"),
            "pwa_final_seal_and_regression_guard_verdict": str(auto / "pwa_final_seal_and_regression_guard_verdict.json"),
            "pwa_final_seal_retry_plan": str(auto / "pwa_final_seal_retry_plan.json"),
            "tenmon_remote_admin_cursor_runtime_proof_verdict": str(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json"),
            "tenmon_worldclass_acceptance_scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "phase3_pass": phase3_pass, "out": str(out_path)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
