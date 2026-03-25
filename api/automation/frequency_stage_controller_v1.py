#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
maturity_stage_result.json — 成熟度ステージ 1〜5 と昇格/降格の決定論ロジック（PARENT_07）。
cron/systemd は触らない。メトリクスは governor がファイルから供給。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_07_FREQUENCY_STAGE_CONTROLLER_CURSOR_AUTO_V1"

# stage -> 1 日あたり実行回数目標（stage5 = 1 時間に 1 回）
STAGE_RUNS_PER_DAY: Dict[int, int] = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 24,
}

STAGE_LABELS = {
    1: "1/day",
    2: "2/day",
    3: "3/day",
    4: "4/day",
    5: "24/day (~1/hour)",
}


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def cron_suggestions_for_stage(stage: int) -> List[str]:
    """提案のみ（別カードで実装）。UTC 基準の例。"""
    s = max(1, min(5, stage))
    if s == 1:
        return ["0 3 * * *"]
    if s == 2:
        return ["0 2,14 * * *"]
    if s == 3:
        return ["0 2,10,18 * * *"]
    if s == 4:
        return ["0 1,7,13,19 * * *"]
    return ["0 * * * *"]


def window_history(history: List[Dict[str, Any]], max_n: int = 10) -> List[Dict[str, Any]]:
    h = [x for x in history if isinstance(x, dict)]
    return h[-max_n:] if len(h) > max_n else h


def aggregate_rates(hist: List[Dict[str, Any]]) -> Dict[str, float]:
    if not hist:
        return {
            "acceptance_pass_rate": 0.5,
            "regression_rate": 0.0,
            "rollback_signal_rate": 0.0,
            "runtime_stability": 0.5,
            "blocker_closure_proxy": 0.5,
            "samples": 0,
        }
    n = len(hist)
    ap = sum(1 for x in hist if x.get("acceptance_pass")) / n
    reg = sum(1 for x in hist if x.get("regression")) / n
    rb = sum(1 for x in hist if x.get("rollback_signal")) / n
    rt = sum(1 for x in hist if x.get("runtime_ok")) / n
    br = sum(float(x.get("blocker_ready_ratio") or 0) for x in hist) / n
    return {
        "acceptance_pass_rate": ap,
        "regression_rate": reg,
        "rollback_signal_rate": rb,
        "runtime_stability": rt,
        "blocker_closure_proxy": br,
        "samples": n,
    }


def decide_stage_transition(
    current_stage: int,
    runs_since_stage_change: int,
    history: List[Dict[str, Any]],
    current_snapshot: Dict[str, Any],
) -> Dict[str, Any]:
    """
    current_snapshot: 直近サイクルの真偽（危険検知に使用）
    """
    stage = max(1, min(5, int(current_stage)))
    hist = window_history(history, 10)
    rates = aggregate_rates(hist)
    reasons: List[str] = []
    min_runs = {1: 5, 2: 5, 3: 5, 4: 7, 5: 9999}

    # --- 危険時は即降格（最低 stage1）
    danger_down = False
    if current_snapshot.get("regression_now"):
        danger_down = True
        reasons.append("safety: regression_detected (current cycle)")
    if current_snapshot.get("acceptance_pass") is False and current_snapshot.get("critical_fail"):
        danger_down = True
        reasons.append("safety: acceptance fail + critical fail signal")
    if current_snapshot.get("consecutive_failures", 0) >= 2:
        danger_down = True
        reasons.append("safety: consecutive_failures>=2")

    new_stage = stage
    action = "hold"

    if danger_down:
        new_stage = max(1, stage - 1)
        action = "downgrade" if new_stage < stage else "hold"
        if new_stage < stage:
            reasons.append(f"stage {stage} -> {new_stage}")
    else:
        # 昇格条件（全て満たす + ステージ滞留回数）
        need = min_runs.get(stage, 5)
        if (
            stage < 5
            and runs_since_stage_change >= need
            and rates["samples"] >= 5
            and rates["acceptance_pass_rate"] >= 0.85
            and rates["regression_rate"] == 0.0
            and rates["rollback_signal_rate"] <= 0.2
            and rates["runtime_stability"] >= 0.9
            and rates["blocker_closure_proxy"] >= 0.03
        ):
            new_stage = stage + 1
            action = "upgrade"
            reasons.append(
                "maturity: pass>=0.85, no regression window, rollback<=0.2, runtime>=0.9, blocker_proxy ok"
            )
        elif rates["regression_rate"] > 0.15 or rates["acceptance_pass_rate"] < 0.6:
            new_stage = max(1, stage - 1)
            if new_stage < stage:
                action = "downgrade"
                reasons.append("soft: poor window rates (regression or pass rate)")

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "previous_stage": stage,
        "recommended_stage": new_stage,
        "action": action,
        "runs_since_stage_change": runs_since_stage_change,
        "rates_window": rates,
        "reasons": reasons or ["no change"],
        "thresholds_reference": {
            "upgrade_pass_rate_min": 0.85,
            "upgrade_regression_max": 0.0,
            "upgrade_rollback_signal_max": 0.2,
            "upgrade_runtime_min": 0.9,
            "upgrade_blocker_ready_ratio_min": 0.03,
            "min_runs_before_upgrade_by_stage": min_runs,
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="frequency_stage_controller_v1 (standalone dry-run)")
    ap.add_argument("--state", type=str, default="", help="scheduled_evolution_state.json path")
    ap.add_argument("--snapshot", type=str, default="", help="optional JSON file for current_snapshot")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    auto = Path(__file__).resolve().parent
    state_path = Path(args.state) if args.state else auto / "scheduled_evolution_state.json"
    st = {}
    if state_path.is_file():
        try:
            st = json.loads(state_path.read_text(encoding="utf-8", errors="replace"))
        except Exception:
            st = {}
    stage = int(st.get("stage") or 1)
    runs = int(st.get("runs_since_stage_change") or 0)
    hist = list(st.get("history") or [])
    snap: Dict[str, Any] = {}
    if args.snapshot and Path(args.snapshot).is_file():
        try:
            snap = json.loads(Path(args.snapshot).read_text(encoding="utf-8", errors="replace"))
        except Exception:
            snap = {}
    body = decide_stage_transition(stage, runs, hist, snap)
    out = Path(args.out) if args.out else auto / "maturity_stage_result.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"ok": True, "path": str(out), "action": body["action"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
