#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_SEAL — rollback 計画の生成のみ（git 実行はしない）
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_rollback_plan(*, job_id: str, bundle: Dict[str, Any], dangerous: bool, verdict: str) -> Dict[str, Any]:
    if verdict == "sealed":
        return {
            "version": 1,
            "card": "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_V1",
            "job_id": job_id,
            "generated_at": _utc(),
            "policy": {"no_action_required": True, "manual_execution_only": True},
            "steps": [{"order": 1, "action": "none", "note": "sealed — 自動 rollback 不要"}],
        }
    if verdict == "blocked":
        return {
            "version": 1,
            "card": "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_V1",
            "job_id": job_id,
            "generated_at": _utc(),
            "policy": {"no_auto_git": True, "dangerous_patch": True},
            "steps": [
                {"order": 1, "action": "stop", "note": "危険パターン検出 — 自動 revert 禁止。blocked_reason_report を確認。"},
                {"order": 2, "action": "manual_triage", "note": "管理者が diff を精査してから手動で戻す"},
            ],
        }
    raw = bundle.get("raw_bundle") or bundle
    diff = raw.get("diff") or {}
    paths_hint: List[str] = []
    stat = diff.get("stat") or ""
    for line in stat.splitlines()[:40]:
        line = line.strip()
        if "|" in line or "files changed" in line.lower():
            paths_hint.append(line)

    steps: List[Dict[str, Any]] = [
        {"order": 1, "action": "inspect", "command_hint": "git status", "note": "作業ツリーと差分を人間が確認"},
        {"order": 2, "action": "backup_optional", "note": "必要ならブランチまたは stash を作成"},
        {
            "order": 3,
            "action": "revert_paths_or_reset",
            "note": "危険でない範囲で git checkout -- <path> または git restore（手動）",
            "paths_from_diff_stat": paths_hint,
        },
        {"order": 4, "action": "verify_build", "command_hint": "npm run build (api)", "note": "ローカルでビルド確認"},
    ]
    if dangerous:
        steps.insert(
            0,
            {
                "order": 0,
                "action": "stop_and_review",
                "note": "危険パターン検出のため自動 revert 禁止。blocked_reason_report を確認。",
            },
        )

    return {
        "version": 1,
        "card": "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_V1",
        "job_id": job_id,
        "generated_at": _utc(),
        "policy": {
            "no_auto_git": True,
            "no_auto_deploy": True,
            "manual_execution_only": True,
        },
        "steps": steps,
    }


def write_rollback_plan(out_path: Path, plan: Dict[str, Any]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
