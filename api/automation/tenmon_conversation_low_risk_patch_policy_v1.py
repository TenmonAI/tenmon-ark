#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_LOW_RISK_PATCH_POLICY_LOCK_CURSOR_AUTO_V1

low-risk patch 対象パスの policy 判定。manual-only が 1 つでも混ざれば patch plan は抑止する。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_POLICY_PATH = Path(__file__).resolve().with_name("tenmon_conversation_low_risk_patch_policy_v1.json")


def normalize_repo_relative_path(path: str) -> str:
    p = (path or "").strip().replace("\\", "/").lstrip("./")
    while "//" in p:
        p = p.replace("//", "/")
    return p


def load_policy(path: Optional[Path] = None) -> Dict[str, Any]:
    p = path or _POLICY_PATH
    raw = p.read_text(encoding="utf-8", errors="replace")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("policy_root_not_object")
    return data


def path_is_manual_only(path_norm: str, pol: Dict[str, Any]) -> Optional[str]:
    """該当すれば deny 理由キー、否则 None。"""
    for ex in pol.get("manual_only_exact_paths") or []:
        e = normalize_repo_relative_path(str(ex))
        if path_norm == e:
            return f"manual_only_exact:{e}"
    for px in pol.get("manual_only_path_prefixes") or []:
        pre = normalize_repo_relative_path(str(px))
        if path_norm == pre or path_norm.startswith(pre):
            return f"manual_only_prefix:{pre}"
    low = path_norm.lower()
    for sub in pol.get("manual_only_substrings") or []:
        s = str(sub).lower()
        if s and s in low:
            return f"manual_only_substring:{sub}"
    return None


def path_is_auto_fixable(path_norm: str, pol: Dict[str, Any]) -> bool:
    for px in pol.get("auto_fixable_prefixes") or []:
        pre = normalize_repo_relative_path(str(px)).rstrip("/")
        if path_norm == pre or path_norm.startswith(pre + "/"):
            return True
    return False


def evaluate_paths_for_autofix(
    paths: List[str],
    pol: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    全パスが auto-fix 許容なら allowed。
    manual-only 1 つでもあれば allowed=False（patch plan 全体抑止用）。
    未知パスは fail-closed で deny。
    """
    policy = pol if pol is not None else load_policy()
    normalized = [normalize_repo_relative_path(p) for p in paths if str(p).strip()]
    if not normalized:
        return {
            "allowed": True,
            "deny_reason": "",
            "manual_only_hits": [],
            "unknown_paths": [],
            "auto_fixable_paths_ok": [],
            "policy_version": policy.get("version"),
            "vacuous_no_paths": True,
        }
    manual_hits: List[Dict[str, str]] = []
    unknown: List[str] = []
    ok_paths: List[str] = []

    for p in normalized:
        m = path_is_manual_only(p, policy)
        if m:
            manual_hits.append({"path": p, "reason": m})
            continue
        if path_is_auto_fixable(p, policy):
            ok_paths.append(p)
            continue
        unknown.append(p)

    if manual_hits:
        return {
            "allowed": False,
            "deny_reason": "patch_plan_contains_manual_only_paths",
            "manual_only_hits": manual_hits,
            "unknown_paths": unknown,
            "auto_fixable_paths_ok": ok_paths,
            "policy_version": policy.get("version"),
        }
    if unknown:
        return {
            "allowed": False,
            "deny_reason": "patch_plan_contains_unknown_or_non_allowlisted_paths",
            "manual_only_hits": [],
            "unknown_paths": unknown,
            "auto_fixable_paths_ok": ok_paths,
            "policy_version": policy.get("version"),
        }
    return {
        "allowed": True,
        "deny_reason": "",
        "manual_only_hits": [],
        "unknown_paths": [],
        "auto_fixable_paths_ok": ok_paths,
        "policy_version": policy.get("version"),
    }


def aggregate_suggested_paths_from_plan(classification: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    for item in classification.get("low_risk_plan") or []:
        for p in item.get("suggested_paths") or []:
            out.append(str(p))
    return out


def apply_policy_to_classification(classification: Dict[str, Any], pol: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    low_risk_plan に載る suggested_paths を集約し policy 判定。
    deny 時は low_risk_plan を空にし、抑止メタを返す。
    """
    paths = aggregate_suggested_paths_from_plan(classification)
    verdict = evaluate_paths_for_autofix(paths, pol)
    if verdict["allowed"]:
        out = dict(classification)
        out["patch_policy"] = {"status": "allowed", **{k: v for k, v in verdict.items() if k != "allowed"}}
        return out, verdict

    denied = dict(classification)
    denied["low_risk_plan"] = []
    denied["patch_policy"] = {
        "status": "denied",
        "suppress_low_risk_plan": True,
        "deny_reason": verdict.get("deny_reason"),
        "manual_only_hits": verdict.get("manual_only_hits"),
        "unknown_paths": verdict.get("unknown_paths"),
        "original_low_risk_plan_item_count": len(classification.get("low_risk_plan") or []),
        "policy_version": verdict.get("policy_version"),
    }
    return denied, verdict
