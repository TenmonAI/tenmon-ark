#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ARK_WORLDCLASS_ASCENT_AUTOPILOT_V2 — 3層観測ランナー（読取中心）。
出力: api/automation/reports/TENMON_ARK_WORLDCLASS_ASCENT_AUTOPILOT_V2/<UTC>/
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
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_ARK_WORLDCLASS_ASCENT_AUTOPILOT_V2"
VERSION = 2

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]

if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from seal_contract_normalize_v1 import replay_acceptance_ok, workspace_ready_apply_safe


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


def _http_json(method: str, url: str, body: Optional[bytes] = None, timeout: int = 25) -> Dict[str, Any]:
    req = urllib.request.Request(url, method=method, data=body)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.getcode(), "json": json.loads(raw) if raw.strip() else None, "raw": raw[:4000]}
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok": False, "status": e.code, "error": str(e), "raw": raw[:2000]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


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
        "longform_shortfall": False,
        "error": None,
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
    row["len"] = len(resp_text)
    row["responseHead"] = resp_text[:520].replace("\n", "\\n")
    row["rr"] = ku.get("routeReason")
    row["rc"] = ku.get("routeClass")
    rp = ku.get("responsePlan")
    row["hasResponsePlan"] = isinstance(rp, dict) and len(rp) > 0
    if isinstance(rp, dict):
        row["rp_rr"] = rp.get("routeReason")
    tc = ku.get("threadCore")
    row["hasThreadCoreInFrame"] = isinstance(tc, dict) and len(tc) > 0
    row["ok"] = True

    # Heuristics (観測用; カード記載の bad フラグに準拠)
    row["helper_tail_bad"] = "（補助）" in resp_text
    row["generic_preamble_bad"] = bool(
        re.search(r"この問いについて、今回は(定義|分析)の立場で答えます。", resp_text)
    )
    # 長文で【中心】ブロックが近接重複
    row["center_preamble_bad"] = bool(
        len(re.findall(r"【中心】", resp_text[:1200])) >= 2
    )
    paras = [p.strip() for p in re.split(r"\n\n+", resp_text) if p.strip()]
    seen = set()
    dup = False
    for p in paras:
        if p in seen:
            dup = True
            break
        seen.add(p)
    row["repetition_bad"] = dup

    if probe_id in ("longform_3k",):
        row["longform_shortfall"] = len(resp_text) < 2400
    elif probe_id in ("longform_8k",):
        row["longform_shortfall"] = len(resp_text) < 6000

    return row


# 全プローブ（Completion + Density カード指定を統合）
def _all_probe_specs(ts: str) -> List[Dict[str, str]]:
    # threadId は実行ごとに分離
    def iso(i: int) -> str:
        return f"wc2-iso-{ts}-{i}"

    cont = f"wc2-cont-{ts}"
    nxt = f"wc2-next-{ts}"
    return [
        {"id": "define_1", "threadId": iso(0), "message": "言霊とは何ですか？"},
        {"id": "define_2", "threadId": iso(1), "message": "魂とは何ですか？"},
        {"id": "subconcept_1", "threadId": iso(2), "message": "ウタヒとは？"},
        {"id": "scripture_1", "threadId": iso(3), "message": "言霊秘書とは何ですか？"},
        {"id": "judge_1", "threadId": iso(4), "message": "この件をどう整理すればいい？"},
        {"id": "judge_2", "threadId": iso(5), "message": "次に何を直すべき？"},
        {"id": "support_1", "threadId": iso(6), "message": "今日は少し疲れています"},
        {"id": "support_2", "threadId": iso(7), "message": "なんだか重いです"},
        {"id": "why_break", "threadId": iso(8), "message": "会話が崩れるのはなぜ？"},
        {"id": "ai_conscious", "threadId": iso(9), "message": "AIに意識はあるの？"},
        {"id": "longform_3k", "threadId": iso(10), "message": "3000字で言霊を本質から説明して"},
        {"id": "longform_8k", "threadId": iso(11), "message": "8000字でカタカムナと言霊の関係を章立てで書いて"},
        {"id": "compare_1", "threadId": iso(12), "message": "言霊とカタカムナの違いを教えて"},
        {"id": "compare_2", "threadId": iso(13), "message": "魂と心の違いは？"},
        {"id": "worldview_1", "threadId": iso(14), "message": "天聞の世界観を一文でどう置く？"},
        {"id": "worldview_2", "threadId": iso(15), "message": "死後の世界はあるのか？"},
        {"id": "support_deep_1", "threadId": iso(16), "message": "いま心が折れそうで、何から整えればいいか分からない"},
        {"id": "define_dense_1", "threadId": iso(17), "message": "言霊を一文で定義し、次に本質、最後に次の一手まで三句で"},
        {"id": "scripture_dense_1", "threadId": iso(18), "message": "言霊秘書の正典的位置づけを、儀式文なしで核心だけ述べて"},
        {"id": "selfaware_dense_1", "threadId": iso(19), "message": "あなたは何者として応答の責任を負っているの？"},
        {"id": "soul_1", "threadId": iso(20), "message": "魂と火水の関係を一文で"},
        {"id": "continuity_seed", "threadId": cont, "message": "カタカムナとは何ですか？"},
        {"id": "continuity_followup_1", "threadId": cont, "message": "さっきの話の続きで、水火だけ一言で言って"},
        {"id": "continuity_followup_2", "threadId": cont, "message": "その続きを五十音一言法則に接続して"},
        {"id": "next_step_seed", "threadId": nxt, "message": "この件をどう整理すればいい？"},
        {"id": "next_step_1", "threadId": nxt, "message": "その整理の次の一手は？"},
        {"id": "next_step_2", "threadId": nxt, "message": "その一手を今日中に一つに絞ると？"},
    ]


def _density_extensions(row: Dict[str, Any]) -> Dict[str, Any]:
    """密度・継続ヒューリスティック（版を明示）"""
    text = (row.get("responseHead") or "").replace("\\n", "\n")
    probe = row.get("probe") or ""
    first_line = text.split("\n")[0] if text else ""
    # 一文目に「主題っぽい」語が含まれるか（粗い代理指標）
    first_sentence_center_hit = len(first_line) >= 8
    if probe.startswith("define") or probe in ("define_1", "define_2", "define_dense_1"):
        first_sentence_center_hit = "とは" in first_line or len(first_line) >= 12
    if probe == "continuity_followup_1":
        first_sentence_center_hit = bool(re.search(r"水|火|カタ|カム", text))
    generic_bridge_rate_hit = bool(re.search(r"いまの言葉を|次の一歩”に落とし", text))
    continuity_link_hit = True
    if probe == "continuity_followup_1":
        continuity_link_hit = bool(re.search(r"水|火", text))
    elif probe == "continuity_followup_2":
        continuity_link_hit = bool(re.search(r"五十|いろは|音", text))
    one_step_visibility = bool(re.search(r"次|一手|どちら|どれから", text))
    return {
        "heuristicVersion": "worldclass_v2_density_h1",
        "first_sentence_center_hit": first_sentence_center_hit,
        "generic_bridge_rate_hit": generic_bridge_rate_hit,
        "continuity_link_hit": continuity_link_hit,
        "one_step_visibility": one_step_visibility,
        "second_sentence_essence_hit": len(text.split("\n")) >= 2 and len(text.split("\n")[1]) >= 6,
    }


def _subproc_json(script: str, repo: Path) -> Dict[str, Any]:
    py = sys.executable
    cmd = f"{py} {shlex_quote(script)} --repo-root {shlex_quote(str(repo))} --stdout-json"
    code, out = _run_shell(cmd, _AUTOMATION_DIR, timeout=300)
    try:
        return {"exitCode": code, "parsed": json.loads(out.strip() or "{}"), "rawTail": out[-8000:]}
    except json.JSONDecodeError:
        return {"exitCode": code, "parsed": None, "rawTail": out[-8000:]}


def shlex_quote(s: str) -> str:
    return shlex.quote(s)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--base-url", default=os.environ.get("TENMON_PROBE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--repo-root", type=Path, default=_REPO_ROOT)
    ap.add_argument("--utc", default=None)
    ap.add_argument("--skip-build", action="store_true")
    args = ap.parse_args()

    repo: Path = args.repo_root.resolve()
    utc = args.utc or _utc_folder()
    out_dir = repo / "api" / "automation" / "reports" / CARD / utc
    out_dir.mkdir(parents=True, exist_ok=True)
    log_lines: List[str] = []

    def log(msg: str) -> None:
        log_lines.append(msg)

    log(f"{CARD} utc={utc} base={args.base_url}")

    # git
    code, git_out = _run_shell("git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --porcelain", repo)
    git_id = (out_dir / "phase0_git_identity.txt")
    _atomic_write(git_id, git_out)

    # build
    build_log = ""
    if not args.skip_build:
        bc, build_log = _run_shell("npm run build", repo / "api", timeout=900)
        log(f"build exit={bc}")
    _atomic_write(out_dir / "phase0_build.log", build_log or "[skipped]")

    # health / audit
    health = _http_json("GET", args.base_url.rstrip("/") + "/health", None, 15)
    audit = _http_json("GET", args.base_url.rstrip("/") + "/api/audit", None, 20)
    _atomic_write(out_dir / "phase0_health.json", health)
    _atomic_write(out_dir / "phase0_audit_head.json", audit)

    # automation scripts (観測コピー)
    wo = _subproc_json(str(_AUTOMATION_DIR / "workspace_observer_v1.py"), repo)
    eg = _subproc_json(str(_AUTOMATION_DIR / "execution_gate_v1.py"), repo)
    ra = _subproc_json(str(_AUTOMATION_DIR / "replay_audit_v1.py"), repo)
    fa_cmd = (
        f"{sys.executable} {shlex_quote(str(_AUTOMATION_DIR / 'full_autopilot_v1.py'))} "
        f"--repo-root {shlex_quote(str(repo))} --skip-heavy --stdout-json"
    )
    fac, fa_out = _run_shell(fa_cmd, _AUTOMATION_DIR, timeout=180)
    try:
        fa = {"exitCode": fac, "parsed": json.loads(fa_out.strip() or "{}"), "rawTail": fa_out[-8000:]}
    except json.JSONDecodeError:
        fa = {"exitCode": fac, "parsed": None, "rawTail": fa_out[-8000:]}
    ca_cmd = f"{sys.executable} {shlex_quote(str(_AUTOMATION_DIR / 'chatts_audit_suite_v1.py'))} --repo-root {shlex_quote(str(repo))} --stdout-json"
    cac, ca_out = _run_shell(ca_cmd, _AUTOMATION_DIR, timeout=120)
    try:
        ca = {"exitCode": cac, "parsed": json.loads(ca_out.strip() or "{}"), "rawTail": ca_out[-4000:]}
    except json.JSONDecodeError:
        ca = {"exitCode": cac, "parsed": None, "rawTail": ca_out[-4000:]}

    # Probes
    specs = _all_probe_specs(utc.replace(":", ""))
    probes: List[Dict[str, Any]] = []
    for sp in specs:
        row = _probe_row(args.base_url, sp["id"], sp["message"], sp["threadId"])
        row["density"] = _density_extensions(row)
        probes.append(row)

    # Aggregates
    n = len(probes)
    n_ok = sum(1 for p in probes if p.get("ok"))

    def count_bad(key: str) -> int:
        return sum(1 for p in probes if p.get("ok") and p.get(key))

    agg_completion = {
        "n_probes": n,
        "n_ok": n_ok,
        "helper_tail_bad": count_bad("helper_tail_bad"),
        "generic_preamble_bad": count_bad("generic_preamble_bad"),
        "center_preamble_bad": count_bad("center_preamble_bad"),
        "longform_shortfall": count_bad("longform_shortfall"),
        "repetition_bad": count_bad("repetition_bad"),
        "hasResponsePlan_false": sum(1 for p in probes if p.get("ok") and not p.get("hasResponsePlan")),
        "ku_rp_mismatch": sum(
            1
            for p in probes
            if p.get("ok")
            and p.get("rr")
            and p.get("rp_rr")
            and p.get("rr") != p.get("rp_rr")
        ),
        "threadCore_in_frame_true": sum(1 for p in probes if p.get("hasThreadCoreInFrame")),
        "ku_not_object": sum(1 for p in probes if p.get("ok") and not p.get("kuIsObject")),
        "natural_general_count": sum(
            1 for p in probes if p.get("ok") and p.get("rr") == "NATURAL_GENERAL_LLM_TOP"
        ),
        "git_dirty": bool([ln for ln in git_out.splitlines() if ln.strip()][2:]),
    }

    density_rows = [p for p in probes if p.get("ok")]
    dn = max(len(density_rows), 1)
    first_hits = sum(1 for p in density_rows if p.get("density", {}).get("first_sentence_center_hit"))
    gen_br = sum(1 for p in density_rows if p.get("density", {}).get("generic_bridge_rate_hit"))
    cont_hits = sum(
        1
        for p in density_rows
        if p.get("probe", "").startswith("continuity_followup") and p.get("density", {}).get("continuity_link_hit")
    )
    cont_tot = max(
        sum(1 for p in density_rows if p.get("probe", "").startswith("continuity_followup")), 1
    )
    one_step = sum(1 for p in density_rows if p.get("density", {}).get("one_step_visibility"))

    agg_density = {
        "heuristicVersion": "worldclass_v2_density_h1",
        "first_sentence_center_hit_rate": round(100 * first_hits / dn, 2),
        "generic_bridge_rate": round(100 * gen_br / dn, 2),
        "continuity_link_hit_rate": round(100 * cont_hits / cont_tot, 2),
        "one_step_visibility_rate": round(100 * one_step / dn, 2),
        "longform_density_pass": not bool(count_bad("longform_shortfall")),
    }

    wo_snap = wo.get("parsed") or {}
    ra_snap = ra.get("parsed") or {}
    fa_snap = fa.get("parsed") or {}

    manifest_path = repo / "api" / "automation" / "generated_patch_recipes" / "patch_recipes_manifest_v1.json"
    card_catalog = repo / "api" / "automation" / "card_catalog_v1.json"

    autonomous = {
        "repo_root_resolution_ok": repo.is_dir() and (repo / "api").is_dir(),
        "observer_ok": wo.get("exitCode") == 0 and isinstance(wo_snap, dict),
        "observer_readyForApply": wo_snap.get("readyForApply"),
        "gate_ok": eg.get("exitCode") == 0 and isinstance(eg.get("parsed"), dict),
        "replay_ok": ra.get("exitCode") == 0,
        "replay_acceptanceOk": replay_acceptance_ok(ra_snap),
        "replay_acceptanceOk_raw": ra_snap.get("acceptanceOk"),
        "autopilot_ok": fa.get("exitCode") == 0,
        "card_catalog_exists": card_catalog.is_file(),
        "manifest_recipes_exists": manifest_path.is_file(),
        "manifest_missing_total": 0 if manifest_path.is_file() else 1,
        "chatts_audit_ok": ca.get("exitCode") == 0,
    }

    completion_observe = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "aggregates": agg_completion,
        "route_override_candidates": [
            {
                "probe": p.get("probe"),
                "observed": p.get("rr"),
                "notes": "NATURAL_GENERAL_LLM_TOP 落下候補",
            }
            for p in probes
            if p.get("ok") and p.get("rr") == "NATURAL_GENERAL_LLM_TOP"
        ],
        "seal_blockers_observed": [],
    }
    dirty = agg_completion["git_dirty"]
    git_wo = wo_snap.get("git") if isinstance(wo_snap.get("git"), dict) else {}
    dc_wo = git_wo.get("dirtyClassification") if isinstance(git_wo.get("dirtyClassification"), dict) else {}
    mech_ws = (not dirty) or (dc_wo.get("applySafeForAutonomousSeal") is True)
    if not mech_ws:
        completion_observe["seal_blockers_observed"].append("git_dirty_unsafe_or_unclassified")
    if agg_completion["helper_tail_bad"] > 0:
        completion_observe["seal_blockers_observed"].append("helper_tail_bad>0")
    if agg_completion["natural_general_count"] > 0:
        completion_observe["seal_blockers_observed"].append("natural_general_route_nonzero")
    if not replay_acceptance_ok(ra_snap):
        completion_observe["seal_blockers_observed"].append("replay_acceptance_not_ok")
    if not workspace_ready_apply_safe(wo_snap):
        completion_observe["seal_blockers_observed"].append("workspace_not_apply_ready")

    density_observe = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": completion_observe["generatedAt"],
        "aggregates": agg_density,
        "perProbeDensity": {p["probe"]: p.get("density") for p in probes if p.get("ok")},
    }

    autonomous_observe = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": completion_observe["generatedAt"],
        "blocks": autonomous,
        "workspace_observer_excerpt": {
            "readyForApply": wo_snap.get("readyForApply"),
            "readyForApplyApplySafe": wo_snap.get("readyForApplyApplySafe"),
            "readyViolations": (wo_snap.get("readyViolations") or [])[:12],
        },
        "replay_audit_excerpt": {
            "acceptanceOk_normalized": replay_acceptance_ok(ra_snap),
            "acceptanceOk_raw": ra_snap.get("acceptanceOk"),
            "summary": ra_snap.get("summary"),
        },
    }

    _atomic_write(out_dir / "phase0_completion_observe.json", completion_observe)
    _atomic_write(out_dir / "phase0_density_observe.json", density_observe)
    _atomic_write(out_dir / "phase0_autonomous_observe.json", autonomous_observe)
    _atomic_write(out_dir / "runtime_check_0.json", {"probes": probes, "aggregates": agg_completion})

    # PASS 判定（カード閾値）
    d_pass = (
        agg_density["first_sentence_center_hit_rate"] >= 95
        and agg_density["generic_bridge_rate"] <= 5
        and agg_density["continuity_link_hit_rate"] >= 90
        and agg_density["one_step_visibility_rate"] >= 95
        and agg_density["longform_density_pass"]
    )
    c_pass = (
        mech_ws
        and agg_completion["helper_tail_bad"] == 0
        and agg_completion["hasResponsePlan_false"] == 0
        and agg_completion["ku_not_object"] == 0
        and agg_completion["natural_general_count"] == 0
        and replay_acceptance_ok(ra_snap)
        and workspace_ready_apply_safe(wo_snap)
    )
    a_pass = (
        autonomous["observer_ok"]
        and autonomous["gate_ok"]
        and autonomous["replay_ok"]
        and autonomous["autopilot_ok"]
        and autonomous["manifest_missing_total"] == 0
        and autonomous["card_catalog_exists"]
        and replay_acceptance_ok(ra_snap)
        and workspace_ready_apply_safe(wo_snap)
    )

    def tier(ok: bool, partial: bool) -> str:
        if ok:
            return "PASS"
        if partial:
            return "PARTIAL"
        return "FAIL"

    partial_c = n_ok == n and not c_pass
    partial_d = n_ok == n and not d_pass
    partial_a = n_ok == n and not a_pass
    completion_tier = tier(c_pass, partial_c)
    density_tier = tier(d_pass, partial_d)
    autonomous_tier = tier(a_pass, partial_a)
    overall = "PASS" if completion_tier == "PASS" and density_tier == "PASS" and autonomous_tier == "PASS" else (
        "PARTIAL" if n_ok == n else "FAIL"
    )
    seal_allowed = overall == "PASS"

    priority_top3 = [
        {
            "layer": "COMPLETION_LOCK",
            "rank": 1,
            "item": "route_sovereignty_short_affect_kanagi",
            "evidence_probe": "support_2",
            "files": ["api/src/routes/chat.ts"],
            "acceptance_impact": "NATURAL→KANAGI、helper_tail 削減",
        },
        {
            "layer": "DENSITY_ASCENT",
            "rank": 1,
            "item": "continuity_followup_canon_retention",
            "evidence_probe": "continuity_followup_1",
            "files": ["api/src/routes/chat.ts", "api/src/routes/chat_refactor/continuity_trunk_v1.ts"],
            "acceptance_impact": "継続でカタカムナ主権維持",
        },
        {
            "layer": "AUTONOMOUS_ASCENT",
            "rank": 1,
            "item": "replay_acceptance_and_dirty_tree",
            "evidence_probe": "workspace_observer / replay_audit",
            "files": ["repo root git", "api/automation/reports/**"],
            "acceptance_impact": "seal ブロッカー解消",
        },
    ]

    patch_plan = f"""# patch_plan ({CARD})

## サイクル1（観測後）

1. **COMPLETION_LOCK**: `chat.ts` KANAGI 静的分流で「なんだか重いです」系を `疲れ` 系と同型の重さ受け取りへ（`NATURAL_GENERAL` 回避）。
2. **DENSITY_ASCENT**: 継続スレッドの follow-up で `KATAKAMUNA_CANON` / `CONTINUITY_ANCHOR` への接続を trunk 側で検証（1パッチずつ）。
3. **AUTONOMOUS_ASCENT**: `git status` クリーン + `replay_audit_v1` acceptanceOk を満たすスナップショットへ（コード外作業含む）。

## 検証

各パッチ後: `npm run build` + 本ランナー再実行 + `runtime_check_1.json` 比較。
"""

    _atomic_write(out_dir / "priority_top3.json", priority_top3)
    _atomic_write(out_dir / "patch_plan.md", patch_plan)
    _atomic_write(out_dir / "next_cycle_priority.json", {"top": priority_top3, "notes": "3サイクル停滞時は stuck_reasons に構造課題を昇格"})
    _atomic_write(
        out_dir / "stuck_reasons.json",
        {
            "stuck": [],
            "notes": "初回サイクル: 閾値未達項目は次サイクルで再観測",
        },
    )

    acceptance_summary = {
        "card": CARD,
        "utc": utc,
        "COMPLETION_LOCK": completion_tier,
        "DENSITY_ASCENT": density_tier,
        "AUTONOMOUS_ASCENT": autonomous_tier,
        "OVERALL": overall,
        "seal_allowed": seal_allowed,
        "next_card": "TENMON_ARK_WORLDCLASS_ASCENT_AUTOPILOT_V3" if not seal_allowed else "none",
        "metrics": {"completion": agg_completion, "density": agg_density, "autonomous": autonomous},
    }
    _atomic_write(out_dir / "acceptance_summary.json", acceptance_summary)

    worldclass_md = f"""# worldclass_summary ({CARD} / {utc})

## 判定

- COMPLETION LOCK: **{completion_tier}**
- DENSITY ASCENT: **{density_tier}**
- AUTONOMOUS ASCENT: **{autonomous_tier}**
- OVERALL: **{overall}**
- seal_allowed: **{seal_allowed}**
- next_card: **{acceptance_summary["next_card"]}**

## 要約

- プローブ数 {n} / 成功 {n_ok}
- helper_tail_bad: {agg_completion["helper_tail_bad"]}
- NATURAL_GENERAL_LLM_TOP 件数: {agg_completion["natural_general_count"]}
- first_sentence_center_hit_rate: {agg_density["first_sentence_center_hit_rate"]}%
- generic_bridge_rate: {agg_density["generic_bridge_rate"]}%
- continuity_link_hit_rate: {agg_density["continuity_link_hit_rate"]}%

## ログ

- 同梱: `run.log`（リポジトリ内）。`/var/log/tenmon/...` への複製は環境権限に依存。
"""
    _atomic_write(out_dir / "worldclass_summary.md", worldclass_md)

    # density_check / autonomous_check placeholders for cycle 0
    _atomic_write(out_dir / "density_check_0.json", agg_density)
    _atomic_write(out_dir / "autonomous_check_0.json", autonomous)

    log_path = out_dir / "run.log"
    log("\n".join(log_lines + ["probe run complete"]))
    _atomic_write(log_path, "\n".join(log_lines) + "\n")

    # optional system log path
    sys_log = Path("/var/log/tenmon") / f"card_{CARD}" / utc
    try:
        sys_log.mkdir(parents=True, exist_ok=True)
        (sys_log / "run.log").write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    except OSError:
        pass

    print(json.dumps(acceptance_summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
