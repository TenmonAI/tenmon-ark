#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1

TENMON_CLOSED_LOOP_FIXTURE_CURSOR_AUTO_V1 が ready/delivered で滞留している件を
released_fixture + ignored_fixture に落とし、主線 queue から退避（成功の捏造なし）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1"
TARGET_CURSOR_CARD = "TENMON_CLOSED_LOOP_FIXTURE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_fixture_drain_summary.json"
OUT_MD = "tenmon_fixture_drain_report.md"
RELEASE_STATE = "released_fixture"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def _is_target_fixture(it: dict[str, Any]) -> bool:
    if it.get("fixture") is not True:
        return False
    return str(it.get("cursor_card") or "").strip() == TARGET_CURSOR_CARD


def _should_drain(it: dict[str, Any]) -> bool:
    st = str(it.get("state") or "")
    if st not in ("ready", "delivered"):
        return False
    return _is_target_fixture(it)


def apply_closed_loop_fixture_drain(queue: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    queue を複製し対象 fixture を canonicalize。executed / 非対象には触れない。
    戻り値: (新 queue dict, stats dict)
    """
    items_in = queue.get("items") if isinstance(queue.get("items"), list) else []
    seen = 0
    drained_ids: list[str] = []
    new_items: list[Any] = []
    changed = False

    for it in items_in:
        if not isinstance(it, dict):
            new_items.append(it)
            continue
        if _is_target_fixture(it):
            seen += 1
        if _should_drain(it):
            it2 = dict(it)
            it2["state"] = RELEASE_STATE
            it2["ignored_fixture"] = True
            it2["released_at"] = _utc_iso()
            it2["release_reason"] = "fixture_drain_canonicalize_closed_loop"
            new_items.append(it2)
            qid = str(it2.get("id") or it2.get("job_id") or "")
            if qid:
                drained_ids.append(qid)
            changed = True
        else:
            new_items.append(it)

    base_schema = str(
        queue.get("state_schema") or "approval_required|ready|rejected|delivered|executed"
    )
    if RELEASE_STATE not in base_schema:
        base_schema = base_schema + "|" + RELEASE_STATE

    out_q = {
        "version": int(queue.get("version") or 1),
        "card": str(queue.get("card") or "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1"),
        "updatedAt": _utc_iso(),
        "items": new_items,
        "state_schema": base_schema,
    }

    stats = {
        "fixture_items_seen": seen,
        "fixture_items_drained": len(drained_ids),
        "drained_queue_ids": drained_ids,
        "queue_mutated": changed,
    }
    return out_q, stats


def _pending_count_excluding_released(items: list[Any]) -> int:
    pending_states = frozenset({"approval_required", "ready", "delivered"})
    n = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") == RELEASE_STATE:
            continue
        if it.get("ignored_fixture") is True:
            continue
        if str(it.get("state") or "") in pending_states:
            n += 1
    return n


def _run_single_flight_refresh(repo: Path) -> None:
    """queue 更新後に single-flight 状態を再計算。"""
    api = repo / "api"
    auto = api / "automation"
    target = auto / "tenmon_cursor_single_flight_queue_v1.py"
    if not target.is_file():
        return
    import subprocess

    subprocess.run(
        [sys.executable, str(target)],
        cwd=str(api),
        env={**os.environ, "TENMON_REPO_ROOT": str(repo)},
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--dry-run", action="store_true", help="集計のみで remote_cursor_queue.json は書かない")
    args = ap.parse_args()

    repo = (
        args.repo_root.resolve()
        if args.repo_root
        else Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    )
    auto = repo / "api" / "automation"
    qpath = auto / "remote_cursor_queue.json"
    auto.mkdir(parents=True, exist_ok=True)

    queue = _read_json(qpath)
    if not queue.get("items"):
        queue = {"version": 1, "items": [], "state_schema": "approval_required|ready|rejected|delivered|executed"}

    new_q, stats = apply_closed_loop_fixture_drain(queue)

    if not args.dry_run and stats.get("queue_mutated"):
        qpath.write_text(json.dumps(new_q, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        _run_single_flight_refresh(repo)

    items_after = new_q.get("items") if isinstance(new_q.get("items"), list) else []
    pending_after = _pending_count_excluding_released(items_after)

    sf_path = auto / "tenmon_cursor_single_flight_queue_state.json"
    sf = _read_json(sf_path)
    single_current = sf.get("current_card")
    single_next = sf.get("next_card")

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "target_cursor_card": TARGET_CURSOR_CARD,
        "fixture_items_seen": stats["fixture_items_seen"],
        "fixture_items_drained": stats["fixture_items_drained"],
        "drained_queue_ids": stats["drained_queue_ids"],
        "queue_pending_count_after_drain": pending_after,
        "single_flight_current_card_after_drain": single_current,
        "single_flight_next_card_after_drain": single_next,
        "queue_path": str(qpath),
        "dry_run": bool(args.dry_run),
        "queue_written": bool(not args.dry_run and stats.get("queue_mutated")),
        "notes": [
            "ready/delivered の CLOSED_LOOP fixture のみ released_fixture + ignored_fixture（executed 成功扱いにしない）。",
            "single_flight は tenmon_cursor_single_flight_queue_v1 を再実行して更新する。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- fixture_items_seen: `{summary['fixture_items_seen']}`",
        f"- fixture_items_drained: `{summary['fixture_items_drained']}`",
        f"- queue_pending_count_after_drain: `{pending_after}`",
        f"- single_flight_current_card_after_drain: `{single_current}`",
        f"- single_flight_next_card_after_drain: `{single_next}`",
        f"- dry_run: `{args.dry_run}`",
        "",
        "## drained_queue_ids",
        "",
    ]
    for qid in summary["drained_queue_ids"]:
        md.append(f"- `{qid}`")
    if not summary["drained_queue_ids"]:
        md.append("- _(none)_")
    md.append("")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False), file=sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
