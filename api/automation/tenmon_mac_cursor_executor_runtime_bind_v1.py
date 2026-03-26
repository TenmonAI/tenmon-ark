#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1 — VPS 側 dry bind（queue/result 非改変、観測のみ）。"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1"
# 実行方式は本カードで cursor_cli_primary に固定（宣言）
EXECUTOR_MODE = "cursor_cli_primary"
# TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND: watch loop POST の status（real は dry_run_started 禁止）
REAL_RESULT_STATUS_VOCAB = (
    "dry_run_started",
    "started",
    "executor_failed",
    "completed_no_diff",
    "build_ok",
    "acceptance_ok",
    "completed",
)
NO_DIFF_REASON_VOCAB = (
    "patch_already_applied",
    "executor_opened_but_no_change",
    "review_not_applied",
    "no_executor_configured",
    "acceptance_gated_fail",
)
POLL_INTERVAL_SEC = 30
NEXT_ON_PASS = "TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_RETRY_CURSOR_AUTO_V1"

EXPECTED_AGENT_REL = "api/scripts/remote_cursor_agent_mac_v1.sh"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _norm_base(u: str) -> str:
    return str(u or "").strip().rstrip("/")


def queue_valid(q: dict[str, Any]) -> bool:
    return bool(q) and isinstance(q.get("items"), list) and q.get("version") is not None


def bundle_valid(b: dict[str, Any]) -> bool:
    return bool(b) and isinstance(b.get("entries"), list) and b.get("version") is not None


def _current_run_nonfixture_entries(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    out: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        if e.get("current_run") is not True:
            continue
        if e.get("fixture") is True:
            continue
        qid = str(e.get("queue_id") or e.get("id") or "").strip()
        if not qid or qid.startswith("6420"):
            continue
        out.append(e)
    return out


def _latest_nonfixture_current_run(bundle: dict[str, Any]) -> dict[str, Any] | None:
    cur = _current_run_nonfixture_entries(bundle)
    if not cur:
        return None

    def _ts(e: dict[str, Any]) -> str:
        for k in ("created_at", "timestamp", "generated_at"):
            v = e.get(k)
            if isinstance(v, str) and v.strip():
                return v
        return ""

    cur.sort(key=_ts)
    return cur[-1]


def admin_endpoints_ok(m: dict[str, Any]) -> bool:
    endpoints = m.get("endpoints") or {}
    pull = endpoints.get("pull_next") if isinstance(endpoints.get("pull_next"), dict) else {}
    sub = endpoints.get("submit_result") if isinstance(endpoints.get("submit_result"), dict) else {}
    return bool(
        str(pull.get("path") or "").startswith("/api/admin/cursor/")
        and "/result" in str(sub.get("path") or "")
    )


def manifest_shell_agent_path(m: dict[str, Any]) -> str:
    sh = m.get("shell_scripts") if isinstance(m.get("shell_scripts"), dict) else {}
    return str(sh.get("agent") or "").strip()


def agent_script_refs_expected_paths(text: str) -> bool:
    return "/api/admin/cursor/next" in text and "TENMON_REMOTE_CURSOR_BASE_URL" in text


def compute_transport_ambiguous(manifest_present: bool, m: dict[str, Any]) -> tuple[bool, list[str]]:
    """transport が単一で cursor_cli_primary と矛盾しないか観測（曖昧なら True）。"""
    reasons: list[str] = []
    if not manifest_present:
        reasons.append("manifest_missing")
        return True, reasons
    em = str(m.get("executor_mode") or "").strip()
    if em and em != EXECUTOR_MODE:
        reasons.append(f"executor_mode_not_cursor_cli_primary:{em}")
        return True, reasons
    notes = m.get("notes")
    if isinstance(notes, list):
        blob = " ".join(str(x) for x in notes)
    else:
        blob = str(m.get("transport_notes") or "")
    low = blob.lower()
    # 明示的に「CLI が主」でない複数 primary を示唆する表現のみ曖昧扱い
    if re.search(r"\bgui\b.*\bprimary\b|\bprimary\b.*\bgui\b", low) and "cursor" not in low:
        reasons.append("notes_suggest_non_cli_primary")
        return True, reasons
    return False, reasons


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_cursor_executor_runtime_bind_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    scripts = repo / "api" / "scripts"

    api_base = _norm_base(os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000")

    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    manifest_path = auto / "remote_cursor_mac_agent_manifest.json"
    agent_sh = scripts / "remote_cursor_agent_mac_v1.sh"

    issues: list[str] = []

    queue = read_json(queue_path) if queue_path.is_file() else {}
    if not queue_path.is_file():
        issues.append("queue_file_missing")
    elif not queue_valid(queue):
        issues.append("queue_schema_invalid")

    bundle = read_json(bundle_path) if bundle_path.is_file() else {}
    if not bundle_path.is_file():
        issues.append("result_bundle_file_missing")
    elif not bundle_valid(bundle):
        issues.append("result_bundle_schema_invalid")

    manifest_present = manifest_path.is_file()
    m = read_json(manifest_path) if manifest_present else {}
    if not manifest_present:
        issues.append("manifest_missing")

    admin_route_presence = manifest_present and admin_endpoints_ok(m)
    if manifest_present and not admin_route_presence:
        issues.append("manifest_admin_endpoints_invalid")

    manifest_base = _norm_base(str(m.get("base_url") or ""))
    if manifest_present and manifest_base and manifest_base != api_base:
        issues.append(f"manifest_base_url_mismatch:manifest={manifest_base} env={api_base}")

    shell_agent = manifest_shell_agent_path(m)
    shell_scripts_ok = bool(shell_agent) and shell_agent.replace("\\", "/") == EXPECTED_AGENT_REL
    if manifest_present and not shell_scripts_ok:
        issues.append(f"shell_scripts_agent_mismatch:got={shell_agent or '(empty)'}")

    watch_sh_ok = agent_sh.is_file()
    if not watch_sh_ok:
        issues.append("mac_agent_script_missing")

    agent_body = ""
    if watch_sh_ok:
        try:
            agent_body = agent_sh.read_text(encoding="utf-8", errors="replace")
        except Exception:
            agent_body = ""
        if not agent_script_refs_expected_paths(agent_body):
            issues.append("mac_agent_script_missing_expected_routes")

    transport_ambiguous, amb_reasons = compute_transport_ambiguous(manifest_present, m)
    if amb_reasons:
        issues.extend([f"transport:{x}" for x in amb_reasons])

    queue_watch_ready = queue_path.is_file() and queue_valid(queue)
    result_bundle_observable = bundle_path.is_file() and bundle_valid(bundle)

    latest_nf = _latest_nonfixture_current_run(bundle) if result_bundle_observable else None
    latest_nf_status = latest_nf.get("status") if isinstance(latest_nf, dict) else None
    latest_nf_touched = latest_nf.get("touched_files") if isinstance(latest_nf, dict) else None
    latest_nf_build_rc = latest_nf.get("build_rc") if isinstance(latest_nf, dict) else None
    latest_nf_accept = latest_nf.get("acceptance_ok") if isinstance(latest_nf, dict) else None

    latest_nf_touched_count = len(latest_nf_touched) if isinstance(latest_nf_touched, list) else None
    latest_nf_real_ok = True
    if latest_nf is not None:
        latest_nf_real_ok = bool(
            isinstance(latest_nf_touched, list)
            and latest_nf_touched_count is not None
            and latest_nf_touched_count >= 1
            and isinstance(latest_nf_build_rc, int)
            and latest_nf_accept in (True, False)
            and isinstance(latest_nf_status, str)
            and latest_nf_status.strip() != ""
            and latest_nf_status in REAL_RESULT_STATUS_VOCAB
            and latest_nf_status != "dry_run_started"
        )
        if not latest_nf_real_ok:
            issues.append("latest_nonfixture_current_run_evidence_incomplete")

    manifest_mode_effective = str(m.get("executor_mode") or EXECUTOR_MODE)
    mode_bind_ok = manifest_mode_effective == EXECUTOR_MODE

    agent_routes_ok = agent_script_refs_expected_paths(agent_body) if watch_sh_ok else False
    base_url_bind_ok = not (bool(manifest_base) and manifest_base != api_base)

    current_run_bind_ok = bool(
        queue_watch_ready
        and result_bundle_observable
        and manifest_present
        and admin_route_presence
        and watch_sh_ok
        and shell_scripts_ok
        and mode_bind_ok
        and base_url_bind_ok
        and agent_routes_ok
        and latest_nf_real_ok
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "executor_mode": EXECUTOR_MODE,
        "manifest_executor_mode": m.get("executor_mode"),
        "poll_interval_sec": POLL_INTERVAL_SEC,
        "api_base": api_base,
        "admin_route_presence": admin_route_presence,
        "queue_watch_ready": queue_watch_ready,
        "result_bundle_observable": result_bundle_observable,
        "shell_scripts_agent_expected": EXPECTED_AGENT_REL,
        "shell_scripts_agent_ok": shell_scripts_ok,
        "current_run_bind_ok": current_run_bind_ok,
        "transport_ambiguous": transport_ambiguous,
        "transport_ambiguity_reasons": amb_reasons,
        "manifest_path": str(manifest_path),
        "queue_path": str(queue_path),
        "bundle_path": str(bundle_path),
        "agent_script_path": str(agent_sh),
        "agent_script_present": watch_sh_ok,
        "issues": issues,
        "dry_bind_only": True,
        "no_queue_or_result_writes": True,
        "latest_nonfixture_current_run_status": latest_nf_status,
        "latest_nonfixture_touched_files_count": latest_nf_touched_count,
        "latest_nonfixture_build_rc": latest_nf_build_rc,
        "latest_nonfixture_acceptance_ok": latest_nf_accept,
        "real_execution_result_evidence_v1": {
            "status_vocab": list(REAL_RESULT_STATUS_VOCAB),
            "status_vocab_when_real": [x for x in REAL_RESULT_STATUS_VOCAB if x != "dry_run_started"],
            "no_diff_reason_vocab": list(NO_DIFF_REASON_VOCAB),
            "note": "CURSOR_EXECUTOR_DRY_RUN=0 のとき status に dry_run_started を使わない。touched_files 空なら no_diff_reason 必須。",
        },
    }

    summary_path = auto / "tenmon_mac_cursor_executor_runtime_bind_summary.json"
    report_path = auto / "tenmon_mac_cursor_executor_runtime_bind_report.md"
    write_json(summary_path, out)

    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- generated_at: `{out['generated_at']}`",
                f"- **executor_mode** (fixed): `{EXECUTOR_MODE}`",
                f"- manifest `executor_mode` (observed): `{out.get('manifest_executor_mode')}`",
                f"- **current_run_bind_ok**: `{current_run_bind_ok}`",
                f"- **transport_ambiguous**: `{transport_ambiguous}`",
                f"- queue_watch_ready: `{queue_watch_ready}`",
                f"- result_bundle_observable: `{result_bundle_observable}`",
                f"- admin_route_presence: `{admin_route_presence}`",
                f"- shell_scripts_agent_ok: `{shell_scripts_ok}`",
                "",
                "## Issues (観測)",
                "",
            ]
            + ([f"- `{x}`" for x in issues] if issues else ["- (none)"])
            + [
                "",
                "## Policy",
                "",
                "- queue / `remote_cursor_result_bundle.json` への**直書きは行わない**（本スクリプトは読取のみ）。",
                "- 実行方式は **cursor_cli_primary** に固定。",
                "- transport は manifest + agent スクリプトで単一路線であること。",
                "",
                "## Real execution result evidence (watch loop)",
                "",
                f"- status 語彙: `{', '.join(REAL_RESULT_STATUS_VOCAB)}`（real では `dry_run_started` 以外）。",
                "",
                "## Chain",
                "",
                f"- **next_on_pass**: `{NEXT_ON_PASS}`",
                f"- **retry_card**: `{RETRY_CARD}`",
                f"- {NEXT_ON_FAIL_NOTE}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    pass_bind = bool(
        out["executor_mode"] == EXECUTOR_MODE
        and current_run_bind_ok
        and not transport_ambiguous
    )

    print(
        json.dumps(
            {
                "ok": pass_bind,
                "path": str(summary_path),
                "current_run_bind_ok": current_run_bind_ok,
                "transport_ambiguous": transport_ambiguous,
                "executor_mode": EXECUTOR_MODE,
                "next_on_pass": NEXT_ON_PASS,
                "retry_card": RETRY_CARD,
            },
            ensure_ascii=False,
        )
    )
    return 0 if pass_bind else 1


if __name__ == "__main__":
    raise SystemExit(main())
