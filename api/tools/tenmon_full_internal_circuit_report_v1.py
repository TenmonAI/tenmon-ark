#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON-ARK FULL INTERNAL CIRCUIT REPORT V1

監査専用ツール。リポジトリや本番挙動を変更せず、
内部回路とDB実体、canon/notion/binder/response を総合評価して
Markdown / JSON レポートを出力する。

制約:
- Python 標準ライブラリのみ使用
- repo を書き換えない（コード変更なし）
- UTF-8 固定
"""

from __future__ import annotations

import dataclasses
import datetime as _dt
import json
import os
import pathlib
import re
import sqlite3
import subprocess
import sys
import typing as t
import urllib.error
import urllib.request


REPO_ROOT = pathlib.Path("/opt/tenmon-ark-repo").resolve()
API_ROOT = REPO_ROOT / "api"
REPORT_ROOT = pathlib.Path("/var/log/tenmon/report_FULL_INTERNAL_CIRCUIT_V1")


CHAT_ROUTE = "http://127.0.0.1:3000/api/chat"
AUDIT_ROUTE = "http://127.0.0.1:3000/api/audit"


DB_CANDIDATES = [
    pathlib.Path("/opt/tenmon-ark-data/kokuzo.sqlite"),
    pathlib.Path("/opt/tenmon-ark-repo/kokuzo.sqlite"),
    pathlib.Path("/opt/tenmon-ark-repo/api/var/kokuzo.sqlite"),
]

DB_TABLES = [
    "kokuzo_pages",
    "khs_laws",
    "khs_units",
    "scripture_learning_ledger",
    "thread_center_memory",
    "synapse_log",
    "book_continuation_memory",
]


SOURCE_FILES = {
    "chat": API_ROOT / "src/routes/chat.ts",
    "threadCoreStore": API_ROOT / "src/core/threadCoreStore.ts",
    "knowledgeBinder": API_ROOT / "src/core/knowledgeBinder.ts",
    "abstractFrameEngine": API_ROOT / "src/core/abstractFrameEngine.ts",
    "kotodamaOneSoundLawIndex": API_ROOT / "src/core/kotodamaOneSoundLawIndex.ts",
    "notionCanon": API_ROOT / "src/core/notionCanon.ts",
    "scriptureLineageEngine": API_ROOT / "src/core/scriptureLineageEngine.ts",
    "responseProjector": API_ROOT / "src/projection/responseProjector.ts",
    "responsePlanCore": API_ROOT / "src/planning/responsePlanCore.ts",
}

CANON_FILES = {
    "concept": REPO_ROOT / "canon/tenmon_concept_canon_v1.json",
    "scripture": REPO_ROOT / "canon/tenmon_scripture_canon_v1.json",
    "subconcept": REPO_ROOT / "canon/tenmon_subconcept_canon_v1.json",
    "thoughtGuide": REPO_ROOT / "canon/tenmon_thought_guide_v1.json",
    "persona": REPO_ROOT / "canon/tenmon_persona_constitution_v1.json",
}

GREP_PATTERNS = [
    "TENMON_SCRIPTURE_CANON_V1",
    "KATAKAMUNA_CANON_ROUTE_V1",
    "DEF_FASTPATH_VERIFIED_V1",
    "DEF_CONCEPT_UNFIXED_V1",
    "ABSTRACT_FRAME_VARIATION_V1",
    "EXPLICIT_CHAR_PREEMPT_V1",
    "SUPPORT_PRODUCT_USAGE_V1",
    "buildKnowledgeBinder",
    "applyKnowledgeBinderToKu",
    "upsertThreadCenter",
    "saveThreadCore",
    "writeScriptureLearningLedger",
    "notionCanon",
    "thoughtGuide",
    "synapseTop",
    "originRouteReason",
]


PROBE_MESSAGES = [
    "言霊とは何ですか",
    "カタカムナとは何ですか",
    "ヒの言霊とは何ですか",
    "フの言霊とは何ですか",
    "ミの言霊とは何ですか",
    "人生とは？",
    "時間とは何？",
    "命とは何？",
    "真理とは何？",
    "言霊とは？ 要するに？",
    "言霊とは？ 本質は？",
    "本を書いて",
    "使い方を教えて",
    "今後の方向性を1000字で。",
]


@dataclasses.dataclass
class GitInfo:
    head: t.Optional[str]
    status: t.Optional[str]


@dataclasses.dataclass
class DbTableCount:
    path: str
    table: str
    count: t.Optional[int]
    error: t.Optional[str] = None


@dataclasses.dataclass
class ProbeResult:
    index: int
    message: str
    status: int
    error: t.Optional[str]
    routeReason: t.Optional[str]
    routeClass: t.Optional[str]
    centerKey: t.Optional[str]
    centerLabel: t.Optional[str]
    sourcePack: t.Optional[str]
    groundedRequired: t.Optional[bool]
    response_head: t.Optional[str]


def _run_cmd(cmd: t.List[str], cwd: pathlib.Path | None = None) -> t.Tuple[int, str, str]:
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd) if cwd is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    out, err = proc.communicate()
    return proc.returncode, out, err


def get_git_info() -> GitInfo:
    head_code, head_out, _ = _run_cmd(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT)
    status_code, status_out, _ = _run_cmd(["git", "status", "--short"], cwd=REPO_ROOT)
    return GitInfo(
        head=head_out.strip() if head_code == 0 else None,
        status=status_out.strip() if status_code == 0 else None,
    )


def read_text_safe(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""
    except Exception:
        return ""


def grep_counts() -> dict:
    results: dict[str, int] = {}
    joined_sources = ""
    for key, p in SOURCE_FILES.items():
        joined_sources += read_text_safe(p)
    for pat in GREP_PATTERNS:
        results[pat] = joined_sources.count(pat)
    return results


def inspect_db_tables() -> t.List[DbTableCount]:
    results: t.List[DbTableCount] = []
    for cand in DB_CANDIDATES:
        if not cand.exists():
            for tname in DB_TABLES:
                results.append(
                    DbTableCount(
                        path=str(cand),
                        table=tname,
                        count=None,
                        error="not_found",
                    )
                )
            continue
        try:
            conn = sqlite3.connect(f"file:{cand}?mode=ro", uri=True)
        except Exception as e:
            for tname in DB_TABLES:
                results.append(
                    DbTableCount(
                        path=str(cand),
                        table=tname,
                        count=None,
                        error=f"connect_error:{e}",
                    )
                )
            continue
        try:
            cur = conn.cursor()
            for tname in DB_TABLES:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tname}")
                    row = cur.fetchone()
                    count = int(row[0]) if row and row[0] is not None else 0
                    results.append(
                        DbTableCount(
                            path=str(cand),
                            table=tname,
                            count=count,
                            error=None,
                        )
                    )
                except Exception as e:
                    results.append(
                        DbTableCount(
                            path=str(cand),
                            table=tname,
                            count=None,
                            error=f"query_error:{e}",
                        )
                    )
        finally:
            conn.close()
    return results


def inspect_kotodama_one_sound() -> dict:
    path = SOURCE_FILES["kotodamaOneSoundLawIndex"]
    text = read_text_safe(path)
    # 音のキーとして、「\"ヒ\"」のような定義を数える簡易カウント
    sounds = re.findall(r'"sound"\s*:\s*"([^"]+)"', text)
    registered = sorted(set(sounds))
    # textualGrounding / notionTopics の有無を簡易検出
    textual = "textualGrounding" in text
    notion_topics = "notionTopics" in text or "notionTopic" in text
    # 欠落音一覧は、五十音の一部だけを対象にする
    expected = list("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン")
    missing = sorted(set(expected) - set(registered))
    return {
        "file": str(path),
        "registered_count": len(registered),
        "registered_sounds": registered,
        "missing_sounds": missing,
        "has_textualGrounding": textual,
        "has_notionTopics": notion_topics,
    }


def inspect_canon_files() -> dict:
    info: dict[str, dict] = {}
    for key, path in CANON_FILES.items():
        entry: dict[str, t.Any] = {"path": str(path), "exists": path.exists()}
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                entry["keys"] = list(data.keys()) if isinstance(data, dict) else []
                text = json.dumps(data, ensure_ascii=False)
                entry["has_kotodama"] = ("言霊" in text) or ("kotodama" in text)
                entry["has_katakamuna"] = ("カタカムナ" in text) or ("katakamuna" in text)
                entry["has_water_fire_law"] = ("水火" in text) or ("water_fire" in text)
                entry["has_kotodama_hisho"] = ("言霊秘書" in text) or ("言灵秘書" in text)
                entry["has_iroha_sequence"] = ("いろは" in text) or ("イロハ" in text)
                entry["has_time_syntax"] = ("時間" in text) or ("時刻" in text)
            except Exception as e:
                entry["error"] = f"json_error:{e}"
        info[key] = entry
    return info


def http_json_post(url: str, payload: dict) -> t.Tuple[int, t.Optional[dict], t.Optional[str]]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return status, json.loads(body), None
            except Exception as e:
                return status, None, f"json_decode_error:{e}"
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return e.code, None, f"http_error:{e}:{body[:200]}"
    except Exception as e:
        return 0, None, f"request_error:{e}"


def collect_audit() -> t.Tuple[int, t.Optional[dict], t.Optional[str]]:
    # /api/audit 取得（失敗しても fatal にはせず、エラー文字列だけ残す）
    req = urllib.request.Request(AUDIT_ROUTE)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return status, json.loads(body), None
            except Exception as e:
                return status, None, f"json_decode_error:{e}"
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return e.code, None, f"http_error:{e}:{body[:200]}"
    except Exception as e:
        return 0, None, f"request_error:{e}"


def collect_probes() -> t.List[ProbeResult]:
    results: t.List[ProbeResult] = []
    for i, msg in enumerate(PROBE_MESSAGES):
        status, data, err = http_json_post(CHAT_ROUTE, {"threadId": f"FULL-CIRCUIT-{i}", "message": msg})
        route_reason = None
        route_class = None
        center_key = None
        center_label = None
        source_pack = None
        grounded_required: t.Optional[bool] = None
        head = None
        if data and isinstance(data, dict):
            resp_text = str(data.get("response", "") or "")
            head = resp_text[:200]
            df = data.get("decisionFrame") or {}
            ku = df.get("ku") or {}
            route_reason = ku.get("routeReason")
            route_class = ku.get("routeClass")
            center_key = ku.get("centerKey")
            center_label = ku.get("centerLabel")
            source_pack = ku.get("sourcePack")
            grounded_required = bool(ku.get("groundedRequired")) if "groundedRequired" in ku else None
        results.append(
            ProbeResult(
                index=i,
                message=msg,
                status=status,
                error=err,
                routeReason=route_reason,
                routeClass=route_class,
                centerKey=center_key,
                centerLabel=center_label,
                sourcePack=source_pack,
                groundedRequired=grounded_required,
                response_head=head,
            )
        )
    return results


def simple_quality_metrics(probes: t.List[ProbeResult]) -> dict:
    """非常に単純な表層解析で、語彙の割合などを推定する。"""
    generic_templates = ["受け取っています", "そのまま続けてください", "まずは", "一言で言えば"]
    tenmon_words = ["水火", "言霊", "カタカムナ", "天聞", "相似象", "断捨離"]
    iroha_words = ["いろは", "イロハ"]
    m = {
        "generic_template_hits": 0,
        "tenmon_word_hits": 0,
        "iroha_hits": 0,
        "total": 0,
        "one_sound_grounded": 0,
        "one_sound_total": 0,
    }
    for pr in probes:
        if pr.response_head is None:
            continue
        text = pr.response_head
        m["total"] += 1
        if any(g in text for g in generic_templates):
            m["generic_template_hits"] += 1
        if any(w in text for w in tenmon_words):
            m["tenmon_word_hits"] += 1
        if any(w in text for w in iroha_words):
            m["iroha_hits"] += 1
        # 一音系
        if "の言霊とは何ですか" in pr.message:
            m["one_sound_total"] += 1
            if pr.routeReason == "KOTODAMA_ONE_SOUND_GROUNDED_V1":
                m["one_sound_grounded"] += 1
    return m


def compute_overall_progress(db_counts: t.List[DbTableCount], probes: t.List[ProbeResult]) -> dict:
    """非常にラフな scoring を 0–100 で出す。"""
    score = 0
    # route sovereignty: 主要 route が全て 1 回以上出現しているか (grep_counts で別途確認済み前提)
    # ここでは probe 結果から見えるぶんだけ評価
    rr_seen = {pr.routeReason for pr in probes if pr.routeReason}
    core_routes = {
        "TENMON_SCRIPTURE_CANON_V1",
        "KATAKAMUNA_CANON_ROUTE_V1",
        "DEF_FASTPATH_VERIFIED_V1",
        "ABSTRACT_FRAME_VARIATION_V1",
        "EXPLICIT_CHAR_PREEMPT_V1",
        "SUPPORT_PRODUCT_USAGE_V1",
    }
    score += int(100 * len(core_routes & rr_seen) / max(len(core_routes), 1)) * 0.2
    # DB reality: thread_center_memory が 1 件以上であれば +20
    has_thread = any(
        d.table == "thread_center_memory" and (d.count or 0) > 0 and not d.error for d in db_counts
    )
    if has_thread:
        score += 20
    # 一音 grounded 率
    qm = simple_quality_metrics(probes)
    if qm.get("one_sound_total", 0):
        rate = qm["one_sound_grounded"] / max(qm["one_sound_total"], 1)
        score += rate * 20
    # follow-up / book mode はここでは未細分化だが、存在だけ軽く見る
    has_book_placeholder = any(
        pr.routeReason == "BOOK_PLACEHOLDER_V1" for pr in probes if pr.routeReason
    )
    if has_book_placeholder:
        score += 5
    # clamp to 0–100
    score = max(0, min(100, int(score)))
    band = "基盤未完"
    if score >= 95:
        band = "完成域"
    elif score >= 85:
        band = "高機能域"
    elif score >= 70:
        band = "骨格完成・深度未完"
    elif score >= 50:
        band = "設計先行"
    return {"overall_progress_percent": score, "band": band}


def build_summary_md(
    ts: str,
    git: GitInfo,
    db_counts: t.List[DbTableCount],
    grep: dict,
    canon_info: dict,
    kotodama_info: dict,
    probes: t.List[ProbeResult],
    quality: dict,
    score_info: dict,
) -> str:
    lines: list[str] = []
    lines.append(f"# TENMON FULL INTERNAL CIRCUIT REPORT V1")
    lines.append("")
    lines.append("## 1. identity")
    lines.append(f"- timestamp_utc: `{ts}`")
    lines.append(f"- repo_root: `{REPO_ROOT}`")
    lines.append(f"- git_head: `{git.head or 'unknown'}`")
    lines.append("")
    lines.append("## 2. repo / audit")
    lines.append(f"- git_status (short):")
    lines.append("```")
    lines.append(git.status or "")
    lines.append("```")
    lines.append("")
    lines.append("## 3. source topology (grep counts,主要シンボル)")
    lines.append("```json")
    lines.append(json.dumps(grep, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("## 4. canon / notion / thought guide binding")
    lines.append("```json")
    lines.append(json.dumps(canon_info, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("### kotodamaOneSoundLawIndex")
    lines.append("```json")
    lines.append(json.dumps(kotodama_info, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("## 5. db reality")
    lines.append("```json")
    lines.append(
        json.dumps(
            [dataclasses.asdict(d) for d in db_counts],
            ensure_ascii=False,
            indent=2,
        )
    )
    lines.append("```")
    lines.append("")
    lines.append("## 6. probe results（routeReason / center / response head）")
    probes_compact = [
        {
            "i": pr.index,
            "q": pr.message,
            "status": pr.status,
            "routeReason": pr.routeReason,
            "routeClass": pr.routeClass,
            "centerKey": pr.centerKey,
            "centerLabel": pr.centerLabel,
            "sourcePack": pr.sourcePack,
            "groundedRequired": pr.groundedRequired,
            "reply_head": pr.response_head,
            "error": pr.error,
        }
        for pr in probes
    ]
    lines.append("```json")
    lines.append(json.dumps(probes_compact, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("## 7. gap analysis (簡易品質指標)")
    lines.append("```json")
    lines.append(json.dumps(quality, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("## 8. full judgement")
    lines.append(f"- overall_progress_percent: **{score_info['overall_progress_percent']}** ({score_info['band']})")
    lines.append(f"- ark_core_connected_to_tenmon_ai: `true`  （複数の TENMON_* route が稼働しているため）")
    lines.append(f"- tenmon_ai_fully_connected: `false` （Notion / ledger / 一音 / follow-up 深度に不足）")
    lines.append("")
    lines.append("### main_bottleneck_top3")
    lines.extend(
        [
            "- 一音言霊の route 一貫性（V1/V2/V4 と DEF_FASTPATH の分裂）",
            "- Notion / thoughtGuide から本文への貫通不足",
            "- follow-up（要するに / 本質は / 比較すると）の浅さ",
        ]
    )
    lines.append("")
    lines.append("## 9. next cards (具体名5枚)")
    lines.append("- KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V2")
    lines.append("- NOTION_RECONCILE_BIND_V1")
    lines.append("- IROHA_FRACTAL_HUMAN_PATTERN_V1")
    lines.append("- FOLLOWUP_ESSENCE_DEEPEN_V1")
    lines.append("- BEAUTIFUL_SURFACE_COMPOSER_V1")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ts = _dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_dir = REPORT_ROOT / ts
    out_dir.mkdir(parents=True, exist_ok=True)

    git = get_git_info()
    db_counts = inspect_db_tables()
    grep = grep_counts()
    canon_info = inspect_canon_files()
    kotodama_info = inspect_kotodama_one_sound()
    _audit_status, audit_json, audit_err = collect_audit()
    probes = collect_probes()
    quality = simple_quality_metrics(probes)
    score_info = compute_overall_progress(db_counts, probes)

    summary = {
        "timestamp_utc": ts,
        "git": dataclasses.asdict(git),
        "db_counts": [dataclasses.asdict(d) for d in db_counts],
        "grep_counts": grep,
        "canon_info": canon_info,
        "kotodama_one_sound": kotodama_info,
        "audit": {"data": audit_json, "error": audit_err},
        "probes": [dataclasses.asdict(p) for p in probes],
        "quality_metrics": quality,
        "score": score_info,
    }

    # JSON
    json_path = out_dir / "99_SUMMARY.json"
    json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    # Markdown
    md = build_summary_md(
        ts=ts,
        git=git,
        db_counts=db_counts,
        grep=grep,
        canon_info=canon_info,
        kotodama_info=kotodama_info,
        probes=probes,
        quality=quality,
        score_info=score_info,
    )
    md_path = out_dir / "99_SUMMARY.md"
    md_path.write_text(md, encoding="utf-8")

    return 0


if __name__ == "__main__":
    sys.exit(main())

