#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_REMOTE_BRIDGE_V1 — VPS 側: 正規化 manifest を Mac 受信エージェントへ POST し、ack・キュー・ログを更新する。
（Cursor 実行はしない）
"""
from __future__ import annotations

import argparse
import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

CARD = "TENMON_MAC_REMOTE_BRIDGE_V1"
BRIDGE_VERSION = 1


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _queue_path() -> Path:
    p = __import__("os").environ.get("TENMON_REMOTE_BRIDGE_QUEUE_PATH", "").strip()
    if p:
        return Path(p)
    return _repo_root() / "api" / "automation" / "remote_bridge_queue.json"


def _log_path() -> Path:
    p = __import__("os").environ.get("TENMON_REMOTE_BRIDGE_LOG_PATH", "").strip()
    if p:
        return Path(p)
    return _repo_root() / "api" / "automation" / "remote_bridge_delivery_log.jsonl"


def _read_queue() -> Dict[str, Any]:
    qp = _queue_path()
    if not qp.is_file():
        return {"version": 1, "card": CARD, "updatedAt": _utc_now(), "jobs": []}
    try:
        return json.loads(qp.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {"version": 1, "card": CARD, "updatedAt": _utc_now(), "jobs": []}


def _write_queue(data: Dict[str, Any]) -> None:
    data["updatedAt"] = _utc_now()
    qp = _queue_path()
    qp.parent.mkdir(parents=True, exist_ok=True)
    qp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _append_log(row: Dict[str, Any]) -> None:
    lp = _log_path()
    lp.parent.mkdir(parents=True, exist_ok=True)
    with lp.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _http_post_json(url: str, payload: Dict[str, Any], secret: str, timeout: float) -> tuple[int, str]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Tenmon-Bridge-Secret": secret,
            "User-Agent": "tenmon-mac-remote-bridge/1",
        },
    )
    parsed = urllib.parse.urlparse(url)
    kw: Dict[str, Any] = {"timeout": timeout}
    if parsed.scheme == "https":
        import ssl

        kw["context"] = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, **kw) as r:
            return r.getcode(), r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        raise


def _upsert_job(
    jobs: List[Dict[str, Any]],
    job_id: str,
    patch: Dict[str, Any],
) -> List[Dict[str, Any]]:
    for i, j in enumerate(jobs):
        if j.get("job_id") == job_id:
            row = dict(j)
            row.update(patch)
            jobs[i] = row
            return jobs
    jobs.append({"job_id": job_id, **patch})
    return jobs


def deliver(
    *,
    manifest: Dict[str, Any],
    target_url: str,
    secret: str,
    timeout: float,
    max_retries: int,
    dry_run: bool,
) -> Dict[str, Any]:
    job_id = str(manifest.get("job_id") or manifest.get("jobId") or "unknown_job")
    delivery_id = str(uuid.uuid4())
    envelope: Dict[str, Any] = {
        "version": BRIDGE_VERSION,
        "card": CARD,
        "delivery_id": delivery_id,
        "sent_at": _utc_now(),
        "manifest": manifest,
    }

    if dry_run:
        out = {
            "ok": True,
            "dry_run": True,
            "job_id": job_id,
            "delivery_id": delivery_id,
            "envelope": envelope,
        }
        _append_log({"ts": _utc_now(), "event": "dry_run", "job_id": job_id, "delivery_id": delivery_id})
        return out

    q = _read_queue()
    jobs = list(q.get("jobs") or [])
    jobs = _upsert_job(
        jobs,
        job_id,
        {
            "status": "pending_delivery",
            "updated_at": _utc_now(),
            "delivery_id": delivery_id,
            "target_url": target_url,
        },
    )
    q["jobs"] = jobs
    _write_queue(q)

    last_err: Optional[str] = None
    ack_obj: Optional[Dict[str, Any]] = None
    status = "failed_retryable"
    http_code = 0
    attempts = 0

    for attempt in range(1, max_retries + 1):
        attempts = attempt
        try:
            http_code, text = _http_post_json(target_url, envelope, secret, timeout)
            if 200 <= http_code < 300:
                try:
                    ack_obj = json.loads(text) if text.strip() else {}
                except json.JSONDecodeError:
                    ack_obj = {"raw": text[:2000], "parse_error": True}
                if ack_obj.get("ok") is True:
                    status = "delivered"
                    break
                last_err = f"ack_ok_false:{ack_obj}"
            else:
                last_err = f"http_{http_code}:{text[:500]}"
        except Exception as e:
            last_err = str(e)
        if attempt < max_retries and status != "delivered":
            time.sleep(min(2 ** (attempt - 1), 30) + random.random() * 0.3)

    q2 = _read_queue()
    jobs2 = list(q2.get("jobs") or [])
    patch: Dict[str, Any] = {
        "status": status,
        "updated_at": _utc_now(),
        "delivery_id": delivery_id,
        "target_url": target_url,
        "last_error": last_err if status != "delivered" else None,
        "ack": ack_obj,
        "http_code": http_code,
        "attempts": attempts,
    }
    jobs2 = _upsert_job(jobs2, job_id, patch)
    q2["jobs"] = jobs2
    _write_queue(q2)

    _append_log(
        {
            "ts": _utc_now(),
            "event": "deliver",
            "job_id": job_id,
            "delivery_id": delivery_id,
            "status": status,
            "http_code": http_code,
            "attempts": attempts,
            "error": last_err,
        }
    )

    return {
        "ok": status == "delivered",
        "job_id": job_id,
        "status": status,
        "delivery_id": delivery_id,
        "attempts": attempts,
        "http_code": http_code,
        "last_error": last_err,
        "ack": ack_obj,
        "target_url": target_url,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_MAC_REMOTE_BRIDGE_V1")
    ap.add_argument("--manifest", type=Path, required=True, help="normalized_remote_build_manifest.json")
    ap.add_argument("--target-url", default="", help="override TENMON_MAC_BRIDGE_URL")
    ap.add_argument("--secret", default="", help="override TENMON_MAC_BRIDGE_SECRET")
    ap.add_argument("--timeout", type=float, default=30.0)
    ap.add_argument("--max-retries", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--send-result-out", type=Path, default=None)
    ap.add_argument("--ack-out", type=Path, default=None)
    args = ap.parse_args()

    import os

    target = (args.target_url or os.environ.get("TENMON_MAC_BRIDGE_URL") or "").strip()
    secret = (args.secret or os.environ.get("TENMON_MAC_BRIDGE_SECRET") or "").strip()
    if not args.dry_run:
        if not target:
            print("TENMON_MAC_BRIDGE_URL or --target-url required", file=__import__("sys").stderr)
            return 2
        if not secret:
            print("TENMON_MAC_BRIDGE_SECRET or --secret required", file=__import__("sys").stderr)
            return 2

    manifest = json.loads(args.manifest.read_text(encoding="utf-8", errors="replace"))
    if manifest.get("safety_flags", {}).get("rejected"):
        print("manifest safety_flags.rejected is true — refusing to bridge", file=__import__("sys").stderr)
        return 3

    result = deliver(
        manifest=manifest,
        target_url=target or "http://127.0.0.1:0/tenmon/mac-bridge/v1/ingest",
        secret=secret or "dry",
        timeout=args.timeout,
        max_retries=args.max_retries,
        dry_run=args.dry_run,
    )

    out_dir = _repo_root() / "api" / "automation" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    send_out = args.send_result_out or (out_dir / "remote_bridge_send_result.json")
    ack_out = args.ack_out or (out_dir / "remote_bridge_ack.json")

    send_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ack = result.get("ack")
    if isinstance(ack, dict):
        ack_out.write_text(json.dumps(ack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        ack_out.write_text(json.dumps({"ok": False, "note": "no ack"}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
