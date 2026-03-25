#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
OUT_MD = "tenmon_latest_state_rejudge_and_seal_refresh_report.md"
OUT_SUMMARY_JSON = "tenmon_latest_state_rejudge_summary.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def parse_dt(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    s = raw.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except Exception:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def http_get_json(url: str, timeout: float = 20.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            try:
                js = json.loads(body)
            except Exception:
                js = {}
            return {"ok_http": res.status == 200, "status": res.status, "json": js, "body": body[:8000]}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": e.code, "json": {}, "body": body[:8000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e), "body": ""}


def http_post_json(url: str, payload: dict[str, Any], timeout: float = 30.0) -> dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            try:
                js = json.loads(body)
            except Exception:
                js = {}
            return {"ok_http": res.status == 200, "status": res.status, "json": js, "body": body[:12000]}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": e.code, "json": {}, "body": body[:12000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e), "body": ""}


def route_reason(chat_json: dict[str, Any]) -> str:
    df = chat_json.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict) and ku.get("routeReason"):
            return str(ku.get("routeReason")).strip()
    return ""


def response_head(chat_json: dict[str, Any]) -> str:
    t = str(chat_json.get("response") or "").strip()
    return t[:120] if t else ""


def continuity_ok(rr2: str, chat2: dict[str, Any], same_thread: bool) -> bool:
    if not same_thread:
        return False
    if rr2 == "NATURAL_GENERAL_LLM_TOP":
        return False
    if rr2 == "CONTINUITY_ROUTE_HOLD_V1":
        return True
    if rr2.startswith("CONTINUITY_") or "FOLLOWUP" in rr2:
        return True
    ku = {}
    df = chat2.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku") if isinstance(df.get("ku"), dict) else {}
    prior = str(ku.get("priorRouteReasonCarry") or ku.get("priorRouteReasonEcho") or "")
    if prior == "EXPLICIT_CHAR_PREEMPT_V1":
        return True
    tc = chat2.get("threadCore")
    if isinstance(tc, dict) and tc:
        return True
    return False


def git_status_counts(repo_root: Path) -> tuple[int, int]:
    p = subprocess.run(
        ["git", "-C", str(repo_root), "status", "--short"],
        capture_output=True,
        text=True,
        check=False,
    )
    txt = p.stdout or ""
    untracked = 0
    modified = 0
    for ln in txt.splitlines():
        if not ln.strip():
            continue
        if ln.startswith("??"):
            untracked += 1
        else:
            modified += 1
    return untracked, modified


def list_stale_hints(
    auto: Path,
    sources: dict[str, dict[str, Any]],
    health_ok: bool,
    continuity_live_ok: bool,
    excluded_sources: set[str] | None = None,
) -> list[str]:
    hints: list[str] = []
    ex = excluded_sources or set()
    latest = sources.get("tenmon_latest_state_rejudge_and_seal_refresh_verdict.json") or {}
    latest_ts = parse_dt(latest.get("generated_at"))
    now = datetime.now(timezone.utc)
    for name, js in sources.items():
        if name in ex:
            continue
        if not js:
            continue
        ts = parse_dt(js.get("generated_at") or js.get("timestamp"))
        if ts is None:
            hints.append(f"{name}:missing_generated_at")
        else:
            age_h = (now - ts).total_seconds() / 3600.0
            if age_h > 12:
                hints.append(f"{name}:older_than_12h")
            if latest_ts and ts < latest_ts:
                hints.append(f"{name}:older_than_latest_refresh")
        txt = json.dumps(js, ensure_ascii=False)
        if health_ok and ("health_404" in txt or "Cannot GET /api/health" in txt):
            hints.append(f"{name}:health_404_era_artifact")
        if continuity_live_ok and ("NATURAL_GENERAL_LLM_TOP" in txt or "continuity_route_drop" in txt):
            hints.append(f"{name}:continuity_drop_premise")
        if "env_failure" in js and js.get("env_failure") is True and "product" in txt and "blocker" in txt:
            hints.append(f"{name}:env_failure_mixed_with_product")
    return sorted(set(hints))


def source_generated_at(js: dict[str, Any]) -> datetime | None:
    if not isinstance(js, dict) or not js:
        return None
    return parse_dt(js.get("generated_at") or js.get("timestamp") or js.get("created_at") or js.get("updated_at"))


def compact_source_info(name: str, path: Path, js: dict[str, Any]) -> dict[str, Any]:
    st = path.stat() if path.exists() else None
    ts = source_generated_at(js)
    return {
        "name": name,
        "path": str(path),
        "exists": path.exists(),
        "generated_at": ts.isoformat().replace("+00:00", "Z") if ts else None,
        "mtime_epoch": st.st_mtime if st else None,
    }


def _exclusion_names_from_list(raw: Any) -> set[str]:
    out: set[str] = set()
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.add(x.strip())
        elif isinstance(x, dict) and x.get("name"):
            out.add(str(x.get("name")).strip())
    return out


def load_truth_rebase_exclusions(auto: Path) -> tuple[set[str], dict[str, Any]]:
    reb = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    bad: set[str] = set()
    bad |= _exclusion_names_from_list(reb.get("superseded_sources"))
    bad |= _exclusion_names_from_list(reb.get("missing_generated_at_closed"))
    stale = read_json(auto / "tenmon_stale_evidence_invalidation_verdict.json")
    bad |= _exclusion_names_from_list(stale.get("superseded_sources"))
    bad |= _exclusion_names_from_list(stale.get("missing_generated_at_closed"))
    bad |= _exclusion_names_from_list(stale.get("truth_excluded_sources"))
    reg = read_json(auto / "tenmon_truth_excluded_sources_registry_v1.json")
    bad |= _exclusion_names_from_list(reg.get("excluded"))
    return bad, reb


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo_root / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    base = str(args.base).rstrip("/")

    source_names = [
        "tenmon_chat_continuity_deep_forensic.json",
        "tenmon_latest_state_rejudge_summary.json",
        "tenmon_system_verdict.json",
        "tenmon_current_state_detailed_report.json",
        "pwa_lived_completion_readiness.json",
        "pwa_final_completion_readiness.json",
        "tenmon_worldclass_acceptance_scorecard.json",
        "tenmon_repo_hygiene_watchdog_verdict.json",
        "tenmon_remote_admin_cursor_runtime_proof_verdict.json",
        "tenmon_self_build_execution_chain_verdict.json",
        "tenmon_self_repair_safe_loop_verdict.json",
        "tenmon_self_repair_acceptance_seal_verdict.json",
        "pwa_playwright_preflight.json",
        "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json",
    ]
    sources = {n: read_json(auto / n) for n in source_names}
    excluded_sources, rebase_summary = load_truth_rebase_exclusions(auto)

    # live probes
    health_probe = http_get_json(f"{base}/api/health")
    audit_probe = http_get_json(f"{base}/api/audit")
    audit_build_probe = http_get_json(f"{base}/api/audit.build")

    health_ok = bool(health_probe.get("ok_http") and health_probe.get("json", {}).get("ok") is True)
    audit_ok = bool(audit_probe.get("ok_http") and audit_probe.get("json", {}).get("ok") is True)
    audit_build_ok = bool(audit_build_probe.get("ok_http") and audit_build_probe.get("json", {}).get("ok") is True)

    probe_tid = f"probe_rejudge_{int(time.time())}"
    chat1 = http_post_json(f"{base}/api/chat", {"threadId": probe_tid, "message": "言霊とは何かを100字前後で答えて"})
    chat2 = http_post_json(f"{base}/api/chat", {"threadId": probe_tid, "message": "前の返答を受けて、要点を一つだけ継続して"})
    c1j = chat1.get("json") if isinstance(chat1.get("json"), dict) else {}
    c2j = chat2.get("json") if isinstance(chat2.get("json"), dict) else {}
    rr1 = route_reason(c1j)
    rr2 = route_reason(c2j)
    th_same = bool(str(c1j.get("threadId") or "") and str(c1j.get("threadId")) == str(c2j.get("threadId") or ""))
    cont_ok = continuity_ok(rr2, c2j, th_same)

    pre = sources.get("pwa_playwright_preflight.json") or {}
    env_failure = bool(pre.get("usable") is False or pre.get("env_failure") is True)

    lived = sources.get("pwa_lived_completion_readiness.json") or {}
    pwa_final = sources.get("pwa_final_completion_readiness.json") or {}
    remote_admin = sources.get("tenmon_remote_admin_cursor_runtime_proof_verdict.json") or {}
    hyg = sources.get("tenmon_repo_hygiene_watchdog_verdict.json") or {}
    score = sources.get("tenmon_worldclass_acceptance_scorecard.json") or {}
    self_build = sources.get("tenmon_self_build_execution_chain_verdict.json") or {}

    # lived truth を primary source とし、旧 final readiness へのフォールバックはしない
    lived_pass = bool(lived.get("final_ready") is True)
    product_failure = bool((not cont_ok) or ((not lived_pass) and (not env_failure)))

    repo_must_block = bool(hyg.get("must_block_seal"))
    untracked, modified = git_status_counts(repo_root)
    cleanup_only_residue = bool(repo_must_block and untracked < 50 and modified < 20)

    stale_inputs = list_stale_hints(auto, sources, health_ok, cont_ok, excluded_sources)[:120]

    # latest truth source priority (cursor-local first)
    priority_order = [
        "tenmon_chat_continuity_deep_forensic.json",
        "tenmon_latest_state_rejudge_summary.json",
        "tenmon_repo_hygiene_watchdog_verdict.json",
        "pwa_lived_completion_readiness.json",
        "tenmon_system_verdict.json",
        "tenmon_worldclass_acceptance_scorecard.json",
    ]
    stale_source_names = sorted({x.split(":", 1)[0] for x in stale_inputs if ":" in x})
    stale_name_set = set(stale_source_names)
    latest_sources: list[dict[str, Any]] = []
    superseded_sources: list[dict[str, Any]] = []
    for name in priority_order:
        p = auto / name
        js = sources.get(name) or {}
        info = compact_source_info(name, p, js)
        if name in stale_name_set or name in excluded_sources:
            superseded_sources.append({**info, "reason": "superseded_by_latest_lived_truth"})
        else:
            latest_sources.append(info)
    latest_sources.insert(
        0,
        {
            "name": "latest_gate_check",
            "path": f"{base}/api/health|audit|audit.build",
            "exists": True,
            "generated_at": utc(),
            "mtime_epoch": None,
        },
    )
    latest_sources.insert(
        1,
        {
            "name": "latest_continuity_probe",
            "path": f"{base}/api/chat (threadId={probe_tid})",
            "exists": True,
            "generated_at": utc(),
            "mtime_epoch": None,
        },
    )
    # stale but outside priority set
    for name in sorted(set(stale_source_names) | set(excluded_sources)):
        if name in priority_order:
            continue
        p = auto / name
        js = sources.get(name) or {}
        superseded_sources.append(
            {
                **compact_source_info(name, p, js),
                "reason": "superseded_by_latest_lived_truth",
            }
        )

    prev = sources.get("tenmon_latest_state_rejudge_and_seal_refresh_verdict.json") or {}
    prev_cont = bool(prev.get("continuity_ok"))
    prev_health = bool(prev.get("health_ok"))
    prev_audit = bool(prev.get("audit_ok"))
    prev_ab = bool(prev.get("audit_build_ok"))
    mismatch = (prev and ((prev_health != health_ok) or (prev_audit != audit_ok) or (prev_ab != audit_build_ok)))
    continuity_changed = bool(prev and prev_cont != cont_ok)

    seal_refresh_needed = bool(mismatch or continuity_changed or len(stale_inputs) > 0)

    self_build_closed = bool(
        self_build.get("accepted_complete") is True
        or self_build.get("pass") is True
        or self_build.get("ok") is True
    )

    operable_ready_candidate = bool(
        health_ok
        and audit_ok
        and audit_build_ok
        and cont_ok
        and ((not repo_must_block) or cleanup_only_residue)
        and self_build_closed
        and (not product_failure)
    )

    # deliberately conservative for this card
    worldclass_ready_candidate = False

    remaining_blockers: list[str] = []
    if not health_ok:
        remaining_blockers.append("health_not_ok")
    if not audit_ok:
        remaining_blockers.append("audit_not_ok")
    if not audit_build_ok:
        remaining_blockers.append("audit_build_not_ok")
    if not cont_ok:
        remaining_blockers.append("continuity_not_ok")
    if repo_must_block and not cleanup_only_residue:
        remaining_blockers.append("repo_hygiene_must_block_seal")
    if not self_build_closed:
        remaining_blockers.append("self_build_not_closed")
    if product_failure:
        remaining_blockers.append("product_failure_detected")
    if env_failure:
        remaining_blockers.append("env_failure_detected")
    if stale_inputs:
        remaining_blockers.append("stale_sources_present")

    if repo_must_block and not cleanup_only_residue:
        recommended = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
    elif stale_inputs:
        recommended = "TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1"
    elif operable_ready_candidate:
        recommended = "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"
    else:
        recommended = "TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1"

    if operable_ready_candidate and env_failure:
        overall_band = "operable_ready_lived_pending"
    elif health_ok and audit_ok and audit_build_ok and (not cont_ok):
        overall_band = "runtime_good_continuity_pending"
    elif operable_ready_candidate:
        overall_band = "operable_ready_candidate"
    else:
        overall_band = "needs_repair"

    seal_ready = bool((not seal_refresh_needed) and operable_ready_candidate and (not env_failure))
    operable_ready = bool(operable_ready_candidate and not product_failure)
    worldclass_claim_ready = bool(worldclass_ready_candidate and seal_ready and len(remaining_blockers) == 0)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "seal_ready": seal_ready,
        "operable_ready": operable_ready,
        "worldclass_claim_ready": worldclass_claim_ready,
        "remaining_blockers": remaining_blockers,
        "recommended_next_card": recommended,
        "latest_sources": latest_sources,
        "stale_sources": stale_source_names,
        "superseded_sources": superseded_sources,
        "latest_truth_rebased": bool(rebase_summary.get("latest_truth_rebased") is True),
        "truth_source_singleton": bool(rebase_summary.get("truth_source_singleton") is True),
        "truth_excluded_sources": sorted(excluded_sources),
    }

    verdict = {
        "card": CARD,
        "generated_at": summary["generated_at"],
        "pass": bool(seal_ready),
        "overall_band": overall_band,
        "seal_ready": seal_ready,
        "operable_ready": operable_ready,
        "worldclass_claim_ready": worldclass_claim_ready,
        "remaining_blockers": remaining_blockers,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "continuity_ok": cont_ok,
        "continuity_route_reason": rr2,
        "continuity_thread_same": th_same,
        "env_failure": env_failure,
        "product_failure": product_failure,
        "stale_inputs": stale_inputs,
        "seal_refresh_needed": seal_refresh_needed,
        "operable_ready_candidate": operable_ready_candidate,
        "worldclass_ready_candidate": worldclass_ready_candidate,
        "recommended_next_card": recommended,
        "latest_sources": latest_sources,
        "stale_sources": stale_source_names,
        "superseded_sources": superseded_sources,
        "latest_truth_rebased": bool(rebase_summary.get("latest_truth_rebased") is True),
        "truth_source_singleton": bool(rebase_summary.get("truth_source_singleton") is True),
        "truth_excluded_sources": sorted(excluded_sources),
        "evidence": {
            "runtime": {
                "base": base,
                "health_status": health_probe.get("status"),
                "audit_status": audit_probe.get("status"),
                "audit_build_status": audit_build_probe.get("status"),
            },
            "continuity_probe": {
                "thread_id": probe_tid,
                "chat1_route_reason": rr1,
                "chat2_route_reason": rr2,
                "chat2_answer_head": response_head(c2j),
                "chat1_http_status": chat1.get("status"),
                "chat2_http_status": chat2.get("status"),
            },
            "repo_hygiene": {
                "must_block_seal": repo_must_block,
                "untracked_count": untracked,
                "modified_count": modified,
                "cleanup_only_residue": cleanup_only_residue,
            },
            "remote_admin_runtime_proven": bool(
                remote_admin.get("remote_admin_runtime_proven") is True
                or remote_admin.get("pass") is True
            ),
            "sources_read": {k: str(auto / k) for k in source_names},
            "truth_rebase_summary": str(auto / "tenmon_latest_truth_rebase_summary.json"),
        },
        "summary": summary,
    }

    (auto / OUT_JSON).write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / OUT_SUMMARY_JSON).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{verdict['generated_at']}`",
        f"- pass: `{verdict['pass']}`",
        f"- seal_ready: `{seal_ready}`",
        f"- operable_ready: `{operable_ready}`",
        f"- worldclass_claim_ready: `{worldclass_claim_ready}`",
        f"- overall_band: `{overall_band}`",
        f"- recommended_next_card: `{recommended}`",
        "",
        "## Runtime",
        f"- health_ok: `{health_ok}`",
        f"- audit_ok: `{audit_ok}`",
        f"- audit_build_ok: `{audit_build_ok}`",
        "",
        "## Continuity",
        f"- continuity_ok: `{cont_ok}`",
        f"- continuity_route_reason: `{rr2}`",
        f"- continuity_thread_same: `{th_same}`",
        "",
        "## Separation",
        f"- env_failure: `{env_failure}`",
        f"- product_failure: `{product_failure}`",
        "",
        "## Stale Inputs",
    ]
    if stale_inputs:
        md.extend([f"- `{x}`" for x in stale_inputs])
    else:
        md.append("- none")
    md.append("")
    md.append("## Source Split")
    md.append("- latest_sources:")
    if latest_sources:
        md.extend([f"  - `{x['name']}`" for x in latest_sources])
    else:
        md.append("  - none")
    md.append("- superseded_sources:")
    if superseded_sources:
        md.extend([f"  - `{x['name']}` ({x['reason']})" for x in superseded_sources])
    else:
        md.append("  - none")
    md.append("")
    md.append("## Policy")
    md.append("- observation first, no speculative patch")
    md.append("- stale report overwrite allowed; raw evidence kept")
    md.append("- final claim is not made in this card")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))

    return 0 if verdict["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
