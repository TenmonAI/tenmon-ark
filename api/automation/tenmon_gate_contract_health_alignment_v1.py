#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1

/api/health と /api/audit /api/audit.build の観測を統合し、gate 契約の整合を verdict に固定する。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1"
VERDICT_NAME = "tenmon_gate_contract_verdict.json"


def get_url(url: str, timeout: int = 45) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": e.code, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}


def gate_ok(body: str) -> bool:
    if not (body or "").strip():
        return False
    try:
        j = json.loads(body)
        if isinstance(j, dict) and j.get("ok") is False:
            return False
        return True
    except Exception:
        return len(body.strip()) > 2


def health_body_ok(body: str) -> bool:
    """getHealthReport 形式、または audit 整合の最小 /api/health（ok/timestamp/gitSha/readiness）。"""
    if not gate_ok(body):
        return False
    try:
        j = json.loads(body)
        if not isinstance(j, dict):
            return False
        if j.get("ok") is False:
            return False
        # TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT: readiness は audit と同一 getReadiness() 形状
        if isinstance(j.get("readiness"), dict) and j.get("timestamp") is not None:
            return True
        st = j.get("status")
        if st in ("ok", "degraded"):
            return True
        # ルート /health の {status: ok} 互換
        if j.get("status") == "ok" and "service" not in j:
            return True
        return "service" in j or "db" in j or "node" in j
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--health-optional",
        action="store_true",
        help="環境変数 TENMON_GATE_HEALTH_OPTIONAL=1 と同じ（health を契約必須にしない）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    base = str(args.base or "http://127.0.0.1:3000").rstrip("/")
    health_optional = bool(args.health_optional) or os.environ.get("TENMON_GATE_HEALTH_OPTIONAL", "").strip() in (
        "1",
        "true",
        "yes",
    )

    auto = Path(__file__).resolve().parent
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    h_api = get_url(base + "/api/health")
    h_root = get_url(base + "/health")
    a = get_url(base + "/api/audit")
    ab = get_url(base + "/api/audit.build")

    api_health_status = int(h_api.get("status") or 0)
    health_route_present = api_health_status == 200 and bool(h_api.get("ok"))

    if health_route_present:
        health_probe = h_api
        health_path_used = "/api/health"
    else:
        health_probe = h_root
        health_path_used = "/health"

    health_ok = bool(health_probe.get("ok")) and int(health_probe.get("status") or 0) == 200
    health_ok = health_ok and health_body_ok(health_probe.get("body") or "")

    audit_ok = bool(a.get("ok")) and int(a.get("status") or 0) == 200 and gate_ok(a.get("body") or "")
    audit_build_ok = bool(ab.get("ok")) and int(ab.get("status") or 0) == 200 and gate_ok(ab.get("body") or "")

    gate_contract_aligned = bool(audit_ok and audit_build_ok) and (bool(health_ok) or health_optional)

    if health_optional:
        recommended = "B: health は optional（監査は audit / audit.build を主契約とする）"
    elif health_route_present and health_ok:
        recommended = "A: /api/health を主契約として採用（audit 最小投影または getHealthReport）"
    elif not health_route_present and bool(h_root.get("ok")) and int(h_root.get("status") or 0) == 200:
        recommended = "移行中: /api/health をマウントし、/health は後方互換のみ"
    else:
        recommended = "A または B: /api/health の復旧、または TENMON_GATE_HEALTH_OPTIONAL=1 で gate 契約を明示"

    out: dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "generated_at": ts,
        "base": base,
        "health_route_present": health_route_present,
        "health_path_used": health_path_used,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "health_optional": health_optional,
        "gate_contract_aligned": gate_contract_aligned,
        "recommended_gate_policy": recommended,
        "probes": {
            "api_health": {"url": f"{base}/api/health", "status": h_api.get("status"), "ok": h_api.get("ok")},
            "root_health": {"url": f"{base}/health", "status": h_root.get("status"), "ok": h_root.get("ok")},
            "audit": {"url": f"{base}/api/audit", "status": a.get("status"), "ok": a.get("ok")},
            "audit_build": {"url": f"{base}/api/audit.build", "status": ab.get("status"), "ok": ab.get("ok")},
        },
    }

    out_path = auto / VERDICT_NAME
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0 if gate_contract_aligned else 1


if __name__ == "__main__":
    raise SystemExit(main())
