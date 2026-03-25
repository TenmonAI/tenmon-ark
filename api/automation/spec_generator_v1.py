#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MVP / risk / acceptance / do-not-touch を含む feature_spec.json を生成。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from feature_autobuild_common_v1 import (
    CARD,
    DEFAULT_DO_NOT_TOUCH,
    FAIL_NEXT,
    VERSION,
    api_automation,
    parse_intent_text,
    utc_now_iso,
)


def _mvp_from_intent(intent: Dict[str, Any]) -> List[str]:
    domains = intent.get("domain_hints") or []
    lines = [
        "最小実装でユーザー価値が確認できる状態にする",
        "既存契約・禁止領域を壊さない",
    ]
    if "api" in domains:
        lines.append("API は後方互換を維持し、新規はバージョンまたは別パスで追加")
    if "ui" in domains:
        lines.append("既存画面のレイアウト破壊を避け、追加は局所コンポーネントに限定")
    if "database" in domains:
        lines.append("スキーマ変更は別カード（本 OS の policy 外）— 本 spec では回避またはドキュメントのみ")
    return lines[:8]


def _risks(intent: Dict[str, Any]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = [
        {"id": "contract_break", "level": "high", "note": "/api/chat 契約・公開 API 破壊"},
        {"id": "chat_ts_body", "level": "high", "note": "chat.ts 本体の無秩序編集"},
    ]
    for d in intent.get("domain_hints") or []:
        if d == "auth":
            out.append({"id": "auth_scope", "level": "high", "note": "認証・権限の誤実装"})
        if d == "database":
            out.append({"id": "schema_migration", "level": "high", "note": "DB schema 変更は本パイプライン非対称"})
    return out[:12]


def _acceptance(intent: Dict[str, Any]) -> List[str]:
    base = [
        "npm run build が成功する（本番相当のビルド手順）",
        "既存の integrated acceptance / regression baseline を悪化させない",
        "DO_NOT_TOUCH 領域に変更が入っていない（diff レビュー）",
    ]
    if "api" in (intent.get("domain_hints") or []):
        base.append("新規 API の入出力がドキュメント化されている")
    return base


def build(intent_blob: Dict[str, Any]) -> Dict[str, Any]:
    intent = intent_blob.get("intent") or intent_blob
    if "raw" not in intent and intent_blob.get("summary"):
        intent = parse_intent_text(intent_blob.get("summary", ""))
    fid = str(intent.get("feature_id_safe") or intent.get("slug") or "feature")
    risks = _risks(intent)
    mvp = _mvp_from_intent(intent)
    acceptance = _acceptance(intent)
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "feature_id": fid,
        "title": intent.get("title") or "feature",
        "intent": intent,
        # 契約 minimum（親カード / VPS）
        "objective": str(intent.get("summary") or intent.get("title") or "feature")[:2000],
        "scope": {
            "domains": list(intent.get("domain_hints") or []),
            "mvp": mvp,
            "boundary": "automation 層およびカード生成の範囲。本パイプラインは実コード改修を行わず次カードへ委譲する。",
        },
        "do_not_touch": list(DEFAULT_DO_NOT_TOUCH),
        "risk": risks,
        "risks": risks,
        "acceptance": acceptance,
        "acceptance_criteria": acceptance,
        "fail_next": FAIL_NEXT,
        "mvp": mvp,
        "implementation_notes": [
            "本 spec は automation 生成。実装は分割された Cursor cards に従うこと。",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="spec_generator_v1")
    ap.add_argument("--intent-file", type=str, default="", help="feature_intent.json")
    ap.add_argument("--request", type=str, default="", help="直接テキスト（intent 未使用時）")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    if args.intent_file:
        blob = json.loads(Path(args.intent_file).read_text(encoding="utf-8", errors="replace"))
    elif args.request:
        blob = {"intent": parse_intent_text(args.request)}
    else:
        p = auto / "feature_intent.json"
        if not p.is_file():
            blob = {"intent": parse_intent_text("")}
        else:
            blob = json.loads(p.read_text(encoding="utf-8", errors="replace"))

    body = build(blob)
    out = Path(args.out) if args.out else auto / "feature_spec.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
