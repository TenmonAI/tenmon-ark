#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NOTION_AUTOBUILD_WRITEBACK_LIVE_BIND_CURSOR_AUTO_V1

VPS / multi_ai progress / runtime / judgement / probe JSON のみを真実源に、
Notion Task Queue の 1 row を PATCH。Notion を成功根拠にしない（fail-closed）。

更新対象（property_map 経由で Status / RunState / ResultSummary / EvidencePath /
HeadSha / LastRunAt / NextAction 等にマッピング）:
  status, run_state, result_summary, evidence_path, head_sha, last_run_at, next_action
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import notion_autobuild_intake_v1 as intake_mod

CARD = "TENMON_NOTION_AUTOBUILD_WRITEBACK_LIVE_BIND_CURSOR_AUTO_V1"
CONFIG_FN = "notion_autobuild_config_v1.json"
RESULT_FN = "notion_autobuild_last_writeback_result_v1.json"
INTAKE_RESULT_FN = "notion_autobuild_last_intake_result_v1.json"
PROGRESS_FN = "notion_autobuild_progress_report_v1.json"
MULTI_RT = "multi_ai_autonomy_runtime_state.json"
MULTI_PR = "multi_ai_autonomy_progress_report.json"
MULTI_JUDGE = "multi_ai_autonomy_last_judgement.json"
SCHED_CFG = "schedule_executor_config_v1.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _repo_root(auto_dir: Path) -> Path:
    return auto_dir.parents[1]


def _git_head_short(repo: Path) -> str:
    try:
        p = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        return (p.stdout or "").strip()
    except Exception:
        return ""


def _truth_pass_from_probes(auto_dir: Path) -> tuple[bool, str, list[str]]:
    cfg = _read_json(auto_dir / SCHED_CFG)
    paths = cfg.get("probe_result_paths")
    if not isinstance(paths, list):
        paths = []
    extra = (os.environ.get("TENMON_NOTION_WRITEBACK_PROBE_JSON") or "").strip()
    if extra:
        paths = list(paths) + [extra]
    checked: list[str] = []
    for rel in paths:
        r = str(rel).strip()
        if not r:
            continue
        p = auto_dir / r
        checked.append(r)
        d = _read_json(p)
        if d.get("ok") is True:
            return True, "probe_ok", checked
    return False, "no_probe_pass", checked


def _judgement_probe_paths(jd: dict[str, Any]) -> list[str]:
    out: list[str] = []
    obs = jd.get("observer_snapshot") if isinstance(jd.get("observer_snapshot"), dict) else {}
    pr = obs.get("probe") if isinstance(obs.get("probe"), dict) else {}
    ent = pr.get("entries")
    if not isinstance(ent, list):
        return out
    for e in ent:
        if isinstance(e, dict):
            p = str(e.get("path") or "").strip()
            if p:
                out.append(p)
    return out


def _evidence_as_truth_relative(auto_dir: Path, evidence: str) -> str | None:
    """ローカル evidence パスが存在すれば auto_dir 相対で truth_source_paths に載せる（URL は除外）。"""
    e = (evidence or "").strip()
    if not e or e.startswith(("http://", "https://")):
        return None
    p = Path(e)
    if not p.is_absolute():
        p = (auto_dir / e).resolve()
    else:
        p = p.resolve()
    try:
        if not (p.is_file() or p.is_dir()):
            return None
        rel = p.relative_to(auto_dir.resolve())
        return rel.as_posix()
    except (OSError, ValueError):
        return None


def _collect_truth_source_paths(auto_dir: Path, probe_rels: list[str]) -> list[str]:
    base = [
        MULTI_RT,
        MULTI_PR,
        MULTI_JUDGE,
        SCHED_CFG,
    ]
    merged = [p for p in base if p] + [p for p in probe_rels if p]
    jd = _read_json(auto_dir / MULTI_JUDGE)
    for p in _judgement_probe_paths(jd):
        if p and p not in merged:
            merged.append(p)
    rt = _read_json(auto_dir / MULTI_RT)
    pr = _read_json(auto_dir / MULTI_PR)
    ev = str(rt.get("last_evidence_dir") or pr.get("last_orchestra_evidence") or "").strip()
    ev_rel = _evidence_as_truth_relative(auto_dir, ev)
    if ev_rel and ev_rel not in merged:
        merged.append(ev_rel)
    return merged


def _resolve_notion_page_id(auto_dir: Path, explicit: str) -> tuple[str, str]:
    x = (explicit or "").strip().replace("-", "")
    if x:
        return x, "argv"
    env = (os.environ.get("TENMON_NOTION_WRITEBACK_PAGE_ID") or "").strip().replace("-", "")
    if env:
        return env, "env"
    nprog = _read_json(auto_dir / PROGRESS_FN)
    sel_tr = str(nprog.get("selected_manifest_card_id") or "").strip()
    for tr in nprog.get("candidate_selection_trace") or []:
        if not isinstance(tr, dict):
            continue
        if sel_tr and str(tr.get("card_name") or "").strip() != sel_tr:
            continue
        pid = str(tr.get("notion_page_id") or "").replace("-", "").strip()
        if pid:
            return pid, "notion_autobuild_progress_trace"
    sel = str(nprog.get("selected_manifest_card_id") or "").strip()
    ir = _read_json(auto_dir / INTAKE_RESULT_FN)
    cands = ir.get("machine_candidates")
    if isinstance(cands, list) and sel:
        for row in cands:
            if not isinstance(row, dict):
                continue
            if str(row.get("card_name") or "").strip() != sel:
                continue
            pid = str(row.get("_notion_page_id") or row.get("writeback_page_id") or "").replace("-", "").strip()
            if pid:
                return pid, "progress_selected_manifest_match"
    if isinstance(cands, list) and cands:
        row0 = cands[0]
        if isinstance(row0, dict):
            pid = str(row0.get("_notion_page_id") or row0.get("writeback_page_id") or "").replace("-", "").strip()
            if pid:
                return pid, "last_intake_first_candidate"
    return "", "unresolved"


def _derive_verdict_and_summary(auto_dir: Path) -> tuple[str, str, str, list[str]]:
    """
    戻り: (PASS|FAIL|HOLD, status_select, run_state_select, truth_paths)
    status_select = Passed|Failed|Hold
    run_state_select = passed|failed|hold
    """
    probe_ok, probe_why, probe_paths = _truth_pass_from_probes(auto_dir)
    truth_paths = _collect_truth_source_paths(auto_dir, probe_paths)

    jd = _read_json(auto_dir / MULTI_JUDGE)
    jv = str(jd.get("verdict") or "").strip().upper()
    jreason = str(jd.get("reason") or "").strip()

    rt = _read_json(auto_dir / MULTI_RT)
    st = str(rt.get("status") or "").strip().upper()
    lr_rt = str(rt.get("last_result") or "").strip()

    pr = _read_json(auto_dir / MULTI_PR)
    lr_pr = str(pr.get("last_result") or "").strip()
    hr = pr.get("hold_reason")
    hr_s = str(hr).strip() if hr is not None else ""

    if jv == "PASS":
        return "PASS", "Passed", "passed", truth_paths
    if jv == "FAIL":
        return "FAIL", "Failed", "failed", truth_paths
    if jv == "HOLD":
        return "HOLD", "Hold", "hold", truth_paths

    if st == "FAIL":
        return "FAIL", "Failed", "failed", truth_paths
    if st == "HOLD":
        return "HOLD", "Hold", "hold", truth_paths
    if hr_s:
        return "HOLD", "Hold", "hold", truth_paths

    if probe_paths:
        if not probe_ok:
            return "HOLD", "Hold", "hold", truth_paths
        if st == "PASS" and "PASS" in lr_rt.upper():
            return "PASS", "Passed", "passed", truth_paths
        return "HOLD", "Hold", "hold", truth_paths

    if st == "PASS" and "PASS" in lr_rt.upper() and "PASS" in lr_pr.upper():
        return "PASS", "Passed", "passed", truth_paths

    return "HOLD", "Hold", "hold", truth_paths


def _rich_text_payload(text: str, max_len: int = 1800) -> dict[str, Any]:
    s = (text or "")[:max_len]
    return {"rich_text": [{"type": "text", "text": {"content": s}}]}


def _build_notion_properties(
    *,
    page_properties: dict[str, Any],
    pmap: dict[str, str],
    logical_values: dict[str, str],
) -> tuple[dict[str, Any], list[str]]:
    """Notion ページの実 type に合わせて properties オブジェクトを組む。"""
    patch: dict[str, Any] = {}
    updated: list[str] = []
    for logical, raw_val in logical_values.items():
        nk = pmap.get(logical) or pmap.get(logical.lower() if isinstance(logical, str) else logical)
        if not nk or nk not in page_properties:
            continue
        prop = page_properties[nk]
        if not isinstance(prop, dict):
            continue
        typ = str(prop.get("type") or "")
        val = str(raw_val).strip() if raw_val is not None else ""
        if typ == "select":
            if not val:
                continue
            patch[nk] = {"select": {"name": val}}
            updated.append(logical)
        elif typ == "rich_text":
            patch[nk] = _rich_text_payload(val)
            updated.append(logical)
        elif typ == "url":
            if val.startswith(("http://", "https://")):
                patch[nk] = {"url": val}
                updated.append(logical)
            # ローカルパスは URL 型に入れない（ResultSummary に含める）
        elif typ == "date":
            if not val:
                continue
            patch[nk] = {"date": {"start": val[:32]}}
            updated.append(logical)
        elif typ == "title":
            patch[nk] = {"title": [{"type": "text", "text": {"content": val[:1800]}}]}
            updated.append(logical)
    return patch, updated


def run_writeback(
    *,
    auto_dir: Path,
    notion_page_id: str,
    dry_run: bool,
    force_status: str = "",
    force_verdict: str = "",
) -> dict[str, Any]:
    cfg = _read_json(auto_dir / CONFIG_FN)
    version = str(cfg.get("notion_version") or "2022-06-28")
    pmap = cfg.get("property_map")
    if not isinstance(pmap, dict):
        pmap = {}
    pmap_s = {str(k): str(v) for k, v in pmap.items()}
    token = intake_mod._notion_token()

    result: dict[str, Any] = {
        "schema": "TENMON_NOTION_AUTOBUILD_LAST_WRITEBACK_RESULT_V1",
        "card": CARD,
        "at": _utc_iso(),
        "ok": False,
        "verdict": "HOLD",
        "forensic_verdict": "HOLD",
        "truth_source_policy": "vps_runtime_progress_judgement_schedule_probes_evidence_local_paths_only",
        "hold_reason": "",
        "truth_source_paths": [],
        "notion_page_id": "",
        "patch_applied": False,
        "updated_fields": [],
        "missing_property_bindings": [],
        "errors": [],
    }

    pid, pid_src = _resolve_notion_page_id(auto_dir, notion_page_id)
    result["notion_page_id"] = pid
    result["page_id_source"] = pid_src

    if not pid:
        result["hold_reason"] = "notion_page_id_unresolved"
        result["errors"].append(result["hold_reason"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    rt = _read_json(auto_dir / MULTI_RT)
    pr = _read_json(auto_dir / MULTI_PR)
    jd = _read_json(auto_dir / MULTI_JUDGE)
    evidence = str(rt.get("last_evidence_dir") or pr.get("last_orchestra_evidence") or "").strip()
    git_sha = str(pr.get("git_sha") or "").strip() or _git_head_short(_repo_root(auto_dir))
    lr_pr = str(pr.get("last_result") or "")
    jreason = str(jd.get("reason") or "")
    summary_bits = [f"verdict_signal={lr_pr or rt.get('last_result')}", jreason, f"pid_src={pid_src}"]
    result_summary = " | ".join(x for x in summary_bits if x)[:1900]

    probe_ok, probe_why, probe_paths = _truth_pass_from_probes(auto_dir)
    truth_paths = _collect_truth_source_paths(auto_dir, probe_paths)
    result["truth_source_paths"] = truth_paths

    if force_verdict.strip().upper() in ("PASS", "FAIL", "HOLD"):
        fv = force_verdict.strip().upper()
        vmap = {"PASS": ("Passed", "passed"), "FAIL": ("Failed", "failed"), "HOLD": ("Hold", "hold")}
        st_sel, rs_sel = vmap[fv]
        result["hold_reason"] = "forced_verdict_admin"
        core_verdict = fv
    elif force_status.strip():
        st_sel = force_status.strip()
        rs_sel = "pending"
        result["hold_reason"] = "forced_status_admin"
        core_verdict = "HOLD"
    else:
        core_verdict, st_sel, rs_sel, _tp = _derive_verdict_and_summary(auto_dir)
        paths_cfg = _read_json(auto_dir / SCHED_CFG).get("probe_result_paths")
        has_probes = isinstance(paths_cfg, list) and any(str(x).strip() for x in paths_cfg)
        if has_probes and not probe_ok:
            core_verdict = "HOLD"
            st_sel, rs_sel = "Hold", "hold"
            result["hold_reason"] = f"probe_not_pass:{probe_why}"
        else:
            result["hold_reason"] = ""

    if evidence and not evidence.startswith(("http://", "https://")):
        result_summary = (result_summary + f" | evidence_dir={evidence}")[:1900]

    next_action = {
        "PASS": "none",
        "FAIL": "review_failure_bundle_and_forensic",
        "HOLD": "resolve_hold_or_probe_signals",
    }.get(core_verdict, "manual_review")

    logical_values: dict[str, str] = {
        "status": st_sel,
        "run_state": rs_sel,
        "result_summary": result_summary,
        "evidence_path": evidence,
        "head_sha": git_sha,
        "last_run_at": _utc_iso(),
        "next_action": next_action,
    }

    result["writeback_core_verdict"] = core_verdict
    result["forensic_verdict"] = core_verdict

    expected_logical = list(logical_values.keys())
    missing_bind = [k for k in expected_logical if k not in pmap_s]
    result["missing_property_bindings"] = missing_bind
    if missing_bind:
        result["errors"].append(f"property_map_missing:{','.join(missing_bind)}")

    if dry_run:
        result["ok"] = True
        result["verdict"] = "PASS"
        result["updated_fields"] = list(logical_values.keys())
        result["patch_applied"] = False
        result["hold_reason"] = ""
        result["dry_run_payload_preview"] = logical_values
        _write_json(auto_dir / RESULT_FN, result)
        return result

    if not token:
        result["hold_reason"] = "notion_token_missing"
        result["errors"].append(result["hold_reason"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    url_get = f"https://api.notion.com/v1/pages/{pid}"
    code_g, page_data, err_g = intake_mod.notion_request(
        token=token, version=version, method="GET", url=url_get, body=None
    )
    if code_g != 200 or not isinstance(page_data, dict):
        result["hold_reason"] = f"notion_get_page_failed:{code_g}:{err_g}"
        result["errors"].append(result["hold_reason"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    page_props = page_data.get("properties")
    if not isinstance(page_props, dict):
        page_props = {}

    props_body, updated_logical = _build_notion_properties(
        page_properties=page_props,
        pmap=pmap_s,
        logical_values=logical_values,
    )
    notion_missing = [k for k in expected_logical if k in pmap_s and k not in updated_logical]
    result["notion_page_missing_or_type_mismatch"] = notion_missing

    if not props_body:
        result["hold_reason"] = "no_matching_properties_to_patch"
        result["errors"].append(result["hold_reason"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    url_patch = f"https://api.notion.com/v1/pages/{pid}"
    body = {"properties": props_body}
    code, data, err = intake_mod.notion_request(
        token=token, version=version, method="PATCH", url=url_patch, body=body
    )
    if code != 200 or not isinstance(data, dict):
        result["hold_reason"] = f"notion_patch_failed:{code}:{err}"
        result["errors"].append(result["hold_reason"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    result["ok"] = True
    result["verdict"] = "PASS"
    result["patch_applied"] = True
    result["updated_fields"] = updated_logical
    result["hold_reason"] = ""
    _write_json(auto_dir / RESULT_FN, result)
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument(
        "--notion-page-id",
        type=str,
        default="",
        help="省略時は環境変数 TENMON_NOTION_WRITEBACK_PAGE_ID または intake/progress から推定",
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force-status", type=str, default="", help="危険: Status のみ強制（select 名をそのまま）")
    ap.add_argument(
        "--force-verdict",
        type=str,
        default="",
        help="危険: PASS|FAIL|HOLD を強制し Status/RunState を同期",
    )
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else _AUTO
    out = run_writeback(
        auto_dir=auto_dir,
        notion_page_id=str(args.notion_page_id or ""),
        dry_run=bool(args.dry_run),
        force_status=str(args.force_status or ""),
        force_verdict=str(args.force_verdict or ""),
    )
    print(
        json.dumps(
            {
                "ok": out.get("ok"),
                "verdict": out.get("verdict"),
                "forensic_verdict": out.get("forensic_verdict"),
                "hold_reason": out.get("hold_reason"),
                "patch_applied": out.get("patch_applied"),
                "updated_fields": out.get("updated_fields"),
                "truth_source_paths": out.get("truth_source_paths"),
            },
            ensure_ascii=False,
        )
    )
    sys.exit(0 if out.get("ok") else 2)


if __name__ == "__main__":
    main()
