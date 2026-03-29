#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_PDCA_SELF_RUNNING_OS_PARENT_CURSOR_AUTO_V1

観測→1 blocker→次カード1枚→リスク判定→(任意)low-risk のみ自動適用→検証→state/report 更新。
fail-closed・PASS route / 会話中枢は保護。無制限連鎖はしない。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CURSOR_ORCHESTRATION_ROLES_V1: dict[str, str] = {
    "gpt_ai": "next_card_reasoning_patch_plan_generation",
    "browser": "external_ui_observe_and_submit_execution_result_only",
    "cursor": "code_apply_file_edits_single_card",
    "vps": "build_check_audit_probe",
    "pdca_parent": "flow_control_next_card_only_after_result_ingested",
}


def _parse_iso_ms_v1(iso_s: str) -> int | None:
    s = str(iso_s or "").strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        d = datetime.fromisoformat(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return int(d.timestamp() * 1000)
    except Exception:
        return None


def _cursor_remote_queue_snapshot_v1(auto: Path) -> dict[str, Any]:
    """remote_cursor_queue: delivered + 有効リース（またはリース欠落）→ GET next はブロック（API と整合）。"""
    rq = auto / "remote_cursor_queue.json"
    out: dict[str, Any] = {
        "schema": "TENMON_CURSOR_ORCHESTRATION_SNAPSHOT_V1",
        "queue_path": str(rq),
        "active_delivered_ids": [],
        "blocks_next_command": False,
        "roles": dict(CURSOR_ORCHESTRATION_ROLES_V1),
        "execution_contract_schema": "TENMON_CURSOR_EXECUTION_CONTRACT_V1",
    }
    if not rq.is_file():
        return out
    try:
        data = json.loads(rq.read_text(encoding="utf-8"))
    except Exception:
        return out
    items = data.get("items")
    if not isinstance(items, list):
        return out
    now_ms = int(time.time() * 1000)
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") != "delivered":
            continue
        qid = str(it.get("id") or "").strip()
        if not qid:
            qid = "(no_id)"
        lu = str(it.get("leased_until") or "").strip()
        if not lu:
            out["blocks_next_command"] = True
            out["active_delivered_ids"].append(qid)
            continue
        lease_ms = _parse_iso_ms_v1(lu)
        if lease_ms is None or lease_ms > now_ms:
            out["blocks_next_command"] = True
            out["active_delivered_ids"].append(qid)
    return out

CARD = "TENMON_PDCA_SELF_RUNNING_OS_PARENT_CURSOR_AUTO_V1"
STATE_OUT = "tenmon_pdca_cycle_state_v1.json"
REPORT_OUT = "tenmon_pdca_cycle_report_v1.md"
RUN_SUMMARY_OUT = "tenmon_pdca_self_running_os_parent_v1.json"
POLICY_FILE = "tenmon_pdca_risk_policy_v1.json"
QUEUE_SCRIPT = "tenmon_cursor_single_flight_queue_v1.py"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _run(cmd: list[str], cwd: Path, timeout: int = 600) -> tuple[int, str, str]:
    try:
        r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout or "", r.stderr or ""
    except Exception as e:
        return 99, "", str(e)


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    rc, out, err = _run(["npm", "run", "check"], cwd=api_dir, timeout=900)
    blob = (out + "\n" + err).strip()
    return rc == 0, blob[-8000:] if len(blob) > 8000 else blob


def _refresh_queue_state(repo: Path, auto: Path) -> tuple[bool, str]:
    script = auto / QUEUE_SCRIPT
    if not script.is_file():
        return False, "missing_queue_script"
    rc, out, err = _run([sys.executable, str(script)], cwd=str(repo), timeout=300)
    return rc == 0, (out + err)[:2000]


def _audit_probe(base_url: str | None, timeout: float = 3.0) -> dict[str, Any]:
    out: dict[str, Any] = {"skipped": True, "ok": None, "http_code": None, "error": None}
    if not base_url:
        return out
    url = base_url.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            body = resp.read(4000).decode("utf-8", errors="replace")
        try:
            j = json.loads(body)
            ok = bool(j.get("ok"))
        except Exception:
            ok = 200 <= code < 300
        out = {"skipped": False, "ok": ok, "http_code": code, "error": None, "url": url}
    except urllib.error.HTTPError as e:
        out = {"skipped": False, "ok": False, "http_code": e.code, "error": str(e), "url": url}
    except Exception as e:
        out = {"skipped": False, "ok": False, "http_code": None, "error": str(e), "url": url}
    return out


def _route_probe_ok_count(auto: Path) -> tuple[int, list[str]]:
    """read-only: 代表 probe JSON の疎な健全性カウント。"""
    paths = [
        auto / "conversation_quality_safe_probe_pack_v1.json",
        auto / "tenmon_surface_leak_cleanup_result_v1.json",
    ]
    notes: list[str] = []
    ok = 0
    for p in paths:
        if not p.is_file():
            notes.append(f"missing:{p.name}")
            continue
        d = _read_json(p)
        if d.get("npm_run_check") == "PASS":
            ok += 1
            notes.append(f"ok:{p.name}")
        elif d.get("schema") and "PROBE" in str(d.get("schema", "")).upper():
            ok += 1
            notes.append(f"ok_schema:{p.name}")
        else:
            notes.append(f"present:{p.name}")
    return ok, notes


def _git_diff_stat_tail_v1(repo: Path, max_lines: int = 48) -> str:
    rc, out, err = _run(["git", "diff", "--stat", "HEAD"], cwd=repo, timeout=90)
    blob = (out or "") + ("\n" + err if err else "")
    lines = [x for x in blob.strip().splitlines() if x.strip()]
    if not lines:
        return ""
    return "\n".join(lines[-max_lines:])


def _journal_tail_v1() -> str | None:
    unit = os.environ.get("TENMON_JOURNAL_UNIT", "").strip()
    if not unit:
        return None
    rc, out, _err = _run(
        ["journalctl", "-u", unit, "-n", "32", "--no-pager"],
        cwd=Path("/"),
        timeout=20,
    )
    if rc != 0:
        return None
    t = (out or "").strip()
    return t[-8000:] if len(t) > 8000 else t


def _last_remote_result_payload_v1(auto: Path) -> dict[str, Any] | None:
    p = auto / "remote_cursor_result_bundle.json"
    if not p.is_file():
        return None
    try:
        b = json.loads(p.read_text(encoding="utf-8"))
        ent = b.get("entries")
        if not isinstance(ent, list) or not ent:
            return None
        last = ent[-1]
        return last if isinstance(last, dict) else None
    except Exception:
        return None


def _probe_regression_hints_v1(auto: Path) -> dict[str, bool]:
    hints = {
        "surface_regression": False,
        "support_regression": False,
        "founder_regression": False,
        "uncertainty_regression": False,
    }
    pr = _read_json(auto / "tenmon_conversation_acceptance_probe_relock_result_v1.json")
    if not pr:
        return hints
    if pr.get("acceptance_pass") is False:
        hints["surface_regression"] = True
    um = pr.get("ux_metrics")
    if isinstance(um, dict):
        try:
            if float(um.get("support_operability") or 1.0) + 1e-9 < 0.9:
                hints["support_regression"] = True
        except (TypeError, ValueError):
            pass
        try:
            if float(um.get("founder_operability") or 1.0) + 1e-9 < 0.8:
                hints["founder_regression"] = True
        except (TypeError, ValueError):
            pass
        try:
            if float(um.get("uncertainty_maturity") or 1.0) + 1e-9 < 0.7:
                hints["uncertainty_regression"] = True
        except (TypeError, ValueError):
            pass
        try:
            cap = int(um.get("surface_leak_probe_cap") or 0)
            cnt = int(um.get("surface_leak_probe_count") or 0)
            if cap > 0 and cnt > cap:
                hints["surface_regression"] = True
        except (TypeError, ValueError):
            pass
    return hints


def _dedupe_str_list(xs: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _classify_failures_v1(
    stop_reasons: list[str],
    build_ok: bool,
    build_ok2: bool,
    audit: dict[str, Any],
    blocked: list[str],
    n_changed: int,
    max_changed: int,
    q_refresh_ok: bool,
    build_log_tail: str,
    probe_hints: dict[str, bool],
    ac: dict[str, Any],
) -> tuple[str, list[str]]:
    classes: list[str] = []
    tail = build_log_tail or ""

    for fl in stop_reasons:
        if fl == "npm_run_check_failed":
            classes.append("build_fail")
            if re.search(r"error\s+TS\d+", tail, re.I):
                classes.append("syntax_or_parser_fail")
        elif fl == "audit_not_ready":
            classes.append("audit_fail")
        elif fl == "queue_blocked_reason_non_empty":
            classes.append("queue_block")
        elif fl.startswith("changed_files>"):
            classes.append("artifact_pressure")
        elif fl == "queue_script_refresh_failed":
            classes.append("queue_block")
            classes.append("syntax_or_parser_fail")
        elif fl == "acceptance_probe_fail_closed":
            classes.append("surface_regression")

    if not build_ok or not build_ok2:
        if "build_fail" not in classes:
            classes.append("build_fail")
        if re.search(r"error\s+TS\d+", tail, re.I) and "syntax_or_parser_fail" not in classes:
            classes.append("syntax_or_parser_fail")

    if blocked and "queue_block" not in classes:
        classes.append("queue_block")

    if not audit.get("skipped") and audit.get("ok") is False and "audit_fail" not in classes:
        classes.append("audit_fail")

    if n_changed > max_changed and "artifact_pressure" not in classes:
        classes.append("artifact_pressure")

    if not q_refresh_ok and "queue_block" not in classes:
        classes.append("queue_block")

    stale = ac.get("autocompact_stale") is True or ac.get("stale") is True
    if stale and "artifact_pressure" not in classes:
        classes.append("artifact_pressure")

    if probe_hints.get("surface_regression"):
        classes.append("surface_regression")
    if probe_hints.get("support_regression"):
        classes.append("support_regression")
    if probe_hints.get("founder_regression"):
        classes.append("founder_regression")
    if probe_hints.get("uncertainty_regression"):
        classes.append("uncertainty_regression")

    ordered = _dedupe_str_list(classes)
    primary = ordered[0] if ordered else "none"
    return primary, ordered


def _pick_primary_blocker(blocked: list[str], sf: dict[str, Any]) -> str | None:
    if blocked:
        return blocked[0]
    if not sf.get("next_card_allowed", False):
        return "next_card_not_allowed"
    if sf.get("manual_review_recommended"):
        return "manual_review_recommended"
    return None


def _canonical_risk_tier(internal: str, policy: dict[str, Any]) -> str:
    ab = policy.get("approval_boundary_v1") or {}
    alias = ab.get("tier_alias") or {}
    if internal in alias:
        return str(alias[internal])
    if internal == "unknown":
        return "unknown"
    return internal.removesuffix("_risk") if internal.endswith("_risk") else internal


def _classify_risk(card: str | None, policy: dict[str, Any]) -> tuple[str, str]:
    if not card:
        return "unknown", "no_next_card"
    c = card
    tiers = policy.get("risk_tiers") or {}
    forb = tiers.get("forbidden") or {}
    for pat in forb.get("card_id_regex") or []:
        try:
            if re.search(str(pat), c):
                return "forbidden_risk", f"forbidden_regex:{str(pat)[:48]}"
        except re.error:
            continue

    pr = policy.get("pass_route_protection") or {}
    for sub in pr.get("card_id_substrings_force_high") or []:
        if sub and sub in c:
            return "high_risk", f"pass_route_card_substring:{sub}"
    # 作業ツリーのパスは「そのカードが触る対象」と一致しないことが多いため、
    # リスク層はカード名のみで判定（PASS route は card 名ヒントで high に寄せる）。

    for tier in ("high_risk", "medium_risk", "low_risk"):
        block = tiers.get(tier) or {}
        for pat in block.get("card_id_regex") or []:
            try:
                if re.search(str(pat), c):
                    return tier, f"regex:{str(pat)[:48]}"
            except re.error:
                continue
    return "medium_risk", "unclassified_default_medium"


def _whitelist_action(
    policy: dict[str, Any],
    blocker: str | None,
    card: str | None,
    risk: str,
) -> dict[str, Any] | None:
    if risk not in ("low_risk",) or not card:
        return None
    for ent in policy.get("auto_apply_whitelist") or []:
        if not isinstance(ent, dict):
            continue
        subs = ent.get("when_blocker_substrings") or []
        if subs and not any(s in (blocker or "") for s in subs):
            continue
        cre = ent.get("card_must_match_regex")
        if cre:
            try:
                if not re.search(str(cre), card):
                    continue
            except re.error:
                continue
        return ent
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--dry-run", action="store_true", help="state/report を書かない")
    ap.add_argument(
        "--apply-low-risk",
        action="store_true",
        help="ポリシー whitelist かつゲート通過時のみ 1 コマンド実行（既定は観測のみ）",
    )
    ap.add_argument("--audit-base-url", type=str, default=None, help="例: http://127.0.0.1:3000")
    args = ap.parse_args()

    repo = (args.repo_root or Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))).resolve()
    api = repo / "api"
    auto = api / "automation"
    api_dir = api

    policy_path = auto / POLICY_FILE
    policy = _read_json(policy_path)
    th = (policy.get("thresholds") or {}).get("max_changed_files_stop", 120)
    max_changed = int(th) if th else 120

    # PLAN: refresh queue observation
    q_refresh_ok, q_refresh_note = _refresh_queue_state(repo, auto)
    sf = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    ac = _read_json(auto / "tenmon_cursor_worktree_autocompact_summary.json")
    probe_hints = _probe_regression_hints_v1(auto)
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")

    build_ok, build_log = _npm_check(api_dir)
    probe_ok_n, probe_notes = _route_probe_ok_count(auto)

    audit_url = args.audit_base_url or os.environ.get("TENMON_AUDIT_BASE_URL")
    if not audit_url and isinstance(forensic.get("forensic_api_base"), str):
        audit_url = str(forensic["forensic_api_base"]).strip() or None
    audit = _audit_probe(audit_url)

    paths: list[str] = []
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode == 0:
            for line in (r.stdout or "").splitlines():
                if len(line) < 3:
                    continue
                path = line[3:].strip()
                if " -> " in path:
                    path = path.split(" -> ", 1)[-1].strip()
                if path:
                    paths.append(path.replace("\\", "/"))
    except Exception:
        pass

    n_changed = len(paths)
    blocked = [str(x) for x in (sf.get("blocked_reason") or []) if str(x).strip()]
    current_card = sf.get("current_card")
    next_allowed = bool(sf.get("next_card_allowed", False))
    recommended = sf.get("next_card")
    if isinstance(recommended, str):
        recommended = recommended.strip() or None
    else:
        recommended = None

    stop_reasons: list[str] = []
    sc_pol = policy.get("stop_conditions_v1") or {}
    if sc_pol.get("evaluate", True) and sc_pol.get("treat_manual_review_recommended_as_stop", True):
        if sf.get("manual_review_required") or sf.get("manual_review_recommended"):
            stop_reasons.append("manual_review_flag_true")
    if n_changed > max_changed:
        stop_reasons.append(f"changed_files>{max_changed}")
    if blocked:
        stop_reasons.append("queue_blocked_reason_non_empty")
    if current_card is not None and str(current_card).strip():
        stop_reasons.append("single_flight_current_card_set")
    if not q_refresh_ok:
        stop_reasons.append("queue_script_refresh_failed")
    if not build_ok:
        stop_reasons.append("npm_run_check_failed")
    if not audit.get("skipped") and audit.get("ok") is False:
        stop_reasons.append("audit_not_ready")

    accept_probe = _read_json(auto / "tenmon_conversation_acceptance_probe_relock_result_v1.json")
    accept_pass = accept_probe.get("acceptance_pass") if accept_probe else None
    if accept_probe and accept_probe.get("acceptance_pass") is False:
        stop_reasons.append("acceptance_probe_fail_closed")

    inner = policy.get("inner_cards") or []

    primary_blocker = _pick_primary_blocker(blocked, sf)
    if stop_reasons and not primary_blocker:
        primary_blocker = stop_reasons[0]

    risk_level, risk_reason = _classify_risk(recommended, policy)
    if any(x.startswith("pass_route") for x in risk_reason.split(":")):
        pass  # already high
    elif risk_level == "forbidden_risk":
        pass
    elif risk_level == "low_risk" and recommended and (
        "_PARENT_" in recommended
        or re.search(
            r"(WORLDCLASS|DEEPREAD|NAS|AUTOBUILD)_.*PARENT|PARENT_.*(WORLDCLASS|DEEPREAD|NAS)",
            recommended,
        )
    ):
        risk_level = "high_risk"
        risk_reason = "parent_or_wide_scope_card_forced_high"

    risk_tier_canonical = _canonical_risk_tier(risk_level, policy)

    auto_apply_allowed = (
        next_allowed
        and not current_card
        and not blocked
        and n_changed <= max_changed
        and build_ok
        and risk_level == "low_risk"
        and (audit.get("skipped") or audit.get("ok") is True)
    )
    if stop_reasons:
        auto_apply_allowed = False

    evidence_bundle: dict[str, Any] = {
        "generated_at": _utc_iso(),
        "queue_refresh_ok": q_refresh_ok,
        "queue_refresh_note": q_refresh_note[:1500] if q_refresh_note else None,
        "single_flight_state_path": str(auto / "tenmon_cursor_single_flight_queue_state.json"),
        "next_card_allowed": next_allowed,
        "blocked_reason": blocked,
        "current_card": current_card,
        "next_card_from_queue": recommended,
        "changed_file_count": n_changed,
        "autocompact_generated_at": ac.get("generated_at"),
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_log[-4000:] if build_log else "",
        "route_probe_ok_count": probe_ok_n,
        "route_probe_notes": probe_notes,
        "audit": audit,
        "forensic_generated_at": forensic.get("generated_at"),
        "stop_reasons": stop_reasons,
        "approval_boundary_v1": {
            "risk_tier_canonical": risk_tier_canonical,
            "risk_level_internal": risk_level,
            "policy_file": POLICY_FILE,
            "stop_conditions_policy": (policy.get("stop_conditions_v1") or {}).get("conditions"),
        },
        "approval_required_operations_v1": policy.get("approval_required_operations_v1"),
        "auto_apply_whitelist_categories_v1": policy.get("auto_apply_whitelist_categories_v1"),
        "cursor_orchestration_v1": {
            "roles": dict(CURSOR_ORCHESTRATION_ROLES_V1),
            "remote_cursor_queue": _cursor_remote_queue_snapshot_v1(auto),
            "execution_contract_schema": "TENMON_CURSOR_EXECUTION_CONTRACT_V1",
            "note": "Cursor/browser 経路: result 受理後にのみ次 command（single-flight）。VPS 上 PDCA は別キューと併記。",
        },
    }

    do_log: dict[str, Any] = {"executed": False, "command": None, "returncode": None}
    if args.apply_low_risk and auto_apply_allowed:
        act = _whitelist_action(policy, primary_blocker, recommended, risk_level)
        if act:
            argv = [str(x) for x in (act.get("argv") or [])]
            cwd = repo if act.get("cwd") == "repo_root" else repo
            if argv:
                rc, out, err = _run(argv, cwd=cwd, timeout=600)
                do_log = {
                    "executed": True,
                    "command": argv,
                    "returncode": rc,
                    "stdout_tail": out[-3000:],
                    "stderr_tail": err[-2000:],
                }
                evidence_bundle["low_risk_apply"] = do_log
                if rc == 0:
                    _refresh_queue_state(repo, auto)
                    sf = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
                    ac = _read_json(auto / "tenmon_cursor_worktree_autocompact_summary.json")

    # CHECK (post-DO)
    build_ok2, build_log2 = _npm_check(api_dir)
    probe_ok_n2, probe_notes2 = _route_probe_ok_count(auto)
    audit_ok = audit.get("skipped") or audit.get("ok") is True
    check_pass = bool(build_ok2 and audit_ok and q_refresh_ok)

    failure_primary, failure_all = _classify_failures_v1(
        stop_reasons,
        build_ok,
        build_ok2,
        audit,
        blocked,
        n_changed,
        max_changed,
        q_refresh_ok,
        build_log2,
        probe_hints,
        ac,
    )

    advance_blocked = (
        not check_pass
        or not build_ok2
        or bool(blocked)
        or not q_refresh_ok
        or (not audit.get("skipped") and audit.get("ok") is False)
    )
    if accept_pass is False:
        advance_blocked = True
        if "surface_regression" not in failure_all:
            failure_all = _dedupe_str_list(failure_all + ["surface_regression"])
            failure_primary = failure_all[0] if failure_all else failure_primary

    fc_pol = policy.get("fail_closed_recovery_policy_v1") or {}
    retry_single = (
        str(policy.get("fail_closed_retry_card_v1") or "").strip()
        or str(policy.get("retry_card_if_fail") or "").strip()
        or "TENMON_FAIL_CLOSED_RECOVERY_AND_RETRY_POLICY_RETRY_CURSOR_AUTO_V1"
    )
    next_card_effective = retry_single if advance_blocked else (recommended or policy.get("next_on_pass_card"))

    git_stat = _git_diff_stat_tail_v1(repo) if advance_blocked else ""
    journal_tail = _journal_tail_v1() if advance_blocked else None
    result_payload = _last_remote_result_payload_v1(auto) if advance_blocked else None

    fail_closed_recovery_v1: dict[str, Any] = {
        "schema": "TENMON_FAIL_CLOSED_RECOVERY_V1",
        "card": "TENMON_FAIL_CLOSED_RECOVERY_AND_RETRY_POLICY_CURSOR_AUTO_V1",
        "recovery_sequence": fc_pol.get("recovery_sequence")
        or [
            "stop",
            "evidence_collect",
            "failure_classify",
            "retry_card_generate",
            "approval_required",
            "low_risk_retry_only",
        ],
        "failure_class_primary": failure_primary,
        "failure_classes_all": failure_all,
        "advance_next_card_blocked": advance_blocked,
        "retry_card_single": retry_single if advance_blocked else None,
        "approval_required_for_recovery": advance_blocked,
        "note": "証拠束→単一 retry カードのみ。勝手に次キューへ進めない。rollback 乱用禁止。low-risk whitelist のみ再自動適用。",
        "evidence": {
            "audit": audit,
            "queue_refresh_ok": q_refresh_ok,
            "single_flight_current_card": current_card,
            "blocked_reason": blocked,
            "git_diff_stat_tail": git_stat,
            "npm_check_tail_after": (build_log2[-6000:] if build_log2 else "") if advance_blocked else "",
            "route_probe_ok_count_after": probe_ok_n2,
            "route_probe_notes_after": probe_notes2,
            "journal_tail": journal_tail,
            "last_remote_result_payload": result_payload,
            "probe_regression_hints": probe_hints,
            "acceptance_probe_pass": accept_pass,
        },
        "next_on_pass_hint": fc_pol.get("next_on_pass"),
        "next_on_fail_hint": fc_pol.get("next_on_fail"),
    }
    evidence_bundle["fail_closed_recovery_v1"] = fail_closed_recovery_v1
    evidence_bundle["failure_class_primary"] = failure_primary
    evidence_bundle["failure_classes_all"] = failure_all

    cycle_id = f"pdca_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"

    state: dict[str, Any] = {
        "schema": "TENMON_PDCA_CYCLE_STATE_V1",
        "card": CARD,
        "cycle_id": cycle_id,
        "started_at": evidence_bundle["generated_at"],
        "updated_at": _utc_iso(),
        "current_stage": "CHECK_PASS" if check_pass else "CHECK_FAIL",
        "inner_cards": inner,
        "last_successful_card": CARD if check_pass and do_log.get("executed") else None,
        "last_failed_card": None,
        "last_blocker": primary_blocker,
        "next_recommended_card": next_card_effective,
        "failure_class_primary": failure_primary,
        "failure_classes_all": failure_all,
        "advance_next_card_blocked": advance_blocked,
        "retry_card_single": retry_single if advance_blocked else None,
        "risk_level": risk_level,
        "risk_tier_canonical": risk_tier_canonical,
        "risk_reason": risk_reason,
        "auto_apply_allowed": auto_apply_allowed,
        "auto_apply_executed": bool(do_log.get("executed")),
        "build_green": build_ok2,
        "queue_open": bool(sf.get("next_card_allowed", False)) and not (sf.get("blocked_reason") or []),
        "route_probe_ok_count": probe_ok_n2,
        "manual_review_required": advance_blocked
        or risk_level in ("high_risk", "medium_risk", "forbidden_risk", "unknown")
        or bool(stop_reasons),
        "check_pass": check_pass,
        "retry_card_if_fail": policy.get("retry_card_if_fail"),
        "next_on_pass": policy.get("next_on_pass_card"),
        "evidence_bundle": evidence_bundle,
        "check_tail": {
            "npm_after_do": build_log2[-4000:] if build_log2 else "",
            "route_probe_notes_after": probe_notes2,
        },
    }

    if not check_pass:
        state["last_failed_card"] = CARD

    if not args.dry_run and advance_blocked:
        _write_json(auto / "tenmon_fail_closed_recovery_evidence_v1.json", fail_closed_recovery_v1)

    summary = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "cycle_id": cycle_id,
        "check_pass": check_pass,
        "risk_level": risk_level,
        "risk_tier_canonical": risk_tier_canonical,
        "recommended_next_card": next_card_effective,
        "advance_next_card_blocked": advance_blocked,
        "failure_class_primary": failure_primary,
        "retry_card_single": retry_single if advance_blocked else None,
        "auto_apply_allowed": auto_apply_allowed,
        "do_executed": bool(do_log.get("executed")),
    }

    report_lines = [
        f"# TENMON_PDCA_CYCLE_REPORT_V1",
        "",
        f"- **generated_at**: `{_utc_iso()}`",
        f"- **cycle_id**: `{cycle_id}`",
        f"- **current_stage**: `{state['current_stage']}`",
        "",
        "## 停止・ゲート",
        "",
        f"- **next_card_allowed** (queue): `{next_allowed}`",
        f"- **blocked_reason**: `{json.dumps(blocked, ensure_ascii=False)}`",
        f"- **current_card** (single-flight): `{current_card}`",
        f"- **changed_file_count**: {n_changed} (stop if > {max_changed})",
        f"- **npm run check**: {'PASS' if build_ok2 else 'FAIL'}",
        f"- **audit** (optional): `{json.dumps(audit, ensure_ascii=False)}`",
        f"- **stop_reasons**: `{stop_reasons}`",
        "",
        "## Blocker（1 本に絞った主因）",
        "",
        f"- **primary_blocker**: `{primary_blocker}`",
        "",
        "## 次の 1 枚（queue 観測）",
        "",
        f"- **next_recommended_card**（実効・fail-closed）: `{next_card_effective}`",
        f"- **queue raw next_card**: `{recommended}`",
        f"- **advance_next_card_blocked**: `{advance_blocked}`",
        f"- **failure_class_primary**: `{failure_primary}`",
        f"- **failure_classes_all**: `{failure_all}`",
        f"- **retry_card_single**（抑制時のみ）: `{retry_single if advance_blocked else None}`",
        f"- **policy next_on_pass hint**: `{policy.get('next_on_pass_card')}`",
        "",
        "## Fail-closed recovery（P9）",
        "",
        f"- **recovery_sequence**: `{json.dumps((fail_closed_recovery_v1.get('recovery_sequence') or []), ensure_ascii=False)}`",
        f"- **approval_required_for_recovery**: `{advance_blocked}`",
        f"- **evidence artifact**: `tenmon_fail_closed_recovery_evidence_v1.json`（抑制時のみ出力）",
        "",
        "",
        "## リスク・自動適用",
        "",
        f"- **risk_level**: `{risk_level}`",
        f"- **risk_reason**: {risk_reason}",
        f"- **auto_apply_allowed**: `{auto_apply_allowed}`",
        f"- **low_risk DO executed**: `{bool(do_log.get('executed'))}`",
        f"- **risk_tier_canonical**: `{risk_tier_canonical}`",
        "",
        "## Approval boundary（機械可読・要約）",
        "",
        f"- **risk_tiers_canonical**: `{(policy.get('approval_boundary_v1') or {}).get('risk_tiers_canonical')}`",
        f"- **stop_conditions_v1**（ポリシー列挙）: `{json.dumps((policy.get('stop_conditions_v1') or {}).get('conditions'), ensure_ascii=False)}`",
        "",
        "### auto_apply 許可カテゴリ（方針・実 argv は auto_apply_whitelist）",
        "",
    ]
    for ent in policy.get("auto_apply_whitelist_categories_v1") or []:
        if isinstance(ent, dict):
            report_lines.append(f"- `{ent.get('id')}`: {ent.get('summary', '')}")
    report_lines.extend(
        [
            "",
            "### approval 必須（service/deploy/restart/commit / 主線広域はここ）",
            "",
        ],
    )
    for ent in policy.get("approval_required_operations_v1") or []:
        if isinstance(ent, dict):
            report_lines.append(f"- `{ent.get('id')}`: {ent.get('summary', '')}")
    report_lines.extend(
        [
            "",
            "### PASS route / forbidden ティア",
            "",
            "- `risk_tiers.forbidden` の **カード名** 正規表現一致 → **forbidden_risk**（自動実行禁止・approval のみ）。",
            "- `pass_route_protection.card_id_substrings_force_high` に一致する **カード名** は **high_risk**（自動適用禁止）。",
            "- `path_substrings_force_high` は人間レビュー用。親OSは git 作業ツリーだけでは high に昇格させない。",
            "- カード名が `risk_tiers.high_risk` の正規表現に一致すれば **high_risk**（例: `RESPONSE_COMPOSER`, `CHAT.TS` 系）。",
            "",
        ],
    )
    report_lines.extend(
        [
            "## CHECK（build / queue / probe）",
            "",
            f"- **build_green**: `{build_ok2}`",
            f"- **queue_open**: `{state['queue_open']}`",
            f"- **route_probe_ok_count**（代表 JSON）: `{probe_ok_n2}`",
            f"- **check_pass（総合）**: `{check_pass}`",
            "",
            "## 内包カード（親OS）",
            "",
            "\n".join(f"- `{c}`" for c in inner) if inner else "- (none)",
            "",
            "## Retry",
            "",
            f"- **retry_card_if_fail**: `{policy.get('retry_card_if_fail')}`",
            "",
        ],
    )
    report_md = "\n".join(report_lines) + "\n"

    if not args.dry_run:
        _write_json(auto / STATE_OUT, state)
        (auto / REPORT_OUT).write_text(report_md, encoding="utf-8")
        _write_json(auto / RUN_SUMMARY_OUT, summary)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if build_ok2 else 1


if __name__ == "__main__":
    raise SystemExit(main())
