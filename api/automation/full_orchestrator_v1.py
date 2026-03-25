#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_CURSOR_AUTO_V1

会話完成系 / chat.ts 自己改善系 / 虚空蔵学習系 / maintenance・improvement・supplement 系の
既存 verdict を読み、優先順位付きで next 1〜3 カード・pending・blocked を出す司令塔。
（本体コードの修正は行わない）
"""
from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

CARD = "TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_CURSOR_AUTO_V1"
VERSION = 1
VPS_CARD = "TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_VPS_V1"
FAIL_NEXT = "TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_RETRY_CURSOR_AUTO_V1"

# 数値が小さいほど先に実行（同一系内の順序）
TYPE_PRIORITY: Dict[str, int] = {
    "seal_contract": 0,
    "surface": 10,
    "route": 20,
    "longform": 30,
    "density": 40,
    "learning_input_quality": 50,
    "learning_seed_quality": 55,
}

# blocker 文字列 → 正規化タイプ（chat_ts_stage5 + 拡張）
BLOCKER_TYPE_RULES: List[Tuple[re.Pattern[str], str]] = [
    (re.compile(r"runtime|probe|chat_url|structural|artifact|governor|seal", re.I), "seal_contract"),
    (re.compile(r"surface|noise|worldclass_surface", re.I), "surface"),
    (re.compile(r"route|authority", re.I), "route"),
    (re.compile(r"longform", re.I), "longform"),
    (re.compile(r"density|static_not", re.I), "density"),
    (re.compile(r"seed|kg1|deterministic", re.I), "learning_seed_quality"),
    (re.compile(r"kg0|health|passable|input|hybrid|candidate|kg2|evidence", re.I), "learning_input_quality"),
]


@dataclass
class CardRec:
    cursor_card: str
    vps_card: str
    blocker_types: List[str] = field(default_factory=list)
    rationale: str = ""
    auto_apply_allowed: bool = True
    system: str = ""
    source_blockers: List[str] = field(default_factory=list)


# タイプ → 既定カード（会話完成レジストリと整合）
TYPE_DEFAULT_CARDS: Dict[str, CardRec] = {
    "seal_contract": CardRec(
        "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
        "CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1",
        rationale="runtime / seal / governor 整合",
        auto_apply_allowed=False,
        system="conversation_completion",
    ),
    "surface": CardRec(
        "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1",
        system="conversation_completion",
    ),
    "route": CardRec(
        "CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2",
        "CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V2",
        system="conversation_completion",
    ),
    "longform": CardRec(
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_VPS_V1",
        system="conversation_completion",
    ),
    "density": CardRec(
        "CHAT_TS_STAGE5_WORLDCLASS_SEAL_AND_BASELINE_CURSOR_AUTO_V1",
        "CHAT_TS_STAGE5_WORLDCLASS_SEAL_VPS_V1",
        rationale="density / static trunk",
        system="conversation_completion",
    ),
    "learning_input_quality": CardRec(
        "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1",
        "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1",
        rationale="KHS 健全性 / candidate / evidence 系",
        system="kokuzo_learning",
    ),
    "learning_seed_quality": CardRec(
        "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
        "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
        system="kokuzo_learning",
    ),
}

LEARNING_STEP_CARDS: Dict[str, CardRec] = {
    "kg0_khs_health_gate": CardRec(
        "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1",
        "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1",
        blocker_types=["learning_input_quality"],
        system="kokuzo_learning",
    ),
    "kg1_deterministic_seed": CardRec(
        "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
        "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
        blocker_types=["learning_seed_quality"],
        system="kokuzo_learning",
    ),
    "kg2_khs_candidate_return": CardRec(
        "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1",
        "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1",
        blocker_types=["learning_input_quality"],
        system="kokuzo_learning",
    ),
    "kg2b_fractal_language_renderer": CardRec(
        "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1",
        "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1",
        blocker_types=["surface"],
        rationale="美文 / fractal surface",
        system="kokuzo_learning",
    ),
}

IMPROVEMENT_OS_CARD = CardRec(
    "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1",
    "TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1",
    system="chat_self_improvement",
    auto_apply_allowed=False,
)

KOKUZO_INTEGRATION_CARD = CardRec(
    "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_CURSOR_AUTO_V1",
    "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1",
    system="kokuzo_learning",
    auto_apply_allowed=False,
)

SUPPLEMENT_HINT = CardRec(
    "CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1",
    "CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1",
    system="maintenance_supplement",
    auto_apply_allowed=False,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _resolve_seal_dir(explicit: Optional[str]) -> Optional[Path]:
    if explicit:
        p = Path(explicit).resolve()
        return p if p.is_dir() else None
    env = os.environ.get("TENMON_ORCHESTRATOR_SEAL_DIR", "").strip()
    if env:
        p = Path(env).resolve()
        return p if p.is_dir() else None
    sym = Path("/var/log/tenmon/card")
    if sym.is_symlink() or sym.is_dir():
        try:
            return sym.resolve()
        except Exception:
            return None
    return None


def _classify_blocker(raw: str) -> str:
    s = str(raw).strip()
    for pat, typ in BLOCKER_TYPE_RULES:
        if pat.search(s):
            return typ
    return "seal_contract"


def _merge_typed_blockers(
    acc: Dict[str, List[str]], blocker: str, btype: str
) -> None:
    acc.setdefault(btype, [])
    if blocker and blocker not in acc[btype]:
        acc[btype].append(blocker)


def _priority_for_types(types: List[str]) -> int:
    if not types:
        return 999
    return min(TYPE_PRIORITY.get(t, 100) for t in types)


def _collect_from_seal(seal: Path) -> Tuple[Dict[str, Any], List[str], Dict[str, List[str]]]:
    """final_verdict + 付随 blockers を集約。"""
    final = _read_json(seal / "final_verdict.json")
    blockers: List[str] = list(final.get("blockers") or [])
    typed: Dict[str, List[str]] = {k: [] for k in TYPE_PRIORITY}

    for b in blockers:
        bt = _classify_blocker(b)
        _merge_typed_blockers(typed, b, bt)

    if not final.get("chat_ts_runtime_100", True):
        syn = "runtime_probe_failure_remaining"
        if syn not in blockers:
            blockers.append(syn)
        _merge_typed_blockers(typed, syn, "seal_contract")

    if not final.get("chat_ts_overall_100", True):
        for flag, syn, bt in (
            (final.get("surface_clean", True), "surface_noise_remaining", "surface"),
            (final.get("route_authority_clean", True), "route_authority_not_clean", "route"),
            (final.get("longform_quality_clean", True), "longform_quality_not_clean", "longform"),
            (final.get("density_lock", True), "density_lock_not_clean", "density"),
        ):
            if not flag:
                if syn not in blockers:
                    blockers.append(syn)
                _merge_typed_blockers(typed, syn, bt)

    meta = {
        "seal_dir": str(seal),
        "chat_ts_overall_100": bool(final.get("chat_ts_overall_100")),
        "final_verdict_path": str(seal / "final_verdict.json"),
    }
    return meta, blockers, typed


def _collect_improvement(
    seal: Optional[Path], kokuzo_os: Optional[Path]
) -> Dict[str, Any]:
    paths = []
    if seal:
        paths.append(seal / "_self_improvement_os" / "integrated_final_verdict.json")
    if kokuzo_os:
        paths.append(kokuzo_os / "integrated_final_verdict.json")
    out: Dict[str, Any] = {"sources": [], "overall_loop_ok": None, "structural_ok": None}
    for p in paths:
        if not p.is_file():
            continue
        data = _read_json(p)
        out["sources"].append(str(p))
        if "overall_loop_ok" in data:
            out["overall_loop_ok"] = bool(data.get("overall_loop_ok"))
        gov = data.get("governor") or {}
        if "structural_ok" in gov:
            out["structural_ok"] = bool(gov.get("structural_ok"))
        supp = data.get("completion_supplement_dispatch") or {}
        if supp.get("blockers"):
            out["supplement_blockers"] = supp.get("blockers")
    return out


def _collect_kokuzo(kdir: Optional[Path]) -> Tuple[Dict[str, Any], Dict[str, List[str]]]:
    typed: Dict[str, List[str]] = {k: [] for k in TYPE_PRIORITY}
    meta: Dict[str, Any] = {"kokuzo_dir": str(kdir) if kdir else None}
    if not kdir:
        return meta, typed
    integ = _read_json(kdir / "integrated_learning_verdict.json")
    meta["integrated_learning_verdict_path"] = str(kdir / "integrated_learning_verdict.json")
    meta["learning_chain_ok"] = integ.get("learning_chain_ok")
    meta["integrated_verdict_ok"] = integ.get("integrated_verdict_ok")

    for step in integ.get("learning_steps") or []:
        sid = str(step.get("id") or "")
        ok = step.get("verdict_pass") and int(step.get("rc") or 0) == 0
        if ok:
            continue
        rec = LEARNING_STEP_CARDS.get(sid)
        if rec:
            for bt in rec.blocker_types:
                _merge_typed_blockers(typed, f"learning_step:{sid}", bt)
        else:
            _merge_typed_blockers(typed, f"learning_step:{sid}", "learning_input_quality")

    if integ.get("integrated_verdict_ok") is False:
        _merge_typed_blockers(typed, "kokuzo_learning_integration_fail", "seal_contract")

    return meta, typed


def _build_candidates(merged: Dict[str, List[str]]) -> List[CardRec]:
    """タイプごとに CardRec を生成。"""
    cands: List[CardRec] = []
    joined = " ".join(str(x) for v in merged.values() for x in v)

    for btype, src_blockers in merged.items():
        if not src_blockers:
            continue
        base = TYPE_DEFAULT_CARDS.get(btype)
        if not base:
            continue
        # 学習ステップ由来ならより具体的なカードに差し替え
        if btype == "learning_input_quality":
            if any("kg0" in s for s in src_blockers) or "kg0" in joined:
                rec = LEARNING_STEP_CARDS["kg0_khs_health_gate"]
            elif any("kg2" in s for s in src_blockers) or "kg2_khs" in joined:
                rec = LEARNING_STEP_CARDS["kg2_khs_candidate_return"]
            else:
                rec = base
        elif btype == "learning_seed_quality":
            rec = LEARNING_STEP_CARDS["kg1_deterministic_seed"]
        elif btype == "surface" and (
            any("kg2b" in s for s in src_blockers) or "kg2b" in joined
        ):
            rec = LEARNING_STEP_CARDS["kg2b_fractal_language_renderer"]
        else:
            rec = base

        c = CardRec(
            cursor_card=rec.cursor_card,
            vps_card=rec.vps_card,
            blocker_types=[btype],
            rationale=rec.rationale,
            auto_apply_allowed=rec.auto_apply_allowed,
            system=rec.system,
            source_blockers=src_blockers[:12],
        )
        cands.append(c)

    return cands


def _dedupe(cands: List[CardRec]) -> List[CardRec]:
    seen: Set[str] = set()
    out: List[CardRec] = []
    for c in sorted(cands, key=lambda x: _priority_for_types(x.blocker_types)):
        key = c.cursor_card
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def _split_queues(
    ranked: List[CardRec], max_next: int
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    next_q: List[Dict[str, Any]] = []
    pending: List[Dict[str, Any]] = []
    for i, c in enumerate(ranked):
        row = {
            "cursor_card": c.cursor_card,
            "vps_card": c.vps_card,
            "blocker_types": c.blocker_types,
            "rationale": c.rationale,
            "auto_apply_allowed": c.auto_apply_allowed,
            "system": c.system,
            "source_blockers": c.source_blockers,
            "priority_rank": i + 1,
        }
        if len(next_q) < max_next:
            next_q.append(row)
        else:
            pending.append(row)
    return next_q, pending


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="既定: api/automation/out/tenmon_full_orchestrator_v1",
    )
    ap.add_argument("--seal-dir", type=str, default="", help="runtime seal（final_verdict 等）")
    ap.add_argument(
        "--kokuzo-out-dir",
        type=str,
        default="",
        help="kokuzo learning integration 出力（integrated_learning_verdict.json）",
    )
    ap.add_argument(
        "--max-next",
        type=int,
        default=3,
        help="next queue の最大件数（1〜3）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    out_dir = Path(args.out_dir).resolve() if args.out_dir else (
        api / "automation" / "out" / "tenmon_full_orchestrator_v1"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    max_next = max(1, min(3, int(args.max_next)))

    seal = _resolve_seal_dir(args.seal_dir.strip() or None)
    kdir = Path(args.kokuzo_out_dir).resolve() if args.kokuzo_out_dir.strip() else (
        api / "automation" / "out" / "tenmon_kokuzo_learning_improvement_os_v1"
    )
    if not kdir.is_dir():
        kdir = None  # type: ignore

    kokuzo_os_path: Optional[Path] = None
    if kdir:
        cand = kdir / "_learning_improvement_os"
        if cand.is_dir():
            kokuzo_os_path = cand

    blocked: List[Dict[str, Any]] = []
    if not seal:
        blocked.append(
            {
                "id": "no_seal_dir",
                "reason": "seal_dir_not_resolved",
                "hint": "TENMON_ORCHESTRATOR_SEAL_DIR または --seal-dir で指定",
            }
        )

    typed_all: Dict[str, List[str]] = {k: [] for k in TYPE_PRIORITY}
    all_blockers: List[str] = []
    seal_meta: Dict[str, Any] = {}

    if seal:
        seal_meta, seal_blockers, seal_typed = _collect_from_seal(seal)
        all_blockers.extend(seal_blockers)
        for k, vs in seal_typed.items():
            for v in vs:
                if v not in typed_all[k]:
                    typed_all[k].append(v)

    k_meta, k_typed = _collect_kokuzo(kdir)
    for k, vs in k_typed.items():
        for v in vs:
            if v not in typed_all[k]:
                typed_all[k].append(v)

    imp = _collect_improvement(seal, kokuzo_os_path)
    if imp.get("overall_loop_ok") is False:
        all_blockers.append("self_improvement_overall_loop_not_ok")
        _merge_typed_blockers(typed_all, "self_improvement_overall_loop_not_ok", "seal_contract")
    if imp.get("structural_ok") is False:
        all_blockers.append("seal_governor_structural_not_ok")
        _merge_typed_blockers(typed_all, "seal_governor_structural_not_ok", "seal_contract")

    supp_path = (seal / "_completion_supplement" / "next_card_dispatch.json") if seal else None
    if supp_path and supp_path.is_file():
        supp = _read_json(supp_path)
        for b in supp.get("blockers") or []:
            bs = str(b)
            if bs not in all_blockers:
                all_blockers.append(bs)
            bt = _classify_blocker(bs)
            _merge_typed_blockers(typed_all, bs, bt)

    cands = _build_candidates(typed_all)

    # Residual manifest: 最低軸の focused カードを候補に合流（重複は後で落ちる）
    residual_manifest: Optional[Path] = None
    if seal:
        residual_manifest = seal / "_self_improvement_os" / "residual" / "focused_next_cards_manifest.json"
        if residual_manifest.is_file():
            rman = _read_json(residual_manifest)
            for fa in rman.get("focused_actions") or []:
                cur = str(fa.get("cursor_card") or "").strip()
                vps = str(fa.get("vps_card") or "").strip()
                axis = str(fa.get("axis") or "")
                if not cur or not vps:
                    continue
                bt = {
                    "surface_clean": "surface",
                    "route_authority_clean": "route",
                    "longform_quality_clean": "longform",
                    "density_lock": "density",
                    "baseline_reflection": "density",
                }.get(axis, _classify_blocker(axis))
                cands.append(
                    CardRec(
                        cur,
                        vps,
                        blocker_types=[bt],
                        rationale=f"residual_focused axis={axis}",
                        auto_apply_allowed=False,
                        system="chat_self_improvement",
                        source_blockers=[f"residual:{axis}"],
                    )
                )
    # 改善 OS・統合ランナーは seal 系に債務があるときフォロー候補として末尾に追加
    if imp.get("overall_loop_ok") is False and not any(
        x.cursor_card == IMPROVEMENT_OS_CARD.cursor_card for x in cands
    ):
        cands.append(
            CardRec(
                IMPROVEMENT_OS_CARD.cursor_card,
                IMPROVEMENT_OS_CARD.vps_card,
                blocker_types=["seal_contract"],
                rationale="self_improvement integrated loop",
                auto_apply_allowed=False,
                system=IMPROVEMENT_OS_CARD.system,
                source_blockers=["overall_loop_ok=false"],
            )
        )

    if k_meta.get("integrated_verdict_ok") is False and kdir:
        if not any(x.cursor_card == KOKUZO_INTEGRATION_CARD.cursor_card for x in cands):
            cands.append(
                CardRec(
                    KOKUZO_INTEGRATION_CARD.cursor_card,
                    KOKUZO_INTEGRATION_CARD.vps_card,
                    blocker_types=["seal_contract"],
                    rationale="kokuzo learning-improvement integration",
                    auto_apply_allowed=False,
                    system=KOKUZO_INTEGRATION_CARD.system,
                    source_blockers=["integrated_verdict_ok=false"],
                )
            )

    if supp_path and supp_path.is_file() and any(typed_all.get("surface")):
        if not any(x.cursor_card == SUPPLEMENT_HINT.cursor_card for x in cands):
            cands.append(
                CardRec(
                    SUPPLEMENT_HINT.cursor_card,
                    SUPPLEMENT_HINT.vps_card,
                    blocker_types=["surface"],
                    rationale="completion supplement dispatch",
                    auto_apply_allowed=False,
                    system=SUPPLEMENT_HINT.system,
                    source_blockers=typed_all.get("surface", [])[:5],
                )
            )

    ranked = _dedupe(cands)
    next_q, pending_q = _split_queues(ranked, max_next)

    # seal が解決できない場合でも「観測を先に取る」1 手を提示
    if not seal and not next_q:
        sc = TYPE_DEFAULT_CARDS["seal_contract"]
        next_q = [
            {
                "cursor_card": sc.cursor_card,
                "vps_card": sc.vps_card,
                "blocker_types": ["seal_contract"],
                "rationale": "seal 未観測 — 先に runtime / worldclass seal を取得",
                "auto_apply_allowed": sc.auto_apply_allowed,
                "system": sc.system,
                "source_blockers": ["no_seal_dir"],
                "priority_rank": 1,
            }
        ]

    manual_apply_required: List[Dict[str, Any]] = []
    for row in next_q + pending_q:
        if not row.get("auto_apply_allowed"):
            manual_apply_required.append(
                {
                    "cursor_card": row["cursor_card"],
                    "vps_card": row["vps_card"],
                    "reason": "high_risk_or_operator_gated",
                    "note": "queue に載るが自動適用しない（手動 VPS / 承認後に実行）",
                }
            )

    final_j: Dict[str, Any] = {}
    if seal:
        final_j = _read_json(seal / "final_verdict.json")

    if not seal:
        unified_status = "red"
    elif imp.get("structural_ok") is False:
        unified_status = "red"
    elif not any(typed_all.values()) and bool(final_j.get("chat_ts_overall_100")):
        iv = k_meta.get("integrated_verdict_ok")
        lc = k_meta.get("learning_chain_ok")
        if kdir and (iv is False or lc is False):
            unified_status = "yellow"
        else:
            unified_status = "green"
    else:
        unified_status = "yellow"

    primary_next = next_q[0]["cursor_card"] if next_q else None

    manifest = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "inputs": {
            "seal_dir": str(seal) if seal else None,
            "kokuzo_out_dir": str(kdir) if kdir else None,
            "kokuzo_learning_improvement_os": str(kokuzo_os_path) if kokuzo_os_path else None,
        },
        "systems": {
            "conversation_completion": seal_meta,
            "chat_self_improvement": imp,
            "kokuzo_learning": k_meta,
            "maintenance_supplement": {"next_card_dispatch": str(supp_path) if supp_path else None},
        },
        "typed_blockers": {k: v for k, v in typed_all.items() if v},
        "blocker_registry": "api/automation/chat_ts_completion_dispatch_registry_v1.json",
    }

    queue_doc = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "unified_status": unified_status,
        "primary_next_card": primary_next,
        "next_queue": next_q,
        "pending_queue": pending_q,
        "manual_apply_required": manual_apply_required,
        "policy": {
            "max_next_cards": max_next,
            "type_priority": TYPE_PRIORITY,
            "fail_next_cursor_card": FAIL_NEXT,
        },
    }

    integrated_final = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "vps_card": VPS_CARD,
        "orchestrator": {
            "unified_status": unified_status,
            "primary_next_card": primary_next,
            "typed_blockers": manifest["typed_blockers"],
            "all_blockers_sample": all_blockers[:40],
        },
        "ready_to_run": next_q,
        "defer": pending_q,
        "fail_next_cursor_card": FAIL_NEXT,
    }

    (out_dir / "full_orchestrator_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "full_orchestrator_queue.json").write_text(
        json.dumps(queue_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "blocked_cards.json").write_text(
        json.dumps(
            {
                "version": VERSION,
                "generatedAt": _utc_now_iso(),
                "blocked": blocked,
                "manual_apply_required": manual_apply_required,
                "note": "blocked は前提欠落など。manual_apply_required は queue 掲載でも自動適用しないカード",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (out_dir / "integrated_final_verdict.json").write_text(
        json.dumps(integrated_final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_VPS_V1").write_text(
        f"{VPS_CARD}\n{_utc_now_iso()}\nunified_status={unified_status}\nprimary_next={primary_next}\n",
        encoding="utf-8",
    )

    summary = {
        "ok": True,
        "out_dir": str(out_dir),
        "unified_status": unified_status,
        "primary_next_card": primary_next,
        "next_count": len(next_q),
    }
    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
