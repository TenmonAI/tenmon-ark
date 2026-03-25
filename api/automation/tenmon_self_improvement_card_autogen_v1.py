#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_IMPROVEMENT_OS — Card Auto-Generator
integrated / seal が FAIL のとき next Cursor カード（RETRY）へのディスパッチ JSON と
generated_cursor_apply へのスタブ更新を行う。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CARD = "TENMON_SELF_IMPROVEMENT_CARD_AUTOGEN_V1"
VERSION = 1

DEFAULT_FAIL_NEXT_CURSOR = "TENMON_SELF_IMPROVEMENT_OS_PARENT_RETRY_CURSOR_AUTO_V1"
PARENT_CURSOR = "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1"
PARENT_VPS = "TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _write_retry_stub(
    gen_apply: Path, integrated: Dict[str, Any], fail_next_cursor: str, parent_vps: str
) -> Path:
    fail_next_md = f"{fail_next_cursor}.md"
    target = gen_apply / fail_next_md
    lines = [
        f"# {fail_next_cursor}",
        "",
        "> **Cursor 自動生成スタブ**（`tenmon_self_improvement_card_autogen_v1.py`）",
        f"> 親実装: `{PARENT_CURSOR}` / VPS: `{parent_vps}`",
        "",
        f"- generatedAt: `{_utc_now_iso()}`",
        f"- seal_exit_code: `{integrated.get('seal_exit_code')}`",
        f"- overall_loop_ok: `{integrated.get('overall_loop_ok')}`",
        "",
        "## DO",
        "",
        "1. `integrated_final_verdict.json` / `seal_governor_verdict.json` / `final_verdict.json` を確認",
        "2. completion supplement の `next_card_dispatch.json` に従い Stage カードで詰め",
        "3. 修正後に VPS で親 OS スクリプト（例: `chat_ts_self_improvement_os_integrated_v1.sh` / `kokuzo_learning_improvement_os_integrated_v1.sh`）を再実行",
        "",
        "## CHECK",
        "",
        "```bash",
        "readlink -f /var/log/tenmon/card",
        "jq . $DIR/_self_improvement_os/integrated_final_verdict.json",
        "```",
        "",
    ]
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return target


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--seal-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--integrated-path", type=str, default="")
    ap.add_argument("--force", action="store_true", help="PASS 時もディスパッチ JSON のみ更新")
    ap.add_argument("--fail-next-cursor", type=str, default=DEFAULT_FAIL_NEXT_CURSOR)
    ap.add_argument("--fail-next-vps-hint", type=str, default=PARENT_VPS)
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    fail_next_cursor = str(args.fail_next_cursor or DEFAULT_FAIL_NEXT_CURSOR)
    fail_next_vps = str(args.fail_next_vps_hint or PARENT_VPS)

    seal = Path(args.seal_dir).resolve()
    out = Path(args.out_dir) if args.out_dir else (seal / "_self_improvement_os")
    out.mkdir(parents=True, exist_ok=True)

    integ_path = Path(args.integrated_path) if args.integrated_path else (out / "integrated_final_verdict.json")
    integrated = _read_json(integ_path)
    loop_ok = bool(integrated.get("overall_loop_ok"))
    seal_rc = int(integrated.get("seal_exit_code") or 0)

    dispatch = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "seal_dir": str(seal),
        "overall_loop_ok": loop_ok,
        "seal_exit_code": seal_rc,
        "fail_next_cursor_card": fail_next_cursor,
        "fail_next_vps_hint": fail_next_vps,
    }

    gen_apply = _repo_api() / "automation" / "generated_cursor_apply"
    gen_apply.mkdir(parents=True, exist_ok=True)

    wrote_stub = None
    if not loop_ok or seal_rc != 0:
        dispatch["stub_written"] = True
        wrote_stub = _write_retry_stub(gen_apply, integrated, fail_next_cursor, fail_next_vps)
    else:
        dispatch["stub_written"] = False

    reg = _read_json(_repo_api() / "automation" / "self_improvement_os_dispatch_v1.json")
    dispatch["registry_version"] = reg.get("version")

    dpath = out / "os_fail_next_dispatch.json"
    dpath.write_text(json.dumps(dispatch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    template = gen_apply / f"{fail_next_cursor}.md"
    summary = {"dispatch_path": str(dpath), "stub": str(wrote_stub) if wrote_stub else (str(template) if template.is_file() else "")}
    if args.stdout_json:
        print(json.dumps({**dispatch, **{"paths": summary}}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
