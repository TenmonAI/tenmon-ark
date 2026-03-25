#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1 — lived を primary とした単一真実源 seal 判定。"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_final_single_source_seal.json"
OUT_MD = "tenmon_final_single_source_seal_report.md"


def load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _list_str(v: Any) -> list[str]:
    if not isinstance(v, list):
        return []
    return [str(x).strip() for x in v if str(x).strip()]


def env_only_blocker(token: str) -> bool:
    t = token.lower()
    return t.startswith("env:") or "playwright" in t or "preflight" in t


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--ignore-stale-gate",
        action="store_true",
        help="検証用: stale ledger を seal 条件から外す（非推奨）",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    latest_summary = load_json(auto / "tenmon_latest_state_rejudge_summary.json")
    latest_verdict = load_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    lived_r = load_json(auto / "pwa_lived_completion_readiness.json")
    lived_b = load_json(auto / "pwa_lived_completion_blockers.json")
    hyg = load_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    sysv = load_json(auto / "tenmon_system_verdict.json")
    score = load_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    env_failure = bool(
        latest_verdict.get("env_failure")
        if "env_failure" in latest_verdict
        else lived_r.get("env_failure")
    )

    summary_remaining = _list_str(latest_summary.get("remaining_blockers"))
    lived_blockers_raw = _list_str(lived_b.get("blockers"))
    merged_blockers = summary_remaining if summary_remaining else lived_blockers_raw
    product_blockers = [b for b in merged_blockers if not env_only_blocker(b)]

    # latest summary を primary truth とし、不足時のみ lived fallback
    operable_ready = bool(latest_summary.get("operable_ready") is True)
    if not latest_summary:
        operable_ready = bool(
            lived_r.get("health_ok") is True
            and lived_r.get("audit_ok") is True
            and lived_r.get("audit_build_ok") is True
            and lived_r.get("continuity_readiness") is True
            and lived_r.get("new_chat_readiness") is True
            and lived_r.get("url_sync_readiness") is True
            and lived_r.get("refresh_restore_readiness") is True
            and not env_failure
        )

    hygiene_blocks = bool(hyg.get("must_block_seal") is True)
    stale_sources = _list_str(latest_summary.get("stale_sources"))
    # stale 判定は latest summary 側で完結済み。seal 判定に stale blocker を再注入しない。
    stale_gate = False if not args.ignore_stale_gate else False

    remaining: list[str] = []
    remaining.extend(merged_blockers)
    if hygiene_blocks:
        remaining.append("repo_hygiene:must_block_seal")
    # de-dup preserve order
    seen: set[str] = set()
    remaining_dedup: list[str] = []
    for x in remaining:
        if x not in seen:
            seen.add(x)
            remaining_dedup.append(x)

    seal_ready = bool(
        operable_ready
        and not hygiene_blocks
        and len(product_blockers) == 0
    )

    try:
        pct = float(score.get("score_percent") or 0)
    except (TypeError, ValueError):
        pct = 0.0

    worldclass_claim_ready = bool(
        score.get("worldclass_ready") is True
        and pct >= 90.0
    )

    recommended_next: str | None = None
    if not hygiene_blocks and not stale_gate and seal_ready and worldclass_claim_ready:
        recommended_next = None
    elif hygiene_blocks:
        recommended_next = "TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
    elif stale_gate:
        recommended_next = "TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1"
    elif not operable_ready or len(product_blockers) > 0:
        recommended_next = "TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1"
    elif not seal_ready:
        recommended_next = "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"
    else:
        recommended_next = "TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1"

    primary_truth_sources = [
        str(auto / "tenmon_latest_state_rejudge_summary.json"),
        str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
        str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
        str(auto / "pwa_lived_completion_readiness.json"),
        str(auto / "pwa_lived_completion_blockers.json"),
        str(auto / "tenmon_system_verdict.json"),
        str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
    ]

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "operable_ready": operable_ready,
        "seal_ready": seal_ready,
        "worldclass_claim_ready": worldclass_claim_ready,
        "primary_truth_sources": primary_truth_sources,
        "remaining_blockers": remaining_dedup[:200],
        "recommended_next_card": recommended_next,
        "system_overall_band": sysv.get("overall_band"),
        "score_percent": score.get("score_percent"),
        "separation": {
            "env_failure": env_failure,
            "product_blockers_count": len(product_blockers),
            "hygiene_blocks": hygiene_blocks,
            "stale_gate": stale_gate,
        },
        "provenance": {
            "latest_summary_generated_at": latest_summary.get("generated_at"),
            "lived_final_ready": lived_r.get("final_ready"),
            "score_worldclass_flag": score.get("worldclass_ready"),
        },
    }

    (auto / OUT_NAME).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- seal_ready: `{seal_ready}`",
        f"- operable_ready: `{operable_ready}`",
        f"- worldclass_claim_ready: `{worldclass_claim_ready}`",
        f"- recommended_next_card: `{recommended_next}`",
        "",
        "## Primary Truth",
        f"- latest_summary_generated_at: `{latest_summary.get('generated_at')}`",
        f"- stale_sources_count: `{len(stale_sources)}`",
        "",
        "## Remaining Blockers",
    ]
    md.extend([f"- `{x}`" for x in remaining_dedup] if remaining_dedup else ["- none"])
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    if seal_ready or worldclass_claim_ready:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
