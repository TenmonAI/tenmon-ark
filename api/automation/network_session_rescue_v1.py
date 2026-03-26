#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1

Mac / VPS 間の network / bearer refresh / executor auth state を観測し、
1 実行あたり高々 1 回だけ safe rescue（network 再試行 XOR auth refresh 再試行）。
token の捏造はしない。state 欠落は login 未済として manual_required。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1"
OUT_JSON = "network_session_rescue_summary.json"
NEXT_ON_PASS = "TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。network rescue retry 1枚のみ生成。"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def default_state_path() -> Path:
    return Path.home() / "tenmon-mac" / "executor_auth.json"


def state_path_resolved() -> Path:
    env_p = os.environ.get("TENMON_MAC_EXECUTOR_AUTH_STATE", "").strip()
    return Path(env_p).expanduser() if env_p else default_state_path()


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def http_get(url: str, headers: dict[str, str], timeout: float = 12.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = int(getattr(resp, "status", resp.getcode()))
            _ = resp.read(6000)
        return {"ok": 200 <= code < 300, "http_code": code, "error": None}
    except urllib.error.HTTPError as e:
        try:
            e.read(800)
        except Exception:
            pass
        return {"ok": False, "http_code": int(e.code), "error": None}
    except Exception as e:
        return {"ok": False, "http_code": None, "error": str(e)[:220]}


def probe_health(base: str) -> dict[str, Any]:
    return http_get(f"{base.rstrip('/')}/api/health", {})


def probe_queue(base: str, bearer: str) -> dict[str, Any]:
    h = {"Authorization": f"Bearer {bearer}"} if bearer else {}
    r = http_get(f"{base.rstrip('/')}/api/admin/cursor/queue", h)
    return r


def load_bearer_from_state(path: Path) -> str:
    st = read_json(path)
    return str(st.get("token") or "").strip()


def auth_state_issue(path: Path) -> tuple[bool, str]:
    if not path.is_file():
        return True, "executor_auth_state_file_missing"
    st = read_json(path)
    if not st.get("refresh_token"):
        return True, "refresh_token_missing_in_state"
    return False, ""


def run_auth_refresh(py: str, script: Path, skew: int) -> dict[str, Any]:
    cmd = [py, str(script), f"--skew-sec", str(skew)]
    try:
        cp = subprocess.run(cmd, capture_output=True, text=True, timeout=90, check=False, env=os.environ.copy())
        return {
            "ok": cp.returncode == 0,
            "exit_code": cp.returncode,
            "stderr_tail": (cp.stderr or "")[-1200:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "stderr_tail": f"{type(e).__name__}: {e}"}


def emit(
    *,
    ok: bool,
    rescue_attempted: bool,
    rescue_executed: bool,
    manual_review_required: bool,
    reason: str,
    failure_phase: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    o: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "ok": ok,
        "rescue_attempted": rescue_attempted,
        "rescue_executed": rescue_executed,
        "manual_review_required": manual_review_required,
        "reason": reason,
        "failure_phase": failure_phase,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
    }
    if extra:
        o.update(extra)
    return o


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "").strip().rstrip("/")
    if not base:
        out = emit(
            ok=False,
            rescue_attempted=False,
            rescue_executed=False,
            manual_review_required=True,
            reason="TENMON_REMOTE_CURSOR_BASE_URL_missing",
            failure_phase="config",
        )
        (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
        return 0

    st_path = state_path_resolved()
    py = os.environ.get("TENMON_MAC_PYTHON", sys.executable)
    refresh_script = Path(
        os.environ.get("TENMON_MAC_AUTH_REFRESH_SCRIPT", str(repo / "api" / "automation" / "tenmon_mac_executor_auth_refresh_v1.py"))
    ).expanduser()
    skew = int(os.environ.get("TENMON_NETWORK_RESCUE_AUTH_SKEW_SEC", "300"))

    rescue_attempted = False
    rescue_executed = False
    rescue_budget = 1
    failure_phase = "none"
    manual_required = False
    reason = "all_probes_ok"
    extra: dict[str, Any] = {"base_url_configured": True, "executor_auth_state_path": str(st_path)}

    # 1) network（health）— rescue_budget を最大 1 消費
    h1 = probe_health(base)
    extra["health_probe_initial"] = h1
    if not h1.get("ok"):
        failure_phase = "network_health"
        reason = "network_health_unreachable"
        rescue_budget -= 1
        rescue_attempted = True
        time.sleep(1.0)
        h2 = probe_health(base)
        extra["health_probe_retry"] = h2
        if h2.get("ok"):
            rescue_executed = True
            reason = "network_health_recovered_after_retry"
            failure_phase = "none"
        else:
            manual_required = False
            out = emit(
                ok=False,
                rescue_attempted=rescue_attempted,
                rescue_executed=rescue_executed,
                manual_review_required=manual_required,
                reason=reason,
                failure_phase=failure_phase,
                extra=extra,
            )
            (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
            return 0

    # 2) browser session = executor auth state（login 未済）
    bad_state, why_state = auth_state_issue(st_path)
    if bad_state:
        failure_phase = "browser_session"
        manual_required = True
        reason = why_state
        out = emit(
            ok=False,
            rescue_attempted=False,
            rescue_executed=False,
            manual_review_required=manual_required,
            reason=reason,
            failure_phase=failure_phase,
            extra=extra,
        )
        (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
        return 0

    # 3) queue + bearer（捏造せず state からのみ）
    token = load_bearer_from_state(st_path)
    q1 = probe_queue(base, token)
    extra["queue_probe_initial"] = {"ok": q1.get("ok"), "http_code": q1.get("http_code"), "error": q1.get("error")}

    if q1.get("ok"):
        if rescue_executed:
            reason = "ok_after_network_rescue"
        out = emit(
            ok=True,
            rescue_attempted=rescue_attempted,
            rescue_executed=rescue_executed,
            manual_review_required=False,
            reason=reason,
            failure_phase="none",
            extra=extra,
        )
        (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
        return 0

    failure_phase = "queue_api"
    if q1.get("http_code") in (401, 403) or not token:
        failure_phase = "token_refresh"
        reason = "queue_unauthorized_or_forbidden_or_empty_token"

    token_rescue_eligible = bool(q1.get("http_code") in (401, 403) or not token)

    # 高々 1 回: auth refresh（rescue_budget が残っているときのみ）
    if token_rescue_eligible and rescue_budget > 0:
        rescue_budget -= 1
        rescue_attempted = True
        rr = run_auth_refresh(py, refresh_script, skew)
        extra["auth_refresh_attempt"] = rr
        if rr.get("ok"):
            rescue_executed = True
            token2 = load_bearer_from_state(st_path)
            q2 = probe_queue(base, token2)
            extra["queue_probe_after_refresh"] = {"ok": q2.get("ok"), "http_code": q2.get("http_code"), "error": q2.get("error")}
            if q2.get("ok"):
                out = emit(
                    ok=True,
                    rescue_attempted=rescue_attempted,
                    rescue_executed=rescue_executed,
                    manual_review_required=False,
                    reason="queue_ok_after_auth_refresh",
                    failure_phase="none",
                    extra=extra,
                )
                (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
                return 0
            reason = "queue_still_failing_after_refresh"
            manual_required = q2.get("http_code") in (401, 403)
        else:
            rescue_executed = False
            reason = "token_refresh_subprocess_failed"
            manual_required = True
            if rr.get("exit_code") == 2:
                failure_phase = "browser_session"
                reason = "auth_refresh_exit_2_state_or_refresh_token_invalid"
    elif not token_rescue_eligible:
        reason = "queue_error_not_token_related_no_auth_refresh_attempted"
        hcq = q1.get("http_code")
        manual_required = hcq is None or (isinstance(hcq, int) and 400 <= hcq < 500 and hcq not in (404,))
    else:
        reason = "queue_failed_rescue_budget_exhausted_after_network_retry"
        manual_required = True

    out = emit(
        ok=False,
        rescue_attempted=rescue_attempted,
        rescue_executed=rescue_executed,
        manual_review_required=manual_required,
        reason=reason,
        failure_phase=failure_phase,
        extra=extra,
    )
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: out[k] for k in ("ok", "rescue_attempted", "rescue_executed", "manual_review_required", "reason")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
