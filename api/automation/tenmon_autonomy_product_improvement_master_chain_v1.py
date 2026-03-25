#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_AUTONOMY_PRODUCT_IMPROVEMENT_MASTER_CHAIN_CURSOR_AUTO_V1

6-card master chain with strict stage gates.
Progresses only when previous card passes. On first failure, emits exactly one
retry card payload and stops.
"""
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

MASTER = "TENMON_AUTONOMY_PRODUCT_IMPROVEMENT_MASTER_CHAIN_CURSOR_AUTO_V1"
CARD1 = "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1"
CARD2 = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
CARD3 = "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1"
CARD4 = "TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1"
CARD5 = "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1"
CARD6 = "TENMON_SCRIPTURE_K1_SYNTHESIS_NATURALIZER_CURSOR_AUTO_V1"

OUT_SUMMARY = "tenmon_autonomy_product_improvement_master_chain_summary.json"
OUT_REPORT = "tenmon_autonomy_product_improvement_master_chain_report.md"
OUT_FAIL_NEXT = "tenmon_autonomy_product_improvement_master_chain_fail_next_card.json"

NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"


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


def run_cmd(argv: list[str], cwd: Path, log_file: Path, timeout: int = 1800) -> dict[str, Any]:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("w", encoding="utf-8") as f:
        pr = subprocess.run(
            argv,
            cwd=str(cwd),
            stdout=f,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=timeout,
            check=False,
        )
    tail = ""
    try:
        tail = log_file.read_text(encoding="utf-8")[-5000:]
    except Exception:
        pass
    return {
        "argv": argv,
        "returncode": pr.returncode,
        "ok": pr.returncode == 0,
        "log_file": str(log_file),
        "log_tail": tail,
    }


def http_post_json(url: str, payload: dict[str, Any], timeout: float = 45.0) -> tuple[int, dict[str, Any]]:
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


def chat_probe(base: str, thread_id: str, message: str) -> dict[str, Any]:
    code, js = http_post_json(f"{base}/api/chat", {"threadId": thread_id, "message": message}, timeout=60.0)
    ku = ((js.get("decisionFrame") or {}).get("ku") or {}) if isinstance(js, dict) else {}
    rr = str(ku.get("routeReason") or "")
    resp = str(js.get("response") or "")
    return {"status": code, "routeReason": rr, "response": resp}


def card5_probe(base: str, run_id: str) -> dict[str, Any]:
    probes = [
        ("tech_ts", "TypeScriptでシングルトンパターンを実装してください"),
        ("tech_sql", "SQLiteでFTS5全文検索を実装するSQLを書いてください"),
        ("domain_mizuho", "水穂伝とは何ですか"),
        ("domain_kukai", "空海の即身成仏とは何か"),
        ("domain_narasaki", "楢崎皐月は何をした人ですか"),
        ("domain_hokke", "法華経の核心を教えてください"),
    ]
    meta_tokens = [
        "【前回の芯】",
        "【いまの差分】",
        "【次の一手】",
        "CONTINUITY_ROUTE_HOLD_V1",
        "priorRouteReasonEcho",
        "priorRouteReasonCarry",
    ]
    results: list[dict[str, Any]] = []
    for key, msg in probes:
        r = chat_probe(base, f"tid-{run_id}-{key}", msg)
        resp = str(r["response"])
        rr = str(r["routeReason"])
        meta_hit = any(t in resp for t in meta_tokens)
        technical_misroute = key.startswith("tech_") and rr == "NATURAL_GENERAL_LLM_TOP"
        results.append(
            {
                "probe": key,
                "message": msg,
                "status": r["status"],
                "routeReason": rr,
                "response_head": resp[:260],
                "meta_leak": meta_hit,
                "technical_misroute": technical_misroute,
            }
        )
    meta_leak_count = sum(1 for x in results if x["meta_leak"])
    technical_misroute_count = sum(1 for x in results if x["technical_misroute"])
    return {
        "card": CARD5,
        "generated_at": utc(),
        "run_id": run_id,
        "meta_leak_count": meta_leak_count,
        "technical_misroute_count": technical_misroute_count,
        "pass": meta_leak_count == 0 and technical_misroute_count == 0,
        "results": results,
    }


def card6_probe(base: str, run_id: str) -> dict[str, Any]:
    probes = [
        ("mizuho", "水穂伝とは何ですか"),
        ("kotodama_hisho", "言霊秘書とはどういう書物ですか"),
        ("kukai", "空海の即身成仏とは何か"),
        ("narasaki", "楢崎皐月は何をした人ですか"),
        ("hokke", "法華経の核心を教えてください"),
        ("katakamuna", "カタカムナの宇宙観を説明してください"),
    ]
    banned = ["SOGO_1号_pdf", "KUKAI_COLLECTION_0002", "目次", "請来目録", "訳注", "資料要旨では"]
    coaching = ["どこから見ますか", "次の一手として", "判断軸を一つ選び"]
    results: list[dict[str, Any]] = []
    for key, msg in probes:
        r = chat_probe(base, f"tid-{run_id}-{key}", msg)
        resp = str(r["response"])
        rr = str(r["routeReason"])
        hits = [t for t in banned if t in resp]
        ch = [t for t in coaching if t in resp]
        need_context = rr == "DEF_DICT_NEED_CONTEXT"
        results.append(
            {
                "probe": key,
                "message": msg,
                "status": r["status"],
                "routeReason": rr,
                "response_head": resp[:260],
                "need_context": need_context,
                "raw_hits": hits,
                "coaching_hits": ch,
            }
        )
    def_escape_count = sum(1 for x in results if x["need_context"])
    raw_count = sum(1 for x in results if x["raw_hits"])
    coach_count = sum(1 for x in results if x["coaching_hits"])
    return {
        "card": CARD6,
        "generated_at": utc(),
        "run_id": run_id,
        "def_dict_need_context_escape_count": def_escape_count,
        "raw_ocr_dump_count": raw_count,
        "generic_coaching_tail_count": coach_count,
        "scripture_surface_naturalized": (def_escape_count == 0 and raw_count == 0 and coach_count == 0),
        "pass": (def_escape_count == 0 and raw_count == 0 and coach_count == 0),
        "results": results,
    }


def classify_rejudge_blockers(summary: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for b in summary.get("remaining_blockers") or []:
        s = str(b).lower()
        if "stale_sources" in s or "stale source" in s:
            out.append(str(b))
        elif "repo_hygiene" in s:
            out.append(str(b))
        elif "product_failure" in s:
            out.append(str(b))
    return out


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
    auto.mkdir(parents=True, exist_ok=True)
    base = args.base.rstrip("/")

    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    log_dir = auto / "out" / "logs" / f"card_{MASTER}" / ts
    log_dir.mkdir(parents=True, exist_ok=True)

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # CARD1
    r1 = run_cmd(["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")], repo, log_dir / "card1.log", 2400)
    v1 = read_json(auto / "tenmon_self_build_real_closed_loop_proof_verdict.json")
    p1 = bool(v1.get("real_closed_loop_proven"))
    stages.append({"card": CARD1, **r1, "pass": p1})
    if not p1:
        failed_card = CARD1

    # CARD2
    card2 = {"must_block_seal": None, "repo_hygiene_clean": None}
    if failed_card is None:
        r2 = run_cmd(["bash", str(scripts / "tenmon_repo_hygiene_final_seal_v1.sh"), "--stdout-json"], repo, log_dir / "card2.log", 1800)
        s2 = read_json(auto / "tenmon_repo_hygiene_final_seal_summary.json")
        card2["must_block_seal"] = bool(s2.get("must_block_seal", True))
        card2["repo_hygiene_clean"] = bool(s2.get("repo_hygiene_clean", False))
        p2 = (card2["must_block_seal"] is False) and (card2["repo_hygiene_clean"] is True)
        stages.append({"card": CARD2, **r2, "pass": p2, **card2})
        if not p2:
            failed_card = CARD2
    else:
        stages.append({"card": CARD2, "skipped": True, "pass": False, "reason": "prior_failed"})

    # CARD3
    card3 = {"autonomy_cycle_pass": None, "safe_scope_enforced": None}
    if failed_card is None:
        r3 = run_cmd(["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh")], repo, log_dir / "card3.log", 2400)
        s3 = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
        card3["autonomy_cycle_pass"] = bool(s3.get("autonomy_cycle_pass"))
        card3["safe_scope_enforced"] = bool(s3.get("safe_scope_enforced"))
        p3 = (card3["autonomy_cycle_pass"] is True) and (card3["safe_scope_enforced"] is True)
        stages.append({"card": CARD3, **r3, "pass": p3, **card3})
        if not p3:
            failed_card = CARD3
    else:
        stages.append({"card": CARD3, "skipped": True, "pass": False, "reason": "prior_failed"})

    # CARD4
    card4 = {"latest_truth_rebased": None, "truth_source_singleton": None}
    if failed_card is None:
        r4 = run_cmd(["bash", str(scripts / "tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh")], repo, log_dir / "card4.log", 2400)
        s4 = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
        card4["latest_truth_rebased"] = bool(s4.get("latest_truth_rebased"))
        card4["truth_source_singleton"] = bool(s4.get("truth_source_singleton"))
        p4 = (card4["latest_truth_rebased"] is True) and (card4["truth_source_singleton"] is True)
        stages.append({"card": CARD4, **r4, "pass": p4, **card4})
        if not p4:
            failed_card = CARD4
    else:
        stages.append({"card": CARD4, "skipped": True, "pass": False, "reason": "prior_failed"})

    # CARD5
    card5 = {"meta_leak_count": None, "technical_misroute_count": None}
    if failed_card is None:
        p5run = card5_probe(base, f"master-chat-{int(time.time())}")
        card5["meta_leak_count"] = int(p5run["meta_leak_count"])
        card5["technical_misroute_count"] = int(p5run["technical_misroute_count"])
        p5 = bool(p5run["pass"])
        write_json(auto / "tenmon_chat_surface_stopbleed_summary.json", p5run)
        stages.append({"card": CARD5, "pass": p5, **card5, "probe_count": len(p5run["results"])})
        if not p5:
            failed_card = CARD5
    else:
        stages.append({"card": CARD5, "skipped": True, "pass": False, "reason": "prior_failed"})

    # CARD6
    card6 = {"scripture_surface_naturalized": None, "def_dict_need_context_escape_count": None}
    if failed_card is None:
        p6run = card6_probe(base, f"master-scripture-{int(time.time())}")
        card6["scripture_surface_naturalized"] = bool(p6run["scripture_surface_naturalized"])
        card6["def_dict_need_context_escape_count"] = int(p6run["def_dict_need_context_escape_count"])
        p6 = bool(p6run["pass"])
        write_json(auto / "tenmon_scripture_naturalizer_summary.json", p6run)
        stages.append(
            {
                "card": CARD6,
                "pass": p6,
                "scripture_surface_naturalized": card6["scripture_surface_naturalized"],
                "def_dict_need_context_escape_count": card6["def_dict_need_context_escape_count"],
                "probe_count": len(p6run["results"]),
            }
        )
        if not p6:
            failed_card = CARD6
    else:
        stages.append({"card": CARD6, "skipped": True, "pass": False, "reason": "prior_failed"})

    # Final rejudge acceptance
    rj = run_cmd(
        ["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")],
        repo,
        log_dir / "final_rejudge.log",
        2400,
    )
    rjs = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    rejudge_bad = classify_rejudge_blockers(rjs)
    rejudge_main_axis_cleared = len(rejudge_bad) == 0

    final_acceptance = {
        "real_closed_loop_proven": bool(v1.get("real_closed_loop_proven")),
        "repo_hygiene_sealable": (card2["must_block_seal"] is False) and (card2["repo_hygiene_clean"] is True),
        "autonomy_cycle_proven": (card3["autonomy_cycle_pass"] is True) and (card3["safe_scope_enforced"] is True),
        "latest_truth_rebased": card4["latest_truth_rebased"] is True,
        "meta_leak_zero": card5["meta_leak_count"] == 0,
        "technical_misroute_zero": card5["technical_misroute_count"] == 0,
        "scripture_naturalization_pass": card6["scripture_surface_naturalized"] is True
        and card6["def_dict_need_context_escape_count"] == 0,
        "rejudge_main_axis_cleared": rejudge_main_axis_cleared,
        "rejudge_blockers_in_scope": rejudge_bad,
    }

    master_pass = failed_card is None and all(bool(v) for k, v in final_acceptance.items() if k != "rejudge_blockers_in_scope")

    fail_target = failed_card
    if not master_pass and not fail_target:
        fail_target = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"

    out = {
        "master_card": MASTER,
        "generated_at": utc(),
        "master_pass": master_pass,
        "failed_card": fail_target,
        "stages": stages,
        "final_rejudge": {"ok": rj["ok"], "returncode": rj["returncode"], "log_file": rj["log_file"]},
        "final_acceptance": final_acceptance,
        "outputs": {
            "summary": str(auto / OUT_SUMMARY),
            "report": str(auto / OUT_REPORT),
        },
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": "single_retry_card_only_and_stop",
        "log_dir": str(log_dir),
    }
    write_json(auto / OUT_SUMMARY, out)

    md = [
        f"# {MASTER}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- master_pass: `{master_pass}`",
        f"- failed_card: `{fail_target}`",
        f"- log_dir: `{log_dir}`",
        "",
        "## Stage Gates",
    ]
    for s in stages:
        md.append(f"- {s.get('card')}: pass=`{s.get('pass')}`")
    md.extend(
        [
            "",
            "## Final Acceptance",
            f"- real closed loop proven: `{final_acceptance['real_closed_loop_proven']}`",
            f"- repo hygiene sealable: `{final_acceptance['repo_hygiene_sealable']}`",
            f"- autonomy cycle proven: `{final_acceptance['autonomy_cycle_proven']}`",
            f"- latest truth rebased: `{final_acceptance['latest_truth_rebased']}`",
            f"- meta leak 0: `{final_acceptance['meta_leak_zero']}`",
            f"- technical misroute 0: `{final_acceptance['technical_misroute_zero']}`",
            f"- scripture naturalization pass: `{final_acceptance['scripture_naturalization_pass']}`",
            f"- rejudge main axis cleared: `{final_acceptance['rejudge_main_axis_cleared']}`",
            f"- rejudge blockers in scope: `{final_acceptance['rejudge_blockers_in_scope']}`",
            "",
            f"- NEXT_ON_PASS: `{NEXT_ON_PASS}`",
        ]
    )
    if not master_pass and fail_target:
        md.append(f"- NEXT_ON_FAIL: `{fail_target.replace('_CURSOR_AUTO_V1', '_RETRY_CURSOR_AUTO_V1')}` (single retry only)")
    (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

    if not master_pass and fail_target:
        retry = {
            "source_master": MASTER,
            "generated_at": utc(),
            "failed_card": fail_target,
            "single_retry_only": True,
            "retry_card_name": fail_target.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1"),
            "stop_master_after_emit": True,
        }
        write_json(auto / OUT_FAIL_NEXT, retry)

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

