#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1
Mac から返送された結果束を取り込み、VPS 側で job に紐づけ・分類・成果物 JSON を保存する。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CARD = "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1"
VERSION = 1


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _jobs_path() -> Path:
    import os

    base = os.environ.get("TENMON_REMOTE_BUILD_DATA_DIR", "").strip()
    data = Path(base) if base else _repo_root() / "data"
    p = os.environ.get("TENMON_REMOTE_BUILD_JOBS_PATH", "").strip()
    return Path(p) if p else data / "remote_build_jobs.json"


def _out_dir() -> Path:
    return _repo_root() / "api" / "automation" / "out" / "remote_build_result_collector_v1"


def classify(bundle: Dict[str, Any]) -> str:
    """accepted | failed | needs_review | executed"""
    b = bundle.get("build") or {}
    a = bundle.get("acceptance") or {}
    build_ok = b.get("ok")
    acc_pass = a.get("passed")

    if build_ok is False:
        return "failed"
    if acc_pass is False:
        return "failed"
    if acc_pass is True and build_ok is True:
        return "accepted"
    if build_ok is None and acc_pass is None:
        return "needs_review"
    if build_ok is True and acc_pass is None:
        return "needs_review"
    if build_ok is True:
        return "needs_review"
    return "executed"


def result_status_from_classification(c: str) -> str:
    if c == "accepted":
        return "accepted"
    if c == "failed":
        return "failed"
    if c == "needs_review":
        return "needs_review"
    return "executed"


def ingest(bundle: Dict[str, Any]) -> Dict[str, Any]:
    job_id = str(bundle.get("job_id") or "").strip()
    if not job_id:
        raise ValueError("job_id required")

    classification = classify(bundle)
    rstatus = result_status_from_classification(classification)

    out_dir = _out_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    merged = {
        "version": VERSION,
        "card": CARD,
        "ingested_at": _utc_now(),
        "job_id": job_id,
        "classification": classification,
        "result_status": rstatus,
        "raw_bundle": bundle,
    }
    bundle_path = out_dir / f"remote_build_result_bundle_{job_id}.json"
    bundle_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    acc = bundle.get("acceptance") or {}
    acceptance_summary = {
        "version": 1,
        "card": CARD,
        "job_id": job_id,
        "generated_at": _utc_now(),
        "passed": acc.get("passed"),
        "summary": acc.get("summary"),
        "checks": acc.get("checks") or [],
    }
    acc_path = out_dir / "acceptance_summary.json"
    acc_path.write_text(json.dumps(acceptance_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    diff = bundle.get("diff") or {}
    diff_summary = {
        "version": 1,
        "card": CARD,
        "job_id": job_id,
        "generated_at": _utc_now(),
        "stat": diff.get("stat"),
        "patch_tail": (diff.get("patch_tail") or "")[:12000],
        "unified_diff_chars": diff.get("unified_diff_chars"),
    }
    diff_path = out_dir / "collected_diff_summary.json"
    diff_path.write_text(json.dumps(diff_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # canonical paths for VPS validation (stable names)
    canonical_bundle = out_dir / "remote_build_result_bundle.json"
    canonical_bundle.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    canonical_acc = _repo_root() / "api" / "automation" / "out" / "acceptance_summary.json"
    canonical_diff = _repo_root() / "api" / "automation" / "out" / "collected_diff_summary.json"
    canonical_acc.write_text(json.dumps(acceptance_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    canonical_diff.write_text(json.dumps(diff_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    _update_jobs_file(job_id, rstatus, str(bundle_path.resolve()))

    marker = _repo_root() / "api" / "automation" / "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_VPS_V1"
    marker.write_text(f"TENMON_REMOTE_BUILD_RESULT_COLLECTOR_VPS_V1\n{_utc_now()}\n", encoding="utf-8")

    return {
        "ok": True,
        "job_id": job_id,
        "result_status": rstatus,
        "classification": classification,
        "paths": {
            "bundle": str(canonical_bundle),
            "acceptance_summary": str(canonical_acc),
            "diff_summary": str(canonical_diff),
            "per_job_bundle": str(bundle_path),
        },
    }


def _update_jobs_file(job_id: str, result_status: str, bundle_path: str) -> None:
    jp = _jobs_path()
    if not jp.is_file():
        return
    try:
        data = json.loads(jp.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return
    items = data.get("items")
    if not isinstance(items, list):
        return
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("jobId") or it.get("job_id") or "") == job_id:
            it["result"] = {
                "status": result_status,
                "receivedAt": _utc_now(),
                "bundlePath": bundle_path,
                "collectorCard": CARD,
            }
            it["updatedAt"] = _utc_now()
            break
    jp.parent.mkdir(parents=True, exist_ok=True)
    jp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1")
    ap.add_argument("--ingest-file", type=Path, help="bundle json from Mac")
    ap.add_argument("--stdin", action="store_true", help="read bundle json from stdin")
    args = ap.parse_args()

    if args.stdin:
        raw = sys.stdin.read()
        bundle = json.loads(raw)
    elif args.ingest_file:
        bundle = json.loads(args.ingest_file.read_text(encoding="utf-8", errors="replace"))
    else:
        print("need --ingest-file or --stdin", file=sys.stderr)
        return 2

    try:
        out = ingest(bundle)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
