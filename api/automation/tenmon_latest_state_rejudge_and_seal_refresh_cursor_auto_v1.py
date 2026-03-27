#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1

目的:
- 12h master 後の false 軸を、最新 state/seal/bundle から再判定する。
- REFRESHABLE は最小限の state refresh のみ実施する（--apply 時）。
- REAL_GAP は false 維持。無理な green 化はしない。

編集対象（このスクリプトが更新し得るもの）:
- tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json（優先）
- tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json（fallback）
- remote_cursor_result_bundle.json（current_run_entry stale 時のみ）
- tenmon_cursor_single_flight_queue_state.json（current_card stale 時のみ）
- tenmon_latest_state_rejudge_and_seal_refresh_cursor_auto_v1.json（出力）
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_latest_state_rejudge_and_seal_refresh_cursor_auto_v1.json"
NEXT_FAIL = "TENMON_CURSOR_OPERATOR_GATE_WAIT_RETRY_TRACE_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _truthy(x: Any) -> bool:
    return x is True


def _target_master(auto: Path) -> tuple[Path, dict[str, Any]]:
    full = auto / "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
    base = auto / "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"
    j_full = _read_json(full)
    if j_full:
        return full, j_full
    return base, _read_json(base)


def _pick_latest_entry(bundle: dict[str, Any]) -> dict[str, Any]:
    latest = bundle.get("latest_current_run_entry")
    if isinstance(latest, dict) and latest:
        return latest
    cur = bundle.get("current_run_entry")
    if isinstance(cur, dict) and cur:
        return cur
    ents = bundle.get("entries")
    if isinstance(ents, list):
        for x in reversed(ents):
            if isinstance(x, dict) and x:
                return x
    return {}


def _has_forensic_entry(bundle: dict[str, Any]) -> bool:
    ents = bundle.get("entries")
    rows = ents if isinstance(ents, list) else []
    for x in reversed(rows):
        if not isinstance(x, dict):
            continue
        fb = x.get("forensic_bundle")
        if isinstance(fb, dict) and isinstance(fb.get("path"), str) and fb.get("path"):
            return True
    return False


def _queue_single_flight_ok(queue: dict[str, Any], sf: dict[str, Any]) -> tuple[bool, str | None]:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    rows = [x for x in items if isinstance(x, dict)]
    cur = [x for x in rows if x.get("current_run") is True]
    if len(cur) > 1:
        return False, "duplicate_current_run"
    sf_card = str(sf.get("current_card") or "").strip()
    if cur:
        q_card = str(cur[0].get("cursor_card") or cur[0].get("card") or "").strip()
        if sf_card and q_card and sf_card != q_card:
            return False, "single_flight_current_card_mismatch"
    return True, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="master/bundle/single-flight を最小更新")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    safe_summary_root = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()

    master_path, master = _target_master(auto)
    bundle_path = auto / "remote_cursor_result_bundle.json"
    queue_path = auto / "remote_cursor_queue.json"
    sf_path = auto / "tenmon_cursor_single_flight_queue_state.json"
    bridge_path = auto / "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json"
    score_path = auto / "tenmon_worldclass_acceptance_scorecard.json"
    seal_path = auto / "tenmon_final_operable_seal.json"
    fractal_path = auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json"
    kcirc_path = auto / "tenmon_knowledge_circulation_worldclass_output_seal_cursor_auto_v1.json"

    if not master:
        out = {
            "ok": False,
            "card": CARD,
            "error": "missing_master_json",
            "execution_gate_wait_retry_ready": False,
            "latest_state_rejudged": False,
            "seal_refreshed": False,
            "rollback_used": False,
            "next_card_if_fail": NEXT_FAIL,
            "generated_at": _utc(),
        }
        _atomic_write_json(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    bundle = _read_json(bundle_path)
    queue = _read_json(queue_path)
    sf = _read_json(sf_path)
    bridge = _read_json(bridge_path)
    score = _read_json(score_path)
    seal = _read_json(seal_path)
    fractal = _read_json(fractal_path)
    kcirc = _read_json(kcirc_path)
    latest_entry = _pick_latest_entry(bundle)
    eg = latest_entry.get("execution_gate") if isinstance(latest_entry.get("execution_gate"), dict) else {}

    # STEP1 classification
    axes_class: dict[str, str] = {}
    axes_new: dict[str, bool] = {}

    execution_gate_ready = bool(_truthy(eg.get("gate_success")) and _truthy(eg.get("audit_pass")) and _truthy(eg.get("probe_pass")))
    axes_class["execution_gate_ready"] = "REFRESHABLE" if execution_gate_ready else "REAL_GAP"
    axes_new["execution_gate_ready"] = execution_gate_ready

    q_ok, q_err = _queue_single_flight_ok(queue, sf)
    queue_ready = bool(q_ok and execution_gate_ready)
    axes_class["queue_ready"] = "REFRESHABLE" if queue_ready else "REAL_GAP"
    axes_new["queue_ready"] = queue_ready

    rollback_ready = bool(bridge.get("failclosed_supervisor_bridge_ready") is True or latest_entry.get("rollback_ready") is True)
    axes_class["rollback_ready"] = "REFRESHABLE" if rollback_ready else "REAL_GAP"
    axes_new["rollback_ready"] = rollback_ready

    forensic_ready = bool(_has_forensic_entry(bundle))
    axes_class["forensic_ready"] = "REFRESHABLE" if forensic_ready else "REAL_GAP"
    axes_new["forensic_ready"] = forensic_ready

    conversation_core_completed = bool(seal.get("conversation_core_completed") is True and seal.get("single_source_ok") is True)
    axes_class["conversation_core_completed"] = "REFRESHABLE" if conversation_core_completed else "NEEDS_REJUDGE"
    axes_new["conversation_core_completed"] = conversation_core_completed

    knowledge_circulation_connected = bool(kcirc.get("knowledge_circulation_ready") is True and kcirc.get("single_source_preserved") is True)
    axes_class["knowledge_circulation_connected"] = "NEEDS_REJUDGE"
    axes_new["knowledge_circulation_connected"] = knowledge_circulation_connected

    fractal_truth_worldclass_ready = bool(fractal.get("ok") is True and fractal.get("worldclass_truth_output_ready") is True)
    axes_class["fractal_truth_worldclass_ready"] = "NEEDS_REJUDGE"
    axes_new["fractal_truth_worldclass_ready"] = fractal_truth_worldclass_ready

    # planner は再判定対象。operator 軸は source が partial/未観測のため REAL_GAP 維持
    axes_class["planner_ready"] = "NEEDS_REJUDGE"
    axes_new["planner_ready"] = bool(master.get("planner_ready") is True)
    axes_class["cursor_operator_ready"] = "REAL_GAP"
    axes_new["cursor_operator_ready"] = bool(master.get("cursor_operator_ready") is True)
    axes_class["mac_operator_ready"] = "REAL_GAP"
    axes_new["mac_operator_ready"] = bool(master.get("mac_operator_ready") is True)

    # 相互排他: 同一軸は refreshed / real_gap / needs_rejudge_unresolved のどれか1つのみ
    refreshed_axes = [k for k, v in axes_new.items() if bool(master.get(k)) is not v and v is True]
    refreshed_set = set(refreshed_axes)
    remaining_real_gaps = [
        k
        for k, c in axes_class.items()
        if c == "REAL_GAP" and axes_new.get(k) is False and k not in refreshed_set
    ]

    # stale cleanup (minimal)
    bundle_updated = False
    bundle_refresh_payload = {
        "card": CARD,
        "updated_at": _utc(),
        "source_master": str(master_path.name),
        "execution_gate_ready": bool(axes_new.get("execution_gate_ready")),
        "queue_ready": bool(axes_new.get("queue_ready")),
        "rollback_ready": bool(axes_new.get("rollback_ready")),
        "forensic_ready": bool(axes_new.get("forensic_ready")),
    }
    if isinstance(bundle.get("latest_current_run_entry"), dict) and bundle.get("current_run_entry") != bundle.get("latest_current_run_entry"):
        bundle["current_run_entry"] = bundle.get("latest_current_run_entry")
        bundle["updatedAt"] = _utc()
        bundle_updated = True

    sf_updated = False
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    cur = [x for x in items if isinstance(x, dict) and x.get("current_run") is True]
    if cur and isinstance(sf, dict):
        q_card = str(cur[0].get("cursor_card") or cur[0].get("card") or "").strip()
        if q_card and str(sf.get("current_card") or "").strip() != q_card:
            sf["current_card"] = q_card
            sf["generated_at"] = _utc()
            sf_updated = True

    master_new = dict(master)
    master_new.update(axes_new)
    master_new["card"] = str(master.get("card") or "")
    master_new["generated_at"] = _utc()
    master_new["state_rejudge_refresh_v1"] = {
        "card": CARD,
        "updated_at": _utc(),
        "source_master": str(master_path.name),
        "axes_classification": axes_class,
        "scorecard_worldclass_ready": bool(score.get("worldclass_ready") is True),
        "bridge_ok": bool(bridge.get("ok") is True),
        "queue_error": q_err,
    }

    # overall ok for this card = state rejudge pipeline success (not "all green")
    card_ok = bool(
        master_new.get("execution_gate_ready") is True
        and master_new.get("queue_ready") is True
        and bundle_path.is_file()
        and queue_path.is_file()
        and sf_path.is_file()
    )

    out = {
        "ok": card_ok,
        "card": CARD,
        "latest_state_rejudged": True,
        "seal_refreshed": bool(seal.get("operable_sealed") is True and seal.get("single_source_ok") is True),
        "execution_gate_wait_retry_ready": bool(execution_gate_ready),
        "bridge_exit_code_zero": bool(bridge.get("ok") is True),
        "audit_pass_after_retry": bool(eg.get("audit_pass") is True),
        "result_bundle_updated": bool(bundle_updated),
        "queue_single_flight_preserved": bool(_queue_single_flight_ok(queue, sf if not sf_updated else {**sf, "current_card": sf.get("current_card")})[0]),
        "refreshed_axes": refreshed_axes,
        "remaining_real_gaps": remaining_real_gaps,
        "rollback_used": False,
        "next_card_if_fail": None if card_ok else NEXT_FAIL,
        "generated_at": _utc(),
    }

    if args.apply and not safe_summary_root:
        out["ok"] = False
        out["next_card_if_fail"] = NEXT_FAIL
        out["error"] = "TENMON_AUTONOMY_SAFE_SUMMARY_ROOT unset"
    elif args.apply:
        _atomic_write_json(master_path, master_new)
        if isinstance(bundle, dict) and bundle_path.is_file():
            bundle["latest_state_rejudge_refresh_v1"] = bundle_refresh_payload
            bundle["updatedAt"] = _utc()
            _atomic_write_json(bundle_path, bundle)
            bundle_updated = True
        if sf_updated:
            _atomic_write_json(sf_path, sf)
        out["result_bundle_updated"] = bool(bundle_updated)
    _atomic_write_json(auto / OUT_JSON, out)

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
