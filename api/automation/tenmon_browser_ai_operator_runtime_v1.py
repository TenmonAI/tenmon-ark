#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1
Mac + Playwright で ChatGPT に固定質問を投げ、current-run で回答取得を証明する。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
PRE_CARD = "TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_BROWSER_AI_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1"

FIXED_QUESTION_JA = "TypeScriptでシングルトンを実装してください"


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


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_browser_ai_operator_runtime_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--question",
        default=os.environ.get("TENMON_BROWSER_AI_FIXED_QUESTION", FIXED_QUESTION_JA),
        help="検証用の固定質問（既定: TypeScript シングルトン）",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    evidence_dir = auto / "out" / "browser_ai_operator_runtime"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    bind_summary_path = auto / "tenmon_mac_operator_decision_bind_summary.json"
    pre = read_json(bind_summary_path)
    precondition_ok = bool(pre.get("mac_operator_decision_bind_pass") is True)
    if str(pre.get("card") or "") != PRE_CARD:
        precondition_ok = False

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "platform": sys.platform,
        "darwin": is_darwin(),
        "precondition_card": PRE_CARD,
        "precondition_ok": precondition_ok,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "fixed_question": str(args.question),
        "timeouts": {
            "page_load_ms": int(os.environ.get("TENMON_BROWSER_AI_PAGE_LOAD_MS", "45000")),
            "response_ms": int(os.environ.get("TENMON_BROWSER_AI_RESPONSE_MS", "120000")),
        },
        "provider_open_ok": False,
        "question_submit_ok": False,
        "response_detected": False,
        "answer_extract_ok": False,
        "browser_ai_operator_runtime_pass": False,
        "phases": {},
        "answer_excerpt": "",
        "evidence_dir": str(evidence_dir),
    }

    if not is_darwin():
        out["fail_reason"] = "mac_only_required"
        _write_outputs(auto, out)
        return 1

    if not precondition_ok:
        out["fail_reason"] = "precondition_not_met"
        _write_outputs(auto, out)
        return 1

    _automation = Path(__file__).resolve().parent
    if str(_automation) not in sys.path:
        sys.path.insert(0, str(_automation))

    from browser_ai_operator_v1 import ask_chatgpt

    t0 = time.time()
    r = ask_chatgpt(str(args.question), evidence_dir=evidence_dir)
    elapsed = round(time.time() - t0, 2)
    out["phases"]["ask_chatgpt"] = {
        "ok": r.ok,
        "error": r.error,
        "provider": r.provider,
        "elapsed_sec": elapsed,
        "screenshots": {
            "before": r.screenshot_before,
            "during": r.screenshot_during,
            "after": r.screenshot_after,
        },
        "operator_phases": r.phases,
    }

    # フラグ分解（read-only: 資格情報は触らない）
    out["provider_open_ok"] = bool(r.phases.get("goto", {}).get("ok")) and bool(r.phases.get("launch", {}).get("ok"))
    out["question_submit_ok"] = bool(r.phases.get("fill", {}).get("ok")) and bool(r.phases.get("submit", {}).get("ok"))
    out["response_detected"] = bool(r.phases.get("response", {}).get("ok"))

    out["answer_extract_ok"] = bool(r.ok and (r.answer_text or "").strip())
    out["answer_excerpt"] = (r.answer_text or "")[:2000]

    # アーティファクト: 回答テキスト保存
    answer_path = evidence_dir / f"answer_{int(time.time())}.txt"
    if r.answer_text:
        answer_path.write_text(r.answer_text, encoding="utf-8")
        out["answer_text_path"] = str(answer_path)
    else:
        out["answer_text_path"] = None

    # スクリーンショット必須
    shots_ok = all(
        p and Path(str(p)).is_file()
        for p in (r.screenshot_before, r.screenshot_during, r.screenshot_after)
        if p
    )
    out["current_run_screenshot_evidence_ok"] = shots_ok

    out["browser_ai_operator_runtime_pass"] = bool(
        out["provider_open_ok"]
        and out["question_submit_ok"]
        and out["response_detected"]
        and out["answer_extract_ok"]
        and shots_ok
    )

    if not out["browser_ai_operator_runtime_pass"] and not out.get("fail_reason"):
        out["fail_reason"] = r.error or "runtime_failed"

    _write_outputs(auto, out)
    return 0 if out["browser_ai_operator_runtime_pass"] else 1


def _write_outputs(auto: Path, out: dict[str, Any]) -> None:
    summary_path = auto / "tenmon_browser_ai_operator_runtime_summary.json"
    report_path = auto / "tenmon_browser_ai_operator_runtime_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- precondition_ok: `{out.get('precondition_ok')}`",
                f"- provider_open_ok: `{out.get('provider_open_ok')}`",
                f"- question_submit_ok: `{out.get('question_submit_ok')}`",
                f"- response_detected: `{out.get('response_detected')}`",
                f"- answer_extract_ok: `{out.get('answer_extract_ok')}`",
                f"- browser_ai_operator_runtime_pass: `{out.get('browser_ai_operator_runtime_pass')}`",
                f"- fail_reason: `{out.get('fail_reason', '')}`",
                "",
                "依存: macOS / Playwright / Chrome（`TENMON_BROWSER_AI_PLAYWRIGHT_CHANNEL` 空で Chromium バンドル）。",
                "",
            ]
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(main())
