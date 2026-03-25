#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_final_worldclass_claim_gate.json"
OUT_MD = "tenmon_final_worldclass_claim_gate_report.md"

CRITICAL_SUBSYSTEMS = (
    "conversation_backend",
    "pwa_lived_proof",
    "self_audit_os",
    "self_build_os",
    "remote_admin_cursor_bridge",
)

CLAIM_CRITICAL_BASENAMES = frozenset(
    {
        "tenmon_worldclass_acceptance_scorecard.json",
        "tenmon_system_verdict.json",
        "tenmon_final_operable_seal.json",
    }
)


def load(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _pct(score: dict[str, Any]) -> float:
    try:
        return float(score.get("score_percent") or 0)
    except (TypeError, ValueError):
        return 0.0


def _sub(sysv: dict[str, Any], key: str) -> dict[str, Any]:
    sub = sysv.get("subsystems")
    if not isinstance(sub, dict):
        return {}
    s = sub.get(key)
    return s if isinstance(s, dict) else {}


def operable_sealed_from(seal: dict[str, Any]) -> bool:
    if seal.get("operable_sealed") is True:
        return True
    if seal.get("pass") is True and seal.get("operable_sealed") is not False:
        return True
    return seal.get("seal_ready") is True and seal.get("operable_ready") is True


def repo_blocks_claim(latest: dict[str, Any], sysv: dict[str, Any], score: dict[str, Any], latest_summary: dict[str, Any]) -> bool:
    if "repo_hygiene_must_block_seal" in [str(x) for x in (latest_summary.get("remaining_blockers") or [])]:
        return True
    ev = latest.get("evidence")
    if isinstance(ev, dict):
        rh = ev.get("repo_hygiene")
        if isinstance(rh, dict) and rh.get("must_block_seal") is True:
            return True
    sig = score.get("signals") if isinstance(score.get("signals"), dict) else {}
    if sig.get("repo_must_block_seal") is True:
        return True
    h = _sub(sysv, "repo_hygiene")
    if h.get("must_block_seal") is True:
        return True
    if h.get("accepted_complete") is True:
        return False
    return h.get("band") in ("dirty_repo", "must_block") or bool(h.get("primary_blockers"))


def remote_admin_accepted(remote: dict[str, Any], latest: dict[str, Any]) -> bool:
    if remote.get("remote_admin_runtime_proven") is True or remote.get("pass") is True:
        return True
    sub = remote.get("subsystems") if isinstance(remote.get("subsystems"), dict) else {}
    adm = sub.get("admin_route_runtime") if isinstance(sub, dict) else None
    if isinstance(adm, dict) and adm.get("accepted_complete") is True:
        return True
    ev = latest.get("evidence")
    if isinstance(ev, dict) and ev.get("remote_admin_runtime_proven") is True:
        return True
    return False


def self_audit_ok(sysv: dict[str, Any]) -> bool:
    sa = _sub(sysv, "self_audit_os")
    if sa.get("accepted_complete") is True:
        return True
    if sa.get("explicit_exemption_with_evidence") is True:
        return True
    evp = sa.get("exemption_evidence_path")
    if isinstance(evp, str) and evp.strip():
        return True
    notes = sa.get("exemption_notes")
    if isinstance(notes, str) and "exempt" in notes.lower() and "evidence" in notes.lower():
        return True
    return False


def learning_ok(path: Path) -> tuple[bool, bool]:
    if not path.exists():
        return True, False
    data = load(path)
    if not data:
        return False, True
    ok = bool(
        data.get("overall_pass") is True
        or data.get("integrated_acceptance_pass") is True
        or data.get("pass") is True
    )
    return ok, True


def lived_proof_demonstrated(score: dict[str, Any], latest: dict[str, Any], sysv: dict[str, Any]) -> bool:
    sig = score.get("signals") if isinstance(score.get("signals"), dict) else {}
    sig_demo = bool(sig.get("lived_proof_demonstrated"))
    if bool(latest.get("product_failure")) or bool(latest.get("env_failure")):
        return False
    pwa = _sub(sysv, "pwa_lived_proof")
    sub_accepted = pwa.get("accepted_complete") is True
    return sig_demo and sub_accepted


def stale_blocks_claim(latest_summary: dict[str, Any]) -> tuple[bool, list[str]]:
    # latest summary を primary truth とし、stale verdict は参照しない
    ss = latest_summary.get("stale_sources")
    if isinstance(ss, list):
        return (len(ss) > 0), [str(x) for x in ss[:30]]
    return False, []


def critical_status(sysv: dict[str, Any]) -> tuple[dict[str, bool], bool]:
    out: dict[str, bool] = {}
    ok_all = True
    for k in CRITICAL_SUBSYSTEMS:
        s = _sub(sysv, k)
        ac = s.get("accepted_complete") is True
        out[k] = ac
        if k == "self_audit_os":
            if not ac:
                ac = self_audit_ok(sysv)
                out[k] = ac
        if not out.get(k, False):
            ok_all = False
    return out, ok_all


def pick_next_card(
    operable: bool,
    forbidden: list[str],
    seal: dict[str, Any],
) -> str:
    if not operable:
        return str(seal.get("recommended_next_card") or "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1")
    if "score_below_90" in forbidden:
        return "TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1"
    if "stale_claim_evidence" in forbidden or "stale_worldclass_evidence_invalidated" in forbidden:
        return "TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1"
    if "lived_proof_not_demonstrated" in forbidden or "critical_subsystems_not_all_accepted" in forbidden:
        return "TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1"
    return "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    latest_summary = load(auto / "tenmon_latest_state_rejudge_summary.json")
    single_source = load(auto / "tenmon_final_single_source_seal.json")
    seal = load(auto / "tenmon_final_operable_seal.json")
    score = load(auto / "tenmon_worldclass_acceptance_scorecard.json")
    sysv = load(auto / "tenmon_system_verdict.json")
    latest = load(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    remote = load(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")
    self_build = load(auto / "tenmon_self_build_execution_chain_verdict.json")
    learn_path = auto / "learning_acceptance_audit.json"

    pct = _pct(score)
    operable = operable_sealed_from(seal) and bool(single_source.get("operable_ready") is True)
    crit_status, crit_all = critical_status(sysv)
    lived = lived_proof_demonstrated(score, latest, sysv)
    repo_blocked = repo_blocks_claim(latest, sysv, score, latest_summary)
    remote_ok = remote_admin_accepted(remote, latest)
    learn_pass, learn_present = learning_ok(learn_path)

    stale_bad, stale_paths = stale_blocks_claim(latest_summary)
    self_build_closed = bool(
        self_build.get("chain_closed") is True
        or self_build.get("pass") is True
        or _sub(sysv, "self_build_os").get("accepted_complete") is True
    )

    forbidden: list[str] = []
    allowed: list[str] = []

    if operable:
        allowed.append("operable_sealed")
    else:
        forbidden.append("operable_not_sealed")
    if pct >= 90.0:
        allowed.append("score_at_or_above_90")
    else:
        forbidden.append("score_below_90")
    if crit_all:
        allowed.append("critical_subsystems_all_accepted")
    else:
        forbidden.append("critical_subsystems_not_all_accepted")
    if lived:
        allowed.append("lived_proof_demonstrated")
    else:
        forbidden.append("lived_proof_not_demonstrated")
    if not repo_blocked:
        allowed.append("repo_not_blocking_claim")
    else:
        forbidden.append("repo_hygiene_blocks_claim")
    if remote_ok:
        allowed.append("remote_admin_accepted")
    else:
        forbidden.append("remote_admin_not_accepted")
    if learn_present:
        if learn_pass:
            allowed.append("learning_acceptance_ok")
        else:
            forbidden.append("learning_acceptance_not_met")
    else:
        allowed.append("learning_acceptance_skipped_no_file")
    if not stale_bad:
        allowed.append("no_stale_claim_blocker")
    else:
        forbidden.append("latest_truth_stale_sources_present")
    if self_build_closed:
        allowed.append("self_build_chain_ok")
    else:
        forbidden.append("self_build_chain_not_closed")

    # non-negotiables: operable false / repo block true のまま claim 不可
    if seal.get("operable_sealed") is not True or single_source.get("seal_ready") is not True:
        if "operable_not_sealed" not in forbidden:
            forbidden.append("operable_not_sealed")
    if repo_blocked and "repo_hygiene_blocks_claim" not in forbidden:
        forbidden.append("repo_hygiene_blocks_claim")
    claim_allowed = len(forbidden) == 0
    worldclass_ready = claim_allowed
    pass_flag = claim_allowed

    if claim_allowed:
        final_statement = (
            "TENMON-ARK は世界最高峰ラインの受容基準（operable sealed・スコア・"
            "クリティカルサブシステム・lived proof・hygiene・remote admin・学習監査・"
            "stale なし）を満たす。worldclass claim を許可する。"
        )
    else:
        final_statement = ""

    next_card = pick_next_card(operable, forbidden, seal)

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "pass": pass_flag,
        "claim_allowed": claim_allowed,
        "worldclass_ready": worldclass_ready,
        "claim_forbidden_reasons": forbidden,
        "claim_allowed_reasons": allowed,
        "score_percent": score.get("score_percent"),
        "critical_subsystems_status": crit_status,
        "final_claim_statement": final_statement,
        "recommended_next_card": next_card,
        "evidence": {
            "operable_sealed": operable,
            "score_percent_numeric": pct,
            "lived_proof_demonstrated": lived,
            "repo_blocks_claim": repo_blocked,
            "remote_admin_accepted": remote_ok,
            "self_build_chain_closed": self_build_closed,
            "learning_audit_present": learn_present,
            "learning_audit_pass": learn_pass,
            "stale_claim_paths": stale_paths[:30],
            "inputs": {
                "tenmon_final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
                "tenmon_final_single_source_seal": str(auto / "tenmon_final_single_source_seal.json"),
                "tenmon_latest_state_rejudge_summary": str(
                    auto / "tenmon_latest_state_rejudge_summary.json"
                ),
                "tenmon_worldclass_acceptance_scorecard": str(
                    auto / "tenmon_worldclass_acceptance_scorecard.json"
                ),
                "tenmon_system_verdict": str(auto / "tenmon_system_verdict.json"),
                "tenmon_latest_state_rejudge_and_seal_refresh_verdict": str(
                    auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
                ),
                "tenmon_remote_admin_cursor_runtime_proof_verdict": str(
                    auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json"
                ),
                "tenmon_self_build_execution_chain_verdict": str(
                    auto / "tenmon_self_build_execution_chain_verdict.json"
                ),
                "learning_acceptance_audit": str(learn_path),
            },
        },
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- pass: `{pass_flag}`",
        f"- claim_allowed: `{claim_allowed}`",
        f"- worldclass_ready: `{worldclass_ready}`",
        f"- recommended_next_card: `{next_card}`",
        "",
        "## Critical subsystems",
    ]
    for k, v in crit_status.items():
        md.append(f"- `{k}`: `{v}`")
    md.append("")
    md.append("## Claim allowed reasons")
    md.extend([f"- `{r}`" for r in allowed] if allowed else ["- none"])
    md.append("")
    md.append("## Claim forbidden reasons")
    md.extend([f"- `{r}`" for r in forbidden] if forbidden else ["- none"])
    md.append("")
    md.append("## Final claim statement")
    md.append(f"- {final_statement!r}" if final_statement else "- (empty)")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0 if pass_flag else 1


if __name__ == "__main__":
    raise SystemExit(main())
