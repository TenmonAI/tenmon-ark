#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_EXECUTION_GATE_V1 — pre-PATCH execution gate (read-only; no runtime changes).
Combines cursor task manifest, workspace observer snapshot, queue, and human gate state.
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

from human_gate_store_v1 import list_pending_gates
from path_guard_v1 import _matches_one
from queue_store_v1 import load_snapshot, snapshot_path
from repo_resolve_v1 import repo_root_from

try:
    from workspace_observer_v1 import build_snapshot as build_workspace_snapshot
except ImportError:
    build_workspace_snapshot = None  # type: ignore

CARD_NAME = "AUTO_BUILD_EXECUTION_GATE_V1"
REPORT_VERSION = 1
REPORT_JSON = "execution_gate_v1.json"
REPORT_MD = "execution_gate_v1.md"
CURSOR_MANIFEST_REL = "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json"
RECIPES_MANIFEST_REL = "api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json"
WORKSPACE_SNAPSHOT_REL = "api/automation/reports/workspace_snapshot_v1.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _probe_paths_for_planned(pat: str) -> List[str]:
    """Sample paths that must be covered by catalog allowed globs."""
    p = pat.replace("\\", "/").strip()
    if not p:
        return []
    if p.endswith("/**"):
        b = p[:-3].rstrip("/")
        return [b + "/__tenmon_planned_probe__"]
    if "*" in p or "?" in p or "[" in p:
        return [p.replace("*", "x").replace("?", "x")]
    return [p]


def _forbidden_probe_paths(fpat: str) -> List[str]:
    """Paths that must be classified under a forbidden glob / literal."""
    p = fpat.replace("\\", "/").strip()
    if not p:
        return []
    if p.endswith("/**"):
        b = p[:-3].rstrip("/")
        return [b + "/__tenmon_probe__"]
    if "**" in p:
        return [p.replace("**", "x").replace("//", "/")]
    return [p]


def _planned_touches_forbidden(planned_patterns: List[str], forbidden: List[str]) -> List[Dict[str, str]]:
    hits: List[Dict[str, str]] = []
    seen: Set[Tuple[str, str]] = set()
    for fp in forbidden:
        for probe in _forbidden_probe_paths(fp):
            if not any(_matches_one(probe, pp) for pp in planned_patterns):
                continue
            for pp in planned_patterns:
                if _matches_one(probe, pp):
                    key = (probe, fp)
                    if key in seen:
                        continue
                    seen.add(key)
                    hits.append(
                        {
                            "probePath": probe,
                            "forbiddenPattern": fp,
                            "plannedPattern": pp,
                        }
                    )
                    break
    return hits


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _task_json_path(repo: Path, bundle_id: str) -> Path:
    # Convention from cursor_bridge: task_{bundleId}.json
    return repo / "api" / "automation" / "generated_cursor_tasks" / f"task_{bundle_id}.json"


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


def _planned_vs_catalog_allowed(
    planned_patterns: List[str], catalog_allowed: List[str]
) -> List[str]:
    """Return planned patterns that are not covered by catalog allowed globs."""
    if not catalog_allowed:
        return []
    bad: List[str] = []
    for pp in planned_patterns:
        ok = False
        for pr in _probe_paths_for_planned(pp):
            if any(_matches_one(pr, ap) for ap in catalog_allowed):
                ok = True
                break
        if not ok:
            bad.append(pp)
    return bad


def evaluate_gate(
    repo: Path,
    *,
    target_card: Optional[str] = None,
) -> Dict[str, Any]:
    root = repo.resolve()
    categories: List[str] = []

    manifest_path = root / CURSOR_MANIFEST_REL
    recipes_path = root / RECIPES_MANIFEST_REL
    ws_path = root / WORKSPACE_SNAPSHOT_REL

    manifest = _load_json(manifest_path)
    recipes_manifest = _load_json(recipes_path)
    workspace_file = _load_json(ws_path)

    observer_source = "file"
    workspace_data: Optional[Dict[str, Any]] = workspace_file
    if workspace_data is None and build_workspace_snapshot:
        observer_source = "live"
        workspace_data = build_workspace_snapshot(root, skip_api_build=True)
    elif workspace_data is None:
        observer_source = "missing"

    tasks: List[Dict[str, Any]] = list(manifest.get("tasks") or []) if manifest else []
    recipe_by_bundle: Dict[str, Dict[str, Any]] = {}
    if recipes_manifest:
        for r in recipes_manifest.get("recipes") or []:
            if isinstance(r, dict) and r.get("bundleId"):
                recipe_by_bundle[str(r["bundleId"])] = r

    # --- missing_recipe_task
    missing_detail: Dict[str, Any] = {
        "manifestExists": manifest is not None,
        "recipeManifestExists": recipes_manifest is not None,
        "taskCount": len(tasks),
        "missingRecipeForBundle": [],
        "missingTaskJson": [],
    }
    if manifest is None:
        categories.append("missing_recipe_task")
    elif not tasks:
        categories.append("missing_recipe_task")
    if recipes_manifest is None:
        categories.append("missing_recipe_task")

    for t in tasks:
        bid = str(t.get("bundleId") or "")
        if bid and bid not in recipe_by_bundle:
            missing_detail["missingRecipeForBundle"].append(bid)
        tpath = _task_json_path(root, bid)
        if bid and not tpath.is_file():
            missing_detail["missingTaskJson"].append(str(tpath.relative_to(root)))

    if missing_detail["missingRecipeForBundle"] or missing_detail["missingTaskJson"]:
        categories.append("missing_recipe_task")

    # --- forbidden_path_in_plan (per task)
    scope_hits: List[Dict[str, Any]] = []
    for t in tasks:
        planned = [str(x) for x in (t.get("targetPaths") or [])] + [
            str(x) for x in (t.get("allowedPaths") or [])
        ]
        forb = [str(x) for x in (t.get("forbiddenPaths") or [])]
        hits = _planned_touches_forbidden(planned, forb)
        if hits:
            scope_hits.append(
                {
                    "taskId": t.get("taskId"),
                    "bundleId": t.get("bundleId"),
                    "hits": hits,
                }
            )
    if scope_hits:
        categories.append("forbidden_path_in_plan")

    # --- catalog_scope_mismatch (optional target card)
    catalog_mismatch: List[Dict[str, Any]] = []
    if target_card:
        cat = _catalog_for_card(root, target_card)
        if cat:
            allowed = [str(x) for x in (cat.get("allowedPaths") or [])]
            for t in tasks:
                if str(t.get("targetCard") or "") != target_card:
                    continue
                planned = [str(x) for x in (t.get("targetPaths") or [])] + [
                    str(x) for x in (t.get("allowedPaths") or [])
                ]
                bad = _planned_vs_catalog_allowed(planned, allowed)
                if bad:
                    catalog_mismatch.append(
                        {"taskId": t.get("taskId"), "bundleId": t.get("bundleId"), "uncoveredPlanned": bad}
                    )
    if catalog_mismatch:
        categories.append("catalog_scope_mismatch")

    # --- queue
    q_snap = load_snapshot(root)
    q_path = snapshot_path(root)

    def _rel_or_abs(p: Path) -> str:
        try:
            return str(p.resolve().relative_to(root))
        except ValueError:
            return str(p.resolve())
    running: List[str] = []
    q_conflict = False
    q_detail: Dict[str, Any] = {
        "snapshotPath": str(q_path),
        "loaded": q_snap is not None,
        "runningCards": running,
        "runningCount": 0,
        "parallelPolicy": None,
        "singleFlightViolation": False,
    }
    if q_snap:
        q_detail["parallelPolicy"] = q_snap.get("parallelPolicy")
        cards = q_snap.get("cards") or {}
        for name, info in cards.items():
            if isinstance(info, dict) and info.get("state") == "running":
                running.append(str(name))
        running = sorted(running)
        q_detail["runningCards"] = running
        q_detail["runningCount"] = len(running)
        pol = q_snap.get("parallelPolicy")
        if pol is not None and pol != "single_flight":
            q_detail["singleFlightViolation"] = True
            q_conflict = True
        if len(running) > 1:
            q_detail["singleFlightViolation"] = True
            q_conflict = True
        # single_flight: 他カード実行中なら PATCH 前ゲートは衝突
        if len(running) == 1:
            q_conflict = True
            q_detail["note"] = "another_card_running"

    if q_conflict:
        categories.append("queue_running_conflict")

    # --- human gate
    pending = list_pending_gates()
    hg_detail = {
        "pendingCount": len(pending),
        "pendingRequestIds": [str(p.get("requestId", "")) for p in pending][:40],
        "pendingCardNames": [str(p.get("cardName", "")) for p in pending][:40],
    }
    gate_required = any(bool(t.get("humanGateRequired")) for t in tasks)
    if len(pending) > 0:
        categories.append("gate_approval_required")

    # --- workspace readiness
    ws_ready = False
    ws_detail: Dict[str, Any] = {
        "observerSource": observer_source,
        "workspaceSnapshotPath": str(ws_path.relative_to(root)),
        "readyForApply": None,
        "readyForApplyApplySafe": None,
        "readyViolations": [],
        "singleFlight": None,
    }
    if workspace_data:
        ws_detail["readyForApply"] = workspace_data.get("readyForApply")
        ws_detail["readyForApplyApplySafe"] = workspace_data.get("readyForApplyApplySafe")
        ws_detail["readyViolations"] = list(workspace_data.get("readyViolations") or [])
        ws_detail["singleFlight"] = workspace_data.get("singleFlight")
        rv = set(workspace_data.get("readyViolations") or [])
        soft_ws = {"api_build_skipped", "git_working_tree_dirty"}
        if workspace_data.get("readyForApply") is True:
            ws_ready = True
        elif workspace_data.get("readyForApplyApplySafe") is True:
            # 観測と apply readiness 分離: 生成物・憲法のみ dirty ならパッチ前ゲートは通す
            ws_ready = True
        elif rv <= soft_ws:
            # ゲート専用: 作業ツリー dirty / build 未検証のみ許容（致命は observer の violations）
            ws_ready = True
        else:
            categories.append("workspace_not_ready")
    else:
        categories.append("workspace_not_ready")

    # Dedupe categories preserving order
    seen_c: Set[str] = set()
    reason_categories: List[str] = []
    for c in categories:
        if c not in seen_c:
            seen_c.add(c)
            reason_categories.append(c)

    # Decision priority
    decision: str
    if "forbidden_path_in_plan" in reason_categories or "catalog_scope_mismatch" in reason_categories:
        decision = "invalid_scope"
    elif "gate_approval_required" in reason_categories:
        decision = "waiting_human_gate"
    elif reason_categories:
        decision = "blocked"
    else:
        decision = "executable"

    blocked_detail = {
        "missingRecipeTask": missing_detail,
        "forbiddenPathInPlan": scope_hits,
        "catalogScopeMismatch": catalog_mismatch,
        "queue": q_detail,
        "humanGate": hg_detail,
        "workspace": ws_detail,
        "gateRequiredByTask": gate_required,
        "humanGatePending": len(pending) > 0,
    }

    blocked_reasons = list(reason_categories) if decision != "executable" else []

    return {
        "version": REPORT_VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "decision": decision,
        "reasonCategories": reason_categories,
        "blockedReasons": blocked_reasons,
        "inputs": {
            "cursorTaskManifest": CURSOR_MANIFEST_REL,
            "patchRecipesManifest": RECIPES_MANIFEST_REL,
            "workspaceObserverReport": WORKSPACE_SNAPSHOT_REL,
            "observerSource": observer_source,
            "queueSnapshotPath": _rel_or_abs(q_path),
            "targetCardFilter": target_card,
        },
        "checks": {
            "missingRecipeTask": missing_detail,
            "forbiddenPathInPlan": {"violation": bool(scope_hits), "tasks": scope_hits},
            "catalogScopeMismatch": {"violation": bool(catalog_mismatch), "tasks": catalog_mismatch},
            "queueRunningConflict": {
                "violation": q_conflict,
                "detail": q_detail,
            },
            "gateApprovalRequired": {
                "violation": "gate_approval_required" in reason_categories,
                "detail": hg_detail,
            },
            "workspaceReady": {
                "ok": ws_ready,
                "detail": ws_detail,
            },
        },
        "blockedDetail": blocked_detail,
        "meta": {
            "schemaRelative": "api/automation/execution_gate_schema_v1.json",
            "reportJsonRelative": f"api/automation/reports/{REPORT_JSON}",
            "reportMdRelative": f"api/automation/reports/{REPORT_MD}",
        },
    }


def emit_markdown(report: Dict[str, Any]) -> str:
    lines = [
        f"# {report.get('cardName')}",
        "",
        f"- **decision**: `{report.get('decision')}`",
        f"- **reasonCategories**: `{report.get('reasonCategories')}`",
        f"- **blockedReasons**: `{report.get('blockedReasons')}`",
        f"- **generatedAt**: `{report.get('generatedAt')}`",
        "",
        "## Inputs",
        "```json",
        json.dumps(report.get("inputs"), ensure_ascii=False, indent=2),
        "```",
        "",
        "## Checks summary",
        f"- missing recipe/task: `{report.get('checks', {}).get('missingRecipeTask')}`",
        f"- forbidden in plan: `{report.get('checks', {}).get('forbiddenPathInPlan', {}).get('violation')}`",
        f"- queue conflict: `{report.get('checks', {}).get('queueRunningConflict', {}).get('violation')}`",
        f"- gate approval: `{report.get('checks', {}).get('gateApprovalRequired', {}).get('violation')}`",
        f"- workspace ready: `{report.get('checks', {}).get('workspaceReady', {}).get('ok')}`",
        "",
    ]
    return "\n".join(lines)


def load_schema_required(schema_path: Path) -> List[str]:
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    req = data.get("required")
    if not isinstance(req, list):
        raise ValueError("schema missing required array")
    return [str(x) for x in req]


def check_report(report: Dict[str, Any], schema_path: Path) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for key in load_schema_required(schema_path):
        if key not in report:
            errs.append(f"missing_top_level_key:{key}")
    if report.get("version") != REPORT_VERSION:
        errs.append(f"bad_version:{report.get('version')}")
    if report.get("cardName") != CARD_NAME:
        errs.append(f"bad_cardName:{report.get('cardName')}")
    dec = report.get("decision")
    if dec not in ("executable", "blocked", "waiting_human_gate", "invalid_scope"):
        errs.append(f"bad_decision:{dec}")
    if not isinstance(report.get("reasonCategories"), list):
        errs.append("reasonCategories_not_array")
    if not isinstance(report.get("blockedReasons"), list):
        errs.append("blockedReasons_not_array")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    ap.add_argument(
        "--target-card",
        default=None,
        help="If set, tasks for this targetCard are checked against catalog allowedPaths.",
    )
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    report = evaluate_gate(root.resolve(), target_card=args.target_card)
    schema_path = root / "api" / "automation" / "execution_gate_schema_v1.json"

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        _atomic_write_text(out_dir / REPORT_JSON, json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        _atomic_write_text(out_dir / REPORT_MD, emit_markdown(report))

    if args.check_json:
        if not schema_path.is_file():
            print(json.dumps({"ok": False, "error": "schema_missing"}, indent=2))
            return 1
        ok, errs = check_report(report, schema_path)
        if not ok:
            print(json.dumps({"ok": False, "checkErrors": errs}, indent=2))
            return 1

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))

    if not args.stdout_json and not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "decision": report.get("decision"),
                    "reasonCategories": report.get("reasonCategories"),
                    "hint": "use --stdout-json or --emit-report",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
