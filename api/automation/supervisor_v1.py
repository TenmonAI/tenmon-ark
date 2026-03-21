#!/usr/bin/env python3
"""
TENMON-ARK — supervisor_v1
Validates DAG, orchestrates runner, fail classification, regression guard, queue JSON.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from auto_build_runner_v1 import repo_root_from, run_pipeline
from regression_guard_v1 import run_minimal_guards


def resolve_log_base() -> Path:
    env = os.environ.get("TENMON_CARD_LOG_ROOT")
    if env:
        return Path(env)
    canonical = Path("/var/log/tenmon")
    try:
        canonical.mkdir(parents=True, exist_ok=True)
        probe = canonical / ".tenmon_write_probe"
        probe.write_text("ok", encoding="utf-8")
        try:
            probe.unlink()
        except OSError:
            pass
        return canonical
    except OSError:
        pass
    fallback = Path(__file__).resolve().parent / "_card_logs"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def write_card_log(base: Path, card: str, payload: Dict[str, Any]) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_dir = base / f"card_{card}" / ts
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "run.log").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (log_dir / "result.json").write_text(json.dumps({"ok": payload.get("ok"), "card": card}, indent=2), encoding="utf-8")
    if "diffScope" in payload:
        (log_dir / "diff_summary.json").write_text(
            json.dumps(payload["diffScope"], indent=2), encoding="utf-8"
        )
    if "acceptancePlan" in payload:
        (log_dir / "acceptance_summary.json").write_text(
            json.dumps(
                {
                    "plan": payload.get("acceptancePlan"),
                    "runs": payload.get("acceptanceRuns"),
                    "skipped": payload.get("acceptanceSkipped"),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    return log_dir


def load_graph(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data.get("nodes", [])), list(data.get("edges", []))


def validate_dag(nodes: List[str], edges: List[Dict[str, str]]) -> Tuple[bool, str]:
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
    cards = data.get("cards", [])
    for c in cards:
        missing = required_card_keys() - set(c.keys())
        if missing:
            errs.append(f"{c.get('cardName','?')}:missing:{sorted(missing)}")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_SUPERVISOR_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--validate-only", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--card", default=None)
    ap.add_argument("--simulate", default=None, help="Comma-separated card names")
    ap.add_argument("--execute-checks", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    root = args.repo_root or repo_root_from(Path.cwd())
    graph_path = root / "api" / "automation" / "card_dependency_graph_v1.json"
    catalog_path = root / "api" / "automation" / "card_catalog_v1.json"

    nodes, edges = load_graph(graph_path)
    ok_dag, msg = validate_dag(nodes, edges)
    if not ok_dag:
        print(json.dumps({"ok": False, "dag": msg}, indent=2))
        return 1

    ok_cat, cat_errs = validate_catalog(catalog_path)
    if not ok_cat:
        print(json.dumps({"ok": False, "catalogErrors": cat_errs}, indent=2))
        return 1

    if args.validate_only:
        print(json.dumps({"ok": True, "dag": msg, "nodes": len(nodes), "edges": len(edges)}, indent=2))
        return 0

    log_base = resolve_log_base()
    results: List[Dict[str, Any]] = []

    def run_one(card_name: str) -> Dict[str, Any]:
        rec = run_pipeline(
            card_name=card_name,
            repo_root=root,
            dry_run=args.dry_run,
            execute_checks=args.execute_checks,
        )
        reg = run_minimal_guards(root, build_ok=bool(rec.get("ok")), health_ok=True)
        rec["regressionGuard"] = reg
        ds = rec.get("diffScope") or {}
        if rec.get("fail") == "human_judgement_required":
            rec["failClass"] = "human_judgement_required"
        elif rec.get("ok"):
            rec["failClass"] = "pass"
        elif ds.get("forbiddenHits"):
            rec["failClass"] = "forbidden_diff"
        elif ds.get("mixedCommit"):
            rec["failClass"] = "mixed_commit"
        else:
            rec["failClass"] = "acceptance_failure"
        write_card_log(log_base, card_name, rec)
        return rec

    if args.card:
        results.append(run_one(args.card))
    if args.simulate:
        for name in [x.strip() for x in args.simulate.split(",") if x.strip()]:
            results.append(run_one(name))

    queue = {
        "completed": [r["cardName"] for r in results if r.get("ok")],
        "failed": [r["cardName"] for r in results if not r.get("ok") and r.get("fail") != "human_judgement_required"],
        "blocked_human_gate": [r["cardName"] for r in results if r.get("fail") == "human_judgement_required"],
        "pending": [n for n in nodes if n not in {r["cardName"] for r in results}],
    }
    out = {"ok": True, "results": results, "queueStatus": queue, "logRoot": str(log_base)}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
