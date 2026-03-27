#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_HUMAN_CONVERSATION_WORLDCLASS_SEAL_CURSOR_AUTO_V1

人生相談・人間関係・生活相談レーン（いろは × 断捨離 bridge）を静的証拠で採点する。
fail-closed: 欠損・stale・build 失敗は軸を落とす。

CASE A: 全 10 軸 + build OK → seal（ok=true）
CASE B: ちょうど 1 軸不足 → next_card_if_fail に最小補修カード（本スクリプトは改変しない）
CASE C: 2 軸以上不足、または stale、または build 失敗 → 停止
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_HUMAN_CONVERSATION_WORLDCLASS_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_human_conversation_worldclass_seal_cursor_auto_v1.json"
OUT_MD = "tenmon_human_conversation_worldclass_seal_cursor_auto_v1.md"

AXIS_KEYS = (
    "iroha_life_kernel_ready",
    "danshari_life_kernel_ready",
    "human_counseling_bridge_ready",
    "life_consulting_density",
    "relationship_consulting_quality",
    "life_order_quality",
    "center_claim_clarity",
    "next_step_clarity",
    "single_source_preserved",
    "beautiful_output_preserved",
)

# 1 軸のみ不足時の最小補修カード（broad rewrite 禁止・別工程で実行）
AXIS_NEXT_CARD: dict[str, str] = {
    "iroha_life_kernel_ready": "TENMON_IROHA_LIFE_COUNSELING_KERNEL_TRACE_CURSOR_AUTO_V1",
    "danshari_life_kernel_ready": "TENMON_DANSHARI_LIFE_ORDER_KERNEL_TRACE_CURSOR_AUTO_V1",
    "human_counseling_bridge_ready": "TENMON_IROHA_DANSHARI_COUNSELING_TRACE_CURSOR_AUTO_V1",
    "life_consulting_density": "TENMON_TRUTH_REASONING_DENSITY_TRACE_CURSOR_AUTO_V1",
    "relationship_consulting_quality": "TENMON_IROHA_DANSHARI_COUNSELING_TRACE_CURSOR_AUTO_V1",
    "life_order_quality": "TENMON_DANSHARI_LIFE_ORDER_KERNEL_TRACE_CURSOR_AUTO_V1",
    "center_claim_clarity": "TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1",
    "next_step_clarity": "TENMON_TRUTH_REASONING_DENSITY_TUNE_CURSOR_AUTO_V1",
    "single_source_preserved": "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1",
    "beautiful_output_preserved": "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1",
}


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _read_text(path: Path) -> str:
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def _run_build(api: Path) -> dict[str, Any]:
    r = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
    )
    return {
        "exit_code": r.returncode,
        "stdout_tail": (r.stdout or "")[-2500:],
        "stderr_tail": (r.stderr or "")[-1500:],
    }


def _axis_eval(
    core: Path,
    binder: Path,
    style: Path,
    final_seal: dict[str, Any],
    truth_tune: dict[str, Any],
    stale: bool,
) -> dict[str, bool]:
    """stale 時は証拠を信頼しないため全 False（CASE C）。"""
    if stale:
        return {k: False for k in AXIS_KEYS}

    iroha = _read_text(core / "tenmonIrohaLifeCounselingKernelV1.ts")
    danshari = _read_text(core / "tenmonDanshariLifeOrderKernelV1.ts")
    bridge = _read_text(core / "tenmonIrohaDanshariCounselingBridgeV1.ts")
    bind = _read_text(binder)
    sty = _read_text(style)

    iroha_life_kernel_ready = bool(
        len(iroha) >= 400
        and "resolveIrohaLifeCounselingKernelV1" in iroha
        and "TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1" in iroha
        and "irohaCenterHint" in iroha
        and "仕事と家庭" in iroha
        and "離婚" in iroha
    )

    danshari_life_kernel_ready = bool(
        len(danshari) >= 400
        and "resolveDanshariLifeOrderKernelV1" in danshari
        and "TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1" in danshari
        and "lifeOrderSurfaceHint" in danshari
        and "relation_sorting" in danshari
        and "life_space_recovery" in danshari
    )

    human_counseling_bridge_ready = bool(
        len(bridge) >= 200
        and "buildIrohaDanshariCounselingBridgeV1" in bridge
        and "combinedSurfaceHint" in bridge
        and "humanCounselingBridgeReady" in bridge
        and "irohaDanshariCounselingBridgeV1" in bind
        and "buildIrohaDanshariCounselingBridgeV1" in bind
    )

    # 5 要素を combined に接続（密度・構造）
    life_consulting_density = bool(
        re.search(r"combinedSurfaceHint\s*=\s*`[^`]*lifeCenterHint[^`]*`", bridge, re.DOTALL)
        or (
            "lifeCenterHint" in bridge
            and "roleAcceptanceHint" in bridge
            and "releaseHint" in bridge
            and "nextRepairStep" in bridge
        )
    )

    relationship_consulting_quality = bool(
        ("親" in iroha and "関係" in iroha)
        or ("離婚" in iroha and "人間関係" in danshari)
        or ("relation_sorting" in danshari and "人間関係" in danshari)
    )

    life_order_quality = bool(
        "priorityRepairHint" in danshari
        and "boundaryResetHint" in danshari
        and "pickAxis" in danshari
    )

    center_claim_clarity = bool(
        "truthStructureCenterClaimHint" in sty
        and "irohaDanshariCounselingBridgeV1" in sty
        and "combinedSurfaceHint" in sty
    )

    next_step_clarity = bool(
        ("truthStructureNextAxisHint" in sty or "truthStructureRepairAxis" in sty)
        and "nextAxisHint" in sty
    )

    single_source_preserved = bool(final_seal.get("single_source_ok") is True)

    truth_ok = truth_tune.get("ok") is True if truth_tune else True
    life_tune = truth_tune.get("life_consulting_ok") is True if truth_tune else True
    beautiful_output_preserved = bool(
        "stripMetaLeakFromHint" in sty and truth_ok and life_tune
    )

    return {
        "iroha_life_kernel_ready": iroha_life_kernel_ready,
        "danshari_life_kernel_ready": danshari_life_kernel_ready,
        "human_counseling_bridge_ready": human_counseling_bridge_ready,
        "life_consulting_density": life_consulting_density,
        "relationship_consulting_quality": relationship_consulting_quality,
        "life_order_quality": life_order_quality,
        "center_claim_clarity": center_claim_clarity,
        "next_step_clarity": next_step_clarity,
        "single_source_preserved": single_source_preserved,
        "beautiful_output_preserved": beautiful_output_preserved,
    }


def _failed_axes(axes: dict[str, bool]) -> list[str]:
    return [k for k in AXIS_KEYS if not axes.get(k)]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    core = api / "src" / "core"
    binder = api / "src" / "core" / "knowledgeBinder.ts"
    style = api / "src" / "core" / "tenmonKnowledgeStyleBridgeV1.ts"
    auto.mkdir(parents=True, exist_ok=True)

    final_seal = _read_json(auto / "tenmon_final_operable_seal.json")
    rj = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    truth_tune = _read_json(auto / "tenmon_truth_reasoning_density_tune_cursor_auto_v1.json")

    stale = bool(rj.get("stale_sources_present"))

    axes = _axis_eval(core, binder, style, final_seal, truth_tune, stale)
    failed = _failed_axes(axes)
    n_fail = len(failed)

    build_run = _run_build(api)
    build_ok = build_run["exit_code"] == 0

    case = "C"
    primary_gap: str | None = "multi_axis"
    next_card_if_fail: str | None = "TENMON_HUMAN_CONVERSATION_WORLDCLASS_TRACE_CURSOR_AUTO_V1"

    if stale:
        case = "C"
        primary_gap = "stale_evidence"
        next_card_if_fail = str(rj.get("recommended_next_card") or "").strip() or next_card_if_fail
    elif not build_ok:
        case = "C"
        primary_gap = "build_failed"
        next_card_if_fail = "TENMON_HUMAN_CONVERSATION_WORLDCLASS_TRACE_CURSOR_AUTO_V1"
    elif n_fail == 0:
        case = "A"
        primary_gap = None
        next_card_if_fail = None
    elif n_fail == 1:
        case = "B"
        fa = failed[0]
        primary_gap = fa
        next_card_if_fail = AXIS_NEXT_CARD.get(fa) or next_card_if_fail
    else:
        case = "C"
        primary_gap = "multi_axis"
        next_card_if_fail = "TENMON_HUMAN_CONVERSATION_WORLDCLASS_TRACE_CURSOR_AUTO_V1"

    # 派生 worldclass フラグ（系統別）
    life_consulting_worldclass_ready = bool(
        axes["iroha_life_kernel_ready"]
        and axes["human_counseling_bridge_ready"]
        and axes["life_consulting_density"]
        and axes["center_claim_clarity"]
        and axes["next_step_clarity"]
    )
    relationship_consulting_worldclass_ready = bool(
        axes["relationship_consulting_quality"]
        and axes["human_counseling_bridge_ready"]
        and axes["center_claim_clarity"]
    )
    life_order_worldclass_ready = bool(
        axes["danshari_life_kernel_ready"]
        and axes["life_order_quality"]
        and axes["human_counseling_bridge_ready"]
    )

    all_axes_ok = n_fail == 0 and not stale and build_ok
    ok = bool(
        all_axes_ok
        and life_consulting_worldclass_ready
        and relationship_consulting_worldclass_ready
        and life_order_worldclass_ready
    )

    ts = _utc()
    summary = {
        "ok": ok,
        "card": CARD,
        "iroha_life_kernel_ready": axes["iroha_life_kernel_ready"],
        "danshari_life_kernel_ready": axes["danshari_life_kernel_ready"],
        "human_counseling_bridge_ready": axes["human_counseling_bridge_ready"],
        "life_consulting_worldclass_ready": life_consulting_worldclass_ready,
        "relationship_consulting_worldclass_ready": relationship_consulting_worldclass_ready,
        "life_order_worldclass_ready": life_order_worldclass_ready,
        "single_source_preserved": axes["single_source_preserved"],
        "beautiful_output_preserved": axes["beautiful_output_preserved"],
        "rollback_used": False,
        "next_card_if_fail": None if ok else next_card_if_fail,
    }

    out: dict[str, Any] = {
        **summary,
        "generated_at": ts,
        "case": case,
        "primary_gap": primary_gap,
        "failed_axes": failed,
        "axes": axes,
        "build_ok": build_ok,
        "stale_sources_present": stale,
        "steps": {"npm_run_build": build_run},
        "inputs": {
            "final_operable_seal": str(auto / "tenmon_final_operable_seal.json"),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "truth_reasoning_density_tune": str(auto / "tenmon_truth_reasoning_density_tune_cursor_auto_v1.json"),
            "core": str(core),
        },
        "notes": [
            "10 軸は src/core の静的検査 + final_operable_seal + truth_reasoning_density_tune（存在時）。",
            "stale_sources_present 時は証拠を破棄し全軸 False。",
            "CASE B は next_card のみ提示（コード自動改変なし）。",
            "audit / restart / probe は運用スクリプト側で別途 PASS を確認すること。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        "## 目的",
        "",
        "いろは（人生理解）と断捨離（生活実装）が counseling bridge 経由で会話へ循環し、",
        "single-source / 美文出力を壊さない前提で worldclass seal 可能かを静的採点する。",
        "",
        "## 採点軸（10）",
        "",
        ", ".join(AXIS_KEYS),
        "",
        "## CASE",
        "",
        "- **A**: 全軸 OK + build OK → seal",
        "- **B**: 1 軸のみ不足 → `next_card_if_fail` に最小補修カード（本スクリプトはコード改変しない）",
        "- **C**: 多軸不足 / stale / build 失敗 → 停止",
        "",
        "---",
        "",
        f"- generated_at: `{ts}`",
        f"- **ok**: `{ok}`",
        f"- **case**: `{case}`",
        f"- **build_ok**: `{build_ok}`",
        f"- **stale_sources_present**: `{stale}`",
        f"- **next_card_if_fail**: `{out['next_card_if_fail']}`",
        "",
        "## summary",
        "",
        json.dumps(summary, ensure_ascii=False, indent=2),
        "",
        "## axes",
        "",
        json.dumps(axes, ensure_ascii=False, indent=2),
        "",
        "## failed_axes",
        "",
        ", ".join(failed) if failed else "(none)",
    ]
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
