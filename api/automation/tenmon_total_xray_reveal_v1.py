#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TOTAL_XRAY_REVEAL_V1 — 天聞アーク全体の読み取り専用レントゲン監査。
dist / DB schema / 本文 / systemd env / chat・route・learning 本体は改変しない。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION = Path(__file__).resolve().parent
if str(_AUTOMATION) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION))

from chat_architecture_observer_v1 import build_architecture_report  # noqa: E402
from tenmon_chat_ts_worldclass_completion_report_v1 import build_report as build_worldclass_report  # noqa: E402

SCHEMA_VERSION = 1
CARD = "TENMON_TOTAL_XRAY_REVEAL_V1"
FAIL_NEXT = "TENMON_TOTAL_XRAY_REVEAL_RETRY_CURSOR_AUTO_V1"

STATUS_ENUM = (
    "absent",
    "file_only",
    "partial_impl",
    "runner_only",
    "outputless",
    "connected_not_running",
    "running_not_integrated",
    "integrated_partial",
    "integrated_ready",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _repo_root() -> Path:
    return _api_root().parent


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _exists(p: Path) -> bool:
    return p.is_file() or p.is_dir()


def _dir_has_recent_files(d: Path, max_age_sec: int = 14 * 86400, limit: int = 12) -> Tuple[bool, List[str]]:
    if not d.is_dir():
        return False, []
    now = datetime.now(tz=timezone.utc).timestamp()
    hits: List[Tuple[float, str]] = []
    try:
        for child in d.rglob("*"):
            if not child.is_file():
                continue
            try:
                m = child.stat().st_mtime
            except OSError:
                continue
            if now - m <= max_age_sec:
                hits.append((m, str(child)))
    except OSError:
        return False, []
    hits.sort(reverse=True)
    return len(hits) > 0, [h[1] for h in hits[:limit]]


def _run_readonly(cmd: List[str], timeout: float = 6.0) -> Tuple[int, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        return p.returncode, (p.stdout or p.stderr or "")[:8000]
    except Exception as e:
        return -1, str(e)[:2000]


def _grep_src(api: Path, pattern: str, glob: str = "**/*.ts", max_files_scan: int = 220) -> Dict[str, Any]:
    rx = re.compile(pattern)
    files_hit = 0
    total = 0
    samples: List[str] = []
    root = api / "src"
    if not root.is_dir():
        return {"files_with_hits": 0, "match_count": 0, "sample_paths": []}
    scanned = 0
    for fp in root.glob(glob):
        if not fp.is_file():
            continue
        scanned += 1
        if scanned > max_files_scan:
            break
        try:
            t = fp.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        n = len(rx.findall(t))
        if n:
            files_hit += 1
            total += n
            if len(samples) < 15:
                samples.append(str(fp.relative_to(api)))
    return {"files_with_hits": files_hit, "match_count": total, "sample_paths": samples}


def _score_from_flags(
    exists: bool,
    implemented: bool,
    connected: bool,
    running: bool,
    outputs: bool,
    blockers: List[str],
) -> Tuple[int, str, str]:
    s = 0
    if exists:
        s += 15
    if implemented:
        s += 25
    if connected:
        s += 20
    if running:
        s += 15
    if outputs:
        s += 25
    risk = "low"
    if len(blockers) >= 3 or (exists and not implemented):
        risk = "high"
    elif len(blockers) >= 1 or not connected:
        risk = "medium"
    # system_status: 観測可能な事実から最も近いラベル
    if not exists:
        st = "absent"
    elif exists and not implemented:
        st = "file_only"
    elif implemented and connected and outputs and s >= 85:
        st = "integrated_ready"
    elif implemented and connected and s >= 55:
        st = "integrated_partial" if outputs else "outputless"
    elif running and not connected:
        st = "running_not_integrated"
    elif connected and not running:
        st = "connected_not_running"
    elif implemented and not outputs:
        st = "outputless"
    else:
        st = "partial_impl"
    return min(100, s), risk, st


def _subsystem_block(
    sid: str,
    exists: bool,
    implemented: bool,
    connected: bool,
    running: bool,
    outputs: bool,
    blockers: List[str],
    evidence_paths: List[str],
) -> Dict[str, Any]:
    score, risk, st = _score_from_flags(exists, implemented, connected, running, outputs, blockers)
    return {
        "subsystem_id": sid,
        "exists": exists,
        "implemented": implemented,
        "connected": connected,
        "running": running,
        "producing_outputs": outputs,
        "completedness_score": score,
        "risk_level": risk,
        "system_status": st if st in STATUS_ENUM else "partial_impl",
        "blockers": blockers,
        "evidence_paths": evidence_paths[:40],
    }


def _collect_conversation(api: Path, worldclass: Dict[str, Any]) -> Dict[str, Any]:
    chat = api / "src" / "routes" / "chat.ts"
    v = worldclass.get("verdict") or {}
    static = worldclass.get("static") or {}
    blockers: List[str] = []
    if not chat.is_file():
        blockers.append("missing_chat_ts")
    if not v.get("chat_ts_static_100"):
        sb = v.get("static_blockers") or []
        if isinstance(sb, list):
            blockers.extend([str(x) for x in sb[:15]])
    if not v.get("density_lock", True):
        blockers.append("density_lock:not_clean")
    if not v.get("chat_ts_overall_100"):
        blockers.append("chat_ts_overall_100:false")
    exists = chat.is_file()
    implemented = exists and static.get("line_count", 0) > 500
    connected = True
    running = bool(os.environ.get("CHAT_TS_PROBE_BASE_URL")) and v.get("chat_ts_runtime_100")
    out_dir = Path(os.environ.get("TENMON_SEAL_DIR", "/var/log/tenmon"))
    outputs, outp = _dir_has_recent_files(out_dir)
    evidence = [str(chat), "tenmon_chat_ts_worldclass_completion_report_v1.build_report"]
    return _subsystem_block(
        "conversation_system",
        exists,
        implemented,
        connected,
        running,
        outputs and bool(outp),
        list(dict.fromkeys([str(b) for b in blockers if b]))[:20],
        evidence,
    )


def _collect_chat_architecture(api: Path, arch: Dict[str, Any]) -> Dict[str, Any]:
    blockers: List[str] = []
    if arch.get("error"):
        blockers.append(str(arch.get("error")))
    if arch.get("giant_file"):
        blockers.append("giant_file:line_count>=12000")
    tw = arch.get("trunk_wiring") or {}
    if (tw.get("summary") or {}).get("likely_unwired_count", 0) > 0:
        blockers.append("trunk_wiring:likely_unwired")
    exists = bool(arch.get("chat_path")) and Path(str(arch["chat_path"])).is_file()
    implemented = exists and int(arch.get("line_count") or 0) > 0
    connected = (tw.get("summary") or {}).get("imported_count", 0) > 0
    running = False
    auto_out = api / "automation" / "out"
    outputs, _ = _dir_has_recent_files(auto_out)
    evidence = [str(arch.get("chat_path") or ""), "chat_architecture_observer_v1.build_architecture_report"]
    return _subsystem_block(
        "chat_architecture",
        exists,
        implemented,
        connected,
        running,
        outputs,
        blockers,
        evidence,
    )


def _collect_self_improvement(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    scripts = api / "scripts"
    keys = [
        auto / "improvement_ledger_v1.py",
        auto / "residual_quality_scorer_v1.py",
        auto / "card_auto_generator_v1.py",
        auto / "seal_governor_v1.py",
        auto / "self_improvement_os_runner_v1.py",
        scripts / "self_improvement_os_run_v1.sh",
    ]
    exists = all(p.is_file() for p in keys[:5])
    implemented = exists
    iv = _read_json(auto / "out" / "tenmon_self_improvement_os_v1" / "integrated_final_verdict.json")
    if not iv:
        iv = _read_json(auto / "integrated_final_verdict.json")
    dispatch = _read_json(auto / "next_card_dispatch.json")
    connected = bool(iv) or bool(dispatch.get("version") or dispatch.get("next_card"))
    running = False
    out_roots = [
        auto / "out" / "tenmon_self_improvement_os_v1",
        Path("/var/log/tenmon"),
    ]
    outputs = any(_dir_has_recent_files(p)[0] for p in out_roots if p.is_dir())
    blockers: List[str] = []
    if not exists:
        blockers.append("missing_core_self_improvement_modules")
    if not connected:
        blockers.append("no_integrated_verdict_or_dispatch")
    evidence = [str(p) for p in keys if p.is_file()]
    return _subsystem_block(
        "self_improvement_os",
        exists,
        implemented,
        connected,
        running,
        outputs,
        blockers,
        evidence,
    )


def _collect_chat_refactor_os(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    need = [
        auto / "chat_refactor_planner_v1.py",
        auto / "chat_refactor_os_runner_v1.py",
        auto / "chat_refactor_governor_v1.py",
        auto / "chat_refactor_card_generator_v1.py",
    ]
    exists = all(p.is_file() for p in need)
    manifest_dirs = list((auto / "out").glob("**/chat_refactor_manifest.json"))
    queue = list((auto / "out").glob("**/chat_refactor_queue.json"))
    connected = bool(manifest_dirs or queue)
    implemented = exists
    outputs, _ = _dir_has_recent_files(auto / "out")
    blockers: List[str] = []
    if not connected:
        blockers.append("no_chat_refactor_manifest_in_out")
    return _subsystem_block(
        "chat_refactor_os",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [str(p) for p in need],
    )


def _collect_kokuzo_learning(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    scripts = api / "scripts"
    files = [
        auto / "kokuzo_bad_observer_v1.py",
        auto / "khs_health_gate_v1.py",
        auto / "deterministic_seed_generator_v1.py",
        auto / "kokuzo_learning_improvement_os_integrated_v1.py",
        scripts / "kokuzo_learning_improvement_os_integrated_v1.sh",
        scripts / "kg2b_fractal_language_renderer_v1.sh",
    ]
    exists = sum(1 for p in files if p.is_file()) >= 4
    implemented = exists
    manifest = _read_json(auto / "out" / "tenmon_kokuzo_learning_improvement_os_v1" / "kokuzo_learning_manifest.json")
    if not manifest:
        manifest = _read_json(auto / "out" / "tenmon_kokuzo_learning_os_bootstrap_v1" / "kokuzo_learning_manifest.json")
    connected = bool(manifest.get("version") or manifest.get("generatedAt"))
    out1 = auto / "out" / "tenmon_kokuzo_learning_improvement_os_v1"
    out2 = auto / "out" / "tenmon_kokuzo_learning_os_bootstrap_v1"
    outputs = any(_dir_has_recent_files(p)[0] for p in (out1, out2) if p.is_dir())
    blockers: List[str] = []
    if not exists:
        blockers.append("missing_learning_os_py_modules")
    if not connected:
        blockers.append("no_kokuzo_learning_manifest")
    return _subsystem_block(
        "kokuzo_learning_os",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [str(p) for p in files if p.is_file()],
    )


def _collect_storage_backup_nas(api: Path) -> Dict[str, Any]:
    scripts = list((api / "scripts").glob("*backup*")) + list((api / "scripts").glob("*nas*")) + list((api / "scripts").glob("*sync*"))
    exists = len(scripts) > 0
    implemented = exists
    mount_hints = [Path("/mnt/nas"), Path("/media/nas"), Path("/srv/nas")]
    mounted = any(p.is_dir() and os.path.ismount(str(p)) for p in mount_hints)
    connected = mounted or bool(os.environ.get("TENMON_BACKUP_ROOT") or os.environ.get("NAS_MOUNT_PATH"))
    rc, out = _run_readonly(["bash", "-lc", "mount | head -n 40"], timeout=4.0)
    running = "nfs" in out.lower() or "cifs" in out.lower() or mounted
    outputs = connected
    blockers: List[str] = []
    if not exists:
        blockers.append("no_backup_nas_scripts_under_api/scripts")
    if not connected:
        blockers.append("nas_not_mounted_and_no_env_hint")
    evidence = [str(p) for p in scripts[:25]]
    return _subsystem_block(
        "storage_backup_nas",
        exists,
        implemented,
        connected,
        running,
        outputs,
        blockers,
        evidence,
    )


def _collect_acceptance_runtime(api: Path) -> Dict[str, Any]:
    scripts = api / "scripts"
    seal = scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"
    forensic = scripts / "tenmon_total_forensic_collect_v1.sh"
    exists = seal.is_file() and forensic.is_file()
    implemented = exists
    connected = (api / "automation" / "tenmon_chat_ts_worldclass_completion_report_v1.py").is_file()
    rc, active = _run_readonly(["systemctl", "is-active", "tenmon-ark-api"], timeout=3.0)
    running = rc == 0 and "active" in active.lower()
    log_root = Path("/var/log/tenmon")
    outputs, _ = _dir_has_recent_files(log_root)
    blockers: List[str] = []
    if not exists:
        blockers.append("missing_seal_or_forensic_shell")
    if not outputs:
        blockers.append("no_recent_seal_artifacts_under_var_log_tenmon")
    return _subsystem_block(
        "acceptance_runtime",
        exists,
        implemented,
        connected,
        running,
        outputs,
        blockers,
        [str(seal), str(forensic)],
    )


def _collect_cursor_autobuild(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    gca = auto / "generated_cursor_apply"
    exists = gca.is_dir()
    md_count = len(list(gca.glob("*.md"))) if exists else 0
    implemented = md_count >= 10
    campaign = auto / "full_orchestrator_v1.py"
    connected = campaign.is_file()
    outputs = md_count > 0
    blockers: List[str] = []
    if md_count < 5:
        blockers.append("generated_cursor_apply_sparse")
    evidence = [str(gca), str(campaign) if campaign.is_file() else ""]
    return _subsystem_block(
        "cursor_autobuild",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [e for e in evidence if e],
    )


def _collect_feature_autobuild(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    orch = auto / "feature_autobuild_orchestrator_v1.py"
    plan = auto / "feature_autobuild_plan.json"
    exists = orch.is_file()
    implemented = exists
    pj = _read_json(plan)
    connected = bool(pj) or (api / "src" / "routes" / "adminRemoteIntake.ts").is_file()
    outputs = plan.is_file() and plan.stat().st_size > 8
    blockers: List[str] = []
    if not exists:
        blockers.append("missing_feature_autobuild_orchestrator")
    if not plan.is_file():
        blockers.append("no_persisted_feature_autobuild_plan.json")
    return _subsystem_block(
        "feature_autobuild",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [str(orch), str(plan)],
    )


def _collect_remote_admin(api: Path) -> Dict[str, Any]:
    auto = api / "automation"
    q = auto / "remote_admin_queue.json"
    intake_py = auto / "remote_admin_intake_v1.py"
    intake_sh = api / "scripts" / "remote_admin_intake_v1.sh"
    route = api / "src" / "routes" / "adminRemoteIntake.ts"
    exists = intake_py.is_file() and route.is_file()
    implemented = exists
    qj = _read_json(q)
    connected = bool(qj.get("items") or qj.get("version") or qj.get("queue"))
    outputs = q.is_file()
    blockers: List[str] = []
    if not intake_sh.is_file():
        blockers.append("missing_remote_admin_intake_v1.sh")
    if not connected:
        blockers.append("remote_admin_queue_empty_or_schema_only")
    return _subsystem_block(
        "remote_admin",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [str(intake_py), str(route), str(q)],
    )


def _collect_internal_cognition(api: Path) -> Dict[str, Any]:
    terms = {
        "heart": r"\bheart\b",
        "intention": r"\bintention\b",
        "meaningFrame": r"\bmeaningFrame\b",
        "thoughtCoreSummary": r"\bthoughtCoreSummary\b",
        "brainstemDecision": r"\bbrainstemDecision\b|tenmonBrainstem",
        "personaConstitutionSummary": r"personaConstitution|getPersonaConstitutionSummary",
        "comfortTuning": r"comfortTuning",
        "intentKind": r"\bintentKind\b",
        "expressionPlan": r"\bexpressionPlan\b",
        "binderSummary": r"binderSummary|knowledgeBinder",
        "threadCore": r"\bthreadCore\b",
        "responsePlan": r"\bresponsePlan\b",
    }
    hits: Dict[str, Any] = {}
    total_files = 0
    for name, pat in terms.items():
        g = _grep_src(api, pat)
        hits[name] = g
        total_files += g["files_with_hits"]
    exists = total_files > 0
    implemented = exists and hits.get("heart", {}).get("match_count", 0) > 0
    chat = api / "src" / "routes" / "chat.ts"
    connected = chat.is_file() and hits.get("threadCore", {}).get("match_count", 0) > 0
    outputs = False
    blockers: List[str] = []
    low = [k for k, v in hits.items() if v["match_count"] == 0]
    if low:
        blockers.append("low_surface_terms:" + ",".join(low[:8]))
    evidence = ["api/src scan"] + [str(chat)]
    base = _subsystem_block(
        "internal_cognition",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        evidence,
    )
    base["cognition_term_hits"] = {k: v.get("match_count", 0) for k, v in hits.items()}
    return base


def _collect_constitution_governance(api: Path) -> Dict[str, Any]:
    doc_root = api / "docs" / "constitution"
    exists = doc_root.is_dir()
    md_files = list(doc_root.glob("**/*.md")) if exists else []
    implemented = len(md_files) >= 5
    # 実装ファイルが憲法ファイル名を参照しているか（粗い）
    auto_py = list((api / "automation").glob("*.py"))
    refs = 0
    sample_const = [str(p.relative_to(api)) for p in md_files[:200]]
    const_names = {p.stem.lower() for p in md_files}
    for py in auto_py[:400]:
        try:
            t = py.read_text(encoding="utf-8", errors="replace")[:12000]
        except OSError:
            continue
        for stem in list(const_names)[:50]:
            if stem and stem in t.lower():
                refs += 1
                break
    connected = refs >= 3
    outputs = implemented
    blockers: List[str] = []
    if len(md_files) < 3:
        blockers.append("constitution_docs_sparse")
    if not connected:
        blockers.append("few_automation_refs_to_constitution_filenames")
    return _subsystem_block(
        "constitution_governance",
        exists,
        implemented,
        connected,
        False,
        outputs,
        blockers,
        [str(doc_root)] + sample_const[:15],
    )


def _build_crouching(subsystems: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for sid, row in subsystems.items():
        if not isinstance(row, dict):
            continue
        if row.get("system_status") == "outputless" or (
            row.get("exists") and row.get("implemented") and not row.get("producing_outputs") and not row.get("connected")
        ):
            out.append(
                {
                    "subsystem_id": sid,
                    "system_status": "crouching",
                    "reason": "files_present_but_no_recent_outputs_or_weak_integration",
                    "completedness_score": row.get("completedness_score"),
                    "evidence_paths": row.get("evidence_paths", [])[:5],
                }
            )
    return out


def _build_missing_runners(api: Path) -> List[Dict[str, Any]]:
    expectations = [
        ("chat_refactor_os", api / "scripts" / "chat_refactor_os_run_v1.sh"),
        ("self_improvement_os", api / "scripts" / "self_improvement_os_run_v1.sh"),
        ("kokuzo_learning_os", api / "scripts" / "kokuzo_learning_improvement_os_integrated_v1.sh"),
        ("remote_admin", api / "scripts" / "remote_admin_intake_v1.sh"),
    ]
    miss: List[Dict[str, Any]] = []
    for sid, p in expectations:
        if not p.is_file():
            miss.append(
                {
                    "subsystem_id": sid,
                    "expected_runner": p.name,
                    "path": str(p),
                    "status": "absent",
                }
            )
    return miss


def _build_contract_mismatches(api: Path, worldclass: Dict[str, Any]) -> List[Dict[str, Any]]:
    mm: List[Dict[str, Any]] = []
    v = worldclass.get("verdict") or {}
    if v.get("chat_ts_static_100") is False:
        mm.append(
            {
                "contract": "CHAT_TS_STATIC_100",
                "expected": True,
                "actual": False,
                "severity": "high",
                "detail": "worldclass static_blockers",
            }
        )
    if v.get("density_lock") is False:
        mm.append(
            {
                "contract": "DENSITY_LOCK",
                "expected": True,
                "actual": False,
                "severity": "high",
                "detail": v.get("density_lock_reasons"),
            }
        )
    seal = Path("/var/log/tenmon")
    if seal.is_dir():
        # 典型的 seal 成果物が無いディレクトリもある → 情報のみ
        pass
    else:
        mm.append(
            {
                "contract": "VPS_SEAL_LOG_ROOT",
                "expected": "directory_readable",
                "actual": "missing_or_no_access",
                "severity": "low",
                "detail": str(seal),
            }
        )
    return mm


def _integrated_verdict(subsystems: Dict[str, Any]) -> Dict[str, Any]:
    def r(name: str) -> int:
        row = subsystems.get(name) or {}
        return int(row.get("completedness_score") or 0)

    conv = r("conversation_system")
    arch = r("chat_architecture")
    si = r("self_improvement_os")
    cr = r("chat_refactor_os")
    kl = r("kokuzo_learning_os")
    nas = r("storage_backup_nas")
    acc = r("acceptance_runtime")
    cab = r("cursor_autobuild")
    fab = r("feature_autobuild")
    ra = r("remote_admin")
    ic = r("internal_cognition")
    cg = r("constitution_governance")
    overall = int(round((conv + arch + si + cr + kl + nas + acc + cab + fab + ra + ic + cg) / 12))
    highs = [k for k, v in subsystems.items() if isinstance(v, dict) and v.get("risk_level") == "high"]
    return {
        "conversation_readiness": conv,
        "chat_architecture_readiness": arch,
        "self_improvement_os_readiness": si,
        "chat_refactor_os_readiness": cr,
        "kokuzo_learning_os_readiness": kl,
        "storage_backup_nas_readiness": nas,
        "acceptance_runtime_readiness": acc,
        "cursor_autobuild_readiness": cab,
        "feature_autobuild_readiness": fab,
        "remote_admin_readiness": ra,
        "internal_cognition_readiness": ic,
        "constitution_governance_readiness": cg,
        "overall_system_readiness": overall,
        "breakout_proximity": min(100, overall + (10 if conv >= 80 and arch >= 70 else 0)),
        "primary_breakers": highs[:12],
        "fail_next_card": FAIL_NEXT,
    }


def _next_cards(subsystems: Dict[str, Any], crouching: List[Dict[str, Any]], mismatches: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    cards: List[Dict[str, Any]] = []
    manual: List[str] = []

    def add(rank: int, name: str, rationale: str, risk: str, mg: bool) -> None:
        if len(cards) >= 5:
            return
        cards.append(
            {
                "rank": rank,
                "card_name": name,
                "rationale": rationale,
                "risk_level": risk,
                "manual_gate_required": mg,
            }
        )

    r = 1
    if subsystems.get("conversation_system", {}).get("risk_level") == "high":
        add(r, "CHAT_TS_STAGE5_WORLDCLASS_SEAL_AND_BASELINE_CURSOR_AUTO_V1", "conversation / worldclass 高リスク", "high", False)
        r += 1
    if subsystems.get("storage_backup_nas", {}).get("risk_level") == "high":
        add(r, "TENMON_STORAGE_NAS_MOUNT_AND_BACKUP_VERIFY_CURSOR_AUTO_V1", "NAS/backup 未接続", "high", True)
        manual.append("storage_backup_nas")
        r += 1
    if mismatches:
        add(r, "TENMON_TOTAL_FORENSIC_REVEAL_CURSOR_AUTO_V1", "output 契約不一致あり", "medium", False)
        r += 1
    if len(crouching) >= 3:
        add(r, "TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_CURSOR_AUTO_V1", "複数系が crouching（出力なし）", "medium", False)
        r += 1
    if subsystems.get("self_improvement_os", {}).get("completedness_score", 0) < 55:
        add(r, "TENMON_SELF_IMPROVEMENT_OS_INTEGRATED_V1", "自己改善 OS 統合度が低い", "medium", False)
        r += 1
    while len(cards) < 5:
        add(r, "TENMON_EXISTING_8OS_REALIZATION_AUDIT_CURSOR_AUTO_V1", "全体実在監査の継続", "low", False)
        r += 1
    return cards[:5], manual


def _render_md(blob: Dict[str, Any]) -> str:
    lines = [
        f"# TENMON_TOTAL_XRAY_REVEAL_V1",
        "",
        f"- generatedAt: `{blob.get('generatedAt')}`",
        f"- repo_root: `{blob.get('repo_root')}`",
        "",
        "## integrated_master_verdict",
        "",
        "```json",
        json.dumps(blob.get("integrated_master_verdict") or {}, ensure_ascii=False, indent=2),
        "```",
        "",
        "## subsystem scores (quick)",
        "",
        "| subsystem | score | risk | status |",
        "|-----------|-------|------|--------|",
    ]
    for sid, row in sorted((blob.get("subsystems") or {}).items()):
        if not isinstance(row, dict):
            continue
        lines.append(
            f"| {sid} | {row.get('completedness_score')} | {row.get('risk_level')} | {row.get('system_status')} |"
        )
    lines.extend(
        [
            "",
            "## crouching (うずくまり)",
            "",
            f"- count: {len(blob.get('crouching_functions') or [])}",
            "",
            "## next_priority_cards",
            "",
            "```json",
            json.dumps(blob.get("next_priority_cards") or [], ensure_ascii=False, indent=2),
            "```",
            "",
            f"FAIL_NEXT: `{FAIL_NEXT}`",
        ]
    )
    return "\n".join(lines) + "\n"


def build_xray(api: Optional[Path] = None) -> Dict[str, Any]:
    api = api or _api_root()
    rr = _repo_root()
    chat_path = api / "src" / "routes" / "chat.ts"
    arch = build_architecture_report(chat_path, rr)
    worldclass = build_worldclass_report("api/src/routes/chat.ts")

    subsystems: Dict[str, Any] = {
        "conversation_system": _collect_conversation(api, worldclass),
        "chat_architecture": _collect_chat_architecture(api, arch),
        "self_improvement_os": _collect_self_improvement(api),
        "chat_refactor_os": _collect_chat_refactor_os(api),
        "kokuzo_learning_os": _collect_kokuzo_learning(api),
        "storage_backup_nas": _collect_storage_backup_nas(api),
        "acceptance_runtime": _collect_acceptance_runtime(api),
        "cursor_autobuild": _collect_cursor_autobuild(api),
        "feature_autobuild": _collect_feature_autobuild(api),
        "remote_admin": _collect_remote_admin(api),
        "internal_cognition": _collect_internal_cognition(api),
        "constitution_governance": _collect_constitution_governance(api),
    }
    if isinstance(subsystems.get("chat_architecture"), dict):
        subsystems["chat_architecture"]["single_exit_signals"] = arch.get("signals") or {}

    for row in subsystems.values():
        if isinstance(row, dict) and row.get("system_status") == "crouching":
            pass  # reserved; crouching list separate

    crouching = _build_crouching(subsystems)
    missing = _build_missing_runners(api)
    mismatches = _build_contract_mismatches(api, worldclass)
    imv = _integrated_verdict(subsystems)
    next_cards, manual_gate = _next_cards(subsystems, crouching, mismatches)

    hist = Counter()
    for row in subsystems.values():
        if isinstance(row, dict):
            hist[str(row.get("system_status") or "?")] += 1

    env_hints = {
        "CHAT_TS_PROBE_BASE_URL": bool(os.environ.get("CHAT_TS_PROBE_BASE_URL")),
        "TENMON_BACKUP_ROOT": bool(os.environ.get("TENMON_BACKUP_ROOT")),
        "NAS_MOUNT_PATH": bool(os.environ.get("NAS_MOUNT_PATH")),
        "TENMON_SEAL_DIR": os.environ.get("TENMON_SEAL_DIR", ""),
    }

    rc_g, git_out = _run_readonly(["git", "-C", str(rr), "rev-parse", "--short", "HEAD"], timeout=5.0)
    rc_s, st_out = _run_readonly(["git", "-C", str(rr), "status", "--porcelain"], timeout=5.0)

    blob: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "repo_root": str(rr),
        "api_root": str(api),
        "environment_hints": env_hints,
        "git": {"head_ok": rc_g == 0, "short_head": (git_out or "").strip()[:40], "porcelain_lines": len([x for x in st_out.splitlines() if x.strip()])},
        "worldclass_summary": (worldclass.get("verdict") or {}),
        "chat_architecture_summary": {
            "line_count": arch.get("line_count"),
            "threadCore_count": arch.get("threadCore_count"),
            "responsePlan_count": arch.get("responsePlan_count"),
            "synapse_count": arch.get("synapse_count"),
            "route_drift_score": arch.get("route_drift_score"),
            "trunk_wiring_summary": (arch.get("trunk_wiring") or {}).get("summary"),
        },
        "subsystems": subsystems,
        "subsystem_status_histogram": dict(hist),
        "crouching_functions": crouching,
        "missing_runners": missing,
        "output_contract_mismatches": mismatches,
        "integrated_master_verdict": imv,
        "next_priority_cards": next_cards,
        "manual_gate_subsystems": manual_gate,
    }
    blob["subsystem_readiness_matrix"] = {
        k: {
            "completedness_score": v.get("completedness_score"),
            "risk_level": v.get("risk_level"),
            "system_status": v.get("system_status"),
            "exists": v.get("exists"),
            "implemented": v.get("implemented"),
            "connected": v.get("connected"),
            "running": v.get("running"),
            "producing_outputs": v.get("producing_outputs"),
        }
        for k, v in subsystems.items()
        if isinstance(v, dict)
    }
    return blob


def write_outputs(out_dir: Path, blob: Dict[str, Any]) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, str] = {}

    def w(name: str, obj: Any) -> None:
        p = out_dir / name
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        paths[name] = str(p)

    w("total_xray_reveal.json", blob)
    (out_dir / "total_xray_reveal.md").write_text(_render_md(blob), encoding="utf-8")
    paths["total_xray_reveal.md"] = str(out_dir / "total_xray_reveal.md")
    w("subsystem_readiness_matrix.json", blob["subsystem_readiness_matrix"])
    w("crouching_functions.json", blob["crouching_functions"])
    w("missing_runners.json", blob["missing_runners"])
    w("output_contract_mismatches.json", blob["output_contract_mismatches"])
    w("integrated_master_verdict.json", blob["integrated_master_verdict"])
    w("next_priority_cards.json", blob["next_priority_cards"])
    marker = out_dir / "TENMON_TOTAL_XRAY_REVEAL_VPS_V1"
    marker.write_text(
        json.dumps({"card": "TENMON_TOTAL_XRAY_REVEAL_VPS_V1", "generatedAt": blob["generatedAt"], "outputs": list(paths.keys())}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    paths["TENMON_TOTAL_XRAY_REVEAL_VPS_V1"] = str(marker)
    return paths


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="Directory for all reveal artifacts")
    ap.add_argument("--api-root", default="", help="Override api/ root")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    api = Path(args.api_root).resolve() if args.api_root else _api_root()
    blob = build_xray(api)
    if args.out_dir:
        write_outputs(Path(args.out_dir).resolve(), blob)
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
