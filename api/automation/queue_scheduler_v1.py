#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON-ARK — queue_scheduler_v1

Deterministic next-card selection from catalog ∩ DAG nodes, dependency edges,
human gate approvals, and parallelPolicy=single_flight.
Automation-only; no chat/client API.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from human_gate_store_v1 import is_approved
from repo_resolve_v1 import repo_root_from
from queue_store_v1 import (
    PARALLEL_POLICY,
    _load_edges,
    _pred_map,
    _utc_now_iso,
    ensure_initialized,
    load_snapshot,
    save_snapshot,
    snapshot_path,
)


def repo_root_from_here() -> Path:
    """cwd がリポ外でも api/automation から .git を辿れるようにする。"""
    return repo_root_from(Path(__file__).resolve().parent)


def load_queue_spine_v1(repo_root: Optional[Path] = None) -> List[str]:
    """Ordered spine from card_catalog_v1.json queueSpineV1.cards (post-EXIT automation queue)."""
    rr = repo_root or repo_root_from_here()
    p = rr / "api" / "automation" / "card_catalog_v1.json"
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    block = data.get("queueSpineV1") or {}
    cards = block.get("cards") if isinstance(block, dict) else None
    if not isinstance(cards, list):
        return []
    return [str(x).strip() for x in cards if isinstance(x, str) and x.strip()]


def sync_human_gates(snap: Dict[str, Any]) -> bool:
    """Promote waiting_human_gate -> queued when gate file is approved."""
    cards = snap.get("cards") or {}
    changed = False
    for _name, info in cards.items():
        if not isinstance(info, dict):
            continue
        if info.get("state") != "waiting_human_gate":
            continue
        gid = info.get("gateRequestId")
        if not gid or not isinstance(gid, str):
            continue
        if is_approved(gid.strip()):
            info["state"] = "queued"
            info["updatedAt"] = _utc_now_iso()
            changed = True
    return changed


def _running_cards(cards: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    for name, info in cards.items():
        if isinstance(info, dict) and info.get("state") == "running":
            out.append(name)
    return sorted(out)


def all_predecessors_completed(
    card_name: str, pred_map: Dict[str, List[str]], cards: Dict[str, Any]
) -> bool:
    for p in pred_map.get(card_name, []):
        st = (cards.get(p) or {}).get("state")
        if st != "completed":
            return False
    return True


def compute_next_runnable(repo_root: Optional[Path] = None) -> Dict[str, Any]:
    rr = repo_root or repo_root_from_here()
    snap = ensure_initialized(rr)
    if sync_human_gates(snap):
        save_snapshot(snap, rr)
    cards = snap.get("cards") or {}
    edges = _load_edges(rr)
    pred_map = _pred_map(edges)
    path = str(snapshot_path(rr))

    running = _running_cards(cards)
    if len(running) > 1:
        return {
            "nextCard": None,
            "suggestedGateRequestId": None,
            "reason": "queue_corrupt_multiple_running",
            "runningCards": running,
            "parallelPolicy": PARALLEL_POLICY,
            "snapshotPath": path,
        }
    if len(running) == 1:
        return {
            "nextCard": None,
            "suggestedGateRequestId": None,
            "reason": "single_flight_busy",
            "runningCard": running[0],
            "parallelPolicy": PARALLEL_POLICY,
            "snapshotPath": path,
        }

    spine = load_queue_spine_v1(rr)
    spine_rank = {n: i for i, n in enumerate(spine)}

    eligible: List[str] = []
    for name in sorted(cards.keys()):
        info = cards.get(name)
        if not isinstance(info, dict):
            continue
        if info.get("state") != "queued":
            continue
        if not all_predecessors_completed(name, pred_map, cards):
            continue
        eligible.append(name)

    if not eligible:
        return {
            "nextCard": None,
            "suggestedGateRequestId": None,
            "reason": "no_eligible_queued_card",
            "parallelPolicy": PARALLEL_POLICY,
            "snapshotPath": path,
            "queueSpineV1Head": spine[0] if spine else None,
            "queueSpineV1Length": len(spine),
        }

    eligible.sort(key=lambda n: (spine_rank.get(n, 10**9), n))
    pick = eligible[0]
    gate_id = (cards.get(pick) or {}).get("gateRequestId")
    suggested = str(gate_id).strip() if gate_id else None
    return {
        "nextCard": pick,
        "suggestedGateRequestId": suggested,
        "reason": "queue_spine_v1_order_then_lexicographic",
        "parallelPolicy": PARALLEL_POLICY,
        "snapshotPath": path,
        "queueSpineV1Head": spine[0] if spine else None,
        "queueSpineV1Length": len(spine),
    }


def status_summary(repo_root: Optional[Path] = None) -> Dict[str, Any]:
    rr = repo_root or repo_root_from_here()
    p = snapshot_path(rr)
    snap = load_snapshot(rr)
    if snap is None:
        return {"snapshotPath": str(p), "initialized": False}
    cards = snap.get("cards") or {}
    counts: Dict[str, int] = {}
    for _n, info in cards.items():
        if not isinstance(info, dict):
            continue
        st = str(info.get("state") or "unknown")
        counts[st] = counts.get(st, 0) + 1
    return {
        "snapshotPath": str(p),
        "initialized": True,
        "parallelPolicy": snap.get("parallelPolicy"),
        "updatedAt": snap.get("updatedAt"),
        "countsByState": dict(sorted(counts.items())),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_QUEUE_SCHEDULER_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--init", action="store_true", help="Ensure snapshot exists from catalog+DAG")
    ap.add_argument("--next", action="store_true", help="Print next runnable card as JSON")
    ap.add_argument("--status", action="store_true", help="Print queue snapshot summary")
    args = ap.parse_args()
    rr = args.repo_root or repo_root_from_here()

    if args.init:
        snap = ensure_initialized(rr)
        out = {
            "ok": True,
            "snapshotPath": str(snapshot_path(rr)),
            "cardCount": len((snap.get("cards") or {})),
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    if args.next:
        print(json.dumps(compute_next_runnable(rr), ensure_ascii=False, indent=2))
        return 0

    if args.status:
        print(json.dumps(status_summary(rr), ensure_ascii=False, indent=2))
        return 0

    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
