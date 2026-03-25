#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CHAT_REFACTOR_PLANNER — Observer（＋任意 ledger / residual）から
escape / リスク帯 / next_card_priority（1〜3）を決定（コード改変なし）。
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

CARD = "TENMON_CHAT_REFACTOR_PLANNER_V1"
SCHEMA_VERSION = 1

# 既存 Stage カードへのヒント（card generator / 人間が追跡しやすい）
STAGE_HINTS: Dict[str, Tuple[str, str]] = {
    "surface_bleed": (
        "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1",
    ),
    "surface_sanitize": (
        "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1",
    ),
    "route_drift": (
        "CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2",
        "CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2",
    ),
    "route_authority": (
        "CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2",
        "CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2",
    ),
    "longform_structure": (
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_VPS_V1",
    ),
    "response_plan_wiring": (
        "TENMON_CHAT_ARCHITECTURE_OBSERVER_CURSOR_AUTO_V1",
        "TENMON_CHAT_REFACTOR_PLANNER_VPS_V1",
    ),
    "size_and_modularity": (
        "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_CURSOR_AUTO_V1",
        "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_VPS_V1",
    ),
    "trunk_rewire": (
        "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_CURSOR_AUTO_V1",
        "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_VPS_V1",
    ),
    "maintenance_watch": (
        "TENMON_CHAT_ARCHITECTURE_OBSERVER_CURSOR_AUTO_V1",
        "TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1",
    ),
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _ledger_hints(jsonl: Optional[Path], tail: int = 12) -> List[str]:
    if not jsonl or not jsonl.is_file():
        return []
    lines = [x.strip() for x in jsonl.read_text(encoding="utf-8", errors="replace").splitlines() if x.strip()]
    tail_lines = lines[-tail:] if len(lines) > tail else lines
    blockers: Counter[str] = Counter()
    for ln in tail_lines:
        try:
            o = json.loads(ln)
        except Exception:
            continue
        for b in o.get("blocker_types") or []:
            if isinstance(b, str) and b:
                blockers[b] += 1
    return [b for b, _ in blockers.most_common(5)]


def _residual_hints(res_path: Optional[Path]) -> List[Dict[str, Any]]:
    if not res_path or not res_path.is_file():
        return []
    d = _read_json(res_path)
    axes = d.get("axes") or {}
    lowest = []
    for k, v in axes.items():
        if isinstance(v, dict) and "score" in v:
            try:
                lowest.append((k, int(v["score"])))
            except Exception:
                continue
    lowest.sort(key=lambda x: x[1])
    out = []
    for name, sc in lowest[:3]:
        out.append({"axis": name, "score": sc})
    return out


def build_plan(
    arch: Dict[str, Any],
    ledger_blockers: List[str],
    residual_lowest: List[Dict[str, Any]],
) -> Dict[str, Any]:
    lines = int(arch.get("line_count") or 0)
    sbs = int(arch.get("surface_bleed_score") or len(arch.get("surface_bleed_points") or []))
    rds = int(arch.get("route_drift_score") or 0)
    dup = arch.get("duplicate_responsibility") or {}
    multi = int(dup.get("lines_with_multiple_layers") or 0)
    tw = arch.get("trunk_wiring") or {}
    summary = tw.get("summary") or {}
    unwired = int(summary.get("likely_unwired_count") or 0)
    resp_plan_c = int(arch.get("responsePlan_count") or 0)
    thread_c = int(arch.get("threadCore_count") or 0)

    escape_targets: List[Dict[str, Any]] = []
    low_risk: List[Dict[str, Any]] = []
    medium_risk: List[Dict[str, Any]] = []
    high_risk: List[Dict[str, Any]] = []

    escape_targets.append(
        {
            "target": "readonly_metrics_and_reports",
            "destination": "api/automation + seal scripts",
            "rationale": "会話本体から観測・検証を分離",
            "risk_hint": "low",
        }
    )
    if sbs >= 8 or multi > 50:
        escape_targets.append(
            {
                "target": "surface_copy_and_preamble",
                "destination": "chat_refactor/*surface* + Stage1 カード",
                "rationale": f"surface_bleed_score={sbs}, multi_layer_lines={multi}",
                "risk_hint": "low",
            }
        )
        low_risk.append(
            {
                "id": "surface_sanitize",
                "detail": "generic preamble / helper tail / noise literal の局所除去",
                "evidence": {"surface_bleed_score": sbs},
            }
        )
    if rds >= 25 or thread_c >= 150:
        escape_targets.append(
            {
                "target": "route_reason_and_thread_core_clusters",
                "destination": "chat_refactor trunk + Stage2 カード",
                "rationale": f"route_drift_score={rds}, threadCore_count={thread_c}",
                "risk_hint": "medium",
            }
        )
        medium_risk.append(
            {
                "id": "route_authority_alignment",
                "detail": "route 主権・レーン整合（無差別 route 本体変更は禁止）",
                "evidence": {"route_drift_score": rds, "threadCore_count": thread_c},
            }
        )
    if resp_plan_c >= 40 or multi > 120:
        escape_targets.append(
            {
                "target": "responsePlan_glue",
                "destination": "api/src/planning/responsePlanCore.ts + 明示配線カード",
                "rationale": f"responsePlan_count={resp_plan_c}, duplicate_layers={multi}",
                "risk_hint": "medium",
            }
        )
        medium_risk.append(
            {
                "id": "response_plan_wiring",
                "detail": "responsePlan の配線補正（chat.ts は局所のみ）",
                "evidence": {"responsePlan_count": resp_plan_c},
            }
        )
    if lines >= 12000 or arch.get("giant_file"):
        escape_targets.append(
            {
                "target": "chat_ts_monolith",
                "destination": "api/src/core/helpers + chat_refactor trunks（段階移譲）",
                "rationale": f"line_count={lines}",
                "risk_hint": "high",
            }
        )
        high_risk.append(
            {
                "id": "chat_ts_large_split_campaign",
                "detail": "chat.ts 大規模分割・threadCore 主権変更は別キャンペーン",
                "evidence": {"line_count": lines},
            }
        )
    if unwired >= 5:
        high_risk.append(
            {
                "id": "trunk_barrel_vs_direct_import_audit",
                "detail": f"trunk likely_unwired_count={unwired}（バレル経由の誤検知に注意）",
                "evidence": {"likely_unwired_count": unwired},
            }
        )

    # ledger / residual で優先度ブースト
    boost_surface = any("surface" in b for b in ledger_blockers)
    boost_route = any("route" in b or "runtime" in b for b in ledger_blockers)
    boost_longform = any("longform" in b for b in ledger_blockers)

    candidates: List[Tuple[int, Dict[str, Any]]] = []

    def add_item(prio_base: int, item: Dict[str, Any]) -> None:
        candidates.append((prio_base, item))

    if low_risk:
        add_item(
            10,
            {
                "theme": "surface_sanitize",
                "risk": "low",
                "subject": "表層ノイズ・preamble / helper tail の低リスク整理",
                "rationale": "observer + policy: low_risk",
                "suggested_focus": "stage1_surface_polish_alignment",
            },
        )
    if boost_surface:
        add_item(
            5,
            {
                "theme": "surface_bleed",
                "risk": "low",
                "subject": "ledger: surface 系 blocker に追随した surface 整理",
                "rationale": f"ledger_blockers={ledger_blockers[:3]}",
                "suggested_focus": "stage1_surface_polish_alignment",
            },
        )
    if medium_risk and (rds >= 25 or boost_route):
        add_item(
            20,
            {
                "theme": "route_drift",
                "risk": "medium",
                "subject": "route 主権・threadCore 散在の整理",
                "rationale": f"route_drift_score={rds}",
                "suggested_focus": "stage2_route_authority",
            },
        )
    if any("longform_quality" in str(r.get("axis", "")) for r in residual_lowest) or boost_longform:
        add_item(
            22,
            {
                "theme": "longform_structure",
                "risk": "medium",
                "subject": "longform 構造補正（Canon composer レーン）",
                "rationale": "residual axis or ledger",
                "suggested_focus": "stage3_longform_structure",
            },
        )
    if any(x.get("id") == "response_plan_wiring" for x in medium_risk):
        add_item(
            24,
            {
                "theme": "response_plan_wiring",
                "risk": "medium",
                "subject": "responsePlan 配線の明示化",
                "rationale": f"responsePlan_count={resp_plan_c}",
                "suggested_focus": "planning_responsePlanCore_wiring",
            },
        )
    if high_risk and lines >= 12000:
        add_item(
            80,
            {
                "theme": "size_and_modularity",
                "risk": "high",
                "subject": "chat.ts 巨大化の段階抽出（別キャンペーン）",
                "rationale": f"line_count={lines}",
                "suggested_focus": "extract_readonly_helpers_to_api_src_core",
            },
        )

    if not candidates:
        candidates.append(
            (
                100,
                {
                    "theme": "maintenance_watch",
                    "risk": "low",
                    "subject": "閾値未満 — 継続観測",
                    "rationale": "no strong signal",
                    "suggested_focus": "observer_rerun_next_cycle",
                },
            )
        )

    candidates.sort(key=lambda x: x[0])
    next_card_priority: List[Dict[str, Any]] = []
    rank = 1
    seen_theme = set()
    for _prio, raw in candidates:
        th = raw["theme"]
        if th in seen_theme:
            continue
        seen_theme.add(th)
        cur, vps = STAGE_HINTS.get(th, STAGE_HINTS["maintenance_watch"])
        next_card_priority.append(
            {
                "priority": rank,
                **raw,
                "suggested_cursor_card": cur,
                "suggested_vps_card": vps,
            }
        )
        rank += 1
        if len(next_card_priority) >= 3:
            break

    # card generator 互換: prioritized_items（risk / theme / subject / rationale / suggested_focus）
    prioritized_items: List[Dict[str, Any]] = []
    for n in next_card_priority:
        prioritized_items.append(
            {
                "theme": n["theme"],
                "subject": n["subject"],
                "risk": n["risk"],
                "rationale": n.get("rationale", ""),
                "suggested_focus": n.get("suggested_focus", ""),
            }
        )

    risk_partition = {
        "version": 1,
        "low_risk_targets": low_risk,
        "medium_risk_targets": medium_risk,
        "high_risk_targets": high_risk,
    }

    return {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "source_architecture_card": arch.get("card"),
        "inputs": {
            "ledger_blockers_used": ledger_blockers,
            "residual_lowest_axes": residual_lowest,
        },
        "escape_targets": escape_targets,
        "low_risk_targets": low_risk,
        "medium_risk_targets": medium_risk,
        "high_risk_targets": high_risk,
        "next_card_priority": next_card_priority,
        "prioritized_items": prioritized_items,
        "policy": {
            "max_next_cards": 3,
            "one_card_one_theme": True,
            "no_auto_apply_chat_ts": True,
            "high_risk_requires_human_campaign": True,
        },
        "_risk_partition": risk_partition,
    }


def write_outputs(out_dir: Path, plan: Dict[str, Any]) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, str] = {}
    rp = plan.get("_risk_partition") or {}
    full = {k: v for k, v in plan.items() if k != "_risk_partition"}
    main = out_dir / "chat_refactor_plan.json"
    main.write_text(json.dumps(full, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["chat_refactor_plan"] = str(main)

    part = out_dir / "risk_partition.json"
    part.write_text(json.dumps(rp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["risk_partition"] = str(part)

    ncp = out_dir / "next_card_priority.json"
    ncp.write_text(
        json.dumps({"version": 1, "items": plan.get("next_card_priority", [])}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    paths["next_card_priority"] = str(ncp)

    fv = {
        "version": 1,
        "card": "TENMON_CHAT_REFACTOR_PLANNER_VPS_V1",
        "planner_pass": True,
        "next_card_count": len(plan.get("next_card_priority") or []),
    }
    fp = out_dir / "final_verdict.json"
    fp.write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["final_verdict"] = str(fp)
    return paths


def sample_plan() -> Dict[str, Any]:
    from chat_architecture_observer_v1 import sample_report

    return build_plan(sample_report(), ["surface_noise_remaining"], [{"axis": "longform_quality_score", "score": 55}])


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--architecture-report", default="", help="chat_architecture_report.json")
    ap.add_argument("--observation-json", default="", help="--architecture-report の別名")
    ap.add_argument("--ledger-jsonl", default="")
    ap.add_argument("--residual-quality-json", default="")
    ap.add_argument("--out-dir", default="")
    ap.add_argument("--out-json", default="", help="単一 plan のみ（分割なし）")
    ap.add_argument("--sample", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args(list(argv) if argv is not None else None)

    if args.sample:
        plan = sample_plan()
    else:
        path = args.architecture_report or args.observation_json
        if not path:
            print("architecture-report or observation-json required unless --sample", file=sys.stderr)
            return 2
        arch = _read_json(Path(path))
        ledger_path = (
            Path(args.ledger_jsonl).resolve()
            if args.ledger_jsonl
            else (_repo_api() / "automation" / "improvement_ledger_entries_v1.jsonl")
        )
        lb = _ledger_hints(ledger_path if ledger_path.is_file() else None)
        res_path = Path(args.residual_quality_json).resolve() if args.residual_quality_json else None
        rh = _residual_hints(res_path)
        plan = build_plan(arch, lb, rh)

    if args.out_dir:
        write_outputs(Path(args.out_dir), plan)
    out_plan = {k: v for k, v in plan.items() if k != "_risk_partition"}
    if args.out_json:
        p = Path(args.out_json)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(out_plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out_plan, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(None))
