#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_RESULT_BIND_TO_REJUDGE_AND_ACCEPTANCE_CURSOR_AUTO_V1

remote_cursor_result_bundle の current-run（non-fixture 最優先）を queue executed と照合し、
一致時のみ rejudge / scorecard を更新する。

TENMON_RESULT_BIND_LATEST_CURRENT_RUN_QUEUE_MATCH_FIX_CURSOR_AUTO_V1:
- fixture / 旧 watch 由来の current_run が混在しても、最新 non-fixture executor_session を決定的に選ぶ。
"""
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_RESULT_BIND_TO_REJUDGE_AND_ACCEPTANCE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json"
OUT_MD = "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_report.md"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_iso(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _queue_items_list(queue: dict[str, Any]) -> list[dict[str, Any]]:
    items = queue.get("items")
    if not isinstance(items, list):
        return []
    return [x for x in items if isinstance(x, dict)]


def match_queue_item_for_current_run_v1(entry: dict[str, Any], queue_items: list[dict[str, Any]]) -> dict[str, Any] | None:
    """queue_id → id → job_id の順で突合（既存 queue shape を壊さない）。"""
    qid = str(entry.get("queue_id") or "").strip()
    ejid = str(entry.get("job_id") or "").strip()
    if qid:
        for it in queue_items:
            if str(it.get("id") or "") == qid:
                return it
        for it in queue_items:
            if str(it.get("job_id") or "") == qid:
                return it
    if ejid:
        for it in queue_items:
            if str(it.get("id") or "") == ejid or str(it.get("job_id") or "") == ejid:
                return it
    return None


def pick_latest_current_run_entry_v1(
    entries: list[dict[str, Any]],
    queue_items: list[dict[str, Any]],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, int, list[str], str, list[str]]:
    """
    判定対象 entry を 1 件だけ選ぶ。
    優先: current_run + executor_session + queue_id あり → queue で fixture=false → ingested 最新 → executed 優先。
    fixture current-run は acceptance 選定から除外（件数のみ集計）。
    """
    blocked: list[str] = []
    ignored_ids: list[str] = []
    strategy = "none"

    cands: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        if e.get("current_run") is not True:
            continue
        if str(e.get("result_type") or "") != "executor_session":
            continue
        qid = str(e.get("queue_id") or "").strip()
        if not qid:
            continue
        cands.append(e)

    if not cands:
        blocked.append("no_current_run_executor_session_with_queue_id")
        return None, None, 0, ignored_ids, "no_candidates", blocked

    nonfixture_rows: list[tuple[dict[str, Any], dict[str, Any], datetime, bool]] = []
    for e in cands:
        it = match_queue_item_for_current_run_v1(e, queue_items)
        if it is None:
            continue
        fix = it.get("fixture")
        qid_key = str(it.get("id") or "")
        if fix is True:
            if qid_key and qid_key not in ignored_ids:
                ignored_ids.append(qid_key)
            continue
        if fix is not False:
            blocked.append(f"queue_fixture_unknown:queue_id={qid_key}")
            continue
        ing = _parse_iso(e.get("ingested_at")) or datetime.min.replace(tzinfo=timezone.utc)
        st_exec = str(it.get("state") or "") == "executed"
        nonfixture_rows.append((e, it, ing, st_exec))

    ignored_fixture_count = len(ignored_ids)

    if not nonfixture_rows:
        blocked.append("no_nonfixture_matched_current_run_entries")
        strategy = "no_nonfixture_after_fixture_filter"
        return None, None, ignored_fixture_count, ignored_ids, strategy, blocked

    # ingested 最新 → 同時刻は executed を優先
    nonfixture_rows.sort(
        key=lambda row: (row[2].timestamp(), row[3]),
        reverse=True,
    )
    best_e, best_it, _, _ = nonfixture_rows[0]
    strategy = "latest_nonfixture_executor_session_by_ingested_then_executed"
    return best_e, best_it, ignored_fixture_count, ignored_ids, strategy, blocked


def _run_py(script: Path, cwd: Path) -> dict[str, Any]:
    if not script.is_file():
        return {"ok": False, "exit_code": None, "error": "missing_script", "script": str(script), "skip": True}
    p = subprocess.run(
        ["python3", str(script)],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=600,
        check=False,
    )
    return {
        "ok": p.returncode == 0,
        "exit_code": p.returncode,
        "script": str(script),
        "stdout_tail": (p.stdout or "")[-2000:],
        "stderr_tail": (p.stderr or "")[-2000:],
        "skip": False,
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    queue = _read_json(auto / "remote_cursor_queue.json")
    bundle = _read_json(auto / "remote_cursor_result_bundle.json")
    world = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json")

    raw_entries = bundle.get("entries")
    entries_list = raw_entries if isinstance(raw_entries, list) else []
    queue_items = _queue_items_list(queue)

    latest_entry, matched_queue_item, ignored_fixture_count, ignored_fixture_queue_ids, match_strategy_used, pick_blocked = (
        pick_latest_current_run_entry_v1(entries_list, queue_items)
    )

    blocked_reason: list[str] = list(pick_blocked)

    latest_current_run_entry_found = latest_entry is not None
    lqid = str((latest_entry or {}).get("queue_id") or "")
    latest_current_run_queue_id = lqid
    latest_current_run_source = str((matched_queue_item or {}).get("source") or "") or None
    latest_current_run_fixture: bool | None = None
    latest_current_run_queue_state = str((matched_queue_item or {}).get("state") or "") if matched_queue_item else ""

    if matched_queue_item is not None:
        f = matched_queue_item.get("fixture")
        latest_current_run_fixture = True if f is True else (False if f is False else None)

    bundle_seen = latest_current_run_entry_found
    current_run_result_seen = bundle_seen

    current_run_queue_executed = False
    if latest_entry is not None and matched_queue_item is not None:
        q_e = str(latest_entry.get("queue_id") or "").strip()
        id_ok = q_e == str(matched_queue_item.get("id") or "").strip()
        job_ok = q_e == str(matched_queue_item.get("job_id") or "").strip()
        current_run_queue_executed = bool(
            latest_current_run_fixture is False
            and str(matched_queue_item.get("state") or "") == "executed"
            and (id_ok or job_ok)
        )

    if latest_entry and matched_queue_item and not current_run_queue_executed:
        blocked_reason.append("queue_id_and_executed_mismatch_or_not_executed")

    if not latest_current_run_entry_found:
        blocked_reason.append("latest_current_run_entry_not_selected")

    stale_sources_present = False
    stale_reasons: list[str] = []
    ent_at = _parse_iso((latest_entry or {}).get("ingested_at"))
    if current_run_result_seen and ent_at is not None:
        age = datetime.now(timezone.utc) - ent_at
        if age > timedelta(hours=24):
            stale_sources_present = True
            stale_reasons.append("current_run_bundle_entry_older_than_24h")
    elif not current_run_result_seen:
        stale_sources_present = True
        stale_reasons.append("no_eligible_current_run_entry_in_bundle")

    status_now = str((latest_entry or {}).get("status") or "")
    touched_now = (latest_entry or {}).get("touched_files")
    no_diff_now = (latest_entry or {}).get("no_diff_reason")
    build_rc_now = (latest_entry or {}).get("build_rc")
    acceptance_ok_now = (latest_entry or {}).get("acceptance_ok")
    real_now = bool((latest_entry or {}).get("dry_run") is False)
    touched_nonempty = isinstance(touched_now, list) and any(str(x).strip() for x in touched_now)
    touched_empty_with_reason = isinstance(touched_now, list) and len(touched_now) == 0 and bool(str(no_diff_now or "").strip())
    status_valid_for_real = status_now in {
        "started",
        "executor_failed",
        "completed_no_diff",
        "build_ok",
        "acceptance_ok",
    }
    latest_current_run_evidence_ok = bool(
        latest_current_run_entry_found
        and current_run_queue_executed
        and (
            (not real_now)
            or (
                status_valid_for_real
                and status_now != "dry_run_started"
                and (touched_nonempty or touched_empty_with_reason)
                and build_rc_now is not None
                and acceptance_ok_now is not None
            )
        )
    )

    rejudge_refreshed = False
    scorecard_refreshed = False
    rejudge_run: dict[str, Any] = {"ok": False, "skip": True, "reason": "gated_not_met"}
    score_run: dict[str, Any] = {"ok": False, "skip": True, "reason": "gated_not_met"}

    gate_ok = current_run_result_seen and current_run_queue_executed and not stale_sources_present and latest_current_run_evidence_ok
    if gate_ok:
        rejudge_run = _run_py(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py", api)
        rejudge_refreshed = bool(rejudge_run.get("ok"))
        score_run = _run_py(auto / "tenmon_worldclass_acceptance_scorecard_v1.py", api)
        score_now = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
        scorecard_refreshed = bool(score_now.get("generated_at")) and (score_run.get("exit_code") in (0, 1))

    rejudge_pending_but_result_bound = bool(
        current_run_queue_executed
        and not stale_sources_present
        and latest_current_run_evidence_ok
        and not rejudge_refreshed
        and rejudge_run.get("skip") is not True
    )

    rejudge_summary = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    scorecard = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")

    next_best_card = (
        rejudge_summary.get("recommended_next_card")
        or (world.get("outputs") or {}).get("next_best_card")
        or forensic.get("next_best_card")
    )

    queue_match = {
        "entry_queue_id": lqid,
        "entry_status": str((latest_entry or {}).get("status") or ""),
        "entry_ingested_at": (latest_entry or {}).get("ingested_at"),
        "matched_queue_id": str((matched_queue_item or {}).get("id") or ""),
        "matched_queue_job_id": str((matched_queue_item or {}).get("job_id") or ""),
        "matched_queue_state": latest_current_run_queue_state,
        "matched_queue_fixture": latest_current_run_fixture,
    }

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "bundle_seen": bundle_seen,
        "current_run_result_seen": current_run_result_seen,
        "latest_current_run_entry_found": latest_current_run_entry_found,
        "latest_current_run_queue_id": latest_current_run_queue_id or None,
        "latest_current_run_source": latest_current_run_source,
        "latest_current_run_fixture": latest_current_run_fixture,
        "latest_current_run_queue_state": latest_current_run_queue_state or None,
        "current_run_queue_executed": current_run_queue_executed,
        "latest_current_run_evidence_ok": latest_current_run_evidence_ok,
        "ignored_fixture_current_run_count": ignored_fixture_count,
        "ignored_fixture_queue_ids": ignored_fixture_queue_ids,
        "match_strategy_used": match_strategy_used,
        "blocked_reason": blocked_reason,
        "rejudge_refreshed": rejudge_refreshed,
        "scorecard_refreshed": scorecard_refreshed,
        "rejudge_pending_but_result_bound": rejudge_pending_but_result_bound,
        "stale_sources_present": stale_sources_present,
        "stale_reasons": stale_reasons,
        "next_best_card": next_best_card,
        "queue_match": queue_match,
        "latest_current_run_evidence": {
            "status": status_now,
            "status_valid_for_real": status_valid_for_real,
            "touched_nonempty": touched_nonempty,
            "touched_empty_with_reason": touched_empty_with_reason,
            "build_rc_non_null": build_rc_now is not None,
            "acceptance_ok_non_null": acceptance_ok_now is not None,
        },
        "rejudge_run": rejudge_run,
        "scorecard_run": score_run,
        "worldclass_score": scorecard.get("score_percent"),
        "inputs": {
            "remote_cursor_result_bundle": str(auto / "remote_cursor_result_bundle.json"),
            "remote_cursor_queue": str(auto / "remote_cursor_queue.json"),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        },
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **bundle_seen**: `{bundle_seen}`",
        f"- **current_run_queue_executed**: `{current_run_queue_executed}`",
        f"- **latest_current_run_evidence_ok**: `{latest_current_run_evidence_ok}`",
        f"- **match_strategy_used**: `{match_strategy_used}`",
        f"- ignored_fixture_current_run_count: `{ignored_fixture_count}`",
        f"- rejudge_refreshed: `{rejudge_refreshed}`",
        f"- scorecard_refreshed: `{scorecard_refreshed}`",
        f"- rejudge_pending_but_result_bound: `{rejudge_pending_but_result_bound}`",
        "",
        "## selected current-run entry",
        "",
        f"- queue_id: `{lqid}`",
        f"- ingested_at: `{(latest_entry or {}).get('ingested_at')}`",
        f"- status: `{(latest_entry or {}).get('status')}`",
        "",
        "## matched queue item",
        "",
        f"- id: `{queue_match.get('matched_queue_id')}`",
        f"- state: `{latest_current_run_queue_state}`",
        f"- fixture: `{latest_current_run_fixture}`",
        f"- source: `{latest_current_run_source}`",
        "",
        "## blocked_reason",
        "",
    ]
    for b in blocked_reason:
        md_lines.append(f"- {b}")
    if not blocked_reason:
        md_lines.append("- (none)")
    md_lines.extend(["", "## ignored fixture queue_ids", ""])
    for i in ignored_fixture_queue_ids[:40]:
        md_lines.append(f"- `{i}`")
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(auto / OUT_JSON),
                "current_run_queue_executed": current_run_queue_executed,
                "rejudge_refreshed": rejudge_refreshed,
                "rejudge_pending_but_result_bound": rejudge_pending_but_result_bound,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
