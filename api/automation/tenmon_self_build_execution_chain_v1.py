#!/usr/bin/env python3
"""
TENMON_SELF_BUILD_OS_CURSOR_EXECUTION_CHAIN_CURSOR_AUTO_V1
generate → dispatch → execute → collect → ingest → verdict を観測し、
local / remote の execution chain を単一 verdict にまとめる。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_BUILD_OS_CURSOR_EXECUTION_CHAIN_CURSOR_AUTO_V1"
AUTO = Path(__file__).resolve().parent


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def file_nonempty(p: Path) -> bool:
    try:
        return p.is_file() and p.stat().st_size > 0
    except OSError:
        return False


def subsystem(
    *,
    code_present: bool,
    runtime_proven: bool,
    accepted_complete: bool,
    evidence: dict[str, Any],
) -> dict[str, Any]:
    return {
        "code_present": code_present,
        "runtime_proven": runtime_proven,
        "accepted_complete": accepted_complete,
        "evidence": evidence,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(AUTO.parent.parent))
    ap.add_argument("--soft-exit-ok", action="store_true")
    ap.add_argument(
        "--require-system-pass",
        action="store_true",
        help="tenmon_system_verdict.json の pass が true でないと FAIL (exit 1)",
    )
    args = ap.parse_args()
    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    sys_verdict_path = auto / "tenmon_system_verdict.json"
    campaign_path = auto / "cursor_campaign_manifest.json"
    tasks_man_path = auto / "generated_cursor_tasks" / "cursor_tasks_manifest_v1.json"
    bridge_path = auto / "cursor_autobuild_bridge_report_v2.json"
    bundle_path = auto / "cursor_result_bundle.json"
    kernel_path = auto / "cursor_kernel_result.json"
    remote_seal_path = auto / "remote_cursor_command_center_seal.json"
    remote_queue_path = auto / "remote_cursor_queue.json"
    remote_bundle_path = auto / "remote_cursor_result_bundle.json"
    schema_path = auto / "cursor_card_schema_v2.json"

    sysv = read_json(sys_verdict_path)

    bridge = read_json(bridge_path)
    bundle = read_json(bundle_path)
    kernel = read_json(kernel_path)
    campaign = read_json(campaign_path)
    tasks_man = read_json(tasks_man_path)
    remote_seal = read_json(remote_seal_path)
    remote_queue = read_json(remote_queue_path)
    remote_bundle = read_json(remote_bundle_path)

    # --- cursor_card_generation
    md_val = (bridge.get("card_md_validation") or {}) if bridge else {}
    gen_code = file_nonempty(schema_path) or bool(campaign.get("steps"))
    gen_runtime = bool(md_val.get("ok")) and bool(bridge.get("artifacts"))
    gen_accepted = gen_code and gen_runtime and not md_val.get("missing_fields")

    sub_gen = subsystem(
        code_present=gen_code,
        runtime_proven=gen_runtime,
        accepted_complete=gen_accepted,
        evidence={"bridge_report": str(bridge_path), "schema": str(schema_path)},
    )

    # --- cursor_dispatch (queue / campaign 接続)
    steps = campaign.get("steps") if isinstance(campaign.get("steps"), list) else []
    ttasks = tasks_man.get("tasks") if isinstance(tasks_man.get("tasks"), list) else []
    q_items = remote_queue.get("items") if isinstance(remote_queue.get("items"), list) else []
    disp_code = file_nonempty(tasks_man_path) or len(steps) > 0 or file_nonempty(remote_queue_path)
    disp_runtime = len(steps) > 0 or len(ttasks) > 0 or len(q_items) > 0 or bool(bundle.get("touched_files"))
    disp_accepted = disp_code and disp_runtime

    sub_dispatch = subsystem(
        code_present=disp_code,
        runtime_proven=disp_runtime,
        accepted_complete=disp_accepted,
        evidence={
            "campaign": str(campaign_path),
            "tasks_manifest": str(tasks_man_path),
            "remote_queue": str(remote_queue_path),
        },
    )

    # --- cursor_execution (kernel)
    k_build = (kernel.get("build") or {}).get("ok") if kernel else False
    k_acc = (kernel.get("acceptance") or {}).get("ok") if kernel else False
    exec_code = file_nonempty(kernel_path)
    exec_runtime = bool(kernel.get("bundle_pass") or kernel.get("overall_pass"))
    exec_accepted = bool(kernel.get("overall_pass")) and k_build and k_acc

    sub_exec = subsystem(
        code_present=exec_code,
        runtime_proven=exec_runtime,
        accepted_complete=exec_accepted,
        evidence={"kernel_result": str(kernel_path)},
    )

    # --- result_collection
    coll_code = file_nonempty(bundle_path)
    coll_runtime = bool(bundle.get("pass") or bundle.get("status") == "pass")
    coll_accepted = coll_runtime and not (bundle.get("blockers") or [])

    sub_coll = subsystem(
        code_present=coll_code,
        runtime_proven=coll_runtime,
        accepted_complete=coll_accepted,
        evidence={"cursor_result_bundle": str(bundle_path)},
    )

    # --- result_ingest (bridge が bundle を成果として参照)
    art = (bridge.get("artifacts") or {}) if bridge else {}
    ing_art = str(art.get("cursor_result_bundle") or "") == str(bundle_path) or "cursor_result_bundle" in json.dumps(art)
    ing_code = bool(bridge) and coll_code
    ing_runtime = ing_art and coll_runtime
    ing_accepted = ing_runtime and gen_accepted

    sub_ingest = subsystem(
        code_present=ing_code,
        runtime_proven=ing_runtime,
        accepted_complete=ing_accepted,
        evidence={"bridge_artifacts": art},
    )

    # --- admin_remote_build_ui (remote command center seal)
    cond = (remote_seal.get("conditions") or {}) if remote_seal else {}
    adm_code = file_nonempty(remote_seal_path)
    adm_runtime = bool(remote_seal.get("overall_ok")) and bool(cond.get("queue_contract_ok")) and bool(
        cond.get("result_bundle_contract_ok")
    )
    adm_accepted = adm_runtime and bool(cond.get("guard_clean", True))

    sub_admin = subsystem(
        code_present=adm_code,
        runtime_proven=adm_runtime,
        accepted_complete=adm_accepted,
        evidence={
            "remote_cursor_command_center_seal": str(remote_seal_path),
            "remote_result_bundle": str(remote_bundle_path),
        },
    )

    subs = {
        "cursor_card_generation": sub_gen,
        "cursor_dispatch": sub_dispatch,
        "cursor_execution": sub_exec,
        "result_collection": sub_coll,
        "result_ingest": sub_ingest,
        "admin_remote_build_ui": sub_admin,
    }

    local_keys = (
        "cursor_card_generation",
        "cursor_dispatch",
        "cursor_execution",
        "result_collection",
        "result_ingest",
    )
    remote_keys = ("admin_remote_build_ui",)

    local_ok = all(subs[k]["accepted_complete"] for k in local_keys)
    remote_ok = all(subs[k]["accepted_complete"] for k in remote_keys)

    if local_ok and remote_ok:
        band = "full"
    elif local_ok and not remote_ok:
        band = "partial_remote"
    elif remote_ok and not local_ok:
        band = "partial_local"
    else:
        band = "open"

    primary_gap = None
    for name, s in subs.items():
        if not s["accepted_complete"]:
            primary_gap = name
            break

    fix_map = {
        "cursor_card_generation": "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_RETRY_V1",
        "cursor_dispatch": "TENMON_CURSOR_EXECUTOR_BRIDGE_V2_RETRY_CURSOR_AUTO_V1",
        "cursor_execution": "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_RETRY_CURSOR_AUTO_V1",
        "result_collection": "TENMON_CURSOR_RESULT_COLLECTOR_RETRY_CURSOR_AUTO_V1",
        "result_ingest": "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_RETRY_V1",
        "admin_remote_build_ui": "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_RETRY_V1",
    }
    recommended_fix = fix_map.get(primary_gap or "", "TENMON_SELF_BUILD_OS_CURSOR_EXECUTION_CHAIN_RETRY_CURSOR_AUTO_V1")

    # 実行 chain の完了（カード生成のみでは成立しない）
    chain_closed = local_ok and remote_ok
    system_verdict_pass = bool(sysv.get("pass")) if sysv else False
    # verdict の pass は実行 chain のみ（CLI フラグで上書きされない単一真実）
    execution_exit_ok = chain_closed and (not args.require_system_pass or system_verdict_pass)

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pass": chain_closed,
        "chain_closed": chain_closed,
        "system_verdict_pass": system_verdict_pass,
        "system_verdict_inputs": {
            "path": str(sys_verdict_path),
            "completion_gate": sysv.get("completion_gate"),
            "os_gate": sysv.get("os_gate"),
            "overall_band": sysv.get("overall_band"),
        },
        "band": band,
        "local_chain_closed": local_ok,
        "remote_chain_closed": remote_ok,
        "primary_gap": primary_gap,
        "recommended_fix_card": recommended_fix,
        "subsystems": subs,
        "inputs": {
            "system_verdict": str(sys_verdict_path),
            "cursor_campaign_manifest": str(campaign_path),
            "cursor_tasks_manifest": str(tasks_man_path),
            "cursor_autobuild_bridge_report_v2": str(bridge_path),
            "cursor_result_bundle": str(bundle_path),
            "cursor_kernel_result": str(kernel_path),
            "remote_cursor_command_center_seal": str(remote_seal_path),
            "remote_cursor_queue": str(remote_queue_path),
            "remote_cursor_result_bundle": str(remote_bundle_path),
        },
        "notes": [
            "local proof: campaign/bridge → bundle → kernel",
            "remote proof: remote_cursor_command_center_seal + queue/result contracts",
            "card 生成のみでは completion にしない（accepted_complete が要）",
            "self-audit: tenmon_system_verdict.json を入力に取り system_verdict_pass を記録",
            "exit: chain_closed が false なら 1。--require-system-pass 時は system_verdict_pass が false でも 1",
        ],
    }

    out_path = auto / "tenmon_self_build_execution_chain_verdict.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "pass": chain_closed,
                "exit_ok": execution_exit_ok,
                "chain_closed": chain_closed,
                "band": band,
                "path": str(out_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if args.soft_exit_ok:
        return 0
    return 0 if execution_exit_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
