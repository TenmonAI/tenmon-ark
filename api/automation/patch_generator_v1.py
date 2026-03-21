#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_PATCH_GENERATOR_V1 — convert patch plan to Cursor-oriented patch recipes.

Read-only on forbidden paths. Does not auto-approve human gates.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from patch_planner_v1 import (
    PLAN_REPORT_JSON,
    build_plan,
    count_zone_hits_trunk,
    load_catalog,
    load_graph,
    load_json,
    repo_root_from,
    trunk_entry,
    _topological_sort,
)

OUT_DIR_NAME = "generated_patch_recipes"
MANIFEST_NAME = "patch_recipes_manifest_v1.json"
REPORT_MD = "patch_generator_v1_report.md"

STANDARD_FORBIDDEN = [
    "api/src/routes/chat.ts",
    "client/**",
    "api/src/db/kokuzo_schema.sql",
    "dist/**",
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def topo_bundle_order(
    bundle_cards: List[str], graph_nodes: Set[str], edges: List[Dict[str, str]]
) -> List[str]:
    want = [c for c in bundle_cards if c in graph_nodes]
    order = _topological_sort(graph_nodes, edges)
    return [x for x in order if x in want]


def merge_forbidden(
    cards: List[str], by_name: Dict[str, Dict[str, Any]]
) -> List[str]:
    acc: Set[str] = set(STANDARD_FORBIDDEN)
    for c in cards:
        for p in by_name.get(c, {}).get("forbiddenPaths") or []:
            if isinstance(p, str):
                acc.add(p)
    return sorted(acc)


def target_files_for_bundle(
    bundle: Dict[str, Any], trunk_te: Optional[Dict[str, Any]], cards: List[str], by_name: Dict[str, Dict[str, Any]]
) -> List[str]:
    out: List[str] = []
    if trunk_te and isinstance(trunk_te.get("suggestedTargetFile"), str):
        out.append(trunk_te["suggestedTargetFile"])
    for c in cards:
        for p in by_name.get(c, {}).get("allowedPaths") or []:
            if isinstance(p, str) and p not in out:
                out.append(p)
    return out


def acceptance_checklist(
    cards: List[str], by_name: Dict[str, Dict[str, Any]]
) -> List[str]:
    lines: List[str] = []
    for c in cards:
        card = by_name.get(c, {})
        prof = card.get("acceptanceProfile")
        if isinstance(prof, str):
            lines.append(f"{c}: acceptanceProfile={prof}")
        for pc in card.get("prechecks") or []:
            if isinstance(pc, dict) and pc.get("kind") == "command" and pc.get("command"):
                lines.append(f"{c} precheck: {pc.get('command')}")
        for pc in card.get("postchecks") or []:
            if isinstance(pc, dict) and pc.get("kind") == "command" and pc.get("command"):
                lines.append(f"{c} postcheck: {pc.get('command')}")
    if not lines:
        lines.append("Run card catalog postchecks / cd api && npm run build as applicable.")
    return lines


def patch_strategy_line(cards: List[str], by_name: Dict[str, Dict[str, Any]]) -> str:
    parts: List[str] = []
    for c in cards:
        ps = by_name.get(c, {}).get("patchStrategy") or {}
        mode = ps.get("mode", "?")
        parts.append(f"{c}:{mode}")
    return "; ".join(parts) if parts else "none"


def compute_next_card_on_pass(
    bundle_idx: int,
    ordered_bundles: List[Dict[str, Any]],
    bundle_topo: List[str],
    target: str,
    by_name: Dict[str, Dict[str, Any]],
    graph_nodes: Set[str],
    edges: List[Dict[str, str]],
) -> str:
    if len(bundle_topo) > 1:
        return bundle_topo[1]
    if target:
        nxt = by_name.get(target, {}).get("nextOnPass")
        if isinstance(nxt, str) and nxt and nxt != "STOP":
            return nxt
    for j in range(bundle_idx + 1, len(ordered_bundles)):
        bc = [str(x) for x in (ordered_bundles[j].get("cards") or []) if isinstance(x, str)]
        tord = topo_bundle_order(bc, graph_nodes, edges)
        if tord:
            return tord[0]
    return "CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1"


def build_cursor_instruction(
    recipe: Dict[str, Any],
) -> str:
    lines = [
        "# Cursor patch recipe (AUTO_BUILD_PATCH_GENERATOR_V1)",
        "",
        f"**Parallel policy**: {recipe.get('parallelPolicy', 'single_flight')} — one running card at a time.",
        f"**Bundle**: `{recipe.get('bundleName')}` (`{recipe.get('bundleId')}`) trunk=`{recipe.get('targetTrunk')}`",
        f"**Target card**: `{recipe.get('targetCard')}`",
        f"**Human gate required**: {recipe.get('humanGateRequired')}",
        f"**Unsafe mixed zones (trunk overlap count)**: {recipe.get('unsafeMixedZonesHit')}",
        f"**Trunk splitPriorityScore (from map)**: {recipe.get('splitPriorityScore')}",
        "",
        "## Intent",
        str(recipe.get("patchIntent") or ""),
        "",
        "## Allowed scope (targetFiles patterns)",
        "\n".join(f"- `{p}`" for p in (recipe.get("targetFiles") or [])),
        "",
        "## Forbidden (do not edit)",
        "\n".join(f"- `{p}`" for p in (recipe.get("forbiddenFiles") or [])),
        "",
        "## Patch strategy (catalog)",
        str(recipe.get("patchStrategy") or ""),
        "",
        "## Acceptance checklist",
        "\n".join(f"- {x}" for x in (recipe.get("acceptanceChecklist") or [])),
        "",
        "## After pass",
        f"Proceed toward card: `{recipe.get('nextCardOnPass')}` (supervisor/runner + human gate as required).",
        "",
        "Do not auto-approve human gates. Do not edit forbidden paths.",
    ]
    return "\n".join(lines)


def build_recipes(root: Path) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    plan_path = root / "api" / "automation" / "reports" / PLAN_REPORT_JSON
    plan = load_json(plan_path)
    if not plan:
        plan = build_plan(root)

    trunk_path = root / "api" / "automation" / "reports" / "chatts_trunk_domain_map_v1.json"
    trunk_map = load_json(trunk_path)
    if not trunk_map:
        from chatts_trunk_domain_map_v1 import build_domain_map

        trunk_map = build_domain_map(root / "api" / "src" / "routes" / "chat.ts")

    _, by_name = load_catalog(root)
    graph_nodes, edges = load_graph(root)

    bundles = plan.get("bundles") or []
    recipes: List[Dict[str, Any]] = []

    for bi, bundle in enumerate(bundles):
        if not isinstance(bundle, dict):
            continue
        b_cards = [str(x) for x in (bundle.get("cards") or []) if isinstance(x, str)]
        trunk = str(bundle.get("targetTrunk") or "")
        te = trunk_entry(trunk_map, trunk)
        unsafe_hits = count_zone_hits_trunk(trunk_map, trunk, "unsafeMixedZones")
        split_score = float((te or {}).get("splitPriorityScore") or 0.0)

        topo = topo_bundle_order(b_cards, graph_nodes, edges)
        target = topo[0] if topo else ""
        next_on = compute_next_card_on_pass(
            bi, bundles, topo, target, by_name, graph_nodes, edges
        )

        intent_parts = [
            bundle.get("goal") or "",
            f"Planner bundle `{bundle.get('bundleId')}`; cards in DAG order: {', '.join(topo) if topo else '(empty)'}",
        ]
        if unsafe_hits:
            intent_parts.append(
                f"Trunk `{trunk}` overlaps {unsafe_hits} unsafeMixedZones — treat as high coupling; prefer minimal diffs."
            )
        if split_score:
            intent_parts.append(
                f"Trunk splitPriorityScore={split_score} — prioritize mechanical extractions before semantic changes."
            )

        recipe: Dict[str, Any] = {
            "bundleName": str(bundle.get("title") or bundle.get("bundleId") or "bundle"),
            "bundleId": str(bundle.get("bundleId") or ""),
            "targetTrunk": trunk,
            "targetCard": target,
            "targetFiles": target_files_for_bundle(bundle, te, b_cards, by_name),
            "forbiddenFiles": merge_forbidden(b_cards, by_name),
            "patchIntent": " ".join(x for x in intent_parts if x).strip(),
            "patchStrategy": patch_strategy_line(b_cards, by_name),
            "acceptanceChecklist": acceptance_checklist(b_cards, by_name),
            "humanGateRequired": bool(bundle.get("humanGateRequired")),
            "nextCardOnPass": next_on,
            "unsafeMixedZonesHit": unsafe_hits,
            "splitPriorityScore": round(split_score, 4),
            "parallelPolicy": "single_flight",
            "bundleCardsInOrder": topo,
            "cursorInstruction": "",
        }
        recipe["cursorInstruction"] = build_cursor_instruction(recipe)
        recipes.append(recipe)

    manifest: Dict[str, Any] = {
        "version": 1,
        "generatedAt": _utc_now_iso(),
        "parallelPolicy": "single_flight",
        "sourcePlanPath": str(plan_path).replace("\\", "/"),
        "recipes": recipes,
        "meta": {
            "generator": "patch_generator_v1",
            "plannerRecommendedNext": plan.get("recommendedNextCard"),
        },
    }
    return manifest, recipes


RECIPE_REQUIRED = [
    "bundleName",
    "targetCard",
    "targetFiles",
    "forbiddenFiles",
    "patchIntent",
    "patchStrategy",
    "acceptanceChecklist",
    "humanGateRequired",
    "cursorInstruction",
    "nextCardOnPass",
]


def validate_manifest(m: Dict[str, Any]) -> List[str]:
    for k in ("version", "generatedAt", "parallelPolicy", "sourcePlanPath", "recipes"):
        if k not in m:
            return [f"manifest_missing:{k}"]
    if m.get("parallelPolicy") != "single_flight":
        return ["manifest_parallelPolicy"]
    for i, r in enumerate(m.get("recipes") or []):
        if not isinstance(r, dict):
            return [f"recipe_not_object:{i}"]
        miss = [k for k in RECIPE_REQUIRED if k not in r]
        if miss:
            return [f"recipe_{i}_missing:{miss}"]
    return []


def render_markdown(manifest: Dict[str, Any]) -> str:
    lines: List[str] = ["# Patch generator report (AUTO_BUILD_PATCH_GENERATOR_V1)\n"]
    lines.append(f"- **generatedAt**: {manifest.get('generatedAt')}")
    lines.append(f"- **recipes**: {len(manifest.get('recipes') or [])}")
    lines.append("")
    for r in manifest.get("recipes") or []:
        lines.append(f"## {r.get('bundleName')}")
        lines.append(f"- targetCard: `{r.get('targetCard')}`")
        lines.append(f"- nextCardOnPass: `{r.get('nextCardOnPass')}`")
        lines.append(f"- humanGateRequired: {r.get('humanGateRequired')}")
        lines.append(f"- unsafeMixedZonesHit: {r.get('unsafeMixedZonesHit')}")
        lines.append(f"- splitPriorityScore: {r.get('splitPriorityScore')}")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_PATCH_GENERATOR_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    manifest, recipes = build_recipes(root)

    errs = validate_manifest(manifest) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    out_dir = root / "api" / "automation" / OUT_DIR_NAME
    if args.emit_report:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / MANIFEST_NAME).write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        for r in recipes:
            bid = r.get("bundleId") or "unknown"
            safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in str(bid))
            (out_dir / f"recipe_{safe}.json").write_text(
                json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        (out_dir / REPORT_MD).write_text(render_markdown(manifest), encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "recipeCount": len(recipes),
                    "bundles": [r.get("bundleName") for r in recipes],
                },
                indent=2,
                ensure_ascii=False,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
