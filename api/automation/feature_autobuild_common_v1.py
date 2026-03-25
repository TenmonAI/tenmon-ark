# -*- coding: utf-8 -*-
"""TENMON_FEATURE_AUTOBUILD_OS — 共有定数・intent 抽出ヘルパ"""
from __future__ import annotations

import re
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set

VERSION = 1
CARD = "TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_FEATURE_AUTOBUILD_OS_VPS_V1"
FAIL_NEXT = "TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_RETRY_V1"

DEFAULT_DO_NOT_TOUCH = (
    "dist/**",
    "api/src/routes/chat.ts (本体)",
    "DB schema",
    "kokuzo_pages 正文",
    "/api/chat 契約",
    "systemd env",
)


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _lines(s: str) -> List[str]:
    return [ln.strip() for ln in s.strip().splitlines() if ln.strip()]


def parse_intent_text(raw: str) -> Dict[str, Any]:
    """
    管理者向け自然言語要求を構造化（ヒューリスティック・read-only 近似）。
    LLM 差し替え前提の境界。
    """
    text = raw.strip()
    if not text:
        return {
            "title": "untitled_feature",
            "summary": "",
            "keywords": [],
            "domain_hints": [],
            "constraints_mentioned": [],
            "raw": text,
        }

    first = _lines(text)[0]
    title = re.sub(r"^[\d\.\)\s]+", "", first)[:120]
    slug = re.sub(r"[^\w\u3040-\u30ff\u4e00-\u9fff]+", "_", title.lower())[:48] or "feature"

    keywords: Set[str] = set()
    domain_hints: List[str] = []
    low = text.lower()

    rules = [
        (("api", "rest", "エンドポイント", "ルート"), "api"),
        (("ui", "画面", "フロント", "コンポーネント"), "ui"),
        (("db", "スキーマ", "マイグレーション", "テーブル"), "database"),
        (("認証", "auth", "ログイン", "トークン"), "auth"),
        (("通知", "メール", "webhook"), "notifications"),
        (("管理", "admin", "ダッシュボード"), "admin"),
        (("学習", "learning", "kokuzo"), "learning"),
        (("自動化", "automation", "batch"), "automation"),
    ]
    for keys, tag in rules:
        if any(k in low or k in text for k in keys):
            domain_hints.append(tag)

    # 明示キーワード
    for w in re.findall(r"[\w\u3040-\u30ff\u4e00-\u9fff]{2,24}", text):
        if len(w) > 2:
            keywords.add(w[:32])
    constraints = []
    if re.search(r"触らない|触るな|do not|しない|禁止", text, re.I):
        constraints.append("explicit_restriction_mentioned")
    if re.search(r"急ぎ|urgent|asap", text, re.I):
        constraints.append("urgency_mentioned")

    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:14]
    feature_id_safe = f"feat_{digest}"

    return {
        "title": title,
        "slug": slug,
        "feature_id_safe": feature_id_safe,
        "summary": text[:2000],
        "keywords": sorted(keywords)[:40],
        "domain_hints": list(dict.fromkeys(domain_hints)),
        "constraints_mentioned": constraints,
        "raw": text,
    }
