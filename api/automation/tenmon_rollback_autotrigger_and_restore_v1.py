#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_CURSOR_AUTO_V1

runtime / audit / acceptance / lived 等の FAIL を統合し、rollback 要否・復旧案・retry を verdict 化する。
既定は **git 破壊的操作なし**（--execute-restore + TENMON_ROLLBACK_APPROVED=1 で限定 restore のみ）。
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

CARD = "TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_CURSOR_AUTO_V1"
VERDICT_NAME = "tenmon_rollback_autotrigger_and_restore_verdict.json"
REPORT_MD = "tenmon_rollback_autotrigger_and_restore_report.md"
FAIL_NEXT = "TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_RETRY_CURSOR_AUTO_V1"

# 自動 git checkout を許すパス接頭辞（最小・automation のみ）
ALLOW_RESTORE_PREFIXES = ("api/automation/",)
BLOCK_SUBSTRINGS = ("chat.ts", "kokuzo", "/dist/", "web/src/", "api/src/routes/")


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


def regression_detected(reg: dict[str, Any]) -> bool:
    lr = reg.get("last_run")
    if isinstance(lr, dict) and lr.get("regression_detected") is True:
        return True
    return False


def collect_triggers(root: Path, auto: Path) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    fab_path = auto / "tenmon_full_autopilot_verdict_v1.json"
    fab = read_json(fab_path) if fab_path.is_file() else {}
    hs = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
    seal = read_json(auto / "pwa_final_seal_and_regression_guard_verdict.json")
    lived = read_json(auto / "pwa_lived_completion_readiness.json")
    hy = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    reg = read_json(auto / "tenmon_regression_memory.json")
    phase2 = read_json(auto / "tenmon_phase2_gate_and_runtime_verdict.json")
    gate = read_json(auto / "tenmon_gate_contract_verdict.json")

    sig = seal.get("signals") if isinstance(seal.get("signals"), dict) else {}
    seal_fail = not bool(seal.get("pass", sig.get("unified_pass")))
    lived_fail = bool(lived.get("env_failure")) or not bool(lived.get("final_ready"))
    audit_signal = not bool(lived.get("audit_ok", True)) or not bool(lived.get("audit_build_ok", True))
    hygiene_block = bool(hy.get("must_block_seal"))
    reg_on = regression_detected(reg)

    if seal_fail:
        reasons.append("final_seal_verdict_fail")
    if lived_fail:
        reasons.append("lived_or_env_fail")
    if audit_signal:
        reasons.append("audit_or_audit_build_signal_fail")
    if hygiene_block:
        reasons.append("repo_hygiene_must_block_seal")
    if reg_on:
        reasons.append("regression_detected")
    if fab_path.is_file() and fab.get("campaign_pass") is False:
        reasons.append("full_autopilot_campaign_fail")
    if hs.get("must_block"):
        reasons.append("execution_gate_hardstop")

    gate_broken = False
    if gate:
        gate_broken = not bool(gate.get("aligned_all", gate.get("gate_contract_aligned", True)))
    else:
        gate_broken = not bool(phase2.get("gate_contract_aligned")) or not bool(
            phase2.get("health_contract_aligned", phase2.get("health_ok"))
        )
    if gate_broken:
        reasons.append("gate_contract_broken")

    # acceptance 代理: system verdict + worldclass
    wc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    acc_fail = not bool(wc.get("sealed_operable_ready")) and bool(wc)
    if acc_fail and (seal_fail or lived_fail):
        reasons.append("acceptance_proxy_fail")

    # build OK / runtime NG は campaign_fail + lived で表現済み
    rollback_required = bool(reasons)
    return rollback_required, reasons


def pick_restore_targets(plan: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in plan.get("dangerous_revert_candidates") or []:
        cmd = str(item.get("command") or "")
        path = str(item.get("path") or "")
        if not cmd.startswith("git checkout"):
            continue
        ok = any(path.replace("\\", "/").startswith(p) for p in ALLOW_RESTORE_PREFIXES)
        bad = any(b in path for b in BLOCK_SUBSTRINGS)
        if ok and not bad:
            out.append({"path": path, "command": cmd})
    return out[:12]


def run_git(repo: Path, *args: str) -> tuple[int, str]:
    try:
        p = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return 1, str(e)


def probe_audit(base: str) -> bool:
    try:
        import urllib.request

        for path in ("/api/audit", "/api/audit.build"):
            url = base.rstrip("/") + path
            req = urllib.request.Request(url, headers={"User-Agent": "tenmon-rollback-probe/1"})
            with urllib.request.urlopen(req, timeout=5) as r:
                if r.status >= 400:
                    return False
        return True
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--mode",
        type=str,
        default="assess",
        choices=("assess", "restore"),
        help="assess=判定のみ restore=承認済みの限定 git checkout",
    )
    ap.add_argument(
        "--execute-restore",
        action="store_true",
        help="restore モードで実コマンド実行（要 TENMON_ROLLBACK_APPROVED=1）",
    )
    args = ap.parse_args()

    root = Path(args.repo_root).resolve() if args.repo_root else repo_root()
    auto = auto_dir()
    plan_path = auto / "rollback_plan.json"
    plan = read_json(plan_path)

    rollback_required, trigger_reasons = collect_triggers(root, auto)
    targets = pick_restore_targets(plan)
    rollback_possible = bool(targets) or bool(plan.get("git_log_suggestions"))

    approved = os.environ.get("TENMON_ROLLBACK_APPROVED", "").strip() in ("1", "true", "yes")
    rollback_executed = False
    rollback_success = False
    restore_logs: list[str] = []
    post_audit_ok: bool | None = None
    post_acceptance_ok: bool | None = None

    restore_target: Any = None
    if targets:
        restore_target = {"kind": "git_checkout_paths", "items": targets[:8]}
    elif plan.get("git_log_suggestions"):
        restore_target = {"kind": "git_log_suggestions", "manual_only": True}

    reason = "; ".join(trigger_reasons) if trigger_reasons else "no_trigger"

    if args.mode == "restore" and args.execute_restore and approved and rollback_required and targets:
        rollback_executed = True
        rc_all = 0
        for t in targets[:8]:
            rc, out = run_git(root, "checkout", "--", t["path"])
            restore_logs.append(f"{t['path']}: rc={rc}")
            if rc != 0:
                rc_all = rc
        rollback_success = rc_all == 0
        base = os.environ.get("TENMON_API_BASE_URL", "http://127.0.0.1:3000")
        post_audit_ok = probe_audit(base)
        post_acceptance_ok = post_audit_ok
    elif args.mode == "restore" and rollback_required and not approved:
        reason += "; rollback_approved_missing"

    recommended_retry = FAIL_NEXT if rollback_required else None

    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "rollback_required": rollback_required,
        "rollback_possible": rollback_possible,
        "rollback_executed": rollback_executed,
        "rollback_success": rollback_success if rollback_executed else None,
        "restore_target": restore_target,
        "post_restore_audit_ok": post_audit_ok,
        "post_restore_acceptance_ok": post_acceptance_ok,
        "recommended_retry_card": recommended_retry,
        "retry_reason": trigger_reasons,
        "retry_scope": "minimal_replace_after_restore" if rollback_required else None,
        "reason": reason,
        "trigger_reasons": trigger_reasons,
        "inputs": {
            "rollback_plan": str(plan_path),
            "tenmon_full_autopilot_verdict": str(auto / "tenmon_full_autopilot_verdict_v1.json"),
            "tenmon_execution_gate_hardstop_verdict": str(auto / "tenmon_execution_gate_hardstop_verdict.json"),
        },
        "evidence": {"restore_git_logs": restore_logs},
        "notes": [
            "既定は assess のみ。restore は api/automation 配下の git checkout のみ・本番は TENMON_ROLLBACK_APPROVED=1。",
            "C14B3: 壊れた状態をこねず、戻してから最小置換で再入。",
        ],
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / VERDICT_NAME).write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    why_lines = [f"- `{r}`" for r in trigger_reasons] or ["- （トリガーなし）"]
    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{verdict['generated_at']}`",
        f"- **rollback_required**: `{rollback_required}`",
        f"- **rollback_possible**: `{rollback_possible}`",
        f"- **rollback_executed**: `{rollback_executed}`",
        "",
        "## Why",
        "",
        *why_lines,
        "",
        "## Restore target",
        "",
        f"```json\n{json.dumps(restore_target, ensure_ascii=False, indent=2)}\n```",
        "",
        "## Retry",
        "",
        f"- recommended_retry_card: `{recommended_retry}`",
        "",
    ]
    (auto / REPORT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    out = {"ok": True, "rollback_required": rollback_required, "path": str(auto / VERDICT_NAME)}
    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    # assess: 常に 0。restore 失敗で 1
    if args.mode == "restore" and rollback_executed and not rollback_success:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
