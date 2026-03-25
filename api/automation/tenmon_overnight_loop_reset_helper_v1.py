#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OVERNIGHT_LOOP_RESUME_STABLE_CURSOR_AUTO_V1

観測/evidence 付きで overnight loop の state/lock/queue をリセットし、
必要なら stale truth refresh を実行する。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_OVERNIGHT_LOOP_RESET_HELPER_V1"
OUT = "tenmon_overnight_loop_reset_helper_summary.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _backup(p: Path, dest_dir: Path) -> str | None:
    if not p.exists():
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    dst = dest_dir / p.name
    try:
        shutil.copy2(str(p), str(dst))
        return str(dst)
    except Exception:
        return None


def _run(cmd: list[str], cwd: Path) -> dict[str, Any]:
    try:
        r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=2400, check=False)
        return {
            "ok": r.returncode == 0,
            "returncode": r.returncode,
            "stdout_tail": (r.stdout or "")[-1600:],
            "stderr_tail": (r.stderr or "")[-1600:],
        }
    except Exception as e:
        return {"ok": False, "returncode": None, "error": str(e)[:200]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset-state", action="store_true")
    ap.add_argument("--reset-queue", action="store_true")
    ap.add_argument("--clear-lock", action="store_true")
    ap.add_argument("--refresh-stale-truth", action="store_true")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"

    state_path = auto / "tenmon_overnight_autonomy_state_v1.json"
    queue_path = auto / "tenmon_overnight_autonomy_queue_v1.json"
    lock_path = auto / ".tenmon_overnight_loop.lock"

    run_id = f"overnight_reset_{_utc_iso().replace(':','').replace('-','')}"
    out_dir = auto / "out" / "overnight_reset" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    backups = {
        "state_backup": _backup(state_path, out_dir),
        "queue_backup": _backup(queue_path, out_dir),
        "lock_backup": _backup(lock_path, out_dir),
    }

    actions: list[str] = []
    if args.clear_lock and lock_path.exists():
        try:
            lock_path.unlink()
            actions.append("lock_cleared")
        except Exception:
            actions.append("lock_clear_failed")

    if args.reset_state:
        st = _read(state_path)
        st.update(
            {
                "card": st.get("card") or "TENMON_OVERNIGHT_FULL_AUTONOMY_COMPLETION_LOOP_CURSOR_AUTO_V1",
                "updated_at": _utc_iso(),
                "last_updated": _utc_iso(),
                "running": False,
                "finished": False,
                "stop_reason": None,
                "consecutive_fail": 0,
                "cycle": 0,
                "cycle_count": 0,
            }
        )
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        actions.append("state_reset")

    if args.reset_queue:
        q = _read(queue_path)
        q.update({"generated_at": _utc_iso()})
        if isinstance(q.get("items"), list):
            for it in q["items"]:
                if isinstance(it, dict):
                    it.setdefault("retry_count", 0)
                    it["status"] = "pending"
        queue_path.parent.mkdir(parents=True, exist_ok=True)
        queue_path.write_text(json.dumps(q, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        actions.append("queue_reset_pending")

    stale_refresh = {"ok": False, "skip": True}
    if args.refresh_stale_truth:
        sh = scripts / "tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh"
        stale_refresh = _run(["bash", str(sh)], repo) if sh.is_file() else {"ok": False, "error": "missing_refresh_script"}
        actions.append("stale_truth_refresh_attempted")

    out = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "run_id": run_id,
        "actions": actions,
        "backups": backups,
        "stale_truth_refresh": stale_refresh,
    }
    (auto / OUT).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(auto / OUT), "actions": actions}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

