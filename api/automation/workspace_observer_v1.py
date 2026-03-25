#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_WORKSPACE_OBSERVER_V1 — read-only workspace snapshot for auto-build gate.
Does not modify runtime services; may run `npm run build` in api/ when not skipped.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from human_gate_store_v1 import list_pending_gates
from queue_store_v1 import load_snapshot, snapshot_path
from repo_resolve_v1 import repo_root_from

CARD_NAME = "AUTO_BUILD_WORKSPACE_OBSERVER_V1"
SNAPSHOT_VERSION = 1
REPORT_JSON_NAME = "workspace_snapshot_v1.json"
REPORT_MD_NAME = "workspace_snapshot_v1.md"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_graph(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data.get("nodes", [])), list(data.get("edges", []))


def validate_dag(nodes: List[str], edges: List[Dict[str, str]]) -> Tuple[bool, str]:
    from collections import defaultdict, deque

    node_set: Set[str] = set(nodes)
    for e in edges:
        b, a = e.get("before", ""), e.get("after", "")
        if b not in node_set or a not in node_set:
            return False, f"edge_unknown_node:{e}"
    indeg: Dict[str, int] = {n: 0 for n in nodes}
    adj: Dict[str, List[str]] = defaultdict(list)
    for e in edges:
        b, a = e["before"], e["after"]
        adj[b].append(a)
        indeg[a] = indeg.get(a, 0) + 1
    q = deque([n for n in nodes if indeg[n] == 0])
    seen = 0
    while q:
        u = q.popleft()
        seen += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    if seen != len(nodes):
        return False, "cycle_or_disconnected_indegree"
    return True, "ok"


def required_card_keys() -> Set[str]:
    return {
        "cardName",
        "class",
        "objective",
        "allowedPaths",
        "forbiddenPaths",
        "requiresHumanJudgement",
        "prechecks",
        "patchStrategy",
        "postchecks",
        "acceptanceProfile",
        "nextOnPass",
        "nextOnFail",
        "rollbackStrategy",
        "sealPolicy",
    }


def validate_catalog(path: Path) -> Tuple[bool, List[str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    errs: List[str] = []
    for c in data.get("cards", []):
        missing = required_card_keys() - set(c.keys())
        if missing:
            errs.append(f"{c.get('cardName', '?')}:missing:{sorted(missing)}")
    return len(errs) == 0, errs


def _run_shell(cmd: str, cwd: Path, timeout: int = 120) -> Tuple[int, str, str]:
    try:
        p = subprocess.run(
            cmd,
            shell=True,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return p.returncode, p.stdout or "", p.stderr or ""
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"


def _file_stat(rel: Path, root: Path) -> Dict[str, Any]:
    p = (root / rel).resolve()
    try:
        if not p.is_file():
            return {"relativePath": str(rel).replace("\\", "/"), "exists": False}
        st = p.stat()
        return {
            "relativePath": str(rel).replace("\\", "/"),
            "exists": True,
            "bytes": st.st_size,
            "mtimeIso": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
        }
    except OSError:
        return {"relativePath": str(rel).replace("\\", "/"), "exists": False}


def _porcelain_file_paths(lines: List[str]) -> List[str]:
    """git status --porcelain=v1 の行から作業ツリー上のパスを抽出（rename は両端）。"""
    paths: List[str] = []
    for raw in lines:
        ln = raw.rstrip("\r")
        if not ln.strip():
            continue
        if ln.startswith("?? "):
            rest = ln[3:]
        elif len(ln) >= 3 and ln[2] == " ":
            rest = ln[3:]
        elif len(ln) >= 2 and ln[1] == " ":
            rest = ln[2:]
        else:
            parts = ln.split(None, 1)
            rest = parts[1] if len(parts) > 1 else ""
        rest = rest.strip().replace("\\", "/")
        if not rest:
            continue
        if " -> " in rest:
            a, b = rest.split(" -> ", 1)
            paths.append(a.strip())
            paths.append(b.strip())
        else:
            paths.append(rest)
    return paths


def _classify_workspace_dirty(paths: List[str]) -> Dict[str, Any]:
    """
    作業ツリー変更をバケット化。source / automation の実体変更は seal 直前帯ではブロック。
    generated / constitution / temp のみなら applySafeForAutonomousSeal 可。
    """
    buckets: Dict[str, List[str]] = {
        "sourceModified": [],
        "automationModified": [],
        "constitutionNew": [],
        "generatedOutputs": [],
        "temporaryArtifacts": [],
        "unknown": [],
    }

    def norm(p: str) -> str:
        return p.replace("\\", "/").strip().lstrip("./")

    for p in paths:
        n = norm(p)
        if not n:
            continue
        low = n.lower()
        if (
            low.endswith(".tmp")
            or "/.cursor/" in low
            or low.startswith(".cursor/")
            or "/__pycache__/" in low
            or low.startswith("__pycache__/")
            or low.endswith(".pyc")
            or "/terminals/" in low
            or low.startswith("terminals/")
        ):
            buckets["temporaryArtifacts"].append(n)
            continue
        if n.startswith("api/docs/constitution/"):
            buckets["constitutionNew"].append(n)
            continue
        if (
            n.startswith("api/automation/reports/")
            or n.startswith("api/automation/generated_patch_recipes/")
            or n.startswith("api/automation/generated_cursor_tasks/")
            or n.startswith("api/dist/")
            or n == "dist"
            or n.startswith("dist/")
        ):
            buckets["generatedOutputs"].append(n)
            continue
        if "/dist/" in n or n.endswith("/dist"):
            buckets["generatedOutputs"].append(n)
            continue
        if n.startswith("api/src/"):
            buckets["sourceModified"].append(n)
            continue
        if n.startswith("api/automation/"):
            buckets["automationModified"].append(n)
            continue
        buckets["unknown"].append(n)

    apply_safe = (
        len(buckets["sourceModified"]) == 0
        and len(buckets["automationModified"]) == 0
        and len(buckets["unknown"]) == 0
    )
    return {
        "version": 1,
        "buckets": buckets,
        "applySafeForAutonomousSeal": apply_safe,
        "porcelainDerivedPathCount": len(paths),
    }


def _observe_git(root: Path) -> Tuple[Dict[str, Any], str]:
    code, out, err = _run_shell("git status --porcelain=v1", root, timeout=60)
    lines = [ln for ln in (out or "").splitlines() if ln.strip()]
    dirty = len(lines) > 0
    _, head, _ = _run_shell("git rev-parse HEAD", root, timeout=30)
    head_sha = head.strip() or "unknown"
    _, branch_out, _ = _run_shell("git branch --show-current", root, timeout=30)
    branch = (branch_out or "").strip() or None
    derived_paths = _porcelain_file_paths(lines)
    dirty_classification = _classify_workspace_dirty(derived_paths)
    return (
        {
            "porcelainExitCode": code,
            "porcelainLineCount": len(lines),
            "dirty": dirty,
            "sampleLines": lines[:20],
            "porcelainDerivedPaths": derived_paths[:80],
            "dirtyClassification": dirty_classification,
            "stderr": (err or "").strip() or None,
            "branch": branch,
        },
        head_sha,
    )


def _queue_block(root: Path) -> Dict[str, Any]:
    sp = snapshot_path(root)
    snap = load_snapshot(root)
    exists = sp.is_file()
    if snap is None:
        return {
            "snapshotPath": str(sp),
            "snapshotExists": exists,
            "loaded": False,
            "parallelPolicy": None,
            "stateCounts": {},
            "runningCards": [],
            "runningCount": 0,
        }
    cards = snap.get("cards") or {}
    counts: Dict[str, int] = defaultdict(int)
    running: List[str] = []
    for name, info in cards.items():
        if not isinstance(info, dict):
            continue
        st = str(info.get("state") or "unknown")
        counts[st] += 1
        if st == "running":
            running.append(str(name))
    running = sorted(running)
    policy = snap.get("parallelPolicy")
    return {
        "snapshotPath": str(sp),
        "snapshotExists": exists,
        "loaded": True,
        "runId": snap.get("runId") or "",
        "updatedAt": snap.get("updatedAt"),
        "parallelPolicy": policy,
        "stateCounts": dict(counts),
        "runningCards": running,
        "runningCount": len(running),
    }


def _single_flight_analysis(queue_block: Dict[str, Any]) -> Dict[str, Any]:
    reasons: List[str] = []
    policy = queue_block.get("parallelPolicy")
    rc = int(queue_block.get("runningCount") or 0)
    running = list(queue_block.get("runningCards") or [])
    if policy is not None and policy != "single_flight":
        reasons.append(f"parallel_policy_not_single_flight:{policy}")
    if rc > 1:
        reasons.append("multiple_running_cards")
    violation = len(reasons) > 0
    return {
        "policyExpected": "single_flight",
        "parallelPolicy": policy,
        "runningCount": rc,
        "runningCards": running,
        "violation": violation,
        "reasons": reasons,
    }


def _human_gate_block() -> Dict[str, Any]:
    pending = list_pending_gates()
    return {
        "pendingCount": len(pending),
        "pendingRequestIds": [str(p.get("requestId", "")) for p in pending][:50],
        "pendingCardNames": [str(p.get("cardName", "")) for p in pending][:50],
    }


def _generated_recipes(root: Path) -> Dict[str, Any]:
    base = root / "api" / "automation" / "generated_patch_recipes"
    manifest = base / "patch_recipes_manifest_v1.json"
    count = 0
    if base.is_dir():
        count = len([p for p in base.glob("*.json") if p.name != "patch_recipes_manifest_v1.json"])
    man_ok = manifest.is_file()
    man_n = None
    if man_ok:
        try:
            m = json.loads(manifest.read_text(encoding="utf-8"))
            recipes = m.get("recipes")
            if isinstance(recipes, list):
                man_n = len(recipes)
        except (OSError, json.JSONDecodeError):
            man_n = None
    return {
        "directory": str(base.relative_to(root)),
        "recipeJsonCount": count,
        "manifestRelative": str(manifest.relative_to(root)),
        "manifestExists": man_ok,
        "manifestRecipeCount": man_n,
    }


def _generated_cursor_tasks(root: Path) -> Dict[str, Any]:
    base = root / "api" / "automation" / "generated_cursor_tasks"
    manifest = base / "cursor_tasks_manifest_v1.json"
    count = 0
    if base.is_dir():
        count = len(
            [
                p
                for p in base.glob("*.json")
                if p.name not in ("cursor_tasks_manifest_v1.json",)
            ]
        )
    man_ok = manifest.is_file()
    man_n = None
    if man_ok:
        try:
            m = json.loads(manifest.read_text(encoding="utf-8"))
            tasks = m.get("tasks")
            if isinstance(tasks, list):
                man_n = len(tasks)
        except (OSError, json.JSONDecodeError):
            man_n = None
    return {
        "directory": str(base.relative_to(root)),
        "taskJsonCount": count,
        "manifestRelative": str(manifest.relative_to(root)),
        "manifestExists": man_ok,
        "manifestTaskCount": man_n,
    }


def _catalog_dag(root: Path) -> Dict[str, Any]:
    graph_path = root / "api" / "automation" / "card_dependency_graph_v1.json"
    catalog_path = root / "api" / "automation" / "card_catalog_v1.json"
    nodes, edges = load_graph(graph_path)
    ok_dag, dag_msg = validate_dag(nodes, edges)
    ok_cat, cat_errs = validate_catalog(catalog_path)
    return {
        "graphPath": str(graph_path.relative_to(root)),
        "catalogPath": str(catalog_path.relative_to(root)),
        "dagOk": ok_dag,
        "dagMessage": dag_msg,
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "catalogOk": ok_cat,
        "catalogErrors": cat_errs,
    }


def _run_api_build(root: Path, skip: bool) -> Dict[str, Any]:
    if skip:
        return {
            "ran": False,
            "skipped": True,
            "ok": None,
            "exitCode": None,
            "durationMs": None,
            "command": None,
            "cwd": str((root / "api").relative_to(root)),
        }
    api_dir = root / "api"
    t0 = time.monotonic()
    code, out, err = _run_shell("npm run build", api_dir, timeout=900)
    dt = int((time.monotonic() - t0) * 1000)
    return {
        "ran": True,
        "skipped": False,
        "ok": code == 0,
        "exitCode": code,
        "durationMs": dt,
        "command": "npm run build",
        "cwd": str(api_dir.relative_to(root)),
        "stdoutTail": (out or "")[-4000:] or None,
        "stderrTail": (err or "")[-4000:] or None,
    }


def _latest_reports(root: Path) -> Dict[str, Any]:
    rels = [
        "api/automation/reports/chatts_audit_v1_report.json",
        "api/automation/reports/chatts_audit_v1_report.md",
        "api/automation/reports/chatts_trunk_domain_map_v1.json",
        "api/automation/reports/patch_plan_v1_report.json",
        "api/automation/reports/patch_plan_v1_report.md",
        "api/automation/reports/chatts_exit_contract_v1.json",
        "api/automation/reports/chatts_exit_contract_v1.md",
        "api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json",
        "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json",
    ]
    items = [_file_stat(Path(r), root) for r in rels]
    present = sum(1 for x in items if x.get("exists"))
    return {"expectedCount": len(items), "presentCount": present, "items": items}


def _compute_ready(
    git_dirty: bool,
    apply_safe_classified: bool,
    val: Dict[str, Any],
    sf: Dict[str, Any],
    hg: Dict[str, Any],
    api_build: Dict[str, Any],
) -> Tuple[bool, bool, List[str], List[str]]:
    """厳密 ready と apply-safe ready（生成物・憲法のみ dirty 許容）を別々に返す。"""
    base: List[str] = []
    if not val.get("catalogOk"):
        base.append("catalog_invalid")
    if not val.get("dagOk"):
        base.append("dag_invalid")
    if sf.get("violation"):
        base.append("queue_single_flight_violation")
    if int(hg.get("pendingCount") or 0) > 0:
        base.append("human_gate_pending")
    if api_build.get("skipped"):
        base.append("api_build_skipped")
    elif api_build.get("ran") and not api_build.get("ok"):
        base.append("api_build_failed")

    strict_v = list(base)
    if git_dirty:
        strict_v.append("git_working_tree_dirty")

    apply_v = list(base)
    if git_dirty and not apply_safe_classified:
        apply_v.append("git_working_tree_unsafe_or_unclassified")

    return len(strict_v) == 0, len(apply_v) == 0, strict_v, apply_v


def build_snapshot(repo_root: Path, *, skip_api_build: bool) -> Dict[str, Any]:
    root = repo_root.resolve()
    git_info, head_sha = _observe_git(root)
    git_dirty = bool(git_info.get("dirty"))
    dc = git_info.get("dirtyClassification") if isinstance(git_info.get("dirtyClassification"), dict) else {}
    apply_safe = bool(dc.get("applySafeForAutonomousSeal")) if git_dirty else True
    qb = _queue_block(root)
    sf = _single_flight_analysis(qb)
    hg = _human_gate_block()
    recipes = _generated_recipes(root)
    tasks = _generated_cursor_tasks(root)
    val = _catalog_dag(root)
    api_build = _run_api_build(root, skip_api_build)
    reports = _latest_reports(root)
    ready, ready_apply_safe, violations, violations_apply_safe = _compute_ready(
        git_dirty, apply_safe, val, sf, hg, api_build
    )

    return {
        "version": SNAPSHOT_VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "git": git_info,
        "headSha": head_sha,
        "queue": qb,
        "humanGate": hg,
        "generatedPatchRecipes": recipes,
        "generatedCursorTasks": tasks,
        "catalogDagValidation": val,
        "apiBuild": api_build,
        "latestReports": reports,
        "singleFlight": sf,
        "readyForApply": ready,
        "readyViolations": violations,
        "readyForApplyApplySafe": ready_apply_safe,
        "readyViolationsApplySafe": violations_apply_safe,
        "meta": {
            "schemaRelative": "api/automation/workspace_observer_schema_v1.json",
            "reportJsonRelative": f"api/automation/reports/{REPORT_JSON_NAME}",
            "reportMdRelative": f"api/automation/reports/{REPORT_MD_NAME}",
        },
    }


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def emit_markdown(snapshot: Dict[str, Any]) -> str:
    lines = [
        f"# {snapshot.get('cardName')}",
        "",
        f"- **generatedAt**: `{snapshot.get('generatedAt')}`",
        f"- **repoRoot**: `{snapshot.get('repoRoot')}`",
        f"- **headSha**: `{snapshot.get('headSha')}`",
        f"- **readyForApply**: **{snapshot.get('readyForApply')}**",
        f"- **readyForApplyApplySafe**: **{snapshot.get('readyForApplyApplySafe')}**",
        f"- **readyViolations**: `{snapshot.get('readyViolations')}`",
        f"- **readyViolationsApplySafe**: `{snapshot.get('readyViolationsApplySafe')}`",
        "",
        "## Git",
        f"- dirty: `{snapshot.get('git', {}).get('dirty')}`",
        f"- porcelain lines: `{snapshot.get('git', {}).get('porcelainLineCount')}`",
        "",
        "## Queue",
        f"- loaded: `{snapshot.get('queue', {}).get('loaded')}`",
        f"- stateCounts: `{snapshot.get('queue', {}).get('stateCounts')}`",
        f"- running: `{snapshot.get('queue', {}).get('runningCards')}`",
        "",
        "## single_flight",
        f"- violation: `{snapshot.get('singleFlight', {}).get('violation')}`",
        f"- reasons: `{snapshot.get('singleFlight', {}).get('reasons')}`",
        "",
        "## Human gate",
        f"- pendingCount: `{snapshot.get('humanGate', {}).get('pendingCount')}`",
        "",
        "## Generated artifacts",
        f"- patch recipe JSON files: `{snapshot.get('generatedPatchRecipes', {}).get('recipeJsonCount')}`",
        f"- cursor task JSON files: `{snapshot.get('generatedCursorTasks', {}).get('taskJsonCount')}`",
        "",
        "## Catalog / DAG",
        f"- catalogOk: `{snapshot.get('catalogDagValidation', {}).get('catalogOk')}`",
        f"- dagOk: `{snapshot.get('catalogDagValidation', {}).get('dagOk')}`",
        "",
        "## API build",
        f"- ran: `{snapshot.get('apiBuild', {}).get('ran')}` skipped: `{snapshot.get('apiBuild', {}).get('skipped')}` ok: `{snapshot.get('apiBuild', {}).get('ok')}`",
        "",
        "## Latest reports",
        f"- present: `{snapshot.get('latestReports', {}).get('presentCount')}` / `{snapshot.get('latestReports', {}).get('expectedCount')}`",
        "",
    ]
    return "\n".join(lines)


def load_schema_required(schema_path: Path) -> List[str]:
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    req = data.get("required")
    if not isinstance(req, list):
        raise ValueError("schema missing required array")
    return [str(x) for x in req]


def check_snapshot_against_schema(
    snapshot: Dict[str, Any], schema_path: Path
) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for key in load_schema_required(schema_path):
        if key not in snapshot:
            errs.append(f"missing_top_level_key:{key}")
    if snapshot.get("version") != SNAPSHOT_VERSION:
        errs.append(f"bad_version:{snapshot.get('version')}")
    if snapshot.get("cardName") != CARD_NAME:
        errs.append(f"bad_cardName:{snapshot.get('cardName')}")
    if "readyForApply" in snapshot and not isinstance(snapshot.get("readyForApply"), bool):
        errs.append("readyForApply_not_bool")
    if "readyForApplyApplySafe" in snapshot and not isinstance(
        snapshot.get("readyForApplyApplySafe"), bool
    ):
        errs.append("readyForApplyApplySafe_not_bool")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    ap.add_argument(
        "--skip-api-build",
        action="store_true",
        help="Skip npm run build (sets api_build_skipped violation for readyForApply).",
    )
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(_AUTOMATION_DIR)
    root = root.resolve()

    skip_build = bool(args.skip_api_build) or os.environ.get(
        "TENMON_WORKSPACE_OBSERVER_SKIP_BUILD", ""
    ).strip() in ("1", "true", "yes")

    snap = build_snapshot(root, skip_api_build=skip_build)
    schema_path = root / "api" / "automation" / "workspace_observer_schema_v1.json"

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        jpath = out_dir / REPORT_JSON_NAME
        mpath = out_dir / REPORT_MD_NAME
        _atomic_write_text(jpath, json.dumps(snap, ensure_ascii=False, indent=2) + "\n")
        _atomic_write_text(mpath, emit_markdown(snap))

    if args.check_json:
        if not schema_path.is_file():
            print(json.dumps({"ok": False, "error": "schema_missing"}, indent=2))
            return 1
        ok, errs = check_snapshot_against_schema(snap, schema_path)
        if not ok:
            print(json.dumps({"ok": False, "checkErrors": errs}, indent=2))
            return 1

    if args.stdout_json:
        print(json.dumps(snap, ensure_ascii=False, indent=2))

    # Default: minimal success line if no stdout-json
    if not args.stdout_json and not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "readyForApply": snap.get("readyForApply"),
                    "readyForApplyApplySafe": snap.get("readyForApplyApplySafe"),
                    "hint": "use --stdout-json or --emit-report",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
