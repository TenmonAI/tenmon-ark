#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_OPERATOR_READINESS_FINAL_CURSOR_AUTO_V1

最終段として Mac operator readiness を再判定し、成功時のみ master/bundle を最小更新する。
fail-closed: readiness 未達または書き込み失敗時は ok=false。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_OPERATOR_READINESS_FINAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_mac_operator_readiness_final_cursor_auto_v1.json"
NEXT_ON_FAIL = "TENMON_FINAL_SEAL_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _pick_master(auto: Path) -> tuple[Path, dict[str, Any]]:
    full = auto / "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
    j = _read_json(full)
    if j:
        return full, j
    base = auto / "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"
    return base, _read_json(base)


def _run_mac_readiness(auto: Path, api: Path) -> tuple[int, dict[str, Any]]:
    p = auto / "tenmon_mac_cursor_operator_readiness_cursor_auto_v1.py"
    if not p.is_file():
        return 1, {"ok": False, "error": "missing_mac_readiness_script"}
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=180,
        env={**os.environ},
    )
    j: dict[str, Any] = {}
    raw = (r.stdout or "").strip()
    if raw:
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                j = obj
        except json.JSONDecodeError:
            pass
    for ln in reversed([(x or "").strip() for x in (r.stdout or "").splitlines()]):
        if j:
            break
        if not ln.startswith("{"):
            continue
        try:
            o = json.loads(ln)
            if isinstance(o, dict):
                j = o
                break
        except json.JSONDecodeError:
            continue
    return r.returncode, j


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    safe_root = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if not safe_root:
        out = {
            "ok": False,
            "card": CARD,
            "mac_operator_ready": False,
            "result_bundle_updated": False,
            "next_card_if_fail": NEXT_ON_FAIL,
            "rollback_used": False,
            "error": "TENMON_AUTONOMY_SAFE_SUMMARY_ROOT unset",
        }
        _atomic_write_json(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    rc, mac = _run_mac_readiness(auto, api)
    mac_ready = bool(rc == 0 and mac.get("ok") is True and mac.get("mac_operator_ready") is True)

    bundle_path = auto / "remote_cursor_result_bundle.json"
    master_path, master = _pick_master(auto)
    result_bundle_updated = False
    rollback_used = False

    if mac_ready:
        try:
            if master:
                m2 = dict(master)
                m2["mac_operator_ready"] = True
                m2["generated_at"] = _utc()
                _atomic_write_json(master_path, m2)

            bundle = _read_json(bundle_path)
            if bundle_path.is_file() and isinstance(bundle, dict):
                bundle["mac_operator_readiness_final_v1"] = {
                    "card": CARD,
                    "updated_at": _utc(),
                    "mac_operator_ready": True,
                    "source_card": "TENMON_MAC_CURSOR_OPERATOR_READINESS_CURSOR_AUTO_V1",
                }
                bundle["updatedAt"] = _utc()
                _atomic_write_json(bundle_path, bundle)
                result_bundle_updated = True
        except OSError:
            rollback_used = True
            mac_ready = False
            result_bundle_updated = False

    out = {
        "ok": bool(mac_ready and result_bundle_updated),
        "card": CARD,
        "mac_operator_ready": bool(mac_ready),
        "result_bundle_updated": bool(result_bundle_updated),
        "next_card_if_fail": NEXT_ON_FAIL,
        "rollback_used": rollback_used,
    }
    _atomic_write_json(auto / OUT_JSON, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
