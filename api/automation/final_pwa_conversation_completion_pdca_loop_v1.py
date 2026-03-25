#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1
実PWA会話基準の最終PDCAオーケストレータ（観測・整流中心）。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1"
VPS = "TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_VPS_V1"
FAIL_NEXT = "TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_RETRY_CURSOR_AUTO_V1"

TARGET_QUESTIONS = [
    "おはよう",
    "時間の概念とはなんなのか？ わかりやすく長文で説明してみて",
    "言灵のヒの意味は？",
    "今の総理大臣は？",
    "日本の日出る国の意味は？",
    "人生ってなんなの？",
    "なぜ文明と言葉は関係するの？",
    "形はまだありません。その時時によって、最適な方法と形にしたいです。",
]

LEAK_PATTERNS = [
    "一般知識 route へ入りました",
    "shadow facts はまだ空です",
    "さっき見ていた中心",
    "routeReason",
]


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api() -> Path:
    return Path(__file__).resolve().parents[1]


def _post_json(url: str, body: Dict[str, Any], timeout: float = 14.0) -> Tuple[int, Dict[str, Any], str]:
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


def _extract_first(obj: Any, keys: List[str]) -> Any:
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k] is not None:
                return obj[k]
        for v in obj.values():
            got = _extract_first(v, keys)
            if got is not None:
                return got
    elif isinstance(obj, list):
        for v in obj:
            got = _extract_first(v, keys)
            if got is not None:
                return got
    return None


def _trace_turn(endpoint: str, thread_id: str, message: str) -> Dict[str, Any]:
    req = {"threadId": thread_id, "message": message}
    sc, payload, raw = _post_json(endpoint, req)
    route = _extract_first(payload, ["routeReason", "route", "reason"])
    center = _extract_first(payload, ["threadCenter", "centerKey", "threadCenterKey", "scriptureKey"])
    plan = _extract_first(payload, ["responsePlan"])
    canonical = _extract_first(payload, ["response", "finalResponse", "canonicalResponse", "text"])
    proj = _extract_first(payload, ["projectedResponse", "surface"])
    fin = _extract_first(payload, ["finalizeResponse", "finalResponse"])
    return {
        "request_payload": req,
        "endpoint_path": "/api/chat",
        "threadId": thread_id,
        "threadCenter": center,
        "routeReason": route,
        "responsePlan": plan if isinstance(plan, dict) else {},
        "rawResponse": raw[:2200],
        "canonicalResponse": str(canonical or "")[:5000],
        "projectedResponse": str(proj or "")[:5000],
        "finalizeResponse": str(fin or canonical or "")[:5000],
        "status": sc,
    }


def _has_leak(text: str) -> bool:
    t = text or ""
    if any(p in t for p in LEAK_PATTERNS):
        return True
    if "R22_" in t or "_V1" in t and "route" in t.lower():
        return True
    return False


def _dup_paragraph(text: str) -> bool:
    parts = [p.strip() for p in (text or "").split("\n\n") if p.strip()]
    seen = set()
    for p in parts:
        k = " ".join(p.split())
        if len(k) < 20:
            continue
        if k in seen:
            return True
        seen.add(k)
    return False


def _run_py(script: Path, args: List[str]) -> Dict[str, Any]:
    p = subprocess.run(
        ["python3", str(script), *args],
        cwd=str(_api()),
        capture_output=True,
        text=True,
        check=False,
    )
    return {"rc": p.returncode, "stdout_tail": (p.stdout or "")[-4000:], "stderr_tail": (p.stderr or "")[-4000:]}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--api-base", default="http://127.0.0.1:3000")
    ap.add_argument("--stdout-json", action="store_true")
    ns = ap.parse_args()

    api = _api()
    auto = api / "automation"
    endpoint = f"{ns.api_base}/api/chat"
    ts = datetime.now().strftime("%Y%m%d%H%M%S")

    # PHASE 0/1: single source trace
    continuity_tid = f"pwa-final-cont-{ts}"
    new_tid = f"pwa-final-new-{ts}"

    turns: List[Dict[str, Any]] = []
    for i, q in enumerate(TARGET_QUESTIONS):
        turns.append(_trace_turn(endpoint, continuity_tid, q))
        if i in (0, 2, 7):
            turns.append(_trace_turn(endpoint, new_tid, q))

    (auto / "pwa_real_chat_single_source_trace.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "api_base": ns.api_base,
                "target_questions": TARGET_QUESTIONS,
                "turns": turns,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # gap report / bleed report
    gap_rows: List[Dict[str, Any]] = []
    bleed_rows: List[Dict[str, Any]] = []
    for t in turns:
        text = str(t.get("finalizeResponse") or t.get("canonicalResponse") or "")
        leak = _has_leak(text)
        dup = _dup_paragraph(text)
        rr = str(t.get("routeReason") or "")
        center = str(t.get("threadCenter") or "")
        q = str((t.get("request_payload") or {}).get("message") or "")
        gap_rows.append(
            {
                "threadId": t.get("threadId"),
                "question": q,
                "routeReason": rr,
                "threadCenter": center,
                "meta_leak": leak,
                "duplicate_paragraph": dup,
                "status": t.get("status"),
            }
        )
        if center and ("scripture" in center.lower() or "法華" in center) and ("GENERAL" in rr.upper() or "NATURAL_GENERAL" in rr):
            bleed_rows.append(
                {
                    "threadId": t.get("threadId"),
                    "question": q,
                    "threadCenter": center,
                    "routeReason": rr,
                    "meta_leak": leak,
                }
            )

    (auto / "pwa_probe_gap_report.json").write_text(
        json.dumps({"version": 1, "card": CARD, "generated_at": _utc(), "rows": gap_rows}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (auto / "thread_center_bleed_report.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "bleed_rows": bleed_rows,
                "bleed_detected": len(bleed_rows) > 0,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # PHASE 2/3/4/5: reuse existing normalizers/observers and summarize
    oc_norm = _run_py(api / "automation" / "contract_stabilization_master_v1.py", ["--api-base", ns.api_base])
    out_mismatch = {}
    p = auto / "output_contract_path_mismatch.json"
    if p.is_file():
        out_mismatch = json.loads(p.read_text(encoding="utf-8", errors="replace"))
    (auto / "output_contract_normalization_report.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "runner": oc_norm,
                "path_mismatch_count": int(out_mismatch.get("path_mismatch_count", 0)),
                "real_missing_count": int(out_mismatch.get("real_missing_count", 0)),
                "source": str(p),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # self-improvement reflection
    self_manifest = auto / "out" / "tenmon_self_improvement_os_v1" / "self_improvement_os_manifest.json"
    self_integrated = auto / "out" / "tenmon_self_improvement_os_v1" / "integrated_final_verdict.json"
    kokuzo_integrated = auto / "out" / "tenmon_kokuzo_learning_improvement_os_v1" / "integrated_learning_verdict.json"
    sim = {
        "self_manifest_exists": self_manifest.is_file(),
        "self_integrated_exists": self_integrated.is_file(),
        "kokuzo_integrated_exists": kokuzo_integrated.is_file(),
        "pwa_gap_rows_with_leak": sum(1 for r in gap_rows if r["meta_leak"]),
        "reflection_ready": self_manifest.is_file() and self_integrated.is_file() and kokuzo_integrated.is_file(),
    }
    (auto / "self_improvement_reflection_report.json").write_text(
        json.dumps({"version": 1, "card": CARD, "generated_at": _utc(), **sim}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # storage backup nas
    nas = _run_py(api / "automation" / "storage_backup_nas_observer_v1.py", [])
    nas_blockers = {}
    nb = auto / "out" / "storage_backup_nas_recovery_v1" / "backup_blockers.json"
    if nb.is_file():
        nas_blockers = json.loads(nb.read_text(encoding="utf-8", errors="replace"))
    (auto / "storage_backup_nas_recovery_report.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "runner": nas,
                "backup_blockers": nas_blockers.get("blockers", []),
                "backup_rc": nas_blockers.get("rc"),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # phase 6 final verdict
    checks = {
        "meta_leak_none": all(not r["meta_leak"] for r in gap_rows),
        "compare_duplicate_none": all(not r["duplicate_paragraph"] for r in gap_rows),
        "bleed_none": len(bleed_rows) == 0,
        "output_contract_real_missing_zero": int(out_mismatch.get("real_missing_count", 0)) == 0,
        "self_reflection_ready": bool(sim["reflection_ready"]),
        "nas_ready": int(nas_blockers.get("rc", 1)) == 0,
    }
    blockers = [k for k, v in checks.items() if not v]
    final_ready = len(blockers) == 0

    (auto / "pwa_acceptance_final_verdict.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "single_source": "real_pwa_chat_trace",
                "checks": checks,
                "blockers": blockers,
                "ready": final_ready,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (auto / "final_pwa_completion_readiness.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "final_pwa_completion_readiness": final_ready,
                "blockers": blockers,
                "fail_next_card": FAIL_NEXT if not final_ready else None,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # focused next cards 1-3
    mapping = {
        "meta_leak_none": "TENMON_GENERAL_SCRIPTURE_BLEED_GUARD_V1",
        "compare_duplicate_none": "TENMON_COMPARE_SURFACE_DEDUP_GUARD_V1",
        "bleed_none": "TENMON_THREAD_CENTER_CARRY_BOUNDARY_GUARD_V1",
        "output_contract_real_missing_zero": "TENMON_OUTPUT_CONTRACT_PATH_NORMALIZE_V1",
        "self_reflection_ready": "TENMON_SELF_IMPROVEMENT_REFLECTION_LOCK_V1",
        "nas_ready": "TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1",
    }
    focused = []
    for b in blockers:
        if b in mapping:
            focused.append(mapping[b])
        if len(focused) >= 3:
            break
    if not focused:
        focused = [FAIL_NEXT]

    md = [
        "# TENMON_FINAL_PWA_NEXT_PDCA_AUTO_V1",
        "",
        f"- card: `{CARD}`",
        f"- generated_at: `{_utc()}`",
        f"- final_ready: `{final_ready}`",
        "",
        "## Focused Next Cards",
    ]
    md.extend([f"- `{c}`" for c in focused[:3]])
    md.append("")
    md.append("## Blockers")
    md.extend([f"- `{b}`" for b in blockers] or ["- none"])
    (auto / "generated_cursor_apply" / "TENMON_FINAL_PWA_NEXT_PDCA_AUTO_V1.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    (auto / VPS).write_text(f"{VPS}\n{_utc()}\nready={final_ready}\n", encoding="utf-8")

    if ns.stdout_json:
        print(json.dumps({"ok": True, "final_ready": final_ready, "blockers": blockers, "focused_next_cards": focused[:3]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

