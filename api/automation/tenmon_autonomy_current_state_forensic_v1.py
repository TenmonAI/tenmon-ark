#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_CURRENT_STATE_FORENSIC_AND_SINGLE_SOURCE_TRUTH_CURSOR_AUTO_V1

VPS 上の api/automation 実ファイルとローカル HTTP ゲートのみを読み、
自動構築・Mac/Cursor・会話品質・acceptance の現況を単一 JSON/MD に集約する。
product 改変なし・観測専用。
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_CURRENT_STATE_FORENSIC_AND_SINGLE_SOURCE_TRUTH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_current_state_forensic.json"
OUT_MD = "tenmon_autonomy_current_state_forensic.md"

STALE_HOURS = 48


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_iso(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _http_get(url: str, timeout: float = 12.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = int(getattr(r, "status", r.getcode()))
            body = r.read(8000)
    except urllib.error.HTTPError as e:
        return {"ok": False, "http_code": int(e.code), "url": url}
    except Exception as e:
        return {"ok": False, "http_code": None, "url": url, "error": str(e)[:200]}
    ok = 200 <= code < 300
    return {"ok": ok, "http_code": code, "url": url, "body_sample": body[:400].decode("utf-8", "replace")}


def _http_post_json(url: str, body: bytes, timeout: float = 12.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = int(getattr(r, "status", r.getcode()))
            _ = r.read(4000)
    except urllib.error.HTTPError as e:
        try:
            _ = e.read(2000)
        except Exception:
            pass
        return {"ok": False, "http_code": int(e.code), "url": url}
    except Exception as e:
        return {"ok": False, "http_code": None, "url": url, "error": str(e)[:200]}
    return {"ok": 200 <= code < 300, "http_code": code, "url": url}


def _file_stale(path: Path, max_age_hours: float) -> tuple[bool, float | None]:
    if not path.is_file():
        return True, None
    try:
        mtime = path.stat().st_mtime
        age_h = (_utc_now().timestamp() - mtime) / 3600.0
        return age_h > max_age_hours, age_h
    except OSError:
        return True, None


def _executor_routes_parity(api: Path) -> dict[str, Any]:
    src = api / "src" / "routes" / "adminFounderExecutorToken.ts"
    dist = api / "dist" / "routes" / "adminFounderExecutorToken.js"
    out: dict[str, Any] = {
        "src_path": str(src),
        "dist_path": str(dist),
        "src_exists": src.is_file(),
        "dist_exists": dist.is_file(),
        "paths_present": {},
        "dist_parity_ok": None,
    }
    needles = (
        "/admin/founder/executor-token",
        "executor-token/refresh",
        "executor-token/revoke",
    )
    ss = src.read_text(encoding="utf-8", errors="replace") if src.is_file() else ""
    dd = dist.read_text(encoding="utf-8", errors="replace") if dist.is_file() else ""
    for n in needles:
        out["paths_present"][n] = {"src": n in ss, "dist": n in dd}
    if src.is_file() and dist.is_file():
        out["dist_parity_ok"] = all(
            out["paths_present"][n]["src"] and out["paths_present"][n]["dist"] for n in needles
        )
    return out


def _pick_next_best_card(
    loop_j: dict[str, Any],
    cq: dict[str, Any],
    rej: dict[str, Any],
    sc: dict[str, Any],
) -> str | None:
    stale_cq = bool(cq.get("stale_sources_present"))
    o = loop_j.get("outputs") if isinstance(loop_j.get("outputs"), dict) else {}
    loop_next = o.get("next_best_card")
    if isinstance(loop_next, str) and loop_next.strip() and not stale_cq:
        return loop_next.strip()
    r1 = rej.get("recommended_next_card")
    if isinstance(r1, str) and r1.strip():
        return r1.strip()
    r2 = sc.get("recommended_next_card")
    if isinstance(r2, str) and r2.strip():
        return r2.strip()
    return None


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_FORENSIC_API_BASE", "http://127.0.0.1:3000").rstrip("/")

    health = _http_get(f"{base}/api/health")
    audit = _http_get(f"{base}/api/audit")
    audit_b = _http_get(f"{base}/api/audit.build")

    system_ready = bool(
        health.get("ok") and audit.get("ok") and audit_b.get("ok")
    )

    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    loop_path = auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"
    cq_sum = auto / "tenmon_conversation_quality_priority_summary.json"
    gen_cards = auto / "conversation_quality_generated_cards.json"
    rej_sum = auto / "tenmon_latest_state_rejudge_summary.json"
    rej_ver = auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
    scorecard = auto / "tenmon_worldclass_acceptance_scorecard.json"

    q = _read_json(queue_path)
    b = _read_json(bundle_path)
    loop_j = _read_json(loop_path)
    cq = _read_json(cq_sum)
    gc = _read_json(gen_cards)
    rej = _read_json(rej_sum)
    rej_v = _read_json(rej_ver)
    sc = _read_json(scorecard)

    items = q.get("items") if isinstance(q.get("items"), list) else []
    states: dict[str, int] = {}
    for it in items:
        if not isinstance(it, dict):
            continue
        st = str(it.get("state") or "unknown")
        states[st] = states.get(st, 0) + 1

    queue_summary = {
        "queue_file": str(queue_path),
        "updatedAt": q.get("updatedAt"),
        "item_count": len(items),
        "by_state": states,
    }

    nonfix = [x for x in items if isinstance(x, dict) and x.get("fixture") is False]
    nonfix_exec = [x for x in nonfix if str(x.get("state") or "") == "executed"]
    latest_nf: dict[str, Any] | None = None
    if nonfix_exec:
        def _sort_key(x: dict[str, Any]) -> str:
            return str(x.get("completed_at") or x.get("createdAt") or "")

        nonfix_exec.sort(key=_sort_key, reverse=True)
        latest_nf = nonfix_exec[0]

    entries = b.get("entries") if isinstance(b.get("entries"), list) else []
    qids = {str(x.get("id") or "") for x in items if isinstance(x, dict)}
    bundle_qids = {str(x.get("queue_id") or "") for x in entries if isinstance(x, dict)}
    result_return_ok = bool(qids & bundle_qids)

    latest_nf_ok: bool | None = None
    latest_nf_evidence: dict[str, Any] = {}
    if latest_nf:
        qid = str(latest_nf.get("id") or "")
        job_id = str(latest_nf.get("job_id") or "")
        matched = [e for e in entries if isinstance(e, dict) and str(e.get("queue_id") or "") == qid]
        matched.sort(key=lambda e: str(e.get("ingested_at") or ""), reverse=True)
        ent = matched[0] if matched else None
        latest_nf_evidence = {
            "queue_id": qid,
            "job_id": job_id,
            "cursor_card": latest_nf.get("cursor_card"),
            "bundle_match_count": len(matched),
            "latest_bundle_acceptance_ok": ent.get("acceptance_ok") if ent else None,
            "latest_bundle_build_rc": ent.get("build_rc") if ent else None,
            "latest_bundle_status": ent.get("status") if ent else None,
            "current_run_flag": ent.get("current_run") if ent else None,
        }
        if ent:
            ao = ent.get("acceptance_ok")
            br = ent.get("build_rc")
            if ao is True or br == 0:
                latest_nf_ok = True
            elif ao is False or (isinstance(br, int) and br != 0):
                latest_nf_ok = False
            else:
                latest_nf_ok = None
        else:
            latest_nf_ok = False

    current_run_entries = [e for e in entries if isinstance(e, dict) and e.get("current_run") is True]
    bundle_current_run_true = len(current_run_entries)

    routes = _executor_routes_parity(api)
    refresh_url = f"{base}/api/admin/founder/executor-token/refresh"
    refresh_probe = _http_post_json(refresh_url, b"{}")
    refresh_auth_ok = bool(
        routes.get("dist_parity_ok")
        and refresh_probe.get("http_code") in (400, 401)
    )

    loop_steps = loop_j.get("steps") if isinstance(loop_j.get("steps"), list) else []

    def _step_exit(name: str) -> int | None:
        for s in loop_steps:
            if isinstance(s, dict) and s.get("step") == name:
                v = s.get("exit_code")
                return int(v) if v is not None else None
        return None

    loop_ok = bool(loop_j.get("ok") is True)
    loop_gen = _parse_iso(loop_j.get("generated_at"))
    loop_age_ok = loop_gen is not None and (_utc_now() - loop_gen) < timedelta(hours=24)
    watch_loop_stable = bool(
        loop_ok
        and loop_age_ok
        and _step_exit("conversation_quality_analyzer_v1") == 0
        and _step_exit("conversation_quality_auto_card_generator_v1") == 0
        and _step_exit("tenmon_worldclass_acceptance_scorecard_v1") is not None
    )

    rejudge_bound = bool(rej.get("generated_at") or rej_v.get("generated_at"))

    worldclass_score = sc.get("score_percent")
    if worldclass_score is None:
        o = loop_j.get("outputs") if isinstance(loop_j.get("outputs"), dict) else {}
        worldclass_score = o.get("worldclass_score")

    stale_list: list[str] = []
    for name, path, gen_key in (
        ("conversation_quality", cq_sum, "generated_at"),
        ("priority_loop", loop_path, "generated_at"),
        ("scorecard", scorecard, "generated_at"),
        ("rejudge_summary", rej_sum, "generated_at"),
        ("rejudge_verdict", rej_ver, "generated_at"),
    ):
        p = path
        raw = _read_json(p) if p.is_file() else {}
        g = _parse_iso(raw.get(gen_key))
        stale_file, age_h = _file_stale(p, STALE_HOURS)
        if not p.is_file():
            stale_list.append(f"missing:{name}:{p.name}")
        elif stale_file:
            stale_list.append(f"old_file_mtime>{STALE_HOURS}h:{name}:{p.name}")
        elif g and (_utc_now() - g) > timedelta(hours=STALE_HOURS):
            stale_list.append(f"old_{gen_key}>{STALE_HOURS}h:{name}")

    if cq.get("stale_sources_present"):
        for x in cq.get("stale_sources") or []:
            stale_list.append(f"analyzer:{x}")

    cq_band = "unknown"
    if cq:
        if cq.get("stale_sources_present"):
            cq_band = "stale_or_unverified"
        else:
            counts = cq.get("counts") if isinstance(cq.get("counts"), dict) else {}
            hits = sum(int(v or 0) for v in counts.values())
            cq_band = "clear" if hits == 0 else "needs_dialogue_attention"

    blockers: list[str] = []
    o = loop_j.get("outputs") if isinstance(loop_j.get("outputs"), dict) else {}
    for x in o.get("current_blockers") or []:
        if isinstance(x, str) and x.strip():
            blockers.append(x.strip())
    for x in rej.get("remaining_blockers") or []:
        if isinstance(x, str) and x.strip() and x.strip() not in blockers:
            blockers.append(x.strip())
    for x in rej_v.get("remaining_blockers") or []:
        if isinstance(x, str) and x.strip() and x.strip() not in blockers:
            blockers.append(x.strip())
    blockers = blockers[:120]

    next_best = _pick_next_best_card(loop_j, cq, rej, sc)

    safe_cards: list[str] = []
    o2 = loop_j.get("outputs") if isinstance(loop_j.get("outputs"), dict) else {}
    for c in o2.get("safe_next_cards") or []:
        if isinstance(c, str) and c.strip():
            safe_cards.append(c.strip())
    if not safe_cards:
        for c in gc.get("candidates") or []:
            if isinstance(c, dict) and c.get("safe_auto_fix") is True:
                cid = str(c.get("card_id") or "").strip()
                if cid:
                    safe_cards.append(cid)

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "forensic_api_base": base,
        "system_ready": system_ready,
        "service_probe": {
            "health": health,
            "audit": audit,
            "audit_build": audit_b,
        },
        "queue_summary": queue_summary,
        "latest_nonfixture_roundtrip_ok": latest_nf_ok,
        "latest_nonfixture_evidence": latest_nf_evidence,
        "refresh_auth": {
            "routes_parity": routes,
            "refresh_route_probe": refresh_probe,
            "refresh_auth_ok": refresh_auth_ok,
        },
        "watch_loop_stable": watch_loop_stable,
        "result_return_ok": result_return_ok,
        "bundle_current_run_true_entries": bundle_current_run_true,
        "rejudge_bound": rejudge_bound,
        "worldclass_score": worldclass_score,
        "conversation_quality_band": cq_band,
        "current_blockers": blockers,
        "next_best_card": next_best,
        "safe_next_cards": safe_cards[:16],
        "stale_sources": sorted(set(stale_list)),
        "inputs": {
            "remote_cursor_queue": str(queue_path),
            "remote_cursor_result_bundle": str(bundle_path),
            "worldclass_dialogue_loop": str(loop_path),
            "conversation_quality_summary": str(cq_sum),
            "generated_cards": str(gen_cards),
            "tenmon_latest_state_rejudge_summary": str(rej_sum),
            "tenmon_latest_state_rejudge_verdict": str(rej_ver),
            "tenmon_worldclass_acceptance_scorecard": str(scorecard),
        },
        "notes": [
            "観測のみ。product core は変更しない。",
            "stale_sources に列挙された入力は single-source の信頼度が下がる。",
            "next_best_card は loop（非 stale）→ rejudge → scorecard の順で1本に絞る。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **system_ready**: `{system_ready}`",
        f"- **watch_loop_stable**: `{watch_loop_stable}`",
        f"- **result_return_ok**: `{result_return_ok}`",
        f"- **latest_nonfixture_roundtrip_ok**: `{latest_nf_ok}`",
        f"- **refresh_auth_ok**: `{refresh_auth_ok}`",
        f"- **rejudge_bound**: `{rejudge_bound}`",
        f"- **worldclass_score**: `{worldclass_score}`",
        f"- **conversation_quality_band**: `{cq_band}`",
        f"- **next_best_card**: `{next_best}`",
        "",
        "## stale_sources",
        "",
    ]
    for s in out["stale_sources"]:
        md.append(f"- {s}")
    md.extend(["", "## current_blockers (sample)", ""])
    for x in blockers[:35]:
        md.append(f"- {x}")
    md.extend(["", "## safe_next_cards", ""])
    for c in safe_cards[:16]:
        md.append(f"- `{c}`")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "path": str(auto / OUT_JSON), "system_ready": system_ready}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
