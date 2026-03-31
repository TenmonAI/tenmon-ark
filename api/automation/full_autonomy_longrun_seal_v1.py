#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FULL_AUTONOMY_LONGRUN_SEAL_CURSOR_AUTO_V1

guarded release（full_auto_eligible = guarded release PASS）後の長時間運転を seal 可否として集約判定する fail-closed レポート。
真実源は既存 JSON / 親ループ report / gated_release のみ。実行ループ本体は変更しない。

seal 必須観測（release_checks に同型）: 3h/8h 相当 PASS・writeback PASS・same-card なし・audit 安定・dirty 許容内・
VPS judgement PASS。加えて直近 Cursor low-risk PASS・親ループ stopped_by が正常終了系。
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

import cursor_executor_bridge_v1 as op_bridge
import full_autonomy_cursor_operator_gated_release_v1 as gated_mod
import multi_ai_autonomy_preflight_v1 as preflight_mod

CARD = "TENMON_FULL_AUTONOMY_LONGRUN_SEAL_CURSOR_AUTO_V1"
REPORT_FN = "full_autonomy_longrun_seal_report_v1.json"
REPORT_3H = "real_3h_autobuild_parent_guarded_loop_report_v1.json"
REPORT_8H = "real_8h_autobuild_parent_guarded_loop_report_v1.json"
WRITEBACK_FN = "notion_autobuild_last_writeback_result_v1.json"
CURSOR_LAST_FN = "cursor_executor_last_result.json"
GATED_REPORT_FN = "full_autonomy_cursor_operator_gated_release_report_v1.json"

_ACCEPTABLE_STOPPED_FOR_SEAL = frozenset({"max_seconds", ""})


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


def _ref_report(r8: dict[str, Any], r3: dict[str, Any]) -> dict[str, Any]:
    s8 = str(r8.get("schema") or "")
    if "8H" in s8.upper() and r8.get("retest_verdict"):
        return r8
    return r3


def _distinct_cards_union(r3: dict[str, Any], r8: dict[str, Any]) -> list[str]:
    s: set[str] = set()
    for r in (r3, r8):
        for x in r.get("distinct_cards_seen") or []:
            if isinstance(x, str) and x.strip():
                s.add(x.strip())
    return sorted(s)


def _deny_match_substrings(cid: str, deny: dict[str, Any]) -> list[str]:
    u = cid.upper()
    hit: list[str] = []
    for e in deny.get("exact_card_ids") or []:
        if str(e).strip() == cid:
            hit.append(f"deny_exact:{e}")
    for sub in deny.get("card_id_substrings") or []:
        ss = str(sub).strip()
        if ss and ss.upper() in u:
            hit.append(f"deny_substring:{sub}")
    return hit


def _remaining_manual_cards(auto_dir: Path) -> list[dict[str, Any]]:
    q = _read_json(auto_dir / "multi_ai_autonomy_queue.json")
    allow, deny = preflight_mod.load_allowlist_denylist(auto_dir)
    co = q.get("card_order") if isinstance(q.get("card_order"), list) else []
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for cid in co:
        if not isinstance(cid, str) or not cid.strip():
            continue
        c = cid.strip()
        seen.add(c)
        reasons: list[str] = []
        dm = _deny_match_substrings(c, deny)
        reasons.extend(dm)
        br = op_bridge.cursor_operator_text_blocked(c)
        if br:
            reasons.append(br)
        if not op_bridge.card_id_cursor_operator_allowlisted(c):
            reasons.append("not_cursor_operator_allowlist_low_risk_lane")
        ok_p, pw = preflight_mod.is_autonomy_card_permitted(c, allow, deny)
        if not ok_p:
            reasons.append(f"autonomy_preflight:{pw}")
        if reasons:
            out.append({"card_id": c, "source": "queue", "manual_reasons": sorted(set(reasons))})

    r3 = _read_json(auto_dir / REPORT_3H)
    r8 = _read_json(auto_dir / REPORT_8H)
    for c in _distinct_cards_union(r3, r8):
        if c in seen:
            continue
        reasons = []
        dm = _deny_match_substrings(c, deny)
        reasons.extend(dm)
        br = op_bridge.cursor_operator_text_blocked(c)
        if br:
            reasons.append(br)
        if not op_bridge.card_id_cursor_operator_allowlisted(c):
            reasons.append("not_cursor_operator_allowlist_low_risk_lane")
        ok_p, pw = preflight_mod.is_autonomy_card_permitted(c, allow, deny)
        if not ok_p:
            reasons.append(f"autonomy_preflight:{pw}")
        if reasons:
            out.append({"card_id": c, "source": "parent_loop_distinct_seen", "manual_reasons": sorted(set(reasons))})

    out.append(
        {
            "card_id": "(policy_scope)",
            "source": "denylist_rules",
            "manual_reasons": [
                "canon_scripture_persona_intention_semantic_change_paths_per_multi_ai_autonomy_denylist_v1",
            ],
            "reference": "multi_ai_autonomy_denylist_v1.json / rules",
        }
    )
    return out


def _cursor_low_risk_pass(auto_dir: Path) -> tuple[bool, str]:
    lr = _read_json(auto_dir / CURSOR_LAST_FN)
    if not lr:
        return False, "cursor_executor_last_result_missing"
    fv = str(lr.get("final_verdict") or lr.get("status") or "").upper()
    if fv == "PASS":
        return True, "cursor_bridge_final_pass"
    return False, f"cursor_bridge_not_pass:{fv or 'empty'}"


def evaluate_longrun_seal(auto_dir: Path) -> dict[str, Any]:
    repo_root = auto_dir.parents[1]
    gated = gated_mod.evaluate_gated_release(auto_dir)
    r3 = _read_json(auto_dir / REPORT_3H)
    r8 = _read_json(auto_dir / REPORT_8H)
    ref = _ref_report(r8, r3)
    wb = _read_json(auto_dir / WRITEBACK_FN)

    rc = gated.get("release_checks") if isinstance(gated.get("release_checks"), dict) else {}

    stopped_by = str(ref.get("stopped_by") or "")
    stopped_acceptable = stopped_by in _ACCEPTABLE_STOPPED_FOR_SEAL

    c_ok, c_why = _cursor_low_risk_pass(auto_dir)

    wb_pass = bool(rc.get("writeback_pass"))
    w_success = 1 if wb_pass else 0

    cursor_success_count = 1 if c_ok else 0

    s8 = str(r8.get("schema") or "")
    use_8h = "8H" in s8.upper() and r8.get("retest_verdict")
    longrun_sec = int((r8 if use_8h else r3).get("scheduled_max_seconds") or 0)
    longrun_hours = round(longrun_sec / 3600.0, 4) if longrun_sec else 0.0

    distinct_done = _distinct_cards_union(r3, r8)
    final_frontier = ref.get("final_frontier_state") if isinstance(ref.get("final_frontier_state"), dict) else {}

    full_auto = bool(gated.get("full_auto_eligible"))
    seal_checks = {
        "guarded_release_full_auto_eligible": full_auto,
        "three_hour_pass_equivalent": bool(rc.get("three_hour_pass_equivalent")),
        "eight_hour_pass_equivalent": bool(rc.get("eight_hour_pass_equivalent")),
        "writeback_pass": wb_pass,
        "writeback_patch_applied_observed": wb.get("patch_applied") is True,
        "same_card_loop_clear": bool(rc.get("same_card_loop_clear")),
        "audit_stable": bool(rc.get("audit_stable")),
        "dirty_threshold_stable": bool(rc.get("dirty_threshold_stable")),
        "vps_last_judgement_pass": bool(rc.get("vps_last_judgement_pass")),
        "low_risk_cursor_execution_pass": c_ok,
        "low_risk_cursor_detail": c_why,
        "stopped_by_acceptable_for_seal": stopped_acceptable,
        "stopped_by": stopped_by,
        "last_parent_stopped_by": str(rc.get("last_parent_stopped_by") or stopped_by),
    }

    sealed = full_auto and c_ok and stopped_acceptable

    overall = "SEALED" if sealed else "NOT_SEALED"

    remaining = _remaining_manual_cards(auto_dir)
    manual_queue = sum(1 for x in remaining if isinstance(x, dict) and x.get("source") == "queue")
    manual_distinct = sum(1 for x in remaining if isinstance(x, dict) and x.get("source") == "parent_loop_distinct_seen")

    fail_reasons = [k for k, v in seal_checks.items() if k.endswith("_pass") or k.endswith("_eligible") or k in ("stopped_by_acceptable_for_seal",) and not v]
    # 上の内訳が複雑になるので明示リストで fail_reasons を組む
    fr: list[str] = []
    if not full_auto:
        fr.append("guarded_release_full_auto_eligible_false")
    if not rc.get("three_hour_pass_equivalent"):
        fr.append("three_hour_not_pass_equivalent")
    if not rc.get("eight_hour_pass_equivalent"):
        fr.append("eight_hour_not_pass_equivalent")
    if not wb_pass:
        fr.append("writeback_not_pass")
    if not rc.get("same_card_loop_clear"):
        fr.append("same_card_loop_not_clear")
    if not rc.get("audit_stable"):
        fr.append("audit_not_stable")
    if not rc.get("dirty_threshold_stable"):
        fr.append("dirty_threshold_not_stable")
    if not rc.get("vps_last_judgement_pass"):
        fr.append("vps_last_judgement_not_pass")
    if not c_ok:
        fr.append(f"cursor_low_risk_not_pass:{c_why}")
    if not stopped_acceptable:
        fr.append(f"stopped_by_not_acceptable:{stopped_by}")

    truth_paths = [
        GATED_REPORT_FN,
        REPORT_3H,
        REPORT_8H,
        WRITEBACK_FN,
        CURSOR_LAST_FN,
        "multi_ai_autonomy_last_judgement.json",
        "multi_ai_autonomy_queue.json",
        "multi_ai_autonomy_denylist_v1.json",
    ]

    return {
        "schema": "TENMON_FULL_AUTONOMY_LONGRUN_SEAL_REPORT_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "auto_dir": str(auto_dir.resolve()),
        "repo_root": str(repo_root.resolve()),
        "overall_verdict": overall,
        "sealed": sealed,
        "longrun_hours": longrun_hours,
        "longrun_reference_report": "8h" if use_8h else "3h",
        "distinct_cards_completed": distinct_done,
        "distinct_cards_completed_count": len(distinct_done),
        "writeback_success_count": w_success,
        "cursor_low_risk_success_count": cursor_success_count,
        "final_frontier": final_frontier,
        "remaining_manual_cards": remaining,
        "remaining_manual_cards_summary": {
            "total_entries": len(remaining),
            "from_queue": manual_queue,
            "from_parent_loop_distinct_seen": manual_distinct,
            "policy_scope_rows": sum(
                1 for x in remaining if isinstance(x, dict) and x.get("source") == "denylist_rules"
            ),
        },
        "seal_checks": seal_checks,
        "seal_conditions_all_met": sealed,
        "pass_fail_readable": {
            "overall_verdict": overall,
            "sealed": sealed,
            "fail_reasons": fr,
            "one_line": "SEALED" if sealed else f"NOT_SEALED ({len(fr)} checks failed)",
        },
        "guarded_release_snapshot": {
            "full_auto_eligible": gated.get("full_auto_eligible"),
            "release_checks": rc,
        },
        "truth_source_paths": truth_paths,
        "notes": "seal は gated release（full_auto_eligible）の全 release_checks に加え、直近 Cursor bridge final_verdict=PASS かつ親ループ stopped_by が max_seconds または空のときのみ SEALED。high-risk / central 等は remaining_manual_cards を参照。",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="", help="既定: 本ファイルと同じ api/automation")
    ap.add_argument(
        "--strict-exit",
        action="store_true",
        help="overall_verdict != SEALED のとき exit 2",
    )
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO
    out = evaluate_longrun_seal(auto_dir)
    _write_json(auto_dir / REPORT_FN, out)
    print(json.dumps({"ok": True, "overall_verdict": out["overall_verdict"], "card": CARD}, ensure_ascii=False))
    if args.strict_exit and out.get("overall_verdict") != "SEALED":
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
