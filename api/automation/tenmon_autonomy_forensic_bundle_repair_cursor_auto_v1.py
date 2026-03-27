#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_FORENSIC_BUNDLE_REPAIR_CURSOR_AUTO_V1

欠損 forensic bundle を修復し、5 点束（audit/systemctl/journal/git/probe）を
present / absent_reason で固定。rollback_path JSON は変更しない。
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_FORENSIC_BUNDLE_REPAIR_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_CURSOR_OPERATOR_READINESS_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_forensic_bundle_repair_cursor_auto_v1.json"
NEXT_POINTER_JSON = "tenmon_autonomy_forensic_bundle_repair_next_card_v1.json"
ROLLBACK_PATH_JSON = "tenmon_autonomy_failclosed_rollback_path_v1.json"
LOG_DIR_SEGMENT = "forensic_bundle_repair_v1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_collect_evidence_bundle():
    p = Path(__file__).resolve().parent / "tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py"
    spec = importlib.util.spec_from_file_location("tenmon_fc_supervisor", p)
    if spec is None or spec.loader is None:
        raise ImportError("cannot load supervisor module")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.collect_evidence_bundle


def _resolve_evidence_root(repo: Path) -> Path:
    env = (os.environ.get("TENMON_AUTONOMY_FORENSIC_BUNDLE_ROOT") or "").strip()
    if env:
        root = Path(os.path.expanduser(env)).resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root
    rp = _read_json(repo / "api" / "automation" / ROLLBACK_PATH_JSON)
    d = str(rp.get("default_evidence_root") or "/var/log/tenmon/autonomy_failclosed_bundles")
    root = Path(d).expanduser().resolve()
    for candidate in (root, Path("/tmp/tenmon_autonomy_failclosed_bundles")):
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate.resolve()
        except OSError:
            continue
    raise OSError("no_writable_evidence_root")


def _slot(obj: Any, absent_if: str | None) -> dict[str, Any]:
    if obj is None:
        return {"present": False, "absent_reason": absent_if or "missing", "data": None}
    if isinstance(obj, dict) and obj.get("error"):
        return {
            "present": False,
            "absent_reason": "collector_command_error",
            "detail": str(obj.get("error")),
            "partial": obj,
        }
    return {"present": True, "data": obj}


def _build_five_point(raw: dict[str, Any]) -> dict[str, Any]:
    audit = raw.get("audit_probe")
    sysv = raw.get("systemctl_status")
    journal = raw.get("journal_tail")
    git_block = {
        "diff_stat": raw.get("git_diff_stat"),
        "diff": raw.get("git_diff"),
        "status": raw.get("git_status"),
    }
    probe = {
        "health_probe": raw.get("health_probe"),
        "probe_summary": raw.get("probe_summary"),
    }
    ds = _slot(git_block["diff_stat"], "git_diff_stat_missing")
    dd = _slot(git_block["diff"], "git_diff_missing")
    gs = _slot(git_block["status"], "git_status_missing")
    git_ok = all(
        (x.get("present") is True or bool(x.get("absent_reason"))) for x in (ds, dd, gs)
    )
    out = {
        "audit": _slot(audit, "audit_probe_missing"),
        "systemctl": _slot(sysv, "systemctl_status_missing"),
        "journal": _slot(journal, "journal_tail_missing"),
        "git": {
            "present": git_ok,
            **({"absent_reason": "git_subfield_incomplete"} if not git_ok else {}),
            "diff_stat": ds,
            "diff": dd,
            "status": gs,
        },
        "probe": _slot(probe, "probe_block_missing"),
    }
    return out


def _bundle_complete(five: dict[str, Any]) -> bool:
    for k in ("audit", "systemctl", "journal", "probe"):
        slot = five.get(k)
        if not isinstance(slot, dict):
            return False
        if slot.get("present") is not True and not slot.get("absent_reason"):
            return False
    g = five.get("git")
    if not isinstance(g, dict):
        return False
    for sk in ("diff_stat", "diff", "status"):
        sub = g.get(sk)
        if not isinstance(sub, dict):
            return False
        if sub.get("present") is not True and not str(sub.get("absent_reason") or "").strip():
            return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="bundle / pointer / OUT を書かない")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--base-url", default=os.environ.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--systemd-unit",
        default=os.environ.get("TENMON_VPS_ACCEPTANCE_UNIT", "tenmon-ark-api.service"),
    )
    args = ap.parse_args()
    repo = args.repo_root or _repo_root()
    auto = repo / "api" / "automation"
    rollback_used = False

    collect = _load_collect_evidence_bundle()
    raw = collect(
        repo,
        args.base_url,
        args.systemd_unit,
        False,
        False,
        False,
    )
    raw["card_repair"] = CARD
    raw["bundle_schema"] = "five_point_v2_with_absent_reason"

    five = _build_five_point(raw)
    repaired = {
        "version": 2,
        "card": CARD,
        "generated_at": _utc(),
        "log_dir_convention": f"{{evidence_root}}/{LOG_DIR_SEGMENT}/<ts>_<id>/repaired_bundle.json",
        "source_bundle_card": raw.get("card"),
        "five_point_bundle": five,
        "raw_collector": raw,
    }

    evidence_root: Path | None = None
    bundle_file: Path | None = None
    try:
        evidence_root = _resolve_evidence_root(repo)
        ts = _utc().replace(":", "").replace("-", "")
        bid = uuid.uuid4().hex[:8]
        bundle_file = evidence_root / LOG_DIR_SEGMENT / f"{ts}_{bid}" / "repaired_bundle.json"
    except OSError:
        bundle_file = None

    forensic_bundle_complete = _bundle_complete(five)
    evidence_pointer_ok = False

    if args.dry_run:
        evidence_pointer_ok = True
    elif bundle_file is not None:
        try:
            bundle_file.parent.mkdir(parents=True, exist_ok=True)
            _atomic_write_json(bundle_file, repaired)
            ptr = {
                "card": CARD,
                "generated_at": _utc(),
                "evidence_bundle_path": str(bundle_file),
                "evidence_root": str(evidence_root) if evidence_root else None,
                "next_on_pass_suggested": "TENMON_MAC_CURSOR_OPERATOR_READINESS_CURSOR_AUTO_V1",
                "next_card_if_fail": NEXT_ON_FAIL,
            }
            _atomic_write_json(auto / NEXT_POINTER_JSON, ptr)
            evidence_pointer_ok = bundle_file.is_file() and (auto / NEXT_POINTER_JSON).is_file()
        except OSError:
            evidence_pointer_ok = False

    ok = bool(forensic_bundle_complete and evidence_pointer_ok)
    if not args.dry_run and bundle_file is None:
        ok = False

    out: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "forensic_bundle_complete": forensic_bundle_complete,
        "evidence_pointer_ok": evidence_pointer_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
    }

    if not args.dry_run:
        try:
            _atomic_write_json(auto / OUT_JSON, out)
        except OSError:
            ok = False
            out["ok"] = False
            out["next_card_if_fail"] = NEXT_ON_FAIL

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
