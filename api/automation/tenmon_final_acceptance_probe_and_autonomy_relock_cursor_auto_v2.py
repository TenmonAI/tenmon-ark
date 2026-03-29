#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_CURSOR_AUTO_V2 (P5)

P0〜P4 後の再観測。V1 エンジンを再利用し、プローブ集合を P5 指定に絞る。
成果物: tenmon_final_acceptance_probe_relock_result_v2.json / _report_v2.md
"""
from __future__ import annotations

import importlib.util
import io
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_CURSOR_AUTO_V2"
OUT_JSON = "tenmon_final_acceptance_probe_relock_result_v2.json"
OUT_MD = "tenmon_final_acceptance_probe_relock_report_v2.md"

# P5 プローブ順（V1 UX_PROBES からこの順で抽出）
P5_UX_ORDER: list[str] = [
    "define_kotodama",
    "define_hokekyo",
    "general_tired",
    "general_organize",
    "support_login",
    "support_billing",
    "support_pwa",
    "founder_update",
    "uncertainty_sparse",
    "uncertainty_claim",
    "book_reading_1",
    "book_reading_2",
]

P5_CONTINUITY_IDS = frozenset({"continuity_1", "continuity_2", "continuity_3"})

KOKUZO_TENMON_KEYS: tuple[str, ...] = (
    "hokekyo_tenmon_reading",
    "sokushin_joubutsu_tenmon_reading",
    "kotodama_tenmon_reading",
    "mizuhi_tenmon_reading",
)

VERDICT_RANK: dict[str, int] = {
    "ux_needs_surface_or_route_repair": 0,
    "ux_improved_hold": 1,
    "ux_strong_custom_gpt_surpass_lane": 2,
    "ux_strong_autonomy_ready_lane": 3,
}


def _load_relock_v1_module():
    here = Path(__file__).resolve().parent
    p = here / "tenmon_conversation_acceptance_probe_relock_cursor_auto_v1.py"
    spec = importlib.util.spec_from_file_location("tenmon_acceptance_relock_v1", p)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load spec: {p}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _kokuzo_core_tenmon_probe() -> dict[str, Any]:
    base = os.environ.get("TENMON_DATA_DIR", "/opt/tenmon-ark-data").strip() or "/opt/tenmon-ark-data"
    db_path = Path(base).expanduser().resolve() / "kokuzo.sqlite"
    out: dict[str, Any] = {
        "db_path": str(db_path),
        "keys_expected": list(KOKUZO_TENMON_KEYS),
        "keys_present": [],
        "all_four_present": False,
        "error": None,
    }
    if not db_path.is_file():
        out["error"] = "kokuzo_sqlite_missing"
        return out
    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        for k in KOKUZO_TENMON_KEYS:
            row = cur.execute(
                "SELECT 1 FROM kokuzo_core WHERE key = ? LIMIT 1",
                (k,),
            ).fetchone()
            if row:
                out["keys_present"].append(k)
        conn.close()
    except Exception as e:
        out["error"] = str(e)
        return out
    out["all_four_present"] = len(out["keys_present"]) == len(KOKUZO_TENMON_KEYS)
    return out


def _verdict_rank(verdict: str | None) -> int:
    if not verdict:
        return -1
    return VERDICT_RANK.get(str(verdict), -1)


def _load_previous_verdict(paths: list[Path]) -> tuple[str | None, Path | None]:
    for path in paths:
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            v = data.get("overall_verdict")
            if isinstance(v, str) and v:
                return v, path
        except Exception:
            continue
    return None, None


def _snapshot_autonomy_far(path: Path | None) -> dict[str, Any] | None:
    if path is None or not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        far = data.get("ux_metrics", {}).get("full_autonomy_system_ready")
        return far if isinstance(far, dict) else None
    except Exception:
        return None


def _patch_result_json(
    path: Path,
    kokuzo: dict[str, Any],
    prev_verdict: str | None,
    prev_path: Path | None,
    prev_far: dict[str, Any] | None,
) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["schema"] = "TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_V2"
    data["card"] = CARD
    data["probe_profile"] = "P5_v2_subset"
    data["nextOnPass"] = "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1"
    data["nextOnFail"] = "TENMON_SURFACE_LEAK_CLEANUP_RETRY_CURSOR_AUTO_V4"
    data["kokuzo_core_tenmon_reading_probe"] = kokuzo

    cur_v = data.get("overall_verdict")
    cur_r = _verdict_rank(cur_v if isinstance(cur_v, str) else None)
    prev_r = _verdict_rank(prev_verdict)
    data["verdict_comparison"] = {
        "overall_verdict_current": cur_v,
        "overall_verdict_previous": prev_verdict,
        "previous_source": str(prev_path) if prev_path else None,
        "rank_current": cur_r,
        "rank_previous": prev_r,
        "verdict_forward": cur_r > prev_r if prev_r >= 0 and cur_r >= 0 else None,
    }

    cur_far = data.get("ux_metrics", {}).get("full_autonomy_system_ready")
    if isinstance(cur_far, dict) and prev_far:
        ps = prev_far.get("score")
        cs = cur_far.get("score")
        data["full_autonomy_system_ready_previous"] = {
            "score": ps,
            "source": str(prev_path) if prev_path else None,
        }
        if isinstance(ps, (int, float)) and isinstance(cs, (int, float)):
            data["full_autonomy_score_delta"] = round(float(cs) - float(ps), 4)

    far = data.get("ux_metrics", {}).get("full_autonomy_system_ready")
    if isinstance(far, dict):
        far = {
            **far,
            "kokuzo_core_tenmon_reading_ok": bool(kokuzo.get("all_four_present")),
        }
        data.setdefault("ux_metrics", {})["full_autonomy_system_ready"] = far

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def _patch_report_md(md_path: Path, json_path: Path) -> None:
    if not json_path.is_file():
        return
    data = json.loads(json_path.read_text(encoding="utf-8"))
    vc = data.get("verdict_comparison") or {}
    kz = data.get("kokuzo_core_tenmon_reading_probe") or {}
    lines = [
        f"# TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_REPORT_V2 (P5)",
        "",
        f"- **generated_at**: `{data.get('generated_at')}`",
        f"- **acceptance_pass**: `{data.get('acceptance_pass')}`",
        f"- **overall_verdict**: `{data.get('overall_verdict')}`",
        f"- **verdict_forward** (vs baseline): `{vc.get('verdict_forward')}`",
        f"- **kokuzo_core_tenmon_reading**: all_four=`{kz.get('all_four_present')}` present={kz.get('keys_present')}",
        f"- **billing_link_probe**: `{data.get('billing_link_probe')}`",
        f"- **full_autonomy_score_delta**: `{data.get('full_autonomy_score_delta')}`",
        "",
        "## verdict_comparison",
        "",
        json.dumps(vc, ensure_ascii=False, indent=2),
        "",
        "## next",
        "",
        f"- **nextOnPass**: `{data.get('nextOnPass')}`",
        f"- **nextOnFail**: `{data.get('nextOnFail')}`",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    v1_json = auto / "tenmon_conversation_acceptance_probe_relock_result_v1.json"
    v2_json = auto / OUT_JSON

    relock = _load_relock_v1_module()

    by_id = {p[0]: p for p in relock.UX_PROBES}
    missing = [pid for pid in P5_UX_ORDER if pid not in by_id]
    if missing:
        print(json.dumps({"error": "P5 probe id not in V1 UX_PROBES", "missing": missing}, ensure_ascii=False), file=sys.stderr)
        return 3

    relock.UX_PROBES[:] = [by_id[pid] for pid in P5_UX_ORDER]
    relock.CONTINUITY_PAIRS[:] = [p for p in relock.CONTINUITY_PAIRS if p[0] in P5_CONTINUITY_IDS]

    relock.OUT_JSON = OUT_JSON
    relock.OUT_MD = OUT_MD
    relock.CARD = CARD

    kokuzo = _kokuzo_core_tenmon_probe()
    prev_verdict, prev_path = _load_previous_verdict([v2_json, v1_json])
    prev_far_snapshot = _snapshot_autonomy_far(prev_path)

    _buf = io.StringIO()
    _prev_out = sys.stdout
    try:
        sys.stdout = _buf
        rc = int(relock.main())
    finally:
        sys.stdout = _prev_out

    out_path = auto / OUT_JSON
    if not out_path.is_file():
        print(json.dumps({"error": "expected result json missing", "path": str(out_path)}, ensure_ascii=False), file=sys.stderr)
        return 4

    _patch_result_json(out_path, kokuzo, prev_verdict, prev_path, prev_far_snapshot)
    _patch_report_md(auto / OUT_MD, out_path)

    final = json.loads(out_path.read_text(encoding="utf-8"))
    print(
        json.dumps(
            {
                "acceptance_pass": final.get("acceptance_pass"),
                "overall_verdict": final.get("overall_verdict"),
                "verdict_comparison": final.get("verdict_comparison"),
                "kokuzo_core_tenmon_reading_probe": final.get("kokuzo_core_tenmon_reading_probe"),
                "ux_metrics": final.get("ux_metrics"),
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
