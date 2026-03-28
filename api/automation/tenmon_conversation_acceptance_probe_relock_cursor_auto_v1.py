#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_CURSOR_AUTO_V1
surface / root kernel 後の manual + continuity 再観測（コード改変なし・記録のみ）。
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_conversation_acceptance_probe_relock_result_v1.json"
OUT_MD = "tenmon_conversation_acceptance_probe_relock_report_v1.md"

MANUAL_MESSAGES = [
    "言霊とは何か",
    "法華経とは何か",
    "今日は少し疲れています",
    "この件をどう整理すればいい？",
    "これはノアの方舟と重なるのでは",
    "稗田阿礼を深層解読して",
]

CONTINUITY_PAIRS: list[tuple[str, str, list[str]]] = [
    (
        "pair_lotus_waterfire",
        "thread-relock-lotus-",
        [
            "法華経の一仏乗を短く説明して",
            "その話を踏まえて、水火の往還として一段だけ深めて",
        ],
    ),
    (
        "pair_fatigue_nextstep",
        "thread-relock-fatigue-",
        [
            "今日は少し疲れています",
            "その流れを踏まえて、次の一手だけ出して",
        ],
    ),
]

# user-facing `response` テキストにあってはならない内部断片（表層）
LEAK_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("root_reasoning_colon", re.compile(r"root_reasoning\s*[:：]", re.I)),
    ("truth_structure_colon", re.compile(r"truth_structure\s*[:：]", re.I)),
    ("center_meta_colon", re.compile(r"(?:^|\n)\s*center\s*[:：]", re.I | re.M)),
    ("thoughtCoreSummary_token", re.compile(r"\bthoughtCoreSummary\b", re.I)),
    ("threadCore_token", re.compile(r"\bthreadCore\b", re.I)),
    ("routeReason_token", re.compile(r"\brouteReason\b", re.I)),
    ("truthLayerArbitrationV1_token", re.compile(r"\btruthLayerArbitrationV1\b")),
    ("truthLayerArbitrationKernelV1_token", re.compile(r"\btruthLayerArbitrationKernelV1\b")),
]

ONE_STEP_RE = re.compile(r"次の一手|次の一歩|いま詰める一点|一点に絞", re.U)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _post_chat(chat_url: str, message: str, thread_id: str, timeout: float = 90.0) -> tuple[int | None, str | None, str | None]:
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.getcode(), None, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = str(e)
        return e.code, str(e), raw
    except Exception as e:
        return None, str(e), None


def _discover_chat_url(base: str) -> str | None:
    b = base.rstrip("/")
    for path in ("/api/chat", "/chat"):
        url = b + path
        code, err, _ = _post_chat(url, "probe_ping", "probe-relock-discover", timeout=15.0)
        if code == 200:
            return url
    return None


def _get_audit(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8.0) as r:
            body = r.read().decode("utf-8", errors="replace")
        j = json.loads(body)
        return {"ok": bool(j.get("ok")), "http": r.getcode(), "sample": body[:400]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = (r.stdout + "\n" + r.stderr)[-2500:]
        return r.returncode == 0, tail
    except Exception as e:
        return False, str(e)


def _parse_response_text(raw: str) -> tuple[str | None, dict[str, Any] | None]:
    try:
        j = json.loads(raw)
    except Exception:
        return None, None
    if not isinstance(j, dict):
        return None, None
    resp = j.get("response")
    if isinstance(resp, str):
        return resp, j
    return None, j


def _scan_leaks(text: str) -> list[str]:
    hits: list[str] = []
    for name, pat in LEAK_PATTERNS:
        if pat.search(text):
            hits.append(name)
    return hits


def _manual_ok(response_text: str) -> tuple[bool, list[str], bool, int]:
    leaks = _scan_leaks(response_text)
    ok = len(response_text.strip()) >= 24 and len(leaks) == 0
    one_step = bool(ONE_STEP_RE.search(response_text))
    return ok, leaks, one_step, len(response_text)


def _carried_topic(pair_id: str, second_text: str) -> bool:
    t = second_text
    if pair_id == "pair_lotus_waterfire":
        return bool(
            re.search(r"一仏乗|法華|水火|往還|踏まえ|その話|莲花|蓮華", t, re.I | re.U),
        )
    if pair_id == "pair_fatigue_nextstep":
        return bool(
            re.search(r"疲|流れ|一手|次の|負荷|整え|息", t, re.U),
        )
    return False


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api_dir = repo / "api"
    auto = api_dir / "automation"
    base = os.environ.get("TENMON_AUDIT_BASE_URL", "http://127.0.0.1:3000").strip()

    build_ok, build_tail = _npm_check(api_dir)
    audit = _get_audit(base)
    chat_url = _discover_chat_url(base)

    manual_rows: list[dict[str, Any]] = []
    probe_ok_count = 0
    all_leaks: list[str] = []

    if chat_url:
        for i, msg in enumerate(MANUAL_MESSAGES):
            tid = f"relock-manual-{i}-{int(time.time())}"
            code, err, raw = _post_chat(chat_url, msg, tid)
            text_out = ""
            leaks: list[str] = []
            ok = False
            one_step = False
            length = 0
            if raw:
                rtext, _ = _parse_response_text(raw)
                if rtext is not None:
                    text_out = rtext
                    ok, leaks, one_step, length = _manual_ok(rtext)
                else:
                    leaks = _scan_leaks(raw[:12000])
                    ok = False
                    length = len(raw)
            if ok:
                probe_ok_count += 1
            all_leaks.extend([f"manual_{i}:{x}" for x in leaks])
            manual_rows.append(
                {
                    "id": f"manual_{i}",
                    "message": msg,
                    "threadId": tid,
                    "http_status": code,
                    "error": err,
                    "probe_ok": ok,
                    "response_length": length,
                    "has_ONE_STEP": one_step,
                    "internal_leaks": leaks,
                    "response_head": text_out[:220] if text_out else (raw[:220] if raw else ""),
                },
            )
            time.sleep(0.15)
    else:
        for i, msg in enumerate(MANUAL_MESSAGES):
            manual_rows.append(
                {
                    "id": f"manual_{i}",
                    "message": msg,
                    "probe_ok": False,
                    "error": "chat_url_unavailable",
                    "internal_leaks": [],
                },
            )

    continuity_rows: list[dict[str, Any]] = []
    continuity_bonus = 0

    if chat_url:
        for pair_id, tid_prefix, seq in CONTINUITY_PAIRS:
            tid = tid_prefix + str(int(time.time()))
            first_ok = False
            second_ok = False
            carried = False
            leaks1: list[str] = []
            leaks2: list[str] = []
            len1 = len2 = 0
            h2 = ""

            code1, e1, raw1 = _post_chat(chat_url, seq[0], tid)
            time.sleep(0.12)
            code2, e2, raw2 = _post_chat(chat_url, seq[1], tid)

            t2: str | None = None
            if raw1:
                t1, _ = _parse_response_text(raw1)
                if t1:
                    first_ok, leaks1, _os1, len1 = _manual_ok(t1)
                    all_leaks.extend([f"{pair_id}_1:{x}" for x in leaks1])
                else:
                    leaks1 = _scan_leaks(raw1[:12000])
                    all_leaks.extend([f"{pair_id}_1:{x}" for x in leaks1])
            if raw2:
                t2, _ = _parse_response_text(raw2)
                if t2:
                    second_ok, leaks2, _os2, len2 = _manual_ok(t2)
                    carried = _carried_topic(pair_id, t2)
                    h2 = t2[:240]
                    all_leaks.extend([f"{pair_id}_2:{x}" for x in leaks2])
                else:
                    second_ok = False
                    leaks2 = _scan_leaks(raw2[:12000])
                    all_leaks.extend([f"{pair_id}_2:{x}" for x in leaks2])

            if first_ok:
                continuity_bonus += 1
            if second_ok and len(leaks2) == 0:
                continuity_bonus += 2
            if carried:
                continuity_bonus += 2
            if t2 and ONE_STEP_RE.search(t2):
                continuity_bonus += 1

            continuity_rows.append(
                {
                    "pair_id": pair_id,
                    "threadId": tid,
                    "first": {"message": seq[0], "ok": first_ok, "leaks": leaks1, "length": len1, "http": code1, "error": e1},
                    "second": {
                        "message": seq[1],
                        "ok": second_ok,
                        "leaks": leaks2,
                        "length": len2,
                        "http": code2,
                        "error": e2,
                        "carried_topic": carried,
                        "has_ONE_STEP": bool(ONE_STEP_RE.search(t2)) if t2 else False,
                        "head": h2,
                    },
                },
            )
            time.sleep(0.12)
    else:
        for pair_id, tid_prefix, seq in CONTINUITY_PAIRS:
            continuity_rows.append(
                {
                    "pair_id": pair_id,
                    "skipped": True,
                    "error": "chat_url_unavailable",
                },
            )

    carried_true_n = sum(
        1
        for r in continuity_rows
        if isinstance(r.get("second"), dict) and r["second"].get("carried_topic") is True
    )

    failure_reasons: list[str] = []
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")
    if not audit.get("ok"):
        failure_reasons.append("audit_not_ready")
    if probe_ok_count < 6:
        failure_reasons.append(f"probe_ok_count={probe_ok_count}<6")
    if continuity_bonus < 6:
        failure_reasons.append(f"continuity_bonus={continuity_bonus}<6")
    if carried_true_n < 2:
        failure_reasons.append(f"carried_topic_true_count={carried_true_n}<2")
    if all_leaks:
        failure_reasons.append("internal_leak_in_response_text")

    acceptance_pass = (
        build_ok
        and audit.get("ok") is True
        and probe_ok_count >= 6
        and continuity_bonus >= 6
        and len(all_leaks) == 0
        and carried_true_n >= 2
    )

    result: dict[str, Any] = {
        "schema": "TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "base_url": base,
        "chat_url": chat_url,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail[-1500:],
        "audit": audit,
        "manual_probes": manual_rows,
        "continuity_probes": continuity_rows,
        "probe_ok_count": probe_ok_count,
        "continuity_bonus": continuity_bonus,
        "carried_topic_true_count": carried_true_n,
        "internal_leak_residual": sorted(set(all_leaks)),
        "failure_reasons": failure_reasons if not acceptance_pass else [],
        "observation_only": True,
        "acceptance_pass": acceptance_pass,
        "thresholds": {
            "probe_ok_count_min": 6,
            "continuity_bonus_min": 6,
            "carried_topic_min": 2,
        },
        "nextOnPass": "TENMON_DEEPREAD_EDUCATION_PARENT_RESUME_CURSOR_AUTO_V1",
        "nextOnFail": "TENMON_SURFACE_EXIT_LEAK_GUARD_RELOCK_RETRY_CURSOR_AUTO_V1",
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_REPORT_V1",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **acceptance_pass**: `{acceptance_pass}`",
        f"- **chat_url**: `{chat_url}`",
        "- **mode**: 観測専用（本スクリプトは記録のみ）",
        "",
    ]
    if not acceptance_pass and failure_reasons:
        md.extend(
            [
                "## 不合格理由（要約）",
                "",
                "\n".join(f"- `{x}`" for x in failure_reasons),
                "",
            ],
        )
    md.extend(
        [
            "## 集計",
            "",
            f"- **probe_ok_count**: {probe_ok_count} (min 6)",
            f"- **continuity_bonus**: {continuity_bonus} (min 6)",
            f"- **carried_topic (true のペア数)**: {carried_true_n} (min 2)",
            f"- **npm run check**: {'PASS' if build_ok else 'FAIL'}",
            f"- **audit ok**: `{audit.get('ok')}`",
            f"- **internal_leak_residual**: `{result['internal_leak_residual']}`",
            "",
            "## Manual 6 本",
            "",
        ],
    )
    for row in manual_rows:
        md.append(f"- `{row.get('id')}`: ok={row.get('probe_ok')} len={row.get('response_length', 0)} leaks={row.get('internal_leaks')}")
    md.extend(["", "## Continuity pairs", ""])
    for row in continuity_rows:
        if row.get("skipped"):
            md.append(f"- `{row.get('pair_id')}`: skipped")
        else:
            s2 = row.get("second") or {}
            md.append(
                f"- `{row.get('pair_id')}`: first_ok={row.get('first', {}).get('ok')} second_ok={s2.get('ok')} carried={s2.get('carried_topic')} ONE_STEP={s2.get('has_ONE_STEP')}",
            )
    md.extend(
        [
            "",
            "## 次カード",
            "",
            f"- **nextOnPass**: `{result['nextOnPass']}`",
            f"- **nextOnFail**: `{result['nextOnFail']}`",
            "",
        ],
    )
    (auto / OUT_MD).write_text("\n".join(md), encoding="utf-8")

    print(json.dumps({k: result[k] for k in ("acceptance_pass", "probe_ok_count", "continuity_bonus", "carried_topic_true_count", "chat_url")}, ensure_ascii=False, indent=2))
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
