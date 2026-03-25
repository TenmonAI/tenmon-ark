#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1
会話品質の current-run 集計（read-only 成果物 + scripture naturalizer プローブ）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_RETRY_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_bool(x: Any) -> bool:
    return bool(x is True or x == 1 or x == "true")


def has_generated_at(obj: dict[str, Any]) -> bool:
    return bool(obj.get("generated_at") or obj.get("timestamp") or obj.get("generatedAt"))


def _meta_leak_from_sources(stopbleed: dict[str, Any], verdict: dict[str, Any]) -> int:
    n = int(stopbleed.get("meta_leak_count", 0) or 0)
    if n:
        return n
    intel = stopbleed.get("intel_v2_aggregate") or {}
    if isinstance(intel, dict) and intel.get("meta_leak_count") is not None:
        return int(intel.get("meta_leak_count") or 0)
    return int(verdict.get("meta_leak_count", 0) or 0)


def _technical_misroute_count(scorecard: dict[str, Any], nat: dict[str, Any]) -> int:
    n = 0
    subs = scorecard.get("subsystems") or {}
    cb = subs.get("conversation_backend") if isinstance(subs, dict) else {}
    if isinstance(cb, dict):
        for b in cb.get("primary_blockers") or []:
            if "misroute" in str(b).lower() or "route" in str(b).lower():
                n += 1
    for row in nat.get("results") or []:
        if not isinstance(row, dict):
            continue
        rr = str(row.get("routeReason") or "")
        msg = str(row.get("message") or "")
        if "TECHNICAL" in rr and ("typescript" in msg.lower() or "sqlite" in msg.lower() or "rate" in msg.lower()):
            if rr != "TECHNICAL_IMPLEMENTATION_V1":
                n += 1
    return n


def _k1_short_count(nat: dict[str, Any]) -> int:
    c = 0
    for row in nat.get("results") or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("routeReason") or "") != "K1_TRACE_EMPTY_GATED_V1":
            continue
        ln = int(row.get("natural_length") or 0)
        head = str(row.get("response_head") or "")
        if ln > 0 and ln < 100:
            c += 1
        elif ln == 0 and len(head) < 100:
            c += 1
    return c


_GENERIC_GREETING_PATTERNS = re.compile(
    r"(お手伝いできます|役に立てれば|何かお手伝い|ご質問があれば|ChatGPT|GPTとして|大規模言語モデル)",
    re.I,
)


def _greeting_drift_count(nat: dict[str, Any]) -> int:
    c = 0
    for row in nat.get("results") or []:
        if not isinstance(row, dict):
            continue
        msg = str(row.get("message") or "")
        head = str(row.get("response_head") or "")
        if re.search(r"^(こんにちは|おはよう|はじめまして)", msg.strip()):
            if _GENERIC_GREETING_PATTERNS.search(head):
                c += 1
    return c


def _threadid_consistent(scorecard: dict[str, Any]) -> bool:
    fixes = scorecard.get("must_fix_before_claim") or []
    for f in fixes:
        if "sessionId_reference_in_mainline_web_src" in str(f):
            return False
    return True


def _score_delta(scorecard: dict[str, Any]) -> float:
    return float(scorecard.get("score_delta_vs_prior", 0) or 0)


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_worldclass_dialogue_quality_finish_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--skip-operable-precondition",
        action="store_true",
        help="final operable PASS を確認せず集計のみ（開発用）",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    operable = read_json(auto / "tenmon_autonomy_final_operable_acceptance_summary.json")
    precondition_ok = safe_bool(operable.get("pass")) or safe_bool(operable.get("operable_autonomy_ready"))
    if not args.skip_operable_precondition and not precondition_ok:
        out = {
            "card": CARD,
            "generated_at": utc(),
            "precondition_pass": False,
            "precondition_fail_reason": "tenmon_autonomy_final_operable_acceptance_not_pass",
            "pass": False,
            "next_on_pass": NEXT_ON_PASS,
            "next_on_fail": NEXT_ON_FAIL,
        }
        write_json(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json", out)
        (auto / "tenmon_worldclass_dialogue_quality_finish_report.md").write_text(
            f"# {CARD}\n\nprecondition failed.\n", encoding="utf-8"
        )
        return 1

    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    system_v = read_json(auto / "tenmon_system_verdict.json")
    verdict = read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    stopbleed = read_json(auto / "tenmon_chat_surface_stopbleed_summary.json")
    nat = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
    pwa_trace = read_json(auto / "pwa_real_chat_trace.json")

    meta_leak_count = _meta_leak_from_sources(stopbleed, verdict)
    scripture_raw_count = int(nat.get("raw_ocr_dump_count", 0) or 0)
    technical_misroute_count = _technical_misroute_count(scorecard, nat)
    k1_short_or_fragment_count = _k1_short_count(nat)
    greeting_generic_drift_count = _greeting_drift_count(nat)
    threadid_surface_consistent = _threadid_consistent(scorecard)

    must_fix = [str(x) for x in (scorecard.get("must_fix_before_claim") or [])]
    conv_quality_hits = [x for x in must_fix if "conversation" in x.lower() or "continuity" in x.lower() or "pwa_lived" in x]

    turns = pwa_trace.get("turns") if isinstance(pwa_trace.get("turns"), list) else []
    api_vs_pwa_dialogue_gap_reduced = bool(turns) and meta_leak_count == 0 and threadid_surface_consistent

    worldclass_dialogue_score_delta = _score_delta(scorecard)

    mandatory_pass = (
        meta_leak_count == 0
        and scripture_raw_count <= 1
        and technical_misroute_count == 0
        and k1_short_or_fragment_count == 0
        and greeting_generic_drift_count == 0
        and threadid_surface_consistent
    )

    desirable_pass = (
        worldclass_dialogue_score_delta > 0
        and len(conv_quality_hits) == 0
        and api_vs_pwa_dialogue_gap_reduced
    )

    out = {
        "card": CARD,
        "generated_at": utc(),
        "precondition_pass": True,
        "meta_leak_count": meta_leak_count,
        "scripture_raw_count": scripture_raw_count,
        "technical_misroute_count": technical_misroute_count,
        "k1_short_or_fragment_count": k1_short_or_fragment_count,
        "greeting_generic_drift_count": greeting_generic_drift_count,
        "threadid_surface_consistent": threadid_surface_consistent,
        "worldclass_dialogue_score_delta": worldclass_dialogue_score_delta,
        "must_fix_conversation_quality_hits": conv_quality_hits,
        "api_vs_pwa_dialogue_gap_reduced": api_vs_pwa_dialogue_gap_reduced,
        "mandatory_pass": mandatory_pass,
        "desirable_pass": desirable_pass,
        "pass": mandatory_pass,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "inputs": {
            "operable": str(auto / "tenmon_autonomy_final_operable_acceptance_summary.json"),
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "system_verdict": str(auto / "tenmon_system_verdict.json"),
            "rejudge_verdict": str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
            "stopbleed": str(auto / "tenmon_chat_surface_stopbleed_summary.json"),
            "scripture_naturalizer": str(auto / "tenmon_scripture_naturalizer_summary.json"),
        },
    }

    summary_path = auto / "tenmon_worldclass_dialogue_quality_finish_summary.json"
    report_path = auto / "tenmon_worldclass_dialogue_quality_finish_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- mandatory_pass: `{mandatory_pass}`",
                f"- desirable_pass: `{desirable_pass}`",
                f"- meta_leak_count: `{meta_leak_count}`",
                f"- scripture_raw_count: `{scripture_raw_count}`",
                f"- technical_misroute_count: `{technical_misroute_count}`",
                f"- k1_short_or_fragment_count: `{k1_short_or_fragment_count}`",
                f"- greeting_generic_drift_count: `{greeting_generic_drift_count}`",
                f"- threadid_surface_consistent: `{threadid_surface_consistent}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if mandatory_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
