#!/usr/bin/env python3
"""
TENMON-ARK — auto_build_runner_v1
Fixed pipeline: OBSERVE -> PRECHECK -> PATCH -> BUILD -> DEPLOY -> RESTART -> AUDIT -> ACCEPTANCE -> CLASSIFY -> STOP|NEXT
v1: DEPLOY/RESTART/AUDIT are stubs; BUILD/ACCEPTANCE optional via --execute-checks.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from acceptance_selector_v1 import profile_to_dict_list, select_acceptance_steps
from human_gate_store_v1 import create_pending_gate, get_gate_record, is_approved
from patch_executor_v1 import execute_patch
from path_guard_v1 import allowed_only_violations, classify_mixed_commit_roots, violates_forbidden


def repo_root_from(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(20):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def run_cmd(cmd: str, cwd: Path, timeout: int = 600) -> Tuple[int, str, str]:
    try:
        p = subprocess.run(
            cmd,
            shell=True,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return p.returncode, p.stdout or "", p.stderr or ""
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"
    except Exception as e:
        return 1, "", str(e)


def git_changed_files(root: Path) -> List[str]:
    code, out, _ = run_cmd("git diff --name-only HEAD", root)
    if code != 0:
        code, out, _ = run_cmd("git status --porcelain", root)
        if code != 0:
            return []
        files: List[str] = []
        for line in out.splitlines():
            line = line.strip()
            if len(line) > 3 and line[2] == " ":
                files.append(line[3:].strip())
        return files
    return [x.strip() for x in out.splitlines() if x.strip()]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def find_card(catalog: Dict[str, Any], name: str) -> Optional[Dict[str, Any]]:
    for c in catalog.get("cards", []):
        if c.get("cardName") == name:
            return c
    return None


def _card_needs_human_gate(card: Dict[str, Any]) -> bool:
    return bool(card.get("requiresHumanJudgement") or card.get("class") == "human_gate")


def validate_diff_scope(card: Dict[str, Any], changed: List[str]) -> Tuple[bool, Dict[str, Any]]:
    forbidden = card.get("forbiddenPaths") or []
    allowed = card.get("allowedPaths") or []
    viol: List[Dict[str, str]] = []
    for path in changed:
        for pat in violates_forbidden(path, forbidden):
            viol.append({"path": path, "forbiddenPattern": pat})
    mixed, roots = classify_mixed_commit_roots(changed)
    allow_viol = allowed_only_violations(changed, allowed) if allowed else []
    ok = len(viol) == 0 and len(allow_viol) == 0
    return ok, {
        "forbiddenHits": viol,
        "allowedViolations": allow_viol,
        "mixedCommit": mixed,
        "roots": roots,
    }


def run_pipeline(
    *,
    card_name: str,
    repo_root: Path,
    dry_run: bool,
    execute_checks: bool,
    gate_request_id: Optional[str] = None,
) -> Dict[str, Any]:
    automation_dir = repo_root / "api" / "automation"
    catalog_path = automation_dir / "card_catalog_v1.json"
    catalog = load_json(catalog_path)
    card = find_card(catalog, card_name)
    if not card:
        return {"ok": False, "error": "card_not_found", "cardName": card_name}

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    code0, sha_before, _ = run_cmd("git rev-parse HEAD", repo_root)
    if code0 != 0:
        sha_before = ""

    record: Dict[str, Any] = {
        "cardName": card_name,
        "phase": "OBSERVE",
        "timestamp": ts,
        "gitShaBefore": (sha_before or "").strip(),
        "dryRun": dry_run,
        "gateRequestIdInput": gate_request_id,
    }

    # OBSERVE
    changed = git_changed_files(repo_root)
    record["changedFiles"] = changed

    # PRECHECK (light)
    record["phase"] = "PRECHECK"
    pre_ok = True
    for pc in card.get("prechecks") or []:
        kind = pc.get("kind")
        if kind == "file_exists":
            rel = pc.get("path", "")
            exists = (repo_root / rel).exists()
            pre_ok = pre_ok and exists
        elif kind == "command" and execute_checks and not dry_run:
            cmd = pc.get("command", "")
            code, _, err = run_cmd(cmd, repo_root)
            pre_ok = pre_ok and code == 0
            if code != 0:
                record.setdefault("precheckFailures", []).append({"id": pc.get("id"), "stderr": err})

    if not pre_ok:
        record.update({"ok": False, "fail": "precheck", "phase": "STOP"})
        return record

    # PATCH (+ human gate store)
    record["phase"] = "PATCH"
    human_bypass = False
    if _card_needs_human_gate(card):
        if gate_request_id:
            if is_approved(gate_request_id):
                human_bypass = True
                record["gateRequestId"] = gate_request_id
            else:
                gr = get_gate_record(gate_request_id)
                record["gateRequestId"] = gate_request_id
                record["gateStatus"] = (gr or {}).get("status")
                record.update(
                    {
                        "ok": False,
                        "fail": "human_gate_not_approved",
                        "phase": "STOP",
                        "hint": "Use human_gate_cli_v1.py approve when status is pending",
                    }
                )
                record["patchResult"] = {
                    "ok": False,
                    "message": "human_gate_not_approved",
                    "skipped": "HUMAN_GATE_WAIT",
                }
                return record
        else:
            rid = create_pending_gate(
                card_name,
                {
                    "gitShaBefore": (sha_before or "").strip(),
                    "dryRun": dry_run,
                    "timestamp": ts,
                },
            )
            record["gateRequestId"] = rid
            record["patchResult"] = {
                "ok": False,
                "message": "human_judgement_required",
                "skipped": "HUMAN_GATE",
            }
            record.update(
                {
                    "ok": False,
                    "fail": "human_judgement_required",
                    "phase": "STOP",
                    "hint": "Approve via: python3 api/automation/human_gate_cli_v1.py approve "
                    + rid
                    + " --by <name> [--note ...]; then re-run with --gate-request-id "
                    + rid,
                }
            )
            return record

    pr = execute_patch(card, dry_run=dry_run, human_gate_bypass=human_bypass)
    record["patchResult"] = {"ok": pr.ok, "mode": pr.mode, "message": pr.message, "skipped": pr.skipped_reason}
    if pr.skipped_reason == "HUMAN_GATE":
        record.update({"ok": False, "fail": "human_judgement_required", "phase": "STOP"})
        return record

    # diff scope — enforced only when not dry-run (dry-run is observe-only / simulation)
    scope_ok, scope_detail = validate_diff_scope(card, changed)
    record["diffScope"] = scope_detail
    if not dry_run and not scope_ok:
        record.update({"ok": False, "fail": "forbidden_or_allowed_or_mixed", "phase": "STOP"})
        return record

    # BUILD / ACCEPTANCE (optional)
    record["phase"] = "ACCEPTANCE"
    acc_profile = card.get("acceptanceProfile", "build_only")
    steps = select_acceptance_steps(acc_profile)
    record["acceptancePlan"] = profile_to_dict_list(acc_profile)
    build_ok = True
    health_ok = True
    if execute_checks and not dry_run:
        for st in steps:
            if st.kind != "shell" or not st.command:
                continue
            code, out, err = run_cmd(st.command, repo_root)
            record.setdefault("acceptanceRuns", []).append(
                {"id": st.id, "exitCode": code, "stdoutTail": out[-2000:], "stderrTail": err[-2000:]}
            )
            if code != 0:
                build_ok = False
            if st.id == "curl_health" and code != 0:
                health_ok = False
    else:
        record["acceptanceSkipped"] = "dry_run_or_no_execute_checks"

    code1, sha_after, _ = run_cmd("git rev-parse HEAD", repo_root)
    record["gitShaAfter"] = (sha_after or "").strip() if code1 == 0 else ""
    record["ok"] = True
    record["phase"] = "NEXT" if card.get("nextOnPass") not in (None, "STOP") else "STOP"
    record["nextOnPass"] = card.get("nextOnPass")
    return record


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_RUNNER_V1")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--card", required=True, help="cardName from catalog")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--execute-checks", action="store_true", help="Run npm/curl acceptance commands")
    ap.add_argument(
        "--gate-request-id",
        default=None,
        help="If human gate was approved for this id, continue past PATCH",
    )
    args = ap.parse_args()

    root = args.repo_root or repo_root_from(Path.cwd())
    out = run_pipeline(
        card_name=args.card,
        repo_root=root,
        dry_run=args.dry_run,
        execute_checks=args.execute_checks,
        gate_request_id=args.gate_request_id,
    )
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
