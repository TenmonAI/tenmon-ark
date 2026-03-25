#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OBSERVATION_OS — 観測系を一括生成（read-only）
出力: api/automation/full_*.json + blocker_taxonomy.json + priority_queue.json + observation_os_report.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from observation_os_common_v1 import (
    CARD,
    FAIL_NEXT,
    VERSION,
    VPS_CARD,
    api_root,
    utc_now_iso,
)


def _run(py: str, args: List[str]) -> int:
    return subprocess.run([sys.executable, py] + args, check=False).returncode


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-snapshot-dir",
        type=str,
        default="",
        help="既定: api/automation/out/tenmon_observation_os_v1/<UTC>/",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = api_root()
    auto = api / "automation"
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snap = Path(args.out_snapshot_dir).resolve() if args.out_snapshot_dir else (
        auto / "out" / "tenmon_observation_os_v1" / ts
    )
    snap.mkdir(parents=True, exist_ok=True)

    jobs: List[tuple[str, str, str]] = [
        ("repo_manifest_v1.py", "full_repo_manifest.json", "full_repo_manifest.md"),
        ("responsibility_map_v1.py", "full_responsibility_map.json", "full_responsibility_map.md"),
        ("dependency_graph_v1.py", "full_dependency_graph.json", "full_dependency_graph.md"),
        ("risk_map_v1.py", "full_risk_map.json", "full_risk_map.md"),
        ("blocker_taxonomy_v1.py", "blocker_taxonomy.json", "blocker_taxonomy.md"),
    ]

    artifacts: List[str] = []
    for script, jname, mname in jobs:
        sp = auto / script
        out_json = auto / jname
        out_md_snap = snap / mname
        rc = _run(
            str(sp),
            ["--out", str(out_json), "--write-md", str(out_md_snap)],
        )
        artifacts.append(f"{jname} rc={rc}")

    pq = auto / "priority_queue.json"
    rc = _run(
        str(auto / "priority_queue_generator_v1.py"),
        ["--out", str(pq), "--write-md", str(snap / "priority_queue.md")],
    )
    artifacts.append(f"priority_queue.json rc={rc}")

    # スナップショットにコピー（JSON）
    for name in (
        "full_repo_manifest.json",
        "full_responsibility_map.json",
        "full_dependency_graph.json",
        "full_risk_map.json",
        "blocker_taxonomy.json",
        "priority_queue.json",
    ):
        src = auto / name
        if src.is_file():
            dst = snap / name
            dst.write_text(src.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

    marker = snap / "TENMON_OBSERVATION_OS_VPS_V1"
    marker.write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\n{CARD}\n",
        encoding="utf-8",
    )
    (auto / "TENMON_OBSERVATION_OS_VPS_V1").write_text(marker.read_text(encoding="utf-8"), encoding="utf-8")

    report: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "snapshot_dir": str(snap),
        "stable_json_paths": {
            "full_repo_manifest": str(auto / "full_repo_manifest.json"),
            "full_responsibility_map": str(auto / "full_responsibility_map.json"),
            "full_dependency_graph": str(auto / "full_dependency_graph.json"),
            "full_risk_map": str(auto / "full_risk_map.json"),
            "blocker_taxonomy": str(auto / "blocker_taxonomy.json"),
            "priority_queue": str(auto / "priority_queue.json"),
        },
        "artifacts": artifacts,
        "notes": [
            "orchestrator は api/automation/full_*.json と priority_queue.json を直接参照可能",
            "既存の forensics / full_orchestrator 出力は環境変数で上書き可能（priority_queue_generator_v1）",
        ],
    }
    rep_path = snap / "observation_os_report.json"
    rep_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / "observation_os_report.json").write_text(rep_path.read_text(encoding="utf-8"), encoding="utf-8")

    latest = auto / "out" / "tenmon_observation_os_v1" / "latest"
    try:
        if latest.is_symlink() or latest.exists():
            latest.unlink()
        latest.symlink_to(snap, target_is_directory=True)
    except OSError:
        pass

    if args.stdout_json:
        print(json.dumps({"ok": True, "snapshot": str(snap)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
