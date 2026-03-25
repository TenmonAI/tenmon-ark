#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARENT_07: 周期自己改善・修復・解析・構築の周波数を成熟度で制御。
- 状態・推奨頻度・サイクルスコアを JSON 出力
- cron/systemd の変更は行わない（提案テキストのみ）
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from frequency_stage_controller_v1 import (
    STAGE_LABELS,
    STAGE_RUNS_PER_DAY,
    cron_suggestions_for_stage,
    decide_stage_transition,
)

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_GOVERNOR_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_AND_FREQUENCY_CONTROL_VPS_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _gather_current_metrics(auto: Path) -> Dict[str, Any]:
    integrated = _read(auto / "integrated_final_verdict.json")
    seal = _read(auto / "integrated_acceptance_seal.json")
    reg = _read(auto / "regression_report.json")
    fc = _read(auto / "fail_classification.json")
    pq = _read(auto / "self_build_priority_queue.json")

    overall_pass = True
    if isinstance(integrated.get("overall"), dict):
        overall_pass = bool(integrated["overall"].get("pass", integrated["overall"].get("ok", True)))
    elif seal:
        overall_pass = bool(seal.get("overall_pass", True))

    comp = (reg.get("comparison") or {}) if isinstance(reg, dict) else {}
    regression_now = bool(comp.get("regression_detected"))

    rt_ok = True
    if isinstance(integrated.get("runtime"), dict):
        rt_ok = bool((integrated["runtime"].get("summary") or {}).get("ok", True))

    fail_types = list(fc.get("fail_types") or []) if isinstance(fc, dict) else []
    rollback_signal = any(
        x in fail_types
        for x in ("dangerous_patch", "restart_fail", "build_fail", "runtime_regression")
    )
    critical_fail = bool(fail_types) and not overall_pass

    counts = (pq.get("counts") or {}) if isinstance(pq, dict) else {}
    rdy = int(counts.get("ready") or 0)
    pend = int(counts.get("pending") or 0)
    blk = int(counts.get("blocked") or 0)
    tot = max(1, rdy + pend + blk)
    blocker_ready_ratio = rdy / tot

    return {
        "acceptance_pass": overall_pass,
        "regression_now": regression_now,
        "rollback_signal": rollback_signal,
        "runtime_ok": rt_ok,
        "blocker_ready_ratio": round(blocker_ready_ratio, 4),
        "critical_fail": critical_fail,
        "fail_types": fail_types[:20],
        "inputs": {
            "integrated_final_verdict": str(auto / "integrated_final_verdict.json"),
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
            "regression_report": str(auto / "regression_report.json"),
            "fail_classification": str(auto / "fail_classification.json"),
            "self_build_priority_queue": str(auto / "self_build_priority_queue.json"),
        },
    }


def _consecutive_failures(history: List[Dict[str, Any]]) -> int:
    n = 0
    for row in reversed(history):
        if not isinstance(row, dict):
            continue
        if row.get("acceptance_pass"):
            break
        n += 1
    return n


def _streak_after_cycle(old_hist: List[Dict[str, Any]], acceptance_pass: bool) -> int:
    """履歴（今回未追加）に基づき、今回サイクル後の連続失敗数。"""
    base = _consecutive_failures(old_hist)
    if acceptance_pass:
        return 0
    return base + 1


def _score_cycle(metrics: Dict[str, Any], regression_now: bool) -> Dict[str, Any]:
    acc = 100 if metrics.get("acceptance_pass") else 0
    reg = 0 if regression_now else 100
    rb = 100 if not metrics.get("rollback_signal") else 40
    rt = 100 if metrics.get("runtime_ok") else 30
    br = min(100, max(0, float(metrics.get("blocker_ready_ratio") or 0) * 400))
    composite = int(round((acc * 0.35 + reg * 0.25 + rb * 0.15 + rt * 0.15 + br * 0.1)))
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "composite": composite,
        "components": {
            "acceptance_weighted": acc,
            "regression_absence": reg,
            "rollback_absence": rb,
            "runtime_stability": rt,
            "blocker_ready_proxy": int(round(br)),
        },
        "notes": "サイクルごとの outcome。governor は履歴に1行追加する",
    }


def run_governor() -> Dict[str, Any]:
    auto = api_automation()
    state_path = auto / "scheduled_evolution_state.json"
    st: Dict[str, Any] = {}
    if state_path.is_file():
        try:
            st = json.loads(state_path.read_text(encoding="utf-8", errors="replace"))
        except Exception:
            st = {}
    if not isinstance(st, dict):
        st = {}
    st.setdefault("version", 1)
    st.setdefault("card", CARD)
    st.setdefault("stage", 1)
    st.setdefault("history", [])
    st.setdefault("runs_since_stage_change", 0)

    cur_stage = int(st.get("stage") or 1)
    metrics = _gather_current_metrics(auto)
    old_hist = [x for x in (st.get("history") or []) if isinstance(x, dict)]

    streak = _streak_after_cycle(old_hist, bool(metrics["acceptance_pass"]))
    snap = {
        "acceptance_pass": metrics["acceptance_pass"],
        "regression_now": metrics["regression_now"],
        "critical_fail": metrics["critical_fail"],
        "consecutive_failures": streak,
    }

    runs_before = int(st.get("runs_since_stage_change") or 0)
    maturity = decide_stage_transition(cur_stage, runs_before + 1, old_hist, snap)
    new_stage = int(maturity["recommended_stage"])
    runs_after = 1 if new_stage != cur_stage else runs_before + 1

    new_hist = old_hist + [
        {
            "at": utc_now_iso(),
            "acceptance_pass": metrics["acceptance_pass"],
            "regression": metrics["regression_now"],
            "rollback_signal": metrics["rollback_signal"],
            "runtime_ok": metrics["runtime_ok"],
            "blocker_ready_ratio": metrics["blocker_ready_ratio"],
        }
    ]
    new_hist = new_hist[-30:]

    st["stage"] = new_stage
    st["runs_since_stage_change"] = runs_after
    st["history"] = new_hist
    st["updatedAt"] = utc_now_iso()
    state_path.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    outcome = _score_cycle(metrics, metrics["regression_now"])
    outcome["snapshot_metrics"] = {k: metrics[k] for k in ("acceptance_pass", "regression_now", "rollback_signal", "runtime_ok", "blocker_ready_ratio")}

    score_path = auto / "cycle_outcome_score.json"
    score_path.write_text(json.dumps(outcome, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    maturity_path = auto / "maturity_stage_result.json"
    maturity_path.write_text(json.dumps(maturity, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rpd = STAGE_RUNS_PER_DAY.get(new_stage, 1)
    freq = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "stage": new_stage,
        "label": STAGE_LABELS.get(new_stage, "?"),
        "runs_per_day": rpd,
        "interval_hours_approx": round(24 / rpd, 4) if rpd else None,
        "cron_suggestions_utc": cron_suggestions_for_stage(new_stage),
        "policy": "proposal_only_no_systemd_change",
        "fail_next_note": "実 cron / systemd タイマーは別カードで適用",
        "maturity_stage_result_path": str(maturity_path),
        "state_path": str(state_path),
    }
    freq_path = auto / "recommended_frequency.json"
    freq_path.write_text(json.dumps(freq, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    (auto / VPS_MARKER).write_text(f"{VPS_MARKER}\n{utc_now_iso()}\nstage={new_stage}\n", encoding="utf-8")

    return {
        "ok": True,
        "stage": new_stage,
        "paths": {
            "state": str(state_path),
            "maturity_stage_result": str(maturity_path),
            "recommended_frequency": str(freq_path),
            "cycle_outcome_score": str(score_path),
            "vps_marker": str(auto / VPS_MARKER),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="scheduled_evolution_governor_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = run_governor()
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(body, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
