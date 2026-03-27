#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_OPERATOR_EXECUTE_APPLY_SAFE_PILOT_CURSOR_AUTO_V1

12h 本番の前段: execute + apply の bridge を 1〜2 loop だけ fail-closed で回す。

前提: queue は current_run が 1 件のみ、アクティブ候補は 2 件以下を推奨。
TENMON_PILOT_STRICT_ALLOWLIST=1（既定）なら current_run の cursor_card は ALLOWLIST のみ。

実行例:
  export TENMON_AUTONOMY_SAFE_SUMMARY_ROOT=/var/log/tenmon/autonomy_safe
  export TENMON_PILOT_LOOPS=2
  python3 tenmon_cursor_operator_execute_apply_safe_pilot_cursor_auto_v1.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_OPERATOR_EXECUTE_APPLY_SAFE_PILOT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_operator_execute_apply_safe_pilot_cursor_auto_v1.json"
QUEUE_NAME = "remote_cursor_queue.json"

ALLOWLIST = (
    "TENMON_WORLDCLASS_FINAL_REASONING_DENSITY_CURSOR_AUTO_V1",
    "TENMON_REFLECTION_STACK_WORKTREE_CONVERGENCE_CURSOR_AUTO_V1",
)


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


def _validate_safe_summary_root(repo: Path) -> tuple[bool, str]:
    env = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if not env:
        return False, "TENMON_AUTONOMY_SAFE_SUMMARY_ROOT unset"
    root = Path(os.path.expanduser(env)).resolve()
    allow = (os.environ.get("TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY") or "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if _is_under_repo(repo, root) and not allow:
        return False, "unsafe_summary_path_under_repo"
    try:
        root.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        return False, f"mkdir_failed:{e}"
    return True, str(root)


def _validate_queue(auto: Path) -> tuple[bool, str | None]:
    q = _read_json(auto / QUEUE_NAME)
    items = q.get("items") if isinstance(q.get("items"), list) else []
    rows = [x for x in items if isinstance(x, dict)]
    cur = [x for x in rows if x.get("current_run") is True]
    if len(cur) > 1:
        return False, "duplicate_current_run"
    active = [
        x
        for x in rows
        if str(x.get("state") or "").lower() in ("ready", "queued", "running")
        and x.get("cursor_card")
        and not x.get("fixture")
    ]
    if len(active) > 2:
        return False, "too_many_active_items"
    strict = (os.environ.get("TENMON_PILOT_STRICT_ALLOWLIST") or "1").strip().lower() in ("1", "true", "yes")
    if strict and cur:
        cc = str(cur[0].get("cursor_card") or "").strip()
        if cc and cc not in ALLOWLIST:
            return False, f"cursor_card_not_in_allowlist:{cc}"
    return True, None


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    auto = api / "automation"

    ok_root, root_msg = _validate_safe_summary_root(repo)
    q_ok, q_err = _validate_queue(auto)

    pilot_loops = (os.environ.get("TENMON_PILOT_LOOPS") or "2").strip()
    try:
        pl = int(pilot_loops)
        if pl not in (1, 2):
            pl = 2
    except ValueError:
        pl = 2

    base_out: dict[str, Any] = {
        "ok": False,
        "card": CARD,
        "safe_summary_root_ok": ok_root,
        "safe_summary_resolution": root_msg,
        "queue_validation_ok": q_ok,
        "queue_error": q_err,
        "pilot_loops": pl,
    }

    if not ok_root or not q_ok:
        base_out["next_card_if_fail"] = "TENMON_CURSOR_OPERATOR_AUTONOMY_TRACE_CURSOR_AUTO_V1"
        _atomic_write_json(auto / OUT_JSON, base_out)
        print(json.dumps(base_out, ensure_ascii=False, indent=2))
        return 1

    env = os.environ.copy()
    env.pop("TENMON_PDCA_SKIP_PROBES", None)
    env["TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE"] = "1"
    env["TENMON_12H_CURSOR_OPERATOR_BRIDGE"] = "1"
    env["TENMON_12H_CURSOR_OPERATOR_BRIDGE_APPLY"] = "1"
    env["TENMON_12H_MASTER_RESTART"] = os.environ.get("TENMON_12H_MASTER_RESTART", "1")
    env["TENMON_12H_PILOT_MAX_LOOPS"] = str(pl)
    env["TENMON_12H_MASTER_MAX_LOOPS"] = str(pl)
    env["TENMON_PDCA_RUN_BUILD"] = "1"
    env["TENMON_PDCA_SKIP_BUILD"] = "0"

    bridge = auto / "tenmon_cursor_operator_autonomy_bridge_v1.py"
    master = auto / "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.py"
    if not bridge.is_file() or not master.is_file():
        base_out["error"] = "missing_bridge_or_master"
        _atomic_write_json(auto / OUT_JSON, base_out)
        print(json.dumps(base_out, ensure_ascii=False, indent=2))
        return 1

    r1 = subprocess.run(
        [sys.executable, str(bridge), "--execute", "--apply"],
        cwd=str(api),
        env=env,
        capture_output=True,
        text=True,
        timeout=900,
    )
    r2 = subprocess.run(
        [sys.executable, str(master)],
        cwd=str(api),
        env=env,
        capture_output=True,
        text=True,
        timeout=7200,
    )

    out = {
        **base_out,
        "ok": r1.returncode == 0 and r2.returncode == 0,
        "bridge_exit_code": r1.returncode,
        "master_exit_code": r2.returncode,
        "bridge_stdout_tail": (r1.stdout or "")[-6000:],
        "bridge_stderr_tail": (r1.stderr or "")[-3000:],
        "master_stdout_tail": (r2.stdout or "")[-6000:],
        "master_stderr_tail": (r2.stderr or "")[-3000:],
        "next_card_if_fail": None
        if (r1.returncode == 0 and r2.returncode == 0)
        else "TENMON_CURSOR_OPERATOR_AUTONOMY_TRACE_CURSOR_AUTO_V1",
    }
    _atomic_write_json(auto / OUT_JSON, out)
    print(json.dumps({k: out[k] for k in out if not k.endswith("_tail")}, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
