#!/usr/bin/env python3
"""
TENMON-ARK — human_gate_store_v1
Persist human gate records under /var/log/tenmon/human_gate/ or api/automation/_human_gate/
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_AUTOMATION_DIR = Path(__file__).resolve().parent


def resolve_human_gate_root() -> Path:
    env = os.environ.get("TENMON_HUMAN_GATE_ROOT")
    if env:
        p = Path(env)
        p.mkdir(parents=True, exist_ok=True)
        return p
    canonical = Path("/var/log/tenmon/human_gate")
    try:
        canonical.mkdir(parents=True, exist_ok=True)
        probe = canonical / ".tenmon_hg_probe"
        probe.write_text("ok", encoding="utf-8")
        try:
            probe.unlink()
        except OSError:
            pass
        return canonical
    except OSError:
        pass
    fb = _AUTOMATION_DIR / "_human_gate"
    fb.mkdir(parents=True, exist_ok=True)
    return fb


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _path_for(request_id: str) -> Path:
    rid = request_id.replace("/", "").replace("..", "")
    return resolve_human_gate_root() / f"{rid}.json"


def _atomic_write(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def create_pending_gate(card_name: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Create a pending record; returns requestId."""
    request_id = uuid.uuid4().hex
    now = _now_iso()
    rec: Dict[str, Any] = {
        "requestId": request_id,
        "cardName": card_name,
        "status": "pending",
        "createdAt": now,
        "updatedAt": now,
        "decidedBy": None,
        "note": "",
        "metadata": metadata or {},
    }
    _atomic_write(_path_for(request_id), rec)
    return request_id


def get_gate_record(request_id: str) -> Optional[Dict[str, Any]]:
    p = _path_for(request_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def list_pending_gates() -> List[Dict[str, Any]]:
    """All records with status == pending."""
    return list_gates(status="pending")


def list_gates(status: Optional[str] = None) -> List[Dict[str, Any]]:
    root = resolve_human_gate_root()
    out: List[Dict[str, Any]] = []
    if not root.exists():
        return out
    for p in sorted(root.glob("*.json")):
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if status is None or rec.get("status") == status:
            out.append(rec)
    return out


def apply_gate_decision(
    request_id: str,
    decision: str,
    by: str,
    note: str = "",
) -> Dict[str, Any]:
    """
    decision: approved | rejected | held
    Returns updated record or raises ValueError.
    """
    if decision not in ("approved", "rejected", "held"):
        raise ValueError(f"invalid decision: {decision}")
    rec = get_gate_record(request_id)
    if not rec:
        raise ValueError(f"unknown requestId: {request_id}")
    if rec.get("status") != "pending":
        raise ValueError(f"request not pending: {rec.get('status')}")
    rec["status"] = decision
    rec["updatedAt"] = _now_iso()
    rec["decidedBy"] = by
    rec["note"] = note or rec.get("note", "")
    _atomic_write(_path_for(request_id), rec)
    return rec


def is_approved(request_id: str) -> bool:
    rec = get_gate_record(request_id)
    return bool(rec and rec.get("status") == "approved")
