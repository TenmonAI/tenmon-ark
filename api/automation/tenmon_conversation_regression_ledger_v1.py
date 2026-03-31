#!/usr/bin/env python3
"""TENMON conversation regression ledger v1.

probe結果の前回比を improved / stable / regressed で記録する。
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RegressionDiff:
    status: str
    average_score_delta: float
    pass_rate_delta: float
    pass_count_delta: int


def read_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"JSON object expected: {path}")
    return data


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw:
            continue
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            rows.append(parsed)
    return rows


def summary_of(report: dict[str, Any]) -> dict[str, Any]:
    summary = report.get("summary")
    if not isinstance(summary, dict):
        raise ValueError("report.summary missing")
    return summary


def diff_summary(curr: dict[str, Any], prev: dict[str, Any]) -> RegressionDiff:
    curr_avg = float(curr.get("average_score", 0))
    prev_avg = float(prev.get("average_score", 0))
    curr_rate = float(curr.get("pass_rate", 0))
    prev_rate = float(prev.get("pass_rate", 0))
    curr_count = int(curr.get("pass_count", 0))
    prev_count = int(prev.get("pass_count", 0))

    avg_delta = round(curr_avg - prev_avg, 2)
    rate_delta = round(curr_rate - prev_rate, 4)
    count_delta = curr_count - prev_count

    # 判定優先度: FAIL化は必ずregressed
    curr_verdict = str(curr.get("verdict", ""))
    prev_verdict = str(prev.get("verdict", ""))
    if prev_verdict == "PASS" and curr_verdict != "PASS":
        status = "regressed"
    elif avg_delta > 0.5 or rate_delta > 0.01 or count_delta > 0:
        status = "improved"
    elif avg_delta < -0.5 or rate_delta < -0.01 or count_delta < 0:
        status = "regressed"
    else:
        status = "stable"

    return RegressionDiff(
        status=status,
        average_score_delta=avg_delta,
        pass_rate_delta=rate_delta,
        pass_count_delta=count_delta,
    )


def write_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False))
        f.write("\n")


def pick_previous_summary(ledger_rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not ledger_rows:
        return None
    last = ledger_rows[-1]
    prev_summary = last.get("current_summary")
    if isinstance(prev_summary, dict):
        return prev_summary
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="TENMON conversation regression ledger v1")
    parser.add_argument(
        "--current-report",
        type=Path,
        default=Path("/tmp/tenmon_conversation_probe_v2.json"),
    )
    parser.add_argument(
        "--ledger-file",
        type=Path,
        default=Path("/tmp/tenmon_conversation_regression_ledger_v1.jsonl"),
    )
    parser.add_argument(
        "--previous-report",
        type=Path,
        default=None,
        help="Optional explicit previous probe report JSON",
    )
    args = parser.parse_args()

    current_report = read_json(args.current_report)
    current_summary = summary_of(current_report)

    previous_summary: dict[str, Any] | None = None
    if args.previous_report:
        previous_summary = summary_of(read_json(args.previous_report))
    else:
        previous_summary = pick_previous_summary(read_jsonl(args.ledger_file))

    if previous_summary is None:
        diff = RegressionDiff(
            status="stable",
            average_score_delta=0.0,
            pass_rate_delta=0.0,
            pass_count_delta=0,
        )
    else:
        diff = diff_summary(current_summary, previous_summary)

    row = {
        "version": "v1",
        "timestamp": utc_now(),
        "status": diff.status,
        "diff": {
            "average_score_delta": diff.average_score_delta,
            "pass_rate_delta": diff.pass_rate_delta,
            "pass_count_delta": diff.pass_count_delta,
        },
        "current_summary": current_summary,
        "previous_summary": previous_summary,
    }
    write_jsonl(args.ledger_file, row)

    print(
        f"[ledger-v1] status={diff.status} "
        f"avg_delta={diff.average_score_delta} "
        f"pass_rate_delta={diff.pass_rate_delta} "
        f"pass_count_delta={diff.pass_count_delta}"
    )
    print(f"[ledger-v1] file={args.ledger_file}")
    print("verdict: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
