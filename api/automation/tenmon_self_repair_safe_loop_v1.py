#!/usr/bin/env python3
"""
TENMON_SELF_REPAIR_OS_SAFE_PATCH_LOOP_CURSOR_AUTO_V1
dangerous patch blocker / diff minimizer / rollback plan / regression memory を統合し、
safe patch class のみ execution gate へ渡す。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_REPAIR_OS_SAFE_PATCH_LOOP_CURSOR_AUTO_V1"
AUTO = Path(__file__).resolve().parent

SAFE_CLASSES = frozenset({"safe_surface", "safe_runner", "safe_hygiene"})
UNSAFE_CLASSES = frozenset({"unsafe_contract", "unsafe_schema", "unsafe_runtime_core"})


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def classify_patch_class(rel: str) -> str:
    """パスから patch class を推定（unsafe は execution gate に入れない）。"""
    r = rel.replace("\\", "/").strip()
    if not r or r.startswith("../"):
        return "unsafe_runtime_core"
    if "kokuzo_pages" in r:
        return "unsafe_contract"
    if r.startswith("dist/") or r == "dist":
        return "unsafe_contract"
    if "schema.sql" in r or r.startswith("api/src/db/"):
        return "unsafe_schema"
    if r == "api/src/routes/chat.ts":
        return "unsafe_contract"
    if "chat_refactor" in r or r.endswith("/api/src/types/chat.ts"):
        return "unsafe_contract"
    if r.startswith("api/src/routes/"):
        return "unsafe_contract"
    if r.startswith("web/"):
        return "safe_surface"
    if r.startswith("api/scripts/"):
        return "safe_runner"
    if r.endswith(".sh") and "automation" in r:
        return "safe_runner"
    if r.startswith("api/automation/"):
        return "safe_hygiene"
    if r.startswith("docs/") or r.endswith(".md"):
        return "safe_surface"
    if r.startswith("api/src/core/") or r.startswith("api/src/planning/"):
        return "unsafe_runtime_core"
    if r.startswith("api/src/kokuzo/"):
        return "unsafe_runtime_core"
    if r.startswith("api/src/"):
        return "unsafe_runtime_core"
    return "unsafe_runtime_core"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(AUTO.parent.parent))
    ap.add_argument(
        "--soft-exit-ok",
        action="store_true",
        help="execution_allowed=false でも exit 0",
    )
    args = ap.parse_args()
    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    verdict_path = auto / "tenmon_system_verdict.json"
    memory_path = auto / "tenmon_regression_memory.json"
    dpb_path = auto / "dangerous_patch_blocker_report.json"
    mini_path = auto / "patch_diff_minimizer_report.json"
    rb_path = auto / "rollback_plan.json"
    gate_path = auto / "execution_gate_v1.json"

    verdict = read_json(verdict_path)
    memory = read_json(memory_path)
    dpb = read_json(dpb_path)
    mini = read_json(mini_path)
    rollback = read_json(rb_path)
    gate = read_json(gate_path)

    if not verdict.get("subsystems"):
        print(json.dumps({"ok": False, "error": "missing_tenmon_system_verdict.json"}, ensure_ascii=False), file=sys.stderr)
        return 2

    last_run = memory.get("last_run") if isinstance(memory.get("last_run"), dict) else {}
    regression_continue = bool(last_run.get("continue", True))
    if not memory_path.is_file():
        regression_continue = True

    changed = dpb.get("changed_files") or []
    high_risk = set(str(x).replace("\\", "/") for x in (dpb.get("high_risk_hits") or []))
    dangerous_blocked = bool(dpb.get("blocked"))
    large_diff = bool(dpb.get("large_diff"))

    repair_candidates: list[dict[str, Any]] = []
    for f in changed:
        rel = str(f).replace("\\", "/")
        pc = classify_patch_class(rel)
        repair_candidates.append(
            {
                "path": rel,
                "patch_class": pc,
                "in_high_risk_list": rel in high_risk,
            }
        )

    blocked_candidates: list[dict[str, Any]] = []
    safe_candidates: list[dict[str, Any]] = []

    for c in repair_candidates:
        rel = c["path"]
        pc = c["patch_class"]
        reasons: list[str] = []
        if pc in UNSAFE_CLASSES:
            reasons.append("unsafe_patch_class_not_eligible_for_execution_gate")
        if rel in high_risk:
            reasons.append("high_risk_hit")
        if dangerous_blocked and rel in high_risk:
            reasons.append("dangerous_blocker_global_blocked")
        if dangerous_blocked and large_diff:
            reasons.append("large_diff_block")

        if reasons:
            blocked_candidates.append({**c, "block_reasons": reasons})
        elif pc in SAFE_CLASSES:
            safe_candidates.append({**c, "eligible": True})
        else:
            blocked_candidates.append({**c, "block_reasons": ["not_safe_class"]})

    revert_cmds = rollback.get("dangerous_revert_candidates") or []
    rollback_ready = bool(revert_cmds) or bool(rollback.get("git_log_suggestions"))
    if rollback.get("dangerous_patch_blocked") and not revert_cmds:
        rollback_ready = rollback_ready and bool(rollback.get("git_log_suggestions"))

    gate_ok = True
    if gate:
        gate_ok = bool(gate.get("allowed") or gate.get("execution_allowed") or gate.get("ok", True))

    minimizer_ok = not bool(mini.get("large_diff_hint")) and not bool(mini.get("large_diff"))

    # dangerous patch 全体 blocked のときは auto-apply 不可（D: dangerous は execution 不可）
    execution_allowed = (
        not dangerous_blocked
        and len(safe_candidates) > 0
        and rollback_ready
        and regression_continue
        and minimizer_ok
        and gate_ok
    )

    recommended: dict[str, Any] | None = None
    if safe_candidates:
        recommended = dict(safe_candidates[0])

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pass": execution_allowed,
        "repair_candidates": repair_candidates,
        "safe_candidates": safe_candidates,
        "blocked_candidates": blocked_candidates,
        "rollback_ready": rollback_ready,
        "execution_allowed": execution_allowed,
        "recommended_candidate": recommended,
        "inputs": {
            "system_verdict": str(verdict_path),
            "regression_memory": str(memory_path),
            "dangerous_patch_blocker_report": str(dpb_path),
            "patch_diff_minimizer_report": str(mini_path),
            "rollback_plan": str(rb_path),
            "execution_gate_report": str(gate_path) if gate_path.is_file() else None,
        },
        "signals": {
            "dangerous_patch_blocked": dangerous_blocked,
            "regression_continue": regression_continue,
            "diff_minimizer_ok": minimizer_ok,
            "execution_gate_ok": gate_ok,
            "self_repair_subsystem_accepted": bool(
                (verdict.get("subsystems") or {}).get("self_repair_os", {}).get("accepted_complete")
            ),
        },
        "patch_class_policy": {
            "safe_classes": sorted(SAFE_CLASSES),
            "unsafe_classes": sorted(UNSAFE_CLASSES),
            "note": "unsafe_* は execution gate に渡さない。auto-apply は safe class のみ。",
        },
    }

    out_path = auto / "tenmon_self_repair_safe_loop_verdict.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "pass": execution_allowed, "path": str(out_path)}, ensure_ascii=False, indent=2))

    if args.soft_exit_ok:
        return 0
    return 0 if execution_allowed else 1


if __name__ == "__main__":
    raise SystemExit(main())
