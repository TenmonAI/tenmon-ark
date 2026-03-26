#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1

cursor_patch_plan.json と touched_files を入力に、build →（任意 restart）→ health → audit.build → probes を順に実行し、
FAIL 時は touched 限定で git restore を試みる。成功の捏造はしない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def _run_cmd(cmd: list[str], cwd: Path, timeout: float) -> tuple[int, str, str]:
    try:
        cp = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return cp.returncode, (cp.stdout or "")[-8000:], (cp.stderr or "")[-8000:]
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"
    except Exception as e:
        return 1, "", str(e)


def _http_get(url: str, timeout: float = 20.0) -> tuple[int, dict[str, Any] | None, str]:
    try:
        req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            code = int(getattr(resp, "status", 200))
            try:
                j = json.loads(raw)
            except json.JSONDecodeError:
                j = None
            return code, j if isinstance(j, dict) else None, raw[:4000]
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            j = json.loads(raw)
        except Exception:
            j = None
        return int(e.code), j if isinstance(j, dict) else None, raw[:4000]
    except Exception as e:
        return 0, None, str(e)[:2000]


def _json_endpoint_ok(code: int, body: dict[str, Any] | None) -> bool:
    if code != 200 or not body:
        return False
    return body.get("ok") is True


def _audit_build_ok(code: int, body: dict[str, Any] | None) -> bool:
    return _json_endpoint_ok(code, body)


def _is_dist_path(rel: str) -> bool:
    s = rel.replace("\\", "/").lower()
    return s == "dist" or "/dist/" in f"/{s}/" or s.startswith("dist/")


def _safe_rel_paths(repo: Path, touched: list[str]) -> list[str]:
    root = repo.resolve()
    out: list[str] = []
    for t in touched:
        rel = str(t).strip().lstrip("/")
        if not rel or _is_dist_path(rel):
            continue
        p = (root / rel).resolve()
        try:
            p.relative_to(root)
        except ValueError:
            continue
        out.append(rel)
    return sorted(set(out))


def _git_tracked(repo: Path, rel: str) -> bool:
    cp = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel],
        cwd=str(repo),
        capture_output=True,
        text=True,
        check=False,
    )
    return cp.returncode == 0


def _rollback_git_restore(repo: Path, rels: list[str]) -> dict[str, Any]:
    attempted = list(rels)
    restored: list[str] = []
    failed: list[str] = []
    skipped_untracked: list[str] = []
    for rel in rels:
        if not _git_tracked(repo, rel):
            skipped_untracked.append(rel)
            continue
        cp = subprocess.run(
            ["git", "restore", "--source=HEAD", "--staged", "--worktree", "--", rel],
            cwd=str(repo),
            capture_output=True,
            text=True,
            check=False,
        )
        if cp.returncode == 0:
            restored.append(rel)
        else:
            failed.append(rel)
    return {
        "method": "git_restore_head_staged_worktree",
        "paths_attempted": attempted,
        "paths_restored": restored,
        "paths_failed": failed,
        "paths_untracked_skipped": skipped_untracked,
        "stderr_tail": "",
    }


def _load_patch_plan(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        j = json.loads(path.read_text(encoding="utf-8"))
        return j if isinstance(j, dict) else {}
    except Exception:
        return {}


def _load_touched_files(path: Path | None, raw_json: str | None) -> list[str]:
    if raw_json and str(raw_json).strip():
        try:
            j = json.loads(raw_json)
            if isinstance(j, list):
                return [str(x).strip() for x in j if str(x).strip()]
        except Exception:
            pass
    if path is None or not path.is_file():
        return []
    try:
        j = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(j, list):
            return [str(x).strip() for x in j if str(x).strip()]
        if isinstance(j, dict) and isinstance(j.get("touched_files"), list):
            return [str(x).strip() for x in j["touched_files"] if str(x).strip()]
    except Exception:
        pass
    return []


def _probe_urls(base: str, plan: dict[str, Any]) -> list[str]:
    extra = plan.get("probe_urls")
    if isinstance(extra, list):
        urls = [str(u).strip() for u in extra if str(u).strip()]
        if urls:
            return urls
    env = os.environ.get("TENMON_AUTOGUARD_EXTRA_PROBES", "").strip()
    if env:
        return [u.strip() for u in env.split(",") if u.strip()]
    # 既定: audit サマリ（health / audit.build に加え軽量プローブ）
    b = base.rstrip("/")
    return [f"{b}/api/audit"]


def run_autoguard_v1(
    *,
    repo_root: Path,
    patch_plan_path: Path,
    touched_files: list[str],
    output_dir: Path,
    api_base: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    evidence = output_dir / f"evidence_{_utc().replace(':', '').replace('-', '')}"
    evidence.mkdir(parents=True, exist_ok=True)
    steps: list[dict[str, Any]] = []
    rollback_executed = False
    rollback_report: dict[str, Any] = {
        "rollback_executed": False,
        "method": "none",
        "paths_attempted": [],
        "paths_restored": [],
        "paths_failed": [],
        "paths_untracked_skipped": [],
        "note": "",
    }

    plan = _load_patch_plan(patch_plan_path)
    if plan.get("ok") is False:
        _write(evidence / "abort_patch_plan.txt", "cursor_patch_plan.ok is false\n")
        steps.append(
            {
                "name": "patch_plan_gate",
                "ok": False,
                "detail": "cursor_patch_plan.ok is false; autoguard aborted before mutate checks",
            }
        )
        result = {
            "card": CARD,
            "generated_at": _utc(),
            "overall_pass": False,
            "acceptance_pass": False,
            "rollback_executed": False,
            "build_rc": None,
            "steps": steps,
            "evidence_dir": str(evidence),
            "fail_reason": "patch_plan_not_ok",
        }
        return result, rollback_report

    safe_touch = _safe_rel_paths(repo_root, touched_files)
    if not safe_touch:
        _write(evidence / "abort_touched_files.txt", "no safe touched_files\n")
        steps.append(
            {
                "name": "touched_files_gate",
                "ok": False,
                "detail": "no safe touched_files after repo/dist filter",
            }
        )
        result = {
            "card": CARD,
            "generated_at": _utc(),
            "overall_pass": False,
            "acceptance_pass": False,
            "rollback_executed": False,
            "build_rc": None,
            "steps": steps,
            "evidence_dir": str(evidence),
            "fail_reason": "empty_or_unsafe_touched_files",
        }
        return result, rollback_report

    # 1) git snapshot
    rc, out, err = _run_cmd(["git", "status", "--porcelain", "-uall"], repo_root, 60.0)
    snap = (out or "") + ("\n" + err if err else "")
    _write(evidence / "git_status_snapshot.txt", snap)
    rc2, out2, err2 = _run_cmd(["git", "diff", "--stat"], repo_root, 60.0)
    _write(evidence / "git_diff_stat.txt", (out2 or "") + (err2 or ""))
    steps.append(
        {
            "name": "git_snapshot",
            "ok": rc == 0 and rc2 == 0,
            "evidence": str(evidence / "git_status_snapshot.txt"),
            "git_status_rc": rc,
            "git_diff_stat_rc": rc2,
        }
    )
    if rc != 0 or rc2 != 0:
        result = {
            "card": CARD,
            "generated_at": _utc(),
            "overall_pass": False,
            "acceptance_pass": False,
            "rollback_executed": False,
            "build_rc": None,
            "steps": steps,
            "evidence_dir": str(evidence),
            "fail_reason": "git_snapshot_failed",
        }
        return result, rollback_report

    fail = False

    # 2) build
    api_dir = repo_root / "api"
    build_cmd = os.environ.get("TENMON_AUTOGUARD_BUILD_CMD", "").strip()
    if not build_cmd:
        build_cmd = "npm run check"
    # shell で 1 行実行（cwd=api）
    brc, bout, berr = _run_cmd(["bash", "-lc", build_cmd], api_dir, float(os.environ.get("TENMON_AUTOGUARD_BUILD_TIMEOUT_SEC", "600")))
    _write(evidence / "build_stdout.txt", bout)
    _write(evidence / "build_stderr.txt", berr)
    build_ok = brc == 0
    steps.append(
        {
            "name": "build",
            "ok": build_ok,
            "cwd": str(api_dir),
            "cmd": build_cmd,
            "rc": brc,
            "evidence": str(evidence / "build_stdout.txt"),
        }
    )
    if not build_ok:
        fail = True

    # 3) restart (optional)
    restart_cmd = os.environ.get("TENMON_AUTOGUARD_RESTART_CMD", "").strip()
    if restart_cmd:
        rrc, rout, rerr = _run_cmd(["bash", "-lc", restart_cmd], repo_root, float(os.environ.get("TENMON_AUTOGUARD_RESTART_TIMEOUT_SEC", "120")))
        _write(evidence / "restart_stdout.txt", rout)
        _write(evidence / "restart_stderr.txt", rerr)
        steps.append({"name": "restart", "ok": rrc == 0, "cmd": restart_cmd, "rc": rrc})
        if rrc != 0:
            fail = True
        time.sleep(float(os.environ.get("TENMON_AUTOGUARD_POST_RESTART_SLEEP_SEC", "2")))
    else:
        steps.append(
            {
                "name": "restart",
                "ok": True,
                "skipped": True,
                "detail": "TENMON_AUTOGUARD_RESTART_CMD unset",
            }
        )

    base = api_base.rstrip("/")

    # 4) health
    h_code, h_body, h_raw = _http_get(f"{base}/api/health")
    _write(evidence / "health_response.json", json.dumps({"code": h_code, "body": h_body, "raw": h_raw}, ensure_ascii=False, indent=2))
    h_ok = _json_endpoint_ok(h_code, h_body)
    steps.append({"name": "health", "ok": h_ok, "url": f"{base}/api/health", "http_code": h_code})
    if not h_ok:
        fail = True

    # 5) audit.build
    a_code, a_body, a_raw = _http_get(f"{base}/api/audit.build")
    _write(evidence / "audit_build_response.json", json.dumps({"code": a_code, "body": a_body, "raw": a_raw}, ensure_ascii=False, indent=2))
    a_ok = _audit_build_ok(a_code, a_body)
    steps.append({"name": "audit.build", "ok": a_ok, "url": f"{base}/api/audit.build", "http_code": a_code})
    if not a_ok:
        fail = True

    # 6) probes
    probe_list = _probe_urls(base, plan)
    probe_results: list[dict[str, Any]] = []
    for u in probe_list:
        c, b, raw = _http_get(u)
        pr_ok = _json_endpoint_ok(c, b)
        probe_results.append({"url": u, "ok": pr_ok, "http_code": c})
        if not pr_ok:
            fail = True
    _write(evidence / "probes.json", json.dumps(probe_results, ensure_ascii=False, indent=2))
    steps.append({"name": "probes", "ok": all(x["ok"] for x in probe_results) if probe_results else True, "results": probe_results})

    if fail:
        rb = _rollback_git_restore(repo_root, safe_touch)
        rollback_report = rb
        rollback_report["rollback_executed"] = True
        rollback_executed = True
        rollback_report["note"] = "rollback procedure run after step failure; dist paths excluded; untracked paths skipped"
        _write(evidence / "rollback_report_snapshot.json", json.dumps(rollback_report, ensure_ascii=False, indent=2))
        rc3, out3, err3 = _run_cmd(["git", "status", "--porcelain", "-uall"], repo_root, 60.0)
        _write(evidence / "git_status_after_rollback.txt", out3 + err3)

    overall = not fail
    build_rc_out: int | None = brc
    result = {
        "card": CARD,
        "generated_at": _utc(),
        "overall_pass": overall,
        "acceptance_pass": overall,
        "rollback_executed": rollback_executed,
        "build_rc": build_rc_out,
        "steps": steps,
        "evidence_dir": str(evidence),
        "fail_reason": None if overall else "step_failed_see_steps",
        "touched_files_used": safe_touch,
        "api_base": base,
    }
    return result, rollback_report


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--patch-plan", type=Path, required=True)
    ap.add_argument("--touched-files", type=Path, default=None, help="JSON 配列または {touched_files:[]} ")
    ap.add_argument("--touched-json", default="", help="インライン JSON 配列（ファイルより優先可）")
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="結果 JSON 出力ディレクトリ（既定: api/automation/out/build_probe_rollback_autoguard）",
    )
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    out_dir = args.output_dir
    if out_dir is None:
        out_dir = repo / "api" / "automation" / "out" / "build_probe_rollback_autoguard"
    out_dir = out_dir.expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    tj = args.touched_json.strip() if getattr(args, "touched_json", None) else ""
    touched = _load_touched_files(args.touched_files, tj or None)
    api_base = os.environ.get("TENMON_AUTOGUARD_API_BASE", "http://127.0.0.1:3000").rstrip("/")

    res, rb = run_autoguard_v1(
        repo_root=repo,
        patch_plan_path=args.patch_plan.expanduser().resolve(),
        touched_files=touched,
        output_dir=out_dir,
        api_base=api_base,
    )

    res_path = out_dir / "build_probe_rollback_result.json"
    rb_path = out_dir / "rollback_report.json"
    res_path.write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rb_path.write_text(json.dumps(rb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"overall_pass": res.get("overall_pass"), "rollback_executed": res.get("rollback_executed")}, ensure_ascii=False))
    return 0 if res.get("overall_pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
