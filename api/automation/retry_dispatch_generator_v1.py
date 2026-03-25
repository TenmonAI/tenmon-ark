#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_SEAL — focused retry 向け dispatch（次カード雛形）
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


FAIL_NEXT_DEFAULT = "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_retry_dispatch(
    *,
    job_id: str,
    verdict: str,
    reasons: List[str],
    bundle: Dict[str, Any],
) -> Dict[str, Any]:
    raw = bundle.get("raw_bundle") or bundle
    build = raw.get("build") or {}
    hints: List[str] = []
    if build.get("ok") is False:
        hints.append("build ログを確認し、TypeScript / 依存エラーを解消")
    if "needs_review" in verdict or "needs_review" in str(reasons):
        hints.append("acceptance を満たすよう edit_scope 内で最小 diff に絞る")
    if not hints:
        hints.append("result bundle を再取得し、remote_build_result_collector を再実行")

    return {
        "version": 1,
        "card": "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_V1",
        "job_id": job_id,
        "generated_at": _utc(),
        "fail_next_card": FAIL_NEXT_DEFAULT,
        "verdict_context": verdict,
        "focused_hints": hints,
        "rerun_commands": [
            "bash api/automation/mac_result_packager_v1.sh <REPO> <JOB_ID> > /tmp/bundle.json",
            "curl -X POST -H 'X-Founder-Key: …' -d @/tmp/bundle.json https://<VPS>/api/admin/remote-build/result-ingest",
            "python3 api/automation/remote_build_seal_governor_v1.py --bundle /opt/.../remote_build_result_bundle.json",
        ],
    }


def write_retry_dispatch(out_path: Path, dispatch: Dict[str, Any]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(dispatch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
