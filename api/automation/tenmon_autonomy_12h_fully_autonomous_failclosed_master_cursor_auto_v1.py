#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_12H_FULLY_AUTONOMOUS_FAILCLOSED_MASTER_CURSOR_AUTO_V1

本番向けプロファイル: `tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.py` と同一エンジンで、
card 名・出力 JSON・ラン保存ディレクトリを分離し、既定で以下を有効化する。

  - HTTP probe（TENMON_PDCA_SKIP_PROBES=0）
  - cursor operator bridge（--execute / --apply）
  - 最終 ok に truth tune / mixed 条件（TENMON_12H_OK_REQUIRE_EXPANSION=1）
  - TENMON_12H_PILOT_MAX_LOOPS の解除（安全パイロット上限を外す。維持したい場合は下記）

環境変数（ラッパーが setdefault するものは、既に外側で設定されていれば上書きしない）:
  TENMON_12H_FULLY_AUTONOMOUS_KEEP_PILOT_CAP=1  … TENMON_12H_PILOT_MAX_LOOPS を env に残す

その他はベーススクリプトの docstring 参照。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

CARD = "TENMON_AUTONOMY_12H_FULLY_AUTONOMOUS_FAILCLOSED_MASTER_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
RUN_DIR = "autonomy_12h_fully_autonomous_failclosed_master_v1"
ENGINE = "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.py"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    target = api / "automation" / ENGINE
    if not target.is_file():
        print(json.dumps({"ok": False, "card": CARD, "error": "missing_engine", "path": str(target)}, ensure_ascii=False))
        return 1

    env = os.environ.copy()
    env["TENMON_AUTONOMY_12H_CARD"] = CARD
    env["TENMON_AUTONOMY_12H_OUT_JSON"] = OUT_JSON
    env["TENMON_12H_RUN_DIR_NAME"] = RUN_DIR

    env.setdefault("TENMON_PDCA_SKIP_PROBES", "0")
    env.setdefault("TENMON_12H_OK_REQUIRE_EXPANSION", "1")
    env.setdefault("TENMON_12H_CURSOR_OPERATOR_BRIDGE", "1")
    env.setdefault("TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE", "1")
    env.setdefault("TENMON_12H_CURSOR_OPERATOR_BRIDGE_APPLY", "1")

    if os.environ.get("TENMON_12H_FULLY_AUTONOMOUS_KEEP_PILOT_CAP") not in ("1", "true", "yes"):
        env.pop("TENMON_12H_PILOT_MAX_LOOPS", None)

    return subprocess.run(
        [sys.executable, str(target)],
        cwd=str(api),
        env=env,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
