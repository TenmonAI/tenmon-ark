#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_STAGE5: seal 出力を束ね、final_verdict / density_lock_verdict / focused next PDCA を書く。
exit contract regression guard: CHAT_TS_STAGE5_CARD_NAME=CHAT_TS_EXIT_CONTRACT_SEAL_AND_REGRESSION_GUARD_V1
+ CHAT_TS_REGRESSION_REPAIR_MD / CHAT_TS_EXIT_CONTRACT_PASS_RESULT_MD
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
from typing import Any, Dict, List, Optional


def _read_json(path: pathlib.Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _pick_blockers(blockers: List[str], limit: int = 3) -> List[str]:
    out: List[str] = []
    for b in blockers:
        s = str(b).strip()
        if s and s not in out:
            out.append(s)
        if len(out) >= limit:
            break
    return out


def _dispatch_registry_path() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parents[1] / "automation" / "chat_ts_completion_dispatch_registry_v1.json"


def _format_blocker_dispatch_markdown(blockers: List[str]) -> List[str]:
    """CHAT_TS_COMPLETION_SUPPLEMENT: blocker 種別 → Stage カード対の追従表。"""
    reg = _read_json(_dispatch_registry_path())
    entries = reg.get("by_blocker_prefix") or []
    lines: List[str] = ["", "## blocker_dispatch（completion supplement）", ""]
    for b in blockers:
        bs = str(b).strip()
        if not bs:
            continue
        hit = None
        for e in entries:
            m = str(e.get("match") or "")
            if m and m in bs:
                hit = e
                break
        if hit:
            lines.append(
                f"- `{bs}` → **{hit.get('stage_hint')}** | `{hit.get('cursor_card')}` / `{hit.get('vps_card')}`"
            )
        else:
            lines.append(f"- `{bs}` → （registry 未登録 — `CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1` で追補）")
    lines.append("")
    return lines


def _dedupe_preserve(seq: List[str]) -> List[str]:
    out: List[str] = []
    for x in seq:
        s = str(x).strip()
        if s and s not in out:
            out.append(s)
    return out


def _write_seal_artifacts(
    *,
    card_name: str,
    final_path: pathlib.Path,
    seal_obj: Dict[str, Any],
    chat_ts_overall_100: bool,
    static_blockers_final: List[str],
    runtime_probe_blockers_final: List[str],
    summary_blockers: List[str],
) -> None:
    """seal_verdict.json + exit contract PASS/FAIL 付帯 MD。"""
    seal_path = final_path.parent / "seal_verdict.json"
    seal_path.write_text(json.dumps(seal_obj, ensure_ascii=False, indent=2), encoding="utf-8")

    pass_md = os.environ.get("CHAT_TS_EXIT_CONTRACT_PASS_RESULT_MD", "").strip()
    if not pass_md and card_name == "CHAT_TS_EXIT_CONTRACT_SEAL_AND_REGRESSION_GUARD_V1":
        pass_md = str(final_path.parent / "CHAT_TS_EXIT_CONTRACT_SEAL_PASS_RESULT.md")

    reg_md = os.environ.get("CHAT_TS_REGRESSION_REPAIR_MD", "").strip()

    if chat_ts_overall_100 and pass_md:
        p = pathlib.Path(pass_md)
        p.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            f"# CHAT_TS_EXIT_CONTRACT_SEAL_PASS_RESULT",
            "",
            f"- **card**: `{card_name}`",
            f"- **chat_ts_overall_100**: `true`（6 軸すべて PASS）",
            "",
            "## 判定軸（worldclass completion report と同一）",
            "",
            "| 軸 | 値 |",
            "|---|---|",
            f"| chat_ts_static_100 | `{seal_obj.get('chat_ts_static_100')}` |",
            f"| chat_ts_runtime_100 | `{seal_obj.get('chat_ts_runtime_100')}` |",
            f"| surface_clean | `{seal_obj.get('surface_clean')}` |",
            f"| route_authority_clean | `{seal_obj.get('route_authority_clean')}` |",
            f"| longform_quality_clean | `{seal_obj.get('longform_quality_clean')}` |",
            f"| density_lock | `{seal_obj.get('density_lock')}` |",
            "",
            "## blockers",
            "",
            "- （なし）`static_blockers=[]` / `runtime_probe_blockers=[]` / `blockers=[]`",
            "",
            "## 成果物（VPS）",
            "",
            f"- `final_verdict.json` → `{final_path}`",
            f"- `seal_verdict.json` → `{seal_path}`",
            "",
        ]
        p.write_text("\n".join(lines), encoding="utf-8")

    if not chat_ts_overall_100 and reg_md:
        p2 = pathlib.Path(reg_md)
        p2.parent.mkdir(parents=True, exist_ok=True)
        top = _pick_blockers(summary_blockers + static_blockers_final + runtime_probe_blockers_final, 5)
        lines = [
            "# CHAT_TS_EXIT_CONTRACT_REGRESSION_REPAIR_CURSOR_AUTO_V1",
            "",
            "FAIL_NEXT: `CHAT_TS_EXIT_CONTRACT_REGRESSION_REPAIR_CURSOR_AUTO_V1`",
            "",
            "exit contract seal 後の回帰修復（surface / route / longform の密結合領域を最小 diff で戻す）。",
            "",
            "## top_blockers（focused）",
        ]
        for b in top:
            lines.append(f"- `{b}`")
        lines.extend(["", "## static_blockers", ""])
        if static_blockers_final:
            for b in static_blockers_final:
                lines.append(f"- `{b}`")
        else:
            lines.append("- （なし）")
        lines.extend(["", "## runtime_probe_blockers", ""])
        if runtime_probe_blockers_final:
            for b in runtime_probe_blockers_final:
                lines.append(f"- `{b}`")
        else:
            lines.append("- （詳細なし — summary のみ参照）")
        lines.extend(
            [
                "",
                "## 再実行",
                "",
                "- `api/scripts/chat_ts_exit_contract_seal_and_regression_guard_v1.sh`",
                "",
            ]
        )
        p2.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    if len(sys.argv) < 8:
        print(
            "usage: chat_ts_stage5_verdict_merge_v1.py "
            "<runtime_matrix.json> <surface_audit.json> <worldclass_report.json> "
            "<route_authority_audit.json> <longform_audit.json> "
            "<final_verdict.json> <density_lock_verdict.json> [next_stage5.md]",
            file=sys.stderr,
        )
        return 2
    runtime_path = pathlib.Path(sys.argv[1])
    surface_path = pathlib.Path(sys.argv[2])
    wc_path = pathlib.Path(sys.argv[3])
    route_audit_path = pathlib.Path(sys.argv[4])
    lf_audit_path = pathlib.Path(sys.argv[5])
    final_path = pathlib.Path(sys.argv[6])
    density_path = pathlib.Path(sys.argv[7])
    next_md = pathlib.Path(sys.argv[8]) if len(sys.argv) > 8 else None

    card_name = os.environ.get("CHAT_TS_STAGE5_CARD_NAME", "CHAT_TS_STAGE5_WORLDCLASS_SEAL_V1").strip() or "CHAT_TS_STAGE5_WORLDCLASS_SEAL_V1"

    runtime = _read_json(runtime_path)
    surface = _read_json(surface_path)
    wc = _read_json(wc_path)
    route_audit = _read_json(route_audit_path)
    lf_audit = _read_json(lf_audit_path)

    v = wc.get("verdict") or {}
    st = wc.get("static") or {}

    runtime_rows = {k: v for k, v in runtime.items() if k != "_meta" and isinstance(v, dict)}
    chat_ts_runtime_100 = bool(runtime_rows) and all(
        runtime_rows[k].get("ok") for k in runtime_rows
    )

    surface_noise = {
        k: x.get("noise_hits", [])
        for k, x in surface.items()
        if isinstance(x, dict) and x.get("ok") and x.get("noise_hits")
    }
    surface_clean = len(surface_noise) == 0

    chat_ts_static_100 = bool(v.get("chat_ts_static_100"))
    report_surface = bool(v.get("surface_clean"))
    surface_clean_merged = surface_clean and (report_surface if wc else surface_clean)

    route_authority_clean = bool(v.get("route_authority_clean"))
    flags: Optional[Dict[str, Any]] = route_audit.get("flags") if isinstance(route_audit.get("flags"), dict) else None
    if isinstance(flags, dict) and flags:
        if any(bool(x) for x in flags.values()):
            route_authority_clean = False

    longform_quality_clean = bool(v.get("longform_quality_clean"))
    lf = lf_audit.get("longform_1") if isinstance(lf_audit.get("longform_1"), dict) else {}
    if lf_audit.get("longform_1") is not None:
        if lf.get("looks_system_diagnosis_short"):
            longform_quality_clean = False
        if not lf.get("has_mitate") or not lf.get("has_tenkai") or not lf.get("has_rakuchi"):
            if int(lf.get("response_len") or 0) < 1400:
                longform_quality_clean = False

    density_lock = bool(v.get("density_lock"))
    density_reasons = list(v.get("density_lock_reasons") or [])
    advisory = list(v.get("advisory_warnings") or [])

    density_payload = {
        "version": 1,
        "card": card_name,
        "density_lock": density_lock,
        "density_lock_reasons": density_reasons,
        "synapse_count": st.get("synapse_count"),
        "seed_count": st.get("seed_count"),
        "advisory_warnings": advisory,
    }
    density_path.write_text(json.dumps(density_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    chat_ts_overall_100 = (
        chat_ts_static_100
        and chat_ts_runtime_100
        and surface_clean_merged
        and route_authority_clean
        and longform_quality_clean
        and density_lock
    )

    static_blockers_final: List[str] = _dedupe_preserve(list(v.get("static_blockers") or []))

    runtime_probe_blockers_final: List[str] = []
    for k in sorted(runtime_rows.keys()):
        row = runtime_rows[k]
        if not row.get("ok"):
            err = row.get("error") or row.get("err") or ""
            runtime_probe_blockers_final.append(f"{k}:not_ok" + (f":{err}" if err else ""))
    for k, x in surface.items():
        if isinstance(x, dict) and x.get("ok"):
            for nh in x.get("noise_hits") or []:
                runtime_probe_blockers_final.append(f"{k}:surface_noise:{nh}")
    if not route_authority_clean:
        for rr in v.get("route_authority_reasons") or []:
            runtime_probe_blockers_final.append(f"route_authority:{rr}")
        if isinstance(flags, dict):
            for fk, fv in flags.items():
                if fv:
                    runtime_probe_blockers_final.append(f"route_audit_flag:{fk}")
    if not longform_quality_clean:
        if lf.get("looks_system_diagnosis_short"):
            runtime_probe_blockers_final.append("longform:looks_system_diagnosis_short")
        rl = int(lf.get("response_len") or 0)
        if lf_audit.get("longform_1") is not None:
            if not (lf.get("has_mitate") and lf.get("has_tenkai") and lf.get("has_rakuchi")) and rl < 1400:
                runtime_probe_blockers_final.append(f"longform:tri_arc_or_short:{rl}")
    if not chat_ts_runtime_100 and not runtime_probe_blockers_final:
        runtime_probe_blockers_final.append("runtime_probe_failure_remaining")
    runtime_probe_blockers_final = _dedupe_preserve(runtime_probe_blockers_final)

    blockers: List[str] = []
    if not chat_ts_runtime_100:
        blockers.append("runtime_probe_failure_remaining")
    if not surface_clean:
        blockers.append("surface_noise_remaining")
    if wc and not chat_ts_static_100:
        blockers.append("static_not_100")
    if wc and not report_surface:
        blockers.append("worldclass_surface_not_clean")
    if not route_authority_clean:
        blockers.append("route_authority_not_clean")
    if not longform_quality_clean:
        blockers.append("longform_quality_not_clean")
    if not density_lock:
        blockers.append("density_lock_not_clean")

    # PASS 時は成果物を一意に（空 blockers / 空 detailed）
    if chat_ts_overall_100:
        blockers = []
        static_blockers_final = []
        runtime_probe_blockers_final = []

    seal_obj = {
        "version": 1,
        "card": card_name,
        "chat_ts_static_100": chat_ts_static_100,
        "chat_ts_runtime_100": chat_ts_runtime_100,
        "surface_clean": surface_clean_merged,
        "route_authority_clean": route_authority_clean,
        "longform_quality_clean": longform_quality_clean,
        "density_lock": density_lock,
        "chat_ts_overall_100": chat_ts_overall_100,
        "_overall_100_rule": (
            "chat_ts_static_100 && chat_ts_runtime_100 && surface_clean && "
            "route_authority_clean && longform_quality_clean && density_lock"
        ),
    }

    final = {
        "version": 1,
        "card": card_name,
        "chat_ts_static_100": chat_ts_static_100,
        "chat_ts_runtime_100": chat_ts_runtime_100,
        "surface_clean": surface_clean_merged,
        "route_authority_clean": route_authority_clean,
        "longform_quality_clean": longform_quality_clean,
        "density_lock": density_lock,
        "chat_ts_overall_100": chat_ts_overall_100,
        "surface_noise_remaining": surface_noise,
        "worldclass_verdict": v,
        "static_blockers": static_blockers_final,
        "runtime_probe_blockers": runtime_probe_blockers_final,
        "blockers": blockers,
        "chat_ts_overall_100_definition": seal_obj["_overall_100_rule"],
    }
    final_path.write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(final, ensure_ascii=False, indent=2))
    print("SEAL_VERDICT_JSON=" + json.dumps(seal_obj, ensure_ascii=False))
    _write_seal_artifacts(
        card_name=card_name,
        final_path=final_path,
        seal_obj=seal_obj,
        chat_ts_overall_100=chat_ts_overall_100,
        static_blockers_final=static_blockers_final,
        runtime_probe_blockers_final=runtime_probe_blockers_final,
        summary_blockers=blockers,
    )

    if not chat_ts_overall_100 and next_md:
        rb = list(v.get("remaining_blockers") or []) + blockers
        top = _pick_blockers(rb, 3)
        next_md.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# CHAT_TS_STAGE5_WORLDCLASS_NEXT_PDCA_AUTO_V1",
            "",
            "未達を 1〜3 個に絞った focused 次手（`CHAT_TS_STAGE5_WORLDCLASS_SEAL_RETRY_CURSOR_AUTO_V1` で再実行）。",
            "",
            "## top_blockers",
        ]
        for b in top:
            lines.append(f"- {b}")
        lines.extend(_format_blocker_dispatch_markdown(blockers))
        lines.extend(
            [
                "## 優先カード（参照）",
                "- `CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1`（surface）",
                "- `CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V2`（route）",
                "- `CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1`（longform）",
                "- `CHAT_TS_STAGE5_WORLDCLASS_SEAL_AND_BASELINE_CURSOR_AUTO_V1`（本カード）",
                "",
                "詳細 dispatch: `next_card_dispatch.json`（`_completion_supplement/`）",
                "",
            ]
        )
        next_md.write_text("\n".join(lines), encoding="utf-8")

    return 0 if chat_ts_overall_100 else 1


if __name__ == "__main__":
    raise SystemExit(main())
