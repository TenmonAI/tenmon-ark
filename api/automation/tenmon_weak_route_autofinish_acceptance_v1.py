#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import time
from typing import Any

CARD = "TENMON_WEAK_ROUTE_AUTOFINISH_ACCEPTANCE_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _row(rows: list[dict[str, Any]], label: str) -> dict[str, Any]:
    for r in rows:
        if str(r.get("label")) == label:
            return r
    return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    src = json.load(open(args.inp, encoding="utf-8"))
    rows = src.get("rows") if isinstance(src.get("rows"), list) else []
    k1a = _row(rows, "k1_hokekyo")
    k1b = _row(rows, "k1_sokushin")
    cpt = _row(rows, "concept_suika")
    slf = _row(rows, "self_tenmon")

    k1_ok = all(
        [
            str(k1a.get("routeReason") or "") == "K1_TRACE_EMPTY_GATED_V1",
            str(k1b.get("routeReason") or "") == "K1_TRACE_EMPTY_GATED_V1",
            int(k1a.get("response_len") or 0) >= 120,
            int(k1b.get("response_len") or 0) >= 120,
            not bool(k1a.get("response_has_toc_like")),
            not bool(k1b.get("response_has_toc_like")),
            bool(k1a.get("thoughtGuideSummary") is not None),
            bool(k1a.get("personaConstitutionSummary") is not None),
            bool(k1b.get("thoughtGuideSummary") is not None),
            bool(k1b.get("personaConstitutionSummary") is not None),
        ]
    )
    concept_ok = all(
        [
            str(cpt.get("routeReason") or "") == "TENMON_CONCEPT_CANON_V1",
            bool(str(cpt.get("centerMeaning") or "").strip()),
            bool(str(cpt.get("sourcePack") or "").strip()),
            not bool(cpt.get("response_has_prefix_glitch")),
        ]
    )
    self_ok = int(slf.get("response_len") or 0) >= 50 and str(slf.get("routeReason") or "").strip() != ""

    out = {
        "card": CARD,
        "generated_at": utc(),
        "k1_status": {"ok": k1_ok},
        "concept_status": {"ok": concept_ok},
        "self_status": {"ok": self_ok},
        "overall_pass": bool(k1_ok and concept_ok and self_ok),
    }
    with open(args.out, "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, indent=2)
    print(json.dumps({"ok": True, "out": args.out, "overall_pass": out["overall_pass"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

