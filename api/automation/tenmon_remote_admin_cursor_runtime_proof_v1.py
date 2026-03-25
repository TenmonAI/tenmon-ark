#!/usr/bin/env python3
"""
TENMON_REMOTE_ADMIN_CURSOR_RUNTIME_PROOF_CURSOR_AUTO_V1

code-present と runtime-proven を分離し、admin / Cursor / ingest を subsystem verdict として固定する。
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_REMOTE_ADMIN_CURSOR_RUNTIME_PROOF_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_remote_admin_cursor_runtime_proof_verdict.json"
OUT_MD = "tenmon_remote_admin_cursor_runtime_proof.md"
FAIL_NEXT = "TENMON_REMOTE_ADMIN_CURSOR_RUNTIME_PROOF_RETRY_CURSOR_AUTO_V1"


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def http_probe(
    url: str,
    *,
    method: str = "GET",
    data: bytes | None = None,
    timeout: float = 4.0,
) -> dict[str, Any]:
    try:
        h = {"User-Agent": "tenmon-remote-admin-proof/1"}
        if data is not None:
            h["Content-Type"] = "application/json"
        req = urllib.request.Request(url, method=method, headers=h, data=data)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(4096).decode("utf-8", "replace")
            return {
                "ok": True,
                "status": resp.status,
                "url": url,
                "method": method,
                "body_preview": body[:400],
            }
    except urllib.error.HTTPError as e:
        return {
            "ok": True,
            "status": e.code,
            "url": url,
            "method": method,
            "body_preview": (e.read(4096) or b"").decode("utf-8", "replace")[:400],
        }
    except Exception as e:
        return {"ok": False, "status": None, "url": url, "method": method, "error": str(e)}


def file_nonempty(p: Path) -> bool:
    try:
        return p.is_file() and p.stat().st_size > 0
    except OSError:
        return False


def founder_ok(pr: dict[str, Any]) -> bool:
    return bool(pr.get("ok") and pr.get("status") in (401, 403))


def index_mounts_admin(repo: Path) -> dict[str, bool]:
    idx = read_text(repo / "api" / "src" / "index.ts")
    return {
        "adminCursorCommandRouter": "adminCursorCommandRouter" in idx
        and 'app.use("/api", adminCursorCommandRouter)' in idx,
        "adminCursorResultRouter": "adminCursorResultRouter" in idx
        and 'app.use("/api", adminCursorResultRouter)' in idx,
        "adminRemoteBuildRouter": "adminRemoteBuildRouter" in idx
        and 'app.use("/api", adminRemoteBuildRouter)' in idx,
        "adminRemoteIntakeRouter": "adminRemoteIntakeRouter" in idx
        and 'app.use("/api", adminRemoteIntakeRouter)' in idx,
    }


def route_files_present(repo: Path) -> dict[str, Path]:
    r = repo / "api" / "src" / "routes"
    return {
        "admin_cursor_command": r / "adminCursorCommand.ts",
        "admin_cursor_result": r / "adminCursorResult.ts",
        "admin_remote_build": r / "adminRemoteBuild.ts",
        "admin_remote_intake": r / "adminRemoteIntake.ts",
    }


def route_has_string(repo: Path, rel: str, needle: str) -> bool:
    p = repo / "api" / "src" / "routes" / rel
    return needle in read_text(p)


def subsystem_row(
    *,
    code_present: bool,
    runtime_proven: bool,
    evidence_paths: list[str],
    primary_gap: str | None = None,
) -> dict[str, Any]:
    acc = bool(code_present and runtime_proven)
    gap = primary_gap
    if not code_present:
        gap = gap or "source_or_mount_missing"
    elif not runtime_proven:
        gap = gap or "http_or_runtime_not_observed"
    return {
        "code_present": code_present,
        "runtime_proven": runtime_proven,
        "accepted_complete": acc,
        "primary_gap": gap,
        "evidence_paths": evidence_paths,
    }


def pick_band(pass_all: bool, any_code: bool) -> str:
    if pass_all:
        return "full"
    if any_code:
        return "yellow"
    return "red_env"


def build_md(verdict: dict[str, Any]) -> str:
    ts = verdict.get("generated_at", "")
    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- **pass**: `{verdict.get('pass')}`",
        f"- **band**: `{verdict.get('band')}`",
        f"- **admin_surface_proven**: `{verdict.get('admin_surface_proven')}`",
        f"- **local_chain_proven**: `{verdict.get('local_chain_proven')}`",
        f"- **remote_chain_proven**: `{verdict.get('remote_chain_proven')}`",
        f"- **primary_gap**: `{verdict.get('primary_gap')}`",
        f"- **recommended_next_card**: `{verdict.get('recommended_next_card')}`",
        "",
        "## Subsystems",
        "",
        "| id | code | runtime | accepted | gap |",
        "|---|:--:|:--:|:--:|:---|",
    ]
    subs = verdict.get("subsystems") or {}
    for sid, row in subs.items():
        lines.append(
            f"| `{sid}` | {row.get('code_present')} | {row.get('runtime_proven')} | "
            f"{row.get('accepted_complete')} | {row.get('primary_gap')} |"
        )
    lines.extend(["", "## Evidence paths (summary)", ""])
    for sid, row in subs.items():
        eps = row.get("evidence_paths") or []
        if eps:
            lines.append(f"- **{sid}**: `{eps[0]}` …")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    base = os.environ.get("TENMON_API_BASE_URL", os.environ.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000")).rstrip(
        "/"
    )

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    paths = route_files_present(repo)
    files_ok = {k: v.is_file() for k, v in paths.items()}
    mounts = index_mounts_admin(repo)
    code_present_all = all(files_ok.values()) and all(mounts.values())

    chain_v = read_json(auto / "tenmon_self_build_execution_chain_verdict.json")
    local_chain_proven = bool(chain_v.get("local_chain_closed", chain_v.get("chain_closed")))
    remote_chain_proven = bool(chain_v.get("remote_chain_closed", chain_v.get("chain_closed")))

    # --- HTTP probes ---
    health_urls = [f"{base}/api/health", f"{base}/health"]
    health_hit: dict[str, Any] | None = None
    for u in health_urls:
        pr = http_probe(u)
        if pr.get("ok") and pr.get("status") in (200, 204):
            health_hit = pr
            break
        if pr.get("ok") and isinstance(pr.get("status"), int):
            health_hit = pr
            break

    api_reachable = bool(health_hit and health_hit.get("status") is not None)
    health_ok = bool(health_hit and health_hit.get("status") in (200, 204))

    pr_queue = http_probe(f"{base}/api/admin/cursor/queue")
    pr_bundle = http_probe(f"{base}/api/admin/cursor/result/bundle")
    pr_jobs = http_probe(f"{base}/api/admin/remote-build/jobs")
    pr_intake = http_probe(f"{base}/api/admin/remote-intake/queue")
    pr_finalv = http_probe(f"{base}/api/admin/remote-build/final-verdict")
    pr_ingest_post = http_probe(
        f"{base}/api/admin/remote-build/result-ingest",
        method="POST",
        data=b"{}",
    )

    # /api/health が 404 でも、admin が JSON+403 なら Tenmon API 生存とみなす（契約揺れに耐性）
    admin_any_founder = founder_ok(pr_queue) or founder_ok(pr_bundle) or founder_ok(pr_jobs)
    admin_runtime_ok = bool(health_ok or admin_any_founder)

    auto_dir = auto
    queue_p = Path(os.environ.get("TENMON_REMOTE_CURSOR_QUEUE_PATH", str(auto_dir / "remote_cursor_queue.json")))
    bundle_p = Path(os.environ.get("TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH", str(auto_dir / "remote_cursor_result_bundle.json")))
    seal_cc = auto_dir / "remote_cursor_command_center_seal.json"
    cmd_center_py = auto_dir / "remote_cursor_command_center_v1.py"
    rb_collector = auto_dir / "remote_build_result_collector_v1.py"
    cr_collector = auto_dir / "cursor_result_collector_v1.py"

    ingest_route_in_source = route_has_string(repo, "adminRemoteBuild.ts", "result-ingest")

    # --- Subsystems ---
    ev_base = [str(repo / "api" / "src" / "index.ts")]

    sub: dict[str, dict[str, Any]] = {}

    sub["admin_route_presence"] = subsystem_row(
        code_present=code_present_all,
        runtime_proven=True,
        evidence_paths=[str(paths[k]) for k in paths] + ev_base,
        primary_gap=None if code_present_all else "admin_ts_or_index_mount_missing",
    )

    sub["admin_route_runtime"] = subsystem_row(
        code_present=code_present_all,
        runtime_proven=admin_runtime_ok,
        evidence_paths=[str(health_urls[0]), f"{base}/api/admin/cursor/queue"],
        primary_gap=None if admin_runtime_ok else "api_unreachable_or_neither_health_nor_admin_founder_guard",
    )

    sub["cursor_command_runtime"] = subsystem_row(
        code_present=files_ok.get("admin_cursor_command", False) and mounts.get("adminCursorCommandRouter", False),
        runtime_proven=founder_ok(pr_queue),
        evidence_paths=[str(paths["admin_cursor_command"]), str(queue_p)],
        primary_gap=None if founder_ok(pr_queue) else "cursor_queue_http_not_founder_guard",
    )

    sub["cursor_result_runtime"] = subsystem_row(
        code_present=files_ok.get("admin_cursor_result", False) and mounts.get("adminCursorResultRouter", False),
        runtime_proven=founder_ok(pr_bundle),
        evidence_paths=[str(paths["admin_cursor_result"]), str(bundle_p)],
        primary_gap=None if founder_ok(pr_bundle) else "cursor_result_bundle_http_not_founder_guard",
    )

    sub["remote_build_runtime"] = subsystem_row(
        code_present=files_ok.get("admin_remote_build", False) and mounts.get("adminRemoteBuildRouter", False),
        runtime_proven=founder_ok(pr_jobs) and founder_ok(pr_finalv),
        evidence_paths=[str(paths["admin_remote_build"])],
        primary_gap=None
        if (founder_ok(pr_jobs) and founder_ok(pr_finalv))
        else "remote_build_jobs_or_final_verdict_http_failed",
    )

    sub["remote_intake_runtime"] = subsystem_row(
        code_present=files_ok.get("admin_remote_intake", False) and mounts.get("adminRemoteIntakeRouter", False),
        runtime_proven=founder_ok(pr_intake),
        evidence_paths=[str(paths["admin_remote_intake"])],
        primary_gap=None if founder_ok(pr_intake) else "remote_intake_queue_http_failed",
    )

    coll_code = cmd_center_py.is_file() and rb_collector.is_file() and cr_collector.is_file()
    coll_runtime = coll_code and (seal_cc.is_file() or queue_p.is_file() or bundle_p.is_file())
    sub["result_collection_runtime"] = subsystem_row(
        code_present=coll_code,
        runtime_proven=coll_runtime,
        evidence_paths=[
            str(cmd_center_py),
            str(rb_collector),
            str(cr_collector),
            str(seal_cc) if seal_cc.is_file() else str(queue_p),
        ],
        primary_gap=None
        if coll_runtime
        else ("collection_scripts_missing" if not coll_code else "queue_or_bundle_or_seal_not_evident"),
    )

    ingest_code = rb_collector.is_file() and ingest_route_in_source
    ingest_runtime = bool(
        ingest_code
        and founder_ok(pr_ingest_post)
    )
    sub["result_ingest_runtime"] = subsystem_row(
        code_present=ingest_code,
        runtime_proven=ingest_runtime,
        evidence_paths=[str(rb_collector), str(paths["admin_remote_build"])],
        primary_gap=None
        if ingest_runtime
        else ("ingest_collector_or_route_source_missing" if not ingest_code else "result_ingest_post_not_founder_guard"),
    )

    all_acc = all(v.get("accepted_complete") for v in sub.values())
    admin_surface_proven = all(
        sub[k].get("accepted_complete")
        for k in (
            "admin_route_presence",
            "admin_route_runtime",
            "cursor_command_runtime",
            "cursor_result_runtime",
            "remote_build_runtime",
            "remote_intake_runtime",
        )
    )

    primary_gap: str | None = None
    order = list(sub.keys())
    for sid in order:
        if not sub[sid].get("accepted_complete"):
            primary_gap = sid
            break

    recommended = None if all_acc else FAIL_NEXT

    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": ts,
        "pass": all_acc,
        "band": pick_band(all_acc, code_present_all),
        "local_chain_proven": local_chain_proven,
        "remote_chain_proven": remote_chain_proven,
        "admin_surface_proven": admin_surface_proven,
        "primary_gap": primary_gap,
        "recommended_next_card": recommended,
        "subsystems": sub,
        "runtime_http": {
            "health": health_hit,
            "cursor_queue": pr_queue,
            "cursor_result_bundle": pr_bundle,
            "remote_build_jobs": pr_jobs,
            "remote_build_final_verdict": pr_finalv,
            "remote_intake_queue": pr_intake,
            "remote_build_result_ingest_post": pr_ingest_post,
        },
        "inputs": {
            "repo_root": str(repo),
            "api_base_url": base,
            "tenmon_self_build_execution_chain_verdict": str(auto / "tenmon_self_build_execution_chain_verdict.json"),
        },
        "remote_admin_runtime_proven": all_acc,
        "notes": [
            "code_present はリポジトリ実装。runtime_proven は TENMON_API_BASE_URL への HTTP（Founder ガード 401/403）で観測。",
            "admin_route_runtime は /api/health が 200/204、または admin いずれかが 401/403 JSON で真（health 契約未整合でも admin で API 生存を認める）。",
            "result_collection_runtime はスクリプト実在 + queue/bundle/seal のいずれかを証拠とする。",
            "pass は全 subsystem accepted_complete。従来互換で remote_admin_runtime_proven == pass。",
            "FAIL 時は TENMON_API_BASE_URL を実 API に合わせ、起動後に再実行。",
        ],
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / OUT_MD).write_text(build_md(verdict), encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "out": str(auto / OUT_JSON),
                "pass": all_acc,
                "remote_admin_runtime_proven": all_acc,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0 if all_acc else 1


if __name__ == "__main__":
    raise SystemExit(main())
