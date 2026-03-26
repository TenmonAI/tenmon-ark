#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_SEAL_V1"
OUT_SUMMARY = "tenmon_overnight_failclosed_autonomy_seal_summary.json"
OUT_REPORT = "tenmon_overnight_failclosed_autonomy_seal_report.md"
OUT_VERDICT = "tenmon_overnight_failclosed_autonomy_seal_verdict.json"


def utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 1800) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "stdout_tail": (p.stdout or "")[-3000:],
            "stderr_tail": (p.stderr or "")[-2000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def get_json(url: str, timeout: float = 20.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return {"ok_http": 200 <= int(r.status) < 300, "status": int(r.status), "json": js}
    except urllib.error.HTTPError as e:
        return {"ok_http": False, "status": int(e.code), "json": {}}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def wait_service_ready(base: str, wait_sec: int = 12) -> bool:
    deadline = time.time() + max(1, wait_sec)
    while time.time() < deadline:
        h = get_json(f"{base}/api/health", timeout=4.0)
        j = h.get("json") if isinstance(h.get("json"), dict) else {}
        if h.get("ok_http") and j.get("ok") is True:
            return True
        time.sleep(1.0)
    return False


def post_chat(base: str, message: str, timeout: float = 90.0) -> dict[str, Any]:
    payload = json.dumps({"message": message}).encode("utf-8")
    req = urllib.request.Request(f"{base}/api/chat", data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            ku = ((js.get("decisionFrame") or {}).get("ku") or {}) if isinstance(js, dict) else {}
            rr = ku.get("routeReason") if isinstance(ku, dict) else None
            return {
                "ok_http": 200 <= int(r.status) < 300,
                "status": int(r.status),
                "response_nonempty": bool(str(js.get("response") or "").strip()),
                "has_decisionFrame": isinstance(js.get("decisionFrame"), dict),
                "has_ku_routeReason": bool(rr),
                "routeReason": rr,
                "response_len": len(str(js.get("response") or "")),
            }
    except Exception as e:
        return {
            "ok_http": False,
            "status": 0,
            "response_nonempty": False,
            "has_decisionFrame": False,
            "has_ku_routeReason": False,
            "routeReason": None,
            "response_len": 0,
            "error": repr(e),
        }


def parse_ts(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    t = raw.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--heartbeat-max-age-sec", type=int, default=int(os.environ.get("TENMON_OVERNIGHT_SEAL_HEARTBEAT_MAX_AGE_SEC", "10800")))
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    base = str(args.base).rstrip("/")

    must_files = [
        auto / "tenmon_high_risk_morning_approval_list.json",
        auto / "tenmon_cursor_single_flight_queue_state.json",
        auto / "remote_cursor_queue.json",
        auto / "remote_cursor_result_bundle.json",
        auto / "tenmon_worldclass_acceptance_scorecard.json",
        auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json",
    ]
    optional_files = [
        auto / "high_risk_escrow_package_latest.json",
        auto / "high_risk_escrow_package_latest.md",
        auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_heartbeat.json",
    ]

    build = run_cmd(["npm", "run", "build"], api, timeout=7200)
    restart = run_cmd(["sudo", "systemctl", "restart", "tenmon-ark-api.service"], api, timeout=180)
    wait_service_ready(base, wait_sec=15)
    health = get_json(f"{base}/api/health")
    audit = get_json(f"{base}/api/audit")
    audit_build = get_json(f"{base}/api/audit.build")

    probe_msgs = ["法華経とは", "即身成仏とは", "水火の法則とは", "天聞とは何か"]
    probes = [{"message": m, **post_chat(base, m)} for m in probe_msgs]

    file_state: list[dict[str, Any]] = []
    blockers: list[str] = []
    for p in must_files:
        ex = p.is_file()
        file_state.append({"path": str(p), "required": True, "exists": ex})
        if not ex:
            blockers.append(f"missing_required_file:{p.name}")
    for p in optional_files:
        ex = p.is_file()
        file_state.append({"path": str(p), "required": False, "exists": ex})

    hb = read_json(auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_heartbeat.json")
    hb_ts = parse_ts(hb.get("updated_at"))
    hb_fresh = False
    if hb_ts is not None:
        age = (datetime.now(timezone.utc) - hb_ts).total_seconds()
        hb_fresh = age <= max(60, int(args.heartbeat_max_age_sec))
    if not hb:
        blockers.append("heartbeat_missing_or_unreadable")
    elif not hb_fresh:
        blockers.append("heartbeat_stale")

    infra_ok = bool(build.get("ok") and restart.get("ok") and health.get("ok_http") and audit.get("ok_http") and audit_build.get("ok_http"))
    if not infra_ok:
        blockers.append("infra_chain_failed")

    for pr in probes:
        if not (pr.get("ok_http") and pr.get("response_nonempty") and pr.get("has_decisionFrame") and pr.get("has_ku_routeReason")):
            blockers.append(f"probe_failed:{pr.get('message')}")

    queue = read_json(auto / "remote_cursor_queue.json")
    high_risk_applied = False
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    for it in items:
        if not isinstance(it, dict):
            continue
        if it.get("high_risk") is True and str(it.get("state") or "") == "executed":
            high_risk_applied = True
            break
    if high_risk_applied:
        blockers.append("high_risk_auto_applied_trace_detected")

    verdict_pass = len(blockers) == 0
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "pass": verdict_pass,
        "blockers": sorted(set(blockers)),
        "infra": {
            "build": build,
            "restart": restart,
            "health_ok": bool(health.get("ok_http") and (health.get("json") or {}).get("ok") is True),
            "audit_ok": bool(audit.get("ok_http") and (audit.get("json") or {}).get("ok") is True),
            "audit_build_ok": bool(audit_build.get("ok_http") and (audit_build.get("json") or {}).get("ok") is True),
        },
        "orchestration": {
            "single_flight_state_present": (auto / "tenmon_cursor_single_flight_queue_state.json").is_file(),
            "heartbeat_present": bool(hb),
            "heartbeat_fresh": hb_fresh,
            "stall_recovery_script_present": (auto / "autonomy_stall_recovery_v1.py").is_file(),
            "master_parent_script_present": (api / "scripts" / "tenmon_full_autonomy_os_13plus4_master_parent_v1.sh").is_file(),
        },
        "fail_closed": {
            "morning_approval_list_present": (auto / "tenmon_high_risk_morning_approval_list.json").is_file(),
            "escrow_json_present": (auto / "high_risk_escrow_package_latest.json").is_file(),
            "queue_present": (auto / "remote_cursor_queue.json").is_file(),
            "result_bundle_present": (auto / "remote_cursor_result_bundle.json").is_file(),
            "retry_hint_present": (auto / "generated_cursor_apply" / "TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_RETRY_CURSOR_AUTO_V1.md").is_file(),
            "high_risk_auto_applied_trace_detected": high_risk_applied,
        },
        "conversation_floor": probes,
        "file_state": file_state,
        "next_on_pass": "TENMON_CONVERSATION_COMPLETION_FINAL_SEAL_V1",
        "next_on_fail": "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V2",
    }
    verdict = {
        "card": CARD,
        "generated_at": summary["generated_at"],
        "pass": verdict_pass,
        "seal_allowed": verdict_pass,
        "commit_allowed": False,
        "blockers": summary["blockers"],
        "summary_path": str(auto / OUT_SUMMARY),
    }

    write_json(auto / OUT_SUMMARY, summary)
    write_json(auto / OUT_VERDICT, verdict)
    report = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- pass: `{verdict_pass}`",
        f"- seal_allowed: `{verdict_pass}`",
        "",
        "## Blockers",
    ]
    if summary["blockers"]:
        report.extend([f"- `{b}`" for b in summary["blockers"]])
    else:
        report.append("- none")
    report.extend(
        [
            "",
            "## Infra",
            f"- build: `{build.get('ok')}`",
            f"- restart: `{restart.get('ok')}`",
            f"- health/audit/audit.build: `{summary['infra']['health_ok']}` / `{summary['infra']['audit_ok']}` / `{summary['infra']['audit_build_ok']}`",
            "",
            "## Conversation floor",
        ]
    )
    for p in probes:
        report.append(f"- `{p['message']}` -> route=`{p.get('routeReason')}` nonempty=`{p.get('response_nonempty')}`")
    (auto / OUT_REPORT).write_text("\n".join(report) + "\n", encoding="utf-8")

    print(json.dumps({"ok": verdict_pass, "summary": str(auto / OUT_SUMMARY), "verdict": str(auto / OUT_VERDICT)}, ensure_ascii=False))
    return 0 if verdict_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

