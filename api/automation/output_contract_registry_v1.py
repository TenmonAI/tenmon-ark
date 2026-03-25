#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Canonical output contract definitions for TENMON OS runners (registry v1).
read-first: 他スクリプトから import して単一ソースとして参照する。
"""
from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class ArtifactSpec(TypedDict, total=False):
    filename: str
    required_json_keys: List[str]
    optional: bool


class SystemSpec(TypedDict, total=False):
    id: str
    title: str
    out_subdir: str  # under api/automation/out/
    env_out_dir: str  # env var name override for out root
    var_log_card_glob: str  # e.g. TENMON_* — informational
    artifacts: List[ArtifactSpec]


# 明示 env → out/<subdir> → /var/log/tenmon/card_*/*/file → latest symlink
CANONICAL_SYSTEMS: Dict[str, SystemSpec] = {
    "full_orchestrator": {
        "id": "full_orchestrator",
        "title": "Conversation & learning full orchestrator",
        "out_subdir": "tenmon_full_orchestrator_v1",
        "env_out_dir": "TENMON_FULL_ORCHESTRATOR_OUT_DIR",
        "artifacts": [
            {"filename": "full_orchestrator_queue.json", "required_json_keys": [], "optional": False},
            {"filename": "full_orchestrator_manifest.json", "required_json_keys": [], "optional": False},
            {"filename": "integrated_final_verdict.json", "required_json_keys": [], "optional": True},
            {"filename": "blocked_cards.json", "required_json_keys": [], "optional": True},
        ],
    },
    "chat_refactor_os": {
        "id": "chat_refactor_os",
        "title": "Chat refactor OS",
        "out_subdir": "tenmon_chat_refactor_os_v1",
        "env_out_dir": "TENMON_CHAT_REFACTOR_OS_OUT_DIR",
        "artifacts": [
            {"filename": "chat_refactor_os_manifest.json", "required_json_keys": [], "optional": False},
            {"filename": "governance_verdict.json", "required_json_keys": [], "optional": True},
            {"filename": "card_manifest.json", "required_json_keys": [], "optional": True},
            {"filename": "integrated_final_verdict.json", "required_json_keys": [], "optional": True},
        ],
    },
    "self_improvement_os": {
        "id": "self_improvement_os",
        "title": "Self improvement OS",
        "out_subdir": "tenmon_self_improvement_os_v1",
        "env_out_dir": "TENMON_SELF_IMPROVEMENT_OS_OUT_DIR",
        "artifacts": [
            {"filename": "self_improvement_os_manifest.json", "required_json_keys": [], "optional": False},
            {"filename": "seal_governor_verdict.json", "required_json_keys": [], "optional": True},
            {"filename": "next_card_dispatch.json", "required_json_keys": [], "optional": True},
            {"filename": "integrated_final_verdict.json", "required_json_keys": [], "optional": True},
        ],
    },
    "kokuzo_learning_os": {
        "id": "kokuzo_learning_os",
        "title": "Kokuzo learning + improvement OS",
        "out_subdir": "tenmon_kokuzo_learning_improvement_os_v1",
        "env_out_dir": "TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR",
        "artifacts": [
            {"filename": "integrated_learning_verdict.json", "required_json_keys": [], "optional": False},
            {"filename": "learning_improvement_os_manifest.json", "required_json_keys": [], "optional": True},
            {"filename": "integrated_final_verdict.json", "required_json_keys": [], "optional": True},
            {"filename": "learning_steps.json", "required_json_keys": [], "optional": True},
        ],
    },
    "worldclass_seal": {
        "id": "worldclass_seal",
        "title": "Worldclass report + runtime seal",
        "out_subdir": "",  # 複数候補は resolver 側
        "env_out_dir": "",
        "artifacts": [
            {
                "filename": "worldclass_report.json",
                "required_json_keys": ["verdict"],
                "optional": False,
            },
            {
                "filename": "final_verdict.json",
                "required_json_keys": [],
                "optional": True,
            },
            {
                "filename": "seal_verdict.json",
                "required_json_keys": [],
                "optional": True,
            },
        ],
    },
}


def worldclass_seal_search_roots(api_root: Any) -> List[Any]:
    """worldclass / seal はカード実行ごとに out 直下サブディレクトリが揺れるため複数探索。"""
    from pathlib import Path

    api = Path(api_root)
    roots: List[Any] = []
    for name in (
        "chat_ts_seal_v1",
        "chat_ts_worldclass_v1",
        "tenmon_chat_ts_seal",
        "tenmon_kokuzo_learning_improvement_os_v1/integration_seal",
    ):
        p = api / "automation" / "out" / name
        if p.is_dir():
            roots.append(p)
    seen = set()
    uniq = []
    for r in roots:
        k = str(r.resolve())
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    return uniq


def registry_document() -> Dict[str, Any]:
    return {
        "version": 1,
        "card": "TENMON_OS_OUTPUT_CONTRACT_REGISTRY_V1",
        "systems": CANONICAL_SYSTEMS,
        "resolution_order": [
            "explicit_env_out_dir",
            "api_automation_out_subdir",
            "var_log_tenmon_card_ts",
            "var_log_tenmon_card_latest_symlink",
        ],
        "emission_states": [
            "not_emitted",
            "emitted_in_log_only",
            "emitted_in_out_dir",
            "emitted_both_out_and_log",
            "emitted_but_contract_mismatch",
        ],
    }
