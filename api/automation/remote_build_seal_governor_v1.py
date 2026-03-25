#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK — result bundle から sealed / rollback / retry / blocked を一意裁定
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from rollback_plan_generator_v1 import generate_rollback_plan, write_rollback_plan
from retry_dispatch_generator_v1 import generate_retry_dispatch, write_retry_dispatch

CARD = "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_V1"
VERSION = 1

PATCH_DANGER: List[Tuple[str, re.Pattern[str], str]] = [
    ("dist", re.compile(r"(^|/)dist/|\bdist/\*\*", re.I), "dist 系"),
    ("rm_rf", re.compile(r"rm\s+-rf\s+[/~]"), "rm -rf"),
    ("alter", re.compile(r"ALTER\s+TABLE|DROP\s+TABLE", re.I), "DB schema"),
    ("secret", re.compile(r"BEGIN\s+PRIVATE\s+KEY|API_KEY\s*=\s*['\"]", re.I), "秘密情報"),
    ("kokuzo", re.compile(r"kokuzo_pages.*正文", re.I), "kokuzo 正文"),
]


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _out_dir() -> Path:
    return _repo_root() / "api" / "automation" / "out"


def scan_dangerous_patch(bundle: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    raw = bundle.get("raw_bundle") or bundle
    diff = raw.get("diff") or {}
    text = str(diff.get("patch_tail") or "") + "\n" + str(raw.get("raw_card_body_md") or "")
    matched: List[str] = []
    reasons: List[str] = []
    for pid, rx, note in PATCH_DANGER:
        if rx.search(text):
            matched.append(pid)
            reasons.append(f"{pid}:{note}")
    return (len(reasons) > 0, reasons, matched)


def decide_verdict(
    merged_bundle: Dict[str, Any],
    blocked: bool,
) -> Tuple[str, List[str]]:
    reasons: List[str] = []
    if blocked:
        return "blocked", ["dangerous_patch_detected"]

    rb = merged_bundle.get("raw_bundle") or merged_bundle
    cls = merged_bundle.get("classification") or ""
    rstatus = merged_bundle.get("result_status") or ""

    if cls == "accepted" and rstatus == "accepted":
        return "sealed", ["acceptance_and_build_pass"]

    if cls == "failed" or rstatus == "failed":
        return "rollback_needed", ["build_or_acceptance_failed"]

    if cls in ("needs_review", "executed") or rstatus in ("needs_review", "executed"):
        return "retry_possible", ["needs_review_or_partial"]

    b = rb.get("build") or {}
    if b.get("ok") is True and merged_bundle.get("classification") != "accepted":
        return "retry_possible", ["build_ok_but_not_fully_accepted"]

    return "retry_possible", ["default_retry"]


def run_governor(bundle_path: Path) -> Dict[str, Any]:
    merged = json.loads(bundle_path.read_text(encoding="utf-8", errors="replace"))
    job_id = str(merged.get("job_id") or merged.get("raw_bundle", {}).get("job_id") or "unknown")

    dangerous, danger_reasons, matched_ids = scan_dangerous_patch(merged)
    blocked_report = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "job_id": job_id,
        "blocked": dangerous,
        "reasons": danger_reasons,
        "matched_pattern_ids": matched_ids,
    }
    out = _out_dir()
    out.mkdir(parents=True, exist_ok=True)
    blocked_path = out / "blocked_reason_report.json"
    blocked_path.write_text(json.dumps(blocked_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    verdict, vreasons = decide_verdict(merged, dangerous)
    if dangerous:
        verdict = "blocked"
        vreasons = danger_reasons

    rollback_path = out / "rollback_plan.json"
    retry_path = out / "retry_dispatch.json"
    final_path = out / "remote_build_final_verdict.json"

    plan = generate_rollback_plan(job_id=job_id, bundle=merged, dangerous=dangerous, verdict=verdict)
    write_rollback_plan(rollback_path, plan)

    dispatch = generate_retry_dispatch(
        job_id=job_id,
        verdict=verdict,
        reasons=vreasons,
        bundle=merged,
    )
    write_retry_dispatch(retry_path, dispatch)

    final = {
        "version": VERSION,
        "card": CARD,
        "generated_at": _utc(),
        "job_id": job_id,
        "verdict": verdict,
        "verdict_reasons": vreasons,
        "classification": merged.get("classification"),
        "result_status": merged.get("result_status"),
        "paths": {
            "rollback_plan": str(rollback_path.resolve()),
            "retry_dispatch": str(retry_path.resolve()),
            "blocked_reason_report": str(blocked_path.resolve()),
        },
        "policy": {
            "sealed_means_acceptance_pass": True,
            "rollback_is_plan_only": True,
            "retry_is_dispatch_only": True,
            "no_deploy": True,
        },
    }
    final_path.write_text(json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    marker = _repo_root() / "api" / "automation" / "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_VPS_V1"
    marker.write_text(f"TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_VPS_V1\n{_utc()}\n", encoding="utf-8")

    return final


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK")
    ap.add_argument(
        "--bundle",
        type=Path,
        default=None,
        help="remote_build_result_bundle.json (collector 出力)",
    )
    args = ap.parse_args()

    bundle_path = args.bundle
    if bundle_path is None:
        cand = _out_dir() / "remote_build_result_bundle.json"
        if not cand.is_file():
            alt = _repo_root() / "api" / "automation" / "out" / "remote_build_result_collector_v1"
            # 最新の per-job を探す
            if alt.is_dir():
                js = sorted(alt.glob("remote_build_result_bundle_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
                if js:
                    bundle_path = js[0]
        if bundle_path is None:
            bundle_path = cand
    if not bundle_path.is_file():
        print(json.dumps({"ok": False, "error": "bundle_not_found", "path": str(bundle_path)}, indent=2))
        return 2

    try:
        final = run_governor(bundle_path)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, indent=2))
        return 1
    print(json.dumps({"ok": True, "final": final}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
