#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1
Mac 完全自律の 24h 向け: ロック / watchdog / 停止ポリシー / スリープ対策定義 / 再開方針の検証と状態保存。
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_MAC_AUTONOMY_FINAL_ACCEPTANCE_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_RETRY_CURSOR_AUTO_V1"

POLICY_NAME = "tenmon_mac_autonomy_policy_v1.json"
STATE_NAME = "tenmon_mac_autonomy_state_v1.json"
FULL_AUTO_STATE = "tenmon_mac_full_autonomy_state_v1.json"
QUEUE_NAME = "remote_cursor_queue.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def is_darwin() -> bool:
    return sys.platform == "darwin"


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def load_policy(repo: Path) -> dict[str, Any]:
    return read_json(repo / "api" / "automation" / POLICY_NAME)


def load_state(repo: Path) -> dict[str, Any]:
    return read_json(repo / "api" / "automation" / STATE_NAME)


def validate_policy_schema(p: dict[str, Any]) -> tuple[bool, list[str]]:
    errs: list[str] = []
    if int(p.get("version") or 0) < 1:
        errs.append("version")
    st = p.get("stop") or {}
    if st.get("consecutive_fail_max") is None:
        errs.append("stop.consecutive_fail_max")
    for k in ("ui_drift_stop", "login_lost_stop", "browser_unavailable_stop", "cursor_unavailable_stop", "queue_corruption_stop"):
        if k not in st:
            errs.append(f"stop.{k}")
    wd = p.get("watchdog") or {}
    if wd.get("heartbeat_max_gap_sec") is None:
        errs.append("watchdog.heartbeat_max_gap_sec")
    sp = p.get("sleep_prevention") or {}
    if not str(sp.get("mode") or "").strip():
        errs.append("sleep_prevention.mode")
    rs = p.get("resume") or {}
    if not str(rs.get("interrupted_job") or "").strip():
        errs.append("resume.interrupted_job")
    ap = p.get("approval") or {}
    if ap.get("high_risk_requires_token") is None:
        errs.append("approval.high_risk_requires_token")
    ov = p.get("overlap") or {}
    if not ov.get("single_instance_lock"):
        errs.append("overlap.single_instance_lock")
    return len(errs) == 0, errs


def resume_policy_ok(p: dict[str, Any]) -> bool:
    v = str((p.get("resume") or {}).get("interrupted_job") or "").strip()
    return v in ("safe_discard", "discard", "retry_once")


def sleep_prevention_mode_defined(p: dict[str, Any]) -> bool:
    return bool(str((p.get("sleep_prevention") or {}).get("mode") or "").strip())


def approval_gate_ok(p: dict[str, Any]) -> bool:
    ap = p.get("approval") or {}
    if not ap.get("high_risk_requires_token"):
        return True
    env = str(ap.get("token_env") or "TENMON_AUTONOMY_HIGH_RISK_APPROVAL").strip()
    return bool(os.environ.get(env, "").strip())


def stop_conditions_triggered(state: dict[str, Any], p: dict[str, Any]) -> tuple[bool, str]:
    st = p.get("stop") or {}
    mx = int(st.get("consecutive_fail_max") or 3)
    if int(state.get("consecutive_failures") or 0) >= mx:
        return True, "consecutive_fail_stop"
    if st.get("ui_drift_stop") and state.get("ui_drift_detected"):
        return True, "ui_drift_stop"
    if st.get("login_lost_stop") and not state.get("auth_session_ok", True):
        return True, "login_lost_stop"
    if st.get("browser_unavailable_stop") and not state.get("browser_available", True):
        return True, "browser_unavailable"
    if st.get("cursor_unavailable_stop") and not state.get("cursor_available", True):
        return True, "cursor_unavailable"
    if st.get("queue_corruption_stop") and not state.get("queue_integrity_ok", True):
        return True, "queue_corruption"
    return False, ""


def check_queue_json(repo: Path) -> bool:
    qpath = repo / "api" / "automation" / QUEUE_NAME
    if not qpath.is_file():
        return True
    try:
        j = json.loads(qpath.read_text(encoding="utf-8"))
        return isinstance(j, dict) and isinstance(j.get("items"), list)
    except Exception:
        return False


def merge_last_success(state: dict[str, Any], repo: Path) -> None:
    fa = read_json(repo / "api" / "automation" / FULL_AUTO_STATE)
    v = str(fa.get("last_success_at") or "").strip()
    if v:
        state["last_success_cycle_at"] = v


def try_exclusive_lock(lock_path: Path) -> tuple[Any | None, bool]:
    """fcntl 排他ロック（overlap 禁止）。"""
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR, 0o644)
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fd, True
    except OSError:
        return None, False


def release_lock(fd: Any | None) -> None:
    if fd is None:
        return
    try:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    except Exception:
        pass


def capture_heartbeat_screenshot(out_dir: Path) -> str | None:
    if not is_darwin():
        return None
    out_dir.mkdir(parents=True, exist_ok=True)
    p = out_dir / f"watchdog_heartbeat_{int(time.time())}.png"
    try:
        r = subprocess.run(
            ["screencapture", "-x", str(p)],
            capture_output=True,
            text=True,
            timeout=45,
        )
        if r.returncode == 0 and p.is_file():
            return str(p)
    except Exception:
        pass
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_autonomy_24h_guard_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    out_guard = repo / "api" / "automation" / "out" / "mac_autonomy_24h_guard"

    pre_path = auto / "tenmon_mac_full_autonomy_loop_runtime_summary.json"
    pre = read_json(pre_path)
    precondition_ok = bool(pre.get("mac_full_autonomy_loop_runtime_pass") is True)
    if str(pre.get("card") or "") != PRE_CARD:
        precondition_ok = False

    policy = load_policy(repo)
    schema_ok, schema_errs = validate_policy_schema(policy)
    sp_mode = sleep_prevention_mode_defined(policy)
    rs_ok = resume_policy_ok(policy)
    appr_ok = approval_gate_ok(policy)

    qi_ok = check_queue_json(repo)
    state = load_state(repo)
    state["queue_integrity_ok"] = qi_ok

    stop_active, stop_reason = stop_conditions_triggered(state, policy)
    stop_eval_ok = not stop_active

    # stop_policy_ok: スキーマ + ゲート + 実行中停止条件でない + キュー整合
    stop_policy_ok = bool(schema_ok and appr_ok and stop_eval_ok and qi_ok)

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "platform": sys.platform,
        "darwin": is_darwin(),
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "policy_schema_ok": schema_ok,
        "policy_schema_errors": schema_errs,
        "approval_gate_ok": appr_ok,
        "resume_policy_ok": rs_ok,
        "sleep_prevention_mode_defined": sp_mode,
        "stop_policy_ok": stop_policy_ok,
        "stop_eval_ok": stop_eval_ok,
        "stop_reason": stop_reason if stop_active else "",
        "queue_integrity_ok": qi_ok,
        "watchdog_ok": False,
        "lock_ok": False,
        "mac_autonomy_24h_guard_pass": False,
        "phases": {},
    }

    if not is_darwin():
        summary["fail_reason"] = "mac_only_required"
        write_json(auto / "tenmon_mac_autonomy_24h_guard_summary.json", summary)
        _write_report(auto, summary)
        return 1

    if not precondition_ok:
        summary["fail_reason"] = "precondition_not_met"
        write_json(auto / "tenmon_mac_autonomy_24h_guard_summary.json", summary)
        _write_report(auto, summary)
        return 1

    lock_rel = str((policy.get("overlap") or {}).get("lock_rel_path") or "api/automation/out/mac_autonomy_24h_guard/runtime.lock")
    lock_path = repo / lock_rel

    fd, got_lock = try_exclusive_lock(lock_path)
    summary["lock_ok"] = got_lock
    summary["phases"]["lock"] = {"path": str(lock_rel), "acquired": got_lock}

    if not got_lock:
        summary["fail_reason"] = "overlap_lock_held"
        write_json(auto / "tenmon_mac_autonomy_24h_guard_summary.json", summary)
        _write_report(auto, summary)
        return 1

    try:
        merge_last_success(state, repo)
        ss_path = capture_heartbeat_screenshot(out_guard)
        now = utc()
        state["heartbeat_at"] = now
        state["heartbeat_pid"] = os.getpid()
        state["status"] = "running" if stop_policy_ok else "stopped"
        if ss_path:
            state["last_heartbeat_screenshot"] = ss_path
        state["card"] = CARD
        write_json(auto / STATE_NAME, state)

        wd_state_path = out_guard / "watchdog_last_heartbeat.json"
        prev_wd = read_json(wd_state_path, {})
        prev_ts = str(prev_wd.get("at") or "")
        max_gap = int((policy.get("watchdog") or {}).get("heartbeat_max_gap_sec") or 120)
        hb_gap_ok = True
        if prev_ts:
            try:
                t0 = time.strptime(prev_ts[:19], "%Y-%m-%dT%H:%M:%S")
                t1 = time.strptime(now[:19], "%Y-%m-%dT%H:%M:%S")
                gap = abs(time.mktime(t1) - time.mktime(t0))
                if gap > max_gap * 3:
                    hb_gap_ok = False
            except Exception:
                pass
        write_json(wd_state_path, {"at": now, "pid": os.getpid(), "last_success_cycle_at": state.get("last_success_cycle_at")})

        req_ss = bool((policy.get("watchdog") or {}).get("require_last_screenshot"))
        screenshot_ok = (not req_ss) or bool(ss_path)

        # watchdog: ロック下でハートビート・任意スクショ・前回成功サイクル（full autonomy から取込済み）
        summary["watchdog_ok"] = bool(
            stop_policy_ok and hb_gap_ok and screenshot_ok and bool(state.get("heartbeat_at"))
        )

        summary["phases"]["watchdog"] = {
            "heartbeat_at": now,
            "screenshot": ss_path,
            "heartbeat_gap_ok": hb_gap_ok,
            "last_success_cycle_at": state.get("last_success_cycle_at"),
        }

        summary["stop_policy_ok"] = stop_policy_ok
        summary["resume_policy_ok"] = rs_ok
        summary["sleep_prevention_mode_defined"] = sp_mode

        summary["mac_autonomy_24h_guard_pass"] = bool(
            summary["watchdog_ok"]
            and summary["lock_ok"]
            and summary["stop_policy_ok"]
            and summary["resume_policy_ok"]
            and summary["sleep_prevention_mode_defined"]
        )

        if not summary["mac_autonomy_24h_guard_pass"] and not summary.get("fail_reason"):
            summary["fail_reason"] = "guard_check_failed"

    finally:
        release_lock(fd)

    write_json(auto / "tenmon_mac_autonomy_24h_guard_summary.json", summary)
    _write_report(auto, summary)
    return 0 if summary["mac_autonomy_24h_guard_pass"] else 1


def _write_report(auto: Path, summary: dict[str, Any]) -> None:
    p = auto / "tenmon_mac_autonomy_24h_guard_report.md"
    p.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- watchdog_ok: `{summary.get('watchdog_ok')}`",
                f"- lock_ok: `{summary.get('lock_ok')}`",
                f"- stop_policy_ok: `{summary.get('stop_policy_ok')}`",
                f"- resume_policy_ok: `{summary.get('resume_policy_ok')}`",
                f"- sleep_prevention_mode_defined: `{summary.get('sleep_prevention_mode_defined')}`",
                f"- mac_autonomy_24h_guard_pass: `{summary.get('mac_autonomy_24h_guard_pass')}`",
                f"- fail_reason: `{summary.get('fail_reason', '')}`",
                "",
                "スリープ対策: policy `sleep_prevention.mode` と caffeinate / launchd を参照。",
                "",
            ]
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(main())
