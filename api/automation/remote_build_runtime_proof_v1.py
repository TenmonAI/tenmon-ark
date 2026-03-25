#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_RUNTIME_PROOF_CURSOR_AUTO_V1

remote build 系の runtime proof を dry-run で実行し、
存在証明から「橋が通る」証明へ進める。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

CARD = "TENMON_REMOTE_BUILD_RUNTIME_PROOF_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_REMOTE_BUILD_RUNTIME_PROOF_VPS_V1"
FAIL_NEXT = "TENMON_REMOTE_BUILD_RUNTIME_PROOF_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run(cmd: List[str], cwd: Path, env: Dict[str, str] | None = None, timeout: int = 60) -> Dict[str, Any]:
    try:
        p = subprocess.run(
            cmd,
            cwd=str(cwd),
            env=env or os.environ.copy(),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "rc": p.returncode,
            "ok": p.returncode == 0,
            "stdout_tail": (p.stdout or "")[-3000:],
            "stderr_tail": (p.stderr or "")[-3000:],
        }
    except Exception as e:
        return {"rc": 127, "ok": False, "stdout_tail": "", "stderr_tail": str(e)}


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _admin_route_check(api: Path) -> Dict[str, Any]:
    route = api / "src" / "routes" / "adminRemoteBuild.ts"
    index = api / "src" / "index.ts"
    txt = route.read_text(encoding="utf-8", errors="replace") if route.is_file() else ""
    idx = index.read_text(encoding="utf-8", errors="replace") if index.is_file() else ""
    checks = {
        "route_file_exists": route.is_file(),
        "index_file_exists": index.is_file(),
        "router_mounted": 'app.use("/api", adminRemoteBuildRouter);' in idx,
        "jobs_post": 'post("/admin/remote-build/jobs"' in txt,
        "result_ingest": 'post("/admin/remote-build/result-ingest"' in txt,
        "seal_run": 'post("/admin/remote-build/seal-run"' in txt,
        "dashboard": 'get("/admin/remote-build/dashboard"' in txt,
        "final_verdict": 'get("/admin/remote-build/final-verdict"' in txt,
    }
    return {"ok": all(checks.values()), "checks": checks}


def _normalizer_dryrun(api: Path, out_dir: Path) -> Dict[str, Any]:
    manifest = out_dir / "runtime_proof_normalized_manifest.json"
    cmd = [
        "python3",
        str(api / "automation" / "remote_build_job_normalizer_v1.py"),
        "--job-id",
        f"rb_runtime_proof_{int(time.time())}",
        "--card-name",
        CARD,
        "--card-body",
        "OBJECTIVE:\nremote runtime proof dry-run\n\nEDIT_SCOPE:\n- api/automation/**\n",
        "--out",
        str(manifest),
    ]
    run = _run(cmd, cwd=api, timeout=90)
    body = _read_json(manifest)
    run["manifest_path"] = str(manifest)
    run["manifest_ok"] = bool(body.get("job_id")) and bool(body.get("card_name")) and ("safety_flags" in body)
    return run


def _mac_bridge_dryrun(api: Path, out_dir: Path, manifest: Path) -> Dict[str, Any]:
    send = out_dir / "runtime_proof_remote_bridge_send_result.json"
    ack = out_dir / "runtime_proof_remote_bridge_ack.json"
    cmd = [
        "python3",
        str(api / "automation" / "mac_remote_bridge_v1.py"),
        "--manifest",
        str(manifest),
        "--dry-run",
        "--send-result-out",
        str(send),
        "--ack-out",
        str(ack),
    ]
    run = _run(cmd, cwd=api, timeout=60)
    send_j = _read_json(send)
    run["send_result_path"] = str(send)
    run["ack_path"] = str(ack)
    run["dryrun_emit_ok"] = bool(send_j.get("ok")) and bool(send_j.get("dry_run"))
    return run


def _receiver_handshake_dryrun(api: Path, out_dir: Path, manifest: Path) -> Dict[str, Any]:
    tmp_drop = tempfile.mkdtemp(prefix="tenmon_remote_build_runtime_proof_")
    port = str(int(time.time()) % 2000 + 18000)
    secret = "tenmon_runtime_proof_secret"
    env = os.environ.copy()
    env["TENMON_MAC_BRIDGE_SECRET"] = secret
    env["TENMON_MAC_RECEIVER_PORT"] = port
    env["TENMON_MAC_DROP_DIR"] = tmp_drop
    env["TENMON_MAC_RECEIVER_BIND"] = "127.0.0.1"

    stub = subprocess.Popen(
        ["bash", str(api / "automation" / "mac_remote_receiver_stub_v1.sh")],
        cwd=str(api),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        # health check
        time.sleep(1.0)
        health_ok = False
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2.5) as r:
                health_ok = (r.getcode() == 200)
        except Exception:
            health_ok = False

        cmd = [
            "python3",
            str(api / "automation" / "mac_remote_bridge_v1.py"),
            "--manifest",
            str(manifest),
            "--target-url",
            f"http://127.0.0.1:{port}/tenmon/mac-bridge/v1/ingest",
            "--secret",
            secret,
            "--max-retries",
            "1",
            "--send-result-out",
            str(out_dir / "runtime_proof_remote_bridge_send_live_result.json"),
            "--ack-out",
            str(out_dir / "runtime_proof_remote_bridge_ack_live.json"),
        ]
        bridge = _run(cmd, cwd=api, env=env, timeout=60)
        drop_manifest = Path(tmp_drop) / "mac_receiver_drop_manifest.json"
        drop = _read_json(drop_manifest)
        return {
            "ok": health_ok and bridge.get("ok") and bool(drop.get("job_id")),
            "health_ok": health_ok,
            "bridge": bridge,
            "drop_manifest_path": str(drop_manifest),
            "drop_manifest_found": drop_manifest.is_file(),
            "drop_job_id": drop.get("job_id"),
        }
    finally:
        try:
            stub.terminate()
            stub.wait(timeout=3)
        except Exception:
            try:
                stub.kill()
            except Exception:
                pass


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="default: api/automation/out/remote_build_runtime_proof_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    out = Path(args.out_dir).resolve() if args.out_dir else (api / "automation" / "out" / "remote_build_runtime_proof_v1")
    out.mkdir(parents=True, exist_ok=True)

    route = _admin_route_check(api)
    normal = _normalizer_dryrun(api, out)
    manifest_path = Path(normal.get("manifest_path") or "")
    bridge_dry = _mac_bridge_dryrun(api, out, manifest_path) if manifest_path.is_file() else {"ok": False, "reason": "manifest_missing"}
    handshake = _receiver_handshake_dryrun(api, out, manifest_path) if manifest_path.is_file() else {"ok": False, "reason": "manifest_missing"}

    checks = {
        "admin_route_existence": route,
        "job_normalizer_dryrun": normal,
        "mac_bridge_queue_emit_dryrun": bridge_dry,
        "receiver_stub_handshake_dryrun": handshake,
    }

    missing: List[Dict[str, str]] = []
    if not route.get("ok"):
        missing.append({"contract": "admin_route_existence", "reason": "route_or_mount_missing"})
    if not bool(normal.get("ok")) or not bool(normal.get("manifest_ok")):
        missing.append({"contract": "job_normalizer_dryrun", "reason": "normalizer_dryrun_failed"})
    if not bool(bridge_dry.get("ok")) or not bool(bridge_dry.get("dryrun_emit_ok")):
        missing.append({"contract": "mac_bridge_queue_emit_dryrun", "reason": "bridge_dryrun_emit_failed"})
    if not bool(handshake.get("ok")):
        missing.append({"contract": "receiver_stub_handshake_dryrun", "reason": "receiver_handshake_failed"})

    proof = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "vps_marker": VPS_MARKER,
        "dry_run_only": True,
        "major_path_end_to_end_visible": len(missing) == 0,
        "checks": {k: {"ok": bool(v.get("ok")), "summary": {kk: vv for kk, vv in v.items() if kk in ("manifest_ok", "dryrun_emit_ok", "health_ok")}} for k, v in checks.items()},
        "missing_contracts_count": len(missing),
        "missing_contracts_path": str(out / "remote_build_missing_contracts.json"),
        "dryrun_trace_path": str(out / "remote_build_dryrun_trace.json"),
        "fail_next_card": FAIL_NEXT if missing else None,
    }
    (out / "remote_build_runtime_proof.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "remote_build_missing_contracts.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "missing_contracts": missing,
                "fail_next_card": FAIL_NEXT if missing else None,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (out / "remote_build_dryrun_trace.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "dryrun_trace": checks,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    marker_payload = json.dumps({"marker": VPS_MARKER, "generated_at": _utc(), "missing_contracts": len(missing)}, ensure_ascii=False, indent=2) + "\n"
    (out / VPS_MARKER).write_text(marker_payload, encoding="utf-8")
    (api / "automation" / VPS_MARKER).write_text(marker_payload, encoding="utf-8")

    if args.stdout_json:
        print(json.dumps({"ok": len(missing) == 0, "missing_contracts": missing, "out_dir": str(out)}, ensure_ascii=False, indent=2))
    return 0 if len(missing) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

