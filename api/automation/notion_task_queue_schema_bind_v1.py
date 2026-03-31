#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_NOTION_TASK_QUEUE_SCHEMA_BIND — config.property_map を schema canonical と照合し、
任意で Notion DB に実列が存在するか検証する。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import notion_autobuild_intake_v1 as intake_mod

CARD = "TENMON_NOTION_TASK_QUEUE_SCHEMA_BIND_CURSOR_AUTO_V1"
SCHEMA_FN = "notion_autobuild_schema_v1.json"
CONFIG_FN = "notion_autobuild_config_v1.json"
REPORT_FN = "notion_task_queue_schema_bind_report_v1.json"


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


def canonical_map(auto_dir: Path) -> dict[str, str]:
    sch = _read_json(auto_dir / SCHEMA_FN)
    m = sch.get("task_queue_canonical_property_map")
    if not isinstance(m, dict):
        return {}
    return {str(k): str(v) for k, v in m.items()}


def config_property_map(auto_dir: Path) -> dict[str, str]:
    cfg = _read_json(auto_dir / CONFIG_FN)
    pm = cfg.get("property_map")
    if not isinstance(pm, dict):
        return {}
    return {str(k): str(v) for k, v in pm.items()}


def diff_maps(canonical: dict[str, str], actual: dict[str, str]) -> list[str]:
    drift: list[str] = []
    if set(canonical.keys()) != set(actual.keys()):
        drift.append(
            f"key_set_mismatch canonical={sorted(canonical.keys())} config={sorted(actual.keys())}"
        )
    for k, exp in sorted(canonical.items()):
        got = actual.get(k)
        if got != exp:
            drift.append(f"{k}: expected_notion_name={exp!r} got={got!r}")
    return drift


def verify_notion_database(
    *,
    auto_dir: Path,
    token: str,
    database_id: str,
    canonical: dict[str, str],
    version: str,
) -> tuple[bool, list[str]]:
    db = database_id.replace("-", "")
    url = f"https://api.notion.com/v1/databases/{db}"
    code, data, err = intake_mod.notion_request(token=token, version=version, method="GET", url=url)
    if code != 200 or not isinstance(data, dict):
        return False, [f"database_retrieve_failed:{code}:{err}"]
    props = data.get("properties")
    if not isinstance(props, dict):
        return False, ["database_has_no_properties"]
    missing: list[str] = []
    for _logical, nname in canonical.items():
        if nname not in props:
            missing.append(nname)
    return len(missing) == 0, missing


def run_bind(
    *,
    auto_dir: Path,
    verify_notion: bool,
) -> dict[str, Any]:
    canonical = canonical_map(auto_dir)
    actual = config_property_map(auto_dir)
    drift = diff_maps(canonical, actual) if canonical else ["canonical_map_missing_in_schema"]

    cfg = _read_json(auto_dir / CONFIG_FN)
    version = str(cfg.get("notion_version") or "2022-06-28")
    db_id = str(cfg.get("machine_execution_database_id") or "").strip()
    token = intake_mod._notion_token()

    report: dict[str, Any] = {
        "schema": "TENMON_NOTION_TASK_QUEUE_SCHEMA_BIND_REPORT_V1",
        "at": _utc_iso(),
        "ok": False,
        "config_property_map_matches_canonical": len(drift) == 0,
        "notion_database_checked": False,
        "notion_properties_ok": False,
        "missing_notion_properties": [],
        "property_map_drift": drift,
        "hold_reason": "",
    }

    if not canonical:
        report["hold_reason"] = "task_queue_canonical_property_map_missing"
        _write_json(auto_dir / REPORT_FN, report)
        return report

    if drift:
        report["hold_reason"] = "property_map_drift"
        _write_json(auto_dir / REPORT_FN, report)
        return report

    report["ok"] = True

    if verify_notion:
        report["notion_database_checked"] = True
        if not token or not db_id:
            report["ok"] = False
            report["hold_reason"] = "notion_verify_requested_but_token_or_database_id_missing"
            _write_json(auto_dir / REPORT_FN, report)
            return report
        ok_np, missing = verify_notion_database(
            auto_dir=auto_dir,
            token=token,
            database_id=db_id,
            canonical=canonical,
            version=version,
        )
        report["notion_properties_ok"] = ok_np
        report["missing_notion_properties"] = missing
        if not ok_np:
            report["ok"] = False
            report["hold_reason"] = "notion_database_missing_properties"
    _write_json(auto_dir / REPORT_FN, report)
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument(
        "--verify-notion",
        action="store_true",
        help="Notion API で DB 列の存在確認（token + machine_execution_database_id 必須）",
    )
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir) if args.auto_dir else _AUTO
    r = run_bind(auto_dir=auto_dir, verify_notion=bool(args.verify_notion))
    print(
        json.dumps(
            {"ok": r.get("ok"), "hold_reason": r.get("hold_reason"), "drift": r.get("property_map_drift")},
            ensure_ascii=False,
        )
    )
    sys.exit(0 if r.get("ok") else 2)


if __name__ == "__main__":
    main()
