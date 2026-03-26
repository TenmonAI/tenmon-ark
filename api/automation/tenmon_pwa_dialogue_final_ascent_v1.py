#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1

K1 / SUBCONCEPT / GENERAL 改修後の lived proof と worldclass score を
単一サマリに再観測する（score は scorecard のコピーのみ。成功の捏造なし）。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_pwa_dialogue_final_ascent_summary.json"
NEXT_ON_PASS = "TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。final ascent retry 1枚のみ生成。"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _parse_iso(ts: str | None) -> float | None:
    if not ts or not isinstance(ts, str):
        return None
    s = ts.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s).timestamp()
    except Exception:
        return None


def _run_script(api: Path, auto: Path, rel: str, extra: list[str] | None = None) -> dict[str, Any]:
    p = auto / rel
    if not p.is_file():
        return {"script": rel, "exit_code": None, "skipped": True, "error": "missing"}
    cmd = [sys.executable, str(p)]
    if extra:
        cmd.extend(extra)
    try:
        r = subprocess.run(cmd, cwd=str(api), capture_output=True, text=True, timeout=7200, check=False)
        return {
            "script": rel,
            "exit_code": r.returncode,
            "stdout_tail": (r.stdout or "")[-3500:],
            "stderr_tail": (r.stderr or "")[-2000:],
        }
    except Exception as e:
        return {"script": rel, "exit_code": None, "error": str(e)[:400]}


def _pwa_lived_blockers_in_scorecard(must_fix: list[Any]) -> list[str]:
    out: list[str] = []
    for x in must_fix:
        if not isinstance(x, str):
            continue
        s = x.strip()
        if s.lower().startswith("pwa_lived_proof:") or "pwa_lived" in s.lower():
            out.append(s)
    return out[:40]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_FINAL_ASCENT_API_BASE", os.environ.get("TENMON_PWA_SEAL_API_BASE", "http://127.0.0.1:3000"))
    base = str(base).strip().rstrip("/")
    out_sub = auto / "out" / "pwa_dialogue_final_ascent_run"
    out_sub.mkdir(parents=True, exist_ok=True)

    steps: list[dict[str, Any]] = []

    # 1) PWA lived: refresh / new chat / continuity（実 API）
    lived_extra = [str(repo), str(out_sub), base]
    lived_r = _run_script(api, auto, "tenmon_pwa_lived_completion_seal_v1.py", lived_extra)
    steps.append({"step": "pwa_lived_probes_refresh_new_chat_continuity", "probe_group": "pwa_refresh_new_chat_continuity", **lived_r})

    # 2) Dialogue loop: analyzer → cards bridge → scorecard（K1 / GENERAL / SUBCONCEPT / continuity 軸）
    loop_r = _run_script(api, auto, "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py")
    steps.append({"step": "dialogue_acceptance_priority_loop_k1_general_subconcept_continuity", "probe_group": "k1_general_subconcept_continuity", **loop_r})

    # 3) Scorecard 単体で再集計（lived 更新後の subsystem を単一真実に寄せる）
    sc_r = _run_script(api, auto, "tenmon_worldclass_acceptance_scorecard_v1.py")
    steps.append({"step": "tenmon_worldclass_acceptance_scorecard_v1", "probe_group": "scorecard_refresh", **sc_r})

    readiness = _read_json(auto / "pwa_lived_completion_readiness.json")
    lived_report = _read_json(auto / "pwa_lived_completion_seal_report.json")
    lived_blockers = _read_json(auto / "pwa_lived_completion_blockers.json")
    blocker_list: list[str] = []
    if isinstance(lived_blockers.get("blockers"), list):
        blocker_list = [str(x) for x in lived_blockers["blockers"] if isinstance(x, str)]

    sc = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    loop_out = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json")
    cq = _read_json(auto / "tenmon_conversation_quality_priority_summary.json")
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")

    lived_ts = _parse_iso(str(readiness.get("generated_at") or lived_report.get("generated_at") or ""))
    sc_ts = _parse_iso(str(sc.get("generated_at") or ""))
    stale_scorecard_vs_lived = False
    if lived_ts and sc_ts and sc_ts + 1.0 < lived_ts:
        stale_scorecard_vs_lived = True

    stale_dialogue = bool(cq.get("stale_sources_present"))

    lived_proof_ready = bool(readiness.get("final_ready")) is True
    if readiness.get("env_failure") is True:
        lived_proof_ready = False

    # worldclass_score: scorecard コピーのみ（欠落時は null、計算しない）
    worldclass_score: int | float | None = sc.get("score_percent")
    if not isinstance(worldclass_score, (int, float)):
        worldclass_score = None

    scorecard_snapshot = {
        "score_percent": worldclass_score,
        "score_total": sc.get("score_total"),
        "score_max": sc.get("score_max"),
        "generated_at": sc.get("generated_at"),
        "sealed_operable_ready": sc.get("sealed_operable_ready"),
        "worldclass_ready": sc.get("worldclass_ready"),
        "primary_gap": sc.get("primary_gap"),
        "recommended_next_card": sc.get("recommended_next_card"),
        "next_best_card": sc.get("next_best_card"),
    }

    must_fix = sc.get("must_fix_before_claim") if isinstance(sc.get("must_fix_before_claim"), list) else []
    pwa_sc_blockers = _pwa_lived_blockers_in_scorecard(must_fix)

    wc_ready = bool(sc.get("worldclass_ready"))
    sealed_ok = bool(sc.get("sealed_operable_ready"))

    dialogue_findings = cq.get("dialogue_quality_findings") if isinstance(cq.get("dialogue_quality_findings"), dict) else {}
    probe_axis_observation = {
        "k1_depth": {"finding_key": "k1_trace_empty_short_response", "flag": bool(dialogue_findings.get("k1_trace_empty_short_response"))},
        "general_substance": {
            "finding_keys": ["general_knowledge_insufficient_substance", "self_view_not_tenmon_authentic"],
            "flag": bool(
                dialogue_findings.get("general_knowledge_insufficient_substance")
                or dialogue_findings.get("self_view_not_tenmon_authentic")
            ),
        },
        "subconcept": {"finding_key": "subconcept_template_leak_or_context_bleed", "flag": bool(dialogue_findings.get("subconcept_template_leak_or_context_bleed"))},
        "continuity": {
            "dialogue_finding_key": "pwa_continuity_unproven_or_failed",
            "dialogue_flag": bool(dialogue_findings.get("pwa_continuity_unproven_or_failed")),
            "lived_readiness_path": str(auto / "pwa_lived_completion_readiness.json"),
        },
        "pwa_refresh_new_chat": {"lived_seal_script": "tenmon_pwa_lived_completion_seal_v1.py", "readiness_final_ready": bool(readiness.get("final_ready"))},
    }

    blocked_reasons: list[str] = []
    if not lived_proof_ready:
        blocked_reasons.append("lived_proof:not_final_ready")
    if blocker_list:
        blocked_reasons.extend([f"lived_blocker:{x}" for x in blocker_list[:30]])
    if stale_dialogue:
        blocked_reasons.append("stale_dialogue_evidence")
    if stale_scorecard_vs_lived:
        blocked_reasons.append("stale_scorecard_older_than_lived_proof_run")
    if pwa_sc_blockers:
        blocked_reasons.extend([f"scorecard_pwa_lived:{x}" for x in pwa_sc_blockers[:20]])
    if not wc_ready:
        blocked_reasons.append("scorecard:worldclass_ready_false")
    if not sealed_ok:
        blocked_reasons.append("scorecard:sealed_operable_ready_false")
    if loop_r.get("exit_code") not in (0, None):
        if loop_r.get("exit_code") is not None:
            blocked_reasons.append("dialogue_priority_loop_nonzero_exit")
    if sc_r.get("exit_code") not in (0, None):
        if sc_r.get("exit_code") is not None:
            blocked_reasons.append("scorecard_refresh_nonzero_exit")

    loop_outputs = loop_out.get("outputs") if isinstance(loop_out.get("outputs"), dict) else {}
    next_best_card = (
        loop_outputs.get("next_best_card")
        or forensic.get("next_best_card")
        or sc.get("next_best_card")
        or sc.get("recommended_next_card")
    )
    if next_best_card is not None:
        next_best_card = str(next_best_card).strip() or None

    dialogue_final_ascent_ready = (
        lived_proof_ready
        and wc_ready
        and sealed_ok
        and not stale_dialogue
        and not stale_scorecard_vs_lived
        and len(pwa_sc_blockers) == 0
        and loop_r.get("exit_code") == 0
        and sc_r.get("exit_code") == 0
    )

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "dialogue_final_ascent_ready": bool(dialogue_final_ascent_ready),
        "lived_proof_ready": bool(lived_proof_ready),
        "worldclass_score": worldclass_score,
        "scorecard_snapshot": scorecard_snapshot,
        "blocked_reasons": sorted(set(blocked_reasons)),
        "next_best_card": next_best_card,
        "probe_groups_run": [
            "k1_general_subconcept_continuity_via_dialogue_loop",
            "pwa_refresh_new_chat_continuity_via_lived_seal",
            "scorecard_refresh_post_lived",
        ],
        "probe_axis_observation": probe_axis_observation,
        "evidence": {
            "lived_readiness_path": str(auto / "pwa_lived_completion_readiness.json"),
            "lived_report_path": str(auto / "pwa_lived_completion_seal_report.json"),
            "scorecard_path": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "dialogue_loop_path": str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"),
            "conversation_quality_priority_path": str(auto / "tenmon_conversation_quality_priority_summary.json"),
            "forensic_path": str(auto / "tenmon_autonomy_current_state_forensic.json"),
            "lived_generated_at": readiness.get("generated_at"),
            "scorecard_generated_at": sc.get("generated_at"),
            "stale_scorecard_vs_lived": stale_scorecard_vs_lived,
            "stale_dialogue_sources": stale_dialogue,
            "scorecard_worldclass_ready": wc_ready,
            "scorecard_sealed_operable_ready": sealed_ok,
            "pwa_lived_must_fix_hits": pwa_sc_blockers,
        },
        "steps": steps,
        "notes": [
            "worldclass_score は tenmon_worldclass_acceptance_scorecard.json の score_percent をコピーしただけ（欠落時 null）。",
            "dialogue_final_ascent_ready は lived final_ready + scorecard gates + 非stale + PWA lived 系 must_fix なし + loop/scorecard exit 0。",
        ],
    }

    _write_json(auto / OUT_JSON, summary)
    print(
        json.dumps(
            {
                "ok": True,
                "path": str(auto / OUT_JSON),
                "dialogue_final_ascent_ready": dialogue_final_ascent_ready,
                "worldclass_score": worldclass_score,
                "lived_proof_ready": lived_proof_ready,
            },
            ensure_ascii=False,
        ),
        file=sys.stdout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
