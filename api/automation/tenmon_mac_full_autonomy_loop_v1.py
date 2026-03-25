#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1
Mac: queue poll → Browser AI 質問 → Cursor 安全適用 → build → VPS へ結果返送の最小閉路（1 job）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_RETRY_CURSOR_AUTO_V1"

STATE_NAME = "tenmon_mac_full_autonomy_state_v1.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def is_darwin() -> bool:
    return sys.platform == "darwin"


def http_json(
    url: str,
    method: str,
    headers: dict[str, str],
    body: bytes | None,
    timeout: int = 180,
) -> tuple[int, dict[str, Any] | None, str]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            try:
                j = json.loads(raw) if raw.strip() else None
            except json.JSONDecodeError:
                return int(res.status), None, raw
            return int(res.status), j if isinstance(j, dict) else None, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            j = json.loads(raw) if raw.strip() else None
        except json.JSONDecodeError:
            return int(e.code), None, raw
        return int(e.code), j if isinstance(j, dict) else None, raw


def choose_provider(card_name: str, card_body: str) -> tuple[str, str]:
    """objective に応じたプロバイダ名（現状は ChatGPT のみ実装）。"""
    t = f"{card_name}\n{card_body}".lower()
    if "gemini" in t or "ジェミニ" in t:
        return "gemini", "keyword_gemini"
    if "claude" in t or "クロード" in t:
        return "claude", "keyword_claude"
    return "chatgpt", "default_chatgpt"


def queue_item_id(raw: dict[str, Any]) -> str:
    return str(raw.get("id") or raw.get("job_id") or "").strip()


def find_queue_item(queue_payload: dict[str, Any], qid: str) -> dict[str, Any] | None:
    for it in queue_payload.get("items") or []:
        if not isinstance(it, dict):
            continue
        if queue_item_id(it) == qid:
            return it
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_full_autonomy_loop_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    out_dir = auto / "out" / "mac_full_autonomy_loop_runtime"
    out_dir.mkdir(parents=True, exist_ok=True)
    state_path = auto / STATE_NAME

    api_base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")
    founder_key = (os.environ.get("FOUNDER_KEY") or "CHANGE_ME_FOUNDER_KEY").strip()
    hdr = {
        "Content-Type": "application/json",
        "X-Founder-Key": founder_key,
    }

    pre_path = auto / "tenmon_cursor_operator_runtime_summary.json"
    pre = read_json(pre_path)
    precondition_ok = bool(pre.get("cursor_operator_runtime_pass") is True)
    if str(pre.get("card") or "") != PRE_CARD:
        precondition_ok = False

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "platform": sys.platform,
        "darwin": is_darwin(),
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "api_base": api_base,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "job_polled": False,
        "queue_id": "",
        "fixture_skipped": False,
        "provider_chosen": False,
        "provider": "",
        "provider_reason": "",
        "ai_answer_received": False,
        "cursor_apply_ok": False,
        "build_verify_ok": False,
        "result_return_ok": False,
        "job_id_match_ok": False,
        "mac_full_autonomy_loop_runtime_pass": False,
        "phases": {},
        "fail_reason": "",
    }

    def save_summary() -> None:
        write_json(auto / "tenmon_mac_full_autonomy_loop_runtime_summary.json", summary)
        (auto / "tenmon_mac_full_autonomy_loop_runtime_report.md").write_text(
            "\n".join(
                [
                    f"# {CARD}",
                    "",
                    f"- job_polled: `{summary.get('job_polled')}`",
                    f"- provider_chosen: `{summary.get('provider_chosen')}`",
                    f"- ai_answer_received: `{summary.get('ai_answer_received')}`",
                    f"- cursor_apply_ok: `{summary.get('cursor_apply_ok')}`",
                    f"- build_verify_ok: `{summary.get('build_verify_ok')}`",
                    f"- result_return_ok: `{summary.get('result_return_ok')}`",
                    f"- mac_full_autonomy_loop_runtime_pass: `{summary.get('mac_full_autonomy_loop_runtime_pass')}`",
                    f"- fail_reason: `{summary.get('fail_reason', '')}`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

    state = read_json(state_path, {"version": 1, "card": CARD})
    state["last_run_at"] = utc()
    state["last_run_job_id"] = ""

    if not is_darwin():
        summary["fail_reason"] = "mac_only_required"
        save_summary()
        write_json(state_path, state)
        return 1

    if not precondition_ok:
        summary["fail_reason"] = "precondition_not_met"
        save_summary()
        write_json(state_path, state)
        return 1

    _automation = Path(__file__).resolve().parent
    if str(_automation) not in sys.path:
        sys.path.insert(0, str(_automation))

    from browser_ai_operator_v1 import ask_chatgpt
    from cursor_operator_v1 import default_sandbox_path, run_cursor_operator_proof

    job_id = ""
    released = False

    def release_job(qid: str) -> None:
        nonlocal released
        if not qid or released:
            return
        body = json.dumps({"id": qid}, ensure_ascii=False).encode("utf-8")
        st, _, _ = http_json(f"{api_base}/api/admin/cursor/release", "POST", hdr, body, timeout=60)
        released = st == 200
        summary["phases"]["release"] = {"http": st, "queue_id": qid}

    # Phase A: poll one ready job
    st, jn, _ = http_json(f"{api_base}/api/admin/cursor/next", "GET", hdr, None, timeout=60)
    summary["phases"]["poll_next"] = {"http": st, "ok": st == 200}
    if st != 200 or not jn or not jn.get("ok"):
        summary["fail_reason"] = "poll_next_failed"
        save_summary()
        write_json(state_path, state)
        return 1

    item = jn.get("item")
    if item is None:
        summary["fail_reason"] = "no_ready_job"
        save_summary()
        write_json(state_path, state)
        return 1

    job_id = str(item.get("id") or "").strip()
    if not job_id:
        summary["fail_reason"] = "missing_queue_id"
        save_summary()
        write_json(state_path, state)
        return 1

    summary["job_polled"] = True
    summary["queue_id"] = job_id
    state["last_run_job_id"] = job_id

    # fixture 禁止: queue 一覧で確認
    stq, jq, _ = http_json(f"{api_base}/api/admin/cursor/queue", "GET", hdr, None, timeout=60)
    if stq == 200 and jq and jq.get("items"):
        raw_it = find_queue_item(jq, job_id)
        if raw_it and raw_it.get("fixture") is True:
            summary["fixture_skipped"] = True
            summary["fail_reason"] = "fixture_job_forbidden"
            release_job(job_id)
            save_summary()
            write_json(state_path, state)
            return 1

    card_name = str(item.get("card_name") or "TENMON_REMOTE_CARD")
    card_body = str(item.get("card_body_md") or item.get("objective") or "")
    body_excerpt = card_body.strip()[:1200]

    # Phase B: provider
    prov, prov_reason = choose_provider(card_name, card_body)
    summary["provider_chosen"] = True
    summary["provider"] = prov
    summary["provider_reason"] = prov_reason

    if prov != "chatgpt":
        summary["fail_reason"] = "provider_not_implemented_yet"
        release_job(job_id)
        save_summary()
        write_json(state_path, state)
        return 1

    # Phase C: browser AI（current-run job_id を質問に含める）
    ai_q = (
        f"[current_run_job_id={job_id}]\n"
        f"カード: {card_name}\n"
        f"以下の目的に対し、安全な自動化のための要約を3行以内で返してください（コードブロック不要）。\n\n"
        f"{body_excerpt}"
    )
    ev_ai = out_dir / "browser_ai_evidence"
    ar = ask_chatgpt(ai_q, evidence_dir=ev_ai)
    summary["phases"]["browser_ai"] = {"ok": ar.ok, "error": ar.error, "chars": len(ar.answer_text or "")}
    if not ar.ok or not (ar.answer_text or "").strip():
        summary["fail_reason"] = ar.error or "ai_answer_missing"
        release_job(job_id)
        save_summary()
        write_json(state_path, state)
        return 1
    summary["ai_answer_received"] = True

    (out_dir / f"ai_answer_{job_id}.txt").write_text(ar.answer_text, encoding="utf-8")

    # Phase D: Cursor 安全適用（指示に queue_id を埋め込み）
    instr = (
        f"[TENMON_MAC_FULL_AUTONOMY_LOOP current_run_job_id={job_id}]\n"
        f"SANDBOX_STATE を idle→patched に1行のみ。chat.ts 禁止。AI要約参考:\n"
        f"{(ar.answer_text or '')[:800]}"
    )
    cr = run_cursor_operator_proof(repo, instruction=instr)
    summary["phases"]["cursor_operator"] = {
        "cursor_open_ok": cr.cursor_open_ok,
        "instruction_injected": cr.instruction_injected,
        "explicit_patch": cr.phases.get("explicit_patch"),
        "npm_build": cr.phases.get("npm_build"),
    }
    cursor_mid_ok = bool(
        cr.cursor_open_ok
        and cr.instruction_injected
        and cr.phases.get("explicit_patch", {}).get("ok")
    )
    summary["cursor_apply_ok"] = cursor_mid_ok
    summary["build_verify_ok"] = bool(cr.build_verify_ok)

    if not cursor_mid_ok:
        summary["fail_reason"] = cr.error or "cursor_apply_failed"
        release_job(job_id)
        save_summary()
        write_json(state_path, state)
        return 1

    if not cr.build_verify_ok:
        summary["fail_reason"] = "build_failed"
        release_job(job_id)
        save_summary()
        write_json(state_path, state)
        return 1

    # job_id 一致（ログに必ず含める）
    touched = default_sandbox_path(repo).relative_to(repo).as_posix()
    log_snippet = (
        f"current_run_job_id={job_id}\nqueue_id={job_id}\n"
        f"card={card_name}\nbuild_rc={cr.build_rc}\n"
        f"ai_excerpt={(ar.answer_text or '')[:400]}\n"
    )
    summary["job_id_match_ok"] = job_id in log_snippet and job_id in instr

    payload = {
        "queue_id": job_id,
        "id": job_id,
        "touched_files": [touched],
        "build_rc": int(cr.build_rc if cr.build_rc is not None else 0),
        "acceptance_ok": True,
        "log_snippet": log_snippet[:8000],
        "dry_run": False,
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    st_r, jr, raw_r = http_json(f"{api_base}/api/admin/cursor/result", "POST", hdr, body, timeout=120)
    summary["phases"]["result_post"] = {"http": st_r, "ok": jr.get("ok") if jr else None}
    summary["result_return_ok"] = st_r == 200 and bool(jr and jr.get("ok"))

    if not summary["result_return_ok"]:
        summary["fail_reason"] = "result_post_failed"
        release_job(job_id)
        save_summary()
        write_json(state_path, state)
        return 1

    summary["mac_full_autonomy_loop_runtime_pass"] = bool(
        summary["job_polled"]
        and summary["provider_chosen"]
        and summary["ai_answer_received"]
        and summary["cursor_apply_ok"]
        and summary["build_verify_ok"]
        and summary["result_return_ok"]
        and summary["job_id_match_ok"]
    )

    if summary["mac_full_autonomy_loop_runtime_pass"]:
        state["last_success_job_id"] = job_id
        state["last_success_at"] = utc()

    save_summary()
    write_json(state_path, state)
    return 0 if summary["mac_full_autonomy_loop_runtime_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
