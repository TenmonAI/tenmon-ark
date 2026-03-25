#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_02 — taxonomy の blockers から ready/pending/blocked/dangerous キューと next_cards(1〜3)
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

# 数値が小さいほど next に近い
TYPE_PRIORITY: Dict[str, int] = {
    "runtime_acceptance": 0,
    "seal_contract": 10,
    "self_repair": 15,
    "surface": 20,
    "route": 30,
    "longform": 40,
    "density": 50,
    "learning_input_quality": 60,
    "learning_seed_quality": 65,
    "evidence_grounding": 70,
    "cursor_execution": 80,
    "remote_admin": 95,
}

DANGEROUS_PATH_RES: List[re.Pattern[str]] = [
    re.compile(r"/routes/chat\.ts|/chat\.ts$", re.I),
    re.compile(r"/dist/|/dist$", re.I),
    re.compile(r"kokuzo_pages.*\.(md|txt)$", re.I),
    re.compile(r"migration|/schema\.sql|ALTER\s+TABLE", re.I),
    re.compile(r"systemd|\.service\b", re.I),
]


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


def is_dangerous_path(fp: str) -> bool:
    s = str(fp or "")
    for pat in DANGEROUS_PATH_RES:
        if pat.search(s):
            return True
    return False


def card_name_from_path(fp: str) -> str:
    stem = Path(fp).stem
    up = re.sub(r"[^\w]+", "_", stem).upper()[:56]
    return f"TENMON_SELF_BUILD_FIX_{up}_CURSOR_AUTO_V1" if up else "TENMON_SELF_BUILD_FIX_UNKNOWN_CURSOR_AUTO_V1"


def build(tax_path: Path, max_next: int = 3) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    tax = read_json(tax_path)
    blockers: List[Dict[str, Any]] = list(tax.get("blockers") or [])

    dangerous_cards: List[Dict[str, Any]] = []
    blocked_cards: List[Dict[str, Any]] = []
    pending_cards: List[Dict[str, Any]] = []
    ready_cards: List[Dict[str, Any]] = []

    for b in blockers:
        bid = str(b.get("id") or "")
        fp = str(b.get("file_path") or "")
        tax_id = str(b.get("taxonomy_id") or "")
        sev = str(b.get("severity") or "medium")

        card = {
            "id": bid,
            "taxonomy_id": tax_id,
            "file_path": fp,
            "severity": sev,
            "confidence": b.get("confidence"),
            "recommended_stage": b.get("recommended_stage"),
            "card_name": card_name_from_path(fp),
            "queue_hint": "automation_followup",
        }

        if is_dangerous_path(fp):
            card["dangerous_reason"] = "path_matches_auto_apply_blocklist"
            dangerous_cards.append(card)
            continue

        if tax_id == "seal_contract" and sev == "high":
            card["blocked_reason"] = "seal_contract_high_without_safe_path"
            blocked_cards.append(card)
            continue

        if tax_id in ("runtime_acceptance", "self_repair") and sev == "high":
            pending_cards.append({**card, "pending_reason": "needs_vps_or_manual_verify"})
            continue

        if sev == "low":
            ready_cards.append(card)
        else:
            pending_cards.append({**card, "pending_reason": "medium_severity_stub"})

    def sort_key(c: Dict[str, Any]) -> tuple:
        tid = str(c.get("taxonomy_id") or "")
        return (TYPE_PRIORITY.get(tid, 100), -float(c.get("confidence") or 0))

    ready_cards.sort(key=sort_key)
    cap = max(1, min(max_next, 3))
    next_cards = ready_cards[:cap]

    if len(next_cards) < 1 and pending_cards:
        pending_sorted = sorted(pending_cards, key=sort_key)
        next_cards = pending_sorted[:cap]

    if len(next_cards) < 1:
        next_cards = [
            {
                "id": "synthetic_manifest_refresh",
                "taxonomy_id": "cursor_execution",
                "file_path": "api/automation/self_build_manifest_v1.py",
                "severity": "low",
                "confidence": 0.35,
                "recommended_stage": 5,
                "card_name": "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_CURSOR_AUTO_V1",
                "queue_hint": "refresh_observation",
                "note": "blockers 空—manifest 再生成で未達検出を更新",
            }
        ]

    queue_body = {
        "version": VERSION,
        "card": CARD,
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "generatedAt": utc_now_iso(),
        "input_taxonomy": str(tax_path),
        "policy": {
            "dangerous_excluded_from_auto_apply": True,
            "next_cards_max": 3,
            "next_cards_min": 1,
        },
        "counts": {
            "ready": len(ready_cards),
            "pending": len(pending_cards),
            "blocked": len(blocked_cards),
            "dangerous": len(dangerous_cards),
        },
        "ready_cards": ready_cards,
        "pending_cards": pending_cards,
        "blocked_cards": blocked_cards,
        "dangerous_cards": dangerous_cards,
        "next_cards": next_cards,
    }
    return queue_body, dangerous_cards


def main() -> int:
    ap = argparse.ArgumentParser(description="self_build_priority_queue_v1")
    ap.add_argument("--taxonomy", type=str, default="")
    ap.add_argument("--out-queue", type=str, default="")
    ap.add_argument("--out-dangerous", type=str, default="")
    ap.add_argument("--max-next", type=int, default=3)
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    tp = Path(args.taxonomy) if args.taxonomy else auto / "self_build_blocker_taxonomy.json"
    queue_body, dangerous = build(tp, max_next=args.max_next)

    qpath = Path(args.out_queue) if args.out_queue else auto / "self_build_priority_queue.json"
    qpath.write_text(json.dumps(queue_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    dpath = Path(args.out_dangerous) if args.out_dangerous else auto / "self_build_dangerous_cards.json"
    dbody = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "cards": dangerous,
        "count": len(dangerous),
    }
    dpath.write_text(json.dumps(dbody, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # VPS 検証用: 既存 observation の blocker_taxonomy.json / priority_queue.json と名前衝突しないよう別ディレクトリにエイリアス名で複製
    alias_dir = auto / "out" / "tenmon_self_build_parent_02_v1"
    alias_dir.mkdir(parents=True, exist_ok=True)
    if tp.is_file():
        (alias_dir / "blocker_taxonomy.json").write_text(tp.read_text(encoding="utf-8"), encoding="utf-8")
    (alias_dir / "priority_queue.json").write_text(
        json.dumps(queue_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    (alias_dir / "dangerous_cards.json").write_text(
        json.dumps(dbody, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    (auto / "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\nnext_cards={len(queue_body.get('next_cards') or [])}\n"
        f"alias_dir={alias_dir}\n",
        encoding="utf-8",
    )

    retry = auto / "generated_cursor_apply" / "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_RETRY_CURSOR_AUTO_V1.md"
    retry.parent.mkdir(parents=True, exist_ok=True)
    retry.write_text(
        "\n".join(
            [
                f"# {FAIL_NEXT}",
                "",
                f"親カード: `{CARD}`",
                "",
                "## トリガー",
                "",
                "- `self_build_priority_queue.json` の `next_cards` が空",
                "- `dangerous_cards` に想定外のパスが混入",
                "",
                "## 手順",
                "",
                "1. `python3 self_build_manifest_v1.py`",
                "2. `python3 self_build_taxonomy_v1.py`",
                "3. `python3 self_build_priority_queue_v1.py`",
                "",
                "## 参照",
                "",
                "- `api/docs/constitution/TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_CURSOR_AUTO_V1.md`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"next_cards": queue_body.get("next_cards")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
