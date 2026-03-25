#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_IMPROVEMENT_OS — Seal Governor
seal ディレクトリの必須成果物と runtime matrix の要約を検査し、OS 層の structural 可否を返す。
（merge の真偽は final_verdict に委譲し、ここは「観測・ファイル整合」の統治）
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_SELF_IMPROVEMENT_SEAL_GOVERNOR_V1"
VERSION = 1

REQUIRED_ARTIFACTS = (
    "build.log",
    "health.json",
    "audit.json",
    "runtime_matrix.json",
    "surface_audit.json",
    "worldclass_report.json",
    "final_verdict.json",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _runtime_summary(runtime: Dict[str, Any]) -> Tuple[int, int, List[str]]:
    ok_n = 0
    tot = 0
    failed: List[str] = []
    for k, row in runtime.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if row.get("ok"):
            ok_n += 1
        else:
            failed.append(str(k))
    return ok_n, tot, failed


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os")
    out.mkdir(parents=True, exist_ok=True)

    present: Dict[str, bool] = {}
    for name in REQUIRED_ARTIFACTS:
        present[name] = (seal / name).is_file()

    runtime = _read_json(seal / "runtime_matrix.json")
    ok_n, tot, failed = _runtime_summary(runtime)
    final = _read_json(seal / "final_verdict.json")

    structural_ok = all(present.values()) and tot > 0
    probes_all_ok = tot > 0 and ok_n == tot
    notes: List[str] = []
    if not structural_ok:
        missing = [k for k, v in present.items() if not v]
        notes.append(f"missing_artifacts:{','.join(missing)}")
    if tot == 0:
        notes.append("runtime_matrix_empty")
    elif not probes_all_ok:
        notes.append(f"runtime_probe_failures:{','.join(failed[:10])}")

    body: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "artifacts_present": present,
        "runtime_probe_summary": {
            "ok_count": ok_n,
            "total": tot,
            "all_ok": probes_all_ok,
            "failed_names": failed,
        },
        "seal_final_flags": {
            "chat_ts_overall_100": bool(final.get("chat_ts_overall_100")),
            "chat_ts_runtime_100": bool(final.get("chat_ts_runtime_100")),
        },
        "structural_ok": structural_ok,
        "notes": notes,
    }

    out_path = out / "seal_governor_verdict.json"
    out_path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0  # governor は観測のみ; runner の exit は seal の rc に従う


if __name__ == "__main__":
    raise SystemExit(main())
