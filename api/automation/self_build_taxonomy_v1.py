#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_02 — manifest 入力で未達要素を blocker taxonomy に分類（read-only）
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_RETRY_CURSOR_AUTO_V1"

TAXONOMY_IDS: Tuple[str, ...] = (
    "surface",
    "route",
    "longform",
    "density",
    "runtime_acceptance",
    "learning_input_quality",
    "learning_seed_quality",
    "evidence_grounding",
    "seal_contract",
    "self_repair",
    "cursor_execution",
    "remote_admin",
)

TAXONOMY_DEFS: Dict[str, Dict[str, str]] = {
    "surface": {"domain": "conversation", "description": "表層・文体・worldclass surface"},
    "route": {"domain": "conversation", "description": "route / authority"},
    "longform": {"domain": "conversation", "description": "長文化・構造"},
    "density": {"domain": "conversation", "description": "静的密度・baseline"},
    "runtime_acceptance": {"domain": "runtime", "description": "VPS / health / probe / npm build"},
    "learning_input_quality": {"domain": "learning", "description": "KHS / candidate / 入力品質"},
    "learning_seed_quality": {"domain": "learning", "description": "決定論 seed / KG1"},
    "evidence_grounding": {"domain": "learning", "description": "根拠・quote・grounding"},
    "seal_contract": {"domain": "integration", "description": "seal / governor / overall_100"},
    "self_repair": {"domain": "repair", "description": "自己修復・dangerous patch・retry"},
    "cursor_execution": {"domain": "automation", "description": "Cursor カード実行・campaign"},
    "remote_admin": {"domain": "operations", "description": "遠隔司令塔・管理者 route"},
}


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def infer_taxonomy(entry: Dict[str, Any]) -> Tuple[str, str]:
    """taxonomy_id, rationale"""
    fp = str(entry.get("file_path") or "").lower()
    grp = str(entry.get("group") or "")
    role = str(entry.get("role") or "").lower()
    base = Path(fp).name.lower()

    rules: List[Tuple[re.Pattern[str], str, str]] = [
        (re.compile(r"remote_cursor|admin_cursor|founder.*remote", re.I), "remote_admin", "path: remote/admin"),
        (re.compile(r"self_repair|dangerous_patch|fail_classifier|retry_queue", re.I), "self_repair", "path: self_repair"),
        (re.compile(r"vps_acceptance|integrated_accept|runtime_probe|probe_matrix|health", re.I), "runtime_acceptance", "path: runtime/acceptance"),
        (re.compile(r"seal|governor|worldclass_seal|overall_100", re.I), "seal_contract", "path: seal/governor"),
        (re.compile(r"kg0|kg2|khs|candidate|learning_input|health_gate", re.I), "learning_input_quality", "path: learning input"),
        (re.compile(r"kg1|seed|deterministic_seed", re.I), "learning_seed_quality", "path: seed"),
        (re.compile(r"evidence|ground|quote", re.I), "evidence_grounding", "path: evidence"),
        (re.compile(r"surface|stage1|worldclass_surface|bleed", re.I), "surface", "path: surface"),
        (re.compile(r"route|stage2|authority", re.I), "route", "path: route"),
        (re.compile(r"longform|stage3", re.I), "longform", "path: longform"),
        (re.compile(r"density|stage5|static|synapse", re.I), "density", "path: density"),
        (re.compile(r"cursor|campaign|card_generator|autobuild|executor_bridge", re.I), "cursor_execution", "path: cursor/campaign"),
    ]
    for pat, tid, why in rules:
        if pat.search(fp) or pat.search(base):
            return tid, why
    if grp == "constitution_docs":
        return "seal_contract", "group: constitution"
    if grp == "generated_cursor_cards":
        return "cursor_execution", "group: generated_cursor_apply"
    if grp == "runtime_verification_scripts":
        return "runtime_acceptance", "group: scripts"
    if grp == "learning_seed_seal_scorer":
        return "learning_input_quality", "group: learning bundle"
    return "cursor_execution", "default: automation general"


def severity_for(tax: str, status: str) -> str:
    if status in ("empty", "missing"):
        return "high"
    if status == "minimal_stub?":
        if tax in ("seal_contract", "runtime_acceptance", "self_repair"):
            return "high"
        return "medium"
    return "low"


def confidence_for(status: str) -> float:
    return {"present": 0.55, "minimal_stub?": 0.82, "empty": 0.95, "missing": 0.99, "unreadable": 0.9}.get(status, 0.6)


def recommended_stage(tax: str) -> int:
    order = {
        "runtime_acceptance": 1,
        "seal_contract": 1,
        "self_repair": 2,
        "surface": 2,
        "route": 3,
        "longform": 3,
        "density": 4,
        "learning_input_quality": 4,
        "learning_seed_quality": 4,
        "evidence_grounding": 4,
        "cursor_execution": 5,
        "remote_admin": 5,
    }
    return order.get(tax, 3)


def is_undelivered(entry: Dict[str, Any]) -> bool:
    st = str(entry.get("status_guess") or "")
    return st in ("minimal_stub?", "empty", "missing", "unreadable")


def build(manifest_path: Path) -> Dict[str, Any]:
    man = read_json(manifest_path)
    entries: List[Dict[str, Any]] = list(man.get("entries") or [])

    blockers: List[Dict[str, Any]] = []
    for e in entries:
        if not is_undelivered(e):
            continue
        tax, why = infer_taxonomy(e)
        st = str(e.get("status_guess") or "")
        sev = severity_for(tax, st)
        blockers.append(
            {
                "id": str(e.get("id") or ""),
                "taxonomy_id": tax,
                "source_manifest_id": e.get("id"),
                "file_path": e.get("file_path"),
                "group": e.get("group"),
                "role": e.get("role"),
                "status_guess": st,
                "severity": sev,
                "confidence": confidence_for(st),
                "dependency_guess": list(e.get("dependency_guess") or []),
                "recommended_stage": recommended_stage(tax),
                "rationale": why,
            }
        )

    taxonomy_payload = {
        "version": VERSION,
        "card": CARD,
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "generatedAt": utc_now_iso(),
        "input_manifest": str(manifest_path),
        "taxonomy_ids": list(TAXONOMY_IDS),
        "taxonomy_definitions": {k: {**v, "id": k} for k, v in TAXONOMY_DEFS.items()},
        "undelivered_entry_count": len(blockers),
        "total_manifest_entries": len(entries),
        "blockers": blockers,
        "notes": "未達 = status_guess が minimal_stub? / empty / missing / unreadable の manifest 行のみ",
    }
    return taxonomy_payload


def main() -> int:
    ap = argparse.ArgumentParser(description="self_build_taxonomy_v1")
    ap.add_argument("--manifest", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    mp = Path(args.manifest) if args.manifest else auto / "self_build_manifest.json"
    body = build(mp)
    out = Path(args.out) if args.out else auto / "self_build_blocker_taxonomy.json"
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out.write_text(text, encoding="utf-8")
    if args.stdout_json:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
