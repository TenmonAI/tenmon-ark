#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_CURSOR_BRIDGE_V1 — convert patch_generator recipes into Cursor task bundles.

Read-only; does not modify chat.ts, client, dist, kokuzo_schema.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from patch_generator_v1 import MANIFEST_NAME as RECIPE_MANIFEST_NAME
from patch_generator_v1 import OUT_DIR_NAME as RECIPE_OUT_DIR
from repo_resolve_v1 import repo_root_from

OUT_DIR = "generated_cursor_tasks"
TASK_MANIFEST = "cursor_tasks_manifest_v1.json"
REPORT_MD = "cursor_bridge_v1_report.md"

# Fixed natural-language template for Cursor (deterministic).
CURSOR_TASK_INSTRUCTION_TEMPLATE = """\
[TENMON-ARK / single_flight]
このタスクは自動化カード「{targetCard}」向けの1単位作業です。同一時刻に別バンドルを進めないでください（parallelPolicy=single_flight）。

■ バンドル: {bundleName}（id={bundleId}）
■ 主ターゲットカード: {targetCard}
■ パッチ意図（要約）: {patchIntent_short}
■ 人間ゲート: humanGateRequired={humanGateRequired}。true のときは CLI 等で承認を得るまで自動承認しないこと。
■ 禁止パス（編集禁止）: forbiddenPaths を厳守すること。
■ 許可パス: allowedPaths / targetPaths の範囲のみ変更すること。
■ 混在リスク指標: unsafeMixedZonesHit={unsafeMixedZonesHit}, splitPriorityScore={splitPriorityScore}
■ 完了後の次カード（自動化 DAG）: {nextCardOnPass}

（recipe 由来の詳細指示）
{cursor_instruction_body}
"""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def load_recipe_manifest(root: Path) -> Dict[str, Any]:
    p = root / "api" / "automation" / RECIPE_OUT_DIR / RECIPE_MANIFEST_NAME
    data = load_json(p)
    if data:
        return data
    from patch_generator_v1 import build_recipes

    manifest, _ = build_recipes(root)
    return manifest


def load_catalog(root: Path) -> Dict[str, Dict[str, Any]]:
    path = root / "api" / "automation" / "card_catalog_v1.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    by_name: Dict[str, Dict[str, Any]] = {}
    for c in data.get("cards") or []:
        n = c.get("cardName")
        if isinstance(n, str):
            by_name[n] = c
    return by_name


def _short_intent(text: str, max_len: int = 400) -> str:
    t = " ".join(str(text).split())
    if len(t) <= max_len:
        return t
    return t[: max_len - 3] + "..."


def split_acceptance_lines(lines: List[str]) -> Tuple[List[str], List[str]]:
    pre: List[str] = []
    post: List[str] = []
    for ln in lines:
        if "precheck" in ln.lower():
            pre.append(ln)
        elif "postcheck" in ln.lower():
            post.append(ln)
        else:
            pre.append(ln)
    return pre, post


def checks_from_card(
    target_card: str, by_name: Dict[str, Dict[str, Any]]
) -> Tuple[List[Any], List[Any]]:
    if not target_card or target_card not in by_name:
        return [], []
    card = by_name[target_card]
    return list(card.get("prechecks") or []), list(card.get("postchecks") or [])


def safe_filename_fragment(bundle_id: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(bundle_id))


def recipe_to_task(
    recipe: Dict[str, Any],
    idx: int,
    by_name: Dict[str, Dict[str, Any]],
    source_manifest_path: str,
) -> Dict[str, Any]:
    bid = str(recipe.get("bundleId") or f"bundle_{idx}")
    target = str(recipe.get("targetCard") or "")
    target_paths = list(recipe.get("targetFiles") or [])
    forbidden = list(recipe.get("forbiddenFiles") or [])
    allowed = list(target_paths)

    cat_pre, cat_post = checks_from_card(target, by_name)
    acc_lines = [str(x) for x in (recipe.get("acceptanceChecklist") or [])]
    acc_pre, acc_post = split_acceptance_lines(acc_lines)
    prechecks = cat_pre if cat_pre else [{"kind": "note", "message": x} for x in acc_pre]
    postchecks = cat_post if cat_post else [{"kind": "note", "message": x} for x in acc_post]

    body = str(recipe.get("cursorInstruction") or recipe.get("patchIntent") or "").strip()
    instruction = CURSOR_TASK_INSTRUCTION_TEMPLATE.format(
        bundleName=str(recipe.get("bundleName") or bid),
        bundleId=bid,
        targetCard=target or "(empty_bundle)",
        patchIntent_short=_short_intent(str(recipe.get("patchIntent") or "")),
        humanGateRequired=str(recipe.get("humanGateRequired")).lower(),
        unsafeMixedZonesHit=int(recipe.get("unsafeMixedZonesHit") or 0),
        splitPriorityScore=recipe.get("splitPriorityScore"),
        nextCardOnPass=str(recipe.get("nextCardOnPass") or ""),
        cursor_instruction_body=body,
    )

    task_id = f"cursor_task_{safe_filename_fragment(bid)}_{idx:02d}"

    return {
        "taskId": task_id,
        "bundleId": bid,
        "bundleName": str(recipe.get("bundleName") or ""),
        "targetCard": target,
        "targetPaths": target_paths,
        "allowedPaths": allowed,
        "forbiddenPaths": forbidden,
        "instruction": instruction,
        "prechecks": prechecks,
        "postchecks": postchecks,
        "humanGateRequired": bool(recipe.get("humanGateRequired")),
        "unsafeMixedZonesHit": int(recipe.get("unsafeMixedZonesHit") or 0),
        "splitPriorityScore": float(recipe.get("splitPriorityScore") or 0.0),
        "nextCardOnPass": str(recipe.get("nextCardOnPass") or ""),
        "parallelPolicy": "single_flight",
        "sourceRecipeManifestPath": source_manifest_path,
    }


TASK_REQUIRED = [
    "taskId",
    "bundleId",
    "targetCard",
    "targetPaths",
    "allowedPaths",
    "forbiddenPaths",
    "instruction",
    "prechecks",
    "postchecks",
    "humanGateRequired",
    "unsafeMixedZonesHit",
    "splitPriorityScore",
    "nextCardOnPass",
]


def validate_tasks_manifest(m: Dict[str, Any]) -> List[str]:
    for k in ("version", "generatedAt", "parallelPolicy", "sourceRecipeManifestPath", "tasks"):
        if k not in m:
            return [f"manifest_missing:{k}"]
    if m.get("parallelPolicy") != "single_flight":
        return ["parallelPolicy"]
    for i, t in enumerate(m.get("tasks") or []):
        if not isinstance(t, dict):
            return [f"task_not_object:{i}"]
        miss = [k for k in TASK_REQUIRED if k not in t]
        if miss:
            return [f"task_{i}_missing:{miss}"]
    if len(m.get("tasks") or []) < 6:
        return ["tasks_expect_six_bundles"]
    return []


def build_bridge(root: Path) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    recipe_manifest = load_recipe_manifest(root)
    src_path = str(
        (root / "api" / "automation" / RECIPE_OUT_DIR / RECIPE_MANIFEST_NAME).resolve()
    ).replace("\\", "/")
    if not (root / "api" / "automation" / RECIPE_OUT_DIR / RECIPE_MANIFEST_NAME).is_file():
        src_path = "(in_memory_from_patch_generator_v1.build_recipes)"

    by_name = load_catalog(root)
    recipes = recipe_manifest.get("recipes") or []
    tasks: List[Dict[str, Any]] = []
    for i, r in enumerate(recipes):
        if isinstance(r, dict):
            tasks.append(recipe_to_task(r, i, by_name, src_path))

    out_manifest: Dict[str, Any] = {
        "version": 1,
        "generatedAt": _utc_now_iso(),
        "parallelPolicy": "single_flight",
        "sourceRecipeManifestPath": src_path,
        "tasks": tasks,
        "meta": {
            "bridge": "cursor_bridge_v1",
            "recipeCount": len(recipes),
        },
    }
    return out_manifest, tasks


def render_report(manifest: Dict[str, Any]) -> str:
    lines: List[str] = ["# Cursor bridge report (AUTO_BUILD_CURSOR_BRIDGE_V1)\n"]
    lines.append(f"- **tasks**: {len(manifest.get('tasks') or [])}")
    lines.append(f"- **source recipes**: {manifest.get('sourceRecipeManifestPath')}")
    lines.append("")
    for t in manifest.get("tasks") or []:
        lines.append(f"## {t.get('taskId')}")
        lines.append(f"- bundleId: `{t.get('bundleId')}`")
        lines.append(f"- targetCard: `{t.get('targetCard')}`")
        lines.append(f"- humanGateRequired: {t.get('humanGateRequired')}")
        lines.append(f"- nextCardOnPass: `{t.get('nextCardOnPass')}`")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_CURSOR_BRIDGE_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    manifest, tasks = build_bridge(root)

    errs = validate_tasks_manifest(manifest) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    out_dir = root / "api" / "automation" / OUT_DIR
    if args.emit_report:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / TASK_MANIFEST).write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        for t in tasks:
            fn = f"task_{safe_filename_fragment(t.get('bundleId', 'x'))}.json"
            (out_dir / fn).write_text(
                json.dumps(t, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        (out_dir / REPORT_MD).write_text(render_report(manifest), encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "taskCount": len(tasks),
                    "taskIds": [t.get("taskId") for t in tasks],
                },
                indent=2,
                ensure_ascii=False,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
