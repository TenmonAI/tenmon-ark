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

CARD = "TENMON_AUTONOMY_COMPLETION_8CARD_PDCA_LOOP_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def ts_compact() -> str:
    return time.strftime("%Y%m%d_%H%M%S", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stage(stage_id: str, card: str, passed: bool, detail: dict[str, Any]) -> dict[str, Any]:
    return {"stage": stage_id, "card": card, "pass": passed, **detail}


def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    out = (p.stdout or "") + (p.stderr or "")
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout": p.stdout or "",
        "stderr": p.stderr or "",
        "tail": out[-1600:],
    }


def safe_card_dirname(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name)


def persist_card_log(card_name: str, stage_result: dict[str, Any]) -> None:
    root = Path("/var/log/tenmon")
    out_dir = root / f"card_{safe_card_dirname(card_name)}" / ts_compact()
    out_dir.mkdir(parents=True, exist_ok=True)

    run_log = ""
    if isinstance(stage_result.get("tail"), str):
        run_log = stage_result["tail"]
    else:
        run_log = json.dumps(stage_result, ensure_ascii=False, indent=2)
    (out_dir / "run.log").write_text(run_log + ("\n" if not run_log.endswith("\n") else ""), encoding="utf-8")

    summary = {
        "generated_at": utc(),
        "card": card_name,
        "stage_result": {k: v for k, v in stage_result.items() if k not in ("stdout", "stderr")},
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "report.md").write_text(
        f"# {card_name}\n\n- pass: `{bool(stage_result.get('pass'))}`\n- returncode: `{stage_result.get('returncode')}`\n",
        encoding="utf-8",
    )


def any_meta_leak_in_samples(auto: Path) -> int:
    patterns = [r"【前回の芯】", r"【いまの差分】", r"【次の一手】", r"（次の一手の記録）"]
    files = [
        auto / "tenmon_chat_continuity_deep_forensic.json",
        auto / "tenmon_chat_surface_stopbleed_summary.json",
        auto / "tenmon_latest_state_rejudge_summary.json",
    ]
    text = ""
    for f in files:
        if f.is_file():
            text += f.read_text(encoding="utf-8", errors="ignore") + "\n"
    return sum(len(re.findall(p, text)) for p in patterns)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    run_id = f"pdca8_{int(time.time())}_{os.getpid()}"

    cards = [
        "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_CURSOR_AUTO_V1",
        "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_CURSOR_AUTO_V1",
        "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_CURSOR_AUTO_V1",
        "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1",
        "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1",
        "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_CURSOR_AUTO_V1",
        "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1",
        "TENMON_FINAL_AUTONOMY_ACCEPTANCE_REJUDGE_AND_SEAL_CURSOR_AUTO_V1",
    ]
    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # CARD1
    c1 = cards[0]
    r1 = run(["bash", str(scripts / "tenmon_cursor_runtime_execution_contract_v1.sh")], repo)
    s1 = read_json(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
    blockers = [str(x) for x in (s1.get("current_blockers") or [])]
    p1 = (
        bool(s1.get("runtime_contract_ready"))
        and "queue_file_missing" not in blockers
        and "result_bundle_missing" not in blockers
        and "stale_truth_detected" not in blockers
    )
    st1 = stage(
        "CARD_1",
        c1,
        p1,
        {
            **r1,
            "queue_file_present": "queue_file_missing" not in blockers,
            "result_bundle_present": "result_bundle_missing" not in blockers,
            "ingest_contract_ok": bool(s1.get("result_ingest_ready")),
            "stale_truth_detected": "stale_truth_detected" in blockers,
            "current_run_contract_ok": bool(s1.get("runtime_contract_ready")),
        },
    )
    stages.append(st1)
    persist_card_log(c1, st1)
    if not p1:
        failed_card = c1

    # CARD2
    c2 = cards[1]
    if failed_card is None:
        r2 = run(["python3", str(auto / "tenmon_remote_admin_cursor_runtime_proof_v1.py")], repo)
        v2 = read_json(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")
        p2 = (
            bool(v2.get("pass"))
            and bool(v2.get("admin_surface_proven"))
            and bool(v2.get("remote_admin_runtime_proven"))
            and bool(os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY"))
        )
        st2 = stage(
            "CARD_2",
            c2,
            p2,
            {
                **r2,
                "founder_key_present": bool(os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY")),
                "remote_executor_reachable": bool(v2.get("remote_chain_proven")),
                "admin_surface_proven": bool(v2.get("admin_surface_proven")),
                "remote_admin_runtime_proven": bool(v2.get("remote_admin_runtime_proven")),
                "current_run_bind_ok": bool(v2.get("pass")),
            },
        )
        stages.append(st2)
        persist_card_log(c2, st2)
        if not p2:
            failed_card = c2
    else:
        st2 = stage("CARD_2", c2, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st2)
        persist_card_log(c2, st2)

    # CARD3
    c3 = cards[2]
    if failed_card is None:
        r3a = run(["bash", str(scripts / "tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh")], repo)
        r3b = run(["bash", str(scripts / "tenmon_truth_source_canonicalizer_v1.sh")], repo)
        rb = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
        ts = read_json(auto / "tenmon_truth_source_summary.json")
        tr = read_json(auto / "tenmon_truth_source_registry_v1.json")
        p3 = (
            int(rb.get("stale_sources_count", 9999) or 9999) == 0
            and bool(ts.get("truth_source_singleton"))
            and bool(tr.get("generated_at"))
        )
        st3 = stage(
            "CARD_3",
            c3,
            p3,
            {
                **r3b,
                "stale_sources_count": int(rb.get("stale_sources_count", 9999) or 9999),
                "single_truth_source_locked": bool(ts.get("truth_source_singleton")),
                "superseded_sources_documented": "stale_entries" in rb or "stale_sources" in rb,
                "truth_source_registry_current_run": bool(tr.get("generated_at")),
                "tail_rebase": r3a.get("tail", "")[-600:],
            },
        )
        stages.append(st3)
        persist_card_log(c3, st3)
        if not p3:
            failed_card = c3
    else:
        st3 = stage("CARD_3", c3, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st3)
        persist_card_log(c3, st3)

    # CARD4
    c4 = cards[3]
    if failed_card is None:
        r4 = run(["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")], repo, timeout=3000)
        s4 = read_json(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
        p4 = all(
            bool(s4.get(k))
            for k in (
                "real_queue_submit",
                "real_delivery_observed",
                "real_result_returned",
                "real_ingest_pass",
                "real_rejudge_refresh",
                "real_closed_loop_proven",
            )
        )
        st4 = stage("CARD_4", c4, p4, {**r4, **{k: bool(s4.get(k)) for k in (
            "real_queue_submit",
            "real_delivery_observed",
            "real_result_returned",
            "real_ingest_pass",
            "real_rejudge_refresh",
            "real_closed_loop_proven",
        )}})
        stages.append(st4)
        persist_card_log(c4, st4)
        if not p4:
            failed_card = c4
    else:
        st4 = stage("CARD_4", c4, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st4)
        persist_card_log(c4, st4)

    # CARD5
    c5 = cards[4]
    if failed_card is None:
        r5 = run(["bash", str(scripts / "tenmon_autonomy_first_live_bootstrap_v1.sh")], repo, timeout=3000)
        s5 = read_json(auto / "tenmon_autonomy_first_live_summary.json")
        p5 = all(
            bool(s5.get(k))
            for k in (
                "bootstrap_validation_pass",
                "first_live_cycle_pass",
                "current_run_choose_pass",
                "current_run_dispatch_pass",
                "current_run_delivery_observed",
                "current_run_result_returned",
                "current_run_ingest_pass",
                "current_run_rejudge_pass",
                "safe_scope_enforced",
                "high_risk_not_touched",
            )
        )
        st5 = stage("CARD_5", c5, p5, {**r5, **{k: bool(s5.get(k)) for k in (
            "bootstrap_validation_pass",
            "first_live_cycle_pass",
            "current_run_choose_pass",
            "current_run_dispatch_pass",
            "current_run_delivery_observed",
            "current_run_result_returned",
            "current_run_ingest_pass",
            "current_run_rejudge_pass",
            "safe_scope_enforced",
            "high_risk_not_touched",
        )}})
        stages.append(st5)
        persist_card_log(c5, st5)
        if not p5:
            failed_card = c5
    else:
        st5 = stage("CARD_5", c5, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st5)
        persist_card_log(c5, st5)

    # CARD6
    c6 = cards[5]
    if failed_card is None:
        r6 = run(["bash", str(scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")], repo, timeout=3000)
        s6a = read_json(auto / "tenmon_chat_finalize_meta_blackout_summary.json")
        s6b = read_json(auto / "tenmon_chat_continuity_deep_forensic.json")
        meta_count = int(s6a.get("meta_leak_count", 0) or 0)
        if meta_count == 0:
            meta_count = any_meta_leak_in_samples(auto)
        p6 = (meta_count == 0) and bool(s6b)
        st6 = stage(
            "CARD_6",
            c6,
            p6,
            {
                **r6,
                "meta_leak_count": meta_count,
                "probe_cont_res_meta_leak": bool(s6b.get("probe_cont_res", {}).get("meta_leak")) if isinstance(s6b, dict) else None,
                "continuity_route_reason": (s6b.get("continuity_route_reason") if isinstance(s6b, dict) else None),
                "continuity_thread_same": bool(s6b.get("continuity_thread_same")) if isinstance(s6b, dict) else None,
            },
        )
        stages.append(st6)
        persist_card_log(c6, st6)
        if not p6:
            failed_card = c6
    else:
        st6 = stage("CARD_6", c6, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st6)
        persist_card_log(c6, st6)

    # CARD7
    c7 = cards[6]
    if failed_card is None:
        r7a = run(["bash", str(scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")], repo, timeout=3000)
        r7b = run(["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], repo, timeout=2400)
        rej = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
        scrip = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
        technical = int(rej.get("technical_misroute_count", 0) or 0)
        scripture_raw = int(scrip.get("raw_ocr_dump_count", 0) or 0)
        p7 = technical == 0 and scripture_raw == 0
        st7 = stage(
            "CARD_7",
            c7,
            p7,
            {
                **r7b,
                "technical_misroute_count": technical,
                "scripture_raw_count": scripture_raw,
                "tail_repair": r7a.get("tail", "")[-600:],
            },
        )
        stages.append(st7)
        persist_card_log(c7, st7)
        if not p7:
            failed_card = c7
    else:
        st7 = stage("CARD_7", c7, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st7)
        persist_card_log(c7, st7)

    # CARD8
    c8 = cards[7]
    if failed_card is None:
        r8a = run(["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")], repo)
        r8b = run(["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], repo)
        s8 = read_json(auto / "tenmon_full_autonomy_acceptance_summary.json")
        rej = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
        band = str(rej.get("overall_band") or "")
        p8 = bool(s8.get("pass")) and band in ("operable_ready", "autonomy_live", "worldclass_candidate")
        st8 = stage(
            "CARD_8",
            c8,
            p8,
            {
                **r8b,
                "full_autonomy_acceptance_pass": bool(s8.get("pass")),
                "autonomy_operable": bool(s8.get("pass")),
                "cursor_sync_operable": bool(s8.get("checks", {}).get("cursor_runtime_execution_contract_pass")),
                "safe_self_improvement_operable": bool(s8.get("checks", {}).get("safe_patch_queue_present")),
                "dialogue_repair_operable": bool(s8.get("checks", {}).get("dialogue_autopdca_ready")),
                "final_rejudge_band": band,
                "tail_gate": r8a.get("tail", "")[-600:],
            },
        )
        stages.append(st8)
        persist_card_log(c8, st8)
        if not p8:
            failed_card = c8
    else:
        st8 = stage("CARD_8", c8, False, {"skipped": True, "reason": "prior_failed"})
        stages.append(st8)
        persist_card_log(c8, st8)

    # final acceptance
    rej = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    scrip = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
    fa = read_json(auto / "tenmon_full_autonomy_acceptance_summary.json")
    pdca = read_json(auto / "tenmon_worldclass_pdca_summary.json")
    meta_count = any_meta_leak_in_samples(auto)
    technical_count = int(rej.get("technical_misroute_count", 0) or 0)
    scripture_raw_count = int(scrip.get("raw_ocr_dump_count", 0) or 0)
    sessionid_residue_count = 0 if subprocess.run(
        ["rg", "-n", "sessionId", "web/src"], cwd=str(repo), capture_output=True, text=True, check=False
    ).returncode == 1 else 1
    worldclass_pdca_live = bool(pdca.get("dialogue_autopdca_ready")) and bool(pdca.get("system_autopdca_ready"))
    full_autonomy_acceptance_pass = bool(fa.get("pass"))

    final = {
        "meta_leak_count": meta_count,
        "technical_misroute_count": technical_count,
        "scripture_raw_count": scripture_raw_count,
        "sessionid_residue_count": sessionid_residue_count,
        "worldclass_pdca_live": worldclass_pdca_live,
        "full_autonomy_acceptance_pass": full_autonomy_acceptance_pass,
    }
    master_pass = (
        meta_count == 0
        and technical_count == 0
        and scripture_raw_count == 0
        and sessionid_residue_count == 0
        and worldclass_pdca_live
        and full_autonomy_acceptance_pass
        and failed_card is None
    )

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "master_pass": master_pass,
        "failed_card": failed_card,
        "final_acceptance": final,
        "stages": [{k: v for k, v in st.items() if k not in ("stdout", "stderr")} for st in stages],
        "next_on_pass": "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1",
    }
    write_json(auto / "tenmon_autonomy_completion_8card_pdca_loop_summary.json", summary)
    (auto / "tenmon_autonomy_completion_8card_pdca_loop_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{master_pass}`\n- failed_card: `{failed_card}`\n",
        encoding="utf-8",
    )

    if not master_pass and failed_card:
        retry_map = {
            cards[0]: "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_RETRY_CURSOR_AUTO_V1",
            cards[1]: "TENMON_FOUNDER_RUNTIME_BIND_AND_REMOTE_EXECUTOR_ACTIVATION_RETRY_CURSOR_AUTO_V1",
            cards[2]: "TENMON_STALE_TRUTH_REBASE_AND_SINGLE_SOURCE_LOCK_RETRY_CURSOR_AUTO_V1",
            cards[3]: "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_RETRY_CURSOR_AUTO_V1",
            cards[4]: "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_RETRY_CURSOR_AUTO_V1",
            cards[5]: "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_CONTINUITY_DELEAK_RETRY_CURSOR_AUTO_V1",
            cards[6]: "TENMON_SCRIPTURE_TECHNICAL_GENERAL_ROUTE_WORLDCLASS_REPAIR_RETRY_CURSOR_AUTO_V1",
            cards[7]: "TENMON_FINAL_AUTONOMY_ACCEPTANCE_REJUDGE_AND_SEAL_RETRY_CURSOR_AUTO_V1",
        }
        write_json(
            auto / "tenmon_autonomy_completion_8card_pdca_loop_fail_next_card.json",
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

