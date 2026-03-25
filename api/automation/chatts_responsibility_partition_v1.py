#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_RESPONSIBILITY_PARTITION_V1 — chat.ts 責務を静的に分割ラベル付けし、
line range / routeReason 群 / res.json・reply・wrapper 関与 / import 関連 / 契約トークン密度を JSON+MD で出力。

観測のみ（chat.ts は変更しない）。VPS の duplicate map があれば参照してマージメタを付与。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, DefaultDict, Dict, List, Optional, Set, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from chatts_metrics_v1 import RouteHit, collect_route_reason_hits

CARD = "CHAT_TS_RESPONSIBILITY_PARTITION_V1"
VERSION = 1
DEFAULT_REL = "api/src/routes/chat.ts"
LOG_DUP_GLOB = Path("/var/log/tenmon/card_TENMON_CHAT_TS_DUPLICATE_RESPONSIBILITY_MAP_V1")

# 優先度が高いほど先に評価（最初にマッチした 1 責務を primary とする）
BUCKET_ORDER: Tuple[str, ...] = (
    "grounded_hybrid_dispatch",
    "learning_sideeffects",
    "seed_synapse_memory",
    "surface_exit",
    "general_route",
    "continuity_route",
    "define_route",
    "scripture_route",
    "support_selfaware_route",
    "explicit_char_longform",
    "other",
)

BUCKET_PATTERNS: Dict[str, Tuple[re.Pattern, ...]] = {
    "grounded_hybrid_dispatch": (
        re.compile(r"\bGROUNDED\b|kokuzo_pages|smoke-hybrid|HYBRID_|pdfPage|groundedSource|doc\s*="),
    ),
    "learning_sideeffects": (
        re.compile(
            r"memoryPersistMessage|scriptureLearningLedger|kanagiGrowthLedger|threadCenterMemory|"
            r"writeSynapseLogV1|persistThreadCenter|insertSynapse|ark_thread"
        ),
    ),
    "seed_synapse_memory": (
        re.compile(r"ark_thread_seeds|thread_seeds|seedUsage|synapse_log|synapseTop"),
    ),
    "surface_exit": (
        re.compile(
            r"localSurfaceize|responseProjector|cleanLlmFrameV1|__cleanLlmFrame|tenmonConversationSurface|"
            r"applyRuntimeSurface|finalize|rewriteUsed|rewriteDelta|normalizeDisplayLabel"
        ),
    ),
    "general_route": (
        re.compile(
            r"NATURAL_GENERAL_LLM_TOP|__tenmonGeneralGate|tenmonGeneralGate|GENERAL_LLM|"
            r"conversational\s+general|shrinkGeneral|generalFallback"
        ),
    ),
    "continuity_route": (
        re.compile(
            r"threadCore|threadCenter|continuity|next_step|ESSENCE_FOLLOWUP|NEXTSTEP|CONTINUITY|"
            r"followup|carryMode|buildThreadCore|threadCoreLinkSurface|CarryProjection"
        ),
    ),
    "define_route": (
        re.compile(
            r"DEF_FASTPATH|SUBCONCEPT_CANON|CONCEPT_CANON|define_trunk|define_|FASTPATH_VERIFIED"
        ),
    ),
    "scripture_route": (
        re.compile(
            r"TENMON_SCRIPTURE|SCRIPTURE_|scripture_trunk|KATAKAMUNA_CANON|SCRIPTURE_LOCAL"
        ),
    ),
    "support_selfaware_route": (
        re.compile(
            r"SUPPORT_|KANAGI|SELFAWARE|selfdiag|support_selfdiag|N2_KANAGI|consciousness"
        ),
    ),
    "explicit_char_longform": (
        re.compile(r"LONGFORM|EXPLICIT_CHAR|8k|3000字|longform"),
    ),
}

TOKEN_COUNTS = ("threadCore", "threadCenter", "responsePlan", "meaningFrame", "decisionFrame")

RE_RES_JSON = re.compile(r"\bres\.json\s*\(")
RE_RETURN_RES_JSON = re.compile(r"\breturn\s+res\.json\s*\(")
RE_REPLY_DEF = re.compile(r"\bconst\s+__reply\s*=")
RE_REPLY_USE = re.compile(r"\b__reply\s*\(")
RE_WRAPPER_GATE = re.compile(r"__tenmonGeneralGate|infra_wrapper|tenmonGeneralGateCore")
RE_IMPORT = re.compile(r"^import\s+(?:type\s+)?(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+['\"]([^'\"]+)['\"]")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _rel_under_repo(p: Path, repo: Path) -> str:
    try:
        return str(p.resolve().relative_to(repo.resolve()))
    except ValueError:
        return str(p)


def primary_bucket_for_line(line: str) -> str:
    for b in BUCKET_ORDER:
        if b == "other":
            return "other"
        for pat in BUCKET_PATTERNS.get(b, ()):
            if pat.search(line):
                return b
    return "other"


def merge_ranges(lines: Set[int]) -> List[Tuple[int, int]]:
    if not lines:
        return []
    s = sorted(lines)
    out: List[Tuple[int, int]] = []
    a = b = s[0]
    for x in s[1:]:
        if x == b + 1:
            b = x
        else:
            out.append((a, b))
            a = b = x
    out.append((a, b))
    return out


def classify_file(lines: List[str]) -> Dict[str, Set[int]]:
    by_bucket: Dict[str, Set[int]] = {b: set() for b in BUCKET_ORDER}
    for i, ln in enumerate(lines, start=1):
        code = ln.split("//", 1)[0] if "//" in ln else ln
        b = primary_bucket_for_line(code)
        by_bucket[b].add(i)
    return by_bucket


def hits_in_bucket(hits: List[RouteHit], line_set: Set[int]) -> List[RouteHit]:
    return [h for h in hits if h.line in line_set]


def count_lines_matching(lines: List[str], line_nums: Set[int], pattern: re.Pattern) -> int:
    n = 0
    for i in line_nums:
        if 0 < i <= len(lines) and pattern.search(lines[i - 1]):
            n += 1
    return n


def load_optional_duplicate_map() -> Optional[Dict[str, Any]]:
    if not LOG_DUP_GLOB.is_dir():
        return None
    candidates = sorted(
        [p for p in LOG_DUP_GLOB.iterdir() if p.is_dir()],
        key=lambda p: p.name,
        reverse=True,
    )
    for d in candidates[:5]:
        for name in ("summary.json", "duplicate_responsibility_map.json"):
            p = d / name
            if p.is_file():
                try:
                    return json.loads(p.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
    return None


def import_bucket_hint(path: str) -> str:
    p = path.replace("\\", "/").lower()
    if "ground" in p or "hybrid" in p or "kokuzo" in p:
        return "grounded_hybrid_dispatch"
    if "surface" in p or "project" in p or "finalize" in p:
        return "surface_exit"
    if "continuity" in p or "threadcore" in p or "carry" in p:
        return "continuity_route"
    if "scripture" in p or "canon" in p:
        return "scripture_route"
    if "define" in p:
        return "define_route"
    if "support" in p or "kanagi" in p or "self" in p:
        return "support_selfaware_route"
    if "general" in p:
        return "general_route"
    return "other"


def analyze_imports(lines: List[str]) -> Tuple[int, Dict[str, int]]:
    total = 0
    by_b: DefaultDict[str, int] = defaultdict(int)
    for ln in lines[:500]:
        s = ln.strip()
        if not (s.startswith("import ") or s.startswith("import type ")):
            continue
        m = RE_IMPORT.match(s)
        total += 1
        if m:
            by_b[import_bucket_hint(m.group(1))] += 1
        else:
            by_b["other"] += 1
    return total, dict(by_b)


def route_family_for_reason(rr: str) -> str:
    if "NATURAL_GENERAL" in rr or "GENERAL" in rr:
        return "general"
    if "CONTINUITY" in rr or "NEXTSTEP" in rr or "ESSENCE" in rr or "COMPARE" in rr:
        return "continuity"
    if "DEF_" in rr or "SUBCONCEPT" in rr or "FASTPATH" in rr:
        return "define"
    if "SCRIPTURE" in rr or "KATAKAMUNA" in rr or "CANON" in rr:
        return "scripture"
    if "SUPPORT" in rr or "KANAGI" in rr or "JUDGEMENT" in rr:
        return "support"
    if "SELFAWARE" in rr or "CONSCIOUS" in rr:
        return "selfaware"
    if "EXPLICIT" in rr or "LONGFORM" in rr:
        return "explicit"
    if "GROUNDED" in rr or "HYBRID" in rr:
        return "hybrid_grounded"
    return "other"


def build_report(chat_path: Path, repo_root: Path) -> Dict[str, Any]:
    text = chat_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    n = len(lines)
    by_bucket = classify_file(lines)
    route_hits = collect_route_reason_hits(text)

    natural_general_count = len(
        [h for h in route_hits if "NATURAL_GENERAL" in h.reason or h.reason == "NATURAL_GENERAL_LLM_TOP"]
    )
    orig_json_bind_count = len(re.findall(r"\b(?:const|let)\s+\w+\s*=\s*res\.json\s*\(", text))
    reply_def = len(RE_REPLY_DEF.findall(text))

    global_res_json = len(RE_RES_JSON.findall(text))
    global_return_res = len(RE_RETURN_RES_JSON.findall(text))
    global_reply_use = len(RE_REPLY_USE.findall(text))
    global_wrapper = len(RE_WRAPPER_GATE.findall(text))

    imp_n, imp_by = analyze_imports(lines)

    buckets_out: Dict[str, Any] = {}
    for b in BUCKET_ORDER:
        ls = by_bucket.get(b) or set()
        ranges = merge_ranges(ls)
        rh = hits_in_bucket(route_hits, ls)
        rr_unique = sorted({h.reason for h in rh})
        line_sample = list(ls)[:8]

        tok = {t: sum(1 for i in ls if i <= n and t in lines[i - 1]) for t in TOKEN_COUNTS}

        buckets_out[b] = {
            "lineCount": len(ls),
            "lineRanges": [{"start": a, "end": b2, "span": b2 - a + 1} for a, b2 in ranges[:40]],
            "lineRangesTruncated": len(ranges) > 40,
            "routeReasonHits": len(rh),
            "routeReasonUnique": rr_unique[:200],
            "routeReasonUniqueCount": len(rr_unique),
            "resJsonLineHits": count_lines_matching(lines, ls, RE_RES_JSON),
            "returnResJsonLineHits": count_lines_matching(lines, ls, RE_RETURN_RES_JSON),
            "replyUseLineHits": count_lines_matching(lines, ls, RE_REPLY_USE),
            "wrapperGateLineHits": count_lines_matching(lines, ls, RE_WRAPPER_GATE),
            "tokenHitsInLines": tok,
            "sampleLines": line_sample,
        }

    family_density: DefaultDict[str, int] = defaultdict(int)
    for h in route_hits:
        family_density[route_family_for_reason(h.reason)] += 1
    # 静的ラベル系を合成
    family_density["surface_exit"] = buckets_out["surface_exit"]["lineCount"]
    family_density["learning_sideeffects"] = buckets_out["learning_sideeffects"]["lineCount"]

    hot_seeds = (9761, 9801, 9961)
    hot_windows = []
    for center in hot_seeds:
        lo, hi = max(1, center - 40), min(n, center + 40)
        sub = lines[lo - 1 : hi]
        hot_windows.append(
            {
                "label": f"L{center - 40}-L{center + 40}",
                "startLine": lo,
                "endLine": hi,
                "nonEmptyLines": sum(1 for x in sub if x.strip()),
                "routeReasonHitsInWindow": sum(
                    1 for h in route_hits if lo <= h.line <= hi
                ),
                "resJsonInWindow": sum(1 for i in range(lo, hi + 1) if RE_RES_JSON.search(lines[i - 1])),
            }
        )

    dup_meta = load_optional_duplicate_map()

    return {
        "version": VERSION,
        "cardName": CARD,
        "generatedAt": _utc_now_iso(),
        "chatRelative": _rel_under_repo(chat_path, repo_root),
        "lineCount": n,
        "global": {
            "naturalGeneralRelatedRouteHits": natural_general_count,
            "origJsonBindCount": orig_json_bind_count,
            "replyDefinitionCount": reply_def,
            "resJsonCallCount": global_res_json,
            "returnResJsonCount": global_return_res,
            "replyUseCount": global_reply_use,
            "wrapperGateOccurrences": global_wrapper,
            "importLineCount": imp_n,
            "importLinesByBucketHint": imp_by,
            "routeReasonUniqueTotal": len({h.reason for h in route_hits}),
        },
        "buckets": buckets_out,
        "routeFamilyDensity": dict(sorted(family_density.items(), key=lambda x: (-x[1], x[0]))),
        "hotWindowsTop3": hot_windows,
        "duplicateMapLog": {
            "expectedPath": str(LOG_DUP_GLOB),
            "loaded": dup_meta is not None,
            "summaryKeys": list(dup_meta.keys())[:30] if isinstance(dup_meta, dict) else None,
        },
        "notes": [
            "primary bucket は行ごとに BUCKET_ORDER の先勝ち（1 行 1 責務ラベル）。",
            "VPS の duplicate_responsibility_map は参照のみ（無ければ loaded=false）。",
        ],
    }


def emit_markdown(rep: Dict[str, Any]) -> str:
    g = rep.get("global") or {}
    lines = [
        f"# {rep.get('cardName')}",
        "",
        f"- generatedAt: `{rep.get('generatedAt')}`",
        f"- lineCount: **{rep.get('lineCount')}**",
        "",
        "## Global",
        f"- naturalGeneralRelatedRouteHits: {g.get('naturalGeneralRelatedRouteHits')}",
        f"- origJsonBindCount: {g.get('origJsonBindCount')}",
        f"- replyDefinitionCount: {g.get('replyDefinitionCount')}",
        f"- resJsonCallCount: {g.get('resJsonCallCount')}",
        "",
        "## Route family density",
        "",
        "```json",
        json.dumps(rep.get("routeFamilyDensity"), ensure_ascii=False, indent=2),
        "```",
        "",
        "## Buckets (line ranges truncated in table)",
        "",
        "| bucket | lines | ranges(n) | routeReasonHits |",
        "|--------|------:|----------:|----------------:|",
    ]
    for name, b in (rep.get("buckets") or {}).items():
        if not isinstance(b, dict):
            continue
        rc = len(b.get("lineRanges") or [])
        lines.append(
            f"| {name} | {b.get('lineCount')} | {rc} | {b.get('routeReasonHits')} |"
        )
    lines.append("")
    lines.append("## Hot windows")
    for w in rep.get("hotWindowsTop3") or []:
        lines.append(f"- **{w.get('label')}**: routeHits={w.get('routeReasonHitsInWindow')} resJson={w.get('resJsonInWindow')}")
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--chat", default=DEFAULT_REL)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    args = ap.parse_args()

    root = args.repo_root
    if root is None:
        from repo_resolve_v1 import repo_root_from

        root = repo_root_from(_AUTOMATION_DIR)
    root = root.resolve()
    chat = (root / args.chat).resolve()
    if not chat.is_file():
        print(json.dumps({"ok": False, "error": "chat_missing", "path": str(chat)}))
        return 1

    rep = build_report(chat, root)

    if args.emit_report:
        out_dir = root / "api" / "automation" / "reports"
        jpath = out_dir / "chatts_responsibility_partition_v1.json"
        mpath = out_dir / "chatts_responsibility_partition_v1.md"
        _atomic_write(jpath, json.dumps(rep, ensure_ascii=False, indent=2) + "\n")
        _atomic_write(mpath, emit_markdown(rep))

    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    elif not args.emit_report:
        print(json.dumps({"ok": True, "lineCount": rep.get("lineCount"), "hint": "--stdout-json"}, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
