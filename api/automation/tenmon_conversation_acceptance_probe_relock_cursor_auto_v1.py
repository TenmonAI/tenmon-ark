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
from typing import Any, Iterable

CARD = "TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_conversation_acceptance_probe_relock_result_v1.json"
OUT_MD = "tenmon_conversation_acceptance_probe_relock_report_v1.md"

# (probe_id, message, category) — TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK 拡張セット
UX_PROBES: list[tuple[str, str, str]] = [
    ("general_tired", "今日は少し疲れています", "general"),
    ("general_organize", "この件をどう整理すればいい？", "general"),
    ("support_bug", "天聞アークのチャット画面の挙動がおかしい。バグのように見えます", "support"),
    ("support_billing", "課金表示がおかしい。請求とプランの状態を確認したい", "support"),
    ("support_register", "会員登録の確認メールが届きません。迷惑フォルダも見ました", "support"),
    ("support_pwa", "PWA をホーム画面に追加できません。手順を教えてください", "support"),
    ("define_kotodama", "言霊とは何か", "define"),
    ("define_hokekyo", "法華経とは何か", "define"),
    ("symbolic_noah", "これはノアの方舟と重なるのでは", "symbolic"),
    ("founder_update", "Founder向け：現状報告と更新指示を一文ずつまとめて", "founder"),
    ("founder_change", "founder_change この読みを runtime に反映して", "founder"),
    ("founder_card", "構築班向け：裁定カードを追加し Cursor カードを書き出して", "founder"),
    (
        "uncertainty_sparse",
        "稗田阿礼の実在と年代は、現存史料だけで一義に確定できますか",
        "uncertainty",
    ),
    (
        "uncertainty_claim",
        "カタカムナは日本古代史の確定史実としてどう記述すべきですか",
        "uncertainty",
    ),
    (
        "longform_1",
        "天聞アークの会話設計の要点を800字程度で説明してください",
        "longform",
    ),
    (
        "longform_2",
        "思考回路・言霊・オメガの関係を600字程度で丁寧に説明してください",
        "longform",
    ),
    (
        "book_reading_1",
        "『古事記』を読み進めたいのですが、どこから手を付ければよいですか",
        "book",
    ),
    (
        "book_reading_2",
        "読書の要点を天聞に残しながら進めたいです。最初の一歩は何ですか",
        "book",
    ),
    (
        "book_reuse",
        "前に読んでいた本の続きから、もう一度同じスレで再開したいです",
        "book",
    ),
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
    ("verdict_colon", re.compile(r"(?:^|\n)\s*verdict\s*[:：]", re.I | re.M)),
    ("次軸_meta", re.compile(r"次軸\s*[:：]", re.U)),
    ("次観測_meta", re.compile(r"次観測\s*[:：]", re.U)),
    ("中心命題_meta", re.compile(r"中心命題\s*[:：]", re.U)),
    ("thoughtCoreSummary_token", re.compile(r"\bthoughtCoreSummary\b", re.I)),
    ("threadCore_token", re.compile(r"\bthreadCore\b", re.I)),
    ("routeReason_token", re.compile(r"\brouteReason\b", re.I)),
    ("truthLayerArbitrationV1_token", re.compile(r"\btruthLayerArbitrationV1\b")),
    ("truthLayerArbitrationKernelV1_token", re.compile(r"\btruthLayerArbitrationKernelV1\b")),
]

# 不確実性表層（confidenceDisplay / 手動整形のいずれか）
UNCERTAINTY_SURFACE_RE = re.compile(
    r"根拠が限られ|現時点の根拠|可能性として述べ|いまの読みの範囲で述べ|未確定|断定は避け|史実としての断定は避け|"
    r"史料上断定|一義に確定しづらい|慎重に|推測に留め",
    re.U,
)

# gates_impl founder 枠（旧【受理】系＋現行「受け取りました／更新候補／ドラフト」）
FOUNDER_SURFACE_RE = re.compile(
    r"【受理】|【現状】|【更新・反映内容】|【次確認】|【承認確認】|構築・運用|反映・更新のたたき台|"
    r"受け取りました|更新候補|ドラフトとして|確定してよい|構築者向け|Founder向け",
    re.U,
)

ONE_STEP_SUBSET_IDS = frozenset(
    {
        "general_tired",
        "general_organize",
        "define_kotodama",
        "define_hokekyo",
        "symbolic_noah",
        "support_bug",
        "support_billing",
        "support_register",
        "support_pwa",
        "founder_update",
        "founder_change",
        "founder_card",
        "uncertainty_sparse",
        "uncertainty_claim",
    },
)

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


def _billing_link_not_404(base: str) -> dict[str, Any]:
    """POST /api/billing/link は 401/403/200 等でよい。404 のみ不可。"""
    url = base.rstrip("/") + "/api/billing/link"
    body = json.dumps({"sessionId": "acceptance_probe_placeholder"}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8.0) as r:
            return {"reachable": True, "http": r.getcode(), "not_404": True}
    except urllib.error.HTTPError as e:
        return {"reachable": True, "http": e.code, "not_404": e.code != 404}
    except Exception as e:
        return {"reachable": False, "http": None, "not_404": False, "error": str(e)}


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


def _mean(xs: Iterable[float]) -> float:
    a = [float(x) for x in xs]
    return sum(a) / len(a) if a else 0.0


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
    billing_link = _billing_link_not_404(base)
    chat_url = _discover_chat_url(base)

    manual_rows: list[dict[str, Any]] = []
    probe_ok_count = 0
    all_leaks: list[str] = []

    if chat_url:
        for probe_id, msg, category in UX_PROBES:
            tid = f"relock-{probe_id}-{int(time.time())}"
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
            all_leaks.extend([f"{probe_id}:{x}" for x in leaks])
            excerpt = (text_out or "")[:1600]
            manual_rows.append(
                {
                    "id": probe_id,
                    "category": category,
                    "message": msg,
                    "threadId": tid,
                    "http_status": code,
                    "error": err,
                    "probe_ok": ok,
                    "response_length": length,
                    "has_ONE_STEP": one_step,
                    "internal_leaks": leaks,
                    "has_uncertainty_surface": bool(UNCERTAINTY_SURFACE_RE.search(excerpt)),
                    "has_founder_frame_markers": bool(FOUNDER_SURFACE_RE.search(excerpt)),
                    "response_head": text_out[:220] if text_out else (raw[:220] if raw else ""),
                    "response_excerpt": excerpt[:1200] if excerpt else "",
                },
            )
            time.sleep(0.15)
    else:
        for probe_id, msg, category in UX_PROBES:
            manual_rows.append(
                {
                    "id": probe_id,
                    "category": category,
                    "message": msg,
                    "probe_ok": False,
                    "error": "chat_url_unavailable",
                    "internal_leaks": [],
                    "has_uncertainty_surface": False,
                    "has_founder_frame_markers": False,
                    "has_ONE_STEP": False,
                    "response_length": 0,
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

    n_ux = len(UX_PROBES)
    leak_probe_count = sum(1 for r in manual_rows if r.get("internal_leaks"))

    def _no_leak_len(r: dict[str, Any], m: int = 24) -> bool:
        return len(r.get("internal_leaks") or []) == 0 and int(r.get("response_length") or 0) >= m

    support_rows = [r for r in manual_rows if r.get("category") == "support"]
    support_operability = (
        sum(1 for r in support_rows if _no_leak_len(r, 24)) / len(support_rows) if support_rows else 1.0
    )

    founder_rows = [r for r in manual_rows if r.get("category") == "founder"]

    def _founder_row_ok(r: dict[str, Any]) -> bool:
        return _no_leak_len(r, 80) and r.get("has_founder_frame_markers") is True

    founder_operability = (
        sum(1 for r in founder_rows if _founder_row_ok(r)) / len(founder_rows) if founder_rows else 1.0
    )

    unc_rows = [r for r in manual_rows if r.get("category") == "uncertainty"]

    def _uncertainty_score(r: dict[str, Any]) -> float:
        if r.get("internal_leaks"):
            return 0.0
        if r.get("has_uncertainty_surface"):
            return 1.0
        return 0.4

    uncertainty_maturity = _mean([_uncertainty_score(r) for r in unc_rows]) if unc_rows else 1.0

    one_step_subset = [r for r in manual_rows if r.get("id") in ONE_STEP_SUBSET_IDS]
    one_step_coverage = (
        sum(1 for r in one_step_subset if r.get("has_ONE_STEP")) / len(one_step_subset)
        if one_step_subset
        else 1.0
    )

    leak_probe_cap = max(2, int(0.22 * n_ux + 0.999))
    surface_leak_probe_ok = leak_probe_count <= leak_probe_cap

    continuity_obs_ok = continuity_bonus >= 5 and carried_true_n >= 1

    ux_metrics = {
        "surface_leak_probe_count": leak_probe_count,
        "surface_leak_probe_cap": leak_probe_cap,
        "support_operability": round(support_operability, 4),
        "founder_operability": round(founder_operability, 4),
        "uncertainty_maturity": round(uncertainty_maturity, 4),
        "one_step_coverage": round(one_step_coverage, 4),
        "continuity_bonus": continuity_bonus,
        "carried_topic_true_count": carried_true_n,
        "probe_ok_count_all": probe_ok_count,
        "continuity_obs_ok": continuity_obs_ok,
    }

    failure_reasons: list[str] = []
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")
    if not audit.get("ok"):
        failure_reasons.append("audit_not_ready")
    if not surface_leak_probe_ok:
        failure_reasons.append(
            f"surface_leak_probe_count={leak_probe_count}>cap_{leak_probe_cap}",
        )
    if support_operability + 1e-9 < 0.9:
        failure_reasons.append(f"support_operability={support_operability:.3f}<0.9")
    if founder_operability + 1e-9 < 0.8:
        failure_reasons.append(f"founder_operability={founder_operability:.3f}<0.8")
    if uncertainty_maturity + 1e-9 < 0.7:
        failure_reasons.append(f"uncertainty_maturity={uncertainty_maturity:.3f}<0.7")
    if one_step_coverage + 1e-9 < 0.8:
        failure_reasons.append(f"one_step_coverage={one_step_coverage:.3f}<0.8")
    if not continuity_obs_ok:
        failure_reasons.append(
            f"continuity_weak_bonus={continuity_bonus}_carried={carried_true_n}",
        )
    if not billing_link.get("not_404"):
        failure_reasons.append(
            f"billing_link_not_404_failed:{billing_link}",
        )

    if leak_probe_count == 0 and support_operability >= 0.99 and founder_operability >= 0.99:
        overall_verdict = "ux_strong_custom_gpt_surpass_lane"
    elif surface_leak_probe_ok and support_operability >= 0.9 and founder_operability >= 0.8:
        overall_verdict = "ux_improved_hold"
    else:
        overall_verdict = "ux_needs_surface_or_route_repair"

    acceptance_pass = (
        build_ok
        and audit.get("ok") is True
        and billing_link.get("not_404") is True
        and surface_leak_probe_ok
        and support_operability + 1e-9 >= 0.9
        and founder_operability + 1e-9 >= 0.8
        and uncertainty_maturity + 1e-9 >= 0.7
        and one_step_coverage + 1e-9 >= 0.8
        and continuity_obs_ok
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
        "billing_link_probe": billing_link,
        "manual_probes": manual_rows,
        "continuity_probes": continuity_rows,
        "probe_ok_count": probe_ok_count,
        "continuity_bonus": continuity_bonus,
        "carried_topic_true_count": carried_true_n,
        "internal_leak_residual": sorted(set(all_leaks)),
        "ux_metrics": ux_metrics,
        "overall_verdict": overall_verdict,
        "failure_reasons": failure_reasons if not acceptance_pass else [],
        "observation_only": True,
        "acceptance_pass": acceptance_pass,
        "thresholds": {
            "surface_leak_probe_max": leak_probe_cap,
            "support_operability_min": 0.9,
            "founder_operability_min": 0.8,
            "uncertainty_maturity_min": 0.7,
            "one_step_coverage_min": 0.8,
            "continuity_bonus_min": 5,
            "carried_topic_min": 1,
        },
        "nextOnPass": "TENMON_POST_ALL_MAINLINES_DEEP_FORENSIC_RELOCK_CURSOR_AUTO_V1",
        "nextOnFail": "TENMON_SURFACE_LEAK_CLEANUP_RETRY_CURSOR_AUTO_V1",
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
            "## UX 指標（再ロック）",
            "",
            f"- **surface_leak_probe_count**: {leak_probe_count} (cap {leak_probe_cap})",
            f"- **support_operability**: {support_operability:.3f} (min 0.9)",
            f"- **founder_operability**: {founder_operability:.3f} (min 0.8)",
            f"- **uncertainty_maturity**: {uncertainty_maturity:.3f} (min 0.7)",
            f"- **one_step_coverage**: {one_step_coverage:.3f} (min 0.8)",
            f"- **overall_verdict**: `{overall_verdict}`",
            "",
            "## 集計",
            "",
            f"- **probe_ok_count**（無 leak・長さ）: {probe_ok_count} / {n_ux}",
            f"- **continuity_bonus**: {continuity_bonus} (min 5)",
            f"- **carried_topic (true のペア数)**: {carried_true_n} (min 1)",
            f"- **npm run check**: {'PASS' if build_ok else 'FAIL'}",
            f"- **audit ok**: `{audit.get('ok')}`",
            f"- **billing /api/billing/link**: `{billing_link}`",
            f"- **internal_leak_residual**: `{result['internal_leak_residual']}`",
            "",
            f"## UX プローブ {n_ux} 本",
            "",
        ],
    )
    for row in manual_rows:
        md.append(
            f"- `{row.get('id')}` ({row.get('category')}): ok={row.get('probe_ok')} "
            f"len={row.get('response_length', 0)} ONE_STEP={row.get('has_ONE_STEP')} "
            f"unc_surf={row.get('has_uncertainty_surface')} founder_mk={row.get('has_founder_frame_markers')} "
            f"leaks={row.get('internal_leaks')}",
        )
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

    print(
        json.dumps(
            {
                "acceptance_pass": result["acceptance_pass"],
                "overall_verdict": result["overall_verdict"],
                "ux_metrics": result["ux_metrics"],
                "chat_url": result["chat_url"],
                "billing_link_probe": result["billing_link_probe"],
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
