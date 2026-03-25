#!/usr/bin/env python3
"""
TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1
Machine-readable env + driver selection for PWA lived probes.
Driver priority: python_playwright（import+chromium） > node_playwright（npm exec + probe） > fail
Python / Node の二重系を明示し、lived gate の単一 driver を JSON に残す。
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1"


def _normalize_base(raw: str) -> str:
    s = (raw or "").strip().rstrip("/")
    return s or "https://tenmon-ark.com"


def fetch_status(url: str, timeout: float = 45.0) -> tuple[int, str | None]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return int(getattr(r, "status", 200) or 200), None
    except urllib.error.HTTPError as e:
        return int(e.code), str(e)
    except Exception as e:
        return 0, str(e)


def which_or_empty(name: str) -> str:
    return shutil.which(name) or ""


def python_has_pip(py: str) -> bool:
    try:
        p = subprocess.run([py, "-m", "pip", "--version"], capture_output=True, text=True, timeout=15)
        return p.returncode == 0
    except Exception:
        return False


def python_has_ensurepip(py: str) -> bool:
    try:
        p = subprocess.run([py, "-m", "ensurepip", "--version"], capture_output=True, text=True, timeout=15)
        return p.returncode == 0
    except Exception:
        return False


def observe_pip_feasibility(py: str) -> dict[str, Any]:
    """pip / ensurepip / apt の導入可否を観測（修復はしない）。"""
    pip_line = ""
    try:
        p = subprocess.run([py, "-m", "pip", "--version"], capture_output=True, text=True, timeout=15)
        pip_line = (p.stdout or p.stderr or "").strip()[:500]
    except Exception as e:
        pip_line = repr(e)

    apt_ok = bool(which_or_empty("apt-get"))
    return {
        "python_pip_module_ok": python_has_pip(py),
        "python_pip_version_line": pip_line,
        "python_ensurepip_available": python_has_ensurepip(py),
        "apt_get_available": apt_ok,
        "apt_install_python3_pip_hint": (
            "DEBIAN_FRONTEND=noninteractive apt-get update && "
            "apt-get install -y python3-pip"
            if apt_ok
            else "apt-get not found; use OS package manager for python3-pip"
        ),
    }


def python_has_playwright(py: str) -> tuple[bool, str | None]:
    try:
        p = subprocess.run(
            [py, "-c", "from playwright.sync_api import sync_playwright"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if p.returncode == 0:
            return True, None
        return False, (p.stderr or p.stdout or "")[-500:]
    except Exception as e:
        return False, repr(e)


def chromium_smoke_python(py: str) -> tuple[bool, str | None]:
    try:
        code = """
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    b.close()
"""
        p = subprocess.run([py, "-c", code], capture_output=True, text=True, timeout=60)
        if p.returncode == 0:
            return True, None
        return False, (p.stderr or p.stdout or "")[-800:]
    except Exception as e:
        return False, repr(e)


_NODE_PROBE_INLINE = r"""
(async () => {
  const out = {
    package_resolve_ok: false,
    node_playwright_ok: false,
    browser_launch_ok: false,
    error: null,
  };
  try {
    const pw = await import("playwright");
    out.package_resolve_ok = true;
    out.node_playwright_ok = true;
    const browser = await pw.chromium.launch({ headless: true });
    out.browser_launch_ok = true;
    await browser.close();
  } catch (e) {
    out.error = e && e.message ? String(e.message) : String(e);
  }
  console.log(JSON.stringify(out));
})();
"""


def _parse_last_json_line(stdout: str) -> dict[str, Any]:
    for line in reversed((stdout or "").strip().split("\n")):
        line = line.strip()
        if line.startswith("{"):
            try:
                j = json.loads(line)
                if isinstance(j, dict):
                    return j
            except Exception:
                continue
    return {}


def run_node_probe_mjs(_repo_root: Path) -> dict[str, Any]:
    """一時ディレクトリで npm install playwright し、import + chromium launch を検証。
    npm exec でリポジトリ上の .mjs を叩くと import 解決が壊れるため、cwd ベースで検査する。
    """
    npm = which_or_empty("npm")
    if not npm:
        return {
            "package_resolve_ok": False,
            "node_playwright_ok": False,
            "browser_launch_ok": False,
            "error": "npm_not_found",
            "probe_method": "tempdir_npm_install",
        }
    td = Path(tempfile.mkdtemp(prefix="tenmon_pw_node_probe_"))
    try:
        r0 = subprocess.run([npm, "init", "-y"], cwd=str(td), capture_output=True, text=True, timeout=40)
        if r0.returncode != 0:
            return {
                "package_resolve_ok": False,
                "node_playwright_ok": False,
                "browser_launch_ok": False,
                "error": f"npm_init_failed:{(r0.stderr or r0.stdout or '')[-400:]}",
                "probe_method": "tempdir_npm_install",
            }
        r1 = subprocess.run(
            [npm, "install", "playwright@1.58.2"],
            cwd=str(td),
            capture_output=True,
            text=True,
            timeout=300,
        )
        if r1.returncode != 0:
            return {
                "package_resolve_ok": False,
                "node_playwright_ok": False,
                "browser_launch_ok": False,
                "error": f"npm_install_playwright_failed:{(r1.stderr or r1.stdout or '')[-600:]}",
                "probe_method": "tempdir_npm_install",
            }

        def run_probe() -> dict[str, Any]:
            p = subprocess.run(
                ["node", "--input-type=module", "-e", _NODE_PROBE_INLINE],
                cwd=str(td),
                capture_output=True,
                text=True,
                timeout=120,
            )
            j = _parse_last_json_line(p.stdout)
            j["probe_returncode"] = p.returncode
            j["probe_stderr_tail"] = (p.stderr or "")[-600:]
            return j

        out = run_probe()
        out["probe_method"] = "tempdir_npm_install"
        err_txt = str(out.get("error") or "")
        if not out.get("browser_launch_ok") and (
            "Executable doesn't exist" in err_txt or "browserType.launch" in err_txt
        ):
            pw_bin = td / "node_modules" / ".bin" / "playwright"
            if pw_bin.is_file():
                subprocess.run(
                    [str(pw_bin), "install", "chromium"],
                    cwd=str(td),
                    capture_output=True,
                    text=True,
                    timeout=400,
                )
            else:
                subprocess.run(
                    [npm, "exec", "--yes", "--package=playwright@1.58.2", "--", "playwright", "install", "chromium"],
                    cwd=str(td),
                    capture_output=True,
                    text=True,
                    timeout=400,
                )
            out = run_probe()
            out["probe_method"] = "tempdir_npm_install"
            out["retried_after_chromium_install"] = True
        return out
    except Exception as e:
        return {
            "package_resolve_ok": False,
            "node_playwright_ok": False,
            "browser_launch_ok": False,
            "error": repr(e),
            "probe_method": "tempdir_npm_install",
        }
    finally:
        shutil.rmtree(td, ignore_errors=True)


def pwa_reachable(url: str) -> tuple[bool, str | None]:
    u = (url or "").strip() or "https://tenmon-ark.com/pwa/"
    code, err = fetch_status(u, timeout=20.0)
    if code == 0:
        return False, err or "http_status_0"
    return bool(200 <= code < 400), err


def build_gate_report(base: str) -> dict[str, Any]:
    b = _normalize_base(base)
    paths = {
        "health_url": f"{b}/api/health",
        "audit_url": f"{b}/api/audit",
        "audit_build_url": f"{b}/api/audit.build",
    }
    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_normalized": b,
        "endpoints": {},
    }
    for key, u in paths.items():
        code, err = fetch_status(u)
        out["endpoints"][key] = {
            "url": u,
            "http_status": code,
            "ok": 200 <= code < 300,
            "error": err,
        }
        if code == 404:
            out.setdefault("http_404", []).append(key)
    return out


def compute_preflight(
    base: str,
    pwa_url: str,
    repo_root: Path,
    py_exe: str | None = None,
) -> dict[str, Any]:
    py = py_exe or sys.executable
    reasons: list[str] = []

    pip_obs = observe_pip_feasibility(py)
    python_path = which_or_empty("python3") or py
    py_ver_line = ""
    try:
        pv = subprocess.run([python_path, "--version"], capture_output=True, text=True, timeout=10)
        py_ver_line = ((pv.stdout or pv.stderr) or "").strip()[:200]
    except Exception:
        py_ver_line = ""
    node_path = which_or_empty("node") or ""
    npm_path = which_or_empty("npm") or ""

    has_pip = bool(pip_obs.get("python_pip_module_ok"))
    if not has_pip:
        reasons.append("python_pip_missing")
        if not pip_obs.get("python_ensurepip_available"):
            reasons.append("python_ensurepip_missing_or_broken")

    py_pw, py_pw_err = python_has_playwright(python_path)
    if not py_pw:
        reasons.append("python_playwright_missing")
        if py_pw_err:
            reasons.append(f"python_playwright_import_detail:{py_pw_err[:200]}")

    ch_ok = False
    ch_err = None
    if py_pw:
        ch_ok, ch_err = chromium_smoke_python(python_path)
        if not ch_ok:
            reasons.append("python_chromium_launch_failed")

    python_playwright_ok = bool(py_pw and ch_ok)

    node_probe = run_node_probe_mjs(repo_root)
    np_ok = bool(node_probe.get("node_playwright_ok"))
    bl_ok = bool(node_probe.get("browser_launch_ok"))
    node_playwright_ok = np_ok and bl_ok
    if not node_playwright_ok:
        reasons.append("node_playwright_probe_failed")
        if node_probe.get("error"):
            reasons.append(f"node_probe_detail:{str(node_probe.get('error'))[:200]}")

    resolve_ok = bool(node_probe.get("package_resolve_ok"))

    pwa_ok, pwa_err = pwa_reachable(pwa_url)

    preferred_driver: str | None = None
    selected_driver: str | None = None
    selected_launch_cmd = ""
    fallback_from: str | None = None

    if python_playwright_ok:
        preferred_driver = "python"
        selected_driver = "python_playwright"
        selected_launch_cmd = f'{python_path} -c "from playwright.sync_api import sync_playwright; ..."'
    elif node_playwright_ok:
        preferred_driver = "node"
        selected_driver = "node_playwright"
        mjs = "api/scripts/tenmon_pwa_playwright_node_probe_v1.mjs"
        npm = npm_path or "npm"
        selected_launch_cmd = (
            f'{npm} exec --package=playwright@1.58.2 -- node {mjs} --url <PWA_URL> --out <trace.json>'
        )
        fallback_from = "python_unavailable_using_node"
    else:
        preferred_driver = None
        if py_pw and not ch_ok:
            fallback_from = "python_import_ok_but_chromium_launch_failed"
        elif np_ok and not bl_ok:
            fallback_from = "node_package_ok_but_browser_launch_failed"

    # 単一真実源: 採用ドライバーに対応する browser launch の成否
    browser_launch_ok_selected: bool
    if selected_driver == "python_playwright":
        browser_launch_ok_selected = bool(ch_ok)
    elif selected_driver == "node_playwright":
        browser_launch_ok_selected = bool(bl_ok)
    else:
        browser_launch_ok_selected = False

    env_failure = selected_driver is None
    usable = not env_failure
    if env_failure:
        reasons.append("env_failure_no_usable_playwright_driver")

    reason = "; ".join(sorted(set(reasons))) if reasons else "ok"

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python_path": python_path,
        "python_pip_ok": has_pip,
        "python_has_ensurepip": bool(pip_obs.get("python_ensurepip_available")),
        "python_has_playwright": py_pw,
        "python_playwright_error": py_pw_err,
        "python_chromium_launch_ok": ch_ok,
        "python_chromium_launch_error": ch_err,
        "python_playwright_ok": python_playwright_ok,
        "node_path": node_path,
        "npm_path": npm_path,
        "node_playwright_ok": node_playwright_ok,
        "node_probe": node_probe,
        "node_playwright_resolve_ok": resolve_ok,
        "node_playwright_error": node_probe.get("error") if not node_playwright_ok else None,
        "browser_launch_ok": browser_launch_ok_selected,
        "browser_launch_ok_python": bool(ch_ok),
        "browser_launch_ok_node_probe": bool(bl_ok),
        "python_version_line": py_ver_line,
        "preferred_driver": preferred_driver,
        "driver_selected": selected_driver,
        "selected_driver": selected_driver,
        "selected_launch_cmd": selected_launch_cmd,
        "driver_fallback": fallback_from,
        "lived_single_driver_policy": "python優先; 不可ならnode; 両方不可はFAIL",
        "usable": usable,
        "reason": reason,
        "env_failure": env_failure,
        "reasons": sorted(set(reasons)),
        "pip_observation": pip_obs,
        "base_url": _normalize_base(base),
        "pwa_url": (pwa_url or "").strip() or "https://tenmon-ark.com/pwa/",
        "pwa_reachable": pwa_ok,
        "pwa_reach_error": pwa_err,
        "preflight_notes": [
            "env_failure=true のとき gate_audit_build_fail 等を product 単独失敗と断定しない",
            "usable=false のとき seal / readiness の final_ready を信頼して更新しない",
        ],
    }
    return out


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def merge_readiness_env_flags(automation: Path, pf: dict[str, Any]) -> None:
    """usable=false 時に env_failure を立て、product blocker と混同しないメタを付与。"""
    usable = bool(pf.get("usable", True))
    env_failure = bool(pf.get("env_failure")) or not usable
    reason = (pf.get("reason") or "").strip() or ";".join(pf.get("reasons", []))

    for name in ("pwa_lived_completion_readiness.json", "pwa_final_completion_readiness.json"):
        path = automation / name
        if not path.exists():
            continue
        data = read_json(path)
        if not data:
            continue
        data["env_failure"] = env_failure
        data["driver_selected"] = pf.get("driver_selected") or pf.get("selected_driver")
        data["playwright_preflight_usable"] = usable
        if env_failure:
            data["env_failure_reason"] = reason
            data["final_ready"] = False
            if name == "pwa_final_completion_readiness.json":
                data["final_pwa_completion_readiness"] = False
        else:
            data.pop("env_failure_reason", None)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_outputs(automation: Path, base: str, pwa_url: str, repo_root: Path) -> dict[str, Any]:
    automation.mkdir(parents=True, exist_ok=True)
    gate = build_gate_report(base)
    (automation / "pwa_gate_url_normalization_report.json").write_text(
        json.dumps(gate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    pf = compute_preflight(base, pwa_url, repo_root)
    (automation / "pwa_playwright_preflight.json").write_text(
        json.dumps(pf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    merge_readiness_env_flags(automation, pf)
    return pf


def main() -> int:
    ap = argparse.ArgumentParser(description="PWA runtime preflight")
    ap.add_argument("--automation-dir", type=str, required=True)
    ap.add_argument("--base", type=str, default="")
    ap.add_argument("--pwa-url", type=str, default="https://tenmon-ark.com/pwa/")
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--write-gate-only", action="store_true")
    args = ap.parse_args()

    automation = Path(args.automation_dir)
    base = _normalize_base(args.base or "")
    repo_root = Path(args.repo_root).resolve() if args.repo_root else automation.parent.parent

    if args.write_gate_only:
        gate = build_gate_report(base)
        (automation / "pwa_gate_url_normalization_report.json").write_text(
            json.dumps(gate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps({"gate": gate}, ensure_ascii=False, indent=2))
        return 0

    pf = write_outputs(automation, base, args.pwa_url, repo_root)
    gate = read_json(automation / "pwa_gate_url_normalization_report.json")
    print(json.dumps({"gate": gate, "preflight": pf}, ensure_ascii=False, indent=2))
    return 0 if pf.get("usable") else 1


if __name__ == "__main__":
    raise SystemExit(main())
