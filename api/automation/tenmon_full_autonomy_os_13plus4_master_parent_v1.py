#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1

主線 13 + 保険 4 を固定順で観測・実行し、single-source summary を出す。
- 実 runner が無い段は skipped_no_runner（捏造成功しない）
- Mac 専用段は非 Darwin では skipped_mac_only
- runner が非 0 で終了したら証跡を残して停止（保険 17 の hardstop は must_block でも「実行完了」扱い）
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

CARD = "TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_full_autonomy_os_13plus4_master_summary.json"
OUT_MD = "tenmon_full_autonomy_os_13plus4_master_report.md"
FAIL_NEXT = "TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_RETRY_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_darwin() -> bool:
    return platform.system().lower() == "darwin"


def run_cmd(cmd: list[str], cwd: Path, timeout: int) -> dict[str, Any]:
    try:
        cp = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        merged = (cp.stdout or "") + (cp.stderr or "")
        return {
            "ok": cp.returncode == 0,
            "exit_code": int(cp.returncode),
            "tail": merged[-6000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "tail": f"{type(e).__name__}: {e}"}


def constitution_path(repo: Path, name: str) -> Path:
    return repo / "api" / "docs" / "constitution" / name


def write_retry_stub(gen_apply: Path, reason: str, halted_step: int, evidence_paths: list[str]) -> None:
    gen_apply.mkdir(parents=True, exist_ok=True)
    p = gen_apply / f"{FAIL_NEXT}.md"
    body = "\n".join(
        [
            f"# {FAIL_NEXT}",
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
            "1. `tenmon_full_autonomy_os_13plus4_master_summary.json` の該当 step を確認",
            "2. 最小 diff で修正後、親を再実行",
            "",
        ]
    )
    p.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--timeout-sec", type=int, default=int(os.environ.get("TENMON_OS13PLUS4_STEP_TIMEOUT_SEC", "2400")))
    ap.add_argument(
        "--run-heavy",
        action="store_true",
        help="主線 12（overnight 系）の重い runner を実行する（未指定なら skipped_heavy_default）",
    )
    ap.add_argument(
        "--relax-verify-rollback",
        action="store_true",
        help="主線 10: verify ループの rc=1 を観測完了として許容（閉路未成立の開発環境向け。本番厳格運用では使わない）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    gen_apply = auto / "generated_cursor_apply"
    auto.mkdir(parents=True, exist_ok=True)

    run_heavy = bool(args.run_heavy) or os.environ.get("TENMON_OS13PLUS4_RUN_HEAVY", "").strip() in ("1", "true", "yes")
    relax_verify = bool(args.relax_verify_rollback) or os.environ.get(
        "TENMON_OS13PLUS4_RELAX_VERIFY_ROLLBACK", ""
    ).strip() in ("1", "true", "yes")

    py = sys.executable
    timeout = max(60, int(args.timeout_sec))

    # (idx, card_id, lane, mode, cmd_or_none, mac_only, accept_rc, notes)
    # mode: bash | py | constitution | skip | heavy_bash
    steps_spec: list[tuple[int, str, str, str, list[str] | None, bool, list[int] | None, str]] = [
        (
            1,
            "TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1",
            "mainline",
            "constitution",
            None,
            False,
            None,
            "constitution: TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1.md",
        ),
        (
            2,
            "TENMON_CURSOR_EXECUTOR_REAL_RESULT_AND_TOUCHFILES_BIND_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")],
            False,
            None,
            "bind: result bundle ↔ queue ↔ rejudge/scorecard（touchfiles は Mac executor 側）",
        ),
        (
            3,
            "TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_high_risk_approval_contract_v1.sh")],
            False,
            None,
            "high-risk 承認契約・registry・trace（escrow ゲート）",
        ),
        (
            4,
            "TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_browser_ai_operator_runtime_v1.sh")],
            True,
            None,
            "Browser AI（Darwin のみ実運用）",
        ),
        (
            5,
            "TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1",
            "mainline",
            "skip",
            None,
            False,
            None,
            "runner 未配線（Cursor 実装カード）",
        ),
        (
            6,
            "TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_mac_screen_operator_runtime_v1.sh")],
            True,
            None,
            "Mac screen operator（Darwin のみ）",
        ),
        (
            7,
            "TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1",
            "mainline",
            "skip",
            None,
            False,
            None,
            "runner 未配線（Cursor 実装カード）",
        ),
        (
            8,
            "TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1",
            "mainline",
            "skip",
            None,
            False,
            None,
            "runner 未配線（Cursor 実装カード）",
        ),
        (
            9,
            "TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_safe_patch_planner_v1.sh")],
            False,
            [0, 1],
            "patch plan 生成（safe_patch_planner: queue 無しは rc=1 だが観測完了として許容）",
        ),
        (
            10,
            "TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1",
            "mainline",
            "bash",
            ["bash", str(scripts / "tenmon_verify_rejudge_rollback_loop_v1.sh")],
            False,
            None,
            "verify / rejudge / rollback 観測ループ",
        ),
        (
            11,
            "TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1",
            "mainline",
            "compound",
            [],  # handled specially
            False,
            None,
            "acceptance gate → priority enqueue",
        ),
        (
            12,
            "TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1",
            "mainline",
            "heavy_bash",
            ["bash", str(scripts / "tenmon_overnight_full_autonomy_completion_loop_v1.sh")],
            False,
            None,
            "重い overnight ループ（明示フラグ時のみ）",
        ),
        (
            13,
            "TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1",
            "mainline",
            "compound2",
            [],
            False,
            None,
            "forensic → worldclass loop（single-source 更新）",
        ),
        (
            14,
            "TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1",
            "insurance",
            "py",
            [py, str(auto / "cursor_review_acceptor_v1.py")],
            False,
            None,
            "review acceptor（非 Darwin は manual_review_required で観測のみ）",
        ),
        (
            15,
            "TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1",
            "insurance",
            "py",
            [py, str(auto / "network_session_rescue_v1.py")],
            False,
            None,
            "network/session/token rescue（1 実行 1 rescue budget）",
        ),
        (
            16,
            "TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1",
            "insurance",
            "py",
            [py, str(auto / "tenmon_continuous_queue_dedup_and_backpressure_v1.py")],
            False,
            None,
            "queue dedup / backpressure（既存 continuous dedup）",
        ),
        (
            17,
            "TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1",
            "insurance",
            "py",
            [py, str(auto / "safe_stop_human_override_v1.py"), "--exit-on-block"],
            False,
            [0, 1],
            "safe stop / override / fail-closed（running=false で rc=1 を許容）",
        ),
    ]

    step_results: list[dict[str, Any]] = []
    halted: bool = False
    halt_reason = ""
    evidence_paths: list[str] = []

    for idx, card_id, lane, mode, cmd, mac_only, accept_rc, notes in steps_spec:
        if idx == 10 and relax_verify:
            accept_rc = [0, 1]
        row: dict[str, Any] = {
            "step": idx,
            "card": card_id,
            "lane": lane,
            "notes": notes,
            "status": "pending",
        }
        if mac_only and not is_darwin():
            row["status"] = "skipped_mac_only"
            step_results.append(row)
            continue

        if mode == "skip":
            row["status"] = "skipped_no_runner"
            step_results.append(row)
            continue

        if mode == "constitution":
            doc = constitution_path(
                repo,
                "TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1.md",
            )
            row["status"] = "ok" if doc.is_file() else "fail_constitution_missing"
            row["path"] = str(doc)
            step_results.append(row)
            if row["status"] != "ok":
                halted = True
                halt_reason = "constitution_missing"
                evidence_paths.append(str(doc))
                break
            continue

        if mode == "compound":
            r1 = run_cmd(["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")], cwd=api, timeout=timeout)
            r2 = run_cmd(["bash", str(scripts / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.sh")], cwd=api, timeout=timeout)
            row["runs"] = {"acceptance_gate": r1, "priority_enqueue": r2}
            ok = bool(r1.get("ok")) and bool(r2.get("ok"))
            row["status"] = "ok" if ok else "fail"
            step_results.append(row)
            if not ok:
                halted = True
                halt_reason = "acceptance_or_enqueue_failed"
                evidence_paths.extend(
                    [
                        str(auto / "tenmon_full_autonomy_acceptance_gate_summary.json"),
                        str(auto / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_summary.json"),
                    ]
                )
                break
            continue

        if mode == "compound2":
            r1 = run_cmd(["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], cwd=api, timeout=timeout)
            r2 = run_cmd(
                ["bash", str(scripts / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh")],
                cwd=api,
                timeout=timeout,
            )
            row["runs"] = {"forensic": r1, "worldclass_dialogue_loop": r2}
            ok = bool(r1.get("ok")) and bool(r2.get("ok"))
            row["status"] = "ok" if ok else "fail"
            step_results.append(row)
            if not ok:
                halted = True
                halt_reason = "daybreak_refresh_failed"
                evidence_paths.extend(
                    [
                        str(auto / "tenmon_autonomy_current_state_forensic.json"),
                        str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"),
                    ]
                )
                break
            continue

        if mode == "heavy_bash":
            if not run_heavy:
                row["status"] = "skipped_heavy_default"
                row["hint"] = "再実行: --run-heavy または TENMON_OS13PLUS4_RUN_HEAVY=1"
                step_results.append(row)
                continue
            assert cmd is not None
            r = run_cmd(cmd, cwd=api, timeout=timeout)
            row["run"] = r
            row["status"] = "ok" if r.get("ok") else "fail"
            step_results.append(row)
            if not r.get("ok"):
                halted = True
                halt_reason = "overnight_loop_failed"
                evidence_paths.append(str(auto / "tenmon_overnight_full_autonomy_completion_loop_summary.json"))
                break
            continue

        assert cmd is not None
        r = run_cmd(cmd, cwd=api, timeout=timeout)
        row["run"] = r
        ec = r.get("exit_code")
        allowed = accept_rc if accept_rc is not None else [0]
        ok = ec in allowed if ec is not None else False
        row["accepted_exit_codes"] = allowed
        if ok and ec == 1 and allowed != [0]:
            row["status"] = "ok_warn"
            row["warn"] = "nonzero_exit_accepted_as_observation"
        else:
            row["status"] = "ok" if ok else "fail"
        step_results.append(row)
        if not ok:
            halted = True
            halt_reason = f"step_{idx}_nonzero_exit"
            if idx == 17:
                evidence_paths.append(str(auto / "tenmon_execution_gate_hardstop_verdict.json"))
            break

    master_pass = not halted and all(
        s.get("status")
        in ("ok", "ok_warn", "skipped_mac_only", "skipped_no_runner", "skipped_heavy_default")
        for s in step_results
    )

    roadmap_gaps = [s for s in step_results if s.get("status") == "skipped_no_runner"]
    out = {
        "card": CARD,
        "generated_at": utc(),
        "repo_root": str(repo),
        "platform": platform.system(),
        "run_heavy": run_heavy,
        "master_pass": master_pass,
        "roadmap_gaps_skipped_no_runner": roadmap_gaps,
        "roadmap_complete_no_gaps": len(roadmap_gaps) == 0,
        "halted": halted,
        "halt_reason": halt_reason or None,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": {"halt": True, "retry_card": FAIL_NEXT},
        "steps": step_results,
        "outputs": {
            "summary_json": str(auto / OUT_JSON),
            "summary_md": str(auto / OUT_MD),
        },
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
        md_lines.append(
            f"- **{s['step']}** `{s['card']}` — `{s.get('status')}`"
        )
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if halted:
        write_retry_stub(gen_apply, halt_reason, step_results[-1].get("step", -1), evidence_paths)

    if args.stdout_json:
        print(json.dumps({"ok": master_pass, "master_pass": master_pass, "path": str(auto / OUT_JSON)}, ensure_ascii=False))

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
