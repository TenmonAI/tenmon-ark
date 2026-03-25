#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TOTAL_FORENSIC_REVEAL — 採取済み JSON を束ね、integrated_forensic_verdict と next_priority を書く。
（観測のみ・本体改修なし）
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

CARD = "TENMON_TOTAL_FORENSIC_REVEAL_CURSOR_AUTO_V1"
VERSION = 1
FAIL_NEXT = "TENMON_TOTAL_FORENSIC_REVEAL_RETRY_CURSOR_AUTO_V1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {"_error": "json_parse_failed", "path": str(p)}


def _runtime_ok(matrix: Dict[str, Any]) -> bool:
    ok_n = 0
    tot = 0
    for k, row in matrix.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if row.get("ok"):
            ok_n += 1
    return tot > 0 and ok_n == tot


def _orch_queue_doc(orch_rep: Dict[str, Any]) -> Dict[str, Any]:
    q = orch_rep.get("queue")
    if isinstance(q, dict):
        return q
    return orch_rep


def _pick_next_priority(
    orch: Dict[str, Any],
    layers: Dict[str, Any],
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    orch = _orch_queue_doc(orch)
    nq = orch.get("next_queue") or []
    for row in nq[:3]:
        out.append(
            {
                "cursor_card": row.get("cursor_card"),
                "vps_card": row.get("vps_card"),
                "source": "full_orchestrator",
                "rationale": row.get("rationale") or row.get("blocker_types"),
            }
        )
    if len(out) >= 3:
        return out[:3]

    # フォレンジック層からの補完
    tc = layers.get("typecheck") or {}
    if not tc.get("ok") and len(out) < 3:
        out.append(
            {
                "cursor_card": FAIL_NEXT,
                "vps_card": "TENMON_TOTAL_FORENSIC_REVEAL_V1",
                "source": "forensic_gap",
                "rationale": "tsc --noEmit (npm run check) が失敗 — 型エラーを解消",
            }
        )
    h = layers.get("health") or {}
    if not h.get("ok") and len(out) < 3:
        out.append(
            {
                "cursor_card": "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
                "vps_card": "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
                "source": "forensic_gap",
                "rationale": "/health 未到達 — API 起動・ルーティングを確認",
            }
        )
    rt = layers.get("runtime_probe_summary") or {}
    if not rt.get("all_ok") and len(out) < 3:
        out.append(
            {
                "cursor_card": "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
                "vps_card": "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
                "source": "forensic_gap",
                "rationale": "runtime_matrix に失敗行あり",
            }
        )
    return out[:3]


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, required=True)
    args = ap.parse_args()
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    typecheck = _read_json(out / "typecheck_report.json")
    health = _read_json(out / "health_probe.json")
    audit = _read_json(out / "audit_probe.json")
    runtime = _read_json(out / "runtime_matrix.json")
    worldclass = _read_json(out / "worldclass_report.json")
    seal = _read_json(out / "seal_verdict.json")
    orch_rep = _read_json(out / "orchestrator_report.json")
    orch_q = _orch_queue_doc(orch_rep)
    kokuzo = _read_json(out / "kokuzo_learning_report.json")
    chat_met = _read_json(out / "chat_static_deep_metrics.json")

    ok_n = sum(
        1
        for k, row in runtime.items()
        if k != "_meta" and isinstance(row, dict) and row.get("ok")
    )
    tot = sum(1 for k, row in runtime.items() if k != "_meta" and isinstance(row, dict))
    layers: Dict[str, Any] = {
        "typecheck": typecheck,
        "health": health,
        "audit": audit,
        "runtime_matrix": {"path": str(out / "runtime_matrix.json")},
        "runtime_probe_summary": {
            "ok_count": ok_n,
            "total": tot,
            "all_ok": _runtime_ok(runtime),
        },
        "worldclass_report": {
            "path": str(out / "worldclass_report.json"),
            "card": worldclass.get("card"),
        },
        "seal_verdict": {
            "path": str(out / "seal_verdict.json"),
            "chat_ts_overall_100": seal.get("chat_ts_overall_100"),
            "present": bool(seal) and "_error" not in seal,
        },
        "orchestrator": {
            "unified_status": orch_q.get("unified_status"),
            "primary_next_card": orch_q.get("primary_next_card"),
            "manifest_present": bool(orch_rep.get("manifest")),
        },
        "kokuzo_learning": {
            "integrated_verdict_ok": kokuzo.get("integrated_verdict_ok"),
            "learning_chain_ok": kokuzo.get("learning_chain_ok"),
        },
        "chat_static_deep_metrics": chat_met,
    }

    seal_overall = seal.get("chat_ts_overall_100")
    obs_ok = (
        bool(typecheck.get("ok"))
        and bool(health.get("ok"))
        and bool(audit.get("ok"))
        and _runtime_ok(runtime)
        and (seal_overall is True)
        and str(orch_q.get("unified_status") or "") == "green"
    )

    integrated = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "vps_marker": "TENMON_TOTAL_FORENSIC_REVEAL_V1",
        "observation_only": True,
        "layers": layers,
        "unified_observation_ok": obs_ok,
        "fail_next_cursor_card": FAIL_NEXT,
        "notes": [
            "dist への書き込みはポリシーにより省略している場合がある（typecheck のみ）",
            "seal は /var/log/tenmon/card または TENMON_ORCHESTRATOR_SEAL_DIR を参照",
        ],
    }

    next_pri = _pick_next_priority(orch_q, layers)

    (out / "integrated_forensic_verdict.json").write_text(
        json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out / "next_priority_cards.json").write_text(
        json.dumps(
            {
                "version": VERSION,
                "card": CARD,
                "generatedAt": _utc_now_iso(),
                "items": next_pri,
                "fail_next_cursor_card": FAIL_NEXT,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps({"ok": True, "out_dir": str(out), "unified_observation_ok": obs_ok}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
