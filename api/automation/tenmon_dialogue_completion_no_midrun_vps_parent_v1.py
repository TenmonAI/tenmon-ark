#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_PARENT_CURSOR_AUTO_V1

会話コア改善主線を VPS 側だけで順実行（途中確認待ちなし）。Mac は bridge の payload/runbook 生成まで。
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

CARD = "TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_PARENT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_dialogue_completion_no_midrun_vps_parent_summary.json"
OUT_MD = "tenmon_dialogue_completion_no_midrun_vps_parent_report.md"
RETRY_CARD = "TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_PARENT_RETRY_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"

STEP_SCRIPTS = (
    ("TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1", "tenmon_dialogue_completion_no_midrun_vps_autobundle_v1.py"),
    ("TENMON_MAC_REDEPLOY_REALRUN_BRIDGE_CURSOR_AUTO_V1", "tenmon_mac_redeploy_realrun_bridge_v1.py"),
    ("TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1", "tenmon_dialogue_post_redeploy_realrun_recheck_v1.py"),
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_step(api: Path, auto: Path, script: str, timeout: int) -> dict[str, Any]:
    p = auto / script
    if not p.is_file():
        return {"card": script, "ok": False, "exit_code": None, "error": "script_missing"}
    try:
        cp = subprocess.run(
            [sys.executable, str(p)],
            cwd=str(api),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "script": script,
            "ok": cp.returncode == 0,
            "exit_code": cp.returncode,
            "stdout_tail": (cp.stdout or "")[-5000:],
            "stderr_tail": (cp.stderr or "")[-2000:],
        }
    except Exception as e:
        return {"script": script, "ok": False, "exit_code": None, "error": str(e)[:400]}


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
            *[f"- `{x}`" for x in paths[:30]],
            "",
            "## DO",
            "",
            f"1. `{OUT_JSON}` を確認",
            "2. 修正後 `python3 api/automation/tenmon_dialogue_completion_no_midrun_vps_parent_v1.py` を再実行",
            "",
        ]
    )
    (gen_apply / f"{RETRY_CARD}.md").write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--timeout-sec", type=int, default=int(os.environ.get("TENMON_DIALOGUE_PARENT_STEP_TIMEOUT_SEC", "3600")))
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    gen_apply = auto / "generated_cursor_apply"
    auto.mkdir(parents=True, exist_ok=True)

    timeout = max(60, int(args.timeout_sec))

    steps_out: list[dict[str, Any]] = []
    halted = 0
    halt_reason = ""

    for i, (card_name, script) in enumerate(STEP_SCRIPTS, start=1):
        r = run_step(api, auto, script, timeout)
        r["step"] = i
        r["card"] = card_name
        steps_out.append(r)
        if not r.get("ok"):
            halted = i
            halt_reason = f"step{i}_{script}_failed"
            break

    bundle_sum = read_json(auto / "tenmon_dialogue_no_midrun_vps_autobundle_summary.json")
    bridge_sum = read_json(auto / "tenmon_mac_redeploy_realrun_bridge_summary.json")
    recheck_sum = read_json(auto / "tenmon_dialogue_post_redeploy_realrun_recheck_summary.json")

    h = recheck_sum.get("http") or {}
    http_gates_ok = all(
        isinstance(h.get(k), dict) and h.get(k, {}).get("ok") is True for k in ("health", "audit", "audit_build")
    )
    bpn = recheck_sum.get("build_probe_newest") or {}
    build_probe_ok_or_absent = bpn.get("missing") is True or bpn.get("overall_pass") is True

    completion_evidence = {
        "watch_loop_real_patterns_ok": bool((recheck_sum.get("watch_loop_hardcoded_dry_run_check") or {}).get("ok")),
        "http_gates_ok": http_gates_ok,
        "build_probe_ok_or_absent": build_probe_ok_or_absent,
        "mac_payload_generated": bool(bridge_sum.get("scp_suggest_script")),
        "post_recheck_script_ok": bool(recheck_sum.get("ok")),
        "autobundle_ok": bool(bundle_sum.get("ok")),
        "dialogue_core_paths_present": recheck_sum.get("dialogue_core_paths_present"),
    }

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
        "steps": steps_out,
        "child_summaries": {
            "autobundle": str(auto / "tenmon_dialogue_no_midrun_vps_autobundle_summary.json"),
            "mac_redeploy_bridge": str(auto / "tenmon_mac_redeploy_realrun_bridge_summary.json"),
            "post_redeploy_recheck": str(auto / "tenmon_dialogue_post_redeploy_realrun_recheck_summary.json"),
        },
        "completion_evidence": completion_evidence,
        "notes": [
            "K1/SUBCONCEPT/GENERAL のコード改修自体は autobundle の生成物・別 PR で行う（本親は束ねと観測のみ）。",
            "Mac 再配備は bridge 出力と既存 runbook 憲章に従う。",
        ],
    }

    write_json(auto / OUT_JSON, summary)

    if not master_pass:
        write_retry_stub(
            gen_apply,
            halt_reason or "unknown",
            halted,
            [str(auto / OUT_JSON), str(auto / "tenmon_dialogue_no_midrun_vps_autobundle_summary.json")],
        )

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- halted_step: `{halted}`",
        "",
        "## steps",
        "",
    ]
    for s in steps_out:
        md.append(f"- step {s.get('step')}: `{s.get('card')}` ok=`{s.get('ok')}` exit=`{s.get('exit_code')}`")
    md.extend(["", "## completion_evidence", ""])
    for k, v in completion_evidence.items():
        md.append(f"- `{k}`: `{v}`")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": master_pass, "path": str(auto / OUT_JSON), "master_pass": master_pass}, ensure_ascii=False))
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
