#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1

自律 OS の hands-off 前提を既存サマリから集約判定する（成功の捏造なし）。
未達時は seal 禁止。TENMON_FINAL_AUTONOMY_HANDS_OFF_HUMAN_OVERRIDE=1 は運用上の明示記録のみ（ゲート AND は変えない）。
"""
from __future__ import annotations

import json
import os
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePath
from typing import Any

CARD = "TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1"
OUT_JSON = "final_autonomy_seal_summary.json"
OUT_MD = "hands_off_operation_runbook.md"
NEXT_ON_PASS_NOTE = "TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1 完了"
NEXT_ON_FAIL_NOTE = "停止。seal retry 1枚のみ生成。"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def _truthy_env(name: str) -> bool:
    v = (os.environ.get(name) or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _pick_overnight_path(repo: Path, auto: Path) -> Path:
    env_p = os.environ.get("TENMON_OVERNIGHT_AUTONOMY_SUMMARY", "").strip()
    if env_p:
        p = Path(env_p).expanduser()
        if not p.is_absolute():
            p = (auto / p).resolve() if len(PurePath(p).parts) == 1 else (repo / p).resolve()
        return p
    p1 = auto / "tenmon_continuous_self_improvement_overnight_daemon_summary.json"
    if p1.is_file():
        return p1
    return auto / "tenmon_overnight_full_autonomy_summary.json"


def _newest_build_probe_result(auto: Path) -> tuple[Path | None, dict[str, Any]]:
    best: tuple[float, Path, dict[str, Any]] | None = None
    for p in auto.glob("out/**/build_probe_rollback_result.json"):
        if not p.is_file():
            continue
        try:
            st = p.stat().st_mtime
            d = _read_json(p)
            if not d:
                continue
            if best is None or st > best[0]:
                best = (st, p, d)
        except OSError:
            continue
    if best is None:
        return None, {}
    return best[1], best[2]


def _self_commit_evidence(auto: Path) -> tuple[dict[str, Any], dict[str, Any], Path | None, Path | None]:
    p_ac = auto / "out" / "acceptance_commit_requeue" / "acceptance_commit_requeue_summary.json"
    env_ac = os.environ.get("TENMON_ACCEPTANCE_COMMIT_SUMMARY_PATH", "").strip()
    if env_ac:
        p_ac = Path(env_ac).expanduser().resolve()
    ac = _read_json(p_ac)

    p_ts = auto / "out" / "true_self_commit" / "true_self_commit_summary.json"
    env_ts = os.environ.get("TENMON_TRUE_SELF_COMMIT_SUMMARY_PATH", "").strip()
    if env_ts:
        p_ts = Path(env_ts).expanduser().resolve()
    ts = _read_json(p_ts)
    return ac, ts, p_ac if p_ac.is_file() or env_ac else None, p_ts if p_ts.is_file() or env_ts else None


def _acceptance_gated_commit_ready(ac: dict[str, Any], ts: dict[str, Any]) -> tuple[bool, str]:
    if ac.get("commit_ready") is True:
        return True, "acceptance_commit_requeue_summary"
    up = ts.get("upstream_acceptance_gated") if isinstance(ts.get("upstream_acceptance_gated"), dict) else {}
    if up.get("commit_ready") is True:
        return True, "true_self_commit_upstream"
    if not ac and not ts:
        return False, "missing_self_commit_summaries"
    if ac.get("commit_ready") is False and ac.get("gate_reason"):
        return False, f"gated:{ac.get('gate_reason')}"
    if ts and ts.get("commit_allowed") is not True and not up.get("commit_ready"):
        return False, "commit_not_allowed_or_upstream_false"
    return False, "commit_ready_false"


def _glob_newest(auto: Path, pattern: str) -> tuple[Path | None, dict[str, Any]]:
    best: tuple[float, Path, dict[str, Any]] | None = None
    for p in auto.glob(pattern):
        if not p.is_file():
            continue
        try:
            st = p.stat().st_mtime
            d = _read_json(p)
            if d and (best is None or st > best[0]):
                best = (st, p, d)
        except OSError:
            continue
    if best is None:
        return None, {}
    return best[1], best[2]


def _last_mile_watch_evidence(last_mile: dict[str, Any]) -> dict[str, Any]:
    for st in last_mile.get("steps") or []:
        if not isinstance(st, dict):
            continue
        if int(st.get("step") or 0) != 2:
            continue
        runs = st.get("runs") if isinstance(st.get("runs"), dict) else {}
        w = runs.get("watch_loop_one_shot") if isinstance(runs.get("watch_loop_one_shot"), dict) else {}
        return {"step2_found": True, "watch": w}
    return {"step2_found": False, "watch": {}}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    overnight_path = _pick_overnight_path(repo, auto)
    os_sum_path = auto / "tenmon_continuous_self_improvement_os_summary.json"
    sc_path = auto / "tenmon_worldclass_acceptance_scorecard.json"
    ascent_path = auto / "tenmon_pwa_dialogue_final_ascent_summary.json"
    stall_path = auto / "autonomy_stall_recovery_summary.json"
    morning_path = auto / "morning_approval_execution_chain_summary.json"
    forensic_path = auto / "tenmon_autonomy_current_state_forensic.json"
    last_mile_path = auto / "tenmon_final_autonomy_last_mile_parent_summary.json"
    browser_path = auto / "tenmon_browser_ai_operator_runtime_summary.json"
    cursor_pp = auto / "cursor_patch_plan.json"

    overnight = _read_json(overnight_path)
    os_sum = _read_json(os_sum_path)
    sc = _read_json(sc_path)
    ascent = _read_json(ascent_path)
    stall = _read_json(stall_path)
    morning = _read_json(morning_path)
    forensic = _read_json(forensic_path)
    last_mile = _read_json(last_mile_path)
    browser = _read_json(browser_path)

    ac, ts, ac_p, ts_p = _self_commit_evidence(auto)
    bp_path, bp = _newest_build_probe_result(auto)
    pp_main_p, pp_main = _glob_newest(auto, "out/**/browser_ai_patchplan_mainline_summary.json")

    pp_file = _read_json(cursor_pp)
    pp_ok_file = bool(pp_file.get("ok") is True)
    pp_ok_summary = bool(pp_main.get("patch_plan_ok") is True)
    patch_plan_ready = pp_ok_file or pp_ok_summary
    patch_plan_reason = (
        "cursor_patch_plan_ok"
        if pp_ok_file
        else ("browser_ai_patchplan_mainline_summary" if pp_ok_summary else "no_valid_patch_plan_artifact")
    )

    is_darwin = platform.system().lower() == "darwin"
    watch_ev = _last_mile_watch_evidence(last_mile)
    w = watch_ev.get("watch") if isinstance(watch_ev.get("watch"), dict) else {}

    # --- 1) watch loop real execution ready ---
    if bool(forensic.get("watch_loop_stable")) is not True:
        watch_ready = False
        watch_reason = "forensic_watch_loop_stable_false"
    elif is_darwin and w.get("skipped"):
        watch_ready = False
        watch_reason = "darwin_but_watch_skipped"
    elif w.get("ok") is True:
        watch_ready = True
        watch_reason = "last_mile_watch_one_shot_ok"
    elif w.get("skipped") and str(w.get("reason") or "") == "non_darwin":
        watch_ready = True
        watch_reason = "forensic_stable_non_darwin_watch_skipped_expected"
    elif not is_darwin:
        watch_ready = True
        watch_reason = "forensic_stable_non_darwin"
    else:
        watch_ready = False
        watch_reason = "darwin_needs_watch_one_shot_ok"

    # --- 2) browser consult ready ---
    browser_pass = bool(browser.get("browser_ai_operator_runtime_pass") is True)
    fr = str(browser.get("fail_reason") or "")
    if browser_pass:
        browser_ready = True
        browser_reason = "browser_ai_operator_runtime_pass"
    elif not is_darwin and "mac_only" in fr and patch_plan_ready:
        browser_ready = True
        browser_reason = "non_darwin_mac_only_delegated_with_patch_plan_bridge_ok"
    else:
        browser_ready = False
        browser_reason = fr or "browser_ai_operator_runtime_pass_false"

    # --- 4) build / probe / rollback ready ---
    bp_ready = bool(bp.get("overall_pass") is True) if bp else False
    bp_reason = "build_probe_rollback_ok" if bp_ready else ("no_artifact" if bp_path is None else "overall_pass_false")

    # --- 5) acceptance gated commit ready ---
    gated_ok, gated_src = _acceptance_gated_commit_ready(ac, ts)

    # --- 6) morning approval execution chain ready ---
    failed_m = [x for x in (morning.get("failed_cards") or []) if isinstance(x, dict)]
    executed_ids = {str(x.get("card_id") or "") for x in (morning.get("executed_cards") or []) if isinstance(x, dict)}
    chain_ids = [str(x) for x in (morning.get("chain_order_effective") or []) if str(x)]
    if not chain_ids:
        chain_ids = [str(x) for x in (morning.get("chain_order_declared") or []) if str(x)]
    pending = [x for x in (morning.get("pending_cards") or []) if isinstance(x, dict)]
    morning_ready = (
        morning_path.is_file()
        and len(failed_m) == 0
        and bool(morning.get("chain_order_ok") is True)
        and len(pending) == 0
        and len(chain_ids) > 0
        and all(cid in executed_ids for cid in chain_ids)
    )
    morning_reason = "morning_chain_all_executed" if morning_ready else "pending_or_failed_or_order_violation_or_missing_summary"

    # --- 7) PWA dialogue ascent ready ---
    ascent_ready = bool(ascent.get("dialogue_final_ascent_ready") is True)
    ascent_reason = "dialogue_final_ascent_ready_true" if ascent_ready else "dialogue_final_ascent_ready_false"

    # --- 8) stall recovery ready ---
    stall_ready = bool(stall.get("stall_detected") is False) and not bool(stall.get("skipped_due_to_stop_file") is True)
    if not stall_path.is_file():
        stall_ready = False
        stall_reason = "stall_recovery_summary_missing"
    elif bool(stall.get("skipped_due_to_stop_file") is True):
        stall_reason = "stop_file_active_autonomy_paused"
    elif bool(stall.get("stall_detected") is True):
        stall_reason = "stall_detected_true"
    else:
        stall_reason = "no_stall_observed"

    gates: dict[str, Any] = {
        "watch_loop_real_execution_ready": watch_ready,
        "browser_consult_ready": browser_ready,
        "patch_plan_bridge_ready": patch_plan_ready,
        "build_probe_rollback_ready": bp_ready,
        "acceptance_gated_commit_ready": gated_ok,
        "morning_approval_execution_chain_ready": morning_ready,
        "pwa_dialogue_ascent_ready": ascent_ready,
        "stall_recovery_ready": stall_ready,
    }
    gate_reasons: dict[str, str] = {
        "watch_loop_real_execution_ready": watch_reason,
        "browser_consult_ready": browser_reason,
        "patch_plan_bridge_ready": patch_plan_reason,
        "build_probe_rollback_ready": bp_reason,
        "acceptance_gated_commit_ready": gated_src,
        "morning_approval_execution_chain_ready": morning_reason,
        "pwa_dialogue_ascent_ready": ascent_reason,
        "stall_recovery_ready": stall_reason,
    }

    blocked_reasons: list[str] = []
    for k, ok in gates.items():
        if not ok:
            blocked_reasons.append(f"gate:{k}_false:{gate_reasons.get(k, '')}")

    hands_off_ready = all(bool(v) for v in gates.values())
    human_override = _truthy_env("TENMON_FINAL_AUTONOMY_HANDS_OFF_HUMAN_OVERRIDE")
    seal_allowed = hands_off_ready

    autonomy_inputs = {
        "overnight_summary_path": str(overnight_path),
        "overnight_exists": overnight_path.is_file(),
        "continuous_os_summary_path": str(os_sum_path),
        "continuous_pass": os_sum.get("continuous_pass"),
        "scorecard_path": str(sc_path),
        "scorecard_sealed_operable_ready": sc.get("sealed_operable_ready"),
        "scorecard_worldclass_ready": sc.get("worldclass_ready"),
        "score_percent": sc.get("score_percent"),
        "final_ascent_summary_path": str(ascent_path),
        "stall_recovery_summary_path": str(stall_path),
        "morning_chain_summary_path": str(morning_path),
        "acceptance_commit_summary_path": str(ac_p) if ac_p else None,
        "true_self_commit_summary_path": str(ts_p) if ts_p else None,
        "forensic_path": str(forensic_path),
        "last_mile_parent_path": str(last_mile_path),
    }

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "next_on_pass_note": NEXT_ON_PASS_NOTE,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "hands_off_ready": hands_off_ready,
        "seal_allowed": seal_allowed,
        "human_override_applied": human_override,
        "blocked_reasons": sorted(set(blocked_reasons)),
        "gates": gates,
        "gate_reasons": gate_reasons,
        "autonomy_inputs": autonomy_inputs,
        "evidence_paths": {
            "build_probe_rollback": str(bp_path) if bp_path else None,
            "cursor_patch_plan": str(cursor_pp) if cursor_pp.is_file() else None,
            "browser_ai_patchplan_mainline_summary": str(pp_main_p) if pp_main_p else None,
        },
    }

    out_json = auto / OUT_JSON
    out_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    runbook = "\n".join(
        [
            f"# Hands-off operation runbook ({CARD})",
            "",
            f"- generated_at: `{summary['generated_at']}`",
            f"- **hands_off_ready**: `{hands_off_ready}`（全ゲート AND。捏造なし）",
            f"- **seal_allowed**: `{seal_allowed}`（= hands_off_ready。未達 gate では false）",
            f"- **human_override_applied** (`TENMON_FINAL_AUTONOMY_HANDS_OFF_HUMAN_OVERRIDE`): `{human_override}`（記録のみ）",
            "",
            "## Gates (evidence-based)",
            "",
        ]
        + [f"- **{gk}**: `{gates[gk]}` — _{gate_reasons.get(gk, '')}_" for gk in gates]
        + [
            "",
            "## Input summaries (refresh order推奨)",
            "",
            f"- overnight / autonomy: `{autonomy_inputs['overnight_summary_path']}`",
            f"- continuous OS: `{autonomy_inputs['continuous_os_summary_path']}`",
            f"- scorecard: `{autonomy_inputs['scorecard_path']}`",
            f"- final ascent: `{ascent_path}`",
            f"- stall recovery: `{stall_path}`",
            f"- morning chain: `{morning_path}`",
            f"- acceptance gated commit: `api/automation/out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json`",
            f"- forensic: `{forensic_path}`",
            f"- last mile parent: `{last_mile_path}`",
            "",
            "## Blocked reasons (current)",
            "",
        ]
        + [f"- {b}" for b in summary["blocked_reasons"]]
        + [
            "",
            "## Operator commands (reference)",
            "",
            "- final ascent: `python3 api/automation/tenmon_pwa_dialogue_final_ascent_v1.py`",
            "- stall recovery: `python3 api/automation/autonomy_stall_recovery_v1.py`",
            "- morning chain: `python3 api/automation/morning_approval_execution_chain_v1.py`",
            "- scorecard: `python3 api/automation/tenmon_worldclass_acceptance_scorecard_v1.py`",
            "",
            "## next",
            "",
            f"- **nextOnPass**: {NEXT_ON_PASS_NOTE}",
            f"- **nextOnFail**: {NEXT_ON_FAIL_NOTE}",
            "",
        ]
    )
    (auto / OUT_MD).write_text(runbook + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "hands_off_ready": hands_off_ready,
                "seal_allowed": seal_allowed,
                "path": str(out_json),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
