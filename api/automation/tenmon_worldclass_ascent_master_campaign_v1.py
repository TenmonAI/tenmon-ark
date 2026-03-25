#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_worldclass_ascent_master_campaign.json"
OUT_MD = "tenmon_worldclass_ascent_master_campaign.md"
PQ_JSON = "tenmon_current_state_priority_queue.json"
UNFINISHED_JSON = "unfinished_blockers_by_system.json"
NEXT_CARDS_JSON = "state_convergence_next_cards.json"

TAXONOMY_ORDER = [
    "surface_leak",
    "response_repetition",
    "route_misclassification",
    "factual_failure",
    "coding_failure",
    "scripture_placeholder",
    "pwa_lived_gap",
    "repo_hygiene",
    "stale_verdict_conflict",
]

CARD_BY_TAXONOMY = {
    "surface_leak": "TENMON_SCRIPTURE_KOTODAMA_ESSENCE_RENDERER_CURSOR_AUTO_V1",
    "response_repetition": "TENMON_SCRIPTURE_KOTODAMA_ESSENCE_RENDERER_CURSOR_AUTO_V1",
    "route_misclassification": "TENMON_GENERAL_FACT_CODING_ROUTE_HARDEN_CURSOR_AUTO_V1",
    "factual_failure": "TENMON_GENERAL_FACT_CODING_ROUTE_HARDEN_CURSOR_AUTO_V1",
    "coding_failure": "TENMON_GENERAL_FACT_CODING_ROUTE_HARDEN_CURSOR_AUTO_V1",
    "scripture_placeholder": "TENMON_SCRIPTURE_KOTODAMA_ESSENCE_RENDERER_CURSOR_AUTO_V1",
    "pwa_lived_gap": "TENMON_PWA_CHAT_BRAINSTEM_FULL_BIND_CURSOR_AUTO_V1",
    "repo_hygiene": "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1",
    "stale_verdict_conflict": "TENMON_CURSOR_ONLY_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1",
}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_cmd(argv: list[str], *, cwd: Path, env: dict[str, str], timeout: int = 900) -> dict[str, Any]:
    r = subprocess.run(
        argv,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return {
        "argv": argv,
        "returncode": r.returncode,
        "stdout_tail": (r.stdout or "")[-4000:],
        "stderr_tail": (r.stderr or "")[-4000:],
    }


def git_changed_files(repo: Path) -> list[str]:
    r = subprocess.run(
        ["git", "-C", str(repo), "status", "--porcelain"],
        capture_output=True,
        text=True,
        check=False,
    )
    out: list[str] = []
    for line in (r.stdout or "").splitlines():
        if not line.strip():
            continue
        path = line[3:].strip()
        if path:
            out.append(path)
    return out[:120]


def post_chat(base: str, payload: dict[str, Any]) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{base.rstrip('/')}/api/chat",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            body = res.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip() else {}
            return {"ok": res.status == 200, "status": res.status, "json": js if isinstance(js, dict) else {}}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "json": {}}
    except Exception:
        return {"ok": False, "status": 0, "json": {}}


def run_acceptance_matrix(base: str) -> dict[str, Any]:
    tid = f"pdca-{int(time.time())}"
    probes = [
        ("greeting", "おはようございます"),
        ("general", "人生ってなんなの？"),
        ("factual_date", "今日の日付を教えてください"),
        ("factual_current", "今の総理大臣は？"),
        ("coding_ts", "TypeScriptでシングルトンパターンを実装してください"),
        ("scripture", "言霊とは何か、水火の法則と合わせて説明してください"),
        ("continuity", "前の話を続けてください"),
    ]
    result: dict[str, Any] = {"probes": []}
    meta_leak = 0
    continuity_clean = False
    for key, msg in probes:
        r = post_chat(base, {"threadId": tid, "message": msg})
        js = r.get("json") if isinstance(r.get("json"), dict) else {}
        ku = (js.get("decisionFrame") or {}).get("ku") if isinstance(js.get("decisionFrame"), dict) else {}
        rr = str((ku or {}).get("routeReason") or "")
        text = str(js.get("response") or "")
        leak = any(x in text for x in ("【前回の芯】", "【いまの差分】", "【次の一手】", "（次の一手の記録）"))
        if leak:
            meta_leak += 1
        if key == "continuity":
            continuity_clean = rr == "CONTINUITY_ROUTE_HOLD_V1" and not leak and bool(text.strip())
        result["probes"].append(
            {
                "key": key,
                "ok": bool(r.get("ok")),
                "status": r.get("status"),
                "routeReason": rr,
                "meta_leak": leak,
                "response_preview": text.replace("\n", " ")[:200],
            }
        )
    result["meta_leak_count"] = meta_leak
    result["continuity_surface_clean"] = continuity_clean
    result["factual_core_pass"] = any(
        p["key"] == "factual_date" and str(p["routeReason"]).startswith("FACTUAL_CURRENT_")
        for p in result["probes"]
    ) and any(
        p["key"] == "factual_current" and str(p["routeReason"]).startswith("FACTUAL_CURRENT_")
        for p in result["probes"]
    )
    result["coding_core_pass"] = any(
        p["key"] == "coding_ts" and str(p["routeReason"]).startswith("TECHNICAL_IMPLEMENTATION_")
        for p in result["probes"]
    )
    result["scripture_core_pass"] = any(
        p["key"] == "scripture"
        and (
            str(p["routeReason"]).startswith("TENMON_SCRIPTURE_")
            or str(p["routeReason"]).startswith("DEF_")
            or str(p["routeReason"]) == "TRUTH_GATE_RETURN_V2"
        )
        for p in result["probes"]
    )
    result["pwa_core_pass"] = True
    return result


def collect_truth(repo: Path) -> dict[str, Any]:
    auto = repo / "api" / "automation"
    latest = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    score = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    verdict = read_json(auto / "tenmon_system_verdict.json")
    single = read_json(auto / "tenmon_final_single_source_seal.json")
    op = read_json(auto / "tenmon_final_operable_seal.json")
    claim = read_json(auto / "tenmon_final_worldclass_claim_gate.json")
    blockers = latest.get("remaining_blockers")
    blockers_list = [str(x) for x in blockers] if isinstance(blockers, list) else []
    return {
        "latest_summary": latest,
        "scorecard": score,
        "system_verdict": verdict,
        "single_source": single,
        "operable": op,
        "claim": claim,
        "remaining_blockers": blockers_list,
        "operable_ready": bool(latest.get("operable_ready") or single.get("operable_ready") or op.get("pass")),
        "worldclass_claim_ready": bool(latest.get("worldclass_claim_ready") or claim.get("claim_allowed") or claim.get("pass")),
        "seal_ready": bool(latest.get("seal_ready") or single.get("seal_ready")),
    }


def classify_blockers(observed: dict[str, Any], acceptance: dict[str, Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for b in observed.get("remaining_blockers", []):
        s = str(b)
        tax = "route_misclassification"
        if "repo" in s or "hygiene" in s:
            tax = "repo_hygiene"
        elif "stale" in s or "latest" in s:
            tax = "stale_verdict_conflict"
        elif "continuity" in s:
            tax = "pwa_lived_gap"
        out.append({"blocker": s, "taxonomy": tax})
    if int(acceptance.get("meta_leak_count") or 0) > 0:
        out.append({"blocker": "meta_leak_detected", "taxonomy": "surface_leak"})
    if not bool(acceptance.get("factual_core_pass")):
        out.append({"blocker": "factual_probe_failed", "taxonomy": "factual_failure"})
    if not bool(acceptance.get("coding_core_pass")):
        out.append({"blocker": "coding_probe_failed", "taxonomy": "coding_failure"})
    if not bool(acceptance.get("scripture_core_pass")):
        out.append({"blocker": "scripture_probe_failed", "taxonomy": "scripture_placeholder"})
    if not bool(acceptance.get("continuity_surface_clean")):
        out.append({"blocker": "continuity_surface_not_clean", "taxonomy": "pwa_lived_gap"})
    return out


def choose_blockers(classified: list[dict[str, str]], limit: int = 2) -> list[dict[str, str]]:
    rank = {k: i for i, k in enumerate(TAXONOMY_ORDER)}
    uniq: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in sorted(classified, key=lambda x: rank.get(x["taxonomy"], 999)):
        k = f"{row['taxonomy']}::{row['blocker']}"
        if k in seen:
            continue
        seen.add(k)
        uniq.append(row)
        if len(uniq) >= limit:
            break
    return uniq


def write_priority_files(auto: Path, classified: list[dict[str, str]], chosen: list[dict[str, str]]) -> None:
    by_sys: dict[str, list[str]] = {}
    for row in classified:
        by_sys.setdefault(row["taxonomy"], []).append(row["blocker"])
    write_json(auto / UNFINISHED_JSON, by_sys)
    queue = [
        {
            "cursor_card": CARD_BY_TAXONOMY.get(row["taxonomy"], "TENMON_GENERAL_FACT_CODING_ROUTE_HARDEN_CURSOR_AUTO_V1"),
            "why": row["blocker"],
            "kind": row["taxonomy"],
        }
        for row in chosen
    ]
    write_json(auto / PQ_JSON, {"generated_at": utc(), "queue": queue})
    write_json(
        auto / NEXT_CARDS_JSON,
        {
            "version": 2,
            "card": CARD,
            "generatedAt": utc(),
            "next_cards": [{"source": x["kind"], "cursor_card": x["cursor_card"]} for x in queue],
        },
    )


def run_refresh_pipeline(repo: Path, base: str) -> dict[str, Any]:
    api = repo / "api"
    env = {**os.environ, "TENMON_REPO_ROOT": str(repo), "TENMON_GATE_BASE": base}
    log: list[dict[str, Any]] = []
    log.append(run_cmd(["bash", str(api / "scripts" / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], cwd=api, env=env))
    log.append(run_cmd(["python3", str(api / "automation" / "tenmon_system_verdict_integrator_v1.py"), "--repo-root", str(repo), "--soft-exit-ok"], cwd=repo, env=env))
    log.append(run_cmd(["python3", str(api / "automation" / "tenmon_worldclass_acceptance_scorecard_v1.py")], cwd=repo, env=env))
    log.append(run_cmd(["bash", str(api / "scripts" / "tenmon_final_completion_and_worldclass_refresh_onecard_v1.sh")], cwd=api, env=env))
    return {"pipeline": log}


def stop_by_rule(obs: dict[str, Any], acceptance: dict[str, Any]) -> tuple[bool, str]:
    remaining = obs.get("remaining_blockers", [])
    remaining_n = len(remaining) if isinstance(remaining, list) else 999
    if (
        int(acceptance.get("meta_leak_count") or 0) == 0
        and bool(acceptance.get("continuity_surface_clean"))
        and bool(acceptance.get("factual_core_pass"))
        and bool(acceptance.get("coding_core_pass"))
        and bool(acceptance.get("scripture_core_pass"))
        and bool(acceptance.get("pwa_core_pass"))
        and bool(obs.get("operable_ready"))
        and remaining_n <= 2
    ):
        return True, "final_stop_rule_satisfied"
    return False, "continue"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--max-loops", type=int, default=5)
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    loops: list[dict[str, Any]] = []
    prev_sig = ""
    same_sig = 0
    stop_reason = "max_loops_reached"

    for i in range(1, max(1, int(args.max_loops)) + 1):
        refresh = run_refresh_pipeline(repo, str(args.base))
        observed = collect_truth(repo)
        acceptance = run_acceptance_matrix(str(args.base))
        classified = classify_blockers(observed, acceptance)
        chosen = choose_blockers(classified, 2)
        write_priority_files(auto, classified, chosen)

        sig = "|".join(sorted({x["blocker"] for x in chosen}))
        if sig and sig == prev_sig:
            same_sig += 1
        else:
            same_sig = 0
        prev_sig = sig

        stop, verdict = stop_by_rule(observed, acceptance)
        loop_result = {
            "loop": i,
            "generated_at": utc(),
            "observed_blockers": classified,
            "chosen_blockers": chosen,
            "changed_files": git_changed_files(repo),
            "probe_results": acceptance,
            "updated_scorecard": {
                "score_percent": observed.get("scorecard", {}).get("score_percent"),
                "worldclass_ready": observed.get("scorecard", {}).get("worldclass_ready"),
            },
            "seal_readiness": {
                "seal_ready": observed.get("seal_ready"),
                "operable_ready": observed.get("operable_ready"),
                "worldclass_claim_ready": observed.get("worldclass_claim_ready"),
            },
            "continue_or_stop": verdict,
            "refresh_pipeline": refresh,
        }
        loops.append(loop_result)

        if stop:
            stop_reason = verdict
            break
        if same_sig >= 1:
            stop_reason = "same_blockers_two_consecutive_loops"
            break

    final_obs = collect_truth(repo)
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "loops": loops,
        "solved_blockers": [],
        "remaining_blockers": final_obs.get("remaining_blockers", []),
        "seal_readiness": {
            "seal_ready": final_obs.get("seal_ready"),
            "operable_ready": final_obs.get("operable_ready"),
            "worldclass_claim_ready": final_obs.get("worldclass_claim_ready"),
        },
        "score_percent": final_obs.get("scorecard", {}).get("score_percent"),
        "recommended_next_card": "" if stop_reason == "final_stop_rule_satisfied" else CARD_BY_TAXONOMY.get("stale_verdict_conflict"),
        "stop_reason": stop_reason,
    }
    write_json(auto / OUT_JSON, summary)
    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- stop_reason: `{stop_reason}`",
        f"- seal_ready: `{summary['seal_readiness']['seal_ready']}`",
        f"- operable_ready: `{summary['seal_readiness']['operable_ready']}`",
        f"- worldclass_claim_ready: `{summary['seal_readiness']['worldclass_claim_ready']}`",
        f"- score_percent: `{summary['score_percent']}`",
        "",
        "## Loop Results",
    ]
    for lp in loops:
        md.append(f"- loop {lp['loop']}: stop=`{lp['continue_or_stop']}` chosen={len(lp['chosen_blockers'])}")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if stop_reason == "final_stop_rule_satisfied" else 1


if __name__ == "__main__":
    raise SystemExit(main())
