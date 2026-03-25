#!/usr/bin/env python3
"""
TENMON_SELF_REPAIR_OS_ACCEPTANCE_SEAL_CURSOR_AUTO_V1
safe patch loop 候補を acceptance / audit / regression でしか封印しない。
build 成功のみでは採用しない。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_REPAIR_OS_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"
AUTO = Path(__file__).resolve().parent


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(AUTO.parent.parent))
    ap.add_argument("--soft-exit-ok", action="store_true", help="sealed=false でも exit 0")
    args = ap.parse_args()
    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    safe_loop_path = auto / "tenmon_self_repair_safe_loop_verdict.json"
    vps_path = auto / "vps_acceptance_report.json"
    learn_path = auto / "learning_acceptance_audit.json"
    int_seal_path = auto / "integrated_acceptance_seal.json"
    reg_path = auto / "regression_report.json"
    seal_path = auto / "self_repair_seal.json"
    dpb_path = auto / "dangerous_patch_blocker_report.json"

    safe_loop = read_json(safe_loop_path)
    dpb = read_json(dpb_path)
    vps = read_json(vps_path)
    learn = read_json(learn_path)
    int_seal = read_json(int_seal_path)
    reg = read_json(reg_path)

    candidate = safe_loop.get("recommended_candidate")
    if candidate is not None and not isinstance(candidate, dict):
        candidate = None

    safe_pass = bool(safe_loop.get("pass")) and bool(safe_loop.get("execution_allowed"))

    # --- build_ok: npm/tsc 成功（build success ≠ 採用だが gate には必要）
    build_ok = False
    static_ax = ((int_seal.get("axes") or {}).get("static") or {}).get("summary") or {}
    if static_ax:
        build_ok = bool(static_ax.get("ok")) and int(static_ax.get("npm_build_rc", 1)) == 0
    else:
        build_ok = int(vps.get("build_rc", 1)) == 0

    # --- audit_ok: health/audit 系
    audit_ok = False
    rt_ax = ((int_seal.get("axes") or {}).get("runtime") or {}).get("summary") or {}
    if rt_ax:
        audit_ok = bool(rt_ax.get("audit_ok")) and bool(rt_ax.get("health_ok"))
    else:
        audit_ok = bool(vps.get("overall_pass")) and int(vps.get("seal_rc", 1)) == 0

    # --- acceptance_ok: learning + integrated seal + vps
    acceptance_ok = (
        bool(learn.get("overall_pass"))
        and bool(int_seal.get("overall_pass"))
        and bool(vps.get("overall_pass"))
    )

    # --- regression_ok: system audit regression + legacy comparison
    regression_ok = True
    sar = reg.get("system_audit_regression")
    if isinstance(sar, dict):
        regression_ok = not bool(sar.get("regression_detected")) and bool(sar.get("continue", True))
    comp = reg.get("comparison") or {}
    if isinstance(comp, dict) and comp.get("regression_detected") is True:
        regression_ok = False

    reasons: list[str] = []
    if not safe_pass:
        reasons.append("safe_patch_loop_not_pass_execution_not_allowed")
    if not build_ok:
        reasons.append("build_gate_failed")
    if not audit_ok:
        reasons.append("audit_or_runtime_gate_failed")
    if not acceptance_ok:
        reasons.append("acceptance_overall_pass_failed")
    if not regression_ok:
        reasons.append("regression_gate_failed")

    sealed = safe_pass and build_ok and audit_ok and acceptance_ok and regression_ok
    if candidate is None and safe_pass:
        reasons.append("no_recommended_candidate")
        sealed = False

    rollback_required = not sealed and (
        not regression_ok
        or not acceptance_ok
        or not build_ok
        or bool(dpb.get("blocked"))
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pass": sealed,
        "candidate": candidate,
        "build_ok": build_ok,
        "audit_ok": audit_ok,
        "acceptance_ok": acceptance_ok,
        "regression_ok": regression_ok,
        "sealed": sealed,
        "rollback_required": rollback_required,
        "reason": "; ".join(reasons) if reasons else "all_gates_pass_acceptance_seal",
        "inputs": {
            "safe_loop_verdict": str(safe_loop_path),
            "vps_acceptance_report": str(vps_path),
            "learning_acceptance_audit": str(learn_path),
            "integrated_acceptance_seal": str(int_seal_path),
            "regression_report": str(reg_path),
        },
        "policy": {
            "build_success_alone_does_not_adopt": True,
            "seal_requires_all": ["safe_patch_loop_pass", "build_ok", "audit_ok", "acceptance_ok", "regression_ok"],
        },
    }

    verdict_path = auto / "tenmon_self_repair_acceptance_seal_verdict.json"
    verdict_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if sealed and seal_path.is_file():
        prev = read_json(seal_path)
        prev["acceptance_seal"] = {
            "card": CARD,
            "generated_at": out["generated_at"],
            "sealed": True,
            "candidate": candidate,
            "verdict_path": str(verdict_path),
        }
        prev["self_repair_acceptance_complete"] = True
        seal_path.write_text(json.dumps(prev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "sealed": sealed, "path": str(verdict_path)}, ensure_ascii=False, indent=2))

    if args.soft_exit_ok:
        return 0
    return 0 if sealed else 1


if __name__ == "__main__":
    raise SystemExit(main())
