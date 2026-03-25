#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""full_responsibility_map.json — ディレクトリ/プレフィックス → 責務（静的マップ）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from observation_os_common_v1 import CARD, VERSION, utc_now_iso

# 観測用の論理責務（コード改変なし）
OWNERS: List[Dict[str, Any]] = [
    {
        "id": "conversation_completion",
        "paths": ["automation/chat_ts_", "chat_ts_completion", "scripts/chat_ts_"],
        "description": "Stage1-5 / surface / route / longform / worldclass seal",
    },
    {
        "id": "chat_self_improvement_os",
        "paths": ["automation/tenmon_self_improvement_", "automation/improvement_ledger_v1.jsonl"],
        "description": "ledger / residual / governor / card autogen",
    },
    {
        "id": "kokuzo_learning",
        "paths": ["automation/khs_", "automation/kg2", "scripts/kg2", "scripts/khs_", "scripts/deterministic_seed"],
        "description": "KG0-KG2B / Seed / health gate",
    },
    {
        "id": "orchestration",
        "paths": ["automation/full_orchestrator_v1.py", "automation/kokuzo_learning_improvement_os_integrated_v1.py"],
        "description": "full orchestrator / learning-improvement integration",
    },
    {
        "id": "forensic_observation",
        "paths": ["automation/tenmon_total_forensic_", "scripts/tenmon_total_forensic_reveal_v1.sh"],
        "description": "total forensic / runtime probe collect",
    },
    {
        "id": "observation_os",
        "paths": ["automation/observation_os_", "automation/repo_manifest_v1.py", "automation/blocker_taxonomy_v1.py"],
        "description": "本観測 OS モジュール群",
    },
    {
        "id": "routes_chat",
        "paths": ["src/routes/chat.ts"],
        "description": "会話ルート実装（本カードでは参照のみ）",
    },
]


def main() -> int:
    ap = argparse.ArgumentParser(description="responsibility_map_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--write-md", type=str, default="")
    args = ap.parse_args()
    body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "owners": OWNERS,
    }
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    if args.write_md:
        lines = ["# Responsibility map", "", "| id | description |", "|----|-------------|"]
        for o in OWNERS:
            lines.append(f"| `{o['id']}` | {o['description'][:100]} |")
        Path(args.write_md).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
