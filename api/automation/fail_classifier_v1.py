#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fail_classification.json — VPS acceptance / forensics から失敗型を決定論的に分類"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Set

from self_repair_common_v1 import (
    CARD,
    FAIL_PRIMARY_ORDER,
    FAIL_TYPES,
    VERSION,
    api_automation,
    utc_now_iso,
)

FAIL_SET = set(FAIL_TYPES)


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _matrix_route_authority_hint(matrix_path: Path) -> bool:
    if not matrix_path.is_file():
        return False
    try:
        raw = matrix_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return False
    if '"status": 403' in raw or '"status": 401' in raw:
        return True
    low = raw.lower()
    return "forbidden" in low and "error" in low


def _matrix_partial_probe_fail(matrix_path: Path) -> bool:
    """runtime_matrix_all_ok が無い環境向け: 一部 ok:false があれば probe 失敗とみなす。"""
    data = _read(matrix_path)
    if not isinstance(data, dict):
        return False
    bad = 0
    tot = 0
    for k, row in data.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if not row.get("ok", False):
            bad += 1
    return tot > 0 and bad > 0


def classify(
    integrated: Dict[str, Any],
    report: Dict[str, Any],
    forensics: Dict[str, Any],
    dangerous_hint: bool,
) -> Dict[str, Any]:
    types: Set[str] = set()
    notes: List[str] = []
    auto = api_automation()

    if dangerous_hint:
        types.add("dangerous_patch")
        notes.append("dangerous_patch_blocker or large diff")

    static = (integrated.get("axes") or {}).get("static") or {}
    if not static.get("summary", {}).get("ok", True):
        types.add("build_fail")

    rt = (integrated.get("axes") or {}).get("runtime") or {}
    rsum = rt.get("summary") or {}
    if not rsum.get("health_ok", True):
        types.add("health_fail")
    if not rsum.get("audit_ok", True):
        types.add("audit_fail")
    if not rsum.get("runtime_matrix_all_ok", True):
        types.add("runtime_probe_fail")
        types.add("route_probe_fail")

    seal = (integrated.get("axes") or {}).get("seal_contract") or {}
    ssum = seal.get("summary") or {}
    if not ssum.get("skipped") and not ssum.get("ok", True):
        types.add("surface_noise_fail")
        types.add("surface_regression")

    reg = _read(auto / "regression_report.json").get("comparison") or {}
    if reg.get("regression_detected"):
        types.add("runtime_regression")

    st = str(forensics.get("systemctl_status", {}).get("stdout", ""))
    if forensics and ("failed" in st.lower() or "inactive" in st.lower()):
        types.add("restart_fail")

    mx = auto / "runtime_probe_matrix.json"
    if _matrix_route_authority_hint(mx):
        types.add("route_authority_fail")
        notes.append("runtime_probe_matrix suggests 401/403/forbidden")
    elif integrated.get("overall_pass") is False and _matrix_partial_probe_fail(mx):
        if not types.intersection({"runtime_probe_fail", "route_probe_fail"}):
            types.add("runtime_probe_fail")
            types.add("route_probe_fail")
            notes.append("runtime_probe_matrix partial failure (overall_pass false)")

    bridge = _read(auto / "learning_quality_bridge.json")
    if bridge.get("thresholds", {}).get("learning_quality_fail"):
        types.add("learning_quality_fail")
        notes.append("learning_quality_bridge.unified_score below threshold")

    types = {t for t in types if t in FAIL_SET}

    if not types and integrated.get("overall_pass") is False:
        types.add("runtime_regression")
        notes.append("fallback: overall_pass false")

    if not types:
        notes.append("no failure signal (overall_pass true)")

    primary = None
    for p in FAIL_PRIMARY_ORDER:
        if p in types:
            primary = p
            break
    if primary is None and types:
        primary = sorted(types)[0]

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "fail_types": sorted(types),
        "primary_fail_type": primary,
        "notes": notes,
        "inputs": {
            "overall_pass": integrated.get("overall_pass"),
            "learning_quality_bridge": str(auto / "learning_quality_bridge.json"),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="fail_classifier_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    auto = api_automation()
    integrated = _read(auto / "integrated_acceptance_seal.json")
    report = _read(auto / "vps_acceptance_report.json")
    forensics = _read(auto / "failure_forensics_bundle.json")
    dpb = _read(auto / "dangerous_patch_blocker_report.json")
    dangerous = bool(dpb.get("blocked"))
    body = classify(integrated, report, forensics, dangerous)
    out = Path(args.out) if args.out else auto / "fail_classification.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out), "types": body["fail_types"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
