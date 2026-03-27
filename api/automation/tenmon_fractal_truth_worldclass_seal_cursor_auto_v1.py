#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FRACTAL_TRUTH_WORLDCLASS_SEAL_CURSOR_AUTO_V1

KHS root / fractal law / mythogenesis / mapping / truth structure / digest ledger / mixed 品質 / single-source / beautiful output
を統合採点（集計のみ・コード改変なし）。

- CASE A: 全10軸 green + worktree clean + worldclass_ready + not stale + not regression → ok（封印）
- CASE B: 欠け 1 軸のみ → AXIS_NEXT_CARD（軸別最小補修 trace）
- CASE C: 2 軸以上不足 / stale / worktree dirty → 停止（優先: worktree → stale → multi）
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FRACTAL_TRUTH_WORLDCLASS_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json"
OUT_MD = "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.md"
SCORECARD_SCRIPT = "tenmon_worldclass_acceptance_scorecard_v1.py"

# 統合カード（採点・分岐・次工程の参照用・コード改変なし）
CARD_SINGLE_AXIS_REPAIR = "TENMON_FRACTAL_TRUTH_SINGLE_AXIS_REPAIR_CURSOR_AUTO_V1"
CARD_STALE_FORENSIC = "TENMON_FRACTAL_TRUTH_STALE_BLOCKER_FORENSIC_CURSOR_AUTO_V1"
CARD_OUTPUT_STYLE_TUNE = "TENMON_FRACTAL_OUTPUT_STYLE_TUNE_CURSOR_AUTO_V1"
CARD_WORKTREE_CONVERGENCE = "TENMON_FRACTAL_WORKTREE_CONVERGENCE_AND_SEAL_CURSOR_AUTO_V1"
CARD_AUTONOMY_BRIDGE = "TENMON_FRACTAL_AUTONOMY_BRIDGE_CURSOR_AUTO_V1"

AXIS_NEXT_CARD: dict[str, str] = {
    "khs_root_fixed": "TENMON_KHS_ROOT_TRACE_CURSOR_AUTO_V1",
    "fractal_law_kernel_ready": "TENMON_FRACTAL_LAW_AXIS_TRACE_CURSOR_AUTO_V1",
    "mythogenesis_mapper_ready": "TENMON_KOJIKI_PHASE_TRACE_CURSOR_AUTO_V1",
    "mapping_layer_ready": "TENMON_MAPPING_LAYER_TRACE_CURSOR_AUTO_V1",
    "truth_structure_reasoning_ready": "TENMON_TRUTH_STRUCTURE_TRACE_CURSOR_AUTO_V1",
    "material_digest_ledger_ready": "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1",
    "digest_state_visible": "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1",
    "mixed_question_quality": "TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1",
    "single_source_preserved": "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1",
    "beautiful_output_preserved": CARD_OUTPUT_STYLE_TUNE,
}

AXIS_ORDER = (
    "khs_root_fixed",
    "fractal_law_kernel_ready",
    "mythogenesis_mapper_ready",
    "mapping_layer_ready",
    "truth_structure_reasoning_ready",
    "material_digest_ledger_ready",
    "digest_state_visible",
    "mixed_question_quality",
    "single_source_preserved",
    "beautiful_output_preserved",
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


def _file_ok(api: Path, rel: str) -> bool:
    return (api / rel).is_file()


def _axis_from_code(api: Path) -> dict[str, bool]:
    return {
        "khs_root_fixed": _file_ok(api, "src/core/khsRootFractalConstitutionV1.ts"),
        "fractal_law_kernel_ready": _file_ok(api, "src/core/tenmonFractalLawKernelV1.ts"),
        "mythogenesis_mapper_ready": _file_ok(api, "src/core/tenmonKojikiMythogenesisMapperV1.ts"),
        "mapping_layer_ready": _file_ok(api, "src/core/tenmonMappingLayerV1.ts"),
        "truth_structure_reasoning_ready": _file_ok(api, "src/core/tenmonTruthStructureReasonerV1.ts"),
        "beautiful_output_preserved": _file_ok(api, "src/core/tenmonBeautifulOutputRefinerV1.ts"),
    }


def _axis_digest_ledger(auto: Path) -> bool:
    """ledger ファイル・件数・digest_conditions（material_digest_ledger_ready）。"""
    p = auto / "tenmon_material_digest_ledger_v1.json"
    d = _read_json(p)
    mats = d.get("materials")
    conds = d.get("digest_conditions")
    cond_ok = isinstance(conds, list) and len(conds) >= 1
    return (
        isinstance(mats, list)
        and len(mats) >= 10
        and d.get("card", "").startswith("TENMON_KHS_DIGEST")
        and cond_ok
    )


def _axis_digest_state_visible(auto: Path) -> bool:
    """
    ledger の digest 可視化条件（fail-closed）:
    digest_states_visible・undigested 配列・digest_trace ブロック必須。
    digestLedgerTraceNeeded / digestStateVisibleTuneNeeded がいずれも false のときのみ green。
    """
    if not _axis_digest_ledger(auto):
        return False
    d = _read_json(auto / "tenmon_material_digest_ledger_v1.json")
    if d.get("digest_states_visible") is not True:
        return False
    if not isinstance(d.get("undigested"), list):
        return False
    dt = d.get("digest_trace")
    if not isinstance(dt, dict):
        return False
    if bool(dt.get("digestLedgerTraceNeeded")):
        return False
    if bool(dt.get("digestStateVisibleTuneNeeded")):
        return False
    return True


def _axis_mixed_question(fp: dict[str, Any], stale: bool) -> bool:
    """
    mixed question 品質 + root reasoning 系 routing。
    fresh_probe_digest.general_probe: satisfied ∧ meta_leak_ok。
    plain NATURAL_GENERAL_LLM_TOP のみは fail-closed（一般 LLM 直出しは root reasoning 扱いにしない）。
    """
    if stale or not fp:
        return False
    gen = fp.get("general_probe") if isinstance(fp.get("general_probe"), dict) else {}
    if not (bool(gen.get("satisfied")) and bool(gen.get("meta_leak_ok"))):
        return False
    rr = str(gen.get("route") or "").strip()
    if rr in ("NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1"):
        return False
    return True


def _axis_single_source(final_seal: dict[str, Any]) -> bool:
    return bool(final_seal.get("single_source_ok"))


def _repo_worktree_clean(repo: Path) -> bool:
    """git status --porcelain が空なら clean（converged 前提の fail-closed）。"""
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
        )
        if r.returncode != 0:
            return False
        return (r.stdout or "").strip() == ""
    except Exception:
        return False


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    sc_run = _run_scorecard(auto, api)
    sc = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    rj = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    final_seal = _read_json(auto / "tenmon_final_operable_seal.json")

    stale = bool(rj.get("stale_sources_present"))
    fp = rj.get("fresh_probe_digest") if isinstance(rj.get("fresh_probe_digest"), dict) else {}
    if stale:
        fp = {}

    worktree_clean = _repo_worktree_clean(repo)

    code_axes = _axis_from_code(api)
    axes: dict[str, bool] = {
        **code_axes,
        "material_digest_ledger_ready": _axis_digest_ledger(auto),
        "digest_state_visible": _axis_digest_state_visible(auto),
        "mixed_question_quality": _axis_mixed_question(fp, stale),
        "single_source_preserved": _axis_single_source(final_seal),
    }

    failed = [k for k in AXIS_ORDER if not axes.get(k)]
    n_fail = len(failed)

    rec_next = str(sc.get("recommended_next_card") or sc.get("next_best_card") or "").strip() or None
    rj_next = str(rj.get("recommended_next_card") or "").strip() or None
    if rj_next:
        rec_next = rj_next

    wc_sc = bool(sc.get("worldclass_ready"))
    reg = bool(sc.get("signals", {}).get("regression_detected")) if isinstance(sc.get("signals"), dict) else True

    case = "C"
    primary_gap: str | None = "multi_axis"
    next_card_if_fail: str | None = rec_next or "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1"
    axis_gap_target: str | None = None
    axis_specific_next_card: str | None = None

    # 優先: worktree → stale → 軸数分岐（final seal 前に dirty / stale を再注入しない）
    if not worktree_clean:
        case = "C"
        primary_gap = "worktree_not_converged"
        next_card_if_fail = CARD_WORKTREE_CONVERGENCE
    elif stale:
        case = "C"
        primary_gap = "stale_evidence"
        next_card_if_fail = CARD_STALE_FORENSIC
    elif n_fail == 0:
        case = "A"
        primary_gap = None
        next_card_if_fail = None
    elif n_fail == 1:
        case = "B"
        fa = failed[0]
        primary_gap = fa
        axis_gap_target = fa
        # 61007: 欠け 1 軸のみは AXIS_NEXT_CARD（軸別 trace）
        next_card_if_fail = AXIS_NEXT_CARD.get(fa) or rec_next
        axis_specific_next_card = next_card_if_fail
    else:
        case = "C"
        primary_gap = "multi_axis"
        next_card_if_fail = rec_next or CARD_AUTONOMY_BRIDGE

    all_axes_ok = n_fail == 0 and not stale and not reg and worktree_clean
    ok = bool(all_axes_ok and wc_sc)

    if case != "A" and ok:
        ok = False

    ts = _utc()
    summary = {
        "ok": ok,
        "card": CARD,
        "khs_root_fixed": bool(axes["khs_root_fixed"]),
        "fractal_law_kernel_ready": bool(axes["fractal_law_kernel_ready"]),
        "mythogenesis_mapper_ready": bool(axes["mythogenesis_mapper_ready"]),
        "mapping_layer_ready": bool(axes["mapping_layer_ready"]),
        "truth_structure_reasoning_ready": bool(axes["truth_structure_reasoning_ready"]),
        "material_digest_ledger_ready": bool(axes["material_digest_ledger_ready"]),
        "digest_state_visible": bool(axes["digest_state_visible"]),
        "mixed_question_quality": bool(axes["mixed_question_quality"]),
        "single_source_preserved": bool(axes["single_source_preserved"]),
        "beautiful_output_preserved": bool(axes["beautiful_output_preserved"]),
        "worldclass_fractal_truth_ready": ok,
        "worldclass_truth_output_ready": ok,
        "worktree_converged": worktree_clean,
        "rollback_used": False,
        "next_card_if_fail": None if ok else next_card_if_fail,
    }

    out: dict[str, Any] = {
        **summary,
        "generated_at": ts,
        "case": case,
        "primary_gap": primary_gap,
        "axis_gap_target": axis_gap_target,
        "axis_specific_next_card": axis_specific_next_card,
        "failed_axes": failed,
        "axes": {k: axes[k] for k in AXIS_ORDER},
        "stale_sources_present": stale,
        "scorecard_worldclass_ready": wc_sc,
        "regression_detected": reg,
        "integration_cards": {
            "single_axis_repair": CARD_SINGLE_AXIS_REPAIR,
            "stale_blocker_forensic": CARD_STALE_FORENSIC,
            "output_style_tune": CARD_OUTPUT_STYLE_TUNE,
            "worktree_convergence_and_seal": CARD_WORKTREE_CONVERGENCE,
            "autonomy_bridge": CARD_AUTONOMY_BRIDGE,
        },
        "steps": {"tenmon_worldclass_acceptance_scorecard_v1": sc_run},
        "inputs": {
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "digest_ledger": str(auto / "tenmon_material_digest_ledger_v1.json"),
            "core_glob": str(api / "src/core"),
            "repo_root": str(repo),
        },
        "notes": [
            "コード軸は api/src/core の該当ファイル存在で green。",
            "mixed_question_quality は fresh_probe_digest.general_probe: satisfied ∧ meta_leak_ok ∧ route が NATURAL_GENERAL_LLM_TOP 系でない（root reasoning 直結）。",
            "material_digest_ledger_ready: ledger の materials>=10・digest_conditions 非空・card 接頭辞。",
            "digest_state_visible: digest_states_visible・undigested・digest_trace 必須。digestLedgerTraceNeeded と digestStateVisibleTuneNeeded がともに false。",
            "worktree_converged: git status --porcelain が空。dirty なら CASE C で worktree convergence を先に。",
            "CASE A: 全10軸 green かつ worktree clean かつ not stale かつ not regression かつ worldclass_ready。",
            "CASE B: 欠け 1 軸のみ → next_card_if_fail は AXIS_NEXT_CARD（軸別 trace）。",
            "CASE C: 2 軸以上または stale または worktree dirty → 停止。stale は forensic、multi は autonomy_bridge または scorecard 推奨。",
            "worldclass_ready が false なら ok は false。worldclass_truth_output_ready は ok と同値。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **ok**: `{ok}`",
        f"- **case**: `{case}`",
        f"- **worktree_converged**: `{summary.get('worktree_converged')}`",
        f"- **primary_gap**: `{primary_gap}`",
        f"- **next_card_if_fail**: `{out['next_card_if_fail']}`",
        f"- **axis_specific_next_card** (CASE B): `{axis_specific_next_card}`",
        "",
        "## axes",
        "",
        json.dumps(out["axes"], ensure_ascii=False, indent=2),
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
