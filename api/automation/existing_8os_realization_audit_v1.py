#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
既存 8 親 OS の実成立度（runner / 出力 / manifest / verdict / queue）を総監査。
read-only。route / chat / DB 非改変。
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

VERSION = 1
CARD = "TENMON_EXISTING_8OS_REALIZATION_AUDIT_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_EXISTING_8OS_REALIZATION_AUDIT_VPS_V1"
FAIL_NEXT = "TENMON_EXISTING_8OS_REALIZATION_AUDIT_RETRY_CURSOR_AUTO_V1"

Readiness = str  # exists_only | runnable_no_outputs | outputs_partial | integrated_ready

BLOCKER_TYPES = (
    "missing_runner",
    "output_contract_mismatch",
    "parse_failure",
    "queue_empty_unexpected",
    "manifest_missing",
    "verdict_missing",
    "output_dir_missing",
    "runner_not_executable",
)


def api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def automation_dir() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_json(p: Path) -> Tuple[bool, Any]:
    if not p.is_file():
        return False, None
    try:
        return True, json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return False, None


def _contract_ok(obj: Any, min_keys: Tuple[str, ...] = ("version",)) -> bool:
    if not isinstance(obj, dict):
        return False
    return all(k in obj for k in min_keys)


def _is_executable(p: Path) -> bool:
    return p.is_file() and os.access(p, os.X_OK)


def _dir_exists_glob(api: Path, patterns: List[str]) -> bool:
    repo = api.parent
    for pat in patterns:
        rel = pat.replace("api/", "").lstrip("/")
        if "*" in rel:
            if list(api.glob(rel)):
                return True
        else:
            if (api / rel).is_dir():
                return True
        # api/out/...
        full = repo / pat if not Path(pat).is_absolute() else Path(pat)
        if "*" in str(full):
            parent = full.parent
            if parent.is_dir():
                if list(parent.glob(full.name)):
                    return True
        elif full.is_dir():
            return True
    return False


OS_GROUPS: List[Dict[str, Any]] = [
    {
        "id": "parent_01_observe_manifest",
        "parent": "P01",
        "title": "Observe & manifest",
        "runner_py": "self_build_manifest_v1.py",
        "runner_sh": "self_build_manifest_v1.sh",
        "manifest_paths": ["self_build_manifest.json"],
        "manifest_contract_keys": ("version", "card"),
        "verdict_paths": [],
        "verdict_note": "manifest doubles as integrated artifact for P01",
        "queue_paths": [],
        "queue_expect_nonempty": False,
        "output_dir_globs": ["out/tenmon_observation_os_v1/*", "out/tenmon_self_build_parent_01_v1/*"],
        "contract_keys": ("version", "card"),
    },
    {
        "id": "parent_02_taxonomy_priority",
        "parent": "P02",
        "title": "Taxonomy & priority",
        "runner_py": "self_build_priority_queue_v1.py",
        "runner_sh": "self_build_taxonomy_and_queue_v1.sh",
        "manifest_paths": ["self_build_blocker_taxonomy.json", "self_build_priority_queue.json"],
        "manifest_contract_keys": ("version",),
        "verdict_paths": ["self_build_priority_queue.json"],
        "verdict_contract_keys": ("version", "counts"),
        "queue_paths": ["self_build_priority_queue.json"],
        "queue_expect_nonempty": False,
        "output_dir_globs": ["out/tenmon_self_build_parent_02_v1/*"],
        "contract_keys": ("version",),
        "queue_items_key": "ready_cards",
    },
    {
        "id": "parent_03_cursor_automation_kernel",
        "parent": "P03",
        "title": "Cursor automation kernel",
        "runner_py": "cursor_automation_kernel_v1.py",
        "runner_sh": "",
        "manifest_paths": ["cursor_card_schema.json"],
        "manifest_contract_keys": ("version", "card"),
        "verdict_paths": ["cursor_kernel_result.json"],
        "queue_paths": ["cursor_retry_queue.json"],
        "queue_expect_nonempty": False,
        "output_dir_globs": [],
        "contract_keys": ("version",),
        "verdict_contract_keys": ("version", "overall_pass"),
    },
    {
        "id": "parent_04_vps_acceptance_kernel",
        "parent": "P04",
        "title": "VPS acceptance kernel",
        "runner_py": "vps_acceptance_kernel_v1.py",
        "runner_sh": "vps_acceptance_kernel_v1.sh",
        "manifest_paths": ["vps_acceptance_kernel_result.json"],
        "manifest_contract_keys": ("version", "overall_pass"),
        "verdict_paths": ["integrated_final_verdict.json"],
        "queue_paths": [],
        "queue_expect_nonempty": False,
        "output_dir_globs": ["out/tenmon_vps_acceptance_kernel_v1/*"],
        "contract_keys": ("version",),
        "verdict_contract_keys": ("version", "overall"),
    },
    {
        "id": "parent_05_self_repair_loop",
        "parent": "P05",
        "title": "Self repair & improvement loop",
        "runner_py": "self_repair_loop_v1.py",
        "runner_sh": "",
        "manifest_paths": ["learning_quality_bridge.json"],
        "manifest_contract_keys": ("version", "scores"),
        "verdict_paths": ["self_repair_result.json", "self_repair_loop_parent_05_seal.json"],
        "verdict_contract_keys": ("version",),
        "queue_paths": ["retry_queue.json"],
        "queue_expect_nonempty": False,
        "output_dir_globs": [],
        "contract_keys": ("version",),
        "verdict_any_of": True,
    },
    {
        "id": "parent_06_feature_remote_admin",
        "parent": "P06",
        "title": "Feature autobuild & remote admin",
        "runner_py": "remote_admin_intake_v1.py",
        "runner_sh": "remote_admin_intake_v1.sh",
        "manifest_paths": ["remote_admin_queue.json"],
        "manifest_contract_keys": ("version",),
        "verdict_paths": ["approval_gate_result.json"],
        "verdict_contract_keys": ("version", "ok"),
        "queue_paths": [],
        "queue_expect_nonempty": False,
        "queue_note": "remote_admin_queue.json validated as manifest",
        "output_dir_globs": [],
        "contract_keys": ("version",),
        "queue_items_key": "items",
    },
    {
        "id": "parent_07_scheduled_evolution",
        "parent": "P07",
        "title": "Scheduled evolution governor",
        "runner_py": "scheduled_evolution_governor_v1.py",
        "runner_sh": "scheduled_evolution_governor_v1.sh",
        "manifest_paths": ["scheduled_evolution_state.json"],
        "manifest_contract_keys": ("version", "stage"),
        "verdict_paths": ["recommended_frequency.json"],
        "verdict_contract_keys": ("version", "runs_per_day"),
        "queue_paths": [],
        "queue_expect_nonempty": False,
        "output_dir_globs": [],
        "contract_keys": ("version", "stage"),
    },
    {
        "id": "parent_08_final_master_audit",
        "parent": "P08",
        "title": "Final master audit & seal",
        "runner_py": "final_master_audit_v1.py",
        "runner_sh": "final_master_audit_v1.sh",
        "manifest_paths": ["final_master_audit.json"],
        "manifest_contract_keys": ("version", "master_verdict"),
        "verdict_paths": ["final_master_readiness.json"],
        "queue_paths": [],
        "queue_expect_nonempty": False,
        "output_dir_globs": [],
        "contract_keys": ("version",),
        "verdict_contract_keys": ("version", "overall_master_readiness"),
    },
]


PRIORITY_CARD_BY_BLOCKER = {
    "missing_runner": "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1",
    "runner_not_executable": "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1",
    "manifest_missing": "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_RETRY_CURSOR_AUTO_V1",
    "output_dir_missing": "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_RETRY_CURSOR_AUTO_V1",
    "verdict_missing": "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_RETRY_CURSOR_AUTO_V1",
    "output_contract_mismatch": "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_RETRY_CURSOR_AUTO_V1",
    "parse_failure": "TENMON_EXISTING_8OS_REALIZATION_AUDIT_RETRY_CURSOR_AUTO_V1",
    "queue_empty_unexpected": "TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_RETRY_CURSOR_AUTO_V1",
}


def audit_one_group(spec: Dict[str, Any], auto: Path, scripts: Path, api: Path) -> Dict[str, Any]:
    blockers: List[Dict[str, Any]] = []
    checks_passed = 0
    checks_total = 0

    py_name = spec["runner_py"]
    sh_name = (spec.get("runner_sh") or "").strip()
    py_path = auto / py_name
    sh_path = scripts / sh_name if sh_name else None

    runner_py_exists = py_path.is_file()
    runner_sh_exists = sh_path.is_file() if sh_path else False
    runner_exists = runner_py_exists or runner_sh_exists
    checks_total += 1
    if runner_exists:
        checks_passed += 1
    else:
        blockers.append(
            {"type": "missing_runner", "detail": f"no {py_name} nor {sh_name or '(no sh)'}", "group": spec["id"]}
        )

    checks_total += 1
    exec_ok = False
    if sh_path and sh_path.is_file():
        exec_ok = _is_executable(sh_path)
    if not exec_ok and py_path.is_file():
        exec_ok = True
    if exec_ok:
        checks_passed += 1
    elif runner_exists:
        blockers.append(
            {
                "type": "runner_not_executable",
                "detail": str(sh_path or py_path),
                "group": spec["id"],
            }
        )

    out_ok = True
    globs = spec.get("output_dir_globs") or []
    if globs:
        checks_total += 1
        out_ok = _dir_exists_glob(api, globs)
        if out_ok:
            checks_passed += 1
        else:
            blockers.append({"type": "output_dir_missing", "detail": globs, "group": spec["id"]})

    def check_jsons_all(rel_list: List[str], ctype: str, keys: Tuple[str, ...]) -> None:
        nonlocal checks_passed, checks_total
        if not rel_list:
            return
        checks_total += 1
        all_ok = True
        for rel in rel_list:
            p = auto / rel
            parsed_ok, obj = _parse_json(p)
            if not parsed_ok:
                all_ok = False
                blockers.append(
                    {
                        "type": "parse_failure" if p.is_file() else ctype,
                        "detail": rel,
                        "group": spec["id"],
                    }
                )
                continue
            if not _contract_ok(obj, keys):
                all_ok = False
                blockers.append({"type": "output_contract_mismatch", "detail": rel, "group": spec["id"]})
        if all_ok:
            checks_passed += 1

    def check_jsons_any(rel_list: List[str], ctype: str, keys: Tuple[str, ...]) -> None:
        nonlocal checks_passed, checks_total
        if not rel_list:
            return
        checks_total += 1
        for rel in rel_list:
            p = auto / rel
            parsed_ok, obj = _parse_json(p)
            if not parsed_ok:
                continue
            if _contract_ok(obj, keys):
                checks_passed += 1
                return
        blockers.append({"type": ctype, "detail": rel_list, "group": spec["id"]})

    mkeys: Tuple[str, ...] = tuple(
        spec.get("manifest_contract_keys") or spec.get("contract_keys") or ("version",)
    )
    check_jsons_all(spec.get("manifest_paths") or [], "manifest_missing", mkeys)

    v_list = spec.get("verdict_paths") or []
    vkeys: Tuple[str, ...] = tuple(
        spec.get("verdict_contract_keys") or spec.get("contract_keys") or ("version",)
    )
    if v_list:
        if spec.get("verdict_any_of"):
            check_jsons_any(v_list, "verdict_missing", vkeys)
        else:
            check_jsons_all(v_list, "verdict_missing", vkeys)

    qpaths = spec.get("queue_paths") or []
    qkey = spec.get("queue_items_key", "items")
    expect_nz = bool(spec.get("queue_expect_nonempty"))
    for rel in qpaths:
        checks_total += 1
        p = auto / rel
        parsed_ok, obj = _parse_json(p)
        if not parsed_ok:
            blockers.append({"type": "parse_failure" if p.is_file() else "manifest_missing", "detail": rel, "group": spec["id"]})
            continue
        checks_passed += 1
        if expect_nz and isinstance(obj, dict):
            items = obj.get(qkey)
            if isinstance(items, list) and len(items) == 0:
                blockers.append({"type": "queue_empty_unexpected", "detail": rel, "group": spec["id"]})

    readiness: Readiness = "exists_only"
    if not runner_exists:
        readiness = "exists_only"
    elif checks_passed == 0 and runner_exists:
        readiness = "runnable_no_outputs"
    elif checks_passed < checks_total:
        readiness = "outputs_partial"
    elif checks_passed == checks_total and checks_total > 0:
        readiness = "integrated_ready"
    else:
        readiness = "runnable_no_outputs" if exec_ok else "exists_only"

    return {
        "id": spec["id"],
        "parent": spec["parent"],
        "title": spec["title"],
        "readiness": readiness,
        "checks_passed": checks_passed,
        "checks_total": checks_total,
        "runner": {
            "py": str(py_path),
            "py_exists": runner_py_exists,
            "sh": str(sh_path) if sh_path else None,
            "sh_exists": runner_sh_exists,
        },
        "blockers": blockers,
    }


def pick_next_priority_cards(all_blockers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    order = (
        "missing_runner",
        "runner_not_executable",
        "verdict_missing",
        "manifest_missing",
        "parse_failure",
        "output_contract_mismatch",
        "output_dir_missing",
        "queue_empty_unexpected",
    )
    seen: set[str] = set()
    out: List[Dict[str, Any]] = []
    for bt in order:
        if len(out) >= 3:
            break
        hits = [b for b in all_blockers if b.get("type") == bt]
        if not hits:
            continue
        card = PRIORITY_CARD_BY_BLOCKER.get(bt, FAIL_NEXT)
        if card in seen:
            continue
        seen.add(card)
        out.append(
            {
                "priority": len(out) + 1,
                "cursor_card": card,
                "blocker_type": bt,
                "from_groups": sorted({str(h.get("group")) for h in hits})[:5],
                "rationale": f"Address {bt} across parent OS runners/outputs",
            }
        )
    if len(out) < 3 and FAIL_NEXT not in seen:
        out.append(
            {
                "priority": len(out) + 1,
                "cursor_card": FAIL_NEXT,
                "blocker_type": "general",
                "from_groups": [],
                "rationale": "Re-run realization audit after fixes",
            }
        )
    return out[:3]


def run_audit() -> Dict[str, Any]:
    auto = automation_dir()
    api = api_root()
    scripts = api / "scripts"
    rows = [audit_one_group(g, auto, scripts, api) for g in OS_GROUPS]
    all_blockers: List[Dict[str, Any]] = []
    for r in rows:
        all_blockers.extend(r.get("blockers") or [])

    by_type: Dict[str, List[Dict[str, Any]]] = {t: [] for t in BLOCKER_TYPES}
    for b in all_blockers:
        t = str(b.get("type") or "unknown")
        by_type.setdefault(t, []).append(b)

    next_cards = pick_next_priority_cards(all_blockers)

    matrix = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "readiness_legend": {
            "exists_only": "runner 実体のみ / 未実行相当",
            "runnable_no_outputs": "実行可能だが必須 JSON 未整備",
            "outputs_partial": "一部のみ契約通り",
            "integrated_ready": "当該群の必須チェック全通過",
        },
        "groups": rows,
    }
    auto.joinpath("existing_8os_readiness_matrix.json").write_text(
        json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    block_doc = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "blocker_taxonomy": {k: v for k, v in by_type.items() if v},
        "flat_blockers": all_blockers,
        "counts_by_type": {k: len(v) for k, v in by_type.items() if v},
    }
    auto.joinpath("existing_8os_blockers.json").write_text(
        json.dumps(block_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    next_doc = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "next_priority_cards": next_cards,
        "policy": "max 3 cards, deduped by blocker severity",
    }
    auto.joinpath("existing_8os_next_priority.json").write_text(
        json.dumps(next_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    (auto / VPS_MARKER).write_text(f"{VPS_MARKER}\n{utc_now_iso()}\n", encoding="utf-8")

    apply_dir = auto / "generated_cursor_apply"
    apply_dir.mkdir(parents=True, exist_ok=True)
    (apply_dir / f"{FAIL_NEXT}.md").write_text(
        "\n".join(
            [
                f"# {FAIL_NEXT}",
                "",
                f"_generated {utc_now_iso()}_",
                "",
                "## Next priority (from audit)",
                "",
                "```json",
                json.dumps(next_cards, ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return {
        "ok": True,
        "groups": len(rows),
        "flat_blockers": len(all_blockers),
        "paths": {
            "matrix": str(auto / "existing_8os_readiness_matrix.json"),
            "blockers": str(auto / "existing_8os_blockers.json"),
            "next": str(auto / "existing_8os_next_priority.json"),
            "vps_marker": str(auto / VPS_MARKER),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="existing_8os_realization_audit_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    body = run_audit()
    if args.stdout_json:
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(body, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
