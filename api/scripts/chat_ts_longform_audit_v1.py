#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_STAGE3_LONGFORM_STRUCTURE_VPS_V1 補助:
runtime_matrix.json の longform_1 から本文・routeReason を抽出し longform_audit.json を書く。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def _extract_response(body: str) -> str:
    m = re.findall(r'"response"\s*:\s*"(.+?)","evidence"', body, flags=re.S)
    if not m:
        return ""
    return m[0].replace("\\n", "\n")


def _extract_route_reason(body: str) -> str | None:
    m = re.findall(r'"routeReason"\s*:\s*"([^"]+)"', body)
    return m[0] if m else None


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "usage: chat_ts_longform_audit_v1.py <runtime_matrix.json> <longform_audit.json>",
            file=sys.stderr,
        )
        return 2
    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    data = json.loads(src.read_text(encoding="utf-8", errors="replace"))
    row = data.get("longform_1") if isinstance(data.get("longform_1"), dict) else {}
    text = ""
    rr = None
    if row.get("ok") and isinstance(row.get("body"), str):
        text = _extract_response(row["body"])
        rr = _extract_route_reason(row["body"])
    audit = {
        "version": 1,
        "card": "CHAT_TS_STAGE3_LONGFORM_STRUCTURE_V1",
        "longform_1": {
            "ok": bool(row.get("ok")),
            "routeReason": rr,
            "response_len": len(text),
            "has_mitate": "【見立て】" in text,
            "has_tenkai": "【展開】" in text,
            "has_rakuchi": "【着地】" in text,
            "looks_system_diagnosis_short": rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1" and len(text) < 900,
            "response_head": text[:900],
        },
    }
    out.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
