#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""VPS seal / forensic / observation と acceptance の接続マニフェスト"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict

from cursor_autobuild_common_v2 import VERSION, api_automation, utc_now_iso


def build_connector() -> Dict[str, Any]:
    api = api_automation()
    seal = os.environ.get("TENMON_ORCHESTRATOR_SEAL_DIR", "").strip() or "/var/log/tenmon/card"
    forensic = api / "out" / "tenmon_total_forensic_reveal_v1" / "latest"
    orch = api / "out" / "tenmon_full_orchestrator_v1"
    obs = api / "observation_os_report.json"
    return {
        "version": VERSION,
        "generatedAt": utc_now_iso(),
        "acceptance_inputs": {
            "seal_symlink_or_dir": seal,
            "seal_final_verdict": str(Path(seal) / "final_verdict.json") if seal else "",
            "forensic_integrated": str(forensic / "integrated_forensic_verdict.json"),
            "forensic_next_priority": str(forensic / "next_priority_cards.json"),
            "full_orchestrator_dir": str(orch),
            "observation_os_report": str(obs),
            "priority_queue": str(api / "priority_queue.json"),
        },
        "validation_commands": [
            "cd api && npm run check",
            "curl -fsS ${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}/health",
            "curl -fsS ${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}/api/audit",
        ],
        "notes": [
            "chat.ts / /api/chat 契約は変更しない前提で seal runtime を見る",
            "TENMON_TOTAL_FORENSIC_REVEAL と observation_os の出力を併用",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="cursor_acceptance_connector_v2")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = build_connector()
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    out = Path(args.out) if args.out else api_automation() / "cursor_acceptance_manifest_v2.json"
    out.write_text(text, encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
