#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_FULL_AUTONOMY_FINAL_ACCEPTANCE_CURSOR_AUTO_V1
各ランタイム summary / ポリシー / 結果バンドルを集約し、実運転としての最終判定（operable / continuous / fusion）を出す。
worldclass 品質判定とは混同しない（別カード）。
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_FULL_AUTONOMY_FINAL_ACCEPTANCE_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_FULL_AUTONOMY_FINAL_ACCEPTANCE_RETRY_CURSOR_AUTO_V1"

SOURCES = {
    "screen": "tenmon_mac_screen_operator_runtime_summary.json",
    "decision": "tenmon_mac_operator_decision_bind_summary.json",
    "browser_ai": "tenmon_browser_ai_operator_runtime_summary.json",
    "cursor": "tenmon_cursor_operator_runtime_summary.json",
    "loop": "tenmon_mac_full_autonomy_loop_runtime_summary.json",
    "guard24": "tenmon_mac_autonomy_24h_guard_summary.json",
    "policy": "tenmon_mac_autonomy_policy_v1.json",
    "bundle": "remote_cursor_result_bundle.json",
}


def utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(s: str) -> datetime | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def collect_evidence(auto: Path) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for k, name in SOURCES.items():
        if k == "policy":
            continue
        out[k] = read_json(auto / name)
    out["policy"] = read_json(auto / SOURCES["policy"])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_full_autonomy_final_acceptance_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--max-evidence-span-hours",
        type=float,
        default=float(os.environ.get("TENMON_FINAL_ACCEPTANCE_MAX_EVIDENCE_HOURS", "168")),
        help="全 summary の generated_at スパン上限（既定 168h=7d）。超えたら stale_evidence",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    ev = collect_evidence(auto)
    guard = ev["guard24"]
    loop = ev["loop"]
    sc = ev["screen"]
    dec = ev["decision"]
    bai = ev["browser_ai"]
    cur = ev["cursor"]
    pol = ev["policy"]
    bundle = read_json(auto / SOURCES["bundle"])

    precondition_ok = bool(guard.get("mac_autonomy_24h_guard_pass") is True)
    if str(guard.get("card") or "") != PRE_CARD:
        precondition_ok = False

    # 必須内訳（各カードの PASS 相当）
    screen_capture_ok = bool(
        sc.get("screen_capture_ok") is True
        and sc.get("mac_screen_operator_runtime_pass") is True
        and sc.get("current_run_evidence_ok") is not False
    )
    vision_decision_ok = bool(dec.get("mac_operator_decision_bind_pass") is True)
    browser_ai_ok = bool(bai.get("browser_ai_operator_runtime_pass") is True)
    cursor_apply_ok = bool(cur.get("cursor_operator_runtime_pass") is True)
    build_verify_loop = bool(loop.get("build_verify_ok") is True)
    build_verify_cursor = bool(cur.get("build_verify_ok") is True)
    build_verify_ok = build_verify_loop and build_verify_cursor
    result_return_ok = bool(loop.get("result_return_ok") is True)
    watchdog_ok = bool(guard.get("watchdog_ok") is True)

    approval_gate = bool(guard.get("approval_gate_ok") is True)
    policy_requires = bool((pol.get("approval") or {}).get("high_risk_requires_token") is True)
    high_risk_boundary_enforced = (not policy_requires) or approval_gate

    # result ingest: ループが成功した場合はバンドルに 1 件以上あること
    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    result_ingest_ok = True
    if loop.get("mac_full_autonomy_loop_runtime_pass") is True and result_return_ok:
        result_ingest_ok = len(entries) >= 1
        qid = str(loop.get("queue_id") or "").strip()
        if result_ingest_ok and qid:
            result_ingest_ok = any(
                str((e or {}).get("queue_id") or "") == qid for e in entries if isinstance(e, dict)
            )

    fixture_ok = loop.get("fixture_skipped") is not True

    # stale / mixed-run
    timestamps: list[datetime] = []
    for key in ("screen", "decision", "browser_ai", "cursor", "loop", "guard24"):
        t = parse_ts(str(ev[key].get("generated_at") or ""))
        if t:
            timestamps.append(t)
    stale_evidence = False
    mixed_run_suspected = False
    if len(timestamps) >= 2:
        span = (max(timestamps) - min(timestamps)).total_seconds() / 3600.0
        if span > args.max_evidence_span_hours:
            stale_evidence = True
        if span > 48:
            mixed_run_suspected = True

    # 三軸（operable / continuous / fusion）— worldclass とは別物
    operable_mac_autonomy_ready = bool(
        screen_capture_ok and vision_decision_ok and browser_ai_ok and cursor_apply_ok
    )
    continuous_safe_operation_ready = bool(
        loop.get("mac_full_autonomy_loop_runtime_pass") is True
        and guard.get("mac_autonomy_24h_guard_pass") is True
        and watchdog_ok
        and high_risk_boundary_enforced
        and build_verify_ok
        and result_return_ok
        and result_ingest_ok
    )
    cursor_fusion_ready = bool(
        cursor_apply_ok
        and build_verify_ok
        and result_return_ok
        and loop.get("job_polled") is True
        and loop.get("mac_full_autonomy_loop_runtime_pass") is True
    )

    full_breakdown_ok = bool(
        screen_capture_ok
        and vision_decision_ok
        and browser_ai_ok
        and cursor_apply_ok
        and build_verify_ok
        and result_return_ok
        and watchdog_ok
        and high_risk_boundary_enforced
    )

    gates_ok = bool(
        precondition_ok
        and not stale_evidence
        and fixture_ok
        and full_breakdown_ok
        and operable_mac_autonomy_ready
        and continuous_safe_operation_ready
        and cursor_fusion_ready
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "verdict": {
            "operable_mac_autonomy_ready": operable_mac_autonomy_ready,
            "continuous_safe_operation_ready": continuous_safe_operation_ready,
            "cursor_fusion_ready": cursor_fusion_ready,
        },
        "breakdown": {
            "screen_capture_ok": screen_capture_ok,
            "vision_decision_ok": vision_decision_ok,
            "browser_ai_ok": browser_ai_ok,
            "cursor_apply_ok": cursor_apply_ok,
            "build_verify_ok": build_verify_ok,
            "result_return_ok": result_return_ok,
            "watchdog_ok": watchdog_ok,
            "high_risk_boundary_enforced": high_risk_boundary_enforced,
        },
        "integrity": {
            "stale_evidence": stale_evidence,
            "mixed_run_suspected": mixed_run_suspected,
            "fixture_run_rejected": not fixture_ok,
            "result_ingest_ok": result_ingest_ok,
            "evidence_span_hours": (
                round((max(timestamps) - min(timestamps)).total_seconds() / 3600.0, 2)
                if len(timestamps) >= 2
                else None
            ),
        },
        "notes": {
            "not_worldclass": "本判定は実運転 operability / 安全連続運転 / cursor 融合。対話 worldclass は別カード。",
        },
        "gates_ok": gates_ok,
        "mac_full_autonomy_final_acceptance_pass": gates_ok,
    }

    summary_path = auto / "tenmon_mac_full_autonomy_final_acceptance_summary.json"
    report_path = auto / "tenmon_mac_full_autonomy_final_acceptance_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                "## Verdict",
                f"- operable_mac_autonomy_ready: `{operable_mac_autonomy_ready}`",
                f"- continuous_safe_operation_ready: `{continuous_safe_operation_ready}`",
                f"- cursor_fusion_ready: `{cursor_fusion_ready}`",
                "",
                "## Breakdown",
                f"- screen_capture_ok: `{screen_capture_ok}`",
                f"- vision_decision_ok: `{vision_decision_ok}`",
                f"- browser_ai_ok: `{browser_ai_ok}`",
                f"- cursor_apply_ok: `{cursor_apply_ok}`",
                f"- build_verify_ok: `{build_verify_ok}`",
                f"- result_return_ok: `{result_return_ok}`",
                f"- watchdog_ok: `{watchdog_ok}`",
                f"- high_risk_boundary_enforced: `{high_risk_boundary_enforced}`",
                "",
                "## Integrity",
                f"- stale_evidence: `{stale_evidence}`",
                f"- fixture_ok: `{fixture_ok}`",
                f"- result_ingest_ok: `{result_ingest_ok}`",
                "",
                f"- **gates_ok / PASS**: `{gates_ok}`",
                "",
                out["notes"]["not_worldclass"],
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if gates_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
