#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1

Mac 再配備後、approved high-risk が real execution で結果まで到達したかを
queue / result bundle /（任意）Mac ログから観測のみで確定する。成功の捏造・stale 成功は禁止。
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_dialogue_post_redeploy_realrun_recheck_summary.json"
OUT_MD = "tenmon_dialogue_post_redeploy_realrun_recheck_report.md"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_md(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def safe_list(x: Any) -> list[Any]:
    return x if isinstance(x, list) else []


def read_json_file(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def http_json(
    url: str,
    bearer: str,
    timeout: float = 30.0,
) -> tuple[bool, Any]:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {bearer}"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
        return True, json.loads(raw)
    except Exception:
        return False, None


def parse_iso(ts: str) -> float | None:
    t = str(ts or "").strip()
    if not t:
        return None
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        from datetime import datetime

        return datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def is_approved_high_risk_item(it: dict[str, Any]) -> bool:
    if it.get("fixture") is True:
        return False
    if it.get("dry_run_only") is True:
        return False
    if str(it.get("state") or "") == "rejected":
        return False
    if it.get("escrow_approved") is True:
        return True
    if str(it.get("enqueue_reason") or "").strip() == "escrow_human_approval":
        return True
    if it.get("high_risk") is True:
        return True
    if str(it.get("risk_tier") or "").lower() == "high":
        return True
    return False


def queue_id_of(it: dict[str, Any]) -> str:
    return str(it.get("id") or it.get("job_id") or "").strip()


def bundle_entries_newest_first(entries: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for e in entries:
        if isinstance(e, dict):
            out.append(e)
    out.sort(key=lambda x: parse_iso(str(x.get("ingested_at") or "")) or 0.0, reverse=True)
    return out


def entry_strict_real_accept(e: dict[str, Any]) -> tuple[bool, list[str]]:
    """観測上の厳格条件（捏造なし）。"""
    reasons: list[str] = []
    if e.get("dry_run") is not False:
        reasons.append("dry_run_not_false")
    if e.get("current_run") is not True:
        reasons.append("current_run_not_true")
    if e.get("real_execution_enabled") is not True:
        reasons.append("real_execution_enabled_not_true")
    tf = e.get("touched_files")
    if not isinstance(tf, list) or not any(str(x).strip() for x in tf):
        reasons.append("touched_files_empty")
    if e.get("acceptance_ok") is not True:
        reasons.append("acceptance_ok_not_true")
    brc = e.get("build_rc")
    if brc is None:
        reasons.append("build_rc_null")
    else:
        try:
            if int(brc) != 0:
                reasons.append("build_rc_not_zero")
        except Exception:
            reasons.append("build_rc_invalid")
    return (len(reasons) == 0, reasons)


def read_mac_log_snippet() -> dict[str, Any]:
    out: dict[str, Any] = {"source": "none", "bytes": 0, "has_executor_real_run": False, "has_result_post_ok": False, "has_real_execution_enabled_eq": False}
    local = os.environ.get("TENMON_MAC_WATCH_LOG", "").strip()
    if local:
        p = Path(local)
        if p.is_file():
            try:
                raw = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                raw = ""
            out["source"] = f"file:{local}"
            out["bytes"] = len(raw.encode("utf-8", errors="replace"))
            tail = raw[-800_000:] if len(raw) > 800_000 else raw
            out["has_executor_real_run"] = "executor_real_run" in tail
            out["has_result_post_ok"] = "result_post_ok" in tail
            out["has_real_execution_enabled_eq"] = bool(re.search(r"real_execution_enabled\s*[:=]\s*true", tail, re.I))
            return out

    ssh = os.environ.get("TENMON_MAC_SSH", "").strip()
    if ssh:
        rpath = os.environ.get("TENMON_MAC_REMOTE_WATCH_LOG", "~/tenmon-mac/logs/watch_loop.log").strip()
        cmd = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=12", ssh, f"tail -c 400000 {rpath} 2>/dev/null || true"]
        try:
            cp = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
            tail = (cp.stdout or "") + (cp.stderr or "")
        except Exception as e:
            tail = ""
            out["ssh_error"] = str(e)[:200]
        out["source"] = f"ssh:{ssh}:{rpath}"
        out["bytes"] = len(tail.encode("utf-8", errors="replace"))
        out["has_executor_real_run"] = "executor_real_run" in tail
        out["has_result_post_ok"] = "result_post_ok" in tail
        out["has_real_execution_enabled_eq"] = bool(re.search(r"real_execution_enabled\s*[:=]\s*true", tail, re.I))
        return out

    return out


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    q_path = Path(os.environ.get("TENMON_REMOTE_CURSOR_QUEUE_PATH", str(auto / "remote_cursor_queue.json")))
    b_path = Path(os.environ.get("TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH", str(auto / "remote_cursor_result_bundle.json")))

    max_age_h = float(os.environ.get("TENMON_REALRUN_RECHECK_MAX_AGE_HOURS", "96"))
    max_age_sec = max(1.0, max_age_h * 3600.0)
    now = time.time()

    base = os.environ.get("TENMON_API_BASE", "").strip().rstrip("/")
    bearer = (
        os.environ.get("TENMON_FOUNDER_EXECUTOR_BEARER", "").strip()
        or os.environ.get("TENMON_EXECUTOR_BEARER_TOKEN", "").strip()
    )

    queue: dict[str, Any] = {}
    bundle: dict[str, Any] = {}
    queue_src = f"file:{q_path}"
    bundle_src = f"file:{b_path}"

    if base and bearer:
        ok_q, jq = http_json(f"{base}/api/admin/cursor/queue", bearer)
        if ok_q and isinstance(jq, dict) and isinstance(jq.get("items"), list):
            queue = {"version": jq.get("version", 1), "items": jq["items"], "updatedAt": jq.get("updatedAt")}
            queue_src = f"http:{base}/api/admin/cursor/queue"
        ok_b, jb = http_json(f"{base}/api/admin/cursor/result/bundle", bearer)
        if ok_b and isinstance(jb, dict) and isinstance((jb.get("bundle") or {}).get("entries"), list):
            bundle = jb["bundle"]  # type: ignore[assignment]
            bundle_src = f"http:{base}/api/admin/cursor/result/bundle"

    if not queue.get("items"):
        queue = read_json_file(q_path)
        queue_src = f"file:{q_path}"
    if not isinstance(bundle.get("entries"), list):
        bundle = read_json_file(b_path)
        bundle_src = f"file:{b_path}"

    items = [x for x in safe_list(queue.get("items")) if isinstance(x, dict)]
    hr_items = [it for it in items if is_approved_high_risk_item(it)]
    hr_ids = {queue_id_of(it) for it in hr_items if queue_id_of(it)}

    entries = bundle_entries_newest_first(safe_list(bundle.get("entries")))

    queue_obs: dict[str, Any] = {
        "source": queue_src,
        "high_risk_approved_count": len(hr_items),
        "high_risk_ids": sorted(hr_ids),
        "items": [
            {
                "queue_id": queue_id_of(it),
                "state": it.get("state"),
                "cursor_card": it.get("cursor_card"),
                "escrow_approved": it.get("escrow_approved"),
                "enqueue_reason": it.get("enqueue_reason"),
                "completed_at": it.get("completed_at"),
            }
            for it in hr_items
        ],
    }

    hr_executed = all(str(it.get("state") or "") == "executed" for it in hr_items)
    queue_obs["all_high_risk_in_executed"] = bool(hr_items) and hr_executed
    queue_obs["queue_progression_ready_to_executed"] = queue_obs["all_high_risk_in_executed"]

    candidates = [e for e in entries if isinstance(e, dict) and str(e.get("queue_id") or "").strip() in hr_ids]

    best_strict_fresh: dict[str, Any] | None = None
    best_strict_stale: dict[str, Any] | None = None
    for e in candidates:
        ok_s, _reasons = entry_strict_real_accept(e)
        if not ok_s:
            continue
        ing = parse_iso(str(e.get("ingested_at") or ""))
        is_stale = ing is not None and (now - ing) > max_age_sec
        if not is_stale:
            best_strict_fresh = e
            break
        if best_strict_stale is None:
            best_strict_stale = e

    proof_entry = best_strict_fresh or best_strict_stale
    stale_blocked = proof_entry is not None and best_strict_fresh is None

    strict_detail: dict[str, Any] = {}
    if proof_entry:
        ok_s, reasons = entry_strict_real_accept(proof_entry)
        extra = ["stale_ingested_at"] if stale_blocked else []
        strict_detail = {
            "queue_id": str(proof_entry.get("queue_id") or ""),
            "pass": ok_s and not stale_blocked,
            "fail_reasons": reasons + extra,
            "ingested_at": proof_entry.get("ingested_at"),
        }

    mac_log = read_mac_log_snippet()

    real_from_bundle = best_strict_fresh is not None
    real_from_log = bool(mac_log.get("has_executor_real_run") and mac_log.get("has_result_post_ok"))
    real_execution_opened = bool(real_from_bundle or real_from_log)

    pe = best_strict_fresh
    touched_nonempty = bool(
        pe
        and isinstance(pe.get("touched_files"), list)
        and any(str(x).strip() for x in pe["touched_files"])  # type: ignore[index]
    )
    build_acceptance_seen = bool(
        pe
        and pe.get("acceptance_ok") is True
        and pe.get("build_rc") is not None
        and int(pe["build_rc"]) == 0  # type: ignore[arg-type]
    )

    best_qid = str(pe.get("queue_id") or "").strip() if pe else None

    next_best = None
    if isinstance(pe, dict):
        nc = pe.get("next_card")
        if nc:
            next_best = str(nc)
    if not next_best and best_qid:
        for it in hr_items:
            if queue_id_of(it) == best_qid:
                next_best = str(it.get("cursor_card") or "") or None
                break

    require_mac_log = os.environ.get("TENMON_REALRUN_RECHECK_REQUIRE_MAC_LOG", "").strip().lower() in ("1", "true", "yes")
    mac_log_ok = (not require_mac_log) or real_from_log

    summary = {
        "real_execution_opened": real_execution_opened,
        "latest_real_queue_id": best_qid,
        "latest_real_result_seen": real_from_bundle,
        "touched_files_nonempty": touched_nonempty,
        "build_acceptance_seen": build_acceptance_seen,
        "next_best_card": next_best,
        "stale_success_blocked": stale_blocked,
        "max_age_hours": max_age_h,
        "mac_log_required": require_mac_log,
        "mac_log_signals_ok": real_from_log,
    }

    acceptance = (
        len(hr_items) > 0
        and hr_executed
        and real_from_bundle
        and not stale_blocked
        and touched_nonempty
        and build_acceptance_seen
        and mac_log_ok
    )

    fail_primary: str | None = None
    if not acceptance:
        if not hr_items:
            fail_primary = "no_high_risk_items"
        elif not hr_executed:
            fail_primary = "high_risk_not_all_executed"
        elif require_mac_log and not real_from_log:
            fail_primary = "mac_log_signals_missing"
        elif best_strict_fresh is None and best_strict_stale is not None:
            fail_primary = "strict_bundle_match_stale_only"
        elif best_strict_fresh is None:
            fail_primary = "no_fresh_strict_bundle_match"
        else:
            fail_primary = "unknown"

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "ok": acceptance,
        "summary": summary,
        "queue_observation": queue_obs,
        "bundle_observation": {
            "source": bundle_src,
            "entries_total": len(safe_list(bundle.get("entries"))),
            "strict_match_detail": strict_detail,
        },
        "mac_log_observation": mac_log,
        "nextOnPass": "以後の主線へ進む",
        "nextOnFail": "停止。realrun recheck retry 1枚のみ生成。",
        "recheck_fail_primary": fail_primary,
    }

    out_path = auto / OUT_JSON
    write_json(out_path, out)

    if not hr_items:
        q_verdict = "no high_risk items (nothing to recheck)"
    elif hr_executed:
        q_verdict = "high_risk items all executed"
    else:
        q_verdict = "high_risk items not all executed"
    md_lines = [
        f"# {CARD}",
        "",
        f"- ok: `{out['ok']}`",
        f"- fail_primary: `{out.get('recheck_fail_primary')}`",
        f"- queue: {q_verdict} (n={len(hr_items)})",
        f"- latest queue_id (bundle focus): `{best_qid}`",
        f"- bundle strict pass: `{strict_detail.get('pass')}` reasons={strict_detail.get('fail_reasons')}",
        f"- touched_files_nonempty: `{summary['touched_files_nonempty']}`",
        f"- build_acceptance_seen: `{summary['build_acceptance_seen']}`",
        f"- mac log (executor_real_run & result_post_ok): `{real_from_log}` source={mac_log.get('source')}",
        f"- summary json: `{out_path}`",
        "",
        "## next",
        f"- pass: {out['nextOnPass']}",
        f"- fail: {out['nextOnFail']}",
    ]
    write_md(auto / OUT_MD, md_lines)

    print(json.dumps({"ok": out["ok"], "path": str(out_path), "summary": summary}, ensure_ascii=False))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
