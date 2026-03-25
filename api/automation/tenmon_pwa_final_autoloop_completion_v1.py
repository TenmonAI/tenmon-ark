#!/usr/bin/env python3
"""TENMON_PWA_FINAL_AUTOLOOP_COMPLETION — orchestrates last-mile loops.

環境前提: `api/scripts/tenmon_pwa_runtime_env_and_playwright_restore_v1.sh` で
pip / Python Playwright / gate URL 正規化を先に復旧してから実行すること。

Seal カード `TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1` では、
本 autoloop の前に `pwa_seal_lived_snapshot.json` が seal runner により保存される。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1"
RETRY_CARD = "TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1"

MAX_LOOPS = 3
MAX_FIXES_PER_LOOP = 2

LOOP_GROUPS: list[list[str]] = [
    ["url_sync_missing", "response_threadid_unused", "refresh_restore_fail"],
    ["newchat_reload_residue", "thread_switch_event_missing", "old_thread_restore_fail", "chatlayout_not_bound"],
    ["naming_residue", "continuity_fail", "duplicate_or_bleed_fail", "cosmetic_duplicate"],
]

PRIORITY = [
    "url_sync_missing",
    "response_threadid_unused",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "thread_switch_event_missing",
    "old_thread_restore_fail",
    "chatlayout_not_bound",
    "continuity_fail",
    "duplicate_or_bleed_fail",
    "naming_residue",
    "cosmetic_duplicate",
    "selector_or_dom_drift",
    "auth_gate_unresolved",
    "gate_health_fail",
    "gate_audit_build_fail",
    "gate_audit_fail",
]

COSMETIC_BLOCKERS = {"naming_residue", "cosmetic_duplicate"}
MAJOR_BLOCKERS = {
    "url_sync_missing",
    "response_threadid_unused",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "thread_switch_event_missing",
    "old_thread_restore_fail",
    "chatlayout_not_bound",
    "continuity_fail",
    "duplicate_or_bleed_fail",
    "selector_or_dom_drift",
    "auth_gate_unresolved",
    "gate_health_fail",
    "gate_audit_build_fail",
    "gate_audit_fail",
}


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def as_bool(v: Any) -> bool:
    return bool(v is True)


def read_blockers_from_file(path: Path) -> list[str]:
    data = read_json(path)
    out: list[str] = []
    if isinstance(data.get("blockers"), list):
        out.extend([str(x).strip() for x in data.get("blockers", []) if str(x).strip()])
    if isinstance(data.get("retry_if_fail"), list):
        out.extend([str(x).strip() for x in data.get("retry_if_fail", []) if str(x).strip()])
    return sorted(set(out))


def aggregate_inputs(auto: Path) -> dict[str, Any]:
    srcs = [
        auto / "pwa_real_browser_lastmile_blockers.json",
        auto / "pwa_real_browser_lastmile_postfix_readiness.json",
        auto / "pwa_lived_completion_readiness.json",
        auto / "pwa_lived_completion_blockers.json",
        auto / "final_pwa_completion_readiness.json",
        auto / "pwa_probe_gap_report.json",
    ]
    found = [str(p) for p in srcs if p.exists()]

    blockers: list[str] = []
    for p in srcs:
        blockers.extend(read_blockers_from_file(p))
    blockers = sorted(set(blockers))

    lived = read_json(auto / "pwa_lived_completion_readiness.json")
    lastmile_postfix = read_json(auto / "pwa_real_browser_lastmile_postfix_readiness.json")
    final_ready_prev = read_json(auto / "final_pwa_completion_readiness.json")
    gap = read_json(auto / "pwa_probe_gap_report.json")

    # 補完ルール（artifact から blockers へ持ち上げ）
    if lived:
        env_fail = as_bool(lived.get("env_failure"))
        if not as_bool(lived.get("url_sync_readiness")):
            blockers.append("url_sync_missing")
        if not as_bool(lived.get("refresh_restore_readiness")):
            blockers.append("refresh_restore_fail")
        if not as_bool(lived.get("new_chat_readiness")):
            blockers.append("newchat_reload_residue")
        if not as_bool(lived.get("continuity_readiness")):
            blockers.append("continuity_fail")
        # env_failure 時は gate 系を product blocker に混ぜない（false fail 防止）
        if not env_fail and not as_bool(lived.get("audit_build_ok")):
            blockers.append("gate_audit_build_fail")

    if lastmile_postfix and isinstance(lastmile_postfix.get("postfix_blockers"), list):
        blockers.extend([str(x).strip() for x in lastmile_postfix.get("postfix_blockers", []) if str(x).strip()])

    rows = gap.get("rows") if isinstance(gap.get("rows"), list) else []
    if rows:
        if any(bool(r.get("duplicate_paragraph")) for r in rows if isinstance(r, dict)):
            blockers.append("duplicate_or_bleed_fail")
        if any(bool(r.get("meta_leak")) for r in rows if isinstance(r, dict)):
            blockers.append("duplicate_or_bleed_fail")

    blockers = sorted(set(blockers))
    return {
        "input_sources_found": found,
        "integrated_blockers": blockers,
        "lived_completion_readiness": lived,
        "lastmile_postfix_readiness": lastmile_postfix,
        "previous_final_readiness": final_ready_prev,
    }


def pick_loop_targets(blockers: list[str], loop_index: int) -> list[str]:
    group = LOOP_GROUPS[min(max(loop_index, 0), len(LOOP_GROUPS) - 1)]
    selected: list[str] = []
    for b in PRIORITY:
        if b in blockers and b in group:
            selected.append(b)
        if len(selected) >= MAX_FIXES_PER_LOOP:
            break
    return selected


def run_autofix_shell(repo_root: Path, stdout_json: bool) -> dict[str, Any]:
    script = repo_root / "api" / "scripts" / "tenmon_pwa_real_browser_lastmile_autofix_v1.sh"
    cmd = ["bash", str(script)]
    if stdout_json:
        cmd.append("--stdout-json")
    p = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True, check=False)
    return {
        "rc": int(p.returncode),
        "stdout_tail": (p.stdout or "")[-4000:],
        "stderr_tail": (p.stderr or "")[-4000:],
    }


def compute_gate(readiness: dict[str, Any], blockers: list[str]) -> dict[str, Any]:
    lower = set(blockers)
    threadid_surface_pass = "response_threadid_unused" not in lower
    url_sync_pass = "url_sync_missing" not in lower
    refresh_restore_pass = "refresh_restore_fail" not in lower
    newchat_pass = "newchat_reload_residue" not in lower and "thread_switch_event_missing" not in lower
    continuity_pass = "continuity_fail" not in lower and "old_thread_restore_fail" not in lower
    duplicate_or_bleed_pass = "duplicate_or_bleed_fail" not in lower
    audit_build_pass = "gate_audit_build_fail" not in lower

    all_pass = (
        threadid_surface_pass
        and url_sync_pass
        and refresh_restore_pass
        and newchat_pass
        and continuity_pass
        and duplicate_or_bleed_pass
        and audit_build_pass
    )
    cosmetic_only = (not all_pass) and all(b in COSMETIC_BLOCKERS for b in lower) if lower else False
    has_major = any(b in MAJOR_BLOCKERS for b in lower)
    final_ready = all_pass or (cosmetic_only and not has_major)

    return {
        "threadid_surface_pass": threadid_surface_pass,
        "url_sync_pass": url_sync_pass,
        "refresh_restore_pass": refresh_restore_pass,
        "newchat_pass": newchat_pass,
        "continuity_pass": continuity_pass,
        "duplicate_or_bleed_pass": duplicate_or_bleed_pass,
        "audit_build_pass": audit_build_pass,
        "cosmetic_residual_only": cosmetic_only,
        "final_ready": final_ready,
        "postfix_blockers": blockers,
        "autofix_readiness_snapshot": readiness,
    }


def write_retry_md(path: Path, blockers: list[str], loop_used: int) -> None:
    lines = [
        "# TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1",
        "",
        f"- parent_card: {CARD}",
        f"- loops_executed: {loop_used}",
        f"- remaining_blockers: {blockers}",
        "- action: 次ループで取り切れない blocker を個別カード化して再試行",
        "",
        "## retry targets",
        "",
    ]
    lines.extend([f"- {b}" for b in blockers] or ["- none"])
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_seal_md(path: Path, readiness_path: Path, state_path: Path) -> None:
    lines = [
        "# TENMON_PWA_FINAL_COMPLETION_SEAL",
        "",
        f"- card: {CARD}",
        f"- sealed_at: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        "- final_ready: true",
        f"- readiness_json: {readiness_path}",
        f"- state_json: {state_path}",
        "- evidence: api/automation/pwa_real_browser_lastmile_audit_report.json",
        "- run_log: /var/log/tenmon/card_TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1/*/run.log",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("repo_root", type=str)
    ap.add_argument("--stdout-json", action="store_true")
    ns = ap.parse_args()

    root = Path(ns.repo_root).resolve()
    auto = root / "api" / "automation"
    gen = auto / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)

    aggregated = aggregate_inputs(auto)
    initial_blockers = list(aggregated["integrated_blockers"])

    loop_logs: list[dict[str, Any]] = []
    current_blockers = list(initial_blockers)
    final_readiness_snapshot = read_json(auto / "pwa_real_browser_lastmile_postfix_readiness.json")

    for i in range(MAX_LOOPS):
        loop_no = i + 1
        targets = pick_loop_targets(current_blockers, i)
        if not current_blockers:
            loop_logs.append({"loop": loop_no, "status": "skip_no_blocker", "selected_fixes": []})
            break
        if not targets:
            loop_logs.append({"loop": loop_no, "status": "skip_no_target", "selected_fixes": [], "blockers": current_blockers})
            break

        run = run_autofix_shell(root, ns.stdout_json)
        final_readiness_snapshot = read_json(auto / "pwa_real_browser_lastmile_postfix_readiness.json")
        latest = read_json(auto / "pwa_real_browser_lastmile_blockers.json")
        if isinstance(latest.get("blockers"), list):
            current_blockers = sorted(set(str(x) for x in latest.get("blockers", [])))
        else:
            current_blockers = sorted(set(current_blockers))

        loop_logs.append(
            {
                "loop": loop_no,
                "selected_fixes": targets[:MAX_FIXES_PER_LOOP],
                "runner": "tenmon_pwa_real_browser_lastmile_autofix_v1.sh",
                "runner_result": run,
                "postfix_blockers": current_blockers,
                "status": "pass" if not current_blockers else "fail",
            }
        )
        if not current_blockers:
            break

    readiness = compute_gate(final_readiness_snapshot, current_blockers)
    pf = read_json(auto / "pwa_playwright_preflight.json")
    if pf:
        readiness["env_failure"] = bool(pf.get("env_failure")) or not bool(pf.get("usable", True))
        readiness["driver_selected"] = pf.get("driver_selected") or pf.get("selected_driver")
        readiness["playwright_preflight_usable"] = bool(pf.get("usable", True))
        if readiness["env_failure"]:
            readiness["env_failure_reason"] = pf.get("reason") or ";".join(pf.get("reasons", []))
            readiness["final_ready"] = False
    blockers_out = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "blockers": current_blockers,
        "major_blockers": [b for b in current_blockers if b in MAJOR_BLOCKERS],
        "cosmetic_blockers": [b for b in current_blockers if b in COSMETIC_BLOCKERS],
    }
    state = {
        "card": CARD,
        "generated_at": blockers_out["generated_at"],
        "max_loops": MAX_LOOPS,
        "max_fixes_per_loop": MAX_FIXES_PER_LOOP,
        "input_aggregation": aggregated,
        "initial_blockers": initial_blockers,
        "loops": loop_logs,
        "final_blockers": current_blockers,
        "final_ready": readiness["final_ready"],
    }

    state_path = auto / "pwa_final_autoloop_state.json"
    readiness_path = auto / "pwa_final_completion_readiness.json"
    blockers_path = auto / "pwa_final_completion_blockers.json"
    seal_path = auto / "pwa_final_completion_seal.md"
    retry_path = gen / "TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1.md"

    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    readiness_path.write_text(json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8")
    blockers_path.write_text(json.dumps(blockers_out, ensure_ascii=False, indent=2), encoding="utf-8")

    if readiness["final_ready"]:
        write_seal_md(seal_path, readiness_path, state_path)
        if retry_path.exists():
            retry_path.unlink()
    else:
        write_retry_md(retry_path, current_blockers, len(loop_logs))

    summary = {
        "ok": readiness["final_ready"],
        "final_ready": readiness["final_ready"],
        "cosmetic_residual_only": readiness["cosmetic_residual_only"],
        "final_blockers": current_blockers,
        "loop_count": len(loop_logs),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if readiness["final_ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

