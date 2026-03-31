#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_PLACEHOLDER_ROUTE_INVENTORY_CURSOR_AUTO_V1

3 種の placeholder（BOOK / R11 general knowledge / R11 general relation）について
静的出現・到達条件・依存ファイル・runtime 到達を観測し分類する。自動 patch は行わない。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_PLACEHOLDER_ROUTE_INVENTORY_V1"
VERSION = 1
DEFAULT_BASE = "http://127.0.0.1:3000"

# コード観測対象（docs は inventory に含めるが分類上 secondary）
CODE_SCAN_ROOTS = ("api/src", "api/tools")

PLACEHOLDER_DEFS: Dict[str, Dict[str, Any]] = {
    "BOOK_PLACEHOLDER_V1": {
        "summary": "書籍モード短文プロンプト用 placeholder（本文生成は未実装）",
        "static_reach_condition": (
            "chat.ts: 一般ゲート内で __isBookModeRequest かつ __bookModeShortPromptOnly（40 字未満・"
            "章立て/第一章等なし）かつ !isCmd0 && !hasDoc0 && !askedMenu0。upsertBookContinuation 呼び出し。"
        ),
        "runtime_probe_messages": ["本を書いて"],
        "depends_files_primary": ["api/src/routes/chat.ts", "api/src/routes/chat_parts/gates_impl.ts"],
    },
    "R11_GENERAL_KNOWLEDGE_ROUTE_PLACEHOLDER_V1": {
        "summary": "一般知識（首相等）用 factual route 未実装の分岐 placeholder",
        "static_reach_condition": (
            "chat.ts R11_ROUTE_COVERAGE_EXPAND_V1 ブロック: __isJapanPm（日本の首相|総理 等の正規表現）"
            "かつ !isCmd0 && !hasDoc0 && !askedMenu0。より手前のゲートを通過したメッセージのみ。"
        ),
        "runtime_probe_messages": ["日本の首相は誰ですか"],
        "depends_files_primary": ["api/src/routes/chat.ts"],
    },
    "R11_GENERAL_RELATION_ROUTE_PLACEHOLDER_V1": {
        "summary": "日米関係等 factual/relation route 未実装の分岐 placeholder",
        "static_reach_condition": (
            "chat.ts 同上ブロック: __isJapanUs（日米関係|日本はアメリカとどういう関係 等）"
            "かつ !isCmd0 && !hasDoc0 && !askedMenu0。"
        ),
        "runtime_probe_messages": ["日本とアメリカの関係を簡潔に教えて"],
        "depends_files_primary": ["api/src/routes/chat.ts"],
    },
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def scan_static_occurrences(repo: Path, name: str) -> Dict[str, Any]:
    """プレースホルダ文字列の出現（コードツリー中心）。"""
    hits: List[Dict[str, Any]] = []
    docs_hits: List[Dict[str, Any]] = []
    for rel in CODE_SCAN_ROOTS:
        root = repo / rel
        if not root.is_dir():
            continue
        for p in root.rglob("*"):
            if p.is_dir():
                continue
            if p.suffix not in (".ts", ".tsx", ".js", ".mjs", ".py", ".md"):
                continue
            if "node_modules" in p.parts or "dist" in p.parts:
                continue
            try:
                text = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            if name not in text:
                continue
            lines = text.splitlines()
            for i, line in enumerate(lines, start=1):
                if name in line:
                    rec = {
                        "path": str(p.relative_to(repo)),
                        "line": i,
                        "snippet": line.strip()[:240],
                    }
                    if "docs" in p.parts or "docs/" in str(p.relative_to(repo)):
                        docs_hits.append(rec)
                    else:
                        hits.append(rec)
    return {"code_occurrences": hits, "docs_occurrences": docs_hits}


def _discover_chat_url(base: str, timeout: float = 12.0) -> Optional[str]:
    b = base.rstrip("/")
    for path in ("/chat", "/api/chat"):
        url = b + path
        try:
            body = json.dumps({"message": "ping", "threadId": "inv-placeholder"}, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:
                if r.status < 400:
                    return url
        except Exception:
            continue
    return None


def _post_chat_route_reason(chat_url: str, message: str, thread_id: str, timeout: float = 45.0) -> Dict[str, Any]:
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            data = json.loads(raw)
            ku = (
                ((data.get("decisionFrame") or {}).get("ku") or {})
                if isinstance(data.get("decisionFrame"), dict)
                else {}
            )
            rr = ku.get("routeReason") if isinstance(ku, dict) else None
            return {
                "ok": True,
                "routeReason": rr,
                "raw_keys": list(data.keys()) if isinstance(data, dict) else [],
            }
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}", "routeReason": None}
    except Exception as e:
        return {"ok": False, "error": str(e), "routeReason": None}


@dataclass
class RuntimeObservation:
    placeholder: str
    message: str
    http_ok: bool
    route_reason_observed: Optional[str]
    matches_expected: bool
    error: str = ""


def observe_runtime(
    base_url: str,
    chat_url_override: str,
    definitions: Dict[str, Dict[str, Any]],
) -> Tuple[List[RuntimeObservation], Dict[str, Any]]:
    meta: Dict[str, Any] = {"base_url": base_url.rstrip("/"), "chat_url": None, "discovery_error": None}
    chat_url = (chat_url_override or "").strip() or (_discover_chat_url(base_url) or "")
    if not chat_url:
        meta["discovery_error"] = "chat_url:undiscovered"
        out: List[RuntimeObservation] = []
        for ph, spec in definitions.items():
            for msg in spec.get("runtime_probe_messages") or []:
                out.append(
                    RuntimeObservation(
                        placeholder=ph,
                        message=msg,
                        http_ok=False,
                        route_reason_observed=None,
                        matches_expected=False,
                        error=meta["discovery_error"],
                    )
                )
        return out, meta
    meta["chat_url"] = chat_url
    observations: List[RuntimeObservation] = []
    for ph, spec in definitions.items():
        msgs = spec.get("runtime_probe_messages") or []
        for i, msg in enumerate(msgs):
            tid = f"ph-inv-{ph[:8]}-{i}"
            r = _post_chat_route_reason(chat_url, msg, tid)
            rr = r.get("routeReason")
            rr_s = str(rr).strip() if rr is not None else ""
            match = rr_s == ph
            observations.append(
                RuntimeObservation(
                    placeholder=ph,
                    message=msg,
                    http_ok=bool(r.get("ok")),
                    route_reason_observed=rr if rr is not None else None,
                    matches_expected=match,
                    error=str(r.get("error") or ""),
                )
            )
    return observations, meta


def classify_placeholder(
    name: str,
    static: Dict[str, Any],
    obs_for_ph: List[RuntimeObservation],
    runtime_skipped: bool,
) -> Dict[str, Any]:
    code_occs = static.get("code_occurrences") or []
    docs_occs = static.get("docs_occurrences") or []
    in_chat_ts = any("chat.ts" in str(x.get("path", "")) for x in code_occs)
    in_gates = any("gates_impl" in str(x.get("path", "")) for x in code_occs)
    in_projector = any("tenmonResponseProjector" in str(x.get("path", "")) for x in code_occs)

    any_runtime_ok = any(o.http_ok for o in obs_for_ph)
    any_match = any(o.matches_expected for o in obs_for_ph)

    if not code_occs and docs_occs:
        connectivity = "unconnected"
        rationale = "コードツリーに出現なし（ドキュメントのみ）"
    elif not in_chat_ts and (in_gates or in_projector):
        connectivity = "partially_connected"
        rationale = "出口側（projector/gates）のみ参照。chat.ts での割当経路が静的スキャンで未検出"
    elif in_chat_ts and any_match:
        connectivity = "active"
        rationale = "chat.ts に割当があり、runtime probe で routeReason が一致"
    elif in_chat_ts and any_runtime_ok and not any_match:
        connectivity = "partially_connected"
        rationale = "HTTP は成功だが routeReason が期待と不一致（手前ゲートで別 route）"
    elif in_chat_ts and runtime_skipped:
        connectivity = "partially_connected"
        rationale = "静的割当あり。本実行では runtime 観測未実施（--no-runtime 等）"
    elif in_chat_ts and not any_runtime_ok:
        connectivity = "partially_connected"
        rationale = "静的割当あり。runtime 未到達または接続失敗"
    else:
        connectivity = "partially_connected"
        rationale = "補助ツール/その他のみの参照の可能性"

    # 修復可否: いずれも中核ルーティング・新規 factual route が絡むため manual-only（lane 誤 patch 防止）
    repair = "manual-only"
    repair_note = (
        "新規 route / factual パイプ / 書籍本文生成は central routing に関わるため auto-fix 対象外。"
        "projector のトークン列挙のみは低リスクだが本カードでは変更禁止。"
    )

    return {
        "placeholder": name,
        "connectivity": connectivity,
        "connectivity_rationale": rationale,
        "repair_feasibility": repair,
        "repair_note": repair_note,
        "conversation_lane_patch_eligible": False,
        "static": {
            "code_occurrence_count": len(code_occs),
            "docs_occurrence_count": len(docs_occs),
            "assigns_in_chat_ts": in_chat_ts,
            "referenced_in_gates_impl": in_gates,
            "referenced_in_response_projector": in_projector,
        },
        "reach_condition_text": PLACEHOLDER_DEFS[name]["static_reach_condition"],
        "depends_files_observed": sorted({str(x["path"]) for x in code_occs}),
        "depends_files_primary_documented": PLACEHOLDER_DEFS[name].get("depends_files_primary", []),
    }


def build_report(
    repo: Path,
    run_runtime: bool,
    base_url: str,
    chat_url: str,
) -> Dict[str, Any]:
    static_by_ph: Dict[str, Any] = {}
    for ph in PLACEHOLDER_DEFS:
        static_by_ph[ph] = scan_static_occurrences(repo, ph)

    observations: List[RuntimeObservation] = []
    rt_meta: Dict[str, Any] = {"skipped": True, "reason": "run_runtime_false"}
    if run_runtime:
        observations, rt_meta = observe_runtime(base_url, chat_url, PLACEHOLDER_DEFS)
        rt_meta["skipped"] = False

    by_ph_obs: Dict[str, List[RuntimeObservation]] = {ph: [] for ph in PLACEHOLDER_DEFS}
    for o in observations:
        by_ph_obs.setdefault(o.placeholder, []).append(o)

    entries: List[Dict[str, Any]] = []
    runtime_skipped_flag = not run_runtime
    for ph in PLACEHOLDER_DEFS:
        spec = PLACEHOLDER_DEFS[ph]
        cls = classify_placeholder(ph, static_by_ph[ph], by_ph_obs.get(ph, []), runtime_skipped_flag)
        cls["summary"] = spec["summary"]
        cls["runtime_probes"] = [
            {
                "message": o.message,
                "http_ok": o.http_ok,
                "route_reason_observed": o.route_reason_observed,
                "matches_expected_placeholder": o.matches_expected,
                "error": o.error or None,
            }
            for o in by_ph_obs.get(ph, [])
        ]
        cls["static_occurrences_detail"] = static_by_ph[ph]
        cls["runtime_observation_mode"] = (
            "skipped" if runtime_skipped_flag else ("complete" if not rt_meta.get("discovery_error") else "failed")
        )
        entries.append(cls)

    all_manual_only = all(e["repair_feasibility"] == "manual-only" for e in entries)

    return {
        "schema": "tenmon_placeholder_route_inventory_v1",
        "version": VERSION,
        "cardName": CARD,
        "generatedAt": _utc_now_iso(),
        "repo_root": str(repo),
        "runtime_meta": rt_meta,
        "placeholders": entries,
        "affected_files_union": sorted(
            {
                str(x["path"])
                for ph in PLACEHOLDER_DEFS
                for x in (static_by_ph[ph].get("code_occurrences") or [])
            }
        ),
        "summary": {
            "placeholder_count": len(PLACEHOLDER_DEFS),
            "all_conversation_lane_patch_eligible_false": all_manual_only,
            "runtime_observation_complete": not bool(rt_meta.get("discovery_error")) and not rt_meta.get("skipped"),
            "note": "conversation quality lane は repair_feasibility=manual-only を誤って auto-patch してはならない。",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=str(_repo_root()))
    ap.add_argument("--no-runtime", action="store_true", help="skip HTTP probes (static only)")
    ap.add_argument(
        "--base-url",
        default=os.environ.get("CHAT_TS_PROBE_BASE_URL", DEFAULT_BASE).rstrip("/"),
    )
    ap.add_argument("--chat-url", default="", help="override chat POST URL")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--write", default="", help="write report JSON to path")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    rep = build_report(repo, run_runtime=not args.no_runtime, base_url=args.base_url, chat_url=args.chat_url)

    text = json.dumps(rep, ensure_ascii=False, indent=2) + "\n"
    if args.write.strip():
        wp = Path(args.write)
        wp.parent.mkdir(parents=True, exist_ok=True)
        wp.write_text(text, encoding="utf-8")
    if args.stdout_json or args.write.strip():
        if args.stdout_json:
            print(text, end="")
    else:
        print(json.dumps(rep.get("summary"), ensure_ascii=False, indent=2))

    strict_rt = os.environ.get("TENMON_PLACEHOLDER_INVENTORY_STRICT_RUNTIME", "").strip() == "1"
    if strict_rt and not args.no_runtime and rep.get("runtime_meta", {}).get("discovery_error"):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
