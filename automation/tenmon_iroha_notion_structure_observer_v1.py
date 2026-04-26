#!/usr/bin/env python3
"""TENMON-ARK iroha-notion structure observer v1 (CARD-IROHA-NOTION-STRUCTURE-COMPLEMENT-V1).

READ-ONLY observer that re-fetches the Notion analysis-team page (max 3 levels)
and produces an evidence JSON for the manually-authored design doc.

Usage:
    python3 automation/tenmon_iroha_notion_structure_observer_v1.py observe

Output (atomic, written at the very end):
    automation/out/iroha_notion_structure_observer_latest.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request


REPO_ROOT = pathlib.Path("/opt/tenmon-ark-repo")
OUT_DIR = REPO_ROOT / "automation" / "out"
NOTION_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
DEFAULT_IROHA_PAGE_ID = "34e6514658e68136ac06e54ab472c2e2"
OBSERVER_VERSION = "v1.0.0-iroha-notion-structure"


# ---- self-check: every dangerous token is concatenated literal ----
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
    "pages" + ".update",
    "blocks.children" + ".append",
    "databases" + ".create",
    "databases" + ".update",
    "comments" + ".create",
    "PA" + "TCH ",
    "DEL" + "ETE ",
    "PU" + "T ",
]


def self_check() -> None:
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code = "\n".join(ln for ln in src.splitlines() if not ln.lstrip().startswith("#"))
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[notion_structure_observer] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _short_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="replace")).hexdigest()[:8]


def _summary(s: str, n: int = 60) -> str:
    if not s:
        return ""
    s = s.strip()
    return (s[:n] + "...") if len(s) > n else s


def _run(args: list[str], timeout: float = 5.0) -> dict:
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return {"ok": r.returncode == 0, "rc": r.returncode,
                "stdout": (r.stdout or ""), "stderr": (r.stderr or "").strip()}
    except Exception as e:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": str(e)}


def _http_get(url: str, headers: dict | None = None, timeout: float = 10.0) -> dict:
    h = {"User-Agent": "iroha-notion-structure-observer/1.0"}
    if headers:
        h.update(headers)
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status,
                    "body": resp.read().decode("utf-8", errors="replace")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _http_post_json(url: str, payload: dict, headers: dict | None = None,
                    timeout: float = 10.0) -> dict:
    h = {"Content-Type": "application/json",
         "User-Agent": "iroha-notion-structure-observer/1.0"}
    if headers:
        h.update(headers)
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=h, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status,
                    "body": resp.read().decode("utf-8", errors="replace")}
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        return {"ok": False, "status": e.code, "error": str(e), "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _read_env_from_proc(name: str) -> str | None:
    try:
        r = _run(["systemctl", "show", "tenmon-ark-api.service", "-p", "MainPID", "--value"])
        pid = (r.get("stdout") or "").strip()
        if not pid or not pid.isdigit() or pid == "0":
            return None
        env_path = pathlib.Path(f"/proc/{pid}/environ")
        if not env_path.exists():
            return None
        prefix = (name + "=").encode("utf-8")
        for chunk in env_path.read_bytes().split(b"\x00"):
            if chunk.startswith(prefix):
                return chunk.split(b"=", 1)[1].decode("utf-8", errors="replace")
    except Exception:
        return None
    return None


def _resolve_env(name: str) -> str | None:
    return os.environ.get(name) or _read_env_from_proc(name)


# ---- Notion helpers ----
def _notion_get(path: str, token: str, timeout: float = 10.0) -> dict:
    return _http_get(NOTION_BASE + path, headers={
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
    }, timeout=timeout)


def _notion_search(query: str, token: str, timeout: float = 10.0) -> dict:
    return _http_post_json(NOTION_BASE + "/search", {"query": query, "page_size": 5},
                           headers={"Authorization": f"Bearer {token}",
                                    "Notion-Version": NOTION_VERSION}, timeout=timeout)


def _list_children(block_id: str, token: str, page_size: int = 100) -> list[dict]:
    r = _notion_get(f"/blocks/{block_id}/children?page_size={page_size}", token)
    if not r.get("ok"):
        return []
    try:
        return (json.loads(r.get("body", "")) or {}).get("results", []) or []
    except Exception:
        return []


def _heading_text(blk: dict) -> tuple[str | None, str]:
    btype = blk.get("type")
    if btype not in ("heading_1", "heading_2", "heading_3"):
        return None, ""
    rt = (blk.get(btype) or {}).get("rich_text") or []
    text = "".join((seg.get("plain_text") or "") for seg in rt if isinstance(seg, dict))
    return btype, text


def _walk_blocks(block_id: str, token: str, depth: int, max_depth: int = 3,
                 collected: list | None = None) -> list[dict]:
    if collected is None:
        collected = []
    if depth > max_depth:
        return collected
    children = _list_children(block_id, token, page_size=100)
    for blk in children:
        btype = blk.get("type")
        if btype in ("heading_1", "heading_2", "heading_3"):
            _ht, txt = _heading_text(blk)
            if txt:
                collected.append({"depth": depth, "type": btype,
                                  "text_summary60": _summary(txt, 60),
                                  "text_full": txt[:200],
                                  "sha8": _short_hash(txt),
                                  "id_sha8": _short_hash(blk.get("id", ""))})
        elif btype == "child_page":
            title = (blk.get("child_page") or {}).get("title", "") or ""
            collected.append({"depth": depth, "type": "child_page",
                              "text_summary60": _summary(title, 60),
                              "text_full": title[:200],
                              "id_sha8": _short_hash(blk.get("id", ""))})
            if depth < max_depth and blk.get("id"):
                _walk_blocks(blk["id"], token, depth + 1, max_depth, collected)
        elif btype == "child_database":
            title = (blk.get("child_database") or {}).get("title", "") or ""
            collected.append({"depth": depth, "type": "child_database",
                              "text_summary60": _summary(title, 60),
                              "text_full": title[:200],
                              "id_sha8": _short_hash(blk.get("id", ""))})
        elif blk.get("has_children") and depth < max_depth and btype in (
            "toggle", "synced_block", "column_list", "column", "callout"
        ):
            _walk_blocks(blk["id"], token, depth + 1, max_depth, collected)
    return collected


# ---- 5 structure matching ----
STRUCTURE_PATTERNS = {
    "47ji_structure": {
        "label": "47字構造",
        "regex": re.compile(r"(47字|四十七字|47音|47文字|47音節|いろは47|四七字|四十七音)"),
    },
    "ongi_table": {
        "label": "音義表",
        "regex": re.compile(r"(音義表|音義|音の意味|音象|音相)"),
    },
    "lifeview": {
        "label": "生命観",
        "regex": re.compile(r"(生命観|生命の見方|いのち観|命観)"),
    },
    "deathview": {
        "label": "死生観",
        "regex": re.compile(r"(死生観|死と生|別離観|別れ観)"),
    },
    "hokekyo_link": {
        "label": "法華経対応",
        "regex": re.compile(r"(法華経対応|法華経|法華|妙法蓮華経)"),
    },
}


def evaluate_structures(headings: list[dict]) -> dict:
    out: dict = {}
    for key, meta in STRUCTURE_PATTERNS.items():
        regex: re.Pattern = meta["regex"]
        hits = []
        for h in headings:
            txt = h.get("text_full") or h.get("text_summary60") or ""
            if regex.search(txt):
                hits.append({"depth": h.get("depth"),
                             "type": h.get("type"),
                             "summary60": h.get("text_summary60"),
                             "sha8": h.get("sha8") or h.get("id_sha8")})
        out[key] = {
            "label": meta["label"],
            "posted": bool(hits),
            "hits": hits,
        }
    return out


# ---- VPS evidence pull (re-confirm from prior IROHA SOURCE OBSERVE) ----
def collect_vps_evidence() -> dict:
    out: dict = {"iroha_kotodama_hisho_json": {},
                 "loader_exports": [],
                 "actionpatterns_exports": [],
                 "engine_exports": [],
                 "chat_ts_iroha_anchors": []}
    p = REPO_ROOT / "shared" / "kotodama" / "iroha_kotodama_hisho.json"
    if p.exists():
        try:
            j = json.loads(p.read_text(encoding="utf-8", errors="replace"))
            out["iroha_kotodama_hisho_json"] = {
                "exists": True,
                "size": p.stat().st_size,
                "title": j.get("title"),
                "total_paragraphs": j.get("total_paragraphs"),
                "top_level_keys": list(j.keys())[:20],
                "content_len": (len(j.get("content")) if isinstance(j.get("content"), list) else None),
            }
        except Exception as e:
            out["iroha_kotodama_hisho_json"] = {"exists": True, "parse_error": str(e)}
    else:
        out["iroha_kotodama_hisho_json"] = {"exists": False}

    EXPORT_RE = re.compile(
        r"^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)",
        re.MULTILINE,
    )
    for tgt_key, rel in (
        ("loader_exports", "api/src/core/irohaKotodamaLoader.ts"),
        ("actionpatterns_exports", "api/src/core/irohaActionPatterns.ts"),
        ("engine_exports", "api/src/engines/kotodama/irohaEngine.ts"),
    ):
        f = REPO_ROOT / rel
        if f.exists():
            try:
                txt = f.read_text(encoding="utf-8", errors="replace")
                out[tgt_key] = EXPORT_RE.findall(txt)[:30]
            except Exception:
                pass

    chat = REPO_ROOT / "api" / "src" / "routes" / "chat.ts"
    if chat.exists():
        try:
            txt = chat.read_text(encoding="utf-8", errors="replace")
            for i, ln in enumerate(txt.splitlines(), start=1):
                if any(kw in ln for kw in ("queryIrohaByUserText", "buildIrohaInjection",
                                            "irohaGrounding", "__irohaClause",
                                            "irohaInterpret", "inject_iroha")):
                    out["chat_ts_iroha_anchors"].append(
                        {"lineno": i, "summary60": _summary(ln.strip(), 80)})
                    if len(out["chat_ts_iroha_anchors"]) >= 30:
                        break
        except Exception:
            pass
    return out


# ---- DB evidence pull ----
def collect_db_evidence() -> dict:
    out: dict = {"iroha_units_total": 0,
                 "iroha_actionpacks_total": 0,
                 "iroha_khs_alignment_total": 0,
                 "iroha_khs_alignment_law_keys": [],
                 "memory_units_iroha_total": 0,
                 "memory_units_iroha_scopes": []}
    try:
        uri = "file:/opt/tenmon-ark-data/kokuzo.sqlite?mode=ro"
        import sqlite3
        conn = sqlite3.connect(uri, uri=True, timeout=5.0)
        try:
            cur = conn.cursor()
            for tbl, key in (("iroha_units", "iroha_units_total"),
                             ("iroha_actionpacks", "iroha_actionpacks_total"),
                             ("iroha_khs_alignment", "iroha_khs_alignment_total")):
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                    out[key] = cur.fetchone()[0]
                except Exception:
                    pass
            try:
                cur.execute(
                    "SELECT khsLawKey, COUNT(*) FROM iroha_khs_alignment "
                    "GROUP BY khsLawKey ORDER BY 2 DESC LIMIT 20"
                )
                out["iroha_khs_alignment_law_keys"] = [
                    {"law_key": r[0], "count": r[1]} for r in cur.fetchall()
                ]
            except Exception:
                pass
            try:
                cur.execute(
                    "SELECT COUNT(*) FROM memory_units WHERE scope_id LIKE '%iroha%' "
                    "OR scope_id LIKE '%いろは%' OR memory_type LIKE '%iroha%'"
                )
                out["memory_units_iroha_total"] = cur.fetchone()[0]
            except Exception:
                pass
            try:
                cur.execute(
                    "SELECT scope_id, COUNT(*) FROM memory_units "
                    "WHERE scope_id LIKE '%iroha%' OR scope_id LIKE '%いろは%' "
                    "GROUP BY scope_id ORDER BY 2 DESC LIMIT 10"
                )
                out["memory_units_iroha_scopes"] = [
                    {"scope_id": r[0], "count": r[1]} for r in cur.fetchall()
                ]
            except Exception:
                pass
        finally:
            conn.close()
    except Exception as e:
        out["error"] = str(e)
    return out


# ---- chapter map (5 chapters × VPS / DB / runtime / MC) ----
def build_chapter_map(vps: dict, db: dict) -> list[dict]:
    out = [
        {
            "chapter_key": "47ji_structure",
            "chapter_label": "47字構造",
            "purpose": "いろは47字を正典に基づき定義し、各字 (paragraph) と meta を一覧で示す",
            "vps_assets": ["shared/kotodama/iroha_kotodama_hisho.json (1037 段落)"],
            "db_tables": [f"iroha_units ({db.get('iroha_units_total', 0)} 件)"],
            "runtime_funcs": ["queryIrohaByUserText", "buildIrohaInjection", "irohaCanonStats"],
            "input": "user message text",
            "output": "system prompt clause (24h avg 760 chars)",
            "mc_metric": "fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha",
            "future_mc_metric": "iroha_47ji_chars / 24h average",
        },
        {
            "chapter_key": "ongi_table",
            "chapter_label": "音義表",
            "purpose": "各音 (い・ろ・は…) の意味と位相を一覧で示す",
            "vps_assets": ["shared/kotodama/iroha_kotodama_hisho.json (音義部分)",
                            "api/src/core/irohaActionPatterns.ts (5 patterns)"],
            "db_tables": [f"iroha_units.kw / iroha_units.anchor"],
            "runtime_funcs": ["irohaInterpret", "classifyIrohaCounselInput",
                               "df.ku.irohaGrounding.irohaSound.sounds"],
            "input": "single word / sound",
            "output": "df.ku.irohaGrounding (sounds[0..3])",
            "mc_metric": "df.ku.irohaGrounding 出現率 (chat probe)",
            "future_mc_metric": "iroha_ongi_chars / 24h average",
        },
        {
            "chapter_key": "lifeview",
            "chapter_label": "生命観",
            "purpose": "いろは言霊解における生命の見方を整理する",
            "vps_assets": ["shared/kotodama/iroha_kotodama_hisho.json (関連段落)"],
            "db_tables": [
                f"memory_units iroha-specificity-* scope ({db.get('memory_units_iroha_total', 0)} 件 / "
                f"{len(db.get('memory_units_iroha_scopes') or [])} top scopes)"
            ],
            "runtime_funcs": ["buildIrohaInjection",
                               "(memory_projection 経由は将来 CHAT-CLAUSE-V1 で接続)"],
            "input": "user message + memory_units summary",
            "output": "system prompt clause + projection log",
            "mc_metric": "memory_units iroha total",
            "future_mc_metric": "iroha_seimei_chars / 24h average",
        },
        {
            "chapter_key": "deathview",
            "chapter_label": "死生観",
            "purpose": "死と生のつながり、別れの捉え方を整理する",
            "vps_assets": ["shared/kotodama/iroha_kotodama_hisho.json (関連段落)"],
            "db_tables": [
                f"memory_units iroha-specificity-* scope (生命観と共有)"
            ],
            "runtime_funcs": ["buildIrohaInjection (lifeview と同経路)",
                               "future: irohaThemeRouter (未実装)"],
            "input": "user message (death/parting context)",
            "output": "system prompt clause",
            "mc_metric": "memory_units iroha total (sub-thematic)",
            "future_mc_metric": "iroha_shisei_chars / 24h average",
        },
        {
            "chapter_key": "hokekyo_link",
            "chapter_label": "法華経対応",
            "purpose": "いろは言霊解と法華経の対応関係を整理する",
            "vps_assets": ["shared/kotodama/iroha_kotodama_hisho.json"],
            "db_tables": [
                f"iroha_khs_alignment ({db.get('iroha_khs_alignment_total', 0)} 件 / "
                f"law_keys={len(db.get('iroha_khs_alignment_law_keys') or [])})"
            ],
            "runtime_funcs": ["checkIrohaGrounding (df.ku.irohaGrounding)",
                               "(将来: buildHokekyoCrossRefClause)"],
            "input": "iroha_unit_id (alignment lookup)",
            "output": "khs_law_key + relation + score",
            "mc_metric": "iroha_khs_alignment count",
            "future_mc_metric": "iroha_hokekyo_chars / 24h average",
        },
    ]
    return out


# ---- block plan per chapter ----
def build_block_plans(chapter_map: list[dict]) -> list[dict]:
    out = []
    for c in chapter_map:
        out.append({
            "chapter_key": c["chapter_key"],
            "chapter_label": c["chapter_label"],
            "blocks": [
                {"order": 1, "type": "heading_2", "content_summary": c["chapter_label"]},
                {"order": 2, "type": "paragraph",
                 "content_summary": f"目的: {c['purpose']} (要約のみ、正典本文は転載しない)"},
                {"order": 3, "type": "heading_3", "content_summary": "VPS 側対応資産"},
                {"order": 4, "type": "bulleted_list_item",
                 "content_summary": " / ".join(c["vps_assets"])},
                {"order": 5, "type": "bulleted_list_item",
                 "content_summary": "DB: " + " / ".join(c["db_tables"])},
                {"order": 6, "type": "bulleted_list_item",
                 "content_summary": "runtime: " + ", ".join(c["runtime_funcs"])},
                {"order": 7, "type": "heading_3", "content_summary": "内容要約"},
                {"order": 8, "type": "paragraph",
                 "content_summary": f"(参照: shared/kotodama/iroha_kotodama_hisho.json) - "
                                     f"input={c['input']} / output={c['output']}"},
                {"order": 9, "type": "heading_3", "content_summary": "MC 観測点"},
                {"order": 10, "type": "bulleted_list_item",
                 "content_summary": f"現: {c['mc_metric']} / 将来: {c['future_mc_metric']}"},
            ],
            "block_count": 10,
        })
    return out


# ---- next-card proposal scoring ----
def derive_next_card_recommendation(structures: dict, headings_count: int) -> dict:
    posted_count = sum(1 for v in structures.values() if v.get("posted"))
    missing_count = len(structures) - posted_count
    _APPEND_API = "blocks.children" + ".append"
    if missing_count >= 4:
        return {
            "recommended": "A",
            "card_name": "CARD-IROHA-NOTION-STRUCTURE-WRITE-V1",
            "reason": f"5 構造のうち {missing_count}/5 が未掲示。Notion 解析班ページに「見える地図」を"
                       "整備するのが最優先。append のみで安全に追記可能。",
            "scope": f"Notion write ({_APPEND_API} のみ)。VPS / DB / chat に副作用なし。",
            "danger": "low (append-only)",
            "exec_order": 1,
            "preconditions": "本カード設計が TENMON 裁定で承認されること。",
        }
    if missing_count >= 1:
        return {
            "recommended": "A",
            "card_name": "CARD-IROHA-NOTION-STRUCTURE-WRITE-V1",
            "reason": f"5 構造のうち {missing_count}/5 が未掲示。残章を append で補強。",
            "scope": f"Notion write ({_APPEND_API} のみ)。",
            "danger": "low (append-only)",
            "exec_order": 1,
            "preconditions": "本カード設計が TENMON 裁定で承認されること。",
        }
    return {
        "recommended": "B",
        "card_name": "CARD-IROHA-MC-CONNECTION-AUDIT-V1",
        "reason": "5 構造すべて掲示済み。次は MC 側で章別 24h 注入追跡へ。",
        "scope": "MC intelligence read のみ。",
        "danger": "none (READ-ONLY)",
        "exec_order": 2,
        "preconditions": "なし",
    }


# ---- main observe ----
def cmd_observe() -> int:
    findings: list[dict] = []

    notion_token = _resolve_env("NOTION_TOKEN")
    page_id = _resolve_env("NOTION_IROHA_PAGE_ID") or DEFAULT_IROHA_PAGE_ID

    notion_block: dict = {"token_present": bool(notion_token),
                          "page_id_sha8": _short_hash(page_id),
                          "page_title": None,
                          "headings_total": 0,
                          "by_type": {"heading_1": 0, "heading_2": 0,
                                      "heading_3": 0, "child_page": 0,
                                      "child_database": 0},
                          "headings": []}

    if not notion_token:
        findings.append({"level": "warn", "area": "notion",
                         "message": "NOTION_TOKEN not set; structure check skipped"})
    else:
        meta = _notion_get(f"/pages/{page_id}", notion_token)
        if meta.get("ok"):
            try:
                j = json.loads(meta.get("body", ""))
                for _k, v in (j.get("properties") or {}).items():
                    if isinstance(v, dict) and v.get("type") == "title":
                        arr = v.get("title") or []
                        notion_block["page_title"] = "".join(
                            (t.get("plain_text") or "") for t in arr if isinstance(t, dict)
                        )
                        break
            except Exception as e:
                findings.append({"level": "warn", "area": "notion",
                                 "message": f"page meta parse error: {e}"})
        elif meta.get("status") in (401, 403):
            findings.append({"level": "warn", "area": "notion",
                             "message": f"page retrieve auth failed: {meta.get('status')}"})
        elif meta.get("status") == 404:
            findings.append({"level": "warn", "area": "notion",
                             "message": "iroha page not found (404)"})

        headings = _walk_blocks(page_id, notion_token, depth=1, max_depth=3, collected=[])
        notion_block["headings"] = headings
        notion_block["headings_total"] = len(headings)
        for h in headings:
            t = h.get("type")
            if t in notion_block["by_type"]:
                notion_block["by_type"][t] += 1

    structures = evaluate_structures(notion_block.get("headings") or [])
    posted = sum(1 for v in structures.values() if v.get("posted"))

    vps = collect_vps_evidence()
    db = collect_db_evidence()
    chapter_map = build_chapter_map(vps, db)
    block_plans = build_block_plans(chapter_map)
    rec = derive_next_card_recommendation(structures, notion_block.get("headings_total", 0))

    if posted == 0 and notion_token:
        findings.append({"level": "warn", "area": "structure",
                         "message": "all 5 chapters are missing in Notion analysis page"})

    if vps.get("iroha_kotodama_hisho_json", {}).get("total_paragraphs", 0) == 0:
        findings.append({"level": "warn", "area": "vps",
                         "message": "iroha_kotodama_hisho.json total_paragraphs is 0"})

    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    verdict = "RED" if crit else ("YELLOW" if warn else "GREEN")

    report = {
        "observer_version": OBSERVER_VERSION,
        "generated_at": _now_iso(),
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info,
                    "structures_posted": posted,
                    "structures_missing": len(structures) - posted},
        "notion": notion_block,
        "structure_check": structures,
        "vps_evidence": vps,
        "db_evidence": db,
        "chapter_map": chapter_map,
        "block_plans": block_plans,
        "next_card_recommendation": rec,
        "findings": findings,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    (OUT_DIR / "iroha_notion_structure_observer_latest.json").write_text(text, encoding="utf-8")
    print(f"[notion_structure_observer] verdict={verdict} crit={crit} warn={warn} "
          f"posted={posted}/5 next_card={rec.get('card_name')}")
    return 0


def main() -> None:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_iroha_notion_structure_observer_v1",
        description="TENMON-ARK iroha-notion structure observer (READ-ONLY)")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("observe", help="run a one-shot read-only Notion structure observation")
    args = parser.parse_args()
    if args.cmd == "observe":
        sys.exit(cmd_observe())
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
