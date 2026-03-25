#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_FULL_SYNC_WORLDCLASS_FINAL_ACCEPTANCE_CURSOR_AUTO_V1"

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
    gate = rj(auto / "tenmon_cursor_full_sync_acceptance_gate_summary.json")
    ops = rj(auto / "tenmon_operations_level_autonomy_summary.json")
    conv = rj(auto / "tenmon_conversation_worldclass_autofix_summary.json")
    truth = rj(auto / "tenmon_latest_truth_rebase_summary.json")
    hyg = rj(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    rej = rj(auto / "tenmon_latest_state_rejudge_summary.json")
    rem = [str(x).lower() for x in (rej.get("remaining_blockers") or [])]
    blocked_bad = [x for x in rem if any(k in x for k in ("stale_sources", "repo_hygiene", "fixture_only_proof", "fake_result_inject"))]
    out = {
        "card": CARD,
        "generated_at": utc(),
        "cursor_full_sync_established": bool(gate.get("cursor_full_sync_established")),
        "autonomy_running": bool(ops.get("autonomy_cycle_pass")),
        "conversation_autofix_running": bool(conv.get("conversation_autofix_running")),
        "latest_truth_source_is_current_run": bool(truth.get("latest_truth_rebased")),
        "repo_hygiene_clean": bool(hyg.get("repo_hygiene_clean")),
        "must_block_seal": bool(hyg.get("must_block_seal")),
        "remaining_blockers": rej.get("remaining_blockers") or [],
        "tenmon_cursor_fully_synced": bool(gate.get("cursor_full_sync_established")),
        "tenmon_autonomous_audit_build_loop_live": bool(ops.get("autonomy_cycle_pass")) or bool(ops.get("verify", {}).get("npm_build_ok")),
        "tenmon_conversation_autofix_live": bool(conv.get("conversation_autofix_running")),
        "pass": False,
    }
    out["pass"] = (
        out["cursor_full_sync_established"]
        and out["autonomy_running"]
        and out["conversation_autofix_running"]
        and out["latest_truth_source_is_current_run"]
        and out["repo_hygiene_clean"]
        and (out["must_block_seal"] is False)
        and len(blocked_bad) == 0
        and out["tenmon_cursor_fully_synced"]
        and out["tenmon_autonomous_audit_build_loop_live"]
        and out["tenmon_conversation_autofix_live"]
    )
    wj(auto / "tenmon_cursor_full_sync_worldclass_final_acceptance_summary.json", out)
    (auto / "tenmon_cursor_full_sync_worldclass_final_acceptance_report.md").write_text(
        f"# {CARD}\n\n- pass: `{out['pass']}`\n", encoding="utf-8"
    )
    return 0 if out["pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())

