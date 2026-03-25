#!/usr/bin/env bash
# TENMON_MAC_REMOTE_BRIDGE — Mac 側受信スタブ（所定ディレクトリへ manifest 保存 + ack を返す）
# 使い方: TENMON_MAC_BRIDGE_SECRET=... TENMON_MAC_RECEIVER_PORT=8765 ./mac_remote_receiver_stub_v1.sh
# 本番は VPN / mTLS 等と併用推奨。127.0.0.1 のみ既定 bind。
set -euo pipefail
export TENMON_MAC_BRIDGE_SECRET="${TENMON_MAC_BRIDGE_SECRET:-CHANGE_ME}"
export TENMON_MAC_RECEIVER_PORT="${TENMON_MAC_RECEIVER_PORT:-8765}"
export TENMON_MAC_DROP_DIR="${TENMON_MAC_DROP_DIR:-$HOME/tenmon_remote_bridge_inbox}"
export TENMON_MAC_RECEIVER_BIND="${TENMON_MAC_RECEIVER_BIND:-127.0.0.1}"

exec python3 - "$@" <<'PY'
"""embedded receiver for mac_remote_receiver_stub_v1.sh"""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = int(os.environ.get("TENMON_MAC_RECEIVER_PORT", "8765"))
BIND = os.environ.get("TENMON_MAC_RECEIVER_BIND", "127.0.0.1")
SECRET = os.environ.get("TENMON_MAC_BRIDGE_SECRET", "CHANGE_ME")
DROP = Path(os.environ.get("TENMON_MAC_DROP_DIR", os.path.expanduser("~/tenmon_remote_bridge_inbox"))).resolve()


def utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class H(BaseHTTPRequestHandler):
    server_version = "TenmonMacReceiver/1"

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        if self.path in ("/", "/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"service":"tenmon-mac-receiver-stub"}\n')
            return
        self.send_error(404)

    def do_POST(self) -> None:
        u = urlparse(self.path)
        if u.path != "/tenmon/mac-bridge/v1/ingest":
            self.send_error(404)
            return
        if self.headers.get("X-Tenmon-Bridge-Secret") != SECRET:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"FORBIDDEN"}\n')
            return
        ln = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(ln) if ln > 0 else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"invalid_json"}\n')
            return
        manifest = body.get("manifest")
        if not isinstance(manifest, dict):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"manifest_required"}\n')
            return
        job_id = str(manifest.get("job_id") or "unknown")
        DROP.mkdir(parents=True, exist_ok=True)
        fpath = DROP / f"job_{job_id}.json"
        fpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        env_path = DROP / "mac_receiver_drop_manifest.json"
        meta = {
            "version": 1,
            "card": "TENMON_MAC_REMOTE_BRIDGE_V1",
            "received_at": utc(),
            "job_id": job_id,
            "delivery_id": body.get("delivery_id"),
            "saved_path": str(fpath),
            "envelope": body,
        }
        env_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        ack = {
            "ok": True,
            "ack_id": f"ack_{uuid.uuid4().hex[:16]}",
            "job_id": job_id,
            "saved_path": str(fpath),
            "received_at": utc(),
        }
        out = json.dumps(ack, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


if __name__ == "__main__":
    httpd = HTTPServer((BIND, PORT), H)
    print(f"[tenmon-mac-receiver] bind={BIND}:{PORT} drop={DROP}", file=sys.stderr)
    httpd.serve_forever()
PY
