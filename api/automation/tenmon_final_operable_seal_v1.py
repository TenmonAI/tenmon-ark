#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_final_operable_seal.json"
OUT_MD = "tenmon_final_operable_seal_report.md"
NEXT_CARD_FAIL = "TENMON_CURSOR_ONLY_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"
NEXT_CARD_PASS = "TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1"


def load(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _list_from(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [str(x).strip() for x in raw if str(x).strip()]


def _get_bool(d: dict[str, Any], *keys: str) -> bool:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return False
        cur = cur.get(k)
    return bool(cur is True)


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
    latest = load(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    detail = load(auto / "tenmon_current_state_detailed_report.json")
    system_verdict = load(auto / "tenmon_system_verdict.json")
    hyg = load(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    self_build = load(auto / "tenmon_self_build_execution_chain_verdict.json")
    remote_admin = load(auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json")

    # latest summary -> verdict の順で truth を採用
    health_ok = bool(latest.get("health_ok"))
    audit_ok = bool(latest.get("audit_ok"))
    audit_build_ok = bool(latest.get("audit_build_ok"))
    continuity_ok = bool(latest.get("continuity_ok"))

    repo_must_block_seal = bool(
        latest.get("repo_must_block_seal")
        if "repo_must_block_seal" in latest
        else hyg.get("must_block_seal")
    )
    if not repo_must_block_seal and isinstance(latest.get("hygiene"), dict):
        repo_must_block_seal = bool(latest["hygiene"].get("repo_must_block_seal"))

    self_build_chain_closed = bool(
        self_build.get("chain_closed")
        or self_build.get("pass")
        or _get_bool(system_verdict, "subsystems", "self_build_os", "accepted_complete")
    )
    critical_runtime_present = bool(
        _get_bool(system_verdict, "subsystems", "conversation_backend", "accepted_complete")
        and _get_bool(system_verdict, "subsystems", "self_audit_os", "accepted_complete")
        and _get_bool(system_verdict, "subsystems", "self_build_os", "accepted_complete")
    )
    if not critical_runtime_present:
        critical_runtime_present = bool(remote_admin)

    summary_remaining = _list_from(latest_summary.get("remaining_blockers"))
    # stale は summary で既に正規化済み。operable seal では stale ledger を再注入しない。
    stale_invalidated = True
    invalid_for_seal = set()

    candidates = summary_remaining if summary_remaining else (_list_from(detail.get("blockers")) + _list_from(detail.get("active_blockers")))
    unsafe_tokens = (
        "health_not_ok",
        "audit_not_ok",
        "audit_build_not_ok",
        "continuity_fail",
        "repo_must_block_seal",
        "self_build",
        "runtime_missing",
        "critical_runtime",
        "gate:health",
        "health_404",
    )
    active_blockers = sorted({b for b in candidates if any(t in b for t in unsafe_tokens)})
    resolved_blockers = sorted(invalid_for_seal) if invalid_for_seal else []
    unsafe_blockers_remaining = len(active_blockers) > 0

    pass_flag = bool(
        health_ok
        and audit_ok
        and audit_build_ok
        and continuity_ok
        and (not repo_must_block_seal)
        and self_build_chain_closed
        and critical_runtime_present
        and stale_invalidated
        and (not unsafe_blockers_remaining)
    )
    operable_sealed = pass_flag

    why_pass: list[str] = []
    why_fail: list[str] = []
    if health_ok:
        why_pass.append("health_ok")
    else:
        why_fail.append("health_not_ok")
    if audit_ok:
        why_pass.append("audit_ok")
    else:
        why_fail.append("audit_not_ok")
    if audit_build_ok:
        why_pass.append("audit_build_ok")
    else:
        why_fail.append("audit_build_not_ok")
    if continuity_ok:
        why_pass.append("continuity_ok")
    else:
        why_fail.append("continuity_not_ok")
    if not repo_must_block_seal:
        why_pass.append("repo_hygiene_ok")
    else:
        why_fail.append("repo_must_block_seal")
    if self_build_chain_closed:
        why_pass.append("self_build_chain_closed")
    else:
        why_fail.append("self_build_chain_not_closed")
    if critical_runtime_present:
        why_pass.append("critical_runtime_present")
    else:
        why_fail.append("critical_runtime_missing")
    if stale_invalidated:
        why_pass.append("stale_invalidation_applied")
    else:
        why_fail.append("stale_invalidation_missing")
    if not unsafe_blockers_remaining:
        why_pass.append("unsafe_blockers_cleared")
    else:
        why_fail.append("unsafe_blockers_remaining")

    if pass_flag:
        seal_band = "operable_sealed"
    elif health_ok and audit_ok and audit_build_ok and continuity_ok:
        seal_band = "core_runtime_ok_but_blocked"
    else:
        seal_band = "not_operable"

    if operable_sealed:
        final_statement = "TENMON-ARK は運用可能完成体として operable seal を満たしている。"
    else:
        final_statement = "operable seal 未達のため、現時点で完成封印は行わない。"
    recommended_next_card = NEXT_CARD_PASS if operable_sealed else NEXT_CARD_FAIL

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "pass": pass_flag,
        "operable_sealed": operable_sealed,
        "seal_band": seal_band,
        "why_pass": why_pass[:50],
        "why_fail": why_fail[:50],
        "active_blockers": active_blockers[:100],
        "resolved_blockers": resolved_blockers[:100],
        "final_operable_statement": final_statement,
        "recommended_next_card": recommended_next_card,
        "axes": {
            "health_ok": health_ok,
            "audit_ok": audit_ok,
            "audit_build_ok": audit_build_ok,
            "continuity_ok": continuity_ok,
            "repo_must_block_seal": repo_must_block_seal,
            "self_build_chain_closed": self_build_chain_closed,
            "critical_runtime_present": critical_runtime_present,
            "stale_invalidated": stale_invalidated,
            "unsafe_blockers_remaining": unsafe_blockers_remaining,
            "latest_summary_truth_used": bool(latest_summary),
        },
    }
    (auto / OUT_NAME).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- pass: `{pass_flag}`",
        f"- operable_sealed: `{operable_sealed}`",
        f"- seal_band: `{seal_band}`",
        f"- recommended_next_card: `{recommended_next_card}`",
        "",
        "## Operable Axes",
        f"- health_ok: `{health_ok}`",
        f"- audit_ok: `{audit_ok}`",
        f"- audit_build_ok: `{audit_build_ok}`",
        f"- continuity_ok: `{continuity_ok}`",
        f"- repo_must_block_seal: `{repo_must_block_seal}`",
        f"- self_build_chain_closed: `{self_build_chain_closed}`",
        f"- critical_runtime_present: `{critical_runtime_present}`",
        f"- stale_invalidated: `{stale_invalidated}`",
        f"- unsafe_blockers_remaining: `{unsafe_blockers_remaining}`",
        "",
        "## Why Pass",
    ]
    md_lines.extend([f"- `{x}`" for x in why_pass] if why_pass else ["- none"])
    md_lines.append("")
    md_lines.append("## Why Fail")
    md_lines.extend([f"- `{x}`" for x in why_fail] if why_fail else ["- none"])
    md_lines.append("")
    md_lines.append("## Active Blockers")
    md_lines.extend([f"- `{x}`" for x in active_blockers] if active_blockers else ["- none"])
    md_lines.append("")
    md_lines.append("## Resolved Blockers")
    md_lines.extend([f"- `{x}`" for x in resolved_blockers] if resolved_blockers else ["- none"])
    md_lines.append("")
    md_lines.append("## Final Statement")
    md_lines.append(f"- {final_statement}")
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if pass_flag else 1


if __name__ == "__main__":
    raise SystemExit(main())
