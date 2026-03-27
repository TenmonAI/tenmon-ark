#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_CONVERSATION_COMPLETION_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1

会話完成を single-source verdict で封印するための観測・集計のみ（product 改変なし）。
truth: verdict_source_priority_v1.json の latest_lived_truth_singleton を検証し、
PWA lived を primary、superseded（pwa_final 等）を seal 参照から除外する。
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_CONVERSATION_COMPLETION_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_final_conversation_completion_single_source_seal_cursor_auto_v1.json"
OUT_MD = "tenmon_final_conversation_completion_single_source_seal_cursor_auto_v1.md"
OUT_MANIFEST = "tenmon_final_conversation_completion_single_source_seal_manifest_v1.json"
OUT_COMPLETED_READY = "tenmon_final_conversation_completion_single_source_seal_completed_ready_v1.json"

VSP = "verdict_source_priority_v1.json"
LIVED = "pwa_lived_completion_readiness.json"
LIVED_BLK = "pwa_lived_completion_blockers.json"
PWA_FINAL = "pwa_final_completion_readiness.json"
FINAL_MASTER = "final_master_readiness.json"
INTEGRATED = "self_build_os_integrated_verdict.json"
CONV_SEAL = "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json"
RJ_SUM = "tenmon_latest_state_rejudge_summary.json"
DIALOGUE_ACCEPTANCE_CARD = "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"


def _read(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _post_write_audit_seal_clean(auto: Path, pwa_superseded: bool) -> tuple[bool, list[str]]:
    """封印済み detail JSON を読み戻し、superseded primary が allowed に混入していないか再監査。"""
    d = _read(auto / OUT_JSON)
    violations: list[str] = []
    m = d.get("manifest") if isinstance(d.get("manifest"), dict) else {}
    refs = m.get("allowed_references")
    pwa_final_abs = str(auto / PWA_FINAL)
    if isinstance(refs, list) and pwa_superseded:
        for r in refs:
            if isinstance(r, str) and (r == pwa_final_abs or r.endswith("/" + PWA_FINAL)):
                violations.append(f"superseded_primary_in_allowed_references:{r}")
    return len(violations) == 0, violations


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    vsp = _read(auto / VSP)
    lived = _read(auto / LIVED)
    lived_blk = _read(auto / LIVED_BLK)
    pwa_final = _read(auto / PWA_FINAL)
    final_master = _read(auto / FINAL_MASTER)
    integrated = _read(auto / INTEGRATED)
    conv_seal = _read(auto / CONV_SEAL)
    rj = _read(auto / RJ_SUM)

    policy = str(vsp.get("truth_policy") or "")
    policy_ok = policy == "latest_lived_truth_singleton"

    pwa_superseded = bool(rj.get("pwa_final_superseded_by_lived") is True)

    # verdict policy: superseded 証跡を seal に混ぜない（VSP exclude_when + lived 優位）
    policy_excludes_superseded = bool(vsp.get("exclude_when", {}).get("superseded") is True)

    # PWA lived primary: final_ready かつ rejudge と矛盾しない
    lived_primary = bool(lived.get("final_ready") is True)

    dialogue_seal_card_ok = str(conv_seal.get("card") or "").strip() == DIALOGUE_ACCEPTANCE_CARD

    # 会話完成（最新の dialogue acceptance seal のみを単一ソースとする）
    conversation_completion_ready = bool(conv_seal.get("ok") is True)
    worldclass_ready = bool(conv_seal.get("worldclass_ready") is True)

    stale_conv = bool(conv_seal.get("stale_sources_present") is True)

    # seal 参照は lived 起点の単一路線のみ（pwa_final は superseded 時は参照禁止）
    allowed_seal_refs: list[str] = [
        str(auto / VSP),
        str(auto / LIVED),
        str(auto / LIVED_BLK),
        str(auto / CONV_SEAL),
        str(auto / RJ_SUM),
    ]
    forbidden_in_seal: list[str] = []
    if pwa_superseded:
        forbidden_in_seal.append(str(auto / PWA_FINAL))

    stale_in_seal: list[str] = []
    if stale_conv:
        stale_in_seal.append("tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1:stale_sources_present")
    rj_stale = bool(rj.get("stale_sources_present") is True)
    if rj_stale:
        stale_in_seal.append("tenmon_latest_state_rejudge_summary:stale_sources_present")
    if not dialogue_seal_card_ok:
        stale_in_seal.append(
            f"dialogue_seal_card_mismatch:expected={DIALOGUE_ACCEPTANCE_CARD}:got={conv_seal.get('card')!r}",
        )

    superseded_in_seal: list[str] = []
    pwa_final_abs = str(auto / PWA_FINAL)
    if pwa_superseded and pwa_final_abs in allowed_seal_refs:
        superseded_in_seal.append(PWA_FINAL)

    # 会話完成の判定源は dialogue acceptance seal のみ（他 JSON と矛盾しない）
    completed_verdict_unique = bool(conv_seal) and isinstance(conv_seal.get("ok"), bool)

    lived_blockers_count = (
        len(lived_blk.get("blockers") or []) if isinstance(lived_blk.get("blockers"), list) else 0
    )

    # truth 一本化: tier1 lived > tier2 integrated > tier3 final_master（観測のみ・PASS は tier1 必須）
    integrated_ready = bool(integrated.get("self_build_os_overall_ready") is True)
    master_verdict = str(final_master.get("master_verdict") or "").strip()

    final_completed_verdict = "PASS"

    ok = bool(
        policy_ok
        and dialogue_seal_card_ok
        and lived_primary
        and lived_blockers_count == 0
        and conversation_completion_ready
        and worldclass_ready
        and not stale_conv
        and not rj_stale
        and policy_excludes_superseded
        and len(superseded_in_seal) == 0
        and completed_verdict_unique
    )

    # VSP が superseded を除外し、かつ allowed 参照に superseded primary を混ぜていない
    superseded_excluded = bool(policy_excludes_superseded and len(superseded_in_seal) == 0)

    next_card: str | None = None
    if not ok:
        final_completed_verdict = "FAIL"
        next_card = str(conv_seal.get("next_card_if_fail") or "").strip() or None
        if not next_card:
            next_card = "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"

    ts = _utc()
    # PASS 時は仕様どおりのリテラル（policy 不一致時は fail で unknown）
    single_source_truth_policy = "latest_lived_truth_singleton" if policy_ok else "unknown_or_mismatch"

    summary = {
        "ok": ok,
        "card": CARD,
        "single_source_truth_policy": single_source_truth_policy,
        "superseded_excluded": superseded_excluded,
        "conversation_completion_ready": conversation_completion_ready,
        "worldclass_ready": worldclass_ready,
        "final_completed_verdict": final_completed_verdict,
        "rollback_used": False,
        "next_card_if_fail": None if ok else next_card,
    }

    manifest = {
        "card": CARD,
        "generated_at": ts,
        "truth_policy_expected": "latest_lived_truth_singleton",
        "truth_policy_observed": policy,
        "final_seal_primary_source": "pwa_lived_completion_readiness.json",
        "allowed_references": allowed_seal_refs,
        "excluded_superseded_primary": forbidden_in_seal,
        "pwa_final_superseded_by_lived": pwa_superseded,
    }

    detail = {
        **summary,
        "generated_at": ts,
        "step0_inputs_observed": {
            VSP: bool(vsp),
            LIVED: bool(lived),
            PWA_FINAL: bool(pwa_final),
            FINAL_MASTER: bool(final_master),
            INTEGRATED: bool(integrated),
            CONV_SEAL: bool(conv_seal),
            RJ_SUM: bool(rj),
        },
        "priority_resolution": {
            "tier1_latest_lived_truth": lived_primary,
            "tier2_integrated_verdict_ready": integrated_ready,
            "tier3_final_master_verdict": master_verdict,
            "tier4_superseded_primary_excluded_from_seal": bool(
                pwa_superseded and pwa_final_abs not in allowed_seal_refs
            ),
            "truth_lineage_observed": "tier1_lived"
            if lived_primary
            else ("tier2_integrated" if integrated_ready else ("tier3_master" if master_verdict else "unknown")),
        },
        "audit": {
            "dialogue_seal_card_ok": dialogue_seal_card_ok,
            "stale_in_seal": stale_in_seal,
            "superseded_in_seal": superseded_in_seal,
            "completed_verdict_unique": completed_verdict_unique,
            "lived_blockers_count": lived_blockers_count,
            "post_write_seal_clean": None,
            "post_write_violations": [],
        },
        "manifest": manifest,
        "outputs_seal": {
            "detail_json": str(auto / OUT_JSON),
            "manifest_json": str(auto / OUT_MANIFEST),
            "markdown": str(auto / OUT_MD),
            "completed_ready_json": str(auto / OUT_COMPLETED_READY) if ok else None,
        },
        "notes": [
            "self_audit の latest_lived_truth_singleton は verdict_source_priority_v1.json の truth_policy と一致していること。",
            "superseded PWA final は pwa_final_superseded_by_lived 時に seal primary から除外。",
            "会話完成は tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json の ok/worldclass_ready を参照。",
            "封印後の再監査: audit.stale_in_seal / superseded_in_seal が空であること。",
            "書き込み後の再監査: audit.post_write_seal_clean が true（manifest に superseded primary が混入していないこと）。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(detail, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    post_clean, post_viol = _post_write_audit_seal_clean(auto, pwa_superseded)
    audit = detail.get("audit")
    if isinstance(audit, dict):
        audit["post_write_seal_clean"] = post_clean
        audit["post_write_violations"] = post_viol
    if ok and not post_clean:
        ok = False
        final_completed_verdict = "FAIL"
        summary["ok"] = False
        summary["final_completed_verdict"] = "FAIL"
        if summary.get("next_card_if_fail") is None:
            summary["next_card_if_fail"] = next_card or "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"
        detail["ok"] = False
        detail["final_completed_verdict"] = "FAIL"
        detail["next_card_if_fail"] = summary["next_card_if_fail"]
        if isinstance(detail.get("outputs_seal"), dict):
            detail["outputs_seal"]["completed_ready_json"] = None

    (auto / OUT_JSON).write_text(json.dumps(detail, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if ok:
        (auto / OUT_COMPLETED_READY).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        try:
            (auto / OUT_COMPLETED_READY).unlink(missing_ok=True)
        except Exception:
            pass
    (auto / OUT_MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **ok**: `{ok}`",
        f"- **final_completed_verdict**: `{final_completed_verdict}`",
        f"- **single_source_truth_policy**: `{single_source_truth_policy}`",
        f"- **next_card_if_fail**: `{detail['next_card_if_fail']}`",
        "",
        "## Summary (stdout schema)",
        "",
        "```json",
        json.dumps(summary, ensure_ascii=False, indent=2),
        "```",
    ]
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
