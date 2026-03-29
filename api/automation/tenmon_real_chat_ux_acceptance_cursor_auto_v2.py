#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REAL_CHAT_UX_ACCEPTANCE_MASTER_CURSOR_AUTO_V2
実チャット（/api/chat 等）経由で route / leak / uncertainty / continuity / kokuzo 表面を観測し、
report md / result json に保存する（新規本実装なし・記録専用）。
routeReason は API 応答 JSON から抽出のみ（改ざんしない）。
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

CARD = "TENMON_REAL_CHAT_UX_ACCEPTANCE_MASTER_CURSOR_AUTO_V2"
OUT_JSON = "tenmon_real_chat_ux_acceptance_result_v2.json"
OUT_MD = "tenmon_real_chat_ux_acceptance_report_v2.md"

# (scenario_id, message, category)
REAL_CHAT_SCENARIOS: list[tuple[str, str, str]] = [
    ("define_kotodama", "言霊とは何か", "define"),
    ("define_hokekyo", "法華経とは何か", "define"),
    ("define_sokushin", "即身成仏とは何か", "define"),
    ("define_suika", "水火とは何か", "define"),
    (
        "founder_update",
        "Founder向け：現状報告と更新指示を一文ずつまとめて",
        "founder",
    ),
    ("support_billing", "課金表示がおかしい。請求とプランの状態を確認したい", "support"),
    ("support_pwa", "PWA をホーム画面に追加できません。手順を教えてください", "support"),
    (
        "uncertainty_ambiguous",
        "稗田阿礼の実在と年代は、現存史料だけで一義に確定できますか",
        "uncertainty",
    ),
]

CONTINUITY_3TURN_MESSAGES: list[str] = [
    "言霊とは何か",
    "その続きを一歩だけ深めてください",
    "それと水火の往還はどう結びつきますか",
]

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

UNCERTAINTY_SURFACE_RE = re.compile(
    r"根拠が限られ|現時点の根拠|可能性として述べ|いまの読みの範囲で述べ|未確定|断定は避け|史実としての断定は避け|"
    r"史料上断定|一義に確定しづらい|慎重に|推測に留め|確定しづらい",
    re.U,
)

FOUNDER_SURFACE_RE = re.compile(
    r"【受理】|【現状】|【更新・反映内容】|【次確認】|【承認確認】|構築・運用|反映・更新のたたき台|"
    r"受け取りました|更新候補|ドラフトとして|確定してよい|構築者向け|Founder向け",
    re.U,
)

# kokuzo_core 投入の「天聞固有」表層シグナル（内部識別子は含めない）
KOKUZO_TENMON_VOICE_RE = re.compile(
    r"【天聞の所見】|天聞の所見|天聞の一手|天聞の論点|天聞の整理|天聞の読み",
    re.U,
)

DEFINE_IDS = frozenset(
    {"define_kotodama", "define_hokekyo", "define_sokushin", "define_suika"},
)


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
        code, _err, _ = _post_chat(url, "probe_ping", "realchat-v2-discover", timeout=15.0)
        if code == 200:
            return url
    return None


def _billing_link_not_404(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/billing/link"
    body = json.dumps({"sessionId": "real_chat_ux_v2_placeholder"}, ensure_ascii=False).encode("utf-8")
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


def _parse_response(raw: str) -> tuple[str | None, dict[str, Any] | None]:
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


def _extract_route_reason(j: dict[str, Any] | None) -> str:
    if not j:
        return ""
    df = j.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict):
            rr = ku.get("routeReason")
            if isinstance(rr, str) and rr.strip():
                return rr.strip()
    return ""


def _scan_leaks(text: str) -> list[str]:
    return [name for name, pat in LEAK_PATTERNS if pat.search(text)]


def _prose_naturalness_ok(text: str) -> bool:
    t = text.strip()
    if len(t) < 28:
        return False
    if not re.search(r"[\u3040-\u30FF\u3400-\u9FFF]", t):
        return False
    if re.search(r"\b(?:function|const|import|export)\b", t):
        return False
    return bool(re.search(r"[。、]", t)) or len(t) > 100


def _support_bone_ok(text: str, route_reason: str) -> bool:
    if re.search(r"SUPPORT_", route_reason):
        return True
    return bool(
        re.search(r"サポート|請求|プラン|PWA|手順|ホーム画面|課金", text, re.U),
    )


def _founder_bone_ok(text: str, route_reason: str) -> bool:
    if re.search(r"FOUNDER|founder|構築", route_reason, re.I):
        return True
    return bool(FOUNDER_SURFACE_RE.search(text))


def _continuity_turn2_ok(text: str) -> bool:
    return bool(re.search(r"言霊|言葉|名|響|声|一段|深め|整え|要点", text, re.U))


def _continuity_turn3_ok(text: str) -> bool:
    has_wf = bool(re.search(r"水火|往還", text, re.U))
    has_link = bool(re.search(r"言霊|さき|先の|踏まえ|前提|つな|結び|話を", text, re.U))
    return has_wf and has_link


def _classify_failures(failure_reasons: list[str]) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {
        "surface": [],
        "uncertainty": [],
        "billing": [],
        "continuity": [],
        "other": [],
    }
    for fr in failure_reasons:
        fl = fr.lower()
        if "uncertainty_leak" in fl or "uncertainty_no_natural" in fl:
            buckets["uncertainty"].append(fr)
        elif "leak" in fl or "define_" in fr or "surface" in fl:
            buckets["surface"].append(fr)
        elif "uncertainty" in fl or "hedg" in fl:
            buckets["uncertainty"].append(fr)
        elif "billing" in fl:
            buckets["billing"].append(fr)
        elif "continuity" in fl or "turn" in fl:
            buckets["continuity"].append(fr)
        else:
            buckets["other"].append(fr)
    return buckets


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api_dir = repo / "api"
    auto = api_dir / "automation"
    base = os.environ.get("TENMON_AUDIT_BASE_URL", "http://127.0.0.1:3000").strip()

    build_ok, build_tail = _npm_check(api_dir)
    audit = _get_audit(base)
    billing_link = _billing_link_not_404(base)
    chat_url = _discover_chat_url(base)

    rows: list[dict[str, Any]] = []
    all_leaks: list[str] = []

    if chat_url:
        for sid, msg, cat in REAL_CHAT_SCENARIOS:
            tid = f"realchat-v2-{sid}-{int(time.time())}"
            code, err, raw = _post_chat(chat_url, msg, tid)
            text_out = ""
            full_j: dict[str, Any] | None = None
            rr = ""
            leaks: list[str] = []
            if raw:
                t, full_j = _parse_response(raw)
                rr = _extract_route_reason(full_j)
                if t is not None:
                    text_out = t
                    leaks = _scan_leaks(t)
                else:
                    leaks = _scan_leaks(raw[:12000])
            all_leaks.extend([f"{sid}:{x}" for x in leaks])
            excerpt = (text_out or "")[:2000]
            rows.append(
                {
                    "scenario_id": sid,
                    "category": cat,
                    "message": msg,
                    "threadId": tid,
                    "http_status": code,
                    "error": err,
                    "routeReason": rr,
                    "internal_leaks": leaks,
                    "response_length": len(text_out) if text_out else (len(raw or "")),
                    "has_uncertainty_surface": bool(UNCERTAINTY_SURFACE_RE.search(excerpt)),
                    "has_kokuzo_tenmon_voice": bool(KOKUZO_TENMON_VOICE_RE.search(excerpt)),
                    "prose_naturalness_ok": _prose_naturalness_ok(text_out) if text_out else False,
                    "support_bone_ok": _support_bone_ok(excerpt, rr) if cat == "support" else None,
                    "founder_bone_ok": _founder_bone_ok(excerpt, rr) if cat == "founder" else None,
                    "response_head": text_out[:280] if text_out else (raw[:280] if raw else ""),
                },
            )
            time.sleep(0.12)
    else:
        for sid, msg, cat in REAL_CHAT_SCENARIOS:
            rows.append(
                {
                    "scenario_id": sid,
                    "category": cat,
                    "message": msg,
                    "threadId": None,
                    "http_status": None,
                    "error": "chat_url_unavailable",
                    "routeReason": "",
                    "internal_leaks": [],
                    "response_length": 0,
                    "has_uncertainty_surface": False,
                    "has_kokuzo_tenmon_voice": False,
                    "prose_naturalness_ok": False,
                    "support_bone_ok": None,
                    "founder_bone_ok": None,
                    "response_head": "",
                },
            )

    continuity_block: dict[str, Any] = {
        "flow_id": "continuity_3turn_kotodama_waterfire",
        "threadId": None,
        "turns": [],
        "continuity_held": False,
        "all_turns_leak_free": False,
        "turn2_deepens_prior": False,
        "turn3_links_waterfire": False,
    }

    if chat_url:
        ctid = f"realchat-v2-cont3-{int(time.time())}"
        continuity_block["threadId"] = ctid
        turn_texts: list[str] = []
        for i, m in enumerate(CONTINUITY_3TURN_MESSAGES, start=1):
            code, err, raw = _post_chat(chat_url, m, ctid)
            text_out = ""
            rr = ""
            leaks: list[str] = []
            if raw:
                t, fj = _parse_response(raw)
                rr = _extract_route_reason(fj)
                if t is not None:
                    text_out = t
                    leaks = _scan_leaks(t)
                else:
                    leaks = _scan_leaks(raw[:12000])
            all_leaks.extend([f"continuity_turn{i}:{x}" for x in leaks])
            turn_texts.append(text_out)
            continuity_block["turns"].append(
                {
                    "turn": i,
                    "message": m,
                    "http_status": code,
                    "error": err,
                    "routeReason": rr,
                    "internal_leaks": leaks,
                    "response_length": len(text_out),
                    "response_head": text_out[:280] if text_out else "",
                },
            )
            time.sleep(0.12)

        t2 = turn_texts[1] if len(turn_texts) > 1 else ""
        t3 = turn_texts[2] if len(turn_texts) > 2 else ""
        continuity_block["turn2_deepens_prior"] = _continuity_turn2_ok(t2) if t2 else False
        continuity_block["turn3_links_waterfire"] = _continuity_turn3_ok(t3) if t3 else False
        turns_ok = all(
            isinstance(t.get("http_status"), int) and t["http_status"] == 200
            for t in continuity_block["turns"]
        )
        continuity_block["all_turns_leak_free"] = all(
            len(t.get("internal_leaks") or []) == 0 for t in continuity_block["turns"]
        )
        # 実会話の「つながり」: 3ターン 200 + 2ターン目が前段を深める + 3ターン目が水火へ接続（leak は surface 別観測）
        continuity_block["continuity_held"] = (
            turns_ok
            and continuity_block["turn2_deepens_prior"]
            and continuity_block["turn3_links_waterfire"]
        )

    failure_reasons: list[str] = []
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")
    if not audit.get("ok"):
        failure_reasons.append("audit_not_ready")
    if not billing_link.get("not_404"):
        failure_reasons.append(f"billing_link_probe:{billing_link}")
    if not chat_url:
        failure_reasons.append("chat_url_unavailable")

    define_rows = [r for r in rows if r["scenario_id"] in DEFINE_IDS]
    for r in define_rows:
        if r.get("internal_leaks"):
            failure_reasons.append(f"define_leak:{r['scenario_id']}:{r['internal_leaks']}")

    unc_row = next((r for r in rows if r["scenario_id"] == "uncertainty_ambiguous"), None)
    if unc_row and chat_url:
        if unc_row.get("internal_leaks"):
            failure_reasons.append(f"uncertainty_leak:{unc_row['internal_leaks']}")
        elif not unc_row.get("has_uncertainty_surface"):
            failure_reasons.append("uncertainty_no_natural_hedge_surface")

    for sid in ("support_billing", "support_pwa"):
        r = next((x for x in rows if x["scenario_id"] == sid), None)
        if r and chat_url:
            if r.get("internal_leaks"):
                failure_reasons.append(f"support_leak:{sid}:{r['internal_leaks']}")
            elif int(r.get("response_length") or 0) < 24:
                failure_reasons.append(f"support_too_short:{sid}")
            elif r.get("support_bone_ok") is False:
                failure_reasons.append(f"support_bone_missing:{sid}")

    fu = next((r for r in rows if r["scenario_id"] == "founder_update"), None)
    if fu and chat_url:
        if fu.get("internal_leaks"):
            failure_reasons.append(f"founder_leak:{fu['internal_leaks']}")
        elif int(fu.get("response_length") or 0) < 40:
            failure_reasons.append("founder_too_short")
        elif fu.get("founder_bone_ok") is False:
            failure_reasons.append("founder_bone_missing")

    kokuzo_hits = sum(1 for r in define_rows if r.get("has_kokuzo_tenmon_voice"))
    if chat_url and define_rows and kokuzo_hits < 1:
        failure_reasons.append(
            f"kokuzo_tenmon_voice_surface_missing:define_hits={kokuzo_hits}/4",
        )

    if chat_url and not continuity_block["continuity_held"]:
        failure_reasons.append(
            "continuity_3turn_not_held:"
            f"turn2_deepens={continuity_block['turn2_deepens_prior']}"
            f"_turn3_links={continuity_block['turn3_links_waterfire']}"
            f"_turns={len(continuity_block['turns'])}",
        )

    fail_buckets = _classify_failures(failure_reasons)

    acceptance_pass = len(failure_reasons) == 0

    result: dict[str, Any] = {
        "schema": "TENMON_REAL_CHAT_UX_ACCEPTANCE_V2",
        "card": CARD,
        "generated_at": _utc_iso(),
        "base_url": base,
        "chat_url": chat_url,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail[-1500:],
        "audit": audit,
        "billing_link_probe": billing_link,
        "scenarios": rows,
        "continuity_3turn": continuity_block,
        "kokuzo_tenmon_voice_hits_in_define": kokuzo_hits,
        "internal_leak_residual": sorted(set(all_leaks)),
        "failure_reasons": failure_reasons if not acceptance_pass else [],
        "fail_classification": fail_buckets,
        "observation_only": True,
        "acceptance_pass": acceptance_pass,
        "acceptance_criteria_notes": (
            "define/scripture系 leak=false; uncertainty に保留句; support/founder 骨格; "
            "continuity 3ターン; kokuzo 天聞固有表層>=1 in define; npm/audit/billing 維持"
        ),
        "nextOnPass": "TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_CURSOR_AUTO_V2",
        "nextOnFail": (
            "fail項目を surface / uncertainty / billing / continuity に分類し、"
            "該当バケットに最小差分カード1枚のみ追加"
        ),
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines: list[str] = [
        "# TENMON_REAL_CHAT_UX_ACCEPTANCE_REPORT_V2",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **acceptance_pass**: `{acceptance_pass}`",
        f"- **chat_url**: `{chat_url}`",
        "- **mode**: 実チャット観測専用（本スクリプトは記録のみ・routeReason は API からの抽出のみ）",
        "",
    ]
    if failure_reasons:
        md_lines.extend(["## 不合格理由（要約）", "", "\n".join(f"- `{x}`" for x in failure_reasons), ""])
    md_lines.extend(
        [
            "## 基盤",
            "",
            f"- **npm run check**: {'PASS' if build_ok else 'FAIL'}",
            f"- **GET /api/audit ok**: `{audit.get('ok')}`",
            f"- **POST /api/billing/link not_404**: `{billing_link.get('not_404')}`",
            "",
            "## kokuzo / define 表面",
            "",
            f"- **天聞固有表層ヒット数（define 4本中）**: {kokuzo_hits}",
            "",
            "## Continuity 3ターン（同一 threadId）",
            "",
            f"- **continuity_held**: `{continuity_block['continuity_held']}`",
            f"- **all_turns_leak_free**（3ターン本文）: `{continuity_block.get('all_turns_leak_free')}`",
            f"- **turn2_deepens_prior**: `{continuity_block['turn2_deepens_prior']}`",
            f"- **turn3_links_waterfire**: `{continuity_block['turn3_links_waterfire']}`",
            "",
        ],
    )
    for t in continuity_block.get("turns") or []:
        md_lines.append(
            f"- turn {t.get('turn')}: http={t.get('http_status')} "
            f"routeReason=`{t.get('routeReason')}` leaks={t.get('internal_leaks')}",
        )
    md_lines.extend(["", "## シナリオ別（route / leak / uncertainty / kokuzo / 文体）", ""])
    for r in rows:
        md_lines.append(
            f"- `{r.get('scenario_id')}` ({r.get('category')}): "
            f"routeReason=`{r.get('routeReason')}` "
            f"leaks={r.get('internal_leaks')} "
            f"unc_surf={r.get('has_uncertainty_surface')} "
            f"kokuzo_voice={r.get('has_kokuzo_tenmon_voice')} "
            f"prose_ok={r.get('prose_naturalness_ok')} "
            f"support_bone={r.get('support_bone_ok')} founder_bone={r.get('founder_bone_ok')} "
            f"len={r.get('response_length')}",
        )
    md_lines.extend(
        [
            "",
            "## leak 残差（一覧）",
            "",
            f"`{result['internal_leak_residual']}`",
            "",
            "## 次カード",
            "",
            f"- **nextOnPass**: `{result['nextOnPass']}`",
            f"- **nextOnFail**: {result['nextOnFail']}",
            "",
            "## fail 分類（nextOnFail 用）",
            "",
            f"```json\n{json.dumps(fail_buckets, ensure_ascii=False, indent=2)}\n```",
            "",
        ],
    )
    (auto / OUT_MD).write_text("\n".join(md_lines), encoding="utf-8")

    print(
        json.dumps(
            {
                "acceptance_pass": acceptance_pass,
                "chat_url": chat_url,
                "kokuzo_tenmon_voice_hits_in_define": kokuzo_hits,
                "continuity_held": continuity_block["continuity_held"],
                "failure_reasons": failure_reasons,
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
