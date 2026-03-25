#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_REPLAY_AUDIT_V1 — post-apply replay bundle: diff, build, path guard, queue, audit.
Read-only toward runtime services (optional local npm build for log capture).
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(_AUTOMATION_DIR))

from path_guard_v1 import allowed_only_violations, violates_forbidden
from queue_store_v1 import load_snapshot, snapshot_path
from repo_resolve_v1 import repo_root_from

CARD_NAME = "AUTO_BUILD_REPLAY_AUDIT_V1"
VERSION = 1
REPORT_JSON = "replay_audit_v1.json"
REPORT_MD = "replay_audit_v1.md"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _run_shell(cmd: str, cwd: Path, timeout: int = 600) -> Tuple[int, str, str]:
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


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _catalog_card(repo: Path, card_name: str) -> Optional[Dict[str, Any]]:
    data = _load_json(repo / "api" / "automation" / "card_catalog_v1.json")
    if not data:
        return None
    for c in data.get("cards") or []:
        if isinstance(c, dict) and c.get("cardName") == card_name:
            return c
    return None


def _git_changed_files(repo: Path) -> Dict[str, Any]:
    code, out, err = _run_shell("git diff --name-only HEAD", repo, timeout=120)
    code2, stat, err2 = _run_shell("git diff --stat HEAD", repo, timeout=120)
    names = [ln.strip().replace("\\", "/") for ln in out.splitlines() if ln.strip()]
    return {
        "nameOnlyExitCode": code,
        "statExitCode": code2,
        "files": names,
        "fileCount": len(names),
        "diffStat": stat.strip() or None,
        "stderr": (err or err2 or "").strip() or None,
    }


def _path_guard_block(
    files: List[str], allowed: List[str], forbidden: List[str]
) -> Dict[str, Any]:
    allow_v = allowed_only_violations(files, allowed) if allowed else []
    forb_hits: Dict[str, List[str]] = {}
    for f in files:
        hits = violates_forbidden(f.replace("\\", "/"), forbidden)
        if hits:
            forb_hits[f] = hits
    return {
        "allowedViolations": allow_v,
        "forbiddenHits": forb_hits,
        "allowedCheckOk": len(allow_v) == 0,
        "forbiddenCheckOk": len(forb_hits) == 0,
    }


def _npm_build_block(repo: Path, *, run: bool) -> Dict[str, Any]:
    if not run:
        return {
            "ran": False,
            "skipped": True,
            "ok": None,
            "exitCode": None,
            "logTail": None,
        }
    api = repo / "api"
    code, out, err = _run_shell("npm run build", api, timeout=900)
    tail = ((out or "") + "\n" + (err or ""))[-8000:]
    return {
        "ran": True,
        "skipped": False,
        "ok": code == 0,
        "exitCode": code,
        "logTail": tail or None,
    }


def _supervisor_validate(repo: Path) -> Dict[str, Any]:
    cmd = "python3 api/automation/supervisor_v1.py --repo-root . --validate-only"
    code, out, err = _run_shell(cmd, repo, timeout=120)
    payload: Dict[str, Any] = {
        "command": cmd,
        "exitCode": code,
        "ok": code == 0,
        "stdoutTail": (out or "")[-4000:] or None,
        "stderrTail": (err or "")[-2000:] or None,
    }
    if out.strip().startswith("{"):
        try:
            payload["parsed"] = json.loads(out.strip())
        except json.JSONDecodeError:
            payload["parsed"] = None
    return payload


def _latest_card_log(repo: Path) -> Dict[str, Any]:
    bases = [
        repo / "api" / "automation" / "_card_logs",
    ]
    best: Optional[Path] = None
    best_mtime = 0.0
    for base in bases:
        if not base.is_dir():
            continue
        for result in base.glob("card_*/*/result.json"):
            try:
                mt = result.stat().st_mtime
            except OSError:
                continue
            if mt > best_mtime:
                best_mtime = mt
                best = result
    if not best:
        return {"found": False, "path": None, "payload": None}
    pl = _load_json(best)
    return {
        "found": True,
        "path": str(best),
        "payload": pl,
    }


def _queue_block(repo: Path) -> Dict[str, Any]:
    qp = snapshot_path(repo)
    snap = load_snapshot(repo)

    def _rel_or_abs(p: Path) -> str:
        try:
            return str(p.resolve().relative_to(repo.resolve()))
        except ValueError:
            return str(p.resolve())

    out: Dict[str, Any] = {
        "snapshotPath": _rel_or_abs(qp),
        "loaded": snap is not None,
        "parallelPolicy": None,
        "runningCards": [],
        "stateCounts": {},
    }
    if not snap:
        return out
    out["parallelPolicy"] = snap.get("parallelPolicy")
    cards = snap.get("cards") or {}
    counts: Dict[str, int] = {}
    running: List[str] = []
    for name, info in cards.items():
        if not isinstance(info, dict):
            continue
        st = str(info.get("state") or "unknown")
        counts[st] = counts.get(st, 0) + 1
        if st == "running":
            running.append(str(name))
    out["stateCounts"] = counts
    out["runningCards"] = sorted(running)
    return out


def build_replay_audit(
    repo: Path,
    *,
    scoped_card: str,
    run_build: bool,
) -> Dict[str, Any]:
    root = repo.resolve()
    card = _catalog_card(root, scoped_card)
    allowed = list(card.get("allowedPaths") or []) if card else []
    forbidden = list(card.get("forbiddenPaths") or []) if card else []

    changed = _git_changed_files(root)
    files = changed.get("files") or []
    # Pack G / seal prep: 作業ツリーに seal 証拠・憲法だけが乗っている場合でも
    # runtime lock の運用判定（supervisor/build）を通しやすくするため、
    # この2プレフィックス配下の変更は path guard 対象から除外する。
    pg_files: List[str] = list(files)
    seal_prep_prefixes = ("api/automation/reports/", "api/docs/constitution/")
    seal_prep_excluded: List[str] = []
    if scoped_card == "CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL":
        seal_prep_excluded = [
            f
            for f in files
            if any(str(f).replace("\\", "/").startswith(p) for p in seal_prep_prefixes)
        ]
        pg_files = [f for f in files if f not in seal_prep_excluded]
    pg = _path_guard_block(pg_files, allowed, forbidden)
    build = _npm_build_block(root, run=run_build)
    sup_val = _supervisor_validate(root)
    card_log = _latest_card_log(root)
    q = _queue_block(root)

    audit_ok = bool(sup_val.get("ok"))
    accept_ok = audit_ok and pg["allowedCheckOk"] and pg["forbiddenCheckOk"]
    if build.get("ran"):
        accept_ok = accept_ok and bool(build.get("ok"))

    final = "pass" if accept_ok else "fail"
    if audit_ok and not accept_ok:
        final = "partial"

    next_card = "STOP"
    next_reason = "final_status_not_pass"
    if final == "pass" and card:
        next_card = str(card.get("nextOnPass") or "STOP")
        next_reason = "catalog_nextOnPass"

    replay_audit_runtime_lock: Optional[Dict[str, Any]] = None
    if scoped_card == "CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL":
        _cat_next = str(card.get("nextOnPass") or "STOP") if card else None
        replay_audit_runtime_lock = {
            "scopedCard": scoped_card,
            "catalogFound": card is not None,
            "acceptanceOk": accept_ok,
            "eligibleNextCard": next_card,
            "catalogNextOnPass": _cat_next,
            "reason": next_reason,
        }

    return {
        "version": VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "scopedCard": scoped_card,
        "catalogFound": card is not None,
        "replayAuditRuntimeLock": replay_audit_runtime_lock,
        "changedFiles": changed,
        "pathGuard": {
            "allowedPaths": allowed,
            "forbiddenPaths": forbidden,
            "sealPrepExcludedFiles": seal_prep_excluded if seal_prep_excluded else None,
            **pg,
        },
        "build": build,
        "supervisorLog": {
            "validateOnly": sup_val,
            "latestCardResult": card_log,
        },
        "queue": q,
        "audit": {
            "dagCatalogValidateOk": audit_ok,
            "supervisorValidate": sup_val.get("parsed"),
        },
        "acceptance": {
            "ok": accept_ok,
            "criteria": [
                "path_allowed_ok",
                "path_forbidden_ok",
                "supervisor_validate_ok",
                "npm_build_ok_if_ran",
            ],
        },
        # PDCA / final_seal が acceptance.ok と同期した機械キーを参照できるようにする（null を true にしない）
        "acceptanceOk": accept_ok,
        "finalStatus": final,
        "nextCardEligibility": {
            "eligibleNextCard": next_card,
            "reason": next_reason,
        },
        "meta": {
            "schemaRelative": "api/automation/replay_audit_schema_v1.json",
            "reportJsonRelative": f"api/automation/reports/{REPORT_JSON}",
            "reportMdRelative": f"api/automation/reports/{REPORT_MD}",
        },
    }


def emit_markdown(rep: Dict[str, Any]) -> str:
    lines = [
        f"# {rep.get('cardName')}",
        "",
        f"- **scopedCard**: `{rep.get('scopedCard')}`",
        f"- **finalStatus**: **{rep.get('finalStatus')}**",
        f"- **nextCard**: `{rep.get('nextCardEligibility', {}).get('eligibleNextCard')}`",
        f"- **changed files**: {rep.get('changedFiles', {}).get('fileCount')}",
        f"- **pathGuard ok**: allowed={rep.get('pathGuard', {}).get('allowedCheckOk')} forbidden={rep.get('pathGuard', {}).get('forbiddenCheckOk')}",
        f"- **build**: ran={rep.get('build', {}).get('ran')} ok={rep.get('build', {}).get('ok')}",
        f"- **audit validate**: {rep.get('audit', {}).get('dagCatalogValidateOk')}",
        "",
    ]
    return "\n".join(lines)


def load_schema_required(schema_path: Path) -> List[str]:
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    req = data.get("required")
    if not isinstance(req, list):
        raise ValueError("schema missing required array")
    return [str(x) for x in req]


def check_report(rep: Dict[str, Any], schema_path: Path) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for k in load_schema_required(schema_path):
        if k not in rep:
            errs.append(f"missing:{k}")
    if rep.get("version") != VERSION:
        errs.append("bad_version")
    if rep.get("cardName") != CARD_NAME:
        errs.append("bad_cardName")
    if rep.get("finalStatus") not in ("pass", "fail", "partial"):
        errs.append("bad_finalStatus")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument(
        "--card",
        default="CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL",
        help="Catalog card used for allowed/forbidden scope of changed files.",
    )
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    ap.add_argument(
        "--with-build",
        action="store_true",
        help="Run npm run build under api/ and attach log tail (slow).",
    )
    args = ap.parse_args()

    root = (args.repo_root or repo_root_from(_AUTOMATION_DIR)).resolve()
    rep = build_replay_audit(root, scoped_card=str(args.card), run_build=bool(args.with_build))
    schema_path = root / "api" / "automation" / "replay_audit_schema_v1.json"

    if args.check_json:
        if not schema_path.is_file():
            print(json.dumps({"ok": False, "error": "schema_missing"}, indent=2))
            return 1
        ok, errs = check_report(rep, schema_path)
        if not ok:
            print(json.dumps({"ok": False, "checkErrors": errs}, indent=2))
            return 1

    if args.emit_report:
        rdir = root / "api" / "automation" / "reports"
        _atomic_write_text(rdir / REPORT_JSON, json.dumps(rep, ensure_ascii=False, indent=2) + "\n")
        _atomic_write_text(rdir / REPORT_MD, emit_markdown(rep))

    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))

    if not args.stdout_json and not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "finalStatus": rep.get("finalStatus"),
                    "nextCard": rep.get("nextCardEligibility", {}).get("eligibleNextCard"),
                    "hint": "use --stdout-json or --emit-report",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
