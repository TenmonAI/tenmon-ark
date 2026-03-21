#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON-ARK — Auto queue store V1 (single_flight, snapshot on disk).

Root (first match):
  - TENMON_AUTO_QUEUE_ROOT
  - /var/log/tenmon/auto_queue (if writable)
  - <repo>/api/automation/_queue
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

SCHEMA_VERSION = 1
SNAPSHOT_FILENAME = "queue_snapshot_v1.json"
PARALLEL_POLICY = "single_flight"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_queue_root(repo_root: Path) -> Path:
    env = os.environ.get("TENMON_AUTO_QUEUE_ROOT", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    primary = Path("/var/log/tenmon/auto_queue")
    try:
        primary.mkdir(parents=True, exist_ok=True)
        test = primary / ".write_test"
        test.write_text("ok", encoding="utf-8")
        test.unlink(missing_ok=True)
        return primary.resolve()
    except OSError:
        pass
    return (repo_root / "api" / "automation" / "_queue").resolve()


def queue_root(repo_root: Optional[Path] = None) -> Path:
    rr = repo_root or _repo_root_from_here()
    return _default_queue_root(rr)


def snapshot_path(repo_root: Optional[Path] = None) -> Path:
    return queue_root(repo_root) / SNAPSHOT_FILENAME


def _atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    fd, tmp = tempfile.mkstemp(
        dir=str(path.parent), prefix=".queue_", suffix=".json.tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(raw)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        try:
            Path(tmp).unlink(missing_ok=True)
        except OSError:
            pass


def load_snapshot(repo_root: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    p = snapshot_path(repo_root)
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def save_snapshot(data: Dict[str, Any], repo_root: Optional[Path] = None) -> Path:
    data = dict(data)
    data["version"] = SCHEMA_VERSION
    data["parallelPolicy"] = PARALLEL_POLICY
    data["updatedAt"] = _utc_now_iso()
    p = snapshot_path(repo_root)
    _atomic_write_json(p, data)
    return p


def _empty_snapshot() -> Dict[str, Any]:
    return {
        "version": SCHEMA_VERSION,
        "parallelPolicy": PARALLEL_POLICY,
        "runId": "",
        "updatedAt": _utc_now_iso(),
        "cards": {},
    }


def _load_graph_nodes(repo_root: Path) -> List[str]:
    p = repo_root / "api" / "automation" / "card_dependency_graph_v1.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    nodes = data.get("nodes") or []
    return [str(x) for x in nodes if isinstance(x, str) and x.strip()]


def _load_catalog_cards(repo_root: Path) -> Set[str]:
    p = repo_root / "api" / "automation" / "card_catalog_v1.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    out: Set[str] = set()
    for c in data.get("cards") or []:
        if isinstance(c, dict) and c.get("cardName"):
            out.add(str(c["cardName"]))
    return out


def ensure_initialized(repo_root: Optional[Path] = None) -> Dict[str, Any]:
    rr = repo_root or _repo_root_from_here()
    snap = load_snapshot(rr)
    if snap is None:
        snap = _empty_snapshot()
    graph_nodes = _load_graph_nodes(rr)
    catalog = _load_catalog_cards(rr)
    cards = snap.setdefault("cards", {})
    for name in graph_nodes:
        if name not in catalog:
            continue
        if name not in cards:
            cards[name] = {
                "state": "queued",
                "updatedAt": _utc_now_iso(),
                "gateRequestId": None,
            }
    snap["version"] = SCHEMA_VERSION
    snap["parallelPolicy"] = PARALLEL_POLICY
    save_snapshot(snap, rr)
    return snap


def _running_cards(cards: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    for name, info in cards.items():
        if isinstance(info, dict) and info.get("state") == "running":
            out.append(name)
    return sorted(out)


def try_begin_card(card_name: str, repo_root: Optional[Path] = None) -> Tuple[bool, str]:
    """single_flight: only one running. Returns (ok, reason)."""
    rr = repo_root or _repo_root_from_here()
    snap = load_snapshot(rr)
    if snap is None:
        ensure_initialized(rr)
        snap = load_snapshot(rr)
    if snap is None:
        return False, "no_snapshot_after_init"
    cards = snap.get("cards") or {}
    if card_name not in cards:
        return False, "card_not_in_queue"
    running = _running_cards(cards)
    if running:
        if running[0] == card_name:
            return True, "already_running_same_card"
        return False, "single_flight_busy"
    st = cards[card_name].get("state")
    if st not in ("queued",):
        return False, f"invalid_state_for_begin:{st}"
    cards[card_name]["state"] = "running"
    cards[card_name]["updatedAt"] = _utc_now_iso()
    save_snapshot(snap, rr)
    return True, "ok"


def _downstream_adj(edges: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """before -> after: after depends on before. adj[u] = list of v that depend on u."""
    adj: Dict[str, List[str]] = {}
    for e in edges:
        if not isinstance(e, dict):
            continue
        b = e.get("before")
        a = e.get("after")
        if not isinstance(b, str) or not isinstance(a, str):
            continue
        adj.setdefault(b, []).append(a)
    for k in adj:
        adj[k] = sorted(set(adj[k]))
    return adj


def _pred_map(edges: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """after -> list of before (dependencies)."""
    pred: Dict[str, List[str]] = {}
    for e in edges:
        if not isinstance(e, dict):
            continue
        b = e.get("before")
        a = e.get("after")
        if not isinstance(b, str) or not isinstance(a, str):
            continue
        pred.setdefault(a, []).append(b)
    for k in pred:
        pred[k] = sorted(set(pred[k]))
    return pred


def _load_edges(repo_root: Path) -> List[Dict[str, Any]]:
    p = repo_root / "api" / "automation" / "card_dependency_graph_v1.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    return list(data.get("edges") or [])


def cascade_blocked_from_failed(
    failed_card: str, snap: Dict[str, Any], repo_root: Path
) -> None:
    edges = _load_edges(repo_root)
    adj = _downstream_adj(edges)
    cards = snap.setdefault("cards", {})
    seen: Set[str] = set()
    stack = [failed_card]
    while stack:
        u = stack.pop()
        for v in adj.get(u, []):
            if v in seen:
                continue
            seen.add(v)
            info = cards.get(v)
            if not isinstance(info, dict):
                continue
            if info.get("state") == "queued":
                info["state"] = "blocked"
                info["updatedAt"] = _utc_now_iso()
                info.setdefault("note", "")
                info["note"] = (info.get("note") or "") + f"blocked_due_to_failed:{failed_card};"
            stack.append(v)


def finish_from_runner_record(
    card_name: str, record: Dict[str, Any], repo_root: Optional[Path] = None
) -> None:
    """Map runner record to terminal queue state; clears running."""
    rr = repo_root or _repo_root_from_here()
    snap = load_snapshot(rr)
    if snap is None:
        return
    cards = snap.setdefault("cards", {})
    info = cards.get(card_name)
    if not isinstance(info, dict):
        return
    if info.get("state") != "running":
        return
    ok = bool(record.get("ok"))
    fail = str(record.get("fail") or "")
    gate_id = record.get("gateRequestId")
    gate_id_str = str(gate_id).strip() if gate_id else None

    if ok:
        info["state"] = "completed"
        info["gateRequestId"] = None
        info["updatedAt"] = _utc_now_iso()
    elif fail == "human_judgement_required":
        if gate_id_str:
            info["state"] = "waiting_human_gate"
            info["gateRequestId"] = gate_id_str
        else:
            info["state"] = "queued"
            info.setdefault("note", "")
            info["note"] = (info.get("note") or "") + "human_gate_no_request_id;"
        info["updatedAt"] = _utc_now_iso()
    elif fail == "human_gate_not_approved":
        info["state"] = "queued"
        info["updatedAt"] = _utc_now_iso()
    else:
        info["state"] = "failed"
        info["updatedAt"] = _utc_now_iso()
        cascade_blocked_from_failed(card_name, snap, rr)
    save_snapshot(snap, rr)


def attach_human_gate_request(
    card_name: str, gate_request_id: str, repo_root: Optional[Path] = None
) -> None:
    """
    After runner finish, if supervisor_fallback added gateRequestId to the record,
    promote queue card from queued -> waiting_human_gate.
    """
    rr = repo_root or _repo_root_from_here()
    gid = str(gate_request_id).strip()
    if not gid:
        return
    snap = load_snapshot(rr)
    if snap is None:
        return
    cards = snap.setdefault("cards", {})
    info = cards.get(card_name)
    if not isinstance(info, dict):
        return
    if info.get("state") != "queued":
        return
    info["state"] = "waiting_human_gate"
    info["gateRequestId"] = gid
    info["updatedAt"] = _utc_now_iso()
    save_snapshot(snap, rr)


def supervisor_mark_running(card_name: str, repo_root: Optional[Path] = None) -> Tuple[bool, str]:
    return try_begin_card(card_name, repo_root)


def supervisor_finish(
    card_name: str,
    *,
    ok: bool,
    fail: str = "",
    gate_request_id: Optional[str] = None,
    repo_root: Optional[Path] = None,
) -> None:
    rec: Dict[str, Any] = {"ok": ok, "fail": fail}
    if gate_request_id:
        rec["gateRequestId"] = gate_request_id
    finish_from_runner_record(card_name, rec, repo_root)
