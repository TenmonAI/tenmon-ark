#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static metrics for api/src/routes/chat.ts (regex + light brace tracking).
Deterministic; no TypeScript AST. Does not modify chat.ts.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Literal routeReason string in object / assignment
RE_ROUTE_REASON_LITERAL = re.compile(
    r"""(?P<key>routeReason)\s*:\s*["'](?P<val>[A-Z][A-Z0-9_]*)["']"""
)
RE_ROUTE_REASON_ASSIGN = re.compile(
    r"""__routeReason\w*\s*=\s*["'](?P<val>[A-Z][A-Z0-9_]*)["']"""
)
RE_RETURN_WORD = re.compile(r"\breturn\b")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def extract_balanced_brace_object(src: str, open_brace_idx: int) -> Optional[str]:
    """Return substring from `{` through matching `}` with string/comment awareness."""
    depth = 0
    i = open_brace_idx
    n = len(src)
    in_sl = False
    in_ml = False
    in_str: Optional[str] = None  # quote char
    escape = False
    tpl_expr = 0  # inside ${ } in template literal

    while i < n:
        c = src[i]
        if in_sl:
            if c == "\n":
                in_sl = False
            i += 1
            continue
        if in_ml:
            if c == "*" and i + 1 < n and src[i + 1] == "/":
                in_ml = False
                i += 2
                continue
            i += 1
            continue
        if in_str == "`":
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == "$" and i + 1 < n and src[i + 1] == "{":
                tpl_expr += 1
                i += 2
                continue
            elif tpl_expr > 0:
                if c == "{":
                    tpl_expr += 1
                elif c == "}":
                    tpl_expr -= 1
                i += 1
                continue
            elif c == "`":
                in_str = None
            i += 1
            continue
        if in_str:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == in_str:
                in_str = None
            i += 1
            continue
        if c == "/" and i + 1 < n:
            if src[i + 1] == "/":
                in_sl = True
                i += 2
                continue
            if src[i + 1] == "*":
                in_ml = True
                i += 2
                continue
        if c in "\"'":
            in_str = c
            i += 1
            continue
        if c == "`":
            in_str = "`"
            i += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[open_brace_idx : i + 1]
        i += 1
    return None


def line_number_at_offset(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


@dataclass
class RouteHit:
    reason: str
    line: int


def collect_route_reason_hits(text: str) -> List[RouteHit]:
    hits: List[RouteHit] = []
    for m in RE_ROUTE_REASON_LITERAL.finditer(text):
        hits.append(RouteHit(reason=m.group("val"), line=line_number_at_offset(text, m.start())))
    for m in RE_ROUTE_REASON_ASSIGN.finditer(text):
        hits.append(RouteHit(reason=m.group("val"), line=line_number_at_offset(text, m.start())))
    hits.sort(key=lambda h: (h.line, h.reason))
    return hits


def count_import_lines(lines: List[str]) -> int:
    n = 0
    for ln in lines:
        s = ln.strip()
        if s.startswith("import ") or s.startswith("import{"):
            n += 1
        elif s.startswith("import type "):
            n += 1
    return n


def _brace_after_return(text: str, ret_match_end: int) -> Optional[int]:
    """Skip whitespace/comments after `return` until `{` or non-ws terminator."""
    i = ret_match_end
    n = len(text)
    in_sl = False
    in_ml = False
    while i < n:
        c = text[i]
        if in_sl:
            if c == "\n":
                in_sl = False
            i += 1
            continue
        if in_ml:
            if c == "*" and i + 1 < n and text[i + 1] == "/":
                in_ml = False
                i += 2
                continue
            i += 1
            continue
        if c == "/" and i + 1 < n:
            if text[i + 1] == "/":
                in_sl = True
                i += 2
                continue
            if text[i + 1] == "*":
                in_ml = True
                i += 2
                continue
        if c in " \t\n\r":
            i += 1
            continue
        if c == "{":
            return i
        return None
    return None


def find_return_object_spans(text: str) -> List[Tuple[int, int, str]]:
    """
    List of (start_line, end_line, blob) for `return { ... }` object literals (best-effort).
    Handles `return` and `{` on different lines.
    """
    out: List[Tuple[int, int, str]] = []
    for m in RE_RETURN_WORD.finditer(text):
        brace_pos = _brace_after_return(text, m.end())
        if brace_pos is None:
            continue
        blob = extract_balanced_brace_object(text, brace_pos)
        if not blob:
            continue
        start_line = line_number_at_offset(text, m.start())
        end_line = line_number_at_offset(text, brace_pos + len(blob) - 1)
        out.append((start_line, end_line, blob))
    return out


def _window_join(lines: List[str], center_line: int, before: int = 60, after: int = 60) -> str:
    lo = max(0, center_line - 1 - before)
    hi = min(len(lines), center_line + after)
    return "\n".join(lines[lo:hi])


def line_window_missing_contracts(
    lines: List[str], route_hits: List[RouteHit]
) -> Tuple[
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
]:
    """
    Secondary heuristic: scan ±lines around each routeReason literal hit.
    Catches patterns where `return {` object extraction missed (e.g. variable returns).
    """
    mrp: List[Dict[str, Any]] = []
    mku: List[Dict[str, Any]] = []
    mtc: List[Dict[str, Any]] = []
    mst: List[Dict[str, Any]] = []
    seen_rp: Set[int] = set()
    seen_ku: Set[int] = set()
    seen_tc: Set[int] = set()
    seen_st: Set[int] = set()
    for h in route_hits:
        w = _window_join(lines, h.line, 70, 70)
        if "decisionFrame" not in w:
            continue
        if "responsePlan" not in w and h.line not in seen_rp:
            seen_rp.add(h.line)
            mrp.append(
                {
                    "line": h.line,
                    "note": "line_window: decisionFrame present, responsePlan token absent in ±70 lines",
                }
            )
        if not re.search(r"\bku\s*:", w) and h.line not in seen_ku:
            seen_ku.add(h.line)
            mku.append(
                {
                    "line": h.line,
                    "note": "line_window: decisionFrame present, ku: token absent in ±70 lines",
                }
            )
        if re.search(r"\bthreadId\b", w) and "threadCore" not in w and h.line not in seen_tc:
            seen_tc.add(h.line)
            mtc.append(
                {
                    "line": h.line,
                    "note": "line_window: threadId without threadCore in ±70 lines",
                }
            )
        if ("writeSynapseLogV1" in w or "synapse_log" in w) and "synapseTop" not in w:
            if h.line not in seen_st:
                seen_st.add(h.line)
                mst.append(
                    {
                        "line": h.line,
                        "note": "line_window: synapse write/log path without synapseTop in ±70 lines",
                    }
                )
    return mrp, mku, mtc, mst


def heuristic_missing_contracts(
    spans: List[Tuple[int, int, str]]
) -> Tuple[
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
]:
    missing_rp: List[Dict[str, Any]] = []
    missing_ku: List[Dict[str, Any]] = []
    missing_tc: List[Dict[str, Any]] = []
    missing_st: List[Dict[str, Any]] = []
    for start_line, _end, blob in spans:
        if "decisionFrame" not in blob:
            continue
        if not RE_ROUTE_REASON_LITERAL.search(blob) and not RE_ROUTE_REASON_ASSIGN.search(blob):
            continue
        if "responsePlan" not in blob:
            missing_rp.append(
                {
                    "line": start_line,
                    "note": "decisionFrame+literal_routeReason_but_no_responsePlan_in_return_object",
                }
            )
        if not re.search(r"\bku\s*:", blob):
            missing_ku.append(
                {
                    "line": start_line,
                    "note": "decisionFrame+routeReason_but_no_ku_colon_in_return_object",
                }
            )
        if re.search(r"\bthreadId\b", blob) and "threadCore" not in blob:
            missing_tc.append(
                {
                    "line": start_line,
                    "note": "threadId_without_threadCore_in_same_return_object",
                }
            )
        if ("writeSynapseLogV1" in blob or "synapse_log" in blob) and "synapseTop" not in blob:
            missing_st.append(
                {
                    "line": start_line,
                    "note": "synapse_write_path_without_synapseTop_in_same_return_object",
                }
            )
    return missing_rp, missing_ku, missing_tc, missing_st


def _merge_candidate_lists(*lists: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    by_line: Dict[int, Dict[str, Any]] = {}
    for lst in lists:
        for item in lst:
            ln = int(item["line"])
            if ln not in by_line:
                by_line[ln] = dict(item)
    return [by_line[k] for k in sorted(by_line)]


def return_sites(lines: List[str]) -> List[Dict[str, Any]]:
    sites: List[Dict[str, Any]] = []
    for i, ln in enumerate(lines, start=1):
        if "//" in ln:
            code = ln.split("//", 1)[0]
        else:
            code = ln
        if RE_RETURN_WORD.search(code):
            preview = ln.strip()
            if len(preview) > 120:
                preview = preview[:117] + "..."
            sites.append({"line": i, "preview": preview})
    return sites


def compute_split_blocks(line_count: int, max_blocks: int = 10) -> List[Tuple[int, int]]:
    if line_count <= 0:
        return []
    n = min(max_blocks, max(1, line_count // 200))
    n = min(n, line_count)
    size = max(1, (line_count + n - 1) // n)
    blocks: List[Tuple[int, int]] = []
    start = 1
    while start <= line_count and len(blocks) < max_blocks:
        end = min(line_count, start + size - 1)
        blocks.append((start, end))
        start = end + 1
    return blocks[:max_blocks]


def compute_split_priority(
    line_count: int,
    return_lines: Set[int],
    route_hits: List[RouteHit],
    dup_reasons: Set[str],
    missing_lines: List[int],
) -> List[Dict[str, Any]]:
    blocks = compute_split_blocks(line_count, 10)
    rr_by_line = {h.line: h.reason for h in route_hits}
    route_lines = {h.line for h in route_hits}

    def in_block(ln: int, lo: int, hi: int) -> bool:
        return lo <= ln <= hi

    scored: List[Dict[str, Any]] = []
    for lo, hi in blocks:
        blines = hi - lo + 1
        rets = sum(1 for ln in return_lines if in_block(ln, lo, hi))
        rrs = sum(1 for ln in route_lines if in_block(ln, lo, hi))
        dup_hits = 0
        for h in route_hits:
            if in_block(h.line, lo, hi) and h.reason in dup_reasons:
                dup_hits += 1
        miss = sum(1 for ln in missing_lines if in_block(ln, lo, hi))
        len_norm = blines / max(1, line_count)
        ret_d = rets / max(1, blines)
        rr_d = rrs / max(1, blines)
        score = (
            len_norm * 40.0
            + ret_d * 150.0
            + rr_d * 120.0
            + dup_hits * 25.0
            + miss * 18.0
        )
        scored.append(
            {
                "startLine": lo,
                "endLine": hi,
                "lineSpan": blines,
                "score": round(score, 4),
                "components": {
                    "lengthNorm": round(len_norm, 6),
                    "returnDensity": round(ret_d, 6),
                    "routeReasonDensity": round(rr_d, 6),
                    "duplicateRouteReasonHitsInBlock": dup_hits,
                    "missingContractHitsInBlock": miss,
                },
            }
        )
    scored.sort(key=lambda x: (-x["score"], x["startLine"]))
    for rank, item in enumerate(scored, start=1):
        item["rank"] = rank
    return scored[:10]


def analyze_chat_ts(path: Path) -> Dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    line_count = len(lines)
    import_count = count_import_lines(lines)

    route_hits = collect_route_reason_hits(raw)
    reason_counts: Dict[str, int] = {}
    for h in route_hits:
        reason_counts[h.reason] = reason_counts.get(h.reason, 0) + 1
    route_reasons_sorted = sorted(reason_counts.keys())
    duplicate_route_reasons = [
        {"reason": r, "count": c} for r, c in sorted(reason_counts.items()) if c > 1
    ]
    dup_reason_set = {d["reason"] for d in duplicate_route_reasons}

    sites = return_sites(lines)
    return_lines = {s["line"] for s in sites}

    spans = find_return_object_spans(raw)
    mrp_s, mku_s, mtc_s, mst_s = heuristic_missing_contracts(spans)
    mrp_w, mku_w, mtc_w, mst_w = line_window_missing_contracts(lines, route_hits)
    mrp = _merge_candidate_lists(mrp_s, mrp_w)
    mku = _merge_candidate_lists(mku_s, mku_w)
    mtc = _merge_candidate_lists(mtc_s, mtc_w)
    mst = _merge_candidate_lists(mst_s, mst_w)

    missing_all_lines = sorted({x["line"] for x in mrp + mku + mtc + mst})

    split_priority = compute_split_priority(
        line_count,
        return_lines,
        route_hits,
        dup_reason_set,
        missing_all_lines,
    )

    return {
        "version": 1,
        "targetPath": str(path).replace("\\", "/"),
        "auditedAt": _utc_now_iso(),
        "lineCount": line_count,
        "importCount": import_count,
        "routeReasons": route_reasons_sorted,
        "duplicateRouteReasons": duplicate_route_reasons,
        "returnSites": sites,
        "missingResponsePlanCandidates": mrp,
        "missingKuCandidates": mku,
        "missingThreadCoreCandidates": mtc,
        "missingSynapseTopCandidates": mst,
        "splitPriority": split_priority,
        "meta": {
            "routeReasonLiteralHits": len(route_hits),
            "returnObjectSpansParsed": len(spans),
            "heuristicNotes": "Candidates are static heuristics on return { ... } blobs; false positives expected.",
        },
    }
