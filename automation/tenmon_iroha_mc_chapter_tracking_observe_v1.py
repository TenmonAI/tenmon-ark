#!/usr/bin/env python3
"""TENMON-ARK Iroha-MC Chapter Tracking observer v1
(CARD-IROHA-MC-CHAPTER-TRACKING-V1, OBSERVE / design-only).

READ-ONLY 観測ツール: 章別 KPI 化のための DB schema / 既存実装 / 章分類辞書の
カバレッジを再現性ある形で記録する。

- Python3 stdlib only
- sqlite3 は URI mode で `mode=ro`
- HTTP 不使用 (本カードでは HTTP probe は不要、IROHA-MC-CONNECTION-AUDIT-V1 で観測済)
- 出力は最後に 2 ファイル一括 write (atomic)
- 実装変更や DB write は一切しない

Usage:
    python3 automation/tenmon_iroha_mc_chapter_tracking_observe_v1.py observe

Outputs:
    automation/out/iroha_mc_chapter_tracking_observe_latest.json
    automation/out/iroha_mc_chapter_tracking_observe_latest.md

Env (read-only):
    TENMON_DOCTOR_REPO_ROOT     default: /opt/tenmon-ark-repo
    TENMON_DOCTOR_OUT_DIR       default: <REPO_ROOT>/automation/out
    TENMON_DOCTOR_DATA_DIR      default: /opt/tenmon-ark-data
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import re
import sqlite3
import sys


OBS_VERSION = "v1.0.0"


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
        print(f"[chapter_observer] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- env ----
def _resolve_repo_root() -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_REPO_ROOT", "/opt/tenmon-ark-repo"))


def _resolve_out_dir(repo_root: pathlib.Path) -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_OUT_DIR", str(repo_root / "automation" / "out")))


def _resolve_data_dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get("TENMON_DOCTOR_DATA_DIR", "/opt/tenmon-ark-data"))


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


# ---- region 1+2+3: DB schema (read-only URI) ----
def region_db_schema(data_dir: pathlib.Path) -> dict:
    db_path = data_dir / "kokuzo.sqlite"
    out: dict = {"db_path": str(db_path), "exists": db_path.exists(), "tables": {}}
    if not db_path.exists():
        return out
    uri = f"file:{db_path}?mode=ro"
    try:
        con = sqlite3.connect(uri, uri=True)
    except Exception as e:
        out["error"] = f"connect: {e}"
        return out
    try:
        cur = con.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'iroha%' ORDER BY name"
        )
        tables = [r[0] for r in cur.fetchall()]
        for t in tables:
            cur.execute(f"PRAGMA table_info({t})")
            cols = [{"name": r[1], "type": r[2], "notnull": bool(r[3]),
                     "default": r[4], "pk": bool(r[5])} for r in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            n = cur.fetchone()[0]
            out["tables"][t] = {"columns": cols, "row_count": n}
        if "iroha_units" in out["tables"]:
            cur.execute("SELECT doc, COUNT(*) FROM iroha_units GROUP BY doc")
            out["tables"]["iroha_units"]["doc_distribution"] = dict(cur.fetchall())
            cur.execute("SELECT status, COUNT(*) FROM iroha_units GROUP BY status")
            out["tables"]["iroha_units"]["status_distribution"] = dict(cur.fetchall())
            cur.execute("SELECT MIN(pdfPage), MAX(pdfPage), COUNT(DISTINCT pdfPage) FROM iroha_units")
            mn, mx, distinct = cur.fetchone()
            out["tables"]["iroha_units"]["pdf_page_min"] = mn
            out["tables"]["iroha_units"]["pdf_page_max"] = mx
            out["tables"]["iroha_units"]["pdf_page_distinct"] = distinct
        if "iroha_khs_alignment" in out["tables"]:
            cur.execute("SELECT relation, COUNT(*) FROM iroha_khs_alignment GROUP BY relation")
            out["tables"]["iroha_khs_alignment"]["relation_distribution"] = dict(cur.fetchall())
            cur.execute("SELECT COUNT(DISTINCT khsLawKey) FROM iroha_khs_alignment")
            out["tables"]["iroha_khs_alignment"]["distinct_khs_law_keys"] = cur.fetchone()[0]
            cur.execute("SELECT COUNT(DISTINCT irohaUnitId) FROM iroha_khs_alignment")
            out["tables"]["iroha_khs_alignment"]["distinct_iroha_units"] = cur.fetchone()[0]
    finally:
        con.close()
    return out


# ---- region 4: iroha_kotodama_hisho.json structure ----
def region_canon_structure(repo_root: pathlib.Path) -> dict:
    candidates = [
        repo_root / "shared" / "kotodama" / "iroha_kotodama_hisho.json",
        repo_root / "api" / "src" / "data" / "iroha_kotodama_hisho.json",
        repo_root / "server" / "data" / "iroha_kotodama_hisho.json",
    ]
    paths_info = []
    primary = None
    for c in candidates:
        if c.exists():
            paths_info.append({"path": str(c), "size": c.stat().st_size})
            if primary is None:
                primary = c
    out: dict = {"locations": paths_info, "primary": str(primary) if primary else None,
                 "top_level_keys": [], "content_len": 0,
                 "chapter_field_in_root": False, "content_item_type": None,
                 "content_avg_len": None}
    if primary is None:
        return out
    try:
        d = json.loads(primary.read_text(encoding="utf-8"))
    except Exception as e:
        out["error"] = f"json parse: {e}"
        return out
    if isinstance(d, dict):
        out["top_level_keys"] = list(d.keys())
        out["chapter_field_in_root"] = any(
            re.search(r"chapter|section|category|章", k, re.I) for k in d.keys()
        )
        content = d.get("content")
        if isinstance(content, list):
            out["content_len"] = len(content)
            tps = set()
            lens: list[int] = []
            for it in content:
                tps.add(type(it).__name__)
                if isinstance(it, str):
                    lens.append(len(it))
                elif isinstance(it, dict):
                    txt = it.get("text") or it.get("body") or ""
                    if isinstance(txt, str):
                        lens.append(len(txt))
            out["content_item_type"] = sorted(tps)
            if lens:
                out["content_avg_len"] = round(sum(lens) / len(lens), 2)
                out["content_max_len"] = max(lens)
                out["content_min_len"] = min(lens)
    return out


# ---- region 5+6: existing chapter / principle keywords (parsed from loader source) ----
LOADER_PATH_REL = "api/src/core/irohaKotodamaLoader.ts"


def _parse_keyword_block(src: str, var_name: str) -> dict[str, str]:
    """Parse `const X: Record<string, RegExp> = { "key": /regex/, ... }` blocks."""
    out: dict[str, str] = {}
    m = re.search(rf"const\s+{re.escape(var_name)}\s*:[^=]*=\s*\{{(.*?)^\}}", src,
                  re.DOTALL | re.MULTILINE)
    if not m:
        return out
    body = m.group(1)
    for em in re.finditer(r'"([^"]+)"\s*:\s*/((?:\\.|[^/\\])+)/', body):
        key = em.group(1)
        pat = em.group(2)
        out[key] = pat
    return out


def region_existing_chapter_impl(repo_root: pathlib.Path) -> dict:
    p = repo_root / LOADER_PATH_REL
    out: dict = {"loader_path": LOADER_PATH_REL, "exists": p.exists(),
                 "chapter_keywords": {}, "principle_keywords": {},
                 "iroha_paragraph_type_fields": [],
                 "build_iroha_injection_returns_string": False,
                 "build_iroha_injection_uses_chapter_tag": False}
    if not p.exists():
        return out
    src = p.read_text(encoding="utf-8")
    out["chapter_keywords"] = _parse_keyword_block(src, "CHAPTER_KEYWORDS")
    out["principle_keywords"] = _parse_keyword_block(src, "PRINCIPLE_KEYWORDS")

    type_match = re.search(r"export\s+type\s+IrohaParagraph\s*=\s*\{(.*?)\};", src, re.DOTALL)
    if type_match:
        body = type_match.group(1)
        fields = re.findall(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:", body, re.MULTILINE)
        out["iroha_paragraph_type_fields"] = fields

    sig = re.search(r"export\s+function\s+buildIrohaInjection\s*\([^)]*\)\s*:\s*(\w+)", src)
    if sig:
        out["build_iroha_injection_returns_string"] = (sig.group(1).strip() == "string")
    out["build_iroha_injection_uses_chapter_tag"] = "p.chapter ? `[" in src
    return out


# ---- region 7: chapter coverage estimate (existing 7 / existing 6 / TENMON 5) ----
TENMON_5_CHAPTER_KEYWORDS: dict[str, str] = {
    "47ji":    r"四十七|47字|47文字|五十音|いろは47|ヰ|ヱ|京の字|京がなくても",
    "ongi":    r"音義|音意|音響|響き|霊響|音灵|声韻|音律",
    "seimei":  r"生命|いのち|生きる|誕生|命の|魂",
    "shisei":  r"死生|死ぬ|別れ|終わり|転化|再生|輪廻|涅槃|往生",
    "hokekyo": r"法華|妙法|蓮華|如来寿量|観音|普門品|薬王|常不軽",
}


def _coverage(keys: dict[str, str], items: list[str]) -> dict:
    counts: dict[str, int] = {k: 0 for k in keys}
    multi = 0
    none = 0
    for s in items:
        if not isinstance(s, str):
            continue
        hit: list[str] = []
        for k, pat in keys.items():
            try:
                if re.search(pat, s):
                    hit.append(k)
            except re.error:
                continue
        if not hit:
            none += 1
        elif len(hit) > 1:
            multi += 1
        for k in hit:
            counts[k] += 1
    total = len(items)
    classified = total - none
    return {
        "total": total,
        "classified": classified,
        "unclassified": none,
        "multi_match": multi,
        "coverage_pct": round(100.0 * classified / total, 2) if total else 0.0,
        "counts": counts,
    }


def region_chapter_coverage(canon_struct: dict, existing_impl: dict) -> dict:
    primary = canon_struct.get("primary")
    out: dict = {"existing_7chap": None, "existing_6principle": None, "tenmon_5chap": None}
    if not primary:
        return out
    try:
        d = json.loads(pathlib.Path(primary).read_text(encoding="utf-8"))
        content = d.get("content") if isinstance(d, dict) else None
        if not isinstance(content, list):
            return out
        items = [str(x) for x in content if isinstance(x, str)]
    except Exception as e:
        out["error"] = f"canon read: {e}"
        return out

    chap_kws = existing_impl.get("chapter_keywords") or {}
    if chap_kws:
        out["existing_7chap"] = _coverage(chap_kws, items)
    prin_kws = existing_impl.get("principle_keywords") or {}
    if prin_kws:
        out["existing_6principle"] = _coverage(prin_kws, items)
    out["tenmon_5chap"] = _coverage(TENMON_5_CHAPTER_KEYWORDS, items)
    out["tenmon_5_keywords_used"] = TENMON_5_CHAPTER_KEYWORDS
    return out


# ---- region 8: minimum diff line estimate ----
def region_diff_estimate() -> dict:
    return {
        "approach_y_two_axis": {
            "description": "keep existing 7 chapters, add TENMON 5 chapters as parallel chapterTagsV5[]",
            "line_estimate_breakdown": {
                "irohaKotodamaLoader.ts (CHAPTER_KEYWORDS_V5 + IrohaParagraph.chapterTagsV5)": 12,
                "intelligenceFireTracker.ts (PromptTraceClauseLengthsV1 + summary aggregator)": 15,
                "chat.ts (clause_lengths.iroha_chapters object)": 5,
                "satoriEnforcement.ts (IrohaGroundingResult.matchedChapters?)": 5,
                "chat.ts:893 (df.ku.irohaGrounding pass-through matchedChapters)": 1,
                "buildIrohaInjection (export new helper summarizeIrohaInjectionByChapterV1)": 8,
            },
            "total_estimated_lines": 46,
            "back_compat": True,
            "notes": [
                "all new fields are optional / nullable; no existing call site breaks",
                "IrohaParagraph.chapter (existing 7-chap) preserved",
                "buildIrohaInjection signature unchanged (still returns string)",
                "PromptTraceClauseLengthsV1 gains optional iroha_chapters?: Record<string, number>",
            ],
        },
        "approach_x_minimal_existing7": {
            "description": "do not add TENMON 5; expose existing 7-chapter chapterIndex to MC",
            "line_estimate_breakdown": {
                "intelligenceFireTracker.ts (PromptTraceClauseLengthsV1 + aggregator)": 15,
                "chat.ts (compute chapter_lens from queryIrohaByUserText results)": 8,
            },
            "total_estimated_lines": 23,
            "back_compat": True,
            "notes": [
                "lowest cost; surfaces what loader already computes",
                "but uses thought-history axis (universal/Christ/Moses/Kobo) not structural axis (47ji/ongi)",
                "existing 7-chap coverage is only 20% on canon; biased toward 第三章_モせす",
            ],
        },
        "approach_z_replace_with_tenmon5": {
            "description": "deprecate existing 7-chapter, replace with TENMON 5",
            "total_estimated_lines": 60,
            "back_compat": False,
            "notes": [
                "buildIrohaInjection [chapter] tag in LLM system prompt changes meaning",
                "any external dashboard/log indexing existing chapter names breaks",
                "not recommended unless deliberate migration cycle",
            ],
        },
        "recommended": "approach_y_two_axis",
    }


# ---- region 9: card candidates ----
def region_card_candidates() -> list[dict]:
    return [
        {"priority": 1, "name": "CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1",
         "reason": "implement approach Y (existing 7 + TENMON 5 dual-axis) per design",
         "source": "chapter_tracking_observe", "estimated_diff_lines": 46},
        {"priority": 2, "name": "CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1",
         "reason": "memory_units iroha 63 / 32 scope_id projection rate visualization (read-only)",
         "source": "tenmon_priority"},
        {"priority": 3, "name": "CARD-IROHA-NOTION-STRUCTURE-WRITE-V1",
         "reason": "Notion 5-chapter map (write-pending) - safer to write after MC chapter KPI lands",
         "source": "tenmon_priority"},
        {"priority": 4, "name": "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1",
         "reason": "tone policy main-line (orthogonal to chapter tracking)",
         "source": "tenmon_priority"},
    ]


# ---- findings + verdict ----
def derive_findings(db: dict, canon: dict, impl: dict, cov: dict) -> list[dict]:
    findings: list[dict] = []
    tables = db.get("tables") or {}

    if "iroha_units" not in tables:
        findings.append({"level": "critical", "area": "db",
                         "message": "iroha_units table missing"})
    else:
        ucols = [c["name"] for c in tables["iroha_units"]["columns"]]
        chapter_like = [c for c in ucols if re.search(r"chapter|section|category|章", c, re.I)]
        if not chapter_like:
            findings.append({"level": "warn", "area": "db_schema",
                             "message": f"iroha_units has no chapter-like column "
                                        f"(cols={ucols}); chapter classification "
                                        f"must rely on keyword regex (approach A) or supplement table (approach B)"})
        else:
            findings.append({"level": "info", "area": "db_schema",
                             "message": f"iroha_units has chapter-like cols: {chapter_like}"})

    if "iroha_khs_alignment" not in tables:
        findings.append({"level": "warn", "area": "db",
                         "message": "iroha_khs_alignment table missing (hokekyo KPI source candidate)"})
    else:
        n = tables["iroha_khs_alignment"]["row_count"]
        distinct_units = tables["iroha_khs_alignment"].get("distinct_iroha_units")
        findings.append({"level": "info", "area": "db_alignment",
                         "message": f"iroha_khs_alignment rows={n}, distinct iroha_units={distinct_units}; "
                                    f"khsLawKey is 言霊秘書 hash, not 法華経 chapter id"})

    if not canon.get("chapter_field_in_root"):
        findings.append({"level": "info", "area": "canon_json",
                         "message": "iroha_kotodama_hisho.json top-level has no chapter key "
                                    f"(keys={canon.get('top_level_keys')}); content is flat string list "
                                    f"(n={canon.get('content_len')})"})

    if impl.get("chapter_keywords"):
        findings.append({"level": "info", "area": "impl",
                         "message": f"existing CHAPTER_KEYWORDS in loader: "
                                    f"{len(impl['chapter_keywords'])} keys (thought-history axis)"})
    if impl.get("principle_keywords"):
        findings.append({"level": "info", "area": "impl",
                         "message": f"existing PRINCIPLE_KEYWORDS in loader: "
                                    f"{len(impl['principle_keywords'])} keys (structural axis)"})

    e7 = (cov or {}).get("existing_7chap") or {}
    e6 = (cov or {}).get("existing_6principle") or {}
    t5 = (cov or {}).get("tenmon_5chap") or {}
    if e7:
        findings.append({"level": "info", "area": "coverage_existing_7",
                         "message": f"existing 7-chap coverage = {e7.get('coverage_pct')}% "
                                    f"(classified={e7.get('classified')}/{e7.get('total')})"})
    if e6:
        findings.append({"level": "info", "area": "coverage_existing_6",
                         "message": f"existing 6-principle coverage = {e6.get('coverage_pct')}% "
                                    f"(classified={e6.get('classified')}/{e6.get('total')}, "
                                    f"multi_match={e6.get('multi_match')})"})
    if t5:
        pct = t5.get("coverage_pct", 0.0)
        if pct < 50.0:
            findings.append({"level": "warn", "area": "coverage_tenmon_5",
                             "message": f"TENMON 5-chap initial keyword coverage = {pct}% "
                                        f"(<50%); keyword dict needs strengthening esp. hokekyo "
                                        f"(counts={t5.get('counts')})"})
        else:
            findings.append({"level": "info", "area": "coverage_tenmon_5",
                             "message": f"TENMON 5-chap initial keyword coverage = {pct}% "
                                        f"(counts={t5.get('counts')})"})
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


# ---- writers ----
def write_outputs(out_dir: pathlib.Path, payload: dict, generated_at: str) -> dict[str, pathlib.Path]:
    json_path = out_dir / "iroha_mc_chapter_tracking_observe_latest.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md = []
    md.append("# Iroha-MC Chapter Tracking — Observe (CARD-IROHA-MC-CHAPTER-TRACKING-V1)")
    md.append("")
    md.append(f"- generated_at: `{generated_at}`")
    md.append(f"- observer_version: {payload.get('observer_version')}")
    md.append(f"- verdict: **{payload.get('verdict')}**")
    s = payload.get("summary") or {}
    md.append(f"- summary: critical={s.get('critical', 0)} / warn={s.get('warn', 0)} / info={s.get('info', 0)}")
    md.append("")

    md.append("## DB schema (iroha_*)")
    md.append("")
    db = payload.get("db_schema") or {}
    for t, info in (db.get("tables") or {}).items():
        cols = ", ".join(c["name"] for c in info.get("columns", []))
        md.append(f"- `{t}` rows={info.get('row_count')} cols=[{cols}]")
    md.append("")

    md.append("## Canon JSON (iroha_kotodama_hisho.json)")
    md.append("")
    canon = payload.get("canon_structure") or {}
    md.append(f"- primary: `{canon.get('primary')}`")
    md.append(f"- top_level_keys: {canon.get('top_level_keys')}")
    md.append(f"- chapter_field_in_root: {canon.get('chapter_field_in_root')}")
    md.append(f"- content len: {canon.get('content_len')}, item types: {canon.get('content_item_type')}")
    md.append(f"- content avg/min/max chars: {canon.get('content_avg_len')} / "
              f"{canon.get('content_min_len')} / {canon.get('content_max_len')}")
    md.append("")

    md.append("## Existing chapter / principle implementation in loader")
    md.append("")
    impl = payload.get("existing_impl") or {}
    md.append(f"- loader: `{impl.get('loader_path')}`")
    md.append(f"- IrohaParagraph fields: {impl.get('iroha_paragraph_type_fields')}")
    md.append(f"- buildIrohaInjection returns string: {impl.get('build_iroha_injection_returns_string')}")
    md.append(f"- buildIrohaInjection uses chapter tag: {impl.get('build_iroha_injection_uses_chapter_tag')}")
    md.append(f"- existing CHAPTER_KEYWORDS keys: {list((impl.get('chapter_keywords') or {}).keys())}")
    md.append(f"- existing PRINCIPLE_KEYWORDS keys: {list((impl.get('principle_keywords') or {}).keys())}")
    md.append("")

    md.append("## Chapter coverage estimates")
    md.append("")
    cov = payload.get("chapter_coverage") or {}
    for label, key in (("existing 7-chap", "existing_7chap"),
                       ("existing 6-principle", "existing_6principle"),
                       ("TENMON 5-chap", "tenmon_5chap")):
        c = cov.get(key)
        if not c:
            continue
        md.append(f"### {label}")
        md.append("")
        md.append(f"- coverage: **{c.get('coverage_pct')}%** "
                  f"(classified {c.get('classified')}/{c.get('total')}, "
                  f"multi_match={c.get('multi_match')})")
        md.append(f"- counts: {c.get('counts')}")
        md.append("")

    md.append("## Diff estimate (approach Y recommended)")
    md.append("")
    diff = payload.get("diff_estimate") or {}
    rec = diff.get("recommended")
    md.append(f"- recommended: **{rec}**")
    if rec and rec in diff:
        r = diff[rec]
        md.append(f"- total_estimated_lines: **{r.get('total_estimated_lines')}**")
        md.append(f"- back_compat: {r.get('back_compat')}")
        for k, n in (r.get("line_estimate_breakdown") or {}).items():
            md.append(f"  - {k}: +{n} lines")
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

    md_path = out_dir / "iroha_mc_chapter_tracking_observe_latest.md"
    md_path.write_text("\n".join(md) + "\n", encoding="utf-8")
    return {"json": json_path, "md": md_path}


# ---- main ----
def cmd_observe(_args: argparse.Namespace) -> int:
    repo_root = _resolve_repo_root()
    out_dir = _resolve_out_dir(repo_root)
    data_dir = _resolve_data_dir()

    _safe_mkdir(out_dir)
    generated_at = _now_iso()

    db = region_db_schema(data_dir)
    canon = region_canon_structure(repo_root)
    impl = region_existing_chapter_impl(repo_root)
    cov = region_chapter_coverage(canon, impl)
    diff = region_diff_estimate()
    cards = region_card_candidates()

    findings = derive_findings(db, canon, impl, cov)
    verdict, crit, warn, info = verdict_from_findings(findings)

    payload = {
        "observer_version": OBS_VERSION,
        "card": "CARD-IROHA-MC-CHAPTER-TRACKING-V1",
        "generated_at": generated_at,
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "db_schema": db,
        "canon_structure": canon,
        "existing_impl": impl,
        "chapter_coverage": cov,
        "diff_estimate": diff,
        "card_candidates": cards,
        "findings": findings,
    }

    paths = write_outputs(out_dir, payload, generated_at)

    print(f"[chapter_observer] verdict={verdict} crit={crit} warn={warn} info={info}")
    e7 = (cov.get("existing_7chap") or {}).get("coverage_pct")
    e6 = (cov.get("existing_6principle") or {}).get("coverage_pct")
    t5 = (cov.get("tenmon_5chap") or {}).get("coverage_pct")
    print(f"[chapter_observer] coverage existing_7={e7}% existing_6={e6}% tenmon_5={t5}%")
    print(f"[chapter_observer] recommended approach: {diff.get('recommended')}")
    rec = diff.get("recommended")
    if rec:
        print(f"[chapter_observer] estimated_diff_lines: {(diff.get(rec) or {}).get('total_estimated_lines')}")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0


def main(argv: list[str] | None = None) -> int:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_iroha_mc_chapter_tracking_observe_v1",
        description="TENMON Iroha-MC Chapter Tracking observer v1 (CARD-IROHA-MC-CHAPTER-TRACKING-V1)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("observe", help="Run read-only chapter-tracking observation (1 manual run)")
    args = parser.parse_args(argv)
    if args.cmd == "observe":
        return cmd_observe(args)
    parser.error(f"unknown command: {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
