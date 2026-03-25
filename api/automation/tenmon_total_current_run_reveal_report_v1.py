#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TOTAL_SYSTEM_CURRENT_RUN_REVEAL_AND_COMPLETION_MAP_CURSOR_AUTO_V1

観測専用: current-run evidence を集約して JSON/MD を生成する。
"""
from __future__ import annotations

import json
import os
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_TOTAL_SYSTEM_CURRENT_RUN_REVEAL_AND_COMPLETION_MAP_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_total_current_run_reveal_report.json"
OUT_MD = "TENMON_TOTAL_CURRENT_RUN_REVEAL_REPORT_V1.md"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso() -> str:
    return _utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ts_dir() -> str:
    return _utc_now().strftime("%Y%m%dT%H%M%SZ")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _http_get_json(url: str, timeout: int = 25) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = {"raw": raw[:4000]}
            return {"ok": 200 <= r.status < 300, "http_status": r.status, "url": url, "body": body}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw[:4000]}
        return {"ok": False, "http_status": e.code, "url": url, "body": body}
    except Exception as e:
        return {"ok": False, "http_status": None, "url": url, "error": str(e)[:300]}


def _http_post_json(url: str, payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = {"raw": raw[:4000]}
            return {"ok": 200 <= r.status < 300, "http_status": r.status, "url": url, "body": body}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw[:4000]}
        return {"ok": False, "http_status": e.code, "url": url, "body": body}
    except Exception as e:
        return {"ok": False, "http_status": None, "url": url, "error": str(e)[:300]}


def _service_status() -> dict[str, Any]:
    try:
        r = subprocess.run(
            ["systemctl", "is-active", "tenmon-ark-api"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return {
            "ok": r.returncode == 0,
            "is_active": (r.stdout or "").strip(),
            "stderr": (r.stderr or "").strip(),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _chat_probe(base: str, msg: str, thread: str) -> dict[str, Any]:
    res = _http_post_json(
        f"{base}/api/chat",
        {"threadId": thread, "message": msg},
        timeout=60,
    )
    body = res.get("body") if isinstance(res.get("body"), dict) else {}
    rr = ((body.get("decisionFrame") or {}).get("ku") or {}).get("routeReason")
    text = str(body.get("response") or "")
    core = text.replace("【天聞の所見】", "").strip()
    return {
        "message": msg,
        "http_status": res.get("http_status"),
        "ok": res.get("ok"),
        "routeReason": rr,
        "response_len": len(core),
        "response_head": text[:200],
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    docs = api / "docs" / "constitution"
    auto.mkdir(parents=True, exist_ok=True)
    docs.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_REVEAL_API_BASE", "http://127.0.0.1:3000").rstrip("/")
    ts = _ts_dir()
    ev_dir = Path("/var/log/tenmon/card_TENMON_TOTAL_SYSTEM_CURRENT_RUN_REVEAL_AND_COMPLETION_MAP_CURSOR_AUTO_V1") / ts
    ev_dir.mkdir(parents=True, exist_ok=True)

    # completion
    health = _http_get_json(f"{base}/api/health")
    audit = _http_get_json(f"{base}/api/audit")
    audit_build = _http_get_json(f"{base}/api/audit.build")
    svc = _service_status()

    # conversation probes (representative routeReason set)
    probe_msgs = [
        "言霊とは何か",
        "前の話を続けたい",
        "TypeScriptでrate limitを実装するには",
        "今日は何曜日？",
        "法華経とは",
        "カタカムナとは",
        "現代人のよくない点を教えて",
        "空海の即身成仏とは",
        "君の思考を聞きたい",
        "今日の大分の天気は？",
        "さっきの事実は誤りだよ",
    ]
    chat_rows: list[dict[str, Any]] = []
    for i, m in enumerate(probe_msgs):
        chat_rows.append(_chat_probe(base, m, f"reveal-{ts}-{i}"))

    # queue / cursor loop artifacts
    queue = _read_json(auto / "remote_cursor_queue.json")
    bundle = _read_json(auto / "remote_cursor_result_bundle.json")
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    world = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json")
    single = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    convergence = _read_json(auto / "state_convergence_next_cards.json")
    generated = _read_json(auto / "conversation_quality_generated_cards.json")
    autocompact = _read_json(auto / "tenmon_cursor_worktree_autocompact_summary.json")
    rejudge = _read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    rejudge_v = _read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    score = _read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    # founder auth route behavior (without token / without session)
    founder_refresh_probe = _http_post_json(f"{base}/api/admin/founder/executor-token/refresh", {})
    founder_issue_probe = _http_post_json(f"{base}/api/admin/founder/executor-token", {})
    founder_revoke_probe = _http_post_json(f"{base}/api/admin/founder/executor-token/revoke", {})

    # build JSON report
    next_cards = []
    for c in (
        str(forensic.get("next_best_card") or "").strip(),
        str((world.get("outputs") or {}).get("next_best_card") or "").strip(),
        str(single.get("next_card") or "").strip(),
    ):
        if c and c not in next_cards:
            next_cards.append(c)
    if isinstance(convergence.get("next_cards"), list):
        for c in convergence["next_cards"]:
            cs = str(c).strip()
            if cs and cs not in next_cards:
                next_cards.append(cs)
    if isinstance(generated.get("candidates"), list):
        for c in generated["candidates"]:
            if isinstance(c, dict) and c.get("safe_auto_fix") is True:
                cs = str(c.get("card_id") or "").strip()
                if cs and cs not in next_cards:
                    next_cards.append(cs)

    identity = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "repo_root": str(repo),
        "api_base": base,
        "evidence_dir": str(ev_dir),
    }
    completion = {
        "health": health,
        "audit": audit,
        "audit_build": audit_build,
        "service_status": svc,
        "build_mark": ((audit_build.get("body") or {}).get("build") or {}).get("mark"),
        "readiness_stage": ((health.get("body") or {}).get("readiness") or {}).get("stage"),
        "gitSha": (health.get("body") or {}).get("gitSha"),
        "db_readiness": ((health.get("body") or {}).get("readiness") or {}).get("dbReady"),
    }
    conversation = {
        "chat_probe_rows": chat_rows,
        "quality_summary": _read_json(auto / "tenmon_conversation_quality_priority_summary.json"),
    }
    cursor_loop = {
        "remote_cursor_queue": queue,
        "remote_cursor_result_bundle": bundle,
        "single_flight_queue_state": single,
        "autocompact_summary": autocompact,
    }
    founder_auth = {
        "refresh_probe_no_token": founder_refresh_probe,
        "issue_probe_no_session": founder_issue_probe,
        "revoke_probe_no_session": founder_revoke_probe,
        "forensic_refresh_auth": forensic.get("refresh_auth"),
    }
    mac_executor = {
        "artifact_paths_from_bundle": [
            {
                "session_id": e.get("session_id"),
                "manifest": e.get("cursor_job_session_manifest"),
                "state": e.get("mac_executor_state"),
                "dangerous_report": e.get("dangerous_patch_block_report"),
                "log_path": e.get("log_path"),
                "status": e.get("status"),
                "current_run": e.get("current_run"),
            }
            for e in (bundle.get("entries") or [])[:20]
            if isinstance(e, dict)
        ],
        "note": "Mac ホスト実体はこの VPS から直接検査せず、bundle 経由で current-run 証跡を観測。",
    }
    overnight_autonomy = {
        "worldclass_priority_loop": world,
        "rejudge_summary": rejudge,
        "rejudge_verdict": rejudge_v,
        "worldclass_scorecard": score,
        "forensic": forensic,
    }
    browser_external_ai = {
        "current_run_evidence": [],
        "assessment": "この VPS 観測では browser 操作の直接実行ログは限定的。queue/result と constitution 定義から連携設計は確認、常時運転の current-run 証拠は不足。",
    }

    unfinished_map = {
        "done": [
            "health/audit/audit.build の current-run probe",
            "queue/next/result/bundle の 1往復証跡（non-fixture executed 履歴あり）",
            "founder refresh route の実装到達（400/401 系の保護挙動）",
        ],
        "half_done": [
            "watch loop 常駐運用（forensic は stable=true だが blocker 残存）",
            "single-flight queue / autocompact / enqueue gate（manual gate が必要なカードで停止）",
        ],
        "design_only_or_not_observed": [
            "browser external AI 常時運転の lived current-run 証拠",
            "Cursor 完全無人 accept（環境依存で manual_review_required 分岐）",
        ],
        "broken_or_blocked_now": list(forensic.get("current_blockers") or [])[:60],
        "stale_or_low_confidence": list(forensic.get("stale_sources") or []),
        "high_risk_defer": [
            "chat.ts / finalize.ts / web/src/** の中核改変",
        ],
    }

    out = {
        "identity": identity,
        "completion": completion,
        "conversation": conversation,
        "cursor_loop": cursor_loop,
        "founder_auth": founder_auth,
        "mac_executor": mac_executor,
        "overnight_autonomy": overnight_autonomy,
        "browser_external_ai": browser_external_ai,
        "unfinished_map": unfinished_map,
        "high_risk_do_not_touch": [
            "api/src/routes/chat.ts",
            "api/src/routes/chat_refactor/finalize.ts",
            "web/src/**",
            "kokuzo_pages.text",
        ],
        "recommended_next_cards": next_cards[:3],
    }

    # write outputs
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{identity['generated_at']}`",
        f"- api_base: `{base}`",
        f"- evidence_dir: `{ev_dir}`",
        "",
        "## Completion",
        "",
        f"- health: `{health.get('http_status')}` / ok=`{health.get('ok')}`",
        f"- audit: `{audit.get('http_status')}` / ok=`{audit.get('ok')}`",
        f"- audit.build: `{audit_build.get('http_status')}` / ok=`{audit_build.get('ok')}`",
        f"- readiness.stage: `{completion['readiness_stage']}`",
        f"- gitSha: `{completion['gitSha']}`",
        f"- service active: `{(svc or {}).get('is_active')}`",
        "",
        "## Conversation (routeReason probes)",
        "",
    ]
    for r in chat_rows:
        md_lines.append(f"- `{r['message']}` -> `{r.get('routeReason')}` len={r.get('response_len')}")
    md_lines.extend(["", "## Cursor Loop", ""])
    q_items = queue.get("items") if isinstance(queue.get("items"), list) else []
    md_lines.append(f"- queue items: `{len(q_items)}`")
    b_entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    md_lines.append(f"- bundle entries: `{len(b_entries)}`")
    md_lines.append(f"- forensic watch_loop_stable: `{forensic.get('watch_loop_stable')}`")
    md_lines.extend(["", "## Unfinished Map", ""])
    for x in unfinished_map["half_done"]:
        md_lines.append(f"- half_done: {x}")
    for x in unfinished_map["design_only_or_not_observed"]:
        md_lines.append(f"- not_observed: {x}")
    md_lines.extend(["", "## Recommended Next Cards (top 3)", ""])
    for c in next_cards[:3]:
        md_lines.append(f"- `{c}`")
    (docs / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    # evidence artifacts
    (ev_dir / "health.json").write_text(json.dumps(health, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ev_dir / "audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ev_dir / "audit_build.json").write_text(json.dumps(audit_build, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ev_dir / "chat_probe_rows.json").write_text(json.dumps(chat_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ev_dir / "founder_auth_probes.json").write_text(
        json.dumps(
            {
                "refresh_probe_no_token": founder_refresh_probe,
                "issue_probe_no_session": founder_issue_probe,
                "revoke_probe_no_session": founder_revoke_probe,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps({"ok": True, "json": str(auto / OUT_JSON), "md": str(docs / OUT_MD), "evidence_dir": str(ev_dir)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

