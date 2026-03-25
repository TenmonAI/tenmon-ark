#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2 補助:
seal が出力した runtime_matrix.json から routeReason を抽出し、
route_reason_extract.json / route_authority_audit.json を書く。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def _extract_route_reason(body: str) -> str | None:
    m = re.findall(r'"routeReason"\s*:\s*"([^"]+)"', body)
    return m[0] if m else None


def main() -> int:
    if len(sys.argv) < 4:
        print(
            "usage: chat_ts_stage2_route_snapshot_v1.py <runtime_matrix.json> <route_reason_extract.json> <route_authority_audit.json>",
            file=sys.stderr,
        )
        return 2
    src = Path(sys.argv[1])
    out_extract = Path(sys.argv[2])
    out_audit = Path(sys.argv[3])
    data = json.loads(src.read_text(encoding="utf-8", errors="replace"))
    extract: dict = {}
    for k, v in data.items():
        if k.startswith("_") or not isinstance(v, dict):
            continue
        rr = None
        if v.get("ok") and isinstance(v.get("body"), str):
            rr = _extract_route_reason(v["body"])
        extract[k] = {"ok": bool(v.get("ok")), "routeReason": rr, "error": v.get("error")}
    out_extract.write_text(json.dumps(extract, ensure_ascii=False, indent=2), encoding="utf-8")

    def rr(name: str) -> str | None:
        return (extract.get(name) or {}).get("routeReason")

    g = rr("general_1")
    cmp_ = rr("compare_1")
    lf = rr("longform_1")
    sa = rr("selfaware_1")
    sc = rr("scripture_1")

    audit = {
        "version": 1,
        "card": "CHAT_TS_STAGE2_ROUTE_AUTHORITY_V2",
        "flags": {
            "general_1_still_ai_def_lock": g == "AI_DEF_LOCK_V1",
            "compare_1_system_diagnosis": cmp_ == "SYSTEM_DIAGNOSIS_PREEMPT_V1",
            "longform_1_system_diagnosis": lf == "SYSTEM_DIAGNOSIS_PREEMPT_V1",
            "selfaware_1_system_diagnosis": sa == "SYSTEM_DIAGNOSIS_PREEMPT_V1",
            "scripture_1_def_fastpath_only": sc == "DEF_FASTPATH_VERIFIED_V1",
        },
        "routeReason_by_probe": {k: extract[k].get("routeReason") for k in sorted(extract.keys())},
    }
    out_audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
