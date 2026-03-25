#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_RESIDUAL_QUALITY_SCORER_CURSOR_AUTO_V1
5 軸残差採点 + 総合スコア + blocker 優先度（1〜3）+ next card 向け JSON。
採点式は tenmon_chat_ts_residual_quality_score_v1 を再利用（数値の一貫性）。
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

# 同ディレクトリの既存採点（本体ロジック単一ソース）
import tenmon_chat_ts_residual_quality_score_v1 as _rq

CARD = "TENMON_RESIDUAL_QUALITY_SCORER_V1"
SCHEMA_VERSION = 1

INTERNAL_TO_PUBLIC = {
    "surface_clean": "surface_clean_score",
    "route_authority_clean": "route_authority_score",
    "longform_quality_clean": "longform_quality_score",
    "density_lock": "density_lock_score",
    "baseline_reflection": "baseline_reflection_score",
}
# (blocker substring match, internal_axis, base_weight)
BLOCKER_AXIS_RULES: List[Tuple[str, str, float]] = [
    ("surface_noise", "surface_clean", 1.0),
    ("worldclass_surface", "surface_clean", 1.0),
    ("route_authority", "route_authority_clean", 1.0),
    ("longform_quality", "longform_quality_clean", 1.0),
    ("density_lock", "density_lock", 1.0),
    ("static_not", "density_lock", 0.85),
    ("runtime_probe", "route_authority_clean", 0.9),
    ("baseline", "baseline_reflection", 0.8),
    ("postlock", "baseline_reflection", 0.8),
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_ledger_path() -> Path:
    return _repo_api() / "automation" / "improvement_ledger_entries_v1.jsonl"


def _ledger_blocker_recurrence(jsonl: Path, tail_lines: int) -> Counter[str]:
    ctr: Counter[str] = Counter()
    if not jsonl.is_file():
        return ctr
    lines = jsonl.read_text(encoding="utf-8", errors="replace").splitlines()
    tail = lines[-tail_lines:] if len(lines) > tail_lines else lines
    for ln in tail:
        ln = ln.strip()
        if not ln:
            continue
        try:
            o = json.loads(ln)
        except Exception:
            continue
        for b in o.get("blocker_types") or []:
            if isinstance(b, str) and b:
                ctr[b] += 1
    return ctr


def _match_blocker_axis(blocker: str) -> Tuple[str, float]:
    bs = str(blocker)
    for sub, axis, w in BLOCKER_AXIS_RULES:
        if sub in bs:
            return axis, w
    return "route_authority_clean", 0.5


def _priority_blockers(
    blockers: List[str],
    internal_scores: Dict[str, int],
    recurrence: Counter[str],
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    ranked: List[Tuple[float, str, str, str]] = []
    seen = set()
    for b in blockers:
        if not isinstance(b, str) or not b.strip():
            continue
        b = b.strip()
        axis, base_w = _match_blocker_axis(b)
        sc = int(internal_scores.get(axis, 50))
        residual_gap = max(0, 100 - sc)
        rec = int(recurrence.get(b, 0))
        boost = 1.0 + min(2.0, 0.12 * rec)
        weight = base_w * residual_gap * boost
        key = b
        if key in seen:
            continue
        seen.add(key)
        ranked.append((weight, b, axis, INTERNAL_TO_PUBLIC[axis]))
    ranked.sort(key=lambda x: -x[0])
    out: List[Dict[str, Any]] = []
    for w, b, ia, pk in ranked[:top_n]:
        out.append(
            {
                "blocker": b,
                "weight": round(w, 4),
                "internal_axis": ia,
                "axis_public_key": pk,
                "recurrence_hits_in_ledger_tail": int(recurrence.get(b, 0)),
            }
        )
    return out


def _next_actions(lowest_internal: List[Tuple[str, int]]) -> List[Dict[str, Any]]:
    actions: List[Dict[str, Any]] = []
    prio = 1
    for axis, sc in lowest_internal:
        cur, vps = _rq.AXIS_CARD_PAIRS[axis]
        actions.append(
            {
                "priority": prio,
                "internal_axis": axis,
                "axis_public_key": INTERNAL_TO_PUBLIC[axis],
                "score": sc,
                "cursor_card": cur,
                "vps_card": vps,
                "residual_stub": _rq.STUB_BY_AXIS.get(axis, ""),
            }
        )
        prio += 1
    return actions


def score_bundle(
    seal: Path,
    wc_override: Path | None,
    ledger_path: Path | None,
    ledger_tail: int,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, int]]:
    seal = seal.resolve()
    wc_path = wc_override if wc_override else (seal / "worldclass_report.json")
    final = _read_json(seal / "final_verdict.json")
    wc = _read_json(wc_path)
    surface = _read_json(seal / "surface_audit.json")
    route_audit = _read_json(seal / "route_authority_audit.json")
    lf_audit = _read_json(seal / "longform_audit.json")
    runtime = _read_json(seal / "runtime_matrix.json")
    density = _read_json(seal / "density_lock_verdict.json")

    s1, d1 = _rq.score_surface_clean(final, surface)
    s2, d2 = _rq.score_route_authority(final, route_audit, runtime)
    s3, d3 = _rq.score_longform_quality(final, lf_audit, runtime)
    s4, d4 = _rq.score_density_lock(final, density, wc)
    s5, d5 = _rq.score_baseline_reflection(wc)

    internal_list = [
        ("surface_clean", s1),
        ("route_authority_clean", s2),
        ("longform_quality_clean", s3),
        ("density_lock", s4),
        ("baseline_reflection", s5),
    ]
    internal_scores = {k: v for k, v in internal_list}

    jp = ledger_path if ledger_path else _default_ledger_path()
    rec = _ledger_blocker_recurrence(jp, ledger_tail)
    blockers = list(final.get("blockers") or [])
    if not isinstance(blockers, list):
        blockers = []

    # 再発が強い軸へ微調整した重み（ledger の blocker が軸にマップできる場合）
    axis_boost: Dict[str, float] = {k: 1.0 for k in internal_scores}
    for b, cnt in rec.items():
        ia, _ = _match_blocker_axis(b)
        axis_boost[ia] += min(0.15 * cnt, 0.45)

    wsum = sum(axis_boost.values())
    norm = {k: axis_boost[k] / wsum for k in axis_boost}
    overall = sum(internal_scores[k] * norm[k] for k in internal_scores)
    overall = round(overall, 4)

    details = {
        "surface_clean": d1,
        "route_authority_clean": d2,
        "longform_quality_clean": d3,
        "density_lock": d4,
        "baseline_reflection": d5,
    }
    axes_out: Dict[str, Any] = {}
    for ik, sc in internal_list:
        pk = INTERNAL_TO_PUBLIC[ik]
        axes_out[pk] = {"score": sc, "detail": details[ik]}

    lowest = _rq.pick_lowest_axes(internal_list, 3)
    lowest_pub = [
        {"public_key": INTERNAL_TO_PUBLIC[a], "internal_axis": a, "score": sc} for a, sc in lowest
    ]

    score_doc: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "axes": axes_out,
        "overall_residual_score": overall,
        "axis_weights": {INTERNAL_TO_PUBLIC[k]: round(norm[k], 6) for k in norm},
        "inputs_used": {
            "worldclass_report": wc_path.is_file(),
            "final_verdict": (seal / "final_verdict.json").is_file(),
            "ledger_jsonl": str(jp),
            "ledger_tail_parsed": ledger_tail,
        },
        "five_family_probes": _rq._five_family_status(runtime),
        "lowest_scored_axes": lowest_pub,
    }

    prio_top = _priority_blockers(blockers, internal_scores, rec, 3)
    priority_doc: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "blocker_priority_top3": prio_top,
        "lowest_scored_axes": lowest_pub,
        "next_actions": _next_actions(lowest),
        "blockers_all": blockers,
        "ledger_recurrence_top": rec.most_common(8),
    }
    return score_doc, priority_doc, internal_scores


def _demo_inputs() -> Path:
    """最小サンプル用の一時ディレクトリに seal 相当 JSON を書く。"""
    import tempfile

    tmp = Path(tempfile.mkdtemp(prefix="tenmon_residual_demo_"))
    final = {
        "version": 1,
        "chat_ts_static_100": True,
        "chat_ts_runtime_100": True,
        "surface_clean": False,
        "route_authority_clean": True,
        "longform_quality_clean": True,
        "density_lock": True,
        "chat_ts_overall_100": False,
        "blockers": ["surface_noise_remaining", "longform_quality_not_clean"],
    }
    (tmp / "final_verdict.json").write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    (tmp / "surface_audit.json").write_text(
        json.dumps(
            {
                "general_1": {"ok": True, "noise_hits": ["stub"]},
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (tmp / "route_authority_audit.json").write_text(json.dumps({"flags": {}}, indent=2), encoding="utf-8")
    (tmp / "longform_audit.json").write_text(
        json.dumps(
            {
                "longform_1": {
                    "response_len": 1200,
                    "has_mitate": True,
                    "has_tenkai": False,
                    "has_rakuchi": True,
                    "looks_system_diagnosis_short": False,
                }
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (tmp / "density_lock_verdict.json").write_text(
        json.dumps(
            {"density_lock": True, "density_lock_reasons": [], "advisory_warnings": []},
            indent=2,
        ),
        encoding="utf-8",
    )
    (tmp / "worldclass_report.json").write_text(
        json.dumps(
            {
                "verdict": {
                    "chat_ts_static_100": True,
                    "surface_clean": False,
                    "density_lock": True,
                },
                "static": {
                    "synapse_count": 10,
                    "seed_count": 5,
                    "res_json_reassign_count": 1,
                    "orig_json_bind_count": 1,
                    "helper_tail_string_count": 0,
                    "natural_general_hit_count": 2,
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (tmp / "runtime_matrix.json").write_text(
        json.dumps(
            {
                "general_1": {"ok": True, "body": '{"routeReason":"OK_V1"}'},
                "compare_1": {"ok": True, "body": '{"routeReason":"OK_V1"}'},
                "selfaware_1": {"ok": True, "body": '{"routeReason":"OK_V1"}'},
                "scripture_1": {"ok": True, "body": '{"routeReason":"OK_V1"}'},
                "longform_1": {"ok": True, "body": '{"routeReason":"OK_V1"}'},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return tmp


def cmd_score(ns: argparse.Namespace) -> int:
    seal = Path(ns.seal_dir).resolve()
    wc = Path(ns.worldclass_report).resolve() if ns.worldclass_report else None
    ledger = Path(ns.ledger_jsonl).resolve() if ns.ledger_jsonl else None
    out = Path(ns.out_dir).resolve() if ns.out_dir else (seal / "_residual_quality_scorer_v1")
    out.mkdir(parents=True, exist_ok=True)

    score_doc, priority_doc, _ = score_bundle(seal, wc, ledger, int(ns.ledger_tail))

    (out / "residual_quality_score.json").write_text(
        json.dumps(score_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out / "residual_priority_result.json").write_text(
        json.dumps(priority_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    fv = {
        "version": 1,
        "card": "TENMON_RESIDUAL_QUALITY_SCORER_V1",
        "residual_scorer_pass": True,
        "overall_residual_score": score_doc.get("overall_residual_score"),
        "lowest_axis": (score_doc.get("lowest_scored_axes") or [{}])[0].get("public_key"),
        "chat_ts_overall_100": bool(_read_json(seal / "final_verdict.json").get("chat_ts_overall_100")),
    }
    (out / "final_verdict.json").write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if ns.stdout_json:
        print(json.dumps({"score_path": str(out / "residual_quality_score.json")}, ensure_ascii=False, indent=2))
    return 0


def cmd_demo(ns: argparse.Namespace) -> int:
    tmp = _demo_inputs()
    try:
        ns.seal_dir = str(tmp)
        ns.out_dir = ns.out_dir or str(tmp / "out")
        ns.worldclass_report = ""
        ns.ledger_jsonl = ""
        return cmd_score(ns)
    finally:
        import shutil

        shutil.rmtree(tmp, ignore_errors=True)


def main(argv: List[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("score", help="seal ディレクトリから採点・優先度 JSON を出力")
    p.add_argument("--seal-dir", required=True)
    p.add_argument("--worldclass-report", default="", help="既定: <seal>/worldclass_report.json")
    p.add_argument("--ledger-jsonl", default="", help="既定: improvement_ledger_entries_v1.jsonl")
    p.add_argument("--ledger-tail", type=int, default=60)
    p.add_argument("--out-dir", default="")
    p.add_argument("--stdout-json", action="store_true")
    p.set_defaults(func=cmd_score)

    d = sub.add_parser("demo", help="サンプル入力で score を実行（stdout に結果パス）")
    d.add_argument("--out-dir", default="")
    d.add_argument("--ledger-tail", type=int, default=60)
    d.add_argument("--stdout-json", action="store_true")
    d.set_defaults(func=cmd_demo)

    ns = ap.parse_args(argv)
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
