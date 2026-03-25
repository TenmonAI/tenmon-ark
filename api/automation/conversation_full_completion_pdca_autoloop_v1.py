#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1

Step 1 観測固定: build / health / audit / runtime probes / 静的スキャン / replay 要約。
パッチ適用は別工程（1変更=1検証）。出力は観測ベース。

出力: api/automation/reports/TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1/<UTC>/
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

CARD = "TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1"
VERSION = 1

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]

if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from seal_contract_normalize_v1 import replay_acceptance_ok, workspace_ready_apply_safe

STAGE3_CARD = "TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1"

PRIORITY_1_PROBES = frozenset(
    {"soul_1", "continuity_followup_1", "next_step_2", "worldview_1", "support_dense_1", "selfaware_dense_1"}
)


def _utc_folder() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _atomic_write(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    if isinstance(obj, str):
        tmp.write_text(obj, encoding="utf-8")
    else:
        tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _run_shell(cmd: str, cwd: Path, timeout: int = 600) -> Tuple[int, str]:
    p = subprocess.run(
        cmd,
        shell=True,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def _sq(s: str) -> str:
    return shlex.quote(s)


def _http_json(method: str, url: str, body: Optional[bytes] = None, timeout: int = 25) -> Dict[str, Any]:
    req = urllib.request.Request(url, method=method, data=body)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return {
                "ok": True,
                "status": resp.getcode(),
                "json": json.loads(raw) if raw.strip() else None,
                "raw": raw[:4000],
            }
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok": False, "status": e.code, "error": str(e), "raw": raw[:2000]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _probe_specs(ts: str) -> List[Dict[str, str]]:
    def iso(i: int) -> str:
        return f"pdca1-iso-{ts}-{i}"

    cont = f"pdca1-cont-{ts}"
    nxt = f"pdca1-next-{ts}"
    return [
        {"id": "define_1", "threadId": iso(0), "message": "言霊とは何ですか？"},
        {"id": "define_2", "threadId": iso(1), "message": "魂とは何ですか？"},
        {"id": "soul_1", "threadId": iso(2), "message": "魂と火水の関係を一文で"},
        {"id": "scripture_1", "threadId": iso(3), "message": "言霊秘書とは何ですか？"},
        {"id": "subconcept_1", "threadId": iso(4), "message": "ウタヒとは？"},
        {"id": "judge_1", "threadId": iso(5), "message": "この件をどう整理すればいい？"},
        {"id": "judge_2", "threadId": iso(6), "message": "次に何を直すべき？"},
        {"id": "support_1", "threadId": iso(7), "message": "今日は少し疲れています"},
        {"id": "support_2", "threadId": iso(8), "message": "なんだか重いです"},
        {"id": "ai_conscious", "threadId": iso(9), "message": "AIに意識はあるの？"},
        {"id": "why_break", "threadId": iso(10), "message": "会話が崩れるのはなぜ？"},
        {"id": "longform_3k", "threadId": iso(11), "message": "3000字で言霊を本質から説明して"},
        {"id": "longform_8k", "threadId": iso(12), "message": "8000字でカタカムナと言霊の関係を章立てで書いて"},
        {"id": "continuity_seed", "threadId": cont, "message": "カタカムナとは何ですか？"},
        {"id": "continuity_followup_1", "threadId": cont, "message": "さっきの話の続きで、水火だけ一言で言って"},
        {"id": "continuity_followup_2", "threadId": cont, "message": "その続きを五十音一言法則に接続して"},
        {"id": "next_step_seed", "threadId": nxt, "message": "この件をどう整理すればいい？"},
        {"id": "next_step_1", "threadId": nxt, "message": "その整理の次の一手は？"},
        {"id": "next_step_2", "threadId": nxt, "message": "その一手を今日中に一つに絞ると？"},
        {"id": "compare_1", "threadId": iso(13), "message": "言霊とカタカムナの違いを教えて"},
        {"id": "compare_2", "threadId": iso(14), "message": "魂と心の違いは？"},
        {"id": "worldview_1", "threadId": iso(15), "message": "天聞の世界観を一文でどう置く？"},
        {"id": "worldview_2", "threadId": iso(16), "message": "死後の世界はあるのか？"},
        {"id": "scripture_dense_1", "threadId": iso(17), "message": "言霊秘書の正典的位置づけを、儀式文なしで核心だけ述べて"},
        {"id": "define_dense_1", "threadId": iso(18), "message": "言霊を一文で定義し、次に本質、最後に次の一手まで三句で"},
        {"id": "support_dense_1", "threadId": iso(19), "message": "いま心が折れそうで、何から整えればいいか分からない"},
        {"id": "selfaware_dense_1", "threadId": iso(20), "message": "あなたは何者として応答の責任を負っているの？"},
    ]


def _norm_ws(s: str) -> str:
    return re.sub(r"\s+", "", str(s or ""))


def _detect_merged_tail_duplicate_paragraph(text: str) -> bool:
    """直前2段落の連結（空白除去）と同一の第3段落があれば True（観測）。"""
    paras = [p.strip() for p in re.split(r"\n{2,}", str(text or "")) if p.strip()]
    if len(paras) < 3:
        return False
    for i in range(2, len(paras)):
        merged = _norm_ws(paras[i - 2] + paras[i - 1])
        cur = _norm_ws(paras[i])
        if len(merged) >= 32 and cur == merged:
            return True
    return False


def _support_family_repetition_bad(text: str, probe: str) -> bool:
    if probe not in ("support_1", "support_2", "support_dense_1", "why_break"):
        return False
    t = str(text or "")
    if t.count("重さを受け取りました") >= 2:
        return True
    lines = [ln.strip() for ln in t.splitlines() if ln.strip()]
    seen: Set[str] = set()
    for ln in lines:
        if len(ln) >= 14 and ln in seen:
            return True
        seen.add(ln)
    return False


def _route_surface_family(rr: Optional[str]) -> str:
    s = str(rr or "").strip()
    if not s:
        return "unknown"
    if s == "NATURAL_GENERAL_LLM_TOP":
        return "fallback_general"
    if "JUDGEMENT" in s or "judge" in s.lower():
        return "judgement"
    if "KANAGI" in s or "SUPPORT_" in s or s == "N2_KANAGI_PHASE_TOP":
        return "support"
    if "CONTINUITY" in s or "NEXTSTEP" in s or "ESSENCE_FOLLOWUP" in s:
        return "continuity_nextstep"
    if "WORLDVIEW" in s or "RELATIONAL" in s:
        return "worldview"
    if "SELFAWARE" in s or "CONSCIOUSNESS" in s:
        return "selfaware"
    if "DEF_" in s or "FASTPATH" in s or "SUBCONCEPT" in s:
        return "define"
    if "SCRIPTURE" in s or "KATAKAMUNA" in s:
        return "scripture"
    if "EXPLICIT_CHAR" in s or "LONGFORM" in s:
        return "longform"
    if "COMPARE" in s or "STRICT_COMPARE" in s:
        return "compare"
    return "other"


def _probe_row(base: str, probe_id: str, message: str, thread_id: str) -> Dict[str, Any]:
    url = base.rstrip("/") + "/api/chat"
    payload = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    t0 = time.time()
    r = _http_json("POST", url, payload, timeout=90)
    lat = round(time.time() - t0, 3)
    row: Dict[str, Any] = {
        "probe": probe_id,
        "threadId": thread_id,
        "message": message,
        "ok": False,
        "latency_s": lat,
        "rr": None,
        "rc": None,
        "hasResponsePlan": False,
        "rp_rr": None,
        "hasThreadCoreInFrame": False,
        "kuIsObject": False,
        "len": 0,
        "responseHead": "",
        "repetition_bad": False,
        "generic_preamble_bad": False,
        "center_preamble_bad": False,
        "helper_tail_bad": False,
        "ref_bundle_leak_bad": False,
        "meta_preamble_leak_bad": False,
        "merged_duplicate_paragraph_bad": False,
        "support_judgement_why_repetition_bad": False,
        "longform_shortfall": False,
        "fallback_bleed": False,
        "route_reason_mismatch": False,
        "error": None,
        "_text": "",
    }
    if not r.get("ok") or r.get("status") != 200:
        row["error"] = r.get("error") or f"http_{r.get('status')}"
        return row
    obj = r.get("json") or {}
    df = obj.get("decisionFrame") if isinstance(obj, dict) else None
    ku = (df or {}).get("ku") if isinstance(df, dict) else None
    row["kuIsObject"] = isinstance(ku, dict)
    if not isinstance(ku, dict):
        ku = {}
    resp_text = str(obj.get("response") or "")
    row["_text"] = resp_text
    row["len"] = len(resp_text)
    row["responseHead"] = resp_text[:400].replace("\n", "\\n")
    row["rr"] = ku.get("routeReason")
    row["rc"] = ku.get("routeClass")
    rp = ku.get("responsePlan")
    row["hasResponsePlan"] = isinstance(rp, dict) and len(rp) > 0
    if isinstance(rp, dict):
        row["rp_rr"] = rp.get("routeReason")
    tc = ku.get("threadCore")
    row["hasThreadCoreInFrame"] = isinstance(tc, dict) and len(tc) > 0
    row["route_reason_mismatch"] = bool(row["rr"] and row["rp_rr"] and row["rr"] != row["rp_rr"])
    row["fallback_bleed"] = row["rr"] == "NATURAL_GENERAL_LLM_TOP"
    row["ok"] = True

    row["helper_tail_bad"] = "（補助）" in resp_text
    row["generic_preamble_bad"] = bool(
        re.search(r"この問いについて、今回は(定義|分析)の立場で答えます。", resp_text)
    )
    row["center_preamble_bad"] = len(re.findall(r"【中心】", resp_text[:1200])) >= 2
    row["ref_bundle_leak_bad"] = bool(
        re.search(r"一貫の手がかりは|いまの答えは、典拠は|参照束（", resp_text)
    )
    row["meta_preamble_leak_bad"] = row["generic_preamble_bad"] or row["ref_bundle_leak_bad"]

    paras = [p.strip() for p in re.split(r"\n\n+", resp_text) if p.strip()]
    seen: Set[str] = set()
    dup = False
    for p in paras:
        if p in seen:
            dup = True
            break
        seen.add(p)
    row["repetition_bad"] = dup
    row["merged_duplicate_paragraph_bad"] = _detect_merged_tail_duplicate_paragraph(resp_text)
    row["support_judgement_why_repetition_bad"] = (
        _support_family_repetition_bad(resp_text, probe_id)
        or (
            probe_id in ("judge_1", "judge_2")
            and (row["repetition_bad"] or row["merged_duplicate_paragraph_bad"])
        )
    )

    if probe_id == "longform_3k":
        row["longform_shortfall"] = len(resp_text) < 2400
    elif probe_id == "longform_8k":
        row["longform_shortfall"] = len(resp_text) < 6000

    return row


def _density_from_row(row: Dict[str, Any]) -> Dict[str, Any]:
    text = (row.get("_text") or "")[:8000]
    probe = row.get("probe") or ""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    first = lines[0] if lines else ""
    second = lines[1] if len(lines) > 1 else ""
    first_center = len(first) >= 8
    if probe in ("define_1", "define_2", "define_dense_1"):
        first_center = "とは" in first or len(first) >= 10
    if probe == "continuity_followup_1":
        first_center = bool(re.search(r"水|火|カタ|カム", text))
    essence = len(second) >= 8
    one_step = bool(re.search(r"次|一手|どちら|どれから|今日|今週", text))
    cont_link = True
    if probe == "continuity_followup_1":
        cont_link = bool(re.search(r"水|火", text))
    elif probe == "continuity_followup_2":
        cont_link = bool(re.search(r"五十|いろは|音|一言", text))
    return {
        "heuristicVersion": "pdca_autoloop_v1_h1",
        "first_sentence_center_hit": first_center,
        "second_sentence_essence_hit": essence,
        "one_step_visibility": one_step,
        "continuity_link_hit": cont_link,
    }


def _continuity_reset_audit(repo: Path) -> Dict[str, Any]:
    files = [
        "api/src/core/threadCoreCarryProjectionV1.ts",
        "api/src/core/threadCoreLinkSurfaceV1.ts",
        "api/src/core/tenmonBrainstem.ts",
        "api/src/routes/chat.ts",
    ]
    keys = [
        "shouldCarry",
        "shouldReset",
        "topicShift",
        "centerKey",
        "threadCore",
        "黄金比",
        "carry",
        "reset",
    ]
    hits: Dict[str, Any] = {}
    for rel in files:
        p = repo / rel
        if not p.is_file():
            hits[rel] = {"exists": False}
            continue
        raw = p.read_text(encoding="utf-8", errors="replace")
        hits[rel] = {
            "exists": True,
            "lineCount": len(raw.splitlines()),
            "keywordHits": {k: raw.count(k) for k in keys},
        }
    return {
        "card": CARD,
        "version": VERSION,
        "heuristic": "static_keyword_inventory_v1",
        "files": hits,
        "note": "shouldCarryContinuityV1 / topicShiftDetectorV1 の有無は次サイクルで人間レビューまたは AST 監査へ",
    }


def _unknown_bridge_audit(repo: Path) -> Dict[str, Any]:
    chat = repo / "api" / "src" / "routes" / "chat.ts"
    patterns = [
        r"UNKNOWN",
        r"unknownBridge",
        r"buildAbstractFrame",
        r"opaque",
        r"internal.*term",
    ]
    out_pat: List[Dict[str, Any]] = []
    text = chat.read_text(encoding="utf-8", errors="replace") if chat.is_file() else ""
    for pat in patterns:
        try:
            c = len(re.findall(pat, text, flags=re.I))
        except re.error:
            c = -1
        out_pat.append({"pattern": pat, "countInChatTs": c})
    soul = repo / "api" / "src" / "core" / "soulDefineDisambigV1.ts"
    return {
        "card": CARD,
        "chatTsPatterns": out_pat,
        "soulDefineDisambigExists": soul.is_file(),
        "note": "観測のみ。過発火判定は runtime probe（時間・黄金比等）を別途追加すること",
    }


def _pct(ok_n: int, tot: int) -> int:
    if tot <= 0:
        return 100
    return int(round(100 * ok_n / tot))


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--base-url", default=os.environ.get("TENMON_PROBE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--repo-root", type=Path, default=_REPO_ROOT)
    ap.add_argument("--utc", default=None)
    ap.add_argument("--skip-build", action="store_true")
    ap.add_argument(
        "--report-card",
        default=CARD,
        help="レポート親ディレクトリ名（Stage3 は TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1）",
    )
    args = ap.parse_args()

    repo = args.repo_root.resolve()
    utc = args.utc or _utc_folder()
    out_dir = repo / "api" / "automation" / "reports" / args.report_card / utc
    out_dir.mkdir(parents=True, exist_ok=True)
    log: List[str] = []
    gen_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def lg(m: str) -> None:
        log.append(m)

    lg(f"{args.report_card} utc={utc}")

    _, git_out = _run_shell(
        "git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --porcelain",
        repo,
        timeout=60,
    )
    porcelain = [ln for ln in git_out.splitlines()[2:] if ln.strip()]
    workspace_dirty = len(porcelain) > 0

    build_ok = True
    build_log = ""
    if not args.skip_build:
        bc, build_log = _run_shell("npm run build", repo / "api", timeout=900)
        build_ok = bc == 0
        lg(f"build exit={bc}")
    _atomic_write(out_dir / "baseline_build.log", build_log or "[skip-build]")

    health = _http_json("GET", args.base_url.rstrip("/") + "/health", None, 15)
    audit = _http_json("GET", args.base_url.rstrip("/") + "/api/audit", None, 25)
    health_ok = bool(health.get("ok") and (health.get("json") or {}).get("status") == "ok")
    audit_ok = bool(audit.get("ok") and audit.get("status") == 200)

    wo = _run_shell(
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'workspace_observer_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json --skip-api-build",
        _AUTOMATION_DIR,
        timeout=300,
    )
    try:
        wo_p = json.loads(wo[1].strip() or "{}")
    except json.JSONDecodeError:
        wo_p = {}

    ra = _run_shell(
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'replay_audit_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json",
        _AUTOMATION_DIR,
        timeout=300,
    )
    try:
        ra_p = json.loads(ra[1].strip() or "{}")
    except json.JSONDecodeError:
        ra_p = {}

    git_wo = wo_p.get("git") if isinstance(wo_p.get("git"), dict) else {}
    dc_wo = git_wo.get("dirtyClassification") if isinstance(git_wo.get("dirtyClassification"), dict) else {}
    classified_apply_safe = (not workspace_dirty) or (dc_wo.get("applySafeForAutonomousSeal") is True)
    replay_acc_ok = replay_acceptance_ok(ra_p)
    workspace_apply_ok = workspace_ready_apply_safe(wo_p)

    eg = _run_shell(
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'execution_gate_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json",
        _AUTOMATION_DIR,
        timeout=120,
    )
    try:
        eg_p = json.loads(eg[1].strip() or "{}")
    except json.JSONDecodeError:
        eg_p = {}

    ec = _run_shell(
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'chatts_exit_contract_lock_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json",
        _AUTOMATION_DIR,
        timeout=180,
    )
    try:
        ec_p = json.loads(ec[1].strip() or "{}")
    except json.JSONDecodeError:
        ec_p = {}

    ca = _run_shell(
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'chatts_audit_suite_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json",
        _AUTOMATION_DIR,
        timeout=180,
    )
    try:
        ca_p = json.loads(ca[1].strip() or "{}")
    except json.JSONDecodeError:
        ca_p = {}

    miss_rp = 0
    if isinstance(ca_p.get("missingResponsePlanCandidates"), list):
        miss_rp = len(ca_p["missingResponsePlanCandidates"])
    elif ca_p.get("missingResponsePlanCandidates") is not None:
        miss_rp = int(ca_p.get("missingResponsePlanCandidates") or 0)

    miss_tc = 0
    if isinstance(ca_p.get("missingThreadCoreCandidates"), list):
        miss_tc = len(ca_p["missingThreadCoreCandidates"])
    elif ca_p.get("missingThreadCoreCandidates") is not None:
        miss_tc = int(ca_p.get("missingThreadCoreCandidates") or 0)

    exit_drifts = len(ec_p.get("contractDriftCandidates") or [])

    specs = _probe_specs(utc.replace(":", ""))
    probes: List[Dict[str, Any]] = []
    for sp in specs:
        row = _probe_row(args.base_url, sp["id"], sp["message"], sp["threadId"])
        row["density"] = _density_from_row(row)
        row["surfaceFamily"] = _route_surface_family(row.get("rr"))
        del row["_text"]
        probes.append(row)

    n = len(probes)
    n_ok = sum(1 for p in probes if p.get("ok"))

    def cnt(key: str) -> int:
        return sum(1 for p in probes if p.get("ok") and p.get(key))

    ku_obj_n = sum(1 for p in probes if p.get("ok") and p.get("kuIsObject"))
    rp_n = sum(1 for p in probes if p.get("ok") and p.get("hasResponsePlan"))
    tc_n = sum(1 for p in probes if p.get("ok") and p.get("hasThreadCoreInFrame"))
    rr_n = sum(1 for p in probes if p.get("ok") and p.get("rr"))

    surface_blockers = (
        cnt("meta_preamble_leak_bad")
        + cnt("helper_tail_bad")
        + cnt("merged_duplicate_paragraph_bad")
        + cnt("support_judgement_why_repetition_bad")
        + cnt("longform_shortfall")
        + cnt("fallback_bleed")
        + cnt("generic_preamble_bad")
        + cnt("center_preamble_bad")
    )

    ok_rows = [p for p in probes if p.get("ok")]
    dn = max(len(ok_rows), 1)
    cont_rows = [p for p in ok_rows if str(p.get("probe", "")).startswith("continuity_followup")]
    ct = max(len(cont_rows), 1)
    cont_rate = round(
        100 * sum(1 for p in cont_rows if p.get("density", {}).get("continuity_link_hit")) / ct,
        2,
    )
    essence_rate = round(
        100 * sum(1 for p in ok_rows if p.get("density", {}).get("second_sentence_essence_hit")) / dn,
        2,
    )
    one_step_rate = round(
        100 * sum(1 for p in ok_rows if p.get("density", {}).get("one_step_visibility")) / dn,
        2,
    )

    by_family: Dict[str, List[str]] = {}
    for p in probes:
        if not p.get("ok"):
            continue
        fam = p.get("surfaceFamily") or "unknown"
        by_family.setdefault(fam, []).append(p.get("probe") or "")

    runtime_surface_family = {
        "generatedAt": gen_at,
        "byFamily": {k: {"probes": v, "count": len(v)} for k, v in sorted(by_family.items())},
        "aggregates": {
            "helper_tail_bad": cnt("helper_tail_bad"),
            "meta_preamble_leak_bad": cnt("meta_preamble_leak_bad"),
            "ref_bundle_leak_bad": cnt("ref_bundle_leak_bad"),
            "merged_duplicate_paragraph_bad": cnt("merged_duplicate_paragraph_bad"),
            "support_judgement_why_repetition_bad": cnt("support_judgement_why_repetition_bad"),
            "fallback_bleed": cnt("fallback_bleed"),
            "longform_shortfall": cnt("longform_shortfall"),
            "repetition_bad": cnt("repetition_bad"),
        },
        "priority1_probe_status": [
            {
                "probe": pid,
                "row": next((p for p in probes if p.get("probe") == pid), None),
            }
            for pid in sorted(PRIORITY_1_PROBES)
        ],
    }

    density_summary = {
        "generatedAt": gen_at,
        "continuity_link_hit_rate": cont_rate,
        "essence_sentence_hit_rate": essence_rate,
        "one_step_visibility_rate": one_step_rate,
        "targets": {"continuity_min": 95, "essence_min": 90, "one_step_min": 95},
        "pass_continuity": cont_rate >= 95,
        "pass_one_step": one_step_rate >= 95,
    }

    replay_acceptance_summary = {
        "generatedAt": gen_at,
        "replay_exitCode": ra[0],
        "acceptanceOk": replay_acc_ok,
        "acceptanceOk_rawTopLevel": ra_p.get("acceptanceOk"),
        "acceptanceOk_nested": (ra_p.get("acceptance") or {}).get("ok")
        if isinstance(ra_p.get("acceptance"), dict)
        else None,
        "workspace_observer_readyForApply": wo_p.get("readyForApply"),
        "workspace_observer_readyForApplyApplySafe": wo_p.get("readyForApplyApplySafe"),
        "execution_gate_decision": eg_p.get("decision"),
        "workspace_dirty": workspace_dirty,
        "workspace_classified_apply_safe": dc_wo.get("applySafeForAutonomousSeal"),
    }

    baseline_summary = {
        "card": args.report_card,
        "version": VERSION,
        "generatedAt": gen_at,
        "build_ok": build_ok,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "workspace_dirty": workspace_dirty,
        "gitPorcelainCount": len(porcelain),
        "probe_n_ok": n_ok,
        "probe_n_total": n,
        "ku_object_rate_pct": _pct(ku_obj_n, n_ok),
        "routeReason_present_rate_pct": _pct(rr_n, n_ok),
        "responsePlan_present_rate_pct": _pct(rp_n, n_ok),
        "threadCore_present_rate_pct": _pct(tc_n, n_ok),
        "exit_contract_drifts": exit_drifts,
        "missing_response_plan_candidates": miss_rp,
        "missing_threadcore_candidates": miss_tc,
        "runtime_surface_blockers": surface_blockers,
        "priority_top3": [
            {"rank": 1, "theme": "restart_and_route_bleed", "probes": sorted(PRIORITY_1_PROBES)},
            {"rank": 2, "theme": "continuity_and_essence_rates", "metrics": density_summary},
            {"rank": 3, "theme": "replay_acceptance_and_ready_for_apply", "summary": replay_acceptance_summary},
        ],
    }

    remaining: List[str] = []
    if not build_ok:
        remaining.append("build_fail")
    if not health_ok:
        remaining.append("health_fail")
    if surface_blockers:
        remaining.append(f"runtime_surface_blockers={surface_blockers}")
    if cnt("fallback_bleed"):
        remaining.append("fallback_bleed_nonzero")
    if cont_rate < 95:
        remaining.append(f"continuity_link_hit_rate={cont_rate}")
    if one_step_rate < 95:
        remaining.append(f"one_step_visibility_rate={one_step_rate}")
    if workspace_dirty and not classified_apply_safe:
        remaining.append("workspace_dirty_unsafe_or_unclassified")
    if not workspace_apply_ok:
        remaining.append("ready_for_apply_not_true")
    if not replay_acc_ok:
        remaining.append("replay_acceptanceOk_not_true")
    if miss_rp or miss_tc:
        remaining.append("static_contract_candidates_nonzero")
    if exit_drifts:
        remaining.append("exit_contract_drifts_nonzero")

    def score_blockers(blockers: int, cap: int = 20) -> int:
        return max(0, 100 - min(cap, blockers * 5))

    surface_completion = score_blockers(surface_blockers + cnt("fallback_bleed"))
    continuity_completion = int(min(100, max(0, cont_rate)))
    conv_os = int(round((surface_completion + _pct(rp_n, n_ok) + _pct(tc_n, n_ok) + _pct(rr_n, n_ok)) / 4))
    unknown_bridge_completion = 55
    autonomous_completion = 0
    if workspace_apply_ok and replay_acc_ok and classified_apply_safe:
        autonomous_completion = 100
    elif workspace_apply_ok or replay_acc_ok:
        autonomous_completion = 50
    else:
        autonomous_completion = 25

    seal_ready = len(remaining) == 0
    seal_allowed = (
        seal_ready
        and surface_blockers == 0
        and cont_rate >= 95
        and one_step_rate >= 95
        and workspace_apply_ok
        and replay_acc_ok
        and classified_apply_safe
    )

    seal_mechanical = {
        "workspace_apply_ready": workspace_apply_ok,
        "replay_acceptance_ok": replay_acc_ok,
        "workspace_classified_apply_safe": classified_apply_safe,
        "seal_ready": seal_ready,
        "seal_allowed": seal_allowed,
    }
    heuristic_summary = {
        "autonomous_completion_score": autonomous_completion,
        "unknown_bridge_completion": unknown_bridge_completion,
        "note": "スコアはヒューリスティック。封印可否は seal_mechanical を正とする。",
    }

    final_completion_summary = {
        "conversation_os_completion": min(100, conv_os),
        "continuity_completion": continuity_completion,
        "surface_completion": surface_completion,
        "unknown_bridge_completion": unknown_bridge_completion,
        "autonomous_completion": autonomous_completion,
        "seal_ready": seal_ready,
        "seal_allowed": seal_allowed,
        "remaining_blockers": remaining,
        "seal_mechanical": seal_mechanical,
        "heuristic_summary": heuristic_summary,
        "note": "unknown_bridge_completion は静的観測プレースホルダ（55）。専用 probe 追加で置換すること",
    }

    seal_verdict = f"""# seal_verdict ({args.report_card} / {utc})

## 機械判定（正）

- **seal_mechanical.seal_allowed**: {seal_allowed}
- **workspace_apply_ready**: {workspace_apply_ok}
- **replay_acceptance_ok**: {replay_acc_ok}
- **workspace_classified_apply_safe**: {classified_apply_safe}

## ヒューリスティック（参考）

- **autonomous_completion** スコア: {autonomous_completion}
- **unknown_bridge_completion**: {unknown_bridge_completion}

## 合成

- **seal_ready** (remaining=0): {seal_ready}
- **remaining_blockers**: {len(remaining)}

## ブロッカー一覧

{chr(10).join('- ' + b for b in remaining) or '- （なし）'}

## 次サイクル

1. `restart_and_route_bleed` — VPS/サービス再起動後に priority_1 probe 再計測  
2. `continuity_and_essence_rates` — Phase B 実装後に `continuity_link_hit` を 95+ へ  
3. `replay_acceptance_and_ready_for_apply` — replay + workspace observer（apply-safe 含む）を通す  

---
観測のみの baseline。パッチは `patch_cycle_*` を別実行で埋める。
"""

    priority_top3_file = [
        {"rank": 1, "theme": "restart_and_route_bleed", "probes": sorted(PRIORITY_1_PROBES)},
        {"rank": 2, "theme": "continuity_and_essence_rates", "metrics": density_summary},
        {
            "rank": 3,
            "theme": "replay_acceptance_and_ready_for_apply",
            "summary": replay_acceptance_summary,
        },
    ]
    patch_plan_json = {
        "card": args.report_card,
        "generatedAt": gen_at,
        "principles": ["1_change_1_verify", "minimal_diff", "no_direct_dist_edit"],
        "steps": [
            {"order": 1, "theme": "restart_and_route_bleed", "action": "restart service then re-probe"},
            {"order": 2, "theme": "continuity_and_density", "action": "raise continuity_link_hit / one_step per trunk rules"},
            {
                "order": 3,
                "theme": "replay_and_workspace_gate",
                "action": "replay_audit acceptanceOk + workspace observer ready / apply-safe",
            },
        ],
    }

    _atomic_write(out_dir / "baseline_summary.json", baseline_summary)
    _atomic_write(out_dir / "baseline_probe_matrix.json", {"generatedAt": gen_at, "probes": probes})
    _atomic_write(out_dir / "runtime_surface_family.json", runtime_surface_family)
    _atomic_write(out_dir / "density_summary.json", density_summary)
    _atomic_write(out_dir / "continuity_reset_audit.json", _continuity_reset_audit(repo))
    _atomic_write(out_dir / "unknown_bridge_audit.json", _unknown_bridge_audit(repo))
    _atomic_write(
        out_dir / "patch_cycle_01.json",
        {
            "cycle": 1,
            "theme": "restart_and_route_bleed",
            "applied": False,
            "note": "baseline のみ — 修正は別コミットで記録後に再実行",
        },
    )
    _atomic_write(
        out_dir / "patch_cycle_02.json",
        {
            "cycle": 2,
            "theme": "continuity_and_essence_rates",
            "applied": False,
            "note": "baseline のみ",
        },
    )
    _atomic_write(out_dir / "replay_acceptance_summary.json", replay_acceptance_summary)
    _atomic_write(out_dir / "final_completion_summary.json", final_completion_summary)
    _atomic_write(out_dir / "priority_top3.json", priority_top3_file)
    _atomic_write(out_dir / "patch_plan.json", patch_plan_json)
    _atomic_write(out_dir / "seal_verdict.md", seal_verdict)

    if args.report_card == STAGE3_CARD:
        _atomic_write(out_dir / "workspace_dirty_classification.json", dc_wo)
        _atomic_write(
            out_dir / "ready_for_apply_forensic.json",
            {
                "generatedAt": gen_at,
                "readyForApply": wo_p.get("readyForApply"),
                "readyForApplyApplySafe": wo_p.get("readyForApplyApplySafe"),
                "readyViolations": wo_p.get("readyViolations"),
                "readyViolationsApplySafe": wo_p.get("readyViolationsApplySafe"),
                "workspace_dirty_porcelain": workspace_dirty,
                "classified_apply_safe": classified_apply_safe,
            },
        )
        _atomic_write(
            out_dir / "replay_acceptance_forensic.json",
            {
                "generatedAt": gen_at,
                "replay_exitCode": ra[0],
                "acceptanceOk_topLevel": ra_p.get("acceptanceOk"),
                "acceptance_ok_nested": (ra_p.get("acceptance") or {}).get("ok")
                if isinstance(ra_p.get("acceptance"), dict)
                else None,
                "replay_normalized_ok": replay_acc_ok,
                "finalStatus": ra_p.get("finalStatus"),
            },
        )
        acceptance_summary_stage3 = {
            "generatedAt": gen_at,
            "heuristicJudgement": heuristic_summary,
            "sealMechanical": seal_mechanical,
            "completion_metrics": {
                "surface_blockers": surface_blockers,
                "continuity_link_hit_rate": cont_rate,
                "one_step_visibility_rate": one_step_rate,
            },
        }
        _atomic_write(out_dir / "acceptance_summary.json", acceptance_summary_stage3)
        seal_rec = f"""# seal_recommendation ({STAGE3_CARD} / {utc})

## 機械判定

| 項目 | 値 |
|------|-----|
| seal_allowed | **{seal_allowed}** |
| workspace_apply_ready | **{workspace_apply_ok}** |
| replay_acceptance_ok | **{replay_acc_ok}** |
| workspace_classified_apply_safe | **{classified_apply_safe}** |

## ブロッカー

{chr(10).join('- ' + b for b in remaining) or '- （なし）'}

## 次アクション

- `priority_top3.json` / `patch_plan.json` に従い **1 変更 = 1 検証**。
- 厳密 `readyForApply` が false のときは `ready_for_apply_forensic.json` で violations を潰す。
"""
        _atomic_write(out_dir / "seal_recommendation.md", seal_rec)
        stage3_verdict = f"""# Stage3 verdict ({STAGE3_CARD} / {utc})

## Acceptance（機械）

- completion 相当: remaining_blockers 空 & surface/density 閾値は `final_completion_summary.json` 参照
- **seal_allowed**: {seal_allowed}

## 成果物

- `workspace_dirty_classification.json`
- `ready_for_apply_forensic.json` / `replay_acceptance_forensic.json`
- `acceptance_summary.json`（heuristic vs sealMechanical 分離）

Stage1/2 再発（surface/bleed 急増）時は前段カードへ戻す。
"""
        _atomic_write(out_dir / "stage3_verdict.md", stage3_verdict)
    lg("written all required artifacts")
    _atomic_write(out_dir / "run.log", "\n".join(log) + "\n")

    sys_log = Path("/var/log/tenmon") / f"card_{CARD}" / utc
    try:
        sys_log.mkdir(parents=True, exist_ok=True)
        (sys_log / "run.log").write_text("\n".join(log) + "\n", encoding="utf-8")
    except OSError:
        pass

    print(json.dumps(final_completion_summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
