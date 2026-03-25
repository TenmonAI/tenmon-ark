#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1 — TS 実装を npx tsx で起動する薄いオーケストレーター。
成果物は TS 側が out-dir に書き込む。
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

CARD = "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="出力ディレクトリ（省略時 api 既定）")
    ap.add_argument("--db", default="", help="kokuzo.sqlite パス")
    ap.add_argument("--passable-json", default="", help="khs_passable_set.json")
    ap.add_argument("--no-require-pipeline", action="store_true", help="kg1_pipeline フラグを無視して unitIds のみで生成")
    args = ap.parse_args()

    api = Path(__file__).resolve().parents[1]
    runner = api / "src" / "seed" / "deterministic_seed_generator_run_v1.ts"
    if not runner.is_file():
        print("[KG1] runner missing:", runner, file=sys.stderr)
        return 2

    cmd = ["npx", "tsx", str(runner)]
    if args.out_dir:
        cmd += ["--out-dir", str(Path(args.out_dir).resolve())]
    if args.db:
        cmd += ["--db", str(Path(args.db).resolve())]
    if args.passable_json:
        cmd += ["--passable-json", str(Path(args.passable_json).resolve())]
    if args.no_require_pipeline:
        cmd.append("--no-require-pipeline")

    env = {**os.environ}
    audit_url = os.environ.get("KG1_AUDIT_URL", "").strip()
    if audit_url:
        env["KG1_AUDIT_URL"] = audit_url

    print("[KG1]", " ".join(cmd))
    r = subprocess.run(cmd, cwd=str(api), env=env)
    return int(r.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
