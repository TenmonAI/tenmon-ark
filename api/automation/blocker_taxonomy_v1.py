#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blocker_taxonomy.json — 会話系・learning 系を同一分類に載せる正規 taxonomy（read-only 定義）
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from observation_os_common_v1 import BLOCKER_TAXONOMY_IDS, CARD, VERSION, utc_now_iso


def _taxonomy() -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    defs: Dict[str, Dict[str, Any]] = {
        "surface": {
            "domain": "conversation",
            "description": "表層ノイズ・文体・worldclass surface 系",
            "example_blockers": ["surface_noise_remaining", "worldclass_surface_not_clean"],
        },
        "route": {
            "domain": "conversation",
            "description": "routeReason / authority / 逸脱検知",
            "example_blockers": ["route_authority_not_clean"],
        },
        "longform": {
            "domain": "conversation",
            "description": "長文化構造・見立て・展開・落ち",
            "example_blockers": ["longform_quality_not_clean"],
        },
        "density": {
            "domain": "conversation",
            "description": "静的密度・synapse/seed lock・baseline",
            "example_blockers": ["density_lock_not_clean", "static_not_100"],
        },
        "runtime": {
            "domain": "conversation",
            "description": "HTTP /chat プローブ・runtime_matrix",
            "example_blockers": ["runtime_probe_failure_remaining"],
        },
        "learning_input_quality": {
            "domain": "learning",
            "description": "KHS 健全性・candidate・入力パイプライン",
            "example_blockers": ["kg0_fail", "kg2_bad_quote_in_candidates"],
        },
        "learning_seed_quality": {
            "domain": "learning",
            "description": "決定論 Seed・aggregate gate",
            "example_blockers": ["kg1_pipeline_fail"],
        },
        "evidence_grounding": {
            "domain": "learning",
            "description": "根拠スロット・quote・doc 整合（evidence 還元）",
            "example_blockers": ["evidence_slot_incomplete", "quote_hash_mismatch"],
        },
        "seal_contract": {
            "domain": "integration",
            "description": "seal 成果物・governor・overall_100・構造欠落",
            "example_blockers": ["seal_governor_structural_not_ok", "chat_ts_overall_100_false"],
        },
        "remote_execution": {
            "domain": "operations",
            "description": "VPS シェル・curl・手動適用・timer 外実行",
            "example_blockers": ["manual_apply_required", "no_seal_dir"],
        },
    }
    for tid in BLOCKER_TAXONOMY_IDS:
        row = {"id": tid, **defs.get(tid, {"description": "", "domain": "unknown"})}
        items.append(row)
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "taxonomy": items,
        "notes": [
            "conversation / learning は domain で区別しつつ id は単一 namespace",
            "full_orchestrator の TYPE_PRIORITY と整合可能",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="blocker_taxonomy_v1")
    ap.add_argument("--out", type=str, default="", help="既定: stdout のみ / --out でファイル")
    ap.add_argument("--write-md", type=str, default="", help="任意: 同内容の .md")
    args = ap.parse_args()
    body = _taxonomy()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    if args.write_md:
        lines = [
            "# Blocker taxonomy",
            "",
            f"- generatedAt: `{body['generatedAt']}`",
            "",
            "| id | domain | description |",
            "|----|--------|---------------|",
        ]
        for it in body["taxonomy"]:
            lines.append(
                f"| `{it['id']}` | {it.get('domain', '')} | {it.get('description', '')[:80]} |"
            )
        Path(args.write_md).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
