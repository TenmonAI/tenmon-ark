#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_product_patch_planner_min_diff_summary.json"
OUT_REPORT = "tenmon_product_patch_planner_min_diff_report.md"
QUEUE_FN = "product_patch_plan_queue.json"
SCHEMA_FN = "product_patch_plan_schema_v1.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def blocker_to_plan(blocker: str, run_id: str) -> dict[str, Any]:
    b = str(blocker or "").strip()
    bl = b.lower()

    # Default: safe-scope planner (automation/docs) only.
    plan = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "source_blocker": b or "unknown_blocker",
        "cause_candidate": "最新判定ソースの不整合または stale 参照が原因で product failure が継続している可能性。",
        "target_files": [
            "api/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py"
        ],
        "minimal_diff_unit": "rejudge blocker 判定の単一条件分岐を1箇所だけ修正する",
        "acceptance_probe": {
            "type": "json_and_http",
            "commands": [
                "python3 api/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py --repo-root /opt/tenmon-ark-repo --base http://127.0.0.1:3000",
                "python3 - <<'PY'\nimport json\np='api/automation/tenmon_latest_state_rejudge_summary.json'\njs=json.load(open(p,encoding='utf-8'))\nprint({'remaining_blockers':js.get('remaining_blockers',[])})\nPY"
            ],
            "pass_condition": "target blocker が remaining_blockers から減少し、/api/health|audit|audit.build が維持される"
        },
        "rollback_point": {
            "type": "git",
            "instruction": "対象1ファイルのみを変更前内容へ戻す（git diff 単位で巻き戻し）"
        },
        "risk_level": "medium",
        "apply_allowed": False
    }

    if "product_failure" in bl:
        plan["cause_candidate"] = "product failure 判定が broad 条件で固定化し、実際の収束済み項目まで fail 扱いしている可能性。"
        plan["target_files"] = [
            "api/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py"
        ]
        plan["minimal_diff_unit"] = "product_failure 判定条件を1分岐だけ絞り込み、stale/truth exclusion を反映"
        plan["risk_level"] = "safe"
    elif "stale_sources" in bl:
        plan["cause_candidate"] = "truth exclusion 済みソースが stale 判定へ再混入している可能性。"
        plan["target_files"] = [
            "api/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py",
            "api/automation/tenmon_stale_evidence_invalidation_v1.py"
        ]
        plan["minimal_diff_unit"] = "truth excluded source の stale 判定除外を1条件追加（2ファイル以内）"
        plan["risk_level"] = "safe"
    elif "runtime" in bl or "health" in bl or "audit" in bl:
        plan["cause_candidate"] = "runtime gate の事前確認順序または timeout が現状環境に未適合。"
        plan["target_files"] = [
            "api/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
        ]
        plan["minimal_diff_unit"] = "gate probe の timeout/順序を1箇所調整"
        plan["risk_level"] = "safe"

    # Non-negotiable guard: one plan == one change group
    plan["change_group_id"] = f"chg-{run_id}-{abs(hash(b)) % 100000}"
    return plan


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    run_id = f"patchplan_{int(time.time())}_{os.getpid()}"

    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    system = read_json(auto / "tenmon_system_verdict.json")
    schema = read_json(auto / SCHEMA_FN)

    blockers = [str(x) for x in (rejudge.get("remaining_blockers") or []) if str(x).strip()]
    if not blockers and system:
        if bool(system.get("pass")) is False:
            blockers = ["product_failure_detected"]

    plans = [blocker_to_plan(b, run_id) for b in blockers]

    # validate minimal required fields by schema
    req = [str(x) for x in schema.get("required_top_level") or []]
    valid_count = 0
    for p in plans:
        if all(k in p for k in req):
            valid_count += 1

    queue = {
        "schema": "tenmon.product_patch_plan.queue.v1",
        "version": 1,
        "generated_at": utc(),
        "run_id": run_id,
        "planner_card": CARD,
        "patch_planner_pass": bool(plans) and valid_count == len(plans),
        "plans": plans
    }
    write_json(auto / QUEUE_FN, queue)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "input_sources": {
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "system_verdict": str(auto / "tenmon_system_verdict.json"),
            "schema": str(auto / SCHEMA_FN)
        },
        "blockers": blockers,
        "plans_generated": len(plans),
        "plans_schema_valid_count": valid_count,
        "non_negotiables": {
            "one_plan_one_change_group": True,
            "multi_file_large_refactor_forbidden": True,
            "cause_uncertain_patch_forbidden": True,
            "probe_required": True,
            "rollback_required": True,
            "unsafe_direct_apply_forbidden": True
        },
        "unsafe_patch_apply_attempted": False,
        "patch_planner_pass": bool(queue.get("patch_planner_pass")),
        "next_on_pass": "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_RETRY_CURSOR_AUTO_V1"
    }
    write_json(auto / OUT_SUMMARY, summary)

    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- run_id: `{run_id}`",
        f"- blockers: `{blockers}`",
        f"- plans_generated: `{len(plans)}`",
        f"- patch_planner_pass: `{summary['patch_planner_pass']}`",
        "",
        "## Plan Queue Checks",
        f"- target/minimal_diff/probe/rollback complete: `{valid_count == len(plans) and len(plans) > 0}`",
        "- unsafe patch direct apply: `false`",
        "",
        f"- NEXT_ON_PASS: `{summary['next_on_pass']}`",
        f"- NEXT_ON_FAIL: `{summary['next_on_fail']}`"
    ]
    (auto / OUT_REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["patch_planner_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

