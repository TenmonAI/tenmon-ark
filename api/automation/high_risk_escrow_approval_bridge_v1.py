#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_HIGH_RISK_ESCROW_APPROVAL_BRIDGE_CURSOR_AUTO_V1

目的:
- high-risk カードを無条件 bypass しない
- 自動で review 材料（diff/build/probe/blocked/recommendation）を escrow package として整備
- 人間が 1 回 approve した時だけ queue に enqueue する

NON-NEGOTIABLES:
- success 捏造禁止（stale/fixture を成功根拠にしない）
- dist 直編集禁止（本スクリプトは dist を触らない）
- 1変更=1検証（本スクリプト自身は “整備/橋渡し” のみ）
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_HIGH_RISK_ESCROW_APPROVAL_BRIDGE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_list(x: Any) -> list[Any]:
    return x if isinstance(x, list) else []


def safe_bool(x: Any) -> bool:
    return bool(x is True or x == 1 or x == "true")


def sh(repo: Path, args: list[str], timeout_sec: int = 30) -> dict[str, Any]:
    try:
        cp = subprocess.run(
            args,
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        return {
            "ok": True,
            "args": args,
            "rc": int(cp.returncode),
            "stdout": (cp.stdout or ""),
            "stderr": (cp.stderr or ""),
        }
    except Exception as e:
        return {
            "ok": False,
            "args": args,
            "rc": None,
            "stdout": "",
            "stderr": f"{type(e).__name__}: {e}",
        }


@dataclass(frozen=True)
class Inputs:
    repo: Path
    auto: Path
    queue_path: Path
    bundle_path: Path
    hygiene_path: Path
    orch_path: Path
    rejudge_path: Path
    current_run_report_path: Path


def compute_current_run_nonfixture_executed(queue: dict[str, Any], bundle: dict[str, Any]) -> bool:
    q_items = safe_list(queue.get("items"))
    b_entries = safe_list(bundle.get("entries"))
    executed_nonfixture_ids = {
        str(x.get("id"))
        for x in q_items
        if isinstance(x, dict) and x.get("fixture") is False and str(x.get("state") or "") == "executed"
    }
    current_run_bundle_ids = {
        str(x.get("queue_id"))
        for x in b_entries
        if isinstance(x, dict) and x.get("current_run") is True
    }
    return bool(executed_nonfixture_ids & current_run_bundle_ids)


def already_pending(queue: dict[str, Any], card_id: str) -> bool:
    pending_states = {"approval_required", "ready", "delivered"}
    for it in safe_list(queue.get("items")):
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") not in pending_states:
            continue
        if str(it.get("cursor_card") or "").strip() == card_id:
            return True
    return False


def make_queue_item(card_id: str, objective: str, source: str, enqueue_reason: str, escrow_package_path: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    new_id = secrets.token_hex(8)
    return {
        "id": new_id,
        "job_id": new_id,
        "state": "ready",
        "createdAt": now,
        "source": source,
        "cursor_card": card_id,
        "objective": objective,
        "job_file": None,
        "fixture": False,
        "dry_run_only": False,
        "leased_until": None,
        "enqueue_reason": enqueue_reason,
        "current_run": True,
        "escrow_approved": True,
        "escrow_package": escrow_package_path,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="high_risk_escrow_approval_bridge_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--card-id", required=True, help="enqueue 対象の high-risk card id")
    ap.add_argument("--objective", default="high-risk escrow enqueue (human approved)")
    ap.add_argument("--blocked-reason", default="", help="human-readable blocked reason (why escrow)")
    ap.add_argument("--approve", action="store_true", help="human 1承認として enqueue を実行する")
    ap.add_argument("--approve-by", default=os.environ.get("USER", "human"), help="approval actor label")
    args = ap.parse_args()

    card_id = str(args.card_id or "").strip()
    if not card_id:
        print(json.dumps({"ok": False, "error": "card_id_required"}, ensure_ascii=False))
        return 2

    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    inp = Inputs(
        repo=repo,
        auto=auto,
        queue_path=auto / "remote_cursor_queue.json",
        bundle_path=auto / "remote_cursor_result_bundle.json",
        hygiene_path=auto / "tenmon_repo_hygiene_final_seal_summary.json",
        orch_path=auto / "acceptance_orchestration_single_source.json",
        rejudge_path=auto / "tenmon_latest_state_rejudge_summary.json",
        current_run_report_path=auto / "tenmon_total_current_run_reveal_report.json",
    )

    queue = read_json(inp.queue_path)
    bundle = read_json(inp.bundle_path)
    hygiene = read_json(inp.hygiene_path)
    orch = read_json(inp.orch_path)
    rejudge = read_json(inp.rejudge_path)
    current_run = read_json(inp.current_run_report_path)

    # diff summary (current workspace)
    diff_stat = sh(repo, ["git", "diff", "--stat"], timeout_sec=30)
    diff_name_status = sh(repo, ["git", "diff", "--name-status"], timeout_sec=30)
    status_porcelain = sh(repo, ["git", "status", "--porcelain", "-uall"], timeout_sec=30)
    head_sha = sh(repo, ["git", "rev-parse", "HEAD"], timeout_sec=10)

    # evidence signals (read-only)
    build_ok = bool((hygiene.get("build") or {}).get("ok") is True)
    http = hygiene.get("http") or {}
    probe_ok = bool(http.get("health_ok") and http.get("audit_ok") and http.get("audit_build_ok"))
    current_run_nonfixture_executed = compute_current_run_nonfixture_executed(queue, bundle)

    blocked: list[str] = []
    blocked.append("high_risk_requires_human_approval")
    if already_pending(queue, card_id):
        blocked.append("duplicate_cursor_card_already_pending")
    if not hygiene:
        blocked.append("evidence_missing:tenmon_repo_hygiene_final_seal_summary.json")
    if not queue:
        blocked.append("evidence_missing:remote_cursor_queue.json")
    if not bundle:
        blocked.append("evidence_missing:remote_cursor_result_bundle.json")
    if not build_ok:
        blocked.append("evidence_fail:build_ok!=true")
    if not probe_ok:
        blocked.append("evidence_fail:probe_ok!=true")
    if not current_run_nonfixture_executed:
        blocked.append("evidence_fail:current_run_nonfixture_executed_not_observed")

    manual_reason = str(args.blocked_reason or "").strip()
    if manual_reason:
        blocked.append(f"human_note:{manual_reason}")

    recommended_decision = "HOLD"
    if "duplicate_cursor_card_already_pending" in blocked:
        recommended_decision = "DO_NOT_ENQUEUE"
    elif any(x.startswith("evidence_fail:") for x in blocked) or any(x.startswith("evidence_missing:") for x in blocked):
        recommended_decision = "DO_NOT_APPROVE_YET"
    else:
        recommended_decision = "APPROVE_ENQUEUE"

    run_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    out_dir = auto / "out" / "high_risk_escrow" / f"{run_id}__{card_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    pkg_path = out_dir / "escrow_package.json"
    pkg_md_path = out_dir / "escrow_package.md"

    pkg: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "target_card_id": card_id,
        "approved": bool(args.approve),
        "approved_by": str(args.approve_by or "").strip(),
        "recommended_decision": recommended_decision,
        "blocked_reason": blocked,
        "evidence": {
            "git_head": (head_sha.get("stdout") or "").strip(),
            "git_status_porcelain": (status_porcelain.get("stdout") or "").strip().splitlines()[:2000],
            "git_diff_stat": (diff_stat.get("stdout") or "").strip().splitlines()[:400],
            "git_diff_name_status": (diff_name_status.get("stdout") or "").strip().splitlines()[:800],
            "build": hygiene.get("build"),
            "probe_http": hygiene.get("http"),
            "orchestration": {
                "acceptance_singleton_pass": orch.get("acceptance_singleton_pass"),
                "next_best_card": orch.get("next_best_card"),
            },
            "rejudge": {
                "remaining_blockers": rejudge.get("remaining_blockers"),
                "recommended_next_card": rejudge.get("recommended_next_card"),
                "stale_sources": rejudge.get("stale_sources"),
                "truth_excluded_sources": rejudge.get("truth_excluded_sources"),
            },
            "current_run": {
                "current_run_nonfixture_executed": current_run_nonfixture_executed,
                "report": {
                    "generated_at": current_run.get("generated_at"),
                    "run_id": current_run.get("run_id"),
                },
            },
        },
        "source_paths": {
            "remote_cursor_queue": str(inp.queue_path),
            "remote_cursor_result_bundle": str(inp.bundle_path),
            "tenmon_repo_hygiene_final_seal_summary": str(inp.hygiene_path),
            "acceptance_orchestration_single_source": str(inp.orch_path),
            "tenmon_latest_state_rejudge_summary": str(inp.rejudge_path),
            "tenmon_total_current_run_reveal_report": str(inp.current_run_report_path),
        },
        "non_negotiables": {
            "no_bypass": True,
            "no_unattended_high_risk": True,
            "no_success_fabrication": True,
            "no_dist_direct_edit": True,
        },
    }
    write_json(pkg_path, pkg)

    md_lines: list[str] = []
    md_lines.append(f"# {CARD}")
    md_lines.append("")
    md_lines.append(f"- generated_at: `{pkg['generated_at']}`")
    md_lines.append(f"- run_id: `{run_id}`")
    md_lines.append(f"- target_card_id: `{card_id}`")
    md_lines.append(f"- **recommended_decision**: `{recommended_decision}`")
    md_lines.append(f"- approved(flag): `{bool(args.approve)}`")
    md_lines.append("")
    md_lines.append("## blocked_reason")
    md_lines.append("")
    for b in blocked:
        md_lines.append(f"- {b}")
    md_lines.append("")
    md_lines.append("## diff/build/probe (top)")
    md_lines.append("")
    md_lines.append(f"- git_head: `{pkg['evidence']['git_head']}`")
    md_lines.append(f"- build_ok: `{build_ok}`")
    md_lines.append(f"- probe_ok(http): `{probe_ok}`")
    md_lines.append(f"- current_run_nonfixture_executed: `{current_run_nonfixture_executed}`")
    md_lines.append("")
    md_lines.append("## paths")
    md_lines.append("")
    for k, v in (pkg.get("source_paths") or {}).items():
        md_lines.append(f"- {k}: `{v}`")
    pkg_md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    latest_json = auto / "high_risk_escrow_package_latest.json"
    latest_md = auto / "high_risk_escrow_package_latest.md"
    write_json(latest_json, {"latest": str(pkg_path), "generated_at": utc(), "target_card_id": card_id})
    latest_md.write_text(
        "\n".join(
            [
                f"# {CARD} (latest)",
                "",
                f"- generated_at: `{utc()}`",
                f"- target_card_id: `{card_id}`",
                f"- package: `{pkg_path}`",
                f"- report: `{pkg_md_path}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    enqueue_ok = False
    enqueued_item: dict[str, Any] | None = None

    # approve => enqueue to queue (human 1 action)
    if args.approve:
        if recommended_decision != "APPROVE_ENQUEUE":
            print(
                json.dumps(
                    {
                        "ok": False,
                        "enqueue_ok": False,
                        "error": "approval_rejected_by_evidence",
                        "recommended_decision": recommended_decision,
                        "escrow_package": str(pkg_path),
                    },
                    ensure_ascii=False,
                )
            )
            return 1
        if already_pending(queue, card_id):
            print(
                json.dumps(
                    {
                        "ok": False,
                        "enqueue_ok": False,
                        "error": "duplicate_cursor_card_already_pending",
                        "escrow_package": str(pkg_path),
                    },
                    ensure_ascii=False,
                )
            )
            return 1

        items = safe_list(queue.get("items"))
        used_ids = {str(x.get("id") or "") for x in items if isinstance(x, dict)}
        it = make_queue_item(
            card_id=card_id,
            objective=str(args.objective or "").strip() or "high-risk escrow enqueue (human approved)",
            source=CARD,
            enqueue_reason="escrow_human_approval",
            escrow_package_path=str(pkg_path),
        )
        while str(it.get("id")) in used_ids:
            it = {**it, "id": secrets.token_hex(8), "job_id": secrets.token_hex(8)}
        items.insert(0, it)
        queue_out = {
            "version": int(queue.get("version") or 1),
            "card": str(queue.get("card") or "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1"),
            "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "items": items,
            "state_schema": str(queue.get("state_schema") or "approval_required|ready|rejected|delivered|executed"),
        }
        inp.queue_path.write_text(json.dumps(queue_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        enqueue_ok = True
        enqueued_item = it

        # also persist explicit approval for downstream high-risk gate (single-source trace)
        explicit_path = auto / "tenmon_high_risk_explicit_approval_v1.json"
        write_json(
            explicit_path,
            {
                "card": CARD,
                "generated_at": utc(),
                "approved": True,
                "approved_by": str(args.approve_by or "").strip(),
                "target_card_id": card_id,
                "escrow_package": str(pkg_path),
            },
        )

    out = {
        "card": CARD,
        "generated_at": utc(),
        "target_card_id": card_id,
        "escrow_package": str(pkg_path),
        "escrow_report": str(pkg_md_path),
        "recommended_decision": recommended_decision,
        "enqueue_ok": enqueue_ok,
        "enqueued_item": enqueued_item,
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0 if (enqueue_ok or not args.approve) else 1


if __name__ == "__main__":
    raise SystemExit(main())

