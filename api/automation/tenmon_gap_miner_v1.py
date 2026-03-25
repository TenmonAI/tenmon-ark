#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    rej = rj(auto / "tenmon_latest_state_rejudge_summary.json")
    chat = rj(auto / "tenmon_chat_surface_stopbleed_summary.json")
    scr = rj(auto / "tenmon_scripture_naturalizer_summary.json")
    ops = rj(auto / "tenmon_operations_level_autonomy_summary.json")

    gaps = {
        "conversation_meta_leak": int(chat.get("meta_leak_count", 0)),
        "scripture_raw_dump": int(scr.get("raw_ocr_dump_count", 0)),
        "technical_misroute": int(chat.get("technical_misroute_count", chat.get("natural_misdrop_count", 0))),
        "factual_misroute": 0,
        "stale_truth": 1 if any("stale_sources" in str(x).lower() for x in (rej.get("remaining_blockers") or [])) else 0,
        "repo_hygiene": 0 if bool(rj(auto / "tenmon_repo_hygiene_final_seal_summary.json").get("repo_hygiene_clean")) else 1,
        "pwa_lived_gap": 0 if bool(rj(auto / "pwa_lived_completion_readiness.json")) else 1,
        "route_contract_gap": 0 if bool(rj(auto / "tenmon_cursor_runtime_execution_contract_summary.json")) else 1,
        "autonomy_runtime_gap": 0 if bool(ops.get("autonomy_cycle_pass")) else 1,
        "unsafe_patch_block": 1 if bool(rj(auto / "tenmon_execution_gate_hardstop_verdict.json").get("must_block")) else 0,
    }
    wj(auto / "tenmon_gap_taxonomy_v1.json", {"generated_at": utc(), "taxonomy": list(gaps.keys())})
    backlog = [{"family": k, "severity": ("high" if v > 0 else "ok"), "score": int(v)} for k, v in gaps.items()]
    backlog.sort(key=lambda x: x["score"], reverse=True)
    wj(auto / "tenmon_gap_backlog.json", {"generated_at": utc(), "items": backlog})
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

