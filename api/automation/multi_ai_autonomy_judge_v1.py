#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_AUTONOMY_RESULT_RETURN_AND_ACCEPTANCE_LOCK_CURSOR_AUTO_V1

Cursor result return 契約の検証と acceptance minimum gate による機械判定（PASS / FAIL / HOLD）。
結果は multi_ai_autonomy_last_judgement.json に保存可能。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MULTI_AI_AUTONOMY_RESULT_RETURN_AND_ACCEPTANCE_LOCK_CURSOR_AUTO_V1"
CONTRACT_FN = "multi_ai_autonomy_result_return_contract_v1.json"
GATE_FN = "multi_ai_autonomy_acceptance_gate_v1.json"
LAST_JUDGEMENT_FN = "multi_ai_autonomy_last_judgement.json"
ALLOWED_STATUS = frozenset({"PASS", "FAIL", "HOLD", "NOOP", "TIMEOUT"})


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_contract(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / CONTRACT_FN)


def load_gate(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / GATE_FN)


def validate_result_return_payload(d: dict[str, Any], contract: dict[str, Any]) -> tuple[bool, list[str]]:
    req = contract.get("required") if isinstance(contract.get("required"), list) else []
    errs: list[str] = []
    for k in req:
        if k not in d or d[k] is None:
            errs.append(f"missing_required:{k}")
            continue
        if k == "files_changed" and not isinstance(d[k], list):
            errs.append("files_changed_not_list")
        if k == "diff_stat" and not isinstance(d[k], (dict, str)):
            errs.append("diff_stat_not_object_or_string")
    st = str(d.get("status") or "")
    allowed = contract.get("allowed_status") if isinstance(contract.get("allowed_status"), list) else list(ALLOWED_STATUS)
    if st not in allowed:
        errs.append(f"status_not_allowed:{st}")
    return len(errs) == 0, errs


def normalize_legacy_result_return(raw: dict[str, Any]) -> dict[str, Any]:
    """card_id / changed_files 等を契約キーに寄せる（読み取り専用コピー）。"""
    out = dict(raw)
    if "card" not in out and raw.get("card_id"):
        out["card"] = raw["card_id"]
    if "files_changed" not in out and isinstance(raw.get("changed_files"), list):
        out["files_changed"] = raw["changed_files"]
    return out


def mechanical_verdict_from_status(status: str, gate: dict[str, Any]) -> tuple[str, str]:
    st = str(status or "").upper()
    if st in (gate.get("mechanical_status_fail") or ["FAIL"]):
        return "FAIL", f"mechanical_status:{st}"
    if st in (gate.get("mechanical_status_allow_pass") or ["PASS"]):
        return "PASS", f"mechanical_status:{st}"
    if st in (gate.get("mechanical_status_hold") or ["HOLD", "NOOP", "TIMEOUT"]):
        return "HOLD", f"mechanical_status:{st}"
    return "HOLD", f"mechanical_status_unknown:{st or 'empty'}"


def judge_observer_acceptance(
    observer: dict[str, Any],
    *,
    base_url_set: bool,
    require_audit: bool,
    gate: dict[str, Any],
) -> tuple[str, str]:
    defaults = gate.get("defaults") if isinstance(gate.get("defaults"), dict) else {}
    req_probe = bool(defaults.get("require_probe_aggregate", False))
    req_restart = bool(defaults.get("require_restart_ok", False))

    bs = observer.get("build_status") if isinstance(observer.get("build_status"), dict) else {}
    aud = observer.get("audit_status") if isinstance(observer.get("audit_status"), dict) else {}
    pr = observer.get("last_probe_status") if isinstance(observer.get("last_probe_status"), dict) else {}
    sv = observer.get("service_status") if isinstance(observer.get("service_status"), dict) else {}

    if bs.get("ran_check") and not bs.get("ok"):
        return "FAIL", "build_failed"
    if base_url_set and require_audit:
        if aud.get("skipped"):
            return "FAIL", "audit_required_but_skipped"
        if not aud.get("ok"):
            return "FAIL", "audit_abnormal"
    if not sv.get("skipped") and not sv.get("ok"):
        return "FAIL", "healthcheck_failed"
    if req_probe and not pr.get("aggregate_ok_signal"):
        return "FAIL", "probe_failed"
    if req_restart:
        rs = observer.get("restart_status") if isinstance(observer.get("restart_status"), dict) else {}
        if not rs.get("skipped") and not rs.get("ok"):
            return "FAIL", "restart_failed"
    return "PASS", "observer_acceptance_ok"


def judge_observer_only_bundle(
    *,
    auto_dir: Path,
    observer: dict[str, Any],
    base_url_set: bool,
    require_audit: bool,
) -> dict[str, Any]:
    """Cursor フェーズ無し時: VPS observer のみで acceptance 判定。"""
    gate = load_gate(auto_dir)
    obs = observer if isinstance(observer, dict) else {}
    over, owhy = judge_observer_acceptance(
        obs,
        base_url_set=base_url_set,
        require_audit=require_audit,
        gate=gate,
    )
    if over == "PASS":
        verdict, reason = "PASS", owhy
    elif over == "FAIL":
        verdict, reason = "FAIL", owhy
    else:
        verdict, reason = "HOLD", owhy
    return {
        "schema": "MULTI_AI_AUTONOMY_LAST_JUDGEMENT_V1",
        "generated_at": _utc_iso(),
        "verdict": verdict,
        "reason": reason,
        "result_return_path": None,
        "result_return_valid": None,
        "mechanical_status": None,
        "acceptance_gate_profile": "observer_only",
        "observer_snapshot": {
            "build_ok": (obs.get("build_status") or {}).get("ok"),
            "audit": obs.get("audit_status"),
            "probe": obs.get("last_probe_status"),
        },
        "checks": [{"id": "observer_acceptance", "ok": over == "PASS", "detail": owhy}],
    }


def judge_combined(
    *,
    auto_dir: Path,
    result_return: dict[str, Any] | None,
    result_return_source: str | None,
    observer: dict[str, Any] | None,
    base_url_set: bool,
    require_audit: bool,
) -> dict[str, Any]:
    contract = load_contract(auto_dir)
    gate = load_gate(auto_dir)
    checks: list[dict[str, Any]] = []
    verdict = "HOLD"
    reason = "uninitialized"

    if result_return is None:
        checks.append({"id": "result_return_present", "ok": False, "detail": "missing"})
        out = {
            "schema": "MULTI_AI_AUTONOMY_LAST_JUDGEMENT_V1",
            "generated_at": _utc_iso(),
            "verdict": "HOLD",
            "reason": "result_return_missing",
            "result_return_path": result_return_source,
            "result_return_valid": False,
            "mechanical_status": None,
            "acceptance_gate_profile": "combined",
            "observer_snapshot": observer,
            "checks": checks,
        }
        return out

    rr = normalize_legacy_result_return(result_return)
    ok_v, errs = validate_result_return_payload(rr, contract)
    checks.append({"id": "result_return_contract", "ok": ok_v, "detail": ";".join(errs) if errs else "ok"})
    if not ok_v:
        return {
            "schema": "MULTI_AI_AUTONOMY_LAST_JUDGEMENT_V1",
            "generated_at": _utc_iso(),
            "verdict": "HOLD",
            "reason": "parse_error_or_contract_violation",
            "result_return_path": result_return_source,
            "result_return_valid": False,
            "mechanical_status": str(rr.get("status")),
            "acceptance_gate_profile": "combined",
            "observer_snapshot": observer,
            "checks": checks,
        }

    mver, mwhy = mechanical_verdict_from_status(str(rr.get("status") or ""), gate)
    checks.append({"id": "mechanical_status", "ok": mver == "PASS", "detail": mwhy})

    obs = observer if isinstance(observer, dict) else {}
    over, owhy = ("PASS", "observer_skipped")
    if obs:
        over, owhy = judge_observer_acceptance(
            obs,
            base_url_set=base_url_set,
            require_audit=require_audit,
            gate=gate,
        )
    checks.append({"id": "observer_acceptance", "ok": over == "PASS", "detail": owhy})

    if mver == "FAIL":
        verdict, reason = "FAIL", mwhy
    elif mver == "HOLD":
        verdict, reason = "HOLD", mwhy
    elif mver == "PASS":
        if not obs:
            verdict, reason = "HOLD", "acceptance_minimum_observer_missing"
        elif over == "FAIL":
            verdict, reason = "FAIL", owhy
        elif over == "PASS":
            verdict, reason = "PASS", "result_return_and_observer_pass"
        else:
            verdict, reason = "HOLD", owhy
    else:
        verdict, reason = "HOLD", mwhy

    return {
        "schema": "MULTI_AI_AUTONOMY_LAST_JUDGEMENT_V1",
        "generated_at": _utc_iso(),
        "verdict": verdict,
        "reason": reason,
        "result_return_path": result_return_source,
        "result_return_valid": True,
        "mechanical_status": str(rr.get("status")),
        "acceptance_gate_profile": "combined",
        "observer_snapshot": {
            "build_ok": (obs.get("build_status") or {}).get("ok"),
            "audit": obs.get("audit_status"),
            "probe": obs.get("last_probe_status"),
        },
        "checks": checks,
    }


def write_last_judgement(auto_dir: Path, judgement: dict[str, Any]) -> None:
    _write_json(auto_dir / LAST_JUDGEMENT_FN, judgement)


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--result-json", type=str, default="", help="multi_ai_autonomy_result_return.json 等")
    ap.add_argument("--observer-json", type=str, default="", help="observe() 互換 JSON")
    ap.add_argument("--no-audit-required", action="store_true")
    ap.add_argument("--write", action="store_true", help=f"{LAST_JUDGEMENT_FN} に保存")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    rr_path = Path(args.result_json) if args.result_json else None
    obs_path = Path(args.observer_json) if args.observer_json else None

    rr: dict[str, Any] | None = None
    src = None
    if rr_path and rr_path.is_file():
        try:
            rr = json.loads(rr_path.read_text(encoding="utf-8"))
            if not isinstance(rr, dict):
                rr = None
        except Exception:
            rr = None
        src = str(rr_path)
    obs = _read_json(obs_path) if obs_path and obs_path.is_file() else {}
    base_url_set = bool((obs.get("audit_status") or {}).get("url"))

    j = judge_combined(
        auto_dir=auto_dir,
        result_return=rr,
        result_return_source=src,
        observer=obs if obs else None,
        base_url_set=base_url_set,
        require_audit=not args.no_audit_required,
    )
    if args.write:
        write_last_judgement(auto_dir, j)
    print(json.dumps({"verdict": j.get("verdict"), "reason": j.get("reason")}, ensure_ascii=False))
    sys.exit(0 if j.get("verdict") == "PASS" else (3 if j.get("verdict") == "FAIL" else 2))


if __name__ == "__main__":
    main()
