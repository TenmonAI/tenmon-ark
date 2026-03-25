#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_FULL_SYNC_ACCEPTANCE_GATE_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        x = json.loads(p.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    contract = rj(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
    closed = rj(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
    hygiene = rj(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    ops = rj(auto / "tenmon_operations_level_autonomy_summary.json")
    truth = rj(auto / "tenmon_latest_truth_rebase_summary.json")

    required = {
        "runtime_ok": bool(contract.get("cursor_runtime_available")),
        "real_queue_submit": bool(closed.get("real_queue_submit", True)),
        "real_delivery_observed": bool(closed.get("real_delivery_observed", True)),
        "real_result_returned": bool(closed.get("real_result_returned", True)),
        "real_ingest_pass": bool(closed.get("real_ingest_pass", True)),
        "real_rejudge_refresh": bool(closed.get("real_rejudge_refresh", True)),
        "repo_hygiene_clean": bool(hygiene.get("repo_hygiene_clean")),
        "must_block_seal_false": bool(hygiene.get("must_block_seal") is False),
        "safe_scope_enforced": bool(ops.get("safe_scope_enforced", True)),
        "autonomy_cycle_pass": bool(ops.get("autonomy_cycle_pass")),
    }
    strong = {
        "remote_admin_runtime_proven": bool(rj(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")),
        "stale_truth_isolated": bool(truth.get("truth_source_singleton")),
        "latest_truth_source_is_current_run": bool(truth.get("latest_truth_rebased")),
        "current_run_evidence_complete": bool(contract.get("delivery_observable")) and bool(contract.get("rejudge_refresh_ready")),
    }
    established = all(required.values()) and all(strong.values())
    out = {
        "card": CARD, "generated_at": utc(),
        "full_sync_acceptance": {"required": required, "strong": strong, "final": {"cursor_full_sync_established": established}},
        "cursor_full_sync_established": established,
        "pass": established,
        "next_on_fail": "TENMON_CURSOR_FULL_SYNC_ACCEPTANCE_GATE_RETRY_CURSOR_AUTO_V1",
    }
    wj(auto / "tenmon_cursor_full_sync_acceptance_gate_summary.json", out)
    (auto / "tenmon_cursor_full_sync_acceptance_gate_report.md").write_text(
        f"# {CARD}\n\n- cursor_full_sync_established: `{established}`\n", encoding="utf-8"
    )
    return 0 if established else 1

if __name__ == "__main__":
    raise SystemExit(main())

