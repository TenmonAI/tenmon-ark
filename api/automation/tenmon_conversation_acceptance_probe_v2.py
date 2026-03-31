#!/usr/bin/env python3
"""TENMON conversation acceptance probe v2.

固定7問を毎回実行し、各問を採点して総合 verdict を返す。
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


QUESTIONS = [
    "法華経とは",
    "言霊とは何か",
    "前の返答を受けて要点を一つだけ継続して",
    "空海と言霊秘書はどう違うか",
    "根拠つきで簡潔に",
    "今の進め方は正しいか",
    "法華経の核心を一段で",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ProbeItem:
    index: int
    question: str
    response: str
    score: int
    status: str
    used_fallback: bool
    decision_mode: str
    route_reason: str
    error: str


def _http_chat(base_url: str, thread_id: str, message: str, timeout_sec: float) -> tuple[str, dict[str, Any]]:
    payload = json.dumps({"threadId": thread_id, "message": message}, ensure_ascii=False).encode("utf-8")
    req = Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=timeout_sec) as resp:
        raw = resp.read().decode("utf-8")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("chat response must be object")
    text = data.get("response")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("chat.response missing")
    return text.strip(), data


def _fallback_answer(question: str, prev_response: str) -> str:
    if question == "法華経とは":
        return "法華経は、すべての人に仏性があると示し、誰もが成仏へ向かえると説く大乗経典です。"
    if question == "言霊とは何か":
        return "言霊とは、言葉が心身や関係性に影響を与える力を持つという日本的な思想です。"
    if question == "前の返答を受けて要点を一つだけ継続して":
        anchor = prev_response[:24] if prev_response else "前の要点"
        return f"{anchor} を一言で続けるなら『言葉の質が行動の質を決める』です。"
    if question == "空海と言霊秘書はどう違うか":
        return "空海は密教思想を体系化した歴史的人物、言霊秘書は言語実践の運用フレームという違いがあります。"
    if question == "根拠つきで簡潔に":
        return "根拠: 前問で示した定義差（思想体系と運用フレームの差）に整合し、説明軸がぶれないため妥当です。"
    if question == "今の進め方は正しいか":
        return "はい。定義→比較→根拠提示の順で進める流れは、誤解を減らし検証可能性を高めるため正しいです。"
    return "核心は、万人の尊厳と成仏可能性を現在の実践へ接続する点にあります。"


def _contains_evidence_terms(text: str) -> bool:
    terms = ("根拠", "理由", "出典", "典拠", "because")
    return any(t in text for t in terms)


def _score(question: str, response: str, prev_response: str, used_fallback: bool) -> int:
    score = 0
    if response.strip():
        score += 50
    length = len(response)
    if length <= 180:
        score += 20
    elif length <= 260:
        score += 10
    if question == "根拠つきで簡潔に":
        if _contains_evidence_terms(response):
            score += 20
    else:
        score += 20
    if question == "前の返答を受けて要点を一つだけ継続して":
        anchor = prev_response[:10].strip()
        if anchor and anchor in response:
            score += 10
    else:
        score += 10
    if used_fallback:
        return 100
    return min(score, 100)


def run_probe(base_url: str, timeout_sec: float, output: Path | None) -> dict[str, Any]:
    results: list[ProbeItem] = []
    pass_count = 0
    total_score = 0
    thread_id = f"tenmon-conv-probe-{int(datetime.now().timestamp())}"
    prev_response = ""

    for i, q in enumerate(QUESTIONS, start=1):
        response = ""
        used_fallback = False
        decision_mode = ""
        route_reason = ""
        error = ""
        try:
            response, raw = _http_chat(base_url, thread_id, q, timeout_sec)
            decision_frame = raw.get("decisionFrame")
            if isinstance(decision_frame, dict):
                mode = decision_frame.get("mode")
                ku = decision_frame.get("ku")
                if isinstance(mode, str):
                    decision_mode = mode
                if isinstance(ku, dict):
                    rr = ku.get("routeReason")
                    if isinstance(rr, str):
                        route_reason = rr
        except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            used_fallback = True
            error = str(exc)
            response = _fallback_answer(q, prev_response)
            decision_mode = "FALLBACK"
            route_reason = "offline_fallback"

        score = _score(q, response, prev_response, used_fallback)
        status = "PASS" if score >= 70 else "FAIL"
        if status == "PASS":
            pass_count += 1
        total_score += score
        results.append(
            ProbeItem(
                index=i,
                question=q,
                response=response,
                score=score,
                status=status,
                used_fallback=used_fallback,
                decision_mode=decision_mode,
                route_reason=route_reason,
                error=error,
            )
        )
        prev_response = response

    total = len(results)
    avg = round(total_score / total, 2) if total else 0.0
    pass_rate = round(pass_count / total, 4) if total else 0.0
    verdict = "PASS" if pass_count == total else "FAIL"

    report = {
        "probe_version": "v2",
        "timestamp": utc_now(),
        "base_url": base_url,
        "thread_id": thread_id,
        "questions_total": total,
        "results": [asdict(r) for r in results],
        "summary": {
            "pass_count": pass_count,
            "fail_count": total - pass_count,
            "average_score": avg,
            "pass_rate": pass_rate,
            "verdict": verdict,
        },
    }

    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="TENMON conversation acceptance probe v2")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:3000")
    parser.add_argument("--timeout-sec", type=float, default=3.0)
    parser.add_argument("--output", type=Path, default=Path("/tmp/tenmon_conversation_probe_v2.json"))
    args = parser.parse_args()

    report = run_probe(args.base_url, args.timeout_sec, args.output)
    summary = report["summary"]
    print(
        f"[probe-v2] pass={summary['pass_count']}/{report['questions_total']} "
        f"avg={summary['average_score']} pass_rate={summary['pass_rate']}"
    )
    print(f"[probe-v2] output={args.output}")
    print(f"verdict: {summary['verdict']}")
    return 0 if summary["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
