#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1 — static exit contract scan for api/src/routes/chat.ts.

Read-only. Does not edit chat.ts, client, dist, kokuzo_schema.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from chatts_metrics_v1 import (
    RE_ROUTE_REASON_LITERAL,
    RE_RETURN_WORD,
    _brace_after_return,
    extract_balanced_brace_object,
    line_number_at_offset,
)
from repo_resolve_v1 import repo_root_from

DEFAULT_CHAT = "api/src/routes/chat.ts"
REPORT_JSON = "chatts_exit_contract_v1.json"
REPORT_MD = "chatts_exit_contract_v1.md"

RE_RETURN_RES_JSON = re.compile(r"\breturn\s+res\.json\s*\(")
RE_LINE_RES_JSON = re.compile(r"^\s*res\.json\s*\(")
RE_RETURN_REPLY = re.compile(r"\breturn\s+__reply\s*\(")
RE_REPLY_DEF = re.compile(r"\bconst\s+__reply\s*=")
RE_ORIG_JSON_BIND = re.compile(r"\b(?:const|let)\s+\w+\s*=\s*res\.json\s*\(")
RE_MODE = re.compile(r"""mode\s*:\s*["']([^"']+)["']""")
RE_INTENT = re.compile(r"""intent\s*:\s*["']([^"']+)["']""")

TRUNKS = (
    "infra_wrapper",
    "define",
    "scripture",
    "general",
    "continuity",
    "support_selfdiag",
)

# Split-target trunks → required exit-shape policy (static constitution; heuristic).
TRUNK_REQUIRED_EXIT_CONTRACTS: Dict[str, Dict[str, str]] = {
    "infra_wrapper": {
        "routeReason": "required_on_branch_returns",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "ku_must_be_object_shaped_when_present",
        "lawsUsedDefaultPolicy": "prefer_empty_array_literal",
        "evidenceIdsDefaultPolicy": "prefer_empty_array_literal",
        "lawTraceDefaultPolicy": "prefer_empty_array_literal",
        "rewriteUsedRewriteDeltaPolicy": "top_level_defaults_via_single_resjson_wrap",
        "threadIdPropagation": "must_not_leak_smoke_thread_into_llm_payload",
        "synapseTopAttachPoint": "after_synapse_write_same_turn",
        "responsePlanAttachPoint": "ku_or_buildResponsePlan_before_exit",
    },
    "define": {
        "routeReason": "required",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "required",
        "lawsUsedDefaultPolicy": "empty_array_safe",
        "evidenceIdsDefaultPolicy": "empty_array_safe",
        "lawTraceDefaultPolicy": "empty_array_safe",
        "rewriteUsedRewriteDeltaPolicy": "honor_resjson_wrap_defaults",
        "threadIdPropagation": "session_consistent",
        "synapseTopAttachPoint": "when_synapse_path_used",
        "responsePlanAttachPoint": "ku_responsePlan_before_branch_exit",
    },
    "scripture": {
        "routeReason": "required",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "required",
        "lawsUsedDefaultPolicy": "empty_array_safe",
        "evidenceIdsDefaultPolicy": "empty_array_safe",
        "lawTraceDefaultPolicy": "empty_array_safe",
        "rewriteUsedRewriteDeltaPolicy": "honor_resjson_wrap_defaults",
        "threadIdPropagation": "preserve_scripture_continuity",
        "synapseTopAttachPoint": "optional_observability",
        "responsePlanAttachPoint": "ku_responsePlan_when_general_branch",
    },
    "continuity": {
        "routeReason": "required",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "required",
        "lawsUsedDefaultPolicy": "empty_array_safe",
        "evidenceIdsDefaultPolicy": "empty_array_safe",
        "lawTraceDefaultPolicy": "empty_array_safe",
        "rewriteUsedRewriteDeltaPolicy": "honor_resjson_wrap_defaults",
        "threadIdPropagation": "thread_followup_consistent",
        "synapseTopAttachPoint": "when_logging_enabled",
        "responsePlanAttachPoint": "ku_responsePlan_for_multiturn",
    },
    "support_selfdiag": {
        "routeReason": "required",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "required",
        "lawsUsedDefaultPolicy": "empty_array_safe",
        "evidenceIdsDefaultPolicy": "empty_array_safe",
        "lawTraceDefaultPolicy": "empty_array_safe",
        "rewriteUsedRewriteDeltaPolicy": "honor_resjson_wrap_defaults",
        "threadIdPropagation": "session_consistent",
        "synapseTopAttachPoint": "optional",
        "responsePlanAttachPoint": "ku_responsePlan_when_branching",
    },
    "general": {
        "routeReason": "required",
        "mode": "required_when_decisionFrame_present",
        "intent": "required_when_decisionFrame_present",
        "kuObjectGuarantee": "required",
        "lawsUsedDefaultPolicy": "empty_array_safe",
        "evidenceIdsDefaultPolicy": "empty_array_safe",
        "lawTraceDefaultPolicy": "empty_array_safe",
        "rewriteUsedRewriteDeltaPolicy": "honor_resjson_wrap_defaults",
        "threadIdPropagation": "session_consistent",
        "synapseTopAttachPoint": "optional",
        "responsePlanAttachPoint": "ku_responsePlan_for_natural_general",
    },
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def window_text(lines: List[str], center: int, before: int = 45, after: int = 45) -> str:
    lo = max(0, center - 1 - before)
    hi = min(len(lines), center + after)
    return "\n".join(lines[lo:hi])


def analyze_window(w: str) -> Dict[str, Any]:
    rr_m = RE_ROUTE_REASON_LITERAL.search(w)
    rr = rr_m.group("val") if rr_m else None
    mode_m = RE_MODE.search(w)
    intent_m = RE_INTENT.search(w)
    has_df = "decisionFrame" in w
    ku_obj = bool(re.search(r"\bku\s*:\s*\{", w)) or bool(re.search(r"decisionFrame\.ku", w))
    laws = "lawsUsed" in w
    evi = "evidenceIds" in w
    lt = "lawTrace" in w
    rw = "rewriteUsed" in w or "rewriteDelta" in w or "CARD6C" in w or "res.json ONCE" in w
    tid = "threadId" in w
    st = "synapseTop" in w
    rp = "responsePlan" in w or "buildResponsePlan" in w
    return {
        "routeReasonLiteral": rr,
        "modeLiteral": mode_m.group(1) if mode_m else None,
        "intentLiteral": intent_m.group(1) if intent_m else None,
        "hasDecisionFrame": has_df,
        "kuObjectMentioned": ku_obj,
        "lawsUsedDefaultPolicy": "empty_array_literal_if_omitted" if laws else "unknown",
        "evidenceIdsDefaultPolicy": "empty_array_literal_if_omitted" if evi else "unknown",
        "lawTraceDefaultPolicy": "empty_array_literal_if_omitted" if lt else "unknown",
        "rewriteUsedRewriteDeltaPolicy": "documented_top_level_wrap" if rw else "unknown_or_indirect",
        "threadIdPropagation": "mentioned" if tid else "not_in_window",
        "synapseTopAttachPoint": "mentioned" if st else "not_in_window",
        "responsePlanAttachPoint": "mentioned" if rp else "not_in_window",
    }


def collect_exit_sites(text: str, lines: List[str]) -> List[Dict[str, Any]]:
    sites: List[Dict[str, Any]] = []
    seen: Set[Tuple[int, str]] = set()

    def add_site(line: int, kind: str, preview: str, extra: Dict[str, Any]) -> None:
        key = (line, kind)
        if key in seen:
            return
        seen.add(key)
        w = window_text(lines, line)
        aw = analyze_window(w)
        gate = "__tenmonGeneralGateResultMaybe" in preview or "__tenmonGeneralGateResultMaybe" in w[
            :2000
        ]
        row = {
            "line": line,
            "kind": kind,
            "preview": preview[:200] + ("..." if len(preview) > 200 else ""),
            "usesGeneralGateWrapper": gate,
            **aw,
        }
        sites.append(row)

    for m in RE_RETURN_RES_JSON.finditer(text):
        ln = line_number_at_offset(text, m.start())
        pl = lines[ln - 1] if 0 < ln <= len(lines) else ""
        add_site(ln, "return_res_json", pl, {})

    for i, ln in enumerate(lines, start=1):
        if RE_RETURN_RES_JSON.search(ln):
            continue
        if RE_LINE_RES_JSON.search(ln):
            add_site(i, "bare_res_json", ln.strip(), {})

    for m in RE_RETURN_REPLY.finditer(text):
        ln = line_number_at_offset(text, m.start())
        pl = lines[ln - 1] if 0 < ln <= len(lines) else ""
        add_site(ln, "return_reply", pl, {})

    for m in RE_RETURN_WORD.finditer(text):
        start = m.start()
        ln = line_number_at_offset(text, start)
        rest = text[m.end() : m.end() + 80].lstrip()
        if rest.startswith("res.json"):
            continue
        if rest.startswith("__reply"):
            continue
        brace_pos = _brace_after_return(text, m.end())
        if brace_pos is None:
            pl = lines[ln - 1] if 0 < ln <= len(lines) else ""
            if "res.json" in pl or "__reply" in pl:
                continue
            if "return" in pl and pl.strip() != "return":
                add_site(ln, "early_return", pl.strip(), {})
            continue
        blob = extract_balanced_brace_object(text, brace_pos)
        if not blob:
            continue
        pl = lines[ln - 1] if 0 < ln <= len(lines) else ""
        add_site(ln, "return_object", pl.strip() + " | " + blob[:120], {})

    sites.sort(key=lambda x: (x["line"], x["kind"]))
    return sites


def drift_candidates(sites: List[Dict[str, Any]], lines: List[str]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    gate_sites = [s for s in sites if s.get("kind") == "return_res_json"]
    with_gate = sum(1 for s in gate_sites if s.get("usesGeneralGateWrapper"))
    without = len(gate_sites) - with_gate
    if without > 0 and with_gate > 0:
        out.append(
            {
                "line": 0,
                "driftKind": "mixed_res_json_wrapper",
                "note": f"return_res_json with_gate={with_gate} without_gate={without}; prefer single wrap policy (CARD6C).",
            }
        )
    for s in sites:
        if s.get("kind") != "return_res_json":
            continue
        if not s.get("usesGeneralGateWrapper"):
            out.append(
                {
                    "line": s["line"],
                    "driftKind": "res_json_without_general_gate_wrapper",
                    "note": "return res.json without __tenmonGeneralGateResultMaybe on same line/window — verify intentional.",
                }
            )
    for s in sites:
        if s.get("kind") != "return_object":
            continue
        if s.get("hasDecisionFrame") and not s.get("routeReasonLiteral"):
            out.append(
                {
                    "line": s["line"],
                    "driftKind": "decision_frame_without_literal_routeReason_in_window",
                    "note": "Heuristic: decisionFrame in window but no literal routeReason string found ±45 lines.",
                }
            )
    return _consolidate_decision_frame_route_reason_drifts(out)


DK_DECISION_FRAME_RR = "decision_frame_without_literal_routeReason_in_window"


def _consolidate_decision_frame_route_reason_drifts(drifts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge adjacent heuristic rows (same trunk window) so baseline counts stay stable vs chat.ts splits."""
    others = [d for d in drifts if d.get("driftKind") != DK_DECISION_FRAME_RR]
    frames = [d for d in drifts if d.get("driftKind") == DK_DECISION_FRAME_RR]
    if len(frames) <= 1:
        return drifts
    frames.sort(key=lambda x: int(x["line"]))
    max_gap = 40
    clusters: List[List[Dict[str, Any]]] = []
    cur: List[Dict[str, Any]] = [frames[0]]
    for d in frames[1:]:
        if int(d["line"]) - int(cur[-1]["line"]) <= max_gap:
            cur.append(d)
        else:
            clusters.append(cur)
            cur = [d]
    clusters.append(cur)
    merged: List[Dict[str, Any]] = []
    for cl in clusters:
        if len(cl) == 1:
            merged.append(cl[0])
            continue
        line_nums = [int(x["line"]) for x in cl]
        lo, hi = min(line_nums), max(line_nums)
        merged.append(
            {
                "line": lo,
                "driftKind": DK_DECISION_FRAME_RR,
                "note": (
                    f"Heuristic cluster ({len(cl)} sites, lines {lo}–{hi}): decisionFrame in window "
                    "but no literal routeReason string found ±45 lines."
                ),
            }
        )
    return others + merged


def contract_summary(sites: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_kind: Dict[str, int] = {}
    for s in sites:
        k = str(s.get("kind"))
        by_kind[k] = by_kind.get(k, 0) + 1
    rj = [s for s in sites if s.get("kind") == "return_res_json"]
    with_rr = sum(1 for s in sites if s.get("routeReasonLiteral"))
    with_gate = sum(1 for s in rj if s.get("usesGeneralGateWrapper"))
    n = max(1, len(sites))
    return {
        "exitSiteTotal": len(sites),
        "byKind": dict(sorted(by_kind.items())),
        "returnResJsonCount": len(rj),
        "returnResJsonWithGeneralGateWrapper": with_gate,
        "returnResJsonWithoutGeneralGateWrapper": len(rj) - with_gate,
        "percentWindowsWithRouteReasonLiteral": round(100.0 * with_rr / n, 2),
        "percentReturnResJsonWithGate": round(100.0 * with_gate / max(1, len(rj)), 2)
        if rj
        else 0.0,
    }


def build_report(chat_path: Path) -> Dict[str, Any]:
    raw = chat_path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    sites = collect_exit_sites(raw, lines)
    drifts = drift_candidates(sites, lines)
    summary = contract_summary(sites)
    separation_obs_v1 = {
        "replyDefinitionCount": len(RE_REPLY_DEF.findall(raw)),
        "origJsonBindCount": len(RE_ORIG_JSON_BIND.findall(raw)),
        "note": "CHAT_TS_RESPONSIBILITY_SEPARATION_PDCA_V1 Phase C-1 観測: reply は 1 定義を期待、orig_json_bind は低減方向。",
    }
    return {
        "version": 1,
        "cardName": "CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1",
        "targetPath": str(chat_path).replace("\\", "/"),
        "generatedAt": _utc_now_iso(),
        "lineCount": len(lines),
        "exitSites": sites,
        "contractSummary": summary,
        "separationObservabilityV1": separation_obs_v1,
        "contractDriftCandidates": drifts,
        "trunkRequiredExitContracts": TRUNK_REQUIRED_EXIT_CONTRACTS,
        "exitContractPolicyLocks": {
            "mixedResJsonWrapper": {
                "status": "locked_intent_v1",
                "canonicalRule": "Branch exits that participate in the general chat gate SHOULD use return res.json(__tenmonGeneralGateResultMaybe(__replyV2, ...)) (CARD6C / res.json ONCE).",
                "fleetSummaryRow": "driftKind=mixed_res_json_wrapper (line 0) is observability when both gated and ungated return_res_json sites exist; not an automatic FAIL while REPLY_PATH_UNIFY_V1 is pending.",
                "ungatedSites": "Each res_json_without_general_gate_wrapper row is a review candidate (bootstrap / infra / intentional fastpath vs defect).",
                "runtimeAcceptance": "Must remain consistent with MAINLINE_COMPLETED_READ_ONLY_SEAL_V1 + runtime acceptance (no dist edit; ku object-shaped when present).",
            },
            "decisionFrameRouteReasonWindow": {
                "status": "locked_intent_v1",
                "note": "decision_frame_without_literal_routeReason_in_window uses ±45 lines; split trunks and dynamic routeReason construction may false-positive.",
            },
        },
        "meta": {
            "parser": "regex_plus_brace_for_return_object",
            "trunks": list(TRUNKS),
            "nextAutomationCard": "AUTO_BUILD_WORKSPACE_OBSERVER_V1",
        },
    }


SCHEMA_REQUIRED = [
    "version",
    "cardName",
    "targetPath",
    "generatedAt",
    "exitSites",
    "contractSummary",
    "contractDriftCandidates",
    "trunkRequiredExitContracts",
]


def validate_report(rep: Dict[str, Any]) -> List[str]:
    miss = [k for k in SCHEMA_REQUIRED if k not in rep]
    if miss:
        return [f"missing:{miss}"]
    if rep.get("cardName") != "CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1":
        return ["cardName"]
    tr = rep.get("trunkRequiredExitContracts") or {}
    for t in TRUNKS:
        if t not in tr:
            return [f"trunk_missing:{t}"]
    return []


def render_markdown(rep: Dict[str, Any]) -> str:
    lines: List[str] = ["# Exit contract lock report (CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1)\n"]
    lines.append(f"- **target**: `{rep.get('targetPath')}`")
    lines.append(f"- **generatedAt**: {rep.get('generatedAt')}")
    lines.append(f"- **exit sites**: {rep.get('contractSummary', {}).get('exitSiteTotal')}")
    lines.append(f"- **drift candidates**: {len(rep.get('contractDriftCandidates') or [])}")
    lines.append("")
    lines.append("## contractSummary")
    lines.append("```json")
    lines.append(json.dumps(rep.get("contractSummary"), ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("## trunk required (static)")
    lines.append("```json")
    lines.append(json.dumps(rep.get("trunkRequiredExitContracts"), ensure_ascii=False, indent=2))
    lines.append("```")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1 static analyzer")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--chat-path", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    chat = args.chat_path or (root / DEFAULT_CHAT)
    if not chat.is_file():
        print(json.dumps({"ok": False, "error": "chat_ts_not_found", "path": str(chat)}))
        return 2

    rep = build_report(chat)
    errs = validate_report(rep) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / REPORT_JSON).write_text(
            json.dumps(rep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (out_dir / REPORT_MD).write_text(render_markdown(rep), encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "exitSiteTotal": rep["contractSummary"]["exitSiteTotal"],
                    "driftCount": len(rep["contractDriftCandidates"]),
                    "trunks": list(TRUNKS),
                },
                indent=2,
                ensure_ascii=False,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
