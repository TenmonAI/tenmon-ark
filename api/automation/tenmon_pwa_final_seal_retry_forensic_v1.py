#!/usr/bin/env python3
"""
TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1
FAIL 時: unified_pass=false を lived / autoloop / env / gate / seal writer に分解し retry plan を固定分岐で返す。
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_FINAL_SEAL_RETRY_FORENSIC_V1"
PLAN_CARD = "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1"

MAJOR_LIVED = {
    "url_sync_missing",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "continuity_fail",
    "duplicate_or_bleed_fail",
}

URL_RESIDUE_HINTS = frozenset(
    {
        "url_sync_missing",
        "newchat_reload_residue",
        "refresh_restore_fail",
    }
)

CONTINUITY_HINTS = frozenset({"continuity_fail", "duplicate_or_bleed_fail"})


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def as_list(x: Any) -> list[str]:
    if not isinstance(x, list):
        return []
    out: list[str] = []
    for i in x:
        if isinstance(i, str) and i.strip():
            out.append(i.strip())
    return out


def pick_root_band(
    *,
    env_failure_pf: bool,
    env_failure_final: bool,
    lived_ok: bool,
    health_ok_lived: bool | None,
    gate_health_in_blockers: bool,
    autoloop_final_ready: bool,
    autoloop_exit_ok: bool,
    pass_unified: bool,
    fingerprint_present: bool,
) -> str:
    """A env | B lived | C autoloop | D gate | E seal_writer | mixed"""
    if env_failure_pf or env_failure_final:
        return "A"
    if health_ok_lived is False or gate_health_in_blockers:
        return "D"
    if not lived_ok:
        return "B"
    if not autoloop_final_ready or not autoloop_exit_ok:
        return "C"
    # 他帯が揃っているのに統合 FAIL + 指紋欠落 → seal writer 系
    if not pass_unified and not fingerprint_present:
        return "E"
    return "mixed"


def recommended_card_for_band(
    band: str,
    true_blockers: list[str],
    env_failure_pf: bool,
) -> str:
    if band == "A" or env_failure_pf:
        return "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1"
    if band == "D":
        return "TENMON_PWA_GATE_HEALTH_AUDIT_CONTRACT_RETRY_CURSOR_AUTO_V1"
    if band == "C":
        return "TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1"
    if band == "E":
        return "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_WRITER_RETRY_CURSOR_AUTO_V1"
    if band == "B":
        tb = set(true_blockers)
        cont = tb & CONTINUITY_HINTS
        urlish = tb & URL_RESIDUE_HINTS
        if cont and (len(cont) > len(urlish) or (cont and not urlish)):
            return "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1"
        if urlish:
            return "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1"
        return "TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_RETRY_CURSOR_AUTO_V1"
    return "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_MANUAL_TRIAGE_CURSOR_AUTO_V1"


def compute_stale_blockers(
    signals: dict[str, Any],
    pre_blockers: list[str],
    final_blockers: list[str],
) -> list[str]:
    stale: list[str] = []
    if signals.get("autoloop_final_ready") and not signals.get("autoloop_exit_ok"):
        stale.append("stale_autoloop_json_green_vs_tenmon_autoloop_exit_nonzero")
    if signals.get("autoloop_final_ready") and not signals.get("lived_ok"):
        stale.append("stale_autoloop_ready_vs_lived_not_ok")
    pre_s, fin_s = set(pre_blockers), set(final_blockers)
    if pre_s != fin_s:
        stale.append("stale_pre_autoloop_snapshot_blockers_differ_from_final")
    return stale


def main() -> int:
    ap = argparse.ArgumentParser(description=PLAN_CARD)
    ap.add_argument("repo_root", type=str)
    ap.add_argument("--out-forensic", type=str, required=True)
    ap.add_argument("--out-plan", type=str, required=True)
    ap.add_argument(
        "--merge-unified-verdict",
        type=str,
        default="",
        help="pwa_final_seal_and_regression_guard_verdict.json に retry 節をマージ",
    )
    args = ap.parse_args()

    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    verdict_path = auto / "pwa_final_seal_and_regression_guard_verdict.json"
    unified = read_json(verdict_path)
    merge_path = Path(args.merge_unified_verdict).resolve() if args.merge_unified_verdict else verdict_path

    pf = read_json(auto / "pwa_playwright_preflight.json")
    lived_rd = read_json(auto / "pwa_lived_completion_readiness.json")
    final_rd = read_json(auto / "pwa_final_completion_readiness.json")
    snap = read_json(auto / "pwa_seal_lived_snapshot.json")
    state = read_json(auto / "pwa_final_autoloop_state.json")

    signals = unified.get("signals") if isinstance(unified.get("signals"), dict) else {}
    pass_unified = bool(unified.get("pass", signals.get("unified_pass")))
    remaining = as_list(unified.get("remaining_blockers"))
    pre_blockers = as_list(snap.get("blockers"))
    blk_snap = as_list(unified.get("blockers_snapshot"))

    env_failure_pf = bool(pf.get("env_failure")) or not bool(pf.get("usable", True))
    env_failure_final = bool(final_rd.get("env_failure"))

    lived_ok = bool(signals.get("lived_ok", True))
    autoloop_final_ready = bool(signals.get("autoloop_final_ready"))
    autoloop_exit_ok = bool(signals.get("autoloop_exit_ok", True))

    health_ok_lived = lived_rd.get("health_ok")
    if health_ok_lived is not None:
        health_ok_lived = bool(health_ok_lived)

    gate_health_in_blockers = any(
        "gate:health" in str(b).lower() or str(b).lower() == "gate:health"
        for b in remaining + blk_snap + as_list(final_rd.get("postfix_blockers"))
    )

    true_blockers = list(dict.fromkeys(remaining + blk_snap))
    stale_blockers = compute_stale_blockers(signals, pre_blockers, blk_snap or remaining)

    fp_ok = bool(unified.get("unified_fingerprint_sha256"))

    band = pick_root_band(
        env_failure_pf=env_failure_pf,
        env_failure_final=env_failure_final,
        lived_ok=lived_ok,
        health_ok_lived=health_ok_lived,
        gate_health_in_blockers=gate_health_in_blockers,
        autoloop_final_ready=autoloop_final_ready,
        autoloop_exit_ok=autoloop_exit_ok,
        pass_unified=pass_unified,
        fingerprint_present=fp_ok,
    )

    retry_class = {
        "A": "env_failure",
        "B": "lived_false",
        "C": "autoloop_false",
        "D": "gate_contract_false",
        "E": "seal_writer_false",
        "mixed": "mixed_unresolved",
    }[band]

    recommended = recommended_card_for_band(band, true_blockers, env_failure_pf)

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    forensic: dict[str, Any] = {
        "card": CARD,
        "parent_card": "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1",
        "generated_at": ts,
        "unified_pass": pass_unified,
        "retry_class": retry_class,
        "root_failure_band": band,
        "true_blockers": true_blockers,
        "stale_blockers": stale_blockers,
        "env_failure": {
            "playwright_preflight": env_failure_pf,
            "final_completion_readiness": env_failure_final,
        },
        "seal_writer_failure": band == "E",
        "signals_snapshot": signals,
        "sources": {
            "pwa_final_seal_and_regression_guard_verdict.json": str(verdict_path.resolve()),
            "pwa_playwright_preflight.json": str(auto / "pwa_playwright_preflight.json"),
            "pwa_lived_completion_readiness.json": str(auto / "pwa_lived_completion_readiness.json"),
            "pwa_final_completion_readiness.json": str(auto / "pwa_final_completion_readiness.json"),
            "pwa_final_autoloop_state.json": str(auto / "pwa_final_autoloop_state.json"),
            "pwa_seal_lived_snapshot.json": str(auto / "pwa_seal_lived_snapshot.json"),
        },
        "pwa_final_autoloop_state_summary": {
            "final_ready": state.get("final_ready"),
            "loop_count": len(state.get("loops", [])) if isinstance(state.get("loops"), list) else None,
        },
    }

    plan: dict[str, Any] = {
        "card": PLAN_CARD,
        "generated_at": ts,
        "recommended_retry_card": recommended,
        "root_failure_band": band,
        "retry_class": retry_class,
        "notes": [
            "本ファイルは retry 専用。pwa_final_completion_seal.md / pwa_final_regression_guard.json は PASS 時のみ seal runner が更新する。",
            "FAIL 時は seal 本体を無理に進めず、recommended_retry_card のカードのみ追跡すること。",
        ],
    }

    out_f = Path(args.out_forensic)
    out_p = Path(args.out_plan)
    out_f.parent.mkdir(parents=True, exist_ok=True)
    out_f.write_text(json.dumps(forensic, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out_p.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if merge_path.is_file() and not pass_unified:
        v = read_json(merge_path)
        v["retry_forensic"] = {
            "card": CARD,
            "generated_at": ts,
            "retry_class": retry_class,
            "root_failure_band": band,
            "true_blockers": true_blockers,
            "stale_blockers": stale_blockers,
            "env_failure": forensic["env_failure"],
            "seal_writer_failure": forensic["seal_writer_failure"],
            "forensic_path": str(out_f.resolve()),
            "plan_path": str(out_p.resolve()),
        }
        v["recommended_retry_card"] = recommended
        v["retry_plan_ref"] = str(out_p.resolve())
        merge_path.write_text(json.dumps(v, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "recommended_retry_card": recommended, "root_failure_band": band}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
