#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1

子カードを並列禁止・順番固定で実行。途中 FAIL で証跡を残して停止（成功の捏造なし）。
各子の実体は既存 runner にブリッジ（logical_card → implementation_script）。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_continuity_hold_density_and_single_source_rejudge_summary.json"
OUT_MD = "tenmon_continuity_hold_density_and_single_source_rejudge_report.md"
RETRY_CARD = "TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_RETRY_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
OUT_RETRY_HINT = "generated_cursor_apply/TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_RETRY_CURSOR_AUTO_V1.md"

# (logical_card_id, path under api/, kind, bridge_note)
STEP_SCRIPTS: tuple[tuple[str, str, str, str], ...] = (
    (
        "TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1",
        "automation/tenmon_continuous_queue_dedup_and_backpressure_v1.py",
        "py",
        "runner=TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN (queue dedup / fixture ready drain)",
    ),
    (
        "TENMON_CONTINUITY_ROUTE_HOLD_DENSITY_REPAIR_CURSOR_AUTO_V1",
        "automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py",
        "py",
        "dialogue priority loop / scorecard alignment (continuity band evidence path)",
    ),
    (
        "TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1",
        "automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py",
        "py",
        "result bundle vs queue executed → bind evidence",
    ),
    (
        "TENMON_SINGLE_SOURCE_LATEST_TRUTH_REJUDGE_SYNC_CURSOR_AUTO_V1",
        "automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py",
        "py",
        "rejudge + seal refresh (lived truth sync)",
    ),
    (
        "TENMON_OVERNIGHT_DAEMON_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1",
        "automation/daybreak_report_and_next_queue_rearm_v1.py",
        "py",
        "overnight / queue rearm candidates / next_best evidence (no direct queue rewrite)",
    ),
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_step(
    api: Path,
    repo: Path,
    rel: str,
    kind: str,
    timeout: int,
) -> dict[str, Any]:
    target = api / rel
    if not target.is_file():
        return {
            "script": rel,
            "ok": False,
            "exit_code": None,
            "error": "script_missing",
        }
    env = {**os.environ, "TENMON_REPO_ROOT": str(repo)}
    try:
        if kind == "py":
            cp = subprocess.run(
                [sys.executable, str(target)],
                cwd=str(api),
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        elif kind == "sh":
            cp = subprocess.run(
                ["bash", str(target)],
                cwd=str(api),
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        else:
            return {"script": rel, "ok": False, "exit_code": None, "error": f"bad_kind:{kind}"}
        return {
            "script": rel,
            "ok": cp.returncode == 0,
            "exit_code": cp.returncode,
            "stdout_tail": (cp.stdout or "")[-8000:],
            "stderr_tail": (cp.stderr or "")[-4000:],
        }
    except subprocess.TimeoutExpired:
        return {"script": rel, "ok": False, "exit_code": None, "error": f"timeout_{timeout}s"}
    except Exception as e:
        return {"script": rel, "ok": False, "exit_code": None, "error": str(e)[:500]}


def write_retry_stub(gen_apply: Path, reason: str, step_idx: int, paths: list[str]) -> None:
    gen_apply.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            f"# {RETRY_CARD}",
            "",
            f"> generated_at: `{utc()}`",
            f"> parent: `{CARD}`",
            f"> halted_step: `{step_idx}`",
            f"> reason: `{reason}`",
            "",
            "## evidence",
            "",
            *[f"- `{x}`" for x in paths[:40]],
            "",
            "## DO",
            "",
            f"1. `{OUT_JSON}` を確認",
            "2. 修正後 `python3 api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_parent_v1.py` を再実行",
            "",
        ]
    )
    (gen_apply / f"{RETRY_CARD}.md").write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--timeout-sec",
        type=int,
        default=int(os.environ.get("TENMON_CONT_HOLD_SS_REJUDGE_STEP_TIMEOUT_SEC", "7200")),
    )
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    gen_apply = auto / "generated_cursor_apply"
    auto.mkdir(parents=True, exist_ok=True)

    timeout = max(120, int(args.timeout_sec))

    steps_out: list[dict[str, Any]] = []
    halted = 0
    halt_reason = ""

    for i, (card_name, rel, kind, bridge_note) in enumerate(STEP_SCRIPTS, start=1):
        r = run_step(api, repo, rel, kind, timeout)
        r["step"] = i
        r["card"] = card_name
        r["bridge_note"] = bridge_note
        steps_out.append(r)
        if not r.get("ok"):
            halted = i
            halt_reason = f"step{i}_{rel}_failed"
            break

    master_pass = halted == 0 and all(s.get("ok") for s in steps_out)

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "master_pass": master_pass,
        "halted_step": halted,
        "halt_reason": halt_reason,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "parallel_forbidden": True,
        "step_order_fixed": True,
        "steps": steps_out,
        "notes": [
            "logical_card は憲章上の ID。implementation は bridge_note の runner（専用スクリプトが追加されたら差し替え可）。",
            "queue/result の success は子の exit コードのみ（捏造なし）。",
        ],
    }

    write_json(auto / OUT_JSON, summary)

    if not master_pass:
        write_retry_stub(
            gen_apply,
            halt_reason or "unknown",
            halted,
            [str(auto / OUT_JSON)],
        )
        # canonical retry stub path (contract)
        # write_retry_stub already writes this file; keep an explicit overwrite for deterministic header.
        (auto / OUT_RETRY_HINT).write_text(
            "\n".join(
                [
                    f"# {RETRY_CARD}",
                    "",
                    f"- generated_at: `{utc()}`",
                    f"- parent: `{CARD}`",
                    f"- {NEXT_ON_FAIL_NOTE}",
                    f"- halted_step: `{halted}`",
                    f"- halt_reason: `{halt_reason or 'unknown'}`",
                    f"- summary: `{OUT_JSON}`",
                    "",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- halted_step: `{halted}`",
        f"- next_on_pass: `{NEXT_ON_PASS}`",
        "",
        "## steps (順番固定・並列禁止)",
        "",
    ]
    for s in steps_out:
        md.append(
            f"- step {s.get('step')}: `{s.get('card')}` ok=`{s.get('ok')}` exit=`{s.get('exit_code')}` script=`{s.get('script')}`"
        )
        md.append(f"  - bridge: {s.get('bridge_note')}")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "master_pass": master_pass,
                "path": str(auto / OUT_JSON),
                "report": str(auto / OUT_MD),
                "next_on_pass": NEXT_ON_PASS if master_pass else None,
                "retry_card": RETRY_CARD if not master_pass else None,
            },
            ensure_ascii=False,
        ),
        file=sys.stdout,
    )
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
