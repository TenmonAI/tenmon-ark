#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
priority_queue.json — full_orchestrator / forensic / seal を読み、
taxonomy に沿って ready / pending / blocked に分類（read-only）
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List

from observation_os_common_v1 import BLOCKER_TAXONOMY_IDS, CARD, VERSION, api_root, utc_now_iso


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _classify_taxonomy(blocker: str) -> str:
    b = str(blocker).lower()
    rules = [
        ("surface", ("surface", "noise")),
        ("route", ("route", "authority")),
        ("longform", ("longform",)),
        ("density", ("density", "static")),
        ("runtime", ("runtime", "probe")),
        ("learning_seed_quality", ("seed", "kg1", "deterministic")),
        ("learning_input_quality", ("kg0", "kg2", "health", "passable", "candidate")),
        ("evidence_grounding", ("evidence", "quote", "ground")),
        ("seal_contract", ("seal", "governor", "overall", "structural")),
        ("remote_execution", ("manual", "vps", "ssh", "no_seal")),
    ]
    for tid, keys in rules:
        if any(k in b for k in keys):
            return tid
    return "seal_contract"


def _build() -> Dict[str, Any]:
    api = api_root()
    orch_dir = Path(
        os.environ.get("TENMON_OBSERVATION_ORCH_DIR", "")
        or (api / "automation" / "out" / "tenmon_full_orchestrator_v1")
    )
    forensic_dir = Path(
        os.environ.get("TENMON_OBSERVATION_FORENSIC_DIR", "")
        or (api / "automation" / "out" / "tenmon_total_forensic_reveal_v1" / "latest")
    )

    queue_path = orch_dir / "full_orchestrator_queue.json"
    if not queue_path.is_file():
        alt = orch_dir / "orchestrator_snap" / "full_orchestrator_queue.json"
        if alt.is_file():
            queue_path = alt
    orch = _read(queue_path)
    if "queue" in orch:
        orch = orch["queue"]

    ready: List[Dict[str, Any]] = []
    for row in orch.get("next_queue") or []:
        ready.append(
            {
                "cursor_card": row.get("cursor_card"),
                "vps_card": row.get("vps_card"),
                "source": "orchestrator_next_queue",
                "blocker_types": row.get("blocker_types") or [],
                "auto_apply_allowed": row.get("auto_apply_allowed", True),
            }
        )

    pending: List[Dict[str, Any]] = []
    for row in orch.get("pending_queue") or []:
        pending.append(
            {
                "cursor_card": row.get("cursor_card"),
                "vps_card": row.get("vps_card"),
                "source": "orchestrator_pending_queue",
                "blocker_types": row.get("blocker_types") or [],
            }
        )

    blocked: List[Dict[str, Any]] = []
    bc_path = orch_dir / "blocked_cards.json"
    bc = _read(bc_path)
    for b in bc.get("blocked") or []:
        blocked.append({**b, "source": "orchestrator_blocked_cards"})
    for m in bc.get("manual_apply_required") or []:
        blocked.append({**m, "source": "orchestrator_manual_apply"})

    fv = _read(forensic_dir / "integrated_forensic_verdict.json")
    if not fv.get("unified_observation_ok", True):
        blocked.append(
            {
                "reason": "forensic_unified_not_green",
                "source": "forensic_integrated_verdict",
                "path": str(forensic_dir / "integrated_forensic_verdict.json"),
            }
        )

    nxt = _read(forensic_dir / "next_priority_cards.json")
    for item in nxt.get("items") or []:
        if len(ready) >= 3:
            pending.append({**item, "source": "forensic_next_priority"})
        else:
            ready.append({**item, "source": "forensic_next_priority"})

    seal_path = Path(os.environ.get("TENMON_ORCHESTRATOR_SEAL_DIR", "").strip() or "/var/log/tenmon/card")
    try:
        if seal_path.is_symlink():
            seal_dir = (seal_path.parent / os.readlink(str(seal_path))).resolve()
        else:
            seal_dir = seal_path.resolve()
    except Exception:
        seal_dir = seal_path
    final = _read(seal_dir / "final_verdict.json") if seal_dir.is_dir() else {}
    for bl in final.get("blockers") or []:
        tid = _classify_taxonomy(str(bl))
        pending.append(
            {
                "blocker": bl,
                "taxonomy_id": tid,
                "source": "seal_final_verdict",
            }
        )

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "taxonomy_ids": list(BLOCKER_TAXONOMY_IDS),
        "inputs": {
            "orchestrator_dir": str(orch_dir),
            "forensic_dir": str(forensic_dir),
            "seal_dir": str(seal_dir),
        },
        "ready": ready[:20],
        "pending": pending[:80],
        "blocked": blocked[:80],
        "counts": {
            "ready": len(ready),
            "pending": len(pending),
            "blocked": len(blocked),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="priority_queue_generator_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--write-md", type=str, default="")
    args = ap.parse_args()
    body = _build()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    if args.write_md:
        lines = [
            "# Priority queue",
            "",
            f"- ready: {body['counts']['ready']}",
            f"- pending: {body['counts']['pending']}",
            f"- blocked: {body['counts']['blocked']}",
            "",
            "## ready (sample)",
        ]
        for r in body["ready"][:12]:
            lines.append(f"- `{r.get('cursor_card')}` ({r.get('source')})")
        Path(args.write_md).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
