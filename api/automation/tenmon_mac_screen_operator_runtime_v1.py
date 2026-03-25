#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_SCREEN_OPERATOR_RUNTIME_CURSOR_AUTO_V1
Mac 実機での画面操作最小基盤の current-run 証明。
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

CARD = "TENMON_MAC_SCREEN_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_SCREEN_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_darwin() -> bool:
    return sys.platform == "darwin"


def app_bundle_exists(name: str) -> bool:
    p = Path("/Applications") / f"{name}.app"
    return p.is_dir()


def probe_imports() -> dict[str, bool]:
    out: dict[str, bool] = {}
    for mod in ("pyautogui", "PIL", "pyperclip"):
        try:
            __import__(mod)
            out[mod] = True
        except Exception:
            out[mod] = False
    return out


def run_screencapture(out: Path) -> tuple[bool, str]:
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        p = subprocess.run(
            ["screencapture", "-x", str(out)],
            capture_output=True,
            text=True,
            timeout=90,
        )
        if p.returncode != 0:
            return False, (p.stderr or p.stdout or "screencapture_failed")[:500]
        return True, "ok"
    except FileNotFoundError:
        return False, "screencapture_not_found"
    except Exception as e:
        return False, str(e)


def open_app_proof(app_name: str) -> tuple[bool, str]:
    """open -a で起動試行（失敗時は stderr を返す）。"""
    try:
        p = subprocess.run(
            ["open", "-a", app_name],
            capture_output=True,
            text=True,
            timeout=45,
        )
        if p.returncode != 0:
            return False, (p.stderr or p.stdout or "open_failed")[:400]
        return True, "ok"
    except Exception as e:
        return False, str(e)


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_screen_operator_runtime_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--skip-app-launch",
        action="store_true",
        help="Chrome/Cursor の実起動をせず /Applications の存在のみ確認",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    evidence_dir = auto / "out" / "mac_screen_operator_runtime"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    skip_launch = args.skip_app_launch or os.environ.get("TENMON_MAC_OPERATOR_SKIP_APP_LAUNCH", "").strip() in (
        "1",
        "true",
        "yes",
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "platform": sys.platform,
        "darwin": is_darwin(),
        "skip_app_launch": skip_launch,
        "screen_capture_ok": False,
        "browser_open_ok": False,
        "cursor_open_ok": False,
        "paste_ok": False,
        "current_run_evidence_ok": False,
        "mac_screen_operator_runtime_pass": False,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "phases": {},
    }

    if not is_darwin():
        out["fail_reason"] = "mac_only_required"
        out["current_run_evidence_ok"] = False
        write_json(auto / "tenmon_mac_screen_operator_runtime_summary.json", out)
        (auto / "tenmon_mac_screen_operator_runtime_report.md").write_text(
            f"# {CARD}\n\n- **FAIL**: not macOS (Darwin)\n",
            encoding="utf-8",
        )
        return 1

    imp = probe_imports()
    out["phases"]["imports"] = imp
    imports_ok = all(imp.get(m) for m in ("pyautogui", "PIL", "pyperclip"))
    if not imports_ok:
        out["fail_reason"] = "import_error"
        out["current_run_evidence_ok"] = True
        write_json(auto / "tenmon_mac_screen_operator_runtime_summary.json", out)
        (auto / "tenmon_mac_screen_operator_runtime_report.md").write_text(
            f"# {CARD}\n\n- import_error: `{imp}`\n",
            encoding="utf-8",
        )
        return 1

    ss_cli = evidence_dir / f"screencapture_cli_{int(time.time())}.png"
    sc_ok, sc_msg = run_screencapture(ss_cli)
    out["phases"]["screencapture_cli"] = {"ok": sc_ok, "detail": sc_msg, "path": str(ss_cli) if sc_ok else None}
    out["screen_capture_ok"] = sc_ok and ss_cli.is_file()

    if skip_launch:
        out["browser_open_ok"] = app_bundle_exists("Google Chrome")
        out["cursor_open_ok"] = app_bundle_exists("Cursor")
        out["phases"]["browser"] = {"mode": "bundle_check_only", "ok": out["browser_open_ok"]}
        out["phases"]["cursor"] = {"mode": "bundle_check_only", "ok": out["cursor_open_ok"]}
    else:
        bo, bm = open_app_proof("Google Chrome")
        co, cm = open_app_proof("Cursor")
        out["browser_open_ok"] = bo
        out["cursor_open_ok"] = co
        out["phases"]["browser"] = {"ok": bo, "detail": bm}
        out["phases"]["cursor"] = {"ok": co, "detail": cm}

    paste_ok = False
    operator_proof: dict[str, Any] = {}
    _automation = Path(__file__).resolve().parent
    if str(_automation) not in sys.path:
        sys.path.insert(0, str(_automation))
    try:
        from mac_screen_operator_v1 import MacScreenOperator

        op = MacScreenOperator()
        ss2 = evidence_dir / f"operator_screenshot_{int(time.time())}.png"
        s_ok, s_msg, pth = op.screenshot(ss2)
        operator_proof["screenshot"] = {"ok": s_ok, "detail": s_msg, "path": str(pth) if pth else None}
        ck_ok, ck_detail = op.click_center()
        operator_proof["click_center"] = {"ok": ck_ok, "detail": ck_detail}
        ty_ok, ty_detail = op.type_text(" ")
        operator_proof["type_space"] = {"ok": ty_ok, "detail": ty_detail}
        pa_ok, pa_detail = op.paste_text("tenmon_mac_probe")
        operator_proof["paste"] = {"ok": pa_ok, "detail": pa_detail}
        paste_ok = pa_ok
    except Exception as e:
        operator_proof["error"] = str(e)

    out["phases"]["operator"] = operator_proof
    out["paste_ok"] = paste_ok

    evidence_paths: list[Path] = []
    if sc_ok and ss_cli.is_file():
        evidence_paths.append(ss_cli)
    sp = operator_proof.get("screenshot") or {}
    if sp.get("path") and Path(str(sp["path"])).is_file():
        evidence_paths.append(Path(str(sp["path"])))
    out["current_run_evidence_ok"] = len(evidence_paths) >= 1 and out["screen_capture_ok"]

    out["mac_screen_operator_runtime_pass"] = bool(
        out["screen_capture_ok"]
        and out["browser_open_ok"]
        and out["cursor_open_ok"]
        and out["paste_ok"]
        and out["current_run_evidence_ok"]
    )

    summary_path = auto / "tenmon_mac_screen_operator_runtime_summary.json"
    report_path = auto / "tenmon_mac_screen_operator_runtime_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- screen_capture_ok: `{out['screen_capture_ok']}`",
                f"- browser_open_ok: `{out['browser_open_ok']}`",
                f"- cursor_open_ok: `{out['cursor_open_ok']}`",
                f"- paste_ok: `{out['paste_ok']}`",
                f"- current_run_evidence_ok: `{out['current_run_evidence_ok']}`",
                f"- mac_screen_operator_runtime_pass: `{out['mac_screen_operator_runtime_pass']}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if out["mac_screen_operator_runtime_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
