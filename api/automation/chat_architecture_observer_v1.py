#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CHAT_ARCHITECTURE_OBSERVER — chat.ts 周辺を読み取り専用で観測し、planner 向け JSON を出力。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

CARD = "TENMON_CHAT_ARCHITECTURE_OBSERVER_V1"
SCHEMA_VERSION = 1

# hot window 用（ヒート集計）
HOT_TERMS: List[Tuple[str, str, float]] = [
    ("threadCore", r"\bthreadCore\b", 2.0),
    ("responsePlan", r"\bresponsePlan\b", 2.0),
    ("routeReason", r"\brouteReason\b", 2.0),
    ("res\.json", r"\bres\.json\b", 1.5),
    ("router.post", r"router\.(post|get)\(", 1.5),
    ("await", r"\bawait\b", 0.15),
    ("if\s*\(", r"\bif\s*\(", 0.08),
    ("try\s*\{", r"\btry\s*\{", 0.12),
]

# duplicate_responsibility 層（同一行が複数に該当＝責務重複の粗い代理）
LAYER_PATTERNS: Dict[str, str] = {
    "surface": r"surface|Surface|preamble|personaSurface|bleed|Bleed|noise|表層",
    "route": r"routeReason|majorRoutes|router\.|threadCore|lane|レーン",
    "plan": r"responsePlan|planning|responsePlanCore|Plan",
    "finalize": r"finalize|compose|res\.json|send\(|json\(",
}

# surface bleed 系（seal / runtime audit と整合しやすい文字列）
BLEED_NOISE_LITERALS: List[str] = [
    "この問いについて、今回は",
    "一貫の手がかりは、",
    "いまの答えは、典拠は",
    "（補助）次の一手:",
    "還元として、いまの主題を一句に圧し",
]
BLEED_GENERIC: List[str] = [
    "今回は",
    "補助",
    "参考まで",
    "一般的には",
]
BLEED_HELPER_TAIL: List[str] = [
    "helper",
    "helperTail",
    "helper_tail",
    "tailString",
    "tail_string",
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_chat_path() -> Path:
    return _repo_root() / "api" / "src" / "routes" / "chat.ts"


def _line_indexed_lines(text: str) -> List[str]:
    return text.splitlines()


def _count_imports(lines: List[str]) -> int:
    n = 0
    for ln in lines:
        s = ln.strip()
        if s.startswith("import ") or s.startswith("import {"):
            n += 1
        elif s.startswith("import type "):
            n += 1
    return n


def _unique_route_reasons(text: str) -> Tuple[int, List[str]]:
    found: Set[str] = set()
    for m in re.finditer(r"routeReason\s*[:=]\s*[\"']([^\"']+)[\"']", text):
        found.add(m.group(1).strip()[:300])
    for m in re.finditer(r'"routeReason"\s*:\s*"((?:\\.|[^"\\])*)"', text):
        s = m.group(1).replace("\\n", "\n").replace('\\"', '"').strip()
        if s:
            found.add(s[:300])
    return len(found), sorted(found)[:80]


def _count_re(text: str, pat: str) -> int:
    return len(re.findall(pat, text))


def _hot_windows(lines: List[str], window: int = 120, step: int = 60, min_heat: float = 8.0) -> List[Dict[str, Any]]:
    n = len(lines)
    out: List[Dict[str, Any]] = []
    for start in range(0, max(1, n), step):
        end = min(n, start + window)
        chunk = "\n".join(lines[start:end])
        terms: List[Dict[str, Any]] = []
        heat = 0.0
        for label, pat, w in HOT_TERMS:
            c = len(re.findall(pat, chunk))
            if c:
                heat += c * w
                terms.append({"term": label, "count": c})
        if heat >= min_heat:
            out.append(
                {
                    "start_line": start + 1,
                    "end_line": end,
                    "hit_terms": terms,
                    "heat_score": round(heat, 2),
                }
            )
    out.sort(key=lambda x: -float(x.get("heat_score") or 0))
    return out[:25]


def _duplicate_responsibility(lines: List[str]) -> Dict[str, Any]:
    layer_lines: Dict[str, Set[int]] = {k: set() for k in LAYER_PATTERNS}
    for i, ln in enumerate(lines, 1):
        for layer, pat in LAYER_PATTERNS.items():
            if re.search(pat, ln):
                layer_lines[layer].add(i)
    all_lines: Set[int] = set()
    for s in layer_lines.values():
        all_lines |= s
    multi: Dict[int, List[str]] = {}
    for i in all_lines:
        hits = [L for L, s in layer_lines.items() if i in s]
        if len(hits) >= 2:
            multi[i] = hits
    pair_counts: Counter[str] = Counter()
    for layers in multi.values():
        for a in range(len(layers)):
            for b in range(a + 1, len(layers)):
                pair = "|".join(sorted([layers[a], layers[b]]))
                pair_counts[pair] += 1
    return {
        "lines_with_multiple_layers": len(multi),
        "sample_overlaps": [{"line": ln, "layers": ly} for ln, ly in list(sorted(multi.items()))[:40]],
        "layer_pair_counts": dict(pair_counts.most_common(20)),
        "per_layer_line_counts": {k: len(v) for k, v in layer_lines.items()},
    }


def _discover_trunks(chat_refactor_dir: Path) -> List[str]:
    if not chat_refactor_dir.is_dir():
        return []
    out: List[str] = []
    for p in sorted(chat_refactor_dir.glob("*trunk*.ts")):
        out.append(p.stem)
    return out


def _trunk_wiring(chat_text: str, trunks: List[str], chat_refactor_dir: Path) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    likely_unwired: List[str] = []
    for stem in trunks:
        fpath = chat_refactor_dir / f"{stem}.ts"
        exists = fpath.is_file()
        imported = bool(
            re.search(rf"from\s+[\"'][\w./-]*{re.escape(stem)}[\"']", chat_text)
            or re.search(rf"from\s+[\"']\./chat_refactor/{re.escape(stem)}[\"']", chat_text)
        )
        mentioned = stem in chat_text
        likely = bool(exists and not imported)
        if likely:
            likely_unwired.append(stem)
        rows.append(
            {
                "id": stem,
                "exists": exists,
                "imported": imported,
                "mentioned": mentioned,
                "likely_unwired": likely,
            }
        )
    return {
        "trunks": rows,
        "summary": {
            "trunk_file_count": len(trunks),
            "imported_count": sum(1 for r in rows if r["imported"]),
            "likely_unwired_ids": likely_unwired[:40],
            "likely_unwired_count": len(likely_unwired),
        },
    }


def _surface_bleed_points(lines: List[str]) -> List[Dict[str, Any]]:
    pts: List[Dict[str, Any]] = []
    for i, ln in enumerate(lines, 1):
        for term in BLEED_NOISE_LITERALS:
            if term in ln:
                pts.append(
                    {
                        "line": i,
                        "category": "noise_literal",
                        "term": term[:80],
                        "excerpt": ln.strip()[:200],
                    }
                )
        for term in BLEED_GENERIC:
            if term in ln:
                if any(p["line"] == i and p["category"] == "noise_literal" for p in pts):
                    continue
                pts.append(
                    {
                        "line": i,
                        "category": "generic_preamble",
                        "term": term,
                        "excerpt": ln.strip()[:200],
                    }
                )
        low = ln.lower()
        for term in BLEED_HELPER_TAIL:
            if term.lower() in low:
                pts.append(
                    {
                        "line": i,
                        "category": "helper_tail",
                        "term": term,
                        "excerpt": ln.strip()[:200],
                    }
                )
                break
    return pts[:500]


def build_architecture_report(
    chat_path: Path,
    repo_root: Path | None = None,
) -> Dict[str, Any]:
    repo_root = repo_root or _repo_root()
    chat_path = chat_path.resolve()
    chat_refactor = repo_root / "api" / "src" / "routes" / "chat_refactor"

    if not chat_path.is_file():
        return {
            "schema_version": SCHEMA_VERSION,
            "card": CARD,
            "generatedAt": _utc_now_iso(),
            "chat_path": str(chat_path),
            "error": "file_not_found",
            "line_count": 0,
            "import_count": 0,
            "route_reason_unique_count": 0,
            "threadCore_count": 0,
            "responsePlan_count": 0,
            "synapse_count": 0,
            "hot_windows": [],
            "duplicate_responsibility": {
                "lines_with_multiple_layers": 0,
                "sample_overlaps": [],
                "layer_pair_counts": {},
                "per_layer_line_counts": {"surface": 0, "route": 0, "plan": 0, "finalize": 0},
            },
            "trunk_wiring": {
                "trunks": [],
                "summary": {
                    "trunk_file_count": 0,
                    "imported_count": 0,
                    "likely_unwired_ids": [],
                    "likely_unwired_count": 0,
                },
            },
            "surface_bleed_points": [],
        }

    raw = chat_path.read_text(encoding="utf-8", errors="replace")
    lines = _line_indexed_lines(raw)
    line_count = len(lines) if raw else 0
    import_count = _count_imports(lines)
    urc, _rr_list = _unique_route_reasons(raw)
    thread_core = _count_re(raw, r"\bthreadCore\b")
    response_plan = _count_re(raw, r"\bresponsePlan\b")
    synapse = _count_re(raw, r"\bsynapse\b|\bSynapse\b")

    hot_windows = _hot_windows(lines)
    dup = _duplicate_responsibility(lines)
    trunks = _discover_trunks(chat_refactor)
    trunk = _trunk_wiring(raw, trunks, chat_refactor)
    bleed = _surface_bleed_points(lines)

    h = hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()[:16]

    surface_bleed_score = len(bleed)
    route_drift_score = urc + thread_core // 2

    return {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "chat_path": str(chat_path),
        "content_sha256_16": h,
        "line_count": line_count,
        "import_count": import_count,
        "route_reason_unique_count": urc,
        "threadCore_count": thread_core,
        "responsePlan_count": response_plan,
        "synapse_count": synapse,
        "hot_windows": hot_windows,
        "duplicate_responsibility": dup,
        "trunk_wiring": trunk,
        "surface_bleed_points": bleed,
        # planner / 旧 runner 互換
        "surface_bleed_score": surface_bleed_score,
        "route_drift_score": route_drift_score,
        "giant_file": line_count >= 12000,
        "signals": {
            "res_json_refs": _count_re(raw, r"res\.json"),
            "router_handlers": _count_re(raw, r"router\.(post|get)\("),
        },
    }


def write_split_outputs(out_dir: Path, report: Dict[str, Any]) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, str] = {}
    main = out_dir / "chat_architecture_report.json"
    blob = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    main.write_text(blob, encoding="utf-8")
    paths["chat_architecture_report"] = str(main)
    legacy = out_dir / "chat_architecture_observation.json"
    legacy.write_text(blob, encoding="utf-8")
    paths["chat_architecture_observation"] = str(legacy)

    hw = out_dir / "hot_windows.json"
    hw.write_text(
        json.dumps({"version": 1, "windows": report.get("hot_windows", [])}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    paths["hot_windows"] = str(hw)

    tw = out_dir / "trunk_wiring_report.json"
    tw.write_text(
        json.dumps(report.get("trunk_wiring", {}), ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    paths["trunk_wiring_report"] = str(tw)

    sb = out_dir / "surface_bleed_points.json"
    sb.write_text(
        json.dumps({"version": 1, "points": report.get("surface_bleed_points", [])}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    paths["surface_bleed_points"] = str(sb)

    ok = not report.get("error")
    fv = {
        "version": 1,
        "card": "TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1",
        "observer_pass": bool(ok),
        "line_count": report.get("line_count", 0),
        "chat_path": report.get("chat_path"),
    }
    fp = out_dir / "final_verdict.json"
    fp.write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["final_verdict"] = str(fp)
    return paths


def sample_report() -> Dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "card": CARD + "_SAMPLE",
        "generatedAt": _utc_now_iso(),
        "chat_path": "/sample/chat.ts",
        "content_sha256_16": "sample",
        "line_count": 9000,
        "import_count": 120,
        "route_reason_unique_count": 45,
        "threadCore_count": 200,
        "responsePlan_count": 80,
        "synapse_count": 5,
        "hot_windows": [
            {
                "start_line": 100,
                "end_line": 220,
                "hit_terms": [{"term": "threadCore", "count": 12}],
                "heat_score": 24.0,
            }
        ],
        "duplicate_responsibility": {
            "lines_with_multiple_layers": 30,
            "sample_overlaps": [{"line": 500, "layers": ["surface", "route"]}],
            "layer_pair_counts": {"plan|route": 5},
            "per_layer_line_counts": {"surface": 100, "route": 200, "plan": 50, "finalize": 80},
        },
        "trunk_wiring": {
            "trunks": [
                {
                    "id": "general_trunk_v1",
                    "exists": True,
                    "imported": True,
                    "mentioned": True,
                    "likely_unwired": False,
                }
            ],
            "summary": {"trunk_file_count": 1, "imported_count": 1, "likely_unwired_ids": [], "likely_unwired_count": 0},
        },
        "surface_bleed_points": [
            {"line": 42, "category": "noise_literal", "term": "stub", "excerpt": "..."}
        ],
        "surface_bleed_score": 1,
        "route_drift_score": 145,
        "giant_file": False,
        "signals": {},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--chat-path", default="")
    ap.add_argument("--repo-root", default="")
    ap.add_argument("--out-dir", default="", help="分割成果物一式を書き出し")
    ap.add_argument("--out-json", default="", help="単一 JSON（後方互換）")
    ap.add_argument("--sample", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    if args.sample:
        report = sample_report()
    else:
        root = Path(args.repo_root).resolve() if args.repo_root else _repo_root()
        chat = Path(args.chat_path).resolve() if args.chat_path else _default_chat_path()
        report = build_architecture_report(chat, root)

    if args.out_dir:
        write_split_outputs(Path(args.out_dir), report)
    if args.out_json:
        p = Path(args.out_json)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not report.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())
