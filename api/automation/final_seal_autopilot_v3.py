#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3 — 最終封印までの観測・baseline・seal 判定ランナー。

Cycle 0: baseline のみ（パッチ適用は別プロセス / 次回 --cycle N）。
出力: api/automation/reports/TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3/<UTC>/
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
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

CARD = "TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3"
VERSION = 3

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]
_GRAPH = _AUTOMATION_DIR / "card_dependency_graph_v1.json"

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


def _validate_dag(nodes: List[str], edges: List[Dict[str, str]]) -> Tuple[bool, str]:
    node_set: Set[str] = set(nodes)
    for e in edges:
        b, a = e.get("before", ""), e.get("after", "")
        if b not in node_set or a not in node_set:
            return False, f"edge_unknown_node:{e}"
    indeg: Dict[str, int] = {n: 0 for n in nodes}
    adj: Dict[str, List[str]] = defaultdict(list)
    for e in edges:
        b, a = e["before"], e["after"]
        adj[b].append(a)
        indeg[a] = indeg.get(a, 0) + 1
    q = deque([n for n in nodes if indeg[n] == 0])
    seen = 0
    while q:
        u = q.popleft()
        seen += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    if seen != len(nodes):
        return False, "cycle_or_disconnected"
    return True, "ok"


def _probe_specs_v3(ts: str) -> List[Dict[str, str]]:
    def iso(i: int) -> str:
        return f"seal3-iso-{ts}-{i}"

    cont = f"seal3-cont-{ts}"
    nxt = f"seal3-next-{ts}"
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


REQUIRED_RUNTIME_IDS = {
    "define_1",
    "define_2",
    "soul_1",
    "scripture_1",
    "subconcept_1",
    "judge_1",
    "judge_2",
    "support_1",
    "support_2",
    "ai_conscious",
    "why_break",
    "longform_3k",
    "longform_8k",
}


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
    row["route_reason_mismatch"] = bool(
        row["rr"] and row["rp_rr"] and row["rr"] != row["rp_rr"]
    )
    row["fallback_bleed"] = row["rr"] == "NATURAL_GENERAL_LLM_TOP"
    row["ok"] = True

    row["helper_tail_bad"] = "（補助）" in resp_text
    row["generic_preamble_bad"] = bool(
        re.search(r"この問いについて、今回は(定義|分析)の立場で答えます。", resp_text)
    )
    row["center_preamble_bad"] = len(re.findall(r"【中心】", resp_text[:1200])) >= 2
    paras = [p.strip() for p in re.split(r"\n\n+", resp_text) if p.strip()]
    seen: Set[str] = set()
    dup = False
    for p in paras:
        if p in seen:
            dup = True
            break
        seen.add(p)
    row["repetition_bad"] = dup

    if probe_id == "longform_3k":
        row["longform_shortfall"] = len(resp_text) < 2400
    elif probe_id == "longform_8k":
        row["longform_shortfall"] = len(resp_text) < 6000

    return row


def _density_block(row: Dict[str, Any]) -> Dict[str, Any]:
    text = row.get("_text") or ""
    text = text[:8000]
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
    gen_bridge = bool(re.search(r"いまの言葉を", text))

    scripture_density = True
    if probe in ("scripture_1", "scripture_dense_1"):
        scripture_density = not bool(re.search(r"【儀式】|儀式として|セレモニ", text)) and bool(
            re.search(r"正典|言霊秘書|法則|五十", text)
        )
    define_density = True
    if probe in ("define_1", "define_dense_1"):
        define_density = "とは" in text or "定義" in text
    support_human = True
    if probe in ("support_1", "support_2", "support_dense_1"):
        support_human = not row.get("helper_tail_bad") and not row.get("fallback_bleed")
    judgement_precision = True
    if probe in ("judge_1", "judge_2"):
        judgement_precision = not row.get("repetition_bad")
    selfaware_clarity = True
    if probe in ("ai_conscious", "selfaware_dense_1"):
        selfaware_clarity = len(text) >= 30
    worldview_depth = True
    if probe in ("worldview_1", "worldview_2", "soul_1"):
        worldview_depth = not row.get("fallback_bleed")

    return {
        "heuristicVersion": "final_seal_v3_d1",
        "first_sentence_center_hit": first_center,
        "second_sentence_essence_hit": essence,
        "one_step_visibility": one_step,
        "continuity_link_hit": cont_link,
        "generic_bridge_rate_hit": gen_bridge,
        "scripture_density": scripture_density,
        "define_density": define_density,
        "support_humanness": support_human,
        "judgement_precision": judgement_precision,
        "selfaware_clarity": selfaware_clarity,
        "worldview_depth": worldview_depth,
    }


def _subproc_json(py_script: Path, repo: Path, extra: str = "") -> Dict[str, Any]:
    cmd = f"{sys.executable} {_sq(str(py_script))} --repo-root {_sq(str(repo))} --stdout-json {extra}"
    code, out = _run_shell(cmd, _AUTOMATION_DIR, timeout=300)
    try:
        return {"exitCode": code, "parsed": json.loads(out.strip() or "{}"), "rawTail": out[-6000:]}
    except json.JSONDecodeError:
        return {"exitCode": code, "parsed": None, "rawTail": out[-6000:]}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--base-url", default=os.environ.get("TENMON_PROBE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--repo-root", type=Path, default=_REPO_ROOT)
    ap.add_argument("--utc", default=None)
    ap.add_argument("--skip-build", action="store_true")
    ap.add_argument(
        "--restart-cmd",
        default=None,
        help="Optional shell command to restart API (exit 0 => then re-check /health).",
    )
    ap.add_argument(
        "--assume-restart-ok",
        action="store_true",
        help="Mark restart_ok true without running restart (operator already restarted).",
    )
    ap.add_argument("--cycle", type=int, default=0, help="Report cycle id (0 = baseline only).")
    args = ap.parse_args()

    repo = args.repo_root.resolve()
    utc = args.utc or _utc_folder()
    out_dir = repo / "api" / "automation" / "reports" / CARD / utc
    out_dir.mkdir(parents=True, exist_ok=True)
    log: List[str] = []
    gen_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def lg(m: str) -> None:
        log.append(m)

    lg(f"{CARD} cycle={args.cycle} utc={utc}")

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
        lg(f"npm build exit={bc}")
    _atomic_write(out_dir / "baseline_build.log", build_log or "[skip-build]")

    restart_ok = False
    restart_detail: Dict[str, Any] = {"mode": "none", "exitCode": None, "note": None}
    if args.assume_restart_ok:
        restart_ok = True
        restart_detail = {"mode": "assume", "exitCode": 0, "note": "--assume-restart-ok"}
    elif args.restart_cmd:
        rc, rout = _run_shell(args.restart_cmd, repo, timeout=120)
        restart_detail = {"mode": "command", "exitCode": rc, "stdoutTail": rout[-2000:]}
        restart_ok = rc == 0
        time.sleep(2)
    else:
        restart_detail = {
            "mode": "skipped",
            "note": "no --restart-cmd; seal requires operator restart or --assume-restart-ok",
        }

    health_before = _http_json("GET", args.base_url.rstrip("/") + "/health", None, 15)
    health_ok = bool(health_before.get("ok") and health_before.get("json", {}).get("status") == "ok")
    audit = _http_json("GET", args.base_url.rstrip("/") + "/api/audit", None, 25)
    audit_ok = bool(audit.get("ok") and audit.get("status") == 200)

    wo = _subproc_json(_AUTOMATION_DIR / "workspace_observer_v1.py", repo, "--skip-api-build")
    eg = _subproc_json(_AUTOMATION_DIR / "execution_gate_v1.py", repo)
    ra = _subproc_json(_AUTOMATION_DIR / "replay_audit_v1.py", repo)
    fa_cmd = (
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'full_autopilot_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --skip-heavy --stdout-json"
    )
    fac, fa_out = _run_shell(fa_cmd, _AUTOMATION_DIR, timeout=240)
    try:
        fa_parsed = json.loads(fa_out.strip() or "{}")
    except json.JSONDecodeError:
        fa_parsed = None

    ca_cmd = (
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'chatts_audit_suite_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json"
    )
    cac, ca_out = _run_shell(ca_cmd, _AUTOMATION_DIR, timeout=180)
    try:
        chatts = json.loads(ca_out.strip() or "{}")
    except json.JSONDecodeError:
        chatts = {}

    ec_cmd = (
        f"{sys.executable} {_sq(str(_AUTOMATION_DIR / 'chatts_exit_contract_lock_v1.py'))} "
        f"--repo-root {_sq(str(repo))} --stdout-json"
    )
    ecc, ec_out = _run_shell(ec_cmd, _AUTOMATION_DIR, timeout=180)
    try:
        exit_contract = json.loads(ec_out.strip() or "{}")
    except json.JSONDecodeError:
        exit_contract = {}

    wo_p = wo.get("parsed") or {}
    eg_p = eg.get("parsed") or {}
    ra_p = ra.get("parsed") or {}

    git_wo = wo_p.get("git") if isinstance(wo_p.get("git"), dict) else {}
    dc_wo = git_wo.get("dirtyClassification") if isinstance(git_wo.get("dirtyClassification"), dict) else {}
    mechanical_workspace_safe = (not workspace_dirty) or (dc_wo.get("applySafeForAutonomousSeal") is True)
    replay_acc_ok = replay_acceptance_ok(ra_p)
    workspace_apply_ok = workspace_ready_apply_safe(wo_p)

    miss_rp = int(chatts.get("missingResponsePlanCandidates") or 0)
    if isinstance(chatts.get("missingResponsePlanCandidates"), list):
        miss_rp = len(chatts["missingResponsePlanCandidates"])
    miss_tc = int(chatts.get("missingThreadCoreCandidates") or 0)
    if isinstance(chatts.get("missingThreadCoreCandidates"), list):
        miss_tc = len(chatts["missingThreadCoreCandidates"])

    drift_list = exit_contract.get("contractDriftCandidates") or []
    exit_drifts = len(drift_list)

    manifest_path = repo / "api" / "automation" / "generated_patch_recipes" / "patch_recipes_manifest_v1.json"
    manifest_missing_total = 0 if manifest_path.is_file() else 1

    card_graph_ok = False
    card_graph_note = "missing_file"
    if _GRAPH.is_file():
        try:
            gd = json.loads(_GRAPH.read_text(encoding="utf-8"))
            nodes, edges = list(gd.get("nodes") or []), list(gd.get("edges") or [])
            ok_dag, why = _validate_dag(nodes, edges)
            card_graph_ok = ok_dag
            card_graph_note = why
        except (OSError, json.JSONDecodeError) as e:
            card_graph_note = str(e)

    # Probes
    specs = _probe_specs_v3(utc.replace(":", ""))
    probes: List[Dict[str, Any]] = []
    for sp in specs:
        row = _probe_row(args.base_url, sp["id"], sp["message"], sp["threadId"])
        row["density"] = _density_block(row)
        del row["_text"]
        probes.append(row)

    n_ok = sum(1 for p in probes if p.get("ok"))
    required_rows = [p for p in probes if p.get("probe") in REQUIRED_RUNTIME_IDS]
    required_ok = sum(1 for p in required_rows if p.get("ok"))
    required_present = len(required_rows) == len(REQUIRED_RUNTIME_IDS)

    def cnt(k: str) -> int:
        return sum(1 for p in probes if p.get("ok") and p.get(k))

    surface_blockers = (
        cnt("repetition_bad")
        + cnt("generic_preamble_bad")
        + cnt("center_preamble_bad")
        + cnt("helper_tail_bad")
        + cnt("longform_shortfall")
        + cnt("fallback_bleed")
        + cnt("route_reason_mismatch")
    )

    ok_rows = [p for p in probes if p.get("ok")]
    dn = max(len(ok_rows), 1)
    first_rate = round(100 * sum(1 for p in ok_rows if p["density"]["first_sentence_center_hit"]) / dn, 2)
    essence_rate = round(100 * sum(1 for p in ok_rows if p["density"]["second_sentence_essence_hit"]) / dn, 2)
    one_step_rate = round(100 * sum(1 for p in ok_rows if p["density"]["one_step_visibility"]) / dn, 2)
    cont_subset = [p for p in ok_rows if str(p.get("probe", "")).startswith("continuity_followup")]
    ct = max(len(cont_subset), 1)
    cont_rate = round(
        100 * sum(1 for p in cont_subset if p["density"]["continuity_link_hit"]) / ct,
        2,
    )
    gen_bridge_rate = round(100 * sum(1 for p in ok_rows if p["density"]["generic_bridge_rate_hit"]) / dn, 2)
    repetition_practical_zero = cnt("repetition_bad") == 0

    baseline_completion = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": gen_at,
        "cycle": args.cycle,
        "build_ok": build_ok,
        "restart_ok": restart_ok,
        "restart_detail": restart_detail,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "required_probe_routes_present": required_present,
        "required_probe_ok_count": required_ok,
        "required_probe_total": len(REQUIRED_RUNTIME_IDS),
        "missing_response_plan_candidates": miss_rp,
        "missing_threadcore_candidates": miss_tc,
        "exit_contract_drifts": exit_drifts,
        "manifest_missing_total": manifest_missing_total,
        "workspace_dirty": workspace_dirty,
        "workspace_classified_apply_safe": dc_wo.get("applySafeForAutonomousSeal"),
        "gitPorcelainSample": porcelain[:30],
    }

    baseline_runtime_surface = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": gen_at,
        "aggregates": {
            "n_probes": len(probes),
            "n_ok": n_ok,
            "repetition_bad": cnt("repetition_bad"),
            "generic_preamble_bad": cnt("generic_preamble_bad"),
            "center_preamble_bad": cnt("center_preamble_bad"),
            "helper_tail_bad": cnt("helper_tail_bad"),
            "longform_shortfall": cnt("longform_shortfall"),
            "fallback_bleed": cnt("fallback_bleed"),
            "route_reason_mismatch": cnt("route_reason_mismatch"),
            "runtime_surface_blockers": surface_blockers,
        },
        "natural_general_probes": [p["probe"] for p in probes if p.get("fallback_bleed")],
    }

    surface_family_pass = all(
        p["density"].get(k, True)
        for p in ok_rows
        for k in (
            "scripture_density",
            "define_density",
            "support_humanness",
            "judgement_precision",
            "selfaware_clarity",
            "worldview_depth",
        )
    )

    baseline_density = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": gen_at,
        "thresholds": {
            "first_sentence_center_min": 95,
            "essence_min": 90,
            "one_step_min": 95,
            "continuity_min": 90,
            "generic_bridge_max": 5,
        },
        "rates": {
            "first_sentence_center_hit": first_rate,
            "essence_sentence_hit": essence_rate,
            "one_step_visibility": one_step_rate,
            "continuity_link_hit": cont_rate,
            "generic_bridge_rate": gen_bridge_rate,
        },
        "flags": {
            "repetition_bad_practical_zero": repetition_practical_zero,
            "longform_shortfall_zero": cnt("longform_shortfall") == 0,
            "surface_family_pass": surface_family_pass,
        },
    }

    density_pass = (
        first_rate >= 95
        and essence_rate >= 90
        and one_step_rate >= 95
        and cont_rate >= 90
        and gen_bridge_rate <= 5
        and repetition_practical_zero
        and cnt("longform_shortfall") == 0
        and surface_family_pass
    )

    autonomous = {
        "repo_root_resolution_ok": repo.is_dir() and (repo / "api").is_dir(),
        "observer_ok": wo.get("exitCode") == 0,
        "execution_gate_ok": eg.get("exitCode") == 0,
        "replay_ok": ra.get("exitCode") == 0,
        "replay_acceptanceOk": replay_acc_ok,
        "replay_acceptanceOk_raw": ra_p.get("acceptanceOk"),
        "autopilot_ok": fac == 0,
        "card_graph_ok": card_graph_ok,
        "card_graph_note": card_graph_note,
        "next_cycle_ok": True,
        "stuck_classifier_ok": True,
        "acceptance_summary_ok": True,
        "maintenance_self_heal_ok": True,
        "automation_probe_rows": {
            "observer_root_1": {
                "ok": wo.get("exitCode") == 0,
                "readyForApply": wo_p.get("readyForApply"),
                "readyForApplyApplySafe": wo_p.get("readyForApplyApplySafe"),
            },
            "gate_root_1": {"ok": eg.get("exitCode") == 0, "decision": eg_p.get("decision")},
            "replay_root_1": {"ok": ra.get("exitCode") == 0},
            "autopilot_root_1": {"ok": fac == 0},
            "manifest_1": {"ok": manifest_missing_total == 0},
            "seal_1": {"ok": False, "note": "computed after composite seal gate"},
        },
    }

    automation_pass = (
        autonomous["repo_root_resolution_ok"]
        and autonomous["observer_ok"]
        and autonomous["execution_gate_ok"]
        and autonomous["replay_ok"]
        and autonomous["autopilot_ok"]
        and autonomous["card_graph_ok"]
        and replay_acc_ok
        and workspace_apply_ok
    )

    completion_pass = (
        build_ok
        and restart_ok
        and health_ok
        and audit_ok
        and required_ok == len(REQUIRED_RUNTIME_IDS)
        and miss_rp == 0
        and miss_tc == 0
        and exit_drifts == 0
        and manifest_missing_total == 0
        and mechanical_workspace_safe
        and surface_blockers == 0
    )

    seal_allowed = completion_pass and density_pass and automation_pass
    ready_to_seal_now = seal_allowed

    critical_blockers: List[str] = []
    if not build_ok:
        critical_blockers.append("build_fail")
    if not health_ok:
        critical_blockers.append("health_fail")
    if not restart_ok:
        critical_blockers.append("restart_not_verified")
    if not mechanical_workspace_safe:
        critical_blockers.append("workspace_dirty_unsafe_or_unclassified")
    if miss_rp or miss_tc:
        critical_blockers.append("static_contract_candidates_nonzero")
    if exit_drifts:
        critical_blockers.append("exit_contract_drifts_nonzero")
    if surface_blockers:
        critical_blockers.append("runtime_surface_blockers")
    if not replay_acc_ok:
        critical_blockers.append("replay_acceptance_not_true")
    if not workspace_apply_ok:
        critical_blockers.append("workspace_not_ready_for_apply")
    if miss_rp:
        critical_blockers.append("missing_response_plan_candidates_nonzero")
    if miss_tc:
        critical_blockers.append("missing_threadcore_candidates_nonzero")
    if exit_drifts:
        critical_blockers.append("exit_contract_drifts_nonzero")
    if manifest_missing_total:
        critical_blockers.append("manifest_missing")

    def tier(ok: bool, partial: bool) -> str:
        if ok:
            return "PASS"
        return "PARTIAL" if partial else "FAIL"

    partial_c = build_ok and health_ok and n_ok == len(probes)
    partial_d = n_ok == len(probes) and not density_pass
    partial_a = (
        autonomous["observer_ok"] and autonomous["execution_gate_ok"] and not automation_pass
    )

    completion_tier = tier(completion_pass, partial_c)
    density_tier = tier(density_pass, partial_d)
    autonomous_tier = tier(automation_pass, partial_a)

    _atomic_write(out_dir / "baseline_completion.json", baseline_completion)
    _atomic_write(out_dir / "baseline_runtime_surface.json", baseline_runtime_surface)
    _atomic_write(out_dir / "baseline_density.json", baseline_density)
    _atomic_write(out_dir / "baseline_autonomous.json", autonomous)
    _atomic_write(out_dir / "baseline_probe_matrix.json", {"generatedAt": gen_at, "probes": probes})

    priority_top3 = [
        {
            "layer": "completion",
            "rank": 1,
            "item": "restart_and_route_bleed",
            "evidence": baseline_runtime_surface.get("natural_general_probes", [])[:8],
        },
        {
            "layer": "density",
            "rank": 1,
            "item": "continuity_and_essence_rates",
            "evidence": {"continuity_link_hit": cont_rate, "essence_sentence_hit": essence_rate},
        },
        {
            "layer": "autonomous",
            "rank": 1,
            "item": "replay_acceptance_and_ready_for_apply",
            "evidence": {
                "replay_acceptance_ok": replay_acc_ok,
                "workspace_apply_ready": workspace_apply_ok,
                "readyForApply": wo_p.get("readyForApply"),
                "readyForApplyApplySafe": wo_p.get("readyForApplyApplySafe"),
            },
        },
    ]
    _atomic_write(out_dir / "priority_top3.json", priority_top3)

    _atomic_write(
        out_dir / "patch_plan.json",
        {
            "card": CARD,
            "cycle": args.cycle,
            "generatedAt": gen_at,
            "principles": ["1_change_1_verify", "minimal_diff", "no_direct_dist_edit"],
            "steps": [
                {"order": 1, "theme": "restart_ok", "action": "restart API or --assume-restart-ok"},
                {"order": 2, "theme": "fallback_bleed", "action": "trunk / KANAGI minimal fix for NATURAL_GENERAL_LLM_TOP"},
                {"order": 3, "theme": "surface", "action": "tenmonConversationSurfaceV1 / route-specific"},
            ],
            "static_contract": {
                "missing_response_plan_candidates": miss_rp,
                "missing_threadcore_candidates": miss_tc,
                "exit_drifts": exit_drifts,
            },
        },
    )

    patch_plan = f"""# patch_plan — {CARD} cycle {args.cycle}

## 原則
観測のみ（本スクリプトは Cycle 0 baseline）。パッチは `priority_top3` に従い **1 変更 = 1 検証** で別途適用。

## 推奨順
1. **restart_ok**: API 再起動を実施し `--restart-cmd` または `--assume-restart-ok` で検証。
2. **fallback_bleed**: `NATURAL_GENERAL_LLM_TOP` プローブ（{baseline_runtime_surface["natural_general_probes"][:6]}…）を trunk / KANAGI 前段で最小修正。
3. **surface**: helper tail / preamble / repetition を `tenmonConversationSurfaceV1` / 該当 route で個別に潰す。

## 静的契約
- missing_response_plan_candidates={miss_rp}, missing_threadcore_candidates={miss_tc}, exit_drifts={exit_drifts}
"""
    _atomic_write(out_dir / "patch_plan.md", patch_plan)

    patch_result = {
        "cycle": args.cycle,
        "applied": False,
        "patches": [],
        "note": "baseline runner does not apply patches; use git apply + rebuild + re-run with same --utc or new utc",
    }
    _atomic_write(out_dir / f"patch_result_{args.cycle}.json", patch_result)
    _atomic_write(
        out_dir / f"rollback_reason_{args.cycle}.json",
        {"rollback": False, "note": "no rollback in baseline cycle"},
    )
    _atomic_write(
        out_dir / f"targeted_check_{args.cycle}.json",
        {
            "required_runtime": {p["probe"]: p.get("rr") for p in required_rows},
            "fallback_bleed_count": cnt("fallback_bleed"),
        },
    )
    _atomic_write(
        out_dir / f"cycle_summary_{args.cycle}.json",
        {
            "completion_tier": completion_tier,
            "density_tier": density_tier,
            "autonomous_tier": autonomous_tier,
            "seal_allowed": seal_allowed,
            "critical_blockers": critical_blockers,
        },
    )
    _atomic_write(out_dir / "structural_issues.json", {"structural": [], "note": "3連続 stuck で昇格"})

    acceptance_summary = {
        "card": CARD,
        "utc": utc,
        "cycle": args.cycle,
        "heuristicJudgement": {
            "note": "密度・surface 閾値は運用チューニングあり。機械 seal は sealMechanical を正とする。",
            "completion_tier": completion_tier,
            "density_tier": density_tier,
            "autonomous_tier": autonomous_tier,
        },
        "sealMechanical": {
            "COMPLETION_PASS": completion_pass,
            "DENSITY_PASS": density_pass,
            "AUTONOMOUS_PASS": automation_pass,
            "replay_acceptance_ok": replay_acc_ok,
            "workspace_apply_ready": workspace_apply_ok,
            "workspace_safe": mechanical_workspace_safe,
            "SEAL_READY": ready_to_seal_now,
            "SEAL_ALLOWED": seal_allowed,
            "CRITICAL_BLOCKERS": critical_blockers,
        },
        "NEXT_CARD": "none" if seal_allowed else CARD,
        "metrics": {
            "completion": baseline_completion,
            "runtime_surface": baseline_runtime_surface["aggregates"],
            "density": baseline_density,
        },
    }
    _atomic_write(out_dir / "acceptance_summary.json", acceptance_summary)

    _atomic_write(
        out_dir / "full_completion_summary.json",
        {
            "card": CARD,
            "utc": utc,
            "cycle": args.cycle,
            "generatedAt": gen_at,
            "sealMechanical": acceptance_summary["sealMechanical"],
            "heuristicJudgement": acceptance_summary["heuristicJudgement"],
            "priority_top3": priority_top3,
        },
    )

    final_seal = {
        "ready_to_seal_now": ready_to_seal_now,
        "seal_allowed": seal_allowed,
        "read_only_seal_candidate": seal_allowed,
        "final_manifest_complete": manifest_missing_total == 0 and exit_drifts == 0 and miss_rp == 0 and miss_tc == 0,
        "workspace_dirty": workspace_dirty,
    }
    _atomic_write(out_dir / "final_seal_summary.json", final_seal)

    seal_md = f"""# seal_recommendation ({CARD} / {utc})

## 機械判定（正）

| 項目 | 値 |
|------|-----|
| SEAL_ALLOWED | **{seal_allowed}** |
| SEAL_READY | **{ready_to_seal_now}** |
| replay_acceptance_ok | **{replay_acc_ok}** |
| workspace_apply_ready | **{workspace_apply_ok}** |
| workspace_safe | **{mechanical_workspace_safe}** |

## ヒューリスティック（参考）

| tier | 値 |
|------|-----|
| completion_tier | {completion_tier} |
| density_tier | {density_tier} |
| autonomous_tier | {autonomous_tier} |

## ブロッカー

{chr(10).join('- ' + b for b in critical_blockers) or '- （なし）'}

## 次アクション

- seal_allowed=false の間は `priority_top3.json` / `patch_plan.json` に従い最小 diff → `npm run build` → 再起動 → 本スクリプト再実行。
- `acceptance PASS 以外 seal 禁止` — `acceptance_summary.json` の **sealMechanical** を正とする。
"""
    _atomic_write(out_dir / "seal_recommendation.md", seal_md)

    worldclass_md = f"""# final_worldclass_verdict ({CARD} / {utc})

## 機械 seal 要約

- **SEAL_ALLOWED**: {seal_allowed}
- **completion PASS**: {completion_pass}
- **density PASS**: {density_pass}
- **autonomous PASS**: {automation_pass}

## 根拠 JSON

- `acceptance_summary.json` → `sealMechanical` / `heuristicJudgement`
- `full_completion_summary.json`

---
観測ランナー生成。運用判断は人間ゲートと憲章に従う。
"""
    _atomic_write(out_dir / "final_worldclass_verdict.md", worldclass_md)

    log_path = out_dir / "run.log"
    lg("done")
    _atomic_write(log_path, "\n".join(log) + "\n")

    sys_log = Path("/var/log/tenmon") / f"card_{CARD}" / utc
    try:
        sys_log.mkdir(parents=True, exist_ok=True)
        (sys_log / "run.log").write_text("\n".join(log) + "\n", encoding="utf-8")
    except OSError:
        pass

    print(
        json.dumps(
            {
                "COMPLETION": completion_tier,
                "DENSITY": density_tier,
                "AUTONOMOUS": autonomous_tier,
                "SEAL_READY": ready_to_seal_now,
                "SEAL_ALLOWED": seal_allowed,
                "CRITICAL_BLOCKERS": critical_blockers,
                "NEXT_CARD": acceptance_summary["NEXT_CARD"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
