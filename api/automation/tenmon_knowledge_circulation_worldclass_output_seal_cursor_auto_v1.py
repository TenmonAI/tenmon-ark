#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KNOWLEDGE_CIRCULATION_WORLDCLASS_OUTPUT_SEAL_CURSOR_AUTO_V1

知識循環 → 内部理解還元 → 美文出力スタックを、既存成果物だけで採点する（集計のみ・コード改変なし）。

- CASE A: 全 8 軸通過 → seal（ok=true）
- CASE B: 1 軸のみ不足 → next_card にその軸の最小補修カード（実行は別工程）
- CASE C: 2 軸以上不足、または stale → 停止、next_card 生成

入力（fail-closed: 欠損は False）:
- tenmon_worldclass_acceptance_scorecard.json
- tenmon_final_operable_seal.json
- tenmon_latest_state_rejudge_summary.json（fresh_probe_digest, stale_sources_present）
- learning_quality_bridge.json
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_KNOWLEDGE_CIRCULATION_WORLDCLASS_OUTPUT_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_knowledge_circulation_worldclass_output_seal_cursor_auto_v1.json"
OUT_MD = "tenmon_knowledge_circulation_worldclass_output_seal_cursor_auto_v1.md"
SCORECARD_SCRIPT = "tenmon_worldclass_acceptance_scorecard_v1.py"

# 1 軸のみ不足時の推奨 next card（最小補修・本スクリプトは改変しない）
AXIS_NEXT_CARD: dict[str, str] = {
    "knowledge_priority_stability": "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1",
    "understanding_reduction_quality": "TENMON_KNOWLEDGE_TO_STYLE_BRIDGE_CURSOR_AUTO_V1",
    "scripture_output_quality": "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "general_output_quality": "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
    "selfaware_output_quality": "TENMON_SELFAWARE_ROUTE_FAMILY_NORMALIZE_CURSOR_AUTO_V1",
    "continuity_beauty_stability": "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1",
    "meta_leak_none": "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1",
    "single_source_preserved": "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1",
}

AXIS_KEYS = (
    "knowledge_priority_stability",
    "understanding_reduction_quality",
    "scripture_output_quality",
    "general_output_quality",
    "selfaware_output_quality",
    "continuity_beauty_stability",
    "meta_leak_none",
    "single_source_preserved",
)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _run_scorecard(auto: Path, api: Path) -> dict[str, Any]:
    p = auto / SCORECARD_SCRIPT
    if not p.is_file():
        return {"exit_code": None, "skipped": True}
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
    )
    return {
        "script": SCORECARD_SCRIPT,
        "exit_code": r.returncode,
        "stdout_tail": (r.stdout or "")[-3000:],
        "stderr_tail": (r.stderr or "")[-1500:],
    }


def _probe_helpers(fp: dict[str, Any]) -> dict[str, Any]:
    """dialogue seal と同型の digest から派生値。"""
    if not fp:
        return {
            "continuity_ok": False,
            "scripture_ok": False,
            "general_ok": False,
            "selfaware_ok": False,
            "surface_ok": False,
            "subconcept_len": 0.0,
            "subconcept_meta_ok": False,
            "meta_leak_all": False,
        }

    cont_len = fp.get("continuity_followup_len")
    cdu = fp.get("continuity_density_unresolved")
    continuity_ok = isinstance(cont_len, (int, float)) and float(cont_len) >= 80.0 and cdu is not True

    kh = fp.get("k1_probe_hokke") if isinstance(fp.get("k1_probe_hokke"), dict) else {}
    kk = fp.get("k1_probe_kukai") if isinstance(fp.get("k1_probe_kukai"), dict) else {}
    scripture_ok = bool(kh.get("satisfied")) and bool(kk.get("satisfied"))

    gen = fp.get("general_probe") if isinstance(fp.get("general_probe"), dict) else {}
    general_ok = bool(gen.get("satisfied"))

    ai = fp.get("ai_consciousness_lock_probe") if isinstance(fp.get("ai_consciousness_lock_probe"), dict) else {}
    selfaware_ok = bool(ai.get("satisfied"))

    sub = fp.get("subconcept_probe") if isinstance(fp.get("subconcept_probe"), dict) else {}
    surface_ok = bool(sub.get("satisfied"))
    sub_len = sub.get("len")
    subconcept_len = float(sub_len) if isinstance(sub_len, (int, float)) else 0.0
    sub_meta_ok = bool(sub.get("meta_leak_ok")) if isinstance(sub, dict) and "meta_leak_ok" in sub else False

    probes_meta = [kh, kk, gen, ai, sub]
    meta_ok_list = [bool(x.get("meta_leak_ok")) for x in probes_meta if isinstance(x, dict) and "meta_leak_ok" in x]
    meta_leak_all = bool(meta_ok_list) and all(meta_ok_list)

    return {
        "continuity_ok": continuity_ok,
        "scripture_ok": scripture_ok,
        "general_ok": general_ok,
        "selfaware_ok": selfaware_ok,
        "surface_ok": surface_ok,
        "subconcept_len": subconcept_len,
        "subconcept_meta_ok": sub_meta_ok,
        "meta_leak_all": meta_leak_all,
    }


def _axis_eval(
    lqb: dict[str, Any],
    final_seal: dict[str, Any],
    ph: dict[str, Any],
    sc: dict[str, Any],
    stale: bool,
) -> dict[str, bool]:
    """8 軸。stale 時は採点を信頼しないため全 False（CASE C）。"""
    if stale:
        return {k: False for k in AXIS_KEYS}

    th = lqb.get("thresholds") if isinstance(lqb.get("thresholds"), dict) else {}
    scores = lqb.get("scores") if isinstance(lqb.get("scores"), dict) else {}
    unified = scores.get("unified_score")
    lq_fail = bool(th.get("learning_quality_fail"))

    # 1 知識循環（学習品質ブリッジ + 回帰なし）
    reg = bool(sc.get("signals", {}).get("regression_detected")) if isinstance(sc.get("signals"), dict) else True
    knowledge_priority_stability = (not lq_fail) and (isinstance(unified, (int, float)) and float(unified) >= 60.0) and (not reg)

    # 2 内部理解還元（subconcept 応答が一定量あり、かつ当該プローブでメタ漏れなし）
    understanding_reduction_quality = (
        float(ph.get("subconcept_len") or 0) >= 48.0 and bool(ph.get("subconcept_meta_ok"))
    )

    scripture_output_quality = bool(ph["scripture_ok"])
    general_output_quality = bool(ph["general_ok"])
    selfaware_output_quality = bool(ph["selfaware_ok"])
    continuity_beauty_stability = bool(ph["continuity_ok"])
    meta_leak_none = bool(ph["meta_leak_all"])

    # 8 single-source（final operable seal を優先）
    single_source_preserved = bool(final_seal.get("single_source_ok"))

    return {
        "knowledge_priority_stability": knowledge_priority_stability,
        "understanding_reduction_quality": understanding_reduction_quality,
        "scripture_output_quality": scripture_output_quality,
        "general_output_quality": general_output_quality,
        "selfaware_output_quality": selfaware_output_quality,
        "continuity_beauty_stability": continuity_beauty_stability,
        "meta_leak_none": meta_leak_none,
        "single_source_preserved": single_source_preserved,
    }


def _failed_axes(axes: dict[str, bool]) -> list[str]:
    return [k for k in AXIS_KEYS if not axes.get(k)]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    sc_run = _run_scorecard(auto, api)
    sc = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    rj = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    lqb = _read_json(auto / "learning_quality_bridge.json")
    final_seal = _read_json(auto / "tenmon_final_operable_seal.json")

    stale = bool(rj.get("stale_sources_present"))
    fp = rj.get("fresh_probe_digest") if isinstance(rj.get("fresh_probe_digest"), dict) else {}
    if stale:
        fp = {}

    ph = _probe_helpers(fp)
    axes = _axis_eval(lqb, final_seal, ph, sc, stale)
    failed = _failed_axes(axes)
    n_fail = len(failed)

    rec_next = str(sc.get("recommended_next_card") or sc.get("next_best_card") or "").strip() or None
    rj_next = str(rj.get("recommended_next_card") or "").strip() or None
    if rj_next:
        rec_next = rj_next

    case = "C"
    primary_gap: str | None = "multi_axis"
    next_card_if_fail: str | None = rec_next or "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1"

    if stale:
        case = "C"
        primary_gap = "stale_evidence"
        next_card_if_fail = rec_next or "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
    elif n_fail == 0:
        case = "A"
        primary_gap = None
        next_card_if_fail = None
    elif n_fail == 1:
        case = "B"
        fa = failed[0]
        primary_gap = fa
        next_card_if_fail = AXIS_NEXT_CARD.get(fa) or rec_next
    else:
        case = "C"
        primary_gap = "multi_axis"
        next_card_if_fail = rec_next or "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1"

    wc_sc = bool(sc.get("worldclass_ready"))
    all_axes_ok = n_fail == 0 and not stale

    # 派生フラグ（PASS 条件の文言と整合）
    knowledge_circulation_ready = bool(axes["knowledge_priority_stability"])
    understanding_reduction_ready = bool(axes["understanding_reduction_quality"])
    beautiful_output_ready = bool(
        axes["meta_leak_none"]
        and (ph["surface_ok"] or (float(ph.get("subconcept_len") or 0) >= 80.0 and ph.get("subconcept_meta_ok")))
    )
    single_source_preserved = bool(axes["single_source_preserved"])
    worldclass_output_ready = bool(all_axes_ok and wc_sc)

    ok = bool(all_axes_ok and wc_sc and not stale)

    ts = _utc()
    summary = {
        "ok": ok,
        "card": CARD,
        "knowledge_circulation_ready": knowledge_circulation_ready,
        "understanding_reduction_ready": understanding_reduction_ready,
        "beautiful_output_ready": beautiful_output_ready,
        "worldclass_output_ready": worldclass_output_ready,
        "single_source_preserved": single_source_preserved,
        "rollback_used": False,
        "next_card_if_fail": None if ok else next_card_if_fail,
    }

    out: dict[str, Any] = {
        **summary,
        "generated_at": ts,
        "case": case,
        "failed_axes": failed,
        "axes": axes,
        "probe_helpers": ph,
        "stale_sources_present": stale,
        "scorecard_worldclass_ready": wc_sc,
        "steps": {"tenmon_worldclass_acceptance_scorecard_v1": sc_run},
        "inputs": {
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "learning_quality_bridge": str(auto / "learning_quality_bridge.json"),
            "final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
        },
        "notes": [
            "8 軸は fresh_probe_digest（stale 時は空扱い）+ learning_quality_bridge + final_operable_seal + scorecard regression で決定。",
            "understanding_reduction_quality は subconcept の長さと meta_leak_ok（satisfied 非依存）。",
            "beautiful_output_ready は meta_leak 全通過かつ（subconcept satisfied または長文+メタ無漏れ）。",
            "CASE B の補修は next_card を実行後に本スクリプトで再採点。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **ok**: `{ok}`",
        f"- **case**: `{case}`",
        f"- **next_card_if_fail**: `{out['next_card_if_fail']}`",
        "",
        "## axes",
        "",
        json.dumps(axes, ensure_ascii=False, indent=2),
        "",
        "## failed_axes",
        "",
        ", ".join(failed) if failed else "(none)",
    ]
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
