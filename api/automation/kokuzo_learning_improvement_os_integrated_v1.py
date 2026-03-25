#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_CURSOR_AUTO_V1

learning ループ（KG0→KG1→KG2→KG2B）と runtime seal、
improvement ループ（governor / residual / ledger / compose / card_autogen）を
1 周し、統合 verdict・manifest・next_card_dispatch を書く。

- 本番への高リスク自動適用なし: CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART=1 既定
- FAIL 時: evidence bundle + next_card_dispatch + exit!=0
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_CURSOR_AUTO_V1"
VERSION = 1
VPS_CARD = "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1"
FAIL_NEXT_CURSOR = "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_RETRY_CURSOR_AUTO_V1"

# 親カード（虚空蔵 learning × self-improvement 統合）
PARENT_CURSOR = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1"
PARENT_VPS = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1"
FAIL_NEXT_PARENT = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_RETRY_CURSOR_AUTO_V1"

REGISTRY_JSON = "automation/out/os_output_contract_normalize_v1/output_contract_registry.json"
MASTER_VERDICT_JSON = "automation/out/master_verdict_unification_v1/master_verdict.json"

BOOTSTRAP_CARD = "TENMON_KOKUZO_LEARNING_OS_BOOTSTRAP_CURSOR_AUTO_V1"
BOOTSTRAP_VPS = "TENMON_KOKUZO_LEARNING_OS_BOOTSTRAP_VPS_V1"
BOOTSTRAP_FAIL_NEXT = "TENMON_KOKUZO_LEARNING_OS_BOOTSTRAP_RETRY_CURSOR_AUTO_V1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run(
    argv: List[str],
    *,
    cwd: Path,
    env: Dict[str, str],
    capture: bool = False,
) -> Tuple[int, str, str]:
    if capture:
        proc = subprocess.run(argv, cwd=str(cwd), env=env, capture_output=True, text=True)
        return proc.returncode, proc.stdout or "", proc.stderr or ""
    proc = subprocess.run(argv, cwd=str(cwd), env=env)
    return proc.returncode, "", ""


def _verdict_pass(data: Dict[str, Any]) -> bool:
    return str(data.get("verdict") or "").upper() == "PASS"


def _score_int(d: Dict[str, Any], key: str, *, if_absent: int = 100) -> int:
    if key not in d:
        return if_absent
    try:
        return int(d[key])
    except Exception:
        return if_absent


def _classify_learning_blockers(automation: Path) -> Dict[str, List[str]]:
    """input_quality / seed_quality / grounding / bridge_missing"""
    out: Dict[str, List[str]] = {
        "input_quality": [],
        "seed_quality": [],
        "grounding": [],
        "bridge_missing": [],
    }
    lq = _read_json(automation / "learning_quality_report.json")
    sd = _read_json(automation / "seed_quality_report.json")
    eg = _read_json(automation / "evidence_grounding_report.json")
    bridge = _read_json(automation / "learning_quality_bridge.json")
    clb = _read_json(automation / "conversation_learning_bridge.json")

    if not bridge and not clb:
        out["bridge_missing"].append("no_learning_quality_bridge_and_no_conversation_bridge")
    elif not bridge:
        out["bridge_missing"].append("learning_quality_bridge.json_missing")
    elif bool((bridge.get("thresholds") or {}).get("learning_quality_fail")):
        out["input_quality"].append("unified_score_below_threshold_per_bridge")

    if lq and _score_int(lq, "score") < 50:
        out["input_quality"].append("learning_input_quality_score_low")
    if sd and _score_int(sd, "score") < 50:
        out["seed_quality"].append("seed_quality_score_low")
    if eg and _score_int(eg, "score") < 50:
        out["grounding"].append("evidence_grounding_score_low")

    if clb and str(clb.get("verdict") or "") == "gap":
        out["bridge_missing"].append("conversation_learning_bridge_verdict_gap")
    return out


def _chat_ts_overall_with_master_unification(api: Path, seal_final_body: Dict[str, Any]) -> bool:
    """master_verdict_unification があれば live seal より優先（false fail 抑制）。"""
    mv = _read_json(api / MASTER_VERDICT_JSON)
    ax = (mv.get("axes") or {}).get("chat_ts_overall_100") or {}
    if isinstance(ax, dict) and ax.get("value") is not None:
        return bool(ax["value"])
    return bool(seal_final_body.get("chat_ts_overall_100"))


def _output_contract_refs(api: Path) -> Dict[str, Any]:
    p = api / REGISTRY_JSON
    return {
        "registry_path": str(p.relative_to(api)) if p.is_file() else None,
        "registry_present": p.is_file(),
    }


def _run_learning_readonly_reports(automation: Path, reports_dir: Path) -> None:
    """read-only: priority_queue / orchestrator からスコア・橋を生成（chat.ts 非改変）。"""
    reports_dir.mkdir(parents=True, exist_ok=True)
    pairs = [
        ("learning_quality_scorer_v1.py", "learning_quality_report.json"),
        ("seed_quality_scorer_v1.py", "seed_quality_report.json"),
        ("evidence_grounding_scorer_v1.py", "evidence_grounding_report.json"),
        ("conversation_learning_bridge_v1.py", "conversation_learning_bridge.json"),
    ]
    for mod, fname in pairs:
        out_p = reports_dir / fname
        subprocess.run(
            [sys.executable, str(automation / mod), "--out", str(out_p)],
            cwd=str(automation),
            env=os.environ.copy(),
            check=False,
        )


def _step_ok_from_report(score: int, *, threshold: int = 50) -> bool:
    return int(score or 0) >= threshold


def _build_minimum_learning_steps(
    *,
    reports_dir: Path,
    learning_steps_kg: List[Dict[str, Any]],
    seal_rc: int,
    seal_final: Dict[str, Any],
    verdict_unified: bool,
    structural_ok: bool,
    bootstrap_mode: bool = False,
) -> Dict[str, Any]:
    """契約 minimum: input / seed / grounding / conversation_return / seal_result。"""
    lq = _read_json(reports_dir / "learning_quality_report.json")
    sd = _read_json(reports_dir / "seed_quality_report.json")
    eg = _read_json(reports_dir / "evidence_grounding_report.json")
    clb = _read_json(reports_dir / "conversation_learning_bridge.json")

    iq = int(lq.get("score") or 0)
    sq = int(sd.get("score") or 0)
    gq = int(eg.get("score") or 0)
    bridge_verdict = str(clb.get("verdict") or "idle")

    conv_ok = bridge_verdict in ("connect", "idle")  # gap は warning のみ（単独では fail にしない）

    if bootstrap_mode:
        seal_block: Dict[str, Any] = {
            "ok": False,
            "note": "bootstrap_skipped_runtime_seal_and_improvement_compose",
            "runtime_seal_exit_code": None,
            "live_chat_ts_overall_100": None,
            "unified_chat_ts_overall_100": None,
            "structural_ok": None,
            "seal_dir_final_verdict_ref": None,
        }
    else:
        seal_block = {
            "ok": int(seal_rc or 0) == 0 and verdict_unified and structural_ok,
            "runtime_seal_exit_code": seal_rc,
            "live_chat_ts_overall_100": bool(seal_final.get("chat_ts_overall_100")),
            "unified_chat_ts_overall_100": verdict_unified,
            "structural_ok": structural_ok,
            "seal_dir_final_verdict_ref": "final_verdict.json",
        }

    return {
        "input_quality": {
            "ok": _step_ok_from_report(iq),
            "score": iq,
            "metric": str(lq.get("metric") or "learning_input_quality"),
            "source": str(reports_dir / "learning_quality_report.json"),
        },
        "seed_quality": {
            "ok": _step_ok_from_report(sq),
            "score": sq,
            "metric": str(sd.get("metric") or "seed_quality"),
            "source": str(reports_dir / "seed_quality_report.json"),
        },
        "grounding_quality": {
            "ok": _step_ok_from_report(gq),
            "score": gq,
            "metric": str(eg.get("metric") or "evidence_grounding_quality"),
            "source": str(reports_dir / "evidence_grounding_report.json"),
        },
        "conversation_return": {
            "ok": conv_ok,
            "verdict": bridge_verdict,
            "summary": (clb.get("summary") or {}),
            "source": str(reports_dir / "conversation_learning_bridge.json"),
            "policy": "read_only_verdict_first",
        },
        "seal_result": seal_block,
        "kg_chain": learning_steps_kg,
    }


def _kokuzo_failure_reasons(
    *,
    learning_chain_ok: bool,
    overall_loop_ok: bool,
    seal_rc: int,
    structural_ok: bool,
    verdict_unified: bool,
    bridge_verdict: str,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not learning_chain_ok:
        out.append({"code": "kg_chain_incomplete", "severity": "fail"})
    if seal_rc != 0:
        out.append({"code": "runtime_seal_exit_nonzero", "severity": "fail", "detail": {"rc": seal_rc}})
    if not structural_ok:
        out.append({"code": "governor_structural_not_ok", "severity": "fail"})
    if not verdict_unified:
        out.append({"code": "verdict_conflict_live_vs_master", "severity": "fail"})
    if bridge_verdict == "gap":
        out.append({"code": "conversation_learning_bridge_gap", "severity": "warning"})
    return out


def _write_kokuzo_integrated_final_verdict(
    api: Path,
    out_root: Path,
    os_out: Path,
    seal_dir: Path,
    compose_integrated: Dict[str, Any],
    seal_rc: int,
    seal_final: Dict[str, Any],
    gov: Dict[str, Any],
    learning_chain_ok: bool,
    verdict_unified: bool,
    failure_reasons: List[Dict[str, Any]],
) -> Dict[str, Any]:
    structural = bool(gov.get("structural_ok"))
    overall_loop_ok = seal_rc == 0 and verdict_unified and structural

    body: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "parent_fail_next_cursor": FAIL_NEXT_PARENT,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "output_contract_refs": _output_contract_refs(api),
        "master_verdict_unification_ref": MASTER_VERDICT_JSON if _read_json(api / MASTER_VERDICT_JSON) else None,
        "improvement_compose_path": str(os_out / "integrated_final_verdict.json"),
        "compose_overall_loop_ok_original": compose_integrated.get("overall_loop_ok"),
        "overall_loop_ok": overall_loop_ok,
        "unified_chat_ts_overall_100": verdict_unified,
        "learning_chain_ok": learning_chain_ok,
        "seal_dir": str(seal_dir),
        "seal_exit_code": seal_rc,
        "live_seal_final_verdict": {
            "chat_ts_overall_100": bool(seal_final.get("chat_ts_overall_100")),
            "chat_ts_runtime_100": bool(seal_final.get("chat_ts_runtime_100")),
            "chat_ts_static_100": bool(seal_final.get("chat_ts_static_100")),
        },
        "governor": {
            "structural_ok": structural,
            "runtime_probe_summary": gov.get("runtime_probe_summary") or {},
            "artifacts_present": gov.get("artifacts_present") or {},
        },
        "failure_reasons": failure_reasons,
        "integrated_ok": bool(learning_chain_ok and overall_loop_ok),
        "improvement_compose": compose_integrated,
    }
    path = out_root / "integrated_final_verdict.json"
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return body


def _bootstrap_learning_chain(
    api: Path,
    scripts: Path,
    out_root: Path,
    base_env: Dict[str, str],
) -> List[Dict[str, Any]]:
    learning_root = out_root / "learning"
    kg0 = learning_root / "kg0_khs_health_gate"
    kg1 = learning_root / "kg1_deterministic_seed"
    kg2 = learning_root / "kg2_khs_candidate_return"
    kg2b = learning_root / "kg2b_fractal_renderer"
    for d in (kg0, kg1, kg2, kg2b):
        d.mkdir(parents=True, exist_ok=True)

    steps_def: List[Tuple[str, str, Path, Dict[str, str]]] = [
        (
            "kg0_khs_health_gate",
            "khs_health_gate_v1.sh",
            kg0,
            {"KG0_OUT_DIR": str(kg0), "KG0_EXIT_ZERO": "0"},
        ),
        (
            "kg1_deterministic_seed",
            "deterministic_seed_generator_v1.sh",
            kg1,
            {"KG1_OUT_DIR": str(kg1), "KG1_PASSABLE_JSON": str(kg0 / "khs_passable_set.json")},
        ),
        (
            "kg2_khs_candidate_return",
            "kg2_khs_candidate_return_v1.sh",
            kg2,
            {"KG2_OUT_DIR": str(kg2)},
        ),
        (
            "kg2b_fractal_language_renderer",
            "kg2b_fractal_language_renderer_v1.sh",
            kg2b,
            {"KG2B_OUT_DIR": str(kg2b)},
        ),
    ]
    steps: List[Dict[str, Any]] = []
    for sid, shname, kg_dir, extra_env in steps_def:
        sh_path = scripts / shname
        if not sh_path.is_file():
            steps.append(
                {
                    "id": sid,
                    "state": "not_ready",
                    "runner": str(sh_path),
                    "rc": None,
                    "verdict_pass": False,
                    "detail": "missing_runner",
                    "out_dir": str(kg_dir),
                }
            )
            continue
        env = {**base_env, **extra_env}
        rc, o, e = _run(["bash", str(sh_path)], cwd=api, env=env, capture=True)
        fv = _read_json(kg_dir / "final_verdict.json")
        vp = _verdict_pass(fv)
        ok_step = int(rc or 0) == 0 and vp
        steps.append(
            {
                "id": sid,
                "state": "ok" if ok_step else "not_ready",
                "runner": str(sh_path),
                "rc": rc,
                "verdict_pass": vp,
                "out_dir": str(kg_dir),
                "stdout_tail": (o or "")[-2000:],
                "stderr_tail": (e or "")[-2000:],
            }
        )
    return steps


def run_bootstrap(api: Path, automation: Path, scripts: Path, out_dir_arg: str, stdout_json: bool) -> int:
    """seal / improvement OS を回さず learning 最低統合のみ（成果物必ず生成）。"""
    out_root = (
        Path(out_dir_arg).resolve()
        if (out_dir_arg or "").strip()
        else (api / "automation" / "out" / "tenmon_kokuzo_learning_os_bootstrap_v1")
    )
    out_root.mkdir(parents=True, exist_ok=True)

    reports_dir = out_root / "_learning_reports"
    _run_learning_readonly_reports(automation, reports_dir)

    repo = api.parent
    base_env = os.environ.copy()
    base_env.setdefault("ROOT", str(repo))
    probe = base_env.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
    base_env.setdefault("CHAT_TS_PROBE_BASE_URL", probe)

    learning_steps = _bootstrap_learning_chain(api, scripts, out_root, base_env)
    blockers = _classify_learning_blockers(automation)

    learning_chain_ok = all(s.get("state") == "ok" for s in learning_steps)
    has_report_blockers = any(bool(blockers[k]) for k in blockers)
    readiness = "integrated_ready" if learning_chain_ok and not has_report_blockers else "not_ready"

    kg_for_min = [
        {
            "id": s.get("id"),
            "state": s.get("state"),
            "rc": s.get("rc"),
            "verdict_pass": s.get("verdict_pass"),
        }
        for s in learning_steps
    ]
    steps_minimum = _build_minimum_learning_steps(
        reports_dir=reports_dir,
        learning_steps_kg=kg_for_min,
        seal_rc=0,
        seal_final={},
        verdict_unified=True,
        structural_ok=True,
        bootstrap_mode=True,
    )

    steps_path = out_root / "learning_steps.json"
    steps_body: Dict[str, Any] = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "output_contract_refs": _output_contract_refs(api),
        "policy": "bootstrap_no_full_seal",
        **steps_minimum,
        "bootstrap_learning_steps": learning_steps,
    }
    steps_path.write_text(json.dumps(steps_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    exit_ok = readiness == "integrated_ready"
    integrated_ifv = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "vps_marker": BOOTSTRAP_VPS,
        "mode": "bootstrap",
        "overall_loop_ok": False,
        "integrated_ok": exit_ok,
        "readiness": readiness,
        "learning_chain_ok": learning_chain_ok,
        "blockers_by_type": blockers,
        "output_contract_refs": _output_contract_refs(api),
        "master_verdict_unification_ref": MASTER_VERDICT_JSON if _read_json(api / MASTER_VERDICT_JSON) else None,
        "learning_steps_path": str(steps_path),
        "note": "full integration: run kokuzo_learning_improvement_os_integrated_v1.py without --bootstrap",
    }
    (out_root / "integrated_final_verdict.json").write_text(
        json.dumps(integrated_ifv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    integrated = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "generatedAt": _utc_now_iso(),
        "vps_marker": BOOTSTRAP_VPS,
        "readiness": readiness,
        "learning_chain_ok": learning_chain_ok,
        "blockers_by_type": blockers,
        "learning_steps_path": str(steps_path),
        "integrated_final_verdict_path": str(out_root / "integrated_final_verdict.json"),
        "learning_steps": learning_steps,
        "learning_steps_minimum": {k: steps_minimum[k] for k in steps_minimum if k != "kg_chain"},
        "fail_next_cursor_card": BOOTSTRAP_FAIL_NEXT,
    }
    integ_path = out_root / "integrated_learning_verdict.json"
    integ_path.write_text(json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    paths_map = {
        "kokuzo_learning_manifest": str(out_root / "kokuzo_learning_manifest.json"),
        "integrated_learning_verdict": str(integ_path),
        "integrated_final_verdict": str(out_root / "integrated_final_verdict.json"),
        "learning_steps": str(steps_path),
        "learning_reports": str(reports_dir),
        "next_card_dispatch": str(out_root / "next_card_dispatch.json"),
        "bootstrap_final_verdict": str(out_root / "bootstrap_final_verdict.json"),
    }
    manifest: Dict[str, Any] = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "generatedAt": _utc_now_iso(),
        "vps_marker": BOOTSTRAP_VPS,
        "fail_next_cursor_card": BOOTSTRAP_FAIL_NEXT,
        "paths": paths_map,
        "subsystems": [
            "learning_readonly_reports",
            "kg0_khs_health_gate",
            "kg1_seed",
            "kg2_candidate",
            "kg2b_renderer",
            "automation_learning_reports",
        ],
        "policy": "bootstrap_no_full_seal",
    }
    man_path = out_root / "kokuzo_learning_manifest.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lim_manifest: Dict[str, Any] = {
        "version": VERSION,
        "card": "TENMON_KOKUZO_LEARNING_IMPROVEMENT_OS_MANIFEST_V1",
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "vps_card": BOOTSTRAP_VPS,
        "policy": "bootstrap_no_full_seal",
        "paths": paths_map,
        "subsystems": manifest["subsystems"],
    }
    (out_root / "learning_improvement_os_manifest.json").write_text(
        json.dumps(lim_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    dispatch_rows: List[Dict[str, Any]] = []
    if readiness == "not_ready":
        dispatch_rows.append(
            {
                "source": "kokuzo_learning_bootstrap",
                "cursor_card": BOOTSTRAP_FAIL_NEXT,
                "vps_card": BOOTSTRAP_VPS,
                "readiness": readiness,
                "blockers_by_type": blockers,
            }
        )
    else:
        dispatch_rows.append(
            {
                "source": "kokuzo_learning_bootstrap",
                "vps_card": BOOTSTRAP_VPS,
                "note": "bootstrap_ok",
                "readiness": readiness,
            }
        )
    dispatch = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "generatedAt": _utc_now_iso(),
        "readiness": readiness,
        "dispatch": dispatch_rows,
    }
    nd_path = out_root / "next_card_dispatch.json"
    nd_path.write_text(json.dumps(dispatch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    bf = {
        "version": 1,
        "card": BOOTSTRAP_CARD,
        "vps_marker": BOOTSTRAP_VPS,
        "fail_next_cursor_card": BOOTSTRAP_FAIL_NEXT if not exit_ok else None,
        "generatedAt": _utc_now_iso(),
        "readiness": readiness,
        "exit_code": 0 if exit_ok else 1,
        "learning_chain_ok": learning_chain_ok,
        "paths": paths_map,
    }
    (out_root / "bootstrap_final_verdict.json").write_text(
        json.dumps(bf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    marker_name = BOOTSTRAP_VPS
    (out_root / marker_name).write_text(
        f"{BOOTSTRAP_VPS}\n{_utc_now_iso()}\nreadiness={readiness}\n", encoding="utf-8"
    )
    (automation / marker_name).write_text(f"{BOOTSTRAP_VPS}\n{_utc_now_iso()}\n", encoding="utf-8")

    summary = {
        "ok": exit_ok,
        "readiness": readiness,
        "out_dir": str(out_root),
        **paths_map,
    }
    if stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if exit_ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="既定: full=…learning_improvement_os_v1 / bootstrap=…learning_os_bootstrap_v1",
    )
    ap.add_argument(
        "--allow-systemd-restart",
        action="store_true",
        help="runtime seal 時に systemd restart を許可（既定はスキップ）",
    )
    ap.add_argument(
        "--bootstrap",
        action="store_true",
        help="Kokuzo Learning OS bootstrap のみ（manifest / integrated_learning_verdict / learning_steps / dispatch）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    automation = api / "automation"
    scripts = api / "scripts"

    if args.bootstrap:
        return run_bootstrap(api, automation, scripts, args.out_dir, args.stdout_json)

    repo = api.parent

    out_root = Path(args.out_dir).resolve() if args.out_dir else (
        api / "automation" / "out" / "tenmon_kokuzo_learning_improvement_os_v1"
    )
    out_root.mkdir(parents=True, exist_ok=True)

    reports_dir = out_root / "_learning_reports"
    _run_learning_readonly_reports(automation, reports_dir)

    learning_root = out_root / "learning"
    kg0 = learning_root / "kg0_khs_health_gate"
    kg1 = learning_root / "kg1_deterministic_seed"
    kg2 = learning_root / "kg2_khs_candidate_return"
    kg2b = learning_root / "kg2b_fractal_renderer"
    for d in (kg0, kg1, kg2, kg2b):
        d.mkdir(parents=True, exist_ok=True)

    seal_dir = out_root / "integration_seal"
    seal_dir.mkdir(parents=True, exist_ok=True)

    os_out = out_root / "_learning_improvement_os"
    os_out.mkdir(parents=True, exist_ok=True)

    base_env = os.environ.copy()
    base_env.setdefault("ROOT", str(repo))
    probe_base = base_env.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
    base_env.setdefault("CHAT_TS_PROBE_BASE_URL", probe_base)
    base_env.setdefault("TENMON_API_BASE", probe_base)

    learning_steps: List[Dict[str, Any]] = []

    # --- KG0 ---
    env0 = base_env.copy()
    env0["KG0_OUT_DIR"] = str(kg0)
    env0["KG0_EXIT_ZERO"] = "0"
    rc0, o0, e0 = _run(
        ["bash", str(scripts / "khs_health_gate_v1.sh")],
        cwd=api,
        env=env0,
        capture=True,
    )
    fv0 = _read_json(kg0 / "final_verdict.json")
    learning_steps.append(
        {
            "id": "kg0_khs_health_gate",
            "rc": rc0,
            "verdict_pass": _verdict_pass(fv0),
            "out_dir": str(kg0),
            "stdout_tail": o0[-4000:],
            "stderr_tail": e0[-4000:],
        }
    )

    # --- KG1 ---
    env1 = base_env.copy()
    env1["KG1_OUT_DIR"] = str(kg1)
    env1["KG1_PASSABLE_JSON"] = str(kg0 / "khs_passable_set.json")
    # KG1 はパイプライン厳格: KG0 で passable が薄い場合は失敗し得る
    rc1, o1, e1 = _run(
        ["bash", str(scripts / "deterministic_seed_generator_v1.sh")],
        cwd=api,
        env=env1,
        capture=True,
    )
    fv1 = _read_json(kg1 / "final_verdict.json")
    learning_steps.append(
        {
            "id": "kg1_deterministic_seed",
            "rc": rc1,
            "verdict_pass": _verdict_pass(fv1),
            "out_dir": str(kg1),
            "stdout_tail": o1[-4000:],
            "stderr_tail": e1[-4000:],
        }
    )

    # --- KG2 ---
    env2 = base_env.copy()
    env2["KG2_OUT_DIR"] = str(kg2)
    rc2, o2, e2 = _run(
        ["bash", str(scripts / "kg2_khs_candidate_return_v1.sh")],
        cwd=api,
        env=env2,
        capture=True,
    )
    fv2 = _read_json(kg2 / "final_verdict.json")
    learning_steps.append(
        {
            "id": "kg2_khs_candidate_return",
            "rc": rc2,
            "verdict_pass": _verdict_pass(fv2),
            "out_dir": str(kg2),
            "stdout_tail": o2[-4000:],
            "stderr_tail": e2[-4000:],
        }
    )

    # --- KG2B ---
    envb = base_env.copy()
    envb["KG2B_OUT_DIR"] = str(kg2b)
    rcb, ob, eb = _run(
        ["bash", str(scripts / "kg2b_fractal_language_renderer_v1.sh")],
        cwd=api,
        env=envb,
        capture=True,
    )
    fvb = _read_json(kg2b / "final_verdict.json")
    learning_steps.append(
        {
            "id": "kg2b_fractal_language_renderer",
            "rc": rcb,
            "verdict_pass": _verdict_pass(fvb),
            "out_dir": str(kg2b),
            "stdout_tail": ob[-4000:],
            "stderr_tail": eb[-4000:],
        }
    )

    learning_chain_ok = all(
        s["verdict_pass"] and int(s["rc"] or 0) == 0 for s in learning_steps
    )

    # --- Runtime + worldclass seal（systemd 既定スキップ）---
    env_seal = base_env.copy()
    env_seal["CARD"] = "TENMON_KOKUZO_LEARNING_RUNTIME_SEAL_V1"
    env_seal["TENMON_SEAL_DIR_OVERRIDE"] = str(seal_dir)
    env_seal["CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART"] = "0" if args.allow_systemd_restart else "1"
    env_seal["CHAT_TS_COMPLETION_SUPPLEMENT_SKIP"] = "1"
    env_seal["CHAT_TS_POSTLOCK_MAINTENANCE_SKIP"] = "1"
    env_seal["CHAT_TS_RESIDUAL_SCORE_SKIP"] = "1"

    rc_seal, seal_out, seal_err = _run(
        ["bash", str(scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh")],
        cwd=api,
        env=env_seal,
        capture=True,
    )

    # --- Improvement OS サブシステム ---
    gov_py = automation / "tenmon_self_improvement_seal_governor_v1.py"
    res_py = automation / "tenmon_self_improvement_residual_adapter_v1.py"
    cmp_py = automation / "tenmon_self_improvement_integrated_compose_v1.py"
    led_py = automation / "tenmon_self_improvement_ledger_v1.py"
    aut_py = automation / "tenmon_self_improvement_card_autogen_v1.py"

    subprocess.run(
        [sys.executable, str(gov_py), "--seal-dir", str(seal_dir), "--out-dir", str(os_out), "--stdout-json"],
        cwd=str(api),
        env=base_env,
        check=False,
    )
    subprocess.run(
        [sys.executable, str(res_py), "--seal-dir", str(seal_dir), "--out-dir", str(os_out / "residual"), "--stdout-json"],
        cwd=str(api),
        env=base_env,
        check=False,
    )
    subprocess.run(
        [
            sys.executable,
            str(cmp_py),
            "--seal-dir",
            str(seal_dir),
            "--seal-exit-code",
            str(rc_seal),
            "--out-dir",
            str(os_out),
            "--vps-card",
            VPS_CARD,
            "--fail-next-cursor",
            FAIL_NEXT_CURSOR,
            "--stdout-json",
        ],
        cwd=str(api),
        env=base_env,
        check=False,
    )
    subprocess.run(
        [
            sys.executable,
            str(led_py),
            "--seal-dir",
            str(seal_dir),
            "--out-dir",
            str(os_out),
            "--seal-exit-code",
            str(rc_seal),
            "--vps-card",
            VPS_CARD,
            "--stdout-json",
        ],
        cwd=str(api),
        env=base_env,
        check=False,
    )

    integrated_compose_path = os_out / "integrated_final_verdict.json"
    integrated_compose = _read_json(integrated_compose_path)
    gov = _read_json(os_out / "seal_governor_verdict.json")
    structural_ok = bool(gov.get("structural_ok"))
    seal_final_body = _read_json(seal_dir / "final_verdict.json")
    verdict_unified = _chat_ts_overall_with_master_unification(api, seal_final_body)
    clb_pre = _read_json(reports_dir / "conversation_learning_bridge.json")
    bridge_verdict = str(clb_pre.get("verdict") or "idle")

    overall_loop_ok = (
        int(rc_seal or 0) == 0 and verdict_unified and structural_ok
    )
    failure_reasons = _kokuzo_failure_reasons(
        learning_chain_ok=learning_chain_ok,
        overall_loop_ok=overall_loop_ok,
        seal_rc=rc_seal,
        structural_ok=structural_ok,
        verdict_unified=verdict_unified,
        bridge_verdict=bridge_verdict,
    )

    integrated_kokuzo = _write_kokuzo_integrated_final_verdict(
        api,
        out_root,
        os_out,
        seal_dir,
        integrated_compose,
        rc_seal,
        seal_final_body,
        gov,
        learning_chain_ok,
        verdict_unified,
        failure_reasons,
    )

    steps_minimum = _build_minimum_learning_steps(
        reports_dir=reports_dir,
        learning_steps_kg=learning_steps,
        seal_rc=rc_seal,
        seal_final=seal_final_body,
        verdict_unified=verdict_unified,
        structural_ok=structural_ok,
    )
    learning_steps_path = out_root / "learning_steps.json"
    learning_steps_body: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "output_contract_refs": _output_contract_refs(api),
        **steps_minimum,
    }
    learning_steps_path.write_text(
        json.dumps(learning_steps_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    canonical_integrated_path = out_root / "integrated_final_verdict.json"
    run_fail_autogen = (
        (rc_seal != 0)
        or (not canonical_integrated_path.is_file())
        or (not overall_loop_ok)
    )
    aut_cmd = [
        sys.executable,
        str(aut_py),
        "--seal-dir",
        str(seal_dir),
        "--out-dir",
        str(os_out),
        "--integrated-path",
        str(canonical_integrated_path),
        "--fail-next-cursor",
        FAIL_NEXT_CURSOR,
        "--fail-next-vps-hint",
        VPS_CARD,
        "--stdout-json",
    ]
    if not run_fail_autogen:
        aut_cmd.append("--force")
    subprocess.run(aut_cmd, cwd=str(api), env=base_env, check=False)

    # --- 統合成果物（カード固有ファイル名）---
    mv_unified = api / "automation/out/master_verdict_unification_v1/master_verdict.json"
    integrated_learning: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "parent_vps_marker": PARENT_VPS,
        "fail_next_parent_cursor": FAIL_NEXT_PARENT,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "output_contract_refs": _output_contract_refs(api),
        "master_verdict_unification_path": str(mv_unified) if mv_unified.is_file() else None,
        "learning_chain_ok": learning_chain_ok,
        "learning_steps_kg": learning_steps,
        "learning_steps_path": str(learning_steps_path),
        "learning_steps_minimum": {k: steps_minimum[k] for k in steps_minimum if k != "kg_chain"},
        "runtime_seal": {
            "exit_code": rc_seal,
            "seal_dir": str(seal_dir),
            "stdout_tail": seal_out[-8000:],
            "stderr_tail": seal_err[-8000:],
        },
        "improvement": {
            "integrated_final_verdict_path": str(canonical_integrated_path),
            "overall_loop_ok": overall_loop_ok,
            "compose_overall_loop_ok_original": integrated_compose.get("overall_loop_ok"),
            "structural_ok": structural_ok,
            "unified_chat_ts_overall_100": verdict_unified,
            "seal_governor": gov,
            "failure_reasons": failure_reasons,
        },
        "fail_next_cursor_card": FAIL_NEXT_CURSOR,
    }

    # integrated_final_verdict（out_root）の overall_loop_ok は master 統一 + seal + governor
    improvement_ok = bool(learning_chain_ok and overall_loop_ok)
    integrated_learning["integrated_verdict_ok"] = improvement_ok
    integrated_learning["maintained_sealed_candidate"] = improvement_ok
    integrated_learning["ok"] = improvement_ok
    integrated_learning["integrated_final_verdict"] = integrated_kokuzo

    integ_path = out_root / "integrated_learning_verdict.json"
    integ_path.write_text(json.dumps(integrated_learning, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "version": VERSION,
        "card": "TENMON_KOKUZO_LEARNING_IMPROVEMENT_OS_MANIFEST_V1",
        "parent_cursor_card": PARENT_CURSOR,
        "parent_vps_marker": PARENT_VPS,
        "fail_next_parent_cursor": FAIL_NEXT_PARENT,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "seal_dir": str(seal_dir),
        "subsystems": [
            "learning_readonly_reports",
            "learning_kg0_health_gate",
            "learning_kg1_seed",
            "learning_kg2_candidate",
            "learning_kg2b_render",
            "runtime_acceptance_worldclass_seal",
            "seal_governor",
            "residual_quality_adapter",
            "integrated_compose",
            "improvement_ledger",
            "card_autogen",
        ],
        "paths": {
            "integrated_learning_verdict": str(integ_path),
            "integrated_final_verdict": str(canonical_integrated_path),
            "learning_steps": str(learning_steps_path),
            "learning_reports": str(reports_dir),
            "improvement_compose_integrated": str(integrated_compose_path),
            "self_improvement_manifest": str(os_out / "self_improvement_os_manifest.json"),
            "learning_kg0": str(kg0),
            "learning_kg1": str(kg1),
            "learning_kg2": str(kg2),
            "learning_kg2b": str(kg2b),
            "seal_build_log": str(seal_dir / "build.log"),
            "seal_health": str(seal_dir / "health.json"),
            "seal_audit": str(seal_dir / "audit.json"),
            "seal_runtime_matrix": str(seal_dir / "runtime_matrix.json"),
            "seal_final_verdict": str(seal_dir / "final_verdict.json"),
            "os_fail_next_dispatch": str(os_out / "os_fail_next_dispatch.json"),
            "ledger_last_entry": str(os_out / "ledger_last_entry.json"),
            "output_contract_registry": str(api / REGISTRY_JSON),
            "master_verdict_unification": str(api / MASTER_VERDICT_JSON),
        },
    }
    (out_root / "learning_improvement_os_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # next_card_dispatch.json（FAIL 時は RETRY カードへ）
    dispatch_src = _read_json(os_out / "os_fail_next_dispatch.json")
    next_dispatch = {
        "version": VERSION,
        "card": CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "integrated_verdict_ok": improvement_ok,
        "fail_next_cursor_card": FAIL_NEXT_CURSOR,
        "fail_next_parent_cursor": FAIL_NEXT_PARENT,
        "fail_next_vps_hint": VPS_CARD,
        "failure_reasons": failure_reasons,
        "from_os_fail_next_dispatch": dispatch_src,
    }
    (out_root / "next_card_dispatch.json").write_text(
        json.dumps(next_dispatch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    final_out = {
        "version": VERSION,
        "card": CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "integrated_verdict_ok": improvement_ok,
        "learning_chain_ok": learning_chain_ok,
        "runtime_seal_exit_code": rc_seal,
        "overall_loop_ok": overall_loop_ok,
        "structural_ok": structural_ok,
        "unified_chat_ts_overall_100": verdict_unified,
        "failure_reasons": failure_reasons,
        "maintained_sealed_candidate": improvement_ok,
        "fail_next_cursor_card": FAIL_NEXT_CURSOR if not improvement_ok else None,
        "fail_next_parent_cursor": FAIL_NEXT_PARENT if not improvement_ok else None,
    }
    (out_root / "final_verdict.json").write_text(
        json.dumps(final_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # VPS マーカー（空でよい）
    (out_root / "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1").write_text(
        f"{VPS_CARD}\n{_utc_now_iso()}\nintegrated_verdict_ok={improvement_ok}\n",
        encoding="utf-8",
    )

    # Evidence bundle（FAIL 時）
    if not improvement_ok:
        ev = {
            "version": VERSION,
            "generatedAt": _utc_now_iso(),
            "learning_steps": learning_steps,
            "seal_dir": str(seal_dir),
            "runtime_seal_exit_code": rc_seal,
            "integrated_final_verdict": integrated_kokuzo,
            "learning_steps_path": str(learning_steps_path),
            "paths": {
                "integrated_learning_verdict": str(integ_path),
                "integrated_final_verdict": str(canonical_integrated_path),
                "learning_steps": str(learning_steps_path),
                "learning_improvement_os_manifest": str(out_root / "learning_improvement_os_manifest.json"),
            },
        }
        (out_root / "evidence_bundle.json").write_text(
            json.dumps(ev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    summary = {
        "ok": improvement_ok,
        "out_dir": str(out_root),
        "integrated_learning_verdict": str(integ_path),
        "integrated_final_verdict": str(canonical_integrated_path),
        "learning_steps": str(learning_steps_path),
        "learning_improvement_os_manifest": str(out_root / "learning_improvement_os_manifest.json"),
        "final_verdict": str(out_root / "final_verdict.json"),
        "next_card_dispatch": str(out_root / "next_card_dispatch.json"),
        "vps_marker": str(
            out_root / "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1"
        ),
    }
    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    return 0 if improvement_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
