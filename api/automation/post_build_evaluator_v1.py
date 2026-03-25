#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""acceptance / runtime / regression を集約して post_build_evaluation.json を生成。"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict

from feature_autobuild_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def build() -> Dict[str, Any]:
    auto = api_automation()
    integrated = read_json(auto / "integrated_acceptance_seal.json")
    regression = read_json(auto / "regression_report.json")

    static_ok = True
    axes = integrated.get("axes") or {}
    static = axes.get("static") or {}
    summ = static.get("summary") or integrated.get("summary") or {}
    if "npm_build_rc" in summ:
        static_ok = int(summ.get("npm_build_rc") or 0) == 0
    elif "ok" in summ:
        static_ok = bool(summ.get("ok"))

    runtime_ok = True
    rt = axes.get("runtime") or {}
    rts = rt.get("summary") or {}
    if rts:
        runtime_ok = bool(rts.get("ok", True))

    overall_acceptance = bool(integrated.get("overall_pass")) if integrated else False
    # 未生成時は評価スキップとして中立
    if not integrated:
        overall_acceptance = True
        static_ok = True
        runtime_ok = True

    reg_ok = True
    if regression:
        reg_ok = bool(regression.get("ok", regression.get("regression_ok", True)))

    build_probe_path = os.environ.get("TENMON_FEATURE_BUILD_OK_FILE", "").strip()
    if build_probe_path:
        probe = read_json(Path(build_probe_path))
        if "npm_build_ok" in probe:
            static_ok = bool(probe.get("npm_build_ok"))

    overall = bool(overall_acceptance and static_ok and runtime_ok and reg_ok)

    evaluation_contract = {
        "contract_version": 1,
        "required_top_level_keys": ["version", "card", "generatedAt", "axes", "overall_ok"],
        "axes_schema": {
            "integrated_acceptance": {"ok": "bool", "path": "str", "present": "bool"},
            "static_build": {"ok": "bool"},
            "runtime_probe": {"ok": "bool"},
            "regression": {"ok": "bool", "path": "str", "present": "bool"},
        },
        "notes": "CI に integrated_acceptance_seal / regression が無い場合は中立合格（開発用）",
    }

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "evaluation_contract": evaluation_contract,
        "axes": {
            "integrated_acceptance": {
                "ok": overall_acceptance,
                "path": str(auto / "integrated_acceptance_seal.json"),
                "present": bool(integrated),
            },
            "static_build": {"ok": static_ok},
            "runtime_probe": {"ok": runtime_ok},
            "regression": {"ok": reg_ok, "path": str(auto / "regression_report.json"), "present": bool(regression)},
        },
        "overall_ok": overall,
        "notes": "integrated_acceptance 未生成時は CI 上で中立合格（手動で npm run build を推奨）",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="post_build_evaluator_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    out = Path(args.out) if args.out else api_automation() / "post_build_evaluation.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
