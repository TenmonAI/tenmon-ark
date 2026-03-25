#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TOTAL_FORENSIC_REVEAL — 観測採取（typecheck 結果・health/audit・runtime_matrix・chat 静的密度）
seal スクリプト本体は変更しない（プローブロジックは seal と同型の別実装）。
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Tuple


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _read_typecheck_rc(out: Path) -> Tuple[bool, int]:
    rc_path = out / "typecheck.rc"
    if not rc_path.is_file():
        return False, -1
    try:
        rc = int((rc_path.read_text(encoding="utf-8", errors="replace") or "1").strip())
    except Exception:
        rc = 1
    return rc == 0, rc


def _curl_text(url: str, timeout: float = 8.0) -> Tuple[bool, str, str]:
    try:
        p = subprocess.run(
            ["curl", "-fsS", "--max-time", str(timeout), url],
            capture_output=True,
            text=True,
            check=False,
        )
        if p.returncode != 0:
            return False, "", (p.stderr or f"exit {p.returncode}")[:4000]
        return True, (p.stdout or "")[:12000], ""
    except OSError as e:
        return False, "", str(e)


def _post_chat(base: str, chat_url: str, message: str, thread_id: str, timeout: float = 40.0) -> Tuple[int, str]:
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def _discover_chat_url(base: str) -> str | None:
    b = base.rstrip("/")
    for path in ("/chat", "/api/chat"):
        url = b + path
        try:
            _post_chat(b, url, "ping", "forensic-discover", timeout=12.0)
            return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
            continue
    return None


def _runtime_matrix(base: str, out: Path) -> None:
    tests = [
        {"name": "general_1", "message": "AIとは何？"},
        {"name": "support_1", "message": "どう進めればいい？"},
        {"name": "selfaware_1", "message": "天聞アークに意識はあるの？"},
        {"name": "define_1", "message": "言霊とは何？"},
        {"name": "scripture_1", "message": "法華経とは何を説くの？"},
        {"name": "continuity_1", "message": "さっきの話を踏まえて次の一手をください"},
        {"name": "nextstep_1", "message": "次の一手だけを明確にください"},
        {"name": "compare_1", "message": "GPTと天聞アークの違いを比較して"},
        {"name": "worldview_1", "message": "なぜ文明と言葉は関係するの？"},
        {"name": "longform_1", "message": "天聞アークが世界最高AIになるための未達点を詳しく説明して"},
    ]
    chat_url = _discover_chat_url(base)
    res: Dict[str, Any] = {"_meta": {"chat_url_used": chat_url}}
    if not chat_url:
        for t in tests:
            res[t["name"]] = {"ok": False, "error": "no_chat_url"}
    else:
        for t in tests:
            try:
                status, body = _post_chat(base, chat_url, t["message"], f"forensic-{t['name']}")
                res[t["name"]] = {"ok": True, "status": status, "body": body}
            except Exception as e:
                res[t["name"]] = {"ok": False, "error": str(e)}
            time.sleep(0.15)
    (out / "runtime_matrix.json").write_text(
        json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _chat_metrics(chat_path: Path) -> Dict[str, Any]:
    text = chat_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    return {
        "path": str(chat_path),
        "lines": len(lines),
        "bytes": len(text.encode("utf-8")),
        "approx_export_const": len(re.findall(r"\bexport\s+(const|function|async\s+function)\b", text)),
        "approx_router_use": text.lower().count("router"),
        "approx_route_reason": len(re.findall(r"routeReason", text)),
        "approx_try_catch": text.count("try {"),
        "approx_async_handlers": len(re.findall(r"async\s*\([^)]*\)\s*=>", text)),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_total_forensic_collect_v1")
    ap.add_argument("--out-dir", type=str, required=True)
    ap.add_argument("--base-url", type=str, default="http://127.0.0.1:3000")
    ap.add_argument("--chat-path", type=str, default="")
    args = ap.parse_args()

    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    api = _repo_api()

    ok, rc = _read_typecheck_rc(out)
    (out / "typecheck_report.json").write_text(
        json.dumps(
            {
                "ok": ok,
                "rc": rc,
                "mode": "npm run check (tsc --noEmit)",
                "note": "dist は書かない（観測ポリシー）",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    base = args.base_url.rstrip("/")
    h_ok, h_body, h_err = _curl_text(f"{base}/health")
    (out / "health_probe.json").write_text(
        json.dumps(
            {
                "ok": h_ok,
                "url": f"{base}/health",
                "body_preview": h_body[:4000],
                "error": h_err,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    a_ok, a_body, a_err = _curl_text(f"{base}/api/audit")
    (out / "audit_probe.json").write_text(
        json.dumps(
            {
                "ok": a_ok,
                "url": f"{base}/api/audit",
                "body_preview": a_body[:8000],
                "error": a_err,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    try:
        _runtime_matrix(base, out)
    except Exception as e:
        (out / "runtime_matrix.json").write_text(
            json.dumps({"_error": str(e)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    chat_p = Path(args.chat_path) if args.chat_path.strip() else (api / "src" / "routes" / "chat.ts")
    if chat_p.is_file():
        met = _chat_metrics(chat_p)
    else:
        met = {"missing": True, "path": str(chat_p)}
    (out / "chat_static_deep_metrics.json").write_text(
        json.dumps(met, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(json.dumps({"ok": True, "out_dir": str(out)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
