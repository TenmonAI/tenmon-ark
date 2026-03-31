#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NOTION_AUTOBUILD — Notion 行（正規化 dict）を strict manifest へ compile。自由文は実行しない。
TENMON_NOTION_AUTOBUILD_ACCEPTANCE_SUMMARY_RELAX_FOR_HYGIENE: hygiene/観測系 card_name のみ acceptance_summary 最小長を緩和（schema 参照）。
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import infinite_growth_card_generator_v1 as gen_mod

_AUTO = Path(__file__).resolve().parent
SCHEMA_FN = "notion_autobuild_schema_v1.json"
CARD_ID_RE = re.compile(r"^TENMON_[A-Z0-9_]+_CURSOR_AUTO_V1$")

# semantic / mainline / high-risk 系は従来どおり厳格閾値のみ（緩和レーンに入れない）
_SUMMARY_STRICT_ONLY_SUBSTRINGS = (
    "SCRIPTURE",
    "PERSONA",
    "SEMANTIC",
    "CENTRAL",
    "MAINLINE",
    "INTENTION",
)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def load_schema(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / SCHEMA_FN)


def _card_id_summary_relaxed_lane(card_id: str) -> bool:
    """HYGIENE / 観測・REPORT/PROBE 系の低リスクのみ acceptance_summary 短め許可。semantic 等は除外。"""
    u = (card_id or "").upper()
    if not u:
        return False
    for tok in _SUMMARY_STRICT_ONLY_SUBSTRINGS:
        if tok in u:
            return False
    if "HIGH" in u and "RISK" in u:
        return False
    if "HYGIENE" in u:
        return True
    if "OBSERVABILITY" in u or "OBSERVE" in u:
        return True
    if "PROBE" in u:
        return True
    if "_REPORT_" in u or "PROGRESS_REPORT" in u:
        return True
    return False


def acceptance_summary_min_for_card(card_id: str, sch: dict[str, Any]) -> tuple[int, str]:
    std = int(sch.get("acceptance_summary_min_len_standard") or 24)
    hy = int(sch.get("acceptance_summary_min_len_hygiene_observability") or 12)
    if _card_id_summary_relaxed_lane(card_id):
        return max(1, hy), "hygiene_observability_relaxed"
    return max(1, std), "standard_strict"


def compile_manifest(
    *,
    auto_dir: Path,
    row: dict[str, Any],
    notion_page_id: str = "",
) -> tuple[dict[str, Any] | None, str, list[str]]:
    """
    戻り: (manifest or None, verdict ok|HOLD, errors)
    manifest に source_notion_page_id を付与。
    """
    sch = load_schema(auto_dir)
    req = sch.get("required")
    if not isinstance(req, list):
        return None, "HOLD", ["schema_missing_required_list"]

    allowed = sch.get("allowed_status")
    if not isinstance(allowed, list):
        allowed = []

    ag_req = str(sch.get("approval_gate_required") or "__YES__")
    ar_req = str(sch.get("auto_run_enabled_required") or "__YES__")

    errors: list[str] = []
    flat: dict[str, str] = {}
    for k in req:
        ks = str(k)
        v = row.get(ks)
        if v is None:
            errors.append(f"missing:{ks}")
            continue
        s = str(v).strip()
        if not s:
            errors.append(f"empty:{ks}")
            continue
        flat[ks] = s

    if errors:
        return None, "HOLD", errors

    st = flat.get("status", "")
    if allowed and st not in [str(x) for x in allowed]:
        return None, "HOLD", [f"status_not_allowed:{st}"]

    if flat.get("approval_gate", "") != ag_req:
        return None, "HOLD", ["approval_gate_not_satisfied"]

    if flat.get("auto_run_enabled", "") != ar_req:
        return None, "HOLD", ["auto_run_not_enabled"]

    cid = flat.get("card_name", "")
    if not CARD_ID_RE.match(cid):
        return None, "HOLD", ["card_name_not_tenmon_cursor_auto_v1"]

    body = flat.get("card_body", "")
    bad, bwhy = gen_mod.dangerous_scope_scan(body + "\n" + flat.get("target_scope", ""))
    if bad:
        return None, "HOLD", [bwhy]

    acc = flat.get("acceptance_summary", "")
    min_acc, _acc_rule = acceptance_summary_min_for_card(cid, sch)
    if len(acc) < min_acc:
        return None, "HOLD", ["acceptance_summary_too_short"]

    manifest: dict[str, Any] = {
        "schema": "TENMON_NOTION_AUTOBUILD_MANIFEST_V1",
        **flat,
        "source_notion_page_id": (notion_page_id or "").strip(),
    }
    pt = sch.get("manifest_pass_through_fields")
    if isinstance(pt, list):
        for k in pt:
            ks = str(k)
            if ks not in row:
                continue
            val = row.get(ks)
            if val is None:
                continue
            if ks == "retry_count":
                manifest[ks] = str(val).strip()
                continue
            s = str(val).strip()
            if s:
                manifest[ks] = s
    return manifest, "ok", []


def compile_many(
    auto_dir: Path,
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """戻り: (ok_manifests, rejected[{notion_page_id, card_name, errors}], candidate_traces)"""
    sch = load_schema(auto_dir)
    ok: list[dict[str, Any]] = []
    bad: list[dict[str, Any]] = []
    traces: list[dict[str, Any]] = []
    for item in rows:
        if not isinstance(item, dict):
            bad.append({"notion_page_id": "", "card_name": "", "errors": ["not_a_dict"]})
            traces.append(
                {
                    "notion_page_id": "",
                    "card_name": "",
                    "compile_ok": False,
                    "compile_reason": "not_a_dict",
                    "acceptance_summary_rule": "n_a",
                    "acceptance_summary_min_len": 0,
                    "allowlist_ok": False,
                    "allowlist_reason": "skipped_compile_failed",
                    "enqueue_selected": False,
                    "enqueue_reason": "skipped_compile_failed",
                }
            )
            continue
        rid = str(item.get("_notion_page_id") or "")
        row = {k: v for k, v in item.items() if not str(k).startswith("_")}
        cn = str(row.get("card_name") or "").strip()
        min_acc, acc_rule = acceptance_summary_min_for_card(cn, sch)
        m, v, err = compile_manifest(auto_dir=auto_dir, row=row, notion_page_id=rid)
        compile_ok = bool(m) and v == "ok"
        compile_reason = "ok" if compile_ok else (";".join(err) if err else str(v))
        traces.append(
            {
                "notion_page_id": rid,
                "card_name": cn,
                "compile_ok": compile_ok,
                "compile_reason": compile_reason,
                "acceptance_summary_rule": acc_rule,
                "acceptance_summary_min_len": min_acc,
                "allowlist_ok": False,
                "allowlist_reason": "",
                "enqueue_selected": False,
                "enqueue_reason": "",
            }
        )
        if m and v == "ok":
            ok.append(m)
        else:
            bad.append({"notion_page_id": rid, "card_name": cn, "errors": err})
    return ok, bad, traces
