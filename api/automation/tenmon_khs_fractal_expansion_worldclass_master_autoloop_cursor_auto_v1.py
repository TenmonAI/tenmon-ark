#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KHS_FRACTAL_EXPANSION_WORLDCLASS_MASTER_AUTOLOOP_CURSOR_AUTO_V1

KHS fractal expansion を fail-closed master autoloop として観測（会話コア非改変）。
最大 7 ループまたは 2 時間。各ループ: build（任意）→ worldclass seal → autonomy bridge。
2 軸以上不足で当ループ停止、1 軸のみなら next_card md を出して次ループへ。

環境変数:
  TENMON_KHS_FRACTAL_MAX_LOOPS   既定 7
  TENMON_KHS_FRACTAL_MAX_SEC    既定 7200
  TENMON_KHS_FRACTAL_SKIP_BUILD 1 で npm build スキップ
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_KHS_FRACTAL_EXPANSION_WORLDCLASS_MASTER_AUTOLOOP_CURSOR_AUTO_V1"
RUN_DIR_NAME = "khs_fractal_expansion_worldclass_master_autoloop_v1"
OUT_FINAL = "tenmon_khs_fractal_expansion_worldclass_master_autoloop_cursor_auto_v1.json"

SEAL_SCRIPT = "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.py"
BRIDGE_SCRIPT = "tenmon_fractal_expansion_failover_and_autonomy_bridge_cursor_auto_v1.py"

PHASE_LABELS = (
    ("1_khs_root_constitution", "khs_root_fixed"),
    ("2_fractal_law_kernel", "fractal_law_kernel_ready"),
    ("3_kojiki_mythogenesis", "mythogenesis_mapper_ready"),
    ("4_mapping_layer", "mapping_layer_ready"),
    ("5_truth_reasoning_and_mixed", ("truth_structure_reasoning_ready", "mixed_question_quality")),
    ("6_digest_ledger", ("material_digest_ledger_ready", "digest_state_visible")),
    ("7_fractal_truth_worldclass_seal", "worldclass_fractal_truth_ready"),
)


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_md(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _run_py(api: Path, script: str, timeout: int = 900) -> tuple[int, str]:
    p = api / "automation" / script
    if not p.is_file():
        return 2, f"missing:{script}"
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    tail = ((r.stdout or "") + "\n" + (r.stderr or ""))[-4000:]
    return r.returncode, tail


def _npm_build(api: Path) -> dict[str, Any]:
    try:
        r = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(api),
            capture_output=True,
            text=True,
            timeout=900,
        )
        return {
            "ok": r.returncode == 0,
            "exit_code": r.returncode,
            "tail": (r.stdout or "")[-2500:] + (r.stderr or "")[-2500:],
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _fractal_state_from_seal(loop: int, seal: dict[str, Any]) -> dict[str, Any]:
    axes = seal.get("axes") if isinstance(seal.get("axes"), dict) else {}
    phases: dict[str, Any] = {}
    for label, key in PHASE_LABELS:
        if isinstance(key, tuple):
            phases[label] = {k: bool(axes.get(k)) for k in key}
            phases[label]["ok"] = all(bool(axes.get(k)) for k in key)
        else:
            if key == "worldclass_fractal_truth_ready":
                phases[label] = {"ok": bool(seal.get("ok")), "axis": key}
            else:
                ok = bool(axes.get(key))
                phases[label] = {"ok": ok, "axis": key}
    return {
        "loop": loop,
        "generated_at": _utc(),
        "phase_order_note": "観測は worldclass seal の axes を 7 段に対応付け",
        "phases": phases,
        "axes": axes,
        "seal_case": seal.get("case"),
        "primary_gap": seal.get("primary_gap"),
        "failed_axes": seal.get("failed_axes") if isinstance(seal.get("failed_axes"), list) else [],
        "stale_sources_present": seal.get("stale_sources_present"),
        "worktree_converged": seal.get("worktree_converged"),
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    max_loops = int(os.environ.get("TENMON_KHS_FRACTAL_MAX_LOOPS", "7"))
    max_sec = float(os.environ.get("TENMON_KHS_FRACTAL_MAX_SEC", "7200"))
    skip_build = os.environ.get("TENMON_KHS_FRACTAL_SKIP_BUILD", "").strip() in ("1", "true", "yes")

    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    run_root = auto / RUN_DIR_NAME / ts
    run_root.mkdir(parents=True, exist_ok=True)
    # 各ループ成果物: run_root/loop_<N>_{result,probe_summary,fractal_state,next_card_if_fail}.(json|md)

    t0 = time.monotonic()
    rollback_used = False
    loops_completed = 0
    stop_reason: str | None = None
    last_seal: dict[str, Any] = {}
    last_bridge: dict[str, Any] = {}

    for loop in range(1, max_loops + 1):
        if time.monotonic() - t0 > max_sec:
            stop_reason = "time_budget_exceeded"
            break

        build_info: dict[str, Any] = {"skipped": True}
        if not skip_build:
            build_info = _npm_build(api)
            if not build_info.get("ok"):
                rollback_used = True
                _write_json(run_root / f"loop_{loop}_result.json", {"ok": False, "loop": loop, "phase": "build", "build": build_info})
                stop_reason = "build_failure"
                loops_completed = loop
                break

        rc_seal, tail_seal = _run_py(api, SEAL_SCRIPT)
        seal_path = auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json"
        last_seal = _read_json(seal_path)

        rc_br, tail_br = _run_py(api, BRIDGE_SCRIPT)
        bridge_path = auto / "tenmon_fractal_expansion_failover_and_autonomy_bridge_cursor_auto_v1.json"
        last_bridge = _read_json(bridge_path)

        failed = last_seal.get("failed_axes") if isinstance(last_seal.get("failed_axes"), list) else []
        n_fail = len(failed)
        seal_ok = bool(last_seal.get("ok"))
        bridge_ok = bool(last_bridge.get("ok"))
        autonomy_ready = bool(last_bridge.get("fractal_autonomy_bridge_ready"))

        fractal_state = _fractal_state_from_seal(loop, last_seal)
        fractal_state["bridge"] = {
            "script_exit_code": rc_br,
            "fractal_autonomy_bridge_ready": autonomy_ready,
            "tail": tail_br[-2000:],
        }
        fractal_state["seal_script_exit_code"] = rc_seal
        _write_json(run_root / f"loop_{loop}_fractal_state.json", fractal_state)

        probe_summary = {
            "loop": loop,
            "generated_at": _utc(),
            "build": build_info,
            "seal_script": {"exit_code": rc_seal, "stdout_stderr_tail": tail_seal[-3000:]},
            "bridge_script": {"exit_code": rc_br, "stdout_stderr_tail": tail_br[-3000:]},
        }
        _write_json(run_root / f"loop_{loop}_probe_summary.json", probe_summary)

        next_card = last_seal.get("next_card_if_fail")
        if next_card is None and not bridge_ok:
            next_card = last_bridge.get("next_card_if_fail")

        md_lines = [
            f"# loop {loop} next_card_if_fail",
            "",
            f"- generated_at: `{_utc()}`",
            f"- seal_ok: `{seal_ok}`",
            f"- bridge_ok: `{bridge_ok}`",
            f"- failed_axes ({n_fail}): `{', '.join(str(x) for x in failed) if failed else '(none)'}`",
            f"- primary_gap: `{last_seal.get('primary_gap')}`",
            "",
            "## recommended next card",
            "",
            f"`{next_card}`" if next_card else "`(null)`",
            "",
            "## failover / autonomy",
            "",
            "fractal expansion bridge: `tenmon_fractal_expansion_autonomy_bridge_v1.json`",
        ]
        _write_md(run_root / f"loop_{loop}_next_card_if_fail.md", md_lines)

        loop_result = {
            "ok": seal_ok and bridge_ok and autonomy_ready,
            "loop": loop,
            "seal_ok": seal_ok,
            "bridge_ok": bridge_ok,
            "fractal_autonomy_bridge_ready": autonomy_ready,
            "failed_axes": failed,
            "n_failed_axes": n_fail,
            "case": last_seal.get("case"),
            "stop_loop_iteration": n_fail >= 2,
        }
        _write_json(run_root / f"loop_{loop}_result.json", loop_result)

        loops_completed = loop

        if n_fail >= 2:
            stop_reason = "multi_axis_or_more_in_one_loop"
            break

        if seal_ok and bridge_ok and autonomy_ready:
            stop_reason = "all_pass"
            break

        # 1 軸または seal のみ失敗: 次ループへ（PASS のみ積み上げは運用側でカード実行後に再実行）

    if stop_reason is None:
        stop_reason = "max_loops_exhausted"

    axes = last_seal.get("axes") if isinstance(last_seal.get("axes"), dict) else {}
    final_ok = bool(
        last_seal.get("ok")
        and last_bridge.get("ok")
        and bool(last_bridge.get("fractal_autonomy_bridge_ready"))
        and stop_reason == "all_pass"
    )

    out: dict[str, Any] = {
        "ok": final_ok,
        "card": CARD,
        "loops_completed": loops_completed,
        "khs_root_fixed": bool(axes.get("khs_root_fixed")),
        "fractal_law_kernel_ready": bool(axes.get("fractal_law_kernel_ready")),
        "mythogenesis_mapper_ready": bool(axes.get("mythogenesis_mapper_ready")),
        "mapping_layer_ready": bool(axes.get("mapping_layer_ready")),
        "truth_structure_reasoning_ready": bool(axes.get("truth_structure_reasoning_ready")),
        "material_digest_ledger_ready": bool(axes.get("material_digest_ledger_ready")),
        "digest_state_visible": bool(axes.get("digest_state_visible")),
        "mixed_question_quality": bool(axes.get("mixed_question_quality")),
        "worldclass_fractal_truth_ready": bool(last_seal.get("worldclass_fractal_truth_ready")),
        "single_source_preserved": bool(axes.get("single_source_preserved")),
        "beautiful_output_preserved": bool(axes.get("beautiful_output_preserved")),
        "fractal_autonomy_bridge_ready": bool(last_bridge.get("fractal_autonomy_bridge_ready")),
        "rollback_used": rollback_used,
        "next_card_if_fail": None if final_ok else (last_seal.get("next_card_if_fail") or last_bridge.get("next_card_if_fail")),
        "generated_at": _utc(),
        "run_dir": str(run_root),
        "stop_reason": stop_reason,
        "time_elapsed_sec": round(time.monotonic() - t0, 3),
    }

    try:
        outp = auto / OUT_FINAL
        tmp = outp.with_suffix(outp.suffix + ".tmp")
        tmp.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(outp)
    except OSError:
        out["rollback_used"] = True
        out["ok"] = False

    print(json.dumps({k: out[k] for k in out if k in (
        "ok", "card", "loops_completed", "khs_root_fixed", "fractal_law_kernel_ready",
        "mythogenesis_mapper_ready", "mapping_layer_ready", "truth_structure_reasoning_ready",
        "material_digest_ledger_ready", "digest_state_visible", "mixed_question_quality",
        "worldclass_fractal_truth_ready", "single_source_preserved", "beautiful_output_preserved",
        "fractal_autonomy_bridge_ready", "rollback_used", "next_card_if_fail",
    )}, ensure_ascii=False, indent=2))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
