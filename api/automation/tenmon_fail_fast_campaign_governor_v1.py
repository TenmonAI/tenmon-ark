#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_fail_fast_campaign_governor_verdict.json"
OUT_MD = "tenmon_fail_fast_campaign_governor_report.md"

ALLOWED_NEXT = (
    "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1",
    "TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1",
    "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1",
)


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def pick_one(*candidates: str | None) -> str | None:
    for c in candidates:
        if c and c in ALLOWED_NEXT:
            return c
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    latest = load_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    stale = load_json(auto / "tenmon_stale_evidence_invalidation_verdict.json")
    operable = load_json(auto / "tenmon_final_operable_seal.json")
    claim = load_json(auto / "tenmon_final_worldclass_claim_gate.json")
    sysv = load_json(auto / "tenmon_system_verdict.json")

    operable_sealed = bool(
        operable.get("operable_sealed") is True
        or (operable.get("pass") is True and operable.get("operable_sealed") is not False)
    )
    claim_resolved = bool("claim_allowed" in claim and "claim_forbidden_reasons" in claim)
    claim_allowed = bool(claim.get("claim_allowed") is True)
    claim_forbidden = bool(claim_resolved and not claim_allowed)

    repo_block = bool(operable.get("axes", {}).get("repo_must_block_seal") is True)
    env_fail = bool(latest.get("env_failure") is True)
    product_fail = bool(latest.get("product_failure") is True)
    stale_detected = bool(stale.get("stale_detected") is True)
    documented = bool(latest and operable and claim and sysv)

    reason = ""
    campaign_stop = False
    one_next_card_max: str | None = None
    finish_band = "continue_required"

    if operable_sealed and claim_resolved:
        campaign_stop = True
        finish_band = "sealed_and_claim_resolved"
        if claim_allowed:
            reason = "operable sealed and worldclass claim allowed"
        else:
            reason = "operable sealed and claim gate resolved as forbidden"
    elif claim_forbidden and documented:
        # claim 禁止だが現況証跡が揃っており、より確信度の高い次手がないなら停止
        if repo_block or product_fail or stale_detected:
            campaign_stop = False
            finish_band = "forbidden_with_actionable_blocker"
            one_next_card_max = pick_one("TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1")
            reason = "claim forbidden with active blocker; one remediation card remains"
        else:
            campaign_stop = True
            finish_band = "claim_forbidden_documented_final"
            reason = "claim forbidden is documented and no higher-confidence next step remains"
    elif not claim_resolved:
        campaign_stop = False
        finish_band = "claim_gate_unresolved"
        one_next_card_max = pick_one("TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1")
        reason = "claim gate unresolved due to missing current verdict"
    elif not operable_sealed:
        campaign_stop = False
        finish_band = "operable_not_sealed"
        if env_fail:
            one_next_card_max = pick_one("TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1")
            reason = "operable not sealed and env failure is active"
        else:
            one_next_card_max = pick_one("TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1")
            reason = "operable not sealed and blocker can be focused to one seal card"
    else:
        campaign_stop = True
        finish_band = "full_stop"
        reason = "no safe additional card is justified"

    # D: FAIL でも next は 1枚以下 / PASS は停止
    if campaign_stop:
        one_next_card_max = None
        pass_flag = True
        operator_message = "Campaign stop approved. 追加カードなしで終了する。"
    else:
        pass_flag = False
        if one_next_card_max is None:
            one_next_card_max = pick_one("TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1")
        operator_message = f"Campaign continues with single next card: {one_next_card_max}"

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "pass": pass_flag,
        "campaign_stop": campaign_stop,
        "current_finish_band": finish_band,
        "operable_state": {
            "operable_sealed": operable_sealed,
            "pass": bool(operable.get("pass")),
            "seal_band": operable.get("seal_band"),
        },
        "worldclass_claim_state": {
            "claim_resolved": claim_resolved,
            "claim_allowed": claim_allowed,
            "worldclass_ready": bool(claim.get("worldclass_ready")),
            "claim_forbidden_reasons": claim.get("claim_forbidden_reasons") or [],
        },
        "one_next_card_max": one_next_card_max,
        "reason": reason,
        "final_operator_message": operator_message,
        "separation": {
            "env_fail": env_fail,
            "product_fail": product_fail,
            "claim_fail": claim_forbidden,
        },
        "inputs": {
            "tenmon_latest_state_rejudge_and_seal_refresh_verdict": str(
                auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
            ),
            "tenmon_stale_evidence_invalidation_verdict": str(
                auto / "tenmon_stale_evidence_invalidation_verdict.json"
            ),
            "tenmon_final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
            "tenmon_final_worldclass_claim_gate": str(auto / "tenmon_final_worldclass_claim_gate.json"),
            "tenmon_system_verdict": str(auto / "tenmon_system_verdict.json"),
        },
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- pass: `{pass_flag}`",
        f"- campaign_stop: `{campaign_stop}`",
        f"- current_finish_band: `{finish_band}`",
        f"- one_next_card_max: `{one_next_card_max}`",
        f"- reason: `{reason}`",
        "",
        "## State Split",
        f"- env_fail: `{env_fail}`",
        f"- product_fail: `{product_fail}`",
        f"- claim_fail: `{claim_forbidden}`",
        "",
        "## Operator Message",
        f"- {operator_message}",
    ]
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if pass_flag else 1


if __name__ == "__main__":
    raise SystemExit(main())
