#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_RESIDUAL_IMPROVEMENT_CURSOR_AUTO_V1
残差品質を 5 軸で採点し、最低 1〜3 軸を focused 次カードへマッピング（本体ロジックは変更しない）。
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_CHAT_TS_RESIDUAL_QUALITY_SCORE_V1"
VERSION = 1

FIVE_FAMILY = ("general_1", "compare_1", "selfaware_1", "scripture_1", "longform_1")

STUB_BY_AXIS: Dict[str, str] = {
    "surface_clean": "CHAT_TS_RESIDUAL_FOCUSED_SURFACE_AUTO_V1.md",
    "route_authority_clean": "CHAT_TS_RESIDUAL_FOCUSED_ROUTE_AUTO_V1.md",
    "longform_quality_clean": "CHAT_TS_RESIDUAL_FOCUSED_LONGFORM_AUTO_V1.md",
    "density_lock": "CHAT_TS_RESIDUAL_FOCUSED_DENSITY_AUTO_V1.md",
    "baseline_reflection": "CHAT_TS_RESIDUAL_FOCUSED_BASELINE_AUTO_V1.md",
}

AXIS_CARD_PAIRS: Dict[str, Tuple[str, str]] = {
    "surface_clean": (
        "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1",
    ),
    "route_authority_clean": (
        "CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2",
        "CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2",
    ),
    "longform_quality_clean": (
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_VPS_V1",
    ),
    "density_lock": (
        "CHAT_TS_STAGE5_WORLDCLASS_SEAL_AND_BASELINE_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE5_WORLDCLASS_SEAL_VPS_V1",
    ),
    "baseline_reflection": (
        "CHAT_TS_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1",
        "CHAT_TS_POSTLOCK_MAINTENANCE_VPS_V1",
    ),
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _extract_rr_from_runtime_row(row: Dict[str, Any]) -> str | None:
    if not row.get("ok") or not isinstance(row.get("body"), str):
        return None
    body = row["body"]
    m = re.findall(r'"routeReason"\s*:\s*"([^"]+)"', body)
    return m[0] if m else None


def _five_family_status(runtime: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for name in FIVE_FAMILY:
        row = runtime.get(name)
        if not isinstance(row, dict):
            out[name] = {"ok": False, "error": "missing_row"}
            continue
        ok = bool(row.get("ok"))
        rr = _extract_rr_from_runtime_row(row) if ok else None
        note = ""
        if ok and name in ("compare_1", "longform_1") and rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1":
            note = "possible_route_misroute"
        if ok and name == "general_1" and rr in ("DEF_FASTPATH_VERIFIED_V1", "AI_CONSCIOUSNESS_LOCK_V1"):
            note = "possible_define_lock_misroute"
        if ok and name == "longform_1" and rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1":
            note = "longform_diagnosis_absorption"
        out[name] = {"ok": ok, "routeReason": rr, "note": note or None}
    return out


def _surface_metrics(surface: Dict[str, Any]) -> Tuple[int, int]:
    noise_probes = 0
    noise_total = 0
    if isinstance(surface, dict):
        for _k, row in surface.items():
            if not isinstance(row, dict) or not row.get("ok"):
                continue
            hits = row.get("noise_hits") or []
            if hits:
                noise_probes += 1
                noise_total += len(hits)
    return noise_probes, noise_total


def score_surface_clean(final: Dict[str, Any], surface: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    fc = bool(final.get("surface_clean"))
    np, nt = _surface_metrics(surface)
    score = 100
    detail: Dict[str, Any] = {
        "final_surface_clean": fc,
        "noise_probes": np,
        "noise_hit_total": nt,
    }
    if not fc:
        score -= 42
    score -= min(36, np * 9)
    score -= min(22, nt * 2)
    return max(0, min(100, score)), detail


def score_route_authority(
    final: Dict[str, Any], route_audit: Dict[str, Any], runtime: Dict[str, Any]
) -> Tuple[int, Dict[str, Any]]:
    fc = bool(final.get("route_authority_clean"))
    flags = route_audit.get("flags") if isinstance(route_audit.get("flags"), dict) else {}
    active_flags = [k for k, v in flags.items() if v]
    penalty = 0
    ff = _five_family_status(runtime)
    for name in FIVE_FAMILY:
        r = ff.get(name) or {}
        if not r.get("ok"):
            penalty += 6
            continue
        rr = r.get("routeReason")
        if rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1" and name in ("compare_1", "longform_1", "selfaware_1", "scripture_1"):
            penalty += 18
        if name == "general_1" and rr in ("DEF_FASTPATH_VERIFIED_V1",):
            penalty += 10
    detail = {
        "final_route_authority_clean": fc,
        "route_audit_flags_true": active_flags,
        "five_family_penalty": penalty,
    }
    score = 100
    if not fc:
        score -= 38
    score -= min(30, len(active_flags) * 15)
    score -= min(28, penalty)
    return max(0, min(100, score)), detail


def score_longform_quality(
    final: Dict[str, Any], lf_audit: Dict[str, Any], runtime: Dict[str, Any]
) -> Tuple[int, Dict[str, Any]]:
    fc = bool(final.get("longform_quality_clean"))
    lf1 = lf_audit.get("longform_1") if isinstance(lf_audit.get("longform_1"), dict) else {}
    ln = int(lf1.get("response_len") or 0)
    three = bool(lf1.get("has_mitate") and lf1.get("has_tenkai") and lf1.get("has_rakuchi"))
    bad_diag = bool(lf1.get("looks_system_diagnosis_short"))
    score = 100
    if not fc:
        score -= 35
    if bad_diag:
        score -= 30
    if ln < 900:
        score -= min(40, 900 - ln // 25)
    if not three and ln < 1400:
        score -= 20
    detail = {
        "final_longform_quality_clean": fc,
        "response_len": ln,
        "three_arc": three,
        "looks_system_diagnosis_short": bad_diag,
    }
    return max(0, min(100, score)), detail


def score_density_lock(
    final: Dict[str, Any], density_payload: Dict[str, Any], wc: Dict[str, Any]
) -> Tuple[int, Dict[str, Any]]:
    fc_final = bool(final.get("density_lock"))
    fc_rep = bool((wc.get("verdict") or {}).get("density_lock"))
    dc = bool(density_payload.get("density_lock"))
    reasons = density_payload.get("density_lock_reasons") or []
    advisory = density_payload.get("advisory_warnings") or []
    st = wc.get("static") or {}
    syn = int(st.get("synapse_count") or 0)
    seed = int(st.get("seed_count") or 0)
    score = 100
    if not (fc_final and fc_rep and dc):
        score -= 40
    score -= min(25, len(reasons) * 12)
    score -= min(15, len(advisory) * 5)
    if syn > 70:
        score -= min(20, (syn - 70) // 2)
    if seed > 35:
        score -= min(20, (seed - 35) // 2)
    detail = {
        "final_density_lock": fc_final,
        "report_density_lock": fc_rep,
        "density_file_lock": dc,
        "synapse_count": syn,
        "seed_count": seed,
    }
    return max(0, min(100, score)), detail


def score_baseline_reflection(wc: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    v = wc.get("verdict") or {}
    st = wc.get("static") or {}
    score = 100
    if not v.get("chat_ts_static_100"):
        score -= 28
    if st.get("res_json_reassign_count") not in (None, 1):
        score -= 22
    if st.get("orig_json_bind_count") not in (None, 1):
        score -= 12
    if int(st.get("helper_tail_string_count") or 0) > 0:
        score -= 25
    if int(st.get("natural_general_hit_count") or 0) >= 10:
        score -= 15
    detail = {
        "chat_ts_static_100": bool(v.get("chat_ts_static_100")),
        "res_json_reassign_count": st.get("res_json_reassign_count"),
        "helper_tail_string_count": st.get("helper_tail_string_count"),
    }
    return max(0, min(100, score)), detail


def pick_lowest_axes(
    scored: List[Tuple[str, int]], limit: int = 3
) -> List[Tuple[str, int]]:
    if not scored:
        return []
    scored_sorted = sorted(scored, key=lambda x: (x[1], x[0]))
    lowest_score = scored_sorted[0][1]
    same = [x for x in scored_sorted if x[1] == lowest_score]
    out = same[:limit]
    if len(out) >= limit:
        return out
    seen = {a for a, _ in out}
    for axis, sc in scored_sorted:
        if axis in seen:
            continue
        out.append((axis, sc))
        seen.add(axis)
        if len(out) >= limit:
            break
    return out


def write_focused_stub(
    gen_dir: Path,
    axis: str,
    score: int,
    cursor_card: str,
    vps_card: str,
    residual_path: str,
) -> None:
    fname = STUB_BY_AXIS.get(axis, "CHAT_TS_RESIDUAL_FOCUSED_BASELINE_AUTO_V1.md")
    path = gen_dir / fname
    body = "\n".join(
        [
            f"# {fname.replace('.md', '')}",
            "",
            f"> **CHAT_TS_RESIDUAL_IMPROVEMENT** — 自動生成スタブ（軸: `{axis}`）",
            f"> 残差スコア: **{score}** / 100",
            f"> 参照: `{residual_path}`",
            "",
            "## 委譲（1 カード 1 主題）",
            "",
            f"- **実装 Cursor カード**: `{cursor_card}`",
            f"- **検証 VPS カード**: `{vps_card}`",
            "",
            "## 方針",
            "",
            "- 大規模本体一括改修は禁止。最小 diff のみ。",
            "- 構造品質（主命題・展開・着地・route 主権）を **表面ノイズ除去だけでごまかさない**。",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--mirror-artifacts", action="store_true", help="seal の audit JSON を out-dir に複製")
    ap.add_argument("--write-stubs", action="store_true", help="focused スタブ md を generated_cursor_apply に生成")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_residual_improvement")
    out.mkdir(parents=True, exist_ok=True)

    final = _read_json(seal / "final_verdict.json")
    wc = _read_json(seal / "worldclass_report.json")
    surface = _read_json(seal / "surface_audit.json")
    route_audit = _read_json(seal / "route_authority_audit.json")
    lf_audit = _read_json(seal / "longform_audit.json")
    runtime = _read_json(seal / "runtime_matrix.json")
    density_path = seal / "density_lock_verdict.json"
    density = _read_json(density_path)

    s1, d1 = score_surface_clean(final, surface)
    s2, d2 = score_route_authority(final, route_audit, runtime)
    s3, d3 = score_longform_quality(final, lf_audit, runtime)
    s4, d4 = score_density_lock(final, density, wc)
    s5, d5 = score_baseline_reflection(wc)

    axes_scores = [
        ("surface_clean", s1),
        ("route_authority_clean", s2),
        ("longform_quality_clean", s3),
        ("density_lock", s4),
        ("baseline_reflection", s5),
    ]
    lowest = pick_lowest_axes(axes_scores, 3)

    five_family = _five_family_status(runtime)

    residual = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "axes": {
            "surface_clean": {"score": s1, "detail": d1},
            "route_authority_clean": {"score": s2, "detail": d2},
            "longform_quality_clean": {"score": s3, "detail": d3},
            "density_lock": {"score": s4, "detail": d4},
            "baseline_reflection": {"score": s5, "detail": d5},
        },
        "five_family_probes": five_family,
        "lowest_axes": [{"axis": a, "score": sc} for a, sc in lowest],
    }
    (out / "residual_quality_score.json").write_text(
        json.dumps(residual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    manifest_actions: List[Dict[str, Any]] = []
    prio = 1
    for axis, sc in lowest:
        cur, vps = AXIS_CARD_PAIRS[axis]
        manifest_actions.append(
            {
                "priority": prio,
                "axis": axis,
                "score": sc,
                "cursor_card": cur,
                "vps_card": vps,
                "residual_stub": STUB_BY_AXIS.get(axis, ""),
            }
        )
        prio += 1

    manifest = {
        "version": VERSION,
        "card": "CHAT_TS_RESIDUAL_IMPROVEMENT_V1",
        "generatedAt": _utc_now_iso(),
        "focused_actions": manifest_actions,
        "artifact_paths": {
            "residual_quality_score": str(out / "residual_quality_score.json"),
            "seal_dir": str(seal),
        },
    }
    (out / "focused_next_cards_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.mirror_artifacts:
        for name in (
            "route_authority_audit.json",
            "longform_audit.json",
            "surface_audit.json",
            "density_lock_verdict.json",
        ):
            src = seal / name
            if src.is_file():
                shutil.copy2(src, out / name)

    gen_apply = _repo_root() / "api" / "automation" / "generated_cursor_apply"
    try:
        rel_residual = str((out / "residual_quality_score.json").relative_to(_repo_root()))
    except ValueError:
        rel_residual = str((out / "residual_quality_score.json").resolve())
    stub_paths: List[str] = []
    if args.write_stubs:
        for axis, sc in lowest:
            cur, vps = AXIS_CARD_PAIRS[axis]
            write_focused_stub(gen_apply, axis, sc, cur, vps, rel_residual)
            stub_paths.append(axis)
        manifest["stubs_written"] = stub_paths
        (out / "focused_next_cards_manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    summary = {
        "ok": True,
        "lowest_axes": lowest,
        "manifest": str(out / "focused_next_cards_manifest.json"),
    }
    (out / "final_verdict.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.stdout_json:
        print(json.dumps(residual, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
