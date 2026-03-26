#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1

K1 → SUBCONCEPT → GENERAL/self_view の順固定キャンペーンの single-source。
観測のみ（scorecard / state JSON）。成功の捏造はしない。
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_k1_subconcept_general_execution_campaign.json"
STATE_JSON = "tenmon_k1_subconcept_general_campaign_state.json"

ORDERED_CARDS: list[str] = [
    "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
    "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
]

VERIFICATION_CHAIN = [
    "build (api)",
    "process restart",
    "GET /api/health",
    "GET /api/audit.build",
    "conversation / dialogue probes (固定セット)",
]

NEXT_ON_PASS = "TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_RETRY_CURSOR_AUTO_V1"

# scorecard must_fix 行のうち会話品質キャンペーン関連の観測用フィルタ（緩め・観測のみ）
_DIALOGUE_BLOCKER_RE = re.compile(
    r"conversation_|pwa_lived_proof:chat|subconcept|k1|general_knowledge|self_view|dialogue|continuity|threadId|empty_response",
    re.I,
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def filter_dialogue_blockers(must_fix: list[Any]) -> list[str]:
    out: list[str] = []
    for x in must_fix:
        if not isinstance(x, str):
            continue
        s = x.strip()
        if s and _DIALOGUE_BLOCKER_RE.search(s):
            out.append(s)
    return out


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    state_path = Path(os.environ.get("TENMON_K1SG_CAMPAIGN_STATE", str(auto / STATE_JSON))).expanduser()
    st = read_json(state_path)
    raw_completed = st.get("completed_up_to_index", st.get("completed_up_to_step"))
    try:
        completed = int(raw_completed) if raw_completed is not None else -1
    except (TypeError, ValueError):
        completed = -1
    completed = max(-1, min(completed, len(ORDERED_CARDS) - 1))

    next_idx = completed + 1
    if next_idx >= len(ORDERED_CARDS):
        current_focus_card: str | None = None
        linear_status = "linear_sequence_complete"
        current_index: int | None = None
    else:
        current_focus_card = ORDERED_CARDS[next_idx]
        linear_status = "in_progress"
        current_index = next_idx

    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    forensic = read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    must_fix = scorecard.get("must_fix_before_claim") if isinstance(scorecard.get("must_fix_before_claim"), list) else []
    dialogue_blockers = filter_dialogue_blockers(must_fix)

    nb = str(forensic.get("next_best_card") or scorecard.get("next_best_card") or "").strip()
    alignment_note = ""
    if nb and nb in ORDERED_CARDS:
        alignment_note = "forensic_or_scorecard_next_best_matches_campaign_card"
    elif nb:
        alignment_note = "next_best_differs_from_campaign_order_observation_only"

    out = {
        "card": CARD,
        "generated_at": utc(),
        "ordered_cards": list(ORDERED_CARDS),
        "verification_chain_fixed": list(VERIFICATION_CHAIN),
        "one_change_one_verify_note": "1変更=1検証。高リスクは1枚ずつ。routeReason の不要変更禁止。dist 直編集禁止。",
        "state_path": str(state_path),
        "completed_up_to_index": completed,
        "current_index": current_index,
        "current_focus_card": current_focus_card,
        "linear_status": linear_status,
        "scorecard_dialogue_blockers_observed": dialogue_blockers,
        "scorecard_dialogue_blocker_count": len(dialogue_blockers),
        "must_fix_total_count": len([x for x in must_fix if isinstance(x, str)]),
        "forensic_next_best_card": nb or None,
        "next_best_alignment_note": alignment_note,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(auto / OUT_JSON),
                "current_focus_card": current_focus_card,
                "linear_status": linear_status,
                "scorecard_dialogue_blockers_observed": dialogue_blockers,
                "verification_chain_fixed": VERIFICATION_CHAIN,
                "scorecard_dialogue_blocker_count": len(dialogue_blockers),
                "next_on_pass": NEXT_ON_PASS,
                "retry_card": RETRY_CARD,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
