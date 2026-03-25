#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""以前の pass baseline と現在の acceptance を比較"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def compare(baseline: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    bo = baseline.get("overall_pass")
    co = current.get("overall_pass")
    return {
        "baseline_present": bool(baseline),
        "baseline_overall_pass": bo,
        "current_overall_pass": co,
        "regression_detected": bo is True and co is False,
        "improved_from_fail": bo is False and co is True,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="regression_checker_v1")
    ap.add_argument("--current-seal", type=str, required=True, help="integrated_acceptance_seal.json")
    ap.add_argument("--baseline", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    auto = Path(__file__).resolve().parent
    base_path = Path(args.baseline) if args.baseline else auto / "vps_acceptance_baseline_v1.json"
    baseline = _read(base_path)
    current = _read(Path(args.current_seal))
    body = {
        "version": 1,
        "card": "TENMON_VPS_ACCEPTANCE_REGRESSION_CHECKER_V1",
        "baseline_path": str(base_path),
        "comparison": compare(baseline, current),
        "overall_regression_risk": "unknown" if not baseline else "see_axes",
    }
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else auto / "regression_report.json"
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
