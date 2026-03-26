#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WEAK_ROUTE_3LANE_REHYDRATION_PARENT_CURSOR_AUTO_V1

弱接続3レーンのみを対象に、再水和→検証→rejudge→score同期を固定順で実行する親オーケストレーター。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_PARENT_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ。"
RETRY_CARD = "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_PARENT_RETRY_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_weak_route_3lane_rehydration_parent_summary.json"
OUT_REPORT = "tenmon_weak_route_3lane_rehydration_parent_report.md"

CARD_ORDER = [
    "TENMON_K1_SCRIPTURE_BIND_REHYDRATION_CURSOR_AUTO_V1",
    "TENMON_CONCEPT_CANON_CENTER_BIND_REHYDRATION_CURSOR_AUTO_V1",
    "TENMON_SCRIPTURE_LOCAL_RESOLVER_TOC_SUPPRESS_CURSOR_AUTO_V1",
    "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_ACCEPTANCE_CURSOR_AUTO_V1",
]

LANE_PROBES = [
    ("K1_TRACE_EMPTY_GATED_V1", "法華経とは何かを140字前後で答えて"),
    ("TENMON_CONCEPT_CANON_V1", "言霊の下位概念を一つだけ短く示して"),
    ("SCRIPTURE_LOCAL_RESOLVER_V4", "法華経の方便品を一段落で要約して"),
]


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


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


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "args": cmd,
            "stdout_tail": (p.stdout or "")[-6000:],
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "args": cmd, "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def post_chat(base: str, message: str, thread_id: str) -> dict[str, Any]:
    payload = {
        "message": message,
        "messages": [{"role": "user", "content": message}],
        "threadId": thread_id,
        "userId": "tenmon-weak-route-3lane-parent",
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base.rstrip('/')}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            body = res.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            rr = (
                (parsed.get("decisionFrame") or {}).get("ku", {}).get("routeReason")
                if isinstance(parsed, dict)
                else None
            )
            return {"ok": True, "status": res.status, "routeReason": rr, "response_len": len(str(parsed.get("response") or ""))}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": "http_error"}
    except Exception as e:
        return {"ok": False, "status": None, "error": f"{type(e).__name__}: {e}"}


def run_fixed_verify_chain(api: Path, auto: Path) -> dict[str, Any]:
    steps: list[tuple[str, list[str], int]] = [
        ("build", ["npm", "run", "build"], 7200),
        ("restart", ["sudo", "systemctl", "restart", "tenmon-ark-api.service"], 300),
        ("health", ["curl", "-fsS", "http://127.0.0.1:3000/api/health"], 120),
        ("audit.build", ["curl", "-fsS", "http://127.0.0.1:3000/api/audit.build"], 120),
        ("rejudge", [sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], 1800),
        ("score", [sys.executable, str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], 1800),
    ]
    out: list[dict[str, Any]] = []
    ok_all = True
    for name, cmd, timeout in steps:
        r = run_cmd(cmd, api, timeout=timeout)
        r["name"] = name
        out.append(r)
        if not r.get("ok"):
            ok_all = False
            break
    return {"ok": ok_all, "steps": out}


def run_lane_probes(base: str) -> dict[str, Any]:
    out: list[dict[str, Any]] = []
    ok_all = True
    for idx, (expected_rr, msg) in enumerate(LANE_PROBES, start=1):
        p = post_chat(base, msg, f"weak-3lane-{int(time.time() * 1000)}-{idx}")
        p["expected_routeReason"] = expected_rr
        p["route_contract_ok"] = p.get("routeReason") == expected_rr
        out.append(p)
        if not p.get("ok"):
            ok_all = False
    return {"ok": ok_all, "probes": out}


def run_card_step(card: str, api: Path, auto: Path) -> dict[str, Any]:
    # 1 card = 1 主修復（既存スクリプトを最小再利用）
    if card == "TENMON_K1_SCRIPTURE_BIND_REHYDRATION_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], api, timeout=1800)
    if card == "TENMON_CONCEPT_CANON_CENTER_BIND_REHYDRATION_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py")], api, timeout=1800)
    if card == "TENMON_SCRIPTURE_LOCAL_RESOLVER_TOC_SUPPRESS_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_conversation_worldclass_mainline_selector_v1.py")], api, timeout=1800)
    if card == "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_ACCEPTANCE_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], api, timeout=1800)
    return {"ok": False, "exit_code": None, "args": [card], "stdout_tail": "", "stderr_tail": "unknown_card"}


def write_retry_stub(auto: Path, reason: str, failed_card: str | None) -> None:
    p = auto / "generated_cursor_apply" / f"{RETRY_CARD}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        "\n".join(
            [
                f"# {RETRY_CARD}",
                "",
                f"- generated_at: `{utc()}`",
                f"- parent: `{CARD}`",
                f"- failed_card: `{failed_card or ''}`",
                f"- reason: `{reason}`",
                f"- nextOnFail: `{NEXT_ON_FAIL_NOTE}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default="/opt/tenmon-ark-repo")
    ap.add_argument("--api-base", default="http://127.0.0.1:3000")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"

    records: list[dict[str, Any]] = []
    halted = False
    failed_card: str | None = None
    halt_reason = ""

    for card in CARD_ORDER:
        run = run_card_step(card, api, auto)
        verify = run_fixed_verify_chain(api, auto)
        probes = run_lane_probes(args.api_base)
        rec = {"card": card, "run": run, "verify": verify, "probes": probes, "ts": utc()}
        records.append(rec)
        if not run.get("ok") or not verify.get("ok") or not probes.get("ok"):
            halted = True
            failed_card = card
            halt_reason = "card_or_verify_or_probe_failed"
            break

    rj = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    sc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    selector = read_json(auto / "tenmon_conversation_worldclass_mainline_selector.json")

    # acceptance evidence (no fabrication)
    lane_routes = [p.get("routeReason") for r in records for p in (r.get("probes", {}).get("probes") or []) if isinstance(p, dict)]
    k1_seen = "K1_TRACE_EMPTY_GATED_V1" in lane_routes
    concept_seen = "TENMON_CONCEPT_CANON_V1" in lane_routes
    scripture_seen = "SCRIPTURE_LOCAL_RESOLVER_V4" in lane_routes
    rejudge_sync = bool(rj.get("generated_at"))
    score_sync = bool(sc.get("generated_at"))
    selector_sync = bool(selector.get("generated_at"))
    acceptance = {
        "k1_rehydration_seen": k1_seen,
        "concept_center_meaning_non_null": concept_seen,
        "scripture_local_resolver_toc_bleed_suppressed_observed": scripture_seen,
        "rejudge_synced": rejudge_sync,
        "score_synced": score_sync,
        "selector_synced": selector_sync,
        "all_ok": bool(k1_seen and concept_seen and scripture_seen and rejudge_sync and score_sync and selector_sync),
    }
    if not halted and not acceptance["all_ok"]:
        halted = True
        halt_reason = "acceptance_not_satisfied"

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "nextOnPass": NEXT_ON_PASS,
        "nextOnFail": NEXT_ON_FAIL_NOTE,
        "cards_order": CARD_ORDER,
        "records": records,
        "acceptance": acceptance,
        "halted": halted,
        "halt_reason": halt_reason or None,
        "failed_card": failed_card,
    }
    write_json(auto / OUT_SUMMARY, summary)
    report = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- halted: `{halted}`",
        f"- halt_reason: `{halt_reason}`",
        f"- nextOnPass: `{NEXT_ON_PASS}`",
        f"- nextOnFail: `{NEXT_ON_FAIL_NOTE}`",
        "",
        "## Acceptance",
        "",
        f"- k1_rehydration_seen: `{acceptance['k1_rehydration_seen']}`",
        f"- concept_center_meaning_non_null: `{acceptance['concept_center_meaning_non_null']}`",
        f"- scripture_local_resolver_toc_bleed_suppressed_observed: `{acceptance['scripture_local_resolver_toc_bleed_suppressed_observed']}`",
        f"- rejudge_synced: `{acceptance['rejudge_synced']}`",
        f"- score_synced: `{acceptance['score_synced']}`",
        f"- selector_synced: `{acceptance['selector_synced']}`",
        f"- all_ok: `{acceptance['all_ok']}`",
        "",
    ]
    (auto / OUT_REPORT).write_text("\n".join(report), encoding="utf-8")

    if halted:
        write_retry_stub(auto, halt_reason or "unknown", failed_card)

    print(
        json.dumps(
            {
                "ok": not halted,
                "summary": str(auto / OUT_SUMMARY),
                "halted": halted,
                "failed_card": failed_card,
                "acceptance_all_ok": acceptance["all_ok"],
            },
            ensure_ascii=False,
        )
    )
    return 0 if not halted else 1


if __name__ == "__main__":
    raise SystemExit(main())

