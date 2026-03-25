#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1

self_improvement_os の canonical 出力先へ必須4ファイルを揃え、
exit code を integrated_final_verdict / runner 由来の最終判定と一致させる。

Canonical out: api/automation/out/tenmon_self_improvement_os_v1
必須: self_improvement_os_manifest.json, seal_governor_verdict.json,
      next_card_dispatch.json, integrated_final_verdict.json
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_VPS_V1"
FAIL_NEXT = "TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_RETRY_CURSOR_AUTO_V1"

REQUIRED_FILES = (
    "self_improvement_os_manifest.json",
    "seal_governor_verdict.json",
    "next_card_dispatch.json",
    "integrated_final_verdict.json",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _run_readlink_card() -> Optional[Path]:
    try:
        out = subprocess.run(
            ["readlink", "-f", "/var/log/tenmon/card"],
            capture_output=True,
            text=True,
            check=False,
        )
        if out.returncode != 0 or not out.stdout.strip():
            return None
        p = Path(out.stdout.strip())
        return p if p.is_dir() else None
    except Exception:
        return None


def _discover_integrated_dirs() -> List[Path]:
    """最新候補が先頭になるよう mtime 降順で並べる。"""
    found: List[Path] = []
    base = Path("/var/log/tenmon")
    if not base.is_dir():
        return found
    # symlink card → .../_self_improvement_os_integrated
    card = _run_readlink_card()
    if card:
        osi = card / "_self_improvement_os_integrated"
        if osi.is_dir():
            found.append(osi)
    # card_* 配下
    for d in sorted(base.glob("card_*"), key=lambda p: p.stat().st_mtime, reverse=True):
        osi = d / "_self_improvement_os_integrated"
        if osi.is_dir() and osi not in found:
            found.append(osi)
    return found


def _pick_best_integrated_source(explicit: Optional[Path]) -> Tuple[Optional[Path], str]:
    if explicit and explicit.is_dir():
        return explicit, "explicit"
    env = os.environ.get("TENMON_SELF_IMPROVEMENT_OS_INTEGRATED_DIR", "").strip()
    if env:
        p = Path(env).expanduser()
        if p.is_dir():
            return p, "env_TENMON_SELF_IMPROVEMENT_OS_INTEGRATED_DIR"
    for osi in _discover_integrated_dirs():
        return osi, "discovered_var_log"
    return None, "none"


def _write_stub_artifacts(canonical: Path, reason: str, integrated_src: Optional[Path]) -> None:
    ts = _utc_now_iso()
    canonical.mkdir(parents=True, exist_ok=True)
    manifest: Dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "generatedAt": ts,
        "source": "self_improvement_os_contract_close_v1",
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "readiness": "blocked",
        "canonical_out_dir": str(canonical),
        "integrated_source_dir": str(integrated_src) if integrated_src else None,
        "stub_reason": reason,
        "steps": [],
        "paths": {name: str(canonical / name) for name in REQUIRED_FILES},
    }
    (canonical / "self_improvement_os_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    sg = {
        "version": 1,
        "card": "TENMON_SELF_IMPROVEMENT_SEAL_GOVERNOR_STUB",
        "generatedAt": ts,
        "adoption_sealed": False,
        "canonical_contract_close": True,
        "readiness": "blocked",
        "reason": reason,
        "vps_marker": VPS_MARKER,
    }
    (canonical / "seal_governor_verdict.json").write_text(
        json.dumps(sg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    nd = {
        "version": 1,
        "card": "TENMON_OS_INTEGRATED_NEXT_CARD_DISPATCH_V1",
        "generatedAt": ts,
        "adoption_sealed": False,
        "canonical_contract_close": True,
        "readiness": "blocked",
        "dispatch": [
            {
                "source": "canonical_contract_close",
                "blocker": reason,
                "cursor_card": FAIL_NEXT,
                "vps_card": VPS_MARKER,
                "stage_hint": "rerun_self_improvement_os_runner_or_provide_integrated_dir",
            }
        ],
    }
    (canonical / "next_card_dispatch.json").write_text(
        json.dumps(nd, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    iv = {
        "version": 1,
        "card": CARD,
        "source": "self_improvement_os_contract_close_v1",
        "generatedAt": ts,
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "readiness": "blocked",
        "overall": {"ok": False, "pass": False},
        "runner": {
            "runner_pass": False,
            "exit_code": 1,
            "reason": "canonical_contract_close_stub",
            "stub_detail": reason,
        },
    }
    (canonical / "integrated_final_verdict.json").write_text(
        json.dumps(iv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _copy_required(src: Path, dst: Path) -> Dict[str, str]:
    """各必須ファイルについて 'copied' | 'missing' を返す。"""
    status: Dict[str, str] = {}
    dst.mkdir(parents=True, exist_ok=True)
    for name in REQUIRED_FILES:
        sp = src / name
        if sp.is_file():
            shutil.copy2(sp, dst / name)
            status[name] = "copied"
        else:
            status[name] = "missing"
    return status


def _fill_missing_with_stubs(canonical: Path, copy_status: Dict[str, str], integrated_src: Path) -> str:
    """欠損のみ埋め、readiness は partial または blocked。"""
    ts = _utc_now_iso()
    any_real = any(copy_status.get(n) == "copied" for n in REQUIRED_FILES)
    readiness = "partial" if any_real else "blocked"
    for name in REQUIRED_FILES:
        if copy_status.get(name) == "copied":
            continue
        if name == "self_improvement_os_manifest.json":
            body: Dict[str, Any] = {
                "version": 1,
                "card": CARD,
                "generatedAt": ts,
                "source": "self_improvement_os_contract_close_v1",
                "vps_marker": VPS_MARKER,
                "readiness": readiness,
                "canonical_out_dir": str(canonical),
                "integrated_source_dir": str(integrated_src),
                "paths": {n: str(canonical / n) for n in REQUIRED_FILES},
                "note": "filled_by_contract_close_missing_upstream_file",
            }
        elif name == "seal_governor_verdict.json":
            body = {
                "version": 1,
                "generatedAt": ts,
                "adoption_sealed": False,
                "canonical_contract_close": True,
                "readiness": readiness,
                "reason": "upstream_missing_seal_governor_verdict",
            }
        elif name == "next_card_dispatch.json":
            body = {
                "version": 1,
                "card": "TENMON_OS_INTEGRATED_NEXT_CARD_DISPATCH_V1",
                "generatedAt": ts,
                "adoption_sealed": False,
                "readiness": readiness,
                "dispatch": [
                    {
                        "source": "canonical_contract_close",
                        "blocker": "partial_copy_upstream_incomplete",
                        "cursor_card": FAIL_NEXT,
                        "vps_card": VPS_MARKER,
                    }
                ],
            }
        else:
            body = {
                "version": 1,
                "card": CARD,
                "source": "self_improvement_os_contract_close_v1",
                "generatedAt": ts,
                "readiness": readiness,
                "vps_marker": VPS_MARKER,
                "fail_next_cursor_card": FAIL_NEXT,
                "overall": {"ok": False, "pass": False},
                "runner": {
                    "runner_pass": False,
                    "exit_code": 1,
                    "reason": "canonical_contract_close_partial_stub",
                },
            }
        (canonical / name).write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return readiness


def _exit_code_from_integrated(iv: Dict[str, Any]) -> int:
    """runner.exit_code を優先。無ければ runner_pass から 0/1。"""
    runner = iv.get("runner") if isinstance(iv.get("runner"), dict) else {}
    if "exit_code" in runner and isinstance(runner["exit_code"], int):
        return 0 if runner["exit_code"] == 0 else 1
    if "runner_pass" in runner:
        return 0 if runner.get("runner_pass") else 1
    overall = iv.get("overall") if isinstance(iv.get("overall"), dict) else {}
    if "ok" in overall:
        return 0 if overall.get("ok") else 1
    if "pass" in overall:
        return 0 if overall.get("pass") else 1
    return 1


def _readiness_from_artifacts(
    canonical: Path,
    copy_status: Dict[str, str],
    had_real_source: bool,
    had_upstream_missing: bool,
) -> str:
    iv = _read_json(canonical / "integrated_final_verdict.json") or {}
    src = iv.get("source")
    if src == "self_improvement_os_contract_close_v1":
        r = iv.get("readiness")
        if r in ("blocked", "partial", "ready"):
            return str(r)
        return "blocked"
    if had_upstream_missing:
        return "partial"
    ok_all = all(
        copy_status.get(n) in ("copied", "copied_or_filled") for n in REQUIRED_FILES
    )
    if ok_all and had_real_source:
        return "ready"
    return "blocked"


def _run_runner(api: Path, stdout_json: bool) -> int:
    runner = api / "automation" / "self_improvement_os_runner_v1.py"
    cmd = [sys.executable, str(runner), "run"]
    if os.environ.get("OS_RUNNER_SEAL_DIR"):
        cmd.extend(["--seal-dir", os.environ["OS_RUNNER_SEAL_DIR"]])
    if os.environ.get("OS_RUNNER_SKIP_SEAL") == "1":
        cmd.append("--skip-seal")
        cmd.extend(["--seal-exit-code", os.environ.get("OS_RUNNER_SEAL_EXIT_CODE", "0")])
    if os.environ.get("OS_RUNNER_TS_FOLDER"):
        cmd.extend(["--ts-folder", os.environ["OS_RUNNER_TS_FOLDER"]])
    if stdout_json:
        cmd.append("--stdout-json")
    return subprocess.run(cmd, cwd=str(api)).returncode


def _write_summary(
    canonical: Path,
    *,
    copy_status: Dict[str, str],
    readiness: str,
    integrated_src: Optional[Path],
    source_resolution: str,
    exit_code: int,
    runner_invoked: bool,
) -> None:
    body = {
        "version": 1,
        "card": CARD,
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "generatedAt": _utc_now_iso(),
        "canonical_out_dir": str(canonical),
        "rc": exit_code,
        "meaning": {
            "rc": "プロセス終了コード（integrated_final_verdict の runner.exit_code / runner_pass と一致）",
            "out_dir": "deep/micro/state 系が参照する self_improvement_os 正規成果物ディレクトリ（TENMON_SELF_IMPROVEMENT_OS_OUT_DIR で上書き可）",
        },
        "readiness": readiness,
        "readiness_meaning": {
            "ready": "実 runner 由来の必須4ファイルが揃い、コピー欠損なし",
            "partial": "一部のみ runner 由来、残りは contract_close が補完",
            "blocked": "ソース無しまたはスタブ主体（再実行・seal 修復が必要）",
        },
        "integrated_source_dir": str(integrated_src) if integrated_src else None,
        "source_resolution": source_resolution,
        "required_files": {n: copy_status.get(n, "unknown") for n in REQUIRED_FILES},
        "runner_invoked": runner_invoked,
        "exit_code_matches_final_verdict": True,
    }
    (canonical / "canonical_contract_close_summary.json").write_text(
        json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (canonical / VPS_MARKER).write_text(
        json.dumps({"marker": VPS_MARKER, "generatedAt": body["generatedAt"]}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-dir",
        default=os.environ.get("TENMON_SELF_IMPROVEMENT_OS_OUT_DIR", "").strip(),
        help="canonical（既定: api/automation/out/tenmon_self_improvement_os_v1）",
    )
    ap.add_argument("--integrated-dir", default="", help="コピー元 _self_improvement_os_integrated")
    ap.add_argument(
        "--run-runner",
        action="store_true",
        help="先に self_improvement_os_runner_v1.py run を実行（OS_RUNNER_* env 参照）",
    )
    ap.add_argument(
        "--runner-stdout-json",
        action="store_true",
        help="runner に --stdout-json を付与",
    )
    ns = ap.parse_args()

    api = _api_root()
    canonical = Path(ns.out_dir).expanduser() if ns.out_dir else api / "automation" / "out" / "tenmon_self_improvement_os_v1"
    canonical = canonical.resolve()

    explicit = Path(ns.integrated_dir).expanduser() if ns.integrated_dir else None
    integrated_src, source_resolution = _pick_best_integrated_source(explicit)

    runner_invoked = False
    if ns.run_runner:
        runner_invoked = True
        _run_runner(api, ns.runner_stdout_json)
        integrated_src, source_resolution = _pick_best_integrated_source(explicit)

    copy_status: Dict[str, str] = {}
    had_real_source = integrated_src is not None

    if not integrated_src:
        _write_stub_artifacts(canonical, "no_integrated_source_directory", None)
        copy_status = {n: "stub" for n in REQUIRED_FILES}
        readiness = "blocked"
        exit_code = 1
        _write_summary(
            canonical,
            copy_status=copy_status,
            readiness=readiness,
            integrated_src=None,
            source_resolution=source_resolution,
            exit_code=exit_code,
            runner_invoked=runner_invoked,
        )
        return exit_code

    copy_status = _copy_required(integrated_src, canonical)
    had_upstream_missing = any(copy_status[n] == "missing" for n in REQUIRED_FILES)
    if had_upstream_missing:
        _fill_missing_with_stubs(canonical, copy_status, integrated_src)
        copy_status = {n: "copied_or_filled" for n in REQUIRED_FILES}

    iv = _read_json(canonical / "integrated_final_verdict.json")
    if not iv:
        readiness = "blocked"
        exit_code = 1
    else:
        exit_code = _exit_code_from_integrated(iv)
        readiness = _readiness_from_artifacts(
            canonical, copy_status, had_real_source, had_upstream_missing
        )

    _write_summary(
        canonical,
        copy_status=copy_status,
        readiness=readiness,
        integrated_src=integrated_src,
        source_resolution=source_resolution,
        exit_code=exit_code,
        runner_invoked=runner_invoked,
    )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
