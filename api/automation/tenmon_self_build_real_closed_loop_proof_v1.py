#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1

同一 RUN_ID / JOB_ID で observe → 公式 submit → command center → VPS loopback executor
(GET /next → 成果物生成 → POST /admin/cursor/result) → bridge 追跡ログ → rejudge までを実証する。

制約: queue / bundle の手編集・fixture 投入禁止。ingest は /api/admin/cursor/result のみ（CLI は任意検証用）。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1"
OUT_VERDICT = "tenmon_self_build_real_closed_loop_proof_verdict.json"
OUT_SUMMARY = "tenmon_self_build_real_closed_loop_proof_summary.json"
OUT_REPORT = "tenmon_self_build_real_closed_loop_proof_report.md"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def repo_root_from_here(here: Path) -> Path:
    return here.parents[2]


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def file_snapshot(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"path": str(path), "exists": False, "size": 0, "mtime_epoch": None, "sha256_16": None}
    b = path.read_bytes()
    st = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size": len(b),
        "mtime_epoch": st.st_mtime,
        "sha256_16": hashlib.sha256(b).hexdigest()[:16],
    }


def http_req(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 60.0,
) -> tuple[int, dict[str, Any]]:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            txt = res.read().decode("utf-8", errors="replace")
            js = json.loads(txt) if txt.strip().startswith("{") else {}
            return res.getcode(), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            js = json.loads(e.read().decode("utf-8", errors="replace"))
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception as e:
        return 0, {"ok": False, "error": str(e)}


def http_ok(url: str, timeout: float = 12.0) -> tuple[bool, int]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read(65536).decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            ok = res.status == 200
            if ok and isinstance(js, dict) and "ok" in js:
                ok = bool(js.get("ok"))
            return ok, res.status
    except Exception:
        return False, 0


def build_card_body_md(run_id: str) -> str:
    return f"""CARD_NAME: {CARD}

OBJECTIVE:
RUN_ID=`{run_id}` の実閉路証明（automation のみ）。

EDIT_SCOPE:
- api/automation/out/real_closed_loop/{run_id}/executor_result.json
- api/automation/out/real_closed_loop/{run_id}/executor_result.md

DO_NOT_TOUCH:
- api/src/**
- web/src/**

ACCEPTANCE:
- 上記 2 ファイルが executor により生成される
- queue_id は API 応答の JOB_ID を用い、/api/admin/cursor/result へ POST する

RUN_ID: `{run_id}`
"""


def legacy_build_chain(repo: Path, api: Path, auto: Path, log_dir: Path, relax_chain: bool) -> tuple[list[dict[str, Any]], bool]:
    stages: list[dict[str, Any]] = []

    def run_build() -> dict[str, Any]:
        pr = subprocess.run(
            ["npm", "--prefix", str(api), "run", "build"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
        ok = pr.returncode == 0
        (log_dir / "npm_build.log").write_text(((pr.stdout or "") + "\n" + (pr.stderr or ""))[-4000:], encoding="utf-8")
        return {"name": "api_npm_build", "ok": ok, "returncode": pr.returncode}

    def run_runtime() -> dict[str, Any]:
        base = os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000").rstrip("/")
        h_ok, _ = http_ok(f"{base}/api/health")
        a_ok, _ = http_ok(f"{base}/api/audit")
        b_ok, _ = http_ok(f"{base}/api/audit.build")
        ok = h_ok and a_ok and b_ok
        return {"name": "runtime_health_audit_triplet", "ok": ok}

    def run_chain() -> dict[str, Any]:
        chain_py = auto / "tenmon_self_build_execution_chain_v1.py"
        if not chain_py.is_file():
            return {"name": "execution_chain_refresh", "ok": False}
        subprocess.run(
            ["python3", str(chain_py), "--repo-root", str(repo), "--soft-exit-ok"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        v = read_json(auto / "tenmon_self_build_execution_chain_verdict.json")
        closed = bool(v.get("chain_closed"))
        return {
            "name": "execution_chain_refresh",
            "ok": closed or relax_chain,
            "chain_closed": closed,
            "relaxed": relax_chain,
        }

    stages.extend([run_build(), run_runtime(), run_chain()])
    b_ok = bool(stages[0].get("ok"))
    r_ok = bool(stages[1].get("ok"))
    c_ok = bool(stages[2].get("ok"))
    real = b_ok and r_ok and (c_ok if not relax_chain else True)
    return stages, real


def bundle_has_queue_id(bundle_path: Path, job_id: str) -> bool:
    b = read_json(bundle_path)
    for e in b.get("entries") or []:
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "") == job_id:
            return True
    return False


def bundle_has_run_id(bundle_path: Path, run_id: str, job_id: str) -> bool:
    b = read_json(bundle_path)
    needle_run = run_id
    needle_job = job_id
    for e in b.get("entries") or []:
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "") != needle_job:
            continue
        snippet = str(e.get("log_snippet") or "")
        if needle_run in snippet:
            return True
        raw = json.dumps(e, ensure_ascii=False)
        if needle_run in raw:
            return True
    return False


def delivery_log_tail_from(offset: int, log_path: Path) -> str:
    if not log_path.is_file():
        return ""
    data = log_path.read_bytes()
    return data[offset:].decode("utf-8", errors="replace")


def wait_until(
    pred,
    *,
    timeout_s: float,
    interval_s: float = 1.5,
) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if pred():
            return True
        time.sleep(interval_s)
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--legacy-build-runtime-chain-only",
        action="store_true",
        help="旧来モード: build + triplet + execution chain のみ（キュー無し）",
    )
    ap.add_argument("--relax-execution-chain", action="store_true", help="legacy モード用")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--executor-timeout", type=float, default=180.0)
    ap.add_argument("--bundle-wait-timeout", type=float, default=90.0)
    ap.add_argument("--skip-rejudge", action="store_true")
    ap.add_argument(
        "--skip-bridge-dry-run-trace",
        action="store_true",
        help="mac_remote_bridge dry_run による delivery_log 追記を省略（ログ必須検証は fail しうる）",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else repo_root_from_here(here)
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    log_root = Path(os.environ.get("TENMON_LOG_ROOT", "/var/log/tenmon"))
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    log_dir = log_root / f"card_{CARD}" / ts
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        log_dir = auto / "out" / "logs" / f"card_{CARD}" / ts
        log_dir.mkdir(parents=True, exist_ok=True)

    if args.legacy_build_runtime_chain_only:
        stages, real = legacy_build_chain(repo, api, auto, log_dir, args.relax_execution_chain)
        out = {
            "card": CARD,
            "generated_at": utc(),
            "mode": "legacy_build_runtime_chain_only",
            "real_closed_loop_proven": real,
            "stages": stages,
            "log_dir": str(log_dir),
        }
        write_json(auto / OUT_VERDICT, out)
        write_json(auto / OUT_SUMMARY, {**out, "real_queue_submit": False, "fixture_or_synthetic_flags": ["legacy_mode"]})
        (auto / OUT_REPORT).write_text(f"# {CARD} (legacy)\n\nreal_closed_loop_proven={real}\n", encoding="utf-8")
        if args.stdout_json:
            print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if real else 1

    run_id = f"rcl_{int(time.time())}_{os.getpid()}"
    key = (os.environ.get("FOUNDER_KEY") or os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY") or "").strip()
    if not key:
        err = {"ok": False, "error": "FOUNDER_KEY or TENMON_REMOTE_CURSOR_FOUNDER_KEY required"}
        write_json(auto / OUT_SUMMARY, {"card": CARD, "generated_at": utc(), **err})
        print(json.dumps(err, ensure_ascii=False))
        return 2

    base = args.base.rstrip("/")
    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    delivery_log_path = auto / "remote_bridge_delivery_log.jsonl"
    rejudge_verdict = auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"

    pre = {
        "queue": file_snapshot(queue_path),
        "bundle": file_snapshot(bundle_path),
        "delivery_log": file_snapshot(delivery_log_path),
        "rejudge_verdict": file_snapshot(rejudge_verdict),
    }
    dlog_offset = int(pre["delivery_log"].get("size") or 0) if delivery_log_path.is_file() else 0

    flags = {
        "real_queue_submit": False,
        "real_delivery_observed": False,
        "real_result_returned": False,
        "real_ingest_pass": False,
        "real_rejudge_refresh": False,
        "real_closed_loop_proven": False,
        "fixture_or_synthetic_flags": [],
    }
    stages: list[dict[str, Any]] = []
    job_id = ""
    card_body = build_card_body_md(run_id)

    # --- npm build gate ---
    pr = subprocess.run(
        ["npm", "--prefix", str(api), "run", "build"],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=600,
        check=False,
    )
    stages.append({"name": "api_npm_build", "ok": pr.returncode == 0, "returncode": pr.returncode})
    if pr.returncode != 0:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "npm_build_failed",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        return 1

    # --- health ---
    ok_h, ok_a, ok_b = (
        http_ok(f"{base}/api/health")[0],
        http_ok(f"{base}/api/audit")[0],
        http_ok(f"{base}/api/audit.build")[0],
    )
    stages.append({"name": "runtime_triplet", "ok": ok_h and ok_a and ok_b})
    if not (ok_h and ok_a and ok_b):
        summary = {
            "card": CARD,
            "run_id": run_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "runtime_triplet_failed",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        return 1

    # --- submit ---
    code, js = http_req(
        "POST",
        f"{base}/api/admin/cursor/submit",
        data={
            "card_name": CARD,
            "card_body_md": card_body,
            "source": "tenmon_self_build_real_closed_loop_proof_v1.py",
            "force_approve": True,
        },
        headers={"Content-Type": "application/json", "X-Founder-Key": key},
    )
    item = js.get("item") if isinstance(js.get("item"), dict) else {}
    job_id = str(item.get("id") or "").strip()
    flags["real_queue_submit"] = code == 200 and bool(js.get("ok")) and bool(job_id)
    stages.append({"name": "admin_cursor_submit", "http": code, "ok": flags["real_queue_submit"], "job_id": job_id})
    if not flags["real_queue_submit"]:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "job_id": job_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "submit_response": js,
            "error": "submit_failed",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        return 1

    if str(item.get("state") or "") == "approval_required":
        c2, j2 = http_req(
            "POST",
            f"{base}/api/admin/cursor/approve",
            data={"id": job_id},
            headers={"Content-Type": "application/json", "X-Founder-Key": key},
        )
        stages.append({"name": "admin_cursor_approve", "http": c2, "ok": c2 == 200 and bool(j2.get("ok"))})

    # --- command center ---
    cc_sh = scripts / "remote_cursor_command_center_run_v1.sh"
    cc_env = os.environ.copy()
    cc_env["ROOT"] = str(repo)
    cc_env["TENMON_REPO_ROOT"] = str(repo)
    if not cc_sh.is_file():
        stages.append({"name": "command_center", "ok": False, "error": "missing_script"})
        cc_ok = False
    else:
        prc = subprocess.run(
            ["bash", str(cc_sh)],
            cwd=str(repo),
            env=cc_env,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        cc_ok = prc.returncode == 0
        stages.append({"name": "command_center", "ok": cc_ok, "returncode": prc.returncode})
    if not cc_ok:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "job_id": job_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "command_center_failed",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        (auto / OUT_REPORT).write_text(f"# {CARD}\n\nfail: command_center\n", encoding="utf-8")
        return 1

    # --- executor: GET /next until our job ---
    pulled: dict[str, Any] = {}
    deadline = time.monotonic() + float(args.executor_timeout)

    def pull_ours() -> bool:
        nonlocal pulled
        c, j = http_req(
            "GET",
            f"{base}/api/admin/cursor/next",
            headers={"X-Founder-Key": key},
        )
        if c != 200 or not j.get("ok"):
            return False
        it = j.get("item")
        if not isinstance(it, dict) or not it.get("id"):
            return False
        if str(it.get("id")) != job_id:
            # 先頭が別ジョブのときは奪わない（release ループ回避）。共有キューは逐次実行を推奨。
            return False
        pulled = it
        return True

    while time.monotonic() < deadline:
        if pull_ours():
            break
        time.sleep(1.5)
    flags["real_delivery_observed"] = bool(pulled.get("id"))
    stages.append({"name": "executor_pull_next", "ok": flags["real_delivery_observed"], "job_id": job_id})
    if not flags["real_delivery_observed"]:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "job_id": job_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "executor_pull_timeout",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        (auto / OUT_REPORT).write_text(f"# {CARD}\n\nfail: executor_pull_timeout\n", encoding="utf-8")
        return 1

    out_dir = auto / "out" / "real_closed_loop" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    er_json = out_dir / "executor_result.json"
    er_md = out_dir / "executor_result.md"
    er_payload = {
        "run_id": run_id,
        "job_id": job_id,
        "card": CARD,
        "executor": "tenmon_self_build_real_closed_loop_proof_v1.loopback",
        "generated_at": utc(),
        "note": "公式 GET /next 後に automation 内へ書き込み。product code は触らない。",
    }
    er_json.write_text(json.dumps(er_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    er_md.write_text(
        f"# Real closed loop executor\n\nRUN_ID={run_id}\nJOB_ID={job_id}\n",
        encoding="utf-8",
    )

    touched = [
        f"api/automation/out/real_closed_loop/{run_id}/executor_result.json",
        f"api/automation/out/real_closed_loop/{run_id}/executor_result.md",
    ]
    log_snippet = json.dumps({"run_id": run_id, "job_id": job_id, "proof": CARD}, ensure_ascii=False)[:4000]
    c3, j3 = http_req(
        "POST",
        f"{base}/api/admin/cursor/result",
        data={
            "queue_id": job_id,
            "touched_files": touched,
            "build_rc": 0,
            "acceptance_ok": True,
            "dry_run": False,
            "log_snippet": log_snippet,
        },
        headers={"Content-Type": "application/json", "X-Founder-Key": key},
    )
    flags["real_ingest_pass"] = c3 == 200 and bool(j3.get("ok")) and str(j3.get("status") or "") != "blocked_paths"
    stages.append(
        {
            "name": "admin_cursor_result_post",
            "http": c3,
            "ok": flags["real_ingest_pass"],
            "response_status": j3.get("status"),
        }
    )
    if not flags["real_ingest_pass"]:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "job_id": job_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "admin_result_ingest_failed",
            "result_response": j3,
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        return 1

    # --- bundle wait ---
    def bundle_ok() -> bool:
        return bundle_has_queue_id(bundle_path, job_id) and bundle_has_run_id(bundle_path, run_id, job_id)

    flags["real_result_returned"] = wait_until(bundle_ok, timeout_s=float(args.bundle_wait_timeout))
    stages.append({"name": "bundle_wait_run_id", "ok": flags["real_result_returned"]})
    if not flags["real_result_returned"]:
        summary = {
            "card": CARD,
            "run_id": run_id,
            "job_id": job_id,
            "generated_at": utc(),
            "pre_run_snapshots": pre,
            "stages": stages,
            **flags,
            "error": "bundle_missing_run_or_job",
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
        return 1

    # --- bridge delivery log trace (公式 mac_remote_bridge dry_run / 実 JOB_ID) ---
    if not args.skip_bridge_dry_run_trace:
        norm_out = auto / "out" / "real_closed_loop" / run_id / "normalized_remote_build_manifest.json"
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix="_rcl_card.md",
            delete=False,
            encoding="utf-8",
        ) as tf:
            tf.write(card_body)
            tpath = tf.name
        try:
            nb = subprocess.run(
                [
                    "python3",
                    str(auto / "remote_build_job_normalizer_v1.py"),
                    "--job-id",
                    job_id,
                    "--card-name",
                    CARD,
                    "--card-body-file",
                    tpath,
                    "--out",
                    str(norm_out),
                ],
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
        finally:
            Path(tpath).unlink(missing_ok=True)
        stages.append({"name": "remote_build_normalize_for_bridge", "ok": nb.returncode == 0, "returncode": nb.returncode})
        if nb.returncode != 0:
            summary = {
                "card": CARD,
                "run_id": run_id,
                "job_id": job_id,
                "generated_at": utc(),
                "pre_run_snapshots": pre,
                "stages": stages,
                **flags,
                "error": "remote_build_normalizer_failed",
                "normalizer_tail": (nb.stderr or "")[-2000:],
            }
            write_json(auto / OUT_SUMMARY, summary)
            write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
            return 1
        br = subprocess.run(
            [
                "python3",
                str(auto / "mac_remote_bridge_v1.py"),
                "--manifest",
                str(norm_out),
                "--dry-run",
            ],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        stages.append({"name": "mac_remote_bridge_dry_run_trace", "ok": br.returncode == 0, "returncode": br.returncode})
        if br.returncode != 0:
            summary = {
                "card": CARD,
                "run_id": run_id,
                "job_id": job_id,
                "generated_at": utc(),
                "pre_run_snapshots": pre,
                "stages": stages,
                **flags,
                "error": "mac_remote_bridge_dry_run_failed",
            }
            write_json(auto / OUT_SUMMARY, summary)
            write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
            return 1

    def delivery_log_has_job() -> bool:
        return job_id in delivery_log_tail_from(dlog_offset, delivery_log_path)

    if not args.skip_bridge_dry_run_trace:
        if not delivery_log_has_job():
            flags["fixture_or_synthetic_flags"].append("delivery_log_missing_job_id_after_trace")
            summary = {
                "card": CARD,
                "run_id": run_id,
                "job_id": job_id,
                "generated_at": utc(),
                "pre_run_snapshots": pre,
                "stages": stages,
                **flags,
                "error": "delivery_log_job_id_not_observed",
            }
            write_json(auto / OUT_SUMMARY, summary)
            write_json(auto / OUT_VERDICT, {**summary, "real_closed_loop_proven": False})
            return 1
        flags["real_delivery_observed"] = flags["real_delivery_observed"] and delivery_log_has_job()
    else:
        flags["fixture_or_synthetic_flags"].append("bridge_dry_run_skipped_by_flag")

    # --- optional CLI ingest verify (同一エントリを stdingest しない。POST 済みのためスキップ) ---

    # --- rejudge ---
    rj_mtime_before = rejudge_verdict.stat().st_mtime if rejudge_verdict.is_file() else 0.0
    if not args.skip_rejudge:
        rj_sh = scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
        if rj_sh.is_file():
            env = os.environ.copy()
            env["TENMON_REPO_ROOT"] = str(repo)
            env["TENMON_GATE_BASE"] = base
            prj = subprocess.run(
                ["bash", str(rj_sh)],
                cwd=str(repo),
                env=env,
                capture_output=True,
                text=True,
                timeout=1200,
                check=False,
            )
            stages.append({"name": "rejudge_and_seal_refresh", "ok": prj.returncode == 0, "returncode": prj.returncode})
        else:
            stages.append({"name": "rejudge_and_seal_refresh", "ok": False, "error": "missing_script"})
    rj_mtime_after = rejudge_verdict.stat().st_mtime if rejudge_verdict.is_file() else 0.0
    flags["real_rejudge_refresh"] = (not args.skip_rejudge) and (rj_mtime_after > rj_mtime_before)

    flags["real_closed_loop_proven"] = all(
        [
            flags["real_queue_submit"],
            flags["real_delivery_observed"],
            flags["real_result_returned"],
            flags["real_ingest_pass"],
            flags["real_rejudge_refresh"],
        ]
    )

    summary = {
        "card": CARD,
        "run_id": run_id,
        "job_id": job_id,
        "generated_at": utc(),
        "base": base,
        "pre_run_snapshots": pre,
        "post_run_snapshots": {
            "queue": file_snapshot(queue_path),
            "bundle": file_snapshot(bundle_path),
            "delivery_log": file_snapshot(delivery_log_path),
            "rejudge_verdict": file_snapshot(rejudge_verdict),
        },
        "stages": stages,
        **flags,
        "recommended_next_card": "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1",
        "log_dir": str(log_dir),
    }

    write_json(auto / OUT_SUMMARY, summary)
    write_json(
        auto / OUT_VERDICT,
        {
            "card": CARD,
            "generated_at": utc(),
            "run_id": run_id,
            "job_id": job_id,
            "real_closed_loop_proven": flags["real_closed_loop_proven"],
            "summary_path": str(auto / OUT_SUMMARY),
            "flags": {k: v for k, v in flags.items()},
        },
    )

    lines = [
        f"# {CARD}",
        "",
        f"- run_id: `{run_id}`",
        f"- job_id: `{job_id}`",
        f"- **real_closed_loop_proven**: `{flags['real_closed_loop_proven']}`",
        "",
        "## Flags",
        *[f"- {k}: `{v}`" for k, v in flags.items()],
        "",
        "## Stages",
        *[f"- {s.get('name')}: ok=`{s.get('ok')}`" for s in stages],
    ]
    (auto / OUT_REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")
    (log_dir / "proof_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if flags["real_closed_loop_proven"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
