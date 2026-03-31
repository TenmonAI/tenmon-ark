#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FULL_AUTONOMY_CURSOR_OPERATOR_GATED_RELEASE_CURSOR_AUTO_V1

Notion intake → queue → supervisor → writeback → low-risk Cursor までを
段階的に解放するための guarded release 評価（fail-closed）。

- 実際の親ループ実行は real_3h / real_8h / supervisor / writeback / cursor bridge に委譲。
- 本モジュールは各レポート・真実源 JSON を読み、stage 可否と full auto 条件を明文化する。
- high-risk カードは cursor_operator allowlist 外のため自動経路に乗らない（cursor_executor_bridge_v1 契約）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import real_3h_autobuild_parent_guarded_loop_v1 as p3

import cursor_executor_bridge_v1 as op_bridge

CARD = "TENMON_FULL_AUTONOMY_CURSOR_OPERATOR_GATED_RELEASE_CURSOR_AUTO_V1"
REPORT_FN = "full_autonomy_cursor_operator_gated_release_report_v1.json"
REPORT_3H = "real_3h_autobuild_parent_guarded_loop_report_v1.json"
REPORT_8H = "real_8h_autobuild_parent_guarded_loop_report_v1.json"
WRITEBACK_RESULT_FN = "notion_autobuild_last_writeback_result_v1.json"
LAST_JUDGE_FN = "multi_ai_autonomy_last_judgement.json"
QUEUE_FN = "multi_ai_autonomy_queue.json"
STOP_FN = "multi_ai_autonomy_stop_conditions_v1.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _eight_hour_pass_equivalent(rep: dict[str, Any]) -> bool:
    if not rep:
        return False
    rv = rep.get("retest_verdict") if isinstance(rep.get("retest_verdict"), dict) else {}
    ch = rv.get("checks") if isinstance(rv.get("checks"), dict) else {}
    if not ch or not all(bool(v) for v in ch.values()):
        return False
    if str(rep.get("stopped_by") or "") != "max_seconds":
        return False
    return int(rep.get("scheduled_max_seconds") or 0) >= 28800


def _three_hour_pass_equivalent(rep: dict[str, Any]) -> bool:
    if not rep:
        return False
    rv = rep.get("retest_verdict") if isinstance(rep.get("retest_verdict"), dict) else {}
    return rv.get("three_hour_pass_equivalent") is True


def _writeback_pass(d: dict[str, Any]) -> tuple[bool, str]:
    if not d:
        return False, "writeback_result_missing"
    if d.get("ok") is not True:
        return False, "writeback_ok_not_true"
    if str(d.get("verdict") or "").upper() != "PASS":
        return False, f"writeback_verdict_not_pass:{d.get('verdict')!r}"
    return True, "writeback_pass"


def _same_card_and_audit_dirty_from_report(
    rep: dict[str, Any],
    *,
    auto_dir: Path,
) -> tuple[bool, bool, bool, str, str, str]:
    """returns same_card_ok, audit_ok_signal, dirty_stable, stopped_by, dirty_reason, audit_detail"""
    stopped_by = str(rep.get("stopped_by") or "")
    rv = rep.get("retest_verdict") if isinstance(rep.get("retest_verdict"), dict) else {}
    checks = rv.get("checks") if isinstance(rv.get("checks"), dict) else {}
    same_ok = bool(checks.get("no_same_card_infinite_loop")) and stopped_by != "same_card_streak"

    fs = rep.get("final_frontier_state") if isinstance(rep.get("final_frontier_state"), dict) else {}
    audit_skipped = bool(fs.get("audit_skipped"))
    au = fs.get("audit_ok")
    audit_signal = bool(audit_skipped) or au is True
    audit_detail = "skipped" if audit_skipped else ("ok" if au is True else f"audit_ok={au!r}")

    dirty_n = int(fs.get("dirty_files_count") or -1)
    thr = p3._load_dirty_threshold(auto_dir, None)
    dirty_stable = stopped_by != "dirty_threshold" and dirty_n >= 0 and dirty_n < thr
    dirty_reason = "ok" if dirty_stable else (
        "stopped_by_dirty_threshold" if stopped_by == "dirty_threshold" else f"dirty_{dirty_n}_vs_thr_{thr}"
    )
    return same_ok, audit_signal, dirty_stable, stopped_by, dirty_reason, audit_detail


def evaluate_gated_release(auto_dir: Path) -> dict[str, Any]:
    repo_root = auto_dir.parents[1]
    r3 = _read_json(auto_dir / REPORT_3H)
    r8 = _read_json(auto_dir / REPORT_8H)
    wb = _read_json(auto_dir / WRITEBACK_RESULT_FN)
    judge = _read_json(auto_dir / LAST_JUDGE_FN)

    thr3 = _three_hour_pass_equivalent(r3)
    thr8 = _eight_hour_pass_equivalent(r8)
    wb_ok, wb_why = _writeback_pass(wb)
    jv = str(judge.get("verdict") or "").upper()
    vps_pass, vps_why = op_bridge.truth_vps_acceptance_pass_for_cursor(auto_dir)

    # Prefer 8h レポートの frontier があれば参照（無ければ 3h）
    s8 = str(r8.get("schema") or "")
    ref = r8 if ("8H" in s8.upper() and r8.get("retest_verdict")) else r3
    same_ok, audit_sig, dirty_stab, st_by, dirty_why, audit_det = _same_card_and_audit_dirty_from_report(
        ref if ref else {},
        auto_dir=auto_dir,
    )
    if not ref:
        same_ok, audit_sig, dirty_stab = False, False, False
        dirty_why, audit_det, st_by = "no_report_ref", "no_report_ref", ""

    release_checks = {
        "three_hour_pass_equivalent": thr3,
        "eight_hour_pass_equivalent": thr8,
        "writeback_pass": wb_ok,
        "writeback_reason": wb_why,
        "same_card_loop_clear": same_ok,
        "audit_stable": audit_sig,
        "audit_detail": audit_det,
        "dirty_threshold_stable": dirty_stab,
        "dirty_detail": dirty_why,
        "last_parent_stopped_by": st_by,
        "vps_last_judgement_pass": vps_pass,
        "vps_last_judgement_reason": vps_why,
    }

    prereq_stage1 = (auto_dir / STOP_FN).is_file() and (auto_dir / QUEUE_FN).is_file()
    stage_1 = {
        "id": 1,
        "name": "observe_queue_supervisor",
        "summary": "Notion intake（空キュー時）→ queue 反映 → supervisor 1 周（親ループは real_3h / 手動サイクル）",
        "allowed": prereq_stage1,
        "notes": "stop_conditions と queue 契約 JSON が揃っているときのみ段階 1 を許可（fail-closed）。",
    }
    stage_2 = {
        "id": 2,
        "name": "writeback",
        "summary": "notion_autobuild_writeback_v1 による Task Queue row 更新",
        "allowed": thr3 and same_ok and audit_sig and dirty_stab,
        "requires": ["three_hour_pass_equivalent", "same_card_loop_clear", "audit_stable", "dirty_threshold_stable"],
    }
    stage_3 = {
        "id": 3,
        "name": "low_risk_cursor_execution",
        "summary": "cursor_executor_bridge_v1（allowlist + VPS PASS + blocklist）",
        "allowed": bool(stage_2["allowed"]) and wb_ok and vps_pass,
        "requires": list(stage_2["requires"])
        + ["writeback_pass", "multi_ai_autonomy_last_judgement_PASS", "cursor_operator_gate"],
    }
    stage_4 = {
        "id": 4,
        "name": "longer_run",
        "summary": "8 時間親ループ（real_8h）および段階的 max_seconds 拡張",
        "allowed": bool(stage_3["allowed"]) and thr8,
        "requires": list(stage_3["requires"]) + ["eight_hour_pass_equivalent"],
    }

    full_auto = bool(stage_4["allowed"]) and thr8 and thr3 and wb_ok and same_ok and audit_sig and dirty_stab and vps_pass

    truth_paths = [
        REPORT_3H,
        REPORT_8H,
        WRITEBACK_RESULT_FN,
        LAST_JUDGE_FN,
        STOP_FN,
        op_bridge.RESULT_RETURN_CONTRACT_FN,
        "cursor_executor_bridge_v1.py",
    ]

    return {
        "schema": "TENMON_FULL_AUTONOMY_CURSOR_OPERATOR_GATED_RELEASE_REPORT_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "auto_dir": str(auto_dir.resolve()),
        "repo_root": str(repo_root.resolve()),
        "high_risk_policy": {
            "note": "high-risk / central / scripture / persona / intention 系は cursor_operator blocklist。カード id allowlist 外は bridge が送信しない。",
            "operator_bind_card": op_bridge.OPERATOR_BIND_CARD,
        },
        "release_checks": release_checks,
        "stages": [stage_1, stage_2, stage_3, stage_4],
        "full_auto_eligible": full_auto,
        "full_auto_requires_all_of": [
            "three_hour_pass_equivalent",
            "eight_hour_pass_equivalent",
            "writeback_pass",
            "same_card_loop_clear",
            "audit_stable",
            "dirty_threshold_stable",
            "vps_last_judgement_pass",
        ],
        "truth_source_paths": truth_paths,
        "recommended_commands": {
            "parent_3h": f"python3 {auto_dir / 'real_3h_autobuild_parent_guarded_loop_v1.py'} --auto-dir {auto_dir}",
            "parent_8h": f"python3 {auto_dir / 'real_8h_autobuild_parent_guarded_loop_v1.py'} --auto-dir {auto_dir}",
            "writeback": f"python3 {auto_dir / 'notion_autobuild_writeback_v1.py'} --auto-dir {auto_dir}",
            "cursor_bridge_dry": f"python3 {auto_dir / 'cursor_executor_bridge_v1.py'} --auto-dir {auto_dir} --dry-run",
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="", help="既定: 本ファイルと同じ api/automation")
    ap.add_argument(
        "--strict-exit",
        action="store_true",
        help="full_auto_eligible が false のとき exit 2（既定はレポート出力後 0）",
    )
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO
    out = evaluate_gated_release(auto_dir)
    _write_json(auto_dir / REPORT_FN, out)
    print(json.dumps({"ok": True, "full_auto_eligible": out["full_auto_eligible"], "card": CARD}, ensure_ascii=False))
    if args.strict_exit and not out.get("full_auto_eligible"):
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
