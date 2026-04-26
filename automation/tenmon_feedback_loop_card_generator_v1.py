#!/usr/bin/env python3
"""TENMON-ARK Feedback Loop Card Generator v1 (CARD-FEEDBACK-LOOP-CARD-GENERATION-V1).

旧 VPS で doctor v2 report と /api/feedback/history を統合し、
次に進めるべき Cursor カード候補を自動生成する。

Python3 stdlib only。手動実行のみ (systemd / cron / timer 登録なし)。
MC bearer token は使わない (戦略 C)。

Usage:
    python3 automation/tenmon_feedback_loop_card_generator_v1.py generate

Outputs (atomic, written at the very end of cmd_generate):
    <OUT_DIR>/feedback_history_latest.json
    <OUT_DIR>/feedback_integration_latest.json
    <OUT_DIR>/feedback_integration_latest.md
    <OUT_DIR>/integrated_card_candidates_latest.md

Env (read-only):
    TENMON_DOCTOR_OUT_DIR           default: /opt/tenmon-automation/out
    TENMON_FEEDBACK_LOOP_OUT_DIR    default: <TENMON_DOCTOR_OUT_DIR>
    TENMON_FEEDBACK_HISTORY_URL     default: https://tenmon-ark.com/api/feedback/history
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request


GENERATOR_VERSION = "v1.0.0"


# ---- self-check (concatenated literals ensure this script never trips its own guard) ----
DENY_TOKENS = [
    "rm" + " -rf",
    "sys" + "temctl restart",
    "sys" + "temctl stop",
    "sys" + "temctl disable",
    "sys" + "temctl enable",
    "ng" + "inx -s",
    "rs" + "ync --delete",
    "PRA" + "GMA writable_schema",
    "DR" + "OP TABLE",
    "DEL" + "ETE FROM",
    "UPD" + "ATE ",
    "INS" + "ERT INTO",
    "pages" + ".create",
    "blocks.children" + ".append",
    "comments" + ".create",
    "PA" + "TCH ",
    "git pu" + "ll",
    "git fe" + "tch",
    "git cl" + "one",
    "pip ins" + "tall",
    "npm ins" + "tall",
    "apt ins" + "tall",
]


def self_check() -> None:
    """Refuse to run if forbidden subprocess / write-API literals appear in this script."""
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code_lines: list[str] = []
    for ln in src.splitlines():
        if ln.lstrip().startswith("#"):
            continue
        code_lines.append(ln)
    code = "\n".join(code_lines)
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[feedback_loop] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- env / paths ----
def _resolve_out_dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get(
        "TENMON_FEEDBACK_LOOP_OUT_DIR",
        os.environ.get("TENMON_DOCTOR_OUT_DIR", "/opt/tenmon-automation/out"),
    ))


def _resolve_feedback_history_url() -> str:
    return os.environ.get(
        "TENMON_FEEDBACK_HISTORY_URL",
        "https://tenmon-ark.com/api/feedback/history",
    )


def _safe_mkdir(p: pathlib.Path) -> None:
    """Refuse to mkdir under sensitive system roots."""
    forbidden_prefixes = (
        "/etc", "/usr", "/bin", "/sbin", "/lib", "/lib64",
        "/boot", "/dev", "/proc", "/sys", "/root",
    )
    p_str = str(p.resolve())
    for fp in forbidden_prefixes:
        if p_str == fp or p_str.startswith(fp + "/"):
            raise RuntimeError(f"refusing to mkdir under {fp}: {p_str}")
    p.mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


# ---- classification ----
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "chat_quality": ["答えが切れ", "短い", "途切れ", "詳しく", "長く話せ",
                     "応答が短", "もっと話", "切れる", "途切れる"],
    "tone":         ["丁寧", "敬語", "言葉遣い", "口調", "やわらか",
                     "断捨離", "口ぶり"],
    "knowledge":    ["言霊", "宿曜", "カタカムナ", "天津金木", "正典",
                     "法華経", "いろは", "ことだま", "祝詞"],
    "ui":           ["見えない", "ボタン", "画面", "Sidebar", "PWA",
                     "表示", "サイドバー", "レイアウト", "デザイン",
                     "ダッシュボード"],
    "performance":  ["遅い", "重い", "落ちる", "止まる", "応答が遅",
                     "レスポンス"],
    "bug":          ["エラー", "失敗", "おかしい", "動かない", "クラッシュ",
                     "バグ", "不具合", "同期されない"],
}


CATEGORY_TO_CARD: dict[str, str] = {
    "chat_quality": "CARD-CHAT-QUALITY-OBSERVE-V1",
    "tone":         "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1",
    "knowledge":    "CARD-IROHA-MC-CONNECTION-AUDIT-V1",
    "ui":           "CARD-PWA-UX-OBSERVE-V1",
    "performance":  "CARD-PERFORMANCE-OBSERVE-V1",
    "bug":          "CARD-BUG-TRIAGE-OBSERVE-V1",
    "other":        "CARD-FEEDBACK-TRIAGE-OBSERVE-V1",
}


TENMON_PRIORITY_BOOSTS: dict[str, int] = {
    "CARD-IROHA-MC-CONNECTION-AUDIT-V1":     4,
    "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1": 4,
}


CATEGORY_THRESHOLD = 3


API_CATEGORY_HINTS: list[tuple[str, str]] = [
    ("チャット", "chat_quality"),
    ("UI", "ui"),
    ("デザイン", "ui"),
    ("ダッシュボード", "ui"),
    ("レイアウト", "ui"),
    ("スマホ", "ui"),
    ("宿曜", "knowledge"),
    ("いろは", "knowledge"),
    ("ことだま", "knowledge"),
    ("正典", "knowledge"),
    ("法華経", "knowledge"),
    ("言霊", "knowledge"),
    ("不具合", "bug"),
    ("バグ", "bug"),
    ("エラー", "bug"),
    ("同期", "bug"),
    ("性能", "performance"),
    ("遅い", "performance"),
    ("重い", "performance"),
    ("口調", "tone"),
    ("敬語", "tone"),
    ("断捨離", "tone"),
]


def classify_text(text: str, api_category: str | None = None) -> str:
    """Classify by keyword on text first; fall back to API-side category label hint."""
    if text:
        for cat, kws in CATEGORY_KEYWORDS.items():
            for kw in kws:
                if kw in text:
                    return cat
    if api_category:
        for needle, cat in API_CATEGORY_HINTS:
            if needle in api_category:
                return cat
    return "other"


def _build_text_for_classification(item: dict) -> str:
    title = str(item.get("title") or "")
    detail = str(item.get("detail") or "")
    fallback = str(item.get("message") or item.get("body") or item.get("content") or "")
    parts = [s for s in (title, detail, fallback) if s]
    return " / ".join(parts)


# ---- doctor v2 report ----
def load_doctor_report(out_dir: pathlib.Path) -> dict | None:
    p = out_dir / "doctor_v2_report_latest.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        sys.stderr.write(f"[feedback_loop] failed to read doctor report: {e}\n")
        return None


# ---- feedback history fetch ----
def fetch_feedback_history(url: str, timeout: float = 10.0) -> tuple[int, list | None, str | None]:
    headers = {"User-Agent": "feedback-loop-card-generator/1.0",
               "Accept": "application/json"}
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = resp.status
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            return status, None, f"json decode error: {e}"
        items: list | None = None
        if isinstance(data, dict):
            if isinstance(data.get("items"), list):
                items = data["items"]
            elif isinstance(data.get("data"), list):
                items = data["data"]
        elif isinstance(data, list):
            items = data
        return status, items, None
    except urllib.error.HTTPError as e:
        return e.code, None, str(e)
    except Exception as e:
        return 0, None, str(e)


# ---- summarisation (no full body in outputs) ----
def _summarize_item(item: dict) -> dict:
    text = _build_text_for_classification(item)
    api_cat = str(item.get("category") or "")
    cat = classify_text(text, api_cat)
    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()[:8] if text else ""
    title_head = str(item.get("title") or "")[:60]
    return {
        "head": title_head,
        "sha": sha,
        "category": cat,
        "api_category": api_cat[:32],
        "priority": str(item.get("priority") or "")[:16],
        "is_founder": bool(item.get("isFounder", False)),
        "created_at": str(item.get("createdAt") or item.get("created_at") or "")[:32],
    }


def classify_feedback_items(items: list[dict]) -> dict:
    counts: collections.Counter = collections.Counter()
    api_counts: collections.Counter = collections.Counter()
    samples_by_cat: dict[str, list[dict]] = collections.defaultdict(list)
    summaries: list[dict] = []
    for it in items:
        s = _summarize_item(it)
        counts[s["category"]] += 1
        if s["api_category"]:
            api_counts[s["api_category"]] += 1
        if len(samples_by_cat[s["category"]]) < 3:
            samples_by_cat[s["category"]].append({"head": s["head"], "sha": s["sha"]})
        summaries.append(s)
    return {
        "counts": dict(counts),
        "api_category_counts": dict(api_counts),
        "samples": {k: v for k, v in samples_by_cat.items()},
        "summaries": summaries,
    }


# ---- candidate integration ----
_AREA_REPAIR_OVERRIDES: dict[str, str] = {
    "api":          "CARD-DOCTOR-V2-REPAIR-API-V1",
    "pwa":          "CARD-DOCTOR-V2-REPAIR-PWA-V1",
    "git":          "CARD-DOCTOR-V2-REPAIR-GIT-V1",
    "db":           "CARD-DOCTOR-V2-REPAIR-DB-V1",
    "safety":       "CARD-DOCTOR-V2-REPAIR-SAFETY-V1",
    "prompt_trace": "CARD-DOCTOR-V2-REPAIR-PROMPT-TRACE-V1",
}


def _suggest_repair_card(area: str | None) -> str:
    a = (area or "general").lower()
    if a in _AREA_REPAIR_OVERRIDES:
        return _AREA_REPAIR_OVERRIDES[a]
    return f"CARD-DOCTOR-V2-CRITICAL-{a.upper()}-REPAIR-V1"


def integrate_candidates(doctor: dict, feedback_class: dict) -> list[dict]:
    candidates: list[dict] = []
    seen: set[str] = set()

    def add(name: str, priority: int, reason: str, source: str) -> None:
        if not name or name in seen:
            return
        seen.add(name)
        candidates.append({
            "priority": priority,
            "name": name,
            "reason": reason,
            "source": source,
        })

    if doctor.get("verdict") == "RED":
        for f in (doctor.get("findings") or []):
            if f.get("level") == "critical":
                area = f.get("area", "")
                msg = (f.get("message") or "")[:80]
                add(
                    _suggest_repair_card(area),
                    priority=1,
                    reason=f"doctor RED: [{area}] {msg}",
                    source="doctor_v2",
                )

    online_status = doctor.get("online_status") or {}
    online = online_status.get("signals") if isinstance(online_status, dict) else None
    if isinstance(online, int):
        if online == 0:
            add("CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1",
                priority=1,
                reason="online_signals=0",
                source="doctor_v2")
        elif online <= 2:
            add("CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1",
                priority=2,
                reason=f"online_signals={online}",
                source="doctor_v2")

    counts = feedback_class.get("counts", {}) or {}
    for cat, n in sorted(counts.items(), key=lambda x: -x[1]):
        if n >= CATEGORY_THRESHOLD:
            card = CATEGORY_TO_CARD.get(cat, "CARD-FEEDBACK-TRIAGE-OBSERVE-V1")
            add(card,
                priority=2,
                reason=f"feedback {cat} count={n}",
                source="feedback_history")

    for s in (doctor.get("next_card_suggestions") or []):
        if isinstance(s, str) and s:
            add(s,
                priority=3,
                reason="doctor self-suggestion",
                source="doctor_v2")

    for card_name, base_pri in TENMON_PRIORITY_BOOSTS.items():
        if card_name not in seen:
            add(card_name,
                priority=base_pri,
                reason="TENMON main-line boost",
                source="tenmon_priority")

    candidates.sort(key=lambda x: (x["priority"], x["name"]))
    return candidates


# ---- output writers ----
def write_outputs(out_dir: pathlib.Path,
                  fb_url: str,
                  fb_status: int,
                  fb_error: str | None,
                  fb_items: list[dict] | None,
                  fb_class: dict,
                  doctor: dict | None,
                  candidates: list[dict],
                  generated_at: str) -> dict[str, pathlib.Path]:
    fb_total = len(fb_items) if isinstance(fb_items, list) else 0

    history_payload = {
        "fetched_at": generated_at,
        "url": fb_url,
        "status": fb_status,
        "error": fb_error,
        "count": fb_total,
        "items_summary": fb_class.get("summaries", []),
    }
    history_path = out_dir / "feedback_history_latest.json"
    history_path.write_text(
        json.dumps(history_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    integration_payload = {
        "version": GENERATOR_VERSION,
        "card": "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1",
        "generated_at": generated_at,
        "inputs": {
            "doctor_v2": {
                "available": doctor is not None,
                "verdict": (doctor or {}).get("verdict"),
                "profile": (doctor or {}).get("profile"),
                "online_signals": ((doctor or {}).get("online_status") or {}).get("signals"),
                "online_label":   ((doctor or {}).get("online_status") or {}).get("label"),
                "summary": (doctor or {}).get("summary"),
                "next_card_suggestions": (doctor or {}).get("next_card_suggestions"),
            },
            "feedback": {
                "url": fb_url,
                "fetched_status": fb_status,
                "fetched_error": fb_error,
                "count": fb_total,
                "by_category": fb_class.get("counts"),
                "by_api_category": fb_class.get("api_category_counts"),
            },
            "mc": {
                "auth_strategy": "C",
                "used": False,
                "note": "MC bearer token not used (strategy C)",
            },
        },
        "thresholds": {
            "category_min_for_card": CATEGORY_THRESHOLD,
        },
        "category_to_card": CATEGORY_TO_CARD,
        "tenmon_priority_boosts": TENMON_PRIORITY_BOOSTS,
        "integrated_card_candidates": candidates,
    }
    integration_path = out_dir / "feedback_integration_latest.json"
    integration_path.write_text(
        json.dumps(integration_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    md_lines: list[str] = []
    md_lines.append("# Feedback Loop Integration Report")
    md_lines.append("")
    md_lines.append(f"- generated_at: `{generated_at}`")
    md_lines.append(f"- card: `CARD-FEEDBACK-LOOP-CARD-GENERATION-V1`")
    md_lines.append(f"- doctor_v2_available: {doctor is not None}")
    md_lines.append(f"- doctor verdict: **{(doctor or {}).get('verdict', 'N/A')}**")
    md_lines.append(f"- doctor profile: {(doctor or {}).get('profile', 'N/A')}")
    md_lines.append(f"- online_signals: {((doctor or {}).get('online_status') or {}).get('signals', 'N/A')}")
    md_lines.append(f"- feedback fetched_status: {fb_status}")
    md_lines.append(f"- feedback count: {fb_total}")
    md_lines.append(f"- mc auth strategy: C (not used)")
    md_lines.append("")
    md_lines.append("## Feedback by classified category")
    md_lines.append("")
    counts = fb_class.get("counts", {}) or {}
    if counts:
        for cat, n in sorted(counts.items(), key=lambda x: -x[1]):
            md_lines.append(f"- {cat}: {n}")
    else:
        md_lines.append("- (no items)")
    md_lines.append("")
    md_lines.append("## Feedback by API-side category")
    md_lines.append("")
    api_counts = fb_class.get("api_category_counts", {}) or {}
    if api_counts:
        for cat, n in sorted(api_counts.items(), key=lambda x: -x[1]):
            md_lines.append(f"- `{cat}`: {n}")
    else:
        md_lines.append("- (none)")
    md_lines.append("")
    md_lines.append("## Integrated Card Candidates (top 10)")
    md_lines.append("")
    for c in candidates[:10]:
        md_lines.append(f"- [P{c['priority']}] **{c['name']}** ({c['source']})")
        md_lines.append(f"  - reason: {c['reason']}")
    integration_md_path = out_dir / "feedback_integration_latest.md"
    integration_md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    cm_lines: list[str] = []
    cm_lines.append("# Integrated Card Candidates")
    cm_lines.append("")
    cm_lines.append(f"- generated_at: `{generated_at}`")
    cm_lines.append(f"- doctor: verdict={(doctor or {}).get('verdict')}, "
                    f"profile={(doctor or {}).get('profile')}, "
                    f"signals={((doctor or {}).get('online_status') or {}).get('signals')}")
    cm_lines.append(f"- feedback total: {fb_total}")
    cm_lines.append(f"- mc auth strategy: C (not used)")
    cm_lines.append("")
    if not candidates:
        cm_lines.append("(no candidates)")
    for c in candidates:
        cm_lines.append(f"## P{c['priority']}: {c['name']}")
        cm_lines.append(f"- source: {c['source']}")
        cm_lines.append(f"- reason: {c['reason']}")
        cm_lines.append("")
    candidates_path = out_dir / "integrated_card_candidates_latest.md"
    candidates_path.write_text("\n".join(cm_lines), encoding="utf-8")

    return {
        "history": history_path,
        "integration_json": integration_path,
        "integration_md": integration_md_path,
        "candidates_md": candidates_path,
    }


# ---- main ----
def cmd_generate(_args: argparse.Namespace) -> int:
    out_dir = _resolve_out_dir()
    fb_url = _resolve_feedback_history_url()
    _safe_mkdir(out_dir)

    generated_at = _now_iso()

    doctor = load_doctor_report(out_dir)

    fb_status, fb_items, fb_error = fetch_feedback_history(fb_url)

    fb_class = classify_feedback_items(fb_items if isinstance(fb_items, list) else [])

    candidates = integrate_candidates(doctor or {}, fb_class)

    paths = write_outputs(
        out_dir=out_dir,
        fb_url=fb_url,
        fb_status=fb_status,
        fb_error=fb_error,
        fb_items=fb_items,
        fb_class=fb_class,
        doctor=doctor,
        candidates=candidates,
        generated_at=generated_at,
    )

    fb_total = len(fb_items) if isinstance(fb_items, list) else 0
    print(f"[feedback-loop] doctor_available={doctor is not None}")
    print(f"[feedback-loop] doctor_verdict={(doctor or {}).get('verdict')}")
    print(f"[feedback-loop] doctor_profile={(doctor or {}).get('profile')}")
    print(f"[feedback-loop] online_signals={((doctor or {}).get('online_status') or {}).get('signals')}")
    print(f"[feedback-loop] feedback_status={fb_status}")
    print(f"[feedback-loop] feedback_count={fb_total}")
    print(f"[feedback-loop] candidates={len(candidates)}")
    print(f"[feedback-loop] outputs:")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0


def main(argv: list[str] | None = None) -> int:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_feedback_loop_card_generator_v1",
        description="TENMON Feedback Loop Card Generator v1 (CARD-FEEDBACK-LOOP-CARD-GENERATION-V1)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("generate", help="Generate integrated card candidates (1 manual run)")
    args = parser.parse_args(argv)
    if args.cmd == "generate":
        return cmd_generate(args)
    parser.error(f"unknown command: {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
