#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""feature_spec から 1〜N の Cursor 向けカードへ分解。"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from feature_autobuild_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def _slug(spec: Dict[str, Any]) -> str:
    s = str(spec.get("feature_id") or "feature")
    return re.sub(r"[^\w]+", "_", s)[:40]


def _sink_ids(cards: List[Dict[str, Any]]) -> List[str]:
    """誰の depends_on にも載らない ID = 当層の終端タスク（verify 直前）。"""
    ids = [str(c["id"]) for c in cards]
    sinks: List[str] = []
    for nid in ids:
        used_as_prereq = False
        for m in cards:
            if nid in [str(x) for x in (m.get("depends_on") or [])]:
                used_as_prereq = True
                break
        if not used_as_prereq:
            sinks.append(nid)
    return sinks if sinks else [ids[-1]]


def _cards_for_domains(spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    intent = spec.get("intent") or {}
    domains = set(intent.get("domain_hints") or [])
    fid = _slug(spec)
    cards: List[Dict[str, Any]] = []

    cards.append(
        {
            "id": f"{fid}_foundation",
            "card_name": f"TENMON_FEATURE_{fid.upper()}_FOUNDATION_CURSOR_AUTO_V1",
            "objective": "仕様書に基づきディレクトリ・命名・DO_NOT_TOUCH を確認しスキャフォールドのみ追加",
            "edit_scope": ["api/**", "docs/**"],
            "depends_on": [],
            "estimated_risk": "low",
        }
    )

    if "api" in domains or "admin" in domains:
        cards.append(
            {
                "id": f"{fid}_api",
                "card_name": f"TENMON_FEATURE_{fid.upper()}_API_CURSOR_AUTO_V1",
                "objective": "REST/ハンドラの追加（契約破壊なし）",
                "edit_scope": ["api/src/**"],
                "depends_on": [f"{fid}_foundation"],
                "estimated_risk": "medium",
            }
        )
    if "ui" in domains:
        dep = [f"{fid}_foundation"]
        if "api" in domains or "admin" in domains:
            dep.append(f"{fid}_api")
        cards.append(
            {
                "id": f"{fid}_ui",
                "card_name": f"TENMON_FEATURE_{fid.upper()}_UI_CURSOR_AUTO_V1",
                "objective": "フロントの局所 UI 追加",
                "edit_scope": ["client/**", "src/**"],
                "depends_on": dep,
                "estimated_risk": "medium",
            }
        )
    if "automation" in domains or "learning" in domains:
        cards.append(
            {
                "id": f"{fid}_automation",
                "card_name": f"TENMON_FEATURE_{fid.upper()}_AUTOMATION_CURSOR_AUTO_V1",
                "objective": "api/automation への補助スクリプト・レポート",
                "edit_scope": ["api/automation/**"],
                "depends_on": [f"{fid}_foundation"],
                "estimated_risk": "low",
            }
        )

    if len(cards) == 1:
        cards.append(
            {
                "id": f"{fid}_implement",
                "card_name": f"TENMON_FEATURE_{fid.upper()}_IMPLEMENT_CURSOR_AUTO_V1",
                "objective": spec.get("title") or "機能の最小実装",
                "edit_scope": ["api/**"],
                "depends_on": [f"{fid}_foundation"],
                "estimated_risk": "medium",
            }
        )

    sk = _sink_ids(cards)
    cards.append(
        {
            "id": f"{fid}_verify",
            "card_name": f"TENMON_FEATURE_{fid.upper()}_VERIFY_CURSOR_AUTO_V1",
            "objective": "テスト・ビルド・受け入れ基準の確認",
            "edit_scope": ["api/**", "tests/**"],
            "depends_on": sk,
            "estimated_risk": "low",
        }
    )

    return cards


CURSOR_CARD_NAME_RE = re.compile(r"^TENMON_[A-Z0-9_]+_CURSOR_AUTO_V1$")


def build(spec: Dict[str, Any]) -> Dict[str, Any]:
    steps = _cards_for_domains(spec)
    for c in steps:
        name = str(c.get("card_name") or "")
        c["format"] = "TENMON_CURSOR_CARD_V1"
        c["card_name_valid"] = bool(CURSOR_CARD_NAME_RE.match(name))
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "feature_id": spec.get("feature_id"),
        "source_spec_title": spec.get("title"),
        "parallel_policy": "dependency_aware",
        "card_name_policy": "TENMON_*_CURSOR_AUTO_V1 のみ",
        "cards": steps,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="card_splitter_v1")
    ap.add_argument("--spec-file", type=str, default="")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    spec_path = Path(args.spec_file) if args.spec_file else auto / "feature_spec.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8", errors="replace"))
    body = build(spec)
    out = Path(args.out) if args.out else auto / "feature_cards_manifest.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
