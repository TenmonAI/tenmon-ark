#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE — deep/micro/worldclass/seal/orchestrator を
単一 canonical verdict に正規化（揺れは conflicts に可視化）。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import master_verdict_unifier_v1 as mvu

CARD = "TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_V1"
FAIL_NEXT = "TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_RETRY_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_VPS_V1"
VERSION = 1


def _utc() -> str:
    return mvu._utc()


def _api() -> Path:
    return mvu._api_root()


def _git_sha(api: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(api),
            capture_output=True,
            text=True,
            check=False,
            timeout=8,
        )
        return (r.stdout or "").strip()[:48] if r.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def _base_configured() -> bool:
    return bool(
        (os.environ.get("CHAT_TS_PROBE_BASE_URL") or "").strip()
        or (os.environ.get("TENMON_API_BASE") or "").strip()
    )


def _collect_audit_build_404(api: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    root = api / "automation" / "out"
    if not root.is_dir():
        return out
    for p in root.glob("**/worldclass_report.json"):
        wr = mvu._read_json(p)
        rt = wr.get("runtime") or {}
        ab = rt.get("audit_build") if isinstance(rt.get("audit_build"), dict) else {}
        err = str(ab.get("error") or "")
        ok = ab.get("ok")
        if ok is False and ("404" in err or "error" in err.lower()):
            try:
                rel = str(p.resolve().relative_to(api.resolve()))
            except Exception:
                rel = str(p)
            out.append(
                {
                    "blocker_kind": "audit_build_404",
                    "path": rel,
                    "error": err[:500],
                    "note": "dedicated blocker — 他軸の canonical とは別行で追跡",
                }
            )
    return out


def _normalized_status(
    val: Optional[bool],
    *,
    tier: str,
    runtime_mode: str,
    live_or_handoff: str,
) -> str:
    if val is None:
        return "unknown"
    if val is True:
        return "pass"
    if runtime_mode == "handoff_not_executed":
        return "incomplete"
    if tier == "standalone_worldclass" and live_or_handoff == "handoff":
        return "incomplete"
    if not _base_configured() and live_or_handoff != "live":
        return "incomplete"
    if val is False:
        return "fail"
    return "unknown"


def _tier_modes(sources: Dict[str, Optional[Dict[str, Any]]]) -> Dict[str, Tuple[str, str]]:
    """tier -> (runtime_observation_mode, live_or_handoff)"""
    out: Dict[str, Tuple[str, str]] = {}
    for tid, blob in sources.items():
        if not blob:
            continue
        mode = str(blob.get("runtime_observation_mode") or "unknown")
        loh = str(blob.get("live_or_handoff") or "unknown")
        out[tid] = (mode, loh)
    return out


def run_normalize(api: Path, out_dir: Path) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)

    conf_map = {
        "live_seal_runtime_matrix": 0.95,
        "forensic_integrated": 0.82,
        "orchestrator_integrated": 0.72,
        "standalone_worldclass": 0.55,
    }

    t1 = mvu.load_live_seal(api)
    t2 = mvu.load_forensic_integrated(api)
    t3 = mvu.load_orchestrator(api)
    t4 = mvu.load_standalone_worldclass(api)

    axes_out, conflicts = mvu.unify_sources([t1, t2, t3, t4], conf_map)
    modes = _tier_modes(
        {
            "live_seal_runtime_matrix": t1,
            "forensic_integrated": t2,
            "orchestrator_integrated": t3,
            "standalone_worldclass": t4,
        }
    )

    audit_404 = _collect_audit_build_404(api)
    for ab in audit_404:
        conflicts.append(
            {
                "axis": "_global_",
                "reason": "audit_build_404",
                "detail": ab,
            }
        )

    axes_canonical: Dict[str, Any] = {}
    for axis in mvu.AXES:
        cell = axes_out.get(axis) or {}
        val = cell.get("value") if isinstance(cell.get("value"), bool) else None
        if val is None and isinstance(cell, dict) and "value" in cell:
            v = cell.get("value")
            val = bool(v) if v is not None else None
        tier = str(cell.get("source") or "none")
        mode, loh = modes.get(tier, ("unknown", "unknown"))
        norm = _normalized_status(
            val if isinstance(val, bool) else None,
            tier=tier if tier != "none" else "unknown",
            runtime_mode=mode,
            live_or_handoff=loh,
        )
        axes_canonical[axis] = {
            "boolean_value": val,
            "normalized": norm,
            "source_tier": tier,
            "runtime_observation_mode": mode,
            "live_or_handoff": loh,
            "confidence": cell.get("confidence"),
        }

    overall_cell = axes_canonical.get("chat_ts_overall_100") or {}
    overall_bool = overall_cell.get("boolean_value")
    overall_norm = str(overall_cell.get("normalized") or "unknown")

    probe_family = "mixed"
    if t1 and (t1.get("live_or_handoff") == "live"):
        probe_family = "live"
    elif t4 and not t1:
        probe_family = "handoff" if t4.get("live_or_handoff") == "handoff" else "mixed"

    canonical_runtime = {
        "version": VERSION,
        "card": CARD,
        "generated_at": _utc(),
        "repo_sha": _git_sha(api),
        "probe_family": probe_family,
        "live_probe_preferred": t1 is not None,
        "base_url_configured": _base_configured(),
        "canonical_tier_for_unification": overall_cell.get("source_tier"),
        "sources_present": {
            "live_seal_runtime_matrix": t1 is not None,
            "forensic_integrated": t2 is not None,
            "orchestrator_integrated": t3 is not None,
            "standalone_worldclass": t4 is not None,
        },
        "paths": {
            "live_seal": (t1 or {}).get("path"),
            "forensic_integrated": (t2 or {}).get("path"),
            "orchestrator": (t3 or {}).get("path"),
            "standalone_worldclass": (t4 or {}).get("path"),
        },
        "uniqueness_key": {
            "repo_sha": _git_sha(api),
            "probe_family": probe_family,
            "canonical_chat_ts_overall_100": overall_bool,
        },
    }

    verdict = {
        "version": VERSION,
        "card": CARD,
        "generated_at": _utc(),
        "fail_next_card": FAIL_NEXT,
        "vps_card": VPS_CARD,
        "unification_engine": "master_verdict_unifier_v1.unify_sources",
        "registry": "api/automation/forensic_contract_registry_v1.json",
        "axes": axes_canonical,
        "chat_ts_overall_100_canonical": overall_bool,
        "chat_ts_overall_100_normalized": overall_norm,
        "pass_fail_shake_visible": any(c.get("reason") == "cross_tier_mismatch" for c in conflicts),
        "notes": [
            "live と handoff の両方がある束では demotion ルールにより canonical は一意化",
            "audit_build 404 は dedicated blocker として conflicts に分離",
        ],
    }

    conflicts_body = {
        "version": VERSION,
        "card": CARD,
        "generated_at": _utc(),
        "conflicts": conflicts,
        "audit_build_404": audit_404,
        "summary": {
            "count": len(conflicts),
            "cross_tier_mismatch": sum(1 for c in conflicts if c.get("reason") == "cross_tier_mismatch"),
            "demotion_rules": sum(1 for c in conflicts if "demote" in str(c.get("reason", ""))),
        },
    }

    (out_dir / "forensic_single_source_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "forensic_source_conflicts.json").write_text(
        json.dumps(conflicts_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "canonical_runtime_source.json").write_text(
        json.dumps(canonical_runtime, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    marker_txt = f"{VPS_CARD}\n{_utc()}\nchat_ts_overall_100={overall_bool}\nnormalized={overall_norm}\n"
    (api / "automation" / VPS_CARD).write_text(marker_txt, encoding="utf-8")
    (out_dir / VPS_CARD).write_text(marker_txt, encoding="utf-8")

    return {
        "ok": True,
        "out_dir": str(out_dir),
        "chat_ts_overall_100_canonical": overall_bool,
        "normalized": overall_norm,
        "conflict_count": len(conflicts),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="既定: api/automation/out/forensic_single_source_normalize_v1",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    api = _api()
    out = Path(args.out_dir) if args.out_dir else (api / "automation/out/forensic_single_source_normalize_v1")
    blob = run_normalize(api, out.resolve())
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
