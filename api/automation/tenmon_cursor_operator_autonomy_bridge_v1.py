#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_OPERATOR_AUTONOMY_BRIDGE_CURSOR_AUTO_V1

queue から 1 枚だけ current を観測し、result bundle に current_run_entry / latest_current_run_entry を載せる。
execution gate（build / restart / audit / probe）と result return（repo 外 safe summary）は fail-closed。
--dry-run は bundle へ書かず stdout のみ。--apply で bundle / summary / OUT_JSON 更新。

環境変数:
  TENMON_REPO_ROOT
  TENMON_PDCA_BASE              既定 http://127.0.0.1:3000
  TENMON_PDCA_SKIP_PROBES       1 なら skipped_probe_mode を真にし、probe を成功扱いにしない
  TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE  1 で npm build + HTTP gates + 任意 systemctl status
  TENMON_12H_MASTER_RESTART     1 で restart 試行（12h と同様 sudo）
  TENMON_BRIDGE_GATE_WAIT_MAX_SEC       restart 成功後の health/audit 待機秒（既定 30）
  TENMON_BRIDGE_GATE_WAIT_INTERVAL_SEC  再試行間隔秒（既定 1）
  TENMON_AUTONOMY_SAFE_SUMMARY_ROOT      安全要約ルート（未設定は /tmp 系）
"""
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

_auto_here = Path(__file__).resolve().parent
if str(_auto_here) not in sys.path:
    sys.path.insert(0, str(_auto_here))

from tenmon_autonomy_execution_gate_summary_helpers_v1 import bridge_next_card

CARD = "TENMON_CURSOR_OPERATOR_AUTONOMY_BRIDGE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json"
QUEUE_NAME = "remote_cursor_queue.json"
BUNDLE_NAME = "remote_cursor_result_bundle.json"
NEXT_TRACE = "TENMON_CURSOR_OPERATOR_AUTONOMY_TRACE_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _is_under_repo(repo: Path, p: Path) -> bool:
    try:
        rp = repo.resolve()
        pp = p.resolve()
        return rp == pp or rp in pp.parents
    except Exception:
        return True


def _allow_repo_relative_summary() -> bool:
    v = (os.environ.get("TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY") or "").strip().lower()
    return v in ("1", "true", "yes")


def _resolve_safe_summary_root(repo: Path) -> tuple[Path, str]:
    env = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if env:
        root = Path(os.path.expanduser(env)).resolve()
        if _is_under_repo(repo, root) and not _allow_repo_relative_summary():
            raise OSError("unsafe_summary_path: use path outside repo or opt-in env")
        root.mkdir(parents=True, exist_ok=True)
        return root, "env"
    for root, tag in (
        (Path("/var/log/tenmon/autonomy_summaries"), "default"),
        (Path("/tmp/tenmon_autonomy_summaries"), "tmp"),
    ):
        try:
            root.mkdir(parents=True, exist_ok=True)
            if not _is_under_repo(repo, root.resolve()):
                return root.resolve(), tag
        except OSError:
            continue
    raise OSError("no safe summary root")


def _http_get(url: str, timeout: float = 20.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            code = int(getattr(r, "status", r.getcode()))
            j = json.loads(raw) if raw.strip().startswith("{") else {}
            return {"ok_http": 200 <= code < 300, "status": code, "json": j if isinstance(j, dict) else {}}
    except urllib.error.HTTPError as e:
        return {"ok_http": False, "status": int(e.code), "json": {}}
    except Exception as e:
        return {"ok_http": False, "status": 0, "error": str(e)[:200], "json": {}}


def _gates_ok(base: str) -> tuple[bool, dict[str, Any]]:
    b = base.rstrip("/")
    h = _http_get(f"{b}/api/health")
    a = _http_get(f"{b}/api/audit")
    ab = _http_get(f"{b}/api/audit.build")
    aj = a.get("json") or {}
    abj = ab.get("json") or {}
    hj = h.get("json") or {}
    ok = bool(
        h.get("ok_http")
        and aj.get("ok") is True
        and abj.get("ok") is True
        and (hj.get("ok") is True or hj.get("ok") is None)
    )
    return ok, {"health": h, "audit": a, "audit_build": ab}


def _summarize_gate_failure(gates: dict[str, Any]) -> str:
    h = gates.get("health") or {}
    a = gates.get("audit") or {}
    ab = gates.get("audit_build") or {}
    if not h.get("ok_http"):
        return f"health:{h.get('error') or h.get('status')}"
    hj = h.get("json") or {}
    if hj.get("ok") is False:
        return "health:json_ok_false"
    if not a.get("ok_http"):
        return f"audit:http:{a.get('error') or a.get('status')}"
    aj = a.get("json") or {}
    if aj.get("ok") is not True:
        return f"audit:json_ok={aj.get('ok')}"
    if not ab.get("ok_http"):
        return f"audit.build:http:{ab.get('error') or ab.get('status')}"
    abj = ab.get("json") or {}
    if abj.get("ok") is not True:
        return f"audit.build:json_ok={abj.get('ok')}"
    return "unknown"


def _gates_ok_with_readiness_wait(
    base: str,
    *,
    max_wait_sec: float,
    interval_sec: float,
) -> tuple[bool, dict[str, Any], dict[str, Any]]:
    """restart 直後の Connection refused 回避: 同一ゲートを最大 max_wait_sec まで再試行。"""
    t0 = time.monotonic()
    retries = 0
    last_gates: dict[str, Any] = {}
    last_err: str | None = None
    while True:
        ok, gates = _gates_ok(base)
        last_gates = gates
        elapsed = time.monotonic() - t0
        if ok:
            return True, gates, {
                "gate_wait_seconds": round(elapsed, 3),
                "gate_retry_count": retries,
                "gate_last_error": None,
            }
        last_err = _summarize_gate_failure(gates)
        if elapsed >= max_wait_sec:
            break
        retries += 1
        sleep_for = min(interval_sec, max(0.0, max_wait_sec - (time.monotonic() - t0)))
        if sleep_for > 0:
            time.sleep(sleep_for)
    return False, last_gates, {
        "gate_wait_seconds": round(time.monotonic() - t0, 3),
        "gate_retry_count": retries,
        "gate_last_error": last_err,
    }


def _run_npm_build(api: Path) -> dict[str, Any]:
    try:
        p = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(api),
            capture_output=True,
            text=True,
            timeout=600,
        )
        return {"ok": p.returncode == 0, "exit_code": p.returncode, "stderr_tail": (p.stderr or "")[-2000:]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _maybe_restart() -> dict[str, Any]:
    if os.environ.get("TENMON_12H_MASTER_RESTART", "").strip() not in ("1", "true", "yes"):
        return {"skipped": True}
    try:
        r = subprocess.run(
            ["sudo", "-n", "systemctl", "restart", "tenmon-ark-api.service"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        return {"ok": r.returncode == 0, "exit_code": r.returncode}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _systemctl_is_active() -> dict[str, Any]:
    try:
        r = subprocess.run(
            ["systemctl", "is-active", "tenmon-ark-api.service"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        out = (r.stdout or "").strip()
        return {"ok": out == "active", "stdout": out, "exit_code": r.returncode}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


def _normalize_queue_to_operator(state: str | None) -> str:
    s = str(state or "").lower().strip()
    m = {
        "ready": "queued",
        "queued": "queued",
        "running": "running",
        "blocked": "blocked",
        "failed": "failed",
        "executed": "success",
        "done": "success",
        "delivered": "success",
        "rejected": "failed",
        "approval_required": "blocked",
    }
    return m.get(s, "queued")


def _pick_queue_item(items: list[Any]) -> tuple[dict[str, Any] | None, str | None]:
    rows = [x for x in items if isinstance(x, dict)]
    cur = [x for x in rows if x.get("current_run") is True]
    if len(cur) > 1:
        return None, "duplicate_current_run"
    if len(cur) == 1:
        return cur[0], None
    for x in rows:
        st = str(x.get("state") or "").lower()
        if st in ("ready", "queued", "running") and x.get("cursor_card"):
            return x, None
    return None, "no_eligible_queue_item"


def _forensic_bundle(repo: Path, run_id: str, gates: dict[str, Any], build: dict[str, Any]) -> dict[str, Any]:
    out_dir = repo / "api" / "automation" / "out" / "cursor_operator_bridge" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    git_d = subprocess.run(
        ["git", "diff", "--stat"],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=30,
    )
    fb = {
        "card": CARD,
        "generated_at": _utc(),
        "git_diff_stat": {"rc": git_d.returncode, "stdout": (git_d.stdout or "")[-12000:]},
        "gates_snapshot": gates,
        "build_snapshot": {k: build.get(k) for k in ("ok", "exit_code", "error") if k in build or k == "ok"},
        "audit": gates.get("audit", {}) if isinstance(gates, dict) else {},
    }
    p = out_dir / "forensic_bundle.json"
    _atomic_write_json(p, fb)
    return {"path": str(p), "relative": str(p.relative_to(repo))}


def _run_supervisor_dry_run(auto: Path, api: Path) -> dict[str, Any]:
    p = auto / "tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py"
    if not p.is_file():
        return {"skipped": True, "reason": "missing_script"}
    r = subprocess.run(
        [sys.executable, str(p), "--dry-run"],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=300,
    )
    raw = (r.stdout or "").strip()
    j: dict[str, Any] = {}
    if raw:
        for ln in reversed([x.strip() for x in raw.splitlines() if x.strip().startswith("{")]):
            try:
                j = json.loads(ln)
                break
            except json.JSONDecodeError:
                continue
    return {"exit_code": r.returncode, "json": j, "stderr_tail": (r.stderr or "")[-1500:]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="bundle / ファイルを書かず stdout のみ")
    ap.add_argument("--apply", action="store_true", help="bundle / summary / OUT_JSON を更新")
    ap.add_argument("--execute", action="store_true", help="build + gates を実行（省略時は観測のみ）")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_PDCA_BASE", "http://127.0.0.1:3000").strip()
    skip_probes = os.environ.get("TENMON_PDCA_SKIP_PROBES", "").strip().lower() in ("1", "true", "yes")
    do_execute = args.execute or os.environ.get("TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    q = _read_json(auto / QUEUE_NAME)
    items = q.get("items") if isinstance(q.get("items"), list) else []
    item, qerr = _pick_queue_item(items)

    queue_single_flight_ready = qerr is None
    cursor_operator_bridge_ready = False
    execution_gate_ready = False
    result_return_ready = False
    failclosed_supervisor_bridge_ready = False
    twelve_hour_master_bridge_ready = True
    rollback_used = False

    policy = _read_json(auto / BUNDLE_NAME).get("autonomy_execution_gate_policy_v1")
    if not isinstance(policy, dict):
        policy = {"nextOnPass": "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1", "nextOnFail": "TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1"}

    started_at = _utc()
    ended_at: str | None = None
    summary_path_str: str | None = None
    summary_root_tag = ""
    build_info: dict[str, Any] = {}
    gates_detail: dict[str, Any] = {}
    gate_wait_meta: dict[str, Any] = {"gate_wait_seconds": 0.0, "gate_retry_count": 0, "gate_last_error": None}
    restart_info = _maybe_restart() if do_execute else {"skipped": True, "note": "no_execute"}
    build_pass = False
    restart_pass = restart_info.get("skipped") is True or restart_info.get("ok") is True
    audit_pass = False
    probe_pass = False
    gate_success = False
    normalized_status = "queued"
    next_card_if_fail: str | None = NEXT_TRACE
    forensic: dict[str, Any] = {}

    if qerr:
        out_fail = {
            "ok": False,
            "card": CARD,
            "cursor_operator_bridge_ready": False,
            "queue_single_flight_ready": False,
            "execution_gate_ready": False,
            "result_return_ready": False,
            "failclosed_supervisor_bridge_ready": False,
            "twelve_hour_master_bridge_ready": True,
            "rollback_used": False,
            "next_card_if_fail": "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1",
            "queue_error": qerr,
            "generated_at": _utc(),
        }
        if not args.dry_run:
            _atomic_write_json(auto / OUT_JSON, out_fail)
        print(json.dumps(out_fail, ensure_ascii=False, indent=2))
        return 1

    if item is None:
        out_fail = {
            "ok": False,
            "card": CARD,
            "cursor_operator_bridge_ready": False,
            "queue_single_flight_ready": True,
            "execution_gate_ready": False,
            "result_return_ready": False,
            "failclosed_supervisor_bridge_ready": False,
            "twelve_hour_master_bridge_ready": True,
            "rollback_used": False,
            "next_card_if_fail": NEXT_TRACE,
            "queue_error": "no_eligible_queue_item",
            "generated_at": _utc(),
        }
        if not args.dry_run:
            _atomic_write_json(auto / OUT_JSON, out_fail)
        print(json.dumps(out_fail, ensure_ascii=False, indent=2))
        return 1

    # item is valid
    cursor_card = str(item.get("cursor_card") or item.get("card") or "UNKNOWN").strip()
    qid = str(item.get("id") or item.get("job_id") or "").strip()
    normalized_status = _normalize_queue_to_operator(str(item.get("state")))

    summary_root_tag = ""
    try:
        root, summary_root_tag = _resolve_safe_summary_root(repo)
    except OSError:
        root = Path("/tmp/tenmon_autonomy_summaries")
        root.mkdir(parents=True, exist_ok=True)
        summary_root_tag = "fallback_tmp"
    safe_name = f"{CARD}__{cursor_card}__{started_at.replace(':', '').replace('-', '')}.json"
    summary_path = root / safe_name
    summary_path_str = str(summary_path)

    if do_execute:
        build_info = _run_npm_build(api)
        build_pass = bool(build_info.get("ok"))
        if os.environ.get("TENMON_12H_MASTER_RESTART", "").strip() in ("1", "true", "yes"):
            restart_info = _maybe_restart()
            restart_pass = restart_info.get("ok") is True
        else:
            restart_pass = bool(_systemctl_is_active().get("ok"))
        use_restart_gate_wait = (
            os.environ.get("TENMON_12H_MASTER_RESTART", "").strip() in ("1", "true", "yes")
            and restart_info.get("ok") is True
        )
        if use_restart_gate_wait:
            mw = float(os.environ.get("TENMON_BRIDGE_GATE_WAIT_MAX_SEC", "30"))
            iv = float(os.environ.get("TENMON_BRIDGE_GATE_WAIT_INTERVAL_SEC", "1"))
            gates_ok, gates_detail, gate_wait_meta = _gates_ok_with_readiness_wait(
                base, max_wait_sec=max(0.0, mw), interval_sec=max(0.0, iv)
            )
        else:
            gates_ok, gates_detail = _gates_ok(base)
        audit_pass = gates_ok
        probe_pass = gates_ok and not skip_probes
        if skip_probes:
            probe_pass = False
        gate_success = bool(build_pass and restart_pass and audit_pass and probe_pass and not skip_probes)
        if not gate_success:
            normalized_status = "failed"
            if skip_probes and build_pass and audit_pass:
                normalized_status = "blocked"
            forensic = _forensic_bundle(repo, started_at.replace(":", "").replace("-", ""), gates_detail, build_info)
            sup = _run_supervisor_dry_run(auto, api)
            failclosed_supervisor_bridge_ready = sup.get("exit_code") == 0 and bool(sup.get("json", {}).get("ok") is not False)
            rollback_used = bool(sup.get("json", {}).get("rollback_used") is True)
        ended_at = _utc()
    else:
        build_pass = audit_pass = probe_pass = False
        gate_success = False
        normalized_status = "queued"
        summary_path_str = None
        ended_at = None

    entry: dict[str, Any] = {
        "schema_version": 3,
        "card": CARD,
        "cursor_card": cursor_card,
        "queue_id": qid,
        "operator_status": normalized_status,
        "status": normalized_status,
        "started_at": started_at,
        "ended_at": ended_at,
        "summary_path": summary_path_str,
        "skipped_probe_mode": skip_probes,
        "execution_gate": {
            "build_pass": build_pass,
            "restart_pass": restart_pass,
            "audit_pass": audit_pass,
            "probe_pass": probe_pass,
            "gate_success": gate_success,
        },
        "restart_info": restart_info,
        "gate_wait_seconds": gate_wait_meta.get("gate_wait_seconds", 0.0),
        "gate_retry_count": gate_wait_meta.get("gate_retry_count", 0),
        "gate_last_error": gate_wait_meta.get("gate_last_error"),
        "build": build_info,
        "gates": gates_detail,
        "forensic_bundle": forensic,
    }
    enriched = dict(entry)
    enriched["execution_gate"] = entry["execution_gate"]
    nc = bridge_next_card(policy, enriched)
    entry["next_card"] = nc
    next_card_if_fail = nc if not gate_success else None

    result_return_ready = False
    if summary_path_str and (not args.dry_run) and do_execute:
        summary_body = {
            "card": CARD,
            "cursor_card": cursor_card,
            "queue_id": qid,
            "started_at": started_at,
            "ended_at": ended_at,
            "status": normalized_status,
            "next_card": entry.get("next_card"),
            "skipped_probe_mode": skip_probes,
            "execution_gate": entry["execution_gate"],
        }
        try:
            _atomic_write_json(Path(summary_path_str), summary_body)
            result_return_ready = True
        except OSError:
            result_return_ready = False

    cursor_operator_bridge_ready = True
    execution_gate_ready = (gate_success if do_execute else True)
    if do_execute and gate_success:
        failclosed_supervisor_bridge_ready = True
    elif not do_execute:
        failclosed_supervisor_bridge_ready = True

    if args.apply and not args.dry_run:
        bundle = _read_json(auto / BUNDLE_NAME)
        bundle["cursor_operator_bridge_v1"] = {
            "version": 1,
            "card": CARD,
            "updated_at": _utc(),
            "queue_ok": queue_single_flight_ready,
            "current_run_entry": entry,
            "latest_current_run_entry": entry,
            "summary_root_resolution": summary_root_tag,
        }
        bundle["current_run_entry"] = entry
        bundle["latest_current_run_entry"] = entry
        ents = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
        ents.append(entry)
        bundle["entries"] = ents
        bundle["updatedAt"] = _utc()
        _atomic_write_json(auto / BUNDLE_NAME, bundle)

    out: dict[str, Any] = {
        "ok": bool(
            queue_single_flight_ready
            and cursor_operator_bridge_ready
            and ((not do_execute) or (gate_success and not skip_probes)),
        ),
        "card": CARD,
        "cursor_operator_bridge_ready": cursor_operator_bridge_ready,
        "queue_single_flight_ready": queue_single_flight_ready,
        "execution_gate_ready": execution_gate_ready,
        "result_return_ready": result_return_ready if do_execute else True,
        "failclosed_supervisor_bridge_ready": failclosed_supervisor_bridge_ready,
        "twelve_hour_master_bridge_ready": twelve_hour_master_bridge_ready,
        "rollback_used": rollback_used,
        "next_card_if_fail": (next_card_if_fail if not gate_success else None) or (NEXT_TRACE if do_execute and not gate_success else None),
        "queue_error": None,
        "skipped_probe_mode": skip_probes,
        "generated_at": _utc(),
    }
    if not do_execute:
        out["ok"] = True
        out["next_card_if_fail"] = None
    if skip_probes and do_execute:
        out["ok"] = False
        out["next_card_if_fail"] = out.get("next_card_if_fail") or NEXT_TRACE

    if not args.dry_run:
        _atomic_write_json(auto / OUT_JSON, out)

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
