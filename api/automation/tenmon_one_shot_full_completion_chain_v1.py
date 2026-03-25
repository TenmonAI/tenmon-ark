#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ONE_SHOT_FULL_COMPLETION_CHAIN_CURSOR_AUTO_V1

completion 系カードを統合実行順で束ねる（個別カードの契約・スクリプトは変更しない）。
1) TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN（18 ステップ相当）
2) TENMON_FINAL_OPERABLE_SEAL
3) TENMON_FINAL_WORLDCLASS_CLAIM_GATE
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_ONE_SHOT_FULL_COMPLETION_CHAIN_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_one_shot_full_completion_chain.json"

PHASE_ASCENT = "TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1"
PHASE_OPERABLE = "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"
PHASE_CLAIM = "TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"

ASCENT_JSON = "tenmon_completion_ascent_master_campaign.json"
SEAL_JSON = "tenmon_final_operable_seal.json"
CLAIM_JSON = "tenmon_final_worldclass_claim_gate.json"


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_out(
    path: Path,
    *,
    executed_until: str,
    last_pass: str,
    failed: str,
    retry: str,
    seal_ready: bool,
    worldclass_ready: bool,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "card": CARD,
        "executed_until": executed_until,
        "last_pass_card": last_pass,
        "failed_card": failed,
        "recommended_retry_card": retry,
        "seal_ready": seal_ready,
        "worldclass_ready": worldclass_ready,
    }
    if extra:
        body["steps_detail"] = extra
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return body


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--restart-systemd", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    py = sys.executable
    out_path = auto / OUT_NAME

    ascent_py = auto / "tenmon_completion_ascent_master_campaign_v1.py"
    seal_py = auto / "tenmon_final_operable_seal_v1.py"
    claim_py = auto / "tenmon_final_worldclass_claim_gate_v1.py"

    steps_detail: dict[str, Any] = {
        "logical_chain": [
            "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1 … TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1 "
            f"→ delegated to {PHASE_ASCENT}",
            PHASE_OPERABLE,
            PHASE_CLAIM,
        ],
        "phases": [],
    }

    # --- Phase 1: Completion ascent (18 cards, fail-fast inside) ---
    ascent_argv = [
        py,
        str(ascent_py),
        "--repo-root",
        str(repo),
        "--base",
        str(args.base),
    ]
    if args.restart_systemd:
        ascent_argv.append("--restart-systemd")

    r1 = subprocess.run(ascent_argv, cwd=str(auto))
    ascent_data = read_json(auto / ASCENT_JSON)
    steps_detail["phases"].append(
        {
            "phase": PHASE_ASCENT,
            "exit_code": r1.returncode,
            "artifact": str(auto / ASCENT_JSON),
            "ascent_summary": {
                "executed_cards_tail": (ascent_data.get("executed_cards") or [])[-5:],
                "failed_card": ascent_data.get("failed_card"),
                "last_pass_card": ascent_data.get("last_pass_card"),
            },
        }
    )

    if r1.returncode != 0:
        retry = str(ascent_data.get("recommended_retry_card") or "")
        failed_inner = str(ascent_data.get("failed_card") or "")
        write_out(
            out_path,
            executed_until=failed_inner or PHASE_ASCENT,
            last_pass=str(ascent_data.get("last_pass_card") or ""),
            failed=failed_inner or PHASE_ASCENT,
            recommended_retry_card=retry,
            seal_ready=False,
            worldclass_ready=False,
            extra=steps_detail,
        )
        if args.stdout_json:
            print(out_path.read_text(encoding="utf-8"))
        return 1

    # --- Phase 2: Operable seal ---
    r2 = subprocess.run([py, str(seal_py), "--repo-root", str(repo)], cwd=str(auto))
    seal_data = read_json(auto / SEAL_JSON)
    seal_ready = seal_data.get("seal_ready") is True
    steps_detail["phases"].append(
        {
            "phase": PHASE_OPERABLE,
            "exit_code": r2.returncode,
            "artifact": str(auto / SEAL_JSON),
            "seal_ready": seal_ready,
        }
    )

    if r2.returncode != 0:
        write_out(
            out_path,
            executed_until=PHASE_OPERABLE,
            last_pass=PHASE_ASCENT,
            failed=PHASE_OPERABLE,
            recommended_retry_card=str(seal_data.get("recommended_retry_card") or ""),
            seal_ready=seal_ready,
            worldclass_ready=False,
            extra=steps_detail,
        )
        if args.stdout_json:
            print(out_path.read_text(encoding="utf-8"))
        return 1

    # --- Phase 3: Worldclass claim gate ---
    r3 = subprocess.run([py, str(claim_py), "--repo-root", str(repo)], cwd=str(auto))
    claim_data = read_json(auto / CLAIM_JSON)
    wc_ready = claim_data.get("worldclass_ready") is True or claim_data.get("claim_allowed") is True
    steps_detail["phases"].append(
        {
            "phase": PHASE_CLAIM,
            "exit_code": r3.returncode,
            "artifact": str(auto / CLAIM_JSON),
            "worldclass_ready": wc_ready,
        }
    )

    if r3.returncode != 0:
        write_out(
            out_path,
            executed_until=PHASE_CLAIM,
            last_pass=PHASE_OPERABLE,
            failed=PHASE_CLAIM,
            recommended_retry_card=str(claim_data.get("recommended_retry_card") or ""),
            seal_ready=seal_ready,
            worldclass_ready=wc_ready,
            extra=steps_detail,
        )
        if args.stdout_json:
            print(out_path.read_text(encoding="utf-8"))
        return 1

    write_out(
        out_path,
        executed_until=PHASE_CLAIM,
        last_pass=PHASE_CLAIM,
        failed="",
        recommended_retry_card="",
        seal_ready=seal_ready,
        worldclass_ready=wc_ready,
        extra=steps_detail,
    )
    if args.stdout_json:
        print(out_path.read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
