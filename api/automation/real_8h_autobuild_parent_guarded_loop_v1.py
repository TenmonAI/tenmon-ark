#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REAL_8H_AUTOBUILD_PARENT_GUARDED_LOOP_CURSOR_AUTO_V1

3 時間版 guarded parent loop と同一の停止条件で最大 8 時間運転する薄い wrapper。
停止条件は緩めない（same-card streak / notion hold / audit / dirty / empty queue 等）。

前提（本番）: real_3h_autobuild_parent_guarded_loop_report_v1.json の
retest_verdict.three_hour_pass_equivalent が True のあとにのみ使用すること。
本番では --enforce-3h-prerequisite で起動時に検証可能（fail-closed）。

8時間 report（real_8h_autobuild_parent_guarded_loop_report_v1.json）に最低限含まれる:
total_cycles, distinct_cards_seen, queue_refill_count, supervisor_pass_count,
stopped_by, final_queue_len, final_autonomy_status, final_notion_hold_reason
（ほか final_frontier_state / retest_verdict / report_summary は 3h 実装と同型）。
stopped_by の意味は stopped_by_catalog を参照（3h 版と同一の guarded 停止条件）。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import real_3h_autobuild_parent_guarded_loop_v1 as p3

CARD = "TENMON_REAL_8H_AUTOBUILD_PARENT_GUARDED_LOOP_CURSOR_AUTO_V1"
REPORT_FN = "real_8h_autobuild_parent_guarded_loop_report_v1.json"
THREE_H_REPORT_FN = "real_3h_autobuild_parent_guarded_loop_report_v1.json"
PREREQUISITE_NOTE = (
    "前提: api/automation/real_3h_autobuild_parent_guarded_loop_report_v1.json の "
    "retest_verdict.three_hour_pass_equivalent が True のあとにのみ本スクリプトを本番運用すること。"
)

EIGHT_H_OFFICIAL_TIER = ({"id": "8h_extended", "max_seconds": 28800, "label": "8時間長時間"},)

# 3h 親ループと同一の stopped_by 値（緩めない）。report に載せて運用で参照する。
STOPPED_BY_CATALOG: dict[str, str] = {
    "max_seconds": "計画した --max-seconds に達し、時間切れで正常終了",
    "notion_hold": "Notion hold_reason 非空、または last_cycle_verdict が PASS 以外",
    "notion_watch_exception": "Notion watch 子プロセスがタイムアウトまたは例外",
    "supervisor_timeout": "supervisor 子プロセスがタイムアウト",
    "supervisor_exception": "supervisor 子プロセスが例外",
    "supervisor_nonzero_exit": "supervisor の終了コードが非ゼロ",
    "autonomy_fail": "multi_ai autonomy status が FAIL",
    "audit_abnormal": "audit が skipped 以外で ok でない",
    "dirty_threshold": "dirty_files_count が閾値以上",
    "empty_queue_streak": "空キューが連続し過ぎ（empty_queue_streak_max）",
    "same_card_streak": "前進なしの同一カード連続が閾値（same_card_streak_max）",
}


def _three_hour_prerequisite_ok(auto_dir: Path) -> tuple[bool, str]:
    p = auto_dir / THREE_H_REPORT_FN
    if not p.is_file():
        return False, "three_hour_report_missing"
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return False, f"three_hour_report_invalid:{e}"
    if not isinstance(raw, dict):
        return False, "three_hour_report_not_object"
    rv = raw.get("retest_verdict")
    if not isinstance(rv, dict):
        return False, "three_hour_retest_verdict_missing"
    if rv.get("three_hour_pass_equivalent") is True:
        return True, "ok"
    return False, "three_hour_pass_equivalent_not_true"


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD, epilog=PREREQUISITE_NOTE)
    p3.add_parent_loop_args(ap, 28800)
    ap.add_argument(
        "--enforce-3h-prerequisite",
        action="store_true",
        help="3h report の three_hour_pass_equivalent が True でなければ起動しない（本番推奨・CI は省略可）",
    )
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO

    if bool(getattr(args, "enforce_3h_prerequisite", False)):
        ok, why = _three_hour_prerequisite_ok(auto_dir)
        if not ok:
            print(json.dumps({"ok": False, "message": why, "card": CARD}, ensure_ascii=False))
            sys.exit(2)

    sys.exit(
        p3.run_guarded_parent_loop(
            args,
            card=CARD,
            report_schema="TENMON_REAL_8H_AUTOBUILD_PARENT_GUARDED_LOOP_REPORT_V1",
            report_path=auto_dir / REPORT_FN,
            prerequisite_note=PREREQUISITE_NOTE,
            extra_official_tiers=EIGHT_H_OFFICIAL_TIER,
            report_output_basename=REPORT_FN,
            extra_report_fields={
                "stopped_by_catalog": STOPPED_BY_CATALOG,
                "three_hour_prerequisite": {
                    "required_for_production": True,
                    "report_path": f"api/automation/{THREE_H_REPORT_FN}",
                    "field": "retest_verdict.three_hour_pass_equivalent",
                    "enforce_flag": "--enforce-3h-prerequisite",
                },
            },
        )
    )


if __name__ == "__main__":
    main()
