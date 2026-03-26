#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1

heartbeat / queue / result bundle の stall を観測し、候補を JSON に出す。
stop ファイルがある間は観測 state 更新も recovery も行わない（fail-closed）。
成功の捏造はしない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1"
OUT_SUMMARY = "autonomy_stall_recovery_summary.json"
OUT_STATE = "autonomy_stall_recovery_observation_state.json"

DEFAULT_HEARTBEAT = "tenmon_continuous_self_improvement_overnight_heartbeat.json"
QUEUE_PATH = "remote_cursor_queue.json"
BUNDLE_PATH = "remote_cursor_result_bundle.json"
DEDUP_SCRIPT = "tenmon_continuous_queue_dedup_and_backpressure_v1.py"
RUNTIME_RESCUE_SCRIPT = "tenmon_continuous_runtime_health_rescue_v1.py"


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


def parse_ts_sec(s: str | None) -> int | None:
    if not s or not isinstance(s, str):
        return None
    t = s.strip()
    if not t:
        return None
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except Exception:
        return None


def now_sec() -> int:
    return int(time.time())


def run_py(cwd: Path, script: Path, timeout: int) -> dict[str, Any]:
    try:
        p = subprocess.run(
            ["python3", str(script)],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "script": str(script),
            "stdout_tail": (p.stdout or "")[-2000:],
            "stderr_tail": (p.stderr or "")[-2000:],
        }
    except Exception as e:
        return {
            "ok": False,
            "exit_code": None,
            "script": str(script),
            "stdout_tail": "",
            "stderr_tail": f"{type(e).__name__}: {e}",
        }


def queue_counts(items: list[Any]) -> tuple[int, int, int]:
    ready = delivered = pending_nf = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        st = str(it.get("state") or "")
        if st == "ready":
            ready += 1
        elif st == "delivered":
            delivered += 1
        if st in ("ready", "delivered", "approval_required"):
            f = it.get("fixture")
            dry = it.get("dry_run_only") is True
            if not dry and f is not True:
                pending_nf += 1
    return ready, delivered, pending_nf


def build_snapshot(
    hb: dict[str, Any],
    queue: dict[str, Any],
    bundle: dict[str, Any],
) -> dict[str, Any]:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    r, d, pnf = queue_counts(items)
    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    return {
        "heartbeat_cycle": int(hb.get("cycle") or 0),
        "heartbeat_updated_at": str(hb.get("updated_at") or ""),
        "queue_updated_at": str(queue.get("updatedAt") or ""),
        "ready_count": r,
        "delivered_count": d,
        "pending_nonfixtureish_count": pnf,
        "bundle_entry_count": len(entries),
        "bundle_updated_at": str(bundle.get("updatedAt") or ""),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="autonomy_stall_recovery_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--execute",
        action="store_true",
        help="TENMON_STALL_RECOVERY_EXECUTE と同効（dedup + runtime rescue を試行）",
    )
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    stop_file = Path(
        os.environ.get("TENMON_OVERNIGHT_STOP_FILE", str(auto / "tenmon_overnight_stop.signal"))
    )
    hb_path = Path(os.environ.get("TENMON_STALL_HEARTBEAT_PATH", str(auto / DEFAULT_HEARTBEAT)))
    qpath = auto / QUEUE_PATH
    bpath = auto / BUNDLE_PATH
    state_path = auto / OUT_STATE
    summary_path = auto / OUT_SUMMARY

    hb_max_age = int(os.environ.get("TENMON_STALL_HEARTBEAT_MAX_AGE_SEC", "900") or 900)
    delta_min_sec = int(os.environ.get("TENMON_STALL_DELTA_MIN_SEC", "600") or 600)
    bundle_flat_min = int(os.environ.get("TENMON_STALL_BUNDLE_FLATLINE_MIN_SEC", "1200") or 1200)

    execute = os.environ.get("TENMON_STALL_RECOVERY_EXECUTE", "").strip().lower() in ("1", "true", "yes") or bool(
        args.execute
    )
    restart_systemd = os.environ.get("TENMON_STALL_RECOVERY_RESTART_SYSTEMD", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    stop_present = stop_file.is_file()
    prev = read_json(state_path)
    prev_snap = prev.get("snapshot") if isinstance(prev.get("snapshot"), dict) else {}
    prev_at_sec = parse_ts_sec(str(prev.get("updated_at") or ""))
    wall_since_prev = (now_sec() - prev_at_sec) if prev_at_sec is not None else None

    hb = read_json(hb_path)
    queue = read_json(qpath)
    bundle = read_json(bpath)
    snap = build_snapshot(hb, queue, bundle)

    stall_reasons: list[str] = []
    observations: dict[str, Any] = {
        "heartbeat_path": str(hb_path),
        "heartbeat_exists": hb_path.is_file(),
        "queue_path": str(qpath),
        "bundle_path": str(bpath),
        "snapshot": snap,
        "previous_snapshot": prev_snap if prev_snap else None,
        "wall_seconds_since_prior_state": wall_since_prev,
        "thresholds": {
            "heartbeat_max_age_sec": hb_max_age,
            "delta_min_sec": delta_min_sec,
            "bundle_flatline_min_sec": bundle_flat_min,
        },
    }

    recovery_candidates: list[dict[str, Any]] = [
        {
            "id": "overnight_daemon_systemd_restart",
            "manual_override_required": True,
            "note": "TENMON_STALL_RECOVERY_RESTART_SYSTEMD=1 かつ --execute でのみ試行可",
            "suggested_cmd": "sudo systemctl restart tenmon-continuous-self-improvement-overnight.service",
        },
        {
            "id": "queue_dedup_backpressure_fixture_drain",
            "manual_override_required": False,
            "script": str(auto / DEDUP_SCRIPT),
            "note": "TENMON_STALL_RECOVERY_EXECUTE で自動試行対象",
        },
        {
            "id": "runtime_health_rescue",
            "manual_override_required": False,
            "script": str(auto / RUNTIME_RESCUE_SCRIPT),
            "note": "TENMON_STALL_RECOVERY_EXECUTE で自動試行対象（内部 one-shot lock あり）",
        },
        {
            "id": "human_review_stop_lock",
            "manual_override_required": True,
            "note": "stop ファイル・lock・Mac executor / escrow の人間確認",
        },
    ]

    recovery_attempted = False
    recovery_executed = False
    recovery_steps: list[dict[str, Any]] = []

    if stop_present:
        out = {
            "card": CARD,
            "generated_at": utc(),
            "skipped_due_to_stop_file": True,
            "stop_file_path": str(stop_file),
            "stall_detected": False,
            "stall_reasons": [],
            "observations": observations,
            "recovery_candidates": recovery_candidates,
            "recovery_attempted": False,
            "recovery_executed": False,
            "recovery_steps": [],
            "next_on_pass": "TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1",
            "next_on_fail": "停止。stall recovery retry 1枚のみ生成。",
        }
        write_json(summary_path, out)
        print(json.dumps({"ok": True, "skipped_due_to_stop_file": True}, ensure_ascii=False))
        return 0

    # --- stall signals (fail-closed: 根拠があるものだけ True) ---
    if not hb_path.is_file():
        stall_reasons.append("heartbeat_missing")
    else:
        hu = parse_ts_sec(snap["heartbeat_updated_at"])
        if hu is None:
            stall_reasons.append("heartbeat_updated_at_unparseable")
        else:
            age = now_sec() - hu
            observations["heartbeat_age_sec"] = age
            if age > hb_max_age:
                stall_reasons.append("heartbeat_stale")

    if prev_snap and wall_since_prev is not None and wall_since_prev >= delta_min_sec:
        if int(prev_snap.get("heartbeat_cycle") or -1) == snap["heartbeat_cycle"] and snap["heartbeat_cycle"] > 0:
            stall_reasons.append("cycle_not_advancing")

        qu_prev = str(prev_snap.get("queue_updated_at") or "")
        qu_cur = snap["queue_updated_at"]
        if qu_prev and qu_cur and qu_prev == qu_cur:
            if (snap["ready_count"] + snap["delivered_count"]) > 0:
                if snap["ready_count"] == int(prev_snap.get("ready_count") or -1) and snap["delivered_count"] == int(
                    prev_snap.get("delivered_count") or -1
                ):
                    stall_reasons.append("queue_ready_delivered_frozen")

        if wall_since_prev >= bundle_flat_min:
            if int(prev_snap.get("bundle_entry_count") or -1) == snap["bundle_entry_count"]:
                stall_reasons.append("result_bundle_no_growth")

    stall_reasons = list(dict.fromkeys(stall_reasons))
    stall_detected = len(stall_reasons) > 0

    # --- recovery (explicit execute only) ---
    lock_path = auto / ".autonomy_stall_recovery_execute.lock"
    if execute and stall_detected:
        recovery_attempted = True
        if lock_path.is_file():
            recovery_steps.append(
                {"step": "lock", "ok": False, "note": "execute lock present; skip duplicate recovery burst"}
            )
        else:
            try:
                lock_path.write_text(
                    json.dumps({"card": CARD, "locked_at": utc()}, ensure_ascii=False) + "\n", encoding="utf-8"
                )
                r_dedup = run_py(api, auto / DEDUP_SCRIPT, timeout=600)
                recovery_steps.append({"step": "queue_dedup_backpressure", **r_dedup})
                r_rescue = run_py(api, auto / RUNTIME_RESCUE_SCRIPT, timeout=1200)
                recovery_steps.append({"step": "runtime_health_rescue", **r_rescue})
                if restart_systemd:
                    try:
                        unit = os.environ.get(
                            "TENMON_STALL_SYSTEMD_UNIT",
                            "tenmon-continuous-self-improvement-overnight.service",
                        ).strip()
                        cp = subprocess.run(
                            ["sudo", "-n", "systemctl", "restart", unit],
                            cwd=str(api),
                            capture_output=True,
                            text=True,
                            timeout=120,
                            check=False,
                        )
                        recovery_steps.append(
                            {
                                "step": "systemd_restart",
                                "ok": cp.returncode == 0,
                                "exit_code": cp.returncode,
                                "unit": unit,
                                "stdout_tail": (cp.stdout or "")[-1000:],
                                "stderr_tail": (cp.stderr or "")[-1000:],
                            }
                        )
                    except Exception as e:
                        recovery_steps.append(
                            {"step": "systemd_restart", "ok": False, "stderr_tail": f"{type(e).__name__}: {e}"}
                        )
                ok_dedup = next((s for s in recovery_steps if s.get("step") == "queue_dedup_backpressure"), {}).get(
                    "ok"
                )
                ok_rescue = next((s for s in recovery_steps if s.get("step") == "runtime_health_rescue"), {}).get("ok")
                recovery_executed = ok_dedup is True and ok_rescue is True
                if restart_systemd:
                    ok_sd = next((s for s in recovery_steps if s.get("step") == "systemd_restart"), {}).get("ok")
                    recovery_executed = recovery_executed and ok_sd is True
            finally:
                try:
                    lock_path.unlink(missing_ok=True)
                except Exception:
                    pass

    new_state = {
        "card": CARD,
        "updated_at": utc(),
        "snapshot": snap,
    }
    write_json(state_path, new_state)

    out = {
        "card": CARD,
        "generated_at": utc(),
        "skipped_due_to_stop_file": False,
        "stop_file_path": str(stop_file),
        "stall_detected": stall_detected,
        "stall_reasons": stall_reasons,
        "observations": observations,
        "recovery_candidates": recovery_candidates,
        "recovery_attempted": recovery_attempted,
        "recovery_executed": recovery_executed,
        "recovery_steps": recovery_steps,
        "execute_lock_path": str(lock_path),
        "next_on_pass": "TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1",
        "next_on_fail": "停止。stall recovery retry 1枚のみ生成。",
    }
    write_json(summary_path, out)
    print(
        json.dumps(
            {
                "ok": True,
                "stall_detected": stall_detected,
                "recovery_attempted": recovery_attempted,
                "recovery_executed": recovery_executed,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
