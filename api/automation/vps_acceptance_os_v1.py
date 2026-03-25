#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_VPS_ACCEPTANCE_OS — build→restart→health→audit→runtime→seal を束ね、4 軸 integrated seal を出す。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from vps_acceptance_runtime_probe_v1 import runtime_all_ok, write_runtime_matrix

CARD = "TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_VPS_ACCEPTANCE_OS_VPS_V1"
VERSION = 1
FAIL_NEXT = "TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_RETRY_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api() -> Path:
    return Path(__file__).resolve().parents[1]


def _repo() -> Path:
    return _api().parents[1]


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _curl_ok(url: str) -> tuple[bool, str]:
    try:
        p = subprocess.run(
            ["curl", "-fsS", "--max-time", "10", url],
            capture_output=True,
            text=True,
            check=False,
        )
        return p.returncode == 0, (p.stdout or "")[:4000]
    except Exception as e:
        return False, str(e)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--skip-seal-script", action="store_true", help="runtime まで（seal スクリプト省略）")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api_dir = _api()
    repo_root = _repo()
    automation_dir = api_dir / "automation"
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snap = Path(args.out_dir).resolve() if args.out_dir else (api_dir / "out" / "tenmon_vps_acceptance_os_v1" / ts)
    snap.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000").rstrip("/")

    # 1) build + restart（bash）
    wrap = api_dir / "scripts" / "build_restart_wrapper_v1.sh"
    subprocess.run(
        ["bash", str(wrap), str(snap)],
        cwd=str(repo_root),
        check=False,
    )

    build_rc_path = snap / "build.rc"
    build_rc = 1
    if build_rc_path.is_file():
        try:
            build_rc = int((build_rc_path.read_text() or "1").strip())
        except Exception:
            build_rc = 1

    # 2) health / audit
    h_ok, h_body = _curl_ok(f"{base}/health")
    a_ok, a_body = _curl_ok(f"{base}/api/audit")
    (snap / "health_probe.json").write_text(
        json.dumps({"ok": h_ok, "body": h_body}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (snap / "audit_probe.json").write_text(
        json.dumps({"ok": a_ok, "body": a_body}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # 3) runtime matrix
    matrix_path = snap / "runtime_probe_matrix.json"
    matrix = write_runtime_matrix(base, matrix_path)
    rt_ok = runtime_all_ok(matrix)

    # 4) seal（既存スクリプト再利用）
    seal_dir = snap / "seal"
    seal_dir.mkdir(parents=True, exist_ok=True)
    seal_rc = 0
    final_verdict: Dict[str, Any] = {}
    if not args.skip_seal_script:
        env = os.environ.copy()
        env["ROOT"] = str(repo_root)
        env["TENMON_SEAL_DIR_OVERRIDE"] = str(seal_dir)
        env["CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART"] = "1"
        env["CHAT_TS_COMPLETION_SUPPLEMENT_SKIP"] = "1"
        env["CHAT_TS_POSTLOCK_MAINTENANCE_SKIP"] = "1"
        env["CHAT_TS_RESIDUAL_SCORE_SKIP"] = "1"
        env["CARD"] = "TENMON_VPS_ACCEPTANCE_RUNTIME_SEAL_V1"
        seal_rc = subprocess.run(
            ["bash", str(api_dir / "scripts" / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")],
            cwd=str(api_dir),
            env=env,
            check=False,
        ).returncode
        final_verdict = _read_json(seal_dir / "final_verdict.json")

    overall_100 = bool(final_verdict.get("chat_ts_overall_100")) if final_verdict else False
    static_ok = build_rc == 0
    runtime_axis_ok = h_ok and a_ok and rt_ok
    if args.skip_seal_script:
        seal_contract_block: Dict[str, Any] = {
            "summary": {"skipped": True, "ok": True, "note": "--skip-seal-script"},
        }
        seal_ok = True
    else:
        seal_contract_block = {
            "summary": {
                "seal_script_rc": seal_rc,
                "chat_ts_overall_100": overall_100,
                "ok": (seal_rc == 0) and overall_100,
            },
        }
        seal_ok = bool((seal_rc == 0) and overall_100)

    integrated: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "axes": {
            "static": {
                "summary": {"npm_build_rc": build_rc, "ok": static_ok},
            },
            "runtime": {
                "summary": {
                    "health_ok": h_ok,
                    "audit_ok": a_ok,
                    "runtime_matrix_all_ok": rt_ok,
                    "ok": runtime_axis_ok,
                },
            },
            "seal_contract": seal_contract_block,
            "regression_meta": {
                "summary": {
                    "baseline_path": str(automation_dir / "vps_acceptance_baseline_v1.json"),
                    "note": "regression_checker が baseline と比較",
                },
            },
        },
        "overall_pass": bool(static_ok and runtime_axis_ok and seal_ok),
    }

    (snap / "integrated_acceptance_seal.json").write_text(
        json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # regression report
    reg_out = snap / "regression_report.json"
    subprocess.run(
        [
            sys.executable,
            str(automation_dir / "regression_checker_v1.py"),
            "--current-seal",
            str(snap / "integrated_acceptance_seal.json"),
            "--out",
            str(reg_out),
        ],
        cwd=str(automation_dir),
        check=False,
    )

    forensics_path = snap / "failure_forensics_bundle.json"
    overall = integrated["overall_pass"]
    if not overall:
        subprocess.run(
            [
                sys.executable,
                str(automation_dir / "failure_forensics_collector_v1.py"),
                "--out",
                str(forensics_path),
                "--repo-root",
                str(repo_root),
                "--base-url",
                base,
            ],
            cwd=str(automation_dir),
            check=False,
        )
        subprocess.run(
            [
                sys.executable,
                str(automation_dir / "rollback_planner_v1.py"),
                "--out",
                str(snap / "rollback_plan.json"),
                "--repo-root",
                str(repo_root),
            ],
            cwd=str(automation_dir),
            check=False,
        )
    else:
        forensics_path.write_text(
            json.dumps({"skipped": True, "reason": "overall_pass"}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        # baseline 更新（pass のみ）
        (automation_dir / "vps_acceptance_baseline_v1.json").write_text(
            json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )

    report = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc(),
        "snapshot_dir": str(snap),
        "overall_pass": overall,
        "build_rc": build_rc,
        "seal_rc": seal_rc,
        "paths": {
            "runtime_probe_matrix": str(matrix_path),
            "integrated_acceptance_seal": str(snap / "integrated_acceptance_seal.json"),
            "failure_forensics_bundle": str(forensics_path),
            "regression_report": str(reg_out),
        },
    }
    (snap / "vps_acceptance_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    # stable copies in api/automation/
    for name in (
        "vps_acceptance_report.json",
        "runtime_probe_matrix.json",
        "failure_forensics_bundle.json",
        "regression_report.json",
        "integrated_acceptance_seal.json",
    ):
        src = snap / name
        if src.is_file():
            (automation_dir / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    marker_txt = f"{VPS_CARD}\n{_utc()}\noverall_pass={overall}\n"
    (automation_dir / "TENMON_VPS_ACCEPTANCE_OS_VPS_V1").write_text(marker_txt, encoding="utf-8")
    (snap / "TENMON_VPS_ACCEPTANCE_OS_VPS_V1").write_text(marker_txt, encoding="utf-8")

    latest = api_dir / "out" / "tenmon_vps_acceptance_os_v1" / "latest"
    latest.parent.mkdir(parents=True, exist_ok=True)
    try:
        if latest.is_symlink() or latest.exists():
            latest.unlink()
        latest.symlink_to(snap, target_is_directory=True)
    except OSError:
        pass

    if args.stdout_json:
        print(json.dumps({"ok": True, "overall_pass": overall, "snapshot": str(snap)}, ensure_ascii=False, indent=2))
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
