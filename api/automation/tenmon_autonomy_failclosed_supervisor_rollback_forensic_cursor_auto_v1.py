#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_FAILCLOSED_SUPERVISOR_AND_ROLLBACK_CURSOR_AUTO_V1

失敗時は停止・証拠束（固定 shape: audit / systemctl / journal / git_diff / probe_summary）・
（明示時のみ）rollback・approval/escrow trace・次カード JSON。
failure taxonomy 固定。欠損セクションは absent_reason。rollback 後 state cleanup。
supervisor / rollback / forensic のみ。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_FAILCLOSED_SUPERVISOR_AND_ROLLBACK_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_FORENSIC_BUNDLE_REPAIR_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_failclosed_supervisor_and_rollback_cursor_auto_v1.json"
NEXT_CARD_JSON = "tenmon_autonomy_failclosed_supervisor_next_card_v1.json"
TAXONOMY_JSON = "tenmon_autonomy_failclosed_supervisor_failure_taxonomy_v1.json"
ROLLBACK_PATH_JSON = "tenmon_autonomy_failclosed_rollback_path_v1.json"
STATE_JSON = "tenmon_autonomy_failclosed_supervisor_state_v1.json"

REQUIRED_FAILURE_IDS = frozenset(
    {
        "build_fail",
        "restart_fail",
        "audit_fail",
        "probe_regression",
        "diff_expanded",
        "unsafe_write",
    },
)


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _sh(cmd: list[str], cwd: Path | None = None, timeout: float = 25.0) -> dict[str, Any]:
    try:
        p = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "cmd": cmd,
            "rc": p.returncode,
            "stdout": (p.stdout or "")[-24000:],
            "stderr": (p.stderr or "")[-8000:],
        }
    except Exception as e:
        return {"cmd": cmd, "error": str(e)}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_evidence_root(repo: Path) -> tuple[Path, str]:
    env = (os.environ.get("TENMON_AUTONOMY_FORENSIC_BUNDLE_ROOT") or "").strip()
    if env:
        return Path(os.path.expanduser(env)).resolve(), "env"
    rp = _read_json(repo / "api" / "automation" / ROLLBACK_PATH_JSON)
    d = str(rp.get("default_evidence_root") or "/var/log/tenmon/autonomy_failclosed_bundles")
    root = Path(d).expanduser().resolve()
    for candidate in (root, Path("/tmp/tenmon_autonomy_failclosed_bundles")):
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate.resolve(), "default"
        except OSError:
            continue
    raise OSError("no writable evidence root")


def _absent_or_data(data: dict[str, Any], absent_reason: str | None) -> dict[str, Any]:
    if absent_reason:
        return {"absent_reason": absent_reason}
    return data


def collect_evidence_bundle(
    repo: Path,
    base_url: str,
    unit: str,
    simulate_build_fail: bool,
    simulate_probe_degrade: bool,
    simulate_restart_fail: bool,
    simulate_audit_fail: bool,
    simulate_diff_expanded: bool,
    simulate_unsafe_write: bool,
    simulate_high_risk_escrow: bool,
) -> dict[str, Any]:
    audit = _sh(["curl", "-fsS", "--max-time", "12", f"{base_url.rstrip('/')}/api/audit"])
    if simulate_audit_fail:
        audit = {"cmd": ["curl", "(simulated_audit_fail)"], "rc": 22, "stdout": "", "stderr": "simulated audit_fail"}
    health = _sh(["curl", "-fsS", "--max-time", "8", f"{base_url.rstrip('/')}/health"])
    sys_st = _sh(
        ["systemctl", "status", unit, "--no-pager", "-l"],
        timeout=20.0,
    )
    if simulate_restart_fail:
        sys_st = {
            "cmd": ["systemctl", "status", unit, "(simulated_restart_fail)"],
            "rc": 3,
            "stdout": "(simulated) restart_fail for evidence bundle\n",
            "stderr": "",
        }
    journal = _sh(["journalctl", "-u", unit, "-n", "120", "--no-pager"])
    git_diff_stat = _sh(["git", "diff", "--stat"], cwd=repo)
    git_diff = _sh(["git", "diff", "--"], cwd=repo)
    gd_out = str(git_diff.get("stdout") or "")
    if simulate_diff_expanded:
        gd_out = ("x\n" * 9000) + gd_out
    if len(gd_out) > 32000:
        gd_out = gd_out[:32000] + "\n…(truncated)"
    git_status = _sh(["git", "status", "-sb", "-uall"], cwd=repo)
    sys_rc = int(sys_st.get("rc") if isinstance(sys_st.get("rc"), int) else -1)
    audit_rc = audit.get("rc")
    audit_absent: str | None = "curl_exec_error" if isinstance(audit, dict) and audit.get("error") else None

    probe_summary: dict[str, Any] = {
        "health_rc": health.get("rc"),
        "audit_rc": audit_rc,
        "systemctl_rc": sys_rc,
        "simulated_build_fail": simulate_build_fail,
        "simulated_probe_regression": simulate_probe_degrade,
        "simulated_restart_fail": simulate_restart_fail,
        "simulated_audit_fail": simulate_audit_fail,
        "simulated_diff_expanded": simulate_diff_expanded,
        "simulated_unsafe_write": simulate_unsafe_write,
        "simulated_high_risk_escrow": simulate_high_risk_escrow,
    }
    if simulate_high_risk_escrow:
        probe_summary["failure_class"] = "high_risk_escrow_required"
        probe_summary["probe_state"] = "escrow_trace_required"
        probe_summary["ok"] = False
    elif simulate_unsafe_write:
        probe_summary["failure_class"] = "unsafe_write"
        probe_summary["probe_state"] = "unsafe_write_simulated"
        probe_summary["ok"] = False
    elif simulate_restart_fail:
        probe_summary["failure_class"] = "restart_fail"
        probe_summary["probe_state"] = "restart_fail_simulated"
        probe_summary["ok"] = False
    elif simulate_build_fail:
        probe_summary["failure_class"] = "build_fail"
        probe_summary["probe_state"] = "build_fail_simulated"
        probe_summary["ok"] = False
    elif simulate_audit_fail:
        probe_summary["failure_class"] = "audit_fail"
        probe_summary["probe_state"] = "audit_fail_simulated"
        probe_summary["ok"] = False
    elif simulate_diff_expanded:
        probe_summary["failure_class"] = "diff_expanded"
        probe_summary["probe_state"] = "diff_expanded_simulated"
        probe_summary["ok"] = False
    elif simulate_probe_degrade and not simulate_restart_fail:
        probe_summary["failure_class"] = "probe_regression"
        probe_summary["probe_state"] = "probe_regression_simulated"
        probe_summary["ok"] = False
    elif sys_rc not in (0,):
        probe_summary["failure_class"] = "restart_fail"
        probe_summary["probe_state"] = "systemctl_nonzero"
        probe_summary["ok"] = False
    else:
        probe_summary["failure_class"] = None
        probe_summary["probe_state"] = "nominal"
        probe_summary["ok"] = health.get("rc") == 0 and audit.get("rc") == 0

    audit_block = _absent_or_data(audit, audit_absent)
    sys_block = _absent_or_data(sys_st, "systemctl_unavailable" if "error" in sys_st else None)
    journal_block = _absent_or_data(journal, "journalctl_unavailable" if journal.get("error") else None)
    if git_diff.get("error") or git_diff_stat.get("error"):
        git_block: dict[str, Any] = {"absent_reason": "git_diff_unavailable"}
    else:
        git_block = {
            "stat": git_diff_stat,
            "patch": {"rc": git_diff.get("rc"), "patch_truncated": gd_out},
            "status": git_status,
        }

    fixed = {
        "version": 1,
        "card": CARD,
        "schema": "evidence_bundle_shape_v1",
        "generatedAt": _utc(),
        "audit": audit_block,
        "systemctl": sys_block,
        "journal": journal_block,
        "git_diff": git_block,
        "probe_summary": probe_summary,
        "audit_probe": audit,
        "health_probe": health,
        "systemctl_status": sys_st,
        "journal_tail": journal,
        "git_diff_stat": git_diff_stat,
        "git_diff": {"rc": git_diff.get("rc"), "patch_truncated": gd_out},
        "git_status": git_status,
    }
    return fixed


def _execute_rollback(repo: Path, rollback_spec: dict[str, Any]) -> tuple[bool, str]:
    if os.environ.get("TENMON_FAILCLOSED_ALLOW_ROLLBACK", "").strip() not in ("1", "true", "yes"):
        return False, "rollback not allowed (set TENMON_FAILCLOSED_ALLOW_ROLLBACK=1)"
    paths_env = (os.environ.get("TENMON_FAILCLOSED_ROLLBACK_PATHS") or "").strip()
    if not paths_env:
        return False, "no TENMON_FAILCLOSED_ROLLBACK_PATHS"
    prefix = rollback_spec.get("rollback_git_restore_prefix")
    if not isinstance(prefix, list) or len(prefix) < 4:
        return False, "invalid rollback_git_restore_prefix"
    for part in paths_env.split(","):
        p = part.strip()
        if not p:
            continue
        cmd = [str(x) for x in prefix] + [p]
        r = subprocess.run(cmd, cwd=str(repo), capture_output=True, text=True, timeout=120, check=False)
        if r.returncode != 0:
            return False, f"git restore failed for {p}: {(r.stderr or '')[:500]}"
    return True, "ok"


def _taxonomy_ok(tax: dict[str, Any]) -> bool:
    if int(tax.get("version") or 0) < 1:
        return False
    fc = tax.get("failure_classes")
    if not isinstance(fc, list):
        return False
    ids = {str(x.get("id")) for x in fc if isinstance(x, dict)}
    return REQUIRED_FAILURE_IDS.issubset(ids)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="証跡・trace・成果物を書かない")
    ap.add_argument("--apply", action="store_true", help="証拠束・trace・next_card を書く")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--simulate-build-fail", action="store_true")
    ap.add_argument("--simulate-probe-degrade", action="store_true", help="probe 悪化（probe_regression）")
    ap.add_argument("--simulate-restart-fail", action="store_true", help="systemctl 失敗を模擬")
    ap.add_argument("--simulate-audit-fail", action="store_true")
    ap.add_argument("--simulate-diff-expanded", action="store_true")
    ap.add_argument("--simulate-unsafe-write", action="store_true")
    ap.add_argument("--simulate-high-risk-escrow", action="store_true", help="escrow / approval trace 用")
    ap.add_argument("--execute-rollback", action="store_true")
    ap.add_argument("--base-url", default=os.environ.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--systemd-unit",
        default=os.environ.get("TENMON_VPS_ACCEPTANCE_UNIT", "tenmon-ark-api.service"),
    )
    args = ap.parse_args()
    repo = args.repo_root or _repo_root()
    auto = repo / "api" / "automation"
    rollback_used = False

    taxonomy = _read_json(auto / TAXONOMY_JSON)
    rollback_path = _read_json(auto / ROLLBACK_PATH_JSON)
    trace_path = auto / "tenmon_high_risk_approval_trace_v1.json"
    trace = _read_json(trace_path)

    supervisor_ready = _taxonomy_ok(taxonomy)
    rollback_ready = (
        int(rollback_path.get("version") or 0) >= 1
        and isinstance(rollback_path.get("rollback_git_restore_prefix"), list)
        and bool(str(rollback_path.get("rollback_path_id") or "").strip())
    )

    high_risk_trace_ready = trace_path.is_file()
    af_raw = trace.get("autonomy_failclosed_supervisor_v1")
    af = (
        dict(af_raw)
        if isinstance(af_raw, dict)
        else {"version": 1, "card": CARD, "events": [], "last_bundle_path": None, "escrow_refs": []}
    )
    if int(af.get("version") or 0) < 1:
        af["version"] = 1
    if not isinstance(af.get("escrow_refs"), list):
        af["escrow_refs"] = []

    evidence_root: Path | None = None
    forensic_bundle_ready = False
    bundle_path: Path | None = None
    try:
        evidence_root, _ = _resolve_evidence_root(repo)
        forensic_bundle_ready = True
        bundle_path = (
            evidence_root / f"bundle_{_utc().replace(':', '').replace('-', '')}_{uuid.uuid4().hex[:8]}" / "evidence_bundle.json"
        )
    except OSError:
        forensic_bundle_ready = False

    if not args.dry_run and args.apply and forensic_bundle_ready and bundle_path is not None:
        body = collect_evidence_bundle(
            repo,
            args.base_url,
            args.systemd_unit,
            args.simulate_build_fail,
            args.simulate_probe_degrade,
            args.simulate_restart_fail,
            args.simulate_audit_fail,
            args.simulate_diff_expanded,
            args.simulate_unsafe_write,
            args.simulate_high_risk_escrow,
        )
        try:
            bundle_path.parent.mkdir(parents=True, exist_ok=True)
            _atomic_write_json(bundle_path, body)
        except OSError:
            forensic_bundle_ready = False

    if args.execute_rollback and not args.dry_run:
        ok_rb, _msg = _execute_rollback(repo, rollback_path)
        rollback_used = ok_rb
        if ok_rb and not args.dry_run:
            st = _read_json(auto / STATE_JSON)
            st["version"] = 1
            st["card"] = CARD
            st["last_cleanup_at"] = _utc()
            st["after_rollback"] = True
            st["rollback_path_id"] = str(rollback_path.get("rollback_path_id") or "")
            try:
                _atomic_write_json(auto / STATE_JSON, st)
            except OSError:
                pass

    next_card_generation_ok = False
    if not args.dry_run and args.apply:
        ev = list(af.get("events") or [])
        if not isinstance(ev, list):
            ev = []
        ev.append(
            {
                "at": _utc(),
                "bundle_path": str(bundle_path) if bundle_path else None,
                "simulate_build_fail": bool(args.simulate_build_fail),
                "simulate_probe_degrade": bool(args.simulate_probe_degrade),
                "simulate_restart_fail": bool(args.simulate_restart_fail),
                "simulate_audit_fail": bool(args.simulate_audit_fail),
                "simulate_diff_expanded": bool(args.simulate_diff_expanded),
                "simulate_unsafe_write": bool(args.simulate_unsafe_write),
                "simulate_high_risk_escrow": bool(args.simulate_high_risk_escrow),
                "rollback_executed": rollback_used,
            }
        )
        af["events"] = ev[-50:]
        af["last_bundle_path"] = str(bundle_path) if bundle_path else None
        if args.simulate_high_risk_escrow:
            af["escrow_refs"].append(
                {
                    "at": _utc(),
                    "kind": "high_risk_escrow_trace",
                    "note": "supervisor_simulated_escrow",
                }
            )
        trace["autonomy_failclosed_supervisor_v1"] = af
        trace["generated_at"] = _utc()
        try:
            _atomic_write_json(trace_path, trace)
        except OSError:
            high_risk_trace_ready = False

        nc = {
            "card": CARD,
            "generated_at": _utc(),
            "next_card_if_fail": NEXT_ON_FAIL,
            "failure_loop": True,
            "failure_taxonomy_ref": TAXONOMY_JSON,
        }
        try:
            _atomic_write_json(auto / NEXT_CARD_JSON, nc)
            next_card_generation_ok = True
        except OSError:
            next_card_generation_ok = False
    else:
        ncj = _read_json(auto / NEXT_CARD_JSON)
        next_card_generation_ok = bool(ncj.get("next_card_if_fail") or ncj.get("next_card"))

    ok = (
        supervisor_ready
        and rollback_ready
        and forensic_bundle_ready
        and high_risk_trace_ready
        and next_card_generation_ok
    )

    out_min: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "supervisor_ready": supervisor_ready,
        "rollback_ready": rollback_ready,
        "forensic_bundle_ready": forensic_bundle_ready,
        "high_risk_trace_ready": high_risk_trace_ready,
        "next_card_generation_ok": next_card_generation_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
    }
    out_path = auto / OUT_JSON
    if not args.dry_run:
        try:
            _atomic_write_json(out_path, out_min)
        except OSError:
            ok = False
            out_min["ok"] = False
            out_min["next_card_if_fail"] = NEXT_ON_FAIL

    print(json.dumps(out_min, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
