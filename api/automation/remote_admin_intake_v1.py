#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CLI: ChatGPT / 手元から JSON を渡し remote_admin_queue.json + approval_gate_result.json を更新。
HTTP 経路と同型 payload（kind + card / cards / intent_text）。
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_06_REMOTE_ADMIN_INTAKE_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_VPS_V1"

KINDS = frozenset(
    {
        "cursor_autobuild_card",
        "multi_card_campaign",
        "retry_card",
        "maintenance_card",
        "feature_spec_card",
    }
)


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _write(p: Path, obj: Any) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _guard_text(card_name: str, card_body_md: str) -> Dict[str, Any]:
    """remoteCursorGuardV1 と同等の軽量 Python 実装（決定論）。"""
    text = f"{card_name}\n{card_body_md or ''}"
    matched: List[str] = []
    reject: List[str] = []
    blacklist = [
        (r"\bdist/|\bdist\b.*\*\*|/dist/", "dist", "dist/** 触禁止"),
        (r"ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|migration|マイグレーション|DB\s*schema", "schema", "DB schema 変更"),
        (r"kokuzo_pages.*正文|経典\s*本文", "kokuzo_body", "kokuzo_pages 正文"),
        (r"\bsystemd\b|\.service\b|unit\s*file", "systemd", "system env / systemd"),
        (r"/api/chat[^\n]*破壊|chat\s*契約\s*破壊", "chat_contract", "/api/chat 契約破壊明示"),
    ]
    for pat, bid, note in blacklist:
        if re.search(pat, text, re.I):
            matched.append(bid)
            reject.append(f"{bid}: {note}")
    tier = "low"
    high_hints = [
        (r"決済|PCI|payment\s*gateway|カード番号", "payment"),
        (r"chat\.ts\s*本体|rewrite\s+chat\.ts", "chat_ts_body"),
        (r"rm\s+-rf\s+/|curl\s+[^|\n]+\|\s*bash", "raw_shell"),
    ]
    for pat, hid in high_hints:
        if re.search(pat, text, re.I):
            matched.append(hid)
            tier = "high"
    if re.search(r"\bapi/src/routes/chat\.ts\b|chat\.ts\s*契約", text, re.I) and tier == "low":
        tier = "medium"
        matched.append("chat_ts_mention")
    rejected = len(reject) > 0
    dry_run_only = tier == "high" and not rejected
    return {
        "rejected": rejected,
        "reject_reasons": reject,
        "risk_tier": tier,
        "dry_run_only": dry_run_only,
        "matched_rules": matched,
    }


def _expand_payload(body: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """(slices with card_name/body, structural_errors)"""
    errs: List[str] = []
    kind = str(body.get("kind") or "").strip()
    if kind not in KINDS:
        return [], [f"unknown_kind:{kind or 'empty'}"]
    slices: List[Dict[str, Any]] = []

    if kind in ("cursor_autobuild_card", "retry_card", "maintenance_card"):
        card = body.get("card") or {}
        if not isinstance(card, dict):
            errs.append("card object required")
            return [], errs
        name = str(card.get("card_name") or "").strip()
        md = str(card.get("card_body_md") or card.get("body") or "").strip()
        if not name:
            errs.append("card.card_name required")
        slices.append({"index": 0, "card_name": name or "(empty)", "card_body_md": md})
    elif kind == "multi_card_campaign":
        cards = body.get("cards")
        if not isinstance(cards, list) or not cards:
            return [], ["cards[] required"]
        for i, c in enumerate(cards):
            row = c if isinstance(c, dict) else {}
            name = str(row.get("card_name") or "").strip()
            md = str(row.get("card_body_md") or row.get("body") or "").strip()
            if not name:
                errs.append(f"cards[{i}].card_name required")
            slices.append({"index": i, "card_name": name or f"(empty-{i})", "card_body_md": md})
    elif kind == "feature_spec_card":
        intent = str(body.get("intent_text") or "").strip()
        sug = str(body.get("suggested_card_name") or "TENMON_FEATURE_SPEC_INTENT_CURSOR_AUTO_V1").strip()
        if not intent:
            errs.append("intent_text required")
        slices.append({"index": 0, "card_name": sug, "card_body_md": intent})
    return slices, errs


def _gate(body: Dict[str, Any]) -> Dict[str, Any]:
    slices_raw, errs = _expand_payload(body)
    slice_results: List[Dict[str, Any]] = []
    any_high = False
    rejected = bool(errs)

    for s in slices_raw:
        g = _guard_text(s["card_name"], s["card_body_md"])
        if g["risk_tier"] == "high":
            any_high = True
        if g["rejected"]:
            rejected = True
        slice_results.append(
            {
                "index": s["index"],
                "card_name": s["card_name"],
                "risk_tier": g["risk_tier"],
                "dry_run_only": g["dry_run_only"],
                "rejected": g["rejected"],
                "reject_reasons": g["reject_reasons"],
                "matched_rules": g["matched_rules"],
            }
        )

    for e in errs:
        rejected = True

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "ok": not rejected,
        "rejected": rejected,
        "any_high_risk": any_high,
        "structural_errors": errs,
        "slices": slice_results,
        "policy": {"approval_gate_required": True, "high_risk_never_auto_execute": True},
    }


def _new_id() -> str:
    import secrets

    return secrets.token_hex(8)


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_admin_intake_v1")
    ap.add_argument("--payload", type=str, default="", help="JSON ファイル")
    ap.add_argument("--stdin", action="store_true", help="stdin から JSON")
    ap.add_argument("--source", type=str, default="cli")
    ap.add_argument("--no-orchestrator", action="store_true")
    args = ap.parse_args()
    auto = api_automation()
    raw = ""
    if args.stdin:
        raw = sys.stdin.read()
    elif args.payload:
        raw = Path(args.payload).read_text(encoding="utf-8", errors="replace")
    else:
        print(json.dumps({"ok": False, "error": "use --payload FILE or --stdin"}, ensure_ascii=False))
        return 2

    try:
        body = json.loads(raw)
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"json: {e}"}, ensure_ascii=False))
        return 2
    if not isinstance(body, dict):
        print(json.dumps({"ok": False, "error": "payload must be object"}, ensure_ascii=False))
        return 2

    intake_id = _new_id()
    gate = _gate(body)
    gate["intake_id"] = intake_id
    gate["kind"] = str(body.get("kind") or "")

    qpath = auto / "remote_admin_queue.json"
    gpath = auto / "approval_gate_result.json"
    _write(gpath, gate)

    kind = str(body.get("kind") or "").strip()
    title = body.get("title")
    title_s = str(title).strip() if title is not None else None

    def max_tier() -> str:
        tiers = [str(s.get("risk_tier") or "low") for s in gate.get("slices") or []]
        if "high" in tiers:
            return "high"
        if "medium" in tiers:
            return "medium"
        return "low"

    def merge_matched() -> List[str]:
        s: Set[str] = set()
        for x in gate.get("slices") or []:
            for m in x.get("matched_rules") or []:
                s.add(str(m))
        return sorted(s)

    item = {
        "id": intake_id,
        "kind": kind,
        "title": title_s,
        "payload": body,
        "submitted_at": utc_now_iso(),
        "source": args.source.strip() or "cli",
        "state": "rejected",
        "risk_tier": max_tier(),
        "dry_run_only": True,
        "reject_reasons": list(gate.get("structural_errors") or []),
        "matched_rules": merge_matched(),
        "approved_at": None,
        "auto_execution_allowed": False,
    }
    for s in gate.get("slices") or []:
        item["reject_reasons"].extend(s.get("reject_reasons") or [])

    if gate["ok"] and not gate["rejected"]:
        force = bool(body.get("force_approve")) and not gate["any_high_risk"]
        tier = max_tier()
        item["risk_tier"] = tier
        item["dry_run_only"] = tier == "high" or any(s.get("dry_run_only") for s in gate.get("slices") or [])
        item["state"] = "ready" if force else "approval_required"
        item["reject_reasons"] = []
        item["approved_at"] = utc_now_iso() if force else None
        item["auto_execution_allowed"] = tier != "high"
    else:
        item["state"] = "rejected"

    q = _read(qpath)
    if not isinstance(q, dict) or not isinstance(q.get("items"), list):
        q = {
            "version": 1,
            "card": "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_CURSOR_AUTO_V1",
            "updatedAt": utc_now_iso(),
            "items": [],
        }
    q["items"].append(item)
    q["updatedAt"] = utc_now_iso()
    _write(qpath, q)

    if (
        not args.no_orchestrator
        and kind == "feature_spec_card"
        and item["state"] != "rejected"
    ):
        orch = auto / "feature_autobuild_orchestrator_v1.py"
        if orch.is_file():
            subprocess.run(
                [sys.executable, str(orch), "--intake-id", intake_id],
                cwd=str(auto),
                check=False,
                timeout=30,
            )

    (auto / VPS_MARKER).write_text(f"{VPS_MARKER}\n{utc_now_iso()}\n", encoding="utf-8")
    print(json.dumps({"ok": True, "intake_id": intake_id, "state": item["state"], "gate_ok": gate["ok"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
