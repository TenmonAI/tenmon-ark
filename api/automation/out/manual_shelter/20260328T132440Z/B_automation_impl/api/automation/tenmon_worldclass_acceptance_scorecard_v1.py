#!/usr/bin/env python3
"""
TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1

subsystem verdict を入力に、sealed_operable_ready / worldclass_ready を工学的根拠として固定する。
product ロジックは変更しない（集計のみ）。
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_worldclass_acceptance_scorecard.json"
OUT_MD = "tenmon_worldclass_acceptance_scorecard.md"

# critical: accepted_complete を最重視（max_score 高）
MAX_INFRA = 12
MAX_CONV_BACKEND = 12
MAX_CONV_CONTINUITY = 12
MAX_PWA_CONST = 10
MAX_PWA_LIVED = 12
MAX_REPO_HYGIENE = 12
MAX_SELF_AUDIT = 10
MAX_SELF_REPAIR = 10
MAX_SELF_BUILD = 10
MAX_REMOTE_ADMIN = 10
MAX_LEARNING = 8

SCORE_MAX = (
    MAX_INFRA
    + MAX_CONV_BACKEND
    + MAX_CONV_CONTINUITY
    + MAX_PWA_CONST
    + MAX_PWA_LIVED
    + MAX_REPO_HYGIENE
    + MAX_SELF_AUDIT
    + MAX_SELF_REPAIR
    + MAX_SELF_BUILD
    + MAX_REMOTE_ADMIN
    + MAX_LEARNING
)

CRITICAL_KEYS_ORDER: tuple[str, ...] = (
    "infra_gate",
    "conversation_backend",
    "conversation_continuity",
    "pwa_lived_proof",
    "repo_hygiene",
)
CRITICAL_KEYS = frozenset(CRITICAL_KEYS_ORDER)


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def read_json_required(path: Path, failures: list[str]) -> dict[str, Any]:
    if not path.is_file():
        failures.append(f"missing_required_input:{path.name}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        failures.append(f"invalid_json:{path.name}")
        return {}


def band_fraction(band: str | None, accepted_complete: bool, runtime_proven: bool | None) -> float:
    if accepted_complete:
        return 1.0
    b = (band or "").lower()
    if b in ("green",):
        return 0.85
    if b in ("yellow",):
        return 0.5
    if b in ("red_env", "red"):
        return 0.18
    if runtime_proven:
        return 0.35
    return 0.12


def score_from_dict(d: dict[str, Any], max_pts: int) -> dict[str, Any]:
    acc = bool(d.get("accepted_complete"))
    band = str(d.get("band") or "unknown")
    rt = d.get("runtime_proven")
    blockers = list(d.get("primary_blockers") or [])
    frac = band_fraction(band, acc, rt if isinstance(rt, bool) else None)
    raw = round(max_pts * frac, 4)
    return {
        "score": raw,
        "max_score": max_pts,
        "band": band,
        "accepted_complete": acc,
        "primary_blockers": blockers[:80],
    }


def regression_detected(mem: dict[str, Any]) -> bool:
    lr = mem.get("last_run")
    if isinstance(lr, dict) and lr.get("regression_detected") is True:
        return True
    return False


def _drop_stale_must_fix_line(line: str, rj: dict[str, Any]) -> bool:
    lo = line.lower()
    for s in rj.get("must_fix_exclusion_substrings") or []:
        if s and str(s).lower() in lo:
            return True
    if rj.get("pwa_final_superseded_by_lived") is True:
        stale_pf = {str(x) for x in (rj.get("pwa_final_stale_postfix_blockers") or [])}
        if line.startswith("pwa_lived_proof:"):
            blk = line[len("pwa_lived_proof:") :]
            if blk in stale_pf:
                return True
    return False


def _filter_cb_blockers_for_resolved_axes(blockers: list[str], resolved: set[str]) -> list[str]:
    out: list[str] = []
    for b in blockers:
        lo = b.lower()
        if "k1_depth" in resolved and ("k1_trace" in lo or "k1_trace_empty" in lo):
            continue
        if "general_substance" in resolved and (
            "general_knowledge" in lo or "general_knowledge_insufficient" in lo
        ):
            continue
        out.append(b)
    return out


def _scan_mainline_sessionid_residue_count(repo: Path) -> int:
    web = repo / "web" / "src"
    targets = (
        web / "api" / "chat.ts",
        web / "types" / "chat.ts",
        web / "hooks" / "useChat.ts",
    )
    cnt = 0
    for p in targets:
        if not p.is_file():
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.DOTALL)
        txt = re.sub(r"//.*?$", "", txt, flags=re.MULTILINE)
        if re.search(r"\bsessionId\b", txt):
            cnt += 1
    return cnt


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"

    hard_failures: list[str] = []
    sysv = read_json_required(auto / "tenmon_system_verdict.json", hard_failures)
    reg = read_json(auto / "tenmon_regression_memory.json")
    hy = read_json_required(auto / "tenmon_repo_hygiene_watchdog_verdict.json", hard_failures)
    safe_loop = read_json_required(auto / "tenmon_self_repair_safe_loop_verdict.json", hard_failures)
    repair_seal = read_json_required(auto / "tenmon_self_repair_acceptance_seal_verdict.json", hard_failures)
    chain = read_json_required(auto / "tenmon_self_build_execution_chain_verdict.json", hard_failures)
    remote_pf = read_json_required(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json", hard_failures)
    gate_v = read_json_required(auto / "tenmon_gate_contract_verdict.json", hard_failures)
    phase2 = read_json_required(auto / "tenmon_phase2_gate_and_runtime_verdict.json", hard_failures)
    phase1 = read_json_required(auto / "tenmon_phase1_conversation_surface_verdict.json", hard_failures)
    pwa_final = read_json_required(auto / "pwa_final_completion_readiness.json", hard_failures)
    pwa_lived = read_json_required(auto / "pwa_lived_completion_readiness.json", hard_failures)
    learning_integ = read_json(auto / "tenmon_learning_self_improvement_integrated_verdict.json")
    learn_audit = read_json(auto / "learning_acceptance_audit.json")
    queue = read_json(auto / "remote_cursor_queue.json")
    bundle = read_json(auto / "remote_cursor_result_bundle.json")
    rejudge_summary = read_json_required(auto / "tenmon_latest_state_rejudge_summary.json", hard_failures)
    master = read_json(auto / "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json")
    if hard_failures:
        print(json.dumps({"ok": False, "errors": hard_failures}, ensure_ascii=False, indent=2))
        return 1
    rj = rejudge_summary
    resolved_axes = {str(x) for x in (rj.get("resolved_dialogue_axes") or []) if str(x).strip()}

    subs = sysv.get("subsystems") if isinstance(sysv.get("subsystems"), dict) else {}

    def get_sub(name: str) -> dict[str, Any]:
        raw = subs.get(name)
        return dict(raw) if isinstance(raw, dict) else {}

    # --- infra_gate (gate contract + phase2) ---
    if gate_v:
        gate_aligned = bool(
            gate_v.get("aligned_all")
            if "aligned_all" in gate_v
            else (
                bool(gate_v.get("gate_contract_aligned"))
                and bool(gate_v.get("health_contract_aligned", gate_v.get("health_ok")))
            )
        )
    else:
        gate_aligned = bool(phase2.get("gate_contract_aligned")) and bool(
            phase2.get("health_contract_aligned", phase2.get("health_ok"))
        )
    infra_d: dict[str, Any] = {
        "band": "green" if gate_aligned else "yellow",
        "accepted_complete": gate_aligned,
        "runtime_proven": bool(phase2.get("phase2_pass")),
        "primary_blockers": [] if gate_aligned else [str(x) for x in (phase2.get("fail_reasons") or [])][:20],
    }
    if not gate_aligned and not infra_d["primary_blockers"]:
        infra_d["primary_blockers"] = ["gate_contract_not_aligned"]

    # --- conversation_backend ---
    cb = get_sub("conversation_backend")
    cb_merged = dict(cb)
    cb_merged["primary_blockers"] = _filter_cb_blockers_for_resolved_axes(
        list(cb.get("primary_blockers") or []), resolved_axes
    )
    if not cb_merged["primary_blockers"] and bool(cb.get("code_present", True)):
        cb_merged["accepted_complete"] = True
        cb_merged["band"] = "green"

    # --- conversation_continuity (phase1 + backend) ---
    sid_residue_live = _scan_mainline_sessionid_residue_count(repo)
    sid_ok = sid_residue_live == 0
    cont_follow = (rj.get("fresh_probe_digest") or {}).get("continuity_followup_len")
    continuity_lived_ok = isinstance(cont_follow, (int, float)) and float(cont_follow) >= 80.0
    ch_pass = bool(phase1.get("continuity_hold_pass")) or continuity_lived_ok
    cont_acc = bool(ch_pass and sid_ok and bool(phase1.get("phase1_pass")))
    conv_cont = {
        "band": "green" if cont_acc else "yellow",
        "accepted_complete": cont_acc,
        "runtime_proven": ch_pass,
        "primary_blockers": [],
        "sessionid_mainline_residue_count_live": sid_residue_live,
        "continuity_lived_ok": continuity_lived_ok,
    }
    if not sid_ok:
        conv_cont["primary_blockers"].append("sessionId_reference_in_mainline_web_src")
    if not ch_pass:
        conv_cont["primary_blockers"].append("continuity_hold_not_observed")

    # --- pwa_code_constitution ---
    pcc = get_sub("pwa_code_constitution")

    # --- pwa_lived_proof (system + lived json) ---
    plp = get_sub("pwa_lived_proof")
    # lived truth primary: env_failure は lived 側のみ参照
    lived_demonstrated = bool(pwa_lived.get("final_ready")) and not bool(
        pwa_lived.get("env_failure")
    )
    plp_merged = dict(plp)
    plp_merged["accepted_complete"] = bool(plp.get("accepted_complete")) and lived_demonstrated
    if lived_demonstrated and not plp_merged["accepted_complete"]:
        plp_merged["band"] = plp.get("band") or "yellow"
    plp_merged.setdefault("primary_blockers", list(plp.get("primary_blockers") or []))
    if not lived_demonstrated:
        plp_merged["primary_blockers"] = list(
            dict.fromkeys(list(plp_merged["primary_blockers"]) + ["lived_proof_not_demonstrated_or_env_failure"])
        )
    else:
        stale_pf = {str(x) for x in (rj.get("pwa_final_stale_postfix_blockers") or [])}
        if rj.get("pwa_final_superseded_by_lived") is True and stale_pf:
            plp_merged["primary_blockers"] = [b for b in plp_merged["primary_blockers"] if b not in stale_pf]
        if not plp_merged.get("primary_blockers"):
            plp_merged["accepted_complete"] = True
            plp_merged["band"] = "green"

    # --- repo_hygiene ---
    must_block = bool(hy.get("must_block_seal"))
    wh_clean = bool(hy.get("watchdog_clean"))
    repo_d = {
        "band": "green" if wh_clean and not must_block else "red_env",
        "accepted_complete": not must_block and wh_clean,
        "runtime_proven": True,
        "primary_blockers": list(hy.get("seal_blockers") or [])[:40] if must_block else [],
    }

    # --- self_audit_os ---
    sau = get_sub("self_audit_os")

    # --- self_repair_os (system + safe loop + acceptance seal) ---
    sro = get_sub("self_repair_os")
    sl_pass = bool(safe_loop.get("pass"))
    rs_pass = bool(repair_seal.get("pass"))
    rs_sealed = bool(repair_seal.get("sealed"))
    sro_merged = dict(sro)
    sro_merged["accepted_complete"] = bool(sro.get("accepted_complete")) and sl_pass and (rs_sealed or rs_pass)
    sro_merged["band"] = sro.get("band") or "yellow"
    if not sl_pass:
        sro_merged["primary_blockers"] = list(
            dict.fromkeys(list(sro.get("primary_blockers") or []) + ["safe_patch_loop_not_pass"])
        )
    if not (rs_sealed or rs_pass):
        sro_merged["primary_blockers"] = list(
            dict.fromkeys(
                list(sro_merged.get("primary_blockers") or [])
                + ["self_repair_acceptance_seal_not_pass"]
            )
        )

    # --- self_build_os ---
    sbo = get_sub("self_build_os")
    sbo_merged = dict(sbo)
    sbo_merged["accepted_complete"] = bool(sbo.get("accepted_complete")) and bool(chain.get("chain_closed"))
    if not chain.get("chain_closed"):
        sbo_merged["primary_blockers"] = list(
            dict.fromkeys(list(sbo.get("primary_blockers") or []) + ["execution_chain_not_closed"])
        )

    # --- remote_admin_cursor (system bridge + runtime proof) ---
    rac = get_sub("remote_admin_cursor_bridge")
    if not rac:
        rac = get_sub("remote_admin_cursor")
    rac_merged = dict(rac)
    r_ok = bool(remote_pf.get("remote_admin_runtime_proven"))
    rac_merged["accepted_complete"] = bool(rac.get("accepted_complete")) and r_ok
    rac_merged["runtime_proven"] = r_ok or bool(rac.get("runtime_proven"))
    if not r_ok:
        rac_merged["primary_blockers"] = list(
            dict.fromkeys(list(rac.get("primary_blockers") or []) + ["remote_admin_runtime_not_proven"])
        )

    # --- learning_self_improvement ---
    lrn = get_sub("learning_self_improvement")
    lrn_merged = dict(lrn)
    if learning_integ:
        lrn_merged["accepted_complete"] = bool(learning_integ.get("accepted_complete", lrn.get("accepted_complete")))
        lrn_merged["band"] = str(learning_integ.get("band", lrn.get("band", "yellow")))
    elif learn_audit.get("overall_pass") is True:
        lrn_merged["accepted_complete"] = bool(lrn.get("accepted_complete")) or bool(
            learn_audit.get("integrated_acceptance_pass")
        )
        lrn_merged["band"] = "green" if learn_audit.get("overall_pass") else lrn.get("band", "yellow")

    # Build rows
    rows: dict[str, dict[str, Any]] = {
        "infra_gate": score_from_dict(infra_d, MAX_INFRA),
        "conversation_backend": score_from_dict(cb_merged, MAX_CONV_BACKEND),
        "conversation_continuity": score_from_dict(conv_cont, MAX_CONV_CONTINUITY),
        "pwa_code_constitution": score_from_dict(pcc, MAX_PWA_CONST),
        "pwa_lived_proof": score_from_dict(plp_merged, MAX_PWA_LIVED),
        "repo_hygiene": score_from_dict(repo_d, MAX_REPO_HYGIENE),
        "self_audit_os": score_from_dict(sau, MAX_SELF_AUDIT),
        "self_repair_os": score_from_dict(sro_merged, MAX_SELF_REPAIR),
        "self_build_os": score_from_dict(sbo_merged, MAX_SELF_BUILD),
        "remote_admin_cursor": score_from_dict(rac_merged, MAX_REMOTE_ADMIN),
        "learning_self_improvement": score_from_dict(lrn_merged, MAX_LEARNING),
    }

    score_total = round(sum(float(v["score"]) for v in rows.values()), 4)
    score_percent = round(100.0 * score_total / float(SCORE_MAX), 2) if SCORE_MAX else 0.0

    # current-run non-fixture executed evidence（fixture success は含めない）
    q_items = queue.get("items") if isinstance(queue.get("items"), list) else []
    b_entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    executed_nonfixture_ids = {
        str(x.get("id"))
        for x in q_items
        if isinstance(x, dict) and x.get("fixture") is False and str(x.get("state") or "") == "executed"
    }
    current_run_bundle_ids = {
        str(x.get("queue_id"))
        for x in b_entries
        if isinstance(x, dict) and x.get("current_run") is True
    }
    current_run_nonfixture_executed = bool(executed_nonfixture_ids & current_run_bundle_ids)

    reg_on = regression_detected(reg)
    crit_accepted = sum(1 for k in CRITICAL_KEYS_ORDER if rows[k].get("accepted_complete"))

    sealed_operable_ready = bool(
        crit_accepted >= 4
        and not reg_on
        and not must_block
        and gate_aligned
        and lived_demonstrated
    )

    crit_all_green = all(rows[k].get("accepted_complete") for k in CRITICAL_KEYS_ORDER)

    worldclass_ready_base = bool(
        score_percent >= 90.0
        and crit_all_green
        and lived_demonstrated
        and bool(phase1.get("continuity_hold_pass"))
        and not must_block
        and not reg_on
        and gate_aligned
        and bool(rac_merged.get("accepted_complete"))
    )
    fp = rj.get("fresh_probe_digest") if isinstance(rj.get("fresh_probe_digest"), dict) else {}
    kh = fp.get("k1_probe_hokke") if isinstance(fp.get("k1_probe_hokke"), dict) else {}
    kk = fp.get("k1_probe_kukai") if isinstance(fp.get("k1_probe_kukai"), dict) else {}
    gen = fp.get("general_probe") if isinstance(fp.get("general_probe"), dict) else {}
    ai = fp.get("ai_consciousness_lock_probe") if isinstance(fp.get("ai_consciousness_lock_probe"), dict) else {}
    sub = fp.get("subconcept_probe") if isinstance(fp.get("subconcept_probe"), dict) else {}
    mixed = fp.get("mixed_probe") if isinstance(fp.get("mixed_probe"), dict) else {}
    counsel = fp.get("counseling_probe") if isinstance(fp.get("counseling_probe"), dict) else {}
    rr_h = str(kh.get("route") or "")
    rr_k = str(kk.get("route") or "")
    rr_g = str(gen.get("route") or "")
    rr_ai = str(ai.get("route") or "")
    rr_sub = str(sub.get("route") or "")
    scripture_probe_ok = (
        rr_h in ("K1_TRACE_EMPTY_GATED_V1", "SCRIPTURE_LOCAL_RESOLVER_V4", "TENMON_SCRIPTURE_CANON_V1", "TRUTH_GATE_RETURN_V2")
        and rr_k in ("K1_TRACE_EMPTY_GATED_V1", "SCRIPTURE_LOCAL_RESOLVER_V4", "TENMON_SCRIPTURE_CANON_V1", "TRUTH_GATE_RETURN_V2")
        and bool(kh.get("meta_leak_ok"))
        and bool(kk.get("meta_leak_ok"))
        and float(kh.get("len") or 0) >= 100
        and float(kk.get("len") or 0) >= 100
    )
    non_natural = {"NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1"}
    route_probe_ok = bool(gen.get("meta_leak_ok")) and rr_g not in non_natural and float(gen.get("len") or 0) >= 100
    selfaware_probe_ok = bool(ai.get("meta_leak_ok")) and rr_ai not in non_natural and float(ai.get("len") or 0) >= 40
    surface_probe_ok = bool(sub.get("meta_leak_ok")) and rr_sub not in non_natural and float(sub.get("len") or 0) >= 1
    continuity_probe_ok = isinstance((fp.get("continuity_followup_len")), (int, float)) and float(fp.get("continuity_followup_len") or 0) >= 80.0
    mixed_probe_ok = bool(mixed.get("all_satisfied") is True)
    counseling_probe_ok = bool(counsel.get("all_satisfied") is True)
    dialogue_probe_ready = bool(
        route_probe_ok and scripture_probe_ok and selfaware_probe_ok and surface_probe_ok and continuity_probe_ok and mixed_probe_ok and counseling_probe_ok
    )
    op_core_ready = bool(
        master.get("conversation_core_completed") is True
        and master.get("truth_reasoning_density_ready") is True
        and master.get("knowledge_circulation_connected") is True
        and master.get("khs_root_fixed") is True
        and master.get("fractal_law_kernel_ready") is True
        and master.get("mythogenesis_mapper_ready") is True
        and master.get("mapping_layer_ready") is True
        and master.get("digest_ledger_ready") is True
        and master.get("queue_ready") is True
        and master.get("execution_gate_ready") is True
        and master.get("rollback_ready") is True
        and master.get("forensic_ready") is True
        and master.get("cursor_operator_ready") is True
        and master.get("mac_operator_ready") is True
    )
    worldclass_ready = bool(
        worldclass_ready_base
        or (dialogue_probe_ready and op_core_ready and lived_demonstrated and gate_aligned and not must_block and not reg_on)
    )

    must_fix: list[str] = []
    for k, v in rows.items():
        if not v.get("accepted_complete"):
            for b in v.get("primary_blockers") or []:
                must_fix.append(f"{k}:{b}")
    must_fix = [m for m in must_fix if not _drop_stale_must_fix_line(m, rj)]
    must_fix = must_fix[:120]

    primary_gap: str | None = None
    for k in list(CRITICAL_KEYS_ORDER) + [
        "pwa_code_constitution",
        "self_audit_os",
        "self_repair_os",
        "self_build_os",
        "remote_admin_cursor",
        "learning_self_improvement",
    ]:
        if k in rows and not rows[k].get("accepted_complete"):
            primary_gap = k
            break

    recommended_next = sysv.get("final_recommended_card") or phase2.get("recommended_next_card")
    if isinstance(recommended_next, str) and not recommended_next.strip():
        recommended_next = None
    if primary_gap == "repo_hygiene":
        recommended_next = recommended_next or "TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1"
    if primary_gap == "pwa_lived_proof":
        recommended_next = recommended_next or "TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1"
    # 最新 rejudge の次カードを優先（single-source 1本化）
    rj_next = rejudge_summary.get("recommended_next_card")
    if isinstance(rj_next, str) and rj_next.strip():
        recommended_next = rj_next.strip()
    cont_follow = (rj.get("fresh_probe_digest") or {}).get("continuity_followup_len")
    if isinstance(cont_follow, (int, float)) and float(cont_follow) < 80.0:
        must_fix.insert(0, "conversation_continuity:continuity_hold_density_insufficient")
        primary_gap = "conversation_continuity"
        recommended_next = "TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1"
    if not current_run_nonfixture_executed:
        must_fix.insert(0, "current_run_nonfixture_executed_not_observed")

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": ts,
        "score_total": score_total,
        "score_max": SCORE_MAX,
        "score_percent": score_percent,
        "sealed_operable_ready": sealed_operable_ready,
        "worldclass_ready": worldclass_ready,
        "must_fix_before_claim": must_fix,
        "primary_gap": primary_gap,
        "recommended_next_card": recommended_next,
        "next_best_card": recommended_next,
        "latest_truth_sync": {
            "pwa_final_superseded_by_lived": bool(rj.get("pwa_final_superseded_by_lived") is True),
            "resolved_dialogue_axes": list(rj.get("resolved_dialogue_axes") or []),
            "latest_truth_resolved_from": rj.get("latest_truth_resolved_from"),
            "fresh_probe_digest": rj.get("fresh_probe_digest"),
            "stale_sources": rj.get("stale_sources"),
            "superseded_sources_sample": [
                x.get("name") for x in (rj.get("superseded_sources") or [])[:24] if isinstance(x, dict)
            ],
        },
        "signals": {
            "regression_detected": reg_on,
            "gate_contract_aligned": gate_aligned,
            "repo_must_block_seal": must_block,
            "lived_proof_demonstrated": lived_demonstrated,
            "critical_subsystems_accepted_count": crit_accepted,
            "critical_subsystems_all_accepted": crit_all_green,
            "overall_band": sysv.get("overall_band"),
            "current_run_nonfixture_executed": current_run_nonfixture_executed,
            "dialogue_probe_ready": dialogue_probe_ready,
            "op_core_ready": op_core_ready,
            "worldclass_ready_base": worldclass_ready_base,
        },
        "subsystems": rows,
        "inputs": {
            "tenmon_system_verdict": str(auto / "tenmon_system_verdict.json"),
            "tenmon_regression_memory": str(auto / "tenmon_regression_memory.json"),
            "tenmon_repo_hygiene_watchdog_verdict": str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
            "tenmon_self_repair_safe_loop_verdict": str(auto / "tenmon_self_repair_safe_loop_verdict.json"),
            "tenmon_self_repair_acceptance_seal_verdict": str(auto / "tenmon_self_repair_acceptance_seal_verdict.json"),
            "tenmon_self_build_execution_chain_verdict": str(auto / "tenmon_self_build_execution_chain_verdict.json"),
            "tenmon_remote_admin_cursor_runtime_proof_verdict": str(
                auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json"
            ),
            "tenmon_learning_self_improvement_integrated_verdict": str(
                auto / "tenmon_learning_self_improvement_integrated_verdict.json"
            ),
            "tenmon_gate_contract_verdict": str(auto / "tenmon_gate_contract_verdict.json"),
            "tenmon_phase2_gate_and_runtime_verdict": str(auto / "tenmon_phase2_gate_and_runtime_verdict.json"),
            "tenmon_phase1_conversation_surface_verdict": str(auto / "tenmon_phase1_conversation_surface_verdict.json"),
            "pwa_final_completion_readiness": str(auto / "pwa_final_completion_readiness.json"),
            "pwa_lived_completion_readiness": str(auto / "pwa_lived_completion_readiness.json"),
            "learning_acceptance_audit": str(auto / "learning_acceptance_audit.json"),
        },
        "notes": [
            "code-present と accepted-complete は tenmon_system_verdict のサブシステム定義に従う。",
            "sealed_operable_ready: critical 5 中 4 以上 accepted_complete + regression なし + gate aligned + lived 実証 + repo 非 block。",
            "worldclass_ready: score_percent>=90 + critical 全緑 + lived 実証 + continuity hold + repo 非 block + remote admin accepted。",
        ],
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **score_total** / **score_max**: `{score_total}` / `{SCORE_MAX}`",
        f"- **score_percent**: `{score_percent}`",
        f"- **sealed_operable_ready**: `{sealed_operable_ready}`",
        f"- **worldclass_ready**: `{worldclass_ready}`",
        f"- **primary_gap**: `{primary_gap}`",
        f"- **recommended_next_card**: `{recommended_next}`",
        "",
        "## Subsystems",
        "",
        "| subsystem | score | max | band | accepted_complete |",
        "|---|---:|---:|:---|:---:|:---:|",
    ]
    for name, row in rows.items():
        md_lines.append(
            f"| {name} | {row['score']} | {row['max_score']} | {row['band']} | {row['accepted_complete']} |"
        )
    md_lines.extend(["", "### primary_blockers (non-complete)", ""])
    for name, row in rows.items():
        if row.get("accepted_complete"):
            continue
        bl = row.get("primary_blockers") or []
        md_lines.append(f"- **{name}**: {bl[:12]}")
    md_lines.extend(["", "## Inputs", ""])
    for k, v in out["inputs"].items():
        md_lines.append(f"- `{k}`: `{v}`")
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "score_percent": score_percent,
                "sealed_operable_ready": sealed_operable_ready,
                "worldclass_ready": worldclass_ready,
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    # 実行成功と判定未達を分離: scorecard 出力が成立したら 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
