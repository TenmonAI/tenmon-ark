#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_STABILITY_AND_DIALOGUE_COMPLETION_PARENT_CURSOR_AUTO_V1

子スクリプトを固定順で実行し、途中 FAIL で停止して証拠を残す（成功の捏造なし）。
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

CARD = "TENMON_AUTONOMY_STABILITY_AND_DIALOGUE_COMPLETION_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_stability_and_dialogue_completion_parent_summary.json"
OUT_MD = "tenmon_autonomy_stability_and_dialogue_completion_parent_report.md"
RETRY_CARD = "TENMON_AUTONOMY_STABILITY_AND_DIALOGUE_COMPLETION_PARENT_RETRY_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。safe retry 1枚のみ生成。"

# (card_id, path under api/, kind: py | sh)
STEP_SCRIPTS: tuple[tuple[str, str, str], ...] = (
    ("TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1", "automation/tenmon_cursor_single_flight_queue_v1.py", "py"),
    ("TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1", "automation/output_contract_normalizer_v1.py", "py"),
    ("TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1", "automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py", "py"),
    ("TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1", "automation/tenmon_mac_cursor_executor_runtime_bind_v1.py", "py"),
    ("TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1", "scripts/tenmon_high_risk_approval_contract_v1.sh", "sh"),
    ("TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1", "automation/improvement_ledger_v1.py", "py"),
    ("TENMON_R1_20A_DETAILPLAN_STABILIZE_CURSOR_AUTO_V1", "scripts/tenmon_r1_20a_detailplan_stabilize_v1.sh", "sh"),
    ("TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1", "automation/tenmon_k1_subconcept_general_execution_campaign_v1.py", "py"),
    ("TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1", "automation/final_pwa_conversation_completion_pdca_loop_v1.py", "py"),
    ("TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_CURSOR_AUTO_V1", "automation/conversation_completion_3stage_escort_autopdca_v1.py", "py"),
    ("TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1", "automation/tenmon_repo_hygiene_final_seal_v1.py", "py"),
    ("TENMON_AUTONOMY_CONSTITUTION_SEAL_V1", "automation/release_freeze_and_autonomy_constitution_seal_v1.py", "py"),
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_step(api: Path, rel: str, kind: str, timeout: int) -> dict[str, Any]:
    target = api / rel
    if not target.is_file():
        return {
            "script": rel,
            "ok": False,
            "exit_code": None,
            "error": "script_missing",
        }
    try:
        if kind == "py":
            cp = subprocess.run(
                [sys.executable, str(target)],
                cwd=str(api),
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        elif kind == "sh":
            cp = subprocess.run(
                ["bash", str(target)],
                cwd=str(api),
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        else:
            return {"script": rel, "ok": False, "exit_code": None, "error": f"bad_kind:{kind}"}
        return {
            "script": rel,
            "ok": cp.returncode == 0,
            "exit_code": cp.returncode,
            "stdout_tail": (cp.stdout or "")[-8000:],
            "stderr_tail": (cp.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"script": rel, "ok": False, "exit_code": None, "error": str(e)[:500]}


def write_retry_stub(gen_apply: Path, reason: str, step_idx: int, paths: list[str]) -> None:
    gen_apply.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            f"# {RETRY_CARD}",
            "",
            f"> generated_at: `{utc()}`",
            f"> parent: `{CARD}`",
            f"> halted_step: `{step_idx}`",
            f"> reason: `{reason}`",
            "",
            "## evidence",
            "",
            *[f"- `{x}`" for x in paths[:40]],
            "",
            "## DO",
            "",
            f"1. `{OUT_JSON}` を確認",
            "2. 修正後 `python3 api/automation/tenmon_autonomy_stability_and_dialogue_completion_parent_v1.py` を再実行",
            "",
        ]
    )
    (gen_apply / f"{RETRY_CARD}.md").write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--timeout-sec", type=int, default=int(os.environ.get("TENMON_AUTONOMY_STABILITY_PARENT_STEP_TIMEOUT_SEC", "7200")))
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    gen_apply = auto / "generated_cursor_apply"
    auto.mkdir(parents=True, exist_ok=True)

    timeout = max(120, int(args.timeout_sec))

    steps_out: list[dict[str, Any]] = []
    halted = 0
    halt_reason = ""

    for i, (card_name, rel, kind) in enumerate(STEP_SCRIPTS, start=1):
        r = run_step(api, rel, kind, timeout)
        r["step"] = i
        r["card"] = card_name
        steps_out.append(r)
        if not r.get("ok"):
            halted = i
            halt_reason = f"step{i}_{rel}_failed"
            break

    master_pass = halted == 0 and all(s.get("ok") for s in steps_out)

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "master_pass": master_pass,
        "halted_step": halted,
        "halt_reason": halt_reason,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "steps": steps_out,
        "notes": [
            "high-risk は guard/escrow 経由のみ（無差別実行禁止）。",
            "各子の build/restart/audit は子憲章に従う。",
        ],
    }

    write_json(auto / OUT_JSON, summary)

    if not master_pass:
        write_retry_stub(
            gen_apply,
            halt_reason or "unknown",
            halted,
            [str(auto / OUT_JSON)],
        )

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- halted_step: `{halted}`",
        "",
        "## steps",
        "",
    ]
    for s in steps_out:
        md.append(
            f"- step {s.get('step')}: `{s.get('card')}` ok=`{s.get('ok')}` exit=`{s.get('exit_code')}` script=`{s.get('script')}`"
        )
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": master_pass, "path": str(auto / OUT_JSON), "master_pass": master_pass}, ensure_ascii=False))
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
