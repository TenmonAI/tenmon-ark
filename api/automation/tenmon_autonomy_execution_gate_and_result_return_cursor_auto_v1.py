#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_EXECUTION_GATE_AND_RESULT_RETURN_CURSOR_AUTO_V1

`TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1` 後の最終段: master の安定軸（conversation_core 等）を検証し、
result bundle を safe summary へ返却（コピー）し、execution_gate_snapshot_v1 / 要約 JSON を更新する。

- STEP0: `tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json`（なければ failclosed master）で
  conversation_core / knowledge_circulation / execution_gate / queue / rollback / forensic がすべて true か検証。
- STEP1: audit（bundle または bridge JSON）、result return（要約 + bundle コピー）、next_card（policy 橋渡し）。
- fail-closed: 前提未達時は書き込みスキップ。`TENMON_PDCA_SKIP_PROBES` は本スクリプトでは設定しない。

execution gate（build / audit / probe のみ strict success）と result return（repo 外安全パスへ要約、親ディレクトリ自動作成）。
dry_run_started / blocked / failed / success を正規化。result bundle に execution_gate_snapshot_v1（status, card,
started_at, ended_at, summary_path, next_card）と current_run 正規化を付与。--apply で bundle 更新。
カタログと policy の nextOnPass/nextOnFail 一致で next_card 橋渡し。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_auto_here = Path(__file__).resolve().parent
if str(_auto_here) not in sys.path:
    sys.path.insert(0, str(_auto_here))

from tenmon_autonomy_execution_gate_summary_helpers_v1 import (
    bridge_next_card,
    execution_gate_snapshot_v1,
    extract_started_ended,
)

CARD = "TENMON_AUTONOMY_EXECUTION_GATE_AND_RESULT_RETURN_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1"
NEXT_ON_PASS_DEFAULT = "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_execution_gate_and_result_return_cursor_auto_v1.json"
BUNDLE_NAME = "remote_cursor_result_bundle.json"
QUEUE_NAME = "remote_cursor_queue.json"
MASTER_FULL_JSON = "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.json"
MASTER_FALLBACK_JSON = "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.json"
STABLE_MASTER_KEYS = (
    "conversation_core_completed",
    "knowledge_circulation_connected",
    "execution_gate_ready",
    "queue_ready",
    "rollback_ready",
    "forensic_ready",
)
PREREQ_FAIL_NEXT = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"

DEFAULT_EXEC_POLICY: dict[str, Any] = {
    "version": 1,
    "card": CARD,
    "nextOnPass": NEXT_ON_PASS_DEFAULT,
    "nextOnFail": NEXT_ON_FAIL,
    "success_requires": ["build_pass", "audit_pass", "probe_pass"],
    "status_labels": ["success", "failed", "dry_run_started", "blocked"],
}


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


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _is_under_repo(repo: Path, p: Path) -> bool:
    try:
        rp = repo.resolve()
        pp = p.resolve()
        return rp == pp or rp in pp.parents
    except Exception:
        return True


def _allow_repo_relative_summary() -> bool:
    v = (os.environ.get("TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY") or "").strip().lower()
    return v in ("1", "true", "yes")


def _resolve_safe_summary_root(repo: Path) -> tuple[Path, str]:
    env = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if env:
        root = Path(os.path.expanduser(env)).resolve()
        if _is_under_repo(repo, root) and not _allow_repo_relative_summary():
            raise OSError(
                "unsafe_summary_path: TENMON_AUTONOMY_SAFE_SUMMARY_ROOT is under repo "
                "(set TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY=1 to opt-in)",
            )
        root.mkdir(parents=True, exist_ok=True)
        return root, "env:TENMON_AUTONOMY_SAFE_SUMMARY_ROOT"
    candidates: list[tuple[Path, str]] = [
        (Path("/var/log/tenmon/autonomy_summaries"), "default:/var/log/tenmon/autonomy_summaries"),
        (Path.home() / ".cache" / "tenmon_autonomy_summaries", "default:~/.cache/tenmon_autonomy_summaries"),
        (Path("/tmp/tenmon_autonomy_summaries"), "default:/tmp/tenmon_autonomy_summaries"),
    ]
    for root, tag in candidates:
        try:
            root.mkdir(parents=True, exist_ok=True)
        except OSError:
            continue
        if not _is_under_repo(repo, root):
            return root.resolve(), tag
    raise OSError("no writable safe summary root outside repo")


def _build_rc(e: dict[str, Any]) -> Any:
    if e.get("build_rc") is not None:
        return e.get("build_rc")
    br = e.get("build_result")
    if isinstance(br, dict) and "rc" in br:
        return br.get("rc")
    return None


def _build_pass(e: dict[str, Any]) -> bool:
    rc = _build_rc(e)
    return rc == 0


def _audit_pass(e: dict[str, Any]) -> bool:
    if e.get("file_guard_ok") is not True:
        return False
    fb = e.get("file_guard_blocked")
    if isinstance(fb, list) and len(fb) > 0:
        return False
    return True


def _probe_pass(e: dict[str, Any]) -> bool:
    st = str(e.get("status") or "").lower()
    if st in ("blocked", "executor_failed"):
        return False
    dgr = e.get("dangerous_patch_block_report")
    if dgr is None:
        return True
    if isinstance(dgr, str) and dgr.strip():
        p = Path(dgr.replace("\\", "/"))
        if p.is_file():
            try:
                raw = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(raw, dict) and raw.get("blocked") is True:
                    return False
            except Exception:
                return False
    return True


def _normalized_outcome_label(e: dict[str, Any]) -> str:
    st = str(e.get("status") or "").lower()
    if st == "dry_run_started" or e.get("dry_run") is True:
        return "dry_run_started"
    if st == "blocked":
        return "blocked"
    if st in ("executor_failed", "failed") or st.endswith("_failed"):
        return "failed"
    if _build_pass(e) and _audit_pass(e) and _probe_pass(e):
        return "success"
    return "failed"


def _gate_success_strict(e: dict[str, Any]) -> bool:
    st = str(e.get("status") or "").lower()
    if st == "dry_run_started":
        return False
    if e.get("dry_run") is True:
        return False
    if st in ("blocked", "executor_failed"):
        return False
    return _build_pass(e) and _audit_pass(e) and _probe_pass(e)


def _latest_current_run_entry(entries: list[Any]) -> dict[str, Any] | None:
    cur: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        if e.get("current_run") is not True:
            continue
        if e.get("fixture") is True:
            continue
        cur.append(e)
    if not cur:
        return None

    def _ts(x: dict[str, Any]) -> str:
        return str(x.get("ingested_at") or x.get("ingestedAt") or "")

    cur.sort(key=_ts)
    return cur[-1]


def _enrich_entry(e: dict[str, Any]) -> dict[str, Any]:
    out = dict(e)
    norm = _normalized_outcome_label(e)
    out["execution_gate"] = {
        "build_pass": _build_pass(e),
        "audit_pass": _audit_pass(e),
        "probe_pass": _probe_pass(e),
        "gate_success": _gate_success_strict(e),
    }
    out["normalized_status"] = norm
    out["outcome"] = norm
    sa, ea = extract_started_ended(out)
    if sa and not out.get("started_at"):
        out["started_at"] = sa
    if ea and not out.get("ended_at"):
        out["ended_at"] = ea
    return out


def _enrich_entry_with_return(
    e: dict[str, Any],
    *,
    summary_path_str: str | None,
    next_card: str | None,
) -> dict[str, Any]:
    out = _enrich_entry(e)
    out["card"] = CARD
    if summary_path_str:
        out["summary_path"] = summary_path_str
    if next_card:
        out["next_card"] = next_card
    out["result_return"] = {
        "blocked": summary_path_str is None,
        "reason": None if summary_path_str else "no_safe_summary_write",
    }
    return out


def _merge_exec_policy(existing: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(DEFAULT_EXEC_POLICY)
    if isinstance(existing, dict):
        for k, v in existing.items():
            if v is not None and v != "":
                merged[k] = v
    for req in ("nextOnPass", "nextOnFail"):
        if not str(merged.get(req) or "").strip():
            merged[req] = DEFAULT_EXEC_POLICY[req]
    return merged


def _read_stable_master(auto: Path) -> tuple[Path, dict[str, Any]]:
    p1 = auto / MASTER_FULL_JSON
    j1 = _read_json(p1)
    if j1:
        return p1, j1
    p2 = auto / MASTER_FALLBACK_JSON
    return p2, _read_json(p2)


def _stable_prereq_ok(m: dict[str, Any]) -> tuple[bool, list[str]]:
    miss = [k for k in STABLE_MASTER_KEYS if m.get(k) is not True]
    return len(miss) == 0, miss


def _queued_cards(queue: dict[str, Any]) -> list[str]:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    out: list[str] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        cc = str(it.get("cursor_card") or it.get("card") or "").strip()
        if cc:
            out.append(cc)
    return out


def _audit_pass_from_bundle(bundle: dict[str, Any]) -> bool:
    for key in ("latest_current_run_entry", "current_run_entry"):
        e = bundle.get(key)
        if not isinstance(e, dict):
            continue
        eg = e.get("execution_gate")
        if not isinstance(eg, dict):
            continue
        if eg.get("audit_pass") is not True:
            continue
        if eg.get("gate_success") is True:
            return True
        if int(e.get("gate_retry_count") or 0) > 0:
            return True
        if float(e.get("gate_wait_seconds") or 0) > 0:
            return True
    return False


def _bridge_audit_ok(auto: Path) -> bool:
    br = _read_json(auto / "tenmon_cursor_operator_autonomy_bridge_cursor_auto_v1.json")
    return br.get("ok") is True and br.get("execution_gate_ready") is True


def _copy_bundle_return(bundle_path: Path, safe_root: Path, gen_at: str) -> str | None:
    slug = gen_at.replace(":", "").replace("-", "")
    dst = safe_root / f"remote_cursor_result_bundle_returned_{slug}.json"
    try:
        shutil.copy2(bundle_path, dst)
        return str(dst)
    except OSError:
        return None


def _dedupe_current_run_flags(entries: list[Any]) -> tuple[list[Any], bool]:
    """非 fixture の current_run を最新 ingested_at の 1 件だけに収束。"""
    idx_map: list[tuple[int, dict[str, Any], str]] = []
    for i, e in enumerate(entries):
        if not isinstance(e, dict) or e.get("fixture") is True:
            continue
        if e.get("current_run") is not True:
            continue
        ts = str(e.get("ingested_at") or e.get("ingestedAt") or "")
        idx_map.append((i, e, ts))
    if len(idx_map) <= 1:
        return entries, False
    idx_map.sort(key=lambda x: x[2])
    keep_i = idx_map[-1][0]
    out: list[Any] = []
    changed = False
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            out.append(e)
            continue
        if e.get("fixture") is True:
            out.append(e)
            continue
        ne = dict(e)
        if ne.get("current_run") is True and i != keep_i:
            ne["current_run"] = False
            ne["current_run_deduped_by"] = CARD
            changed = True
        out.append(ne)
    return out, changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="bundle / 要約 / OUT_JSON を書かない")
    ap.add_argument("--apply", action="store_true", help="bundle に policy / current_run 正規化を書き込む")
    ap.add_argument("--repo-root", type=Path, default=None)
    args = ap.parse_args()
    repo = args.repo_root or _repo_root_from_here()
    auto = repo / "api" / "automation"
    bundle_path = auto / BUNDLE_NAME
    rollback_used = False

    bundle = _read_json(bundle_path)
    queue = _read_json(auto / QUEUE_NAME)
    queued_cards_list = _queued_cards(queue)
    master_path, master = _read_stable_master(auto)
    prereq_ok, prereq_missing = _stable_prereq_ok(master)
    audit_pass_after_retry = _audit_pass_from_bundle(bundle) or _bridge_audit_ok(auto)

    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    raw_policy = bundle.get("autonomy_execution_gate_policy_v1")
    policy = _merge_exec_policy(raw_policy if isinstance(raw_policy, dict) else None)
    policy_ok = int(policy.get("version") or 0) >= 1

    if args.apply and not args.dry_run and prereq_ok:
        entries, _deduped = _dedupe_current_run_flags(entries)

    latest = _latest_current_run_entry([e for e in entries if isinstance(e, dict)])
    current = latest
    enriched_latest = _enrich_entry(latest) if latest else None

    execution_gate_ready = policy_ok and (enriched_latest is None or isinstance(enriched_latest.get("execution_gate"), dict))

    catalog = _read_json(auto / "card_catalog_v1.json")
    cat_next_pass: str | None = None
    cat_next_fail: str | None = None
    for c in catalog.get("cards") if isinstance(catalog.get("cards"), list) else []:
        if isinstance(c, dict) and c.get("cardName") == CARD:
            cat_next_pass = str(c.get("nextOnPass") or "").strip() or None
            cat_next_fail = str(c.get("nextOnFail") or "").strip() or None
            break
    next_card_bridge_ok = bool(
        cat_next_pass
        and cat_next_fail
        and str(policy.get("nextOnPass") or "") == str(cat_next_pass)
        and str(policy.get("nextOnFail") or "") == str(cat_next_fail)
    )

    result_return_ready = policy_ok and bool((policy or {}).get("nextOnFail")) and bool((policy or {}).get("nextOnPass"))

    safe_root: Path | None = None
    safe_tag = ""
    safe_summary_write_ok = False
    summary_path: Path | None = None
    summary_path_str: str | None = None
    gen_at = _utc_iso()

    try:
        safe_root, safe_tag = _resolve_safe_summary_root(repo)
        safe_summary_write_ok = not _is_under_repo(repo, safe_root)
        summary_path = safe_root / f"{CARD}_summary.json"
    except OSError:
        safe_summary_write_ok = False

    npass = str(policy.get("nextOnPass") or "").strip()
    next_c = bridge_next_card(policy, enriched_latest)
    leg0 = bundle.get("latest_current_run_entry")
    if isinstance(leg0, dict):
        eg0 = leg0.get("execution_gate")
        if (
            isinstance(eg0, dict)
            and eg0.get("gate_success") is True
            and prereq_ok
            and audit_pass_after_retry
        ):
            if npass:
                next_c = npass
    if prereq_ok and audit_pass_after_retry and npass:
        next_c = npass

    env_safe = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    safe_summary_env_match = False
    if env_safe and safe_root:
        try:
            safe_summary_env_match = Path(env_safe).resolve() == Path(safe_root).resolve()
        except OSError:
            safe_summary_env_match = False

    bundle_return_path: str | None = None

    if args.dry_run:
        summary_path_str = str(summary_path) if summary_path and safe_summary_write_ok else None
    elif not prereq_ok:
        summary_path_str = None
    elif summary_path is not None and safe_summary_write_ok:
        try:
            snap_w = execution_gate_snapshot_v1(
                card=CARD,
                enriched_latest=enriched_latest,
                policy=policy,
                summary_path=str(summary_path),
                generated_at=gen_at,
            )
            summary_obj = {
                "card": CARD,
                "generated_at": gen_at,
                "safe_summary_root": str(safe_root),
                "safe_summary_root_source": safe_tag,
                "latest_queue_id": (latest or {}).get("queue_id"),
                "normalized_status": enriched_latest.get("normalized_status") if enriched_latest else None,
                "outcome": enriched_latest.get("outcome") if enriched_latest else None,
                "execution_gate": enriched_latest.get("execution_gate") if enriched_latest else None,
                "nextOnPass": (policy or {}).get("nextOnPass"),
                "nextOnFail": (policy or {}).get("nextOnFail"),
                "snapshot": snap_w,
                "next_card": next_c,
            }
            _atomic_write_json(summary_path, summary_obj)
            summary_path_str = str(summary_path)
        except OSError:
            safe_summary_write_ok = False
            summary_path_str = None

    snapshot = execution_gate_snapshot_v1(
        card=CARD,
        enriched_latest=enriched_latest,
        policy=policy,
        summary_path=summary_path_str,
        generated_at=gen_at,
    )

    enriched_latest_full = (
        _enrich_entry_with_return(latest, summary_path_str=summary_path_str, next_card=next_c)
        if latest
        else None
    )

    result_bundle_update_ok = bool(policy_ok and isinstance(entries, list) and bundle_path.is_file())
    result_bundle_updated = False
    if args.apply and not args.dry_run and prereq_ok:
        if not bundle_path.is_file():
            result_bundle_update_ok = False
        else:
            try:
                b2 = dict(bundle)
                b2["entries"] = entries
                b2["autonomy_execution_gate_policy_v1"] = policy
                b2["current_run_entry"] = enriched_latest_full
                b2["latest_current_run_entry"] = enriched_latest_full
                b2["execution_gate_snapshot_v1"] = snapshot
                b2["updatedAt"] = gen_at
                _atomic_write_json(bundle_path, b2)
                result_bundle_update_ok = True
                result_bundle_updated = True
                if safe_root is not None:
                    bundle_return_path = _copy_bundle_return(bundle_path, safe_root, gen_at)
            except OSError:
                result_bundle_update_ok = False
                result_bundle_updated = False
                rollback_used = True
    elif args.apply and not args.dry_run and not prereq_ok:
        result_bundle_update_ok = False

    ok = (
        prereq_ok
        and audit_pass_after_retry
        and execution_gate_ready
        and result_return_ready
        and result_bundle_update_ok
        and safe_summary_write_ok
        and next_card_bridge_ok
    )

    next_fail: str | None = None
    if not ok:
        next_fail = npass or (PREREQ_FAIL_NEXT if not prereq_ok else NEXT_ON_FAIL)
        if next_fail:
            next_c = next_fail

    out_min: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "prereq_ok": prereq_ok,
        "prereq_missing_axes": prereq_missing,
        "master_json": str(master_path.name),
        "execution_gate_ready": execution_gate_ready,
        "result_return_ready": result_return_ready,
        "audit_pass_after_retry": audit_pass_after_retry,
        "result_bundle_update_ok": result_bundle_update_ok,
        "result_bundle_updated": result_bundle_updated,
        "bundle_return_path": bundle_return_path,
        "queued_cards": queued_cards_list,
        "next_card": next_c,
        "safe_summary_write_ok": safe_summary_write_ok,
        "safe_summary_env_match": safe_summary_env_match,
        "safe_summary_root_resolved": str(safe_root) if safe_root else None,
        "next_card_bridge_ok": next_card_bridge_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": next_fail,
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
