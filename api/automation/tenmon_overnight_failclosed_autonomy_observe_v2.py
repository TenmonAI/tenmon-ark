#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V2"
OUT_SUMMARY = "tenmon_overnight_failclosed_autonomy_observe_v2_summary.json"
OUT_REPORT = "tenmon_overnight_failclosed_autonomy_observe_v2_report.md"
OUT_NEXT = "tenmon_overnight_failclosed_autonomy_observe_v2_next_card.json"


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


def get_json(url: str, timeout: float = 15.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            return {"ok_http": 200 <= int(r.status) < 300, "status": int(r.status), "json": js, "body_head": body[:1200]}
    except urllib.error.HTTPError as e:
        return {"ok_http": False, "status": int(e.code), "json": {}, "body_head": ""}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e), "body_head": ""}


def post_chat(base: str, msg: str, timeout: float = 90.0) -> dict[str, Any]:
    payload = json.dumps({"message": msg}).encode("utf-8")
    req = urllib.request.Request(f"{base}/api/chat", data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip().startswith("{") else {}
            ku = ((js.get("decisionFrame") or {}).get("ku") or {}) if isinstance(js, dict) else {}
            rp = ku.get("responsePlan") if isinstance(ku, dict) else {}
            return {
                "message": msg,
                "status": int(r.status),
                "routeReason": js.get("routeReason") or (ku.get("routeReason") if isinstance(ku, dict) else None),
                "centerMeaning": ku.get("centerMeaning") if isinstance(ku, dict) else None,
                "sourcePack": ku.get("sourcePack") if isinstance(ku, dict) else None,
                "response": js.get("response") if isinstance(js, dict) else None,
                "semanticBody": rp.get("semanticBody") if isinstance(rp, dict) else None,
                "response_nonempty": bool(str(js.get("response") or "").strip()),
                "has_decisionFrame": isinstance(js.get("decisionFrame"), dict),
                "has_ku_routeReason": bool((ku.get("routeReason") if isinstance(ku, dict) else None)),
                "raw_head": raw[:2000],
            }
    except Exception as e:
        return {"message": msg, "error": repr(e), "response_nonempty": False, "has_decisionFrame": False, "has_ku_routeReason": False}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    base = str(args.base).rstrip("/")
    auto.mkdir(parents=True, exist_ok=True)

    required = [
        auto / "tenmon_high_risk_morning_approval_list.json",
        auto / "tenmon_cursor_single_flight_queue_state.json",
        auto / "remote_cursor_queue.json",
        auto / "remote_cursor_result_bundle.json",
        auto / "tenmon_worldclass_acceptance_scorecard.json",
        auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json",
    ]
    optional = [
        auto / "high_risk_escrow_package_latest.json",
        auto / "high_risk_escrow_package_latest.md",
        auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_heartbeat.json",
    ]
    file_presence = []
    missing_required = []
    for p in required:
        ex = p.is_file()
        file_presence.append({"path": str(p), "required": True, "exists": ex})
        if not ex:
            missing_required.append(str(p.name))
    for p in optional:
        file_presence.append({"path": str(p), "required": False, "exists": p.is_file()})

    health = get_json(f"{base}/api/health")
    audit = get_json(f"{base}/api/audit")
    audit_build = get_json(f"{base}/api/audit.build")
    infra_ok = bool(
        health.get("ok_http")
        and (health.get("json") or {}).get("ok") is True
        and audit.get("ok_http")
        and (audit.get("json") or {}).get("ok") is True
        and audit_build.get("ok_http")
        and (audit_build.get("json") or {}).get("ok") is True
    )

    probes = [
        post_chat(base, "法華経とは"),
        post_chat(base, "即身成仏とは"),
        post_chat(base, "水火の法則とは"),
        post_chat(base, "天聞とは何か"),
    ]
    conv_fail = any(not (p.get("response_nonempty") and p.get("has_decisionFrame") and p.get("has_ku_routeReason")) for p in probes)

    hb_present = (auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_heartbeat.json").is_file()
    sf_present = (auto / "tenmon_cursor_single_flight_queue_state.json").is_file()
    morning_present = (auto / "tenmon_high_risk_morning_approval_list.json").is_file()
    escrow_present = (auto / "high_risk_escrow_package_latest.json").is_file()
    result_present = (auto / "remote_cursor_result_bundle.json").is_file()
    score_present = (auto / "tenmon_worldclass_acceptance_scorecard.json").is_file()

    missing_groups: list[str] = []
    if not sf_present:
        missing_groups.append("single_flight")
    if not hb_present:
        missing_groups.append("heartbeat")
    if not morning_present:
        missing_groups.append("morning_approval")
    if not escrow_present:
        missing_groups.append("escrow")
    if not result_present:
        missing_groups.append("result_bundle")
    if not score_present:
        missing_groups.append("scorecard")

    if not infra_ok:
        next_card = "TENMON_OVERNIGHT_INFRA_RESTORE_RETRY_V1"
    elif ("heartbeat" in missing_groups) or ("single_flight" in missing_groups):
        next_card = "TENMON_OVERNIGHT_PARENT_WIRING_RETRY_V1"
    elif ("morning_approval" in missing_groups) or ("escrow" in missing_groups):
        next_card = "TENMON_OVERNIGHT_ESCROW_APPROVAL_BIND_RETRY_V1"
    elif conv_fail:
        next_card = "TENMON_OVERNIGHT_CONVERSATION_FLOOR_REPAIR_V1"
    elif "result_bundle" in missing_groups:
        next_card = "TENMON_OVERNIGHT_RESULT_BIND_RETRY_V1"
    else:
        next_card = "TENMON_OVERNIGHT_CONVERSATION_FLOOR_REPAIR_V1"

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "infra_ok": infra_ok,
        "health": health,
        "audit": audit,
        "audit_build": audit_build,
        "file_presence": file_presence,
        "missing_required_files": missing_required,
        "missing_groups": missing_groups,
        "conversation_probe_rows": probes,
        "conversation_probe_fail": conv_fail,
        "recommended_next_card": next_card,
        "nextOnPass": next_card,
        "nextOnFail": "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V3",
    }
    next_json = {
        "card": CARD,
        "generated_at": summary["generated_at"],
        "missing_groups": missing_groups,
        "recommended_next_card": next_card,
        "nextOnPass": next_card,
        "nextOnFail": "TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V3",
    }
    report = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- infra_ok: `{infra_ok}`",
        f"- conversation_probe_fail: `{conv_fail}`",
        f"- recommended_next_card: `{next_card}`",
        f"- nextOnPass: `{next_card}`",
        "- nextOnFail: `TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V3`",
        "",
        "## Missing groups",
    ]
    if missing_groups:
        report.extend([f"- `{x}`" for x in missing_groups])
    else:
        report.append("- none")
    report.extend(["", "## Probe routes"])
    for p in probes:
        report.append(f"- `{p.get('message')}` -> `{p.get('routeReason')}`")

    write_json(auto / OUT_SUMMARY, summary)
    write_json(auto / OUT_NEXT, next_json)
    (auto / OUT_REPORT).write_text("\n".join(report) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "summary": str(auto / OUT_SUMMARY), "next": str(auto / OUT_NEXT), "recommended_next_card": next_card}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

