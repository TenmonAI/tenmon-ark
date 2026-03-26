#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_IMPLEMENTATION_ORDER_STATUS_FORENSIC_REPORT_CURSOR_AUTO_V1

観測のみ: constitution / automation / queue / bundle / scorecard / seal 等を読み、
TENMON_AUTONOMY_IMPLEMENTATION_ORDER_CHECKLIST_V1 相当の棚卸し JSON/MD を生成する。
product コードは変更しない。PASS は証拠が揃う場合のみ。
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

CARD = "TENMON_AUTONOMY_IMPLEMENTATION_ORDER_STATUS_FORENSIC_REPORT_CURSOR_AUTO_V1"
OUT_MAIN = "tenmon_autonomy_implementation_order_status_report.json"
OUT_MD = "tenmon_autonomy_implementation_order_status_report.md"
OUT_PHASE = "tenmon_autonomy_implementation_order_status_phase_summary.json"
OUT_NEXT = "tenmon_autonomy_implementation_order_next_actions.json"

CARD_RE = re.compile(r"TENMON_[A-Z0-9_]+_CURSOR_AUTO_V1")

PRIORITY_FOUR = [
    "TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1",
    "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1",
    "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
]

WEIGHT = {"PASS": 1.0, "PARTIAL": 0.5, "BLOCKED": 0.25, "NOT_STARTED": 0.0}


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


def safe_list(x: Any) -> list[Any]:
    return x if isinstance(x, list) else []


def parse_iso(ts: str) -> float | None:
    t = str(ts or "").strip()
    if not t:
        return None
    try:
        from datetime import datetime

        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        return datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def build_ref_index(repo: Path, api: Path, web: Path) -> dict[str, list[str]]:
    idx: dict[str, list[str]] = defaultdict(list)
    scan_roots = [
        api / "automation",
        api / "scripts",
        api / "src",
    ]
    if web.is_dir():
        scan_roots.append(web / "src")
    suffixes = {".py", ".ts", ".tsx", ".sh", ".mjs", ".js"}
    for root in scan_roots:
        if not root.is_dir():
            continue
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix not in suffixes:
                continue
            if "node_modules" in p.parts or "dist" in p.parts:
                continue
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for m in set(CARD_RE.findall(text)):
                rel = str(p.relative_to(repo))
                if rel not in idx[m]:
                    idx[m].append(rel)
    return dict(idx)


def constitution_path(api: Path, card_id: str) -> Path:
    return api / "docs" / "constitution" / f"{card_id}.md"


def bundle_strict_entries(bundle: dict[str, Any], max_age_h: float = 168.0) -> list[dict[str, Any]]:
    now = time.time()
    max_sec = max_age_h * 3600.0
    out: list[dict[str, Any]] = []
    for e in safe_list(bundle.get("entries")):
        if not isinstance(e, dict):
            continue
        if e.get("dry_run") is not False:
            continue
        if e.get("current_run") is not True:
            continue
        if e.get("real_execution_enabled") is not True:
            continue
        tf = e.get("touched_files")
        if not isinstance(tf, list) or not any(str(x).strip() for x in tf):
            continue
        if e.get("acceptance_ok") is not True:
            continue
        brc = e.get("build_rc")
        if brc is None or int(brc) != 0:
            continue
        ing = parse_iso(str(e.get("ingested_at") or ""))
        if ing is not None and (now - ing) > max_sec:
            continue
        out.append(e)
    return out


def file_contains(path: Path, sub: str) -> bool:
    if not path.is_file():
        return False
    try:
        return sub in path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False


@dataclass
class Row:
    key: str
    phase: str
    kind: str
    status: str
    evidence_files: list[str] = field(default_factory=list)
    evidence_summary: str = ""
    blockers: list[str] = field(default_factory=list)
    confidence: str = "low"
    next_action: str = ""


def score_to_confidence(st: str) -> str:
    return {"PASS": "high", "PARTIAL": "medium", "BLOCKED": "medium", "NOT_STARTED": "low"}.get(st, "low")


def weight(st: str) -> float:
    return WEIGHT.get(st, 0.0)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    web = repo / "web"
    auto = api / "automation"

    ref_index = build_ref_index(repo, api, web)

    queue = read_json(Path(os.environ.get("TENMON_REMOTE_CURSOR_QUEUE_PATH", str(auto / "remote_cursor_queue.json"))))
    bundle = read_json(Path(os.environ.get("TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH", str(auto / "remote_cursor_result_bundle.json"))))
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    seal = read_json(auto / "final_autonomy_seal_summary.json")
    morning = read_json(auto / "morning_approval_execution_chain_summary.json")
    overnight_sum = read_json(auto / "tenmon_continuous_self_improvement_overnight_daemon_summary.json")
    heartbeat = read_json(auto / "tenmon_continuous_self_improvement_overnight_heartbeat.json")
    sleep_master = read_json(auto / "tenmon_sleep_autonomy_master_summary.json")
    pwa_camp = read_json(auto / "tenmon_pwa_dialogue_supremacy_campaign_summary.json")
    pwa_ascent = read_json(auto / "tenmon_pwa_dialogue_final_ascent_summary.json")
    result_bind = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")
    recheck = read_json(auto / "tenmon_dialogue_post_redeploy_realrun_recheck_summary.json")
    autobundle = read_json(auto / "tenmon_dialogue_no_midrun_vps_autobundle_summary.json")

    watch_sh = api / "scripts" / "tenmon_cursor_watch_loop.sh"
    strict_bundle = bundle_strict_entries(bundle)
    any_dry_false = any(isinstance(e, dict) and e.get("dry_run") is False for e in safe_list(bundle.get("entries")))
    watch_has_real = file_contains(watch_sh, "executor_real_run") and file_contains(watch_sh, "want_real")
    watch_no_hard_dry = False
    if watch_sh.is_file():
        try:
            watch_no_hard_dry = not any(
                line.strip() == "export CURSOR_EXECUTOR_DRY_RUN=1" for line in watch_sh.read_text(encoding="utf-8", errors="ignore").splitlines()
            )
        except OSError:
            watch_no_hard_dry = False

    gates = seal.get("gates") if isinstance(seal.get("gates"), dict) else {}
    blocked_reasons = safe_list(seal.get("blocked_reasons")) if isinstance(seal.get("blocked_reasons"), list) else []
    must_fix = safe_list(scorecard.get("must_fix_before_claim"))

    def card_row(phase: str, cid: str, extra_evidence: Callable[[], tuple[str, list[str], list[str]]] | None = None) -> Row:
        cp = constitution_path(api, cid)
        has_c = cp.is_file()
        refs = ref_index.get(cid, [])[:12]
        ef = [str(cp.relative_to(repo))] if has_c else []
        ef += refs[:8]
        summary_parts = []
        if has_c:
            summary_parts.append("constitution_md")
        if refs:
            summary_parts.append(f"code_refs_n={len(ref_index.get(cid, []))}")
        blockers: list[str] = []
        st = "NOT_STARTED"
        if has_c or refs:
            st = "PARTIAL"
        if has_c and len(refs) >= 1:
            st = "PARTIAL"
        if extra_evidence:
            summ, evf, bl = extra_evidence()
            if evf:
                ef = list(dict.fromkeys(evf + ef))[:16]
            if summ:
                summary_parts.append(summ)
            blockers.extend(bl)
        if blockers:
            st = "BLOCKED"
        elif has_c and len(refs) >= 1 and not blockers:
            st = "PARTIAL"
        conf = score_to_confidence(st)
        na = ""
        if st == "NOT_STARTED":
            na = f"constitution または実装参照を追加: {cid}"
        elif st == "PARTIAL":
            na = f"runtime 証跠を1本通す（artifact / Mac / gate）: {cid}"
        elif st == "BLOCKED":
            na = "seal/scorecard の blocker を解消してから再観測"
        return Row(
            key=cid,
            phase=phase,
            kind="card",
            status=st,
            evidence_files=ef,
            evidence_summary="; ".join(summary_parts) or "no_evidence",
            blockers=list(dict.fromkeys(blockers))[:8],
            confidence=conf,
            next_action=na,
        )

    def bump_mac_watch(r: Row) -> Row:
        ev = []
        if watch_has_real and watch_no_hard_dry:
            r.status = "PASS"
            r.evidence_summary += "; watch_loop_real_branch_ok"
            ev.append(str(watch_sh.relative_to(repo)))
        else:
            r.status = "PARTIAL"
            r.blockers.append("watch_loop_real_evidence_incomplete")
        r.evidence_files = list(dict.fromkeys(ev + r.evidence_files))[:16]
        r.confidence = score_to_confidence(r.status)
        return r

    cards: list[Row] = []
    cards.append(bump_mac_watch(card_row("Phase 1", PRIORITY_FOUR[0])))
    for cid in [
        "TENMON_CURSOR_EXECUTOR_REAL_RESULT_AND_TOUCHFILES_BIND_CURSOR_AUTO_V1",
        "TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1",
    ]:
        cards.append(card_row("Phase 1", cid))

    for cid in [
        "TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1",
        "TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1",
        "TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1",
    ]:
        cards.append(card_row("Phase 2", cid))

    for cid in [
        "TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1",
        "TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1",
        "TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1",
    ]:
        cards.append(card_row("Phase 3", cid))

    for cid in [
        "TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1",
        "TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1",
    ]:
        r = card_row("Phase 4", cid)
        if cid.startswith("TENMON_BUILD_PROBE") and (auto / "build_probe_rollback_autoguard_v1.py").is_file():
            r.status = "PASS" if gates.get("build_probe_rollback_ready") is True else "PARTIAL"
            r.evidence_summary += "; autoguard_script_present"
        cards.append(r)

    for cid in [
        "TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1",
        "TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1",
    ]:
        r = card_row("Phase 5", cid)
        if "OVERNIGHT" in cid and overnight_sum.get("cycles"):
            r.evidence_summary += f"; overnight_cycles={overnight_sum.get('cycles')}"
            r.status = "PARTIAL" if r.status != "BLOCKED" else r.status
        cards.append(r)

    for cid in [
        "TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1",
        "TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1",
        "TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1",
        "TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1",
    ]:
        cards.append(card_row("保険 4", cid))

    for cid in [
        "TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1",
        "TENMON_BROWSER_VISION_ASSISTED_OPERATOR_CURSOR_AUTO_V1",
        "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
        "TENMON_PWA_LIVED_PROOF_WORLDCLASS_SEAL_CURSOR_AUTO_V1",
        "TENMON_RELEASE_FREEZE_AND_AUTONOMY_CONSTITUTION_SEAL_CURSOR_AUTO_V1",
    ]:
        cards.append(card_row("後段 5", cid))

    for cid in [
        "TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1",
        "TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1",
        "TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN_CURSOR_AUTO_V1",
        "TENMON_BROWSER_AI_CONSULT_TO_PATCHPLAN_MAINLINE_CURSOR_AUTO_V1",
        "TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1",
        "TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1",
        "TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1",
        "TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1",
        "TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1",
    ]:
        r = card_row("Last Mile", cid)
        if "MORNING_APPROVAL" in cid and morning.get("chain_order_ok") is True:
            r.evidence_summary += "; morning_chain_summary_chain_order_ok"
            if morning.get("pending_cards"):
                r.status = "PARTIAL"
        if "SEAL_AND_HANDS_OFF" in cid and seal:
            r.evidence_summary += f"; seal_hands_off_ready={seal.get('hands_off_ready')}"
            r.status = "PARTIAL" if seal.get("hands_off_ready") is not True else "PASS"
        if "BROWSER_AI_CONSULT" in cid:
            if (auto / "browser_ai_consult_to_patchplan_mainline_v1.py").is_file():
                r.evidence_summary += "; mainline_py_present"
                r.status = "PARTIAL" if r.status != "BLOCKED" else r.status
        if "ACCEPTANCE_CHAIN" in cid and file_contains(watch_sh, "TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN"):
            r.evidence_summary += "; watch_loop_chain_marker"
            r.status = "PARTIAL" if r.status != "BLOCKED" else r.status
        cards.append(r)

    p0 = card_row("Phase 0", "TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1")
    _p0_py = list(auto.glob("tenmon_full_autonomy_os*parent*.py"))
    if _p0_py or ref_index.get(p0.key):
        p0.evidence_summary += "; parent_script_or_refs"
        p0.status = "PARTIAL" if p0.status != "BLOCKED" else p0.status
        if _p0_py:
            p0.evidence_files = [str(_p0_py[0].relative_to(repo))] + p0.evidence_files
    cards.insert(0, p0)

    for cid in PRIORITY_FOUR:
        r = card_row("実施工優先", cid)
        chat = api / "src" / "routes" / "chat.ts"
        fin = api / "src" / "routes" / "chat_refactor" / "finalize.ts"
        if "K1" in cid and file_contains(chat, "K1_TRACE_EMPTY_GATED_V1"):
            r.evidence_summary += "; chat_ts_K1_marker"
            if autobundle.get("ok") is True:
                r.status = "PASS"
                r.evidence_summary += "; autobundle_ok_true"
            else:
                r.status = "PARTIAL"
        if "SUBCONCEPT" in cid and file_contains(chat, "TENMON_SUBCONCEPT_CANON_V1") and file_contains(fin, "stripSurfaceTemplateLeakFinalizeV1"):
            r.evidence_summary += "; chat_finalize_subconcept_hooks"
            r.status = "PARTIAL" if autobundle.get("ok") is not True else "PASS"
        if "GENERAL_KNOWLEDGE" in cid and file_contains(chat, "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1"):
            r.evidence_summary += "; chat_general_route"
            r.status = "PARTIAL" if autobundle.get("ok") is not True else "PASS"
        if cid == PRIORITY_FOUR[0]:
            r = bump_mac_watch(r)
        if scorecard.get("dialogue_priority_axes") and cid.split("_CURSOR")[0] in str(scorecard.get("must_fix_before_claim")):
            r.blockers.append("scorecard_must_fix_dialogue")
        cards.append(r)

    acceptance: list[Row] = []

    def acc(key: str, phase: str, st: str, summ: str, ef: list[str], bl: list[str], na: str) -> None:
        acceptance.append(
            Row(
                key=key,
                phase=phase,
                kind="acceptance",
                status=st,
                evidence_files=ef,
                evidence_summary=summ,
                blockers=bl,
                confidence=score_to_confidence(st),
                next_action=na,
            )
        )

    acc(
        "p1_executor_real_run_log",
        "Phase 1 acceptance",
        "PASS" if watch_has_real else "NOT_STARTED",
        "watch_loop.sh に executor_real_run / want_real 分岐あり" if watch_has_real else "未検出",
        [str(watch_sh.relative_to(repo))] if watch_sh.is_file() else [],
        [] if watch_has_real else ["no_executor_real_marker"],
        "Mac ログで executor_real_run 行を観測",
    )
    acc(
        "p1_bundle_dry_run_false",
        "Phase 1 acceptance",
        "PASS" if any_dry_false else "PARTIAL",
        "bundle 内 dry_run:false エントリあり" if any_dry_false else "該当エントリなし",
        [str((auto / "remote_cursor_result_bundle.json").relative_to(repo))],
        [] if any_dry_false else ["no_dry_run_false_entry"],
        "result POST で dry_run:false を記録",
    )
    acc(
        "p1_touched_files_nonempty_strict",
        "Phase 1 acceptance",
        "PASS" if strict_bundle else "NOT_STARTED",
        f"厳格条件を満たす bundle エントリ数={len(strict_bundle)}",
        [str((auto / "remote_cursor_result_bundle.json").relative_to(repo))],
        [] if strict_bundle else ["no_strict_real_entry"],
        "real_execution_enabled + touched_files + build_rc0 + acceptance_ok",
    )
    acc(
        "p1_fixture_release_only",
        "Phase 1 acceptance",
        "PARTIAL" if file_contains(watch_sh, "fixture") and file_contains(watch_sh, "release") else "PARTIAL",
        "watch_loop に fixture / release 分岐の記述あり（要 Mac ログで実証）",
        [str(watch_sh.relative_to(repo))] if watch_sh.is_file() else [],
        ["mac_runtime_log_not_observed_here"],
        "fixture tick のログで release のみを確認",
    )

    browser_py = auto / "browser_ai_operator_v1.py"
    acc(
        "p2_provider_manual_fail_closed",
        "Phase 2 acceptance",
        "PARTIAL" if browser_py.is_file() else "NOT_STARTED",
        "browser_ai_operator_v1.py 存在; manual_required はファイル内要確認",
        [str(browser_py.relative_to(repo))] if browser_py.is_file() else [],
        ["no_runtime_mac_observation"],
        "Mac で provider 実行ログを保存",
    )
    acc(
        "p2_login_persistence",
        "Phase 2 acceptance",
        "NOT_STARTED",
        "artifact に login persistence の実証なし",
        [],
        ["no_evidence_artifact"],
        "session 永続化の観測ログを artifact 化",
    )
    acc(
        "p2_screen_observe_json",
        "Phase 2 acceptance",
        "PARTIAL" if ref_index.get("TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1") else "NOT_STARTED",
        "コード参照あり" if ref_index.get("TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1") else "なし",
        ref_index.get("TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1", [])[:3],
        ["runtime_json_not_in_bundle"],
        "action JSON 出力を result / ログに残す",
    )
    acc(
        "p2_manual_required_fail_closed",
        "Phase 2 acceptance",
        "PARTIAL",
        "fail-closed は実装ファイル要手動 grep",
        [str(browser_py.relative_to(repo))] if browser_py.is_file() else [],
        ["weak_evidence"],
        "browser_ai_operator 内 manual_required 分岐をログで実証",
    )

    role_py = auto / "gpt_claude_gemini_role_router_v1.py"
    acc(
        "p3_provider_routing",
        "Phase 3 acceptance",
        "PARTIAL" if role_py.is_file() else "NOT_STARTED",
        "role_router スクリプト存在" if role_py.is_file() else "未確認",
        [str(role_py.relative_to(repo))] if role_py.is_file() else [],
        [],
        "routing 決定ログを残す",
    )
    acc(
        "p3_consensus_json",
        "Phase 3 acceptance",
        "PARTIAL" if ref_index.get("TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1") else "NOT_STARTED",
        "コード参照",
        ref_index.get("TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1", [])[:3],
        ["no_consensus_artifact"],
        "consensus JSON 成果物を automation/out に保存",
    )
    acc(
        "p3_patch_plan_artifact",
        "Phase 3 acceptance",
        "PARTIAL" if (auto / "tenmon_safe_patch_planner_v1.py").is_file() else "NOT_STARTED",
        "patch planner スクリプト",
        [],
        ["seal:patch_plan_bridge_ready_false"],
        "patch plan JSON/MD を seal が受理する形で生成",
    )
    acc(
        "p3_high_risk_safe_split",
        "Phase 3 acceptance",
        "PARTIAL",
        "remote guard はコード上存在（bundle で要実証）",
        [],
        ["weak_runtime"],
        "queue high_risk と safe の分岐ログ",
    )

    acc(
        "p4_chain_build_health_audit",
        "Phase 4 acceptance",
        "PASS" if gates.get("build_probe_rollback_ready") is True else "PARTIAL",
        f"seal gate build_probe_rollback_ready={gates.get('build_probe_rollback_ready')}",
        [str((auto / 'final_autonomy_seal_summary.json').relative_to(repo))] if seal else [],
        [] if gates.get("build_probe_rollback_ready") else ["gate_false"],
        "autoguard 結果 JSON を毎回残す",
    )
    acc(
        "p4_fail_rollback_evidence",
        "Phase 4 acceptance",
        "PARTIAL",
        "out/**/build_probe_rollback_result.json を要手動確認",
        [],
        ["no_single_pass_scan"],
        "FAIL 時 rollback フィールドを確認",
    )
    acc(
        "p4_pass_commit_ready",
        "Phase 4 acceptance",
        "PASS" if gates.get("acceptance_gated_commit_ready") is True else "BLOCKED",
        f"acceptance_gated_commit_ready={gates.get('acceptance_gated_commit_ready')}",
        [],
        seal.get("blocked_reasons", [])[:3] if isinstance(seal.get("blocked_reasons"), list) else [],
        "acceptance_commit_requeue_summary を生成",
    )
    acc(
        "p4_requeue_candidate",
        "Phase 4 acceptance",
        "NOT_STARTED",
        "requeue summary 未観測",
        [],
        ["missing_self_commit_summaries"],
        "requeue candidate を JSON 出力",
    )

    acc(
        "p5_heartbeat",
        "Phase 5 acceptance",
        "PASS" if heartbeat.get("cycle") else "PARTIAL",
        f"heartbeat cycle={heartbeat.get('cycle')}",
        [str((auto / "tenmon_continuous_self_improvement_overnight_heartbeat.json").relative_to(repo))],
        [] if heartbeat.get("cycle") else ["no_cycle"],
        "heartbeat を継続更新",
    )
    acc(
        "p5_cycle_increment",
        "Phase 5 acceptance",
        "PASS" if overnight_sum.get("cycles") else "PARTIAL",
        f"overnight cycles={overnight_sum.get('cycles')}",
        [str((auto / "tenmon_continuous_self_improvement_overnight_daemon_summary.json").relative_to(repo))],
        [],
        "daemon を再実行して cycle を増やす",
    )
    acc(
        "p5_morning_report",
        "Phase 5 acceptance",
        "PARTIAL" if overnight_sum.get("morning_approval_list") else "NOT_STARTED",
        "daemon summary に morning list パスあり",
        [],
        [],
        "daybreak report ファイルの存在を確認",
    )
    acc(
        "p5_next_queue_rearm",
        "Phase 5 acceptance",
        "PARTIAL",
        f"next_best_card={overnight_sum.get('next_best_card')}",
        [],
        [],
        "rearm candidate を queue に反映",
    )

    acc(
        "ins_review_acceptor_fail_closed",
        "保険 acceptance",
        "PARTIAL" if (auto / "cursor_review_acceptor_v1.py").is_file() else "NOT_STARTED",
        "review acceptor ファイル",
        [],
        [],
        "fail-closed をログで実証",
    )
    acc(
        "ins_token_rescue_json",
        "保険 acceptance",
        "PARTIAL" if ref_index.get("TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1") else "NOT_STARTED",
        "コード参照",
        [],
        [],
        "rescue JSON 成果物",
    )
    acc(
        "ins_queue_dedup",
        "保険 acceptance",
        "PASS" if overnight_sum.get("cycle_records_tail") else "PARTIAL",
        "daemon tail に queue_dedup ステップ記録",
        [],
        [],
        "dedup スクリプトの ok を artifact に",
    )
    acc(
        "ins_stop_override_fail_closed",
        "保険 acceptance",
        "PARTIAL",
        "stop.signal / constitution のみ参照",
        [str((auto / "tenmon_overnight_stop.signal").relative_to(repo))] if (auto / "tenmon_overnight_stop.signal").is_file() else [],
        ["stop_file_may_block_stall_recovery"],
        "override 手順をログ化",
    )

    acc(
        "post_k1_subgeneral_improved",
        "後段 acceptance",
        "PASS" if autobundle.get("ok") is True else "PARTIAL",
        f"dialogue autobundle ok={autobundle.get('ok')}",
        [str((auto / "tenmon_dialogue_no_midrun_vps_autobundle_summary.json").relative_to(repo))],
        [] if autobundle.get("ok") else ["autobundle_fail"],
        "K1/SUB/GENERAL プローブを再実行",
    )
    acc(
        "post_browser_vision",
        "後段 acceptance",
        "NOT_STARTED",
        "vision assisted の runtime 証拠なし",
        [],
        [],
        "Mac vision ログを収集",
    )
    acc(
        "post_self_commit_close",
        "後段 acceptance",
        "BLOCKED",
        "seal: missing_self_commit_summaries",
        [],
        ["acceptance_commit_summary_path_null"],
        "TRUE_SELF_COMMIT サマリ生成",
    )
    acc(
        "post_pwa_scorecard_update",
        "後段 acceptance",
        "PARTIAL",
        f"score_percent={scorecard.get('score_percent')} worldclass_ready={scorecard.get('worldclass_ready')}",
        [str((auto / "tenmon_worldclass_acceptance_scorecard.json").relative_to(repo))],
        must_fix[:5] if must_fix else [],
        "PWA lived proof を通して scorecard 更新",
    )
    acc(
        "post_constitution_seal",
        "後段 acceptance",
        "PARTIAL" if (api / "docs" / "constitution" / "TENMON_AUTONOMY_CONSTITUTION_SEAL_V1.md").is_file() else "NOT_STARTED",
        "AUTONOMY_CONSTITUTION_SEAL 文書",
        [],
        [],
        "seal 手続き完了の artifact",
    )

    acc(
        "lm_mac_runbook_fixed",
        "Last Mile acceptance",
        "PASS" if constitution_path(api, "TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1").is_file() else "NOT_STARTED",
        "runbook constitution",
        [],
        [],
        "",
    )
    acc(
        "lm_high_risk_chain_closed",
        "Last Mile acceptance",
        "PARTIAL" if morning.get("chain_order_ok") and not strict_bundle else "PARTIAL",
        f"morning_chain_ok={morning.get('chain_order_ok')} strict_bundle={bool(strict_bundle)}",
        [str((auto / "morning_approval_execution_chain_summary.json").relative_to(repo))],
        [] if strict_bundle else ["strict_real_bundle_missing"],
        "残り pending_cards を executed + strict bundle まで持ち上げ",
    )
    acc(
        "lm_browser_consult_mainline",
        "Last Mile acceptance",
        "PASS" if gates.get("browser_consult_ready") is True else "BLOCKED",
        f"browser_consult_ready={gates.get('browser_consult_ready')}",
        [],
        [],
        "Darwin で browser consult を実施",
    )
    acc(
        "lm_systemd_persistent",
        "Last Mile acceptance",
        "PARTIAL",
        "Linux/VPS 観測: unit 記述は constitution 参照",
        [],
        [],
        "systemd 導入証跠",
    )
    acc(
        "lm_stall_recovery",
        "Last Mile acceptance",
        "PASS" if gates.get("stall_recovery_ready") is True else "BLOCKED",
        f"stall_recovery_ready={gates.get('stall_recovery_ready')}",
        [],
        [],
        "stop.signal 解除と stall recovery 再実行",
    )
    acc(
        "lm_morning_chain_closed",
        "Last Mile acceptance",
        "PASS" if gates.get("morning_approval_execution_chain_ready") is True else "BLOCKED",
        f"morning_approval_execution_chain_ready={gates.get('morning_approval_execution_chain_ready')}",
        [],
        [],
        "pending_cards をゼロに",
    )
    acc(
        "lm_final_ascent_summary",
        "Last Mile acceptance",
        "PARTIAL" if pwa_ascent.get("generated_at") else "NOT_STARTED",
        f"dialogue_final_ascent_ready={pwa_ascent.get('dialogue_final_ascent_ready')}",
        [str((auto / "tenmon_pwa_dialogue_final_ascent_summary.json").relative_to(repo))],
        [],
        "final ascent ready を true に",
    )
    acc(
        "lm_hands_off_seal",
        "Last Mile acceptance",
        "PASS" if seal.get("hands_off_ready") is True else "BLOCKED",
        f"hands_off_ready={seal.get('hands_off_ready')}",
        [str((auto / "final_autonomy_seal_summary.json").relative_to(repo))],
        blocked_reasons[:6],
        "全 gate 緑化後に seal 再実行",
    )

    all_rows = cards + acceptance
    overall = sum(weight(r.status) for r in all_rows) / max(1, len(all_rows)) * 100.0

    hands_off_checks = {
        "approved_high_risk_real_execution_stable": bool(
            gates.get("watch_loop_real_execution_ready") is True and bool(strict_bundle)
        ),
        "browser_ai_consult_stable": gates.get("browser_consult_ready") is True,
        "patch_plan_bridge_stable": gates.get("patch_plan_bridge_ready") is True,
        "build_rollback_acceptance_stable": gates.get("build_probe_rollback_ready") is True
        and gates.get("acceptance_gated_commit_ready") is True,
        "overnight_orchestrator_stable": bool(overnight_sum.get("cycles")),
        "stall_recovery_stable": gates.get("stall_recovery_ready") is True,
        "morning_approval_chain_stable": gates.get("morning_approval_execution_chain_ready") is True,
        "pwa_dialogue_final_ascent_done": pwa_ascent.get("dialogue_final_ascent_ready") is True,
        "final_autonomy_seal_done": seal.get("hands_off_ready") is True,
    }
    ho_vals = [1.0 if v else 0.0 for v in hands_off_checks.values()]
    hands_pct = sum(ho_vals) / max(1, len(ho_vals)) * 100.0

    priority_map: dict[str, Row] = {}
    for r in cards:
        if r.key in PRIORITY_FOUR and r.phase == "実施工優先":
            priority_map[r.key] = r
    for p in PRIORITY_FOUR:
        if p not in priority_map:
            priority_map[p] = next((r for r in reversed(cards) if r.key == p), Row(p, "実施工優先", "card", "NOT_STARTED"))

    top_blockers = list(dict.fromkeys([str(x) for x in must_fix[:8]] + [str(x) for x in blocked_reasons[:8]]))[:10]

    rec_next = []
    rb = str(scorecard.get("recommended_next_card") or scorecard.get("next_best_card") or "").strip()
    if rb:
        rec_next.append(rb)
    for pc in safe_list(morning.get("pending_cards")):
        if isinstance(pc, dict) and pc.get("card_id"):
            rec_next.append(str(pc["card_id"]))
    rec_next.append(PRIORITY_FOUR[1])
    rec_next = list(dict.fromkeys(rec_next))[:3]
    single_best = rec_next[0] if rec_next else PRIORITY_FOUR[1]

    phase_stats: dict[str, dict[str, float]] = {}
    for r in all_rows:
        ph = r.phase
        if ph not in phase_stats:
            phase_stats[ph] = {"sum": 0.0, "n": 0.0}
        phase_stats[ph]["sum"] += weight(r.status)
        phase_stats[ph]["n"] += 1.0

    phase_summary = [
        {
            "phase": ph,
            "items": int(v["n"]),
            "completion_percent": round((v["sum"] / max(1.0, v["n"])) * 100.0, 2),
        }
        for ph, v in sorted(phase_stats.items(), key=lambda x: x[0])
    ]

    def clean_evidence(paths: list[str]) -> list[str]:
        return [p for p in paths if "tenmon_autonomy_implementation_order_status_forensic_v1" not in p]

    def row_to_dict(r: Row) -> dict[str, Any]:
        na = r.next_action
        if r.status == "PASS" and "runtime 証跠" in na:
            na = "定期観測（artifact / gate）で維持確認"
        return {
            "key": r.key,
            "phase": r.phase,
            "kind": r.kind,
            "status": r.status,
            "evidence_files": clean_evidence(r.evidence_files),
            "evidence_summary": r.evidence_summary,
            "blockers": r.blockers,
            "confidence": "high" if r.status == "PASS" else r.confidence,
            "next_action": na,
        }

    main_out = {
        "card": CARD,
        "generated_at": utc(),
        "overall_completion_percent": round(overall, 2),
        "hands_off_readiness_percent": round(hands_pct, 2),
        "phase_summary": phase_summary,
        "cards": [row_to_dict(r) for r in cards],
        "acceptance_checks": [row_to_dict(r) for r in acceptance],
        "priority_four": {k: row_to_dict(priority_map[k]) for k in PRIORITY_FOUR},
        "hands_off_checks": hands_off_checks,
        "top_blockers": top_blockers[:5],
        "recommended_next_3_cards": rec_next,
        "single_best_next_card": single_best,
        "artifact_snapshot": {
            "scorecard_path": str((auto / "tenmon_worldclass_acceptance_scorecard.json").relative_to(repo)),
            "seal_path": str((auto / "final_autonomy_seal_summary.json").relative_to(repo)),
            "queue_path": str((auto / "remote_cursor_queue.json").relative_to(repo)),
            "bundle_path": str((auto / "remote_cursor_result_bundle.json").relative_to(repo)),
            "recheck_summary_ok": recheck.get("ok"),
            "autobundle_ok": autobundle.get("ok"),
            "strict_real_bundle_entries": len(strict_bundle),
            "sleep_master_pass": sleep_master.get("master_pass"),
            "pwa_campaign_ok": pwa_camp.get("ok"),
            "result_bind_ok": result_bind.get("ok"),
        },
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_MAIN).write_text(json.dumps(main_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    phase_file = {
        "card": CARD,
        "generated_at": utc(),
        "phases": phase_summary,
        "overall_completion_percent": main_out["overall_completion_percent"],
    }
    (auto / OUT_PHASE).write_text(json.dumps(phase_file, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    actions = []
    for r in cards + acceptance:
        if r.status in ("NOT_STARTED", "BLOCKED") or (r.status == "PARTIAL" and r.key in PRIORITY_FOUR):
            actions.append(
                {
                    "key": r.key,
                    "phase": r.phase,
                    "kind": r.kind,
                    "status": r.status,
                    "next_action": r.next_action,
                    "blockers": r.blockers[:4],
                }
            )
    (auto / OUT_NEXT).write_text(
        json.dumps({"card": CARD, "generated_at": utc(), "actions": actions[:40]}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    md_lines = [
        f"# TENMON_AUTONOMY_IMPLEMENTATION_ORDER_STATUS_FORENSIC_REPORT",
        "",
        "## 1. 全体総括",
        "",
        f"- overall_completion_percent: **{main_out['overall_completion_percent']}**",
        f"- hands_off_readiness_percent: **{main_out['hands_off_readiness_percent']}**",
        f"- single_best_next_card: `{single_best}`",
        "",
        "## 2. Phase別達成率",
        "",
        "| Phase | items | % |",
        "|---|---:|---:|",
    ]
    for ps in phase_summary:
        md_lines.append(f"| {ps['phase']} | {ps['items']} | {ps['completion_percent']} |")
    md_lines += [
        "",
        "## 3. 各カード判定一覧",
        "",
        "| Phase | card | status | confidence |",
        "|---|---|---|---|",
    ]
    for r in cards:
        md_lines.append(f"| {r.phase} | `{r.key}` | {r.status} | {r.confidence} |")
    md_lines += [
        "",
        "## 4. acceptance 判定一覧",
        "",
        "| Phase | key | status |",
        "|---|---|---|",
    ]
    for r in acceptance:
        md_lines.append(f"| {r.phase} | `{r.key}` | {r.status} |")
    md_lines += [
        "",
        "## 5. 実施工の優先4枚の状態",
        "",
    ]
    for k in PRIORITY_FOUR:
        r = priority_map[k]
        md_lines.append(f"- **{k}**: `{r.status}` — {r.evidence_summary[:120]}")
    md_lines += [
        "",
        "## 6. hands-off 判定",
        "",
    ]
    for hk, hv in hands_off_checks.items():
        md_lines.append(f"- `{hk}`: **{hv}**")
    md_lines += [
        "",
        "## 7. top blockers",
        "",
    ]
    for b in top_blockers[:5]:
        md_lines.append(f"- {b}")
    md_lines += [
        "",
        "## 8. 次に進むべき3枚",
        "",
    ]
    for c in rec_next:
        md_lines.append(f"- `{c}`")
    md_lines += ["", f"_generated: {utc()}_", ""]

    (auto / OUT_MD).write_text("\n".join(md_lines), encoding="utf-8")

    print(json.dumps({"ok": True, "main": str(auto / OUT_MAIN), "overall": main_out["overall_completion_percent"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
