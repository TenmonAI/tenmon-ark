#!/usr/bin/env python3
"""
MAINLINE_SUPREME_COMPLETION_AUDIT_V1 / REAUDIT_V1
— 実応答 raw + summary から 10 軸をヒューリスティック採点し、micro-card 2〜9 を推奨として出力。
監査補正（抽出器だけの水増し）と混同しないよう、本文ベース指標を含める。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


def _load_json(p: Path) -> Dict[str, Any]:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _q_count(text: str) -> int:
    return text.count("？") + text.count("?")


def _has_generic_escape(t: str) -> bool:
    return bool(
        __import__("re").search(
            r"(一般に|基本的には|多くの場合|つまり重要なのは|いろいろありますが)",
            t[:2000],
        )
    )


def _interrogative_template_hits(t: str) -> int:
    return len(
        __import__("re").findall(
            r"(どちらですか|何ですか|どこですか|どれですか|いつですか|誰ですか)[？?]",
            t[:4000],
        )
    )


def _serialize_rp(rp: Any) -> Dict[str, Any]:
    if not isinstance(rp, dict):
        return {"present": False}
    return {
        "present": True,
        "routeReason": rp.get("routeReason"),
        "has_semanticBody": isinstance(rp.get("semanticBody"), str)
        and len(str(rp.get("semanticBody") or "")) > 8,
    }


def _observation_slice(
    stem: str, raw: Dict[str, Any], summ: Dict[str, Any], meta: Dict[str, Any]
) -> Dict[str, Any]:
    """抽出器（summary）と本文品質（raw.response）を分離して観測"""
    resp = str(raw.get("response") or summ.get("response") or "")
    ku: Dict[str, Any] = {}
    df = raw.get("decisionFrame")
    if isinstance(df, dict) and isinstance(df.get("ku"), dict):
        ku = df["ku"]
    rp = ku.get("responsePlan")
    laws = ku.get("lawsUsed")
    evi = ku.get("evidenceIds")
    return {
        "probe": stem,
        "user_message": meta.get("message"),
        "raw_response_len": len(resp),
        "raw_response": resp,
        "body_start_200": resp[:200],
        "body_end_200": resp[-200:] if len(resp) > 200 else resp,
        "ku_routeReason": ku.get("routeReason"),
        "ku_responsePlan": _serialize_rp(rp),
        "ku_sourcePack": ku.get("sourcePack"),
        "ku_centerKey": ku.get("centerKey"),
        "ku_centerLabel": ku.get("centerLabel"),
        "ku_lawsUsed": laws if isinstance(laws, list) else None,
        "ku_evidenceIds": evi if isinstance(evi, list) else None,
        "summary_extractorV": summ.get("extractorV"),
        "summary_headPreview": (summ.get("headPreview") or "")[:220],
        "body_signals": {
            "generic_escape": _has_generic_escape(resp),
            "question_marks": _q_count(resp),
            "interrogative_template_hits": _interrogative_template_hits(resp),
        },
    }


def _probe_axes_for_pair(
    raw: Dict[str, Any], summ: Dict[str, Any], meta: Optional[Dict[str, Any]] = None
) -> Dict[str, float]:
    """0..1 近傍の部分スコア（単一プローブ）"""
    meta = meta or {}
    resp = str(raw.get("response") or summ.get("response") or "")
    msg = str(meta.get("message") or raw.get("message") or raw.get("rawMessage") or "")
    ku = {}
    df = raw.get("decisionFrame")
    if isinstance(df, dict) and isinstance(df.get("ku"), dict):
        ku = df["ku"]
    rr = str(summ.get("routeReason") or ku.get("routeReason") or "")

    n = max(len(resp), 1)
    qn = _q_count(resp)
    tmpl_hits = _interrogative_template_hits(resp)
    ask_penalty = min(
        1.0, qn / max(8, n / 400) + min(0.35, tmpl_hits * 0.08)
    )

    # 1 原理深度
    depth = 0.35
    if len(resp) > 600:
        depth += 0.25
    if len(resp) > 1200:
        depth += 0.2
    if summ.get("lawsUsedCount", 0) or summ.get("evidenceIdsCount", 0):
        depth += 0.12
    if not _has_generic_escape(resp):
        depth += 0.08
    depth = min(1.0, depth)

    # 2 比較統合力
    compare_need = bool(__import__("re").search(r"違い|比較|一方|他方|原理として", msg))
    compare_ok = bool(__import__("re").search(r"違い|比較|一方|他方|差|同じでない|区別", resp[:2500]))
    integration = 0.55 + (0.35 if compare_ok else 0) + (0.1 if not compare_need else 0)
    integration = min(1.0, integration)

    # 3 sourcePack 可視性（本文にも触れているか）
    sp_ok = summ.get("sourcePackSurface") is True
    sp_txt = bool(__import__("re").search(r"根拠|正典|sourcePack|参照|法則|証拠", resp[:2000]))
    source_vis = 0.4 + (0.35 if sp_ok else 0) + (0.25 if sp_txt else 0)
    source_vis = min(1.0, source_vis)

    # 4 will 自然表面化
    will_need = "意志" in msg or "will" in msg.lower()
    will_ok = bool(__import__("re").search(r"意志|芯|主幹|天聞アークの", resp[:2000]))
    will_s = 0.5 + (0.35 if will_ok else 0) + (0.15 if not will_need else 0)
    will_s = min(1.0, will_s)

    # 5 law 人間可読
    law_h = 1.0 if summ.get("humanReadableSurface") and "KHSL:LAW:" not in resp else 0.45

    # 6 longform 密度
    long_d = min(1.0, len(resp) / 1400) * 0.7 + (0.3 if len(resp) > 800 else 0.0)

    # 7 ask-overuse 低減（高いほど良い）
    ask_s = max(0.0, 1.0 - ask_penalty)

    # 8 next-step 自然さ（再水和のみは減点）
    ns = str(summ.get("nextStepExtract") or "")
    next_nat = 0.65 if ns.strip() else 0.2
    if "再水和" in ns and "（補助）" not in resp:
        next_nat *= 0.85
    if "次の一手" in resp or "（補助）" in resp:
        next_nat = min(1.0, next_nat + 0.2)

    # 9 beauty 意味由来（美文系）
    beauty_need = bool(__import__("re").search(r"美しい|美文|整えて", msg))
    beauty_s = 0.55
    if beauty_need:
        beauty_s = 0.35 + min(0.5, len(resp) / 900) + (0.15 if not _has_generic_escape(resp) else 0)
    if "BEAUTY" in rr or "beauty" in str(summ.get("centerKey") or "").lower():
        beauty_s = min(1.0, beauty_s + 0.1)
    beauty_s = min(1.0, beauty_s)

    # 10 自己学習反映の兆候
    learn = 0.45
    if ku.get("priorRuleFeedbackHydrated") or ku.get("kokuzoSeedBridge"):
        learn += 0.25
    if summ.get("meaningCompilerTrace"):
        learn += 0.15
    raw_txt = json.dumps(raw, ensure_ascii=False)[:4000]
    if "ledger" in raw_txt.lower() or "evolution" in raw_txt.lower():
        learn += 0.1
    learn = min(1.0, learn)

    return {
        "axis_principle_depth": round(depth, 4),
        "axis_compare_integration": round(integration, 4),
        "axis_sourcepack_visibility": round(source_vis, 4),
        "axis_will_surface": round(will_s, 4),
        "axis_law_human_readability": round(law_h, 4),
        "axis_longform_density": round(long_d, 4),
        "axis_ask_overuse_reduction": round(ask_s, 4),
        "axis_next_step_natural": round(next_nat, 4),
        "axis_beauty_meaning_origin": round(beauty_s, 4),
        "axis_learning_signal": round(learn, 4),
    }


AXIS_KEYS = [
    "axis_principle_depth",
    "axis_compare_integration",
    "axis_sourcepack_visibility",
    "axis_will_surface",
    "axis_law_human_readability",
    "axis_longform_density",
    "axis_ask_overuse_reduction",
    "axis_next_step_natural",
    "axis_beauty_meaning_origin",
    "axis_learning_signal",
]

AXIS_LABELS = {
    "axis_principle_depth": "原理深度",
    "axis_compare_integration": "比較統合力",
    "axis_sourcepack_visibility": "sourcePack可視性",
    "axis_will_surface": "will自然表面化",
    "axis_law_human_readability": "law人間可読化",
    "axis_longform_density": "longform密度",
    "axis_ask_overuse_reduction": "ask-overuse低減",
    "axis_next_step_natural": "next-step自然さ",
    "axis_beauty_meaning_origin": "beauty意味由来性",
    "axis_learning_signal": "自己学習反映兆候",
}

CARD_MAP = [
    ("axis_principle_depth", "MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1"),
    ("axis_longform_density", "MAINLINE_REAL_LONGFORM_QUALITY_AUDIT_V1"),
    ("axis_ask_overuse_reduction", "MAINLINE_ASK_OVERUSE_KILL_V1"),
    ("axis_principle_depth", "MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1"),
    ("axis_will_surface", "MAINLINE_WILL_LAW_SOURCE_VISIBLE_REPAIR_V1"),
    ("axis_sourcepack_visibility", "MAINLINE_WILL_LAW_SOURCE_VISIBLE_REPAIR_V1"),
    ("axis_longform_density", "MAINLINE_LONGFORM_TENMON_ASCENT_V1"),
    ("axis_beauty_meaning_origin", "MAINLINE_BEAUTY_MEANING_FUSION_V1"),
    ("axis_next_step_natural", "MAINLINE_RESPONSEPLAN_BIND_RECHECK_V1"),
    ("axis_compare_integration", "MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1"),
]


def recommend_cards(axis_means: Dict[str, float], threshold: float = 0.62) -> List[Dict[str, Any]]:
    seen = set()
    out: List[Dict[str, Any]] = []
    for axis_key, card in CARD_MAP:
        v = axis_means.get(axis_key, 0)
        if v < threshold and card not in seen:
            seen.add(card)
            out.append(
                {
                    "microCard": card,
                    "triggerAxis": axis_key,
                    "axisLabel": AXIS_LABELS.get(axis_key, axis_key),
                    "meanScore": v,
                    "threshold": threshold,
                }
            )
    return out


def aggregate_bundle(bundle_dir: Path, baseline_dir: Path | None) -> Dict[str, Any]:
    summaries: List[Dict[str, Any]] = []
    per_probe: List[Dict[str, Any]] = []
    observations: List[Dict[str, Any]] = []
    axis_accum = {k: 0.0 for k in AXIS_KEYS}

    for summ_path in sorted(bundle_dir.glob("*.summary.json")):
        stem = summ_path.name.replace(".summary.json", "")
        raw_path = bundle_dir / f"{stem}.raw.json"
        meta_path = bundle_dir / f"{stem}.meta.json"
        summ = _load_json(summ_path)
        raw = _load_json(raw_path)
        meta = _load_json(meta_path) if meta_path.is_file() else {}
        axes = _probe_axes_for_pair(raw, summ, meta)
        for k in AXIS_KEYS:
            axis_accum[k] += axes[k]
        obs = _observation_slice(stem, raw, summ, meta)
        observations.append(obs)
        per_probe.append(
            {
                "probe": stem,
                "axes": axes,
                "routeReason": summ.get("routeReason"),
                "observation": obs,
            }
        )
        summaries.append(summ)

    n = len(per_probe)
    if n == 0:
        return {"error": "no probes", "sample_count": 0}

    axis_means = {k: round(axis_accum[k] / n, 4) for k in AXIS_KEYS}
    recommended = recommend_cards(axis_means)
    depth_marker = (bundle_dir / ".depth_audit_v1").is_file()

    methodology = {
        "body_quality": "raw.response の長さ・一般論逃げ・疑問符・比較語を直接見る（本文品質）。",
        "extractor_fields": "*.summary.json は抽出器の再水和結果。headPreview/nextStep が本文と乖離する場合は抽出器側の要確認。",
        "separation_rule": "per_probe[].observation に raw と ku を同居させ、per_probe[].axes は主に本文駆動。summary のみで盛った指標は extractor 要因の疑い。",
    }

    out: Dict[str, Any] = {
        "v": "MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1"
        if depth_marker
        else "MAINLINE_SUPREME_COMPLETION_AUDIT_V1",
        "sample_count": n,
        "axis_means": axis_means,
        "axis_labels": AXIS_LABELS,
        "recommended_micro_cards": recommended,
        "per_probe": per_probe,
        "per_probe_observations": observations,
        "methodology": methodology,
        "audit_note": "本文品質は observation.body_* / body_signals。契約は ku_*。抽出は summary_*。",
    }

    if baseline_dir and baseline_dir.is_dir():
        base_report = baseline_dir / "supreme_audit_report.json"
        if base_report.is_file():
            try:
                prev = json.loads(base_report.read_text(encoding="utf-8"))
                prev_means = prev.get("axis_means") or {}
                delta = {k: round(axis_means[k] - float(prev_means.get(k, 0)), 4) for k in AXIS_KEYS}
                out["v"] = "MAINLINE_SUPREME_REAUDIT_V1"
                out["baseline_dir"] = str(baseline_dir)
                out["axis_delta_vs_baseline"] = delta
                target4 = [
                    "axis_principle_depth",
                    "axis_sourcepack_visibility",
                    "axis_next_step_natural",
                    "axis_ask_overuse_reduction",
                ]
                improved = [k for k in target4 if delta.get(k, 0) > 0.005]
                regressed = [k for k in target4 if delta.get(k, 0) < -0.005]
                out["reaudit_target4_improved"] = improved
                out["reaudit_target4_regressed"] = regressed
                out["reaudit_acceptance_three_of_four"] = len(improved) >= 3
            except Exception as e:
                out["reaudit_compare_error"] = str(e)

    return out


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[1] != "--bundle":
        print(
            "usage: supreme_completion_audit_v1.py --bundle <out_dir> [--baseline <dir>]",
            file=sys.stderr,
        )
        sys.exit(2)
    bdir = Path(sys.argv[2])
    baseline: Path | None = None
    if len(sys.argv) >= 5 and sys.argv[3] == "--baseline":
        baseline = Path(sys.argv[4])
    rep = aggregate_bundle(bdir, baseline)
    out_path = bdir / "supreme_audit_report.json"
    out_path.write_text(json.dumps(rep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if baseline and rep.get("axis_delta_vs_baseline"):
        diff_path = bdir / "before_after_diff.json"
        diff_path.write_text(
            json.dumps(
                {
                    "v": "MAINLINE_SUPREME_REAUDIT_V1",
                    "bundle_dir": str(bdir.resolve()),
                    "baseline_dir": str(baseline.resolve()),
                    "axis_delta_vs_baseline": rep.get("axis_delta_vs_baseline"),
                    "reaudit_target4_improved": rep.get("reaudit_target4_improved"),
                    "reaudit_target4_regressed": rep.get("reaudit_target4_regressed"),
                    "reaudit_acceptance_three_of_four": rep.get(
                        "reaudit_acceptance_three_of_four"
                    ),
                    "recommended_micro_cards_after": rep.get("recommended_micro_cards"),
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    (bdir / "evidence_bundle.txt").write_text(
        "\n".join(
            [
                f"bundle_dir={bdir.resolve()}",
                f"supreme_audit_report={out_path}",
                f"forensic_aggregate={bdir / 'forensic_aggregate.json'}",
                "micro_cards=MAINLINE_SUPREME_COMPLETION_AUDIT_V1 + conditional 2-9 + MAINLINE_SUPREME_REAUDIT_V1",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(rep, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
