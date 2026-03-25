#!/usr/bin/env python3
"""
TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1

subsystem verdict を入力に、sealed_operable_ready / worldclass_ready を工学的根拠として固定する。
product ロジックは変更しない（集計のみ）。
"""
from __future__ import annotations

import json
import os
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


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"

    sysv = read_json(auto / "tenmon_system_verdict.json")
    reg = read_json(auto / "tenmon_regression_memory.json")
    hy = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    safe_loop = read_json(auto / "tenmon_self_repair_safe_loop_verdict.json")
    repair_seal = read_json(auto / "tenmon_self_repair_acceptance_seal_verdict.json")
    chain = read_json(auto / "tenmon_self_build_execution_chain_verdict.json")
    remote_pf = read_json(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")
    gate_v = read_json(auto / "tenmon_gate_contract_verdict.json")
    phase2 = read_json(auto / "tenmon_phase2_gate_and_runtime_verdict.json")
    phase1 = read_json(auto / "tenmon_phase1_conversation_surface_verdict.json")
    pwa_final = read_json(auto / "pwa_final_completion_readiness.json")
    pwa_lived = read_json(auto / "pwa_lived_completion_readiness.json")
    learning_integ = read_json(auto / "tenmon_learning_self_improvement_integrated_verdict.json")
    learn_audit = read_json(auto / "learning_acceptance_audit.json")

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

    # --- conversation_continuity (phase1 + backend) ---
    sid_ok = int(phase1.get("sessionid_mainline_residue_count") or 999) == 0
    ch_pass = bool(phase1.get("continuity_hold_pass"))
    cont_acc = bool(ch_pass and sid_ok and bool(phase1.get("phase1_pass")))
    conv_cont = {
        "band": "green" if cont_acc else "yellow",
        "accepted_complete": cont_acc,
        "runtime_proven": ch_pass,
        "primary_blockers": [],
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
        "conversation_backend": score_from_dict(cb, MAX_CONV_BACKEND),
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

    worldclass_ready = bool(
        score_percent >= 90.0
        and crit_all_green
        and lived_demonstrated
        and bool(phase1.get("continuity_hold_pass"))
        and not must_block
        and not reg_on
        and gate_aligned
        and bool(rac_merged.get("accepted_complete"))
    )

    must_fix: list[str] = []
    for k, v in rows.items():
        if not v.get("accepted_complete"):
            for b in v.get("primary_blockers") or []:
                must_fix.append(f"{k}:{b}")
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
        "signals": {
            "regression_detected": reg_on,
            "gate_contract_aligned": gate_aligned,
            "repo_must_block_seal": must_block,
            "lived_proof_demonstrated": lived_demonstrated,
            "critical_subsystems_accepted_count": crit_accepted,
            "critical_subsystems_all_accepted": crit_all_green,
            "overall_band": sysv.get("overall_band"),
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

    # FAIL 時 exit != 0（工学的最低ライン未達）
    return 0 if sealed_operable_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
