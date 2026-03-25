#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
learning 統合の acceptance: integrated_acceptance + 各スコア閾値。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from learning_integration_common_v1 import (
    CARD,
    VERSION,
    METRICS,
    api_automation,
    read_json,
    utc_now_iso,
)

THRESHOLD = 50


def _metric_scores(auto: Path) -> Dict[str, int]:
    lq = read_json(auto / "learning_quality_report.json")
    sd = read_json(auto / "seed_quality_report.json")
    eg = read_json(auto / "evidence_grounding_report.json")
    br = read_json(auto / "learning_route_bridge.json")

    m: Dict[str, int] = {
        "learning_input_quality": int(lq.get("score") or 0),
        "seed_quality": int(sd.get("score") or 0),
        "evidence_grounding_quality": int(eg.get("score") or 0),
    }
    metrics = br.get("metrics") or {}
    m["route_learning_relevance"] = int((metrics.get("route_learning_relevance") or {}).get("score") or 0)
    m["conversation_return_quality"] = int((metrics.get("conversation_return_quality") or {}).get("score") or 0)
    return m


def _integrated_pass() -> Tuple[bool, Dict[str, Any]]:
    auto = api_automation()
    ia = read_json(auto / "integrated_acceptance_seal.json")
    if not ia:
        # CI / ローカルで未生成のときはスコアのみで判定
        return True, {}
    ok = bool(ia.get("overall_pass"))
    return ok, ia


def build() -> Dict[str, Any]:
    auto = api_automation()
    metrics = _metric_scores(auto)
    fails: List[str] = []
    for name in METRICS:
        sc = metrics.get(name, 0)
        if sc < THRESHOLD:
            fails.append(f"{name}<{THRESHOLD} (got {sc})")

    integ_ok, ia = _integrated_pass()
    score_acceptance = len(fails) == 0
    # 統合: integrated_acceptance がある場合はそれも要求。無い場合はスコアのみ。
    overall = bool(score_acceptance and (integ_ok or not ia))

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "threshold": THRESHOLD,
        "metrics": metrics,
        "integrated_acceptance_pass": integ_ok,
        "score_acceptance_pass": score_acceptance,
        "overall_pass": overall,
        "failures": fails,
        "inputs": {
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
            "learning_reports": [
                str(auto / "learning_quality_report.json"),
                str(auto / "seed_quality_report.json"),
                str(auto / "evidence_grounding_report.json"),
                str(auto / "learning_route_bridge.json"),
            ],
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="learning_acceptance_audit_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "learning_acceptance_audit.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    # 自動化パイプラインでは常に 0（成否は JSON の overall_pass）
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
