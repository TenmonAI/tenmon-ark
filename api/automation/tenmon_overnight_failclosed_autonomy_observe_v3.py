#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

CARD = "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V3"
OUT_JSON = "tenmon_overnight_failclosed_autonomy_observe_v3.json"


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def get_json(url: str, timeout: float = 10.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return {"ok_http": 200 <= int(r.status) < 300, "status": int(r.status), "json": js}
    except urllib.error.HTTPError as e:
        return {"ok_http": False, "status": int(e.code), "json": {}}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    base = os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000").rstrip("/")

    overnight = read_json(auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_summary.json")
    queue = read_json(auto / "remote_cursor_queue.json")
    bundle = read_json(auto / "remote_cursor_result_bundle.json")
    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    score = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    health = get_json(f"{base}/api/health")
    audit = get_json(f"{base}/api/audit")
    audit_build = get_json(f"{base}/api/audit.build")

    blocked = overnight.get("blocked_reason") if isinstance(overnight.get("blocked_reason"), list) else []
    halted_reason = overnight.get("halted_reason")
    cycle_tail = overnight.get("cycle_records_tail") or []
    latest = cycle_tail[-1] if cycle_tail and isinstance(cycle_tail[-1], dict) else {}
    latest_selected = latest.get("selected_card")

    # classify halt axis
    halt_axis = "unknown"
    if any("halt_verify_failed" in str(b) for b in blocked):
        halt_axis = "infra_or_verify"
    if any("halt_execute_failed" in str(b) for b in blocked):
        halt_axis = "execute_selected"
    if not blocked and halted_reason:
        halt_axis = "parent_other"

    # single recommended_retry_card
    if halt_axis == "infra_or_verify":
        recommended_retry = "TENMON_OVERNIGHT_INFRA_RESTORE_RETRY_V1"
    elif halt_axis == "execute_selected":
        recommended_retry = latest_selected or "TENMON_OVERNIGHT_PARENT_WIRING_RETRY_V1"
    else:
        # fall back to continuity / floor 修復
        recommended_retry = "TENMON_OVERNIGHT_CONVERSATION_FLOOR_REPAIR_V1"

    proof_bundle = {
        "overnight_summary_path": str(auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_summary.json"),
        "queue_path": str(auto / "remote_cursor_queue.json"),
        "bundle_path": str(auto / "remote_cursor_result_bundle.json"),
        "rejudge_summary_path": str(auto / "tenmon_latest_state_rejudge_summary.json"),
        "scorecard_path": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        "health": {"ok": health.get("ok_http"), "status": health.get("status")},
        "audit": {"ok": audit.get("ok_http"), "status": audit.get("status")},
        "audit_build": {"ok": audit_build.get("ok_http"), "status": audit_build.get("status")},
    }

    out = {
        "card": CARD,
        "halt_axis": halt_axis,
        "halt_reason": halted_reason or blocked,
        "latest_selected_card": latest_selected,
        "recommended_retry_card": recommended_retry,
        "retry_priority_order": [recommended_retry],
        "proof_bundle": proof_bundle,
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

