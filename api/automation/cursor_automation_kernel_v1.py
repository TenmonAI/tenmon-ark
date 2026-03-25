#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_03 — Cursor 自動構築 kernel（schema / 成果物集約 / retry 生成）
generated_cursor_apply への出力を正とする。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_RETRY_CURSOR_AUTO_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def gen_apply_dir() -> Path:
    return api_automation() / "generated_cursor_apply"


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _run(mod: str, args: List[str] | None = None) -> int:
    py = api_automation() / mod
    return subprocess.run([sys.executable, str(py)] + (args or []), cwd=str(api_automation()), check=False).returncode


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def bootstrap_kernel_card_md() -> str:
    """契約 9 項目を満たす kernel 自身の説明カード（テンプレート）。"""
    return f"""# TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL

CARD_NAME: TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1

## OBJECTIVE
Cursor 完全自動構築の核として、card schema / executor bridge / retry / next-card / result collector を統合する cursor automation kernel を固定する。

## WHY_NOW
構築班のカード生成粒度が揺れると、自己改善・自己修復・新機能が人手依存のまま残るため。

## EDIT_SCOPE
- api/automation/**
- api/docs/constitution/**
- api/automation/generated_cursor_apply/**

## DO_NOT_TOUCH
- dist/**
- chat.ts 本体
- runtime route 本体
- DB schema
- kokuzo_pages 正文
- /api/chat 契約

## IMPLEMENTATION_POLICY
- 本カードは `cursor_card_contract_v1.py` の必須フィールドに従う
- 成果物は `cursor_result_collector_v1.py` → `cursor_kernel_result.json` に正規化
- retry は `cursor_automation_kernel_v1.py` が `cursor_retry_card.md` と generated_cursor_apply に同一内容で出力

## ACCEPTANCE
- `cursor_card_schema.json` が生成される
- `cursor_kernel_result.json` が生成される
- `cursor_retry_card.md` が失敗時に生成される
- `python3 cursor_automation_kernel_v1.py --run-all` が完走する

## VPS_VALIDATION_OUTPUTS
- TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_VPS_V1
- cursor_card_schema.json
- cursor_kernel_result.json
- cursor_retry_card.md

## FAIL_NEXT_CARD
TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_RETRY_CURSOR_AUTO_V1
"""


def fail_type_retry_hints(fail_type: str) -> List[str]:
    m = {
        "build_fail": ["npm run build を通す", "TENMON_VPS_ACCEPTANCE_OS を再実行"],
        "acceptance_fail": ["integrated_acceptance_seal を緑にする", "runtime probe を確認"],
        "schema_fail": ["cursor_card_contract_v1.py --validate で不足フィールドを埋める"],
        "execution_fail": ["cursor_result_bundle の blockers を潰す", "cursor_executor_bridge_v2 を再実行"],
        "none": ["kernel は緑 — 次カードへ"],
    }
    return m.get(fail_type, ["unknown — cursor_kernel_result.fail_type を確認"])


def write_retry_artifacts(auto: Path, kr: Dict[str, Any]) -> Path:
    fail_type = str(kr.get("fail_type") or "unknown")
    bundle = read_json(auto / "cursor_result_bundle.json")
    blockers: List[str] = list(bundle.get("blockers") or [])[:5]
    if not blockers:
        blockers = [fail_type]

    hints = fail_type_retry_hints(fail_type)
    lines = [
        f"# {FAIL_NEXT}",
        "",
        f"> 親カード: `{CARD}`",
        f"> fail_type: `{fail_type}`",
        "> 自動生成: `cursor_automation_kernel_v1.py`",
        "",
        "## TOP_BLOCKERS / SIGNALS",
    ]
    for b in blockers:
        lines.append(f"- {b}")
    lines.extend(["", "## FAIL_TYPE 別ヒント"])
    for h in hints:
        lines.append(f"- {h}")
    lines.extend(
        [
            "",
            "## DO",
            "1. 上記を潰す",
            "2. `python3 cursor_result_collector_v1.py` で `cursor_kernel_result.json` を更新",
            "3. `python3 cursor_automation_kernel_v1.py --run-all` で再検証",
            "",
        ]
    )
    body = "\n".join(lines) + "\n"

    cr = auto / "cursor_retry_card.md"
    cr.write_text(body, encoding="utf-8")

    ga = gen_apply_dir()
    ga.mkdir(parents=True, exist_ok=True)
    (ga / f"{FAIL_NEXT}.md").write_text(body, encoding="utf-8")
    return cr


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--emit-bootstrap-only", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    ga = gen_apply_dir()
    ga.mkdir(parents=True, exist_ok=True)

    if args.emit_bootstrap_only:
        path = ga / "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1.md"
        path.write_text(bootstrap_kernel_card_md(), encoding="utf-8")
        print(json.dumps({"ok": True, "path": str(path)}, ensure_ascii=False))
        return 0

    rc = 0
    _run("cursor_card_contract_v1.py", [])
    _run("cursor_result_collector_v1.py", [])
    bootstrap_path = ga / "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1.md"
    bootstrap_path.write_text(bootstrap_kernel_card_md(), encoding="utf-8")

    kr = read_json(auto / "cursor_kernel_result.json")
    if not kr.get("overall_pass"):
        write_retry_artifacts(auto, kr)
    else:
        stub_ok = (
            "# Kernel pass\n\n"
            "overall_pass=true — retry スタブはスキップ。\n"
            "失敗時のみ `cursor_retry_card.md` が更新される。\n"
        )
        (auto / "cursor_retry_card.md").write_text(stub_ok, encoding="utf-8")
        (ga / f"{FAIL_NEXT}.md").write_text(stub_ok, encoding="utf-8")

    report = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "steps": [
            "cursor_card_contract_v1 → cursor_card_schema.json",
            "cursor_result_collector_v1 → cursor_kernel_result.json",
            "bootstrap → generated_cursor_apply/...KERNEL...md",
            "conditional → cursor_retry_card.md + generated_cursor_apply RETRY",
        ],
        "artifacts": {
            "cursor_card_schema": str(auto / "cursor_card_schema.json"),
            "cursor_kernel_result": str(auto / "cursor_kernel_result.json"),
            "cursor_retry_card": str(auto / "cursor_retry_card.md"),
            "bootstrap_md": str(bootstrap_path),
        },
        "kernel_result_summary": {
            "overall_pass": kr.get("overall_pass"),
            "fail_type": kr.get("fail_type"),
        },
    }
    (auto / "cursor_automation_kernel_report_v1.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    (auto / "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\noverall_pass={kr.get('overall_pass')}\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"ok": True, "report": report}, ensure_ascii=False, indent=2))

    return rc


if __name__ == "__main__":
    raise SystemExit(main())
