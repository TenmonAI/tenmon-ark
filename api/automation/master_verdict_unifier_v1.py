#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MASTER_VERDICT_UNIFICATION_V1 — 複数ソースの chat_ts 系 verdict を単一 master に統一。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_MASTER_VERDICT_UNIFICATION_V1"
FAIL_NEXT = "TENMON_MASTER_VERDICT_UNIFICATION_RETRY_CURSOR_AUTO_V1"

AXES = [
    "chat_ts_static_100",
    "chat_ts_runtime_100",
    "surface_clean",
    "route_authority_clean",
    "longform_quality_clean",
    "density_lock",
    "chat_ts_overall_100",
]


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _mtime(p: Path) -> float:
    try:
        return p.stat().st_mtime
    except Exception:
        return 0.0


def _resolve_seal_card_dir() -> Optional[Path]:
    try:
        r = subprocess.run(
            ["readlink", "-f", "/var/log/tenmon/card"],
            capture_output=True,
            text=True,
            check=False,
            timeout=8,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        p = Path(r.stdout.strip())
        return p if p.is_dir() else None
    except Exception:
        return None


def _glob_newest(api: Path, pattern: str, limit: int = 12) -> Optional[Path]:
    hits = sorted(
        (api / "automation" / "out").glob(pattern),
        key=_mtime,
        reverse=True,
    )
    if not hits:
        return None
    return hits[0]


def _extract_axes(blob: Dict[str, Any]) -> Dict[str, bool]:
    out: Dict[str, bool] = {}
    if not blob:
        return out
    cand = blob
    if blob.get("verdict") and isinstance(blob["verdict"], dict):
        cand = blob["verdict"]
    elif blob.get("worldclass_verdict") and isinstance(blob["worldclass_verdict"], dict):
        cand = blob["worldclass_verdict"]
    for k in AXES:
        v = blob.get(k)
        if v is None and isinstance(cand, dict):
            v = cand.get(k)
        if v is not None:
            out[k] = bool(v)
    return out


def _runtime_mode_from_wr(wr: Dict[str, Any]) -> str:
    vd = wr.get("verdict") or {}
    return str(vd.get("runtime_observation_mode") or "unknown")


def _rel_to_api(api: Path, p: Path) -> str:
    try:
        return str(p.resolve().relative_to(api.resolve()))
    except Exception:
        return str(p)


def load_live_seal(api: Path) -> Optional[Dict[str, Any]]:
    card = _resolve_seal_card_dir()
    wr_path: Optional[Path] = None
    fv_path: Optional[Path] = None
    if card:
        w = card / "worldclass_report.json"
        f = card / "final_verdict.json"
        if w.is_file():
            wr_path = w
        if f.is_file():
            fv_path = f
    fb = (
        api
        / "automation/out/tenmon_kokuzo_learning_improvement_os_v1/integration_seal/worldclass_report.json"
    )
    if wr_path is None and fb.is_file():
        wr_path = fb
    ff = (
        api
        / "automation/out/tenmon_kokuzo_learning_improvement_os_v1/integration_seal/final_verdict.json"
    )
    if fv_path is None and ff.is_file():
        fv_path = ff

    axes: Dict[str, bool] = {}
    src_path = ""
    observed = _utc()
    live_or_handoff = "unknown"
    runtime_mode = "unknown"

    if wr_path and wr_path.is_file():
        wr = _read_json(wr_path)
        axes = _extract_axes(wr)
        src_path = _rel_to_api(api, wr_path)
        observed = wr.get("generatedAt") or observed
        runtime_mode = _runtime_mode_from_wr(wr)
        live_or_handoff = "live" if runtime_mode == "live" else "handoff"
    elif fv_path and fv_path.is_file():
        fv = _read_json(fv_path)
        axes = _extract_axes(fv)
        src_path = _rel_to_api(api, fv_path)
        observed = fv.get("generatedAt") or observed
        wvx = fv.get("worldclass_verdict") if isinstance(fv.get("worldclass_verdict"), dict) else {}
        runtime_mode = str(
            fv.get("runtime_observation_mode") or wvx.get("runtime_observation_mode") or "unknown"
        )
        live_or_handoff = "live" if runtime_mode == "live" else "handoff"
    else:
        return None

    return {
        "tier": "live_seal_runtime_matrix",
        "path": src_path,
        "observed_at": observed,
        "live_or_handoff": live_or_handoff,
        "runtime_observation_mode": runtime_mode,
        "axes": axes,
        "raw_ref": src_path,
    }


def load_forensic_integrated(api: Path) -> Optional[Dict[str, Any]]:
    p = _glob_newest(api, "**/integrated_master_verdict.json")
    if not p or not p.is_file():
        return None
    blob = _read_json(p)
    wv = blob.get("worldclass_summary") or {}
    axes: Dict[str, bool] = {}
    if isinstance(wv, dict):
        for k in AXES:
            if wv.get(k) is not None:
                axes[k] = bool(wv[k])
    ov = blob.get("worldclass_chat_ts_overall_100")
    if ov is not None:
        axes["chat_ts_overall_100"] = bool(ov)
    return {
        "tier": "forensic_integrated",
        "path": str(p.relative_to(api)) if p.is_relative_to(api) else str(p),
        "observed_at": blob.get("generatedAt") or _utc(),
        "live_or_handoff": "mixed",
        "runtime_observation_mode": "unknown",
        "axes": axes,
        "raw_ref": str(p),
    }


def load_orchestrator(api: Path) -> Optional[Dict[str, Any]]:
    p = api / "automation/out/tenmon_full_orchestrator_v1/integrated_final_verdict.json"
    if not p.is_file():
        return None
    blob = _read_json(p)
    axes: Dict[str, bool] = {}
    orch = blob.get("orchestrator") or {}
    # orchestrator は chat_ts 軸を持たないことが多い → 空でもソースとして記録
    return {
        "tier": "orchestrator_integrated",
        "path": str(p.relative_to(api)),
        "observed_at": blob.get("generatedAt") or _utc(),
        "live_or_handoff": "handoff",
        "runtime_observation_mode": "unknown",
        "axes": axes,
        "raw_ref": str(p),
        "orchestrator_meta": orch,
    }


def load_standalone_worldclass(api: Path) -> Optional[Dict[str, Any]]:
    p = _glob_newest(api, "**/worldclass_report.json")
    if not p or not p.is_file():
        return None
    wr = _read_json(p)
    axes = _extract_axes(wr)
    mode = _runtime_mode_from_wr(wr)
    return {
        "tier": "standalone_worldclass",
        "path": str(p.relative_to(api)) if p.is_relative_to(api) else str(p),
        "observed_at": wr.get("generatedAt") or _utc(),
        "live_or_handoff": "live" if mode == "live" else "handoff",
        "runtime_observation_mode": mode,
        "axes": axes,
        "raw_ref": str(p),
    }


def _confidence(tier: str, base: float) -> float:
    # 簡易: tier ごとにベースを使い、handoff で standalone なら下げる
    return round(min(0.99, max(0.1, base)), 3)


def unify_sources(
    tiers: List[Optional[Dict[str, Any]]],
    priority_confidence: Dict[str, float],
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """各軸について優先ソースを採用。conflicts はレポート用。"""
    conflicts: List[Dict[str, Any]] = []
    out_axes: Dict[str, Any] = {}

    stack = [t for t in tiers if t and t.get("axes") is not None]
    by_id = {t["tier"]: t for t in stack}
    live = by_id.get("live_seal_runtime_matrix")
    standalone = by_id.get("standalone_worldclass")

    for axis in AXES:
        chosen: Optional[Dict[str, Any]] = None
        chosen_val: Optional[bool] = None
        for t in stack:
            axd = t.get("axes") or {}
            if axis not in axd:
                continue
            val = bool(axd[axis])
            tid = t.get("tier", "")
            if (
                tid == "standalone_worldclass"
                and standalone
                and standalone.get("runtime_observation_mode") == "handoff_not_executed"
                and live
            ):
                lv = (live.get("axes") or {}).get(axis)
                if lv is True and val is False:
                    conflicts.append(
                        {
                            "axis": axis,
                            "reason": "demote_standalone_handoff_false_vs_live_true",
                            "live_value": True,
                            "standalone_value": False,
                        }
                    )
                    continue
            chosen = t
            chosen_val = val
            break

        if chosen is None or chosen_val is None:
            out_axes[axis] = {
                "value": None,
                "source": "none",
                "observed_at": _utc(),
                "live_or_handoff": "unknown",
                "confidence": 0.0,
            }
            continue

        tier_id = chosen.get("tier", "")
        cb = priority_confidence.get(tier_id, 0.7)
        out_axes[axis] = {
            "value": chosen_val,
            "source": tier_id,
            "observed_at": chosen.get("observed_at") or _utc(),
            "live_or_handoff": chosen.get("live_or_handoff") or "unknown",
            "confidence": _confidence(tier_id, cb),
        }

    for axis in AXES:
        vals: List[Tuple[str, bool]] = []
        for t in stack:
            axd = t.get("axes") or {}
            if axis in axd:
                vals.append((t["tier"], bool(axd[axis])))
        vs = {v for _, v in vals}
        if len(vs) > 1 and len(vals) >= 2:
            conflicts.append({"axis": axis, "reason": "cross_tier_mismatch", "values": vals})

    return out_axes, conflicts


def run_unify(api: Path, out_dir: Path) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    pri_path = api / "automation/verdict_source_priority_v1.json"
    pri = _read_json(pri_path)
    conf_map = {
        "live_seal_runtime_matrix": 0.95,
        "forensic_integrated": 0.82,
        "orchestrator_integrated": 0.72,
        "standalone_worldclass": 0.55,
    }

    t1 = load_live_seal(api)
    t2 = load_forensic_integrated(api)
    t3 = load_orchestrator(api)
    t4 = load_standalone_worldclass(api)

    axes, conflicts = unify_sources([t1, t2, t3, t4], conf_map)

    overall = axes.get("chat_ts_overall_100") or {}
    overall_val = overall.get("value")

    master_verdict = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "unification_policy_applied": True,
        "priority_config": str(pri_path.relative_to(api)),
        "sources_loaded": {
            "live_seal_runtime_matrix": t1 is not None,
            "forensic_integrated": t2 is not None,
            "orchestrator_integrated": t3 is not None,
            "standalone_worldclass": t4 is not None,
        },
        "source_detail": {
            "live_seal_runtime_matrix": {k: v for k, v in (t1 or {}).items() if k != "axes"},
            "forensic_integrated": {k: v for k, v in (t2 or {}).items() if k != "axes"},
            "orchestrator_integrated": {k: v for k, v in (t3 or {}).items() if k != "axes"},
            "standalone_worldclass": {k: v for k, v in (t4 or {}).items() if k != "axes"},
        },
        "axes": axes,
        "chat_ts_overall_100": overall_val,
    }

    integrated_master = {
        "version": 1,
        "card": "TENMON_MASTER_VERDICT_UNIFICATION_V1",
        "generated_at": _utc(),
        "source": "master_verdict_unifier_v1",
        "integrated": True,
        "worldclass_chat_ts_overall_100": overall_val,
        "worldclass_summary": {
            k.replace("chat_ts_", "").replace("_100", ""): (axes.get(k) or {}).get("value")
            for k in AXES
            if k.startswith("chat_ts")
        },
        "primary_axes": {k: (axes.get(k) or {}).get("value") for k in AXES},
        "storage_backup_nas_channel": "use_storage_backup_nas_recovery_v1",
        "fail_next_card": FAIL_NEXT,
    }

    conflict_report = {
        "version": 1,
        "generated_at": _utc(),
        "conflicts": conflicts,
        "notes": [
            "standalone + handoff_not_executed の false は live seal true を上書きしない",
        ],
    }

    (out_dir / "master_verdict.json").write_text(
        json.dumps(master_verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    shutil_copy_priority = json.loads(json.dumps(pri))
    shutil_copy_priority["resolved_at"] = _utc()
    (out_dir / "verdict_source_priority.json").write_text(
        json.dumps(shutil_copy_priority, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "verdict_conflict_report.json").write_text(
        json.dumps(conflict_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "integrated_master_verdict.json").write_text(
        json.dumps(integrated_master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # master campaign 互換（別名）
    (out_dir / "integrated_verdict_priority.json").write_text(
        json.dumps(integrated_master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    marker = api / "automation/TENMON_MASTER_VERDICT_UNIFICATION_VPS_V1"
    marker.write_text(
        f"{_utc()}\n{CARD}\nchat_ts_overall_100={overall_val}\n",
        encoding="utf-8",
    )

    return {
        "ok": True,
        "out_dir": str(out_dir),
        "chat_ts_overall_100": overall_val,
        "sources": master_verdict["sources_loaded"],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    api = _api_root()
    out = Path(args.out_dir) if args.out_dir else (api / "automation/out/master_verdict_unification_v1")
    blob = run_unify(api, out.resolve())
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
