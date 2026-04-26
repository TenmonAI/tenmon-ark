#!/usr/bin/env python3
"""TENMON-ARK Iroha-MC Connection Audit v1 (CARD-IROHA-MC-CONNECTION-AUDIT-V1).

READ-ONLY 監査ツール: いろは言霊解が天聞アークの会話 / MC intelligence /
prompt trace / slot chat binding / chat-guest route / decisionFrame で
どの程度 / どの route で注入されているかを観測する。

Python3 stdlib only / 自動実行禁止 / DB write 禁止 / Notion write 禁止 /
MC bearer token 不使用 (401 は info で記録、戦略 C 維持)。

Usage:
    python3 automation/tenmon_iroha_mc_connection_audit_v1.py audit

Outputs (atomic, written at the very end):
    automation/out/iroha_mc_connection_audit_latest.json
    automation/out/iroha_mc_connection_audit_latest.md

Env (read-only):
    TENMON_DOCTOR_REPO_ROOT      default: /opt/tenmon-ark-repo
    TENMON_DOCTOR_OUT_DIR        default: <REPO_ROOT>/automation/out
    TENMON_DOCTOR_DATA_DIR       default: /opt/tenmon-ark-data
    TENMON_IROHA_AUDIT_HOST      default: https://tenmon-ark.com
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request


AUDIT_VERSION = "v1.0.0"
WINDOW_24H_MS = 24 * 60 * 60 * 1000


# ---- self-check (concatenated literals to avoid self-trip) ----
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
    "comments" + ".create",
    "PA" + "TCH ",
    "DEL" + "ETE ",
    "PU" + "T ",
    "git pu" + "ll",
    "git fe" + "tch",
    "git cl" + "one",
    "pip ins" + "tall",
    "npm ins" + "tall",
    "apt ins" + "tall",
]


def self_check() -> None:
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code_lines: list[str] = []
    for ln in src.splitlines():
        if ln.lstrip().startswith("#"):
            continue
        code_lines.append(ln)
    code = "\n".join(code_lines)
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[iroha_audit] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- env / paths ----
def _resolve_repo_root() -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_REPO_ROOT", "/opt/tenmon-ark-repo"))


def _resolve_out_dir(repo_root: pathlib.Path) -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_OUT_DIR", str(repo_root / "automation" / "out")))


def _resolve_data_dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_DATA_DIR", "/opt/tenmon-ark-data"))


def _resolve_host() -> str:
    return os.environ.get("TENMON_IROHA_AUDIT_HOST", "https://tenmon-ark.com").rstrip("/")


def _safe_mkdir(p: pathlib.Path) -> None:
    forbidden = ("/etc", "/usr", "/bin", "/sbin", "/lib", "/lib64",
                 "/boot", "/dev", "/proc", "/sys", "/root")
    s = str(p.resolve())
    for fp in forbidden:
        if s == fp or s.startswith(fp + "/"):
            raise RuntimeError(f"refusing to mkdir under {fp}: {s}")
    p.mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


# ---- helpers ----
def _http_head(url: str, timeout: float = 10.0) -> dict:
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": "iroha-mc-audit/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status,
                    "content_type": resp.headers.get("content-type")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _grep_lines(path: pathlib.Path, pattern: re.Pattern,
                limit: int = 50) -> list[dict]:
    if not path.exists() or not path.is_file():
        return []
    out: list[dict] = []
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            for i, ln in enumerate(f, start=1):
                if pattern.search(ln):
                    out.append({"line": i, "text": ln.rstrip("\n")[:200]})
                    if len(out) >= limit:
                        break
    except Exception as e:
        out.append({"line": 0, "text": f"<read error: {e}>"})
    return out


def _walk_files(root: pathlib.Path, suffixes: tuple[str, ...]) -> list[pathlib.Path]:
    out: list[pathlib.Path] = []
    if not root.exists():
        return out
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(s in p.parts for s in ("node_modules", "build", "dist")):
            continue
        if any(seg.endswith(".bak") or ".bak." in seg or ".bak_" in seg
               for seg in p.parts):
            continue
        if p.suffix in suffixes:
            out.append(p)
    return out


def _count_hits(path: pathlib.Path, pattern: re.Pattern) -> int:
    if not path.exists() or not path.is_file():
        return 0
    n = 0
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            for ln in f:
                if pattern.search(ln):
                    n += 1
    except Exception:
        pass
    return n


# ---- region 1: MC endpoint probe (HEAD only / 401 expected for MC vnext) ----
def region_mc_endpoints(host: str) -> dict:
    eps = [
        ("health",          f"{host}/api/health"),
        ("claude_summary",  f"{host}/api/mc/vnext/claude-summary"),
        ("intelligence",    f"{host}/api/mc/vnext/intelligence"),
    ]
    results: dict[str, dict] = {}
    for name, url in eps:
        results[name] = _http_head(url)
        results[name]["url"] = url
    return results


# ---- region 1-2: MC intelligence source code grep ----
IROHA_PAT = re.compile(r"iroha|Iroha", re.IGNORECASE)
IROHA_JP_PAT = re.compile(r"iroha|Iroha|いろは|イロハ")
SLOT_BIND_PAT = re.compile(r"slot_chat_binding|INTELLIGENCE_FIRE_SLOT_CHAT_BINDING")
PROMPT_TRACE_PAT = re.compile(r"prompt_trace_summary|PromptTraceSummary24hV1|PromptTraceClauseLengthsV1")


def region_mc_source_grep(repo_root: pathlib.Path) -> dict:
    mc_dir = repo_root / "api" / "src" / "mc"
    iroha_files: list[dict] = []
    slot_bind_hits: list[dict] = []
    prompt_trace_hits: list[dict] = []
    if mc_dir.exists():
        for p in _walk_files(mc_dir, (".ts", ".tsx", ".js")):
            rel = str(p.relative_to(repo_root))
            ic = _count_hits(p, IROHA_JP_PAT)
            sc = _count_hits(p, SLOT_BIND_PAT)
            pc = _count_hits(p, PROMPT_TRACE_PAT)
            if ic:
                iroha_files.append({"file": rel, "iroha_hits": ic})
            if sc:
                slot_bind_hits.append({"file": rel, "hits": sc})
            if pc:
                prompt_trace_hits.append({"file": rel, "hits": pc})
    iroha_files.sort(key=lambda x: -x["iroha_hits"])
    return {
        "mc_iroha_files": iroha_files[:20],
        "slot_chat_binding_files": slot_bind_hits,
        "prompt_trace_files": prompt_trace_hits,
    }


# ---- region 2: prompt_trace 24h iroha clause stats from mc_intelligence_fire.jsonl ----
def region_prompt_trace_24h(data_dir: pathlib.Path) -> dict:
    p = data_dir / "mc_intelligence_fire.jsonl"
    out = {
        "log_path": str(p),
        "exists": p.exists(),
        "size_bytes": (p.stat().st_size if p.exists() else 0),
        "events_24h": 0,
        "events_with_prompt_trace_24h": 0,
        "iroha_fired_24h": 0,
        "iroha_clause_lengths": {
            "n": 0, "min": None, "max": None, "avg": None,
        },
        "iroha_clause_keys_seen": [],
        "non_iroha_clause_keys_seen": [],
    }
    if not p.exists():
        return out

    now_ms = int(time.time() * 1000)
    ir_lens: list[int] = []
    iroha_keys: set[str] = set()
    other_keys: set[str] = set()
    try:
        with p.open("r", encoding="utf-8", errors="replace") as f:
            for ln in f:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    o = json.loads(ln)
                except Exception:
                    continue
                ts = int(o.get("ts", 0))
                if (now_ms - ts) > WINDOW_24H_MS:
                    continue
                out["events_24h"] += 1
                if o.get("iroha") is True:
                    out["iroha_fired_24h"] += 1
                pt = o.get("prompt_trace")
                if isinstance(pt, dict):
                    out["events_with_prompt_trace_24h"] += 1
                    cl = pt.get("clause_lengths") or {}
                    if isinstance(cl, dict):
                        for k in cl.keys():
                            if "iroha" in k.lower():
                                iroha_keys.add(k)
                            else:
                                other_keys.add(k)
                        v = cl.get("iroha")
                        if isinstance(v, (int, float)):
                            ir_lens.append(int(v))
    except Exception:
        pass

    if ir_lens:
        out["iroha_clause_lengths"] = {
            "n": len(ir_lens),
            "min": min(ir_lens),
            "max": max(ir_lens),
            "avg": round(sum(ir_lens) / len(ir_lens), 2),
        }
    out["iroha_clause_keys_seen"] = sorted(iroha_keys)
    out["non_iroha_clause_keys_seen"] = sorted(other_keys)[:25]
    return out


# ---- region 2-bis: doctor v2 prompt_trace key inspection ----
def region_doctor_v2_prompt_trace(out_dir: pathlib.Path) -> dict:
    p = out_dir / "doctor_v2_report_latest.json"
    info: dict = {"path": str(p), "exists": p.exists(), "iroha_keys_in_prompt_trace": [],
                  "all_prompt_trace_keys": []}
    if not p.exists():
        return info
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        info["error"] = f"json parse: {e}"
        return info
    pt = d.get("prompt_trace") or {}
    if isinstance(pt, dict):
        keys = sorted(pt.keys())
        info["all_prompt_trace_keys"] = keys
        info["iroha_keys_in_prompt_trace"] = [k for k in keys if "iroha" in k.lower()]
        info["doctor_verdict"] = d.get("verdict")
        info["doctor_profile"] = d.get("profile")
    return info


# ---- region 3-4-5-6: route grep (chat.ts / guest.ts) + grounding + inject_iroha ----
ROUTE_FILES_REL = ("api/src/routes/chat.ts", "api/src/routes/guest.ts")


GROUNDING_PAT = re.compile(r"irohaGrounding|checkIrohaGrounding")
INJECT_PROBE_PAT = re.compile(r'inject_iroha|injectIroha|recordContextInjectionProbeV1\s*\(\s*req\s*,\s*"inject_iroha"')
QUERY_BUILD_PAT = re.compile(r"queryIrohaByUserText|buildIrohaInjection")


def region_route_iroha(repo_root: pathlib.Path) -> dict:
    out: dict = {"by_route": []}
    for rel in ROUTE_FILES_REL:
        p = repo_root / rel
        rec: dict = {
            "route_file": rel,
            "exists": p.exists(),
            "iroha_hits": 0,
            "grounding_hits": 0,
            "inject_probe_hits": 0,
            "query_build_hits": 0,
            "grounding_lines": [],
            "inject_probe_lines": [],
            "query_build_lines": [],
            "imports": [],
        }
        if not p.exists():
            out["by_route"].append(rec)
            continue
        rec["iroha_hits"] = _count_hits(p, IROHA_JP_PAT)
        rec["grounding_hits"] = _count_hits(p, GROUNDING_PAT)
        rec["inject_probe_hits"] = _count_hits(p, INJECT_PROBE_PAT)
        rec["query_build_hits"] = _count_hits(p, QUERY_BUILD_PAT)
        rec["grounding_lines"] = _grep_lines(p, GROUNDING_PAT, limit=8)
        rec["inject_probe_lines"] = _grep_lines(p, INJECT_PROBE_PAT, limit=8)
        rec["query_build_lines"] = _grep_lines(p, QUERY_BUILD_PAT, limit=8)
        rec["imports"] = [ln for ln in _grep_lines(
            p, re.compile(r'^\s*import .*iroha', re.IGNORECASE), limit=8)]
        out["by_route"].append(rec)
    return out


# ---- region 8: chapter-level tracking probe (currently expected absent) ----
CHAPTER_KEYS = [
    "iroha_47ji",
    "iroha_ongi",
    "iroha_seimei",
    "iroha_shisei",
    "iroha_hokekyo",
]


def region_chapter_tracking(prompt_trace_24h: dict, doctor_pt: dict) -> dict:
    seen = set(prompt_trace_24h.get("iroha_clause_keys_seen") or []) \
        | set(doctor_pt.get("iroha_keys_in_prompt_trace") or [])
    missing = [k for k in CHAPTER_KEYS if k not in seen]
    return {
        "currently_aggregated": len(seen) > 1,
        "iroha_keys_seen_anywhere": sorted(seen),
        "expected_chapter_keys": CHAPTER_KEYS,
        "missing_indicators": missing,
    }


# ---- region 7: route-level matrix synthesis ----
def synthesize_route_matrix(prompt_trace_24h: dict,
                            mc_eps: dict,
                            route: dict) -> list[dict]:
    avg_iroha_24h = (prompt_trace_24h.get("iroha_clause_lengths") or {}).get("avg")
    matrix: list[dict] = []
    for r in route.get("by_route") or []:
        rf = r.get("route_file") or ""
        if rf.endswith("chat.ts"):
            matrix.append({
                "route": "/api/chat",
                "clause_chars_avg_24h": avg_iroha_24h,
                "clause_chars_cap": 1500,
                "grounding": "decisionFrame.ku.irohaGrounding (object: passed/score/sounds/actionPattern/amaterasuAxis)" if r.get("grounding_hits") else "absent",
                "binding": "fired (slot_chat_binding.iroha = __irohaClause)" if r.get("query_build_hits") else "absent",
                "inject_probe": "recorded (inject_iroha)" if r.get("inject_probe_hits") else "absent",
                "iroha_total_refs": r.get("iroha_hits", 0),
            })
        elif rf.endswith("guest.ts"):
            matrix.append({
                "route": "/api/guest",
                "clause_chars_avg_24h": None,
                "clause_chars_cap": 800,
                "grounding": "irohaGroundingScore (scalar 0-3)" if r.get("grounding_hits") else "absent",
                "binding": "local hits via queryIrohaByUserText (no slot_chat_binding alias)" if r.get("query_build_hits") else "absent",
                "inject_probe": "absent",
                "iroha_total_refs": r.get("iroha_hits", 0),
            })
    cs = mc_eps.get("claude_summary") or {}
    intel = mc_eps.get("intelligence") or {}
    matrix.append({
        "route": "/api/mc/vnext/claude-summary",
        "clause_chars_avg_24h": None,
        "clause_chars_cap": None,
        "grounding": "N/A (auth required, status=%s)" % cs.get("status"),
        "binding": "schema-defined (slot_chat_binding.iroha) but observable only with bearer token",
        "inject_probe": "N/A",
        "iroha_total_refs": None,
    })
    matrix.append({
        "route": "/api/mc/vnext/intelligence",
        "clause_chars_avg_24h": None,
        "clause_chars_cap": None,
        "grounding": "N/A (auth required, status=%s)" % intel.get("status"),
        "binding": "schema-defined; deepIntelligenceMapV1 marks irohaKotodamaLoader / irohaGrounding",
        "inject_probe": "N/A",
        "iroha_total_refs": None,
    })
    return matrix


# ---- findings + verdict ----
def derive_findings(prompt_trace_24h: dict,
                    doctor_pt: dict,
                    mc_eps: dict,
                    chapter: dict,
                    route_matrix: list[dict]) -> list[dict]:
    findings: list[dict] = []

    chat_row = next((r for r in route_matrix if r["route"] == "/api/chat"), {})
    guest_row = next((r for r in route_matrix if r["route"] == "/api/guest"), {})

    if not chat_row.get("binding", "").startswith("fired"):
        findings.append({"level": "critical", "area": "route_chat",
                         "message": "/api/chat does not appear to bind iroha clause"})
    if not guest_row.get("binding", "").startswith("local"):
        findings.append({"level": "warn", "area": "route_guest",
                         "message": "/api/guest does not appear to bind iroha clause"})

    pt_n = (prompt_trace_24h.get("iroha_clause_lengths") or {}).get("n", 0)
    pt_avg = (prompt_trace_24h.get("iroha_clause_lengths") or {}).get("avg")
    if pt_n == 0:
        findings.append({"level": "critical", "area": "prompt_trace",
                         "message": "no iroha clause length samples in mc_intelligence_fire.jsonl 24h"})
    elif isinstance(pt_avg, (int, float)) and (pt_avg < 532 or pt_avg > 988):
        findings.append({"level": "warn", "area": "prompt_trace",
                         "message": f"24h iroha clause avg={pt_avg} outside expected band 760±30%"})
    else:
        findings.append({"level": "info", "area": "prompt_trace",
                         "message": f"24h iroha clause avg={pt_avg} within expected band (~760)"})

    if not (doctor_pt.get("iroha_keys_in_prompt_trace") or []):
        findings.append({"level": "info", "area": "doctor_v2_prompt_trace",
                         "message": "doctor v2 prompt_trace section does not surface iroha keys"})

    cs = mc_eps.get("claude_summary") or {}
    intel = mc_eps.get("intelligence") or {}
    if cs.get("status") == 401:
        findings.append({"level": "info", "area": "mc_endpoint",
                         "message": "claude-summary 401 (auth missing, strategy C)"})
    if intel.get("status") == 401:
        findings.append({"level": "info", "area": "mc_endpoint",
                         "message": "intelligence 401 (auth missing, strategy C)"})

    if chapter.get("missing_indicators"):
        findings.append({"level": "warn", "area": "chapter_tracking",
                         "message": f"chapter-level keys missing: {','.join(chapter['missing_indicators'])}"})

    return findings


def verdict_from_findings(findings: list[dict]) -> tuple[str, int, int, int]:
    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    if crit > 0:
        v = "RED"
    elif warn > 0:
        v = "YELLOW"
    else:
        v = "GREEN"
    return v, crit, warn, info


# ---- card candidates ----
def derive_card_candidates(verdict: str, chapter: dict,
                           prompt_trace_24h: dict) -> list[dict]:
    cands: list[dict] = []
    if chapter.get("missing_indicators"):
        cands.append({
            "priority": 2,
            "name": "CARD-IROHA-MC-CHAPTER-TRACKING-V1",
            "reason": "chapter-level keys missing: " + ",".join(chapter["missing_indicators"]),
            "source": "iroha_audit",
        })
    cands.append({
        "priority": 3,
        "name": "CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1",
        "reason": "memory_units iroha (63 / 32 scope_id) projection rate not yet visible",
        "source": "iroha_audit",
    })
    cands.append({
        "priority": 4,
        "name": "CARD-IROHA-NOTION-STRUCTURE-WRITE-V1",
        "reason": "Notion 5-chapter map remains pending; audit foundation now ready",
        "source": "iroha_audit",
    })
    cands.append({
        "priority": 4,
        "name": "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1",
        "reason": "TENMON main-line (tone) candidate; complementary",
        "source": "tenmon_priority",
    })
    cands.append({
        "priority": 5,
        "name": "CARD-IROHA-MC-CONNECTION-AUDIT-IMPL-V1",
        "reason": "scriptize this audit for periodic execution from old_vps base",
        "source": "iroha_audit",
    })
    return cands


# ---- writers ----
def write_outputs(out_dir: pathlib.Path, payload: dict, generated_at: str) -> dict[str, pathlib.Path]:
    json_path = out_dir / "iroha_mc_connection_audit_latest.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                         encoding="utf-8")

    pt = payload.get("prompt_trace_24h") or {}
    md = []
    md.append("# Iroha-MC Connection Audit (CARD-IROHA-MC-CONNECTION-AUDIT-V1)")
    md.append("")
    md.append(f"- generated_at: `{generated_at}`")
    md.append(f"- audit_version: {payload.get('audit_version')}")
    md.append(f"- verdict: **{payload.get('verdict')}**")
    s = payload.get("summary") or {}
    md.append(f"- summary: critical={s.get('critical', 0)} / warn={s.get('warn', 0)} / info={s.get('info', 0)}")
    md.append("")
    md.append("## MC Endpoints (HEAD)")
    md.append("")
    for k, v in (payload.get("mc_endpoints") or {}).items():
        md.append(f"- {k}: status={v.get('status')} url={v.get('url')}")
    md.append("")
    md.append("## prompt_trace 24h (iroha clause)")
    md.append("")
    md.append(f"- log: `{pt.get('log_path')}` exists={pt.get('exists')} size={pt.get('size_bytes')}")
    md.append(f"- events_24h={pt.get('events_24h')}, with_prompt_trace={pt.get('events_with_prompt_trace_24h')}, "
              f"iroha_fired={pt.get('iroha_fired_24h')}")
    cl = pt.get("iroha_clause_lengths") or {}
    md.append(f"- clause_lengths: n={cl.get('n')}, min={cl.get('min')}, max={cl.get('max')}, avg={cl.get('avg')}")
    md.append(f"- iroha clause_keys_seen: {pt.get('iroha_clause_keys_seen')}")
    md.append("")
    md.append("## doctor v2 prompt_trace section")
    md.append("")
    dpt = payload.get("doctor_v2_prompt_trace") or {}
    md.append(f"- exists={dpt.get('exists')} verdict={dpt.get('doctor_verdict')} profile={dpt.get('doctor_profile')}")
    md.append(f"- iroha_keys_in_prompt_trace: {dpt.get('iroha_keys_in_prompt_trace')}")
    md.append(f"- all_prompt_trace_keys: {dpt.get('all_prompt_trace_keys')}")
    md.append("")
    md.append("## Route-level matrix")
    md.append("")
    md.append("| route | avg chars (24h) | grounding | binding | inject probe | iroha refs |")
    md.append("|---|---|---|---|---|---|")
    for r in payload.get("route_matrix") or []:
        md.append(f"| {r['route']} | {r.get('clause_chars_avg_24h')} | {r.get('grounding')} | "
                  f"{r.get('binding')} | {r.get('inject_probe')} | {r.get('iroha_total_refs')} |")
    md.append("")
    md.append("## Chapter tracking")
    md.append("")
    ch = payload.get("chapter_tracking") or {}
    md.append(f"- currently_aggregated: {ch.get('currently_aggregated')}")
    md.append(f"- iroha_keys_seen_anywhere: {ch.get('iroha_keys_seen_anywhere')}")
    md.append(f"- missing_indicators: {ch.get('missing_indicators')}")
    md.append("")
    md.append("## Findings")
    md.append("")
    for f in payload.get("findings") or []:
        md.append(f"- [{f.get('level')}] [{f.get('area')}] {f.get('message')}")
    md.append("")
    md.append("## Card candidates")
    md.append("")
    for c in payload.get("card_candidates") or []:
        md.append(f"- [P{c.get('priority')}] **{c.get('name')}** ({c.get('source')})")
        md.append(f"  - reason: {c.get('reason')}")

    md_path = out_dir / "iroha_mc_connection_audit_latest.md"
    md_path.write_text("\n".join(md) + "\n", encoding="utf-8")

    return {"json": json_path, "md": md_path}


# ---- main ----
def cmd_audit(_args: argparse.Namespace) -> int:
    repo_root = _resolve_repo_root()
    out_dir = _resolve_out_dir(repo_root)
    data_dir = _resolve_data_dir()
    host = _resolve_host()

    _safe_mkdir(out_dir)
    generated_at = _now_iso()

    mc_eps = region_mc_endpoints(host)
    mc_src = region_mc_source_grep(repo_root)
    pt_24h = region_prompt_trace_24h(data_dir)
    doctor_pt = region_doctor_v2_prompt_trace(out_dir)
    route = region_route_iroha(repo_root)
    chapter = region_chapter_tracking(pt_24h, doctor_pt)
    matrix = synthesize_route_matrix(pt_24h, mc_eps, route)
    findings = derive_findings(pt_24h, doctor_pt, mc_eps, chapter, matrix)
    verdict, crit, warn, info = verdict_from_findings(findings)
    cards = derive_card_candidates(verdict, chapter, pt_24h)

    payload = {
        "audit_version": AUDIT_VERSION,
        "card": "CARD-IROHA-MC-CONNECTION-AUDIT-V1",
        "generated_at": generated_at,
        "host": host,
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "mc_endpoints": mc_eps,
        "mc_source": mc_src,
        "prompt_trace_24h": pt_24h,
        "doctor_v2_prompt_trace": doctor_pt,
        "route": route,
        "route_matrix": matrix,
        "chapter_tracking": chapter,
        "card_candidates": cards,
        "findings": findings,
    }

    paths = write_outputs(out_dir, payload, generated_at)

    print(f"[iroha_audit] verdict={verdict} crit={crit} warn={warn} info={info}")
    print(f"[iroha_audit] iroha 24h avg chars={pt_24h.get('iroha_clause_lengths', {}).get('avg')}")
    print(f"[iroha_audit] events_24h={pt_24h.get('events_24h')} fired={pt_24h.get('iroha_fired_24h')}")
    print(f"[iroha_audit] candidates={len(cards)}")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0


def main(argv: list[str] | None = None) -> int:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_iroha_mc_connection_audit_v1",
        description="TENMON Iroha-MC Connection Audit v1 (CARD-IROHA-MC-CONNECTION-AUDIT-V1)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("audit", help="Run read-only iroha-MC audit (1 manual run)")
    args = parser.parse_args(argv)
    if args.cmd == "audit":
        return cmd_audit(args)
    parser.error(f"unknown command: {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
