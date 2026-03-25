#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTRACT_STABILIZATION_MASTER_CURSOR_AUTO_V1
収束整流カード: audit.build / output contract / projector bleed を観測→最小補修後に再観測する。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_CONTRACT_STABILIZATION_MASTER_CURSOR_AUTO_V1"
VPS = "TENMON_CONTRACT_STABILIZATION_MASTER_VPS_V1"
FAIL_NEXT = "TENMON_CONTRACT_STABILIZATION_MASTER_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _fetch_json(url: str, method: str = "GET", body: Dict[str, Any] | None = None, timeout: float = 8.0) -> Tuple[int, Dict[str, Any], str]:
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                return r.getcode(), json.loads(raw), raw
            except Exception:
                return r.getcode(), {}, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw), raw
        except Exception:
            return e.code, {}, raw
    except Exception as e:
        return 0, {}, str(e)


def _run(cmd: List[str], cwd: Path, timeout: int = 300) -> Dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, check=False, timeout=timeout)
    return {"rc": p.returncode, "stdout_tail": (p.stdout or "")[-5000:], "stderr_tail": (p.stderr or "")[-5000:]}


def _resolve_alias_for_system(system: str, canonical_dir: Path) -> Dict[str, Any]:
    m = {
        "chat_refactor_os": "TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1",
        "self_improvement_os": "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1",
        "kokuzo_learning_os": "TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1",
    }
    expected = {
        "chat_refactor_os": ["chat_refactor_os_manifest.json", "governance_verdict.json", "card_manifest.json", "integrated_final_verdict.json"],
        "self_improvement_os": ["self_improvement_os_manifest.json", "seal_governor_verdict.json", "next_card_dispatch.json", "integrated_final_verdict.json"],
        "kokuzo_learning_os": ["integrated_learning_verdict.json", "integrated_final_verdict.json", "learning_improvement_os_manifest.json", "learning_steps.json"],
    }
    card_root = Path("/var/log/tenmon") / f"card_{m[system]}"
    latest = None
    if card_root.is_dir():
        dirs = sorted([x for x in card_root.iterdir() if x.is_dir()], key=lambda p: p.stat().st_mtime, reverse=True)
        if dirs:
            latest = dirs[0]
    alias_dir = latest / "_self_improvement_os_integrated" if (latest and system == "self_improvement_os") else latest

    missing_real: List[str] = []
    path_mismatch: List[str] = []
    for name in expected[system]:
        c = (canonical_dir / name).is_file()
        a = (alias_dir / name).is_file() if alias_dir else False
        if not c and not a:
            missing_real.append(name)
        elif not c and a:
            path_mismatch.append(name)
    return {
        "system": system,
        "canonical_path": str(canonical_dir),
        "alias_path": str(alias_dir) if alias_dir else None,
        "missing_real": missing_real,
        "path_mismatch": path_mismatch,
    }


def _output_contract_normalize(api: Path) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    base = api / "automation" / "out"
    systems = {
        "chat_refactor_os": base / "tenmon_chat_refactor_os_v1",
        "self_improvement_os": base / "tenmon_self_improvement_os_v1",
        "kokuzo_learning_os": base / "tenmon_kokuzo_learning_improvement_os_v1",
    }
    normalized: Dict[str, Any] = {"version": 1, "card": CARD, "generated_at": _utc(), "systems": {}}
    mismatch: Dict[str, Any] = {"version": 1, "card": CARD, "generated_at": _utc(), "systems": {}, "path_mismatch_count": 0, "real_missing_count": 0}
    for name, path in systems.items():
        info = _resolve_alias_for_system(name, path)
        normalized["systems"][name] = info
        mismatch["systems"][name] = {"path_mismatch": info["path_mismatch"], "real_missing": info["missing_real"]}
        mismatch["path_mismatch_count"] += len(info["path_mismatch"])
        mismatch["real_missing_count"] += len(info["missing_real"])
    return normalized, mismatch


def _projector_bleed_guard(api_base: str, api: Path) -> Dict[str, Any]:
    src = api / "src" / "core" / "responseComposer.ts"
    txt = src.read_text(encoding="utf-8", errors="replace") if src.is_file() else ""
    static_guard = "TENMON_GENERAL_SCRIPTURE_BLEED_GUARD_V1" in txt
    general_probe = {
        "message": "今日は気分が落ちています。次の一手だけください。",
        "threadId": f"stabilize-general-{int(datetime.now().timestamp())}",
    }
    scripture_probe = {
        "message": "法華経の核心を短く教えてください。",
        "threadId": f"stabilize-scripture-{int(datetime.now().timestamp())}",
    }
    c1, j1, r1 = _fetch_json(f"{api_base}/api/chat", method="POST", body=general_probe, timeout=14)
    c2, j2, r2 = _fetch_json(f"{api_base}/api/chat", method="POST", body=scripture_probe, timeout=14)
    def _extract_route(o: Any) -> str:
        if isinstance(o, dict):
            for k in ("routeReason", "route", "reason"):
                if k in o and isinstance(o[k], str):
                    return o[k]
            for v in o.values():
                rr = _extract_route(v)
                if rr:
                    return rr
        elif isinstance(o, list):
            for v in o:
                rr = _extract_route(v)
                if rr:
                    return rr
        return ""
    g_route = _extract_route(j1)
    s_route = _extract_route(j2)
    return {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "static_guard_present": static_guard,
        "general_probe": {"status": c1, "routeReason": g_route, "raw_head": r1[:400]},
        "scripture_probe": {"status": c2, "routeReason": s_route, "raw_head": r2[:400]},
        "bleed_suspected": bool("SCRIPTURE" in g_route.upper() and "GENERAL" not in g_route.upper()),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--api-base", default="http://127.0.0.1:3000")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    auto = api / "automation"

    build = _run(["npm", "run", "build"], cwd=api)
    systemctl_status = _run(["systemctl", "--no-pager", "--full", "status", "tenmon-ark-api.service"], cwd=api, timeout=60)
    restart = _run(["systemctl", "restart", "tenmon-ark-api.service"], cwd=api, timeout=60)

    h_code, health, _ = _fetch_json(f"{args.api_base}/health")
    a_code, audit, _ = _fetch_json(f"{args.api_base}/api/audit")
    ab_code, audit_build, audit_build_raw = _fetch_json(f"{args.api_base}/api/audit.build")

    (auto / "audit_build.json").write_text((json.dumps(audit_build, ensure_ascii=False, indent=2) + "\n") if audit_build else (audit_build_raw + "\n"), encoding="utf-8")
    (auto / "audit_build_contract.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "api_audit_build_status": ab_code,
                "api_audit_build_ok": ab_code == 200 and isinstance(audit_build, dict),
                "audit_build_valid_json": isinstance(audit_build, dict) and len(audit_build) > 0,
                "fail_next_card": FAIL_NEXT if ab_code != 200 else None,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    normalized, mismatch = _output_contract_normalize(api)
    (auto / "output_contracts_normalized.json").write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / "output_contract_path_mismatch.json").write_text(json.dumps(mismatch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    bleed = _projector_bleed_guard(args.api_base, api)
    (auto / "projector_bleed_guard_report.json").write_text(json.dumps(bleed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    blockers: List[str] = []
    if h_code != 200:
        blockers.append("health_not_200")
    if a_code != 200:
        blockers.append("api_audit_not_200")
    if ab_code != 200:
        blockers.append("api_audit_build_not_200")
    if mismatch["real_missing_count"] > 0:
        blockers.append("output_contract_real_missing")
    if mismatch["path_mismatch_count"] > 0:
        blockers.append("output_contract_path_mismatch_present")
    if bleed.get("bleed_suspected"):
        blockers.append("general_scripture_projector_bleed_suspected")
    if build["rc"] != 0:
        blockers.append("npm_build_failed")

    summary = {
        "version": 1,
        "card": CARD,
        "generatedAt": _utc(),
        "overall_converged": len(blockers) == 0,
        "blockers": blockers,
        "checks": {
            "health_200": h_code == 200,
            "api_audit_200": a_code == 200,
            "api_audit_build_200": ab_code == 200,
            "build_success": build["rc"] == 0,
            "systemctl_restart_success": restart["rc"] == 0,
            "projector_bleed_suspected": bool(bleed.get("bleed_suspected")),
        },
        "paths": {
            "audit_build_contract": str(auto / "audit_build_contract.json"),
            "output_contracts_normalized": str(auto / "output_contracts_normalized.json"),
            "output_contract_path_mismatch": str(auto / "output_contract_path_mismatch.json"),
            "projector_bleed_guard_report": str(auto / "projector_bleed_guard_report.json"),
        },
    }
    next_cards = {
        "version": 1,
        "card": CARD,
        "generatedAt": _utc(),
        "next_cards": [{"source": "contract_stabilization", "cursor_card": FAIL_NEXT}] if blockers else [],
    }
    (auto / "state_convergence_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / "state_convergence_next_cards.json").write_text(json.dumps(next_cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / "contract_stabilization_master_report.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "build": build,
                "systemctl_status": systemctl_status,
                "systemctl_restart": restart,
                "health_status": h_code,
                "audit_status": a_code,
                "audit_build_status": ab_code,
                "blockers": blockers,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    marker = auto / VPS
    marker.write_text(f"{VPS}\n{_utc()}\nblockers={len(blockers)}\n", encoding="utf-8")
    (auto / "build.log").write_text((build["stdout_tail"] + "\n" + build["stderr_tail"]).strip() + "\n", encoding="utf-8")
    (auto / "systemctl_status.txt").write_text((systemctl_status["stdout_tail"] + "\n" + systemctl_status["stderr_tail"]).strip() + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps({"ok": len(blockers) == 0, "blockers": blockers}, ensure_ascii=False, indent=2))
    return 0 if len(blockers) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

