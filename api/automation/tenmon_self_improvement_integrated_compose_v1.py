#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
統合 runner 用: seal 成果物 + governor + residual bridge を束ね、
`integrated_final_verdict.json` と `self_improvement_os_manifest.json` を書く。
（4 系統の外側の薄い合成層）
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CARD = "TENMON_SELF_IMPROVEMENT_INTEGRATED_COMPOSE_V1"
VERSION = 1


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--seal-exit-code", type=int, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--vps-card", type=str, default="TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1")
    ap.add_argument(
        "--fail-next-cursor",
        type=str,
        default="TENMON_SELF_IMPROVEMENT_OS_PARENT_RETRY_CURSOR_AUTO_V1",
        help="integrated_final_verdict に記録する FAIL 時の次 Cursor カード名",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os")
    out.mkdir(parents=True, exist_ok=True)

    final = _read_json(seal / "final_verdict.json")
    gov = _read_json(out / "seal_governor_verdict.json")
    bridge = _read_json(out / "residual" / "residual_os_bridge.json")
    supp = _read_json(seal / "_completion_supplement" / "next_card_dispatch.json")

    overall_100 = bool(final.get("chat_ts_overall_100"))
    seal_rc = int(args.seal_exit_code)
    structural = bool(gov.get("structural_ok"))
    overall_loop_ok = seal_rc == 0 and overall_100 and structural

    integrated: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "vps_card": args.vps_card,
        "seal_dir": str(seal),
        "seal_exit_code": seal_rc,
        "overall_loop_ok": overall_loop_ok,
        "seal_final_verdict": {
            "chat_ts_overall_100": overall_100,
            "chat_ts_runtime_100": bool(final.get("chat_ts_runtime_100")),
            "chat_ts_static_100": bool(final.get("chat_ts_static_100")),
            "blockers": final.get("blockers") or [],
        },
        "governor": {
            "structural_ok": structural,
            "runtime_probe_summary": gov.get("runtime_probe_summary") or {},
            "artifacts_present": gov.get("artifacts_present") or {},
        },
        "residual_adapter": {
            "residual_out_dir": bridge.get("residual_out_dir"),
            "subprocess_rc": bridge.get("subprocess_rc"),
            "artifacts": bridge.get("artifacts") or {},
        },
        "completion_supplement_dispatch": {
            "present": bool(supp),
            "blockers": supp.get("blockers") if supp else [],
        },
        "fail_next_cursor_card": args.fail_next_cursor,
    }

    integ_path = out / "integrated_final_verdict.json"
    integ_path.write_text(json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest: Dict[str, Any] = {
        "version": VERSION,
        "card": "TENMON_SELF_IMPROVEMENT_OS_MANIFEST_V1",
        "generatedAt": _utc_now_iso(),
        "vps_card": args.vps_card,
        "seal_dir": str(seal),
        "subsystems": [
            "improvement_ledger",
            "residual_quality_adapter",
            "card_autogen",
            "seal_governor",
            "integrated_compose",
        ],
        "paths": {
            "integrated_final_verdict": str(integ_path),
            "seal_governor_verdict": str(out / "seal_governor_verdict.json"),
            "residual_os_bridge": str(out / "residual" / "residual_os_bridge.json"),
            "residual_quality_score": str(out / "residual" / "residual_quality_score.json"),
            "focused_next_cards_manifest": str(out / "residual" / "focused_next_cards_manifest.json"),
            "ledger_last_entry": str(out / "ledger_last_entry.json"),
            "os_fail_next_dispatch": str(out / "os_fail_next_dispatch.json"),
            "seal_final_verdict": str(seal / "final_verdict.json"),
            "seal_runtime_matrix": str(seal / "runtime_matrix.json"),
            "seal_build_log": str(seal / "build.log"),
            "seal_health": str(seal / "health.json"),
            "seal_audit": str(seal / "audit.json"),
        },
    }
    man_path = out / "self_improvement_os_manifest.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps({"integrated": str(integ_path), "manifest": str(man_path)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
