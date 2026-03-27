#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_OS_TRACE_AND_FORENSIC_CURSOR_AUTO_V1

Conversation OS 7layer registry・主要モジュール・代表 probe から
decisionFrame.ku の観測可能フィールドを fail-closed で記録する（観測専用）。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_OS_TRACE_AND_FORENSIC_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_conversation_os_trace_and_forensic_cursor_auto_v1.json"
OUT_MD = "tenmon_conversation_os_trace_and_forensic_cursor_auto_v1.md"

PROBES = [
    "言霊とは",
    "法華経とは",
    "その続きをもう少し深く",
    "agni",
]

STATIC_MODULES: dict[str, str] = {
    "thread_center": "api/src/core/threadCore.ts",
    "binder": "api/src/core/knowledgeBinder.ts",
    "verdict_engine": "api/src/core/tenmonVerdictEngineV1.ts",
    "longform": "api/src/core/tenmonLongformComposerV1.ts",
    "lexicon": "api/src/core/userLexiconMemoryV1.ts",
    "deepread_ingest": "api/src/deepread/sanskritGodnameIngestV1.ts",
}

OBS_KEYS = (
    "routeReason",
    "centerKey",
    "centerMeaning",
    "thoughtCoreSummary",
    "binderSummary",
    "sourcePack",
    "uncertaintyFlags",
    "surfaceStyle",
)

DEEPREAD_FOUR = (
    "strict_etymology",
    "tradition_evidence",
    "tenmon_hypothesis",
    "uncertain_points",
)


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    _atomic_write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def _http_get(url: str, timeout: float = 15.0) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            if not isinstance(js, dict):
                js = {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body[:2000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _http_chat(base: str, thread_id: str, message: str, timeout: float = 90.0) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{base}/api/chat",
        data=json.dumps({"threadId": thread_id, "message": message}, ensure_ascii=False).encode("utf-8"),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            if not isinstance(js, dict):
                js = {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body[:2000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _safe_str(v: Any, max_len: int = 400) -> str:
    s = str(v) if v is not None else ""
    s = s.strip()
    if len(s) > max_len:
        return s[:max_len] + "…"
    return s


def _snapshot_obj(o: Any, depth: int = 2) -> Any:
    if depth <= 0:
        return "…"
    if o is None:
        return None
    if isinstance(o, (bool, int, float)):
        return o
    if isinstance(o, str):
        return _safe_str(o, 500)
    if isinstance(o, list):
        return [_snapshot_obj(x, depth - 1) for x in o[:12]]
    if isinstance(o, dict):
        out: dict[str, Any] = {}
        for k in list(o.keys())[:40]:
            out[str(k)] = _snapshot_obj(o[k], depth - 1)
        return out
    return _safe_str(o, 200)


def _get_ku(chat_json: dict[str, Any]) -> dict[str, Any]:
    df = chat_json.get("decisionFrame")
    if not isinstance(df, dict):
        return {}
    ku = df.get("ku")
    return ku if isinstance(ku, dict) else {}


def _thread_core(ku: dict[str, Any]) -> dict[str, Any]:
    tc = ku.get("threadCore")
    return tc if isinstance(tc, dict) else {}


def _extract_observation(ku: dict[str, Any]) -> dict[str, Any]:
    tc = _thread_core(ku)
    ck = ku.get("centerKey")
    if (ck is None or str(ck).strip() == "") and tc.get("centerKey") is not None:
        ck = tc.get("centerKey")
    tcs = ku.get("thoughtCoreSummary")
    cm = None
    if isinstance(tcs, dict):
        cm = tcs.get("centerMeaning")
    if cm is None and ku.get("centerMeaning") is not None:
        cm = ku.get("centerMeaning")

    obs: dict[str, Any] = {
        "routeReason": _safe_str(ku.get("routeReason"), 300),
        "centerKey": _safe_str(ck, 120) if ck is not None else None,
        "centerMeaning": _safe_str(cm, 300) if cm is not None else None,
        "thoughtCoreSummary": _snapshot_obj(tcs) if isinstance(tcs, dict) else None,
        "binderSummary": _snapshot_obj(ku.get("binderSummary")) if ku.get("binderSummary") is not None else None,
        "sourcePack": _safe_str(ku.get("sourcePack"), 120),
        "uncertaintyFlags": ku.get("uncertaintyFlags") if isinstance(ku.get("uncertaintyFlags"), list) else None,
        "surfaceStyle": _safe_str(ku.get("surfaceStyle"), 80),
    }

    missing: list[str] = []
    if not obs["routeReason"]:
        missing.append("routeReason")
    if obs["centerKey"] is None and obs["centerMeaning"] is None:
        missing.append("centerKey_or_centerMeaning")
    if not isinstance(tcs, dict) or not tcs:
        missing.append("thoughtCoreSummary")
    if ku.get("binderSummary") is None:
        missing.append("binderSummary")
    if not obs["sourcePack"]:
        missing.append("sourcePack")
    if not isinstance(obs["uncertaintyFlags"], list):
        missing.append("uncertaintyFlags")
    if not obs["surfaceStyle"]:
        missing.append("surfaceStyle")

    vs = ku.get("verdictSections")
    verdict_snapshot = _snapshot_obj(vs) if isinstance(vs, dict) else None

    align = ku.get("alignment")
    deepread_from_chat: dict[str, Any] = {
        "from_alignment_judge": None,
        "from_verdict_sections": verdict_snapshot,
    }
    if isinstance(align, dict):
        seg = {k: align.get(k) for k in DEEPREAD_FOUR if k in align}
        if seg:
            deepread_from_chat["from_alignment_judge"] = {
                k: _snapshot_obj(align.get(k)) for k in DEEPREAD_FOUR if k in align
            }
    if deepread_from_chat["from_alignment_judge"] is None and isinstance(vs, dict):
        deepread_from_chat["verdict_sections_as_proxy"] = {
            "facts": vs.get("facts"),
            "tradition": vs.get("tradition"),
            "tenmon_mapping": vs.get("tenmon_mapping"),
            "uncertainty": vs.get("uncertainty"),
        }

    deep_missing: list[str] = []
    if deepread_from_chat["from_alignment_judge"] is None:
        deep_missing.extend([f"deepread_alignment.{k}" for k in DEEPREAD_FOUR])
    if not isinstance(vs, dict) or not vs:
        deep_missing.append("verdictSections")

    return {
        "observation": obs,
        "missing_observation_keys": missing,
        "deepread_four_segments": deepread_from_chat,
        "deepread_missing": deep_missing,
        "threadCore_snapshot": _snapshot_obj(tc) if tc else None,
    }


def _run_npm_build(api_dir: Path) -> dict[str, Any]:
    try:
        p = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=600,
        )
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "stderr_tail": (p.stderr or "")[-2000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": -1, "error": repr(e)}


def _dump_registry_json(api_dir: Path) -> dict[str, Any]:
    dist_js = api_dir / "dist" / "os" / "conversationOs7LayerRegistryV1.js"
    if not dist_js.is_file():
        return {"ok": False, "error": "dist_missing_run_build", "registry": None}
    snippet = """
import { getConversationOs7LayerRegistryV1 } from './dist/os/conversationOs7LayerRegistryV1.js';
const r = getConversationOs7LayerRegistryV1();
console.log(JSON.stringify(r, null, 2));
"""
    try:
        p = subprocess.run(
            ["node", "--input-type=module", "-e", snippet.strip()],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if p.returncode != 0:
            return {"ok": False, "stderr": (p.stderr or "")[-1500:], "registry": None}
        raw = (p.stdout or "").strip()
        obj = json.loads(raw) if raw else {}
        return {"ok": isinstance(obj, dict), "registry": obj if isinstance(obj, dict) else None}
    except Exception as e:
        return {"ok": False, "error": repr(e), "registry": None}


def _forensic_deepread_agni(api_dir: Path) -> dict[str, Any]:
    """accepted 1 件で alignment 4 区分を静的に観測（chat ペイロードとは独立）。"""
    snippet = r"""
import { validateSanskritGodnameRecordV1 } from './dist/deepread/sanskritGodnameSchemaV1.js';
import { analyzeAcceptedSanskritGodnameRecordsV1 } from './dist/deepread/sanskritGodnameIngestV1.js';

const raw = {
  schema: 'TENMON_SANSKRIT_GODNAME_TABLE_V1',
  generation_order: ['probe'],
  japanese_name: 'アグニ',
  japanese_name_kana: 'あぐに',
  name_variants: ['火神'],
  relations: [{ target: '火', relation_type: '属性' }],
  sanskrit_candidates: [{ candidate: 'Agni', reason: 'probe_forensic' }],
  strict_etymology: 'インド文献における火神名としての伝統的呼称。',
  tradition_evidence: 'リグヴェーダ等の火祭・火神記述を参照（比較層）。',
  tenmon_mapping: '天津金木秩序における火の位相写像候補（暫定・比較）。',
  kojiki_role: '比較神話参照のみ。日本神話への同一視はしない。',
  amatsukanagi_position: '暫定',
  alignment_type: 'mapping_candidate',
  mapping_confidence: 0.45,
  evidence_level: 'moderate',
  evidence_refs: [{ ref: 'rv:agni', kind: 'comparative_scripture' }],
  uncertain_points: ['跨文化同一視は保留'],
};
const v = validateSanskritGodnameRecordV1(raw);
if (!v.ok) {
  console.log(JSON.stringify({ ok: false, errors: v.errors }));
  process.exit(2);
}
const rows = analyzeAcceptedSanskritGodnameRecordsV1([
  { materialId: 'forensic_agni', record: v.record },
]);
const a = rows[0]?.alignment;
if (!a) {
  console.log(JSON.stringify({ ok: false, error: 'no_alignment' }));
  process.exit(3);
}
console.log(JSON.stringify({
  ok: true,
  strict_etymology: a.strict_etymology,
  tradition_evidence: a.tradition_evidence,
  tenmon_hypothesis: a.tenmon_hypothesis,
  uncertain_points: a.uncertain_points,
  final_judgement: a.final_judgement,
}));
"""
    try:
        p = subprocess.run(
            ["node", "--input-type=module", "-e", snippet.strip()],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=45,
        )
        out = (p.stdout or "").strip()
        if p.returncode != 0:
            return {"ok": False, "exit_code": p.returncode, "stderr": (p.stderr or "")[-1500:], "raw": out[:800]}
        obj = json.loads(out) if out else {}
        return {"ok": True, "alignment_four": obj if isinstance(obj, dict) else {}}
    except Exception as e:
        return {"ok": False, "error": repr(e)}


def _static_existence(repo: Path) -> dict[str, Any]:
    rows: dict[str, Any] = {}
    missing: list[str] = []
    for key, rel in STATIC_MODULES.items():
        p = repo / rel
        ok = p.is_file()
        rows[key] = {"path": rel, "exists": ok}
        if not ok:
            missing.append(rel)
    return {"modules": rows, "missing_paths": missing}


def _render_md(report: dict[str, Any]) -> str:
    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{report.get('generated_at')}`",
        f"- build_ok: `{report.get('build', {}).get('ok')}`",
        "",
        "## 7-layer registry",
        "",
        "```json",
        json.dumps(report.get("registry_dump", {}), ensure_ascii=False, indent=2)[:12000],
        "```",
        "",
        "## Static modules",
        "",
    ]
    sm = report.get("static_modules") or {}
    for k, v in (sm.get("modules") or {}).items():
        lines.append(f"- **{k}**: `{v.get('path')}` — exists={v.get('exists')}")
    if sm.get("missing_paths"):
        lines.extend(["", "### Missing", "", "- " + "\n- ".join(sm["missing_paths"])])
    lines.extend(["", "## Probes", ""])
    for i, pr in enumerate(report.get("probes") or []):
        msg = pr.get("message", "")
        lines.append(f"### {i + 1}. `{msg}`")
        lines.append("")
        lines.append(f"- http_ok: `{pr.get('http_ok')}`")
        mo = pr.get("missing_observation_keys") or []
        dm = pr.get("deepread_missing") or []
        lines.append(f"- missing_observation_keys: {mo}")
        lines.append(f"- deepread_missing (chat payload): {dm}")
        lines.append("")
        obs = pr.get("observation") if isinstance(pr.get("observation"), dict) else {}
        lines.append("```json")
        lines.append(json.dumps(obs, ensure_ascii=False, indent=2)[:8000])
        lines.append("```")
        lines.append("")
    fd = report.get("forensic_deepread_agni") or {}
    lines.extend(
        [
            "## Forensic deepread (static Agni sample)",
            "",
            "```json",
            json.dumps(fd, ensure_ascii=False, indent=2)[:6000],
            "```",
            "",
            "## observation_gaps_summary",
            "",
            "```json",
            json.dumps(report.get("observation_gaps_summary") or [], ensure_ascii=False, indent=2),
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api_dir = repo / "api"
    auto = api_dir / "automation"
    base = str(os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000")).rstrip("/")

    build = _run_npm_build(api_dir)
    reg = _dump_registry_json(api_dir)
    static = _static_existence(repo)

    h = _http_get(f"{base}/api/health")
    ab = _http_get(f"{base}/api/audit.build")

    ts = int(time.time())
    probes_out: list[dict[str, Any]] = []
    gap_summary: list[str] = []

    forensic = _forensic_deepread_agni(api_dir)

    for i, msg in enumerate(PROBES):
        tid = f"os_trace_{ts}_{i}"
        r = _http_chat(base, tid, msg)
        j = r.get("json") if isinstance(r.get("json"), dict) else {}
        ku = _get_ku(j)
        ex = _extract_observation(ku) if ku else {
            "observation": {},
            "missing_observation_keys": list(OBS_KEYS),
            "deepread_four_segments": {},
            "deepread_missing": [f"deepread_alignment.{k}" for k in DEEPREAD_FOUR],
            "threadCore_snapshot": None,
        }
        if not r.get("ok_http"):
            ex["missing_observation_keys"] = list(
                dict.fromkeys([*ex.get("missing_observation_keys", []), "http_chat_failed"])
            )
            gap_summary.append(f"probe[{i}]:{msg}:http_failed")

        for m in ex.get("missing_observation_keys") or []:
            gap_summary.append(f"probe[{i}]:{msg}:missing:{m}")
        for m in ex.get("deepread_missing") or []:
            gap_summary.append(f"probe[{i}]:{msg}:deepread:{m}")

        probes_out.append(
            {
                "index": i,
                "message": msg,
                "threadId": tid,
                "http_ok": bool(r.get("ok_http")),
                "http_status": r.get("status"),
                **ex,
            }
        )

    missing_layers: list[str] = []
    if not reg.get("ok"):
        missing_layers.append("registry_dump_failed")
    for p in static.get("missing_paths") or []:
        missing_layers.append(f"static:{p}")
    if not h.get("ok_http"):
        missing_layers.append("api_health_unreachable")
    if not ab.get("ok_http"):
        missing_layers.append("api_audit_build_unreachable")
    if not forensic.get("ok"):
        missing_layers.append("forensic_deepread_agni_failed")

    report = {
        "card": CARD,
        "generated_at": _utc(),
        "build": build,
        "registry_dump": reg.get("registry"),
        "registry_ok": bool(reg.get("ok")),
        "static_modules": static,
        "api_health": {"ok_http": h.get("ok_http"), "status": h.get("status")},
        "audit_build": {"ok_http": ab.get("ok_http"), "status": ab.get("status")},
        "probes": probes_out,
        "forensic_deepread_agni": forensic,
        "observation_gaps_summary": gap_summary,
        "missing_layers": missing_layers,
    }

    md = _render_md(report)
    _atomic_write_json(auto / OUT_JSON, report)
    _atomic_write(auto / OUT_MD, md)

    doc = repo / "api" / "docs" / "constitution" / f"{CARD}.md"
    if doc.parent.is_dir():
        brief = "\n".join(
            [
                f"# {CARD}",
                "",
                "観測専用（product core の意味変更なし）。",
                "",
                "- 実行: `python3 api/automation/tenmon_conversation_os_trace_and_forensic_cursor_auto_v1.py`",
                f"- 詳細レポート: `api/automation/{OUT_JSON}` / `api/automation/{OUT_MD}`",
                "- 前提: `npm run build` 成功、`TENMON_GATE_BASE`（既定 `http://127.0.0.1:3000`）で API 稼働",
                "",
            ]
        )
        _atomic_write(doc, brief)

    trace_ready = bool(build.get("ok") and reg.get("ok") and (auto / OUT_JSON).is_file())
    forensic_ready = bool(forensic.get("ok")) and not static.get("missing_paths")

    ok = bool(
        build.get("ok")
        and trace_ready
        and h.get("ok_http")
        and ab.get("ok_http")
        and forensic_ready
    )

    out_card = {
        "ok": ok,
        "card": CARD,
        "trace_ready": trace_ready,
        "forensic_ready": forensic_ready,
        "rollback_used": False,
        "nextOnPass": "TENMON_CONVERSATION_OS_FAILCLOSED_RETRY_GENERATOR_CURSOR_AUTO_V1",
        "nextOnFail": None,
    }
    print(json.dumps(out_card, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
