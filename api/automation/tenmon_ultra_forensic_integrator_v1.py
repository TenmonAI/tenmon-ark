#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ULTRA_FORENSIC_INTEGRATOR_V1 — ultra forensic 出力束（read-only・repo 改変なし）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List

try:
    from output_contract_normalizer_v1 import merge_registry_into_output_contracts
except Exception:  # pragma: no cover - 正規化カード未導入環境
    merge_registry_into_output_contracts = None  # type: ignore

CARD = "TENMON_ULTRA_FORENSIC_INTEGRATOR_V1"
FAIL_NEXT = "TENMON_ULTRA_FORENSIC_REVEAL_V3_RETRY_CURSOR_AUTO_V1"


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _file_exists(api: Path, rel: str) -> bool:
    return (api / rel).is_file()


def _chat_metrics(chat_path: Path) -> Dict[str, Any]:
    if not chat_path.is_file():
        return {"missing": True, "path": str(chat_path)}
    text = chat_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    return {
        "path": str(chat_path),
        "lines": len(lines),
        "bytes": len(text.encode("utf-8")),
        "approx_export_const": len(re.findall(r"\bexport\s+(const|function|async\s+function)\b", text)),
        "approx_router_use": text.lower().count("router"),
        "approx_route_reason": len(re.findall(r"routeReason", text)),
        "approx_try_catch": text.count("try {"),
        "approx_async_handlers": len(re.findall(r"async\s*\([^)]*\)\s*=>", text)),
        "kind": "chat_static_forensic",
    }


def _parse_runtime_cognition(runtime: Dict[str, Any]) -> Dict[str, bool]:
    def _ok_entries() -> List[Dict[str, Any]]:
        for k, v in runtime.items():
            if k == "_meta" or not isinstance(v, dict):
                continue
            yield v

    def _ku_from_row(row: Dict[str, Any]) -> Dict[str, Any]:
        if not row.get("ok"):
            return {}
        body = row.get("body")
        if isinstance(body, str) and body.strip().startswith("{"):
            try:
                obj = json.loads(body)
                df = obj.get("decisionFrame") if isinstance(obj.get("decisionFrame"), dict) else {}
                ku = df.get("ku") if isinstance(df.get("ku"), dict) else {}
                return ku if isinstance(ku, dict) else {}
            except Exception:
                return {}
        return {}

    flags = {
        "threadCore_runtime_exposed": False,
        "heart_runtime_exposed": False,
        "intention_runtime_exposed": False,
        "meaningFrame_runtime_exposed": False,
        "thoughtCoreSummary_runtime_exposed": False,
        "personaConstitutionSummary_runtime_exposed": False,
        "brainstemDecision_runtime_exposed": False,
    }
    for row in _ok_entries():
        ku = _ku_from_row(row)
        if not ku:
            continue
        if isinstance(ku.get("threadCore"), dict):
            flags["threadCore_runtime_exposed"] = True
        if isinstance(ku.get("heart"), dict):
            flags["heart_runtime_exposed"] = True
        if ku.get("intention") is not None:
            flags["intention_runtime_exposed"] = True
        if ku.get("meaningFrame") is not None:
            flags["meaningFrame_runtime_exposed"] = True
        if isinstance(ku.get("thoughtCoreSummary"), dict):
            flags["thoughtCoreSummary_runtime_exposed"] = True
        if isinstance(ku.get("personaConstitutionSummary"), dict):
            flags["personaConstitutionSummary_runtime_exposed"] = True
        if ku.get("brainstemDecision") is not None:
            flags["brainstemDecision_runtime_exposed"] = True
    return flags


def _systems_spec() -> Dict[str, Dict[str, Any]]:
    return {
        "conversation_system": {
            "expected_files": [
                "src/routes/chat.ts",
                "automation/tenmon_chat_ts_worldclass_completion_report_v1.py",
                "scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh",
            ]
        },
        "chat_architecture": {
            "expected_files": [
                "automation/chat_architecture_observer_v1.py",
                "scripts/chat_architecture_observer_v1.sh",
            ]
        },
        "self_improvement_os": {
            "expected_files": [
                "automation/improvement_ledger_v1.py",
                "automation/residual_quality_scorer_v1.py",
                "automation/card_auto_generator_v1.py",
                "automation/seal_governor_v1.py",
                "automation/self_improvement_os_runner_v1.py",
                "scripts/self_improvement_os_run_v1.sh",
            ]
        },
        "chat_refactor_os": {
            "expected_files": [
                "automation/chat_refactor_planner_v1.py",
                "automation/chat_refactor_card_generator_v1.py",
                "automation/chat_refactor_governor_v1.py",
                "automation/chat_refactor_os_runner_v1.py",
                "scripts/chat_refactor_os_run_v1.sh",
            ]
        },
        "kokuzo_learning_os": {
            "expected_files": [
                "automation/kokuzo_bad_observer_v1.py",
                "automation/khs_health_gate_v1.py",
                "automation/deterministic_seed_generator_v1.py",
                "automation/kokuzo_learning_improvement_os_integrated_v1.py",
                "scripts/kokuzo_bad_observer_v1.sh",
                "scripts/khs_health_gate_v1.sh",
                "scripts/deterministic_seed_generator_v1.sh",
                "scripts/kokuzo_learning_improvement_os_integrated_v1.sh",
            ]
        },
        "storage_backup_nas": {
            "expected_files": [
                "scripts/vps_sync_and_verify.sh",
                "scripts/vps_reclone_and_switch.sh",
                "scripts/vps_fix_live_directory.sh",
                "scripts/obs_evidence_bundle.sh",
            ]
        },
        "acceptance_runtime": {
            "expected_files": [
                "scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh",
                "scripts/probe_matrix.sh",
                "scripts/run_restart_and_route_bleed_check.sh",
            ]
        },
        "cursor_autobuild": {
            "expected_files": [
                "automation/cursor_bridge_v1.py",
                "automation/patch_planner_v1.py",
                "automation/queue_scheduler_v1.py",
                "automation/cursor_applier_v1.py",
                "automation/execution_gate_v1.py",
            ]
        },
        "feature_autobuild": {
            "expected_files": [
                "automation/feature_intent_parser_v1.py",
                "automation/spec_generator_v1.py",
                "automation/card_splitter_v1.py",
                "automation/dependency_aware_campaign_orchestrator_v1.py",
                "automation/deployment_gate_v1.py",
            ]
        },
        "remote_admin": {
            "expected_files": [
                "automation/remote_cursor_command_center_v1.py",
                "automation/remote_cursor_result_ingest_v1.py",
                "scripts/remote_cursor_agent_mac_v1.sh",
                "scripts/remote_cursor_submit_v1.sh",
                "src/routes/adminCursorCommand.ts",
                "src/routes/adminCursorResult.ts",
            ]
        },
        "internal_cognition": {
            "expected_files": [
                "src/core/threadCore.ts",
                "src/core/tenmonBrainstem.ts",
                "src/planning/responsePlanCore.ts",
                "src/core/tenmonGateThreadContextV1.ts",
                "src/core/threadCoreLinkSurfaceV1.ts",
            ]
        },
        "constitution_governance": {
            "expected_files": [
                "docs/constitution/TENMON_CONVERSATION_CONSTITUTION_V1.md",
                "docs/constitution/TENMON_CHAT_REFACTOR_OS_V1.md",
                "docs/constitution/TENMON_SELF_IMPROVEMENT_OS_V1.md",
                "docs/constitution/TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_V1.md",
            ]
        },
    }


def _inventory_top(api: Path, rel: str) -> List[str]:
    p = api / rel
    if not p.is_dir():
        return []
    return sorted([str(x.relative_to(api)) for x in p.glob("*")])


def run_integrate(out_dir: Path, api: Path) -> Dict[str, Any]:
    runtime = _read_json(out_dir / "runtime_matrix.json")
    worldclass = _read_json(out_dir / "worldclass_report.json")
    seal = _read_json(out_dir / "seal_verdict.json")
    storage_existing = _read_json(out_dir / "storage_backup_nas.json")
    nas_recovery_path = api / "automation/out/storage_backup_nas_recovery_v1/storage_backup_nas.json"
    nas_recovery = _read_json(nas_recovery_path)
    if nas_recovery:
        storage_existing = nas_recovery

    inventory = {
        "automation": _inventory_top(api, "automation"),
        "automation_out": _inventory_top(api, "automation/out"),
        "generated_cursor_apply": _inventory_top(api, "automation/generated_cursor_apply"),
        "scripts": _inventory_top(api, "scripts"),
    }
    (out_dir / "artifact_inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    chat_path = api / "src" / "routes" / "chat.ts"
    chat_static = _chat_metrics(chat_path)
    (out_dir / "chat_static_forensic.json").write_text(
        json.dumps(chat_static, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if not storage_existing:
        mount = ""
        try:
            mount = subprocess.check_output(["bash", "-lc", "mount 2>/dev/null | head -n 24"], timeout=4).decode()
        except Exception:
            mount = ""
        storage_existing = {
            "mount_head": mount[:4000],
            "env_TENMON_BACKUP_ROOT": os.environ.get("TENMON_BACKUP_ROOT"),
            "env_NAS_MOUNT_PATH": os.environ.get("NAS_MOUNT_PATH"),
            "note": "short_block_v1",
        }
        (out_dir / "storage_backup_nas.json").write_text(
            json.dumps(storage_existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    elif nas_recovery:
        (out_dir / "storage_backup_nas.json").write_text(
            json.dumps(storage_existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    cognition_flags = _parse_runtime_cognition(runtime)
    systems = _systems_spec()
    readiness: Dict[str, Any] = {}
    crouching: List[Dict[str, Any]] = []
    missing_runners: List[Dict[str, Any]] = []

    wv = worldclass.get("verdict") or {}

    for name, spec in systems.items():
        expected = spec["expected_files"]
        exists_count = sum(1 for p in expected if _file_exists(api, p))
        exists_ratio = exists_count / max(1, len(expected))
        if exists_ratio == 0:
            state = "absent"
        elif exists_ratio < 0.4:
            state = "file_only"
        elif exists_ratio < 0.75:
            state = "partial_impl"
        else:
            state = "implemented"

        connected = False
        running = False
        producing_outputs = False

        if name == "conversation_system":
            connected = True
            ok_rows = [v for k, v in runtime.items() if k != "_meta" and isinstance(v, dict) and "ok" in v]
            running = bool(ok_rows) and all(bool(v.get("ok")) for v in ok_rows)
            producing_outputs = True
        elif name == "internal_cognition":
            connected = True
            running = any(cognition_flags.values())
            producing_outputs = running
        elif name == "storage_backup_nas" and nas_recovery:
            ra = nas_recovery.get("readiness_axes") or {}
            connected = bool(ra.get("mount_present") or ra.get("actual_sync_contract_present"))
            running = connected
            producing_outputs = bool(ra.get("mount_present") or ra.get("actual_sync_contract_present"))
        else:
            out_hits = [p for p in inventory.get("automation_out", []) if name.split("_")[0] in p or name in p]
            producing_outputs = len(out_hits) > 0

        if state == "implemented" and not producing_outputs and name not in (
            "conversation_system",
            "internal_cognition",
            "storage_backup_nas",
            "acceptance_runtime",
            "constitution_governance",
            "cursor_autobuild",
        ):
            crouching.append({"system": name, "reason": "implemented_but_outputless", "status": "crouching"})

        for p in expected:
            if p.endswith(".sh") and not _file_exists(api, p):
                missing_runners.append({"system": name, "missing_runner": p})

        score = int(exists_ratio * 55)
        if connected:
            score += 10
        if running:
            score += 15
        if producing_outputs:
            score += 20
        score = min(100, score)

        risk = "low"
        if name in ("chat_refactor_os", "self_improvement_os", "kokuzo_learning_os", "remote_admin"):
            risk = "high"
        elif name in ("feature_autobuild", "internal_cognition", "cursor_autobuild"):
            risk = "medium"

        readiness[name] = {
            "exists": exists_ratio > 0,
            "implemented": state in ("partial_impl", "implemented"),
            "connected": connected,
            "running": running,
            "producing_outputs": producing_outputs,
            "completedness_score": score,
            "risk_level": risk,
            "state": state,
            "evidence_paths": expected,
        }

    mismatches: List[Dict[str, Any]] = []
    for key in ("self_improvement_os", "chat_refactor_os", "kokuzo_learning_os"):
        r = readiness.get(key) or {}
        if r.get("implemented") and not r.get("producing_outputs"):
            mismatches.append({"system": key, "mismatch": "files_exist_but_integrated_outputs_missing"})

    wc_overall = bool(wv.get("chat_ts_overall_100"))
    if worldclass and not wc_overall:
        mismatches.append(
            {
                "contract": "chat_ts_overall_100",
                "expected": True,
                "actual": False,
                "detail": wv.get("remaining_blockers") or wv.get("static_blockers"),
            }
        )
    if not seal or seal.get("missing"):
        mismatches.append(
            {
                "contract": "seal_verdict_resolved",
                "expected": "final_verdict.json from active seal",
                "actual": "missing_or_stub",
            }
        )

    overall = round(sum(v["completedness_score"] for v in readiness.values()) / len(readiness), 1)

    primary_breakers: List[str] = []
    for sysn, rv in readiness.items():
        if rv["completedness_score"] < 60:
            primary_breakers.append(f"{sysn}:readiness_low")
    if crouching:
        primary_breakers.append("crouching_functions_present")
    if missing_runners:
        primary_breakers.append("missing_runners_present")
    if mismatches:
        primary_breakers.append("output_contract_mismatches_present")

    if overall >= 85 and len(primary_breakers) <= 2:
        breakout = "near_breakpoint"
    elif overall >= 70:
        breakout = "approaching_breakpoint"
    else:
        breakout = "pre_breakpoint"

    next_cards: List[str] = []
    if readiness["self_improvement_os"]["completedness_score"] < 60:
        next_cards.append("TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1")
    if readiness["kokuzo_learning_os"]["completedness_score"] < 60:
        next_cards.append("TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1")
    if readiness["chat_refactor_os"]["completedness_score"] < 60:
        next_cards.append("TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_CURSOR_AUTO_V1")
    if readiness["conversation_system"]["completedness_score"] >= 80:
        next_cards.append("CHAT_TS_STAGE4_DENSITY_TRUNK_LOCK_CURSOR_AUTO_V2")
    if readiness["remote_admin"]["completedness_score"] < 50:
        next_cards.append("TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1")
    next_cards = next_cards[:5]

    output_contracts: Dict[str, Any] = {
        "worldclass_verdict": wv,
        "worldclass_static_keys": list((worldclass.get("static") or {}).keys()),
        "seal_verdict_present": bool(seal) and not seal.get("missing"),
        "runtime_all_ok": all(
            v.get("ok") for k, v in runtime.items() if k != "_meta" and isinstance(v, dict) and "ok" in v
        )
        if any(k != "_meta" for k in runtime)
        else False,
        "cognition_flags": cognition_flags,
        "artifact_inventory_counts": {k: len(v) for k, v in inventory.items()},
    }
    orch_dir = out_dir / "orchestrator_snap"
    if orch_dir.is_dir():
        for fn in ("full_orchestrator_queue.json", "full_orchestrator_manifest.json"):
            p = orch_dir / fn
            if p.is_file():
                output_contracts["orchestrator_" + fn.replace(".json", "")] = _read_json(p)
    if merge_registry_into_output_contracts:
        try:
            output_contracts = merge_registry_into_output_contracts(output_contracts, api)
        except Exception:
            pass
    (out_dir / "output_contracts.json").write_text(
        json.dumps(output_contracts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    xray = {
        "card": "TENMON_ULTRA_FORENSIC_REVEAL_V3",
        "integrator": CARD,
        "systems": readiness,
        "internal_cognition_runtime": cognition_flags,
        "crouching_functions": crouching,
        "missing_runners": missing_runners,
        "output_contract_mismatches": mismatches,
        "worldclass_summary": {"chat_ts_overall_100": wv.get("chat_ts_overall_100"), "density_lock": wv.get("density_lock")},
    }
    (out_dir / "total_xray_reveal.json").write_text(json.dumps(xray, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    matrix = {
        k: {
            "completedness_score": v["completedness_score"],
            "risk_level": v["risk_level"],
            "state": v["state"],
            "exists": v["exists"],
            "implemented": v["implemented"],
            "connected": v["connected"],
            "running": v["running"],
            "producing_outputs": v["producing_outputs"],
        }
        for k, v in readiness.items()
    }
    (out_dir / "subsystem_readiness_matrix.json").write_text(
        json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "crouching_functions.json").write_text(json.dumps(crouching, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "missing_runners.json").write_text(json.dumps(missing_runners, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "output_contract_mismatches.json").write_text(
        json.dumps(mismatches, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    verdict = {
        "conversation_readiness": readiness["conversation_system"]["completedness_score"],
        "chat_architecture_readiness": readiness["chat_architecture"]["completedness_score"],
        "self_improvement_os_readiness": readiness["self_improvement_os"]["completedness_score"],
        "chat_refactor_os_readiness": readiness["chat_refactor_os"]["completedness_score"],
        "kokuzo_learning_os_readiness": readiness["kokuzo_learning_os"]["completedness_score"],
        "storage_backup_nas_readiness": readiness["storage_backup_nas"]["completedness_score"],
        "acceptance_runtime_readiness": readiness["acceptance_runtime"]["completedness_score"],
        "cursor_autobuild_readiness": readiness["cursor_autobuild"]["completedness_score"],
        "feature_autobuild_readiness": readiness["feature_autobuild"]["completedness_score"],
        "remote_admin_readiness": readiness["remote_admin"]["completedness_score"],
        "internal_cognition_readiness": readiness["internal_cognition"]["completedness_score"],
        "constitution_governance_readiness": readiness["constitution_governance"]["completedness_score"],
        "overall_system_readiness": overall,
        "worldclass_chat_ts_overall_100": wv.get("chat_ts_overall_100"),
        "breakout_proximity": breakout,
        "primary_breakers": primary_breakers,
        "manual_gate_subsystems": [
            c["system"]
            for c in crouching
            if c["system"] in ("remote_admin", "kokuzo_learning_os", "chat_refactor_os", "self_improvement_os")
        ],
        "fail_next_card": FAIL_NEXT,
    }
    (out_dir / "integrated_master_verdict.json").write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "next_priority_cards.json").write_text(
        json.dumps({"next_priority_cards": next_cards}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    return {
        "ok": True,
        "out_dir": str(out_dir),
        "overall_system_readiness": overall,
        "outputs_written": [
            "chat_static_forensic.json",
            "artifact_inventory.json",
            "output_contracts.json",
            "total_xray_reveal.json",
            "subsystem_readiness_matrix.json",
            "crouching_functions.json",
            "missing_runners.json",
            "output_contract_mismatches.json",
            "integrated_master_verdict.json",
            "next_priority_cards.json",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, required=True)
    ap.add_argument("--api-root", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    api = Path(args.api_root).resolve() if args.api_root else _api_root()
    blob = run_integrate(out, api)
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
