#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_QUALITY_AUTOFIX_LANE_V1_CURSOR_AUTO_V1

会話品質専用の細い lane: probe v2 → regression ledger → 失敗分類 → low-risk patch plan（生成のみ）
→ 任意で api build / audit 取得 → 再 probe。自動編集は行わない（broad rewrite / 正典改変禁止）。

FAIL 時は evidence bundle を同ディレクトリに採取。systemd / journal はベストエフォート（失敗しても継続）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

CARD = "TENMON_CONVERSATION_QUALITY_LANE_V1"
LANE_VERSION = 1
NEXT_CARD = "TENMON_CONVERSATION_QUALITY_AUTOFIX_FIRST_LOOP_CURSOR_AUTO_V1"
STATE_LOG = "lane_invocations.jsonl"

_AUTOMATION = Path(__file__).resolve().parent
_API_ROOT = _AUTOMATION.parent
_REPO_ROOT = _API_ROOT.parent

if str(_AUTOMATION) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION))

from tenmon_conversation_acceptance_probe_v2 import (  # noqa: E402
    build_full_report,
    resolve_probe_base_url,
)
from tenmon_conversation_regression_ledger_v1 import (  # noqa: E402
    _ledger_path,
    append_report_to_ledger,
)
from tenmon_conversation_low_risk_patch_policy_v1 import (  # noqa: E402
    apply_policy_to_classification,
    load_policy,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _safe_seg(s: str) -> str:
    x = re.sub(r"[^A-Za-z0-9._-]+", "_", (s or "x").strip())
    return x[:120] or "x"


def lane_evidence_root(ts: str | None = None) -> Path:
    t = ts or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return Path("/var/log/tenmon") / f"card_{_safe_seg(CARD)}" / t


# 自動適用禁止（パス断片）。patch plan の low-risk 候補から除外し manual-only へ。
_FORBIDDEN_AUTOFIX_FRAGMENTS: Tuple[str, ...] = (
    "kokuzo_pages",
    "scriptureCanon",
    "scripture_canon",
    "TENMON_PERSONA",
    "tenmonPersona",
    "intentionConstitution",
    "billing",
    "/auth",
    "founder",
    "persona/constitution",
)

# low-risk 許容ヒント（計画テキストのみ・実際の編集は human / Cursor）
_LOW_RISK_PATH_HINTS: Dict[str, Tuple[str, ...]] = {
    "surface_min_density_ok": (
        "api/src/routes/chat_refactor/finalize.ts",
        "api/src/kanagi/engine/responseComposer.ts",
        "api/src/core/tenmonSurfaceEmptyAfterStripFallbackV1.ts",
    ),
    "not_generic_drift": (
        "api/src/routes/chat_refactor/finalize.ts",
        "api/src/core/responseComposer.ts",
    ),
    "one_step_present": (
        "api/src/routes/chat_refactor/finalize.ts",
        "api/src/planning/detailPlanContractP20.ts",
    ),
    "continuity_ok": (
        "api/src/routes/chat_refactor/finalize.ts",
        "api/src/routes/chat.ts",
    ),
    "over_short_forbidden": (
        "api/src/routes/chat_refactor/finalize.ts",
        "api/src/kanagi/engine/responseComposer.ts",
    ),
    "empty_claim_forbidden": ("api/src/routes/chat_refactor/finalize.ts",),
    "grounding_mode_ok": (),  # 多くが kokuzo / 典拠系 → manual
    "route_reason_ok": (),
    "center_label_ok": (),
}


def _collect_reason_codes(report: Dict[str, Any]) -> Tuple[Set[str], List[Dict[str, Any]]]:
    codes: Set[str] = set()
    per_probe: List[Dict[str, Any]] = []
    for p in report.get("probes") or []:
        if not isinstance(p, dict):
            continue
        fails = list(p.get("reasons_fail") or [])
        for r in fails:
            codes.add(str(r))
        per_probe.append({"probe_id": p.get("probe_id"), "reasons_fail": fails, "probe_pass": p.get("probe_pass")})
    for fc in report.get("aggregate", {}).get("fail_codes") or []:
        codes.add(str(fc))
    return codes, per_probe


def _normalize_failure_code(code: str) -> str:
    c = str(code)
    if "surface_density" in c or c.startswith("surface_min_density_ok_count"):
        return "surface_min_density_ok"
    if c.startswith("probe_pass_count") or c == "generic_drift_strong_any_probe":
        return c
    return c


def classify_and_plan(reason_codes: Set[str]) -> Dict[str, Any]:
    low_risk_items: List[Dict[str, Any]] = []
    manual_only: List[Dict[str, Any]] = []

    def is_forbidden_hint(path: str) -> bool:
        pl = path.lower()
        return any(f.lower() in pl for f in _FORBIDDEN_AUTOFIX_FRAGMENTS)

    seen_low: Set[str] = set()

    for raw in sorted(reason_codes):
        code = _normalize_failure_code(raw)

        if code in ("runner_not_ok", "chat_url:undiscovered", "generic_strong_drift", "generic_drift_strong_any_probe"):
            manual_only.append({"failure_code": raw, "risk": "manual_only", "reason": "infra_or_aggregate_gate"})
            continue

        if code in ("probe_pass_count_lt_6",):
            manual_only.append({"failure_code": raw, "risk": "manual_only", "reason": "aggregate_threshold_review_all_probes"})
            continue

        if code in _LOW_RISK_PATH_HINTS:
            hints = _LOW_RISK_PATH_HINTS[code]
            if not hints:
                manual_only.append({"failure_code": raw, "risk": "manual_only", "reason": "grounding_or_route_family"})
                continue
            clean = [h for h in hints if not is_forbidden_hint(h)]
            if not clean:
                manual_only.append({"failure_code": raw, "risk": "manual_only", "reason": "no_safe_path_hints"})
                continue
            if code not in seen_low:
                seen_low.add(code)
                low_risk_items.append(
                    {
                        "failure_code": raw,
                        "normalized": code,
                        "risk": "low",
                        "suggested_paths": clean,
                        "action": "minor_surface_or_carry_guard_review",
                        "autofix_allowed": False,
                    }
                )
            continue

        manual_only.append({"failure_code": raw, "risk": "manual_only", "reason": "unclassified_default_manual"})

    return {"low_risk_plan": low_risk_items, "manual_only": manual_only}


def _run_shell(cmd: List[str], cwd: Path, log_path: Path, timeout: int = 600) -> int:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        p = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        log_path.write_text(
            f"cmd: {' '.join(cmd)}\nexit:{p.returncode}\n\n=== stdout ===\n{p.stdout}\n\n=== stderr ===\n{p.stderr}\n",
            encoding="utf-8",
            errors="replace",
        )
        return int(p.returncode)
    except Exception as e:
        log_path.write_text(f"cmd: {' '.join(cmd)}\nexception:{e}\n", encoding="utf-8", errors="replace")
        return 127


def _curl_save(url: str, out: Path, timeout: float = 15.0) -> Tuple[bool, str]:
    try:
        import urllib.request

        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(body, encoding="utf-8", errors="replace")
        return True, ""
    except Exception as e:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False, indent=2), encoding="utf-8")
        return False, str(e)


def collect_evidence_bundle(
    dest: Path,
    repo_root: Path,
    base_url: str,
    probe_report: Dict[str, Any],
    ledger_path: Path,
    lane_report: Dict[str, Any],
    build_log_path: Optional[Path],
    build_rc: Optional[int],
    lane_evidence_parent: Optional[Path] = None,
) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "build_meta.json").write_text(
        json.dumps({"build_rc": build_rc}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (dest / "conversation_acceptance_report.json").write_text(
        json.dumps(probe_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (dest / "lane_report.json").write_text(json.dumps(lane_report, ensure_ascii=False, indent=2), encoding="utf-8")
    if ledger_path.is_file():
        shutil.copy2(ledger_path, dest / "regression_ledger_snapshot.json")

    _run_shell(["git", "status", "-sb"], repo_root, dest / "git_status.log")
    _run_shell(["git", "diff", "--no-color"], repo_root, dest / "git_diff.log")

    if build_log_path and build_log_path.is_file():
        shutil.copy2(build_log_path, dest / "npm_build.log")

    unit = os.environ.get("TENMON_LANE_SYSTEMD_UNIT", "").strip()
    if unit:
        _run_shell(["systemctl", "status", unit, "--no-pager"], repo_root, dest / "systemd_status.log", timeout=30)
        _run_shell(
            ["journalctl", "-u", unit, "-n", "80", "--no-pager"],
            repo_root,
            dest / "journal_tail.log",
            timeout=30,
        )
    else:
        (dest / "systemd_status.skipped").write_text("TENMON_LANE_SYSTEMD_UNIT unset\n", encoding="utf-8")

    audit_url = base_url.rstrip("/") + "/api/audit"
    ok_audit, err = _curl_save(audit_url, dest / "api_audit.json")
    if not ok_audit:
        (dest / "api_audit_error.txt").write_text(err, encoding="utf-8")

    if lane_evidence_parent:
        pp = lane_evidence_parent / "patch_plan.json"
        if pp.is_file():
            shutil.copy2(pp, dest / "patch_plan.json")


def append_invocation_state(repo_root: Path, entry: Dict[str, Any]) -> None:
    p = repo_root / "api" / "automation" / "generated_cursor_apply" / STATE_LOG
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def anti_repeat_check(repo_root: Path, max_same_card: int, force: bool) -> Optional[str]:
    if force or max_same_card <= 0:
        return None
    p = repo_root / "api" / "automation" / "generated_cursor_apply" / STATE_LOG
    if not p.is_file():
        return None
    lines = p.read_text(encoding="utf-8", errors="replace").strip().splitlines()
    recent = [json.loads(x) for x in lines[-20:] if x.strip()]
    same = sum(1 for x in recent if x.get("lane_card") == CARD)
    if same >= max_same_card:
        return f"anti_repeat:same_lane_card_count_{same}>={max_same_card}"
    return None


def write_next_card_pass_only(out_dir: Path, repo_root: Path) -> Optional[Path]:
    md = (
        f"# {NEXT_CARD}\n\n"
        "このファイルは `tenmon_conversation_quality_lane_v1` が **acceptance PASS** のときのみ生成した。\n\n"
        "## 次アクション\n\n"
        "- policy 判定済み low-risk のみを対象に、初回 auto-fix ループ（小さな差分）を切る。\n"
        "- `tenmon_conversation_low_risk_patch_policy_v1.json` に違反するパスは触らない。\n\n"
    )
    rel = Path("api/automation/generated_cursor_apply") / f"{NEXT_CARD}.md"
    path = repo_root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(md, encoding="utf-8")
    (out_dir / "next_card_pointer.txt").write_text(str(rel) + "\n", encoding="utf-8")
    return path


def run_lane(args: argparse.Namespace) -> int:
    run_id = args.run_id.strip() or uuid.uuid4().hex[:16]
    repo_root = Path(args.repo_root).resolve()
    ledger_path = _ledger_path(args.ledger if args.ledger.strip() else None)

    reason = anti_repeat_check(repo_root, args.max_same_card_invocations, args.force)
    if reason:
        print(json.dumps({"ok": False, "error": reason, "fail_closed": True}, ensure_ascii=False, indent=2))
        return 2

    ev_root = Path(args.evidence_dir) if args.evidence_dir.strip() else lane_evidence_root()
    ev_bundle = ev_root / "evidence_bundle"
    build_log = ev_root / "npm_build.log"

    base, _bootstrap = resolve_probe_base_url()

    tid = (args.thread_id or "").strip() or None
    probe_report, _records = build_full_report(args.chat_url, tid)
    acceptance_ok = bool(probe_report.get("acceptance_ok"))
    probe_complete_ok = bool(probe_report.get("probe_complete_ok"))

    ledger_summary: Dict[str, Any] = {}
    ledger_err = ""
    try:
        _, ledger_summary = append_report_to_ledger(
            probe_report,
            ledger_path,
            args.target_file,
            ledger_note=f"lane:{run_id}",
        )
    except ValueError as e:
        ledger_err = str(e)
        ledger_summary = {"error": ledger_err}

    reason_codes, per_probe_detail = _collect_reason_codes(probe_report)
    classification_raw = classify_and_plan(reason_codes)
    try:
        pol = load_policy(Path(args.policy_path)) if getattr(args, "policy_path", "").strip() else load_policy()
    except Exception as e:
        print(
            json.dumps(
                {"ok": False, "error": f"policy_load_failed:{e}", "fail_closed": True},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 3
    classification, policy_verdict = apply_policy_to_classification(classification_raw, pol)
    patch_suppressed = bool(classification.get("patch_policy", {}).get("suppress_low_risk_plan"))
    orig_plan_n = int(classification.get("patch_policy", {}).get("original_low_risk_plan_item_count") or 0)

    build_rc: Optional[int] = None
    restart_meta: Dict[str, Any] = {"attempted": False, "skipped_reason": None}
    if args.run_build:
        build_rc = _run_shell(
            ["npm", "run", "build"],
            _API_ROOT,
            build_log,
            timeout=int(args.build_timeout),
        )
    if (
        getattr(args, "restart_after_build", False)
        and args.run_build
        and build_rc == 0
    ):
        if os.environ.get("TENMON_LANE_ALLOW_SYSTEMD_RESTART", "").strip() != "1":
            restart_meta["skipped_reason"] = "TENMON_LANE_ALLOW_SYSTEMD_RESTART!=1"
        else:
            unit = os.environ.get("TENMON_LANE_SYSTEMD_UNIT", "").strip()
            if not unit:
                restart_meta["skipped_reason"] = "TENMON_LANE_SYSTEMD_UNIT_unset"
            else:
                rc_r = _run_shell(
                    ["systemctl", "restart", unit],
                    repo_root,
                    ev_root / "systemd_restart.log",
                    timeout=120,
                )
                restart_meta = {"attempted": True, "unit": unit, "exit_code": rc_r, "skipped_reason": None}

    audit_ok = False
    audit_err = ""
    if args.require_audit:
        audit_tmp = ev_root / "api_audit_precheck.json"
        audit_ok, audit_err = _curl_save(base.rstrip("/") + "/api/audit", audit_tmp)

    reprobe_report: Optional[Dict[str, Any]] = None
    if args.reprobe_after_build and args.run_build and build_rc == 0:
        reprobe_report, _ = build_full_report(args.chat_url, tid)

    # result_status / build_rc 伝搬
    if ledger_err:
        result_status = "fail_ledger_append"
    elif args.require_audit and not audit_ok:
        result_status = "blocked_missing_evidence"
    elif not probe_complete_ok:
        result_status = "fail_probe_incomplete"
    elif build_rc is not None and build_rc != 0:
        result_status = "fail_build"
    elif restart_meta.get("attempted") and int(restart_meta.get("exit_code") or 0) != 0:
        result_status = "fail_systemd_restart"
    elif acceptance_ok:
        result_status = "pass"
    else:
        result_status = "fail_acceptance"

    lane_report: Dict[str, Any] = {
        "version": LANE_VERSION,
        "cardName": CARD,
        "generatedAt": _utc_now_iso(),
        "run_id": run_id,
        "result_status": result_status,
        "acceptance_ok": acceptance_ok,
        "probe_complete_ok": probe_complete_ok,
        "build_rc": build_rc,
        "audit_ok": audit_ok if args.require_audit else None,
        "audit_error": audit_err if args.require_audit else None,
        "ledger_append_error": ledger_err or None,
        "ledger_latest_summary": ledger_summary,
        "failure_codes_observed": sorted(reason_codes),
        "per_probe_fail_detail": per_probe_detail,
        "patch_plan": classification,
        "patch_policy_gate": policy_verdict,
        "low_risk_patch_plan_suppressed_by_policy": patch_suppressed and orig_plan_n > 0,
        "patch_policy_deny_reason": (classification.get("patch_policy") or {}).get("deny_reason") or None,
        "low_risk_autofix_executed": False,
        "restart_after_build_meta": restart_meta,
        "notes": [
            "自動コード編集は実施しない。patch_plan は human / Cursor 向け。",
            "supervisor / watch_loop の停止は不要・本スクリプトも停止しない。",
            "tenmon_conversation_low_risk_patch_policy_v1: manual-only / 未知パス混入時は low_risk_plan を空にする。",
        ],
    }

    if reprobe_report is not None:
        lane_report["reprobe_after_build"] = {
            "acceptance_ok": bool(reprobe_report.get("acceptance_ok")),
            "aggregate": reprobe_report.get("aggregate"),
        }

    ev_root.mkdir(parents=True, exist_ok=True)
    try:
        pol_snap = Path(args.policy_path) if getattr(args, "policy_path", "").strip() else (
            _AUTOMATION / "tenmon_conversation_low_risk_patch_policy_v1.json"
        )
        if pol_snap.is_file():
            shutil.copy2(pol_snap, ev_root / "low_risk_patch_policy_snapshot.json")
    except OSError:
        pass
    (ev_root / "patch_plan.json").write_text(
        json.dumps(classification, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (ev_root / "lane_report.json").write_text(json.dumps(lane_report, ensure_ascii=False, indent=2), encoding="utf-8")

    restart_failed = bool(restart_meta.get("attempted")) and int(restart_meta.get("exit_code") or 0) != 0
    fail_evidence = (not acceptance_ok) or (build_rc is not None and build_rc != 0) or (
        args.require_audit and not audit_ok
    ) or bool(ledger_err) or restart_failed
    if fail_evidence or args.always_evidence:
        collect_evidence_bundle(
            ev_bundle,
            repo_root,
            base,
            probe_report,
            ledger_path,
            lane_report,
            build_log if build_log.is_file() else None,
            build_rc,
            lane_evidence_parent=ev_root,
        )

    next_path: Optional[Path] = None
    if acceptance_ok and result_status == "pass" and not ledger_err and not restart_failed:
        next_path = write_next_card_pass_only(ev_root, repo_root)
        lane_report["next_card_generated"] = str(next_path) if next_path else None

    append_invocation_state(
        repo_root,
        {
            "lane_card": CARD,
            "utc": _utc_now_iso(),
            "run_id": run_id,
            "acceptance_ok": acceptance_ok,
            "result_status": result_status,
            "evidence_root": str(ev_root),
        },
    )

    (ev_root / "lane_report.json").write_text(json.dumps(lane_report, ensure_ascii=False, indent=2), encoding="utf-8")

    out = {
        "ok": acceptance_ok and result_status == "pass" and not ledger_err and not restart_failed,
        "lane_report": lane_report,
        "evidence_root": str(ev_root),
    }
    if not getattr(args, "quiet", False):
        print(json.dumps(out, ensure_ascii=False, indent=2))

    if ledger_err:
        return 1
    if result_status == "pass":
        return 0
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Conversation quality autofix lane v1 (observe / plan / verify)")
    ap.add_argument(
        "--policy-path",
        default="",
        help="low-risk patch policy JSON (default: tenmon_conversation_low_risk_patch_policy_v1.json)",
    )
    ap.add_argument("--repo-root", default=str(_REPO_ROOT))
    ap.add_argument("--ledger", default="", help="regression ledger JSON path")
    ap.add_argument("--target-file", default="api/src/routes/chat.ts")
    ap.add_argument("--chat-url", default="")
    ap.add_argument("--thread-id", default="")
    ap.add_argument("--run-id", default="", help="idempotency / log correlation")
    ap.add_argument("--run-build", action="store_true", help="npm run build in api/")
    ap.add_argument(
        "--restart-after-build",
        action="store_true",
        help="after successful build, systemctl restart TENMON_LANE_SYSTEMD_UNIT (requires TENMON_LANE_ALLOW_SYSTEMD_RESTART=1)",
    )
    ap.add_argument("--build-timeout", default="600")
    ap.add_argument("--reprobe-after-build", action="store_true", help="second probe after successful build")
    ap.add_argument("--require-audit", action="store_true", help="fail-closed if /api/audit unreachable")
    ap.add_argument("--always-evidence", action="store_true", help="always write evidence_bundle")
    ap.add_argument("--evidence-dir", default="", help="override /var/log/tenmon/... root for this run")
    ap.add_argument(
        "--max-same-card-invocations",
        type=int,
        default=50,
        help="anti-loop: max rows with this lane card in last 20 state log lines (0=off)",
    )
    ap.add_argument("--force", action="store_true", help="bypass anti_repeat_check")
    ap.add_argument("--quiet", action="store_true", help="no stdout JSON (orchestrator use)")
    args = ap.parse_args()
    return run_lane(args)


if __name__ == "__main__":
    raise SystemExit(main())
