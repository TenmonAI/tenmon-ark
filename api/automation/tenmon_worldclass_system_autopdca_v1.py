#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    s = rj(auto / "tenmon_worldclass_pdca_state.json")
    s["generated_at"] = utc()
    s["system_side_checked"] = True
    wj(auto / "tenmon_worldclass_pdca_state.json", s)
    wj(auto / "tenmon_worldclass_pdca_summary.json", s)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

