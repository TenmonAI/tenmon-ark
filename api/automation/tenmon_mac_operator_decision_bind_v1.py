#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1 — decision route + Vision JSON 契約の current-run 証明。"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_MAC_SCREEN_OPERATOR_RUNTIME_CURSOR_AUTO_V1"

# 1x1 PNG (base64)
MIN_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def http_json(
    url: str,
    method: str,
    headers: dict[str, str],
    body: bytes | None,
    timeout: int = 120,
) -> tuple[int, dict[str, Any] | None, str]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            try:
                j = json.loads(raw) if raw.strip() else None
            except json.JSONDecodeError:
                return int(res.status), None, raw
            return int(res.status), j if isinstance(j, dict) else None, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            j = json.loads(raw) if raw.strip() else None
        except json.JSONDecodeError:
            return int(e.code), None, raw
        return int(e.code), j if isinstance(j, dict) else None, raw


def validate_decision_body(j: dict[str, Any]) -> bool:
    act = str(j.get("action") or "")
    if act not in ("click", "type", "paste", "wait", "done", "fail"):
        return False
    if not str(j.get("reason") or "").strip():
        return False
    if act == "click":
        x, y = j.get("x"), j.get("y")
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            return False
        if not (float(x) == float(x) and float(y) == float(y)):  # finite
            return False
    if act in ("type", "paste"):
        if not str(j.get("text") or ""):
            return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_operator_decision_bind_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    api_base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")
    founder_key = (os.environ.get("FOUNDER_KEY") or "CHANGE_ME_FOUNDER_KEY").strip()
    url = f"{api_base}/api/admin/mac/decision"

    screen_summary = auto / "tenmon_mac_screen_operator_runtime_summary.json"
    pre = read_json(screen_summary)
    precondition_ok = bool(pre.get("mac_screen_operator_runtime_pass") is True)
    if str(pre.get("card") or "") != PRE_CARD:
        precondition_ok = False

    decision_route_present = False
    decision_route_auth_guarded = False
    vision_decision_json_valid = False
    current_run_decision_ok = False

    # 404 ではないこと（ルート未登録なら 404）
    st_probe, _, _ = http_json(url, "POST", {"Content-Type": "application/json"}, b"{}", timeout=15)
    if st_probe == 404:
        decision_route_present = False
    else:
        decision_route_present = True

    st403, j403, _ = http_json(
        url,
        "POST",
        {"Content-Type": "application/json"},
        json.dumps(
            {"screenshot": MIN_PNG_B64, "job_id": "bind_probe_unauth", "context": ""},
            ensure_ascii=False,
        ).encode("utf-8"),
        timeout=30,
    )
    decision_route_auth_guarded = st403 == 403 and (j403 or {}).get("error") == "FOUNDER_REQUIRED"

    payload = {
        "screenshot": MIN_PNG_B64,
        "job_id": f"bind_decision_{int(time.time())}",
        "context": "TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1 proof",
    }
    st_ok, j_ok, raw_ok = http_json(
        url,
        "POST",
        {
            "Content-Type": "application/json",
            "X-Founder-Key": founder_key,
        },
        json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=120,
    )

    if st_ok == 200 and isinstance(j_ok, dict) and "action" in j_ok:
        vision_decision_json_valid = validate_decision_body(j_ok)
        current_run_decision_ok = vision_decision_json_valid
    elif st_ok == 503:
        vision_decision_json_valid = False
        current_run_decision_ok = False
    else:
        vision_decision_json_valid = False
        current_run_decision_ok = False

    mac_operator_decision_bind_pass = (
        decision_route_present
        and decision_route_auth_guarded
        and vision_decision_json_valid
        and current_run_decision_ok
        and precondition_ok
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "api_base": api_base,
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "decision_route_present": decision_route_present,
        "decision_route_auth_guarded": decision_route_auth_guarded,
        "vision_decision_json_valid": vision_decision_json_valid,
        "current_run_decision_ok": current_run_decision_ok,
        "mac_operator_decision_bind_pass": mac_operator_decision_bind_pass,
        "last_status": st_ok,
        "last_response_excerpt": (raw_ok[:800] if isinstance(raw_ok, str) else ""),
    }

    summary_path = auto / "tenmon_mac_operator_decision_bind_summary.json"
    report_path = auto / "tenmon_mac_operator_decision_bind_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- precondition_ok: `{precondition_ok}`",
                f"- decision_route_present: `{decision_route_present}`",
                f"- decision_route_auth_guarded: `{decision_route_auth_guarded}`",
                f"- vision_decision_json_valid: `{vision_decision_json_valid}`",
                f"- current_run_decision_ok: `{current_run_decision_ok}`",
                f"- mac_operator_decision_bind_pass: `{mac_operator_decision_bind_pass}`",
                f"- last_http_status: `{st_ok}`",
                "",
                "Vision 証明には `OPENAI_API_KEY` または `GEMINI_API_KEY` と API プロセスが必要。",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if mac_operator_decision_bind_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
