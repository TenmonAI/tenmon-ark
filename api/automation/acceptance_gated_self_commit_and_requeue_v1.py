#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1

build_probe の acceptance PASS 時のみ commit / 再投入候補を生成する。自動 git commit は行わない（候補のみ）。
FAIL 時は commit 候補も next queue 候補も作らない。
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。acceptance gated retry 1枚のみ生成。"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else None
    except Exception:
        return None


def _acceptance_passes(build_probe: dict[str, Any], patch_plan: dict[str, Any]) -> tuple[bool, str]:
    if patch_plan.get("ok") is not True:
        return False, "cursor_patch_plan_ok_not_true"
    if build_probe.get("overall_pass") is not True:
        return False, "build_probe_overall_pass_not_true"
    if build_probe.get("acceptance_pass") is not True:
        return False, "build_probe_acceptance_pass_not_true"
    if build_probe.get("rollback_executed") is True:
        return False, "rollback_executed_must_not_gate_pass"
    return True, ""


def strict_autoguard_steps_pass(build_probe: dict[str, Any]) -> tuple[bool, str]:
    """
    build / health / audit.build / probes の各 step.ok を要求（autoguard の steps 配列）。
    TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE 用。steps 欠落は fail-closed。
    """
    steps = build_probe.get("steps")
    if not isinstance(steps, list):
        return False, "strict_missing_steps_array"
    by_name: dict[str, dict[str, Any]] = {}
    for s in steps:
        if isinstance(s, dict) and s.get("name"):
            by_name[str(s["name"])] = s
    for nm in ("build", "health", "audit.build"):
        st = by_name.get(nm)
        if not st:
            return False, f"strict_missing_step:{nm}"
        if st.get("skipped") is True:
            continue
        if st.get("ok") is not True:
            return False, f"strict_step_not_ok:{nm}"
    pr = by_name.get("probes")
    if not pr:
        return False, "strict_missing_step:probes"
    if pr.get("ok") is not True:
        return False, "strict_step_not_ok:probes"
    return True, ""


def _commit_message_candidate(patch_plan: dict[str, Any]) -> str:
    files = patch_plan.get("target_files") or []
    fl = ", ".join(str(x) for x in files[:40]) if files else "(no files in plan)"
    risk = str(patch_plan.get("risk_class") or "unknown")
    scope = str(patch_plan.get("change_scope") or "")[:200]
    prob = str(patch_plan.get("problem") or "")[:160]
    return (
        f"acceptance: gated PASS | {CARD}\n\n"
        f"risk_class: {risk}\n"
        f"target_files: {fl}\n"
        f"change_scope: {scope}\n"
        f"problem_digest: {prob}\n"
    ).strip()


def _next_queue_item_candidate() -> dict[str, Any]:
    now = _utc()
    qid = secrets.token_hex(8)
    body = "\n".join(
        [
            f"OBJECTIVE: Continue autonomy chain after acceptance-gated seal ({CARD}).",
            "",
            f"NEXT_ON_PASS: {NEXT_ON_PASS}",
            "",
            "EDIT_SCOPE: follow overnight orchestrator card; minimal diff; no success fabrication.",
            "",
            f"SOURCE_RUN_AT: {now}",
        ]
    )
    return {
        "id": qid,
        "card_name": NEXT_ON_PASS,
        "card_body_md": body,
        "source": CARD,
        "submitted_at": now,
        "state": "ready",
        "risk_tier": "low",
        "dry_run_only": False,
        "fixture": False,
        "reject_reasons": [],
        "matched_rules": [],
        "approved_at": None,
        "leased_until": None,
        "completed_at": None,
        "objective": f"Enqueue {NEXT_ON_PASS} after acceptance PASS (candidate only).",
        "enqueue_reason": "acceptance_gated_pass",
    }


def build_summary_v1(
    *,
    build_probe: dict[str, Any] | None,
    patch_plan: dict[str, Any] | None,
    queue_snapshot: dict[str, Any] | None,
    queue_path: str,
) -> dict[str, Any]:
    bp = build_probe or {}
    pp = patch_plan or {}

    if build_probe is None and patch_plan is None:
        miss = "missing_build_probe_and_patch_plan"
    elif build_probe is None:
        miss = "missing_build_probe_result"
    elif patch_plan is None:
        miss = "missing_cursor_patch_plan"
    else:
        miss = ""

    ok_inputs = miss == ""
    gate_ok, gate_reason = (False, miss or "missing_input_json")
    if ok_inputs:
        gate_ok, gate_reason = _acceptance_passes(bp, pp)

    q_items = 0
    if queue_snapshot and isinstance(queue_snapshot.get("items"), list):
        q_items = len(queue_snapshot["items"])

    base: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "acceptance_ok": False,
        "commit_ready": False,
        "requeue_allowed": False,
        "commit_message_candidate": None,
        "next_queue_item_candidate": None,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "gate_reason": gate_reason if not gate_ok else None,
        "inputs": {
            "build_probe_result": "ok" if build_probe else "missing_or_invalid",
            "cursor_patch_plan": "ok" if patch_plan else "missing_or_invalid",
            "remote_cursor_queue_path": queue_path,
            "remote_cursor_queue_items_seen": q_items,
        },
    }

    if not ok_inputs:
        base["gate_reason"] = miss
        return base

    if not gate_ok:
        base["acceptance_ok"] = False
        base["commit_ready"] = False
        base["requeue_allowed"] = False
        base["gate_reason"] = gate_reason
        return base

    base["acceptance_ok"] = True
    base["commit_ready"] = True
    base["requeue_allowed"] = True
    base["commit_message_candidate"] = _commit_message_candidate(pp)
    base["next_queue_item_candidate"] = _next_queue_item_candidate()
    base["gate_reason"] = None
    return base


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--build-probe-result", type=Path, required=True)
    ap.add_argument("--patch-plan", type=Path, required=True)
    ap.add_argument("--remote-cursor-queue", type=Path, required=True)
    ap.add_argument(
        "--output-file",
        type=Path,
        default=None,
        help="既定: api/automation/out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json",
    )
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    out = args.output_file
    if out is None:
        out = repo / "api" / "automation" / "out" / "acceptance_commit_requeue" / "acceptance_commit_requeue_summary.json"
    out = out.expanduser().resolve()

    bp_path = args.build_probe_result.expanduser().resolve()
    pp_path = args.patch_plan.expanduser().resolve()
    q_path = args.remote_cursor_queue.expanduser().resolve()

    bp = _load_json(bp_path)
    pp = _load_json(pp_path)
    q = _load_json(q_path)

    summary = build_summary_v1(
        build_probe=bp,
        patch_plan=pp,
        queue_snapshot=q,
        queue_path=str(q_path),
    )
    summary["inputs"]["paths"] = {
        "build_probe_result": str(bp_path),
        "cursor_patch_plan": str(pp_path),
        "remote_cursor_queue": str(q_path),
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "commit_ready": summary.get("commit_ready"),
                "requeue_allowed": summary.get("requeue_allowed"),
                "gate_reason": summary.get("gate_reason"),
            },
            ensure_ascii=False,
        ),
        file=sys.stdout,
    )
    return 0 if summary.get("commit_ready") else 1


if __name__ == "__main__":
    raise SystemExit(main())
