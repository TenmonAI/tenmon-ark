#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_V1
管理者ダッシュボード -> Mac Cursor 遠隔自動構築の 7 層 E2E 監査。
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_V1"
FAIL_NEXT = "TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _exists(p: Path) -> bool:
    return p.exists()


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _read_text(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def _run(script: Path, timeout: int = 240) -> Tuple[bool, str]:
    try:
        p = subprocess.run(
            ["bash", str(script)],
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode == 0, out[-5000:]
    except Exception as e:
        return False, str(e)


def audit_layers(run_pipeline: bool) -> Dict[str, Any]:
    repo = _repo_root()
    out = repo / "api" / "automation" / "out"
    scripts = repo / "api" / "src" / "scripts"
    routes = repo / "api" / "src" / "routes"
    docs = repo / "api" / "docs" / "constitution"

    runs: Dict[str, Dict[str, Any]] = {}
    if run_pipeline:
        target_scripts = [
            scripts / "tenmon_admin_remote_build_dashboard_vps_v1.sh",
            scripts / "tenmon_remote_build_job_normalizer_vps_v1.sh",
            scripts / "tenmon_mac_remote_bridge_vps_v1.sh",
            scripts / "tenmon_cursor_mac_executor_vps_v1.sh",
            scripts / "tenmon_remote_build_result_collector_vps_v1.sh",
            scripts / "tenmon_remote_build_seal_and_rollback_vps_v1.sh",
        ]
        for sp in target_scripts:
            ok, tail = _run(sp)
            runs[sp.name] = {"ok": ok, "tail": tail}

    layer: Dict[str, Dict[str, Any]] = {}

    # 1) admin dashboard exists
    route_text = _read_text(routes / "adminRemoteBuild.ts")
    l1_ok = (
        "adminRemoteBuildRouter.get(\"/admin/remote-build/dashboard\"" in route_text
        and "result-ingest" in route_text
        and "seal-run" in route_text
        and "final-verdict" in route_text
    )
    layer["1_admin_dashboard_exists"] = {
        "ok": l1_ok,
        "checks": [
            "dashboard route",
            "result-ingest route",
            "seal-run route",
            "final-verdict route",
        ],
    }

    # 2) job normalizer works
    normal = _read_json(out / "normalized_remote_build_manifest.json")
    l2_ok = bool(normal.get("job_id")) and bool(normal.get("card_name")) and "safety_flags" in normal
    layer["2_job_normalizer_works"] = {"ok": l2_ok, "path": str(out / "normalized_remote_build_manifest.json")}

    # 3) mac bridge works
    send = _read_json(out / "remote_bridge_send_result.json")
    ack = _read_json(out / "remote_bridge_ack.json")
    drop = _read_json(out / "mac_receiver_drop_manifest.json")
    l3_ok = bool(send.get("ok")) and bool(ack.get("ok")) and bool(drop.get("job_id"))
    layer["3_mac_bridge_works"] = {"ok": l3_ok, "send_ok": send.get("ok"), "ack_ok": ack.get("ok")}

    # 4) cursor executor works
    sess = _read_json(out / "cursor_job_session_manifest.json")
    state = _read_json(out / "mac_executor_state.json")
    block = _read_json(out / "dangerous_patch_block_report.json")
    l4_ok = bool(sess.get("session_id")) and bool(state.get("last_session")) and (block.get("blocked") is False)
    layer["4_cursor_executor_works"] = {"ok": l4_ok, "status": sess.get("status")}

    # 5) result collector works
    bundle = _read_json(out / "remote_build_result_collector_v1" / "remote_build_result_bundle.json")
    acc = _read_json(out / "acceptance_summary.json")
    diff = _read_json(out / "collected_diff_summary.json")
    l5_ok = bool(bundle.get("job_id")) and ("passed" in acc) and ("stat" in diff)
    layer["5_result_collector_works"] = {"ok": l5_ok, "classification": bundle.get("classification")}

    # 6) seal / rollback works
    verdict = _read_json(out / "remote_build_final_verdict.json")
    rb = _read_json(out / "rollback_plan.json")
    rd = _read_json(out / "retry_dispatch.json")
    br = _read_json(out / "blocked_reason_report.json")
    l6_ok = bool(verdict.get("verdict")) and ("steps" in rb) and ("fail_next_card" in rd) and ("blocked" in br)
    layer["6_seal_rollback_works"] = {"ok": l6_ok, "verdict": verdict.get("verdict")}

    # 7) dashboard status reflection works
    dash_doc = _read_text(docs / "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_CURSOR_AUTO_V1.md")
    l7_ok = (
        "result-ingest" in route_text
        and "verdictOut" in route_text
        and "remote-build/final-verdict" in route_text
        and "remote-build/seal-run" in route_text
        and "/api/admin/remote-build/dashboard" in dash_doc
    )
    layer["7_dashboard_status_reflection_works"] = {"ok": l7_ok}

    missing: List[str] = []
    for k, v in layer.items():
        if not bool(v.get("ok")):
            missing.append(k)

    if not missing:
        overall = "complete"
    elif any("blocked" in str(layer.get("6_seal_rollback_works", {}).get("verdict", "")) for _ in [0]):
        overall = "blocked"
    else:
        overall = "partial"

    return {
        "card": CARD,
        "generated_at": _utc(),
        "overall": overall,
        "layers": layer,
        "missing_contracts": missing,
        "script_runs": runs,
    }


def focused_next_cards(missing_contracts: List[str], overall: str) -> List[Dict[str, str]]:
    if overall == "complete":
        return []
    mapping = {
        "1_admin_dashboard_exists": "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_RETRY_CURSOR_AUTO_V1",
        "2_job_normalizer_works": "TENMON_REMOTE_BUILD_JOB_NORMALIZER_RETRY_CURSOR_AUTO_V1",
        "3_mac_bridge_works": "TENMON_MAC_REMOTE_BRIDGE_RETRY_CURSOR_AUTO_V1",
        "4_cursor_executor_works": "TENMON_CURSOR_MAC_EXECUTOR_RETRY_CURSOR_AUTO_V1",
        "5_result_collector_works": "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_RETRY_CURSOR_AUTO_V1",
        "6_seal_rollback_works": "TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_RETRY_CURSOR_AUTO_V1",
        "7_dashboard_status_reflection_works": "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_RETRY_CURSOR_AUTO_V1",
    }
    out: List[Dict[str, str]] = []
    seen: set[str] = set()
    for m in missing_contracts:
        card = mapping.get(m, FAIL_NEXT)
        if card in seen:
            continue
        seen.add(card)
        out.append({"missing_contract": m, "next_card": card})
        if len(out) >= 3:
            break
    if not out:
        out.append({"missing_contract": "fallback", "next_card": FAIL_NEXT})
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--run-pipeline", action="store_true", help="run stage VPS scripts before judging")
    args = ap.parse_args()

    rep = audit_layers(run_pipeline=args.run_pipeline)
    missing = rep["missing_contracts"]
    overall = rep["overall"]
    next_cards = focused_next_cards(missing, overall)

    out = _repo_root() / "api" / "automation" / "out"
    out.mkdir(parents=True, exist_ok=True)

    verdict_path = out / "admin_remote_build_end_to_end_verdict.json"
    missing_path = out / "admin_remote_build_missing_contracts.json"
    next_path = out / "focused_next_cards_manifest.json"
    marker = _repo_root() / "api" / "automation" / "TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_VPS_V1"

    verdict_payload = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "overall": overall,  # complete | partial | blocked
        "sealed_remote_build_platform": overall == "complete",
        "layers": rep["layers"],
        "missing_contracts_count": len(missing),
        "missing_contracts_path": str(missing_path.resolve()),
        "focused_next_cards_path": str(next_path.resolve()),
    }
    verdict_path.write_text(json.dumps(verdict_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    missing_path.write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "overall": overall,
                "missing_contracts": missing,
                "script_runs": rep["script_runs"],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    next_path.write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "overall": overall,
                "focused_next_cards": next_cards,
                "fail_next_card": FAIL_NEXT,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    marker.write_text(f"TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_VPS_V1\n{_utc()}\n", encoding="utf-8")

    print(json.dumps(verdict_payload, ensure_ascii=False, indent=2))
    return 0 if overall == "complete" else 1


if __name__ == "__main__":
    raise SystemExit(main())

