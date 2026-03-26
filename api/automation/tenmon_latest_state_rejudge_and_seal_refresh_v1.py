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
import sys
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
NEXT_ON_PASS = "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_RETRY_CURSOR_AUTO_V1"


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


def response_len(chat_json: dict[str, Any]) -> int:
    return len(str(chat_json.get("response") or "").strip())


def meta_leak_false(chat_json: dict[str, Any]) -> bool:
    t = str(chat_json.get("response") or "")
    if not t.strip():
        return True
    if any(x in t for x in ("priorRouteReason", "keep_center_one_step", "decisionFrame")):
        return False
    if re.search(r"\b[A-Z][A-Z0-9_]{4,}_V1\b", t):
        return False
    return True


RR_K1 = "K1_TRACE_EMPTY_GATED_V1"
RR_GEN = "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1"
RR_AI = "AI_CONSCIOUSNESS_LOCK_V1"
RR_SUBCONCEPT = "TENMON_SUBCONCEPT_CANON_V1"


def probe_route_axis(
    base: str,
    thread_id: str,
    message: str,
    expected_rr: str,
    min_len: int,
) -> dict[str, Any]:
    r = http_post_json(f"{base}/api/chat", {"threadId": thread_id, "message": message})
    j = r.get("json") if isinstance(r.get("json"), dict) else {}
    rr = route_reason(j)
    ln = response_len(j)
    ml = meta_leak_false(j)
    ok = rr == expected_rr and ln >= min_len and ml
    return {
        "route": rr,
        "len": ln,
        "response_nonempty": ln > 0,
        "meta_leak_ok": ml,
        "satisfied": ok,
        "http_status": r.get("status"),
        "thread_id": thread_id,
    }


def pwa_final_superseded_by_lived(lived: dict[str, Any], pwa_final: dict[str, Any]) -> tuple[bool, str | None]:
    lived_ready = bool(lived.get("final_ready") is True)
    final_ready = bool(pwa_final.get("final_ready") is True)
    tl = source_generated_at(lived)
    tf = source_generated_at(pwa_final)
    if not (lived_ready and not final_ready):
        return False, None
    if tl is None:
        return True, "lived_ready_final_not_no_lived_ts"
    if tf is None or tl >= tf:
        return True, "lived_newer_or_final_time_missing"
    return False, None


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
    lived = sources.get("pwa_lived_completion_readiness.json") or {}
    pwa_final = sources.get("pwa_final_completion_readiness.json") or {}
    pwa_sup, pwa_reason = pwa_final_superseded_by_lived(lived, pwa_final)
    if pwa_sup:
        hints.append(f"pwa_final_completion_readiness.json:superseded_by_lived:{pwa_reason or 'lived_truth'}")
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


def add_blocker(blockers: list[str], tag: str) -> None:
    if tag not in blockers:
        blockers.append(tag)


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

    lived_early = sources.get("pwa_lived_completion_readiness.json") or {}
    pwa_final_early = sources.get("pwa_final_completion_readiness.json") or {}
    pwa_superseded, pwa_sup_reason = pwa_final_superseded_by_lived(lived_early, pwa_final_early)

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
    cont_len = response_len(c2j)
    ts_probe = int(time.time())
    msg_k1_hokke = os.environ.get(
        "TENMON_REJUDGE_K1_HOKKE_PROBE_MSG",
        "法華経とは何かを140字前後で答えて",
    )
    msg_k1_kukai = os.environ.get(
        "TENMON_REJUDGE_K1_KUKAI_PROBE_MSG",
        "空海の即身成仏とは何かを140字前後で答えて",
    )
    msg_gen = os.environ.get(
        "TENMON_REJUDGE_GENERAL_PROBE_MSG",
        "現代人のよくない点を一般知識として300字前後で説明して",
    )
    msg_ai = os.environ.get(
        "TENMON_REJUDGE_AI_LOCK_PROBE_MSG",
        "あなた自身をどう見ているかを160字前後で答えて",
    )
    msg_subconcept = os.environ.get(
        "TENMON_REJUDGE_SUBCONCEPT_PROBE_MSG",
        "言霊の下位概念を一つだけ短く示して",
    )

    k1_probe_hokke = probe_route_axis(base, f"probe_k1_hokke_{ts_probe}", msg_k1_hokke, RR_K1, 120)
    k1_probe_kukai = probe_route_axis(base, f"probe_k1_kukai_{ts_probe}", msg_k1_kukai, RR_K1, 120)
    gen_probe = probe_route_axis(base, f"probe_general_{ts_probe}", msg_gen, RR_GEN, 260)
    ai_probe = probe_route_axis(base, f"probe_ai_{ts_probe}", msg_ai, RR_AI, 140)
    subconcept_probe = probe_route_axis(base, f"probe_subconcept_{ts_probe}", msg_subconcept, RR_SUBCONCEPT, 1)
    subconcept_probe["satisfied"] = bool(
        subconcept_probe.get("route") == RR_SUBCONCEPT
        and int(subconcept_probe.get("len") or 0) > 0
        and bool(subconcept_probe.get("meta_leak_ok"))
    )

    resolved_dialogue_axes: list[str] = []
    if k1_probe_hokke.get("satisfied") and k1_probe_kukai.get("satisfied"):
        resolved_dialogue_axes.append("k1_depth")
    if gen_probe.get("satisfied"):
        resolved_dialogue_axes.append("general_substance")
    if ai_probe.get("satisfied"):
        resolved_dialogue_axes.append("ai_self_view")
    if subconcept_probe.get("satisfied"):
        resolved_dialogue_axes.append("subconcept_nonempty")
    must_fix_exclusion_substrings: list[str] = []
    if "k1_depth" in resolved_dialogue_axes:
        must_fix_exclusion_substrings.extend(["k1_trace_empty", "K1_TRACE_EMPTY", "k1_trace_empty_short"])
    if "general_substance" in resolved_dialogue_axes:
        must_fix_exclusion_substrings.extend(
            ["general_knowledge_insufficient", "GENERAL_KNOWLEDGE_EXPLAIN", "general_knowledge"]
        )
    fresh_probe_digest: dict[str, Any] = {
        "continuity_followup_len": cont_len,
        "continuity_probe_thread": probe_tid,
        "chat1_route": rr1,
        "chat2_route": rr2,
        "k1_probe_hokke": k1_probe_hokke,
        "k1_probe_kukai": k1_probe_kukai,
        "general_probe": gen_probe,
        "ai_consciousness_lock_probe": ai_probe,
        "subconcept_probe": subconcept_probe,
        "continuity_density_unresolved": bool(rr2 == "CONTINUITY_ROUTE_HOLD_V1" and cont_len < 80),
    }

    pre = sources.get("pwa_playwright_preflight.json") or {}
    env_failure = bool(pre.get("usable") is False or pre.get("env_failure") is True)

    lived = lived_early
    pwa_final = pwa_final_early
    remote_admin = sources.get("tenmon_remote_admin_cursor_runtime_proof_verdict.json") or {}
    hyg = sources.get("tenmon_repo_hygiene_watchdog_verdict.json") or {}
    score = sources.get("tenmon_worldclass_acceptance_scorecard.json") or {}
    sv = sources.get("tenmon_system_verdict.json") or {}
    self_build = sources.get("tenmon_self_build_execution_chain_verdict.json") or {}

    # lived truth を primary source とし、旧 final readiness へのフォールバックはしない
    lived_pass = bool(lived.get("final_ready") is True)
    product_failure = bool((not cont_ok) or ((not lived_pass) and (not env_failure)))

    repo_must_block = bool(hyg.get("must_block_seal"))
    untracked, modified = git_status_counts(repo_root)
    cleanup_only_residue = bool(repo_must_block and untracked < 50 and modified < 20)

    stale_inputs = list_stale_hints(auto, sources, health_ok, cont_ok, excluded_sources)[:120]
    actionable_stale_inputs: list[str] = []
    for it in stale_inputs:
        nm = it.split(":", 1)[0] if ":" in it else it
        if nm in excluded_sources:
            continue
        if nm in {"tenmon_latest_state_rejudge_and_seal_refresh_verdict.json", "tenmon_latest_state_rejudge_summary.json"} and ":continuity_drop_premise" in it:
            # self-generated historical snapshots should not keep stale as primary blocker once fresh probes are present
            continue
        if ":superseded_by_lived:" in it:
            continue
        actionable_stale_inputs.append(it)

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
    if pwa_superseded:
        stale_source_names = sorted(set(stale_source_names) | {"pwa_final_completion_readiness.json"})
    # lived JSON は primary truth — stale ヒントに含まれても superseded に回さない
    stale_name_set = set(stale_source_names) - {"pwa_lived_completion_readiness.json"}
    latest_sources: list[dict[str, Any]] = []
    superseded_sources: list[dict[str, Any]] = []
    for name in priority_order:
        p = auto / name
        js = sources.get(name) or {}
        info = compact_source_info(name, p, js)
        if name != "pwa_lived_completion_readiness.json" and (
            name in stale_name_set or name in excluded_sources
        ):
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

    if pwa_superseded:
        pfp = auto / "pwa_final_completion_readiness.json"
        superseded_sources.append(
            {
                **compact_source_info("pwa_final_completion_readiness.json", pfp, pwa_final),
                "reason": "superseded_by_pwa_lived_truth",
                "detail": pwa_sup_reason,
            }
        )

    prev = sources.get("tenmon_latest_state_rejudge_and_seal_refresh_verdict.json") or {}
    prev_cont = bool(prev.get("continuity_ok"))
    prev_health = bool(prev.get("health_ok"))
    prev_audit = bool(prev.get("audit_ok"))
    prev_ab = bool(prev.get("audit_build_ok"))
    mismatch = (prev and ((prev_health != health_ok) or (prev_audit != audit_ok) or (prev_ab != audit_build_ok)))
    continuity_changed = bool(prev and prev_cont != cont_ok)

    seal_refresh_needed = bool(mismatch or continuity_changed or len(stale_inputs) > 0 or pwa_superseded)

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

    continuity_density_short = bool(cont_len < 80)
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
    if actionable_stale_inputs:
        remaining_blockers.append("stale_sources_present")
    if continuity_density_short:
        remaining_blockers.insert(0, "conversation_continuity:continuity_hold_density_insufficient")

    # scorecard / system verdict — 観測のみ（推測で PASS 付与しない）
    if not score or not score.get("generated_at"):
        add_blocker(remaining_blockers, "scorecard_missing_or_empty")
    else:
        if score.get("worldclass_ready") is not True:
            add_blocker(remaining_blockers, "scorecard_worldclass_not_ready")
        if score.get("sealed_operable_ready") is not True:
            add_blocker(remaining_blockers, "scorecard_sealed_operable_not_ready")
    if sv:
        if sv.get("completion_gate") is False:
            add_blocker(remaining_blockers, "system_verdict_completion_gate_false")
        if sv.get("os_gate") is False:
            add_blocker(remaining_blockers, "system_verdict_os_gate_false")

    sys_gates_ok = True
    if sv:
        if sv.get("completion_gate") is False:
            sys_gates_ok = False
        if sv.get("os_gate") is False:
            sys_gates_ok = False
    worldclass_ready_candidate = bool(score.get("worldclass_ready") is True and sys_gates_ok)

    if continuity_density_short:
        recommended = "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1"
    elif repo_must_block and not cleanup_only_residue:
        recommended = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
    elif actionable_stale_inputs:
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
    worldclass_claim_ready = bool(seal_ready and operable_ready and worldclass_ready_candidate)

    pwa_final_stale_postfix_blockers: list[str] = (
        [str(x) for x in (pwa_final.get("postfix_blockers") or [])] if pwa_superseded else []
    )
    latest_truth_resolved_from: list[str] = [
        "pwa_lived_completion_readiness.json",
        "latest_gate_check",
        "latest_continuity_probe",
        "fresh_k1_general_probes",
    ]
    if pwa_superseded:
        latest_truth_resolved_from.insert(
            0,
            "pwa_lived_completion_readiness.json overrides pwa_final_completion_readiness.json",
        )

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "seal_ready": seal_ready,
        "operable_ready": operable_ready,
        "worldclass_claim_ready": worldclass_claim_ready,
        "remaining_blockers": remaining_blockers,
        "recommended_next_card": recommended,
        "latest_sources": latest_sources,
        "stale_sources": stale_source_names,
        "stale_sources_present": bool(actionable_stale_inputs),
        "stale_inputs_actionable": actionable_stale_inputs,
        "superseded_sources": superseded_sources,
        "latest_truth_rebased": bool(rebase_summary.get("latest_truth_rebased") is True),
        "truth_source_singleton": bool(rebase_summary.get("truth_source_singleton") is True),
        "truth_excluded_sources": sorted(excluded_sources),
        "worldclass_ready_candidate": worldclass_ready_candidate,
        "latest_truth_resolved_from": latest_truth_resolved_from,
        "pwa_final_superseded_by_lived": pwa_superseded,
        "pwa_final_stale_postfix_blockers": pwa_final_stale_postfix_blockers,
        "resolved_dialogue_axes": resolved_dialogue_axes,
        "fresh_probe_digest": fresh_probe_digest,
        "must_fix_exclusion_substrings": must_fix_exclusion_substrings,
    }

    verdict = {
        "card": CARD,
        "generated_at": summary["generated_at"],
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
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
        "stale_sources_present": bool(actionable_stale_inputs),
        "stale_inputs_actionable": actionable_stale_inputs,
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
            "runtime_http": {
                "health_ok_http": bool(health_probe.get("ok_http")),
                "health_json_ok": health_probe.get("json", {}).get("ok") if isinstance(health_probe.get("json"), dict) else None,
                "audit_ok_http": bool(audit_probe.get("ok_http")),
                "audit_json_ok": audit_probe.get("json", {}).get("ok") if isinstance(audit_probe.get("json"), dict) else None,
                "audit_build_ok_http": bool(audit_build_probe.get("ok_http")),
                "audit_build_json_ok": audit_build_probe.get("json", {}).get("ok")
                if isinstance(audit_build_probe.get("json"), dict)
                else None,
            },
            "scorecard_observed": {
                "generated_at": score.get("generated_at"),
                "worldclass_ready": score.get("worldclass_ready"),
                "sealed_operable_ready": score.get("sealed_operable_ready"),
            },
            "system_verdict_observed": {
                "generated_at": sv.get("generated_at"),
                "pass": sv.get("pass"),
                "completion_gate": sv.get("completion_gate"),
                "os_gate": sv.get("os_gate"),
            },
            "continuity_probe": {
                "thread_id": probe_tid,
                "chat1_route_reason": rr1,
                "chat2_route_reason": rr2,
                "chat2_answer_head": response_head(c2j),
                "continuity_followup_len": cont_len,
                "fresh_probe_digest": fresh_probe_digest,
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

    (auto / OUT_SUMMARY_JSON).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if pwa_superseded:
        pf_merge = dict(pwa_final)
        pf_merge["lived_truth_reconciliation"] = {
            "written_at": summary["generated_at"],
            "superseded_by": "pwa_lived_completion_readiness.json",
            "reason": pwa_sup_reason,
            "stale_postfix_blockers": pwa_final_stale_postfix_blockers,
        }
        (auto / "pwa_final_completion_readiness.json").write_text(
            json.dumps(pf_merge, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    loop_path = auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"
    if loop_path.is_file():
        try:
            loop_js = read_json(loop_path)
            outs = loop_js.setdefault("outputs", {})
            cur_bl = list(outs.get("current_blockers") or [])
            new_bl: list[str] = []
            for line in cur_bl:
                if not line.startswith("dialogue_priority_axes:"):
                    new_bl.append(line)
                    continue
                rest = line.split(":", 1)[1] if ":" in line else ""
                parts = [p.strip() for p in rest.split(",") if p.strip()]
                parts = [p for p in parts if p not in resolved_dialogue_axes]
                if parts:
                    new_bl.append("dialogue_priority_axes: " + ", ".join(parts))
            outs["current_blockers"] = new_bl
            outs["next_best_card"] = recommended
            loop_js["rejudge_sync"] = {
                "generated_at": summary["generated_at"],
                "resolved_dialogue_axes": resolved_dialogue_axes,
                "fresh_probe_digest": fresh_probe_digest,
                "recommended_next_card": recommended,
            }
            loop_path.write_text(json.dumps(loop_js, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        except Exception:
            pass

    sc_run = subprocess.run(
        [sys.executable, str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")],
        cwd=str(repo_root / "api"),
        capture_output=True,
        text=True,
        timeout=180,
    )
    verdict["scorecard_refresh"] = {
        "exit_code": sc_run.returncode,
        "stderr_tail": (sc_run.stderr or "")[-2000:],
    }

    (auto / OUT_JSON).write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
    md.append("## Chain")
    md.append(f"- **next_on_pass**: `{NEXT_ON_PASS}`")
    md.append(f"- **retry_card** (fail 時 1 枚): `{RETRY_CARD}`")
    md.append(f"- {NEXT_ON_FAIL_NOTE}")
    md.append("")
    md.append("## Policy")
    md.append("- observation first, no speculative patch")
    md.append("- stale report overwrite allowed; raw evidence kept")
    md.append("- final claim is not made in this card")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))
    else:
        print(
            json.dumps(
                {
                    "ok": bool(verdict["pass"]),
                    "path": str(auto / OUT_JSON),
                    "summary_path": str(auto / OUT_SUMMARY_JSON),
                    "seal_ready": seal_ready,
                    "operable_ready": operable_ready,
                    "worldclass_claim_ready": worldclass_claim_ready,
                    "remaining_blockers": remaining_blockers,
                    "recommended_next_card": recommended,
                    "next_on_pass": NEXT_ON_PASS,
                    "retry_card": RETRY_CARD,
                },
                ensure_ascii=False,
            )
        )

    return 0 if verdict["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
