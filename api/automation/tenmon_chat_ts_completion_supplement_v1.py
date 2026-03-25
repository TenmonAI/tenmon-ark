#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_COMPLETION_SUPPLEMENT_CURSOR_AUTO_V1
report / seal / merged verdict の食い違いを記録し、canonical 判定と next-card dispatch を一貫化。
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_CHAT_TS_COMPLETION_SUPPLEMENT_V1"
VERSION = 1

VERDICT_KEYS = (
    "chat_ts_static_100",
    "chat_ts_runtime_100",
    "surface_clean",
    "route_authority_clean",
    "longform_quality_clean",
    "density_lock",
    "chat_ts_overall_100",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_dispatch_registry() -> Dict[str, Any]:
    p = _repo_api() / "automation" / "chat_ts_completion_dispatch_registry_v1.json"
    return _read_json(p)


def _seal_runtime_matrix_executed(runtime: Dict[str, Any]) -> bool:
    rows = {k: v for k, v in runtime.items() if k != "_meta" and isinstance(v, dict)}
    return bool(rows)


def build_merged_completion(
    report: Dict[str, Any], final: Dict[str, Any], runtime: Dict[str, Any]
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    rv = report.get("verdict") or {}
    mismatches: List[Dict[str, Any]] = []

    canonical = {k: bool(final.get(k)) for k in VERDICT_KEYS}

    report_runtime = bool(rv.get("chat_ts_runtime_100"))
    seal_runtime = bool(final.get("chat_ts_runtime_100"))
    rpb = rv.get("runtime_probe_blockers") or []
    handoff = "runtime_probes:not_executed" in rpb

    if handoff and _seal_runtime_matrix_executed(runtime) and seal_runtime and not report_runtime:
        mismatches.append(
            {
                "field": "chat_ts_runtime_100",
                "report_value": report_runtime,
                "seal_value": seal_runtime,
                "resolution": "prefer_seal",
                "reason": "report_runtime_handoff_not_executed_seal_matrix_present",
            }
        )

    for key in VERDICT_KEYS:
        if key == "chat_ts_runtime_100" and any(m.get("field") == key for m in mismatches):
            continue
        a, b = bool(rv.get(key)), bool(final.get(key))
        if a != b:
            mismatches.append(
                {
                    "field": key,
                    "report_value": a,
                    "seal_value": b,
                    "resolution": "prefer_seal",
                    "reason": "seal_merge_authoritative_in_seal_context",
                }
            )

    notes: List[str] = []
    if handoff:
        notes.append(
            "worldclass_report was generated with runtime handoff; seal_dir runtime_matrix is source of truth for runtime_* fields in canonical."
        )
    if bool(rv.get("surface_clean")) != bool(final.get("surface_clean")):
        notes.append(
            "surface_clean: report uses inline runtime probes; seal uses surface_audit merge — canonical follows seal."
        )

    merged = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "canonical": canonical,
        "sources": {
            "report_verdict": {k: bool(rv.get(k)) for k in VERDICT_KEYS},
            "seal_final_verdict": {k: bool(final.get(k)) for k in VERDICT_KEYS},
        },
        "mismatches": mismatches,
        "notes": notes,
        "overall_items_documented": list(VERDICT_KEYS),
    }
    return merged, mismatches


def dispatch_blockers(blockers: List[str], registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    entries = registry.get("by_blocker_prefix") or []
    out: List[Dict[str, Any]] = []
    seen = set()
    for b in blockers:
        bs = str(b).strip()
        if not bs:
            continue
        matched = None
        for e in entries:
            m = str(e.get("match") or "")
            if m and m in bs:
                matched = e
                break
        if matched:
            key = (bs, matched.get("stage_hint"))
            if key in seen:
                continue
            seen.add(key)
            out.append(
                {
                    "blocker": bs,
                    "stage_hint": matched.get("stage_hint"),
                    "cursor_card": matched.get("cursor_card"),
                    "vps_card": matched.get("vps_card"),
                }
            )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--copy-worldclass", action="store_true", help="copy worldclass_report.json into out-dir")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_completion_supplement")
    out.mkdir(parents=True, exist_ok=True)

    wc = _read_json(seal / "worldclass_report.json")
    final = _read_json(seal / "final_verdict.json")
    runtime = _read_json(seal / "runtime_matrix.json")
    registry = _load_dispatch_registry()

    merged, mismatches = build_merged_completion(wc, final, runtime)
    (out / "merged_completion_verdict.json").write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    seal_snapshot = {k: final.get(k) for k in VERDICT_KEYS}
    seal_snapshot["version"] = 1
    seal_snapshot["card"] = "seal_verdict_snapshot_v1"
    seal_snapshot["source_file"] = "final_verdict.json"
    (out / "seal_verdict.json").write_text(
        json.dumps(seal_snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    blockers = list(final.get("blockers") or [])
    dispatch = dispatch_blockers(blockers, registry)
    nd = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "blockers": blockers,
        "dispatch": dispatch,
        "registry_version": registry.get("version"),
    }
    (out / "next_card_dispatch.json").write_text(
        json.dumps(nd, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    fv = {
        "ok": bool(merged["canonical"].get("chat_ts_overall_100")),
        "chat_ts_overall_100": bool(merged["canonical"].get("chat_ts_overall_100")),
        "mismatch_count": len(mismatches),
        "card": CARD,
    }
    (out / "final_verdict.json").write_text(
        json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.copy_worldclass and (seal / "worldclass_report.json").is_file():
        shutil.copy2(seal / "worldclass_report.json", out / "worldclass_report.json")

    if args.stdout_json:
        print(json.dumps(merged, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
