#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1
本体は tenmon_overnight_full_autonomy_completion_loop_v1.py --resume-after-first-live を呼び、
仕様どおりの resume summary / report を出力する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1"


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


def safe_bool(x: Any) -> bool:
    return bool(x is True or x == 1 or x == "true")


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_overnight_full_autonomy_resume_after_first_live_pass_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    loop_py = auto / "tenmon_overnight_full_autonomy_completion_loop_v1.py"
    full_summary = auto / "tenmon_overnight_full_autonomy_summary.json"
    full_report = auto / "tenmon_overnight_full_autonomy_report.md"
    out_summary = auto / "tenmon_overnight_resume_summary.json"
    out_report = auto / "tenmon_overnight_resume_report.md"

    env = {**os.environ, "TENMON_OVERNIGHT_RESUME_AFTER_FIRST_LIVE": "1"}
    p = subprocess.run(
        ["python3", str(loop_py), "--resume-after-first-live"],
        cwd=str(repo),
        env=env,
        capture_output=True,
        text=True,
        timeout=7200,
    )
    base = read_json(full_summary)

    overnight_resumed = safe_bool(base.get("precondition_pass")) and int(base.get("cycle_count") or 0) >= 1
    pass_ok = overnight_resumed and safe_bool(base.get("current_run_evidence_ok")) and safe_bool(base.get("safe_scope_enforced"))

    merged: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "overnight_resumed": overnight_resumed,
        "resume_after_first_live_only": True,
        "cycle_count": int(base.get("cycle_count") or 0),
        "current_run_evidence_ok": safe_bool(base.get("current_run_evidence_ok")),
        "safe_scope_enforced": safe_bool(base.get("safe_scope_enforced")),
        "precondition_pass": safe_bool(base.get("precondition_pass")),
        "resume_possible": safe_bool(base.get("resume_possible")),
        "stop_reason": base.get("stop_reason"),
        "upstream_summary": str(full_summary),
        "loop_exit_code": p.returncode,
    }
    merged.update({k: base.get(k) for k in ("run_id", "dispatch_pass", "delivery_observed", "result_returned", "ingest_pass", "rejudge_pass") if k in base})

    write_json(out_summary, merged)

    lines = [
        f"# {CARD}",
        "",
        f"- overnight_resumed: `{overnight_resumed}`",
        f"- cycle_count: `{merged['cycle_count']}`",
        f"- current_run_evidence_ok: `{merged['current_run_evidence_ok']}`",
        f"- safe_scope_enforced: `{merged['safe_scope_enforced']}`",
        f"- resume_after_first_live_only: `True`",
        f"- loop_exit_code: `{p.returncode}`",
        "",
    ]
    out_report.write_text("\n".join(lines), encoding="utf-8")

    if pass_ok and p.returncode == 0:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
