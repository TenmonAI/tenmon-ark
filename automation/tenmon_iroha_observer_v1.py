#!/usr/bin/env python3
"""TENMON-ARK iroha-kotodama observer v1 (Phase 1) - CARD-IROHA-KOTODAMA-SOURCE-OBSERVE-V1.

READ-ONLY observer that asks: how deeply is the IROHA-Kotodama-Kai connected
to TENMON-ARK across 5 layers?

  Layer 1 resource : shared/ docs/ ファイル群
  Layer 2 db       : iroha_units / memory_units / source_registry
  Layer 3 loader   : irohaKotodamaLoader.ts 等
  Layer 4 engine   : irohaEngine.ts / irohaActionPatterns.ts
  Layer 5 chat     : chat.ts での参照 + PromptTrace iroha 系 chars

Usage:
    python3 automation/tenmon_iroha_observer_v1.py observe

Outputs (atomic, written at the very end):
    automation/out/iroha_observer_report_latest.json
    automation/out/iroha_observer_report_latest.md
    docs/ark/iroha/IROHA_KOTODAMA_SOURCE_OBSERVE_V1.md
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import glob as glob_mod
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
DOCS_DIR = REPO_ROOT / "docs" / "ark" / "iroha"
KOKUZO_DB = "/opt/tenmon-ark-data/kokuzo.sqlite"
HOST = "https://tenmon-ark.com"
NOTION_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
DEFAULT_IROHA_PAGE_ID = "34e6514658e68136ac06e54ab472c2e2"
OBSERVER_VERSION = "v1.0.0-iroha-phase1"


# ---- self-check (concatenated literals so this script is not its own false-positive) ----
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
    "DEL" + "ETE ",
    "PU" + "T ",
]


def self_check() -> None:
    """Refuse to run if forbidden literals appear in this script (comments excluded)."""
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code_lines: list[str] = []
    for ln in src.splitlines():
        if ln.lstrip().startswith("#"):
            continue
        code_lines.append(ln)
    code = "\n".join(code_lines)
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[iroha_observer] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- helpers ----
def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _short_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="replace")).hexdigest()[:8]


def _summary(s: str, n: int = 60) -> str:
    if not s:
        return ""
    s = s.strip()
    return (s[:n] + "...") if len(s) > n else s


def _run(args: list[str], timeout: float = 5.0, cwd: str | None = None) -> dict:
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, cwd=cwd)
        return {"ok": r.returncode == 0, "rc": r.returncode,
                "stdout": (r.stdout or ""), "stderr": (r.stderr or "").strip()}
    except Exception as e:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": str(e)}


def _http_get(url: str, timeout: float = 10.0, headers: dict | None = None) -> dict:
    h = {"User-Agent": "iroha-observer/1.0"}
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
    h = {"Content-Type": "application/json", "User-Agent": "iroha-observer/1.0"}
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


def _read_env_from_proc(name: str) -> str | None:
    try:
        r = _run(["systemctl", "show", "tenmon-ark-api.service", "-p", "MainPID", "--value"])
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
    return os.environ.get(name) or _read_env_from_proc(name)


# ---- area 1: VPS resources ----
IROHA_REGEX = re.compile(r"(iroha|Iroha|IROHA|いろは|イロハ)")


def _file_meta(p: pathlib.Path) -> dict:
    out: dict = {"path": str(p.relative_to(REPO_ROOT) if p.is_absolute() else p),
                 "exists": p.exists()}
    if not p.exists():
        return out
    try:
        st = p.stat()
        out["size"] = st.st_size
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
            out["lines"] = txt.count("\n") + 1
            out["sha256_short"] = hashlib.sha256(txt.encode("utf-8", errors="replace")).hexdigest()[:12]
            if p.suffix.lower() == ".json":
                try:
                    j = json.loads(txt)
                    if isinstance(j, dict):
                        out["top_level_keys"] = list(j.keys())[:20]
                        out["top_level_keys_count"] = len(j.keys())
                except Exception:
                    pass
        except Exception:
            pass
    except Exception:
        pass
    return out


def collect_vps_resources(findings: list[dict]) -> dict:
    out: dict = {
        "iroha_kotodama_hisho_json": {},
        "shared_iroha_files": [],
        "docs_iroha_files": [],
    }
    primary = REPO_ROOT / "shared" / "kotodama" / "iroha_kotodama_hisho.json"
    out["iroha_kotodama_hisho_json"] = _file_meta(primary)

    for root in [REPO_ROOT / "shared"]:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            try:
                if p.is_file() and IROHA_REGEX.search(p.name):
                    out["shared_iroha_files"].append(_file_meta(p))
            except Exception:
                pass
    for root in [REPO_ROOT / "docs"]:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            try:
                if p.is_file() and IROHA_REGEX.search(p.name):
                    out["docs_iroha_files"].append(_file_meta(p))
            except Exception:
                pass

    if not out["iroha_kotodama_hisho_json"].get("exists"):
        findings.append({"level": "warn", "area": "resource",
                         "message": "shared/kotodama/iroha_kotodama_hisho.json not found"})
    return out


# ---- area 1-2: engine / core / loader ----
EXPORT_RE = re.compile(
    r"^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)",
    re.MULTILINE,
)


def _ts_meta(p: pathlib.Path) -> dict:
    out = _file_meta(p)
    if out.get("exists"):
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
            out["exports"] = EXPORT_RE.findall(txt)[:30]
        except Exception:
            out["exports"] = []
    return out


def collect_engine_loader(findings: list[dict]) -> dict:
    api_src = REPO_ROOT / "api" / "src"
    out: dict = {
        "irohaEngine_ts": _ts_meta(api_src / "engines" / "kotodama" / "irohaEngine.ts"),
        "irohaActionPatterns_ts": _ts_meta(api_src / "core" / "irohaActionPatterns.ts"),
        "irohaKotodamaLoader_ts": _ts_meta(api_src / "core" / "irohaKotodamaLoader.ts"),
        "iroha_files_in_api_src": [],
    }
    if api_src.exists():
        for p in api_src.rglob("*"):
            try:
                if p.is_file() and IROHA_REGEX.search(p.name):
                    out["iroha_files_in_api_src"].append(_file_meta(p))
            except Exception:
                pass
    if not out["irohaEngine_ts"].get("exists"):
        findings.append({"level": "warn", "area": "engine",
                         "message": "irohaEngine.ts not found"})
    if not out["irohaKotodamaLoader_ts"].get("exists"):
        findings.append({"level": "warn", "area": "loader",
                         "message": "irohaKotodamaLoader.ts not found"})
    return out


# ---- area 1-3: route wiring ----
def _grep_iroha_lines(p: pathlib.Path, max_records: int = 80) -> list[dict]:
    if not p.exists():
        return []
    out: list[dict] = []
    try:
        txt = p.read_text(encoding="utf-8", errors="replace")
        for i, line in enumerate(txt.splitlines(), start=1):
            if IROHA_REGEX.search(line):
                out.append({"lineno": i, "summary60": _summary(line.strip(), 80)})
                if len(out) >= max_records:
                    break
    except Exception:
        pass
    return out


def collect_route_wiring(findings: list[dict]) -> dict:
    routes = REPO_ROOT / "api" / "src" / "routes"
    out: dict = {
        "chat_ts_iroha_refs": _grep_iroha_lines(routes / "chat.ts"),
        "guest_ts_iroha_refs": _grep_iroha_lines(routes / "guest.ts"),
        "other_route_files": [],
    }
    if routes.exists():
        for p in routes.glob("*.ts"):
            if p.name in ("chat.ts", "guest.ts"):
                continue
            try:
                txt = p.read_text(encoding="utf-8", errors="replace")
                hits = sum(1 for ln in txt.splitlines() if IROHA_REGEX.search(ln))
                if hits > 0:
                    out["other_route_files"].append({"file": p.name, "hits": hits})
            except Exception:
                pass
    if len(out["chat_ts_iroha_refs"]) == 0:
        findings.append({"level": "warn", "area": "chat",
                         "message": "chat.ts has 0 iroha references"})
    return out


# ---- area 2: DB (read-only) ----
def collect_db(findings: list[dict]) -> dict:
    out: dict = {
        "tables_found": [],
        "iroha_units": {"exists": False, "row_count": 0, "columns": [], "samples_summary": []},
        "iroha_actionpacks": {"exists": False, "row_count": 0, "columns": []},
        "iroha_khs_alignment": {"exists": False, "row_count": 0, "columns": []},
        "memory_units_iroha": {"total": 0, "by_scope_id": {}},
        "source_registry_iroha": {"total": 0, "samples": []},
    }
    try:
        uri = f"file:{KOKUZO_DB}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=5.0)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND ("
                "name LIKE '%iroha%' OR name LIKE '%イロハ%' OR name LIKE '%いろは%') "
                "ORDER BY name"
            )
            tables = [r[0] for r in cur.fetchall()]
            out["tables_found"] = tables

            for tname in ("iroha_units", "iroha_actionpacks", "iroha_khs_alignment"):
                if tname not in tables:
                    continue
                detail = out[tname]
                detail["exists"] = True
                try:
                    cur.execute(f"PRAGMA table_info({tname})")
                    detail["columns"] = [
                        {"cid": r[0], "name": r[1], "type": r[2], "pk": r[5]}
                        for r in cur.fetchall()
                    ]
                except Exception as e:
                    detail["schema_error"] = str(e)
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tname}")
                    detail["row_count"] = cur.fetchone()[0]
                except Exception as e:
                    detail["count_error"] = str(e)

            if out["iroha_units"]["exists"]:
                try:
                    col_names = [c["name"] for c in out["iroha_units"]["columns"]]
                    order_col = next(
                        (c for c in ("created_at", "ts", "id", "rowid") if c in col_names),
                        "rowid",
                    )
                    cur.execute(f"SELECT * FROM iroha_units ORDER BY {order_col} DESC LIMIT 5")
                    desc_cols = [d[0] for d in cur.description]
                    SENSITIVE = {"user_id", "userid", "user", "email", "ip",
                                 "session_id", "token", "secret", "password"}
                    for row in cur.fetchall():
                        rec: dict = {}
                        for cn, val in zip(desc_cols, row):
                            if cn.lower() in SENSITIVE:
                                continue
                            if isinstance(val, (int, float)) or val is None:
                                rec[cn] = val
                            else:
                                sv = str(val)
                                if len(sv) > 40:
                                    rec[cn] = {"summary40": sv[:40] + "...",
                                               "sha8": _short_hash(sv),
                                               "len": len(sv)}
                                else:
                                    rec[cn] = sv
                        out["iroha_units"]["samples_summary"].append(rec)
                except Exception as e:
                    out["iroha_units"]["samples_error"] = str(e)
            else:
                findings.append({"level": "warn", "area": "db",
                                 "message": "iroha_units table not found"})

            try:
                cur.execute(
                    "SELECT COUNT(*) FROM memory_units WHERE scope_id LIKE '%iroha%' "
                    "OR scope_id LIKE '%いろは%' OR memory_type LIKE '%iroha%'"
                )
                out["memory_units_iroha"]["total"] = cur.fetchone()[0]
            except Exception as e:
                out["memory_units_iroha"]["total_error"] = str(e)
            try:
                cur.execute(
                    "SELECT scope_id, COUNT(*) FROM memory_units "
                    "WHERE scope_id LIKE '%iroha%' OR scope_id LIKE '%いろは%' "
                    "GROUP BY scope_id ORDER BY COUNT(*) DESC LIMIT 50"
                )
                out["memory_units_iroha"]["by_scope_id"] = {r[0]: r[1] for r in cur.fetchall()}
            except Exception as e:
                out["memory_units_iroha"]["scope_error"] = str(e)
            if out["memory_units_iroha"]["total"] == 0:
                findings.append({"level": "warn", "area": "db",
                                 "message": "memory_units has 0 iroha-scoped rows"})

            try:
                cur.execute(
                    "SELECT COUNT(*) FROM source_registry "
                    "WHERE title LIKE '%iroha%' OR title LIKE '%いろは%' "
                    "OR title LIKE '%イロハ%' OR id LIKE '%iroha%'"
                )
                out["source_registry_iroha"]["total"] = cur.fetchone()[0]
                cur.execute(
                    "SELECT id, title, source_type FROM source_registry "
                    "WHERE title LIKE '%iroha%' OR title LIKE '%いろは%' "
                    "OR title LIKE '%イロハ%' OR id LIKE '%iroha%' LIMIT 20"
                )
                for r in cur.fetchall():
                    out["source_registry_iroha"]["samples"].append({
                        "id_sha8": _short_hash(str(r[0])),
                        "title_summary60": _summary(str(r[1] or ""), 60),
                        "source_type": r[2],
                    })
            except Exception as e:
                out["source_registry_iroha"]["error"] = str(e)
        finally:
            conn.close()
    except Exception as e:
        findings.append({"level": "critical", "area": "db",
                         "message": f"sqlite open failed: {e}"})
    return out


# ---- area 3-2: chat probe ----
def collect_chat_probe(findings: list[dict]) -> dict:
    out: dict = {
        "status": None,
        "response_summary120": "",
        "response_sha8": "",
        "response_length": 0,
        "decision_frame_keys": [],
        "route_reason": None,
        "provider": None,
        "model": None,
        "prompt_trace_keys": [],
        "prompt_trace_iroha": {},
    }
    payload = {
        "message": "いろは歌の最初の七文字は何の意味ですか？",
        "threadId": "iroha-observer-probe-" + dt.datetime.utcnow().strftime("%Y%m%d%H%M%S"),
    }
    cp = _http_post_json(f"{HOST}/api/chat", payload, timeout=10)
    out["status"] = cp.get("status")
    if not cp.get("ok"):
        if (cp.get("status") or 500) >= 500 or cp.get("status") is None:
            findings.append({"level": "critical", "area": "chat",
                             "message": f"/api/chat probe failed: {cp.get('status')} {cp.get('error')}"})
        else:
            findings.append({"level": "warn", "area": "chat",
                             "message": f"/api/chat probe non-2xx: {cp.get('status')}"})
        return out
    try:
        j = json.loads(cp.get("body", ""))
        resp = j.get("response", "") or ""
        out["response_length"] = len(resp)
        out["response_summary120"] = _summary(resp, 120)
        out["response_sha8"] = _short_hash(resp) if resp else ""
        df = j.get("decisionFrame") or {}
        out["decision_frame_keys"] = list(df.keys())[:20]
        out["route_reason"] = df.get("intent") or (
            (df.get("route") or {}).get("route_reason") if isinstance(df.get("route"), dict) else None
        )
        llm = df.get("llm") or {}
        if isinstance(llm, dict):
            out["provider"] = llm.get("provider")
            out["model"] = llm.get("model")
    except Exception as e:
        findings.append({"level": "warn", "area": "chat",
                         "message": f"chat probe parse error: {e}"})

    fp = pathlib.Path("/opt/tenmon-ark-data/mc_intelligence_fire.jsonl")
    if fp.exists():
        try:
            lines = fp.read_text(encoding="utf-8", errors="replace").splitlines()
            for ln in reversed(lines[-100:]):
                if not ln.strip():
                    continue
                try:
                    rec = json.loads(ln)
                except Exception:
                    continue
                pt = rec.get("prompt_trace") or {}
                cl = pt.get("clause_lengths") or {}
                if not cl:
                    continue
                out["prompt_trace_keys"] = list(cl.keys())
                iroha_keys = [k for k in cl.keys() if "iroha" in k.lower()]
                out["prompt_trace_iroha"] = {k: cl.get(k) for k in iroha_keys}
                if not out.get("route_reason"):
                    out["route_reason"] = pt.get("route_reason")
                if not out.get("provider"):
                    out["provider"] = pt.get("provider")
                break
        except Exception as e:
            findings.append({"level": "warn", "area": "prompt_trace",
                             "message": f"jsonl parse error: {e}"})

    iroha_total = sum(int(v or 0) for v in (out["prompt_trace_iroha"] or {}).values())
    if iroha_total == 0:
        findings.append({"level": "warn", "area": "prompt_trace",
                         "message": "no iroha-* clause chars detected in latest prompt_trace"})
    return out


# ---- area 3-3: MC / intelligence ----
def _flatten_iroha_paths(j, prefix: str = "", out: dict | None = None,
                        depth: int = 0, max_depth: int = 6) -> dict:
    if out is None:
        out = {}
    if depth > max_depth:
        return out
    if isinstance(j, dict):
        for k, v in j.items():
            path = f"{prefix}.{k}" if prefix else k
            if "iroha" in str(k).lower():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    out[path] = v
                elif isinstance(v, dict):
                    out[path] = {kk: vv for kk, vv in v.items()
                                 if isinstance(vv, (str, int, float, bool)) or vv is None}
                elif isinstance(v, list):
                    out[path] = {"_list_len": len(v)}
            elif isinstance(v, (dict, list)):
                _flatten_iroha_paths(v, path, out, depth + 1, max_depth)
    elif isinstance(j, list):
        for i, item in enumerate(j[:20]):
            _flatten_iroha_paths(item, f"{prefix}[{i}]", out, depth + 1, max_depth)
    return out


def collect_mc_intelligence(findings: list[dict]) -> dict:
    out: dict = {"claude_summary_iroha_paths": {}, "intelligence_iroha_paths": {}}
    token = _resolve_env("TENMON_MC_CLAUDE_READ_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else None

    cs = _http_get(f"{HOST}/api/mc/vnext/claude-summary", timeout=10, headers=headers)
    if cs.get("ok"):
        try:
            j = json.loads(cs.get("body", ""))
            out["claude_summary_iroha_paths"] = _flatten_iroha_paths(j)
        except Exception as e:
            findings.append({"level": "warn", "area": "mc",
                             "message": f"claude-summary parse error: {e}"})
    elif cs.get("status") in (401, 403):
        findings.append({"level": "warn", "area": "mc",
                         "message": f"claude-summary auth failed: {cs.get('status')}"})

    it = _http_get(f"{HOST}/api/mc/vnext/intelligence", timeout=10, headers=headers)
    if it.get("ok"):
        try:
            j = json.loads(it.get("body", ""))
            out["intelligence_iroha_paths"] = _flatten_iroha_paths(j)
        except Exception as e:
            findings.append({"level": "warn", "area": "mc",
                             "message": f"intelligence parse error: {e}"})
    elif it.get("status") in (401, 403):
        findings.append({"level": "warn", "area": "mc",
                         "message": f"intelligence auth failed: {it.get('status')}"})
    return out


# ---- area 4: Notion ----
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


def _extract_block_heading(block: dict) -> tuple[str | None, str]:
    btype = block.get("type")
    if btype not in ("heading_1", "heading_2", "heading_3"):
        return None, ""
    rt = (block.get(btype) or {}).get("rich_text") or []
    text = "".join((seg.get("plain_text") or "") for seg in rt if isinstance(seg, dict))
    return btype, text


def _list_block_children(block_id: str, token: str, page_size: int = 50) -> list[dict]:
    r = _notion_get(f"/blocks/{block_id}/children?page_size={page_size}", token)
    if not r.get("ok"):
        return []
    try:
        j = json.loads(r.get("body", ""))
        return j.get("results", []) or []
    except Exception:
        return []


def collect_notion(findings: list[dict]) -> dict:
    out: dict = {
        "token_present": False,
        "iroha_page": {"id_sha8": "", "title": "", "headings": [],
                       "child_pages": [], "child_databases": []},
        "konpon_page": {"found": False, "headings": []},
        "structure_check": {
            "iroha_47_chapters": False,
            "ongi_table": False,
            "lifeview": False,
            "deathview": False,
            "hokekyo_link": False,
        },
    }
    token = _resolve_env("NOTION_TOKEN")
    if not token:
        findings.append({"level": "warn", "area": "notion",
                         "message": "NOTION_TOKEN not set"})
        return out
    out["token_present"] = True

    page_id = _resolve_env("NOTION_IROHA_PAGE_ID") or DEFAULT_IROHA_PAGE_ID
    out["iroha_page"]["id_sha8"] = _short_hash(page_id)

    page_meta = _notion_get(f"/pages/{page_id}", token)
    if page_meta.get("status") in (401, 403):
        findings.append({"level": "critical", "area": "notion",
                         "message": f"iroha page auth failed: {page_meta.get('status')}"})
        return out
    if page_meta.get("ok"):
        try:
            j = json.loads(page_meta.get("body", ""))
            for _k, v in (j.get("properties") or {}).items():
                if isinstance(v, dict) and v.get("type") == "title":
                    arr = v.get("title") or []
                    out["iroha_page"]["title"] = "".join(
                        (t.get("plain_text") or "") for t in arr if isinstance(t, dict)
                    )
                    break
        except Exception:
            pass
    elif page_meta.get("status") == 404:
        findings.append({"level": "warn", "area": "notion",
                         "message": "iroha page not found (404)"})
        return out

    children = _list_block_children(page_id, token, page_size=50)
    headings: list[dict] = []
    child_pages: list[dict] = []
    child_databases: list[dict] = []
    for blk in children:
        btype = blk.get("type")
        if btype in ("heading_1", "heading_2", "heading_3"):
            ht, txt = _extract_block_heading(blk)
            if txt:
                headings.append({"type": ht, "text_summary60": _summary(txt, 60),
                                 "sha8": _short_hash(txt)})
        elif btype == "child_page":
            title = (blk.get("child_page") or {}).get("title", "") or ""
            entry = {"id_sha8": _short_hash(blk.get("id", "")),
                     "title_summary60": _summary(title, 60), "headings": []}
            sub = _list_block_children(blk.get("id", ""), token, page_size=30)
            for sb in sub[:30]:
                if sb.get("type") in ("heading_1", "heading_2", "heading_3"):
                    _ht, st = _extract_block_heading(sb)
                    if st:
                        entry["headings"].append({"type": sb.get("type"),
                                                  "text_summary60": _summary(st, 60)})
            child_pages.append(entry)
        elif btype == "child_database":
            title = (blk.get("child_database") or {}).get("title", "") or ""
            child_databases.append({"id_sha8": _short_hash(blk.get("id", "")),
                                    "title_summary60": _summary(title, 60)})
    out["iroha_page"]["headings"] = headings
    out["iroha_page"]["child_pages"] = child_pages
    out["iroha_page"]["child_databases"] = child_databases

    all_titles_blob = " ".join(
        [h.get("text_summary60", "") for h in headings]
        + [c.get("title_summary60", "") for c in child_pages]
        + [c.get("title_summary60", "") for c in child_databases]
    )
    sc = out["structure_check"]
    sc["iroha_47_chapters"] = bool(re.search(r"(47|四十七|四七|47字)", all_titles_blob))
    sc["ongi_table"] = "音義" in all_titles_blob
    sc["lifeview"] = ("生命観" in all_titles_blob) or ("生命" in all_titles_blob)
    sc["deathview"] = ("死生観" in all_titles_blob) or ("死生" in all_titles_blob)
    sc["hokekyo_link"] = "法華経" in all_titles_blob

    sr = _notion_query("/search", token, {
        "query": "TENMON-ARK 魂の根幹接続 恒久設計書",
        "page_size": 5,
    })
    if sr.get("ok"):
        try:
            j = json.loads(sr.get("body", ""))
            results = j.get("results", []) or []
            if results:
                out["konpon_page"]["found"] = True
                first_id = results[0].get("id", "")
                children2 = _list_block_children(first_id, token, page_size=50)
                for blk in children2:
                    if blk.get("type") in ("heading_1", "heading_2", "heading_3"):
                        _ht, t = _extract_block_heading(blk)
                        if t:
                            out["konpon_page"]["headings"].append(
                                {"type": blk.get("type"), "text_summary60": _summary(t, 60)}
                            )
        except Exception as e:
            findings.append({"level": "warn", "area": "notion",
                             "message": f"konpon search parse error: {e}"})
    return out


# ---- area 5: connection layers ----
def evaluate_layers(vps: dict, eng: dict, route: dict, db: dict, chat: dict) -> dict:
    iroha_hisho = vps.get("iroha_kotodama_hisho_json", {}) or {}
    has_hisho = bool(iroha_hisho.get("exists"))
    has_shared = len(vps.get("shared_iroha_files") or []) > 0
    has_docs_files = len(vps.get("docs_iroha_files") or []) > 0
    if has_hisho and (has_shared or has_docs_files):
        l1 = "connected"
    elif has_hisho or has_shared or has_docs_files:
        l1 = "partial"
    else:
        l1 = "not_connected"

    iroha_units = (db.get("iroha_units") or {})
    iu_ok = iroha_units.get("exists") and (iroha_units.get("row_count") or 0) > 0
    mem_ok = (db.get("memory_units_iroha") or {}).get("total", 0) > 0
    src_ok = (db.get("source_registry_iroha") or {}).get("total", 0) > 0
    db_score = sum(1 for x in (iu_ok, mem_ok, src_ok) if x)
    l2 = "connected" if db_score >= 2 else ("partial" if db_score == 1 else "not_connected")

    loader = (eng.get("irohaKotodamaLoader_ts") or {})
    loader_exists = bool(loader.get("exists"))
    loader_lines = loader.get("lines") or 0
    if loader_exists and loader_lines >= 30:
        l3 = "connected"
    elif loader_exists:
        l3 = "partial"
    else:
        l3 = "not_connected"

    eng_exists = bool((eng.get("irohaEngine_ts") or {}).get("exists"))
    pat_exists = bool((eng.get("irohaActionPatterns_ts") or {}).get("exists"))
    if eng_exists and pat_exists:
        l4 = "connected"
    elif eng_exists or pat_exists:
        l4 = "partial"
    else:
        l4 = "not_connected"

    chat_refs = len(route.get("chat_ts_iroha_refs") or [])
    iroha_chars = sum(int(v or 0) for v in (chat.get("prompt_trace_iroha") or {}).values())
    if chat_refs > 0 and iroha_chars > 0:
        l5 = "connected"
    elif chat_refs > 0 or iroha_chars > 0:
        l5 = "partial"
    else:
        l5 = "not_connected"

    states = [l1, l2, l3, l4, l5]
    connected_count = sum(1 for s in states if s == "connected")
    rate = round(connected_count / 5 * 100)
    return {
        "layer1_resource": l1,
        "layer2_db": l2,
        "layer3_loader": l3,
        "layer4_engine": l4,
        "layer5_chat": l5,
        "connection_rate_percent": rate,
    }


# ---- area 6: missing links + card candidates ----
LAYER_CARD_MAP = {
    "layer1_resource": ("CARD-IROHA-CORPUS-INGEST-V1",
                        "shared/ または docs/ にいろは正典を配備し、source_registry に登録する"),
    "layer2_db": ("CARD-IROHA-KOTODAMA-MEMORY-DISTILL-V1",
                  "正典 47 章を memory_units (scope_id='iroha_kotodama_v1') へ蒸留する"),
    "layer3_loader": ("CARD-IROHA-KOTODAMA-LOADER-V1",
                      "irohaKotodamaLoader.ts が clause を組み立て chat.ts へ提供する"),
    "layer4_engine": ("CARD-IROHA-ENGINE-WIRING-V1",
                      "irohaEngine.ts と actionPatterns を loader に接続する"),
    "layer5_chat": ("CARD-IROHA-KOTODAMA-CHAT-CLAUSE-V1",
                    "chat.ts から loader を呼び、PromptTrace に iroha_* clause を立てる"),
}


def derive_missing_links(layers: dict) -> list[dict]:
    order = ["layer1_resource", "layer2_db", "layer3_loader", "layer4_engine", "layer5_chat"]
    out: list[dict] = []
    for k in order:
        s = layers.get(k)
        if s == "connected":
            continue
        card_name, fix = LAYER_CARD_MAP[k]
        out.append({
            "layer": k,
            "state": s,
            "what_is_missing": fix,
            "minimal_fix": f"次手は `{card_name}` (PROMOTION-GATE / MEMORY-DISTILL / "
                            "MEMORY-PROJECTION-CHAT-CLAUSE の言霊憲法成功パターンを転用)",
        })
    return out


def derive_card_candidates(layers: dict, notion: dict) -> list[dict]:
    out: list[dict] = []
    pushed: set[str] = set()

    def _push(name: str, reason: str) -> None:
        if name in pushed:
            return
        out.append({"priority": len(out) + 1, "name": name, "reason": reason})
        pushed.add(name)

    for k in ("layer1_resource", "layer2_db", "layer3_loader", "layer4_engine", "layer5_chat"):
        if layers.get(k) == "connected":
            continue
        name, reason = LAYER_CARD_MAP[k]
        _push(name, f"{k} = {layers.get(k)} → {reason}")

    all_connected = all(layers.get(k) == "connected" for k in
                        ("layer1_resource", "layer2_db", "layer3_loader",
                         "layer4_engine", "layer5_chat"))
    if all_connected:
        sc = (notion or {}).get("structure_check") or {}
        false_items = [k for k, v in sc.items() if not v]
        if false_items:
            _push("CARD-IROHA-NOTION-STRUCTURE-COMPLEMENT-V1",
                  f"Notion 解析班ページに未整備の章節 ({len(false_items)}/5): "
                  f"{', '.join(false_items)} → 章構造の補強観測。")
        ip = (notion or {}).get("iroha_page") or {}
        if not ip.get("headings"):
            _push("CARD-IROHA-NOTION-BRIDGE-V1",
                  "Notion 解析班ページの見出しが取れていない → bridge 整備が次段。")
        _push("CARD-IROHA-MC-CONNECTION-AUDIT-V1",
              "MC intelligence の iroha 観測項目を細粒度化し、24h ledger に章別追跡を加える。")
        _push("CARD-IROHA-PROMPT-TRACE-OBSERVATION-V1",
              "chat lane 別の iroha clause 出現を追跡し、断捨離応用へ繋げる。")
        _push("CARD-IROHA-NOTION-BRIDGE-V1",
              "Notion 解析班ページと VPS 資料の双方向同期 (read-only) を整備する。")

    fillers = [
        ("CARD-IROHA-MC-CONNECTION-AUDIT-V1", "MC 監視項目の細粒度化"),
        ("CARD-IROHA-NOTION-BRIDGE-V1", "Notion 解析班ページとの bridge"),
        ("CARD-IROHA-PROMPT-TRACE-OBSERVATION-V1", "chat lane 別 prompt trace 観測"),
    ]
    i = 0
    while len(out) < 3 and i < len(fillers):
        name, reason = fillers[i]
        _push(name, reason)
        i += 1

    return out[:5]


def derive_roadmap(layers: dict, candidates: list[dict]) -> str:
    rate = layers.get("connection_rate_percent", 0)
    head = f"接続率 {rate}% (connected={sum(1 for k,v in layers.items() if v=='connected')}/5)。"
    if rate >= 100:
        return head + " 全層 connected。Notion 照合と MC 観測の追加段へ。"
    if rate >= 80:
        return head + " ほぼ全層 connected。残層を埋めれば根幹思考完全接続へ到達。"
    plan = " 言霊憲法 V1 の成功パターン (PROMOTION-GATE → MEMORY-DISTILL → CHAT-CLAUSE) を" \
           "転用し、上位優先カードから順に partial / not_connected を connected に持ち上げる。"
    return head + plan


# ---- verdict ----
def derive_verdict(findings: list[dict], layers: dict) -> tuple[str, int, int, int]:
    states = [layers.get(k) for k in ("layer1_resource", "layer2_db", "layer3_loader",
                                       "layer4_engine", "layer5_chat")]
    if all(s == "not_connected" for s in states):
        findings.append({"level": "critical", "area": "connection",
                         "message": "all 5 layers are not_connected"})
    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    if crit > 0:
        return "RED", crit, warn, info
    if warn > 0:
        return "YELLOW", crit, warn, info
    return "GREEN", crit, warn, info


# ---- rendering: MD report ----
def render_md(report: dict) -> str:
    L: list[str] = []
    L.append("# IROHA Kotodama Source Observe (Phase 1)")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- observer_version: `{report['observer_version']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    s = report["summary"]
    L.append(f"- summary: critical={s['critical']} / warn={s['warn']} / info={s['info']}")
    cl = report["connection_layers"]
    L.append(f"- connection_rate: **{cl['connection_rate_percent']}%**")
    L.append("")

    L.append("## 1. VPS resources")
    L.append("")
    h = report["vps_resources"]["iroha_kotodama_hisho_json"]
    L.append(f"- iroha_kotodama_hisho.json: exists={h.get('exists')} size={h.get('size')} "
             f"sha8={h.get('sha256_short')} top_keys={h.get('top_level_keys_count')}")
    L.append(f"- shared/ iroha files: {len(report['vps_resources']['shared_iroha_files'])}")
    L.append(f"- docs/ iroha files: {len(report['vps_resources']['docs_iroha_files'])}")
    L.append("")

    L.append("## 2. Engine / loader")
    L.append("")
    e = report["engine_loader"]
    for k in ("irohaEngine_ts", "irohaActionPatterns_ts", "irohaKotodamaLoader_ts"):
        v = e[k]
        L.append(f"- {k}: exists={v.get('exists')} lines={v.get('lines')} "
                 f"exports={len(v.get('exports') or [])}")
    L.append(f"- iroha files in api/src: {len(e.get('iroha_files_in_api_src') or [])}")
    L.append("")

    L.append("## 3. Route wiring")
    L.append("")
    r = report["route_wiring"]
    L.append(f"- chat.ts iroha refs: {len(r.get('chat_ts_iroha_refs') or [])}")
    L.append(f"- guest.ts iroha refs: {len(r.get('guest_ts_iroha_refs') or [])}")
    L.append(f"- other route files with refs: {len(r.get('other_route_files') or [])}")
    L.append("")

    L.append("## 4. DB")
    L.append("")
    d = report["db"]
    L.append(f"- iroha tables found: {', '.join(d.get('tables_found') or []) or '(none)'}")
    for k in ("iroha_units", "iroha_actionpacks", "iroha_khs_alignment"):
        v = d.get(k) or {}
        L.append(f"  - {k}: exists={v.get('exists')} row_count={v.get('row_count')} cols={len(v.get('columns') or [])}")
    L.append(f"- memory_units iroha total: {(d.get('memory_units_iroha') or {}).get('total')}")
    L.append(f"  - by_scope_id: {len((d.get('memory_units_iroha') or {}).get('by_scope_id') or {})} scopes")
    L.append(f"- source_registry iroha total: {(d.get('source_registry_iroha') or {}).get('total')}")
    L.append("")

    L.append("## 5. Chat probe")
    L.append("")
    c = report["chat_probe"]
    L.append(f"- status={c.get('status')} response_length={c.get('response_length')} "
             f"sha8={c.get('response_sha8')}")
    L.append(f"- route_reason={c.get('route_reason')} provider={c.get('provider')} model={c.get('model')}")
    L.append(f"- prompt_trace iroha keys ({len(c.get('prompt_trace_iroha') or {})}):")
    for k, v in (c.get("prompt_trace_iroha") or {}).items():
        L.append(f"  - {k}: {v}")
    L.append("")

    L.append("## 6. MC / intelligence iroha paths")
    L.append("")
    mc = report["mc_intelligence"]
    L.append(f"- claude_summary iroha paths ({len(mc.get('claude_summary_iroha_paths') or {})}):")
    for k, v in (mc.get("claude_summary_iroha_paths") or {}).items():
        L.append(f"  - {k}: {v if not isinstance(v, dict) else json.dumps(v, ensure_ascii=False)[:80]}")
    L.append(f"- intelligence iroha paths ({len(mc.get('intelligence_iroha_paths') or {})}):")
    for k, v in (mc.get("intelligence_iroha_paths") or {}).items():
        L.append(f"  - {k}: {v if not isinstance(v, dict) else json.dumps(v, ensure_ascii=False)[:80]}")
    L.append("")

    L.append("## 7. Notion")
    L.append("")
    n = report["notion"]
    L.append(f"- token_present: {n.get('token_present')}")
    ip = n.get("iroha_page") or {}
    L.append(f"- iroha page (id_sha8={ip.get('id_sha8')}): title={_summary(ip.get('title') or '', 60)}")
    L.append(f"  - headings: {len(ip.get('headings') or [])}")
    L.append(f"  - child_pages: {len(ip.get('child_pages') or [])}")
    L.append(f"  - child_databases: {len(ip.get('child_databases') or [])}")
    sc = n.get("structure_check") or {}
    L.append("- structure check: " + ", ".join(f"{k}={v}" for k, v in sc.items()))
    L.append(f"- konpon page found: {(n.get('konpon_page') or {}).get('found')}")
    L.append("")

    L.append("## 8. Connection layers")
    L.append("")
    for k in ("layer1_resource", "layer2_db", "layer3_loader", "layer4_engine", "layer5_chat"):
        L.append(f"- {k}: **{cl[k]}**")
    L.append(f"- connection_rate: **{cl['connection_rate_percent']}%**")
    L.append("")

    L.append("## 9. Missing links")
    L.append("")
    ml = report.get("missing_links") or []
    if not ml:
        L.append("(none — all layers connected)")
    for m in ml:
        L.append(f"- [{m.get('layer')}] state={m.get('state')}: {m.get('what_is_missing')}")
        L.append(f"    - minimal_fix: {m.get('minimal_fix')}")
    L.append("")

    L.append("## 10. Card candidates")
    L.append("")
    for c in report.get("card_candidates") or []:
        L.append(f"- {c.get('priority')}. `{c.get('name')}` — {c.get('reason')}")
    L.append("")

    L.append("## Roadmap summary")
    L.append("")
    L.append(report.get("roadmap_summary") or "")
    L.append("")

    L.append("## Findings")
    L.append("")
    if not report.get("findings"):
        L.append("(none)")
    for f in report.get("findings") or []:
        L.append(f"- [{f.get('level')}] [{f.get('area')}] {f.get('message')}")
    L.append("")
    return "\n".join(L) + "\n"


# ---- rendering: docs/ark/iroha 9-section design doc ----
def render_design_doc(report: dict) -> str:
    L: list[str] = []
    L.append("# IROHA-KOTODAMA-SOURCE-OBSERVE-V1")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- observer_version: `{report['observer_version']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    cl = report["connection_layers"]
    L.append(f"- connection_rate: **{cl['connection_rate_percent']}%**")
    L.append("")

    L.append("## 1. VPS 内いろは関連ファイル一覧")
    L.append("")
    vp = report["vps_resources"]
    h = vp.get("iroha_kotodama_hisho_json") or {}
    L.append(f"- shared/kotodama/iroha_kotodama_hisho.json: exists={h.get('exists')} "
             f"size={h.get('size')} lines={h.get('lines')} sha8={h.get('sha256_short')}")
    if h.get("top_level_keys"):
        L.append(f"  - top-level keys ({h.get('top_level_keys_count')}): "
                 f"{', '.join(h['top_level_keys'][:8])}{'...' if h.get('top_level_keys_count',0) > 8 else ''}")
    L.append(f"- shared/ 配下 iroha 関連: {len(vp.get('shared_iroha_files') or [])} 件")
    for f in (vp.get("shared_iroha_files") or [])[:8]:
        L.append(f"  - `{f.get('path')}` size={f.get('size')} sha8={f.get('sha256_short')}")
    L.append(f"- docs/ 配下 iroha 関連: {len(vp.get('docs_iroha_files') or [])} 件")
    for f in (vp.get("docs_iroha_files") or [])[:8]:
        L.append(f"  - `{f.get('path')}` size={f.get('size')}")
    L.append("")

    L.append("## 2. DB 内いろは関連テーブル・件数")
    L.append("")
    d = report["db"]
    L.append(f"- iroha 系テーブル: {', '.join(d.get('tables_found') or []) or '(none)'}")
    for k in ("iroha_units", "iroha_actionpacks", "iroha_khs_alignment"):
        v = d.get(k) or {}
        if v.get("exists"):
            L.append(f"  - **{k}**: row_count={v.get('row_count')} cols={len(v.get('columns') or [])}")
            cols_str = ", ".join(c["name"] for c in (v.get("columns") or [])[:8])
            if cols_str:
                L.append(f"    - columns: {cols_str}")
    L.append("")

    L.append("## 3. memory_units / source_registry 接続状況")
    L.append("")
    mu = d.get("memory_units_iroha") or {}
    L.append(f"- memory_units iroha total: **{mu.get('total')}**")
    by_scope = mu.get("by_scope_id") or {}
    if by_scope:
        L.append(f"- scope_id 内訳 (top {min(len(by_scope), 10)}):")
        for sid, cnt in list(by_scope.items())[:10]:
            L.append(f"  - `{sid}`: {cnt}")
        if len(by_scope) > 10:
            L.append(f"  - ... and {len(by_scope) - 10} more scopes")
    sr = d.get("source_registry_iroha") or {}
    L.append(f"- source_registry iroha total: **{sr.get('total')}**")
    for s in (sr.get("samples") or [])[:5]:
        L.append(f"  - sha8=`{s.get('id_sha8')}` type={s.get('source_type')} title={s.get('title_summary60')}")
    L.append("")

    L.append("## 4. chat.ts / guest.ts / route 接続状況")
    L.append("")
    r = report["route_wiring"]
    L.append(f"- chat.ts iroha refs: **{len(r.get('chat_ts_iroha_refs') or [])} 行**")
    for ref in (r.get("chat_ts_iroha_refs") or [])[:8]:
        L.append(f"  - L{ref.get('lineno')}: {ref.get('summary60')}")
    L.append(f"- guest.ts iroha refs: **{len(r.get('guest_ts_iroha_refs') or [])} 行**")
    for ref in (r.get("guest_ts_iroha_refs") or [])[:5]:
        L.append(f"  - L{ref.get('lineno')}: {ref.get('summary60')}")
    L.append(f"- 他 route ファイル: {len(r.get('other_route_files') or [])} 件")
    for o in r.get("other_route_files") or []:
        L.append(f"  - {o.get('file')}: {o.get('hits')} hits")
    L.append("")
    e = report["engine_loader"]
    L.append("### engine / loader")
    for k in ("irohaEngine_ts", "irohaActionPatterns_ts", "irohaKotodamaLoader_ts"):
        v = e[k]
        L.append(f"- **{k}**: exists={v.get('exists')} lines={v.get('lines')} exports={', '.join((v.get('exports') or [])[:6])}")
    L.append("")
    cp = report["chat_probe"]
    L.append("### chat probe")
    L.append(f"- response_length={cp.get('response_length')} provider={cp.get('provider')} model={cp.get('model')} route_reason={cp.get('route_reason')}")
    if cp.get("prompt_trace_iroha"):
        L.append("- prompt_trace iroha clauses:")
        for k, v in (cp.get("prompt_trace_iroha") or {}).items():
            L.append(f"  - {k}: {v}")
    else:
        L.append("- prompt_trace iroha clauses: (none)")
    L.append("")

    L.append("## 5. Notion 解析ページとの対応関係")
    L.append("")
    n = report["notion"]
    L.append(f"- token_present: {n.get('token_present')}")
    ip = n.get("iroha_page") or {}
    L.append(f"- iroha 解析班ページ (id_sha8={ip.get('id_sha8')})")
    L.append(f"  - title: {_summary(ip.get('title') or '(unknown)', 60)}")
    L.append(f"  - root headings: {len(ip.get('headings') or [])}")
    for h2 in (ip.get("headings") or [])[:8]:
        L.append(f"    - [{h2.get('type')}] {h2.get('text_summary60')}")
    L.append(f"  - child_pages: {len(ip.get('child_pages') or [])}")
    for cp2 in (ip.get("child_pages") or [])[:8]:
        L.append(f"    - {cp2.get('title_summary60')} (sub-headings: {len(cp2.get('headings') or [])})")
    L.append(f"  - child_databases: {len(ip.get('child_databases') or [])}")
    sc = n.get("structure_check") or {}
    L.append("- structure_check:")
    for k, v in sc.items():
        L.append(f"  - {k}: {v}")
    L.append(f"- konpon page found: {(n.get('konpon_page') or {}).get('found')}")
    L.append("")

    L.append("## 6. 現在の接続率評価")
    L.append("")
    L.append("| Layer | State |")
    L.append("|---|---|")
    layer_titles = {
        "layer1_resource": "Layer 1: resource (shared/docs)",
        "layer2_db": "Layer 2: db (iroha_units / memory_units / source_registry)",
        "layer3_loader": "Layer 3: loader (irohaKotodamaLoader.ts)",
        "layer4_engine": "Layer 4: engine (irohaEngine.ts / actionPatterns)",
        "layer5_chat": "Layer 5: chat (chat.ts refs + PromptTrace iroha chars)",
    }
    for k, title in layer_titles.items():
        L.append(f"| {title} | **{cl[k]}** |")
    L.append("")
    L.append(f"**接続率 = {cl['connection_rate_percent']}%**")
    L.append("")

    L.append("## 7. 未接続箇所")
    L.append("")
    ml = report.get("missing_links") or []
    if not ml:
        L.append("(none — 全層 connected)")
    for m in ml:
        L.append(f"- **{m.get('layer')}** (state={m.get('state')})")
        L.append(f"  - what_is_missing: {m.get('what_is_missing')}")
        L.append(f"  - minimal_fix: {m.get('minimal_fix')}")
    L.append("")

    L.append("## 8. 次の実装カード候補")
    L.append("")
    for c in report.get("card_candidates") or []:
        L.append(f"{c.get('priority')}. `{c.get('name')}`")
        L.append(f"   - reason: {c.get('reason')}")
    L.append("")

    L.append("## 9. IROHA を天聞アーク根幹思考へ接続する最適ロードマップ")
    L.append("")
    L.append(report.get("roadmap_summary") or "")
    L.append("")
    L.append("### 言霊憲法 V1 成功パターンの転用")
    L.append("")
    L.append("- **PROMOTION-GATE (chat.ts へ直接 inject)**: `irohaKotodamaLoader.buildIrohaClause()` を実装し、chat.ts の system prompt に挿入する設計を `KOTODAMA-CONSTITUTION-PROMOTION-V1` のパターンで踏襲。")
    L.append("- **MEMORY-DISTILL (memory_units 蒸留)**: いろは正典 47 章の summary を `memory_units` (memory_scope='source', memory_type='scripture_distill', scope_id='iroha_kotodama_v1') に蒸留する。`CONSTITUTION-MEMORY-DISTILL-V1` の 12 条蒸留パターンを 47 章に拡張。")
    L.append("- **MEMORY-PROJECTION-CHAT-CLAUSE (記憶層から並列供給)**: chat.ts の `_irohaKotodamaMemoryClause` IIFE で memory_units summary を直接 SELECT し、PROMOTION-GATE と並列で system prompt に注入する。`CONSTITUTION-MEMORY-PROJECTION-CHAT-CLAUSE-V1` を直転用。")
    L.append("")
    L.append("### 接続率上昇予想")
    L.append("")
    L.append("- 各カード完了後の接続率は、対応 Layer が `connected` に昇格した分だけ加算される。最終的に全 5 層 connected で **100%**、Notion 照合・MC 観測で監視段に到達。")
    L.append("")
    L.append("---")
    L.append("")
    L.append("**注意**: いろは正典原文は本ドキュメントに全文展開されていない (要約 + sha8 + ファイル参照のみ)。実装段では `shared/kotodama/iroha_kotodama_hisho.json` を直接参照すること。")
    L.append("")
    return "\n".join(L) + "\n"


# ---- observe orchestration ----
def cmd_observe() -> int:
    findings: list[dict] = []

    vps = collect_vps_resources(findings)
    eng = collect_engine_loader(findings)
    route = collect_route_wiring(findings)
    db = collect_db(findings)
    chat = collect_chat_probe(findings)
    mc = collect_mc_intelligence(findings)
    notion = collect_notion(findings)

    layers = evaluate_layers(vps, eng, route, db, chat)
    missing_links = derive_missing_links(layers)
    candidates = derive_card_candidates(layers, notion)
    roadmap = derive_roadmap(layers, candidates)

    verdict, crit, warn, info = derive_verdict(findings, layers)

    report = {
        "observer_version": OBSERVER_VERSION,
        "generated_at": _now_iso(),
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "vps_resources": vps,
        "engine_loader": eng,
        "route_wiring": route,
        "db": db,
        "chat_probe": chat,
        "mc_intelligence": mc,
        "notion": notion,
        "connection_layers": layers,
        "missing_links": missing_links,
        "card_candidates": candidates,
        "roadmap_summary": roadmap,
        "findings": findings,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(report, ensure_ascii=False, indent=2)
    md_text = render_md(report)
    docs_text = render_design_doc(report)
    (OUT_DIR / "iroha_observer_report_latest.json").write_text(json_text, encoding="utf-8")
    (OUT_DIR / "iroha_observer_report_latest.md").write_text(md_text, encoding="utf-8")
    (DOCS_DIR / "IROHA_KOTODAMA_SOURCE_OBSERVE_V1.md").write_text(docs_text, encoding="utf-8")

    print(f"[iroha_observer] verdict={verdict} crit={crit} warn={warn} info={info} "
          f"rate={layers.get('connection_rate_percent')}%")
    print(f"[iroha_observer] report: {OUT_DIR / 'iroha_observer_report_latest.json'}")
    return 0


def main() -> None:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_iroha_observer_v1",
        description="TENMON-ARK iroha kotodama observer (Phase 1) - READ-ONLY")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("observe", help="run a one-shot read-only observation")
    args = parser.parse_args()
    if args.cmd == "observe":
        sys.exit(cmd_observe())
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
