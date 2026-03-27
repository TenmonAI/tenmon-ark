#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FRACTAL_EXPANSION_FAILOVER_AND_AUTONOMY_BRIDGE_CURSOR_AUTO_V1

fractal 主線の if-fail / stale / digest / mixed を next-card に橋渡しし、
autonomy planner / queue / single-flight 契約を観測する（automation のみ・会話コア非改変）。
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FRACTAL_EXPANSION_FAILOVER_AND_AUTONOMY_BRIDGE_CURSOR_AUTO_V1"
BRIDGE_JSON = "tenmon_fractal_expansion_autonomy_bridge_v1.json"
OUT_JSON = "tenmon_fractal_expansion_failover_and_autonomy_bridge_cursor_auto_v1.json"
OUT_MD = "tenmon_fractal_expansion_failover_and_autonomy_bridge_cursor_auto_v1.md"
PLANNER_SCRIPT = "tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py"
TRACE_NEXT = "TENMON_FRACTAL_EXPANSION_AUTONOMY_TRACE_CURSOR_AUTO_V1"

POLICY_KEYS = (
    "nextOnPass",
    "nextOnFail",
    "mainline_max_concurrent",
    "reject_duplicate_enqueue",
    "reject_second_run_while_locked",
    "high_risk_requires_approval_or_escrow",
)

REQUIRED_BRANCHES = frozenset(
    {
        "stale_block",
        "worktree_not_converged",
        "axis_fail_single",
        "axis_fail_multi",
        "digest_ledger_trace",
        "digest_state_visible_tune",
        "mixed_question_fail",
        "beautiful_output_axis",
        "worldclass_seal_rerun",
    }
)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _utc_compact() -> str:
    return time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())


def _policy_sync_ok(queue: dict[str, Any], sf: dict[str, Any]) -> bool:
    p1 = queue.get("autonomy_single_flight_policy_v1")
    p2 = sf.get("autonomy_single_flight_policy_v1")
    if not isinstance(p1, dict) or not isinstance(p2, dict):
        return False
    if not all(str(p1.get(k)) == str(p2.get(k)) for k in POLICY_KEYS):
        return False
    sk1 = p1.get("state_kinds")
    sk2 = p2.get("state_kinds")
    if not isinstance(sk1, list) or not isinstance(sk2, list) or sk1 != sk2:
        return False
    try:
        mm = int(p1.get("mainline_max_concurrent") or 1)
    except (TypeError, ValueError):
        mm = 1
    return mm == 1


def _branches_complete(bridge: dict[str, Any]) -> tuple[bool, list[str]]:
    fb = bridge.get("failover_branches")
    if not isinstance(fb, dict):
        return False, ["failover_branches_missing"]
    missing: list[str] = []
    bad: list[str] = []
    for k in REQUIRED_BRANCHES:
        if k not in fb:
            missing.append(k)
            continue
        ent = fb[k]
        if not isinstance(ent, dict):
            bad.append(k)
            continue
        nc = str(ent.get("next_card") or "").strip()
        if not nc:
            bad.append(k)
    return len(missing) + len(bad) == 0, missing + bad


def _run_planner_dry_run(api: Path) -> tuple[bool, str]:
    script = api / "automation" / PLANNER_SCRIPT
    if not script.is_file():
        return False, "planner_script_missing"
    r = subprocess.run(
        [sys.executable, str(script), "--dry-run"],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
    )
    ok = r.returncode == 0
    tail = (r.stdout or "")[-2000:] + (r.stderr or "")[-1000:]
    return ok, tail


def _write_evidence(
    auto: Path,
    ok: bool,
    checks: dict[str, Any],
    bridge: dict[str, Any],
) -> str | None:
    if ok:
        return None
    ts = _utc_compact()
    ev_root = auto / "fractal_expansion_failover_bridge_evidence" / ts
    try:
        ev_root.mkdir(parents=True, exist_ok=True)
        bundle = {
            "card": CARD,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "ok": False,
            "checks": checks,
            "bridge_config_snapshot": bridge,
            "copied_inputs": [],
        }
        for name in (
            "remote_cursor_queue.json",
            "tenmon_cursor_single_flight_queue_state.json",
            "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json",
            "tenmon_material_digest_ledger_v1.json",
            BRIDGE_JSON,
        ):
            p = auto / name
            if p.is_file():
                dest = ev_root / name
                shutil.copy2(p, dest)
                bundle["copied_inputs"].append(str(dest))
        (ev_root / "evidence_bundle.json").write_text(
            json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return str(ev_root)
    except OSError:
        return None


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    bridge_path = auto / BRIDGE_JSON
    bridge = _read_json(bridge_path)
    queue = _read_json(auto / "remote_cursor_queue.json")
    sf_state = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    seal = _read_json(auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json")

    branches_ok, branch_issues = _branches_complete(bridge)
    trace_card = str(bridge.get("trace_after_fail") or "").strip()
    trace_ok = trace_card == TRACE_NEXT

    mainline_id = str(bridge.get("fractal_expansion_mainline_id") or "").strip()
    mainline_ok = mainline_id == "TENMON_FRACTAL_TRUTH_WORLDCLASS_SEAL_CURSOR_AUTO_V1"

    policy_ok = _policy_sync_ok(queue, sf_state)
    planner_dry_ok, planner_tail = _run_planner_dry_run(api)

    # single-flight: queue/state policy 同期 + planner dry-run（集約検証）が両方 OK
    sf_preserved = policy_ok and planner_dry_ok

    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    enqueue_card = str(bridge.get("enqueue_cursor_card") or "").strip()
    enqueue_hits = sum(
        1
        for it in items
        if isinstance(it, dict) and str(it.get("cursor_card") or "").strip() == enqueue_card
    )
    # fail-closed: キューに bridge カードが無くても設定・同期が取れていれば enqueue は運用側で投入可能
    enqueue_ready = enqueue_card == CARD

    next_bridge_ready = branches_ok and trace_ok and mainline_ok and enqueue_ready

    # seal integration_cards が failover のカード名をカバー（緩い sanity）
    integ = seal.get("integration_cards") if isinstance(seal.get("integration_cards"), dict) else {}
    failover_cards: set[str] = set()
    fb = bridge.get("failover_branches")
    if isinstance(fb, dict):
        for _k, v in fb.items():
            if isinstance(v, dict) and str(v.get("next_card") or "").strip():
                failover_cards.add(str(v["next_card"]).strip())
    integ_vals = {str(x).strip() for x in integ.values() if str(x).strip()}
    integ_covers = integ_vals <= failover_cards or len(integ_vals) == 0

    failover_path_ready = next_bridge_ready and policy_ok and integ_covers

    fractal_autonomy_bridge_ready = (
        branches_ok
        and trace_ok
        and mainline_ok
        and policy_ok
        and planner_dry_ok
        and sf_preserved
    )

    ok = bool(
        fractal_autonomy_bridge_ready
        and next_bridge_ready
        and failover_path_ready
    )

    checks = {
        "branches_complete": branches_ok,
        "branch_issues": branch_issues,
        "trace_card_ok": trace_ok,
        "mainline_id_ok": mainline_ok,
        "policy_sync_ok": policy_ok,
        "planner_dry_run_ok": planner_dry_ok,
        "planner_stdout_tail": planner_tail[-1500:],
        "single_flight_signal_ok": sf_preserved,
        "enqueue_cursor_card_ok": enqueue_ready,
        "enqueue_matching_queue_items": enqueue_hits,
        "integration_cards_subset_ok": integ_covers,
    }

    evidence_dir = _write_evidence(auto, ok, checks, bridge)
    rollback_used = False

    summary = {
        "ok": ok,
        "card": CARD,
        "fractal_autonomy_bridge_ready": fractal_autonomy_bridge_ready,
        "single_flight_preserved": sf_preserved and policy_ok,
        "next_card_bridge_ready": next_bridge_ready,
        "failover_path_ready": failover_path_ready,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else TRACE_NEXT,
    }

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out_full: dict[str, Any] = {
        **summary,
        "generated_at": ts,
        "checks": checks,
        "bridge_config_path": str(bridge_path),
        "evidence_dir": evidence_dir,
        "notes": [
            "planner dry-run: tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py --dry-run",
            "single-flight: remote_cursor_queue と tenmon_cursor_single_flight_queue_state の policy 一致・mainline_max_concurrent=1",
            "fail 時 evidence: automation/fractal_expansion_failover_bridge_evidence/<ts>/evidence_bundle.json",
        ],
    }

    out_path = auto / OUT_JSON
    try:
        tmp = out_path.with_suffix(out_path.suffix + ".tmp")
        tmp.write_text(json.dumps(out_full, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(out_path)
    except OSError:
        rollback_used = True
        summary["ok"] = False
        summary["rollback_used"] = True
        summary["next_card_if_fail"] = TRACE_NEXT
        out_full["rollback_used"] = True
        out_full["ok"] = False

    md = "\n".join(
        [
            f"# {CARD}",
            "",
            f"- generated_at: `{ts}`",
            f"- **ok**: `{summary['ok']}`",
            f"- evidence_dir: `{evidence_dir}`",
            "",
            "## summary",
            "",
            json.dumps(summary, ensure_ascii=False, indent=2),
        ]
    )
    (auto / OUT_MD).write_text(md + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
