#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", required=True)
    ap.add_argument("--log-dir", required=True)
    args = ap.parse_args()
    st = read_json(Path(args.state))
    out_json = Path(args.log_dir) / "final_report.json"
    out_md = Path(args.log_dir) / "final_summary.md"
    verdict = Path(args.log_dir) / "completion_verdict.json"

    report = {
        "ok": bool(st.get("stop_reason") in ("two_consecutive_passes", "max_time_reached", "loop_limit_reached")),
        "state": st,
    }
    out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out_md.write_text(
        "\n".join(
            [
                "# TENMON_WEAK_ROUTE_AUTOFINISH_PDCA_7H final",
                "",
                f"- current_loop: `{st.get('current_loop')}`",
                f"- stop_reason: `{st.get('stop_reason')}`",
                f"- consecutive_passes: `{st.get('consecutive_passes')}`",
                f"- consecutive_no_improve: `{st.get('consecutive_no_improve')}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    verdict.write_text(
        json.dumps(
            {
                "completion_ready": bool(st.get("consecutive_passes", 0) >= 2),
                "stop_reason": st.get("stop_reason"),
                "next_recommended_action": st.get("next_recommended_action"),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"ok": True, "final_report": str(out_json)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

