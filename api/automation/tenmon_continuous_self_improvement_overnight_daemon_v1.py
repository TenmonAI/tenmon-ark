#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTINUOUS_SELF_IMPROVEMENT_OVERNIGHT_DAEMON_UNTIL_4AM_CURSOR_AUTO_V1

04:00 (local tz) まで continuous self-improvement loop を反復実行する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore

CARD = "TENMON_CONTINUOUS_SELF_IMPROVEMENT_OVERNIGHT_DAEMON_UNTIL_4AM_CURSOR_AUTO_V1"
OUT_SUMMARY = "tenmon_continuous_self_improvement_overnight_daemon_summary.json"
OUT_REPORT = "tenmon_continuous_self_improvement_overnight_daemon_report.md"
OUT_HEARTBEAT = "tenmon_continuous_self_improvement_overnight_heartbeat.json"
DEFAULT_TZ = "Asia/Tokyo"
DEFAULT_END_LOCAL = "04:00"
DEFAULT_CYCLE_SEC = 300


@dataclass(frozen=True)
class Paths:
    repo: Path
    api: Path
    auto: Path
    scripts: Path
    stop_file: Path
    lock_file: Path
    summary: Path
    report: Path
    heartbeat: Path


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


def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "args": cmd,
            "stdout_tail": (p.stdout or "")[-4000:],
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "args": cmd, "stdout_tail": "", "stderr_tail": f"{type(e).__name__}: {e}"}


def parse_hhmm(v: str) -> tuple[int, int]:
    s = (v or "").strip()
    parts = s.split(":")
    if len(parts) != 2:
        return (4, 0)
    try:
        h = max(0, min(23, int(parts[0])))
        m = max(0, min(59, int(parts[1])))
        return h, m
    except Exception:
        return (4, 0)


def now_local(tz_name: str) -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ))


def next_end_dt(tz_name: str, end_local: str) -> datetime:
    h, m = parse_hhmm(end_local)
    n = now_local(tz_name)
    target = n.replace(hour=h, minute=m, second=0, microsecond=0)
    if n >= target:
        target = target + timedelta(days=1)
    return target


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
            return False, "duplicate_daemon_lock_active"
        # stale lock
        try:
            lock_file.unlink()
        except Exception:
            return False, "duplicate_daemon_lock_unremovable"
    write_json(lock_file, {"card": CARD, "pid": os.getpid(), "started_at": utc()})
    return True, "ok"


def release_lock(lock_file: Path) -> None:
    try:
        lock_file.unlink(missing_ok=True)
    except Exception:
        pass


SYSTEMD_ENV_FILE_DEFAULT = "/etc/default/tenmon-overnight-daemon"


def _overnight_service_unit_lines(
    *,
    repo: Path,
    api: Path,
    scripts: Path,
    env_file_system: str,
) -> str:
    sh_wrap = (scripts / "tenmon_continuous_self_improvement_overnight_daemon_v1.sh").resolve()
    return "\n".join(
        [
            "[Unit]",
            "Description=TENMON Overnight Continuous Self-Improvement Daemon (local end / stop file)",
            f"Documentation=file://{repo}/api/docs/constitution/TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1.md",
            "After=network-online.target",
            "Wants=network-online.target",
            "",
            "[Service]",
            "Type=simple",
            f"WorkingDirectory={api.resolve()}",
            f"EnvironmentFile=-{env_file_system}",
            f"ExecStart=/usr/bin/env bash {sh_wrap}",
            "Restart=on-failure",
            "RestartSec=30",
            "# exit 1 = duplicate lock (second instance); do not restart-loop",
            "RestartPreventExitStatus=1",
            "KillSignal=SIGTERM",
            "TimeoutStopSec=180",
            "# Lock file + stop sentinel are respected inside the Python daemon.",
            "",
            "[Install]",
            "WantedBy=multi-user.target",
            "",
        ]
    )


def emit_overnight_systemd_templates(
    repo: Path,
    api: Path,
    auto: Path,
    scripts: Path,
    *,
    stop_file: Path,
    lock_file: Path,
    tz_name: str,
    end_local: str,
    cycle_sec: int,
    env_file_system: str = SYSTEMD_ENV_FILE_DEFAULT,
) -> dict[str, Any]:
    """api/automation/out/systemd に .service と .env.example を書く（install 手順は憲章参照）。"""
    out_sd = auto / "out" / "systemd"
    out_sd.mkdir(parents=True, exist_ok=True)
    svc_path = out_sd / "tenmon-continuous-self-improvement-overnight.service"
    env_ex = out_sd / "tenmon-overnight-daemon.env.example"
    env_lines = [
        f"# Copy to {env_file_system} (root) and: sudo chmod 0640 {env_file_system}",
        f"TENMON_REPO_ROOT={repo.resolve()}",
        f"TENMON_OVERNIGHT_TZ={tz_name}",
        f"TENMON_OVERNIGHT_END_LOCAL={end_local}",
        f"TENMON_OVERNIGHT_CYCLE_SEC={cycle_sec}",
        f"TENMON_OVERNIGHT_STOP_FILE={stop_file.resolve()}",
        f"TENMON_OVERNIGHT_LOCK_FILE={lock_file.resolve()}",
        "# Optional: TENMON_OVERNIGHT_MAX_CYCLES=0",
        "# Optional: TENMON_OVERNIGHT_WRITE_SYSTEMD_TEMPLATE=1  # emit template each daemon start (off by default)",
        "",
    ]
    try:
        env_ex.write_text("\n".join(env_lines), encoding="utf-8")
        svc_path.write_text(
            _overnight_service_unit_lines(
                repo=repo.resolve(),
                api=api.resolve(),
                scripts=scripts.resolve(),
                env_file_system=env_file_system,
            ),
            encoding="utf-8",
        )
        return {
            "ok": True,
            "skip": False,
            "service_template": str(svc_path),
            "env_example": str(env_ex),
            "environment_file_system_path": env_file_system,
        }
    except Exception as e:
        return {
            "ok": False,
            "skip": True,
            "error": f"{type(e).__name__}: {e}",
        }


def create_systemd_unit(path: Path, repo: Path, api: Path, scripts: Path, env_file_system: str = SYSTEMD_ENV_FILE_DEFAULT) -> dict[str, Any]:
    content = _overnight_service_unit_lines(
        repo=repo.resolve(),
        api=api.resolve(),
        scripts=scripts.resolve(),
        env_file_system=env_file_system,
    )
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return {"ok": True, "path": str(path), "skip": False, "mode": "direct_write"}
    except Exception as e:
        return {"ok": False, "path": str(path), "skip": True, "error": f"{type(e).__name__}: {e}"}


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_continuous_self_improvement_overnight_daemon_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument("--write-systemd-unit", action="store_true")
    ap.add_argument(
        "--systemd-unit-path",
        default="/etc/systemd/system/tenmon-continuous-self-improvement-overnight.service",
    )
    ap.add_argument(
        "--emit-systemd-template-only",
        action="store_true",
        help="lock なしで api/automation/out/systemd に unit + env.example のみ生成して終了",
    )
    ap.add_argument(
        "--systemd-environment-file",
        default=os.environ.get("TENMON_OVERNIGHT_SYSTEMD_ENV_FILE", SYSTEMD_ENV_FILE_DEFAULT).strip()
        or SYSTEMD_ENV_FILE_DEFAULT,
        help="unit の EnvironmentFile= に書くパス（生成のみ・実ファイルは手動 or install スクリプト）",
    )
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    tz_name = os.environ.get("TENMON_OVERNIGHT_TZ", DEFAULT_TZ).strip() or DEFAULT_TZ
    end_local = os.environ.get("TENMON_OVERNIGHT_END_LOCAL", DEFAULT_END_LOCAL).strip() or DEFAULT_END_LOCAL
    cycle_sec = int(os.environ.get("TENMON_OVERNIGHT_CYCLE_SEC", str(DEFAULT_CYCLE_SEC)) or DEFAULT_CYCLE_SEC)
    cycle_sec = max(10, cycle_sec)
    max_cycles = int(os.environ.get("TENMON_OVERNIGHT_MAX_CYCLES", "0") or 0)  # 0: unlimited until end time

    stop_file_env = os.environ.get("TENMON_OVERNIGHT_STOP_FILE", str(auto / "tenmon_overnight_stop.signal"))
    lock_file_env = os.environ.get("TENMON_OVERNIGHT_LOCK_FILE", str(auto / ".tenmon_overnight_daemon.lock"))
    paths = Paths(
        repo=repo,
        api=api,
        auto=auto,
        scripts=scripts,
        stop_file=Path(stop_file_env),
        lock_file=Path(lock_file_env),
        summary=auto / OUT_SUMMARY,
        report=auto / OUT_REPORT,
        heartbeat=auto / OUT_HEARTBEAT,
    )

    env_file_system = str(args.systemd_environment_file).strip() or SYSTEMD_ENV_FILE_DEFAULT

    if args.emit_systemd_template_only:
        er = emit_overnight_systemd_templates(
            repo,
            api,
            auto,
            scripts,
            stop_file=paths.stop_file,
            lock_file=paths.lock_file,
            tz_name=tz_name,
            end_local=end_local,
            cycle_sec=cycle_sec,
            env_file_system=env_file_system,
        )
        print(json.dumps({"ok": bool(er.get("ok")), **er}, ensure_ascii=False))
        return 0 if er.get("ok") else 1

    unit_write_result: dict[str, Any] = {"skip": True}
    if os.environ.get("TENMON_OVERNIGHT_WRITE_SYSTEMD_TEMPLATE", "").strip().lower() in ("1", "true", "yes"):
        tr = emit_overnight_systemd_templates(
            repo,
            api,
            auto,
            scripts,
            stop_file=paths.stop_file,
            lock_file=paths.lock_file,
            tz_name=tz_name,
            end_local=end_local,
            cycle_sec=cycle_sec,
            env_file_system=env_file_system,
        )
        unit_write_result = tr if tr.get("ok") else {"skip": True, "template_error": tr.get("error")}
    if args.write_systemd_unit:
        wr = create_systemd_unit(
            Path(args.systemd_unit_path), repo, api, scripts, env_file_system=env_file_system
        )
        base: dict[str, Any] = dict(unit_write_result) if isinstance(unit_write_result, dict) else {"skip": True}
        base["etc_write"] = wr
        if wr.get("ok"):
            base["skip"] = False
            base["etc_install_path"] = wr.get("path")
        unit_write_result = base

    lock_ok, lock_note = acquire_lock(paths.lock_file)
    started = utc()
    target_end = next_end_dt(tz_name, end_local)
    if not lock_ok:
        out = {
            "card": CARD,
            "generated_at": utc(),
            "started_at": started,
            "lock_acquired": False,
            "blocked_reason": [lock_note],
            "target_end_local": str(target_end),
            "next_best_card": None,
            "morning_approval_list": str(paths.auto / "tenmon_high_risk_morning_approval_list.json"),
            "systemd_unit_write": unit_write_result,
        }
        write_json(paths.summary, out)
        return 1

    cycle = 0
    blocked: list[str] = []
    cycle_records: list[dict[str, Any]] = []

    last_master_pass = False
    last_nonfixture_executed_seen = False
    last_scorecard_refresh = False
    last_next_best_card: str | None = None
    last_morning_approval_count = 0
    latest_executed_nonfixture_count = 0
    new_result_bundle_entries = 0
    prev_bundle_count = int(len(read_json(paths.auto / "remote_cursor_result_bundle.json").get("entries") or []))

    try:
        while True:
            now_l = now_local(tz_name)
            if now_l >= target_end:
                blocked.append("end_local_reached")
                break
            if max_cycles > 0 and cycle >= max_cycles:
                blocked.append("max_cycles_reached")
                break
            if paths.stop_file.exists():
                blocked.append("stop_sentinel_detected")
                break

            cycle += 1
            c = {"cycle": cycle, "started_at": utc(), "steps": {}}

            # 1. runtime rescue
            c["steps"]["runtime_rescue"] = run(["python3", str(paths.auto / "tenmon_continuous_runtime_health_rescue_v1.py")], cwd=paths.api, timeout=1200)
            # 2. queue dedup/backpressure
            c["steps"]["queue_dedup_backpressure"] = run(["python3", str(paths.auto / "tenmon_continuous_queue_dedup_and_backpressure_v1.py")], cwd=paths.api, timeout=900)
            # 3. continuous master bundle
            c["steps"]["continuous_master_bundle"] = run(["bash", str(paths.scripts / "tenmon_continuous_self_improvement_os_master_bundle_v1.sh")], cwd=paths.api, timeout=2400)
            # 4. result bind
            c["steps"]["result_bind"] = run(["bash", str(paths.scripts / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh")], cwd=paths.api, timeout=1800)
            # 5. forensic refresh
            c["steps"]["forensic_refresh"] = run(["bash", str(paths.scripts / "tenmon_autonomy_current_state_forensic_v1.sh")], cwd=paths.api, timeout=1200)
            # 6. high-risk escrow morning list refresh（master bundleで生成済でも再計測）
            c["steps"]["escrow_morning_list_refresh"] = run(["python3", str(paths.auto / "tenmon_conversation_worldclass_mainline_selector_v1.py")], cwd=paths.api, timeout=1200)

            master = read_json(paths.auto / "tenmon_continuous_self_improvement_os_summary.json")
            bind = read_json(paths.auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")
            score = read_json(paths.auto / "tenmon_worldclass_acceptance_scorecard.json")
            forensic = read_json(paths.auto / "tenmon_autonomy_current_state_forensic.json")
            queue = read_json(paths.auto / "remote_cursor_queue.json")
            morning = read_json(paths.auto / "tenmon_high_risk_morning_approval_list.json")
            bundle = read_json(paths.auto / "remote_cursor_result_bundle.json")

            entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
            new_result_bundle_entries = max(0, len(entries) - prev_bundle_count)
            prev_bundle_count = len(entries)
            items = queue.get("items") if isinstance(queue.get("items"), list) else []
            latest_executed_nonfixture_count = len(
                [x for x in items if isinstance(x, dict) and x.get("fixture") is False and str(x.get("state") or "") == "executed"]
            )

            last_master_pass = bool(master.get("continuous_pass") is True)
            last_nonfixture_executed_seen = bool(bind.get("current_run_queue_executed") is True)
            last_scorecard_refresh = bool(bind.get("scorecard_refreshed") is True)
            last_next_best_card = str(master.get("next_best_card") or forensic.get("next_best_card") or "").strip() or None
            last_morning_approval_count = len(morning.get("items") or []) if isinstance(morning.get("items"), list) else 0

            c["signals"] = {
                "master_pass": last_master_pass,
                "nonfixture_executed_seen": last_nonfixture_executed_seen,
                "scorecard_refresh": last_scorecard_refresh,
                "next_best_card": last_next_best_card,
                "morning_approval_count": last_morning_approval_count,
                "worldclass_score": score.get("score_percent"),
                "new_result_bundle_entries": new_result_bundle_entries,
                "latest_executed_nonfixture_count": latest_executed_nonfixture_count,
            }
            c["finished_at"] = utc()
            cycle_records.append(c)

            heartbeat = {
                "card": CARD,
                "started_at": started,
                "updated_at": utc(),
                "cycle": cycle,
                "last_master_pass": last_master_pass,
                "last_nonfixture_executed_seen": last_nonfixture_executed_seen,
                "last_scorecard_refresh": last_scorecard_refresh,
                "last_next_best_card": last_next_best_card,
                "last_morning_approval_count": last_morning_approval_count,
                "target_end_local": str(target_end),
                "tz": tz_name,
            }
            write_json(paths.heartbeat, heartbeat)

            # fatal health failure: runtime rescue attempted but still API/system not ready
            if c["steps"]["runtime_rescue"].get("ok") is False and c["steps"]["forensic_refresh"].get("ok") is False:
                blocked.append("fatal_health_failure_runtime_rescue_and_forensic_failed")
                break

            time.sleep(cycle_sec)
    finally:
        release_lock(paths.lock_file)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "started_at": started,
        "finished_at": utc(),
        "cycles": cycle,
        "tz": tz_name,
        "target_end_local": str(target_end),
        "latest_executed_nonfixture_count": latest_executed_nonfixture_count,
        "new_result_bundle_entries": new_result_bundle_entries,
        "last_scorecard_refresh": last_scorecard_refresh,
        "morning_approval_list": str(paths.auto / "tenmon_high_risk_morning_approval_list.json"),
        "last_morning_approval_count": last_morning_approval_count,
        "next_best_card": last_next_best_card,
        "last_master_pass": last_master_pass,
        "last_nonfixture_executed_seen": last_nonfixture_executed_seen,
        "blocked_reason": blocked,
        "stop_file": str(paths.stop_file),
        "lock_file": str(paths.lock_file),
        "systemd_unit_write": unit_write_result,
        "cycle_records_tail": cycle_records[-5:],
    }
    write_json(paths.summary, summary)

    md = [
        f"# {CARD}",
        "",
        f"- started_at: `{summary['started_at']}`",
        f"- finished_at: `{summary['finished_at']}`",
        f"- cycles: `{summary['cycles']}`",
        f"- tz: `{summary['tz']}`",
        f"- target_end_local: `{summary['target_end_local']}`",
        f"- latest_executed_nonfixture_count: `{summary['latest_executed_nonfixture_count']}`",
        f"- new_result_bundle_entries: `{summary['new_result_bundle_entries']}`",
        f"- last_scorecard_refresh: `{summary['last_scorecard_refresh']}`",
        f"- next_best_card: `{summary['next_best_card']}`",
        f"- morning_approval_count: `{summary['last_morning_approval_count']}`",
        "",
        "## blocked_reason",
        "",
    ]
    for b in blocked:
        md.append(f"- {b}")
    if not blocked:
        md.append("- (none)")
    md.extend(["", "## latest cycle tail", ""])
    for c in cycle_records[-3:]:
        md.append(f"- cycle `{c.get('cycle')}` master_pass=`{(c.get('signals') or {}).get('master_pass')}` next=`{(c.get('signals') or {}).get('next_best_card')}`")
    paths.report.write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "cycles": cycle, "summary": str(paths.summary)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

