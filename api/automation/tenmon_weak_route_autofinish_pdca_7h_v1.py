#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WEAK_ROUTE_AUTOFINISH_PDCA_7H_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def run(cmd: list[str], cwd: Path, timeout: int = 1800) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {"ok": p.returncode == 0, "exit_code": p.returncode, "stdout_tail": (p.stdout or "")[-4000:], "stderr_tail": (p.stderr or "")[-2000:]}
    except Exception as e:
        return {"ok": False, "exit_code": None, "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def choose_card(state: dict[str, Any]) -> str:
    if state.get("k1_status", {}).get("ok") is not True:
        return "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_CURSOR_AUTO_V1"
    if state.get("concept_status", {}).get("ok") is not True:
        return "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_CURSOR_AUTO_V1"
    if state.get("self_status", {}).get("ok") is not True:
        return "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_OBSERVE_V2"
    return "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_SEAL_V1"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--api", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--max-hours", type=float, default=7.0)
    ap.add_argument("--loop-limit", type=int, default=30)
    ap.add_argument("--state", required=True)
    ap.add_argument("--log-dir", required=True)
    args = ap.parse_args()

    root = Path(args.root).resolve()
    api = Path(args.api).resolve()
    auto = api / "automation"
    log_dir = Path(args.log_dir).resolve()
    log_dir.mkdir(parents=True, exist_ok=True)

    started = time.time()
    state = {
        "card": CARD,
        "started_at": utc(),
        "current_loop": 0,
        "elapsed_minutes": 0,
        "last_card": None,
        "last_result": None,
        "consecutive_passes": 0,
        "consecutive_no_improve": 0,
        "k1_status": {"ok": False},
        "concept_status": {"ok": False},
        "self_status": {"ok": False},
        "infra_status": {"ok": True},
        "stop_reason": None,
        "next_recommended_action": None,
    }

    while True:
        state["current_loop"] += 1
        loop = int(state["current_loop"])
        state["elapsed_minutes"] = int((time.time() - started) / 60)
        if state["elapsed_minutes"] >= int(args.max_hours * 60):
            state["stop_reason"] = "max_time_reached"
            break
        if loop > args.loop_limit:
            state["stop_reason"] = "loop_limit_reached"
            break

        card = choose_card(state)
        state["last_card"] = card

        # card action: observe/recheck 중심, runtime 本体への横展開 금지
        if card.endswith("_OBSERVE_V2"):
            card_run = {"ok": True, "mode": "observe_only"}
        elif card.endswith("_SEAL_V1"):
            # seal precondition gate only (no commit)
            diff = run(["git", "-C", str(root), "diff", "--name-only"], api, timeout=60)
            names = [x.strip() for x in str(diff.get("stdout_tail") or "").splitlines() if x.strip()]
            card_run = {"ok": names == ["api/src/routes/chat.ts"], "mode": "seal_gate_only", "diff_names": names}
        else:
            card_run = {"ok": True, "mode": "rehydration_recheck_only"}

        infra = [
            ("build", ["npm", "run", "build"], 7200),
            ("restart", ["sudo", "systemctl", "restart", "tenmon-ark-api.service"], 300),
            ("audit", ["curl", "-fsS", f"{args.base.rstrip('/')}/api/audit"], 120),
            ("audit_build", ["curl", "-fsS", f"{args.base.rstrip('/')}/api/audit.build"], 120),
        ]
        infra_rows = []
        infra_ok = True
        for name, cmd, timeout in infra:
            r = run(cmd, api, timeout)
            r["name"] = name
            infra_rows.append(r)
            if not r.get("ok"):
                infra_ok = False
                break
        state["infra_status"] = {"ok": infra_ok}
        if not infra_ok:
            state["stop_reason"] = "infra_failure"
            state["last_result"] = card_run
            write_json(Path(args.state), state)
            break

        probe_path = log_dir / f"loop_{loop}_probe.json"
        acc_path = log_dir / f"loop_{loop}_acceptance.json"
        audit_path = log_dir / f"loop_{loop}_audit.json"
        summary_path = log_dir / f"loop_{loop}_summary.md"

        pr = run([sys.executable, str(auto / "tenmon_weak_route_autofinish_probe_v1.py"), "--base", args.base, "--out", str(probe_path)], api, 1800)
        ac = run([sys.executable, str(auto / "tenmon_weak_route_autofinish_acceptance_v1.py"), "--in", str(probe_path), "--out", str(acc_path)], api, 600)
        acc = read_json(acc_path)
        k1_ok = bool((acc.get("k1_status") or {}).get("ok"))
        concept_ok = bool((acc.get("concept_status") or {}).get("ok"))
        self_ok = bool((acc.get("self_status") or {}).get("ok"))
        overall = bool(acc.get("overall_pass"))

        state["k1_status"] = {"ok": k1_ok}
        state["concept_status"] = {"ok": concept_ok}
        state["self_status"] = {"ok": self_ok}
        state["last_result"] = {"card_run": card_run, "probe": pr.get("ok"), "acceptance": ac.get("ok"), "overall_pass": overall}

        if overall:
            state["consecutive_passes"] = int(state["consecutive_passes"]) + 1
            state["consecutive_no_improve"] = 0
        else:
            state["consecutive_passes"] = 0
            state["consecutive_no_improve"] = int(state["consecutive_no_improve"]) + 1

        write_json(audit_path, {"card": CARD, "loop": loop, "infra": infra_rows, "card_run": card_run, "probe_run": pr, "acceptance_run": ac})
        summary_path.write_text(
            "\n".join(
                [
                    f"# loop {loop}",
                    f"- card: `{card}`",
                    f"- infra_ok: `{infra_ok}`",
                    f"- overall_pass: `{overall}`",
                    f"- consecutive_passes: `{state['consecutive_passes']}`",
                    f"- consecutive_no_improve: `{state['consecutive_no_improve']}`",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        write_json(Path(args.state), state)

        if int(state["consecutive_passes"]) >= 2:
            state["stop_reason"] = "two_consecutive_passes"
            break
        if int(state["consecutive_no_improve"]) >= 3:
            state["stop_reason"] = "three_no_improve"
            break

    state["elapsed_minutes"] = int((time.time() - started) / 60)
    if not state.get("stop_reason"):
        state["stop_reason"] = "completed"
    state["next_recommended_action"] = "TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1" if int(state.get("consecutive_passes", 0)) >= 2 else "TENMON_WEAK_ROUTE_3LANE_REHYDRATION_OBSERVE_V2"
    write_json(Path(args.state), state)

    run([sys.executable, str(auto / "tenmon_weak_route_autofinish_report_v1.py"), "--state", str(Path(args.state)), "--log-dir", str(log_dir)], api, 300)
    print(json.dumps({"ok": True, "state": str(Path(args.state)), "stop_reason": state.get("stop_reason")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

