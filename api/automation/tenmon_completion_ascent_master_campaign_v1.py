#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1
WORLDCLASS ascent の後段として completion 系カードを束ね、観測値に基づき早期停止する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1"
OUT_NAME = "tenmon_completion_ascent_master_campaign.json"

ORDER: list[tuple[str, str | None]] = [
    ("TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1", "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1", "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1", "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_PWA_RUNTIME_ENV_FORENSIC_CURSOR_AUTO_V1", "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1", "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_REPO_HYGIENE_DEEP_FORENSIC_CURSOR_AUTO_V1", "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1", "TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_GATE_CONTRACT_HEALTH_DEEP_FORENSIC_CURSOR_AUTO_V1", "TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1", "TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1", "TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_RETRY_CURSOR_AUTO_V1", None),
    ("TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1", "TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1"),
    ("TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1", None),
]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def run_cmd(
    argv: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
) -> int:
    r = subprocess.run(argv, cwd=str(cwd) if cwd else None, env={**os.environ})
    if check and r.returncode != 0:
        raise subprocess.CalledProcessError(r.returncode, argv)
    return r.returncode


def collect_evidence(repo: Path) -> dict[str, Any]:
    auto = repo / "api" / "automation"
    lived = read_json(auto / "pwa_lived_completion_readiness.json")
    final_pwa = read_json(auto / "pwa_final_completion_readiness.json")
    master = read_json(auto / "tenmon_total_completion_master_report.json")
    wc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    pf = read_json(auto / "pwa_playwright_preflight.json")

    fr_lived = bool(lived.get("final_ready"))
    fr_final = bool(final_pwa.get("final_ready"))
    final_ready = fr_lived or fr_final

    seal_ready = bool(master.get("seal_ready"))
    worldclass_ready = bool(wc.get("worldclass_ready"))
    env_failure = bool(pf.get("env_failure"))
    next_best = master.get("next_single_best_card")

    return {
        "final_ready": final_ready,
        "seal_ready": seal_ready,
        "worldclass_ready": worldclass_ready,
        "env_failure": env_failure,
        "next_single_best_card": next_best,
    }


def should_stop_success(ev: dict[str, Any]) -> bool:
    """自動停止: final_ready / seal_ready / worldclass_ready のいずれかが真。"""
    return bool(ev["final_ready"] or ev["seal_ready"] or ev["worldclass_ready"])


def ensure_chat_probes(repo: Path, base: str) -> tuple[Path, Path]:
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    p1 = auto / "_completion_ascent_chat_probe_1.json"
    p2 = auto / "_completion_ascent_chat_probe_2.json"
    b = base.rstrip("/")
    run_cmd(
        [
            "curl",
            "-fsS",
            "-H",
            "content-type: application/json",
            "-d",
            '{"threadId":"probe_continuity_hold","message":"言霊とは何かを100字前後で答えて"}',
            "-o",
            str(p1),
            f"{b}/api/chat",
        ],
        check=False,
    )
    run_cmd(
        [
            "curl",
            "-fsS",
            "-H",
            "content-type: application/json",
            "-d",
            '{"threadId":"probe_continuity_hold","message":"前の返答を受けて、要点を一つだけ継続して"}',
            "-o",
            str(p2),
            f"{b}/api/chat",
        ],
        check=False,
    )
    return p1, p2


def _route_from_chat(data: dict[str, Any]) -> str | None:
    df = data.get("decisionFrame")
    if not isinstance(df, dict):
        return None
    ku = df.get("ku")
    if isinstance(ku, dict) and ku.get("routeReason"):
        return str(ku.get("routeReason")).strip()
    return None


def step_chat_continuity_deep_forensic(repo: Path, base: str) -> None:
    """観測専用: stale JSON を更新し exit 0。"""
    auto = repo / "api" / "automation"
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    log_root = Path(os.environ.get("TENMON_MASTER_FORENSIC_LOG_ROOT", "/var/log/tenmon"))
    ev_dir = log_root / f"card_TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1" / ts
    try:
        ev_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        ev_dir = auto / f"_chat_continuity_deep_forensic_{ts}"
        ev_dir.mkdir(parents=True, exist_ok=True)

    p1, p2 = ensure_chat_probes(repo, base)
    c1 = read_json(p1)
    c2 = read_json(p2)
    rr1 = _route_from_chat(c1)
    rr2 = _route_from_chat(c2)
    tc1 = bool((c1.get("threadCore") if isinstance(c1.get("threadCore"), dict) else None) or c1.get("threadCore"))
    tc2 = bool((c2.get("threadCore") if isinstance(c2.get("threadCore"), dict) else None) or c2.get("threadCore"))

    out = {
        "card": "TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1",
        "generated_at": utc(),
        "evidence_dir": str(ev_dir),
        "chat1_rr": rr1,
        "chat2_rr": rr2,
        "chat1_threadCore_present": tc1,
        "chat2_threadCore_present": tc2,
        "recommended_next_card": "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1",
    }
    (auto / "tenmon_chat_continuity_deep_forensic.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def step_pwa_runtime_env_forensic(repo: Path) -> None:
    auto = repo / "api" / "automation"
    pf = read_json(auto / "pwa_playwright_preflight.json")
    usable = bool(pf.get("usable"))
    env_failure = bool(pf.get("env_failure"))
    reason = "ok" if usable and not env_failure else (pf.get("reason") or pf.get("failure_reason") or "check_preflight")
    out = {
        "card": "TENMON_PWA_RUNTIME_ENV_FORENSIC_CURSOR_AUTO_V1",
        "generated_at": utc(),
        "usable": usable,
        "env_failure": env_failure,
        "reason": str(reason)[:500],
        "recommended_next_card": "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1",
    }
    (auto / "tenmon_pwa_runtime_env_forensic.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def step_repo_hygiene_deep_forensic(repo: Path, py: str) -> None:
    """watchdog を実行してから deep 集約（watchdog が非ゼロでも観測は継続）。"""
    auto = repo / "api" / "automation"
    wd = auto / "tenmon_repo_hygiene_watchdog_v1.py"
    if wd.is_file():
        subprocess.run([py, str(wd)], cwd=str(auto), check=False)
    v = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    out = {
        "card": "TENMON_REPO_HYGIENE_DEEP_FORENSIC_CURSOR_AUTO_V1",
        "generated_at": utc(),
        "must_block_seal": bool(v.get("must_block_seal")),
        "untracked_count": int(v.get("untracked_count", 0)),
        "bak_noise_count": int(v.get("bak_noise_count", 0)),
        "generated_noise_count": int(v.get("generated_noise_count", 0)),
        "manual_review_count": int(v.get("manual_review_count", 0)),
        "recommended_cleanup_card": "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1",
    }
    (auto / "tenmon_repo_hygiene_deep_forensic.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def step_gate_contract_health_deep_forensic(repo: Path, base: str) -> None:
    auto = repo / "api" / "automation"
    api_src = repo / "api" / "src"
    refs = ""
    try:
        if api_src.is_dir():
            p = subprocess.run(
                ["grep", "-RIn", "/api/health", str(api_src)],
                capture_output=True,
                text=True,
                check=False,
            )
            refs = (p.stdout or "")[:12000]
    except Exception:
        refs = ""
    b = base.rstrip("/")
    raw = ""
    try:
        p = subprocess.run(
            ["curl", "-sS", "-i", f"{b}/api/health"],
            capture_output=True,
            text=True,
            check=False,
        )
        raw = (p.stdout or "")[:8000]
    except Exception:
        raw = ""
    out = {
        "card": "TENMON_GATE_CONTRACT_HEALTH_DEEP_FORENSIC_CURSOR_AUTO_V1",
        "generated_at": utc(),
        "health_404": "404 Not Found" in raw or "Cannot GET /api/health" in raw,
        "health_refs_excerpt_lines": len(refs.splitlines()),
        "recommended_next_card": "TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1",
    }
    (auto / "tenmon_gate_contract_health_deep_forensic.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def step_continuity(repo: Path, py: str, base: str) -> None:
    p1, p2 = ensure_chat_probes(repo, base)
    run_cmd(
        [
            py,
            str(repo / "api" / "automation" / "tenmon_phase1_conversation_surface_verdict_v1.py"),
            "--repo-root",
            str(repo),
            "--chat1",
            str(p1),
            "--chat2",
            str(p2),
            "--stdout-json",
        ],
        cwd=str(repo / "api" / "automation"),
        check=True,
    )


def step_runtime_restore(repo: Path) -> None:
    sh = repo / "api" / "scripts" / "tenmon_pwa_runtime_env_and_playwright_restore_v1.sh"
    run_cmd(["bash", str(sh), "--stdout-json"], cwd=str(repo / "api"), check=True)


def step_frontend_hygiene(repo: Path) -> None:
    sh = repo / "api" / "scripts" / "tenmon_pwa_frontend_residue_hygiene_v1.sh"
    run_cmd(["bash", str(sh), "--stdout-json"], cwd=str(repo / "api"), check=True)


def step_gate(repo: Path, py: str, base: str) -> None:
    run_cmd([py, str(repo / "api" / "automation" / "tenmon_gate_contract_health_alignment_v1.py"), "--base", base], check=True)


def step_phase2(repo: Path, py: str, base: str, restart_systemd: bool) -> None:
    api = repo / "api"
    run_cmd(["npm", "run", "build"], cwd=str(api), check=True)
    if restart_systemd:
        run_cmd(["sudo", "systemctl", "restart", "tenmon-ark-api.service"], check=False)
        time.sleep(2)
    run_cmd([py, str(api / "automation" / "tenmon_gate_contract_health_alignment_v1.py"), "--base", base], check=True)
    run_cmd(
        ["bash", str(api / "scripts" / "tenmon_pwa_runtime_env_and_playwright_restore_v1.sh"), "--stdout-json"],
        cwd=str(api),
        check=True,
    )
    run_cmd(
        [py, str(api / "automation" / "tenmon_phase2_gate_and_runtime_verdict_v1.py"), "--stdout-json"],
        cwd=str(api / "automation"),
        check=True,
    )


def step_phase3(repo: Path) -> None:
    sh = repo / "api" / "scripts" / "tenmon_phase3_completion_run_v1.sh"
    run_cmd(["bash", str(sh)], cwd=str(repo / "api"), check=True)


def step_forensic(repo: Path) -> None:
    sh = repo / "api" / "scripts" / "tenmon_total_completion_master_forensic_report_v1.sh"
    run_cmd(["bash", str(sh)], cwd=str(repo / "api"), check=True)


def run_named_step(
    name: str,
    repo: Path,
    py: str,
    base: str,
    restart_systemd: bool,
) -> None:
    if name == "TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1":
        step_chat_continuity_deep_forensic(repo, base)
    elif name == "TENMON_PWA_RUNTIME_ENV_FORENSIC_CURSOR_AUTO_V1":
        step_pwa_runtime_env_forensic(repo)
    elif name == "TENMON_REPO_HYGIENE_DEEP_FORENSIC_CURSOR_AUTO_V1":
        step_repo_hygiene_deep_forensic(repo, py)
    elif name == "TENMON_GATE_CONTRACT_HEALTH_DEEP_FORENSIC_CURSOR_AUTO_V1":
        step_gate_contract_health_deep_forensic(repo, base)
    elif name.startswith("TENMON_CHAT_CONTINUITY_ROUTE_HOLD"):
        step_continuity(repo, py, base)
    elif name.startswith("TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE"):
        step_runtime_restore(repo)
    elif name.startswith("TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE"):
        step_frontend_hygiene(repo)
    elif name.startswith("TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT"):
        step_gate(repo, py, base)
    elif name.startswith("TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME"):
        step_phase2(repo, py, base, restart_systemd)
    elif name.startswith("TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF"):
        step_phase3(repo)
    elif name.startswith("TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT"):
        step_forensic(repo)
    else:
        raise ValueError(f"unknown card: {name}")


def write_summary(
    path: Path,
    *,
    executed_cards: list[str],
    last_pass: str,
    failed: str,
    retry: str,
    ev: dict[str, Any],
) -> None:
    body = {
        "card": CARD,
        "executed_cards": executed_cards,
        "last_pass_card": last_pass,
        "failed_card": failed,
        "recommended_retry_card": retry,
        "final_ready": ev["final_ready"],
        "seal_ready": ev["seal_ready"],
        "worldclass_ready": ev["worldclass_ready"],
        "env_failure": ev["env_failure"],
        "next_single_best_card": str(ev.get("next_single_best_card") or ""),
    }
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--restart-systemd", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    py = sys.executable
    out_path = auto / OUT_NAME

    executed: list[str] = []
    last_ok = ""

    try:
        for card_name, retry_name in ORDER:
            try:
                run_named_step(card_name, repo, py, str(args.base), bool(args.restart_systemd))
            except subprocess.CalledProcessError:
                ev = collect_evidence(repo)
                write_summary(
                    out_path,
                    executed_cards=executed,
                    last_pass=last_ok,
                    failed=card_name,
                    retry=retry_name or "",
                    ev=ev,
                )
                if args.stdout_json:
                    print(out_path.read_text(encoding="utf-8"))
                return 1

            executed.append(card_name)
            last_ok = card_name
            ev = collect_evidence(repo)
            if should_stop_success(ev):
                write_summary(
                    out_path,
                    executed_cards=executed,
                    last_pass=last_ok,
                    failed="",
                    retry="",
                    ev=ev,
                )
                if args.stdout_json:
                    print(out_path.read_text(encoding="utf-8"))
                return 0

        ev = collect_evidence(repo)
        write_summary(
            out_path,
            executed_cards=executed,
            last_pass=last_ok,
            failed="",
            retry="",
            ev=ev,
        )
        if args.stdout_json:
            print(out_path.read_text(encoding="utf-8"))
        return 0
    except Exception as e:
        ev = collect_evidence(repo)
        write_summary(
            out_path,
            executed_cards=executed,
            last_pass=last_ok,
            failed="exception",
            retry="",
            ev=ev,
        )
        extra = json.loads(out_path.read_text(encoding="utf-8"))
        extra["error"] = repr(e)
        out_path.write_text(json.dumps(extra, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.stdout_json:
            print(out_path.read_text(encoding="utf-8"))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
