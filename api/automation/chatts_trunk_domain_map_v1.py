#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TRUNK_DOMAIN_MAP_V1 — static trunk domain map for api/src/routes/chat.ts.

Builds on AUTO_BUILD_CHATTS_AUDIT_SUITE_V1 metrics (via chatts_metrics_v1).
Read-only on chat.ts; automation + docs only.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from chatts_metrics_v1 import (
    RouteHit,
    analyze_chat_ts,
    collect_route_reason_hits,
    return_sites,
)

DEFAULT_REL_CHAT = "api/src/routes/chat.ts"
REPORT_JSON = "chatts_trunk_domain_map_v1.json"

# Minimum trunks (fixed set, always emitted)
TRUNKS: Tuple[str, ...] = (
    "define",
    "scripture",
    "general",
    "continuity",
    "support_selfdiag",
    "infra_wrapper",
)

# First matching rule wins (order matters)
_TRUNK_RULES: List[Tuple[str, re.Pattern[str]]] = [
    (
        "define",
        re.compile(
            r"^(DEF_|NAMING_|KHS_|DET_|BOOK_PLACEHOLDER|FORCE_MENU|"
            r"FASTPATH_IDENTITY|FASTPATH_GREETING|FASTPATH_.*DEFINE|IS_CORE_SCRIPTURE)",
            re.I,
        ),
    ),
    (
        "scripture",
        re.compile(
            r"(SCRIPTURE|SUBCONCEPT|CONCEPT_CANON|KOTODAMA_ONE_SOUND|IROHA_MIZUKA|"
            r"KATAKAMUNA|WORLDVIEW_ROUTE|BOOK_|CANON_ROUTE|SAIKIHO|KOJIKI|MYTH_)",
            re.I,
        ),
    ),
    (
        "continuity",
        re.compile(
            r"(CONTINUITY|THREAD|FOLLOWUP|NEXTSTEP|ANCHOR|KANAGI_CONVERSATION|"
            r"GREETING_TENMON|SHORT_CONT|DIALOGUE_CONT|persistTurn|RELEASE_PREEMPT|"
            r"SMOKE_HYBRID|HYBRID_ROUTE)",
            re.I,
        ),
    ),
    (
        "support_selfdiag",
        re.compile(
            r"(SUPPORT_|R22_SELF|SELF_DIAG|ESSENCE|COMPARE|JUDGEMENT|SYSTEM_DIAG|"
            r"WILL_CORE|LANGUAGE_ESSENCE|EXPLICIT_CHAR|DRIFT_FIREWALL|"
            r"CONSCIOUSNESS_META|AI_DEF|AI_CONSCIOUSNESS|STRUCTURE_LOCK|"
            r"GROUNDING_|RESIDUAL|SHRINK|FUTURE_OUTLOOK|SYSTEM_DIAG)",
            re.I,
        ),
    ),
    (
        "infra_wrapper",
        re.compile(
            r"(REQBODY|DATE_JST|N1_DATE|EARLY_V1|EARLY_|SYNAPSE|X8|X9|X9J|X9D|"
            r"KG[0-9]|LEDGER|GRACT|TRUTH_GATE|writeSynapse|OBSERVABILITY|"
            r"MEMORY_ROUTER|ROUTER_CONTRACT|CALLSITE|WRAPPER|DEDUP|DUPLICATION)",
            re.I,
        ),
    ),
]

_LINE_INFRA = re.compile(
    r"writeSynapseLogV1|\.prepare\s*\(|DatabaseSync|synapse_log|synapseTop|__db\d+\.",
    re.I,
)
_LINE_DEFINE = re.compile(
    r"buildDefine|parseDefine|define\.ts|DEFINE_|from\s+[\"'].*define",
    re.I,
)
_LINE_SCRIPTURE = re.compile(
    r"scripture|ScriptureCanon|subconcept|kotodama|kojiki|mythMap",
    re.I,
)


def classify_route_reason(reason: str) -> str:
    u = reason.strip()
    for trunk, pat in _TRUNK_RULES:
        if pat.search(u):
            return trunk
    return "general"


def classify_line_fallback(line: str) -> str:
    if _LINE_INFRA.search(line):
        return "infra_wrapper"
    if _LINE_DEFINE.search(line):
        return "define"
    if _LINE_SCRIPTURE.search(line):
        return "scripture"
    return "general"


def last_route_before(hits_sorted: List[RouteHit], line: int, max_lookback: int = 220) -> Optional[RouteHit]:
    lo = line - max_lookback
    best: Optional[RouteHit] = None
    for h in hits_sorted:
        if h.line > line:
            break
        if h.line >= lo:
            best = h
    return best


def assign_return_trunks(
    hits_sorted: List[RouteHit], return_lines: List[int], lines: List[str]
) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for ln in return_lines:
        h = last_route_before(hits_sorted, ln)
        if h:
            out[ln] = classify_route_reason(h.reason)
        else:
            out[ln] = classify_line_fallback(lines[ln - 1] if 0 < ln <= len(lines) else "")
    return out


def max_split_score_overlap(
    split_priority: List[Dict[str, Any]], lo: int, hi: int
) -> float:
    best = 0.0
    for b in split_priority:
        blo, bhi = int(b["startLine"]), int(b["endLine"])
        if hi < blo or lo > bhi:
            continue
        best = max(best, float(b.get("score") or 0))
    return round(best, 4)


def build_domain_map(chat_path: Path) -> Dict[str, Any]:
    audit = analyze_chat_ts(chat_path)
    raw = chat_path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    hits = collect_route_reason_hits(raw)
    hits_sorted = sorted(hits, key=lambda h: h.line)
    sites = return_sites(lines)
    ret_lines = [int(s["line"]) for s in sites]
    ret_trunk = assign_return_trunks(hits_sorted, ret_lines, lines)

    reason_counts: Dict[str, int] = {}
    for h in hits:
        reason_counts[h.reason] = reason_counts.get(h.reason, 0) + 1
    dup_set = {r for r, c in reason_counts.items() if c > 1}

    # Per-trunk: route reasons (from hits)
    trunk_rr: Dict[str, Set[str]] = {t: set() for t in TRUNKS}
    for h in hits:
        trunk_rr[classify_route_reason(h.reason)].add(h.reason)

    # Returns per trunk
    trunk_returns: Dict[str, List[int]] = {t: [] for t in TRUNKS}
    for ln, tr in ret_trunk.items():
        trunk_returns[tr].append(ln)

    # Contract / missing lines → trunk via nearest route hit line
    def trunk_for_audit_line(ln: int) -> str:
        h = last_route_before(hits_sorted, ln, 120)
        if h:
            return classify_route_reason(h.reason)
        return classify_line_fallback(lines[ln - 1] if 0 < ln <= len(lines) else "")

    missing_all: List[Tuple[int, str]] = []
    for key in (
        "missingResponsePlanCandidates",
        "missingKuCandidates",
        "missingThreadCoreCandidates",
        "missingSynapseTopCandidates",
    ):
        for item in audit.get(key) or []:
            missing_all.append((int(item["line"]), key))

    trunk_missing_count: Dict[str, int] = {t: 0 for t in TRUNKS}
    for ln, _k in missing_all:
        trunk_missing_count[trunk_for_audit_line(ln)] += 1

    trunk_dup_excess: Dict[str, int] = {t: 0 for t in TRUNKS}
    for r, c in reason_counts.items():
        if c > 1:
            trunk_dup_excess[classify_route_reason(r)] += c - 1

    suggested_files: Dict[str, str] = {
        "define": "api/src/routes/chat_refactor/define.ts",
        "scripture": "api/src/routes/chat_refactor/scriptureRoutes.ts",
        "general": "api/src/routes/chat_refactor/general.ts",
        "continuity": "api/src/routes/chat_refactor/continuity.ts",
        "support_selfdiag": "api/src/routes/chat_refactor/support_selfdiag.ts",
        "infra_wrapper": "api/src/routes/chat_parts/wrapper_observability.ts",
    }

    split_priority = audit.get("splitPriority") or []

    trunks_out: List[Dict[str, Any]] = []
    for t in TRUNKS:
        rlines = sorted(trunk_returns[t])
        rrs = sorted(trunk_rr[t])
        line_range: Optional[Dict[str, int]]
        if rlines:
            lo, hi = rlines[0], rlines[-1]
            line_range = {"startLine": lo, "endLine": hi}
        else:
            hit_lines = sorted(h.line for h in hits if classify_route_reason(h.reason) == t)
            if hit_lines:
                lo, hi = hit_lines[0], hit_lines[-1]
                line_range = {"startLine": lo, "endLine": hi}
            else:
                line_range = None

        dup_ex = trunk_dup_excess[t]
        dup_risk = min(100.0, round(dup_ex * 4.0, 2))
        miss_n = trunk_missing_count[t]
        contract_risk = min(100.0, round(miss_n * 6.0, 2))
        if line_range is not None:
            lo2, hi2 = line_range["startLine"], line_range["endLine"]
            sp_score = max_split_score_overlap(split_priority, lo2, hi2)
        else:
            sp_score = 0.0
        if not rlines and not rrs:
            sp_score = 0.0

        trunks_out.append(
            {
                "trunk": t,
                "routeReasons": rrs,
                "returnCount": len(rlines),
                "lineRange": line_range,
                "duplicateRisk": dup_risk,
                "contractRisk": contract_risk,
                "suggestedTargetFile": suggested_files[t],
                "splitPriorityScore": sp_score,
            }
        )

    recommended = sorted(
        [x["trunk"] for x in trunks_out],
        key=lambda name: (
            -next(y["splitPriorityScore"] for y in trunks_out if y["trunk"] == name),
            name,
        ),
    )

    unsafe_mixed = _unsafe_mixed_zones(lines, hits_sorted, ret_trunk, window=100)
    wrapper_crit = _wrapper_critical_zones(lines, window=70, min_hits=4)

    return {
        "version": 1,
        "cardName": "CHAT_TRUNK_DOMAIN_MAP_V1",
        "targetPath": str(chat_path).replace("\\", "/"),
        "sourceAuditVersion": audit.get("version"),
        "lineCount": audit.get("lineCount"),
        "trunks": trunks_out,
        "recommendedSplitSequence": recommended,
        "unsafeMixedZones": unsafe_mixed,
        "wrapperCriticalZones": wrapper_crit,
        "meta": {
            "classifier": "regex_routeReason_plus_line_fallback",
            "upstream": "chatts_metrics_v1.analyze_chat_ts",
        },
    }


def _trunk_at_line(
    ln: int,
    hits_sorted: List[RouteHit],
    ret_trunk: Dict[int, str],
    lines: List[str],
) -> str:
    if ln in ret_trunk:
        return ret_trunk[ln]
    h = last_route_before(hits_sorted, ln, 100)
    if h:
        return classify_route_reason(h.reason)
    return classify_line_fallback(lines[ln - 1] if 0 < ln <= len(lines) else "")


def _unsafe_mixed_zones(
    lines: List[str],
    hits_sorted: List[RouteHit],
    ret_trunk: Dict[int, str],
    window: int,
) -> List[Dict[str, Any]]:
    n = len(lines)
    if n == 0:
        return []
    zones: List[Dict[str, Any]] = []
    i = 1
    while i <= n:
        lo = i
        hi = min(n, i + window - 1)
        seen: Set[str] = set()
        for ln in range(lo, hi + 1):
            seen.add(_trunk_at_line(ln, hits_sorted, ret_trunk, lines))
        if len(seen) >= 3:
            risk = round(min(100.0, (len(seen) - 2) * 22.0 + 10.0), 2)
            zones.append(
                {
                    "startLine": lo,
                    "endLine": hi,
                    "distinctTrunks": sorted(seen),
                    "riskScore": risk,
                    "note": "sliding_window_distinct_trunks_ge_3",
                }
            )
        i += max(1, window // 2)
    return zones


def _wrapper_critical_zones(
    lines: List[str], window: int, min_hits: int
) -> List[Dict[str, Any]]:
    n = len(lines)
    out: List[Dict[str, Any]] = []
    i = 1
    while i <= n:
        lo = i
        hi = min(n, i + window - 1)
        hits = 0
        for ln in range(lo, hi + 1):
            if _LINE_INFRA.search(lines[ln - 1]):
                hits += 1
        if hits >= min_hits:
            out.append(
                {
                    "startLine": lo,
                    "endLine": hi,
                    "infraLineHits": hits,
                    "riskScore": min(100.0, round(hits * 8.0, 2)),
                    "note": "synapse_db_prepare_density",
                }
            )
        i += max(1, window // 3)
    return out


def load_schema_required() -> Set[str]:
    p = _AUTOMATION_DIR / "chatts_trunk_domain_schema_v1.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    return set(data.get("required") or [])


def validate_map(m: Dict[str, Any]) -> List[str]:
    req = load_schema_required()
    miss = [k for k in sorted(req) if k not in m]
    if miss:
        return [f"missing:{miss}"]
    trunks = m.get("trunks")
    if not isinstance(trunks, list) or len(trunks) != len(TRUNKS):
        return ["trunks_length"]
    names = {t["trunk"] for t in trunks if isinstance(t, dict)}
    if set(TRUNKS) != names:
        return ["trunk_set_mismatch"]
    return []


def repo_root_from(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(24):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def main() -> int:
    ap = argparse.ArgumentParser(description="CHAT_TRUNK_DOMAIN_MAP_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--chat-path", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--emit-report",
        action="store_true",
        help=f"Write {REPORT_JSON} under api/automation/reports/",
    )
    ap.add_argument("--check-json", action="store_true")
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    chat = args.chat_path or (root / DEFAULT_REL_CHAT)
    if not chat.is_file():
        print(json.dumps({"ok": False, "error": "chat_ts_not_found", "path": str(chat)}))
        return 2

    m = build_domain_map(chat)
    errs = validate_map(m) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / REPORT_JSON).write_text(
            json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    if args.stdout_json:
        print(json.dumps(m, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "trunks": [t["trunk"] for t in m["trunks"]],
                    "recommendedSplitSequence": m["recommendedSplitSequence"],
                    "unsafeMixedZones": len(m["unsafeMixedZones"]),
                    "wrapperCriticalZones": len(m["wrapperCriticalZones"]),
                },
                ensure_ascii=False,
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
