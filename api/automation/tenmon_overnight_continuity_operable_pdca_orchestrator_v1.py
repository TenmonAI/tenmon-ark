#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1

今夜の固定6カードのみを対象に、1 cycle = 1 card + 1 verify で前進させる。
成功捏造なし。high-risk 承認ゲートは既存 runner に委譲し緩めない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore

CARD = "TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_overnight_continuity_operable_pdca_orchestrator_summary.json"
OUT_HEARTBEAT = "tenmon_overnight_continuity_operable_pdca_orchestrator_heartbeat.json"
DEFAULT_LOCK = ".tenmon_overnight_continuity_operable_pdca_orchestrator.lock"
DEFAULT_STOP = "tenmon_overnight_continuity_operable_pdca_stop.signal"
DEFAULT_TZ = "Asia/Tokyo"
DEFAULT_END_LOCAL = "04:00"
DEFAULT_CYCLE_SEC = 420
NEXT_ON_PASS = "TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。evidence bundle + retry stub のみ。"
RETRY_CARD = "TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_RETRY_CURSOR_AUTO_V1"

CARD_CONTINUITY = "TENMON_CONTINUITY_ROUTE_HOLD_DENSITY_REPAIR_CURSOR_AUTO_V1"
CARD_REAL_BIND = "TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1"
CARD_REJUDGE_SYNC = "TENMON_SINGLE_SOURCE_LATEST_TRUTH_REJUDGE_SYNC_CURSOR_AUTO_V1"
CARD_DAYBREAK_REARM = "TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1"
CARD_FINAL_SEAL = "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1"


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


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def acquire_lock(lock_file: Path) -> tuple[bool, str]:
    if lock_file.exists():
        old = read_json(lock_file)
        old_pid = int(old.get("pid") or 0)
        if old_pid and pid_alive(old_pid):
            return False, "duplicate_orchestrator_lock_active"
        try:
            lock_file.unlink()
        except Exception:
            return False, "stale_lock_unremovable"
    write_json(lock_file, {"card": CARD, "pid": os.getpid(), "started_at": utc()})
    return True, "ok"


def release_lock(lock_file: Path) -> None:
    try:
        lock_file.unlink(missing_ok=True)
    except Exception:
        pass


def now_local(tz_name: str) -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ))


def parse_hhmm(v: str) -> tuple[int, int]:
    parts = (v or "04:00").strip().split(":")
    try:
        return max(0, min(23, int(parts[0]))), max(0, min(59, int(parts[1])))
    except Exception:
        return 4, 0


def next_end_local(tz_name: str, end_local: str) -> datetime:
    h, m = parse_hhmm(end_local)
    n = now_local(tz_name)
    t = n.replace(hour=h, minute=m, second=0, microsecond=0)
    if n >= t:
        t = t + timedelta(days=1)
    return t


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "args": cmd[:16],
            "stdout_tail": (p.stdout or "")[-6000:],
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "args": cmd[:16], "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def _current_run_entries(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    out: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        if e.get("current_run") is not True:
            continue
        if e.get("fixture") is True:
            continue
        out.append(e)
    return out


def _entry_sort_key(e: dict[str, Any]) -> tuple[str, float]:
    ts = str(e.get("created_at") or e.get("timestamp") or e.get("generated_at") or "")
    idx = float(e.get("index") or 0.0)
    return (ts, idx)


def latest_current_run_issue(bundle: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    cur = _current_run_entries(bundle)
    if not cur:
        return False, {"reason": "no_current_run_entry"}
    latest = sorted(cur, key=_entry_sort_key)[-1]
    status = str(latest.get("status") or "")
    touched = latest.get("touched_files")
    no_diff = latest.get("no_diff_reason")
    touched_empty = isinstance(touched, list) and len(touched) == 0
    issue = status == "dry_run_started" or (touched_empty and (no_diff is None or str(no_diff).strip() == ""))
    return issue, {
        "queue_id": latest.get("queue_id") or latest.get("id"),
        "status": status,
        "touched_files_len": len(touched) if isinstance(touched, list) else None,
        "no_diff_reason": no_diff,
        "dry_run": latest.get("dry_run"),
        "real_execution": latest.get("real_execution"),
    }


def continuity_gap(scorecard: dict[str, Any], rejudge: dict[str, Any]) -> bool:
    must_fix = scorecard.get("must_fix_before_claim") if isinstance(scorecard.get("must_fix_before_claim"), list) else []
    if any("conversation_continuity:continuity_hold_density_insufficient" in str(x) for x in must_fix):
        return True
    fp = rejudge.get("fresh_probe_digest") if isinstance(rejudge.get("fresh_probe_digest"), dict) else {}
    c_len = fp.get("continuity_followup_len")
    if isinstance(c_len, (int, float)) and float(c_len) < 80.0:
        return True
    return bool(fp.get("continuity_density_unresolved") is True)


def stale_split_remains(rejudge: dict[str, Any], scorecard: dict[str, Any], system_verdict: dict[str, Any]) -> bool:
    stale = rejudge.get("stale_sources")
    if isinstance(stale, list) and len(stale) > 0:
        return True
    if rejudge.get("truth_source_singleton") is not True:
        return True
    rts = str(rejudge.get("generated_at") or "")
    sts = str(system_verdict.get("generated_at") or "")
    cts = str(scorecard.get("generated_at") or "")
    if rts and (not sts or sts < rts):
        return True
    if rts and (not cts or cts < rts):
        return True
    return False


def choose_card(*, scorecard: dict[str, Any], rejudge: dict[str, Any], bundle: dict[str, Any]) -> tuple[str | None, dict[str, Any]]:
    if bool(scorecard.get("sealed_operable_ready") is True):
        return None, {"stop": "sealed_operable_ready_true"}
    if continuity_gap(scorecard, rejudge):
        return CARD_CONTINUITY, {"rule": "continuity_hold_density_insufficient"}
    issue, info = latest_current_run_issue(bundle)
    if issue:
        return CARD_REAL_BIND, {"rule": "result_bundle_current_run_issue", "latest_entry": info}
    if stale_split_remains(rejudge, scorecard, read_json(Path(scorecard.get("inputs", {}).get("tenmon_system_verdict", "")))):
        return CARD_REJUDGE_SYNC, {"rule": "single_source_stale_split"}
    return CARD_FINAL_SEAL, {"rule": "preconditions_closed"}


def run_preobserve(api: Path, auto: Path) -> dict[str, Any]:
    out: dict[str, Any] = {}
    out["rejudge"] = run_cmd([sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], api, timeout=1800)
    out["single_flight"] = run_cmd([sys.executable, str(auto / "tenmon_cursor_single_flight_queue_v1.py")], api, timeout=1200)
    return out


def run_selected_card(api: Path, scripts: Path, auto: Path, card: str) -> dict[str, Any]:
    if card == CARD_CONTINUITY:
        return run_cmd([sys.executable, str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py")], api, timeout=1800)
    if card == CARD_REAL_BIND:
        return run_cmd([sys.executable, str(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py")], api, timeout=1800)
    if card == CARD_REJUDGE_SYNC:
        return run_cmd([sys.executable, str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py")], api, timeout=1800)
    if card == CARD_DAYBREAK_REARM:
        return run_cmd([sys.executable, str(auto / "daybreak_report_and_next_queue_rearm_v1.py")], api, timeout=1800)
    if card == CARD_FINAL_SEAL:
        return run_cmd(["bash", str(scripts / "tenmon_final_operable_seal_v1.sh")], api, timeout=2400)
    return {"ok": False, "exit_code": None, "args": [card], "stderr_tail": "unknown_card", "stdout_tail": ""}


def run_verify_chain(api: Path, auto: Path) -> dict[str, Any]:
    steps: list[tuple[str, list[str], int]] = [
        ("build", ["npm", "run", "build"], 7200),
        ("restart", ["sudo", "systemctl", "restart", "tenmon-ark-api.service"], 300),
        ("health", ["curl", "-fsS", "http://127.0.0.1:3000/api/health"], 120),
        ("audit", ["curl", "-fsS", "http://127.0.0.1:3000/api/audit"], 120),
        ("audit.build", ["curl", "-fsS", "http://127.0.0.1:3000/api/audit.build"], 120),
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


def write_retry_stub(auto: Path, reason: str, cycle: int) -> None:
    p = auto / "generated_cursor_apply" / f"{RETRY_CARD}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        "\n".join(
            [
                f"# {RETRY_CARD}",
                "",
                f"- generated_at: `{utc()}`",
                f"- parent: `{CARD}`",
                f"- halted_cycle: `{cycle}`",
                f"- reason: `{reason}`",
                "",
                f"- summary: `{OUT_SUMMARY}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--one-shot", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    lock_file = Path(os.environ.get("TENMON_CONT_OPERABLE_LOCK_FILE", str(auto / DEFAULT_LOCK))).expanduser()
    stop_file = Path(os.environ.get("TENMON_CONT_OPERABLE_STOP_FILE", str(auto / DEFAULT_STOP))).expanduser()
    summary_path = auto / OUT_SUMMARY
    heartbeat_path = auto / OUT_HEARTBEAT
    runs_root = auto / "out" / "overnight_continuity_operable_runs"
    runs_root.mkdir(parents=True, exist_ok=True)

    tz_name = os.environ.get("TENMON_CONT_OPERABLE_TZ", DEFAULT_TZ).strip() or DEFAULT_TZ
    end_local = os.environ.get("TENMON_CONT_OPERABLE_END_LOCAL", DEFAULT_END_LOCAL).strip() or DEFAULT_END_LOCAL
    cycle_sec = max(60, int(os.environ.get("TENMON_CONT_OPERABLE_CYCLE_SEC", str(DEFAULT_CYCLE_SEC)) or DEFAULT_CYCLE_SEC))

    lock_ok, lock_note = acquire_lock(lock_file)
    started = utc()
    target_end = next_end_local(tz_name, end_local)
    if not lock_ok:
        write_json(
            summary_path,
            {
                "card": CARD,
                "generated_at": utc(),
                "lock_acquired": False,
                "blocked_reason": [lock_note],
                "next_on_pass": NEXT_ON_PASS,
                "next_on_fail_note": NEXT_ON_FAIL_NOTE,
            },
        )
        return 1

    cycle = 0
    blocked: list[str] = []
    cycle_records: list[dict[str, Any]] = []
    halted_reason = ""

    try:
        while True:
            if not args.one_shot and now_local(tz_name) >= target_end:
                blocked.append("end_local_reached")
                break
            if stop_file.exists():
                blocked.append("stop_file_detected")
                break

            cycle += 1
            wd = runs_root / f"cycle_{cycle}_{utc().replace(':', '-')}"
            wd.mkdir(parents=True, exist_ok=True)

            pre = run_preobserve(api, auto)
            scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
            rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
            bundle = read_json(auto / "remote_cursor_result_bundle.json")

            selected, reason = choose_card(scorecard=scorecard, rejudge=rejudge, bundle=bundle)
            if selected is None:
                blocked.append(str(reason.get("stop") or "sealed_or_window_stop"))
                cycle_records.append(
                    {
                        "cycle": cycle,
                        "started_at": utc(),
                        "selected_card": None,
                        "selection_reason": reason,
                        "preobserve": pre,
                        "finished_at": utc(),
                    }
                )
                break

            exec_result = run_selected_card(api, scripts, auto, selected)
            verify = run_verify_chain(api, auto)

            rec = {
                "cycle": cycle,
                "started_at": utc(),
                "selected_card": selected,
                "selection_reason": reason,
                "preobserve": pre,
                "execute_selected": exec_result,
                "verify": verify,
                "finished_at": utc(),
            }
            cycle_records.append(rec)

            write_json(
                heartbeat_path,
                {
                    "card": CARD,
                    "updated_at": utc(),
                    "started_at": started,
                    "cycle": cycle,
                    "selected_card": selected,
                    "target_end_local": str(target_end),
                    "tz": tz_name,
                    "stop_file": str(stop_file),
                    "lock_file": str(lock_file),
                    "last_cycle_ok": bool(exec_result.get("ok") and verify.get("ok")),
                    "last_workdir": str(wd),
                },
            )

            if not exec_result.get("ok"):
                halted_reason = f"execute_selected_failed:{selected}"
                blocked.append("halt_execute_failed")
                break
            if not verify.get("ok"):
                halted_reason = "verify_chain_failed"
                blocked.append("halt_verify_failed")
                break

            if args.one_shot:
                blocked.append("one_shot_done")
                break
            time.sleep(cycle_sec)
    finally:
        release_lock(lock_file)

    score_final = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    sealed_final = bool(score_final.get("sealed_operable_ready") is True)
    worldclass_final = bool(score_final.get("worldclass_ready") is True)
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "started_at": started,
        "finished_at": utc(),
        "cycles": cycle,
        "blocked_reason": blocked,
        "halted_reason": halted_reason or None,
        "stop_file": str(stop_file),
        "lock_file": str(lock_file),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "tz": tz_name,
        "target_end_local": str(target_end),
        "cycle_records_tail": cycle_records[-5:],
        "sealed_operable_ready": sealed_final,
        "worldclass_ready": worldclass_final,
        "finished_normally": blocked == ["end_local_reached"] or blocked == ["one_shot_done"],
        "parallel_forbidden": True,
        "fixed_priority_order": [
            CARD_CONTINUITY,
            CARD_REAL_BIND,
            CARD_REJUDGE_SYNC,
            CARD_FINAL_SEAL,
        ],
        "verify_order_contract": [
            "build",
            "restart",
            "health",
            "audit",
            "audit.build",
            "rejudge",
            "scorecard",
        ],
        "no_fake_daemon": True,
    }
    write_json(summary_path, summary)
    if any(x.startswith("halt_") for x in blocked):
        write_retry_stub(auto, halted_reason or "halted", cycle)
    print(json.dumps({"ok": True, "cycles": cycle, "summary": str(summary_path)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

