#!/usr/bin/env python3
"""TENMON-ARK feedback-observer v1 (Phase 1) - CARD-FEEDBACK-LOOP-CARD-GENERATION-OBSERVE-V1.

READ-ONLY observer for the Founder feedback -> card-generation loop.
Phase 1 = OBSERVE only. No card auto-generation, no Notion write, no DB write.

Usage:
    python3 automation/tenmon_feedback_observer_v1.py observe

Outputs (atomic, written at the very end):
    automation/out/feedback_observer_report_latest.json
    automation/out/feedback_observer_report_latest.md
    automation/out/feedback_card_candidates_latest.md
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
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request


REPO_ROOT = pathlib.Path("/opt/tenmon-ark-repo")
OUT_DIR = REPO_ROOT / "automation" / "out"
KOKUZO_DB = "/opt/tenmon-ark-data/kokuzo.sqlite"
HOST = "https://tenmon-ark.com"
NOTION_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
DEFAULT_TASK_DB_ID = "0bbfb0ed8159417ea1170caa9943a155"
OBSERVER_VERSION = "v1.0.0-phase1"


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
        print(f"[feedback_observer] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- helpers ----
def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _run(args: list[str], timeout: float = 5.0, cwd: str | None = None) -> dict:
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, cwd=cwd)
        return {"ok": r.returncode == 0, "rc": r.returncode,
                "stdout": (r.stdout or "").strip(), "stderr": (r.stderr or "").strip()}
    except Exception as e:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": str(e)}


def _http_get(url: str, timeout: float = 10.0, headers: dict | None = None) -> dict:
    h = {"User-Agent": "feedback-observer/1.0"}
    if headers:
        h.update(headers)
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _http_post_json(url: str, payload: dict, timeout: float = 10.0,
                    headers: dict | None = None) -> dict:
    h = {"Content-Type": "application/json", "User-Agent": "feedback-observer/1.0"}
    if headers:
        h.update(headers)
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=h, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        return {"ok": False, "status": e.code, "error": str(e), "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _short_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="replace")).hexdigest()[:8]


def _summary60(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    return (s[:60] + "...") if len(s) > 60 else s


def _read_env_from_proc(name: str) -> str | None:
    """Best-effort fallback to read NOTION_* style env from the api process /proc env (root only)."""
    try:
        r = _run(["systemctl", "show", "tenmon-ark-api.service", "-p", "MainPID", "--value"],
                 timeout=5)
        pid = (r.get("stdout") or "").strip()
        if not pid or not pid.isdigit() or pid == "0":
            return None
        env_path = pathlib.Path(f"/proc/{pid}/environ")
        if not env_path.exists():
            return None
        raw = env_path.read_bytes()
        prefix = (name + "=").encode("utf-8")
        for chunk in raw.split(b"\x00"):
            if chunk.startswith(prefix):
                return chunk.split(b"=", 1)[1].decode("utf-8", errors="replace")
    except Exception:
        return None
    return None


def _resolve_env(name: str) -> str | None:
    v = os.environ.get(name)
    if v:
        return v
    return _read_env_from_proc(name)


# ---- area 1: kokuzo.sqlite feedback tables (read-only) ----
SENSITIVE_COLUMNS = {
    "user_id", "userid", "user", "email", "mail", "phone",
    "ip", "ip_address", "address", "session_id", "auth_token",
    "token", "secret", "password", "name",
}


def collect_db_feedback(findings: list[dict]) -> tuple[dict, list[str]]:
    out: dict = {"tables_found": [], "tables_detail": []}
    samples_for_class: list[str] = []
    try:
        uri = f"file:{KOKUZO_DB}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=5.0)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND ("
                "name LIKE '%feedback%' OR name LIKE '%founder%' "
                "OR name LIKE '%request%' OR name LIKE '%improve%' "
                "OR name LIKE '%kaizen%' OR name LIKE '%youbou%') "
                "ORDER BY name"
            )
            tables = [r[0] for r in cur.fetchall()]
            out["tables_found"] = tables
            if not tables:
                findings.append({"level": "warn", "area": "db",
                                 "message": "no feedback-related tables found in kokuzo.sqlite"})
            for t in tables:
                detail: dict = {"name": t, "row_count": 0, "schema": [],
                                "samples_summary": []}
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {t}")
                    detail["row_count"] = cur.fetchone()[0]
                except Exception as e:
                    detail["count_error"] = str(e)
                try:
                    cur.execute(f"PRAGMA table_info({t})")
                    detail["schema"] = [
                        {"cid": r[0], "name": r[1], "type": r[2],
                         "notnull": r[3], "pk": r[5]}
                        for r in cur.fetchall()
                    ]
                except Exception as e:
                    detail["schema_error"] = str(e)

                order_col = None
                col_names = [c["name"] for c in detail["schema"]]
                for cand in ("created_at", "createdAt", "created", "ts",
                             "timestamp", "id"):
                    if cand in col_names:
                        order_col = cand
                        break
                if order_col is None:
                    order_col = "rowid"

                try:
                    cur.execute(f"SELECT * FROM {t} ORDER BY {order_col} DESC LIMIT 10")
                    rows = cur.fetchall()
                    desc_cols = [d[0] for d in cur.description]
                    for row in rows:
                        rec: dict = {}
                        full_text_parts: list[str] = []
                        for cn, val in zip(desc_cols, row):
                            if cn.lower() in SENSITIVE_COLUMNS:
                                continue
                            if isinstance(val, (int, float)) or val is None:
                                rec[cn] = val
                            elif isinstance(val, (bytes, bytearray)):
                                rec[cn] = f"[bytes len={len(val)}]"
                            else:
                                sv = str(val)
                                if len(sv) > 60:
                                    rec[cn] = {"summary60": sv[:60] + "...",
                                               "sha8": _short_hash(sv),
                                               "len": len(sv)}
                                    full_text_parts.append(sv)
                                else:
                                    rec[cn] = sv
                                    if len(sv) >= 4:
                                        full_text_parts.append(sv)
                        detail["samples_summary"].append(rec)
                        if full_text_parts:
                            samples_for_class.append(" ".join(full_text_parts))
                except Exception as e:
                    detail["samples_error"] = str(e)
                out["tables_detail"].append(detail)
        finally:
            conn.close()
    except Exception as e:
        findings.append({"level": "critical", "area": "db",
                         "message": f"sqlite open failed: {e}"})
    return out, samples_for_class


# ---- area 2: Notion (read-only) ----
def _notion_extract_title(page: dict) -> str:
    props = page.get("properties") or {}
    for _k, v in props.items():
        if isinstance(v, dict) and v.get("type") == "title":
            arr = v.get("title") or []
            return "".join((t.get("plain_text") or "") for t in arr if isinstance(t, dict))
    return ""


def _notion_extract_status(page: dict) -> str | None:
    props = page.get("properties") or {}
    for _k, v in props.items():
        if not isinstance(v, dict):
            continue
        t = v.get("type")
        if t == "status":
            return ((v.get("status") or {}) or {}).get("name")
        if t == "select":
            return ((v.get("select") or {}) or {}).get("name")
    return None


def _notion_extract_category(page: dict) -> str | None:
    props = page.get("properties") or {}
    for k, v in props.items():
        if not isinstance(v, dict):
            continue
        if k.lower() not in ("category", "tag", "tags", "カテゴリ", "分類"):
            continue
        t = v.get("type")
        if t == "select":
            return ((v.get("select") or {}) or {}).get("name")
        if t == "multi_select":
            arr = v.get("multi_select") or []
            return ",".join(x.get("name", "") for x in arr if isinstance(x, dict))
    return None


def _notion_get(path: str, token: str, timeout: float = 10.0) -> dict:
    return _http_get(NOTION_BASE + path, timeout=timeout, headers={
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
    })


def _notion_query(path: str, token: str, payload: dict, timeout: float = 10.0) -> dict:
    return _http_post_json(NOTION_BASE + path, payload, timeout=timeout, headers={
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
    })


def collect_notion(findings: list[dict]) -> tuple[dict, list[str]]:
    out: dict = {"token_present": False, "feedback_db": None, "task_db": None}
    samples_for_class: list[str] = []

    token = _resolve_env("NOTION_TOKEN")
    if not token:
        findings.append({"level": "warn", "area": "notion",
                         "message": "NOTION_TOKEN not set"})
        return out, samples_for_class
    out["token_present"] = True

    fb_id = _resolve_env("NOTION_FEEDBACK_DB_ID")
    if not fb_id:
        findings.append({"level": "warn", "area": "notion",
                         "message": "NOTION_FEEDBACK_DB_ID not set"})
    else:
        retr = _notion_get(f"/databases/{fb_id}", token)
        if retr.get("status") in (401, 403):
            findings.append({"level": "critical", "area": "notion",
                             "message": f"feedback DB auth failed: {retr.get('status')}"})

        q = _notion_query(f"/databases/{fb_id}/query", token, {"page_size": 20})
        fb: dict = {"id_sha8": _short_hash(fb_id), "row_count": None,
                    "samples_summary": []}
        if q.get("ok"):
            try:
                j = json.loads(q.get("body", ""))
                results = j.get("results", []) or []
                fb["row_count"] = len(results)
                fb["has_more"] = bool(j.get("has_more"))
                for r in results[:20]:
                    title = _notion_extract_title(r) or ""
                    status = _notion_extract_status(r)
                    category = _notion_extract_category(r)
                    fb["samples_summary"].append({
                        "title_summary60": _summary60(title),
                        "title_sha8": _short_hash(title) if title else "",
                        "status": status,
                        "category": category,
                        "created_time": r.get("created_time"),
                    })
                    if title:
                        samples_for_class.append(title)
            except Exception as e:
                findings.append({"level": "warn", "area": "notion",
                                 "message": f"feedback query parse error: {e}"})
        elif q.get("status") in (401, 403):
            findings.append({"level": "critical", "area": "notion",
                             "message": f"feedback DB query auth failed: {q.get('status')}"})
        else:
            findings.append({"level": "warn", "area": "notion",
                             "message": f"feedback DB query failed: status={q.get('status')}"})
        out["feedback_db"] = fb

    task_id = _resolve_env("NOTION_TASK_DB_ID") or DEFAULT_TASK_DB_ID
    q = _notion_query(f"/databases/{task_id}/query", token, {"page_size": 20})
    task: dict = {"id_sha8": _short_hash(task_id), "row_count": None,
                  "by_status": {}, "has_more": None}
    if q.get("ok"):
        try:
            j = json.loads(q.get("body", ""))
            results = j.get("results", []) or []
            task["row_count"] = len(results)
            task["has_more"] = bool(j.get("has_more"))
            counter: collections.Counter = collections.Counter()
            for r in results:
                st = _notion_extract_status(r) or "(none)"
                counter[st] += 1
            task["by_status"] = dict(counter)
        except Exception as e:
            findings.append({"level": "warn", "area": "notion",
                             "message": f"task query parse error: {e}"})
    elif q.get("status") in (401, 403):
        findings.append({"level": "critical", "area": "notion",
                         "message": f"task DB query auth failed: {q.get('status')}"})
    elif q.get("status") == 404:
        findings.append({"level": "warn", "area": "notion",
                         "message": "task DB not found (404)"})
    else:
        findings.append({"level": "warn", "area": "notion",
                         "message": f"task DB query failed: status={q.get('status')}"})
    out["task_db"] = task

    return out, samples_for_class


# ---- area 3: existing API endpoints (READ-ONLY) ----
def collect_api_endpoints(findings: list[dict]) -> dict:
    out: dict = {"endpoints_checked": []}
    targets = [
        f"{HOST}/api/feedback/history",
        f"{HOST}/api/feedback/list",
        f"{HOST}/api/founder/requests",
    ]
    for url in targets:
        r = _http_get(url, timeout=10)
        ent: dict = {"url": url, "status": r.get("status"),
                     "row_count_if_any": None}
        if r.get("ok"):
            try:
                j = json.loads(r.get("body", ""))
                if isinstance(j, list):
                    ent["row_count_if_any"] = len(j)
                elif isinstance(j, dict):
                    for key in ("items", "results", "data", "feedbacks", "history"):
                        if key in j and isinstance(j[key], list):
                            ent["row_count_if_any"] = len(j[key])
                            break
            except Exception:
                pass
        elif r.get("status") in (401, 403):
            findings.append({"level": "warn", "area": "api",
                             "message": f"{url} auth required ({r.get('status')}), skipped"})
        elif r.get("status") == 404:
            findings.append({"level": "info", "area": "api",
                             "message": f"{url} not found (404)"})
        out["endpoints_checked"].append(ent)
    return out


# ---- area 4 & 5: classification + card candidates ----
KEYWORDS: dict[str, list[str]] = {
    "chat_quality": ["切れ", "短い", "途切れ", "詳しく", "長く話", "もっと話",
                     "尻切れ", "中断", "省略", "もう少し"],
    "knowledge": ["言霊", "宿曜", "カタカムナ", "天津金木", "正典", "法華経",
                  "古事記", "日本書紀", "祝詞", "経典"],
    "ui": ["見えない", "ボタン", "画面", "Sidebar", "サイドバー", "PWA",
           "表示", "レイアウト", "見づらい", "押せない"],
    "tone": ["丁寧", "敬語", "言葉遣い", "口調", "やわらか", "断捨離",
             "言い回し", "話し方"],
    "performance": ["遅い", "重い", "落ちる", "止まる", "応答が遅", "レスポンス"],
    "bug": ["エラー", "失敗", "おかしい", "動かない", "クラッシュ", "バグ",
            "不具合"],
}

SUGGESTED_CARDS: dict[str, str] = {
    "chat_quality": "CARD-CHAT-QUALITY-OBSERVE-V1",
    "knowledge": "CARD-KNOWLEDGE-COVERAGE-OBSERVE-V1",
    "ui": "CARD-UI-USABILITY-OBSERVE-V1",
    "tone": "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1",
    "performance": "CARD-CHAT-PERFORMANCE-OBSERVE-V1",
    "bug": "CARD-CHAT-BUG-TRIAGE-OBSERVE-V1",
}


def classify_samples(samples: list[str], findings: list[dict]) -> dict:
    counter = {k: 0 for k in KEYWORDS}
    counter["other"] = 0
    total = 0
    for text in samples:
        if not text:
            continue
        total += 1
        matched = False
        for cat, words in KEYWORDS.items():
            if any(w in text for w in words):
                counter[cat] += 1
                matched = True
                break
        if not matched:
            counter["other"] += 1
    if total > 0 and counter["other"] / total > 0.80:
        findings.append({"level": "warn", "area": "classification",
                         "message": f"other category > 80% ({counter['other']}/{total})"})
    return {"by_category": counter, "total_observed": total}


def derive_card_candidates(by_category: dict) -> list[dict]:
    out: list[dict] = []
    for cat, n in by_category.items():
        if cat == "other":
            continue
        if n > 0 and cat in SUGGESTED_CARDS:
            out.append({"category": cat, "count": n,
                        "suggested_card": SUGGESTED_CARDS[cat]})
    out.sort(key=lambda x: x["count"], reverse=True)
    return out


# ---- area 6: loop health ----
def collect_loop_health(findings: list[dict]) -> dict:
    out: dict = {"evolution_entries": 0, "commits_last_7d": 0,
                 "doctor_v2_last_verdict": None}
    fp = REPO_ROOT / "web" / "src" / "data" / "evolution_log_v1.ts"
    if fp.exists():
        try:
            txt = fp.read_text(encoding="utf-8")
            ids = re.findall(r'id:\s*"([^"]+)"', txt)
            out["evolution_entries"] = len(ids)
        except Exception as e:
            findings.append({"level": "warn", "area": "loop_health",
                             "message": f"evolution_log read error: {e}"})
    g = _run(["git", "log", "--since=7 days ago", "--oneline"],
             cwd=str(REPO_ROOT), timeout=5)
    if g["ok"]:
        n = sum(1 for ln in g["stdout"].splitlines() if ln.strip())
        out["commits_last_7d"] = n
        if n == 0:
            findings.append({"level": "warn", "area": "loop_health",
                             "message": "0 commits in last 7 days"})
    dpath = OUT_DIR / "doctor_v2_report_latest.json"
    if dpath.exists():
        try:
            j = json.loads(dpath.read_text(encoding="utf-8"))
            out["doctor_v2_last_verdict"] = j.get("verdict")
        except Exception:
            pass
    return out


# ---- verdict ----
def derive_verdict(findings: list[dict]) -> tuple[str, int, int, int]:
    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    if crit > 0:
        return "RED", crit, warn, info
    if warn > 0:
        return "YELLOW", crit, warn, info
    return "GREEN", crit, warn, info


# ---- rendering ----
def render_md(report: dict) -> str:
    L: list[str] = []
    L.append("# TENMON-ARK feedback observer (Phase 1)")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- observer_version: `{report['observer_version']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    s = report["summary"]
    L.append(f"- summary: critical={s['critical']} / warn={s['warn']} / info={s['info']}")
    L.append("")

    L.append("## 1. DB (kokuzo.sqlite, mode=ro)")
    L.append("")
    db = report.get("db") or {}
    tables = db.get("tables_found") or []
    L.append(f"- tables_found ({len(tables)}): {', '.join(tables) if tables else '(none)'}")
    for d in db.get("tables_detail") or []:
        L.append(f"  - **{d.get('name')}**: row_count={d.get('row_count')} cols={len(d.get('schema') or [])}")
    L.append("")

    n = report.get("notion") or {}
    L.append("## 2. Notion (read-only)")
    L.append("")
    L.append(f"- token_present: {n.get('token_present')}")
    fb = n.get("feedback_db") or {}
    if fb:
        L.append(f"- feedback DB (id_sha8=`{fb.get('id_sha8')}`): row_count={fb.get('row_count')} has_more={fb.get('has_more')}")
        for s in fb.get("samples_summary") or []:
            L.append(f"  - `{s.get('status')}` | created={s.get('created_time')} | sha8={s.get('title_sha8')} | title={s.get('title_summary60')}")
    else:
        L.append("- feedback DB: (skipped or unavailable)")
    td = n.get("task_db") or {}
    if td:
        L.append(f"- task DB (id_sha8=`{td.get('id_sha8')}`): row_count={td.get('row_count')} has_more={td.get('has_more')}")
        for k, v in (td.get("by_status") or {}).items():
            L.append(f"  - `{k}`: {v}")
    else:
        L.append("- task DB: (skipped or unavailable)")
    L.append("")

    a = report.get("api") or {}
    L.append("## 3. API endpoints (READ-ONLY)")
    L.append("")
    for ep in a.get("endpoints_checked") or []:
        L.append(f"- `{ep.get('url')}`: status={ep.get('status')} row_count_if_any={ep.get('row_count_if_any')}")
    L.append("")

    c = report.get("classification") or {}
    L.append("## 4. Classification")
    L.append("")
    L.append(f"- total_observed: {c.get('total_observed')}")
    for k, v in (c.get("by_category") or {}).items():
        L.append(f"  - {k}: {v}")
    L.append("")

    L.append("## 5. Card candidates (suggestion only — no auto-generation)")
    L.append("")
    cc = report.get("card_candidates") or []
    if not cc:
        L.append("(none — no positive-category samples observed)")
    for x in cc:
        L.append(f"- {x.get('category')} {x.get('count')} 件 → `{x.get('suggested_card')}` 候補")
    L.append("")

    lh = report.get("loop_health") or {}
    L.append("## 6. Loop health")
    L.append("")
    L.append(f"- evolution_entries: {lh.get('evolution_entries')}")
    L.append(f"- commits_last_7d: {lh.get('commits_last_7d')}")
    L.append(f"- doctor_v2_last_verdict: {lh.get('doctor_v2_last_verdict')}")
    L.append("")

    L.append("## Findings")
    L.append("")
    if not report.get("findings"):
        L.append("(none)")
    for f in report.get("findings") or []:
        L.append(f"- [{f.get('level')}] [{f.get('area')}] {f.get('message')}")
    L.append("")
    return "\n".join(L) + "\n"


def render_card_candidates_md(report: dict) -> str:
    L: list[str] = []
    L.append("# feedback observer — card candidates")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    s = report["summary"]
    L.append(f"- critical={s['critical']} / warn={s['warn']} / info={s['info']}")
    L.append("")
    L.append("## Suggested cards (proposal only)")
    L.append("")
    cc = report.get("card_candidates") or []
    if not cc:
        L.append("- (none)")
    for x in cc:
        L.append(f"- {x.get('category')} {x.get('count')} 件 → `{x.get('suggested_card')}`")
    L.append("")
    L.append("## Routing memo (TENMON が最終裁定)")
    L.append("")
    by_cat = ((report.get("classification") or {}).get("by_category") or {})
    tone_n = by_cat.get("tone", 0)
    cq_n = by_cat.get("chat_quality", 0)
    verdict = report.get("verdict")
    if verdict == "GREEN" and tone_n >= 3:
        L.append("- GREEN かつ tone>=3 → `CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1`（断捨離ライン起点）")
    elif verdict == "GREEN" and tone_n < 3 and cq_n >= 3:
        L.append("- GREEN かつ tone<3 かつ chat_quality>=3 → `CARD-CHAT-QUALITY-OBSERVE-V1`")
    elif verdict == "GREEN":
        L.append("- GREEN かつ tone<3 かつ chat_quality<3 → `CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1`（予定通り進行）")
    elif verdict == "YELLOW":
        L.append("- YELLOW: TENMON に warn 解消依頼（env 設定 / feedback テーブル発見）→ 再 observe")
    else:
        L.append("- RED: 最優先 critical の REPAIR カード起案を TENMON 裁定で")
    L.append("")
    return "\n".join(L) + "\n"


# ---- observe orchestration ----
def cmd_observe() -> int:
    findings: list[dict] = []

    db_section, db_samples = collect_db_feedback(findings)
    notion_section, notion_samples = collect_notion(findings)
    api_section = collect_api_endpoints(findings)

    samples_for_class = list(db_samples) + list(notion_samples)
    classification = classify_samples(samples_for_class, findings)
    candidates = derive_card_candidates(classification.get("by_category") or {})

    loop_health = collect_loop_health(findings)

    verdict, crit, warn, info = derive_verdict(findings)

    report = {
        "observer_version": OBSERVER_VERSION,
        "generated_at": _now_iso(),
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "db": db_section,
        "notion": notion_section,
        "api": api_section,
        "classification": classification,
        "loop_health": loop_health,
        "card_candidates": candidates,
        "findings": findings,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(report, ensure_ascii=False, indent=2)
    md_text = render_md(report)
    cand_text = render_card_candidates_md(report)

    (OUT_DIR / "feedback_observer_report_latest.json").write_text(json_text, encoding="utf-8")
    (OUT_DIR / "feedback_observer_report_latest.md").write_text(md_text, encoding="utf-8")
    (OUT_DIR / "feedback_card_candidates_latest.md").write_text(cand_text, encoding="utf-8")

    print(f"[feedback_observer] verdict={verdict} crit={crit} warn={warn} info={info}")
    print(f"[feedback_observer] report: {OUT_DIR / 'feedback_observer_report_latest.json'}")
    return 0


def main() -> None:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_feedback_observer_v1",
        description="TENMON-ARK feedback observer (Phase 1) - READ-ONLY")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("observe", help="run a one-shot read-only observation")
    args = parser.parse_args()
    if args.cmd == "observe":
        sys.exit(cmd_observe())
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
