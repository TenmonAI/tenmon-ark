#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_COMPLETION_PHASE3_DIALOGUE_AND_WORLDCLASS_SELF_IMPROVEMENT_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "tail": ((p.stdout or "") + (p.stderr or ""))[-1200:],
    }


def stage(stage_id: str, card: str, passed: bool, detail: dict[str, Any]) -> dict[str, Any]:
    return {"stage": stage_id, "card": card, "pass": passed, **detail}


def read_surface_samples(auto_dir: Path) -> list[str]:
    candidates = [
        auto_dir / "tenmon_chat_surface_stopbleed_summary.json",
        auto_dir / "tenmon_scripture_naturalizer_summary.json",
        auto_dir / "tenmon_latest_state_rejudge_summary.json",
    ]
    lines: list[str] = []
    for path in candidates:
        obj = read_json(path)
        for key in ("sample_outputs", "samples", "surface_samples"):
            val = obj.get(key)
            if isinstance(val, list):
                lines.extend(str(x) for x in val)
    return lines


def count_meta_leaks(samples: list[str]) -> int:
    leak_patterns = [
        r"【前回の芯】",
        r"【いまの差分】",
        r"【次の一手】",
        r"（次の一手の記録）",
    ]
    c = 0
    for s in samples:
        for p in leak_patterns:
            if re.search(p, s):
                c += 1
    return c


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    run_id = f"phase3_{int(time.time())}_{os.getpid()}"

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # PRECONDITION: Phase2 PASS
    phase2 = read_json(auto / "tenmon_phase2_operations_summary.json")
    pre_ok = bool(phase2.get("master_pass"))
    if not pre_ok:
        failed_card = "TENMON_AUTONOMY_COMPLETION_PHASE2_OPERATIONS_AND_SAFE_SELF_IMPROVEMENT_CURSOR_AUTO_V1"
        stages.append(
            stage(
                "PRECONDITION",
                failed_card,
                False,
                {
                    "reason": "phase2_not_passed",
                    "phase2_master_pass": bool(phase2.get("master_pass")),
                },
            )
        )

    c1 = "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_CLEAN_CURSOR_AUTO_V1"
    if failed_card is None:
        # current-run probe: stopbleed runner
        r1 = run(["bash", str(scripts / "tenmon_chat_surface_stopbleed_v1.sh")], repo)
        sb = read_json(auto / "tenmon_chat_surface_stopbleed_summary.json")
        meta_count = int(sb.get("meta_leak_count", 0) or 0)
        p1 = bool(r1["ok"]) and meta_count == 0
        stages.append(stage("CARD_1", c1, p1, {**r1, "meta_leak_count": meta_count}))
        if not p1:
            failed_card = c1
    else:
        stages.append(stage("CARD_1", c1, False, {"skipped": True, "reason": "prior_failed"}))

    c2 = "TENMON_SCRIPTURE_RAW_DUMP_AND_PLACEHOLDER_NATURALIZER_CURSOR_AUTO_V1"
    if failed_card is None:
        r2 = run(["bash", str(scripts / "tenmon_scripture_naturalizer_v1.sh")], repo)
        sn = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
        raw = int(sn.get("raw_ocr_dump_count", 0) or 0)
        p2 = bool(r2["ok"]) and raw == 0
        stages.append(stage("CARD_2", c2, p2, {**r2, "scripture_raw_count": raw}))
        if not p2:
            failed_card = c2
    else:
        stages.append(stage("CARD_2", c2, False, {"skipped": True, "reason": "prior_failed"}))

    c3 = "TENMON_TECHNICAL_FACTUAL_ROUTE_RELOCK_AND_NO_COACHING_CURSOR_AUTO_V1"
    if failed_card is None:
        # lightweight rejudge-based signal
        r3 = run(["python3", str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], repo)
        rj = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
        technical = int(rj.get("technical_misroute_count", 0) or 0)
        factual = int(rj.get("factual_misroute_count", 0) or 0)
        p3 = bool(r3["ok"]) and technical == 0 and factual == 0
        stages.append(
            stage("CARD_3", c3, p3, {**r3, "technical_misroute_count": technical, "factual_misroute_count": factual})
        )
        if not p3:
            failed_card = c3
    else:
        stages.append(stage("CARD_3", c3, False, {"skipped": True, "reason": "prior_failed"}))

    c4 = "TENMON_SESSIONID_RESIDUE_FULL_PURGE_AND_THREADID_CANON_FINAL_CURSOR_AUTO_V1"
    if failed_card is None:
        # inspect frontend residue via rg count
        r4 = run(["python3", "-c", "import subprocess; raise SystemExit(subprocess.run(['rg','-n','sessionId','web/src']).returncode)"], repo)
        # rg returns 0 when found, 1 when none. For this card, require mainline residue zero as strict pass.
        residue = 0 if r4["returncode"] == 1 else 1
        p4 = residue == 0
        stages.append(stage("CARD_4", c4, p4, {"sessionid_residue_count": residue, **r4}))
        if not p4:
            failed_card = c4
    else:
        stages.append(stage("CARD_4", c4, False, {"skipped": True, "reason": "prior_failed"}))

    c5 = "TENMON_WORLDCLASS_DIALOGUE_AND_SYSTEM_AUTOPDCA_LIVE_ENABLE_CURSOR_AUTO_V1"
    if failed_card is None:
        r5 = run(["bash", str(scripts / "tenmon_worldclass_dialogue_and_system_autopdca_v1.sh")], repo)
        dg = read_json(auto / "tenmon_worldclass_dialogue_autopdca_summary.json")
        sy = read_json(auto / "tenmon_worldclass_system_autopdca_summary.json")
        has_dialogue = bool(dg.get("improvement_proposals"))
        has_system = bool(sy.get("improvement_proposals"))
        pdca_live = bool(r5["ok"]) and has_dialogue and has_system
        stages.append(
            stage(
                "CARD_5",
                c5,
                pdca_live,
                {
                    **r5,
                    "worldclass_pdca_live": pdca_live,
                    "dialogue_proposal_generated": has_dialogue,
                    "system_proposal_generated": has_system,
                },
            )
        )
        if not pdca_live:
            failed_card = c5
    else:
        stages.append(stage("CARD_5", c5, False, {"skipped": True, "reason": "prior_failed"}))

    c6 = "TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SELF_IMPROVEMENT_GO_LIVE_CURSOR_AUTO_V1"
    if failed_card is None:
        r6 = run(["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")], repo)
        fa = read_json(auto / "tenmon_full_autonomy_acceptance_gate_summary.json")
        full = bool(fa.get("full_autonomy_acceptance_pass"))
        stages.append(stage("CARD_6", c6, full, {**r6, "full_autonomy_acceptance_pass": full}))
        if not full:
            failed_card = c6
    else:
        stages.append(stage("CARD_6", c6, False, {"skipped": True, "reason": "prior_failed"}))

    # final acceptance aggregation
    sb = read_json(auto / "tenmon_chat_surface_stopbleed_summary.json")
    sn = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
    rj = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    fa = read_json(auto / "tenmon_full_autonomy_acceptance_gate_summary.json")
    dg = read_json(auto / "tenmon_worldclass_dialogue_autopdca_summary.json")
    sy = read_json(auto / "tenmon_worldclass_system_autopdca_summary.json")

    sample_lines = read_surface_samples(auto)
    derived_meta_count = count_meta_leaks(sample_lines)
    meta_count = int(sb.get("meta_leak_count", derived_meta_count) or 0)
    technical_count = int(rj.get("technical_misroute_count", 0) or 0)
    scripture_raw_count = int(sn.get("raw_ocr_dump_count", 0) or 0)

    # mainline strict: any residue in web/src is non-zero
    residue_return = run(
        ["python3", "-c", "import subprocess; raise SystemExit(subprocess.run(['rg','-n','sessionId','web/src']).returncode)"],
        repo,
    )["returncode"]
    sessionid_residue_count = 0 if residue_return == 1 else 1

    worldclass_pdca_live = bool(dg.get("improvement_proposals")) and bool(sy.get("improvement_proposals"))
    full_acc = bool(fa.get("full_autonomy_acceptance_pass"))

    final = {
        "meta_leak_count": meta_count,
        "technical_misroute_count": technical_count,
        "scripture_raw_count": scripture_raw_count,
        "sessionid_residue_count": sessionid_residue_count,
        "worldclass_pdca_live": worldclass_pdca_live,
        "full_autonomy_acceptance_pass": full_acc,
    }
    master_pass = (
        meta_count == 0
        and technical_count == 0
        and scripture_raw_count == 0
        and sessionid_residue_count == 0
        and worldclass_pdca_live
        and full_acc
        and failed_card is None
    )

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "master_pass": master_pass,
        "failed_card": failed_card,
        "final_acceptance": final,
        "stages": stages,
        "next_on_pass": "TENMON_REAL_FULL_AUTONOMY_GO_LIVE_MASTER_SEAL_CURSOR_AUTO_V1",
    }
    write_json(auto / "tenmon_phase3_dialogue_worldclass_summary.json", summary)
    (auto / "tenmon_phase3_dialogue_worldclass_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{master_pass}`\n- failed_card: `{failed_card}`\n",
        encoding="utf-8",
    )

    if not master_pass and failed_card:
        retry_map = {
            c1: "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_CLEAN_RETRY_CURSOR_AUTO_V1",
            c2: "TENMON_SCRIPTURE_RAW_DUMP_AND_PLACEHOLDER_NATURALIZER_RETRY_CURSOR_AUTO_V1",
            c3: "TENMON_TECHNICAL_FACTUAL_ROUTE_RELOCK_AND_NO_COACHING_RETRY_CURSOR_AUTO_V1",
            c4: "TENMON_SESSIONID_RESIDUE_FULL_PURGE_AND_THREADID_CANON_FINAL_RETRY_CURSOR_AUTO_V1",
            c5: "TENMON_WORLDCLASS_DIALOGUE_AND_SYSTEM_AUTOPDCA_LIVE_ENABLE_RETRY_CURSOR_AUTO_V1",
            c6: "TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SELF_IMPROVEMENT_GO_LIVE_RETRY_CURSOR_AUTO_V1",
            "TENMON_AUTONOMY_COMPLETION_PHASE2_OPERATIONS_AND_SAFE_SELF_IMPROVEMENT_CURSOR_AUTO_V1": "TENMON_AUTONOMY_COMPLETION_PHASE2_OPERATIONS_AND_SAFE_SELF_IMPROVEMENT_CURSOR_AUTO_V1",
        }
        write_json(
            auto / "tenmon_phase3_dialogue_worldclass_fail_next_card.json",
            {
                "source_master": CARD,
                "failed_card": failed_card,
                "retry_card_name": retry_map.get(failed_card, failed_card.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1")),
                "single_retry_only": True,
                "generated_at": utc(),
            },
        )
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

