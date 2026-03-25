#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_IMPROVEMENT_OS — Residual Quality Scorer アダプタ
既存 tenmon_chat_ts_residual_quality_score_v1 を subprocess で呼び、OS 用の橋渡し JSON を書く。
（採点ロジックは residual 本体に集約）
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CARD = "TENMON_SELF_IMPROVEMENT_RESIDUAL_ADAPTER_V1"
VERSION = 1


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--mirror-artifacts", action="store_true", default=True)
    ap.add_argument("--no-mirror-artifacts", action="store_false", dest="mirror_artifacts")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    api = _repo_api()
    py = api / "automation" / "tenmon_chat_ts_residual_quality_score_v1.py"
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os" / "residual")
    out.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        str(py),
        "--seal-dir",
        str(seal),
        "--out-dir",
        str(out),
    ]
    if args.mirror_artifacts:
        cmd.append("--mirror-artifacts")

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    bridge: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "residual_out_dir": str(out),
        "subprocess_rc": proc.returncode,
        "stderr_tail": (proc.stderr or "")[-4000:],
    }
    if proc.stdout.strip():
        try:
            bridge["residual_stdout_json"] = json.loads(proc.stdout)
        except Exception:
            bridge["residual_stdout_raw"] = proc.stdout[:8000]

    rscore = out / "residual_quality_score.json"
    fman = out / "focused_next_cards_manifest.json"
    bridge["artifacts"] = {
        "residual_quality_score": rscore.is_file(),
        "focused_next_cards_manifest": fman.is_file(),
    }
    if rscore.is_file():
        bridge["residual_quality_score_preview"] = _read_json(rscore).get("lowest_axes")

    bridge_path = out / "residual_os_bridge.json"
    bridge_path.write_text(json.dumps(bridge, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(bridge, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
