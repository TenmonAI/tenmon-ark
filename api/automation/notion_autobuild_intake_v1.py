#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NOTION_AUTOBUILD_INTAKE — Notion から人間向け計画（参照のみ）と機械実行候補（DB）を取得。
自由文を queue に入れず、strict 行のみ raw リストとして返す。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

CARD = "TENMON_NOTION_ORCHESTRATED_AUTOBUILD_LOOP_CURSOR_AUTO_V1"
CONFIG_FN = "notion_autobuild_config_v1.json"
RESULT_FN = "notion_autobuild_last_intake_result_v1.json"


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


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _notion_token() -> str:
    return (os.environ.get("NOTION_AUTOBUILD_TOKEN") or os.environ.get("NOTION_TOKEN") or "").strip()


def _load_config(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / CONFIG_FN)


def notion_request(
    *,
    token: str,
    version: str,
    method: str,
    url: str,
    body: dict[str, Any] | None = None,
    timeout: int = 60,
) -> tuple[int, dict[str, Any] | list[Any] | None, str]:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": version,
        "Content-Type": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            code = resp.getcode()
            try:
                parsed: Any = json.loads(raw)
            except Exception:
                return code, None, raw[:2000]
            return code, parsed if isinstance(parsed, (dict, list)) else None, ""
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:2000]
        return e.code, None, err_body
    except Exception as e:
        return -1, None, str(e)


def _prop_plain(props: dict[str, Any], key: str) -> str:
    p = props.get(key)
    if not isinstance(p, dict):
        return ""
    t = str(p.get("type") or "")
    if t == "title":
        arr = p.get("title")
        if isinstance(arr, list) and arr:
            return str((arr[0] or {}).get("plain_text") or "").strip()
        return ""
    if t == "rich_text":
        arr = p.get("rich_text")
        if isinstance(arr, list):
            return "".join(str((x or {}).get("plain_text") or "") for x in arr).strip()
        return ""
    if t == "select":
        sel = p.get("select")
        if isinstance(sel, dict):
            return str(sel.get("name") or "").strip()
        return ""
    if t == "number":
        n = p.get("number")
        return "" if n is None else str(n)
    if t == "url":
        return str(p.get("url") or "").strip()
    if t == "checkbox":
        return "__YES__" if p.get("checkbox") is True else ""
    if t == "date":
        d = p.get("date")
        if isinstance(d, dict):
            return str(d.get("start") or d.get("end") or "").strip()
        return ""
    return ""


def notion_page_to_row(
    *,
    page: dict[str, Any],
    property_map: dict[str, Any],
) -> dict[str, Any]:
    props_in = page.get("properties")
    if not isinstance(props_in, dict):
        return {}
    out: dict[str, Any] = {}
    for logical, notion_key in property_map.items():
        nk = str(notion_key)
        if nk in props_in:
            out[str(logical)] = _prop_plain(props_in, nk)
    return out


def fetch_human_plan_preview(
    *,
    auto_dir: Path,
    token: str,
    version: str,
    page_id: str,
) -> tuple[str, str]:
    if not page_id.strip():
        return "", "no_human_plan_page_id"
    pid = page_id.replace("-", "")
    url = f"https://api.notion.com/v1/blocks/{pid}/children?page_size=25"
    code, data, err = notion_request(token=token, version=version, method="GET", url=url)
    if code != 200 or not isinstance(data, dict):
        return "", f"human_plan_fetch_failed:{code}:{err}"
    results = data.get("results")
    chunks: list[str] = []
    if isinstance(results, list):
        for b in results:
            if not isinstance(b, dict):
                continue
            typ = str(b.get("type") or "")
            payload = b.get(typ)
            if isinstance(payload, dict) and typ == "paragraph":
                rt = payload.get("rich_text")
                if isinstance(rt, list):
                    chunks.append("".join(str((x or {}).get("plain_text") or "") for x in rt))
    preview = "\n".join(x.strip() for x in chunks if x.strip())[:8000]
    return preview, ""


def fetch_database_pages(
    *,
    token: str,
    version: str,
    database_id: str,
    status_property: str,
    status_ready: str = "Ready",
) -> tuple[list[dict[str, Any]], str]:
    db = database_id.replace("-", "")
    url = f"https://api.notion.com/v1/databases/{db}/query"
    body: dict[str, Any] = {"page_size": 50}
    if status_property.strip():
        body["filter"] = {"property": status_property, "select": {"equals": status_ready}}
    code, data, err = notion_request(token=token, version=version, method="POST", url=url, body=body)
    if code != 200 or not isinstance(data, dict):
        return [], f"database_query_failed:{code}:{err}"
    results = data.get("results")
    out: list[dict[str, Any]] = []
    if isinstance(results, list):
        for p in results:
            if isinstance(p, dict):
                out.append(p)
    return out, ""


def run_intake(
    *,
    auto_dir: Path,
    dry_run: bool,
    fixture_sample: bool,
) -> dict[str, Any]:
    cfg = _load_config(auto_dir)
    version = str(cfg.get("notion_version") or "2022-06-28")
    pmap = cfg.get("property_map")
    if not isinstance(pmap, dict):
        pmap = {}
    db_id = str(cfg.get("machine_execution_database_id") or "").strip()
    human_pid = str(cfg.get("human_plan_page_id") or "").strip()
    token = _notion_token()

    result: dict[str, Any] = {
        "schema": "TENMON_NOTION_AUTOBUILD_LAST_INTAKE_RESULT_V1",
        "at": _utc_iso(),
        "ok": False,
        "verdict": "HOLD",
        "hold_reason": "",
        "human_plan": {"page_id": human_pid, "preview_text": ""},
        "machine_candidates_raw_count": 0,
        "machine_candidates": [],
        "errors": [],
    }

    if fixture_sample:
        result["ok"] = True
        result["verdict"] = "PASS"
        result["hold_reason"] = ""
        result["machine_candidates"] = [
            {
                "_notion_page_id": "fixture-page-00000000000000000000000000000000",
                "name": "Fixture",
                "card_name": "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1",
                "card_body": "fixture body for compile-only test " + ("x" * 40),
                "status": "Ready",
                "priority": "P0",
                "queue": "autobuild",
                "approval_gate": "__YES__",
                "auto_run_enabled": "__YES__",
                "run_state": "pending",
                "writeback_page_id": "00000000000000000000000000000000",
                "target_scope": "repo_hygiene",
                "acceptance_summary": "fixture acceptance summary minimum length ok " + ("y" * 24),
                "result_summary": "",
                "evidence_path": "",
                "head_sha": "",
                "last_run_at": "",
                "locked_by": "",
                "retry_count": "0",
                "retry_requested": "__NO__",
                "next_action": "",
                "source_schedule_page_id": "",
                "source_cursor_page_id": "",
            }
        ]
        result["machine_candidates_raw_count"] = len(result["machine_candidates"])
        _write_json(auto_dir / RESULT_FN, result)
        return result

    if dry_run:
        result["hold_reason"] = "dry_run_no_notion_io"
        result["verdict"] = "PASS"
        result["ok"] = True
        _write_json(auto_dir / RESULT_FN, result)
        return result

    if not token:
        result["hold_reason"] = "notion_token_missing"
        result["errors"].append("set NOTION_AUTOBUILD_TOKEN or NOTION_TOKEN")
        _write_json(auto_dir / RESULT_FN, result)
        return result

    if not db_id:
        result["hold_reason"] = "machine_execution_database_id_missing"
        result["errors"].append("set notion_autobuild_config_v1.json machine_execution_database_id")
        _write_json(auto_dir / RESULT_FN, result)
        return result

    status_prop = str(pmap.get("status") or "Status")
    pages, qerr = fetch_database_pages(
        token=token,
        version=version,
        database_id=db_id,
        status_property=status_prop,
        status_ready="Ready",
    )
    if qerr:
        result["hold_reason"] = "notion_query_failed"
        result["errors"].append(qerr)
        _write_json(auto_dir / RESULT_FN, result)
        return result

    candidates: list[dict[str, Any]] = []
    for page in pages:
        pid = str(page.get("id") or "")
        row = notion_page_to_row(page=page, property_map=pmap)
        row["_notion_page_id"] = pid
        candidates.append(row)

    preview, herr = fetch_human_plan_preview(
        auto_dir=auto_dir, token=token, version=version, page_id=human_pid
    )
    result["human_plan"]["preview_text"] = preview
    if herr and human_pid:
        result["errors"].append(f"human_plan:{herr}")

    result["machine_candidates"] = candidates
    result["machine_candidates_raw_count"] = len(candidates)
    result["ok"] = True
    result["verdict"] = "PASS"
    result["hold_reason"] = ""
    _write_json(auto_dir / RESULT_FN, result)
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD + " intake")
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--fixture-sample", action="store_true", help="Notion なしでサンプル行を書き込み検証用")
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir) if args.auto_dir else _AUTO
    out = run_intake(auto_dir=auto_dir, dry_run=bool(args.dry_run), fixture_sample=bool(args.fixture_sample))
    print(json.dumps({"ok": out.get("ok"), "verdict": out.get("verdict"), "hold_reason": out.get("hold_reason")}, ensure_ascii=False))
    sys.exit(0 if out.get("ok") else 2)


if __name__ == "__main__":
    main()
