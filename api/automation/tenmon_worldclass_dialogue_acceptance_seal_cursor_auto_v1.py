#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1

既存 scorecard + tenmon_latest_state_rejudge_summary.fresh_probe_digest を入力に、
会話 worldclass acceptance を採点し、CASE A/B/C を判定する（集計のみ・product 改変なし）。

- CASE A: worldclass pass 相当 + dialogue 5 軸 green + PWA 維持 → seal 準備
- CASE B: 1 軸のみ red → primary_gap に軸名、next_card はその軸向け（補修は別工程）
- CASE C: 2 軸以上 red → 今回は修正せず recommended_next を next_card_if_fail に
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json"
OUT_MD = "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.md"
SCORECARD_SCRIPT = "tenmon_worldclass_acceptance_scorecard_v1.py"

# 1 軸のみ不足時の推奨 next card（本リポの route/selfaware/surface 最小カードと整合）
AXIS_NEXT_CARD: dict[str, str] = {
    "route": "TENMON_ROUTE_SOVEREIGNTY_FINAL_CLOSE_CURSOR_AUTO_V1",
    "continuity": "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1",
    "scripture": "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "selfaware": "TENMON_SELFAWARE_ROUTE_FAMILY_NORMALIZE_CURSOR_AUTO_V1",
    "surface": "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1",
}

PRIORITY_LOOP_SCRIPT = "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py"
PRIORITY_LOOP_JSON = "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _run_py(auto: Path, api: Path, script: str) -> dict[str, Any]:
    p = auto / script
    if not p.is_file():
        return {"script": script, "skipped": True}
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
    )
    return {
        "script": script,
        "exit_code": r.returncode,
        "stdout_tail": (r.stdout or "")[-2500:],
        "stderr_tail": (r.stderr or "")[-1200:],
    }


def _run_scorecard(auto: Path, api: Path) -> dict[str, Any]:
    p = auto / SCORECARD_SCRIPT
    if not p.is_file():
        return {"exit_code": None, "skipped": True, "error": "scorecard_missing"}
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


def _probe_summary_from_digest(fp: dict[str, Any]) -> dict[str, bool]:
    """fresh_probe_digest から 5 軸を fail-closed に評価。"""
    if not fp:
        return {k: False for k in ("route_ok", "continuity_ok", "scripture_ok", "selfaware_ok", "surface_ok")}

    cont_len = fp.get("continuity_followup_len")
    cdu = fp.get("continuity_density_unresolved")
    continuity_ok = isinstance(cont_len, (int, float)) and float(cont_len) >= 80.0 and cdu is not True

    kh = fp.get("k1_probe_hokke") if isinstance(fp.get("k1_probe_hokke"), dict) else {}
    kk = fp.get("k1_probe_kukai") if isinstance(fp.get("k1_probe_kukai"), dict) else {}
    scripture_ok = bool(kh.get("satisfied")) and bool(kk.get("satisfied"))

    gen = fp.get("general_probe") if isinstance(fp.get("general_probe"), dict) else {}
    route_ok = bool(gen.get("satisfied"))

    ai = fp.get("ai_consciousness_lock_probe") if isinstance(fp.get("ai_consciousness_lock_probe"), dict) else {}
    selfaware_ok = bool(ai.get("satisfied"))

    sub = fp.get("subconcept_probe") if isinstance(fp.get("subconcept_probe"), dict) else {}
    surface_ok = bool(sub.get("satisfied"))

    return {
        "route_ok": route_ok,
        "continuity_ok": continuity_ok,
        "scripture_ok": scripture_ok,
        "selfaware_ok": selfaware_ok,
        "surface_ok": surface_ok,
    }


def _failed_axes(ps: dict[str, bool]) -> list[str]:
    key_map = {
        "route_ok": "route",
        "continuity_ok": "continuity",
        "scripture_ok": "scripture",
        "selfaware_ok": "selfaware",
        "surface_ok": "surface",
    }
    out: list[str] = []
    for k in ("route_ok", "continuity_ok", "scripture_ok", "selfaware_ok", "surface_ok"):
        if not ps.get(k):
            out.append(key_map[k])
    return out


def _pwa_ok(lived: dict[str, Any]) -> bool:
    if not lived:
        return False
    return bool(lived.get("final_ready") is True)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    loop_run: dict[str, Any] | None = None
    if os.environ.get("TENMON_DIALOGUE_SEAL_RUN_PRIORITY_LOOP", "").strip() in ("1", "true", "yes"):
        loop_run = _run_py(auto, api, PRIORITY_LOOP_SCRIPT)

    sc_run = _run_scorecard(auto, api)
    sc = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    rj = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    lived = _read_json(auto / "pwa_lived_completion_readiness.json")

    fp = rj.get("fresh_probe_digest") if isinstance(rj.get("fresh_probe_digest"), dict) else {}
    stale = bool(rj.get("stale_sources_present"))
    ps = _probe_summary_from_digest(fp if not stale else {})

    wc_sc = bool(sc.get("worldclass_ready"))
    must_fix = [str(x) for x in (sc.get("must_fix_before_claim") or []) if str(x).strip()]
    primary_gap_sc = sc.get("primary_gap")
    if primary_gap_sc is not None:
        primary_gap_sc = str(primary_gap_sc).strip() or None
    rec_next = str(sc.get("recommended_next_card") or sc.get("next_best_card") or "").strip() or None
    rj_next = str(rj.get("recommended_next_card") or "").strip() or None
    if rj_next:
        rec_next = rj_next

    pl = _read_json(auto / PRIORITY_LOOP_JSON)

    pwa = _pwa_ok(lived)
    failed = _failed_axes(ps)
    n_fail = len(failed)

    # 主 blocker: scorecard must_fix + rejudge remaining（採点入力の事実）
    rj_block = [str(x) for x in (rj.get("remaining_blockers") or []) if str(x).strip()]
    top_blockers = list(dict.fromkeys(must_fix + rj_block))[:40]

    primary_gap: str | None = None
    next_card_if_fail: str | None = None
    case = "C"

    if stale:
        case = "C"
        primary_gap = "stale_evidence"
        next_card_if_fail = rec_next or "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
    elif n_fail == 0:
        case = "A"
        primary_gap = None
    elif n_fail == 1:
        case = "B"
        primary_gap = failed[0]
        next_card_if_fail = AXIS_NEXT_CARD.get(failed[0]) or rec_next
    else:
        case = "C"
        primary_gap = "multi_axis"
        next_card_if_fail = rec_next or "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1"

    pl_next = str((pl.get("outputs") or {}).get("next_best_card") or pl.get("next_best_card") or "").strip() or None
    if case == "C" and pl_next:
        next_card_if_fail = pl_next
    elif case == "B" and not next_card_if_fail and pl_next:
        next_card_if_fail = pl_next

    dialogue_green = n_fail == 0 and not stale
    wc_ready = bool(wc_sc and dialogue_green and pwa and len(must_fix) == 0)

    # ok: PASS 条件（scorecard worldclass + 5 軸 green + PWA + stale なし + 主 blocker 0）
    ok = bool(
        wc_ready
        and ps["route_ok"]
        and ps["continuity_ok"]
        and ps["scripture_ok"]
        and ps["selfaware_ok"]
        and ps["surface_ok"]
        and not stale
    )

    if case != "A" and ok:
        ok = False

    ts = _utc()
    summary = {
        "ok": ok,
        "card": CARD,
        "worldclass_ready": wc_ready,
        "primary_gap": primary_gap if not ok else None,
        "top_blockers": top_blockers if not ok else [],
        "probe_summary": {
            "route_ok": ps["route_ok"],
            "continuity_ok": ps["continuity_ok"],
            "scripture_ok": ps["scripture_ok"],
            "selfaware_ok": ps["selfaware_ok"],
            "surface_ok": ps["surface_ok"],
        },
        "rollback_used": False,
        "next_card_if_fail": None if ok else (next_card_if_fail or rec_next),
    }
    out: dict[str, Any] = {
        **summary,
        "generated_at": ts,
        "case": case,
        "failed_axes": failed,
        "pwa_connection_ok": pwa,
        "stale_sources_present": stale,
        "scorecard_snapshot": {
            "worldclass_ready": wc_sc,
            "score_percent": sc.get("score_percent"),
            "primary_gap": primary_gap_sc,
            "recommended_next_card": sc.get("recommended_next_card"),
        },
        "steps": {
            "tenmon_worldclass_acceptance_scorecard_v1": sc_run,
            "tenmon_worldclass_dialogue_acceptance_priority_loop_v1": loop_run,
        },
        "inputs": {
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "dialogue_priority_loop": str(auto / PRIORITY_LOOP_JSON),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "pwa_lived": str(auto / "pwa_lived_completion_readiness.json"),
        },
        "priority_loop_snapshot": {
            "next_best_card": pl_next,
            "acceptance_seal_allowed": (pl.get("outputs") or {}).get("acceptance_seal_allowed"),
        },
        "notes": [
            "probe_summary は tenmon_latest_state_rejudge_summary.json の fresh_probe_digest を唯一のソースとする（無ければ fail-closed）。",
            "stale_sources_present の場合は採点を信頼せず CASE C。",
            "CASE B: 最小補修は next_card のカードを実行してから本スクリプトで再採点（本スクリプトはコード改変しない）。",
            "CASE C: 2 軸以上は補修停止。TENMON_DIALOGUE_SEAL_RUN_PRIORITY_LOOP=1 で priority loop を先に実行可。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **ok**: `{ok}`",
        f"- **case**: `{case}`",
        f"- **worldclass_ready**: `{wc_ready}`",
        f"- **primary_gap**: `{out['primary_gap']}`",
        f"- **next_card_if_fail**: `{out['next_card_if_fail']}`",
        "",
        "## probe_summary",
        "",
        json.dumps(out["probe_summary"], ensure_ascii=False, indent=2),
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
