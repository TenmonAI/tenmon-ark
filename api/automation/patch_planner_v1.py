#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_PATCH_PLANNER_V1 — build single_flight patch plan from audit + trunk map + catalog + DAG.

Read-only on chat.ts / runtime. No human gate auto-approval.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from chatts_metrics_v1 import analyze_chat_ts
from chatts_trunk_domain_map_v1 import build_domain_map

REPORT_AUDIT = "chatts_audit_v1_report.json"
REPORT_TRUNK = "chatts_trunk_domain_map_v1.json"
PLAN_REPORT_JSON = "patch_plan_v1_report.json"
PLAN_REPORT_MD = "patch_plan_v1_report.md"

# Catalog card names per bundle (subset of real cards only; order is informational).
BUNDLE_SPECS: List[Dict[str, Any]] = [
    {
        "bundleId": "bundle_infra_wrapper_v1",
        "targetTrunk": "infra_wrapper",
        "title": "Infra: wrapper / synapse / router / ku contract",
        "goal": "Wrapper, return wiring, synapse, decisionFrame.ku 周辺の危険混在を先に解く。",
        "cardNames": [
            "ROUTE_DUPLICATION_SCAN_V1",
            "WRAPPER_DEDUP_AUDIT_V1",
            "LEDGER_AND_SYNAPSE_CALLSITE_AUDIT_V1",
            "TRPC_APP_ROUTER_CONTRACT_AUDIT_V1",
            "MEMORY_ROUTER_BOUNDARY_AUDIT_V1",
            "DECISION_FRAME_KU_CONTRACT_GUARD_V1",
        ],
    },
    {
        "bundleId": "bundle_define_v1",
        "targetTrunk": "define",
        "title": "Define / exit / reply wiring",
        "goal": "define 系 preempt / fastpath / exit contract / reply 経路を chat_refactor 側で統合。",
        "cardNames": [
            "CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1",
            "RESPONSE_FINALIZER_EXTRACT_V1",
            "REPLY_PATH_UNIFY_V1",
        ],
    },
    {
        "bundleId": "bundle_scripture_v1",
        "targetTrunk": "scripture",
        "title": "Scripture / grounded integrity",
        "goal": "scripture canon / grounded 参照の整合と人間ゲート。",
        "cardNames": [
            "GROUNDED_SOURCE_INTEGRITY_AUDIT_V1",
            "SCRIPTURE_CANON_CONTENT_REVIEW_V1",
        ],
    },
    {
        "bundleId": "bundle_continuity_v1",
        "targetTrunk": "continuity",
        "title": "Continuity / hybrid route smoke",
        "goal": "thread / hybrid route / follow-up 系の退行防止。",
        "cardNames": [
            "SMOKE_HYBRID_ROUTE_REGRESSION_V1",
        ],
    },
    {
        "bundleId": "bundle_support_selfdiag_v1",
        "targetTrunk": "support_selfdiag",
        "title": "Support / self-diagnosis (reserved)",
        "goal": "support / self aware / judgement 系の短文化（該当カードは catalog 増設時に追加）。",
        "cardNames": [],
    },
    {
        "bundleId": "bundle_general_v1",
        "targetTrunk": "general",
        "title": "General fallback / hygiene",
        "goal": "dist ドリフト・clone 再現性・PDCA 文書など残差の整理。",
        "cardNames": [
            "DIST_ARTIFACT_DRIFT_SCAN_V1",
            "REPRODUCIBLE_CLONE_GUARD_V1",
            "PDCA_DEV_CORE_ALIGNMENT_V1",
        ],
    },
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def repo_root_from(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(24):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def load_audit(root: Path) -> Dict[str, Any]:
    p = root / "api" / "automation" / "reports" / REPORT_AUDIT
    data = load_json(p)
    if data:
        return data
    return analyze_chat_ts(root / "api" / "src" / "routes" / "chat.ts")


def load_trunk_map(root: Path) -> Dict[str, Any]:
    p = root / "api" / "automation" / "reports" / REPORT_TRUNK
    data = load_json(p)
    if data:
        return data
    return build_domain_map(root / "api" / "src" / "routes" / "chat.ts")


def load_catalog(root: Path) -> Tuple[Dict[str, Any], Dict[str, Dict[str, Any]]]:
    path = root / "api" / "automation" / "card_catalog_v1.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    by_name: Dict[str, Dict[str, Any]] = {}
    for c in data.get("cards") or []:
        n = c.get("cardName")
        if isinstance(n, str):
            by_name[n] = c
    return data, by_name


def load_graph(root: Path) -> Tuple[Set[str], List[Dict[str, str]]]:
    path = root / "api" / "automation" / "card_dependency_graph_v1.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    nodes = {str(x) for x in (data.get("nodes") or []) if isinstance(x, str)}
    edges = [e for e in (data.get("edges") or []) if isinstance(e, dict)]
    return nodes, edges


def load_queue_completed(root: Path) -> Set[str]:
    try:
        from queue_store_v1 import load_snapshot
    except ImportError:
        return set()
    snap = load_snapshot(root)
    if not snap:
        return set()
    out: Set[str] = set()
    for name, info in (snap.get("cards") or {}).items():
        if isinstance(info, dict) and info.get("state") == "completed":
            out.add(name)
    return out


def trunk_entry(trunk_map: Dict[str, Any], trunk: str) -> Optional[Dict[str, Any]]:
    for t in trunk_map.get("trunks") or []:
        if isinstance(t, dict) and t.get("trunk") == trunk:
            return t
    return None


def _range_overlap(
    a: Optional[Dict[str, int]], b_lo: int, b_hi: int
) -> bool:
    if not a or a.get("startLine") is None:
        return False
    lo, hi = int(a["startLine"]), int(a["endLine"])
    return not (hi < b_lo or lo > b_hi)


def count_zone_hits_trunk(
    trunk_map: Dict[str, Any], trunk: str, key: str
) -> int:
    te = trunk_entry(trunk_map, trunk)
    lr = te.get("lineRange") if te else None
    n = 0
    for z in trunk_map.get(key) or []:
        if not isinstance(z, dict):
            continue
        lo, hi = int(z.get("startLine", 0)), int(z.get("endLine", 0))
        if _range_overlap(lr, lo, hi):
            n += 1
    return n


def wrapper_boost_trunk(trunk_map: Dict[str, Any], trunk: str) -> int:
    te = trunk_entry(trunk_map, trunk)
    if not te:
        return 0
    base = int(te.get("splitPriorityScore") or 0)
    w = count_zone_hits_trunk(trunk_map, trunk, "wrapperCriticalZones")
    return base + w * 12


def risk_from_trunk(trunk_map: Dict[str, Any], trunk: str) -> str:
    te = trunk_entry(trunk_map, trunk)
    if not te:
        return "medium"
    d = float(te.get("duplicateRisk") or 0)
    c = float(te.get("contractRisk") or 0)
    s = d + c
    if s >= 120:
        return "high"
    if s >= 60:
        return "medium"
    return "low"


def filter_cards(
    names: List[str], catalog: Dict[str, Dict[str, Any]], graph_nodes: Set[str]
) -> List[str]:
    out: List[str] = []
    for n in names:
        if n in catalog and n in graph_nodes:
            out.append(n)
    return out


def aggregate_allowed_paths(cards: List[str], by_name: Dict[str, Dict[str, Any]]) -> str:
    parts: List[str] = []
    for c in cards:
        ap = by_name.get(c, {}).get("allowedPaths") or []
        parts.extend(str(x) for x in ap if isinstance(x, str))
    return "; ".join(sorted(set(parts))) if parts else "(no direct paths in bundle)"


def acceptance_profiles(cards: List[str], by_name: Dict[str, Dict[str, Any]]) -> List[str]:
    seen: List[str] = []
    for c in cards:
        p = by_name.get(c, {}).get("acceptanceProfile")
        if isinstance(p, str) and p not in seen:
            seen.append(p)
    return seen


def human_gate_for_bundle(
    cards: List[str],
    by_name: Dict[str, Dict[str, Any]],
    trunk_map: Dict[str, Any],
    trunk: str,
) -> bool:
    if count_zone_hits_trunk(trunk_map, trunk, "unsafeMixedZones") > 0:
        return True
    for c in cards:
        card = by_name.get(c, {})
        if card.get("requiresHumanJudgement") or card.get("class") == "human_gate":
            return True
    return False


def build_pred_map(edges: List[Dict[str, str]]) -> Dict[str, Set[str]]:
    pred: Dict[str, Set[str]] = defaultdict(set)
    for e in edges:
        b, a = e.get("before"), e.get("after")
        if isinstance(b, str) and isinstance(a, str):
            pred[a].add(b)
    return pred


def _topological_sort(nodes: Set[str], edges: List[Dict[str, str]]) -> List[str]:
    indeg: Dict[str, int] = {n: 0 for n in nodes}
    adj: Dict[str, List[str]] = defaultdict(list)
    for e in edges:
        b, a = e.get("before"), e.get("after")
        if isinstance(b, str) and isinstance(a, str) and b in nodes and a in nodes:
            adj[b].append(a)
            indeg[a] = indeg.get(a, 0) + 1
    q = deque(sorted(n for n in nodes if indeg.get(n, 0) == 0))
    order: List[str] = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in sorted(adj.get(u, [])):
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order


def recommended_next_card(
    remaining: List[str],
    edges: List[Dict[str, str]],
    graph_nodes: Set[str],
) -> Optional[str]:
    """First card in DAG topo order whose predecessors are all outside `remaining` (done or off-plan)."""
    pred = build_pred_map(edges)
    rem = set(remaining)

    def ready(name: str) -> bool:
        for p in pred.get(name, []):
            if p in graph_nodes and p in rem:
                return False
        return True

    order = _topological_sort(graph_nodes, edges)
    for name in order:
        if name in rem and ready(name):
            return name
    return None


def sort_bundles_exec_order(
    bundles_raw: List[Dict[str, Any]], trunk_map: Dict[str, Any]
) -> List[Dict[str, Any]]:
    priority = {
        "infra_wrapper": 0,
        "define": 1,
        "scripture": 2,
        "continuity": 3,
        "support_selfdiag": 4,
        "general": 5,
    }

    def sort_key(b: Dict[str, Any]) -> Tuple[int, int, str]:
        trunk = str(b.get("targetTrunk") or "")
        pri = priority.get(trunk, 99)
        boost = -wrapper_boost_trunk(trunk_map, trunk)
        return (pri, boost, b.get("bundleId", ""))

    return sorted(bundles_raw, key=sort_key)


def build_plan(root: Path) -> Dict[str, Any]:
    audit = load_audit(root)
    trunk_map = load_trunk_map(root)
    _, by_name = load_catalog(root)
    graph_nodes, edges = load_graph(root)
    completed = load_queue_completed(root)

    bundles_out: List[Dict[str, Any]] = []
    all_planned: Set[str] = set()

    for spec in BUNDLE_SPECS:
        trunk = spec["targetTrunk"]
        cards = filter_cards(list(spec["cardNames"]), by_name, graph_nodes)
        for c in cards:
            all_planned.add(c)
        te = trunk_entry(trunk_map, trunk)
        target_files: List[str] = []
        if te and isinstance(te.get("suggestedTargetFile"), str):
            target_files.append(te["suggestedTargetFile"])
        hg = human_gate_for_bundle(cards, by_name, trunk_map, trunk)
        bundles_out.append(
            {
                "bundleId": spec["bundleId"],
                "title": spec["title"],
                "targetTrunk": trunk,
                "goal": spec["goal"],
                "cards": cards,
                "targetFiles": target_files,
                "riskLevel": risk_from_trunk(trunk_map, trunk),
                "humanGateRequired": hg,
                "preconditions": [
                    "CHAT_TRUNK_DOMAIN_MAP_V1 完了済み（trunk map 利用）",
                    "AUTO_BUILD_CHATTS_AUDIT_SUITE_V1 レポートと整合",
                    "parallelPolicy=single_flight（キューは最大1 running）",
                ],
                "postconditions": [
                    "bundles 内カードの acceptanceProfile を満たす",
                    "forbiddenPaths（chat.ts 直編集禁止カード）を遵守",
                ],
                "acceptanceProfiles": acceptance_profiles(cards, by_name),
                "estimatedPatchScope": aggregate_allowed_paths(cards, by_name),
                "rollbackAnchor": "git stash push -u || git tag pre-patch-plan-$(date -u +%Y%m%dT%H%M%SZ)",
            }
        )

    bundles_out = sort_bundles_exec_order(bundles_out, trunk_map)

    remaining = sorted(c for c in all_planned if c not in completed)
    rec = recommended_next_card(remaining, edges, graph_nodes)

    source_audit = {
        "version": audit.get("version"),
        "auditedAt": audit.get("auditedAt"),
        "lineCount": audit.get("lineCount"),
        "targetPath": audit.get("targetPath"),
        "duplicateRouteReasonKinds": len(audit.get("duplicateRouteReasons") or []),
        "splitPriorityTop": (audit.get("splitPriority") or [])[:3],
    }
    source_trunk = {
        "version": trunk_map.get("version"),
        "targetPath": trunk_map.get("targetPath"),
        "recommendedSplitSequence": trunk_map.get("recommendedSplitSequence"),
        "unsafeMixedZoneCount": len(trunk_map.get("unsafeMixedZones") or []),
        "wrapperCriticalZoneCount": len(trunk_map.get("wrapperCriticalZones") or []),
    }

    return {
        "generatedAt": _utc_now_iso(),
        "sourceAudit": source_audit,
        "sourceTrunkMap": source_trunk,
        "planVersion": 1,
        "parallelPolicy": "single_flight",
        "bundles": bundles_out,
        "remainingCards": remaining,
        "recommendedNextCard": rec,
        "meta": {
            "planner": "patch_planner_v1",
            "nextCardConstitution": "AUTO_BUILD_PATCH_GENERATOR_V1",
            "bundleSort": "priority_infra_define_scripture_continuity_support_general_with_wrapper_boost",
        },
    }


def validate_plan(plan: Dict[str, Any]) -> List[str]:
    schema_path = _AUTOMATION_DIR / "patch_plan_schema_v1.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    req = set(schema.get("required") or [])
    miss = [k for k in sorted(req) if k not in plan]
    if miss:
        return [f"missing:{miss}"]
    if plan.get("parallelPolicy") != "single_flight":
        return ["parallelPolicy"]
    if len(plan.get("bundles") or []) < 6:
        return ["bundles_min"]
    return []


def render_markdown(plan: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("# Patch plan (AUTO_BUILD_PATCH_PLANNER_V1)\n")
    lines.append(f"- **generatedAt**: {plan.get('generatedAt')}")
    lines.append(f"- **parallelPolicy**: {plan.get('parallelPolicy')}")
    lines.append(f"- **recommendedNextCard**: `{plan.get('recommendedNextCard')}`")
    lines.append(f"- **remainingCards** ({len(plan.get('remainingCards') or [])}): " + ", ".join(plan.get("remainingCards") or []))
    lines.append("")
    lines.append("## Bundles (execution-oriented groups)")
    lines.append("| # | bundleId | trunk | risk | humanGate | cards |")
    lines.append("|---:|---|---|:---:|---:|---|")
    for i, b in enumerate(plan.get("bundles") or [], start=1):
        cs = ", ".join(b.get("cards") or [])
        lines.append(
            f"| {i} | `{b.get('bundleId')}` | {b.get('targetTrunk')} | {b.get('riskLevel')} | "
            f"{b.get('humanGateRequired')} | {cs or '∅'} |"
        )
    lines.append("")
    lines.append("## Next constitution card")
    lines.append("- `AUTO_BUILD_PATCH_GENERATOR_V1`")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_PATCH_PLANNER_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    plan = build_plan(root)
    errs = validate_plan(plan) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / PLAN_REPORT_JSON).write_text(
            json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (out_dir / PLAN_REPORT_MD).write_text(render_markdown(plan), encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "recommendedNextCard": plan.get("recommendedNextCard"),
                    "remainingCount": len(plan.get("remainingCards") or []),
                    "bundles": len(plan.get("bundles") or []),
                },
                indent=2,
                ensure_ascii=False,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
