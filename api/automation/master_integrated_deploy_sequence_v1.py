#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_CURSOR_AUTO_V1
7 子カードを依存順で束ねるマスター統合投入キャンペーン（親オーケストレータ）。
"""
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

CARD = "TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_CURSOR_AUTO_V1"
FAIL_NEXT = "TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_RETRY_CURSOR_AUTO_V1"

MANIFEST_NAME = "master_integrated_deploy_sequence_manifest.json"
PROGRESS_NAME = "master_integrated_deploy_sequence_progress.json"
SUMMARY_NAME = "master_integrated_deploy_sequence_summary.json"
BLOCKERS_NAME = "master_integrated_deploy_sequence_blockers.json"
DELTA_NAME = "integrated_readiness_delta.json"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _auto_dir() -> Path:
    return _repo_root() / "api" / "automation"


def _out_campaign_dir() -> Path:
    return _auto_dir() / "out" / "tenmon_master_integrated_deploy_sequence_v1"


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _rel_exists(repo: Path, rel: str) -> bool:
    p = (repo / rel).resolve()
    try:
        p.relative_to(repo.resolve())
    except ValueError:
        return False
    return p.is_file()


def load_manifest() -> Dict[str, Any]:
    return _read_json(_auto_dir() / MANIFEST_NAME)


def default_progress(manifest: Dict[str, Any]) -> Dict[str, Any]:
    cards: Dict[str, Any] = {}
    order = manifest.get("execution_order") or []
    meta = manifest.get("cards") or {}
    for name in order:
        spec = meta.get(name) or {}
        cards[name] = {
            "status": "pending",
            "blocked_by": [],
            "result_bundle_path": None,
            "fail_next_card": spec.get("fail_next"),
            "notes": "",
            "updated_at": _utc(),
        }
    return {
        "version": 1,
        "campaign": manifest.get("campaign"),
        "updated_at": _utc(),
        "readiness_snapshot_previous": None,
        "cards": cards,
    }


def merge_progress(progress: Dict[str, Any], manifest: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure new cards from manifest exist in progress."""
    meta = manifest.get("cards") or {}
    cards = progress.setdefault("cards", {})
    for name, spec in meta.items():
        if name not in cards:
            cards[name] = {
                "status": "pending",
                "blocked_by": [],
                "result_bundle_path": None,
                "fail_next_card": spec.get("fail_next"),
                "notes": "",
                "updated_at": _utc(),
            }
    progress["updated_at"] = _utc()
    return progress


def ensure_child_stub(repo: Path, card_name: str, order: int, manifest: Dict[str, Any]) -> Dict[str, Any]:
    gen = repo / "api" / "automation" / "generated_cursor_apply" / f"{card_name}.md"
    if gen.is_file():
        return {"path": str(gen), "created": False}
    spec = (manifest.get("cards") or {}).get(card_name) or {}
    title = spec.get("title") or card_name
    body = f"""# CARD_NAME: {card_name}

OBJECTIVE:
{title}（マスター統合投入キャンペーンの第 {order} 段）

WHY_NOW:
親キャンペーン `TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_CURSOR_AUTO_V1` から起票。
依存関係と安全順は `api/automation/master_integrated_deploy_sequence_manifest.json` を参照。

EDIT_SCOPE:
- api/automation/**
- api/scripts/**
- api/docs/constitution/**
- （子カード固有の scope をここに追記）

DO_NOT_TOUCH:
- dist/**
- api/src/routes/chat.ts
- /api/chat 契約
- DB schema の強変更
- kokuzo_pages 正文
- systemd env 内容
- 一般ユーザー向け chat UI
- production deploy 自動化
- 危険ファイルへの無差別自動改変

IMPLEMENTATION_POLICY:
- このカード単体の acceptance を満たすこと
- 成果物は `api/automation/out/tenmon_master_integrated_deploy_sequence_v1/cards/{card_name}/` に result bundle を置く
- FAIL 時は FAIL_NEXT_CARD を生成

ACCEPTANCE:
- （子カード実装時に具体化）

FAIL_NEXT_CARD:
{spec.get("fail_next") or "TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_RETRY_CURSOR_AUTO_V1"}
"""
    gen.parent.mkdir(parents=True, exist_ok=True)
    gen.write_text(body, encoding="utf-8")
    return {"path": str(gen), "created": True}


def ensure_all_child_stubs(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    repo = _repo_root()
    out: List[Dict[str, Any]] = []
    order = manifest.get("execution_order") or []
    meta = manifest.get("cards") or {}
    for i, name in enumerate(order, start=1):
        spec = meta.get(name) or {}
        o = spec.get("order") or i
        out.append(ensure_child_stub(repo, name, o, manifest))
    return out


def snapshot_readiness(repo: Path) -> Dict[str, Any]:
    """軽量スナップショット（既存ファイルがあれば取り込む）。"""
    fm = _read_json(repo / "api" / "automation" / "final_master_readiness.json")
    if fm:
        return {"source": "final_master_readiness.json", "payload": fm}
    matrix = _read_json(repo / "api" / "automation" / "out" / "subsystem_readiness_matrix.json")
    if matrix:
        return {"source": "subsystem_readiness_matrix.json", "payload": matrix}
    e2e = _read_json(repo / "api" / "automation" / "out" / "admin_remote_build_end_to_end_verdict.json")
    if e2e:
        return {"source": "admin_remote_build_end_to_end_verdict.json", "payload": e2e}
    return {"source": "none", "payload": {"overall_system_readiness": None}}


def compute_readiness_delta(
    previous: Optional[Dict[str, Any]], current: Dict[str, Any]
) -> Dict[str, Any]:
    prev_ov = None
    if previous and isinstance(previous.get("payload"), dict):
        prev_ov = previous["payload"].get("overall_master_readiness")
    if prev_ov is None and previous and isinstance(previous.get("payload"), dict):
        prev_ov = previous["payload"].get("overall_system_readiness")
    cur_pl = current.get("payload") if isinstance(current.get("payload"), dict) else {}
    cur_ov = cur_pl.get("overall_master_readiness")
    if cur_ov is None:
        cur_ov = cur_pl.get("overall_system_readiness")
    delta = 0
    if isinstance(prev_ov, (int, float)) and isinstance(cur_ov, (int, float)):
        delta = int(cur_ov) - int(prev_ov)
    return {
        "version": 1,
        "generated_at": _utc(),
        "previous_snapshot": previous,
        "current_snapshot": current,
        "delta_vs_previous": {
            "overall_master_readiness_delta": delta,
            "notes": "baseline は初回 null または前回 progress の readiness_snapshot_previous",
        },
    }


def _reconcile_one_pass(
    manifest: Dict[str, Any], cards: Dict[str, Any], order: List[str], repo: Path
) -> bool:
    """依存解消 → optional acceptance。変化があれば True。"""
    meta = manifest.get("cards") or {}
    changed = False
    completed = {n for n, v in cards.items() if v.get("status") == "completed"}
    failed = {n for n, v in cards.items() if v.get("status") == "failed"}

    for name in order:
        c = cards.get(name) or {}
        if c.get("status") in ("failed", "completed"):
            continue
        spec = meta.get(name) or {}
        deps = spec.get("depends_on") or []
        dep_failed = sorted({d for d in deps if d in failed})
        missing = [d for d in deps if d not in completed]
        old = c.get("status")
        if dep_failed:
            c["status"] = "blocked_by_dependency"
            c["blocked_by"] = dep_failed
        elif missing:
            c["status"] = "blocked_by_dependency"
            c["blocked_by"] = missing
        else:
            c["status"] = "pending"
            c["blocked_by"] = []
        if old != c.get("status"):
            changed = True
        c["updated_at"] = _utc()
        cards[name] = c

    completed = {n for n, v in cards.items() if v.get("status") == "completed"}

    for name in order:
        c = cards.get(name) or {}
        if c.get("status") in ("failed", "completed", "blocked_by_dependency"):
            continue
        spec = meta.get(name) or {}
        paths = spec.get("optional_acceptance_paths") or []
        old = c.get("status")
        if paths and all(_rel_exists(repo, p) for p in paths):
            c["status"] = "completed"
            c["blocked_by"] = []
            c["notes"] = (c.get("notes") or "") + " auto: optional_acceptance_paths satisfied."
            if old != "completed":
                changed = True
        c["updated_at"] = _utc()
        cards[name] = c

    return changed


def reconcile(
    manifest: Dict[str, Any], progress: Dict[str, Any], repo: Path
) -> Dict[str, Any]:
    order = manifest.get("execution_order") or []
    cards = progress.get("cards") or {}
    for _ in range(12):
        if not _reconcile_one_pass(manifest, cards, order, repo):
            break
    progress["cards"] = cards
    progress["updated_at"] = _utc()
    return progress


def build_summary(
    manifest: Dict[str, Any], progress: Dict[str, Any], delta: Dict[str, Any]
) -> Dict[str, Any]:
    order = manifest.get("execution_order") or []
    cards = progress.get("cards") or {}
    completed_cards = [n for n in order if cards.get(n, {}).get("status") == "completed"]
    failed_cards = [n for n in order if cards.get(n, {}).get("status") == "failed"]
    pending_cards = [n for n in order if cards.get(n, {}).get("status") == "pending"]
    blocked = [n for n in order if cards.get(n, {}).get("status") == "blocked_by_dependency"]
    next_priority: List[str] = []
    for n in order:
        st = cards.get(n, {}).get("status")
        if st == "pending":
            next_priority.append(n)
        if len(next_priority) >= 3:
            break
    if not next_priority and failed_cards:
        next_priority = [manifest.get("fail_next_campaign") or FAIL_NEXT]

    return {
        "version": 1,
        "campaign": manifest.get("campaign"),
        "generated_at": _utc(),
        "completed_cards": completed_cards,
        "failed_cards": failed_cards,
        "pending_cards": pending_cards,
        "blocked_by_dependency": blocked,
        "integrated_readiness_delta": delta,
        "next_priority_cards": next_priority,
        "execution_order": order,
    }


def build_blockers(manifest: Dict[str, Any], progress: Dict[str, Any]) -> Dict[str, Any]:
    order = manifest.get("execution_order") or []
    cards = progress.get("cards") or {}
    meta = manifest.get("cards") or {}
    items: List[Dict[str, Any]] = []
    for n in order:
        c = cards.get(n) or {}
        if c.get("status") == "failed":
            items.append(
                {
                    "card": n,
                    "kind": "failed",
                    "fail_next": c.get("fail_next_card") or meta.get(n, {}).get("fail_next"),
                    "detail": c.get("notes") or "",
                }
            )
        if c.get("status") == "blocked_by_dependency":
            items.append(
                {
                    "card": n,
                    "kind": "blocked_by_dependency",
                    "blocked_by": c.get("blocked_by") or [],
                    "detail": "依存カード未完了のため pending 扱い",
                }
            )
    return {"version": 1, "generated_at": _utc(), "blockers": items}


def copy_result_bundle_placeholders(
    manifest: Dict[str, Any], progress: Dict[str, Any]
) -> None:
    """campaign manifest 追記用の各カード result bundle パスを progress に反映（存在すれば）。"""
    repo = _repo_root()
    out = _out_campaign_dir()
    meta = manifest.get("cards") or {}
    cards = progress.get("cards") or {}
    for name, spec in meta.items():
        sub = out / "cards" / name
        bundle = sub / "result_bundle.json"
        if bundle.is_file():
            c = cards.get(name) or {}
            c["result_bundle_path"] = str(bundle.relative_to(repo)) if bundle.is_file() else None
            cards[name] = c
    progress["cards"] = cards


def write_campaign_artifacts(
    manifest: Dict[str, Any],
    progress: Dict[str, Any],
    summary: Dict[str, Any],
    blockers: Dict[str, Any],
    delta: Dict[str, Any],
) -> None:
    auto = _auto_dir()
    out = _out_campaign_dir()
    _write_json(auto / PROGRESS_NAME, progress)
    _write_json(auto / SUMMARY_NAME, summary)
    _write_json(auto / BLOCKERS_NAME, blockers)
    _write_json(auto / DELTA_NAME, delta)
    # mirror under out/
    _write_json(out / PROGRESS_NAME, progress)
    _write_json(out / SUMMARY_NAME, summary)
    _write_json(out / BLOCKERS_NAME, blockers)
    _write_json(out / DELTA_NAME, delta)
    shutil.copy2(auto / MANIFEST_NAME, out / MANIFEST_NAME)
    # campaign manifest with append-only log
    cm_path = out / "campaign_manifest_log.jsonl"
    line = json.dumps(
        {"at": _utc(), "summary_excerpt": summary.get("next_priority_cards")},
        ensure_ascii=False,
    )
    cm_path.parent.mkdir(parents=True, exist_ok=True)
    with cm_path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def run_bootstrap(args: argparse.Namespace) -> int:
    repo = _repo_root()
    manifest = load_manifest()
    if not manifest.get("execution_order"):
        print("manifest missing execution_order")
        return 2

    stubs = ensure_all_child_stubs(manifest)
    print(f"child stubs: {len(stubs)} checked, created={sum(1 for s in stubs if s.get('created'))}")

    auto = _auto_dir()
    prog_path = auto / PROGRESS_NAME
    prev_snap: Optional[Dict[str, Any]] = None
    if prog_path.is_file() and not args.reset_progress:
        old = _read_json(prog_path)
        prev_snap = old.get("readiness_snapshot_current") or old.get("readiness_snapshot_previous")
        progress = merge_progress(old, manifest)
    else:
        progress = default_progress(manifest)

    current_snap = snapshot_readiness(repo)
    delta = compute_readiness_delta(prev_snap, current_snap)
    progress["readiness_snapshot_previous"] = prev_snap
    progress["readiness_snapshot_current"] = current_snap

    copy_result_bundle_placeholders(manifest, progress)
    progress = reconcile(manifest, progress, repo)
    summary = build_summary(manifest, progress, delta)
    blockers = build_blockers(manifest, progress)

    write_campaign_artifacts(manifest, progress, summary, blockers, delta)

    marker = auto / "TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_VPS_V1"
    marker.write_text(
        f"{_utc()}\ncampaign={manifest.get('campaign')}\nnext={summary.get('next_priority_cards')}\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--bootstrap", action="store_true", help="子カード stub 生成 + progress/summary 更新")
    ap.add_argument(
        "--reset-progress",
        action="store_true",
        help="progress を初期化（bootstrap 時）",
    )
    args = ap.parse_args()
    if args.bootstrap:
        return run_bootstrap(args)
    # default = bootstrap
    args.bootstrap = True
    args.reset_progress = False
    return run_bootstrap(args)


if __name__ == "__main__":
    raise SystemExit(main())
