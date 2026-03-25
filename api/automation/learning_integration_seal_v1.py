#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
learning OS 統合シール: スコア変化 + acceptance を集約し VPS マーカーを書く。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

from learning_integration_common_v1 import (
    CARD,
    FAIL_NEXT,
    VERSION,
    VPS_CARD,
    api_automation,
    baseline_path,
    read_json,
    utc_now_iso,
)


def _run(mod: str) -> None:
    py = api_automation() / mod
    subprocess.run([sys.executable, str(py)], cwd=str(api_automation()), check=False)


def main() -> int:
    ap = argparse.ArgumentParser(description="learning_integration_seal_v1")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--skip-submodules", action="store_true", help="既存 JSON のみで seal 再計算")
    args = ap.parse_args()

    auto = api_automation()

    if not args.skip_submodules:
        _run("learning_quality_scorer_v1.py")
        _run("seed_quality_scorer_v1.py")
        _run("evidence_grounding_scorer_v1.py")
        _run("conversation_learning_bridge_v1.py")
        _run("learning_to_route_bridge_v1.py")
        subprocess.run([sys.executable, str(auto / "learning_acceptance_audit_v1.py")], cwd=str(auto), check=False)

    lq = read_json(auto / "learning_quality_report.json")
    sd = read_json(auto / "seed_quality_report.json")
    eg = read_json(auto / "evidence_grounding_report.json")
    br = read_json(auto / "learning_route_bridge.json")
    cl = read_json(auto / "conversation_learning_bridge.json")
    audit = read_json(auto / "learning_acceptance_audit.json")
    base = read_json(baseline_path())

    metrics_flat = {
        "learning_input_quality": int(lq.get("score") or 0),
        "seed_quality": int(sd.get("score") or 0),
        "evidence_grounding_quality": int(eg.get("score") or 0),
        "route_learning_relevance": int((br.get("metrics") or {}).get("route_learning_relevance", {}).get("score") or 0),
        "conversation_return_quality": int((br.get("metrics") or {}).get("conversation_return_quality", {}).get("score") or 0),
    }

    prev = base.get("metrics") or {}
    deltas: Dict[str, Any] = {}
    for k, v in metrics_flat.items():
        if k in prev:
            try:
                deltas[k] = int(v) - int(prev[k])
            except Exception:
                deltas[k] = None
        else:
            deltas[k] = None

    overall_pass = bool(audit.get("overall_pass"))
    seal: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "overall_pass": overall_pass,
        "bridge_verdict": cl.get("verdict"),
        "metrics": metrics_flat,
        "score_deltas_vs_baseline": deltas,
        "baseline_path": str(baseline_path()),
        "baseline_loaded": bool(base),
        "acceptance_audit": {
            "integrated_acceptance_pass": audit.get("integrated_acceptance_pass"),
            "score_acceptance_pass": audit.get("score_acceptance_pass"),
            "failures": audit.get("failures") or [],
        },
        "inputs": {
            "learning_quality_report": str(auto / "learning_quality_report.json"),
            "seed_quality_report": str(auto / "seed_quality_report.json"),
            "evidence_grounding_report": str(auto / "evidence_grounding_report.json"),
            "conversation_learning_bridge": str(auto / "conversation_learning_bridge.json"),
            "learning_route_bridge": str(auto / "learning_route_bridge.json"),
            "learning_acceptance_audit": str(auto / "learning_acceptance_audit.json"),
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
        },
        "next_queue_hint": {
            "learning_dispatch_for_conversation_queue": (
                cl.get("learning_blocker_dispatch_for_improvement_queue") or []
            )[:8],
        },
    }

    (auto / "learning_integration_seal.json").write_text(
        json.dumps(seal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    (auto / "TENMON_LEARNING_INTEGRATION_OS_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\noverall_pass={overall_pass}\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"ok": True, "overall_pass": overall_pass}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
