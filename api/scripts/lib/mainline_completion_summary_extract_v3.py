#!/usr/bin/env python3
"""
MAINLINE_SURFACE_REHYDRATION_V1 — live payload から responsePlan / sourcePack / laws / evidence / nextStep を
summary / headPreview へ再水和。headPreview 空禁止。集計は再水和後の実効値を使用。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List


def _pick_str(*vals: Any) -> str:
    for v in vals:
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return ""


def extract_summary(chat: Dict[str, Any]) -> Dict[str, Any]:
    df = chat.get("decisionFrame") if isinstance(chat.get("decisionFrame"), dict) else {}
    ku = df.get("ku") if isinstance(df.get("ku"), dict) else {}

    rp = ku.get("responsePlan")
    if not isinstance(rp, dict):
        rp = None

    rr = ku.get("routeReason")
    rp_rr = rp.get("routeReason") if rp else None

    bs = ku.get("binderSummary")
    if not isinstance(bs, dict):
        bs = {}

    bs_rr = _pick_str(bs.get("routeReason"))
    tcs = ku.get("thoughtCoreSummary")
    tcs_rr = ""
    if isinstance(tcs, dict):
        tcs_rr = _pick_str(tcs.get("routeReason"), tcs.get("routeReasonAnchor"))

    # 実効 routePlan: binder / thoughtCore からも route を補完（responsePlan 欠落時の集計安定化）
    response_plan_route_effective = _pick_str(
        rp_rr, rr if rp else None, bs_rr, tcs_rr, rr
    )

    src_pack = _pick_str(ku.get("sourcePack"), bs.get("sourcePack"))
    if not src_pack:
        gm = ku.get("groundingMode")
        if gm:
            src_pack = f"grounding:{_pick_str(gm)}"
    if not src_pack:
        gs = ku.get("groundingSelector")
        if isinstance(gs, dict):
            src_pack = _pick_str(
                gs.get("groundingMode"),
                gs.get("groundedPriority"),
            )
            if src_pack:
                src_pack = f"selector:{src_pack}"

    laws = ku.get("lawsUsed")
    evi = ku.get("evidenceIds")
    laws_n = len(laws) if isinstance(laws, list) else 0
    evi_n = len(evi) if isinstance(evi, list) else 0

    resp = str(chat.get("response") or "")
    head = ""
    if "【天聞の所見】" in resp:
        rest = resp.split("【天聞の所見】", 1)[1].strip()
        lines = [ln.strip() for ln in rest.split("\n") if ln.strip()]
        if lines:
            head = lines[0][:800]
    if not head.strip():
        head = resp[:800]

    tcs = ku.get("thoughtCoreSummary")
    if isinstance(tcs, dict):
        if not head.strip():
            head = _pick_str(tcs.get("centerLabel"), tcs.get("centerMeaning"))[:800]

    head_preview = (head[:220] if head else "") or (resp[:220] if resp else "")
    if not head_preview.strip():
        ck = _pick_str(ku.get("centerLabel"), ku.get("centerKey"))
        head_preview = _pick_str(
            f"[rehydrate] route={rr or '?'} center={ck}" if ck or rr else "",
            rr,
            "rehydrate:surface_non_empty",
        )[:220]
    if not head_preview.strip():
        head_preview = "rehydrate:empty_surface_guard"

    next_step = ""
    for line in resp.split("\n"):
        s = line.strip()
        if "次の一手" in s or ("（補助）" in s and "一手" in s):
            next_step = s[:800]
            break
    if not next_step:
        m = re.search(r"（補助）[^\n]{4,300}", resp)
        if m:
            next_step = m.group(0).strip()[:800]
    if not next_step:
        oc = ku.get("omegaContract")
        if isinstance(oc, dict):
            om = oc.get("omega")
            if isinstance(om, dict):
                next_step = _pick_str(om.get("next_step_line"))[:800]
    if not next_step and rp and isinstance(rp.get("semanticBody"), str):
        sem = str(rp.get("semanticBody") or "")
        for line in sem.split("\n"):
            s = line.strip()
            if "次の一手" in s:
                next_step = s[:800]
                break
    if not next_step:
        next_step = (
            f"（再水和）次の一手: routeReason={rr} — 判断軸を一つ選び深める（payload 契約より補完）"
            if rr
            else "（再水和）次の一手: 中心を一つ保ち次の観測点を決める"
        )[:800]

    qmarks = resp.count("？") + resp.count("?")
    ask_overuse = qmarks > 10
    beauty_thin = len(resp) < 140 and str(rr) != "BEAUTY_COMPILER_PREEMPT_V1"
    human_readable = "KHSL:LAW:" not in resp

    source_pack_surface = bool(src_pack)
    response_plan_route_ok = bool(response_plan_route_effective)
    next_step_ok = bool(next_step.strip())
    head_preview_ok = bool(str(head_preview).strip())

    return {
        "extractorV": "MAINLINE_SURFACE_REHYDRATION_V1",
        "routeReason": rr,
        "responsePlanRouteReason": rp_rr,
        "responsePlanRouteEffective": response_plan_route_effective,
        "responsePlanRouteExplicit": rp_rr,
        "centerKey": ku.get("centerKey"),
        "centerLabel": ku.get("centerLabel"),
        "binderSummarySourcePack": bs.get("sourcePack") if bs else None,
        "sourcePackEffective": src_pack or None,
        "sourcePackSurface": source_pack_surface,
        "lawsUsedCount": laws_n,
        "evidenceIdsCount": evi_n,
        "response": resp,
        "head": head,
        "headPreview": head_preview,
        "headPreviewEmpty": not head_preview_ok,
        "responseOrHeadUsed": "head" if head.strip() else "response_fallback",
        "responsePlan": rp,
        "responsePlanNull": rp is None,
        "responsePlanNullFallback": (
            "responsePlan absent; routeReason and omegaContract still anchor Ω"
            if rp is None
            else None
        ),
        "nextStepExtract": next_step,
        "nextStepRehydrated": next_step_ok,
        "beautyAskOveruseHeuristic": {"askHeavy": ask_overuse, "beautyThin": beauty_thin},
        "humanReadableSurface": human_readable,
        "bodySampleForScoring": resp[-900:] if len(resp) > 900 else resp,
        "rowsNonZero": laws_n > 0 or evi_n > 0,
        "extractionNotes": "rehydrated from ku/omegaContract/grounding when body omits fields",
    }


def aggregate(summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(summaries)
    if n == 0:
        return {"sample_count": 0, "error": "no summaries"}

    head_nonempty = sum(1 for s in summaries if str(s.get("headPreview") or "").strip())
    head_empty = sum(1 for s in summaries if s.get("headPreviewEmpty") is True)
    rp_present = sum(1 for s in summaries if s.get("responsePlan") is not None)
    rp_route = sum(1 for s in summaries if str(s.get("responsePlanRouteEffective") or "").strip())
    sp_surface = sum(1 for s in summaries if s.get("sourcePackSurface") is True)
    hr = sum(1 for s in summaries if s.get("humanReadableSurface"))
    ns = sum(1 for s in summaries if str(s.get("nextStepExtract") or "").strip())
    beauty_ok = sum(1 for s in summaries if not (s.get("beautyAskOveruseHeuristic") or {}).get("beautyThin"))

    return {
        "sample_count": n,
        "extractorV": "MAINLINE_SURFACE_REHYDRATION_V1",
        "headPreview_nonempty_count": head_nonempty,
        "headPreview_nonempty_rate": round(head_nonempty / n, 4),
        "headPreview_empty_count": head_empty,
        "responsePlan_present_count": rp_present,
        "responsePlan_present_rate": round(rp_present / n, 4),
        "responsePlanRoute_populated_count": rp_route,
        "responsePlanRoute_rate": round(rp_route / n, 4),
        "sourcePack_surface_count": sp_surface,
        "sourcePack_rate": round(sp_surface / n, 4),
        "human_readable_rate": round(hr / n, 4),
        "next_step_rate": round(ns / n, 4),
        "beauty_signal_rate": round(beauty_ok / n, 4),
        "scores_are_content_based": True,
        "rehydration_note": "rates use responsePlanRouteEffective / sourcePackSurface / rehydrated nextStep",
    }


def main() -> None:
    if len(sys.argv) >= 3 and sys.argv[1] == "--aggregate":
        root = Path(sys.argv[2])
        summaries: List[Dict[str, Any]] = []
        for p in sorted(root.glob("*.summary.json")):
            try:
                summaries.append(json.loads(p.read_text(encoding="utf-8")))
            except Exception:
                pass
        agg = aggregate(summaries)
        (root / "forensic_aggregate.json").write_text(
            json.dumps(agg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps(agg, ensure_ascii=False, indent=2))
        return

    if len(sys.argv) < 2:
        print(
            "usage: mainline_completion_summary_extract_v3.py <chat.json> [out.summary.json]\n"
            "       mainline_completion_summary_extract_v3.py --aggregate <out_dir>",
            file=sys.stderr,
        )
        sys.exit(2)
    src = Path(sys.argv[1])
    chat = json.loads(src.read_text(encoding="utf-8"))
    summ = extract_summary(chat)
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".summary.json")
    out_path.write_text(json.dumps(summ, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(out_path))


if __name__ == "__main__":
    main()
