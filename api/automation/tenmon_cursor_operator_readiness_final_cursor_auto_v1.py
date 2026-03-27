#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_OPERATOR_READINESS_FINAL_CURSOR_AUTO_V1

cursor_operator_ready を最終判定する。
- 既定は dry observation（書き込みなし）
- --apply で master / bundle へ最小反映
- fail-closed
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_OPERATOR_READINESS_FINAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_operator_readiness_final_cursor_auto_v1.json"
NEXT_FAIL = "TENMON_CURSOR_OPERATOR_AUTONOMY_TRACE_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _is_under_repo(repo: Path, p: Path) -> bool:
    try:
        rr = repo.resolve()
        pp = p.resolve()
        return rr == pp or rr in pp.parents
    except Exception:
        return True


def _pick_master(auto: Path) -> tuple[Path, dict[str, Any]]:
    p1 = auto / "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
    j1 = _read_json(p1)
    if j1:
        return p1, j1
    p2 = auto / "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"
    return p2, _read_json(p2)


def _pick_effective_operator_entry(bundle: dict[str, Any]) -> dict[str, Any]:
    latest = bundle.get("latest_current_run_entry")
    if isinstance(latest, dict):
        eg = latest.get("execution_gate")
        if isinstance(eg, dict) and eg.get("gate_success") is True:
            return latest
    cur = bundle.get("current_run_entry")
    if isinstance(cur, dict):
        eg = cur.get("execution_gate")
        if isinstance(eg, dict) and eg.get("gate_success") is True:
            return cur
    bridge = bundle.get("cursor_operator_bridge_v1")
    if isinstance(bridge, dict):
        for k in ("latest_current_run_entry", "current_run_entry"):
            e = bridge.get(k)
            if not isinstance(e, dict):
                continue
            eg = e.get("execution_gate")
            if isinstance(eg, dict) and eg.get("gate_success") is True:
                return e
    return latest if isinstance(latest, dict) else (cur if isinstance(cur, dict) else {})


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="master / bundle へ反映")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    if (os.environ.get("TENMON_PDCA_SKIP_PROBES") or "").strip().lower() in ("1", "true", "yes"):
        out = {
            "ok": False,
            "card": CARD,
            "cursor_operator_ready": False,
            "result_bundle_updated": False,
            "next_card_if_fail": NEXT_FAIL,
            "rollback_used": False,
            "queue_error": "skip_probes_set",
            "observation_ok": False,
        }
        _atomic_write_json(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    safe_root_env = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    safe_root_ok = False
    if safe_root_env:
        safe_root_ok = not _is_under_repo(repo, Path(os.path.expanduser(safe_root_env)))

    queue = _read_json(auto / "remote_cursor_queue.json")
    sf = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    bridge = _read_json(auto / "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json")
    bundle = _read_json(auto / "remote_cursor_result_bundle.json")
    master_path, master = _pick_master(auto)

    cur = bundle.get("current_run_entry") if isinstance(bundle.get("current_run_entry"), dict) else {}
    latest = bundle.get("latest_current_run_entry") if isinstance(bundle.get("latest_current_run_entry"), dict) else {}
    effective = _pick_effective_operator_entry(bundle)
    eg = effective.get("execution_gate") if isinstance(effective.get("execution_gate"), dict) else {}
    next_card = str(effective.get("next_card") or "")

    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    active_cur = [x for x in items if isinstance(x, dict) and x.get("current_run") is True]
    queue_single_flight_preserved = False
    queue_error: str | None = None
    if len(active_cur) == 1:
        qcard = str(active_cur[0].get("cursor_card") or active_cur[0].get("card") or "")
        scard = str(sf.get("current_card") or "")
        queue_single_flight_preserved = bool(qcard and scard and qcard == scard)
        if not queue_single_flight_preserved:
            queue_error = "single_flight_mismatch"
    elif len(active_cur) > 1:
        queue_error = "duplicate_current_run"
    else:
        queue_error = "missing_current_run"

    next_on_pass = str((bundle.get("autonomy_execution_gate_policy_v1") or {}).get("nextOnPass") or "")

    condition_map = {
        "safe_summary_root_ok": safe_root_ok,
        "queue_validation_ok": queue_error is None,
        "current_run_entry_present": bool(cur),
        "latest_current_run_entry_present": bool(latest or effective),
        "execution_gate_success": bool(eg.get("gate_success") is True),
        "result_bundle_updated": bool(bundle.get("updatedAt")),
        "next_card_on_pass": bool(next_on_pass and next_card == next_on_pass),
        "queue_single_flight_preserved": queue_single_flight_preserved,
        "next_card_if_fail_ok": bool(bridge.get("next_card_if_fail") in (None, "")),
        "skip_probes_unset": True,
    }
    cursor_operator_ready = all(condition_map.values())

    result_bundle_updated = False
    rollback_used = False
    if args.apply:
        if not safe_root_ok:
            cursor_operator_ready = False
        else:
            try:
                if master:
                    m2 = dict(master)
                    m2["cursor_operator_ready"] = bool(cursor_operator_ready)
                    m2["generated_at"] = _utc()
                    m2["cursor_operator_readiness_final_v1"] = {
                        "card": CARD,
                        "updated_at": _utc(),
                        "queue_ok": queue_error is None,
                        "queue_error": queue_error,
                    }
                    _atomic_write_json(master_path, m2)

                if bundle:
                    b2 = dict(bundle)
                    b2["cursor_operator_readiness_final_v1"] = {
                        "card": CARD,
                        "updated_at": _utc(),
                        "cursor_operator_ready": bool(cursor_operator_ready),
                        "conditions": condition_map,
                    }
                    b2["updatedAt"] = _utc()
                    _atomic_write_json(auto / "remote_cursor_result_bundle.json", b2)
                    result_bundle_updated = True
            except OSError:
                rollback_used = True
                result_bundle_updated = False
                cursor_operator_ready = False

    out = {
        "ok": bool(cursor_operator_ready and (result_bundle_updated if args.apply else True)),
        "card": CARD,
        "cursor_operator_ready": bool(cursor_operator_ready),
        "result_bundle_updated": bool(result_bundle_updated),
        "next_card_if_fail": None if cursor_operator_ready else NEXT_FAIL,
        "rollback_used": rollback_used,
        "queue_error": queue_error,
        "observation_ok": bool(all(v for v in condition_map.values() if v is not None)),
    }
    _atomic_write_json(auto / OUT_JSON, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
