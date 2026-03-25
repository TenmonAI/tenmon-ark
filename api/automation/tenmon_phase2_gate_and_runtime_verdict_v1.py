#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1
gate 契約（health/audit）と Playwright lived 環境を単一 verdict に統合する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_phase2_gate_and_runtime_verdict.json"
FAIL_NEXT = "TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1"
GATE_SCRIPT = "tenmon_gate_contract_health_alignment_v1.py"


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--refresh-gates", action="store_true", help="先に tenmon_gate_contract_health_alignment_v1.py を実行")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    if args.refresh_gates:
        gs = auto / GATE_SCRIPT
        if gs.is_file():
            subprocess.run(
                [sys.executable, str(gs), "--base", str(args.base)],
                cwd=str(auto),
                check=False,
            )

    gate = read_json(auto / "tenmon_gate_contract_verdict.json")
    pf = read_json(auto / "pwa_playwright_preflight.json")

    health_ok = bool(gate.get("health_ok"))
    health_opt = bool(gate.get("health_optional"))
    audit_ok = bool(gate.get("audit_ok"))
    audit_build_ok = bool(gate.get("audit_build_ok"))
    gate_aligned = bool(gate.get("gate_contract_aligned"))

    # health 契約: /api/health が通るか、optional 明示で濁りを止める
    health_contract_aligned = bool(health_ok or health_opt)
    audit_contract_aligned = bool(audit_ok and audit_build_ok)

    py_ok = bool(pf.get("python_playwright_ok"))
    node_ok = bool(pf.get("node_playwright_ok"))
    py_launch = bool(pf.get("python_chromium_launch_ok") or pf.get("browser_launch_ok_python"))
    node_launch = bool(pf.get("browser_launch_ok_node_probe") or (pf.get("node_probe") or {}).get("browser_launch_ok"))

    playwright_python_ok = bool(py_ok and py_launch)
    playwright_node_ok = bool(node_ok and node_launch)

    driver = pf.get("driver_selected") or pf.get("selected_driver")
    usable = bool(pf.get("usable"))
    env_failure = bool(pf.get("env_failure"))

    # usable=true が単一 driver 確定の真値（preflight 契約）
    phase2_pass = bool(gate_aligned and usable and not env_failure)

    fail_reasons: list[str] = []
    if not gate_aligned:
        fail_reasons.append("gate_contract_not_aligned")
    if env_failure or not usable:
        fail_reasons.append("playwright_env_not_usable")
    if not playwright_python_ok and not playwright_node_ok:
        fail_reasons.append("both_python_and_node_launch_failed")

    rec = None
    if phase2_pass:
        rec = None
    elif not gate_aligned:
        rec = "TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_RETRY_V1"
    elif env_failure or not usable:
        rec = "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1"
    else:
        rec = FAIL_NEXT

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "health_contract_aligned": health_contract_aligned,
        "audit_contract_aligned": audit_contract_aligned,
        "gate_contract_aligned": gate_aligned,
        "health_route_present": gate.get("health_route_present"),
        "health_ok": health_ok,
        "health_optional": health_opt,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "playwright_python_ok": playwright_python_ok,
        "playwright_node_ok": playwright_node_ok,
        "driver_selected": driver,
        "usable": usable,
        "env_failure": env_failure,
        "phase2_pass": phase2_pass,
        "fail_reasons": fail_reasons,
        "recommended_next_card": rec,
        "inputs": {
            "tenmon_gate_contract_verdict": str(auto / "tenmon_gate_contract_verdict.json"),
            "pwa_playwright_preflight": str(auto / "pwa_playwright_preflight.json"),
        },
        "fail_next_card": FAIL_NEXT,
    }

    (auto / OUT_NAME).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0 if phase2_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
