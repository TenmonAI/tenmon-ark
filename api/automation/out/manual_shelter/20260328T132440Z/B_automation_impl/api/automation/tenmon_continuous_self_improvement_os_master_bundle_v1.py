#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTINUOUS_SELF_IMPROVEMENT_OS_MASTER_BUNDLE_V1
CARD0: TENMON_CONTINUOUS_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CONTINUOUS_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_continuous_self_improvement_os_summary.json"
OUT_MD = "tenmon_continuous_self_improvement_os_report.md"
SAFE_RETRY_CARD = "TENMON_CONTINUOUS_SELF_IMPROVEMENT_OS_SAFE_RETRY_ONLY_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def run(args: list[str], cwd: Path, timeout: int = 1200) -> dict[str, Any]:
    try:
        p = subprocess.run(args, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "args": args,
            "stdout_tail": (p.stdout or "")[-4000:],
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "args": args, "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


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


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    # 1 runtime/watch/queue fixed: observe-only via forensic + watch one-shot summary existence
    step1 = run(["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], cwd=api, timeout=900)
    forensic = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    step1_ok = bool(step1.get("ok")) and bool(forensic.get("system_ready") is True and forensic.get("watch_loop_stable") is True)

    # 2 continuous priority enqueue
    step2 = run(["bash", str(scripts / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.sh")], cwd=api, timeout=900)
    enq = read_json(auto / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_summary.json")
    step2_ok = bool(step2.get("ok")) and (
        enq.get("enqueue_ok") is True
        or "high_risk_card_requires_manual_gate" in (enq.get("blocked_reason") or [])
        or "gate:duplicate_cursor_card_already_pending" in (enq.get("blocked_reason") or [])
    )

    # 3 result bind and scorecard
    step3 = run(["bash", str(scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")], cwd=api, timeout=1200)
    bind = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")
    step3_ok = bool(step3.get("ok")) and bool(
        bind.get("bundle_seen") is True
        and bind.get("current_run_queue_executed") is True
        and (bind.get("rejudge_refreshed") is True or bind.get("rejudge_pending_but_result_bound") is True)
    )

    # 4 escrow high risk prep + morning approval list
    hr_cards = [
        "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
        "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
        "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
    ]
    hr_runs: list[dict[str, Any]] = []
    morning_items: list[dict[str, Any]] = []
    for cid in hr_cards:
        r = run(["bash", str(scripts / "high_risk_escrow_approval_bridge_v1.sh"), cid], cwd=api, timeout=900)
        obj: dict[str, Any] = {}
        try:
            obj = json.loads((r.get("stdout_tail") or "").splitlines()[-1])
        except Exception:
            obj = {}
        ok = bool(r.get("ok")) and bool(obj.get("enqueue_ok") is False)
        hr_runs.append({"card_id": cid, "ok": ok, "run": r, "summary": obj})
        morning_items.append(
            {
                "card_id": cid,
                "approval_required": True,
                "escrow_package": obj.get("escrow_package"),
                "escrow_report": obj.get("escrow_report"),
                "recommended_decision": obj.get("recommended_decision"),
                "approve_command": f"./scripts/high_risk_escrow_approval_bridge_v1.sh {cid} --approve --approve-by $(whoami)",
            }
        )
    morning_list = {
        "card": "TENMON_CONTINUOUS_ESCROW_HIGH_RISK_PREP_CURSOR_AUTO_V1",
        "generated_at": utc(),
        "items": morning_items,
    }
    write_json(auto / "tenmon_high_risk_morning_approval_list.json", morning_list)
    step4_ok = all(bool(x.get("ok")) for x in hr_runs)

    # 5 selector
    step5 = run(["python3", str(auto / "tenmon_conversation_worldclass_mainline_selector_v1.py")], cwd=api, timeout=900)
    selector = read_json(auto / "tenmon_conversation_worldclass_mainline_selector.json")
    step5_ok = bool(step5.get("ok")) and bool(isinstance(selector.get("safe_next_cards"), list) and isinstance(selector.get("manual_gate_cards"), list) and selector.get("next_best_card"))

    # 6 state seal: reuse sleep master + forensic + scorecard and aggregate
    step6a = run(["bash", str(scripts / "tenmon_sleep_autonomy_master_bundle_v1.sh")], cwd=api, timeout=1800)
    step6b = run(["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], cwd=api, timeout=900)
    step6c = run(["python3", str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], cwd=api, timeout=900)
    sleep_sum = read_json(auto / "tenmon_sleep_autonomy_master_summary.json")
    forensic2 = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    score = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    step6_ok = bool(step6a.get("ok") and step6b.get("ok") and step6c.get("exit_code") in (0, 1))

    # insurance scripts
    insurance1 = run(["python3", str(auto / "tenmon_continuous_runtime_health_rescue_v1.py")], cwd=api, timeout=900)
    insurance2 = run(["python3", str(auto / "tenmon_continuous_queue_dedup_and_backpressure_v1.py")], cwd=api, timeout=900)
    insurance_summary1 = read_json(auto / "tenmon_continuous_runtime_health_rescue_summary.json")
    insurance_summary2 = read_json(auto / "tenmon_continuous_queue_dedup_and_backpressure_summary.json")

    pass_ok = all([step1_ok, step2_ok, step3_ok, step4_ok, step5_ok, step6_ok])
    out = {
        "card": CARD,
        "generated_at": utc(),
        "continuous_pass": pass_ok,
        "overall_completion_band": sleep_sum.get("single_source", {}).get("conversation_quality_band") or "unknown",
        "worldclass_score": score.get("score_percent"),
        "current_blockers": forensic2.get("current_blockers"),
        "next_best_card": selector.get("next_best_card") or forensic2.get("next_best_card"),
        "safe_next_cards": selector.get("safe_next_cards"),
        "manual_gate_cards": selector.get("manual_gate_cards"),
        "morning_approval_list": str(auto / "tenmon_high_risk_morning_approval_list.json"),
        "overnight_progress_summary": {
            "step1_runtime_watch_queue_fixed": step1_ok,
            "step2_priority_enqueue": step2_ok,
            "step3_result_bind_scorecard": step3_ok,
            "step4_escrow_high_risk": step4_ok,
            "step5_worldclass_selector": step5_ok,
            "step6_state_seal": step6_ok,
        },
        "steps": {
            "1": step1,
            "2": {"run": step2, "summary": enq},
            "3": {"run": step3, "summary": bind},
            "4": {"runs": hr_runs, "morning_approval_list": morning_list},
            "5": {"run": step5, "summary": selector},
            "6": {"sleep_parent": step6a, "forensic": step6b, "scorecard": step6c},
            "7_insurance_runtime_rescue": {"run": insurance1, "summary": insurance_summary1},
            "8_insurance_queue_dedup": {"run": insurance2, "summary": insurance_summary2},
        },
        "next_on_pass": "TENMON_CONTINUOUS_RUNTIME_WATCH_AND_QUEUE_FIXED_CURSOR_AUTO_V1",
        "next_on_fail": {"halt": True, "safe_retry_card": SAFE_RETRY_CARD},
    }
    write_json(auto / OUT_JSON, out)

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **continuous_pass**: `{pass_ok}`",
        f"- worldclass_score: `{out['worldclass_score']}`",
        f"- next_best_card: `{out['next_best_card']}`",
        "",
        "## overnight_progress_summary",
        "",
    ]
    for k, v in out["overnight_progress_summary"].items():
        md.append(f"- {k}: `{v}`")
    md.extend(["", "## morning_approval_list", "", f"- `{out['morning_approval_list']}`"])
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "continuous_pass": pass_ok, "path": str(auto / OUT_JSON)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

