#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
learning_quality_bridge.json — conversation / seed / evidence / learning_input を統合スコア化（PARENT_05）。
read-only: 既存レポート JSON のみ読む（chat.ts 非改変）。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_05_IMPROVEMENT_QUALITY_BRIDGE_CURSOR_AUTO_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def build() -> Dict[str, Any]:
    auto = api_automation()
    lq = _read(auto / "learning_quality_report.json")
    sd = _read(auto / "seed_quality_report.json")
    eg = _read(auto / "evidence_grounding_report.json")
    cl = _read(auto / "conversation_learning_bridge.json")

    s_lq = int(lq.get("score") or 0)
    s_sd = int(sd.get("score") or 0)
    s_eg = int(eg.get("score") or 0)
    composite = int(round((s_lq + s_sd + s_eg) / 3)) if (lq or sd or eg) else 0

    verdict = str(cl.get("verdict") or "idle")
    adj = {"connect": 5, "gap": -20, "idle": 0}.get(verdict, 0)
    learn_n = int((cl.get("summary") or {}).get("learning_blocker_count") or 0)
    conv_n = int((cl.get("summary") or {}).get("conversation_blocker_count") or 0)
    gap_penalty = min(15, learn_n + conv_n) if verdict == "gap" else 0

    unified = max(0, min(100, composite + adj - gap_penalty))
    threshold = 45
    learning_quality_fail = unified < threshold

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "scores": {
            "learning_input_quality": s_lq,
            "seed_quality": s_sd,
            "evidence_grounding_quality": s_eg,
            "composite_mean": composite,
            "conversation_bridge_verdict": verdict,
            "unified_score": unified,
        },
        "thresholds": {
            "learning_quality_fail_below": threshold,
            "learning_quality_fail": learning_quality_fail,
        },
        "inputs": {
            "learning_quality_report": str(auto / "learning_quality_report.json"),
            "seed_quality_report": str(auto / "seed_quality_report.json"),
            "evidence_grounding_report": str(auto / "evidence_grounding_report.json"),
            "conversation_learning_bridge": str(auto / "conversation_learning_bridge.json"),
        },
        "notes": "悪質 seed/evidence を増やさないよう unified を fail_classifier / 自己改善ループへ接続する",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="improvement_quality_bridge_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "learning_quality_bridge.json"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
