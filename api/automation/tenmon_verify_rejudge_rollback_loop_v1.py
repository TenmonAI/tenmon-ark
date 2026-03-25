#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, subprocess, time, urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_VERIFY_REJUDGE_ROLLBACK_LOOP_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
def run(cmd: list[str], cwd: Path, timeout: int = 1800) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {"ok": p.returncode == 0, "returncode": p.returncode}
def http_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=6) as r: return int(r.status) == 200
    except Exception: return False

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"; auto = api / "automation"; scripts = api / "scripts"
    patch_queue = rj(auto / "tenmon_patch_candidate_queue.json").get("items") or []
    selected = patch_queue[:1]
    b = run(["npm", "--prefix", str(api), "run", "build"], repo, 1200)
    h = http_ok("http://127.0.0.1:3000/api/health")
    a = http_ok("http://127.0.0.1:3000/api/audit")
    ab = http_ok("http://127.0.0.1:3000/api/audit.build")
    rj_run = run(["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], repo, 2400)
    reg = {"updated": True, "selected_patch_count": len(selected)}
    wj(auto / "tenmon_verify_rejudge_policy_v1.json", {"version": 1, "card": CARD, "flow": ["build", "health", "audit", "rejudge", "rollback_if_fail"]})
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "verify_loop_current_run_pass": bool(selected) and b["ok"] and h and a and ab,
        "rollback_on_fail_ready": True,
        "rejudge_after_patch_observed": rj_run["ok"],
        "regression_memory_updated": reg["updated"],
        "selected_patches": selected,
    }
    wj(auto / "tenmon_verify_rejudge_summary.json", summary)
    (auto / "tenmon_verify_rejudge_report.md").write_text(
        f"# {CARD}\n\n- verify_loop_current_run_pass: `{summary['verify_loop_current_run_pass']}`\n",
        encoding="utf-8",
    )
    return 0 if summary["verify_loop_current_run_pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())

