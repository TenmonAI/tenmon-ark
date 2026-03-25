#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE_CURSOR_AUTO_V1
会話継続 hold + frontend residue / hygiene の観測を verdict に固定（修復本体ではない）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE_CURSOR_AUTO_V1"
EVIDENCE_NAME = "pwa_frontend_residue_hygiene_evidence.json"
VERDICT_NAME = "tenmon_phase1_conversation_surface_verdict.json"
FAIL_NEXT = "TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE_RETRY_CURSOR_AUTO_V1"

# mainline から除外（別系統 session_id を維持）
EXCLUDE_MAINLINE_SESSIONID = (
    "TrainPage.tsx",
    "TrainingPage.tsx",
    "TrainPage",
    "TrainingPage",
)


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def scan_sessionid_mainline(repo: Path) -> tuple[int, list[str]]:
    web = repo / "web" / "src"
    hits: list[str] = []
    if not web.is_dir():
        return 0, []
    for p in web.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix not in (".ts", ".tsx", ".js", ".jsx"):
            continue
        rel = str(p.relative_to(repo))
        if any(x in rel for x in EXCLUDE_MAINLINE_SESSIONID):
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if re.search(r"\bsessionId\b", txt):
            hits.append(rel)
    return len(hits), sorted(set(hits))[:80]


def count_bak_noise(repo: Path) -> tuple[int, list[str]]:
    web = repo / "web" / "src"
    found: list[str] = []
    if not web.is_dir():
        return 0, []
    for p in web.rglob("*"):
        if not p.is_file():
            continue
        rel = str(p.relative_to(repo))
        low = rel.lower()
        if ".bak" in low or low.endswith(".bak"):
            found.append(rel)
    return len(found), sorted(found)[:120]


def route_from_chat_json(data: dict[str, Any]) -> str | None:
    df = data.get("decisionFrame")
    if not isinstance(df, dict):
        return None
    ku = df.get("ku")
    if isinstance(ku, dict) and ku.get("routeReason"):
        return str(ku.get("routeReason")).strip()
    return None


def dup_signal(a: str, b: str) -> bool:
    la = {x.strip() for x in a.splitlines() if len(x.strip()) >= 24}
    lb = {x.strip() for x in b.splitlines() if len(x.strip()) >= 24}
    return len(la & lb) > 0


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--chat1", type=str, default=os.environ.get("TENMON_PHASE1_CHAT1_JSON", ""))
    ap.add_argument("--chat2", type=str, default=os.environ.get("TENMON_PHASE1_CHAT2_JSON", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    sid_count, sid_paths = scan_sessionid_mainline(repo)
    bak_count, bak_paths = count_bak_noise(repo)

    hy = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    untracked = int(hy.get("untracked_count", 999999))
    must_block = bool(hy.get("must_block_seal"))

    chat1_path = Path(args.chat1) if args.chat1 else None
    chat2_path = Path(args.chat2) if args.chat2 else None
    c1 = read_json(chat1_path) if chat1_path and chat1_path.is_file() else {}
    c2 = read_json(chat2_path) if chat2_path and chat2_path.is_file() else {}

    rr1 = route_from_chat_json(c1) if c1 else None
    rr2 = route_from_chat_json(c2) if c2 else None
    r1 = str(c1.get("response") or "") if c1 else ""
    r2 = str(c2.get("response") or "") if c2 else ""

    _hold_ok = (
        "CONTINUITY_ROUTE_HOLD_V1",
        "CONTINUITY_ANCHOR_V1",
        "R22_NEXTSTEP_FOLLOWUP_V1",
        "R22_ESSENCE_FOLLOWUP_V1",
        "R22_COMPARE_FOLLOWUP_V1",
    )
    continuity_hold_pass = False
    if c2 and rr2:
        continuity_hold_pass = rr2 != "NATURAL_GENERAL_LLM_TOP" and (
            rr2 in _hold_ok or rr2.startswith("CONTINUITY_") or ("FOLLOWUP" in rr2 and rr2.startswith("R22_"))
        )

    duplication_reduced = bool(r1 and r2 and not dup_signal(r1, r2))

    # sessionId: mainline に 0 が理想
    sessionid_mainline_residue_count = sid_count

    repo_hygiene_improved = not must_block and untracked < 650

    fail_reasons: list[str] = []
    if sid_count > 0:
        fail_reasons.append("sessionId_reference_in_mainline_web_src")
    if bak_count > 40:
        fail_reasons.append("high_bak_noise_in_web_src")
    if must_block:
        fail_reasons.append("repo_hygiene_watchdog_must_block_seal")
    if c2 and rr2 == "NATURAL_GENERAL_LLM_TOP":
        fail_reasons.append("followup_still_natural_general_llm_top")
    if not continuity_hold_pass and c2:
        fail_reasons.append("continuity_hold_not_observed_in_probe")
    if not c1 or not c2:
        fail_reasons.append("chat_probe_json_missing")

    phase1_pass = (
        continuity_hold_pass
        and sessionid_mainline_residue_count == 0
        and bak_count <= 60
        and not must_block
        and bool(c1 and c2)
    )
    if c2 and rr2 == "NATURAL_GENERAL_LLM_TOP":
        phase1_pass = False

    evidence: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "sessionId_mainline_hits": sid_count,
        "sessionId_mainline_paths_sample": sid_paths[:40],
        "bak_file_count_web_src": bak_count,
        "bak_paths_sample": bak_paths[:40],
        "chat_probe": {
            "chat1_path": str(chat1_path) if chat1_path else None,
            "chat2_path": str(chat2_path) if chat2_path else None,
            "routeReason_turn1": rr1,
            "routeReason_turn2": rr2,
        },
        "repo_hygiene_watchdog": {
            "untracked_count": untracked,
            "must_block_seal": must_block,
        },
    }

    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "continuity_hold_pass": continuity_hold_pass,
        "duplication_reduced": duplication_reduced,
        "sessionid_mainline_residue_count": sessionid_mainline_residue_count,
        "bak_noise_count": bak_count,
        "repo_hygiene_improved": repo_hygiene_improved,
        "phase1_pass": phase1_pass,
        "fail_reasons": fail_reasons,
        "recommended_next_card": FAIL_NEXT if not phase1_pass else None,
        "evidence_paths": {
            "frontend_residue": str(auto / EVIDENCE_NAME),
            "repo_hygiene": str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
        },
    }

    (auto / EVIDENCE_NAME).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / VERDICT_NAME).write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))

    return 0 if phase1_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
