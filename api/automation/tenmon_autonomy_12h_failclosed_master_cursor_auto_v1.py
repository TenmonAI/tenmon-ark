#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_12H_FAILCLOSED_MASTER_CURSOR_AUTO_V1

約 12 時間または 24 ループの早い方まで、観測→検証を繰り返す（コード編集・chat.ts の雑置換は行わない）。

優先度（仕様 P0→P5、実装は会話コア→autonomy の順で一本化）:
  P0 MODULE A: route / scripture / selfaware / continuity / mixed（2h 由来の HTTP probe）
  P1 MODULE B: truth reasoning（静的 JSON + truth tune 観測）
  P2 MODULE C: KHS / fractal / kojiki / mapping / digest / fractal truth seal（静的観測）
  P3 MODULE D: beautiful（truth + human seal から派生）
  P4 MODULE E: planner / queue / execution_gate / supervisor / mac（既存 autonomy スクリプト dry-run）
  P5 MODULE F: operable seal / worktree（tenmon_final_operable_seal.json 等）

各ループの記録（api/automation/autonomy_12h_failclosed_master_v1/<run_id>/）:
  loop_<N>_state.json, loop_<N>_primary_gap.json, loop_<N>_probe_summary.json,
  loop_<N>_result.json, loop_<N>_autonomy_readiness.json, loop_<N>_autonomy_state.json（同一内容）,
  loop_<N>_next_card_if_fail.md

共通ゲート（ループ内）: 任意 npm run build → health/audit/audit.build → 会話 probe（スキップ可）→
  worldclass/seal スクリプト → autonomy 各スクリプト。worldclass が 2 軸以上欠損なら修理停止（2h と同型）。

MODULE A の具体 probe は tenmon_conversation_pdca_2h_failclosed_autoloop と同型（水火の法則・言霊/定義・continuity 等）。
仕様の「truth_reasoning_density → khs_root → … → final_seal」順の**自動修理は行わない**（1 ループ 1 主因の next_card のみ。間に人間/別カードで修正後に再実行）。

環境変数（主）:
  TENMON_REPO_ROOT
  TENMON_PDCA_BASE / TENMON_GATE_BASE   既定 http://127.0.0.1:3000
  TENMON_12H_MASTER_MAX_LOOPS           既定 24
  TENMON_12H_MASTER_MAX_SEC             既定 43200（12h）
  TENMON_12H_LOOP_SLEEP_SEC             ループ間スリープ秒（既定 0、上限 3600）
  TENMON_PDCA_SKIP_PROBES               1 で HTTP probe スキップ
  TENMON_PDCA_RUN_BUILD                 1 で各ループ先頭に npm run build
  TENMON_PDCA_SKIP_BUILD                1 で build スキップ（既定 1）
  TENMON_12H_MASTER_RESTART             1 で各内周先頭に sudo systemctl restart tenmon-ark-api.service
  TENMON_12H_OK_REQUIRE_EXPANSION       1 で最終 ok に truth tune / mixed 条件を追加
  TENMON_12H_CURSOR_OPERATOR_BRIDGE     1 で各ループ先頭に tenmon_cursor_operator_autonomy_bridge_v1.py を実行し loop_<N>/loop_cursor_operator_bridge.json を残す
  TENMON_12H_CURSOR_OPERATOR_BRIDGE_APPLY  1 で bridge に --apply（result bundle 更新）
  TENMON_12H_PILOT_MAX_LOOPS            1 または 2 のとき、ループ上限をそれに抑える（安全パイロット用）
  TENMON_MAC_OPERATOR_READINESS_NON_MAC_OK  非 Mac で mac readiness 緩和（2h と同様）
  TENMON_AUTONOMY_12H_CARD              出力 card 名の上書き（ラッパー用）
  TENMON_AUTONOMY_12H_OUT_JSON          出力 JSON ファイル名（api/automation 直下）
  TENMON_12H_RUN_DIR_NAME               ラン保存ディレクトリ名（api/automation/<name>/<run_id>/）

出力: api/automation/tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json（上記 OUT_JSON で変更可）
  （ok, elapsed_mode, loops_completed, conversation_core_completed, truth_reasoning_density_ready,
   knowledge_circulation_connected, khs_root_fixed, fractal_law_kernel_ready, mythogenesis_mapper_ready,
   mapping_layer_ready, digest_ledger_ready, fractal_truth_worldclass_ready, beautiful_output_ready,
   planner/queue/execution_gate/rollback/forensic/cursor/mac_*_ready, worktree_converged, final_sealed, …）
"""
from __future__ import annotations

import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from tenmon_autonomy_2h_master_pdca_failclosed_cursor_auto_v1 import (
    SCRIPTS,
    _git_diff_stat,
    _merge_autonomy_readiness_for_loop,
    _next_card_for_phase,
    _subpy_stdout_json,
    _write_loop_run_artifacts,
)
from tenmon_conversation_pdca_2h_failclosed_autoloop_cursor_auto_v1 import (
    _gates,
    _loop1_probes,
    _loop2_probes,
    _loop3_probes,
    _loop4_score,
    _loop5_seal,
    _run_npm_build,
    _utc,
    _write_json,
)

_CARD_DEFAULT = "TENMON_AUTONOMY_12H_FAILCLOSED_MASTER_CURSOR_AUTO_V1"
_RUN_DIR_DEFAULT = "autonomy_12h_failclosed_master_v1"
_OUT_FINAL_DEFAULT = "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"


def _resolve_card() -> str:
    return (os.environ.get("TENMON_AUTONOMY_12H_CARD") or _CARD_DEFAULT).strip() or _CARD_DEFAULT


def _resolve_out_final() -> str:
    return (os.environ.get("TENMON_AUTONOMY_12H_OUT_JSON") or _OUT_FINAL_DEFAULT).strip() or _OUT_FINAL_DEFAULT


def _resolve_run_dir_name() -> str:
    return (os.environ.get("TENMON_12H_RUN_DIR_NAME") or _RUN_DIR_DEFAULT).strip() or _RUN_DIR_DEFAULT


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _maybe_systemd_restart() -> dict[str, Any]:
    if os.environ.get("TENMON_12H_MASTER_RESTART", "").strip() not in ("1", "true", "yes"):
        return {"skipped": True}
    try:
        r = subprocess.run(
            ["sudo", "-n", "systemctl", "restart", "tenmon-ark-api.service"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        return {"ok": r.returncode == 0, "exit_code": r.returncode, "stderr_tail": (r.stderr or "")[-800:]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _expansion_observation_flags(auto: Path) -> dict[str, Any]:
    """静的 JSON / ファイル存在のみ（編集なし）。fail-closed で欠損は False。"""
    truth = _read_json(auto / "tenmon_truth_reasoning_density_tune_cursor_auto_v1.json")
    human = _read_json(auto / "tenmon_human_conversation_worldclass_seal_cursor_auto_v1.json")
    fractal_seal = _read_json(auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json")
    kcirc = _read_json(auto / "tenmon_knowledge_circulation_worldclass_output_seal_cursor_auto_v1.json")
    digest = _read_json(auto / "tenmon_material_digest_ledger_v1.json")
    if not digest:
        digest = _read_json(auto / "tenmon_material_digest_ledger_cursor_auto_v1.json")
    core = Path(auto.parent / "src" / "core")
    khs_ts = core / "khsRootFractalConstitutionV1.ts"
    law_ts = core / "tenmonFractalLawKernelV1.ts"
    kojiki_ts = core / "tenmonKojikiMythogenesisMapperV1.ts"
    map_ts = core / "tenmonMappingLayerV1.ts"

    return {
        "truth_reasoning_density_ready": bool(truth.get("ok") is True and truth.get("truth_reasoning_density_ready") is not False),
        "life_consulting_ok": bool(truth.get("life_consulting_ok") is True),
        "tech_consulting_ok": bool(truth.get("tech_consulting_ok") is True),
        "mixed_question_still_ok": bool(truth.get("mixed_question_still_ok") is True),
        "knowledge_circulation_connected": bool(kcirc.get("ok") is True or kcirc.get("worldclass_output_ready") is True),
        "khs_root_fixed": khs_ts.is_file() and len(khs_ts.read_text(encoding="utf-8", errors="replace")) > 80,
        "fractal_law_kernel_ready": law_ts.is_file(),
        "mythogenesis_mapper_ready": kojiki_ts.is_file(),
        "mapping_layer_ready": map_ts.is_file(),
        "digest_ledger_ready": bool(digest.get("card") or digest.get("digest_states_visible") is not None),
        "fractal_truth_worldclass_ready": bool(fractal_seal.get("ok") is True),
        "human_conversation_seal_ok": bool(human.get("ok") is True),
    }


def _write_12h_loop_extras(
    *,
    card: str,
    out_dir: Path,
    loop: int,
    gates: dict[str, Any],
    build_info: dict[str, Any] | None,
    restart_info: dict[str, Any],
    repo: Path,
    primary_fail_phase: str | None,
    next_card_if_fail: str | None,
    passed: bool,
    expansion: dict[str, Any],
    t_elapsed: float,
) -> None:
    ts = _utc()
    st = {
        "loop": loop,
        "generated_at": ts,
        "card": card,
        "elapsed_sec_rounded": round(t_elapsed, 2),
        "gates": gates,
        "build": build_info,
        "systemd_restart": restart_info,
        "git_diff_stat": _git_diff_stat(repo),
        "expansion_observation": expansion,
    }
    _write_json(out_dir / f"loop_{loop}_state.json", st)
    _write_json(
        out_dir / f"loop_{loop}_primary_gap.json",
        {
            "loop": loop,
            "generated_at": ts,
            "primary_gap": primary_fail_phase,
            "next_card_if_fail": next_card_if_fail,
            "pass": passed,
        },
    )
    ar_path = out_dir / f"loop_{loop}_autonomy_readiness.json"
    st_path = out_dir / f"loop_{loop}_autonomy_state.json"
    if ar_path.is_file():
        try:
            st_path.write_text(ar_path.read_text(encoding="utf-8"), encoding="utf-8")
        except OSError:
            pass


def _run_one_inner_cycle(
    *,
    loop: int,
    repo: Path,
    api: Path,
    auto: Path,
    base: str,
    skip_probes: bool,
    skip_build: bool,
    run_build: bool,
    env_base: dict[str, str],
) -> dict[str, Any]:
    """2h master と同順の 1 周。失敗時も dict を返す（外側ループが継続）。"""
    phase_result: dict[str, Any] = {}
    passed = False
    gates: dict[str, Any] = {}
    build_info: dict[str, Any] | None = None
    rollback_used = False
    next_card_if_fail: str | None = None
    primary_fail_phase: str | None = None

    flags: dict[str, bool] = {
        "route_sovereignty_fixed": False,
        "selfaware_family_ok": False,
        "surface_contract_ok": False,
        "worldclass_ready": False,
        "single_source_sealed": False,
        "planner_ready": False,
        "queue_ready": False,
        "execution_gate_ready": False,
        "rollback_ready": False,
        "cursor_operator_ready": False,
        "mac_operator_ready": False,
    }

    restart_info = _maybe_systemd_restart()

    try:
        if run_build and not skip_build:
            build_info = _run_npm_build(api)
            if not build_info.get("ok"):
                rollback_used = True
                next_card_if_fail = "TENMON_CONVERSATION_PDCA_2H_FAILCLOSED_AUTOLOOP_RETRY_CURSOR_AUTO_V1"
                primary_fail_phase = "build"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": {"build": build_info},
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

        if skip_probes:
            gates = {"ok": True, "skipped": True, "note": "TENMON_PDCA_SKIP_PROBES"}
        else:
            gates = _gates(base)
        if not gates.get("ok"):
            rollback_used = True
            next_card_if_fail = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
            primary_fail_phase = "gates"
            return {
                "passed": False,
                "gates": gates,
                "phase_result": phase_result,
                "flags": flags,
                "next_card_if_fail": next_card_if_fail,
                "primary_fail_phase": primary_fail_phase,
                "rollback_used": rollback_used,
                "build_info": build_info,
                "restart_info": restart_info,
            }

        ts = str(int(time.time()))

        if skip_probes:
            phase_result["skip_probes"] = True
            sk = {"skipped": True, "pass": True, "note": "TENMON_PDCA_SKIP_PROBES"}
            phase_result["route"] = sk.copy()
            phase_result["selfaware"] = sk.copy()
            phase_result["surface"] = sk.copy()
            phase_result["worldclass"] = sk.copy()
            phase_result["seal"] = sk.copy()
            flags["route_sovereignty_fixed"] = True
            flags["selfaware_family_ok"] = True
            flags["surface_contract_ok"] = True
            flags["worldclass_ready"] = True
            flags["single_source_sealed"] = True
        else:
            pr = _loop1_probes(base, ts)
            if not pr.get("pass"):
                pr_retry = _loop1_probes(base, ts + "_r")
                pr["retry"] = pr_retry
                passed = bool(pr_retry.get("pass"))
            else:
                passed = True
            phase_result["route"] = pr
            flags["route_sovereignty_fixed"] = passed
            if not passed:
                next_card_if_fail = _next_card_for_phase("route")
                primary_fail_phase = "route"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

            p2 = _loop2_probes(base, ts)
            phase_result["selfaware"] = p2
            passed = bool(p2.get("pass"))
            flags["selfaware_family_ok"] = passed
            if not passed:
                next_card_if_fail = _next_card_for_phase("selfaware")
                primary_fail_phase = "selfaware"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

            p3 = _loop3_probes(base, ts)
            phase_result["surface"] = p3
            passed = bool(p3.get("pass"))
            flags["surface_contract_ok"] = passed
            if not passed:
                next_card_if_fail = _next_card_for_phase("surface")
                primary_fail_phase = "surface"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

            p4 = _loop4_score(auto, api)
            phase_result["worldclass"] = p4
            sj = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json")
            failed_axes = sj.get("failed_axes") if isinstance(sj.get("failed_axes"), list) else []
            if len(failed_axes) >= 2:
                passed = False
                phase_result["worldclass"] = {**p4, "repair_stop": "two_or_more_axes_missing"}
                next_card_if_fail = _next_card_for_phase("worldclass")
                primary_fail_phase = "worldclass"
                flags["worldclass_ready"] = False
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }
            passed = bool(p4.get("pass"))
            flags["worldclass_ready"] = bool(sj.get("worldclass_ready") and sj.get("ok"))
            if not passed:
                next_card_if_fail = _next_card_for_phase("worldclass")
                primary_fail_phase = "worldclass"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

            p5 = _loop5_seal(auto, api)
            phase_result["seal"] = p5
            passed = bool(p5.get("pass"))
            flags["single_source_sealed"] = passed
            if not passed:
                next_card_if_fail = _next_card_for_phase("seal")
                primary_fail_phase = "seal"
                return {
                    "passed": False,
                    "gates": gates,
                    "phase_result": phase_result,
                    "flags": flags,
                    "next_card_if_fail": next_card_if_fail,
                    "primary_fail_phase": primary_fail_phase,
                    "rollback_used": rollback_used,
                    "build_info": build_info,
                    "restart_info": restart_info,
                }

        rc, pj = _subpy_stdout_json(auto, api, SCRIPTS["planner"], ["--dry-run"], env_base)
        phase_result["planner"] = {"exit_code": rc, "json": pj}
        flags["planner_ready"] = bool(pj.get("planner_ready") is True)
        flags["queue_ready"] = bool(pj.get("queue_ready") is True)
        if rc != 0 or not flags["planner_ready"] or not flags["queue_ready"]:
            passed = False
            next_card_if_fail = _next_card_for_phase("planner")
            primary_fail_phase = "planner"
            return {
                "passed": False,
                "gates": gates,
                "phase_result": phase_result,
                "flags": flags,
                "next_card_if_fail": next_card_if_fail,
                "primary_fail_phase": primary_fail_phase,
                "rollback_used": rollback_used,
                "build_info": build_info,
                "restart_info": restart_info,
            }

        rc, ej = _subpy_stdout_json(auto, api, SCRIPTS["execution_gate"], ["--dry-run"], env_base)
        phase_result["execution_gate"] = {"exit_code": rc, "json": ej}
        flags["execution_gate_ready"] = bool(ej.get("execution_gate_ready") is True)
        if rc != 0 or not flags["execution_gate_ready"]:
            passed = False
            next_card_if_fail = _next_card_for_phase("execution_gate")
            primary_fail_phase = "execution_gate"
            return {
                "passed": False,
                "gates": gates,
                "phase_result": phase_result,
                "flags": flags,
                "next_card_if_fail": next_card_if_fail,
                "primary_fail_phase": primary_fail_phase,
                "rollback_used": rollback_used,
                "build_info": build_info,
                "restart_info": restart_info,
            }

        rc, sjf = _subpy_stdout_json(auto, api, SCRIPTS["supervisor"], ["--dry-run"], env_base)
        phase_result["supervisor"] = {"exit_code": rc, "json": sjf}
        flags["rollback_ready"] = bool(sjf.get("rollback_ready") is True)
        if sjf.get("rollback_used") is True:
            rollback_used = True
        if rc != 0 or not bool(sjf.get("ok") is True):
            passed = False
            next_card_if_fail = _next_card_for_phase("supervisor")
            primary_fail_phase = "supervisor"
            return {
                "passed": False,
                "gates": gates,
                "phase_result": phase_result,
                "flags": flags,
                "next_card_if_fail": next_card_if_fail,
                "primary_fail_phase": primary_fail_phase,
                "rollback_used": rollback_used,
                "build_info": build_info,
                "restart_info": restart_info,
            }

        rc, mj = _subpy_stdout_json(auto, api, SCRIPTS["mac_readiness"], ["--dry-run"], env_base)
        phase_result["mac_operator"] = {"exit_code": rc, "json": mj}
        flags["cursor_operator_ready"] = bool(mj.get("cursor_operator_ready") is True)
        flags["mac_operator_ready"] = bool(mj.get("mac_operator_ready") is True)
        if rc != 0 or not bool(mj.get("ok") is True):
            passed = False
            next_card_if_fail = _next_card_for_phase("mac")
            primary_fail_phase = "mac"
            return {
                "passed": False,
                "gates": gates,
                "phase_result": phase_result,
                "flags": flags,
                "next_card_if_fail": next_card_if_fail,
                "primary_fail_phase": primary_fail_phase,
                "rollback_used": rollback_used,
                "build_info": build_info,
                "restart_info": restart_info,
            }

        passed = True
        next_card_if_fail = None
        primary_fail_phase = None
        return {
            "passed": True,
            "gates": gates,
            "phase_result": phase_result,
            "flags": flags,
            "next_card_if_fail": None,
            "primary_fail_phase": None,
            "rollback_used": rollback_used,
            "build_info": build_info,
            "restart_info": restart_info,
        }
    finally:
        pass


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    card = _resolve_card()
    out_final = _resolve_out_final()
    run_dir_name = _resolve_run_dir_name()

    base = os.environ.get("TENMON_PDCA_BASE", os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000")).strip()
    max_loops = int(os.environ.get("TENMON_12H_MASTER_MAX_LOOPS", "24"))
    pilot_cap = (os.environ.get("TENMON_12H_PILOT_MAX_LOOPS") or "").strip()
    if pilot_cap:
        try:
            pc = int(pilot_cap)
            if 1 <= pc <= 2:
                max_loops = min(max_loops, pc)
        except ValueError:
            pass
    max_sec = float(os.environ.get("TENMON_12H_MASTER_MAX_SEC", str(12 * 3600)))
    sleep_sec = float(os.environ.get("TENMON_12H_LOOP_SLEEP_SEC", "0"))
    skip_probes = os.environ.get("TENMON_PDCA_SKIP_PROBES", "").strip() in ("1", "true", "yes")
    skip_build = os.environ.get("TENMON_PDCA_SKIP_BUILD", "1").strip() in ("1", "true", "yes")
    run_build = os.environ.get("TENMON_PDCA_RUN_BUILD", "").strip() in ("1", "true", "yes")

    run_id = _utc().replace(":", "").replace("-", "")
    out_dir = auto / run_dir_name / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    env_base = os.environ.copy()
    if platform.system() != "Darwin":
        env_base.setdefault("TENMON_MAC_OPERATOR_READINESS_NON_MAC_OK", "1")

    t0 = time.monotonic()
    loops_completed = 0
    last_cycle: dict[str, Any] = {}
    rollback_used_global = False

    for loop in range(1, max_loops + 1):
        if time.monotonic() - t0 > max_sec:
            break
        ldir = out_dir / f"loop_{loop}"
        ldir.mkdir(parents=True, exist_ok=True)

        if os.environ.get("TENMON_12H_CURSOR_OPERATOR_BRIDGE", "").strip() in ("1", "true", "yes"):
            brp = auto / "tenmon_cursor_operator_autonomy_bridge_v1.py"
            if brp.is_file():
                br_cmd = [sys.executable, str(brp)]
                if os.environ.get("TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE", "").strip().lower() in (
                    "1",
                    "true",
                    "yes",
                ):
                    br_cmd.append("--execute")
                if os.environ.get("TENMON_12H_CURSOR_OPERATOR_BRIDGE_APPLY", "").strip().lower() in (
                    "1",
                    "true",
                    "yes",
                ):
                    br_cmd.append("--apply")
                br = subprocess.run(
                    br_cmd,
                    cwd=str(api),
                    capture_output=True,
                    text=True,
                    timeout=600,
                    env={**os.environ},
                )
                _write_json(
                    ldir / "loop_cursor_operator_bridge.json",
                    {
                        "loop": loop,
                        "exit_code": br.returncode,
                        "stdout_tail": (br.stdout or "")[-4000:],
                        "stderr_tail": (br.stderr or "")[-2000:],
                    },
                )

        exp = _expansion_observation_flags(auto)
        last_cycle = _run_one_inner_cycle(
            loop=loop,
            repo=repo,
            api=api,
            auto=auto,
            base=base,
            skip_probes=skip_probes,
            skip_build=skip_build,
            run_build=run_build,
            env_base=env_base,
        )
        if last_cycle.get("rollback_used"):
            rollback_used_global = True

        passed = bool(last_cycle.get("passed"))
        gates = last_cycle.get("gates") or {}
        phase_result = last_cycle.get("phase_result") or {}
        flags = last_cycle.get("flags") or {}
        next_card_if_fail = last_cycle.get("next_card_if_fail")
        primary_fail_phase = last_cycle.get("primary_fail_phase")
        build_info = last_cycle.get("build_info")
        rb = bool(last_cycle.get("rollback_used"))

        try:
            _write_loop_run_artifacts(
                out_dir=out_dir,
                ldir=ldir,
                loop=loop,
                gates=gates,
                phase_result=phase_result,
                passed=passed,
                next_card_if_fail=next_card_if_fail,
                primary_fail_phase=primary_fail_phase,
                flags=flags,
                rollback_used=rb,
                build_info=build_info,
                repo=repo,
                auto=auto,
            )
        except OSError:
            pass

        ri = last_cycle.get("restart_info")
        if not isinstance(ri, dict):
            ri = {"skipped": True}
        _write_12h_loop_extras(
            card=card,
            out_dir=out_dir,
            loop=loop,
            gates=gates,
            build_info=build_info,
            restart_info=ri,
            repo=repo,
            primary_fail_phase=primary_fail_phase,
            next_card_if_fail=next_card_if_fail,
            passed=passed,
            expansion=exp,
            t_elapsed=time.monotonic() - t0,
        )

        loops_completed = loop
        if passed:
            break

        if sleep_sec > 0:
            time.sleep(min(sleep_sec, 3600.0))

    elapsed = time.monotonic() - t0
    ok_inner = bool(last_cycle.get("passed"))
    exp = _expansion_observation_flags(auto)
    operable = _read_json(auto / "tenmon_final_operable_seal.json")

    beautiful = bool(exp.get("truth_reasoning_density_ready") and exp.get("human_conversation_seal_ok") is not False)
    forensic_ready = bool(last_cycle.get("phase_result", {}).get("supervisor", {}).get("json", {}).get("forensic_bundle_ready") is True)

    flags_last = last_cycle.get("flags") if isinstance(last_cycle.get("flags"), dict) else {}
    ok = bool(
        ok_inner
        and bool(flags_last)
        and all(flags_last.get(k) for k in flags_last)
    )
    if os.environ.get("TENMON_12H_OK_REQUIRE_EXPANSION", "").strip() in ("1", "true", "yes"):
        ok = bool(
            ok
            and exp.get("truth_reasoning_density_ready")
            and exp.get("mixed_question_still_ok") is not False
        )

    final: dict[str, Any] = {
        "ok": ok,
        "card": card,
        "elapsed_mode": "12h_or_24loops",
        "loops_completed": loops_completed,
        "max_loops_config": max_loops,
        "max_sec_config": max_sec,
        "elapsed_sec": round(elapsed, 2),
        "conversation_core_completed": ok_inner,
        "truth_reasoning_density_ready": bool(exp.get("truth_reasoning_density_ready")),
        "knowledge_circulation_connected": bool(exp.get("knowledge_circulation_connected")),
        "khs_root_fixed": bool(exp.get("khs_root_fixed")),
        "fractal_law_kernel_ready": bool(exp.get("fractal_law_kernel_ready")),
        "mythogenesis_mapper_ready": bool(exp.get("mythogenesis_mapper_ready")),
        "mapping_layer_ready": bool(exp.get("mapping_layer_ready")),
        "digest_ledger_ready": bool(exp.get("digest_ledger_ready")),
        "fractal_truth_worldclass_ready": bool(exp.get("fractal_truth_worldclass_ready")),
        "beautiful_output_ready": beautiful,
        "planner_ready": bool(last_cycle.get("flags", {}).get("planner_ready")),
        "queue_ready": bool(last_cycle.get("flags", {}).get("queue_ready")),
        "execution_gate_ready": bool(last_cycle.get("flags", {}).get("execution_gate_ready")),
        "rollback_ready": bool(last_cycle.get("flags", {}).get("rollback_ready")),
        "forensic_ready": forensic_ready,
        "cursor_operator_ready": bool(last_cycle.get("flags", {}).get("cursor_operator_ready")),
        "mac_operator_ready": bool(last_cycle.get("flags", {}).get("mac_operator_ready")),
        "worktree_converged": bool(operable.get("seal_band") or operable.get("operable_sealed")),
        "final_sealed": bool(operable.get("operable_sealed") is True and operable.get("single_source_ok") is True),
        "rollback_used": rollback_used_global,
        "next_card_if_fail": None if ok else last_cycle.get("next_card_if_fail"),
        "generated_at": _utc(),
        "run_directory": str(out_dir),
        "last_primary_gap": last_cycle.get("primary_fail_phase"),
    }

    _write_json(auto / out_final, final)
    _write_json(out_dir / "final_summary.json", final)

    public = {k: final[k] for k in final if k not in ("run_directory", "last_primary_gap", "generated_at", "max_loops_config", "max_sec_config")}
    print(json.dumps(public, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
