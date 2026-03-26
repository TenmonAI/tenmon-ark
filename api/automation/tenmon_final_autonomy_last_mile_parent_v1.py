#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1

設置後放置に近づけるための「最終マイル」固定順チェーン。既存 runner のみ配線し、
捏造成功はしない。high-risk は承認契約 runner で前提維持。Mac 専用段は非 Darwin では skipped_mac_only。
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_final_autonomy_last_mile_parent_summary.json"
OUT_MD = "tenmon_final_autonomy_last_mile_parent_report.md"
RETRY_CARD = CARD
NEXT_ON_PASS = "TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。safe retry 1枚のみ生成。"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_darwin() -> bool:
    return platform.system().lower() == "darwin"


def run_cmd(
    cmd: list[str],
    cwd: Path,
    timeout: int,
    env: dict[str, str] | None = None,
) -> dict[str, Any]:
    e = os.environ.copy()
    if env:
        e.update(env)
    try:
        cp = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False, env=e)
        merged = (cp.stdout or "") + (cp.stderr or "")
        return {
            "ok": cp.returncode == 0,
            "exit_code": int(cp.returncode),
            "tail": merged[-6000:],
        }
    except Exception as ex:
        return {"ok": False, "exit_code": None, "tail": f"{type(ex).__name__}: {ex}"}


def write_retry_stub(gen_apply: Path, reason: str, halted_step: int, evidence_paths: list[str]) -> None:
    gen_apply.mkdir(parents=True, exist_ok=True)
    p = gen_apply / f"{RETRY_CARD}.md"
    body = "\n".join(
        [
            f"# {RETRY_CARD} (retry stub)",
            "",
            f"> generated_at: `{utc()}`",
            f"> parent: `{CARD}`",
            f"> halted_step: `{halted_step}`",
            f"> reason: `{reason}`",
            "",
            "## evidence (paths)",
            "",
            *[f"- `{x}`" for x in evidence_paths[:40]],
            "",
            "## DO",
            "",
            f"1. `{OUT_JSON}` の該当 step を確認",
            "2. 最小 diff で修正後、親を再実行（safe retry 1 枚）",
            "",
        ]
    )
    p.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--timeout-sec",
        type=int,
        default=int(os.environ.get("TENMON_LAST_MILE_STEP_TIMEOUT_SEC", "3600")),
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    gen_apply = auto / "generated_cursor_apply"
    auto.mkdir(parents=True, exist_ok=True)

    py = sys.executable
    timeout = max(120, int(args.timeout_sec))

    step_results: list[dict[str, Any]] = []
    halted = False
    halt_reason = ""
    evidence_paths: list[str] = []

    # --- Step 1: Mac runtime bind（redeploy/runbook の実行代理: 既存 bind）---
    s1 = {
        "step": 1,
        "card": "TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1",
        "runner": "scripts/tenmon_mac_cursor_executor_runtime_bind_v1.sh",
        "notes": "Darwin: executor runtime bind。専用 runbook runner は未配線のため既存 bind に寄せる。",
    }
    if not is_darwin():
        s1["status"] = "skipped_mac_only"
        step_results.append(s1)
    else:
        r = run_cmd(["bash", str(scripts / "tenmon_mac_cursor_executor_runtime_bind_v1.sh")], cwd=api, timeout=timeout)
        s1["run"] = r
        s1["status"] = "ok" if r.get("ok") else "fail"
        step_results.append(s1)
        if not r.get("ok"):
            halted = True
            halt_reason = "step1_mac_runtime_bind_failed"
            evidence_paths.append(str(auto / "tenmon_mac_cursor_executor_runtime_bind_summary.json"))

    # --- Step 2: high-risk 承認 + result bind +（Darwin）watch 1tick ---
    if not halted:
        s2: dict[str, Any] = {
            "step": 2,
            "card": "TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN_CURSOR_AUTO_V1",
            "notes": "承認契約 → bind → Mac のみ watch one-shot（TENMON_REMOTE_CURSOR_BASE_URL 必須）",
        }
        r_a = run_cmd(["bash", str(scripts / "tenmon_high_risk_approval_contract_v1.sh")], cwd=api, timeout=timeout)
        r_b = run_cmd(
            ["bash", str(scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")],
            cwd=api,
            timeout=timeout,
        )
        runs2: dict[str, Any] = {"high_risk_contract": r_a, "result_bind": r_b}
        if is_darwin():
            r_w = run_cmd(
                ["bash", str(scripts / "tenmon_cursor_watch_loop.sh")],
                cwd=api,
                timeout=min(timeout, 900),
                env={"TENMON_WATCH_ONE_SHOT": "1"},
            )
            runs2["watch_loop_one_shot"] = r_w
        else:
            runs2["watch_loop_one_shot"] = {"skipped": True, "reason": "non_darwin"}
        s2["runs"] = runs2
        ok2 = bool(r_a.get("ok")) and bool(r_b.get("ok"))
        if is_darwin():
            ok2 = ok2 and bool(runs2["watch_loop_one_shot"].get("ok"))
        s2["status"] = "ok" if ok2 else "fail"
        step_results.append(s2)
        if not ok2:
            halted = True
            halt_reason = "step2_high_risk_chain_failed"
            evidence_paths.extend(
                [
                    str(auto / "tenmon_high_risk_approval_contract_summary.json"),
                    str(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json"),
                ]
            )

    # --- Step 3: browser AI → patch plan mainline ---
    if not halted:
        s3: dict[str, Any] = {
            "step": 3,
            "card": "TENMON_BROWSER_AI_CONSULT_TO_PATCHPLAN_MAINLINE_CURSOR_AUTO_V1",
            "notes": "Darwin: browser_ai_operator → safe_patch_planner。Linux: planner のみ。",
        }
        runs3: dict[str, Any] = {}
        if is_darwin():
            r_ai = run_cmd(["bash", str(scripts / "tenmon_browser_ai_operator_runtime_v1.sh")], cwd=api, timeout=timeout)
            runs3["browser_ai_operator"] = r_ai
        else:
            runs3["browser_ai_operator"] = {"skipped": True, "reason": "non_darwin"}
        r_pp = run_cmd(["bash", str(scripts / "tenmon_safe_patch_planner_v1.sh")], cwd=api, timeout=timeout)
        runs3["safe_patch_planner"] = r_pp
        ec = r_pp.get("exit_code")
        planner_ok = ec in (0, 1) if ec is not None else False
        ai_ok = True
        if is_darwin():
            ai_ok = bool(runs3["browser_ai_operator"].get("ok"))
        ok3 = ai_ok and planner_ok
        s3["runs"] = runs3
        s3["status"] = "ok_warn" if ok3 and ec == 1 else ("ok" if ok3 else "fail")
        if s3["status"] == "ok_warn":
            s3["warn"] = "patch_planner_rc1_observation_ok"
        step_results.append(s3)
        if not ok3:
            halted = True
            halt_reason = "step3_browser_or_planner_failed"
            evidence_paths.append(str(auto / "tenmon_browser_ai_operator_runtime_summary.json"))

    # --- Step 4: systemd / persistent boot（unit 生成は常にローカル可）---
    if not halted:
        s4 = {
            "step": 4,
            "card": "TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1",
            "runner": "scripts/install_tenmon_operations_level_autonomy_timer_v1.sh",
            "notes": "SKIP_SYSTEMCTL_INSTALL=1 で unit のみ生成し exit 0 する既存挙動に従う。",
        }
        r4 = run_cmd(["bash", str(scripts / "install_tenmon_operations_level_autonomy_timer_v1.sh")], cwd=api, timeout=timeout)
        s4["run"] = r4
        s4["status"] = "ok" if r4.get("ok") else "fail"
        step_results.append(s4)
        if not r4.get("ok"):
            halted = True
            halt_reason = "step4_systemd_install_failed"

    # --- Step 5: stall recovery / runtime rescue ---
    if not halted:
        s5 = {
            "step": 5,
            "card": "TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1",
            "runner": "automation/tenmon_continuous_runtime_health_rescue_v1.py",
            "notes": "既存 runtime health rescue に寄せる（専用 heartbeat runner 未配線）。",
        }
        r5 = run_cmd([py, str(auto / "tenmon_continuous_runtime_health_rescue_v1.py")], cwd=api, timeout=timeout)
        s5["run"] = r5
        s5["status"] = "ok" if r5.get("ok") else "fail"
        step_results.append(s5)
        if not r5.get("ok"):
            halted = True
            halt_reason = "step5_runtime_rescue_failed"

    # --- Step 6: morning approval / daybreak + mainline selector ---
    if not halted:
        s6: dict[str, Any] = {
            "step": 6,
            "card": "TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1",
            "notes": "mainline selector → daybreak 観測（queue 契約は変更しない）。",
        }
        r6a = run_cmd([py, str(auto / "tenmon_conversation_worldclass_mainline_selector_v1.py")], cwd=api, timeout=timeout)
        r6b = run_cmd([py, str(auto / "daybreak_report_and_next_queue_rearm_v1.py")], cwd=api, timeout=timeout)
        s6["runs"] = {"worldclass_mainline_selector": r6a, "daybreak_report_rearm": r6b}
        ok6 = bool(r6a.get("ok")) and bool(r6b.get("ok"))
        s6["status"] = "ok" if ok6 else "fail"
        step_results.append(s6)
        if not ok6:
            halted = True
            halt_reason = "step6_morning_chain_failed"
            evidence_paths.extend(
                [str(auto / "tenmon_conversation_worldclass_mainline_selector.json"), str(auto / "daybreak_report.json")]
            )

    # --- Step 7: PWA / worldclass dialogue ascent ---
    if not halted:
        s7 = {
            "step": 7,
            "card": "TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1",
            "runner": "scripts/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh",
            "notes": "worldclass dialogue loop + scorecard 更新（既存主線）。",
        }
        r7 = run_cmd(
            ["bash", str(scripts / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh")],
            cwd=api,
            timeout=timeout,
        )
        s7["run"] = r7
        s7["status"] = "ok" if r7.get("ok") else "fail"
        step_results.append(s7)
        if not r7.get("ok"):
            halted = True
            halt_reason = "step7_worldclass_dialogue_loop_failed"
            evidence_paths.append(str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"))

    # --- Step 8: final seal + hands-off（PWA worldclass seal → autonomy release freeze seal）---
    if not halted:
        s8: dict[str, Any] = {
            "step": 8,
            "card": "TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1",
            "notes": "evidence ベースの seal（成功捏造なし。失敗時は rc!=0）。",
        }
        r8a = run_cmd([py, str(auto / "tenmon_pwa_lived_proof_worldclass_seal_v1.py")], cwd=api, timeout=timeout)
        r8b = run_cmd([py, str(auto / "release_freeze_and_autonomy_constitution_seal_v1.py")], cwd=api, timeout=timeout)
        s8["runs"] = {"pwa_worldclass_seal": r8a, "release_freeze_autonomy_seal": r8b}
        ok8 = bool(r8a.get("ok")) and bool(r8b.get("ok"))
        s8["status"] = "ok" if ok8 else "fail"
        step_results.append(s8)
        if not ok8:
            halted = True
            halt_reason = "step8_final_seal_failed"
            evidence_paths.extend(
                [str(auto / "pwa_worldclass_seal_summary.json"), str(auto / "release_freeze_autonomy_seal_summary.json")]
            )

    allowed = ("ok", "ok_warn", "skipped_mac_only")
    master_pass = (not halted) and all(s.get("status") in allowed for s in step_results)

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "repo_root": str(repo),
        "platform": platform.system(),
        "master_pass": master_pass,
        "halted": halted,
        "halt_reason": halt_reason or None,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "contract": "high_risk は tenmon_high_risk_approval_contract で承認前提。remote_cursor_queue / scorecard の契約は本親が変更しない。",
        "steps": step_results,
        "outputs": {"summary_json": str(auto / OUT_JSON), "summary_md": str(auto / OUT_MD)},
    }
    write_json(auto / OUT_JSON, out)

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- halted: `{halted}`",
        f"- halt_reason: `{halt_reason or '(none)'}`",
        f"- next_on_pass: `{NEXT_ON_PASS}`",
        "",
        "## steps",
        "",
    ]
    for s in step_results:
        md_lines.append(f"- **{s['step']}** `{s['card']}` — `{s.get('status')}`")
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if halted:
        hs = step_results[-1].get("step", -1) if step_results else -1
        write_retry_stub(gen_apply, halt_reason or "halted", int(hs) if isinstance(hs, int) else -1, evidence_paths)

    if args.stdout_json:
        print(json.dumps({"ok": master_pass, "master_pass": master_pass, "path": str(auto / OUT_JSON)}, ensure_ascii=False))

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
