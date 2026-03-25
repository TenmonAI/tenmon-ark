#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CHAT_REFACTOR_GOVERNOR_V1 — observer / planner / card generator の結果から
自動適用・提案止め・人手承認・rollback を決定する統治層（コード改変なし）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

CARD = "TENMON_CHAT_REFACTOR_GOVERNOR_V1"
SCHEMA_VERSION = 1
FAIL_NEXT = "TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_CHAT_REFACTOR_GOVERNOR_VPS_V1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _risk_from_partition(theme: str, rp: Dict[str, Any]) -> Optional[str]:
    """theme id が high/medium/low のどのリストに含まれるか推定。"""
    for bucket, key in (
        ("high", "high_risk_targets"),
        ("medium", "medium_risk_targets"),
        ("low", "low_risk_targets"),
    ):
        for t in rp.get(key) or []:
            if isinstance(t, dict) and str(t.get("id", "")) == theme:
                return bucket
    return None


def _signals_default(signals: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """build / health / audit / runtime がすべて True なら rollback 不要。"""
    triggers: List[str] = []
    keys = ("build_ok", "health_ok", "audit_ok", "runtime_ok")
    for k in keys:
        if k in signals and signals[k] is False:
            triggers.append(k.replace("_ok", "_fail"))
    ok = len(triggers) == 0
    return ok, triggers


def judge(
    obs: Dict[str, Any],
    plan: Dict[str, Any],
    gen_man: Dict[str, Any],
    risk_partition: Dict[str, Any],
    signals: Dict[str, Any],
) -> Dict[str, Any]:
    lines = int(obs.get("line_count") or 0)
    critical_size = lines >= 25000

    item: Dict[str, Any] = {}
    if isinstance(gen_man.get("focused_item"), dict):
        item = gen_man["focused_item"]
    if not item:
        pl = plan.get("prioritized_items")
        if isinstance(pl, list) and pl and isinstance(pl[0], dict):
            item = pl[0]

    theme = str(item.get("theme", "") or "")
    risk_item = str(item.get("risk", "low")).lower()
    rp_hint = _risk_from_partition(theme, risk_partition)
    if rp_hint == "high":
        risk = "high"
    elif rp_hint == "medium" and risk_item == "low":
        risk = "medium"
    else:
        risk = risk_item if risk_item in ("low", "medium", "high") else "low"

    signals_ok, signal_triggers = _signals_default(signals)
    rollback_required = not signals_ok

    # フォーカス先の generator モード（あれば優先）
    pairs = gen_man.get("pairs") if isinstance(gen_man.get("pairs"), list) else []
    mode = ""
    if pairs and isinstance(pairs[0], dict):
        mode = str(pairs[0].get("mode") or "")
    if mode == "proposal_gated":
        risk = "high"

    auto_apply_allowed = False
    proposal_only = False
    gated_apply = False
    human_gate_required = False

    if risk == "low":
        auto_apply_allowed = True
        proposal_only = False
        gated_apply = False
        human_gate_required = False
    elif risk == "medium":
        auto_apply_allowed = False
        proposal_only = True
        gated_apply = True
        human_gate_required = False
    else:
        auto_apply_allowed = False
        proposal_only = True
        gated_apply = False
        human_gate_required = True

    if rollback_required:
        auto_apply_allowed = False
        human_gate_required = True
        proposal_only = True

    if critical_size:
        auto_apply_allowed = False
        human_gate_required = True
        proposal_only = True

    has_cursor = bool(gen_man.get("cursor_card"))
    if not has_cursor:
        auto_apply_allowed = False
        human_gate_required = True

    recommended_card_kind = "cursor_auto_apply"
    if risk == "high" or mode == "proposal_gated":
        recommended_card_kind = "proposal_gated"
    elif risk == "medium":
        recommended_card_kind = "gated_apply"
    if human_gate_required and risk != "high":
        recommended_card_kind = "human_review"

    gate_notes: List[str] = [
        "no_blind_chat_ts_trunk_rewrite",
        "pass_only_seal: downstream must check seal_allowed",
    ]
    if risk in ("medium", "high"):
        gate_notes.append("elevated_risk:proposal_or_gate")
    if critical_size:
        gate_notes.append("critical_file_size:mandatory_split_campaign")
    if rollback_required:
        gate_notes.append("rollback_signals:" + ",".join(signal_triggers))

    status = "PASS"
    if critical_size or rollback_required or not has_cursor:
        status = "FAIL"

    governor_pass = status == "PASS"
    seal_allowed = governor_pass and not rollback_required and not critical_size

    integrated_cycle_ok = governor_pass and has_cursor

    rollback_body = {
        "version": 1,
        "rollback_required": rollback_required,
        "triggers": signal_triggers,
        "notes": [] if signals_ok else ["one_or_more_pipeline_signals_failed"],
    }

    dispatch_action = "continue"
    if status == "FAIL":
        dispatch_action = "retry_governor"
    elif human_gate_required:
        dispatch_action = "human_gate"
    elif proposal_only and not auto_apply_allowed:
        dispatch_action = "proposal_only"

    next_dispatch = {
        "version": 1,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "dispatch": dispatch_action,
        "recommended_card_kind": recommended_card_kind,
        "on_fail_cursor_card": FAIL_NEXT,
        "reason": ""
        if status == "PASS"
        else ",".join(
            [x for x in ["critical_size" if critical_size else "", "rollback" if rollback_required else "", "no_cursor" if not has_cursor else ""] if x]
        ),
    }

    body: Dict[str, Any] = {
        "version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "status": status,
        "governor_pass": governor_pass,
        "seal_allowed": seal_allowed,
        "integrated_cycle_ok": integrated_cycle_ok,
        "policy": {
            "auto_apply_allowed": auto_apply_allowed,
            "proposal_only": proposal_only,
            "gated_apply": gated_apply,
            "human_gate_required": human_gate_required,
            "rollback_required": rollback_required,
        },
        "risk": risk,
        "theme": theme,
        "risk_partition_summary": {
            "low_n": len(risk_partition.get("low_risk_targets") or []),
            "medium_n": len(risk_partition.get("medium_risk_targets") or []),
            "high_n": len(risk_partition.get("high_risk_targets") or []),
        },
        "recommended_card_kind": recommended_card_kind,
        "signals_used": {k: signals.get(k, True) for k in ("build_ok", "health_ok", "audit_ok", "runtime_ok")},
        "rollback_decision": rollback_body,
        "next_card_dispatch": next_dispatch,
        "fail_next_cursor_card": FAIL_NEXT,
        "vps_validation_card": VPS_CARD,
        "gate_notes": gate_notes,
        "critical_file_size": critical_size,
        "high_risk_cursor_only": risk in ("high", "medium"),
        # ランナー互換
        "automation_adoption_chat_ts": auto_apply_allowed,
    }

    return body


def write_sidecars(body: Dict[str, Any], out_verdict: Path) -> Dict[str, str]:
    out_verdict.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out_verdict.write_text(text, encoding="utf-8")
    base = out_verdict.parent
    paths: Dict[str, str] = {}
    gv = base / "governance_verdict.json"
    gv.write_text(text, encoding="utf-8")
    paths["governance_verdict"] = str(gv)

    nd = body.get("next_card_dispatch") or {}
    npath = base / "next_card_dispatch.json"
    npath.write_text(json.dumps(nd, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["next_card_dispatch"] = str(npath)

    rb = body.get("rollback_decision") or {}
    rpath = base / "rollback_decision.json"
    rpath.write_text(json.dumps(rb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["rollback_decision"] = str(rpath)

    fv = {
        "version": 1,
        "card": VPS_CARD,
        "governor_pass": bool(body.get("governor_pass")),
        "seal_allowed": bool(body.get("seal_allowed")),
        "status": body.get("status"),
        "fail_next_cursor_card": body.get("fail_next_cursor_card"),
        "policy": body.get("policy"),
    }
    fv_path = base / "final_verdict.json"
    fv_path.write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["final_verdict"] = str(fv_path)
    paths["chat_refactor_governor_verdict"] = str(out_verdict)
    return paths


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--observation-json", required=True)
    ap.add_argument("--plan-json", required=True)
    ap.add_argument("--generator-manifest", required=True)
    ap.add_argument("--risk-partition-json", default="", help="risk_partition.json（省略時は plan から合成）")
    ap.add_argument("--signals-json", default="", help="build_ok/health_ok/audit_ok/runtime_ok の bool")
    ap.add_argument("--out-verdict", default="", help="従来: chat_refactor_governor_verdict.json 相当")
    ap.add_argument("--enforce-exit", action="store_true", help="governor_pass が false なら exit 1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args(list(argv) if argv is not None else None)

    obs = _read_json(Path(args.observation_json))
    plan = _read_json(Path(args.plan_json))
    gen_man = _read_json(Path(args.generator_manifest))
    rp = _read_json(Path(args.risk_partition_json)) if args.risk_partition_json else {}
    if not rp:
        rp = {
            "version": 1,
            "low_risk_targets": plan.get("low_risk_targets") or [],
            "medium_risk_targets": plan.get("medium_risk_targets") or [],
            "high_risk_targets": plan.get("high_risk_targets") or [],
        }
    signals = _read_json(Path(args.signals_json)) if args.signals_json else {}

    body = judge(obs, plan, gen_man, rp, signals)

    paths: Dict[str, str] = {}
    if args.out_verdict:
        paths = write_sidecars(body, Path(args.out_verdict))
        body["output_paths"] = paths

    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))

    if args.enforce_exit and not body.get("governor_pass"):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(None))
