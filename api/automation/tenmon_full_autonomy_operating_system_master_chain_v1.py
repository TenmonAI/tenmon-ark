#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FULL_AUTONOMY_OPERATING_SYSTEM_MASTER_CHAIN_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

MASTER = "TENMON_FULL_AUTONOMY_OPERATING_SYSTEM_MASTER_CHAIN_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_full_autonomy_operating_system_summary.json"
OUT_REPORT = "tenmon_full_autonomy_operating_system_report.md"
OUT_FAIL_NEXT = "tenmon_full_autonomy_operating_system_fail_next_card.json"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"

CARD1 = "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1"
CARD2 = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
CARD3 = "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1"
CARD4 = "TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1"
CARD5 = "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1"
CARD6 = "TENMON_SCRIPTURE_K1_SYNTHESIS_NATURALIZER_CURSOR_AUTO_V1"
CARD7 = "TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1"
CARD8 = "TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1"
CARD9 = "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1"
CARD10 = "TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1"
CARD11 = "TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_cmd(argv: list[str], cwd: Path, log_file: Path, timeout: int = 2400) -> dict[str, Any]:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("w", encoding="utf-8") as f:
        pr = subprocess.run(argv, cwd=str(cwd), stdout=f, stderr=subprocess.STDOUT, text=True, timeout=timeout, check=False)
    tail = ""
    try:
        tail = log_file.read_text(encoding="utf-8")[-5000:]
    except Exception:
        pass
    return {"argv": argv, "returncode": pr.returncode, "ok": pr.returncode == 0, "log_file": str(log_file), "log_tail": tail}


def http_post_json(url: str, payload: dict[str, Any], timeout: float = 60.0) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return int(res.getcode()), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception as e:
        return 0, {"ok": False, "error": str(e)}


def probe_chat_stopbleed(base: str, run_id: str) -> dict[str, Any]:
    probes = [
        ("tech_ts", "TypeScriptでシングルトンパターンを実装してください"),
        ("tech_sql", "SQLiteでFTS5全文検索を実装するSQLを書いてください"),
        ("domain_mizuho", "水穂伝とは何ですか"),
        ("domain_kukai", "空海の即身成仏とは何か"),
    ]
    meta_tokens = ["【前回の芯】", "【いまの差分】", "【次の一手】", "CONTINUITY_ROUTE_HOLD_V1"]
    results = []
    for key, msg in probes:
        code, js = http_post_json(f"{base}/api/chat", {"threadId": f"tid-{run_id}-{key}", "message": msg})
        ku = ((js.get("decisionFrame") or {}).get("ku") or {}) if isinstance(js, dict) else {}
        rr = str(ku.get("routeReason") or "")
        resp = str(js.get("response") or "")
        results.append(
            {
                "probe": key,
                "routeReason": rr,
                "status": code,
                "meta_leak": any(t in resp for t in meta_tokens),
                "technical_misroute": key.startswith("tech_") and rr == "NATURAL_GENERAL_LLM_TOP",
            }
        )
    return {
        "card": CARD5,
        "generated_at": utc(),
        "run_id": run_id,
        "meta_leak_count": sum(1 for x in results if x["meta_leak"]),
        "technical_misroute_count": sum(1 for x in results if x["technical_misroute"]),
        "results": results,
    }


def probe_scripture(base: str, run_id: str) -> dict[str, Any]:
    probes = [
        ("mizuho", "水穂伝とは何ですか"),
        ("kotodama_hisho", "言霊秘書とはどういう書物ですか"),
        ("kukai", "空海の即身成仏とは何か"),
        ("narasaki", "楢崎皐月は何をした人ですか"),
        ("hokke", "法華経の核心を教えてください"),
        ("katakamuna", "カタカムナの宇宙観を説明してください"),
    ]
    banned = ["SOGO_1号_pdf", "KUKAI_COLLECTION_0002", "目次", "請来目録", "訳注", "資料要旨では"]
    results = []
    for key, msg in probes:
        code, js = http_post_json(f"{base}/api/chat", {"threadId": f"tid-{run_id}-{key}", "message": msg})
        ku = ((js.get("decisionFrame") or {}).get("ku") or {}) if isinstance(js, dict) else {}
        rr = str(ku.get("routeReason") or "")
        resp = str(js.get("response") or "")
        results.append(
            {
                "probe": key,
                "status": code,
                "routeReason": rr,
                "need_context": rr == "DEF_DICT_NEED_CONTEXT",
                "raw_dump": any(t in resp for t in banned),
            }
        )
    return {
        "card": CARD6,
        "generated_at": utc(),
        "run_id": run_id,
        "scripture_surface_naturalized": all((not x["need_context"]) and (not x["raw_dump"]) for x in results),
        "def_dict_need_context_escape_count": sum(1 for x in results if x["need_context"]),
        "raw_ocr_dump_count": sum(1 for x in results if x["raw_dump"]),
        "results": results,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=MASTER)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    base = args.base.rstrip("/")
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    run_id = f"fullos_{int(time.time())}_{os.getpid()}"
    log_dir = auto / "out" / "logs" / f"card_{MASTER}" / ts
    log_dir.mkdir(parents=True, exist_ok=True)

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # 1
    r1 = run_cmd(["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")], repo, log_dir / "card1.log")
    s1 = read_json(auto / "tenmon_self_build_real_closed_loop_proof_verdict.json")
    p1 = bool(s1.get("real_closed_loop_proven"))
    stages.append({"card": CARD1, "pass": p1, **r1})
    if not p1:
        failed_card = CARD1

    # 2
    must_block = None
    repo_clean = None
    if failed_card is None:
        r2 = run_cmd(["bash", str(scripts / "tenmon_repo_hygiene_final_seal_v1.sh"), "--stdout-json"], repo, log_dir / "card2.log")
        s2 = read_json(auto / "tenmon_repo_hygiene_final_seal_summary.json")
        must_block = bool(s2.get("must_block_seal", True))
        repo_clean = bool(s2.get("repo_hygiene_clean", False))
        p2 = (must_block is False) and (repo_clean is True)
        stages.append({"card": CARD2, "pass": p2, "must_block_seal": must_block, "repo_hygiene_clean": repo_clean, **r2})
        if not p2:
            failed_card = CARD2
    else:
        stages.append({"card": CARD2, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 3
    autonomy_cycle_pass = None
    safe_scope_enforced = None
    if failed_card is None:
        r3 = run_cmd(["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh")], repo, log_dir / "card3.log")
        s3 = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
        autonomy_cycle_pass = bool(s3.get("autonomy_cycle_pass"))
        safe_scope_enforced = bool(s3.get("safe_scope_enforced"))
        p3 = autonomy_cycle_pass and safe_scope_enforced
        stages.append({"card": CARD3, "pass": p3, "autonomy_cycle_pass": autonomy_cycle_pass, "safe_scope_enforced": safe_scope_enforced, **r3})
        if not p3:
            failed_card = CARD3
    else:
        stages.append({"card": CARD3, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 4
    truth_singleton = None
    if failed_card is None:
        r4 = run_cmd(["bash", str(scripts / "tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh")], repo, log_dir / "card4.log")
        s4 = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
        p4 = bool(s4.get("latest_truth_rebased")) and bool(s4.get("truth_source_singleton"))
        truth_singleton = bool(s4.get("truth_source_singleton"))
        stages.append({"card": CARD4, "pass": p4, "latest_truth_rebased": bool(s4.get("latest_truth_rebased")), "truth_source_singleton": truth_singleton, **r4})
        if not p4:
            failed_card = CARD4
    else:
        stages.append({"card": CARD4, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 5
    meta_leak_count = None
    technical_misroute_count = None
    if failed_card is None:
        s5 = probe_chat_stopbleed(base, f"{run_id}-c5")
        write_json(auto / "tenmon_chat_surface_stopbleed_summary.json", s5)
        meta_leak_count = int(s5["meta_leak_count"])
        technical_misroute_count = int(s5["technical_misroute_count"])
        p5 = meta_leak_count == 0 and technical_misroute_count == 0
        stages.append({"card": CARD5, "pass": p5, "meta_leak_count": meta_leak_count, "technical_misroute_count": technical_misroute_count})
        if not p5:
            failed_card = CARD5
    else:
        stages.append({"card": CARD5, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 6
    scripture_nat = None
    if failed_card is None:
        s6 = probe_scripture(base, f"{run_id}-c6")
        write_json(auto / "tenmon_scripture_naturalizer_summary.json", s6)
        scripture_nat = bool(s6["scripture_surface_naturalized"]) and int(s6["def_dict_need_context_escape_count"]) == 0
        p6 = scripture_nat
        stages.append(
            {
                "card": CARD6,
                "pass": p6,
                "scripture_surface_naturalized": bool(s6["scripture_surface_naturalized"]),
                "def_dict_need_context_escape_count": int(s6["def_dict_need_context_escape_count"]),
            }
        )
        if not p6:
            failed_card = CARD6
    else:
        stages.append({"card": CARD6, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 7
    scope_governed = None
    if failed_card is None:
        r7 = run_cmd(["python3", str(auto / "autonomy_scope_governor_v1.py"), "--repo-root", str(repo)], repo, log_dir / "card7.log")
        s7 = read_json(auto / "tenmon_autonomy_scope_governor_summary.json")
        scope_governed = bool(s7.get("scope_governor_pass"))
        p7 = scope_governed
        stages.append({"card": CARD7, "pass": p7, "scope_governor_pass": scope_governed, **r7})
        if not p7:
            failed_card = CARD7
    else:
        stages.append({"card": CARD7, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 8
    planner_active = None
    if failed_card is None:
        r8 = run_cmd(["python3", str(auto / "product_patch_planner_min_diff_v1.py"), "--repo-root", str(repo)], repo, log_dir / "card8.log")
        s8 = read_json(auto / "tenmon_product_patch_planner_min_diff_summary.json")
        planner_active = bool(s8.get("patch_planner_pass"))
        p8 = planner_active
        stages.append({"card": CARD8, "pass": p8, "patch_planner_pass": planner_active, **r8})
        if not p8:
            failed_card = CARD8
    else:
        stages.append({"card": CARD8, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 9
    acceptance_active = None
    if failed_card is None:
        r9 = run_cmd(["python3", str(auto / "acceptance_orchestration_single_source_v1.py"), "--repo-root", str(repo)], repo, log_dir / "card9.log")
        s9 = read_json(auto / "acceptance_orchestration_summary.json")
        acceptance_active = bool(s9.get("single_source_of_truth"))
        p9 = bool(s9.get("acceptance_singleton_pass"))
        stages.append({"card": CARD9, "pass": p9, "single_source_of_truth": acceptance_active, "acceptance_singleton_pass": bool(s9.get("acceptance_singleton_pass")), **r9})
        if not p9:
            failed_card = CARD9
    else:
        stages.append({"card": CARD9, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 10
    rollback_active = None
    if failed_card is None:
        r10 = run_cmd(
            ["python3", str(auto / "auto_rollback_restore_guard_v1.py"), "--repo-root", str(repo), "--simulate-failure"],
            repo,
            log_dir / "card10.log",
        )
        s10 = read_json(auto / "tenmon_auto_rollback_restore_guard_summary.json")
        rollback_active = bool(s10.get("rollback_restore_guard_pass"))
        p10 = rollback_active
        stages.append({"card": CARD10, "pass": p10, "rollback_restore_guard_pass": rollback_active, **r10})
        if not p10:
            failed_card = CARD10
    else:
        stages.append({"card": CARD10, "pass": False, "skipped": True, "reason": "prior_failed"})

    # 11
    founder_gate_active = None
    if failed_card is None:
        r11 = run_cmd(
            ["python3", str(auto / "founder_override_approval_gate_v1.py"), "--repo-root", str(repo), "--simulate-high-risk-request", "--decision", "reject"],
            repo,
            log_dir / "card11.log",
        )
        s11 = read_json(auto / "tenmon_founder_override_approval_gate_summary.json")
        founder_gate_active = bool(s11.get("founder_approval_gate_pass"))
        p11 = founder_gate_active
        stages.append({"card": CARD11, "pass": p11, "founder_approval_gate_pass": founder_gate_active, **r11})
        if not p11:
            failed_card = CARD11
    else:
        stages.append({"card": CARD11, "pass": False, "skipped": True, "reason": "prior_failed"})

    # Final acceptance map
    final_acceptance = {
        "real_closed_loop_proven": bool(read_json(auto / "tenmon_self_build_real_closed_loop_proof_verdict.json").get("real_closed_loop_proven")),
        "repo_hygiene_clean": bool(read_json(auto / "tenmon_repo_hygiene_final_seal_summary.json").get("repo_hygiene_clean")),
        "autonomy_cycle_proven": bool(read_json(auto / "tenmon_operations_level_autonomy_summary.json").get("autonomy_cycle_pass"))
        and bool(read_json(auto / "tenmon_operations_level_autonomy_summary.json").get("safe_scope_enforced")),
        "truth_source_singleton": bool(read_json(auto / "tenmon_latest_truth_rebase_summary.json").get("truth_source_singleton")),
        "meta_leak_zero": int(read_json(auto / "tenmon_chat_surface_stopbleed_summary.json").get("meta_leak_count", 1)) == 0,
        "technical_misroute_zero": int(
            read_json(auto / "tenmon_chat_surface_stopbleed_summary.json").get(
                "technical_misroute_count",
                read_json(auto / "tenmon_chat_surface_stopbleed_summary.json").get("natural_misdrop_count", 1),
            )
        )
        == 0,
        "scripture_naturalized": bool(read_json(auto / "tenmon_scripture_naturalizer_summary.json").get("scripture_surface_naturalized", False))
        or bool(read_json(auto / "tenmon_scripture_naturalizer_summary.json").get("autoprobe_pass", False)),
        "scope_escalation_governed": bool(read_json(auto / "tenmon_autonomy_scope_governor_summary.json").get("scope_governor_pass")),
        "product_patch_planner_active": bool(read_json(auto / "tenmon_product_patch_planner_min_diff_summary.json").get("patch_planner_pass")),
        "acceptance_singleton_active": bool(read_json(auto / "acceptance_orchestration_summary.json").get("single_source_of_truth"))
        and bool(read_json(auto / "acceptance_orchestration_summary.json").get("acceptance_singleton_pass")),
        "rollback_guard_active": bool(read_json(auto / "tenmon_auto_rollback_restore_guard_summary.json").get("rollback_restore_guard_pass")),
        "founder_approval_gate_active": bool(read_json(auto / "tenmon_founder_override_approval_gate_summary.json").get("founder_approval_gate_pass")),
    }

    master_pass = failed_card is None and all(bool(v) for v in final_acceptance.values())
    fail_card = failed_card
    if not master_pass and not fail_card:
        for s in stages:
            if not bool(s.get("pass")):
                fail_card = str(s.get("card"))
                break
        if not fail_card:
            fail_card = "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1"

    summary = {
        "master_card": MASTER,
        "generated_at": utc(),
        "run_id": run_id,
        "master_pass": master_pass,
        "failed_card": fail_card,
        "stages": stages,
        "final_acceptance": final_acceptance,
        "log_dir": str(log_dir),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": "single_retry_card_only_and_stop",
    }
    write_json(auto / OUT_SUMMARY, summary)

    md = [
        f"# {MASTER}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- run_id: `{run_id}`",
        f"- master_pass: `{master_pass}`",
        f"- failed_card: `{fail_card}`",
        f"- log_dir: `{log_dir}`",
        "",
        "## Chain Stages",
    ]
    for s in stages:
        md.append(f"- {s.get('card')}: pass=`{s.get('pass')}`")
    md.extend(["", "## Final Acceptance"])
    for k, v in final_acceptance.items():
        md.append(f"- {k}: `{v}`")
    md.extend(["", f"- NEXT_ON_PASS: `{NEXT_ON_PASS}`"])
    if not master_pass and fail_card:
        md.append(f"- NEXT_ON_FAIL: `{fail_card.replace('_CURSOR_AUTO_V1', '_RETRY_CURSOR_AUTO_V1')}` (single retry only)")
    (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

    if not master_pass and fail_card:
        write_json(
            auto / OUT_FAIL_NEXT,
            {
                "source_master": MASTER,
                "generated_at": utc(),
                "failed_card": fail_card,
                "retry_card_name": fail_card.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1"),
                "single_retry_only": True,
                "stop_master_after_emit": True,
            },
        )

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

