#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_AND_PRIORITY_LOOP_CURSOR_AUTO_V1

current-run 証跡（health 任意・既存 verdict JSON）を入力に、
会話品質分析 → next cards → acceptance scorecard を順に束ね、
queue-driven 改善ループ用の単一アウトプットを書き出す。

- score は既存 scorecard の score_percent のみ（捏造なし）
- fixture 成功の偽装はしない
- stale truth はフラグで明示
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_AND_PRIORITY_LOOP_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"
OUT_MD = "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.md"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _probe_health(base: str) -> dict[str, Any]:
    base = base.rstrip("/")
    url = f"{base}/api/health"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=12) as r:
            code = int(getattr(r, "status", r.getcode()))
    except urllib.error.HTTPError as e:
        return {"attempted": True, "url": url, "http_code": int(e.code), "ok": False, "at": _utc_now_iso()}
    except Exception as e:
        return {"attempted": True, "url": url, "http_code": None, "ok": False, "error": str(e)[:200], "at": _utc_now_iso()}
    ok = 200 <= code < 300
    return {"attempted": True, "url": url, "http_code": code, "ok": ok, "at": _utc_now_iso()}


def _run_py(auto: Path, script: str, cwd: Path) -> dict[str, Any]:
    p = auto / script
    if not p.is_file():
        return {"script": script, "exit_code": None, "skipped": True, "error": "file_missing"}
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=600,
    )
    tail = (r.stdout or "")[-4000:]
    return {
        "script": script,
        "exit_code": r.returncode,
        "stdout_tail": tail,
        "stderr_tail": (r.stderr or "")[-2000:],
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    run_id = _utc_now_iso()
    steps: list[dict[str, Any]] = []

    probe_base = os.environ.get("TENMON_LOOP_PROBE_BASE", "").strip()
    health_evidence = _probe_health(probe_base) if probe_base else {"attempted": False, "note": "set TENMON_LOOP_PROBE_BASE for live /api/health evidence"}

    steps.append({"step": "current_run_health_probe", "result": health_evidence})

    ana = _run_py(auto, "conversation_quality_analyzer_v1.py", api)
    steps.append({"step": "conversation_quality_analyzer_v1", **ana})
    if ana.get("exit_code") != 0:
        err_out = {
            "card": CARD,
            "run_id": run_id,
            "ok": False,
            "error": "conversation_quality_analyzer_failed",
            "steps": steps,
        }
        (auto / OUT_JSON).write_text(json.dumps(err_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return 1

    gen_step = _run_py(auto, "conversation_quality_auto_card_generator_v1.py", api)
    steps.append({"step": "conversation_quality_auto_card_generator_v1", **gen_step})

    # optional bridge (read-only aggregate)
    bridge_path = auto / "improvement_quality_bridge_v1.py"
    if bridge_path.is_file():
        steps.append({"step": "improvement_quality_bridge_v1", **_run_py(auto, "improvement_quality_bridge_v1.py", api)})

    steps.append({"step": "tenmon_worldclass_acceptance_scorecard_v1", **_run_py(auto, "tenmon_worldclass_acceptance_scorecard_v1.py", api)})

    cq = _read_json(auto / "tenmon_conversation_quality_priority_summary.json")
    gen = _read_json(auto / "conversation_quality_generated_cards.json")
    sc = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    sysv = _read_json(auto / "tenmon_system_verdict.json")

    stale = bool(cq.get("stale_sources_present"))
    overall_band = (
        (sc.get("signals") or {}).get("overall_band")
        if isinstance(sc.get("signals"), dict)
        else None
    ) or sysv.get("overall_band") or "unknown"

    worldclass_score = sc.get("score_percent")
    if worldclass_score is None:
        worldclass_score = None  # explicit: no fabrication

    sealed_ok = bool(sc.get("sealed_operable_ready"))
    wc_ready = bool(sc.get("worldclass_ready"))
    must_fix = list(sc.get("must_fix_before_claim") or [])[:80]

    safe_cards: list[str] = []
    for c in gen.get("candidates") or []:
        if isinstance(c, dict) and c.get("safe_auto_fix") is True:
            cid = str(c.get("card_id") or "").strip()
            if cid and not cid.startswith("HUMAN_REVIEW_"):
                safe_cards.append(cid)

    next_best = cq.get("next_best_card") if not stale else None
    if not next_best:
        next_best = sc.get("recommended_next_card") or sc.get("primary_gap")

    blockers: list[str] = []
    if stale:
        blockers.append("stale_evidence: conversation/probe data missing or older than policy window")
    blockers.extend(must_fix[:40])
    pf = cq.get("prioritized_axes") if isinstance(cq.get("prioritized_axes"), list) else []
    if pf:
        blockers.append(f"dialogue_priority_axes: {', '.join(str(x) for x in pf[:8])}")

    # acceptance seal: product rule — scorecard sealed path + no stale dialogue evidence
    acceptance_seal_allowed = bool(sealed_ok and wc_ready and not stale)

    out: dict[str, Any] = {
        "card": CARD,
        "run_id": run_id,
        "generated_at": _utc_now_iso(),
        "ok": True,
        "outputs": {
            "overall_completion_band": overall_band,
            "worldclass_score": worldclass_score,
            "worldclass_ready": wc_ready,
            "sealed_operable_ready": sealed_ok,
            "current_blockers": blockers,
            "next_best_card": next_best,
            "safe_next_cards": safe_cards[:12],
            "acceptance_seal_allowed": acceptance_seal_allowed,
        },
        "dialogue_quality": {
            "stale_sources_present": stale,
            "stale_sources": cq.get("stale_sources") or [],
            "recommended_next_cards": cq.get("recommended_next_cards") or [],
            "quality_findings_axes": [
                k
                for k, v in (cq.get("counts") or {}).items()
                if int(v or 0) > 0
            ],
        },
        "scorecard_snapshot": {
            "primary_gap": sc.get("primary_gap"),
            "score_total": sc.get("score_total"),
            "score_max": sc.get("score_max"),
            "recommended_next_card": sc.get("recommended_next_card"),
        },
        "inputs_resolved": {
            "priority_summary": str(auto / "tenmon_conversation_quality_priority_summary.json"),
            "generated_cards": str(auto / "conversation_quality_generated_cards.json"),
            "acceptance_scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "system_verdict": str(auto / "tenmon_system_verdict.json"),
        },
        "steps": steps,
        "notes": [
            "worldclass_score は tenmon_worldclass_acceptance_scorecard.json の score_percent のコピーのみ。",
            "acceptance_seal_allowed は sealed_operable_ready && worldclass_ready && not stale_sources_present（会話証跡）。",
            "fixture 成功の偽装は行わない。TENMON_LOOP_PROBE_BASE を設定すると current-run health を記録。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- run_id: `{run_id}`",
        f"- **overall_completion_band**: `{out['outputs']['overall_completion_band']}`",
        f"- **worldclass_score**: `{out['outputs']['worldclass_score']}`",
        f"- **acceptance_seal_allowed**: `{acceptance_seal_allowed}`",
        f"- **next_best_card**: `{next_best}`",
        "",
        "## safe_next_cards",
        "",
    ]
    for c in safe_cards[:12]:
        md.append(f"- `{c}`")
    md.extend(["", "## current_blockers (sample)", ""])
    for b in blockers[:25]:
        md.append(f"- {b}")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "path": str(auto / OUT_JSON), "acceptance_seal_allowed": acceptance_seal_allowed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
