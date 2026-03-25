#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_03 — build / acceptance / 成果物 / next card を正規化
入力: cursor_result_bundle.json, integrated_acceptance_seal.json, 環境変数
出力: cursor_kernel_result.json
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def collect_output_files(auto: Path) -> List[str]:
    names = [
        "cursor_card_schema.json",
        "cursor_kernel_result.json",
        "cursor_result_bundle.json",
        "cursor_retry_queue.json",
        "cursor_campaign_manifest.json",
    ]
    out: List[str] = []
    for n in names:
        p = auto / n
        if p.is_file():
            out.append(str(p))
    ga = auto / "generated_cursor_apply"
    if ga.is_dir():
        for p in sorted(ga.glob("TENMON_SELF_BUILD_OS_PARENT_03*.md"))[:20]:
            out.append(str(p))
    return out[:80]


def infer_fail_type(bundle: Dict[str, Any], acceptance_ok: Optional[bool], build_ok: Optional[bool]) -> str:
    if build_ok is False:
        return "build_fail"
    if acceptance_ok is False:
        return "acceptance_fail"
    if bundle.get("pass") is False or bundle.get("status") == "fail":
        bl = " ".join(str(x) for x in (bundle.get("blockers") or [])).lower()
        if "schema" in bl or "contract" in bl:
            return "schema_fail"
        if "acceptance" in bl or "runtime" in bl:
            return "acceptance_fail"
        return "execution_fail"
    return "none"


def build_kernel_result(
    auto: Path,
    *,
    build_ok: Optional[bool] = None,
    acceptance_ok: Optional[bool] = None,
) -> Dict[str, Any]:
    bundle = read_json(auto / "cursor_result_bundle.json")
    ia = read_json(auto / "integrated_acceptance_seal.json")

    if build_ok is None:
        env_rc = os.environ.get("TENMON_KERNEL_BUILD_RC", "").strip()
        if env_rc != "":
            build_ok = int(env_rc) == 0
        else:
            st = ia.get("axes") or {}
            static = (st.get("static") or {}).get("summary") or {}
            if "npm_build_rc" in static:
                build_ok = int(static.get("npm_build_rc")) == 0
            elif "ok" in static:
                build_ok = bool(static.get("ok"))
            else:
                build_ok = None

    if acceptance_ok is None:
        if ia:
            acceptance_ok = bool(ia.get("overall_pass"))
        else:
            acceptance_ok = None

    next_card = bundle.get("suggested_next_card") or os.environ.get("TENMON_KERNEL_NEXT_CARD", "").strip() or None
    fail_type = infer_fail_type(bundle, acceptance_ok, build_ok)

    overall_pass = (
        bundle.get("pass") is True
        and (acceptance_ok is not False)
        and (build_ok is not False)
    )

    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "build": {"ok": build_ok, "source": "env_TENMON_KERNEL_BUILD_RC_or_integrated_axes"},
        "acceptance": {"ok": acceptance_ok, "source": "integrated_acceptance_seal_or_null"},
        "bundle_status": bundle.get("status"),
        "bundle_pass": bundle.get("pass"),
        "output_files": collect_output_files(auto),
        "next_card": next_card,
        "fail_type": fail_type,
        "overall_pass": overall_pass,
        "inputs": {
            "cursor_result_bundle": str(auto / "cursor_result_bundle.json"),
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="cursor_result_collector_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--build-ok", choices=("true", "false", "auto"), default="auto")
    ap.add_argument("--acceptance-ok", choices=("true", "false", "auto"), default="auto")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    b = None if args.build_ok == "auto" else args.build_ok == "true"
    a = None if args.acceptance_ok == "auto" else args.acceptance_ok == "true"
    body = build_kernel_result(auto, build_ok=b, acceptance_ok=a)
    out = Path(args.out) if args.out else auto / "cursor_kernel_result.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
