#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_BUNDLE_PARENT_CURSOR_AUTO_V1

固定6カードを 1枚ずつ fail-closed で実行し、親投入前の足場を bundle として閉じる。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_BUNDLE_PARENT_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_SLEEP_UNTIL_4AM_CONTINUITY_AND_OPERABLE_ASCENT_PARENT_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ。"
RETRY_CARD = "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_BUNDLE_PARENT_RETRY_CURSOR_AUTO_V1"

OUT_SUMMARY = "tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_summary.json"
OUT_REPORT = "tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_report.md"

CARD_ORDER = [
    "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1",
    "TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1",
    "TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1",
    "TENMON_SCORECARD_EXIT_CODE_FIX_CURSOR_AUTO_V1",
    "TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1",
    "TENMON_CLOSED_LOOP_REAL_EXECUTION_SEAL_CURSOR_AUTO_V1",
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
        return {
            "ok": False,
            "exit_code": None,
            "args": cmd,
            "stdout_tail": "",
            "stderr_tail": f"{type(e).__name__}: {e}",
        }


def run_verify_chain(api: Path, auto: Path) -> dict[str, Any]:
    steps: list[tuple[str, list[str], int]] = [
        ("build", ["npm", "run", "build"], 7200),
        ("restart", ["sudo", "systemctl", "restart", "tenmon-ark-api.service"], 300),
        ("sleep", ["sleep", "5"], 20),
        ("health", ["curl", "-fsS", "http://127.0.0.1:3000/api/health"], 120),
        ("audit.build", ["curl", "-fsS", "http://127.0.0.1:3000/api/audit.build"], 120),
        ("lived", [sys.executable, str(auto / "tenmon_pwa_lived_completion_seal_v1.py"), str(api.parent), str(auto), "http://127.0.0.1:3000"], 1800),
        ("rejudge", [sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], 1800),
        ("scorecard", [sys.executable, str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], 1800),
    ]
    out_steps: list[dict[str, Any]] = []
    ok_all = True
    for name, cmd, to in steps:
        r = run_cmd(cmd, api, timeout=to)
        r["name"] = name
        out_steps.append(r)
        if not r.get("ok"):
            ok_all = False
            break
    return {"ok": ok_all, "steps": out_steps}


def run_card(card: str, api: Path, auto: Path, scripts: Path) -> dict[str, Any]:
    if card == "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], api, timeout=1800)
    if card == "TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py")], api, timeout=1800)
    if card == "TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_pwa_lived_completion_seal_v1.py"), str(api.parent), str(auto), "http://127.0.0.1:3000"], api, timeout=1800)
    if card == "TENMON_SCORECARD_EXIT_CODE_FIX_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], api, timeout=1800)
    if card == "TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1":
        return run_cmd(["bash", str(scripts / "tenmon_overnight_rearm_v1.sh")], api, timeout=1800)
    if card == "TENMON_CLOSED_LOOP_REAL_EXECUTION_SEAL_CURSOR_AUTO_V1":
        return run_cmd([sys.executable, str(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py")], api, timeout=1800)
    return {"ok": False, "exit_code": None, "args": [card], "stdout_tail": "", "stderr_tail": "unknown_card"}


def acceptance(auto: Path) -> dict[str, Any]:
    rj = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    bundle = read_json(auto / "remote_cursor_result_bundle.json")
    sc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    day = read_json(auto / "daybreak_report_and_next_queue_rearm_summary.json")
    lived = read_json(auto / "pwa_lived_completion_readiness.json")

    cont_len = (rj.get("fresh_probe_digest") or {}).get("continuity_followup_len")
    continuity_ok = isinstance(cont_len, (int, float)) and float(cont_len) >= 80.0

    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    cur = [e for e in entries if isinstance(e, dict) and e.get("current_run") is True and e.get("fixture") is not True]
    latest = cur[-1] if cur else {}
    status = str(latest.get("status") or "")
    dry_run = latest.get("dry_run")
    touched = latest.get("touched_files") if isinstance(latest.get("touched_files"), list) else []
    no_diff_reason = str(latest.get("no_diff_reason") or "").strip()
    current_run_ok = status != "dry_run_started" and dry_run is False and (
        len(touched) > 0 or (status == "completed_no_diff" and bool(no_diff_reason))
    )

    scorecard_exit_ok = bool(sc.get("generated_at"))
    daybreak_ready = day.get("next_run_ready") is True
    lived_ok = (
        lived.get("continuity_readiness") is True
        and lived.get("thread_id_presence_ok") is True
        and lived.get("surface_meta_duplicate_bleed_clean") is True
    )

    return {
        "continuity_response_len": cont_len,
        "continuity_response_len_ok": continuity_ok,
        "latest_current_run_entry_status": status,
        "latest_current_run_entry_ok": current_run_ok,
        "scorecard_exit_0_contract_ok": scorecard_exit_ok,
        "daybreak_next_run_ready": daybreak_ready,
        "pwa_lived_truth_ok": lived_ok,
        "all_ok": bool(continuity_ok and current_run_ok and scorecard_exit_ok and daybreak_ready and lived_ok),
    }


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
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"

    records: list[dict[str, Any]] = []
    halted = False
    halt_reason = ""
    failed_card: str | None = None

    for card in CARD_ORDER:
        run = run_card(card, api, auto, scripts)
        verify = run_verify_chain(api, auto)
        rec = {"card": card, "run": run, "verify": verify, "ts": utc()}
        records.append(rec)
        if not run.get("ok") or not verify.get("ok"):
            halted = True
            failed_card = card
            halt_reason = "card_or_verify_failed"
            break

    acc = acceptance(auto)
    if not halted and not acc.get("all_ok"):
        halted = True
        halt_reason = "acceptance_not_satisfied"

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "nextOnPass": NEXT_ON_PASS,
        "nextOnFail": NEXT_ON_FAIL_NOTE,
        "cards_order": CARD_ORDER,
        "records": records,
        "acceptance": acc,
        "halted": halted,
        "halt_reason": halt_reason or None,
        "failed_card": failed_card,
        "six_card_summary_count": len(records),
    }
    write_json(auto / OUT_SUMMARY, summary)

    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- halted: `{halted}`",
        f"- halt_reason: `{halt_reason or ''}`",
        f"- nextOnPass: `{NEXT_ON_PASS}`",
        f"- nextOnFail: `{NEXT_ON_FAIL_NOTE}`",
        "",
        "## Cards",
        "",
    ]
    lines.extend([f"- `{x['card']}` run_ok={x['run'].get('ok')} verify_ok={x['verify'].get('ok')}" for x in records])
    lines.extend(
        [
            "",
            "## Acceptance",
            "",
            f"- continuity_response_len_ok: `{acc.get('continuity_response_len_ok')}` ({acc.get('continuity_response_len')})",
            f"- latest_current_run_entry_ok: `{acc.get('latest_current_run_entry_ok')}` status=`{acc.get('latest_current_run_entry_status')}`",
            f"- scorecard_exit_0_contract_ok: `{acc.get('scorecard_exit_0_contract_ok')}`",
            f"- daybreak_next_run_ready: `{acc.get('daybreak_next_run_ready')}`",
            f"- pwa_lived_truth_ok: `{acc.get('pwa_lived_truth_ok')}`",
            f"- all_ok: `{acc.get('all_ok')}`",
            "",
        ]
    )
    (auto / OUT_REPORT).write_text("\n".join(lines), encoding="utf-8")

    if halted:
        write_retry_stub(auto, halt_reason or "unknown", failed_card)

    print(
        json.dumps(
            {
                "ok": not halted,
                "summary": str(auto / OUT_SUMMARY),
                "acceptance_all_ok": acc.get("all_ok"),
                "halted": halted,
                "failed_card": failed_card,
            },
            ensure_ascii=False,
        )
    )
    return 0 if not halted else 1


if __name__ == "__main__":
    raise SystemExit(main())

