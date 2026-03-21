#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_CHATTS_AUDIT_SUITE_V1 — static audit for api/src/routes/chat.ts.

Read-only on chat.ts; writes JSON + Markdown under api/automation/reports/ when requested.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Set

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from chatts_metrics_v1 import analyze_chat_ts

DEFAULT_REL_CHAT = "api/src/routes/chat.ts"
SCHEMA_REL = "api/automation/chatts_audit_schema_v1.json"
REPORT_JSON = "chatts_audit_v1_report.json"
REPORT_MD = "chatts_audit_v1_report.md"


def repo_root_from(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(24):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def load_schema_required() -> Set[str]:
    schema_path = _AUTOMATION_DIR / "chatts_audit_schema_v1.json"
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    return set(data.get("required") or [])


def validate_report_against_schema(report: Dict[str, Any]) -> List[str]:
    req = load_schema_required()
    missing = [k for k in sorted(req) if k not in report]
    if missing:
        return [f"missing_keys:{missing}"]
    if report.get("version") != 1:
        return ["version_must_be_1"]
    sp = report.get("splitPriority")
    if not isinstance(sp, list) or len(sp) > 10:
        return ["splitPriority_bad"]
    return []


def render_markdown(report: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("# chat.ts static audit (AUTO_BUILD_CHATTS_AUDIT_SUITE_V1)\n")
    lines.append(f"- **target**: `{report.get('targetPath')}`")
    lines.append(f"- **auditedAt**: {report.get('auditedAt')}")
    lines.append(f"- **lineCount**: {report.get('lineCount')}")
    lines.append(f"- **importCount**: {report.get('importCount')}")
    lines.append(f"- **distinct routeReason literals**: {len(report.get('routeReasons') or [])}")
    lines.append(f"- **return sites (lines with `return`)**: {len(report.get('returnSites') or [])}")
    lines.append("")
    lines.append("## duplicateRouteReasons (count ≥ 2)")
    for d in (report.get("duplicateRouteReasons") or [])[:40]:
        lines.append(f"- `{d.get('reason')}` × {d.get('count')}")
    if len(report.get("duplicateRouteReasons") or []) > 40:
        lines.append("- _(truncated in markdown; see JSON)_")
    lines.append("")
    lines.append("## Heuristic contract gaps (false positives likely)")
    for label, key in [
        ("missingResponsePlanCandidates", "missingResponsePlanCandidates"),
        ("missingKuCandidates", "missingKuCandidates"),
        ("missingThreadCoreCandidates", "missingThreadCoreCandidates"),
        ("missingSynapseTopCandidates", "missingSynapseTopCandidates"),
    ]:
        xs = report.get(key) or []
        lines.append(f"### {label} ({len(xs)})")
        for item in xs[:25]:
            lines.append(f"- L{item.get('line')}: {item.get('note')}")
        if len(xs) > 25:
            lines.append("- _(truncated)_")
        lines.append("")
    lines.append("## splitPriority (top 10 blocks by heuristic score)")
    lines.append("| rank | lines | score | returns ρ | routeReason ρ | dupRR | missing |")
    lines.append("|-----:|------:|------:|----------:|--------------:|------:|--------:|")
    for row in report.get("splitPriority") or []:
        c = row.get("components") or {}
        lines.append(
            f"| {row.get('rank')} | {row.get('startLine')}-{row.get('endLine')} | "
            f"{row.get('score')} | {c.get('returnDensity')} | {c.get('routeReasonDensity')} | "
            f"{c.get('duplicateRouteReasonHitsInBlock')} | {c.get('missingContractHitsInBlock')} |"
        )
    lines.append("")
    lines.append("## meta")
    lines.append(f"```json\n{json.dumps(report.get('meta'), ensure_ascii=False, indent=2)}\n```\n")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_CHATTS_AUDIT_SUITE_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--chat-path", type=Path, default=None, help="Override path to chat.ts")
    ap.add_argument("--stdout-json", action="store_true", help="Print full JSON to stdout")
    ap.add_argument(
        "--emit-reports",
        action="store_true",
        help=f"Write {REPORT_JSON} and {REPORT_MD} under api/automation/reports/",
    )
    ap.add_argument(
        "--check-json",
        action="store_true",
        help="Validate emitted/payload shape against chatts_audit_schema_v1.json (required keys)",
    )
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    chat = args.chat_path or (root / DEFAULT_REL_CHAT)
    if not chat.is_file():
        print(json.dumps({"ok": False, "error": "chat_ts_not_found", "path": str(chat)}))
        return 2

    report = analyze_chat_ts(chat)
    errs = validate_report_against_schema(report) if args.check_json else []
    if errs:
        print(json.dumps({"ok": False, "errors": errs}, indent=2))
        return 1

    if args.emit_reports:
        out_dir = root / "api" / "automation" / "reports"
        out_dir.mkdir(parents=True, exist_ok=True)
        jp = out_dir / REPORT_JSON
        mp = out_dir / REPORT_MD
        jp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        mp.write_text(render_markdown(report), encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    elif not args.emit_reports:
        summary = {
            "ok": True,
            "lineCount": report["lineCount"],
            "importCount": report["importCount"],
            "routeReasonCount": len(report["routeReasons"]),
            "duplicateRouteReasonKinds": len(report["duplicateRouteReasons"]),
            "returnSiteCount": len(report["returnSites"]),
            "missingResponsePlanCandidates": len(report["missingResponsePlanCandidates"]),
            "missingKuCandidates": len(report["missingKuCandidates"]),
            "missingThreadCoreCandidates": len(report["missingThreadCoreCandidates"]),
            "missingSynapseTopCandidates": len(report["missingSynapseTopCandidates"]),
            "splitPriorityTop": (report.get("splitPriority") or [])[:3],
        }
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
