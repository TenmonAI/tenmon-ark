#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""危険な機能要求を自動 reject（policy ベース）。"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from feature_autobuild_common_v1 import CARD, VERSION, api_automation, read_json, utc_now_iso

# (pattern, rule_id, message)
DENY_PATTERNS: List[Tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"スキーマ\s*変更|migration|migrate\s+db|ALTER\s+TABLE", re.I), "db_schema", "DB schema 変更は本 OS の DO_NOT_TOUCH"),
    (re.compile(r"\bsystemd\b|unit\s*file|\.service\b", re.I), "systemd", "systemd env / unit は禁止範囲"),
    (re.compile(r"chat\.ts\s*本体|rewrite\s+chat\.ts|chat\.ts\s+を\s*全面", re.I), "chat_ts_body", "chat.ts 本体の無秩序改変"),
    (re.compile(r"/api/chat\s*契約|破壊\s*的\s*変更.*chat", re.I), "chat_contract", "/api/chat 契約破壊リスク"),
    (re.compile(r"決済|payment\s*gateway|カード番号|PCI", re.I), "payment", "決済系は手動レビュー必須のため自動パイプライン拒否"),
    (re.compile(r"全ユーザ\s*削除|drop\s+database|rm\s+-rf\s+/", re.I), "destructive", "破壊的操作の可能性"),
    (re.compile(r"kokuzo_pages\s*正文|経典\s*本文\s*を\s*自動", re.I), "kokuzo_body", "kokuzo_pages 正文は禁止"),
]


def evaluate(
    spec: Dict[str, Any],
    *,
    manifest: Optional[Dict[str, Any]] = None,
    strict_high_risk: bool = False,
) -> Dict[str, Any]:
    """intent.raw を denylist。optional: spec/manifest の high risk を strict 時に reject。"""
    intent = spec.get("intent") or {}
    raw = str(intent.get("raw") or intent.get("summary") or "")

    denied: List[Dict[str, str]] = []
    for pat, rid, msg in DENY_PATTERNS:
        if pat.search(raw):
            denied.append({"rule": rid, "message": msg})

    if strict_high_risk:
        for r in spec.get("risks") or spec.get("risk") or []:
            if isinstance(r, dict) and str(r.get("level") or "").lower() == "high":
                denied.append(
                    {
                        "rule": "high_risk_in_spec",
                        "message": f"strict: {r.get('id') or 'risk'} — {r.get('note') or ''}",
                    }
                )
        if manifest:
            for c in manifest.get("cards") or []:
                if str(c.get("estimated_risk") or "").lower() == "high":
                    denied.append(
                        {
                            "rule": "high_risk_card_in_manifest",
                            "message": f"strict: card {c.get('id')} ({c.get('card_name')})",
                        }
                    )

    allowed = len(denied) == 0
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "allowed": allowed,
        "denied_rules": denied,
        "policy": "denylist + optional strict_high_risk(spec/manifest)",
        "strict_high_risk": strict_high_risk,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="deployment_gate_v1")
    ap.add_argument("--spec-file", type=str, default="")
    ap.add_argument("--manifest-file", type=str, default="", help="feature_cards_manifest（high risk 検査用）")
    ap.add_argument("--strict-high-risk", action="store_true", help="spec/manifest の high を拒否")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    path = Path(args.spec_file) if args.spec_file else auto / "feature_spec.json"
    spec = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    mpath = Path(args.manifest_file) if args.manifest_file else auto / "feature_cards_manifest.json"
    manifest = read_json(mpath) if mpath.is_file() else {}
    strict = bool(args.strict_high_risk) or os.environ.get(
        "TENMON_FEATURE_AUTOBUILD_STRICT_HIGH_RISK", ""
    ).strip() in ("1", "true", "yes")
    body = evaluate(spec, manifest=manifest if manifest else None, strict_high_risk=strict)
    out = Path(args.out) if args.out else auto / "deployment_gate.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
