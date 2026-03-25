#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1
Mac: Cursor で安全サンドボックスを開き、指示貼付 → 明示パッチ → npm build を current-run 証明。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_CURSOR_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def is_darwin() -> bool:
    return sys.platform == "darwin"


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_cursor_operator_runtime_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    evidence_dir = auto / "out" / "cursor_operator_runtime"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    _automation = Path(__file__).resolve().parent
    if str(_automation) not in sys.path:
        sys.path.insert(0, str(_automation))
    from cursor_operator_v1 import default_sandbox_path, run_cursor_operator_proof

    pre_path = auto / "tenmon_browser_ai_operator_runtime_summary.json"
    pre = read_json(pre_path)
    precondition_ok = bool(pre.get("browser_ai_operator_runtime_pass") is True)
    if str(pre.get("card") or "") != PRE_CARD:
        precondition_ok = False

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "platform": sys.platform,
        "darwin": is_darwin(),
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "cursor_open_ok": False,
        "file_open_ok": False,
        "instruction_injected": False,
        "patch_applied": False,
        "build_verify_ok": False,
        "cursor_operator_runtime_pass": False,
        "sandbox_path": default_sandbox_path(repo).relative_to(repo).as_posix(),
        "diff_path": "",
        "build_rc": None,
        "phases": {},
        "fail_reason": "",
    }

    if not is_darwin():
        out["fail_reason"] = "mac_only_required"
        _write_outputs(auto, evidence_dir, out)
        return 1

    if not precondition_ok:
        out["fail_reason"] = "precondition_not_met"
        _write_outputs(auto, evidence_dir, out)
        return 1

    r = run_cursor_operator_proof(repo)
    out["phases"] = r.phases
    out["cursor_open_ok"] = r.cursor_open_ok
    out["file_open_ok"] = r.file_open_ok
    out["instruction_injected"] = r.instruction_injected
    out["patch_applied"] = r.patch_applied
    out["build_verify_ok"] = r.build_verify_ok
    out["build_rc"] = r.build_rc
    out["changed_files"] = r.changed_files
    out["apply_success"] = bool(r.patch_applied and r.build_verify_ok)

    diff_path = evidence_dir / f"cursor_operator_diff_{int(time.time())}.patch"
    if r.diff_unified.strip():
        diff_path.write_text(r.diff_unified, encoding="utf-8")
        out["diff_path"] = diff_path.relative_to(repo).as_posix()
    else:
        out["diff_path"] = ""

    out["build_stdout_excerpt"] = (r.build_stdout_excerpt or "")[:4000]

    out["cursor_operator_runtime_pass"] = bool(
        out["cursor_open_ok"]
        and out["file_open_ok"]
        and out["instruction_injected"]
        and out["patch_applied"]
        and out["build_verify_ok"]
    )

    if not out["cursor_operator_runtime_pass"]:
        out["fail_reason"] = r.error or "runtime_failed"

    _write_outputs(auto, evidence_dir, out)
    return 0 if out["cursor_operator_runtime_pass"] else 1


def _write_outputs(auto: Path, evidence_dir: Path, out: dict[str, Any]) -> None:
    summary_path = auto / "tenmon_cursor_operator_runtime_summary.json"
    report_path = auto / "tenmon_cursor_operator_runtime_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- precondition_ok: `{out.get('precondition_ok')}`",
                f"- cursor_open_ok: `{out.get('cursor_open_ok')}`",
                f"- file_open_ok: `{out.get('file_open_ok')}`",
                f"- instruction_injected: `{out.get('instruction_injected')}`",
                f"- patch_applied: `{out.get('patch_applied')}`",
                f"- build_verify_ok: `{out.get('build_verify_ok')}`",
                f"- cursor_operator_runtime_pass: `{out.get('cursor_operator_runtime_pass')}`",
                f"- fail_reason: `{out.get('fail_reason', '')}`",
                f"- diff_path: `{out.get('diff_path', '')}`",
                "",
                "安全対象: `api/automation/**` のみ。`chat.ts` 直撃禁止。",
                "",
            ]
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(main())
