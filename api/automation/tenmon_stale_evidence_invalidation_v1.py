#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1 — latest truth rebase（削除なし）。"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_stale_evidence_invalidation_verdict.json"
OUT_MD = "tenmon_stale_evidence_invalidation_report.md"
OUT_SUMMARY_V2 = "tenmon_stale_evidence_invalidation_summary_v2.json"
OUT_REPORT_V2 = "tenmon_stale_evidence_invalidation_report_v2.md"
OUT_REGISTRY = "tenmon_truth_excluded_sources_registry_v1.json"
OUT_REBASE_SUMMARY = "tenmon_latest_truth_rebase_summary.json"
OUT_REBASE_REPORT = "tenmon_latest_truth_rebase_report.md"

# rejudge の時間ベース stale から除外（内容は上書きしない・コピーのみ隔離）
STALE_EIGHT = frozenset(
    {
        "pwa_lived_completion_readiness.json",
        "tenmon_remote_admin_cursor_runtime_proof_verdict.json",
        "tenmon_repo_hygiene_watchdog_verdict.json",
        "tenmon_self_build_execution_chain_verdict.json",
        "tenmon_self_repair_acceptance_seal_verdict.json",
        "tenmon_self_repair_safe_loop_verdict.json",
        "tenmon_system_verdict.json",
        "tenmon_worldclass_acceptance_scorecard.json",
    }
)

CANDIDATES = [
    "pwa_lived_completion_readiness.json",
    "pwa_lived_completion_blockers.json",
    "pwa_final_completion_readiness.json",
    "pwa_final_completion_blockers.json",
    "pwa_final_autoloop_state.json",
    "tenmon_system_verdict.json",
    "tenmon_worldclass_acceptance_scorecard.json",
    "tenmon_total_completion_master_report.json",
    "tenmon_current_state_detailed_report.json",
    "tenmon_chat_continuity_deep_forensic.json",
]

PRIMARY_LIVED = (
    "pwa_lived_completion_readiness.json",
    "pwa_lived_completion_blockers.json",
)

REGENERATE_TARGETS = (
    "pwa_final_completion_readiness.json",
    "tenmon_chat_continuity_deep_forensic.json",
    "tenmon_current_state_detailed_report.json",
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def parse_ts(v: Any) -> datetime | None:
    if not isinstance(v, str) or not v.strip():
        return None
    s = v.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except Exception:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def generated_at_of(obj: Any) -> datetime | None:
    if not isinstance(obj, dict):
        return None
    for k in ("generated_at", "timestamp", "generatedAt"):
        dt = parse_ts(obj.get(k))
        if dt:
            return dt
    return None


def artifact_ts(path: Path, obj: Any) -> datetime | None:
    dt = generated_at_of(obj) if isinstance(obj, dict) else None
    if dt:
        return dt
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    except Exception:
        return None


def truthy(x: Any) -> bool:
    return x is True


def union_blockers(obj: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for key in (
        "blockers",
        "final_blockers",
        "postfix_blockers",
        "top_10_blockers",
        "integrated_blockers",
    ):
        raw = obj.get(key)
        if isinstance(raw, list):
            out.extend(str(x) for x in raw if x is not None)
    ib = obj.get("input_aggregation")
    if isinstance(ib, dict):
        ibb = ib.get("integrated_blockers")
        if isinstance(ibb, list):
            out.extend(str(x) for x in ibb if x is not None)
    return out


def collect_contradictions(
    name: str,
    obj: dict[str, Any],
    latest_truth: dict[str, Any],
    forensic_txt: str,
) -> list[dict[str, Any]]:
    pairs: list[dict[str, Any]] = []
    if not isinstance(obj, dict):
        return pairs
    if truthy(latest_truth.get("env_failure")) and name.startswith("pwa_final"):
        return []

    bl = union_blockers(obj)

    def add(field: str, latest_val: Any) -> None:
        pairs.append({"source": name, "field": field, "latest_truth": latest_val})

    if truthy(latest_truth.get("continuity_readiness")):
        for token in ("continuity_fail", "chat:continuity_failed"):
            if token in bl:
                add(token, True)
        if name == "pwa_final_completion_readiness.json" and obj.get("continuity_pass") is False:
            add("continuity_pass_false_vs_lived", True)
        if name == "tenmon_total_completion_master_report.json":
            top = obj.get("top_10_blockers")
            if isinstance(top, list) and "continuity_fail" in top:
                add("top_10_blockers.continuity_fail", True)

    if truthy(latest_truth.get("new_chat_readiness")):
        for token in ("chat:new_chat_failed", "newchat_reload_residue"):
            if token in bl:
                add(token, True)
        if name == "pwa_final_completion_readiness.json" and obj.get("newchat_pass") is False:
            add("newchat_pass_false_vs_lived", True)

    if truthy(latest_truth.get("url_sync_readiness")):
        if "url_sync_missing" in bl:
            add("url_sync_missing", True)

    if truthy(latest_truth.get("refresh_restore_readiness")):
        if "refresh_restore_fail" in bl:
            add("refresh_restore_fail", True)

    if name == "tenmon_system_verdict.json" and truthy(latest_truth.get("continuity_readiness")):
        if str(obj.get("overall_band") or "") == "code_complete_lived_unproven":
            add("overall_band_code_complete_lived_unproven", "needs_refresh")
        sub = obj.get("subsystems")
        if isinstance(sub, dict):
            pwa = sub.get("pwa_lived_proof")
            if isinstance(pwa, dict) and pwa.get("accepted_complete") is not True:
                add("subsystems.pwa_lived_proof.not_accepted", True)

    if name == "tenmon_worldclass_acceptance_scorecard.json" and truthy(latest_truth.get("continuity_readiness")):
        subsystems = obj.get("subsystems")
        if isinstance(subsystems, dict):
            pwa = subsystems.get("pwa_lived_proof")
            if isinstance(pwa, dict) and pwa.get("accepted_complete") is not True:
                add("subsystems.pwa_lived_proof.not_accepted", True)

    if name == "tenmon_current_state_detailed_report.json" and truthy(latest_truth.get("continuity_readiness")):
        raw_lists: list[list[Any]] = []
        for k in ("blockers", "active_blockers", "top_blockers"):
            v = obj.get(k)
            if isinstance(v, list):
                raw_lists.append(v)
        flat = " ".join(str(x) for row in raw_lists for x in row)
        if "continuity_fail" in flat or "continuity_failed" in flat:
            add("detailed_report_continuity_stale", True)

    if name == "tenmon_chat_continuity_deep_forensic.json":
        dump = json.dumps(obj, ensure_ascii=False)
        if truthy(latest_truth.get("continuity_readiness")):
            if obj.get("continuity_drop") is True:
                add("continuity_drop_true_vs_lived_hold", True)
            if "NATURAL_GENERAL_LLM_TOP" in dump and "CONTINUITY_ROUTE_HOLD" not in dump:
                add("natural_top_drop_signal", True)

    return pairs


def run_downstream(repo: Path, auto: Path) -> list[dict[str, Any]]:
    log: list[dict[str, Any]] = []
    scripts: list[tuple[str, list[str]]] = [
        (
            "tenmon_system_verdict_integrator_v1.py",
            ["--repo-root", str(repo), "--soft-exit-ok"],
        ),
        ("tenmon_worldclass_acceptance_scorecard_v1.py", []),
        (
            "tenmon_total_completion_master_report_v1.py",
            ["--repo-root", str(repo), "--no-live-probe", "--soft-exit-ok"],
        ),
    ]
    for name, extra in scripts:
        path = auto / name
        if not path.exists():
            log.append({"script": str(path), "skipped": True, "returncode": None})
            continue
        try:
            r = subprocess.run(
                ["python3", str(path), *extra],
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            log.append({"script": str(path), "returncode": r.returncode})
        except Exception as e:
            log.append({"script": str(path), "error": repr(e), "returncode": None})
    return log


def apply_stale_eight_invalidation(auto: Path, generated_at: str, no_quarantine: bool) -> dict[str, Any]:
    """レジストリ登録 + 隔離コピー（元ファイルは残す）。rejudge の stale ヒントから除外するための truth_excluded_sources。"""
    qdir = auto / "quarantine" / "stale_evidence_v1"
    quarantine_copies: list[dict[str, str]] = []
    if not no_quarantine:
        qdir.mkdir(parents=True, exist_ok=True)
        safe_ts = generated_at.replace(":", "-")
        for name in sorted(STALE_EIGHT):
            src = auto / name
            if src.is_file():
                dest = qdir / f"{safe_ts}__{name}"
                try:
                    shutil.copy2(src, dest)
                    quarantine_copies.append({"source": str(src), "copy": str(dest)})
                except OSError as e:
                    quarantine_copies.append({"source": str(src), "copy": "", "error": repr(e)})

    reg_path = auto / OUT_REGISTRY
    prev = load_json(reg_path)
    kept: list[dict[str, Any]] = []
    if isinstance(prev, dict):
        for e in prev.get("excluded") or []:
            if isinstance(e, dict) and e.get("name") and str(e["name"]) not in STALE_EIGHT:
                kept.append(e)
    new_rows = [
        {
            "name": n,
            "invalidated_at": generated_at,
            "reason": "stale_eight_registry_v1",
            "card": CARD,
            "action": "excluded_from_rejudge_stale_hints",
        }
        for n in sorted(STALE_EIGHT)
    ]
    reg_body: dict[str, Any] = {
        "card": CARD,
        "generated_at": generated_at,
        "excluded": kept + new_rows,
        "stale_eight": sorted(STALE_EIGHT),
    }
    reg_path.write_text(json.dumps(reg_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {
        "truth_excluded_sources": sorted(STALE_EIGHT),
        "truth_excluded_registry_path": str(reg_path),
        "quarantine_dir": str(qdir) if not no_quarantine else None,
        "quarantine_copies": quarantine_copies,
    }


def maybe_regenerate_missing_generated_at(repo: Path, auto: Path, loaded: dict[str, Any]) -> list[dict[str, Any]]:
    jobs: list[tuple[str, list[str]]] = []
    if not isinstance(loaded.get("pwa_final_completion_readiness.json"), dict) or generated_at_of(
        loaded.get("pwa_final_completion_readiness.json")
    ) is None:
        jobs.append(("tenmon_phase3_completion_verdict_v1.py", []))
    if not isinstance(loaded.get("tenmon_chat_continuity_deep_forensic.json"), dict) or generated_at_of(
        loaded.get("tenmon_chat_continuity_deep_forensic.json")
    ) is None:
        jobs.append(("tenmon_chat_continuity_deep_forensic_v1.py", []))
    if not isinstance(loaded.get("tenmon_current_state_detailed_report.json"), dict) or generated_at_of(
        loaded.get("tenmon_current_state_detailed_report.json")
    ) is None:
        jobs.append(("tenmon_current_state_detailed_forensic_v1.py", []))

    out: list[dict[str, Any]] = []
    for fn, extra in jobs:
        p = auto / fn
        if not p.exists():
            out.append({"script": fn, "exists": False, "returncode": None})
            continue
        try:
            pr = subprocess.run(
                ["python3", str(p), "--repo-root", str(repo), *extra],
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=400,
                check=False,
            )
            out.append({"script": fn, "exists": True, "returncode": pr.returncode})
        except Exception as e:
            out.append({"script": fn, "exists": True, "error": repr(e), "returncode": None})
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--no-refresh-downstream",
        action="store_true",
        help="integrator / scorecard / master report を走らせない",
    )
    ap.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="stale_sources がある場合に exit 1（既定は exit 0）",
    )
    ap.add_argument(
        "--no-stale-eight-registry",
        action="store_true",
        help="stale 8 件のレジストリ登録・隔離コピーをスキップ",
    )
    ap.add_argument(
        "--no-quarantine-copy",
        action="store_true",
        help="隔離ディレクトリへのコピーのみスキップ（レジストリは更新）",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    now_iso = utc()
    stale_eight_meta: dict[str, Any] = {}
    if not args.no_stale_eight_registry:
        stale_eight_meta = apply_stale_eight_invalidation(
            auto, now_iso, no_quarantine=bool(args.no_quarantine_copy)
        )

    files: dict[str, Path] = {n: auto / n for n in CANDIDATES}
    loaded: dict[str, Any] = {name: (load_json(p) if p.exists() else None) for name, p in files.items()}

    regen_log = maybe_regenerate_missing_generated_at(repo, auto, loaded)
    for name, p in files.items():
        loaded[name] = load_json(p) if p.exists() else None

    lived_r_raw = loaded.get("pwa_lived_completion_readiness.json")
    lived_b_raw = loaded.get("pwa_lived_completion_blockers.json")
    lived_r = lived_r_raw if isinstance(lived_r_raw, dict) else {}
    lived_b = lived_b_raw if isinstance(lived_b_raw, dict) else {}

    lived_ts_list: list[datetime] = []
    for n in PRIMARY_LIVED:
        o = loaded.get(n)
        p = files[n]
        if o is not None and p.exists():
            t = artifact_ts(p, o)
            if t:
                lived_ts_list.append(t)
    latest_lived_ts = max(lived_ts_list) if lived_ts_list else None

    lived_blockers: list[str] = []
    lb = lived_b.get("blockers")
    if isinstance(lb, list):
        lived_blockers = [str(x) for x in lb if x is not None]

    latest_truth: dict[str, Any] = {
        "continuity_readiness": lived_r.get("continuity_readiness"),
        "new_chat_readiness": lived_r.get("new_chat_readiness"),
        "refresh_restore_readiness": lived_r.get("refresh_restore_readiness"),
        "url_sync_readiness": lived_r.get("url_sync_readiness"),
        "final_ready": lived_r.get("final_ready"),
        "env_failure": lived_r.get("env_failure"),
        "lived_blockers": lived_blockers,
    }

    forensic_obj = loaded.get("tenmon_chat_continuity_deep_forensic.json")
    forensic_txt = ""
    if isinstance(forensic_obj, dict):
        forensic_txt = json.dumps(forensic_obj, ensure_ascii=False)

    latest_primary = [str(files[n]) for n in PRIMARY_LIVED if files[n].exists()]

    contradiction_pairs: list[dict[str, Any]] = []
    stale_sources: list[dict[str, Any]] = []
    pair_seen: set[tuple[str, str, str]] = set()

    for name in CANDIDATES:
        if name in PRIMARY_LIVED:
            continue
        p = files[name]
        obj = loaded.get(name)
        if not p.exists() or not isinstance(obj, dict):
            continue
        pairs = collect_contradictions(name, obj, latest_truth, forensic_txt)
        if not pairs:
            continue
        for pr in pairs:
            key = (str(pr.get("source")), str(pr.get("field")), str(pr.get("latest_truth")))
            if key in pair_seen:
                continue
            pair_seen.add(key)
            contradiction_pairs.append(pr)
        art_ts = artifact_ts(p, obj)
        older = False
        if latest_lived_ts is not None:
            if art_ts is not None:
                older = art_ts < latest_lived_ts
            else:
                older = True
        contradicted = len(pairs) > 0
        if older and contradicted:
            stale_sources.append(
                {
                    "path": str(p),
                    "name": name,
                    "generated_at": obj.get("generated_at") or obj.get("timestamp"),
                    "artifact_ts_utc": art_ts.isoformat().replace("+00:00", "Z") if art_ts else None,
                    "status": "superseded_by_latest_lived_truth",
                    "invalid": True,
                    "superseded": True,
                }
            )

    superseded_names = [s["name"] for s in stale_sources]
    has_lived_readiness = files["pwa_lived_completion_readiness.json"].exists() and isinstance(
        loaded.get("pwa_lived_completion_readiness.json"), dict
    )
    continue_latest = bool(has_lived_readiness and latest_primary)

    downstream_log: list[dict[str, Any]] = []
    do_refresh = continue_latest and (not args.no_refresh_downstream) and bool(stale_sources)
    if do_refresh:
        downstream_log = run_downstream(repo, auto)

    stale_entries = [
        {
            "path": s["path"],
            "reason": s["status"],
            "category": "lived_supersedes",
            "action": "invalidate_logical",
            "scope": "operable_seal",
            "name": s["name"],
        }
        for s in stale_sources
    ]
    missing_generated_at_closed: list[dict[str, Any]] = []
    for name in CANDIDATES:
        p = files[name]
        obj = loaded.get(name)
        if not p.exists() or not isinstance(obj, dict):
            continue
        if generated_at_of(obj) is None:
            missing_generated_at_closed.append(
                {
                    "name": name,
                    "path": str(p),
                    "invalid": True,
                    "reason": "missing_generated_at_not_regenerated",
                    "truth_adopted": False,
                }
            )
    if missing_generated_at_closed:
        existing = {e["name"] for e in stale_entries if isinstance(e, dict) and e.get("name")}
        for m in missing_generated_at_closed:
            if m["name"] not in existing:
                stale_entries.append(
                    {
                        "path": m["path"],
                        "reason": m["reason"],
                        "category": "missing_generated_at",
                        "action": "invalidate_logical",
                        "scope": "truth_source",
                        "name": m["name"],
                    }
                )
    invalid_seal_paths = [s["path"] for s in stale_sources]
    worldclass_paths = [
        s["path"]
        for s in stale_sources
        if s["name"]
        in (
            "tenmon_worldclass_acceptance_scorecard.json",
            "tenmon_system_verdict.json",
            "tenmon_total_completion_master_report.json",
        )
    ]

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": now_iso,
        "latest_truth_rebased": True,
        "truth_source_singleton": True,
        "latest_primary_truth_sources": latest_primary,
        "latest_truth": latest_truth,
        "latest_lived_ts_utc": latest_lived_ts.isoformat().replace("+00:00", "Z")
        if latest_lived_ts
        else None,
        "stale_sources": stale_sources,
        "superseded_sources": superseded_names,
        "missing_generated_at_closed": missing_generated_at_closed,
        "contradiction_pairs": contradiction_pairs,
        "continue_with_latest_truth": continue_latest,
        "regeneration_attempts": regen_log,
        "downstream_refresh": downstream_log,
        "pass": len(stale_sources) == 0,
        "stale_detected": len(stale_sources) > 0,
        "stale_entries": stale_entries,
        "invalidated_for_operable_seal": invalid_seal_paths,
        "invalidated_for_worldclass_claim": worldclass_paths,
        "recommended_next_card": None,
    }
    out["stale_eight_invalidation"] = stale_eight_meta
    if stale_eight_meta.get("truth_excluded_sources"):
        out["truth_excluded_sources"] = stale_eight_meta["truth_excluded_sources"]

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rebase_summary = {
        "card": "TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1",
        "generated_at": out["generated_at"],
        "latest_truth_rebased": True,
        "truth_source_singleton": True,
        "stale_sources_count": len(stale_sources),
        "missing_generated_at_open_count": len(missing_generated_at_closed),
        "superseded_sources": superseded_names,
        "latest_primary_truth_sources": latest_primary,
        "regeneration_attempts": regen_log,
        "recommended_next_card": None if (len(stale_sources) == 0 and len(missing_generated_at_closed) == 0)
        else "TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_RETRY_CURSOR_AUTO_V1",
    }
    (auto / OUT_REBASE_SUMMARY).write_text(
        json.dumps(rebase_summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- continue_with_latest_truth: `{continue_latest}`",
        f"- stale_sources_count: `{len(stale_sources)}`",
        "",
        "## Primary lived",
    ]
    md.extend([f"- `{x}`" for x in latest_primary])
    md.append("")
    md.append("## Superseded (logical)")
    md.extend([f"- `{s['name']}`" for s in stale_sources] if stale_sources else ["- none"])
    md.append("")
    md.append("## Contradictions (sample)")
    if contradiction_pairs:
        for c in contradiction_pairs[:80]:
            md.append(f"- `{c.get('source')}` / `{c.get('field')}`")
    else:
        md.append("- none")
    md.append("")
    md.append("## Policy")
    md.append("- 物理削除なし。invalid / superseded は本 ledger のみ。")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")
    rebase_md = [
        "# TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1",
        "",
        f"- generated_at: `{rebase_summary['generated_at']}`",
        f"- latest_truth_rebased: `{rebase_summary['latest_truth_rebased']}`",
        f"- truth_source_singleton: `{rebase_summary['truth_source_singleton']}`",
        f"- stale_sources_count: `{rebase_summary['stale_sources_count']}`",
        f"- missing_generated_at_open_count: `{rebase_summary['missing_generated_at_open_count']}`",
        "",
        "## Latest Truth Sources",
    ]
    rebase_md.extend([f"- `{x}`" for x in latest_primary] if latest_primary else ["- none"])
    rebase_md.extend(
        [
            "",
            "## Superseded / Invalid Closed",
        ]
    )
    if stale_entries:
        rebase_md.extend([f"- `{e.get('name')}`: {e.get('reason')}" for e in stale_entries[:120]])
    else:
        rebase_md.append("- none")
    rebase_md.extend(
        [
            "",
            "## Regeneration Attempts",
        ]
    )
    if regen_log:
        rebase_md.extend([f"- `{x.get('script')}` rc={x.get('returncode')}" for x in regen_log])
    else:
        rebase_md.append("- none")
    (auto / OUT_REBASE_REPORT).write_text("\n".join(rebase_md) + "\n", encoding="utf-8")

    summary_v2 = {
        "card": CARD,
        "generated_at": out["generated_at"],
        "truth_excluded_sources": out.get("truth_excluded_sources") or [],
        "registry_path": str(auto / OUT_REGISTRY),
        "stale_sources_superseded_count": len(stale_sources),
        "stale_eight_applied": not args.no_stale_eight_registry,
        "quarantine_copy_count": len(stale_eight_meta.get("quarantine_copies") or []),
        "recommended_next_card_after_rejudge": "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1",
    }
    (auto / OUT_SUMMARY_V2).write_text(
        json.dumps(summary_v2, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    report_v2_lines = [
        f"# {CARD} — report v2",
        "",
        f"- generated_at: `{out['generated_at']}`",
        "",
        "## Stale eight — excluded from rejudge stale hints",
        "",
        "Registry: `api/automation/tenmon_truth_excluded_sources_registry_v1.json`",
        "",
    ]
    for n in sorted(STALE_EIGHT):
        report_v2_lines.append(f"- `{n}`")
    report_v2_lines.extend(
        [
            "",
            "## Quarantine copies (source files retained)",
            "",
        ]
    )
    for qc in stale_eight_meta.get("quarantine_copies") or []:
        report_v2_lines.append(f"- `{qc.get('source')}` → `{qc.get('copy')}`")
    if not stale_eight_meta.get("quarantine_copies"):
        report_v2_lines.append("- none or skipped (`--no-quarantine-copy`)")
    report_v2_lines.extend(["", "## Outputs", f"- `{OUT_JSON}`", f"- `{OUT_SUMMARY_V2}`", ""])
    (auto / OUT_REPORT_V2).write_text("\n".join(report_v2_lines) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    if args.fail_on_stale and stale_sources:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

