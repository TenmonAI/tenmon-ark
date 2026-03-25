#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REAL_PWA_CHAT_PATH_FORENSIC_CURSOR_AUTO_V1

PWA 実会話経路と probe 経路の差分を single-source で観測する（read-only forensic）。
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_REAL_PWA_CHAT_PATH_FORENSIC_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_REAL_PWA_CHAT_PATH_FORENSIC_VPS_V1"
FAIL_NEXT = "TENMON_REAL_PWA_CHAT_PATH_FORENSIC_RETRY_CURSOR_AUTO_V1"

LEAK_PHRASES = [
    "さっき見ていた中心（言霊）を土台に",
    "一般知識 route へ入りました",
    "shadow facts はまだ空です",
]


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _web_root() -> Path:
    return _repo_root() / "web" / "src"


def _read(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def _post_json(url: str, body: Dict[str, Any], timeout: float = 12.0) -> Tuple[int, Dict[str, Any], str]:
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                return r.getcode(), json.loads(raw), raw
            except Exception:
                return r.getcode(), {}, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw), raw
        except Exception:
            return e.code, {}, raw
    except Exception as e:
        return 0, {}, str(e)


def _extract_first(obj: Any, keys: List[str]) -> Optional[Any]:
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k] is not None:
                return obj[k]
        for v in obj.values():
            out = _extract_first(v, keys)
            if out is not None:
                return out
    elif isinstance(obj, list):
        for v in obj:
            out = _extract_first(v, keys)
            if out is not None:
                return out
    return None


def _extract_trace(payload: Dict[str, Any], raw: str, req: Dict[str, Any], endpoint: str) -> Dict[str, Any]:
    thread_center = _extract_first(payload, ["threadCenter", "centerKey", "threadCenterKey", "scriptureKey"])
    route_reason = _extract_first(payload, ["routeReason", "route", "reason"])
    response_plan = _extract_first(payload, ["responsePlan"])
    raw_response = raw[:2000]
    canonical_response = (
        _extract_first(payload, ["response", "finalResponse", "canonicalResponse", "text"]) or ""
    )
    projected_response = _extract_first(payload, ["projectedResponse", "surface", "surfaceResponse"])
    finalize_response = _extract_first(payload, ["finalizeResponse", "finalResponse"])
    return {
        "request_payload": req,
        "endpoint_path": endpoint,
        "threadId": req.get("threadId"),
        "threadCenter": thread_center,
        "routeReason": route_reason,
        "responsePlan": response_plan if isinstance(response_plan, dict) else {},
        "rawResponse": raw_response,
        "canonicalResponse": str(canonical_response)[:4000],
        "projectedResponse": str(projected_response or "")[:3000],
        "finalizeResponse": str(finalize_response or canonical_response or "")[:4000],
    }


def _frontend_endpoint_report() -> Dict[str, Any]:
    api_chat = _read(_web_root() / "api" / "chat.ts")
    hook_chat = _read(_web_root() / "hooks" / "useChat.ts")
    cfg = _read(_web_root() / "config" / "api.ts")
    p = {
        "chat_api_file": str(_web_root() / "api" / "chat.ts"),
        "hook_file": str(_web_root() / "hooks" / "useChat.ts"),
        "config_file": str(_web_root() / "config" / "api.ts"),
    }
    endpoint = "/api/chat" if "/api/chat" in cfg or "/api/chat" in api_chat else "unknown"
    threadid_map = "sessionId -> threadId" if "threadId: req.sessionId" in api_chat else "unknown"
    restore_keys = []
    for key in ("TENMON_THREAD_ID", "TENMON_PWA_THREADS_META_V1", "TENMON_PWA_MSGS_V2"):
        if key in hook_chat:
            restore_keys.append(key)
    return {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "frontend_endpoint": endpoint,
        "payload_mapping": threadid_map,
        "session_restore_keys": restore_keys,
        "session_restore_behavior": {
            "localStorage_thread_restore": "localStorage.getItem(THREAD_KEY)" in hook_chat,
            "new_thread_on_reset": "resetThread" in hook_chat and "localStorage.setItem(THREAD_KEY" in hook_chat,
            "messages_persisted": "saveMessages" in hook_chat and "loadMessages" in hook_chat,
        },
        "source_paths": p,
    }


def _contains_leak(text: str) -> Dict[str, bool]:
    return {p: (p in text) for p in LEAK_PHRASES}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--api-base", default="http://127.0.0.1:3000")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    endpoint = f"{args.api_base}/api/chat"
    now_key = datetime.now().strftime("%Y%m%d%H%M%S")
    thread_cont = f"pwa-forensic-cont-{now_key}"
    thread_new = f"pwa-forensic-new-{now_key}"

    # PWA 実運用に近い: 継続 thread（scripture -> general）
    req1 = {"threadId": thread_cont, "message": "法華経の核心を一言で示してください。"}
    c1, p1, raw1 = _post_json(endpoint, req1)
    tr1 = _extract_trace(p1, raw1, req1, "/api/chat")

    req2 = {"threadId": thread_cont, "message": "次の一手だけを短くください。"}
    c2, p2, raw2 = _post_json(endpoint, req2)
    tr2 = _extract_trace(p2, raw2, req2, "/api/chat")

    # 新規 thread の general
    req3 = {"threadId": thread_new, "message": "次の一手だけを短くください。"}
    c3, p3, raw3 = _post_json(endpoint, req3)
    tr3 = _extract_trace(p3, raw3, req3, "/api/chat")

    # probe 比較用（単発 /api/chat）
    req_probe = {"threadId": f"probe-forensic-{now_key}", "message": "AIとは何ですか"}
    cp, pp, rawp = _post_json(endpoint, req_probe)
    tp = _extract_trace(pp, rawp, req_probe, "/api/chat")

    pwa_trace = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "endpoint": endpoint,
        "turns": [
            {"name": "continuity_scripture_turn", "status": c1, **tr1},
            {"name": "continuity_general_turn", "status": c2, **tr2},
            {"name": "new_thread_general_turn", "status": c3, **tr3},
        ],
    }

    leak2 = _contains_leak(str(tr2.get("finalizeResponse") or tr2.get("canonicalResponse") or ""))
    leak3 = _contains_leak(str(tr3.get("finalizeResponse") or tr3.get("canonicalResponse") or ""))
    leak2_any = any(leak2.values())
    leak3_any = any(leak3.values())

    diff = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "probe_turn": {"status": cp, **tp},
        "pwa_continuity_turn": {"status": c2, **tr2},
        "difference_summary": {
            "probe_routeReason": tp.get("routeReason"),
            "pwa_routeReason": tr2.get("routeReason"),
            "probe_threadCenter": tp.get("threadCenter"),
            "pwa_threadCenter": tr2.get("threadCenter"),
            "pwa_internal_leak_detected": leak2_any,
            "new_thread_internal_leak_detected": leak3_any,
        },
    }

    bleed_conditions = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "conditions": [
            {
                "id": "scripture_center_carry_then_general_query",
                "matched": bool(tr1.get("threadCenter")) and bool(tr2.get("threadCenter")) and leak2_any,
                "evidence": {
                    "turn1_threadCenter": tr1.get("threadCenter"),
                    "turn2_threadCenter": tr2.get("threadCenter"),
                    "turn2_routeReason": tr2.get("routeReason"),
                    "turn2_leak_phrases": [k for k, v in leak2.items() if v],
                },
            },
            {
                "id": "new_thread_general_control",
                "matched": not leak3_any,
                "evidence": {
                    "new_thread_routeReason": tr3.get("routeReason"),
                    "new_thread_leak_phrases": [k for k, v in leak3.items() if v],
                },
            },
        ],
    }

    frontend = _frontend_endpoint_report()

    # root cause を 1-3 個に絞る
    root_causes: List[Dict[str, str]] = []
    if leak2_any and not leak3_any:
        root_causes.append(
            {
                "id": "continuity_thread_center_carry_bias",
                "reason": "継続 thread の center carry と general 問いの主権判定が競合し、内部文が表面に漏れる",
            }
        )
    if "sessionId -> threadId" in frontend.get("payload_mapping", ""):
        root_causes.append(
            {
                "id": "pwa_thread_reuse_persistent",
                "reason": "PWA は localStorage thread を長期間再利用するため、carry 条件が再発しやすい",
            }
        )
    if c1 != 200 or c2 != 200 or c3 != 200 or cp != 200:
        root_causes.append(
            {
                "id": "runtime_path_instability",
                "reason": "一部リクエストが 200 でなく、forensic と実運用の比較が不安定",
            }
        )
    root_causes = root_causes[:3]

    focused_cards = []
    if any(c.get("id") == "continuity_thread_center_carry_bias" for c in root_causes):
        focused_cards.append(
            {
                "source": "real_pwa_forensic",
                "cursor_card": "TENMON_GENERAL_SCRIPTURE_BLEED_GUARD_V1",
                "reason": "general 主権と scripture carry の境界補修",
            }
        )
    if any(c.get("id") == "pwa_thread_reuse_persistent" for c in root_causes):
        focused_cards.append(
            {
                "source": "real_pwa_forensic",
                "cursor_card": "TENMON_PWA_THREAD_CARRY_BOUNDARY_GUARD_V1",
                "reason": "PWA session restore 時の carry 境界監査",
            }
        )
    if any(c.get("id") == "runtime_path_instability" for c in root_causes):
        focused_cards.append(
            {
                "source": "real_pwa_forensic",
                "cursor_card": FAIL_NEXT,
                "reason": "runtime 経路が不安定なため再採取",
            }
        )
    if not focused_cards:
        focused_cards.append(
            {
                "source": "real_pwa_forensic",
                "cursor_card": FAIL_NEXT,
                "reason": "差分が小さいため再採取で確定",
            }
        )

    manifest = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "root_causes": root_causes,
        "focused_next_cards": focused_cards[:3],
        "fail_next_card": FAIL_NEXT,
    }

    (api / "automation" / "pwa_real_chat_trace.json").write_text(
        json.dumps(pwa_trace, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / "pwa_vs_probe_diff.json").write_text(
        json.dumps(diff, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / "thread_center_bleed_conditions.json").write_text(
        json.dumps(bleed_conditions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / "frontend_chat_endpoint_report.json").write_text(
        json.dumps(frontend, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / "focused_next_cards_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / VPS_MARKER).write_text(
        f"{VPS_MARKER}\n{_utc()}\nroot_causes={len(root_causes)}\n", encoding="utf-8"
    )

    if args.stdout_json:
        print(json.dumps({"ok": True, "root_causes": root_causes, "focused_next_cards": focused_cards[:3]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

