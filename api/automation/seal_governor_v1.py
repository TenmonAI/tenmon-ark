#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SEAL_GOVERNOR_V1
static / runtime / surface / route / longform / density を束ね、PASS のときのみ「採用・seal 相当」を許可。
FAIL 時は evidence bundle・blocker 分類を残す。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_SEAL_GOVERNOR_V1"
VERSION = 1
FAIL_NEXT = "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1"

REQUIRED_ARTIFACTS = (
    "build.log",
    "health.json",
    "audit.json",
    "runtime_matrix.json",
    "surface_audit.json",
    "worldclass_report.json",
    "final_verdict.json",
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


def _runtime_summary(runtime: Dict[str, Any]) -> Tuple[int, int, List[str]]:
    ok_n = tot = 0
    failed: List[str] = []
    for k, row in runtime.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if row.get("ok"):
            ok_n += 1
        else:
            failed.append(str(k))
    return ok_n, tot, failed


def _classify_blocker(b: str) -> str:
    s = str(b).lower()
    if "surface" in s or "worldclass_surface" in s:
        return "surface"
    if "longform" in s:
        return "longform"
    if "density" in s or "static" in s:
        return "density"
    if "route" in s or "runtime" in s:
        return "runtime_route"
    return "other"


def _evidence_paths(seal: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for name in REQUIRED_ARTIFACTS + (
        "route_authority_audit.json",
        "longform_audit.json",
        "density_lock_verdict.json",
    ):
        p = seal / name
        if p.is_file():
            out[name] = str(p)
    supp = seal / "_completion_supplement" / "next_card_dispatch.json"
    if supp.is_file():
        out["completion_next_card_dispatch"] = str(supp)
    return out


def build_verdict(seal_dir: Path, out_dir: Path) -> Tuple[Dict[str, Any], bool]:
    seal = seal_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    final = _read_json(seal / "final_verdict.json")
    wc = _read_json(seal / "worldclass_report.json")
    runtime = _read_json(seal / "runtime_matrix.json")

    present = {n: (seal / n).is_file() for n in REQUIRED_ARTIFACTS}
    ok_n, tot, failed = _runtime_summary(runtime)
    structural_ok = all(present.values()) and tot > 0
    probes_all_ok = tot > 0 and ok_n == tot

    gates: Dict[str, bool] = {
        "static": bool(final.get("chat_ts_static_100")),
        "runtime": bool(final.get("chat_ts_runtime_100")) and probes_all_ok,
        "surface": bool(final.get("surface_clean")),
        "route": bool(final.get("route_authority_clean")),
        "longform": bool(final.get("longform_quality_clean")),
        "density": bool(final.get("density_lock")),
    }
    overall_merge = bool(final.get("chat_ts_overall_100"))

    # PASS 以外は採用しない: 全ゲート + merge + 構造
    adoption_sealed = structural_ok and overall_merge and all(gates.values())

    blockers = list(final.get("blockers") or [])
    if not isinstance(blockers, list):
        blockers = []
    classification = [{"blocker": b, "class": _classify_blocker(str(b))} for b in blockers]

    notes: List[str] = []
    if not structural_ok:
        notes.append("missing_or_empty_artifacts_or_runtime")
    if not probes_all_ok:
        notes.append(f"runtime_probe_failures:{','.join(failed[:8])}")
    if not overall_merge:
        notes.append("chat_ts_overall_100_false")
    for gk, gv in gates.items():
        if not gv:
            notes.append(f"gate_fail:{gk}")

    body: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "adoption_sealed": adoption_sealed,
        "maintained_sealed": adoption_sealed,
        "gates": gates,
        "chat_ts_overall_100": overall_merge,
        "structural_ok": structural_ok,
        "artifacts_present": present,
        "runtime_probe_summary": {
            "ok_count": ok_n,
            "total": tot,
            "all_ok": probes_all_ok,
            "failed_names": failed,
        },
        "blocker_classification": classification,
        "fail_next_cursor_card": FAIL_NEXT,
        "notes": notes,
    }

    (out_dir / "seal_governor_verdict.json").write_text(
        json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    evidence = {
        "version": VERSION,
        "card": f"{CARD}_EVIDENCE",
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "adoption_sealed": adoption_sealed,
        "artifact_paths": _evidence_paths(seal),
        "final_verdict_snapshot": {
            k: final.get(k)
            for k in (
                "chat_ts_static_100",
                "chat_ts_runtime_100",
                "surface_clean",
                "route_authority_clean",
                "longform_quality_clean",
                "density_lock",
                "chat_ts_overall_100",
                "blockers",
            )
        },
        "worldclass_verdict_inline": (wc.get("verdict") or {}) if wc else {},
    }
    ev_path = out_dir / "evidence_bundle.json"
    if not adoption_sealed:
        ev_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif ev_path.is_file():
        ev_path.unlink()

    return body, adoption_sealed


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument(
        "--enforce-exit",
        action="store_true",
        help="adoption_sealed でない場合に exit 1",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os_integrated")
    body, adopt = build_verdict(seal, out)

    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    if args.enforce_exit and not adopt:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
