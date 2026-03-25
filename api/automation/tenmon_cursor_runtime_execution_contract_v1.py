#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def rj(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def wj(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def http_ok(url: str, timeout: float = 6.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as res:
            return int(res.status) == 200
    except Exception:
        return False


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    base = os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000").rstrip("/")

    exec_gate = rj(auto / "tenmon_execution_gate_hardstop_verdict.json")
    hygiene = rj(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    rejudge = rj(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    system = rj(auto / "tenmon_system_verdict.json")
    runtime_proof = rj(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")

    queue_route_present = (api / "src" / "routes" / "adminCursorCommand.ts").is_file()
    result_ingest_present = (auto / "remote_cursor_result_ingest_v1.py").is_file()
    command_center_script_present = (scripts / "remote_cursor_command_center_run_v1.sh").is_file()
    founder_guard_present = (api / "src" / "routes" / "adminCursorResult.ts").is_file()

    queue_file_present = (auto / "remote_cursor_queue.json").is_file()
    delivery_log_present = (auto / "remote_bridge_delivery_log.jsonl").is_file()
    bundle_present = (auto / "remote_cursor_result_bundle.json").is_file()

    health_ok = http_ok(f"{base}/api/health")
    audit_ok = http_ok(f"{base}/api/audit")
    audit_build_ok = http_ok(f"{base}/api/audit.build")

    hardstop_green = bool(exec_gate.get("pass") is True) and not bool(exec_gate.get("must_block"))
    hygiene_clean = not bool(hygiene.get("must_block_seal", True))
    stale_truth = any("stale_sources" in str(x) for x in (rejudge.get("remaining_blockers") or []))

    safe_scope_enabled = True
    medium_scope_enabled = hardstop_green and hygiene_clean
    high_risk_scope_enabled = hardstop_green and hygiene_clean and (not stale_truth)

    current_blockers: list[str] = []
    if not queue_route_present:
        current_blockers.append("queue_route_missing")
    if not result_ingest_present:
        current_blockers.append("result_ingest_missing")
    if not command_center_script_present:
        current_blockers.append("command_center_script_missing")
    if not founder_guard_present:
        current_blockers.append("founder_guard_missing")
    if not queue_file_present:
        current_blockers.append("queue_file_missing")
    if not delivery_log_present:
        current_blockers.append("delivery_log_missing")
    if not bundle_present:
        current_blockers.append("result_bundle_missing")
    if not (health_ok and audit_ok and audit_build_ok):
        current_blockers.append("runtime_gate_not_healthy")
    if stale_truth:
        current_blockers.append("stale_truth_detected")

    cursor_runtime_available = queue_route_present and result_ingest_present and command_center_script_present and founder_guard_present
    queue_submit_ready = queue_route_present and queue_file_present
    delivery_observable = delivery_log_present
    result_ingest_ready = result_ingest_present and bundle_present
    rejudge_refresh_ready = bool(rejudge) and (rejudge.get("generated_at") is not None)

    runtime_contract_ready = all(
        [
            cursor_runtime_available,
            queue_submit_ready,
            delivery_observable,
            result_ingest_ready,
            rejudge_refresh_ready,
        ]
    )

    manifest = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "queue_route_present": queue_route_present,
        "result_ingest_present": result_ingest_present,
        "command_center_script_present": command_center_script_present,
        "founder_guard_present": founder_guard_present,
        "runtime_agent_expected": True,
        "current_return_path": [
            "official_admin_result_route",
            "official_remote_result_ingest_path",
        ],
        "supported_scope_classes": ["safe", "medium", "high_risk"],
        "approval_mode": "safe:auto, medium:hardstop+hygiene, high_risk:gate+evidence+no_stale",
        "current_limitations": current_blockers,
    }
    wj(auto / "cursor_runtime_capability_manifest_v1.json", manifest)

    state = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "runtime_contract_ready": runtime_contract_ready,
        "queue_submit_ready": queue_submit_ready,
        "delivery_observable": delivery_observable,
        "result_ingest_ready": result_ingest_ready,
        "rejudge_refresh_ready": rejudge_refresh_ready,
        "safe_scope_enabled": safe_scope_enabled,
        "medium_scope_enabled": medium_scope_enabled,
        "high_risk_scope_enabled": high_risk_scope_enabled,
        "cursor_runtime_available": cursor_runtime_available,
        "current_blockers": current_blockers,
    }
    wj(auto / "cursor_runtime_state_v1.json", state)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "runtime_contract_ready": runtime_contract_ready,
        "queue_submit_ready": queue_submit_ready,
        "delivery_observable": delivery_observable,
        "result_ingest_ready": result_ingest_ready,
        "rejudge_refresh_ready": rejudge_refresh_ready,
        "safe_scope_enabled": safe_scope_enabled,
        "medium_scope_enabled": medium_scope_enabled,
        "high_risk_scope_enabled": high_risk_scope_enabled,
        "cursor_runtime_available": cursor_runtime_available,
        "current_blockers": current_blockers,
        "evidence": {
            "health_ok": health_ok,
            "audit_ok": audit_ok,
            "audit_build_ok": audit_build_ok,
            "hardstop_green": hardstop_green,
            "hygiene_clean": hygiene_clean,
            "stale_truth": stale_truth,
            "runtime_proof_present": bool(runtime_proof),
            "system_verdict_present": bool(system),
        },
    }
    wj(auto / "tenmon_cursor_runtime_execution_contract_summary.json", summary)
    (auto / "tenmon_cursor_runtime_execution_contract_report.md").write_text(
        f"# {CARD}\n\n- runtime_contract_ready: `{runtime_contract_ready}`\n"
        f"- cursor_runtime_available: `{cursor_runtime_available}`\n"
        f"- medium_scope_enabled: `{medium_scope_enabled}`\n"
        f"- high_risk_scope_enabled: `{high_risk_scope_enabled}`\n"
        f"- current_blockers: `{current_blockers}`\n",
        encoding="utf-8",
    )
    return 0 if runtime_contract_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())

