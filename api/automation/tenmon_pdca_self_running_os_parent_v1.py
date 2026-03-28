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
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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


def _pick_primary_blocker(blocked: list[str], sf: dict[str, Any]) -> str | None:
    if blocked:
        return blocked[0]
    if not sf.get("next_card_allowed", False):
        return "next_card_not_allowed"
    if sf.get("manual_review_recommended"):
        return "manual_review_recommended"
    return None


def _classify_risk(card: str | None, policy: dict[str, Any]) -> tuple[str, str]:
    if not card:
        return "unknown", "no_next_card"
    c = card
    pr = policy.get("pass_route_protection") or {}
    for sub in pr.get("card_id_substrings_force_high") or []:
        if sub and sub in c:
            return "high_risk", f"pass_route_card_substring:{sub}"
    # 作業ツリーのパスは「そのカードが触る対象」と一致しないことが多いため、
    # リスク層はカード名のみで判定（PASS route は card 名ヒントで high に寄せる）。

    tiers = policy.get("risk_tiers") or {}
    for tier in ("high_risk", "medium_risk", "low_risk"):
        block = tiers.get(tier) or {}
        for pat in block.get("card_id_regex") or []:
            try:
                if re.search(pat, c):
                    return tier, f"regex:{pat[:48]}"
            except re.error:
                continue
    return "medium_risk", "unclassified_default_medium"


def _whitelist_action(
    policy: dict[str, Any],
    blocker: str | None,
    card: str | None,
    risk: str,
) -> dict[str, Any] | None:
    if risk != "low_risk" or not card:
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

    inner = policy.get("inner_cards") or []

    primary_blocker = _pick_primary_blocker(blocked, sf)
    if stop_reasons and not primary_blocker:
        primary_blocker = stop_reasons[0]

    risk_level, risk_reason = _classify_risk(recommended, policy)
    if any(x.startswith("pass_route") for x in risk_reason.split(":")):
        pass  # already high
    elif risk_level == "low_risk" and recommended and (
        "_PARENT_" in recommended
        or re.search(
            r"(WORLDCLASS|DEEPREAD|NAS|AUTOBUILD)_.*PARENT|PARENT_.*(WORLDCLASS|DEEPREAD|NAS)",
            recommended,
        )
    ):
        risk_level = "high_risk"
        risk_reason = "parent_or_wide_scope_card_forced_high"

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
        "next_recommended_card": recommended or policy.get("next_on_pass_card"),
        "risk_level": risk_level,
        "risk_reason": risk_reason,
        "auto_apply_allowed": auto_apply_allowed,
        "auto_apply_executed": bool(do_log.get("executed")),
        "build_green": build_ok2,
        "queue_open": bool(sf.get("next_card_allowed", False)) and not (sf.get("blocked_reason") or []),
        "route_probe_ok_count": probe_ok_n2,
        "manual_review_required": risk_level != "low_risk" or bool(stop_reasons),
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

    summary = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "cycle_id": cycle_id,
        "check_pass": check_pass,
        "risk_level": risk_level,
        "recommended_next_card": recommended,
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
        f"- **next_recommended_card**: `{recommended}`",
        f"- **policy next_on_pass hint**: `{policy.get('next_on_pass_card')}`",
        "",
        "## リスク・自動適用",
        "",
        f"- **risk_level**: `{risk_level}`",
        f"- **risk_reason**: {risk_reason}",
        f"- **auto_apply_allowed**: `{auto_apply_allowed}`",
        f"- **low_risk DO executed**: `{bool(do_log.get('executed'))}`",
        "",
        "### PASS route 非再編集ポリシー",
        "",
        "- `pass_route_protection.card_id_substrings_force_high` に一致する **カード名** は **high_risk**（自動適用禁止）。",
        "- `path_substrings_force_high` は人間レビュー用。親OSは git 作業ツリーだけでは high に昇格させない。",
        "- カード名が `risk_tiers.high_risk` の正規表現に一致すれば **high_risk**（例: `RESPONSE_COMPOSER`, `CHAT.TS` 系）。",
        "",
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
    ]
    report_md = "\n".join(report_lines) + "\n"

    if not args.dry_run:
        _write_json(auto / STATE_OUT, state)
        (auto / REPORT_OUT).write_text(report_md, encoding="utf-8")
        _write_json(auto / RUN_SUMMARY_OUT, summary)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if build_ok2 else 1


if __name__ == "__main__":
    raise SystemExit(main())
