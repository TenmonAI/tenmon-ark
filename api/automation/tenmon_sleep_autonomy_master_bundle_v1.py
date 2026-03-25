#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SLEEP_AUTONOMY_MASTER_BUNDLE_V1
CARD 0: TENMON_SLEEP_AUTONOMY_ARM_AND_SAFE_NIGHT_RUN_PARENT_CURSOR_AUTO_V1

8時間の夜間運用向けに、safe/medium の無人ループと high-risk escrow 整備を
単一オーケストレーションで順次実行し、single-source summary/report を出力する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SLEEP_AUTONOMY_ARM_AND_SAFE_NIGHT_RUN_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_sleep_autonomy_master_summary.json"
OUT_MD = "tenmon_sleep_autonomy_master_report.md"
SAFE_RETRY_CARD = "TENMON_SLEEP_AUTONOMY_MASTER_SAFE_RETRY_ONLY_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def run_cmd(args: list[str], cwd: Path, timeout_sec: int = 1200) -> dict[str, Any]:
    start = time.time()
    try:
        cp = subprocess.run(
            args,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        return {
            "ok": cp.returncode == 0,
            "exit_code": int(cp.returncode),
            "elapsed_sec": round(time.time() - start, 3),
            "args": args,
            "stdout_tail": (cp.stdout or "")[-4000:],
            "stderr_tail": (cp.stderr or "")[-4000:],
        }
    except Exception as e:
        return {
            "ok": False,
            "exit_code": None,
            "elapsed_sec": round(time.time() - start, 3),
            "args": args,
            "stdout_tail": "",
            "stderr_tail": f"{type(e).__name__}: {e}",
        }


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_high_risk_card(card_id: str) -> bool:
    c = (card_id or "").strip().upper()
    if not c:
        return True
    risky = (
        "K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR",
        "SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP",
        "GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH",
        "CHAT_TS",
        "CHAT_REFACTOR",
        "FINALIZE",
        "WEB_",
        "PWA_",
    )
    return any(x in c for x in risky)


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_sleep_autonomy_master_bundle_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--run-mac-step", action="store_true", help="CARD2 を実行する（既定は観測のみ）")
    ap.add_argument("--mac-step-cmd", default=os.environ.get("TENMON_MAC_ONE_SHOT_CMD", ""))
    ap.add_argument("--insurance", action="store_true", help="保険 CARD9 を実行")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    # CARD1: precheck / single-source truth
    step1 = run_cmd(["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], cwd=api, timeout_sec=900)
    forensic = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    step1_ok = bool(step1.get("ok")) and bool(forensic.get("system_ready") is True)

    # CARD2: Mac watch loop one-shot (optional execution)
    if args.run_mac_step:
        cmd = (args.mac_step_cmd or "").strip()
        if cmd:
            step2 = run_cmd(["bash", "-lc", cmd], cwd=api, timeout_sec=1800)
        else:
            step2 = {
                "ok": False,
                "exit_code": None,
                "elapsed_sec": 0.0,
                "args": ["(missing TENMON_MAC_ONE_SHOT_CMD)"],
                "stdout_tail": "",
                "stderr_tail": "run-mac-step=true だが mac-step-cmd が未指定",
            }
    else:
        # 観測のみ: current-run entry が存在するかで最低限判定
        bundle = read_json(auto / "remote_cursor_result_bundle.json")
        entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
        has_current_run = any(isinstance(x, dict) and x.get("current_run") is True for x in entries)
        step2 = {
            "ok": has_current_run,
            "exit_code": 0 if has_current_run else 1,
            "elapsed_sec": 0.0,
            "args": ["observe_only"],
            "stdout_tail": "",
            "stderr_tail": "" if has_current_run else "current_run entry not observed",
            "observe_only": True,
        }
    step2_ok = bool(step2.get("ok"))

    # CARD3: safe priority enqueue / single-flight
    step3 = run_cmd(["bash", str(scripts / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.sh")], cwd=api, timeout_sec=900)
    enqueue_summary = read_json(auto / "tenmon_autonomy_priority_loop_to_remote_queue_enqueue_summary.json")
    step3_ok = bool(step3.get("ok")) and (
        bool(enqueue_summary.get("enqueue_ok") is True)
        or bool("high_risk_card_requires_manual_gate" in (enqueue_summary.get("blocked_reason") or []))
    )

    # CARD4: result -> rejudge/scorecard bind（summary の確定値のみ参照）
    step4 = run_cmd(["bash", str(scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")], cwd=api, timeout_sec=1200)
    bind_summary = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")
    step4_ok = bool(step4.get("ok")) and bool(
        bind_summary.get("bundle_seen") is True
        and bind_summary.get("current_run_queue_executed") is True
        and (
            bind_summary.get("rejudge_refreshed") is True
            or bind_summary.get("rejudge_pending_but_result_bound") is True
        )
    )

    # CARD5: high-risk escrow pack for morning（queue投入しない）
    next_hr = str(forensic.get("next_best_card") or "").strip()
    if not next_hr or not is_high_risk_card(next_hr):
        next_hr = "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1"
    step5 = run_cmd(
        ["bash", str(scripts / "high_risk_escrow_approval_bridge_v1.sh"), next_hr],
        cwd=api,
        timeout_sec=900,
    )
    step5_out: dict[str, Any] = {}
    try:
        step5_out = json.loads((step5.get("stdout_tail") or "").splitlines()[-1])
    except Exception:
        step5_out = {}
    step5_ok = bool(step5.get("ok")) and bool(step5_out.get("enqueue_ok") is False)

    # CARD6-8: high-risk cards are escrow/manual-gate only
    hr_cards = [
        "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
        "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
        "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
    ]
    hr_steps: list[dict[str, Any]] = []
    for cid in hr_cards:
        r = run_cmd(["bash", str(scripts / "high_risk_escrow_approval_bridge_v1.sh"), cid], cwd=api, timeout_sec=900)
        robj: dict[str, Any] = {}
        try:
            robj = json.loads((r.get("stdout_tail") or "").splitlines()[-1])
        except Exception:
            robj = {}
        hr_steps.append(
            {
                "card_id": cid,
                "ok": bool(r.get("ok")) and bool(robj.get("enqueue_ok") is False),
                "runner": r,
                "escrow_package": robj.get("escrow_package"),
            }
        )
    step6_8_ok = all(bool(x.get("ok")) for x in hr_steps)

    # insurance CARD9 (optional)
    insurance_steps: list[dict[str, Any]] = []
    if args.insurance:
        insurance_steps.append(
            {
                "step": "worldclass_loop",
                "run": run_cmd(
                    ["python3", str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py")],
                    cwd=api,
                    timeout_sec=1200,
                ),
            }
        )
        insurance_steps.append(
            {
                "step": "forensic_refresh",
                "run": run_cmd(
                    ["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")],
                    cwd=api,
                    timeout_sec=900,
                ),
            }
        )
        insurance_steps.append(
            {
                "step": "scorecard_refresh",
                "run": run_cmd(
                    ["python3", str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")],
                    cwd=api,
                    timeout_sec=900,
                ),
            }
        )

    # final observation
    forensic2 = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    bind2 = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")

    mainline_1_5_ok = all([step1_ok, step2_ok, step3_ok, step4_ok, step5_ok])
    pass_conditions = {
        "mainline_1_5_unattended": mainline_1_5_ok,
        "high_risk_6_8_reached_escrow_or_manual_gate": step6_8_ok,
        "insurance_aggregated_if_requested": (not args.insurance) or all(bool(x.get("run", {}).get("ok")) for x in insurance_steps),
    }
    master_pass = all(pass_conditions.values())

    out = {
        "card": CARD,
        "generated_at": utc(),
        "master_pass": master_pass,
        "pass_conditions": pass_conditions,
        "night_definition_signals": {
            "safe_medium_loop_operable": bool(step3_ok and step4_ok),
            "nonfixture_current_run_roundtrip": bool(bind2.get("current_run_queue_executed") is True),
            "bundle_current_run_seen": bool(bind2.get("bundle_seen") is True),
            "rejudge_refreshed": bool(bind2.get("rejudge_refreshed") is True),
            "rejudge_pending_but_result_bound": bool(bind2.get("rejudge_pending_but_result_bound") is True),
            "scorecard_refreshed": bool(bind2.get("scorecard_refreshed") is True),
            "high_risk_escrow_prepared": bool(step5_ok and step6_8_ok),
        },
        "single_source": {
            "system_ready": forensic2.get("system_ready"),
            "watch_loop_stable": forensic2.get("watch_loop_stable"),
            "result_return_ok": forensic2.get("result_return_ok"),
            "latest_nonfixture_roundtrip_ok": forensic2.get("latest_nonfixture_roundtrip_ok"),
            "worldclass_score": scorecard.get("score_percent"),
            "conversation_quality_band": forensic2.get("conversation_quality_band"),
            "current_blockers": forensic2.get("current_blockers"),
            "next_best_card": forensic2.get("next_best_card"),
            "safe_next_cards": forensic2.get("safe_next_cards"),
            "stale_sources": forensic2.get("stale_sources"),
        },
        "steps": {
            "1_precheck_single_source": {"ok": step1_ok, "run": step1},
            "2_mac_watch_one_shot": {"ok": step2_ok, "run": step2},
            "3_safe_priority_enqueue_single_flight": {"ok": step3_ok, "run": step3, "summary": enqueue_summary},
            "4_result_rejudge_scorecard_bind": {"ok": step4_ok, "run": step4, "summary": bind_summary},
            "5_high_risk_escrow_pack_for_morning": {"ok": step5_ok, "run": step5, "summary": step5_out},
            "6_8_high_risk_escrow_only": hr_steps,
            "9_insurance": insurance_steps,
        },
        "next_on_pass": "TENMON_AUTONOMY_ARM_PRECHECK_AND_SINGLE_SOURCE_TRUTH_CURSOR_AUTO_V1",
        "next_on_fail": {
            "halt": True,
            "safe_retry_card": SAFE_RETRY_CARD,
            "reason": "evidence_bundle_persisted_with_blockers",
        },
    }
    write_json(auto / OUT_JSON, out)

    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- mainline_1_5_unattended: `{pass_conditions['mainline_1_5_unattended']}`",
        f"- high_risk_6_8_reached_escrow_or_manual_gate: `{pass_conditions['high_risk_6_8_reached_escrow_or_manual_gate']}`",
        f"- insurance_aggregated_if_requested: `{pass_conditions['insurance_aggregated_if_requested']}`",
        "",
        "## single_source",
        "",
        f"- system_ready: `{out['single_source']['system_ready']}`",
        f"- watch_loop_stable: `{out['single_source']['watch_loop_stable']}`",
        f"- result_return_ok: `{out['single_source']['result_return_ok']}`",
        f"- latest_nonfixture_roundtrip_ok: `{out['single_source']['latest_nonfixture_roundtrip_ok']}`",
        f"- worldclass_score: `{out['single_source']['worldclass_score']}`",
        f"- conversation_quality_band: `{out['single_source']['conversation_quality_band']}`",
        f"- next_best_card: `{out['single_source']['next_best_card']}`",
        "",
        "## blockers",
        "",
    ]
    blockers = out["single_source"].get("current_blockers") or []
    if isinstance(blockers, list) and blockers:
        for b in blockers[:40]:
            lines.append(f"- {b}")
    else:
        lines.append("- (none)")
    lines.extend(
        [
            "",
            "## overnight_progress_summary",
            "",
            f"- step1_precheck: `{step1_ok}`",
            f"- step2_mac_watch_one_shot: `{step2_ok}`",
            f"- step3_safe_enqueue: `{step3_ok}`",
            f"- step4_result_bind: `{step4_ok}`",
            f"- step5_escrow_pack: `{step5_ok}`",
            f"- step6_8_high_risk_escrow_only: `{step6_8_ok}`",
            "",
            "## next",
            "",
            f"- on_pass: `{out['next_on_pass']}`",
            f"- on_fail.safe_retry_card: `{SAFE_RETRY_CARD}`",
        ]
    )
    (auto / OUT_MD).write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "master_pass": master_pass, "summary": str(auto / OUT_JSON)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

