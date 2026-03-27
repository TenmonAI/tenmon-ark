#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_PLANNER_AND_FRACTAL_TRUTH_REJUDGE_CURSOR_AUTO_V1

planner_ready / fractal_truth_worldclass_ready のみ再判定し、根拠が揃えば master を更新。
--apply は TENMON_AUTONOMY_SAFE_SUMMARY_ROOT 必須（repo 外）。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_PLANNER_AND_FRACTAL_TRUTH_REJUDGE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_planner_and_fractal_truth_rejudge_cursor_auto_v1.json"
MASTER_FULL = "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
MASTER_FALLBACK = "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"
NEXT_FAIL = "TENMON_PLANNER_AND_FRACTAL_TRUTH_REJUDGE_TRACE_CURSOR_AUTO_V1"


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
    p1 = auto / MASTER_FULL
    j1 = _read_json(p1)
    if j1:
        return p1, j1
    p2 = auto / MASTER_FALLBACK
    return p2, _read_json(p2)


def _latest_bundle_entry(bundle: dict[str, Any]) -> dict[str, Any]:
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


def _run_planner_dry(auto: Path, api: Path) -> tuple[int, dict[str, Any]]:
    p = auto / "tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py"
    if not p.is_file():
        return 2, {}
    r = subprocess.run(
        [sys.executable, str(p), "--dry-run", "--verbose"],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=300,
        env={**os.environ},
    )
    raw = (r.stdout or "").strip()
    j: dict[str, Any] = {}
    if raw:
        try:
            o = json.loads(raw)
            if isinstance(o, dict):
                j = o
        except json.JSONDecodeError:
            for ln in reversed([x.strip() for x in raw.splitlines() if x.strip().startswith("{")]):
                try:
                    o = json.loads(ln)
                    if isinstance(o, dict):
                        j = o
                        break
                except json.JSONDecodeError:
                    continue
    return r.returncode, j


def _planner_heuristic_ok(
    pj: dict[str, Any],
    queue: dict[str, Any],
    sf: dict[str, Any],
    bundle: dict[str, Any],
    bridge: dict[str, Any],
) -> tuple[bool, str]:
    if not (pj.get("planner_ready") is True and pj.get("queue_ready") is True and pj.get("single_flight_ready") is True):
        return False, "planner_queue_or_single_flight_false"
    for k in ("duplicate_reject_ok", "stale_running_cleanup_ok", "state_persistence_ok"):
        if pj.get(k) is not True:
            return False, f"{k}_false"
    ch = pj.get("checks") if isinstance(pj.get("checks"), dict) else {}
    if not ch:
        return False, "missing_verbose_checks"
    try:
        if int(ch.get("running_current_run_count", 99)) > 1:
            return False, "multiple_running_current_run"
        if int(ch.get("mainline_current_run_count", 99)) > 1:
            return False, "mainline_concurrency_gt_1"
    except (TypeError, ValueError):
        return False, "invalid_running_counts"
    if ch.get("blocked_reason_ok") is False:
        return False, "blocked_reason_not_ok"
    if ch.get("pending_duplicate_card_ok") is False:
        return False, "pending_duplicate_card_not_ok"
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    if len(items) == 0:
        return False, "queue_empty"
    if _queue_duplicate_current_run(queue):
        return False, "duplicate_current_run_in_queue"
    if not (
        str(sf.get("current_card") or "").strip()
        or (isinstance(sf.get("queued_cards"), list) and len(sf["queued_cards"]) > 0)
    ):
        return False, "single_flight_no_current_or_queued_card"
    ent = _latest_bundle_entry(bundle)
    if not ent:
        return False, "bundle_no_latest_entry"
    if not _bundle_has_operator_gate(bundle) and bridge.get("execution_gate_ready") is not True:
        return False, "no_gate_success_and_bridge_not_ready"
    return True, "heuristic_prereq_met_excluding_orphan_cleanup"


def _bundle_has_operator_gate(bundle: dict[str, Any]) -> bool:
    for key in ("latest_current_run_entry", "current_run_entry"):
        e = bundle.get(key)
        if not isinstance(e, dict):
            continue
        eg = e.get("execution_gate")
        if isinstance(eg, dict) and eg.get("gate_success") is True:
            return True
    br = bundle.get("cursor_operator_bridge_v1")
    if isinstance(br, dict):
        for k in ("latest_current_run_entry", "current_run_entry"):
            e = br.get(k)
            if not isinstance(e, dict):
                continue
            eg = e.get("execution_gate")
            if isinstance(eg, dict) and eg.get("gate_success") is True:
                return True
    return False


def _queue_duplicate_current_run(queue: dict[str, Any]) -> bool:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    n = sum(1 for x in items if isinstance(x, dict) and x.get("current_run") is True)
    return n > 1


def _classify_planner(
    *,
    rc: int,
    pj: dict[str, Any],
    queue: dict[str, Any],
    sf: dict[str, Any],
    bundle: dict[str, Any],
    bridge: dict[str, Any],
) -> tuple[bool, str, str]:
    """(new_value, bucket, reason)"""
    if not isinstance(sf, dict) or not str(sf.get("card") or "").strip():
        return False, "REAL_GAP", "single_flight_state_missing"

    if rc != 0 and not pj:
        return False, "REAL_GAP", "planner_subprocess_failed_no_json"

    ok = pj.get("ok") is True
    if rc == 0 and ok:
        return True, "REFRESHABLE", "planner_full_dry_run_ok"

    h_ok, h_reason = _planner_heuristic_ok(pj, queue, sf, bundle, bridge)
    if h_ok:
        return True, "REFRESHABLE", h_reason

    if pj.get("planner_ready") is True and pj.get("queue_ready") is True:
        return False, "NEEDS_REJUDGE", h_reason

    return False, "REAL_GAP", "planner_core_flags_false"


def _classify_fractal(
    fractal: dict[str, Any],
    master: dict[str, Any],
    score: dict[str, Any],
) -> tuple[bool, str, str]:
    if fractal.get("ok") is True and fractal.get("worldclass_truth_output_ready") is True:
        return True, "REFRESHABLE", "fractal_seal_file_pass"

    axes = fractal.get("axes") if isinstance(fractal.get("axes"), dict) else {}
    keys = (
        "khs_root_fixed",
        "fractal_law_kernel_ready",
        "mythogenesis_mapper_ready",
        "mapping_layer_ready",
        "truth_structure_reasoning_ready",
        "material_digest_ledger_ready",
        "digest_state_visible",
        "single_source_preserved",
        "beautiful_output_preserved",
    )
    core_axes_ok = all(axes.get(k) is True for k in keys)
    mixed = fractal.get("mixed_question_quality")
    if mixed is None:
        mixed = axes.get("mixed_question_quality")
    if mixed is not True:
        return False, "REAL_GAP", "mixed_question_quality_not_ok"

    mt = master.get("worktree_converged") is True
    ft_wt = fractal.get("worktree_converged") is True
    if core_axes_ok and mixed is True and mt and not ft_wt:
        return True, "REFRESHABLE", "stale_worktree_flag_in_seal_vs_master"

    if score.get("worldclass_ready") is True and core_axes_ok and mixed is True:
        return True, "REFRESHABLE", "scorecard_worldclass_ready_with_fractal_axes"

    return False, "NEEDS_REJUDGE", "fractal_seal_not_ok_insufficient_refresh_path"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    safe = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if args.apply:
        if not safe:
            out = {
                "ok": False,
                "card": CARD,
                "planner_ready": False,
                "fractal_truth_worldclass_ready": False,
                "next_card_if_fail": NEXT_FAIL,
                "error": "TENMON_AUTONOMY_SAFE_SUMMARY_ROOT unset",
            }
            _atomic_write_json(auto / OUT_JSON, out)
            print(json.dumps(out, ensure_ascii=False, indent=2))
            return 1
        sp = Path(os.path.expanduser(safe)).resolve()
        if _is_under_repo(repo, sp):
            out = {
                "ok": False,
                "card": CARD,
                "planner_ready": False,
                "fractal_truth_worldclass_ready": False,
                "next_card_if_fail": NEXT_FAIL,
                "error": "unsafe_summary_under_repo",
            }
            _atomic_write_json(auto / OUT_JSON, out)
            print(json.dumps(out, ensure_ascii=False, indent=2))
            return 1

    master_path, master = _pick_master(auto)
    if not master:
        out = {"ok": False, "card": CARD, "error": "missing_master", "next_card_if_fail": NEXT_FAIL}
        _atomic_write_json(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    queue = _read_json(auto / "remote_cursor_queue.json")
    sf = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    bundle = _read_json(auto / "remote_cursor_result_bundle.json")
    bridge = _read_json(auto / "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json")
    fractal = _read_json(auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json")
    score = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    rc, pj = _run_planner_dry(auto, api)
    planner_new, planner_bucket, planner_reason = _classify_planner(
        rc=rc,
        pj=pj,
        queue=queue,
        sf=sf,
        bundle=bundle,
        bridge=bridge,
    )
    fractal_new, fractal_bucket, fractal_reason = _classify_fractal(fractal, master, score)

    evidence_files = [
        str(auto / "remote_cursor_queue.json"),
        str(auto / "tenmon_cursor_single_flight_queue_state.json"),
        str(auto / "remote_cursor_result_bundle.json"),
        str(auto / "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json"),
        str(auto / "tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py"),
        str(auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json"),
        str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        str(auto / "tenmon_material_digest_ledger_v1.json"),
        str(master_path),
    ]

    axes_classification = {
        "planner_ready": planner_bucket,
        "fractal_truth_worldclass_ready": fractal_bucket,
    }

    rejudge_reason = {
        "planner_ready": planner_reason,
        "fractal_truth_worldclass_ready": fractal_reason,
    }

    remaining_gap_reason: dict[str, str | None] = {}
    if not planner_new:
        remaining_gap_reason["planner_ready"] = planner_reason
    else:
        remaining_gap_reason["planner_ready"] = None
    if not fractal_new:
        remaining_gap_reason["fractal_truth_worldclass_ready"] = fractal_reason
    else:
        remaining_gap_reason["fractal_truth_worldclass_ready"] = None

    master_updated = False
    if args.apply:
        m2 = dict(master)
        old_p = m2.get("planner_ready") is True
        old_f = m2.get("fractal_truth_worldclass_ready") is True
        promote_p = planner_new and not old_p
        promote_f = fractal_new and not old_f
        if planner_new:
            m2["planner_ready"] = True
        if fractal_new:
            m2["fractal_truth_worldclass_ready"] = True
        if promote_p or promote_f:
            m2["generated_at"] = _utc()
            m2["planner_fractal_truth_rejudge_v1"] = {
                "card": CARD,
                "updated_at": _utc(),
                "axes_classification": axes_classification,
                "rejudge_reason": rejudge_reason,
                "evidence_files": evidence_files,
                "remaining_gap_reason": remaining_gap_reason,
                "planner_dry_run_exit_code": rc,
            }
            _atomic_write_json(master_path, m2)
            master_updated = True

    both_ok = planner_new and fractal_new
    out: dict[str, Any] = {
        "ok": both_ok,
        "card": CARD,
        "planner_ready": planner_new,
        "fractal_truth_worldclass_ready": fractal_new,
        "axes_classification": axes_classification,
        "rejudge_reason": rejudge_reason,
        "evidence_files": evidence_files,
        "remaining_gap_reason": remaining_gap_reason,
        "master_updated": master_updated,
        "master_json": str(master_path.name),
        "next_card_if_fail": None if both_ok else NEXT_FAIL,
        "generated_at": _utc(),
    }
    _atomic_write_json(auto / OUT_JSON, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if both_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
