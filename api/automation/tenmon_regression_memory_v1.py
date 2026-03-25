#!/usr/bin/env python3
"""
TENMON_SELF_AUDIT_OS_REGRESSION_MEMORY_CURSOR_AUTO_V1
tenmon_system_verdict.json を前回 snapshot と比較し、悪化検知・continue 判定を出す。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_AUDIT_OS_REGRESSION_MEMORY_CURSOR_AUTO_V1"
AUTO = Path(__file__).resolve().parent


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


BAND_SCORE: dict[str, int] = {
    "green": 4,
    "yellow": 3,
    "red_env": 2,
    "red": 1,
    "unknown": 0,
    "": 0,
}


def compact_subsystem(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "accepted_complete": bool(s.get("accepted_complete")),
        "runtime_proven": bool(s.get("runtime_proven")),
        "code_present": bool(s.get("code_present")),
        "band": str(s.get("band") or ""),
        "blocker_count": len(s.get("primary_blockers") or []),
    }


def _rank(x: dict[str, Any]) -> tuple[int, int, int, int, int]:
    b = str(x.get("band") or "")
    return (
        1 if x.get("accepted_complete") else 0,
        1 if x.get("runtime_proven") else 0,
        1 if x.get("code_present") else 0,
        BAND_SCORE.get(b, 0),
        -int(x.get("blocker_count") or 0),
    )


def compare_subsystem(
    prev: dict[str, Any] | None,
    cur: dict[str, Any],
) -> str:
    """improved | stable | regressed"""
    if prev is None:
        return "stable"
    rp, rc = _rank(prev), _rank(cur)
    if rc > rp:
        return "improved"
    if rc < rp:
        return "regressed"
    return "stable"


def pick_baseline(memory: dict[str, Any]) -> tuple[dict[str, Any] | None, str]:
    """PASS 済み snapshot を優先、無ければ直近 run。"""
    lp = memory.get("last_pass_snapshot")
    if isinstance(lp, dict) and lp.get("subsystems"):
        return lp, "last_pass"
    ls = memory.get("last_snapshot")
    if isinstance(ls, dict) and ls.get("subsystems"):
        return ls, "last_run"
    return None, "none"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--repo-root",
        type=str,
        default=str(AUTO.parent.parent),
        help="repo root",
    )
    ap.add_argument(
        "--soft-exit-ok",
        action="store_true",
        help="regression でも exit 0",
    )
    args = ap.parse_args()
    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    verdict_path = auto / "tenmon_system_verdict.json"
    memory_path = auto / "tenmon_regression_memory.json"
    report_path = auto / "regression_report.json"

    verdict = read_json(verdict_path)
    if not verdict.get("subsystems"):
        print(
            json.dumps({"ok": False, "error": "missing_or_empty_tenmon_system_verdict.json"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2

    subs = verdict.get("subsystems")
    assert isinstance(subs, dict)
    current_compact = {k: compact_subsystem(v) for k, v in subs.items() if isinstance(v, dict)}

    memory = read_json(memory_path)
    baseline, baseline_source = pick_baseline(memory)
    baseline_subs = baseline.get("subsystems") if isinstance(baseline, dict) else None
    if isinstance(baseline_subs, dict):
        baseline_compact = {k: v for k, v in baseline_subs.items() if isinstance(v, dict)}
    else:
        baseline_compact = {}

    per_system: dict[str, dict[str, Any]] = {}
    regressed_systems: list[str] = []
    improved_systems: list[str] = []

    for name, cur in current_compact.items():
        prev = baseline_compact.get(name) if baseline_compact else None
        st = compare_subsystem(prev, cur)
        per_system[name] = {
            "state": st,
            "previous": prev,
            "current": cur,
        }
        if st == "regressed":
            regressed_systems.append(name)
        elif st == "improved":
            improved_systems.append(name)

    regression_detected = len(regressed_systems) > 0
    # 初回（baseline なし）は観測のみで continue 維持
    first_run = baseline is None
    continue_ok = not regression_detected or first_run

    recommended_stop = None
    if regression_detected and not first_run:
        recommended_stop = "TENMON_SELF_AUDIT_OS_REGRESSION_MEMORY_STOP_CURSOR_AUTO_V1"

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "baseline_source": baseline_source,
        "baseline_generated_at": (baseline or {}).get("generated_at") if isinstance(baseline, dict) else None,
        "current_verdict_generated_at": verdict.get("generated_at"),
        "subsystem_comparison": per_system,
        "improved_systems": improved_systems,
        "regressed_systems": regressed_systems,
        "regression_detected": regression_detected,
        "continue": continue_ok,
        "recommended_stop_card": recommended_stop,
        "notes": [
            "baseline は last_pass_snapshot を優先し、無ければ last_snapshot。初回は baseline なし。",
            "memory 本体は verdict から分離し、本ファイルに snapshot を蓄積する。",
        ],
    }

    # 次回比較用 snapshot（verdict 由来の compact のみ保持）
    new_snapshot = {
        "generated_at": out["generated_at"],
        "source_card": verdict.get("card"),
        "pass": verdict.get("pass"),
        "overall_band": verdict.get("overall_band"),
        "subsystems": {k: v for k, v in current_compact.items()},
    }

    history = memory.get("history")
    if not isinstance(history, list):
        history = []
    history.append(
        {
            "generated_at": out["generated_at"],
            "pass": verdict.get("pass"),
            "regression_detected": regression_detected,
            "regressed_systems": regressed_systems,
        }
    )
    history = history[-40:]

    memory_out: dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "updated_at": out["generated_at"],
        "last_run": out,
        "last_snapshot": new_snapshot,
        "last_pass_snapshot": memory.get("last_pass_snapshot"),
        "history": history,
    }
    if verdict.get("pass") is True:
        memory_out["last_pass_snapshot"] = new_snapshot

    memory_path.write_text(json.dumps(memory_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # regression_report.json を mirror（既存 vps 系フィールドは残しつつ system 節を追加）
    prev_report = read_json(report_path)
    report_mirror: dict[str, Any] = {
        **prev_report,
        "version": max(int(prev_report.get("version") or 1), 2),
        "card": CARD,
        "system_audit_regression": {
            "generated_at": out["generated_at"],
            "baseline_source": baseline_source,
            "regression_detected": regression_detected,
            "continue": continue_ok,
            "regressed_systems": regressed_systems,
            "improved_systems": improved_systems,
            "recommended_stop_card": recommended_stop,
            "memory_path": str(memory_path),
            "verdict_path": str(verdict_path),
        },
    }
    report_path.write_text(json.dumps(report_mirror, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    out["memory_path"] = str(memory_path)
    out["regression_report_path"] = str(report_path)

    print(json.dumps({"ok": True, "continue": continue_ok, "regression_detected": regression_detected}, ensure_ascii=False, indent=2))

    if args.soft_exit_ok:
        return 0
    if not continue_ok:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
