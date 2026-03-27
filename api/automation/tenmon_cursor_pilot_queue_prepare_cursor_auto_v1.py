#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_PILOT_QUEUE_PREPARE_CURSOR_AUTO_V1

パイロット前に remote_cursor_queue.json を検証し、任意で current_run を 1 件に正規化する。
items の削除は行わない（single-flight / 履歴を壊さない）。

環境変数:
  TENMON_REPO_ROOT
  TENMON_PILOT_PREFERRED_CARD   例: TENMON_WORLDCLASS_FINAL_REASONING_DENSITY_CURSOR_AUTO_V1（allowlist 内で current_run を付与）
  TENMON_PILOT_ALLOWLIST      カンマ区切り（省略時は下記既定）
  TENMON_PILOT_PREPARE_REQUIRE_ALLOWLIST  1/true/yes のとき、current_run を付けたカードが allowlist に無ければ ok=false

--dry-run（既定）: ファイルは書かず JSON を stdout
--apply          : remote_cursor_queue.json を atomic 更新
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_PILOT_QUEUE_PREPARE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_pilot_queue_prepare_cursor_auto_v1.json"
QUEUE_NAME = "remote_cursor_queue.json"

DEFAULT_ALLOWLIST = (
    "TENMON_WORLDCLASS_FINAL_REASONING_DENSITY_CURSOR_AUTO_V1",
    "TENMON_REFLECTION_STACK_WORKTREE_CONVERGENCE_CURSOR_AUTO_V1",
)


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


def _allowlist() -> frozenset[str]:
    raw = (os.environ.get("TENMON_PILOT_ALLOWLIST") or "").strip()
    if raw:
        return frozenset(x.strip() for x in raw.split(",") if x.strip())
    return frozenset(DEFAULT_ALLOWLIST)


def _is_active_row(x: dict[str, Any]) -> bool:
    if x.get("fixture") is True:
        return False
    st = str(x.get("state") or "").lower()
    return st in ("ready", "queued", "running") and bool(x.get("cursor_card"))


def prepare(
    q: dict[str, Any],
    *,
    allow: frozenset[str],
    preferred: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """queue のコピーを返し、メタ dict を返す。"""
    out = json.loads(json.dumps(q))
    items = out.get("items")
    if not isinstance(items, list):
        out["items"] = []
        items = out["items"]

    rows = [x for x in items if isinstance(x, dict)]
    meta: dict[str, Any] = {
        "duplicate_current_run_before": False,
        "active_count": 0,
        "chosen_queue_id": None,
        "chosen_cursor_card": None,
    }

    cur_idx = [i for i, x in enumerate(rows) if x.get("current_run") is True]
    if len(cur_idx) > 1:
        meta["duplicate_current_run_before"] = True

    active = [x for x in rows if _is_active_row(x)]
    meta["active_count"] = len(active)

    for x in rows:
        x["current_run"] = False

    chosen_i: int | None = None
    chosen_card: str | None = None

    if preferred.strip():
        pref = preferred.strip()
        for i, x in enumerate(rows):
            if not _is_active_row(x):
                continue
            if str(x.get("cursor_card") or "") == pref and pref in allow:
                chosen_i = i
                chosen_card = pref
                break

    if chosen_i is None:
        for i, x in enumerate(rows):
            if not _is_active_row(x):
                continue
            cc = str(x.get("cursor_card") or "")
            if cc in allow:
                chosen_i = i
                chosen_card = cc
                break

    if chosen_i is None:
        for i, x in enumerate(rows):
            if _is_active_row(x):
                chosen_i = i
                chosen_card = str(x.get("cursor_card") or "")
                break

    if chosen_i is not None:
        rows[chosen_i]["current_run"] = True
        meta["chosen_queue_id"] = str(rows[chosen_i].get("id") or rows[chosen_i].get("job_id") or "")
        meta["chosen_cursor_card"] = chosen_card

    out["updatedAt"] = _utc()
    out["pilot_prepare_v1"] = {
        "card": CARD,
        "prepared_at": _utc(),
        "allowlist": sorted(allow),
    }
    return out, meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="remote_cursor_queue.json を更新")
    ap.add_argument("--dry-run", action="store_true", help="書き込まない（--apply が無い場合と同義）")
    args = ap.parse_args()
    do_apply = bool(args.apply and not args.dry_run)

    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    auto = repo / "api" / "automation"
    qpath = auto / QUEUE_NAME

    allow = _allowlist()
    preferred = (os.environ.get("TENMON_PILOT_PREFERRED_CARD") or "").strip()

    q = _read_json(qpath)
    if not q:
        out = {
            "ok": False,
            "card": CARD,
            "error": "missing_or_empty_queue",
            "next_card_if_fail": "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1",
            "generated_at": _utc(),
        }
        _atomic_write_json(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    new_q, meta = prepare(q, allow=allow, preferred=preferred)

    rows = [x for x in new_q.get("items", []) if isinstance(x, dict)]
    cur_n = sum(1 for x in rows if x.get("current_run") is True)
    active_n = len([x for x in rows if _is_active_row(x)])
    require_allow = (os.environ.get("TENMON_PILOT_PREPARE_REQUIRE_ALLOWLIST") or "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    ch = meta.get("chosen_cursor_card")
    ok = cur_n <= 1
    if require_allow and ch and ch not in allow:
        ok = False
    if active_n > 0 and cur_n != 1:
        ok = False

    result: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "pilot_queue_prepare_ready": bool(ok and cur_n == 1),
        "single_current_run": cur_n == 1,
        "duplicate_resolved": meta.get("duplicate_current_run_before") is True and cur_n <= 1,
        "active_item_count": meta.get("active_count"),
        "chosen_queue_id": meta.get("chosen_queue_id"),
        "chosen_cursor_card": meta.get("chosen_cursor_card"),
        "allowlist": sorted(allow),
        "rollback_used": False,
        "next_card_if_fail": None if ok else "TENMON_CURSOR_PILOT_QUEUE_PREPARE_TRACE_CURSOR_AUTO_V1",
        "generated_at": _utc(),
    }

    if meta.get("active_count", 0) > 2:
        result["warning"] = "active_items_gt_2_review_recommended"

    if do_apply:
        _atomic_write_json(qpath, new_q)
        _atomic_write_json(auto / OUT_JSON, result)
    else:
        _atomic_write_json(auto / OUT_JSON, {**result, "dry_run": True, "would_write_queue": True})

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
