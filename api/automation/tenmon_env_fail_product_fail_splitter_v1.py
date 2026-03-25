#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ENV_FAIL_PRODUCT_FAIL_SPLITTER_CURSOR_AUTO_V1

env fail と product fail を最終判定前に分離し、mixed verdict を明示する。
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_ENV_FAIL_PRODUCT_FAIL_SPLITTER_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_env_fail_product_fail_splitter_verdict.json"

# gate / health / audit 契約系 → env 側 bucket
ENV_TOKENS = frozenset(
    {
        "gate:health",
        "gate:audit",
        "gate:audit_build",
        "gate_audit_build_fail",
    }
)

# 会話・lived・継続・UI 残差系 → product 側 bucket
PRODUCT_TOKENS = frozenset(
    {
        "chat:continuity_failed",
        "chat:new_chat_failed",
        "chat:refresh_empty_response",
        "chat:refresh_second_request_failed",
        "chat:threadId_missing_in_response",
        "continuity_fail",
        "duplicate_or_bleed_fail",
        "newchat_reload_residue",
        "refresh_restore_fail",
        "url_sync_missing",
        "meta_leak_none",
        "nas_ready",
    }
)

# tenmon_current_state_blockers_by_system: サブシステム別に env / product へ寄せる
ENV_SYSTEM_KEYS = frozenset({"infra_gate"})
PRODUCT_SYSTEM_KEYS = frozenset(
    {
        "conversation_backend",
        "pwa_lived_proof",
        "repo_hygiene",
    }
)


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def normalize_blocker_list(raw: Any) -> list[str]:
    out: list[str] = []
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, str):
            s = x.strip()
            if s:
                out.append(s)
        elif isinstance(x, dict):
            # {"id": "...", "reason": "..."} 等
            for k in ("id", "code", "name", "blocker"):
                if k in x and x[k]:
                    out.append(str(x[k]).strip())
                    break
    return out


def flatten_system_blockers(by_sys: dict[str, Any], keys: frozenset[str]) -> list[str]:
    acc: list[str] = []
    for name in keys:
        ent = by_sys.get(name)
        if not isinstance(ent, dict):
            continue
        acc.extend(normalize_blocker_list(ent.get("primary_blockers")))
    return acc


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    pre = load_json(auto / "pwa_playwright_preflight.json")
    blk_doc = load_json(auto / "pwa_final_completion_blockers.json")
    by_sys = load_json(auto / "tenmon_current_state_blockers_by_system.json")

    blk = normalize_blocker_list(blk_doc.get("blockers") or blk_doc.get("postfix_blockers"))

    env_failure = bool(pre.get("env_failure"))

    env_blockers = [b for b in blk if b in ENV_TOKENS]
    product_blockers = [b for b in blk if b in PRODUCT_TOKENS]
    unclassified = [b for b in blk if b not in ENV_TOKENS and b not in PRODUCT_TOKENS]

    env_only = bool(env_failure and len(product_blockers) == 0)
    mixed = bool(env_blockers and product_blockers)

    # システム別（lib 欠損・gate split は infra、continuity 実ドロップは conversation 等）
    sys_env = flatten_system_blockers(by_sys, ENV_SYSTEM_KEYS)
    sys_product = flatten_system_blockers(by_sys, PRODUCT_SYSTEM_KEYS)
    mixed_system = bool(sys_env and sys_product)

    if env_failure:
        recommended = "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1"
    elif product_blockers:
        recommended = "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1"
    else:
        recommended = None

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "env_failure": env_failure,
        "env_blockers": env_blockers,
        "product_blockers": product_blockers,
        "unclassified_postfix_blockers": unclassified,
        "env_only": env_only,
        "mixed": mixed,
        "mixed_system": mixed_system,
        "mixed_verdict_forbidden": mixed,
        "by_system": {
            "infra_gate_env_signals": sys_env,
            "product_side_signals": sys_product,
        },
        "recommended_next_card": recommended,
        "inputs": {
            "pwa_playwright_preflight": str(auto / "pwa_playwright_preflight.json"),
            "pwa_final_completion_blockers": str(auto / "pwa_final_completion_blockers.json"),
            "tenmon_current_state_blockers_by_system": str(
                auto / "tenmon_current_state_blockers_by_system.json"
            ),
        },
        "notes": [
            "postfix の gate:* は env/gate bucket、chat:/continuity 等は product bucket。",
            "by_system は infra_gate → env、conversation_backend / pwa_lived_proof / repo_hygiene → product 寄せ。",
            "env と product の postfix が同時に存在する場合は mixed=true（mixed verdict 禁止）。",
        ],
    }

    dest = auto / OUT_NAME
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
