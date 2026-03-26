#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1

観測→dedup→router→(browser)→consensus→patch plan→autoguard→acceptance→bind/scorecard→heartbeat を反復。
既存 overnight daemon とは別 lock/stop。成功の捏造はしない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore

CARD = "TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。orchestrator retry 1枚のみ生成。"
OUT_SUMMARY = "overnight_full_pdca_summary.json"
OUT_HEARTBEAT = "overnight_full_pdca_heartbeat.json"
DEFAULT_LOCK = ".tenmon_overnight_full_pdca_orchestrator.lock"
DEFAULT_STOP = "tenmon_overnight_full_pdca_stop.signal"
DEFAULT_TZ = "Asia/Tokyo"
DEFAULT_END_LOCAL = "04:00"
DEFAULT_CYCLE_SEC = 600


def _global_safe_autonomy_blocked(auto: Path) -> tuple[bool, str]:
    """TENMON_SAFE_STOP_HUMAN_OVERRIDE — 横断停止・override・fail-closed。"""
    try:
        from safe_stop_human_override_v1 import evaluate_state
    except ImportError:
        return False, ""
    st = evaluate_state(auto)
    if not st.get("running"):
        return True, str(st.get("reason") or "safe_stop")
    return False, ""


def utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def acquire_lock(lock_file: Path) -> tuple[bool, str]:
    if lock_file.exists():
        old = read_json(lock_file)
        old_pid = int(old.get("pid") or 0)
        if old_pid and pid_alive(old_pid):
            return False, "duplicate_orchestrator_lock_active"
        try:
            lock_file.unlink()
        except Exception:
            return False, "stale_lock_unremovable"
    write_json(lock_file, {"card": CARD, "pid": os.getpid(), "started_at": utc()})
    return True, "ok"


def release_lock(lock_file: Path) -> None:
    try:
        lock_file.unlink(missing_ok=True)
    except Exception:
        pass


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "args": cmd[:12],
            "stdout_tail": (p.stdout or "")[-6000:],
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "args": cmd[:12], "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def parse_router_stdout(text: str) -> dict[str, Any]:
    for line in reversed((text or "").splitlines()):
        s = line.strip()
        if s.startswith("{") and s.endswith("}"):
            try:
                j = json.loads(s)
                return j if isinstance(j, dict) else {}
            except json.JSONDecodeError:
                continue
    return {}


def _target_files_default() -> list[str]:
    raw = os.environ.get("TENMON_FULL_PDCA_ROUTER_TARGET_FILES", "api/src/routes/chat.ts").strip()
    return [x.strip() for x in raw.split(",") if x.strip()]


def advice_from_operator(op: dict[str, Any]) -> dict[str, Any]:
    pc = str(op.get("captured_text") or op.get("reason") or "")[:12000]
    return {
        "problem": str(op.get("provider") or "browser_operator"),
        "target_files": _target_files_default(),
        "proposed_change": pc or "[browser_operator] no captured_text",
        "risk": "medium",
        "tests": ["build", "health", "audit.build", "probes"],
        "reject_conditions": ["no_deploy_if_autoguard_fail"],
    }


def advice_stub(tag: str, forensic: dict[str, Any], router: dict[str, Any]) -> dict[str, Any]:
    nb = str(forensic.get("next_best_card") or "")
    pr = str((router or {}).get("primary_provider") or "")
    return {
        "problem": nb or "overnight_pdca",
        "target_files": _target_files_default(),
        "proposed_change": f"[{tag}] not_consulted_this_cycle; routed_primary={pr}",
        "risk": "medium",
        "tests": ["build", "health", "audit.build", "probes"],
        "reject_conditions": ["manual_if_high_risk_uncertain"],
    }


def count_approval_gate_pending(queue: dict[str, Any]) -> int:
    """承認待ちキュー件数（high-risk はここに留まる想定で観測のみ）。"""
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    return sum(1 for it in items if isinstance(it, dict) and str(it.get("state") or "") == "approval_required")


def now_local(tz_name: str) -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ))


def parse_hhmm(v: str) -> tuple[int, int]:
    parts = (v or "04:00").strip().split(":")
    try:
        return max(0, min(23, int(parts[0]))), max(0, min(59, int(parts[1])))
    except Exception:
        return 4, 0


def next_end_local(tz_name: str, end_local: str) -> datetime:
    h, m = parse_hhmm(end_local)
    n = now_local(tz_name)
    t = n.replace(hour=h, minute=m, second=0, microsecond=0)
    if n >= t:
        t = t + timedelta(days=1)
    return t


def run_one_cycle(
    *,
    api: Path,
    auto: Path,
    scripts: Path,
    workdir: Path,
) -> dict[str, Any]:
    workdir.mkdir(parents=True, exist_ok=True)
    cycle_started_at = utc()
    forensic_path = auto / "tenmon_autonomy_current_state_forensic.json"
    queue_path = auto / "remote_cursor_queue.json"
    steps: dict[str, Any] = {}

    steps["forensic"] = run_cmd(["bash", str(scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], api, timeout=1200)
    steps["queue_dedup_backpressure"] = run_cmd(
        ["python3", str(auto / "tenmon_continuous_queue_dedup_and_backpressure_v1.py")], api, timeout=900
    )

    forensic = read_json(forensic_path)
    objective = " ".join(
        [
            str(forensic.get("next_best_card") or "overnight_pdca"),
            str(forensic.get("conversation_quality_band") or ""),
        ]
    ).strip()[:2000]
    tf_csv = ",".join(_target_files_default())
    rr = run_cmd(
        [
            "python3",
            str(auto / "model_role_router_v1.py"),
            "--objective",
            objective,
            "--target-files",
            tf_csv,
            "--risk-class",
            "medium",
            "--domain",
            "autonomy_overnight_pdca",
        ],
        api,
        timeout=120,
    )
    router = parse_router_stdout(rr.get("stdout_tail") or "")
    write_json(workdir / "role_router_result.json", router if router else {"parse_failed": True, "raw_exit": rr.get("exit_code")})
    steps["role_router"] = {**rr, "parsed_primary": router.get("primary_provider")}

    skip_browser = os.environ.get("TENMON_FULL_PDCA_SKIP_BROWSER", "").lower() in ("1", "true", "yes")
    skip_browser = skip_browser or (sys.platform != "darwin")
    prompt_path = workdir / "consult_prompt.txt"
    prompt_path.write_text(
        "OBJECTIVE:\n"
        + objective
        + "\n\nCONSTRAINTS: minimal diff; no product core change; cite files: "
        + tf_csv
        + "\n",
        encoding="utf-8",
    )
    advice_gpt_path = workdir / "advice_gpt.json"
    if not skip_browser:
        out_bo = workdir / "browser_operator_out.json"
        primary = str(router.get("primary_provider") or "chatgpt")
        if primary not in ("chatgpt", "claude", "gemini"):
            primary = "chatgpt"
        steps["browser_ai_consult"] = run_cmd(
            [
                "python3",
                str(auto / "browser_ai_operator_v1.py"),
                "--provider",
                primary,
                "--prompt-file",
                str(prompt_path),
                "--output-file",
                str(out_bo),
            ],
            api,
            timeout=1800,
        )
        op = read_json(out_bo)
        write_json(advice_gpt_path, advice_from_operator(op) if op else advice_stub("browser_empty", forensic, router))
    else:
        steps["browser_ai_consult"] = {
            "ok": True,
            "skipped": True,
            "reason": "darwin_required_or_TENMON_FULL_PDCA_SKIP_BROWSER",
        }
        write_json(advice_gpt_path, advice_stub("browser_skipped", forensic, router))

    write_json(workdir / "advice_claude.json", advice_stub("claude", forensic, router))
    write_json(workdir / "advice_gemini.json", advice_stub("gemini", forensic, router))

    consensus_path = workdir / "multi_model_consensus.json"
    steps["consensus"] = run_cmd(
        [
            "python3",
            str(auto / "multi_model_consensus_v1.py"),
            "--advice-gpt",
            str(advice_gpt_path),
            "--advice-claude",
            str(workdir / "advice_claude.json"),
            "--advice-gemini",
            str(workdir / "advice_gemini.json"),
            "--output-file",
            str(consensus_path),
        ],
        api,
        timeout=300,
    )

    patch_json = workdir / "cursor_patch_plan.json"
    patch_md = workdir / "cursor_patch_plan.md"
    steps["patch_plan_bridge"] = run_cmd(
        [
            "python3",
            str(auto / "model_advice_to_patch_plan_bridge_v1.py"),
            "--multi-model-consensus",
            str(consensus_path),
            "--output-json",
            str(patch_json),
            "--output-md",
            str(patch_md),
        ],
        api,
        timeout=120,
    )

    autoguard_dir = workdir / "autoguard_out"
    pp = read_json(patch_json)
    touched_path = workdir / "touched_files.json"
    write_json(touched_path, pp.get("target_files") if isinstance(pp.get("target_files"), list) else _target_files_default())
    steps["build_probe_rollback_autoguard"] = run_cmd(
        [
            "python3",
            str(auto / "build_probe_rollback_autoguard_v1.py"),
            "--patch-plan",
            str(patch_json),
            "--touched-files",
            str(touched_path),
            "--output-dir",
            str(autoguard_dir),
        ],
        api,
        timeout=2400,
    )

    bp_result = autoguard_dir / "build_probe_rollback_result.json"
    acc_out = workdir / "acceptance_commit_requeue_summary.json"
    steps["acceptance_gated_commit_requeue"] = run_cmd(
        [
            "python3",
            str(auto / "acceptance_gated_self_commit_and_requeue_v1.py"),
            "--build-probe-result",
            str(bp_result),
            "--patch-plan",
            str(patch_json),
            "--remote-cursor-queue",
            str(queue_path),
            "--output-file",
            str(acc_out),
        ],
        api,
        timeout=120,
    )

    steps["result_bind"] = run_cmd(
        ["bash", str(scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")], api, timeout=1800
    )
    steps["scorecard"] = run_cmd(["python3", str(auto / "tenmon_worldclass_acceptance_scorecard_v1.py")], api, timeout=1200)

    queue = read_json(queue_path)
    consensus_blob = read_json(consensus_path)
    acc_blob = read_json(acc_out)
    bind_sum = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")
    score = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    return {
        "workdir": str(workdir),
        "cycle_started_at": cycle_started_at,
        "steps": steps,
        "signals": {
            "approval_required_queue_items": count_approval_gate_pending(queue),
            "consensus_level": consensus_blob.get("consensus_level"),
            "manual_review_required_consensus": consensus_blob.get("manual_review_required"),
            "patch_plan_ok": pp.get("ok"),
            "build_probe_overall_pass": read_json(bp_result).get("overall_pass"),
            "commit_ready": acc_blob.get("commit_ready"),
            "bind_scorecard_refreshed": bind_sum.get("scorecard_refreshed"),
            "worldclass_score_percent": score.get("score_percent"),
        },
        "finished_at": utc(),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--one-shot", action="store_true", help="1 サイクルのみ実行して終了")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    lock_file = Path(os.environ.get("TENMON_FULL_PDCA_LOCK_FILE", str(auto / DEFAULT_LOCK))).expanduser()
    stop_file = Path(os.environ.get("TENMON_FULL_PDCA_STOP_FILE", str(auto / DEFAULT_STOP))).expanduser()
    summary_path = auto / OUT_SUMMARY
    heartbeat_path = auto / OUT_HEARTBEAT
    runs_root = auto / "out" / "overnight_full_pdca_runs"
    runs_root.mkdir(parents=True, exist_ok=True)

    tz_name = os.environ.get("TENMON_FULL_PDCA_TZ", DEFAULT_TZ).strip() or DEFAULT_TZ
    end_local = os.environ.get("TENMON_FULL_PDCA_END_LOCAL", DEFAULT_END_LOCAL).strip() or DEFAULT_END_LOCAL
    cycle_sec = max(30, int(os.environ.get("TENMON_FULL_PDCA_CYCLE_SEC", str(DEFAULT_CYCLE_SEC)) or DEFAULT_CYCLE_SEC))
    max_cycles = int(os.environ.get("TENMON_FULL_PDCA_MAX_CYCLES", "0") or 0)

    lock_ok, lock_note = acquire_lock(lock_file)
    started = utc()
    target_end = next_end_local(tz_name, end_local)
    if not lock_ok:
        write_json(
            summary_path,
            {
                "card": CARD,
                "generated_at": utc(),
                "lock_acquired": False,
                "blocked_reason": [lock_note],
                "next_on_pass": NEXT_ON_PASS,
                "next_on_fail_note": NEXT_ON_FAIL_NOTE,
            },
        )
        return 1

    cycle = 0
    blocked: list[str] = []
    cycle_records: list[dict[str, Any]] = []

    try:
        while True:
            if not args.one_shot:
                if now_local(tz_name) >= target_end:
                    blocked.append("end_local_reached")
                    break
                if max_cycles > 0 and cycle >= max_cycles:
                    blocked.append("max_cycles_reached")
                    break
            if stop_file.exists():
                blocked.append("stop_file_detected")
                break
            gs_block, gs_reason = _global_safe_autonomy_blocked(auto)
            if gs_block:
                blocked.append(f"global_safe_stop:{gs_reason}")
                break

            cycle += 1
            wd = runs_root / f"cycle_{cycle}_{utc().replace(':', '-')}"
            rec = run_one_cycle(api=api, auto=auto, scripts=scripts, workdir=wd)
            cycle_records.append(rec)

            hb = {
                "card": CARD,
                "updated_at": utc(),
                "started_at": started,
                "cycle": cycle,
                "target_end_local": str(target_end),
                "tz": tz_name,
                "stop_file": str(stop_file),
                "lock_file": str(lock_file),
                "next_on_pass": NEXT_ON_PASS,
                "next_on_fail_note": NEXT_ON_FAIL_NOTE,
                "last_signals": rec.get("signals"),
                "last_workdir": rec.get("workdir"),
            }
            write_json(heartbeat_path, hb)

            if args.one_shot:
                break

            time.sleep(cycle_sec)
    finally:
        release_lock(lock_file)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "started_at": started,
        "finished_at": utc(),
        "cycles": cycle,
        "blocked_reason": blocked,
        "stop_file": str(stop_file),
        "lock_file": str(lock_file),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "tz": tz_name,
        "target_end_local": str(target_end),
        "cycle_records_tail": cycle_records[-5:],
        "safe_medium_auto_iterate_note": "router/browser/consensus チェーンは medium 前提; queue の approval_required（high/escrow 系）は API ゲートのまま（本オーケストレータはキューを自動 ready にしない）",
        "finished_normally": blocked == ["end_local_reached"],
        "rearm_hint": "end_local_reached 単独なら正常終了。daybreak_report_and_next_queue_rearm_v1.py で lock/stop clear と next queue rearm を実施。",
        "continuity_operable_parent_available": str(auto / "tenmon_overnight_continuity_operable_pdca_orchestrator_v1.py"),
    }
    write_json(summary_path, summary)
    print(json.dumps({"ok": True, "cycles": cycle, "summary": str(summary_path)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
