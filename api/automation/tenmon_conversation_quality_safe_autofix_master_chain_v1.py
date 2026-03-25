#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1

会話品質関連 6 カードを順に検証し fail-fast。high-risk 自動編集は行わない。
current-run で build /（任意）health / analyzer 証跡を更新する。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1"

CHAIN: List[Dict[str, Any]] = [
    {
        "id": "TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_CURSOR_AUTO_V1",
        "retry": "TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_CURSOR_AUTO_V1.md",
    },
    {
        "id": "TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1",
        "retry": "TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1.md",
    },
    {
        "id": "TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1",
        "retry": "TENMON_SHORT_INPUT_CONTINUITY_HOLD_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1.md",
    },
    {
        "id": "TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1",
        "retry": "TENMON_FACTUAL_CORRECTION_ROUTE_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1.md",
    },
    {
        "id": "TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1",
        "retry": "TENMON_FACTUAL_WEATHER_ROUTE_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1.md",
    },
    {
        "id": "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1",
        "retry": "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1",
        "constitution": "docs/constitution/TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1.md",
    },
]

# finalize から除去対象となった定型の再混入検知（憲章より）
_SURFACE_LEAK_PHRASE = "語義・作用・読解の軸を分けて読むと、要点が崩れにくいです"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _read_text(p: Path) -> str:
    if not p.is_file():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def _run(cmd: List[str], cwd: Path, env: Optional[Dict[str, str]] = None) -> Tuple[int, str]:
    e = {**os.environ, **(env or {})}
    p = subprocess.run(cmd, cwd=str(cwd), env=e, capture_output=True, text=True, timeout=600)
    out = (p.stdout or "") + (p.stderr or "")
    return p.returncode, out[-8000:]


def verify_surface_finalize(api: Path) -> Tuple[bool, str]:
    fin = api / "src/routes/chat_refactor/finalize.ts"
    t = _read_text(fin)
    if not t.strip():
        return False, "missing_finalize_ts"
    if "TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE" not in t and "stripSurfaceTemplateLeakFinalizeV1" not in t:
        return False, "missing_surface_finalize_marker"
    # 定型文が「返答用の素文字列」として残っていないこと（strip 用 /.../ リテラル内は許容）
    for ln in t.splitlines():
        if _SURFACE_LEAK_PHRASE not in ln:
            continue
        if "/" in ln and ln.strip().startswith("/"):
            continue
        return False, "surface_template_leak_phrase_outside_strip_regex"
    return True, "ok"


def verify_context_carry(api: Path) -> Tuple[bool, str]:
    chat = _read_text(api / "src/routes/chat.ts")
    if "__skipContextCarry" not in chat:
        return False, "missing___skipContextCarry"
    if "TENMON_CONTEXT_CARRY_FACTUAL_SKIP" not in chat and "__skipContextCarry" not in chat:
        return False, "missing_carry_skip_comment"
    return True, "ok"


def verify_short_input_continuity(api: Path) -> Tuple[bool, str]:
    chat = _read_text(api / "src/routes/chat.ts")
    if "__isShortInputContinuityHold" not in chat:
        return False, "missing_short_input_hold"
    return True, "ok"


def verify_factual_correction(api: Path) -> Tuple[bool, str]:
    chat = _read_text(api / "src/routes/chat.ts")
    if "FACTUAL_CORRECTION_V1" not in chat:
        return False, "missing_FACTUAL_CORRECTION_V1"
    if "__isFactualCorrectionUserMessageV1" not in chat:
        return False, "missing_correction_detector"
    return True, "ok"


def verify_factual_weather(api: Path) -> Tuple[bool, str]:
    chat = _read_text(api / "src/routes/chat.ts")
    gt = _read_text(api / "src/routes/chat_refactor/general_trunk_v1.ts")
    wx = _read_text(api / "src/core/weatherRouteV1.ts")
    if "ROUTE_FACTUAL_WEATHER_V1" not in gt:
        return False, "missing_ROUTE_FACTUAL_WEATHER_V1"
    if "fetchWeatherWttrInV1" not in wx:
        return False, "missing_weather_fetch"
    if "ROUTE_FACTUAL_WEATHER_V1" not in chat and "FACTUAL_WEATHER_V1" not in chat:
        return False, "missing_weather_branch_chat"
    return True, "ok"


def verify_constitution(api: Path, rel: str) -> Tuple[bool, str]:
    p = api / rel
    if not p.is_file():
        return False, f"missing_constitution:{rel}"
    return True, "ok"


def run_analyzer_suite(api: Path) -> Tuple[bool, str, Dict[str, Any]]:
    auto = api / "automation"
    rc1, o1 = _run(["python3", str(auto / "conversation_quality_analyzer_v1.py")], api)
    if rc1 != 0:
        return False, f"analyzer_exit_{rc1}:{o1[-400:]}", {}
    rc2, o2 = _run(["python3", str(auto / "conversation_quality_auto_card_generator_v1.py")], api)
    if rc2 != 0:
        return False, f"generator_exit_{rc2}:{o2[-400:]}", {}
    summary_path = auto / "conversation_quality_analyzer_summary.json"
    try:
        summary = json.loads(_read_text(summary_path))
    except json.JSONDecodeError:
        return False, "invalid_analyzer_summary_json", {}
    ok = (
        summary.get("conversation_quality_analysis_ok") is True
        and summary.get("problem_patterns_detected") is True
        and summary.get("auto_fix_cards_generated") is True
        and summary.get("safe_auto_fix_only") is True
    )
    if not ok:
        return False, f"analyzer_flags:{json.dumps({k: summary.get(k) for k in ('conversation_quality_analysis_ok','problem_patterns_detected','auto_fix_cards_generated','safe_auto_fix_only')})}", summary
    gen_path = auto / "conversation_quality_generated_cards.json"
    try:
        gen = json.loads(_read_text(gen_path))
    except json.JSONDecodeError:
        return False, "invalid_generated_cards_json", summary
    cands = gen.get("candidates") or []
    if not isinstance(cands, list) or len(cands) < 1:
        return False, "no_safe_candidates", summary
    for c in cands:
        if c.get("safe_auto_fix") is not True:
            return False, "unsafe_candidate_in_safe_slot", summary
    hum = gen.get("requires_human_approval_cards") or []
    for h in hum:
        if h.get("requires_human_approval") is not True:
            return False, "human_card_missing_flag", summary
    return True, "ok", {"summary": summary, "generated": gen}


def run_npm_build(api: Path) -> Tuple[bool, str]:
    rc, tail = _run(["npm", "run", "build"], api)
    return rc == 0, tail


def run_health_khs(api: Path, out_sub: str = "cq_master_khs_v1") -> Tuple[bool, str, Dict[str, Any]]:
    """KG0_EXIT_ZERO を無効化し、final_verdict を評価。"""
    if os.environ.get("TENMON_CQ_MASTER_HEALTH_OPTIONAL", "").strip().lower() in ("1", "true", "yes"):
        return True, "health_skipped_optional", {"verdict": "SKIPPED", "db_error": None}
    out_dir = api / "automation" / "out" / out_sub
    khs = api / "automation" / "khs_health_gate_v1.py"
    env = {"KG0_EXIT_ZERO": "0"}
    rc, _ = _run(
        ["python3", str(khs), "--out-dir", str(out_dir)],
        api,
        env=env,
    )
    fv_path = out_dir / "final_verdict.json"
    fv: Dict[str, Any] = {}
    if fv_path.is_file():
        try:
            fv = json.loads(fv_path.read_text(encoding="utf-8", errors="replace"))
        except json.JSONDecodeError:
            pass
    verdict = str(fv.get("verdict") or "")
    ok = verdict == "PASS" and not fv.get("db_error")
    return ok, verdict or f"exit_{rc}", fv


def write_retry_card(api: Path, retry_id: str, failed_step: str, detail: str) -> Path:
    gen_dir = api / "automation" / "generated_cursor_apply"
    gen_dir.mkdir(parents=True, exist_ok=True)
    path = gen_dir / f"{retry_id}.md"
    body = "\n".join(
        [
            f"# {retry_id}",
            "",
            "（マスターチェーン fail-fast により自動生成。**このカード 1 枚だけ**実行して stop。）",
            "",
            f"- failed_step: `{failed_step}`",
            f"- detail: `{detail[:2000]}`",
            "",
            "## 方針",
            "",
            "- 最小 diff",
            "- 該当憲章の NON-NEGOTIABLES を再確認",
            "- 成功後に `tenmon_conversation_quality_safe_autofix_master_chain_v1.py` を再実行",
            "",
        ]
    )
    path.write_text(body, encoding="utf-8")
    return path


STEP_CHECKS: List[Tuple[str, Callable[[Path], Tuple[bool, str]]]] = [
    ("surface_finalize", verify_surface_finalize),
    ("context_carry_skip", verify_context_carry),
    ("short_input_continuity", verify_short_input_continuity),
    ("factual_correction", verify_factual_correction),
    ("factual_weather", verify_factual_weather),
]


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    chain_start = utc()
    t_wall_start = time.time()

    step_results: List[Dict[str, Any]] = []
    failed_at: Optional[str] = None
    retry_card: Optional[str] = None
    fail_detail = ""

    for i, meta in enumerate(CHAIN):
        cid = meta["id"]
        retry = meta["retry"]
        const_rel = meta["constitution"]
        ok_c, reason_c = verify_constitution(api, const_rel)
        step_results.append({"card": cid, "phase": "constitution", "pass": ok_c, "detail": reason_c})
        if not ok_c:
            failed_at = cid
            retry_card = retry
            fail_detail = reason_c
            break

        if i < len(STEP_CHECKS):
            name, fn = STEP_CHECKS[i]
            ok_s, det = fn(api)
            step_results.append({"card": cid, "phase": f"static:{name}", "pass": ok_s, "detail": det})
            if not ok_s:
                failed_at = cid
                retry_card = retry
                fail_detail = det
                break
        else:
            ok_a, det_a, extra = run_analyzer_suite(api)
            step_results.append({"card": cid, "phase": "analyzer+generator", "pass": ok_a, "detail": det_a})
            if not ok_a:
                failed_at = cid
                retry_card = retry
                fail_detail = det_a
                break

    if failed_at is None:
        ok_b, tail_b = run_npm_build(api)
        step_results.append({"card": "npm_run_build", "phase": "build", "pass": ok_b, "detail": tail_b[-1200:]})
        if not ok_b:
            failed_at = "npm_run_build"
            retry_card = "TENMON_CONVERSATION_QUALITY_SAFE_AUTOFIX_MASTER_CHAIN_BUILD_RETRY_CURSOR_AUTO_V1"
            fail_detail = "npm_run_build_failed"

    health_fv: Dict[str, Any] = {}
    if failed_at is None:
        ok_h, det_h, health_fv = run_health_khs(api)
        step_results.append({"card": "KHS_HEALTH_GATE", "phase": "health", "pass": ok_h, "detail": det_h})
        if not ok_h:
            failed_at = "KHS_HEALTH_GATE"
            retry_card = "TENMON_KG0_KHS_HEALTH_GATE_RETRY_CURSOR_AUTO_V1"
            fail_detail = det_h

    audit_pass = failed_at is None
    audit_note = "coherence_ok" if failed_at is None else f"prior_failure:{failed_at}"
    if failed_at is None:
        gen_path = auto / "conversation_quality_generated_cards.json"
        sum_path = auto / "conversation_quality_analyzer_summary.json"
        try:
            gen_m = gen_path.stat().st_mtime
            sum_m = sum_path.stat().st_mtime
            # 本実行より前にだけ更新されていた成果物は stale（キャッシュ成功の禁止）
            if gen_m < t_wall_start - 2 or sum_m < t_wall_start - 2:
                audit_pass = False
                audit_note = "stale_analyzer_artifacts"
                failed_at = "AUDIT_STALE_TRUTH"
                retry_card = "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1"
                fail_detail = audit_note
        except OSError:
            audit_pass = False
            failed_at = "AUDIT_MISSING_ARTIFACT"
            retry_card = "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1"
            fail_detail = "missing_summary_or_generated"

    step_results.append({"card": "AUDIT_FRESH_ARTIFACTS", "phase": "audit", "pass": audit_pass, "detail": audit_note})

    master_pass = failed_at is None

    retry_path: Optional[str] = None
    if not master_pass and retry_card:
        retry_path = str(write_retry_card(api, retry_card, failed_at or "", fail_detail))

    surf_ok, _surf = verify_surface_finalize(api)
    final_acceptance = {
        "template_surface_leak_static_zero": surf_ok,
        "context_carry_skip_present": "__skipContextCarry" in _read_text(api / "src/routes/chat.ts"),
        "short_input_continuity_present": "__isShortInputContinuityHold" in _read_text(api / "src/routes/chat.ts"),
        "correction_route_present": "FACTUAL_CORRECTION_V1" in _read_text(api / "src/routes/chat.ts"),
        "weather_route_present": "ROUTE_FACTUAL_WEATHER_V1" in _read_text(api / "src/routes/chat_refactor/general_trunk_v1.ts"),
        "analyzer_auto_extract": False,
        "safe_generated_cards": False,
        "build_pass": any(s.get("card") == "npm_run_build" and s.get("pass") for s in step_results),
        "health_pass": any(s.get("card") == "KHS_HEALTH_GATE" and s.get("pass") for s in step_results),
        "audit_pass": audit_pass and master_pass,
    }

    if master_pass:
        try:
            s = json.loads(_read_text(auto / "conversation_quality_analyzer_summary.json"))
            final_acceptance["analyzer_auto_extract"] = bool(s.get("problem_patterns_detected"))
            g = json.loads(_read_text(auto / "conversation_quality_generated_cards.json"))
            final_acceptance["safe_generated_cards"] = len(g.get("candidates") or []) >= 1
        except (json.JSONDecodeError, OSError):
            pass

    out: Dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "chain_started_at": chain_start,
        "master_pass": master_pass,
        "steps": step_results,
        "failed_card": failed_at,
        "retry_card": retry_card,
        "retry_card_path": retry_path,
        "single_retry_only": True,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": retry_card,
        "final_acceptance": final_acceptance,
        "health_final_verdict_head": {k: health_fv.get(k) for k in ("verdict", "db_error") if health_fv},
        "policy_notes": {
            "safe_autofix_only_auto_fixable_true": "generator は analyzer の safe 候補のみ。chat.ts 自動編集は本チェーンでは行わない。",
            "health_optional_env": "TENMON_CQ_MASTER_HEALTH_OPTIONAL=1 で KHS を常にスキップ可能（開発用）。",
        },
    }

    summary_path = auto / "tenmon_conversation_quality_safe_autofix_master_summary.json"
    report_path = auto / "tenmon_conversation_quality_safe_autofix_master_report.md"
    write_json(summary_path, out)

    lines = [
        f"# {CARD}",
        "",
        f"- master_pass: **{master_pass}**",
        f"- failed_card: `{failed_at}`",
        f"- retry_card: `{retry_card}`",
        f"- retry_card_path: `{retry_path}`",
        "",
        "## Final acceptance",
        "",
        "```json",
        json.dumps(final_acceptance, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Steps",
        "",
    ]
    for s in step_results:
        lines.append(f"- `{s.get('card')}` / {s.get('phase')}: pass={s.get('pass')} — {s.get('detail', '')[:160]}")
    lines.extend(["", f"- **next_on_pass**: `{NEXT_ON_PASS}`", ""])
    report_path.write_text("\n".join(lines), encoding="utf-8")

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
