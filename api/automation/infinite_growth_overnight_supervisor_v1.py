#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_INFINITE_GROWTH_OVERNIGHT_SUPERVISOR_CURSOR_AUTO_V1

infinite_growth_loop_orchestrator_v1 を unattended で回すラッパー。
- 起動前: multi_ai preflight strict（空キューは infinite growth 用に許可）
- 各サイクル: オーケストレータ subprocess（GPT 裁定は --orchestra-no-dry-run で伝播）
- 証拠: /var/log/tenmon/infinite_growth/<TS>/cycles/NNN/

シェル側タイムアウト例:
  timeout 8h python3 api/automation/infinite_growth_overnight_supervisor_v1.py --auto-dir api/automation

fail-closed: preflight FAIL / 連続失敗 / audit NG / dirty 異常 / 子 rc!=0（HOLD・FAIL）で停止。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

import multi_ai_autonomy_preflight_v1 as preflight_mod

CARD = "TENMON_INFINITE_GROWTH_OVERNIGHT_SUPERVISOR_CURSOR_AUTO_V1"
ORCH_SCRIPT = "infinite_growth_loop_orchestrator_v1.py"
STOP_FN = "infinite_growth_stop_conditions_v1.json"
EVIDENCE_ROOT = Path("/var/log/tenmon/infinite_growth")

RUNTIME_FN = "infinite_growth_runtime_state.json"
PROGRESS_FN = "infinite_growth_progress_report.json"
GEN_HIST_FN = "infinite_growth_generation_history.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ts_dir() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


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


def _repo_root(auto_dir: Path) -> Path:
    return auto_dir.parents[1]


def _log(evidence: Path, msg: str) -> None:
    evidence.mkdir(parents=True, exist_ok=True)
    with (evidence / "run.log").open("a", encoding="utf-8") as f:
        f.write(f"{_utc_iso()} {msg}\n")


def _audit(base_url: str | None) -> dict[str, Any]:
    out: dict[str, Any] = {"skipped": True, "ok": None, "http_code": None, "error": None}
    if not base_url:
        return out
    url = base_url.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            code = resp.getcode()
            body = resp.read(8000).decode("utf-8", errors="replace")
        try:
            j = json.loads(body)
            ok = bool(j.get("ok")) if isinstance(j, dict) else 200 <= code < 300
        except Exception:
            ok = 200 <= code < 300
        out = {"skipped": False, "ok": ok, "http_code": code, "error": None, "url": url}
    except urllib.error.HTTPError as e:
        out = {"skipped": False, "ok": False, "http_code": e.code, "error": str(e), "url": url}
    except Exception as e:
        out = {"skipped": False, "ok": False, "http_code": None, "error": str(e), "url": url}
    return out


def _dirty_count(repo: Path) -> int:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
        )
        return len([x for x in (r.stdout or "").splitlines() if x.strip()])
    except Exception:
        return -1


def _load_stop(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / STOP_FN)


def _snapshot_cycle(evidence: Path, cycle: int, auto_dir: Path) -> None:
    cdir = evidence / "cycles" / f"{cycle:03d}"
    cdir.mkdir(parents=True, exist_ok=True)
    for fn in (RUNTIME_FN, PROGRESS_FN, GEN_HIST_FN):
        src = auto_dir / fn
        if src.is_file():
            shutil.copy2(src, cdir / fn)


def _parse_orchestrator_stdout(stdout: str) -> dict[str, Any]:
    for line in reversed((stdout or "").strip().splitlines()):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            j = json.loads(line)
            if isinstance(j, dict):
                return j
        except Exception:
            continue
    return {}


def _wrapper_gate(
    *,
    repo: Path,
    base_url: str | None,
    stop: dict[str, Any],
    ig_progress: dict[str, Any],
) -> tuple[bool, str]:
    dirty = _dirty_count(repo)
    lim = int(stop.get("abort_on_repo_dirty_over") or 99999)
    if dirty >= lim >= 0:
        return False, "wrapper_repo_dirty_over"

    au = _audit(base_url)
    if stop.get("abort_on_audit_fail") and not au.get("skipped") and au.get("ok") is False:
        return False, "wrapper_audit_failed"

    ch = int(ig_progress.get("consecutive_hold_reason_count") or 0)
    mx = int(stop.get("consecutive_same_hold_reason_max") or 99)
    if ch >= mx >= 1:
        return False, "wrapper_repeated_hold_reason"

    return True, "ok"


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--api-base-url", type=str, default=os.environ.get("TENMON_API_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--allow-missing-api-base",
        action="store_true",
        help="開発のみ: API base なし・preflight audit スキップ許可（本番 unattended 非推奨）",
    )
    ap.add_argument(
        "--expected-head",
        type=str,
        default=os.environ.get("TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD", ""),
    )
    ap.add_argument(
        "--allow-missing-expected-head",
        action="store_true",
        help="封印 SHA 未指定でも preflight 続行（本番非推奨）",
    )
    ap.add_argument("--iterations", type=int, default=32, help="外側ループ回数（各回オーケストレータ 1 回起動）")
    ap.add_argument(
        "--inner-max-cycles",
        type=int,
        default=1,
        help="各起動で orchestrator に渡す --max-cycles（既定 1 でログ粒度を細かく）",
    )
    ap.add_argument(
        "--orchestrator-timeout-seconds",
        type=int,
        default=7200,
        help="1 回の orchestrator subprocess の上限秒",
    )
    ap.add_argument(
        "--wall-clock-seconds",
        type=int,
        default=0,
        help="0 以外なら経過後に正常終了（残イテレーションはスキップ）",
    )
    ap.add_argument("--skip-npm", action="store_true")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="オーケストレータへ --dry-run（本番 unattended では付けない）",
    )
    ap.add_argument(
        "--orchestra-dry-run",
        action="store_true",
        help="オーケストレータへ orchestra dry-run（GPT 非接続。既定は orchestra-no-dry-run）",
    )
    ap.add_argument("--cursor-dry-run", action="store_true", help="cursor bridge dry-run（推奨: unattended では既定 ON）")
    ap.add_argument("--live-cursor", action="store_true", help="cursor-dry-run を付けない（実 Cursor 前提）")
    ap.add_argument(
        "--bypass-dryrun-gate",
        action="store_true",
        help="multi_ai dryrun ゲートバイパス（本番非推奨）",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    repo = _repo_root(auto_dir)
    base_url = (args.api_base_url or "").strip() or None
    allow_no_audit = bool(getattr(args, "allow_missing_api_base", False))
    if not base_url and not allow_no_audit:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "api_base_url_required_or_pass_--allow-missing-api-base_dev_only",
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        sys.exit(2)
    exp = (args.expected_head or "").strip() or None
    allow_miss = bool(args.allow_missing_expected_head) or os.environ.get(
        "TENMON_PREFLIGHT_ALLOW_MISSING_SEALED_HEAD", ""
    ).strip() == "1"

    ts = _ts_dir()
    evidence = EVIDENCE_ROOT / ts
    evidence.mkdir(parents=True, exist_ok=True)

    stop = _load_stop(auto_dir)

    manifest = {
        "schema": "INFINITE_GROWTH_OVERNIGHT_MANIFEST_V1",
        "card": CARD,
        "started_at": _utc_iso(),
        "auto_dir": str(auto_dir),
        "repo": str(repo),
        "iterations": int(args.iterations),
        "inner_max_cycles": int(args.inner_max_cycles),
        "api_base_url": base_url,
        "dry_run": bool(args.dry_run),
        "orchestra_dry_run": bool(args.orchestra_dry_run),
        "cursor_dry_run": (bool(args.cursor_dry_run) or not bool(args.live_cursor)),
        "allow_missing_api_base": allow_no_audit,
        "notes": "timeout 8h python3 ... でシェル側上限を掛けること",
    }
    _write_json(evidence / "manifest.json", manifest)
    _log(evidence, f"start manifest={manifest}")

    pr, prc = preflight_mod.run_preflight(
        auto_dir=auto_dir,
        base_url=base_url,
        expected_head=exp,
        allow_missing_expected_head=allow_miss,
        allow_dirty_repo=False,
        allow_no_audit=allow_no_audit,
        write_result=True,
        allow_empty_queue=True,
    )
    _write_json(evidence / "preflight_result.json", pr)
    if prc != 0:
        _log(evidence, f"preflight FAIL exit={prc}")
        _write_json(
            evidence / "summary.json",
            {"ok": False, "stopped_reason": "preflight_fail", "preflight_exit": prc},
        )
        sys.exit(prc)

    orch_py = auto_dir / ORCH_SCRIPT
    if not orch_py.is_file():
        _log(evidence, f"missing {ORCH_SCRIPT}")
        _write_json(evidence / "summary.json", {"ok": False, "stopped_reason": "missing_orchestrator"})
        sys.exit(2)

    t0 = time.monotonic()
    last_results: list[dict[str, Any]] = []
    cursor_dry = bool(args.cursor_dry_run) or not bool(args.live_cursor)

    for it in range(1, int(args.iterations) + 1):
        if int(args.wall_clock_seconds) > 0:
            if (time.monotonic() - t0) >= int(args.wall_clock_seconds):
                _log(evidence, "wall_clock_exceeded graceful_stop")
                break

        ig_pr = _read_json(auto_dir / PROGRESS_FN)
        ok_gate, gwhy = _wrapper_gate(repo=repo, base_url=base_url, stop=stop, ig_progress=ig_pr)
        if not ok_gate:
            _log(evidence, f"wrapper_gate {gwhy}")
            _snapshot_cycle(evidence, it, auto_dir)
            _write_json(
                evidence / "summary.json",
                {
                    "ok": False,
                    "stopped_reason": gwhy,
                    "iteration": it,
                    "results_tail": last_results[-8:],
                },
            )
            _write_json(
                evidence / "restore_hints.json",
                {
                    "auto_dir": str(auto_dir),
                    "evidence_dir": str(evidence),
                    "copied_each_cycle": [RUNTIME_FN, PROGRESS_FN, GEN_HIST_FN],
                    "note": "cycles/NNN/ から auto_dir へ必要 JSON を手動マージで状態参照を復元可能",
                },
            )
            sys.exit(2)

        cmd = [
            sys.executable,
            str(orch_py),
            "--auto-dir",
            str(auto_dir),
            "--max-cycles",
            str(int(args.inner_max_cycles)),
        ]
        if base_url:
            cmd.extend(["--api-base-url", base_url])
        elif allow_no_audit:
            pass
        if bool(args.skip_npm):
            cmd.append("--skip-npm")
        if bool(args.dry_run):
            cmd.append("--dry-run")
        if bool(args.orchestra_dry_run):
            pass
        else:
            cmd.append("--orchestra-no-dry-run")
        if cursor_dry:
            cmd.append("--cursor-dry-run")
        if bool(args.bypass_dryrun_gate):
            cmd.append("--bypass-dryrun-gate")

        _log(evidence, f"iteration {it} cmd={' '.join(cmd)}")
        oto = int(args.orchestrator_timeout_seconds)
        try:
            proc = subprocess.run(
                cmd,
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=oto if oto > 0 else None,
            )
        except subprocess.TimeoutExpired as e:
            _log(evidence, f"orchestrator timeout iter={it}")
            _snapshot_cycle(evidence, it, auto_dir)
            if e.stdout:
                (evidence / "cycles" / f"{it:03d}" / "orchestrator_timeout.stdout.log").parent.mkdir(
                    parents=True, exist_ok=True
                )
                (evidence / "cycles" / f"{it:03d}" / "orchestrator_timeout.stdout.log").write_text(
                    e.stdout[-48000:], encoding="utf-8"
                )
            _write_json(
                evidence / "summary.json",
                {"ok": False, "stopped_reason": "orchestrator_timeout", "iteration": it},
            )
            sys.exit(6)

        out_path = evidence / "cycles" / f"{it:03d}"
        out_path.mkdir(parents=True, exist_ok=True)
        if proc.stdout:
            (out_path / "orchestrator_stdout.log").write_text(proc.stdout[-96000:], encoding="utf-8")
        if proc.stderr:
            (out_path / "orchestrator_stderr.log").write_text(proc.stderr[-24000:], encoding="utf-8")

        parsed = _parse_orchestrator_stdout(proc.stdout or "")
        last_results.append(
            {
                "iteration": it,
                "rc": proc.returncode,
                "parsed": parsed,
            }
        )
        _snapshot_cycle(evidence, it, auto_dir)

        if proc.returncode != 0:
            _log(
                evidence,
                f"orchestrator rc={proc.returncode} iter={it} msg={parsed.get('message')} HOLD_or_FAIL_stop",
            )
            _write_json(
                evidence / "summary.json",
                {
                    "ok": False,
                    "stopped_reason": "orchestrator_nonzero_hold_or_fail",
                    "iteration": it,
                    "returncode": proc.returncode,
                    "parsed": parsed,
                },
            )
            _write_json(
                evidence / "restore_hints.json",
                {
                    "auto_dir": str(auto_dir),
                    "evidence_dir": str(evidence),
                    "copied_each_cycle": [RUNTIME_FN, PROGRESS_FN, GEN_HIST_FN],
                },
            )
            sys.exit(proc.returncode if proc.returncode else 2)

        _log(evidence, f"orchestrator ok iter={it} msg={parsed.get('message')}")

    _write_json(
        evidence / "summary.json",
        {
            "ok": True,
            "stopped_reason": "iterations_complete",
            "iterations_run": int(args.iterations),
            "results_tail": last_results[-16:],
        },
    )
    _write_json(
        evidence / "restore_hints.json",
        {
            "auto_dir": str(auto_dir),
            "evidence_dir": str(evidence),
            "copied_each_cycle": [RUNTIME_FN, PROGRESS_FN, GEN_HIST_FN],
        },
    )
    _log(evidence, "complete OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
