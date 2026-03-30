#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH_SCHEDULE_SOURCE_BIND_CURSOR_AUTO_V1

infinite_growth_schedule_source.json の唯一の生成元（手直し禁止ポリシー用）。
--write で api/automation へ書き出す。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_INFINITE_GROWTH_SCHEDULE_SOURCE_BIND_CURSOR_AUTO_V1"
SCHEMA = "INFINITE_GROWTH_SCHEDULE_SOURCE_V2"
OUT_FN = "infinite_growth_schedule_source.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_schedule_payload() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "version": 1,
        "generated_by": CARD,
        "generated_at": _utc_iso(),
        "notes": "このファイルは infinite_growth_schedule_source_bind_cursor_auto_v1.py のみが生成する。手編集禁止。",
        "phases": [
            {
                "name": "Phase1",
                "lane": "intent",
                "cards": [
                    {
                        "card_id": "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1",
                        "tier": "A_full_auto_safe",
                        "prerequisites": [],
                        "acceptance": [
                            "npm run check が成功する",
                            "GET /api/audit が ok",
                            "artifact / worktree 衛生 probe が緑",
                        ],
                        "manual_only": False,
                        "repeatable": True,
                        "completion_signal": json.dumps(
                            {
                                "type": "probe_json",
                                "path": "tenmon_artifact_and_worktree_hygiene_result_v1.json",
                                "field": "ok",
                            },
                            ensure_ascii=False,
                            separators=(",", ":"),
                        ),
                    },
                    {
                        "card_id": "TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_CURSOR_AUTO_V2",
                        "tier": "A_full_auto_safe",
                        "prerequisites": ["TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1"],
                        "acceptance": [
                            "Phase1 衛生カードと同等の観測が維持される",
                            "worktree relock 証跡が結果 JSON に残る",
                        ],
                        "manual_only": False,
                        "repeatable": False,
                        "completion_signal": json.dumps(
                            {"type": "always_pending", "path": "", "field": ""},
                            ensure_ascii=False,
                            separators=(",", ":"),
                        ),
                    },
                ],
            },
            {
                "name": "Phase5_ops",
                "lane": "orchestrator",
                "cards": [
                    {
                        "card_id": "TENMON_MULTI_AI_ORCHESTRA_FULL_AUTONOMY_SUPERVISOR_CURSOR_AUTO_V1",
                        "tier": "A_full_auto_safe",
                        "prerequisites": [],
                        "acceptance": [
                            "multi_ai autonomy 契約 JSON が揃っている",
                            "dryrun gate / preflight が定義どおり評価される",
                        ],
                        "manual_only": True,
                        "repeatable": False,
                        "completion_signal": "",
                    },
                ],
            },
        ],
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument(
        "--write",
        action="store_true",
        help=f"{OUT_FN} を上書き生成する",
    )
    ap.add_argument("--stdout", action="store_true", help="JSON を標準出力へ（--write なし時の既定）")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    payload = build_schedule_payload()

    if args.write:
        out = auto_dir / OUT_FN
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"ok": True, "wrote": str(out)}, ensure_ascii=False))
        sys.exit(0)

    if args.stdout or not sys.stdout.isatty():
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        sys.exit(0)

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
