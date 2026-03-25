#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1
退行検出のみ（会話ロジックは変更しない）。seal 出力ディレクトリを束ね、baseline と差分比較。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CHAT_TS_POSTLOCK_MAINTENANCE_V1"
VERSION = 1


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


def load_observation_from_seal_dir(seal_dir: Path) -> Dict[str, Any]:
    """runtime / surface / report / seal / route / longform を正規化して一束にする。"""
    d = seal_dir.resolve()
    wc = _read_json(d / "worldclass_report.json")
    final = _read_json(d / "final_verdict.json")
    surface = _read_json(d / "surface_audit.json")
    route = _read_json(d / "route_authority_audit.json")
    lf = _read_json(d / "longform_audit.json")
    runtime = _read_json(d / "runtime_matrix.json")

    v_wc = wc.get("verdict") or {}
    st = wc.get("static") or {}

    noise_probes = 0
    noise_total = 0
    if isinstance(surface, dict):
        for _k, row in surface.items():
            if not isinstance(row, dict) or not row.get("ok"):
                continue
            hits = row.get("noise_hits") or []
            if hits:
                noise_probes += 1
                noise_total += len(hits)

    runtime_rows = {k: v for k, v in runtime.items() if k != "_meta" and isinstance(v, dict)}
    runtime_all_ok = bool(runtime_rows) and all(runtime_rows.get(k, {}).get("ok") for k in runtime_rows)

    lf1 = lf.get("longform_1") if isinstance(lf.get("longform_1"), dict) else {}

    report_verdict = {
        "chat_ts_static_100": bool(v_wc.get("chat_ts_static_100")),
        "chat_ts_runtime_100": bool(v_wc.get("chat_ts_runtime_100")),
        "surface_clean": bool(v_wc.get("surface_clean")),
        "route_authority_clean": bool(v_wc.get("route_authority_clean")),
        "longform_quality_clean": bool(v_wc.get("longform_quality_clean")),
        "density_lock": bool(v_wc.get("density_lock")),
        "chat_ts_overall_100": bool(v_wc.get("chat_ts_overall_100")),
    }

    seal_verdict = {
        "chat_ts_static_100": bool(final.get("chat_ts_static_100")),
        "chat_ts_runtime_100": bool(final.get("chat_ts_runtime_100")),
        "surface_clean": bool(final.get("surface_clean")),
        "route_authority_clean": bool(final.get("route_authority_clean")),
        "longform_quality_clean": bool(final.get("longform_quality_clean")),
        "density_lock": bool(final.get("density_lock")),
        "chat_ts_overall_100": bool(final.get("chat_ts_overall_100")),
    }

    static_sig = {
        "res_json_reassign_count": st.get("res_json_reassign_count"),
        "orig_json_bind_count": st.get("orig_json_bind_count"),
        "helper_tail_string_count": st.get("helper_tail_string_count"),
        "reply_definition_count": st.get("reply_definition_count"),
        "natural_general_hit_count": st.get("natural_general_hit_count"),
        "synapse_count": st.get("synapse_count"),
        "seed_count": st.get("seed_count"),
    }

    route_flags = route.get("flags") if isinstance(route.get("flags"), dict) else {}

    return {
        "version": VERSION,
        "kind": "postlock_observation_v1",
        "seal_dir": str(d),
        "capturedAt": _utc_now_iso(),
        "static": static_sig,
        "report_verdict": report_verdict,
        "seal_verdict": seal_verdict,
        "surface": {
            "probes_with_noise": noise_probes,
            "noise_hit_total": noise_total,
        },
        "route_audit_flags": route_flags,
        "longform_1": {
            "response_len": lf1.get("response_len"),
            "three_arc": bool(
                lf1.get("has_mitate") and lf1.get("has_tenkai") and lf1.get("has_rakuchi")
            ),
            "looks_system_diagnosis_short": bool(lf1.get("looks_system_diagnosis_short")),
        },
        "runtime": {
            "all_probes_ok": runtime_all_ok,
            "probe_count": len(runtime_rows),
        },
    }


def detect_contract_drift(wc: Dict[str, Any], final: Dict[str, Any]) -> List[str]:
    drift: List[str] = []
    if not wc or not final:
        return drift
    wv = (wc.get("verdict") or {}).get("chat_ts_overall_100")
    fv = final.get("chat_ts_overall_100")
    if wv is not None and fv is not None and bool(wv) != bool(fv):
        drift.append("contract_drift:chat_ts_overall_100_report_vs_final_verdict")
    ws = (wc.get("verdict") or {}).get("surface_clean")
    fs = final.get("surface_clean")
    if ws is not None and fs is not None and bool(ws) != bool(fs):
        drift.append("contract_drift:surface_clean_report_vs_final_verdict")
    wr = (wc.get("verdict") or {}).get("route_authority_clean")
    fr = final.get("route_authority_clean")
    if wr is not None and fr is not None and bool(wr) != bool(fr):
        drift.append("contract_drift:route_authority_clean_report_vs_final_verdict")
    return drift


def _regressed_bool(was: Optional[bool], now: Optional[bool], key: str) -> Optional[str]:
    if was is True and now is False:
        return f"regression:{key}"
    return None


def _regressed_int(was: Optional[int], now: Optional[int], key: str, *, worse_if_not_equal: bool = False) -> Optional[str]:
    if was is None or now is None:
        return None
    if worse_if_not_equal and was != now:
        return f"regression:{key}_changed({was}->{now})"
    return None


def compare_to_baseline(
    baseline_obs: Dict[str, Any], current: Dict[str, Any]
) -> Tuple[List[str], Dict[str, Any]]:
    """前回 PASS スナップショットとの差分から退行のみ抽出。"""
    regressions: List[str] = []
    details: Dict[str, Any] = {"flags": {}}

    b = baseline_obs.get("observation") or baseline_obs
    c = current

    br, cr = b.get("report_verdict") or {}, c.get("report_verdict") or {}
    bs, cs = b.get("seal_verdict") or {}, c.get("seal_verdict") or {}
    for key in (
        "chat_ts_static_100",
        "chat_ts_runtime_100",
        "surface_clean",
        "route_authority_clean",
        "longform_quality_clean",
        "density_lock",
        "chat_ts_overall_100",
    ):
        x = _regressed_bool(bs.get(key), cs.get(key), f"seal.{key}")
        if x:
            regressions.append(x)
        x2 = _regressed_bool(br.get(key), cr.get(key), f"report.{key}")
        if x2:
            regressions.append(x2)

    bst, cst = b.get("static") or {}, c.get("static") or {}
    for k in (
        "res_json_reassign_count",
        "orig_json_bind_count",
        "reply_definition_count",
    ):
        was, now = bst.get(k), cst.get(k)
        if was is not None and now is not None and was != now:
            regressions.append(f"regression:static.{k}_changed({was}->{now})")

    if bst.get("helper_tail_string_count") == 0 and int(cst.get("helper_tail_string_count") or 0) > 0:
        regressions.append("regression:static.helper_tail_string_count_reappeared")

    bsurf, csurf = b.get("surface") or {}, c.get("surface") or {}
    if int(bsurf.get("probes_with_noise") or 0) == 0 and int(csurf.get("probes_with_noise") or 0) > 0:
        regressions.append("regression:surface.noise_probes_appeared")
    if int(bsurf.get("noise_hit_total") or 0) == 0 and int(csurf.get("noise_hit_total") or 0) > 0:
        regressions.append("regression:surface.noise_hits_increased")

    blf, clf = b.get("longform_1") or {}, c.get("longform_1") or {}
    if blf.get("three_arc") is True and clf.get("three_arc") is False:
        regressions.append("regression:longform.three_arc_lost")
    blen = int(blf.get("response_len") or 0)
    clen = int(clf.get("response_len") or 0)
    if blen >= 900 and clen < 900:
        regressions.append(f"regression:longform.len_fell_below_900({blen}->{clen})")

    brt, crt = b.get("runtime") or {}, c.get("runtime") or {}
    if brt.get("all_probes_ok") is True and crt.get("all_probes_ok") is False:
        regressions.append("regression:runtime.probes_no_longer_all_ok")

    details["regressions"] = regressions
    return regressions, details


def pick_blockers(regressions: List[str], contract_drift: List[str], limit: int = 3) -> List[str]:
    merged: List[str] = []
    for x in contract_drift + regressions:
        s = str(x).strip()
        if s and s not in merged:
            merged.append(s)
        if len(merged) >= limit:
            break
    return merged


def write_next_pdca_md(path: Path, blockers: List[str], maintained: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if maintained:
        path.write_text(
            "# CHAT_TS_POSTLOCK_NEXT_PDCA_AUTO_V1\n\n`maintained=true` — 退行なし。次カード不要。\n",
            encoding="utf-8",
        )
        return
    lines = [
        "# CHAT_TS_POSTLOCK_NEXT_PDCA_AUTO_V1",
        "",
        "POSTLOCK: 会話ロジックは触らず、該当 **Stage カード**へ focused 差分のみ委譲。",
        "",
        "## top_blockers (auto, max 3)",
    ]
    for b in blockers:
        lines.append(f"- {b}")
    lines.extend(
        [
            "",
            "## 参照カード（退行種別の目安）",
            "- `contract_drift:*` → seal / merge / report の契約整合（スクリプト・集計のみ）",
            "- `surface.*` / `regression:surface.*` → `CHAT_TS_STAGE1_SURFACE_POLISH_*`",
            "- `route.*` / `seal.route_authority*` → `CHAT_TS_STAGE2_ROUTE_AUTHORITY_*`",
            "- `longform.*` → `CHAT_TS_STAGE3_LONGFORM_STRUCTURE_*`",
            "- `static.*` / `density` → 例外承認まで **chat.ts 本体は POSTLOCK で変更しない**",
            "",
            "## Retry",
            "- `CHAT_TS_POSTLOCK_MAINTENANCE_RETRY_CURSOR_AUTO_V1`",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True, help="seal 実行出力ディレクトリ")
    ap.add_argument(
        "--baseline",
        type=str,
        default="",
        help="baseline JSON（未指定時は api/automation/postlock_maintenance_baseline.json）",
    )
    ap.add_argument("--out-dir", type=str, default="", help="maintenance_verdict 等の出力先（既定: seal-dir）")
    ap.add_argument(
        "--write-baseline",
        action="store_true",
        help="現在観測を baseline として保存して終了（exit 0）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    seal_dir = Path(args.seal_dir)
    # seal の final_verdict.json と衝突しないよう既定はサブディレクトリ
    out_dir = Path(args.out_dir) if args.out_dir else (seal_dir / "_postlock_maintenance")
    out_dir.mkdir(parents=True, exist_ok=True)

    default_bl = _repo_api() / "automation" / "postlock_maintenance_baseline.json"
    baseline_path = Path(args.baseline) if args.baseline else default_bl

    wc_full = _read_json(seal_dir / "worldclass_report.json")
    final_full = _read_json(seal_dir / "final_verdict.json")
    current = load_observation_from_seal_dir(seal_dir)

    contract_drift = detect_contract_drift(wc_full, final_full)

    if args.write_baseline:
        payload = {
            "version": VERSION,
            "card": CARD,
            "capturedAt": _utc_now_iso(),
            "observation": current,
        }
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        verdict = {
            "version": VERSION,
            "card": CARD,
            "maintained": True,
            "note": "baseline_written",
            "baseline_path": str(baseline_path),
            "contract_drift": [],
            "regressions": [],
            "blockers": [],
        }
        (out_dir / "maintenance_verdict.json").write_text(
            json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        if args.stdout_json:
            print(json.dumps(verdict, ensure_ascii=False, indent=2))
        return 0

    baseline_raw = _read_json(baseline_path)
    if not baseline_raw:
        payload = {
            "version": VERSION,
            "card": CARD,
            "capturedAt": _utc_now_iso(),
            "observation": current,
        }
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        regressions: List[str] = []
        diff_doc = {
            "version": VERSION,
            "note": "baseline_initialized",
            "baseline_path": str(baseline_path),
            "current_seal_dir": str(seal_dir),
        }
        verdict = {
            "version": VERSION,
            "card": CARD,
            "maintained": True,
            "baseline_initialized": True,
            "contract_drift": contract_drift,
            "regressions": regressions,
            "blockers": pick_blockers(regressions, contract_drift, 3),
        }
        (out_dir / "regression_diff.json").write_text(
            json.dumps(diff_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (out_dir / "maintenance_verdict.json").write_text(
            json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        write_next_pdca_md(out_dir / "next_pdca_auto.md", verdict["blockers"], True)
        (out_dir / "final_verdict.json").write_text(
            json.dumps(
                {"ok": True, "maintained": True, "card": CARD, "phase": "baseline_init"},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        if args.stdout_json:
            print(json.dumps(verdict, ensure_ascii=False, indent=2))
        return 0

    baseline_obs = baseline_raw.get("observation") or baseline_raw
    regressions, diff_details = compare_to_baseline(baseline_obs, current)
    diff_doc = {
        "version": VERSION,
        "baseline_path": str(baseline_path),
        "current_seal_dir": str(seal_dir),
        "capturedAt": current.get("capturedAt"),
        "contract_drift": contract_drift,
        "regressions": regressions,
        "details": diff_details,
    }
    maintained = len(regressions) == 0 and len(contract_drift) == 0
    blockers = pick_blockers(regressions, contract_drift, 3)

    verdict = {
        "version": VERSION,
        "card": CARD,
        "maintained": maintained,
        "contract_drift": contract_drift,
        "regressions": regressions,
        "blockers": blockers,
    }
    (out_dir / "regression_diff.json").write_text(
        json.dumps(diff_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "maintenance_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_next_pdca_md(out_dir / "next_pdca_auto.md", blockers, maintained)
    final = {
        "ok": maintained,
        "maintained": maintained,
        "card": CARD,
        "blockers": blockers,
    }
    (out_dir / "final_verdict.json").write_text(
        json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.stdout_json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))

    return 0 if maintained else 1


if __name__ == "__main__":
    raise SystemExit(main())
