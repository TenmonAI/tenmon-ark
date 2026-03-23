#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_CURSOR_APPLIER_V1 — emit Cursor apply JSON + manifest + paste-ready command bundle.
No PATCH execution; no runtime changes.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(_AUTOMATION_DIR))

from execution_gate_v1 import evaluate_gate
from repo_resolve_v1 import repo_root_from

CARD_NAME = "AUTO_BUILD_CURSOR_APPLIER_V1"
VERSION = 1
CURSOR_MANIFEST_REL = "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json"
EXEC_GATE_REPORT_REL = "api/automation/reports/execution_gate_v1.json"
OUT_DIR_REL = "api/automation/generated_cursor_apply"
MANIFEST_NAME = "cursor_apply_manifest_v1.json"
COMMAND_BUNDLE_NAME = "cursor_apply_command_bundle_v1.txt"
RUN_REPORT_NAME = "cursor_applier_v1.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _load_catalog_cards(repo: Path) -> List[Dict[str, Any]]:
    p = repo / "api" / "automation" / "card_catalog_v1.json"
    data = _load_json(p)
    if not data:
        return []
    return [c for c in (data.get("cards") or []) if isinstance(c, dict)]


def _catalog_for_card(repo: Path, card_name: str) -> Optional[Dict[str, Any]]:
    for c in _load_catalog_cards(repo):
        if c.get("cardName") == card_name:
            return c
    return None


def _apply_json_basename(task_id: str) -> str:
    safe = "".join(c if (c.isalnum() or c in "._-") else "_" for c in str(task_id))
    safe = re.sub(r"_+", "_", safe).strip("_") or "task"
    return f"apply_{safe}.json"


def _pass_condition(task: Dict[str, Any], catalog_rec: Optional[Dict[str, Any]]) -> str:
    prof = (catalog_rec or {}).get("acceptanceProfile") or "build_only"
    lines = [
        f"対象カード `{task.get('targetCard')}` の acceptanceProfile を満たすこと: `{prof}`。",
        "変更は `allowedPaths` / `targetPaths` の範囲のみ。`forbiddenPaths` 配下は編集禁止。",
        "タスクの postchecks およびカタログ postchecks（例: `cd api && npm run build`）を満たすこと。",
    ]
    if task.get("humanGateRequired"):
        lines.append("human gate が必要な場合はオペレータ承認後にのみ進める（自動承認禁止）。")
    return "\n".join(lines)


def _build_apply_bundle(
    task: Dict[str, Any],
    *,
    gate: Dict[str, Any],
    gate_allows: bool,
    repo: Path,
) -> Dict[str, Any]:
    target_card = str(task.get("targetCard") or "")
    cat = _catalog_for_card(repo, target_card) if target_card else None
    next_card = str(task.get("nextCardOnPass") or "")
    return {
        "version": VERSION,
        "cardName": CARD_NAME,
        "taskId": task.get("taskId"),
        "bundleId": task.get("bundleId"),
        "bundleName": task.get("bundleName"),
        "targetCard": target_card,
        "executionGateDecision": gate.get("decision"),
        "gateAllowsApply": gate_allows,
        "reasonCategories": list(gate.get("reasonCategories") or []),
        "targetPaths": list(task.get("targetPaths") or []),
        "allowedPaths": list(task.get("allowedPaths") or []),
        "forbiddenPaths": list(task.get("forbiddenPaths") or []),
        "instruction": str(task.get("instruction") or ""),
        "prechecks": list(task.get("prechecks") or []),
        "postchecks": list(task.get("postchecks") or []),
        "passCondition": _pass_condition(task, cat),
        "nextCard": next_card,
        "humanGateRequired": bool(task.get("humanGateRequired")),
        "parallelPolicy": task.get("parallelPolicy"),
        "unsafeMixedZonesHit": task.get("unsafeMixedZonesHit"),
        "splitPriorityScore": task.get("splitPriorityScore"),
    }


def _render_bundle_markdown(bundle: Dict[str, Any], index: int) -> str:
    lines = [
        f"## [{index}] タスク `{bundle.get('taskId')}`（bundle `{bundle.get('bundleId')}`）",
        "",
        f"- **targetCard**: `{bundle.get('targetCard')}`",
        f"- **gateAllowsApply**: `{bundle.get('gateAllowsApply')}`",
        f"- **executionGateDecision**: `{bundle.get('executionGateDecision')}`",
        "",
        "### Target paths",
        *[f"- `{p}`" for p in (bundle.get("targetPaths") or [])],
        "",
        "### Allowed paths",
        *[f"- `{p}`" for p in (bundle.get("allowedPaths") or [])],
        "",
        "### Forbidden paths",
        *[f"- `{p}`" for p in (bundle.get("forbiddenPaths") or [])],
        "",
        "### Instruction",
        "```text",
        str(bundle.get("instruction") or ""),
        "```",
        "",
        "### Prechecks",
        "```json",
        json.dumps(bundle.get("prechecks") or [], ensure_ascii=False, indent=2),
        "```",
        "",
        "### Postchecks",
        "```json",
        json.dumps(bundle.get("postchecks") or [], ensure_ascii=False, indent=2),
        "```",
        "",
        "### Pass condition",
        "```text",
        str(bundle.get("passCondition") or ""),
        "```",
        "",
        "### Next card (DAG)",
        f"`{bundle.get('nextCard')}`",
        "",
        "---",
        "",
    ]
    return "\n".join(lines)


def _render_command_bundle(
    gate: Dict[str, Any],
    gate_allows: bool,
    bundles: List[Dict[str, Any]],
) -> str:
    header = [
        "# TENMON-ARK — Cursor apply command bundle",
        "",
        f"> **AUTO_BUILD_CURSOR_APPLIER_V1** 生成（実 PATCH は未実行）",
        f"> **execution gate**: `{gate.get('decision')}` ／ **gateAllowsApply**: `{gate_allows}`",
    ]
    if not gate_allows:
        header.append("> **警告**: execution gate が `executable` ではないため、**このままの自動適用は禁止**。状況解消後に再生成してください。")
    header.extend(
        [
            "",
            "---",
            "",
        ]
    )
    parts = ["\n".join(header)]
    for i, b in enumerate(bundles, start=1):
        parts.append(_render_bundle_markdown(b, i))
    return "\n".join(parts).rstrip() + "\n"


def build_applier_output(
    repo: Path,
) -> Tuple[Dict[str, Any], Dict[str, Any], str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    root = repo.resolve()
    manifest_path = root / CURSOR_MANIFEST_REL
    gate_path = root / EXEC_GATE_REPORT_REL

    cursor_manifest = _load_json(manifest_path)
    gate = _load_json(gate_path)
    if gate is None:
        gate = evaluate_gate(root)

    decision = str(gate.get("decision") or "blocked")
    gate_allows = decision == "executable"

    tasks: List[Dict[str, Any]] = []
    if cursor_manifest and isinstance(cursor_manifest.get("tasks"), list):
        tasks = [t for t in cursor_manifest["tasks"] if isinstance(t, dict)]

    bundles: List[Dict[str, Any]] = []
    manifest_entries: List[Dict[str, Any]] = []

    for task in tasks:
        bundle = _build_apply_bundle(task, gate=gate, gate_allows=gate_allows, repo=root)
        bundles.append(bundle)
        fname = _apply_json_basename(str(task.get("taskId") or "task"))
        rel = f"{OUT_DIR_REL}/{fname}"
        manifest_entries.append(
            {
                "taskId": task.get("taskId"),
                "bundleId": task.get("bundleId"),
                "targetCard": task.get("targetCard"),
                "applyJsonRelative": rel.replace("\\", "/"),
                "filename": fname,
            }
        )

    apply_manifest = {
        "version": VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "executionGateDecision": decision,
        "gateAllowsApply": gate_allows,
        "executionGateReportRelative": EXEC_GATE_REPORT_REL,
        "cursorTaskManifestRelative": CURSOR_MANIFEST_REL,
        "reasonCategories": list(gate.get("reasonCategories") or []),
        "blockedReasons": list(gate.get("blockedReasons") or []),
        "applies": manifest_entries,
    }

    cmd_text = _render_command_bundle(gate, gate_allows, bundles)

    run_report = {
        "version": VERSION,
        "cardName": CARD_NAME,
        "generatedAt": apply_manifest["generatedAt"],
        "repoRoot": str(root),
        "executionGateDecision": decision,
        "gateAllowsApply": gate_allows,
        "executionGateReportRelative": EXEC_GATE_REPORT_REL,
        "cursorTaskManifestRelative": CURSOR_MANIFEST_REL,
        "applyManifestRelative": f"{OUT_DIR_REL}/{MANIFEST_NAME}",
        "commandBundleRelative": f"{OUT_DIR_REL}/{COMMAND_BUNDLE_NAME}",
        "applyBundleCount": len(bundles),
        "applyBundles": manifest_entries,
        "meta": {
            "schemaRelative": "api/automation/cursor_applier_schema_v1.json",
            "runReportRelative": f"api/automation/reports/{RUN_REPORT_NAME}",
        },
    }

    return run_report, apply_manifest, cmd_text, bundles, tasks


def emit_artifacts(
    repo: Path,
    run_report: Dict[str, Any],
    apply_manifest: Dict[str, Any],
    cmd_text: str,
    bundles: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
) -> None:
    root = repo.resolve()
    out_dir = root / Path(OUT_DIR_REL)
    for task, bundle in zip(tasks, bundles):
        fname = _apply_json_basename(str(task.get("taskId") or "task"))
        _atomic_write_text(
            out_dir / fname,
            json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
        )
    _atomic_write_text(
        out_dir / MANIFEST_NAME,
        json.dumps(apply_manifest, ensure_ascii=False, indent=2) + "\n",
    )
    _atomic_write_text(out_dir / COMMAND_BUNDLE_NAME, cmd_text)
    rep_dir = root / "api" / "automation" / "reports"
    _atomic_write_text(
        rep_dir / RUN_REPORT_NAME,
        json.dumps(run_report, ensure_ascii=False, indent=2) + "\n",
    )


def load_schema_required(schema_path: Path) -> List[str]:
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    req = data.get("required")
    if not isinstance(req, list):
        raise ValueError("schema missing required array")
    return [str(x) for x in req]


def check_run_report(report: Dict[str, Any], schema_path: Path) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for key in load_schema_required(schema_path):
        if key not in report:
            errs.append(f"missing_top_level_key:{key}")
    if report.get("version") != VERSION:
        errs.append(f"bad_version:{report.get('version')}")
    if report.get("cardName") != CARD_NAME:
        errs.append(f"bad_cardName:{report.get('cardName')}")
    if report.get("executionGateDecision") not in (
        "executable",
        "blocked",
        "waiting_human_gate",
        "invalid_scope",
    ):
        errs.append(f"bad_gate_decision:{report.get('executionGateDecision')}")
    if not isinstance(report.get("gateAllowsApply"), bool):
        errs.append("gateAllowsApply_not_bool")
    if not isinstance(report.get("applyBundles"), list):
        errs.append("applyBundles_not_array")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    root = root.resolve()

    run_report, apply_manifest, cmd_text, bundles, tasks = build_applier_output(root)

    schema_path = root / "api" / "automation" / "cursor_applier_schema_v1.json"

    if args.check_json:
        if not schema_path.is_file():
            print(json.dumps({"ok": False, "error": "schema_missing"}, indent=2))
            return 1
        ok, errs = check_run_report(run_report, schema_path)
        if not ok:
            print(json.dumps({"ok": False, "checkErrors": errs}, indent=2))
            return 1

    if args.emit_report:
        emit_artifacts(root, run_report, apply_manifest, cmd_text, bundles, tasks)

    if args.stdout_json:
        print(json.dumps(run_report, ensure_ascii=False, indent=2))

    if not args.stdout_json and not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "applyBundleCount": run_report.get("applyBundleCount"),
                    "gateAllowsApply": run_report.get("gateAllowsApply"),
                    "hint": "use --stdout-json or --emit-report",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
