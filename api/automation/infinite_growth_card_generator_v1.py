#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH — Cursor 完全自動カード形式に寄せた生成物（multi_ai 合成と整合）。
任意で orchestra executor（dry-run）を呼び補助証跡を取る。
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import multi_ai_card_synthesizer_v1 as synth_mod

NEXT_CARD_ON_PASS_DEFAULT = "TENMON_INFINITE_GROWTH_CARD_LOOP_ORCHESTRATOR_CURSOR_AUTO_V1"
# 自動生成タスク文に英語スロットが混入した疑い（日本語の固定方針文は md テンプレ側で表現）
BANNED_SUBSTRINGS = (
    "canon",
    "scripture",
    "kokuzo",
    "persona",
)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dangerous_scope_scan(text: str) -> tuple[bool, str]:
    low = (text or "").lower()
    for s in BANNED_SUBSTRINGS:
        if s.lower() in low:
            return True, f"dangerous_scope:{s}"
    return False, ""


def build_cursor_card_markdown(
    *,
    row: dict[str, Any],
    observation_summary: str,
    next_card_on_pass: str,
) -> str:
    cid = str(row.get("card_id") or "")
    acc_raw = row.get("acceptance")
    if isinstance(acc_raw, list):
        acc = "\n".join(str(x).strip() for x in acc_raw if str(x).strip())
    else:
        acc = str(acc_raw or "")
    phase = str(row.get("phase") or "")
    lane = str(row.get("lane") or "")
    lines = [
        f"# TENMON_INFINITE_GROWTH — Cursor execution card",
        "",
        f"- **card_id**: `{cid}`",
        f"- **phase / lane**: `{phase}` / `{lane}`",
        "",
        "## D（非交渉）",
        "- fail-closed / dist 直編集禁止 / broad rewrite 禁止",
        "- 凍結ドメイン（人格・意図・教義系テキスト）の意味改変は禁止（本カードでは触れない）",
        "- 主裁定は GPT / 天聞AI（本生成はスケジュール準拠の下書き）",
        "",
        "## objective",
        f"スケジュール行に基づき `{cid}` を 1 サイクル完了させる（automation / 観測系の最小差分）。",
        "",
        "## 対象ファイル（初期候補）",
        "- `api/automation/` 配下の契約・オーケストレータのみ（必要最小限）",
        "",
        "## 実装内容",
        "- multi_ai autonomy supervisor 経路で orchestra →（任意）cursor bridge → 観測",
        "- repo → build → restart → audit → probe の順を壊さない",
        "",
        "## 観測サマリ（生成時点）",
        observation_summary[:12000] if observation_summary else "(empty)",
        "",
        "## acceptance",
        acc,
        "",
        "## fail bundle",
        "- 失敗時は evidence を `multi_ai_autonomy_failure_bundle_v1.json` に従い保存し停止",
        "",
        f"## next card on PASS\n`{next_card_on_pass}`",
        "",
        "## hold_reason on FAIL / HOLD",
        "- `strict_preflight_failed` / `audit_failed` / `queue_not_allowlisted` 等（hold_policy 参照）",
        "",
        "## issue_signature",
        str(row.get("issue_signature") or ""),
        "",
    ]
    return "\n".join(lines)


def build_card_sidecar_json(
    *,
    row: dict[str, Any],
    md_path: str,
    orchestra_evidence: str | None,
) -> dict[str, Any]:
    return {
        "schema": "INFINITE_GROWTH_GENERATED_CARD_SIDECAR_V1",
        "generated_at": _utc_iso(),
        "card_id": str(row.get("card_id") or ""),
        "issue_signature": str(row.get("issue_signature") or ""),
        "markdown_path": md_path,
        "orchestra_evidence_dir": orchestra_evidence,
    }


def run_orchestra_stub(
    *,
    repo: Path,
    auto_dir: Path,
    issue: str,
    dry_run: bool,
) -> str | None:
    script = auto_dir / "multi_ai_orchestra_executor_v1.py"
    if not script.is_file():
        return None
    cmd = [sys.executable, str(script), "--issue", issue, "--evidence-base", "/var/log/tenmon/multi_ai_orchestra"]
    cmd.append("--dry-run" if dry_run else "--no-dry-run")
    try:
        r = subprocess.run(cmd, cwd=str(repo), capture_output=True, text=True, timeout=120)
    except Exception:
        return None
    last = (r.stdout or "").strip().splitlines()[-1] if r.stdout else ""
    try:
        j = json.loads(last)
        if isinstance(j, dict) and j.get("evidence_dir"):
            return str(j["evidence_dir"])
    except Exception:
        pass
    return None


def synthesize_acceptance_bundle_stub(row: dict[str, Any]) -> dict[str, Any]:
    adopted = {
        "summary": f"schedule-driven card {row.get('card_id')}",
        "target_paths": ["api/automation/"],
        "non_goals": ["canon change", "persona change", "dist direct edit"],
    }
    claude_audit = {
        "acceptance_refined": (
            "\n".join(str(x) for x in row["acceptance"])
            if isinstance(row.get("acceptance"), list)
            else str(row.get("acceptance") or "")
        ),
    }
    gemini_norm = {"structured_summary": f"phase={row.get('phase')} lane={row.get('lane')}"}
    auto_here = Path(__file__).resolve().parent
    md, bundle = synth_mod.synthesize_cursor_card(
        adopted_plan=adopted,
        claude_audit=claude_audit,
        gemini_norm=gemini_norm,
        next_card_name=str(row.get("card_id") or ""),
        auto_dir=auto_here,
    )
    return {"markdown_alt": md, "acceptance_bundle": bundle}
