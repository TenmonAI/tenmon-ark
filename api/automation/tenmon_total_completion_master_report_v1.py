#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1
単一レポート: 基盤〜learning までの code/runtime/acceptance を統合観測（product 改修ではない）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1"
EXECUTION_CARD = "TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1"
FAIL_NEXT = "TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1"

OUT_JSON = "tenmon_total_completion_master_report.json"
OUT_MD = "tenmon_total_completion_master_report.md"
OUT_PQ = "tenmon_total_completion_master_priority_queue.json"
OUT_BLK = "tenmon_total_completion_master_blockers_by_system.json"

SUBSYSTEM_KEYS = [
    "infra_gate",
    "conversation_backend",
    "conversation_continuity",
    "pwa_code_constitution",
    "pwa_lived_proof",
    "seal_state",
    "repo_hygiene",
    "self_audit_os",
    "self_repair_os",
    "self_build_os",
    "remote_admin_cursor",
    "learning_self_improvement",
    "worldclass_score",
]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def staleness_risk(path: Path, max_age_hours: float = 168.0) -> str:
    """7日超で stale_high。"""
    try:
        age = time.time() - path.stat().st_mtime
        if age > max_age_hours * 3600:
            return "stale_high"
        if age > 72 * 3600:
            return "stale_medium"
        return "fresh"
    except OSError:
        return "unknown"


def http_get(url: str, timeout: float = 45.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": e.code, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}


def post_chat(base: str, message: str, thread_id: str | None, user_id: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/chat"
    payload: dict[str, Any] = {
        "message": message,
        "messages": [{"role": "user", "content": message}],
        "userId": user_id,
    }
    if thread_id:
        payload["threadId"] = thread_id
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": e.code, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}


def parse_json(s: str) -> dict[str, Any] | None:
    try:
        o = json.loads(s)
        return o if isinstance(o, dict) else None
    except Exception:
        return None


def extract_route_reason(parsed: dict[str, Any] | None) -> str | None:
    if not parsed:
        return None
    df = parsed.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict) and ku.get("routeReason"):
            return str(ku.get("routeReason"))
        if df.get("routeReason"):
            return str(df.get("routeReason"))
    return None


def has_dup_lines(a: str, b: str) -> bool:
    la = {x.strip() for x in (a or "").splitlines() if len(x.strip()) >= 20}
    lb = {x.strip() for x in (b or "").splitlines() if len(x.strip()) >= 20}
    return len(la & lb) > 0


def merge_chat_from_shell(log_dir: Path) -> dict[str, Any] | None:
    """runner が保存した curl 応答を優先統合（実行契約）。"""
    p1 = log_dir / "chat_probe_curl_1.json"
    p2 = log_dir / "chat_probe_curl_2.json"
    if not p1.is_file() or not p2.is_file():
        return None
    try:
        b1 = p1.read_text(encoding="utf-8", errors="replace")
        b2 = p2.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if len(b1.strip()) < 2 or len(b2.strip()) < 2:
        return None
    p1j = parse_json(b1)
    p2j = parse_json(b2)
    tid = "probe_master_forensic"
    if isinstance(p1j, dict) and p1j.get("threadId"):
        tid = str(p1j.get("threadId")).strip() or tid
    text1 = str(p1j.get("response") or "") if isinstance(p1j, dict) else ""
    text2 = str(p2j.get("response") or "") if isinstance(p2j, dict) else ""
    rr1 = extract_route_reason(p1j)
    rr2 = extract_route_reason(p2j)
    has_answer_1 = len(text1.strip()) > 10
    has_answer_2 = len(text2.strip()) > 10
    duplication_signal = has_dup_lines(text1, text2)
    continuity_signal = has_answer_2 and not duplication_signal and len(text2) > 15
    return {
        "card": CARD,
        "source": "shell_runner_embedded_curl",
        "paths": [str(p1), str(p2)],
        "threadId": tid,
        "routeReason_turn1": rr1,
        "routeReason_turn2": rr2,
        "has_answer": {"turn1": has_answer_1, "turn2": has_answer_2},
        "duplication_signal": duplication_signal,
        "continuity_signal": continuity_signal,
    }


def load_shell_frontend_grep(log_dir: Path) -> dict[str, Any]:
    """grep 成果物の行数・バイト（false fail とファイル欠落を分離）。"""
    files = {
        "window_location_reload": "frontend_grep_window_reload.txt",
        "sessionId": "frontend_grep_sessionId.txt",
        "bak_paths": "frontend_find_bak.txt",
        "threadId": "frontend_grep_threadId.txt",
    }
    out: dict[str, Any] = {"files": {}, "grep_present": False}
    for k, fn in files.items():
        p = log_dir / fn
        if not p.is_file():
            out["files"][k] = {"missing": True}
            continue
        out["grep_present"] = True
        try:
            raw = p.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            out["files"][k] = {"read_error": repr(e)}
            continue
        lines = [ln for ln in raw.splitlines() if ln.strip()]
        out["files"][k] = {
            "line_count": len(lines),
            "byte_count": len(raw.encode("utf-8", errors="replace")),
            "sample_lines": lines[:12],
        }
    return out


def run_chat_probe(base: str) -> dict[str, Any]:
    uid = "tenmon-master-forensic-v1"
    tid = f"master-forensic-{int(time.time() * 1000)}"
    m1 = "言霊とは何かを100字前後で答えて"
    m2 = "前の返答を受けて、要点を一つだけ継続して"
    r1 = post_chat(base, m1, tid, uid)
    p1 = parse_json(r1.get("body") or "")
    tid_out = None
    if isinstance(p1, dict):
        tid_out = p1.get("threadId")
        if tid_out is not None:
            tid_out = str(tid_out).strip() or None
    text1 = str(p1.get("response") or "") if isinstance(p1, dict) else ""
    rr1 = extract_route_reason(p1)

    r2 = post_chat(base, m2, tid_out or tid, uid)
    p2 = parse_json(r2.get("body") or "")
    text2 = str(p2.get("response") or "") if isinstance(p2, dict) else ""
    rr2 = extract_route_reason(p2)

    has_answer_1 = bool(r1.get("ok")) and len(text1.strip()) > 10
    has_answer_2 = bool(r2.get("ok")) and len(text2.strip()) > 10
    duplication_signal = has_dup_lines(text1, text2)
    continuity_signal = has_answer_2 and not duplication_signal and len(text2) > 15

    return {
        "card": CARD,
        "base": base,
        "chat1": {"message": m1, "http_ok": r1.get("ok"), "status": r1.get("status")},
        "chat2": {"message": m2, "http_ok": r2.get("ok"), "status": r2.get("status")},
        "threadId": tid_out or tid,
        "routeReason_turn1": rr1,
        "routeReason_turn2": rr2,
        "has_answer": {"turn1": has_answer_1, "turn2": has_answer_2},
        "duplication_signal": duplication_signal,
        "continuity_signal": continuity_signal,
    }


def scan_frontend_residue(repo: Path) -> dict[str, Any]:
    web = repo / "web" / "src"
    patterns = {
        "window.location.reload": r"window\.location\.reload\s*\(",
        "sessionId": r"sessionId",
        "threadId": r"threadId",
        ".bak": r"\.bak",
    }
    mainline_hits: dict[str, int] = {k: 0 for k in patterns}
    residue_files: list[str] = []
    suspicious: list[str] = []
    if not web.is_dir():
        return {
            "web_src_present": False,
            "patterns": {},
            "residue_file_count": 0,
            "suspicious_paths_sample": [],
        }

    for p in web.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix not in (".ts", ".tsx", ".js", ".jsx"):
            continue
        rel = str(p.relative_to(repo))
        if ".bak" in rel.lower() or rel.endswith(".bak"):
            residue_files.append(rel)
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for name, pat in patterns.items():
            mainline_hits[name] += len(re.findall(pat, txt))
        if "30," in rel or rel.endswith("=") or "/30," in rel:
            suspicious.append(rel)

    return {
        "web_src_present": True,
        "patterns": mainline_hits,
        "residue_file_count": len(residue_files),
        "residue_files_sample": sorted(residue_files)[:40],
        "suspicious_paths_sample": suspicious[:20],
    }


def merge_subsystem_from_verdict(
    key: str,
    sv: dict[str, Any],
    extra_blockers: list[str],
    evidence_paths: list[str],
) -> dict[str, Any]:
    subs = sv.get("subsystems") if isinstance(sv.get("subsystems"), dict) else {}
    # 名前対応
    map_keys = {
        "infra_gate": None,
        "conversation_backend": "conversation_backend",
        "conversation_continuity": None,
        "pwa_code_constitution": "pwa_code_constitution",
        "pwa_lived_proof": "pwa_lived_proof",
        "seal_state": None,
        "repo_hygiene": None,
        "self_audit_os": "self_audit_os",
        "self_repair_os": "self_repair_os",
        "self_build_os": "self_build_os",
        "remote_admin_cursor": "remote_admin_cursor_bridge",
        "learning_self_improvement": "learning_self_improvement",
        "worldclass_score": None,
    }
    sk = map_keys.get(key)
    base: dict[str, Any]
    if sk and sk in subs:
        base = dict(subs[sk])
    else:
        base = {
            "code_present": True,
            "runtime_proven": False,
            "accepted_complete": False,
            "band": "unknown",
            "primary_blockers": [],
        }
    blk = list(base.get("primary_blockers") or [])
    if isinstance(base.get("primary_blockers"), list):
        blk = [str(x) for x in base["primary_blockers"] if str(x).strip()]
    blk.extend(extra_blockers)
    blk = sorted(set(blk))[:32]
    ep = list(base.get("source_files") or evidence_paths)
    for e in evidence_paths:
        if e not in ep:
            ep.append(e)
    return {
        "code_present": bool(base.get("code_present", True)),
        "runtime_proven": bool(base.get("runtime_proven", False)),
        "accepted_complete": bool(base.get("accepted_complete", False)),
        "band": str(base.get("band") or "unknown"),
        "primary_blockers": blk,
        "staleness_risk": "mixed",
        "evidence_paths": ep[:24],
    }


def pct_accepted(subs: dict[str, Any]) -> float:
    vals = [subs.get(k, {}) for k in SUBSYSTEM_KEYS]
    ok = sum(1 for v in vals if isinstance(v, dict) and v.get("accepted_complete"))
    return round(100.0 * ok / max(len(SUBSYSTEM_KEYS), 1), 1)


def pct_runtime(subs: dict[str, Any]) -> float:
    vals = [subs.get(k, {}) for k in SUBSYSTEM_KEYS]
    ok = sum(1 for v in vals if isinstance(v, dict) and v.get("runtime_proven"))
    return round(100.0 * ok / max(len(SUBSYSTEM_KEYS), 1), 1)


def pct_code(subs: dict[str, Any]) -> float:
    vals = [subs.get(k, {}) for k in SUBSYSTEM_KEYS]
    ok = sum(1 for v in vals if isinstance(v, dict) and v.get("code_present"))
    return round(100.0 * ok / max(len(SUBSYSTEM_KEYS), 1), 1)


def build_priority_queue(all_blockers: list[str], sv: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    rec = str(sv.get("final_recommended_card") or "").strip()
    for i, b in enumerate(all_blockers[:80]):
        kind = "seal_contract_close"
        sev = "medium"
        if any(
            x in b
            for x in ("env_failure", "pip", "playwright", "PYTHON", "node", "PATH")
        ):
            kind = "after_env_restore"
            sev = "high"
        if b.startswith("gate:") or "gate_" in b:
            kind = "must_run_first"
            sev = "high"
        if any(x in b for x in ("untracked", "hygiene", "backup", ".bak")):
            kind = "stabilizer"
        if "seal" in b.lower() or "unsealed" in b.lower():
            kind = "seal_contract_close"
            sev = "high"
        out.append(
            {
                "rank": i + 1,
                "blocker": b,
                "severity": sev,
                "kind": kind,
                "seal_impact": "high" if sev == "high" else "medium",
                "depends_on": [] if kind == "must_run_first" else ["infra_gate"],
            }
        )
    if rec:
        out.insert(
            0,
            {
                "rank": 0,
                "blocker": f"recommended_card:{rec}",
                "severity": "high",
                "kind": "must_run_first",
                "seal_impact": "high",
                "depends_on": [],
            },
        )
    return out


def render_md(report: dict[str, Any]) -> str:
    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: {report.get('generated_at')}",
        f"- overall_band: `{report.get('overall_band')}`",
        f"- completion % (code/runtime/acceptance): {report.get('completion_percent_code')}% / "
        f"{report.get('completion_percent_runtime')}% / {report.get('completion_percent_acceptance')}%",
        f"- seal_ready: **{report.get('seal_ready')}**",
        f"- worldclass_ready: **{report.get('worldclass_ready')}**",
        "",
        "## Top blockers",
        "",
    ]
    for b in report.get("top_10_blockers") or []:
        lines.append(f"- {b}")
    lines.extend(["", "## Systems", ""])
    subs = report.get("systems") or report.get("subsystems") or {}
    for k in SUBSYSTEM_KEYS:
        s = subs.get(k) or {}
        lines.append(f"### {k}")
        lines.append(
            f"- band: `{s.get('band')}` | code: {s.get('code_present')} | "
            f"runtime: {s.get('runtime_proven')} | accepted: {s.get('accepted_complete')}"
        )
        for pb in (s.get("primary_blockers") or [])[:8]:
            lines.append(f"  - {pb}")
        lines.append("")
    lines.extend(["## Next card", "", f"`{report.get('next_single_best_card')}`", ""])
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--log-dir", type=str, default="")
    ap.add_argument("--base", type=str, default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--no-live-probe", action="store_true", help="chat / gate 再試行なし（JSON のみ）")
    ap.add_argument("--soft-exit-ok", action="store_true", help="常に exit 0")
    ap.add_argument(
        "--strict",
        action="store_true",
        help="seal/worldclass/integrity を満たさない場合 exit 1（既定は証拠生成成功なら exit 0）",
    )
    ap.add_argument(
        "--prefer-shell-observations",
        action="store_true",
        help="LOG_DIR の curl/grep 成果物を chat / frontend に優先（実行カード契約）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    log_dir = Path(args.log_dir).resolve() if args.log_dir else None

    sv_path = auto / "tenmon_system_verdict.json"
    unf_path = auto / "tenmon_total_unfinished_completion_report.json"
    lived_path = auto / "pwa_lived_completion_readiness.json"
    final_path = auto / "pwa_final_completion_readiness.json"
    final_blk_path = auto / "pwa_final_completion_blockers.json"
    preflight_path = auto / "pwa_playwright_preflight.json"
    reg_path = auto / "tenmon_regression_memory.json"
    sr_safe_path = auto / "tenmon_self_repair_safe_loop_verdict.json"
    sr_acc_path = auto / "tenmon_self_repair_acceptance_seal_verdict.json"
    sb_chain_path = auto / "tenmon_self_build_execution_chain_verdict.json"
    hy_path = auto / "tenmon_repo_hygiene_watchdog_verdict.json"
    learn_path = auto / "tenmon_learning_self_improvement_integrated_verdict.json"
    remote_path = auto / "tenmon_remote_admin_cursor_runtime_proof_verdict.json"
    wc_path = auto / "tenmon_worldclass_acceptance_scorecard.json"
    gate_path = auto / "tenmon_gate_contract_verdict.json"

    sv = read_json(sv_path)
    unf = read_json(unf_path)
    lived = read_json(lived_path)
    final_rd = read_json(final_path)
    final_blk = read_json(final_blk_path)
    preflight = read_json(preflight_path)
    reg = read_json(reg_path)
    sr_safe = read_json(sr_safe_path)
    sr_acc = read_json(sr_acc_path)
    sb_chain = read_json(sb_chain_path)
    hy = read_json(hy_path)
    learn = read_json(learn_path)
    remote = read_json(remote_path)
    wc = read_json(wc_path)
    gate_v = read_json(gate_path)

    integrity_warnings: list[str] = []
    if not sv_path.is_file():
        integrity_warnings.append("missing_tenmon_system_verdict.json")

    overall_band = str(sv.get("overall_band") or unf.get("overall_band") or "unknown")

    # --- infra_gate ---
    infra_blk: list[str] = []
    if gate_path.is_file():
        if not bool(gate_v.get("gate_contract_aligned")):
            infra_blk.append("gate_contract_not_aligned")
    else:
        infra_blk.append("tenmon_gate_contract_verdict_missing")
    gates_unf = unf.get("gates") if isinstance(unf.get("gates"), dict) else {}
    if isinstance(gates_unf, dict):
        for k, code in gates_unf.items():
            if int(code or 0) not in (200,):
                infra_blk.append(f"gate_{k}_not_200")

    infra = merge_subsystem_from_verdict(
        "infra_gate",
        sv,
        infra_blk,
        [str(gate_path), str(unf_path)],
    )
    if gate_path.is_file():
        infra["staleness_risk"] = staleness_risk(gate_path)
    else:
        infra["staleness_risk"] = "missing_evidence"

    # --- conversation continuity (lived blockers から) ---
    cont_blk: list[str] = []
    for x in (
        "continuity_fail",
        "duplicate_or_bleed_fail",
        "url_sync_missing",
        "refresh_restore_fail",
        "newchat_reload_residue",
    ):
        for src in (lived, final_rd):
            bl = src.get("blockers") if isinstance(src.get("blockers"), list) else []
            if any(x in str(b) for b in bl):
                cont_blk.append(x)
                break
    cont = merge_subsystem_from_verdict(
        "conversation_continuity",
        sv,
        sorted(set(cont_blk)),
        [str(lived_path), str(final_path)],
    )
    cont["code_present"] = True
    cont["runtime_proven"] = len(cont_blk) == 0
    cont["accepted_complete"] = len(cont_blk) == 0
    cont["band"] = "green" if cont["accepted_complete"] else "yellow"

    # --- seal_state ---
    seal_ready = bool(final_rd.get("final_ready")) if final_rd else False
    if not seal_ready and isinstance(final_rd.get("final_ready"), bool):
        pass
    seal_blk: list[str] = []
    if not seal_ready:
        seal_blk.append("final_ready_false")
    seal = merge_subsystem_from_verdict("seal_state", sv, seal_blk, [str(final_path)])

    # --- repo_hygiene ---
    rh_blk: list[str] = []
    if hy.get("must_block_seal"):
        rh_blk.append("repo_hygiene_must_block_seal")
    if hy.get("untracked_count", 0) > 200:
        rh_blk.append("massive_untracked")
    repo_h = merge_subsystem_from_verdict("repo_hygiene", sv, rh_blk, [str(hy_path)])
    if hy:
        repo_h["code_present"] = True
        repo_h["runtime_proven"] = True
        repo_h["accepted_complete"] = not bool(hy.get("must_block_seal"))

    # --- self_build / repair enrich ---
    sb_extra: list[str] = []
    if sb_chain and not sb_chain.get("chain_closed"):
        sb_extra.append("self_build_execution_chain_not_closed")
    self_build = merge_subsystem_from_verdict("self_build_os", sv, sb_extra, [str(sb_chain_path)])

    sr_extra: list[str] = []
    if sr_safe and not sr_safe.get("pass"):
        sr_extra.append("self_repair_safe_loop_not_pass")
    if sr_acc and not sr_acc.get("pass", True):
        sr_extra.append("self_repair_acceptance_not_pass")
    self_repair = merge_subsystem_from_verdict("self_repair_os", sv, sr_extra, [str(sr_safe_path), str(sr_acc_path)])

    # --- remote / learning / worldclass (optional files) ---
    ra_blk: list[str] = []
    if remote:
        ra_blk.extend([str(x) for x in (remote.get("primary_blockers") or []) if str(x).strip()][:8])
    remote_ad = merge_subsystem_from_verdict(
        "remote_admin_cursor",
        sv,
        ra_blk,
        [str(remote_path)] if remote_path.is_file() else [],
    )
    if remote_path.is_file():
        remote_ad["code_present"] = bool(remote.get("code_present", True))
        remote_ad["runtime_proven"] = bool(remote.get("runtime_proven", remote.get("runtime_proof_ok")))
        remote_ad["accepted_complete"] = bool(remote.get("accepted_complete", remote.get("integrated_ok")))

    learn_blk: list[str] = []
    if learn:
        learn_blk.extend([str(x) for x in (learn.get("primary_blockers") or []) if str(x).strip()][:8])
    learning = merge_subsystem_from_verdict(
        "learning_self_improvement",
        sv,
        learn_blk,
        [str(learn_path)] if learn_path.is_file() else [],
    )
    if learn_path.is_file():
        learning["code_present"] = bool(learn.get("code_present", True))
        learning["runtime_proven"] = bool(learn.get("runtime_proven"))
        learning["accepted_complete"] = bool(learn.get("integrated_ok") or learn.get("accepted_complete"))

    wc_blk: list[str] = []
    world_ok = False
    if wc:
        world_ok = bool(wc.get("completion_score_ok") or wc.get("pass") or wc.get("scorecard_pass"))
        if not world_ok:
            wc_blk.append("worldclass_scorecard_not_pass")
    worldclass = merge_subsystem_from_verdict(
        "worldclass_score",
        sv,
        wc_blk,
        [str(wc_path)] if wc_path.is_file() else [],
    )
    if wc_path.is_file():
        worldclass["code_present"] = True
        worldclass["runtime_proven"] = bool(wc.get("runtime_proven", True))
        worldclass["accepted_complete"] = world_ok
    else:
        worldclass["primary_blockers"] = (worldclass.get("primary_blockers") or []) + ["worldclass_scorecard_missing"]
        worldclass["band"] = "yellow"

    subs: dict[str, Any] = {
        "infra_gate": infra,
        "conversation_backend": merge_subsystem_from_verdict(
            "conversation_backend",
            sv,
            [],
            [str(unf_path)],
        ),
        "conversation_continuity": cont,
        "pwa_code_constitution": merge_subsystem_from_verdict(
            "pwa_code_constitution",
            sv,
            [],
            [str(unf_path)],
        ),
        "pwa_lived_proof": merge_subsystem_from_verdict(
            "pwa_lived_proof",
            sv,
            [],
            [str(lived_path), str(final_path)],
        ),
        "seal_state": seal,
        "repo_hygiene": repo_h,
        "self_audit_os": merge_subsystem_from_verdict("self_audit_os", sv, [], [str(sv_path), str(unf_path)]),
        "self_repair_os": self_repair,
        "self_build_os": self_build,
        "remote_admin_cursor": remote_ad,
        "learning_self_improvement": learning,
        "worldclass_score": worldclass,
    }

    _st_map: dict[str, Path] = {
        "infra_gate": gate_path,
        "self_audit_os": sv_path,
        "conversation_backend": unf_path,
        "conversation_continuity": lived_path,
        "pwa_code_constitution": unf_path,
        "pwa_lived_proof": lived_path,
        "seal_state": final_path,
        "repo_hygiene": hy_path,
        "self_repair_os": sr_safe_path,
        "self_build_os": sb_chain_path,
        "remote_admin_cursor": remote_path,
        "learning_self_improvement": learn_path,
        "worldclass_score": wc_path,
    }
    for k, pth in _st_map.items():
        if k in subs and isinstance(subs[k], dict) and pth.is_file():
            subs[k]["staleness_risk"] = staleness_risk(pth)

    chat_probe: dict[str, Any] = {"skipped": True, "reason": "--no-live-probe"}
    fe_scan = scan_frontend_residue(repo)
    fe_shell: dict[str, Any] = {}
    probes: dict[str, Any] = {"gates": {}, "toolchain": {}}

    base = str(args.base).rstrip("/")
    shell_chat: dict[str, Any] | None = None
    if log_dir and args.prefer_shell_observations:
        shell_chat = merge_chat_from_shell(log_dir)
        fe_shell = load_shell_frontend_grep(log_dir)

    if shell_chat:
        chat_probe = shell_chat
        chat_probe["skipped"] = False
    elif not args.no_live_probe:
        chat_probe = run_chat_probe(base)
        chat_probe["skipped"] = False
    elif args.no_live_probe and log_dir:
        # オフラインでも shell 成果があれば採用
        sc = merge_chat_from_shell(log_dir)
        if sc:
            chat_probe = sc
            chat_probe["skipped"] = False

    # gates は runner と独立して HTTP で固定観測（false fail 分離用）
    if not args.no_live_probe:
        probes["gates"]["api_health"] = http_get(base + "/api/health")
        probes["gates"]["api_audit"] = http_get(base + "/api/audit")
        probes["gates"]["api_audit_build"] = http_get(base + "/api/audit.build")

    # toolchain
    def sh_out(cmd: list[str]) -> str:
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return ((p.stdout or "") + (p.stderr or "")).strip()[:2000]
        except Exception as e:
            return repr(e)

    probes["toolchain"] = {
        "python3": sh_out(["python3", "--version"]),
        "pip": sh_out(["python3", "-m", "pip", "--version"]),
        "node": sh_out(["node", "--version"]),
        "npm": sh_out(["npm", "--version"]),
    }

    if log_dir:
        try:
            (log_dir / "chat_probe.json").write_text(
                json.dumps(chat_probe, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            (log_dir / "frontend_residue_scan.json").write_text(
                json.dumps(fe_scan, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            (log_dir / "probes_snapshot.json").write_text(
                json.dumps(probes, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        except OSError as e:
            integrity_warnings.append(f"log_dir_write_failed:{e}")

    all_blockers: list[str] = []
    for k in SUBSYSTEM_KEYS:
        sub = subs.get(k) or {}
        for b in sub.get("primary_blockers") or []:
            if str(b).strip():
                all_blockers.append(str(b).strip())
    all_blockers.extend(integrity_warnings)
    all_blockers = sorted(set(all_blockers), key=lambda x: (len(x), x))[:200]

    top_10 = all_blockers[:10]
    pq = build_priority_queue(all_blockers, sv)
    next_card = str(sv.get("final_recommended_card") or FAIL_NEXT).strip() or FAIL_NEXT

    completion_code = pct_code(subs)
    completion_rt = pct_runtime(subs)
    completion_acc = pct_accepted(subs)

    worldclass_ready = bool(wc_path.is_file()) and world_ok
    if not wc_path.is_file():
        worldclass_ready = False

    exec_contract = os.environ.get("TENMON_MASTER_EXECUTION_CONTRACT", EXECUTION_CARD)

    report: dict[str, Any] = {
        "card": CARD,
        "execution_contract_card": EXECUTION_CARD,
        "execution_contract": exec_contract,
        "generated_at": utc(),
        "pass": False,
        "overall_band": overall_band,
        "completion_percent_code": completion_code,
        "completion_percent_runtime": completion_rt,
        "completion_percent_acceptance": completion_acc,
        "seal_ready": seal_ready,
        "worldclass_ready": worldclass_ready,
        "top_10_blockers": top_10,
        "priority_top_cards": [next_card, FAIL_NEXT][:5],
        "next_single_best_card": next_card,
        "systems": subs,
        "subsystems": subs,
        "chat_probe": chat_probe,
        "frontend_residue_scan": fe_scan,
        "frontend_residue_runner_grep": fe_shell,
        "probes": probes,
        "inputs": {
            "tenmon_system_verdict": str(sv_path),
            "tenmon_total_unfinished_completion_report": str(unf_path),
            "pwa_lived_completion_readiness": str(lived_path),
            "pwa_final_completion_readiness": str(final_path),
            "optional_verdicts": [str(p) for p in (learn_path, remote_path, wc_path) if p.is_file()],
        },
        "integrity_warnings": integrity_warnings,
        "staleness_notes": {
            "regression_memory": staleness_risk(reg_path) if reg_path.is_file() else "missing",
        },
        "env_failure_separated": bool(sv.get("env_failure_separated", True)),
        "fail_next_card": FAIL_NEXT,
    }

    # pass: seal + worldclass + band（厳しめ・--strict 用。証拠欠落は integrity_warnings にのみ）
    report["pass"] = (
        seal_ready
        and worldclass_ready
        and overall_band in ("sealed_operable", "accepted_complete_sealed")
    )

    (auto / OUT_JSON).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / OUT_MD).write_text(render_md(report), encoding="utf-8")
    (auto / OUT_PQ).write_text(
        json.dumps(
            {
                "card": CARD,
                "execution_contract_card": EXECUTION_CARD,
                "generated_at": utc(),
                "queue": pq,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    by_sys = {k: subs.get(k, {}).get("primary_blockers") or [] for k in SUBSYSTEM_KEYS}
    (auto / OUT_BLK).write_text(
        json.dumps(
            {
                "card": CARD,
                "execution_contract_card": EXECUTION_CARD,
                "generated_at": utc(),
                "systems": by_sys,
                "blockers_by_system": by_sys,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))

    if args.soft_exit_ok:
        return 0
    if args.strict:
        return 0 if report["pass"] else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
