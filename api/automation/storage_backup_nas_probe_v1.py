#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_STORAGE_BACKUP_NAS_RECOVERY_V1 — NAS / backup / sync の read-only 診断。
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from storage_backup_contract_v1 import (
    CARD as CONTRACT_CARD,
    DEFAULT_PATH_CANDIDATES,
    ENV_PATH_KEYS,
    RELATED_SCRIPTS,
    contract_document,
)
from storage_backup_mount_classifier_v1 import (
    classify_path,
    findmnt_targets,
    mount_table_linux,
    parse_fstab_paths,
    parse_mount_points,
    summarize_disconnection_reason,
)

CARD = "TENMON_STORAGE_BACKUP_NAS_PROBE_V1"
FAIL_NEXT = "TENMON_STORAGE_BACKUP_NAS_RECOVERY_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def collect_path_candidates(api_root: Path) -> List[Tuple[str, str]]:
    """(path, source) source は fixed_list | env:KEY | fstab | mount_parse | findmnt"""
    seen: Set[str] = set()
    out: List[Tuple[str, str]] = []

    def add(p: str, src: str) -> None:
        p = p.strip()
        if not p or p in seen:
            return
        seen.add(p)
        out.append((p, src))

    for p in DEFAULT_PATH_CANDIDATES:
        add(p, "fixed_list")
    for key in ENV_PATH_KEYS:
        v = os.environ.get(key)
        if v:
            add(v, f"env:{key}")
    for _src, mp in parse_fstab_paths():
        add(mp, "fstab")

    mt = mount_table_linux()
    for mp in parse_mount_points(mt):
        add(mp, "mount_output")

    for mp in findmnt_targets()[:80]:
        add(mp, "findmnt")

    return out


def scripts_audit(api_root: Path) -> Dict[str, Any]:
    rel = {}
    for s in RELATED_SCRIPTS:
        p = api_root / s
        rel[s] = {
            "exists": p.is_file(),
            "executable": os.access(p, os.X_OK) if p.is_file() else False,
        }
    present = sum(1 for v in rel.values() if v["exists"])
    return {
        "scripts": rel,
        "scripts_present_count": present,
        "scripts_present": present == len(RELATED_SCRIPTS),
        "any_script_present": present > 0,
    }


def run_probe(api_root: Path, out_dir: Path) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    mount_text = mount_table_linux()
    mount_points = parse_mount_points(mount_text)
    mount_points |= set(findmnt_targets())

    candidates = collect_path_candidates(api_root)
    matrix: List[Dict[str, Any]] = []
    for path_str, source in candidates:
        cls, ev = classify_path(path_str, mount_text, mount_points)
        matrix.append(
            {
                "path": path_str,
                "source": source,
                "classification": cls,
                "evidence": ev,
            }
        )

    sa = scripts_audit(api_root)
    mount_ok = any(m["classification"] == "mounted_and_visible" for m in matrix)

    # backup_script_only 集約行（スクリプトはあるがマウント実体が無い場合）
    if sa["any_script_present"] and not mount_ok:
        matrix.append(
            {
                "path": "__aggregate_backup_layer__",
                "source": "aggregate_when_no_mounted_candidate",
                "classification": "backup_script_only",
                "evidence": {
                    "note": "バックアップ系スクリプトは存在するが、mounted_and_visible な候補パスが無い",
                },
            }
        )

    primary_reason = summarize_disconnection_reason(matrix)

    mt_low = mount_text.lower()
    nfs_like = "nfs" in mt_low or "cifs" in mt_low or "smb" in mt_low or "fuse.sshfs" in mt_low
    readiness = {
        "scripts_present": bool(sa.get("scripts_present")),
        "mount_present": mount_ok,
        "writable_probe_skipped": True,
        "actual_sync_contract_present": bool(sa.get("scripts_present")) and (mount_ok or nfs_like),
    }

    contract_report = {
        "version": 1,
        "card": CONTRACT_CARD,
        "generated_at": _utc(),
        "contract": contract_document(),
        "readiness_axes": readiness,
        "candidate_count": len(candidates),
    }

    probe = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "policy": "read_only_diagnosis",
        "path_candidates": [{"path": p, "source": s} for p, s in candidates],
        "mount_output_head": mount_text[:8000],
        "fstab_nas_like": [{"src": a, "mp": b} for a, b in parse_fstab_paths()],
        "scripts_audit": sa,
        "readiness_axes": readiness,
        "primary_disconnection_reason": primary_reason,
        "classification_counts": _count_classifications(matrix),
    }

    # storage_backup_nas.json — 下流（integrator / deep reveal）向けスーパーセット
    storage_backup_nas = {
        "version": 2,
        "card": "TENMON_STORAGE_BACKUP_NAS_DIAGNOSIS_V1",
        "generated_at": _utc(),
        "mount_candidates": matrix,
        "scripts_present": sa["scripts"],
        "mount_output_head": probe["mount_output_head"],
        "env": {k: os.environ.get(k) for k in ENV_PATH_KEYS},
        "readiness_axes": readiness,
        "primary_disconnection_reason": primary_reason,
        "mount_candidate_sources": {p: s for p, s in candidates},
    }

    recovery = {
        "version": 1,
        "card": "TENMON_STORAGE_BACKUP_NAS_RECOVERY_V1",
        "generated_at": _utc(),
        "fail_next_card": FAIL_NEXT,
        "diagnosis_summary": primary_reason,
        "recommended_next_checks": _recommendations(matrix, readiness, sa),
        "policy_note": "recovery は診断まで。mount 強制・データ削除は行わない。",
    }

    nas_summary = {
        "version": 1,
        "generated_at": _utc(),
        "primary_disconnection_reason": primary_reason,
        "readiness_axes": readiness,
        "classification_counts": probe["classification_counts"],
        "candidate_paths_tracked": len(candidates),
    }

    (out_dir / "storage_backup_nas_probe.json").write_text(
        json.dumps(probe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "storage_backup_mount_matrix.json").write_text(
        json.dumps({"version": 1, "generated_at": _utc(), "rows": matrix}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out_dir / "storage_backup_contract_report.json").write_text(
        json.dumps(contract_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "storage_backup_recovery_recommendation.json").write_text(
        json.dumps(recovery, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "storage_backup_nas.json").write_text(
        json.dumps(storage_backup_nas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "nas_diagnosis_summary.json").write_text(
        json.dumps(nas_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    return {
        "ok": True,
        "out_dir": str(out_dir),
        "readiness_axes": readiness,
        "primary_disconnection_reason": primary_reason,
    }


def _count_classifications(matrix: List[Dict[str, Any]]) -> Dict[str, int]:
    c: Dict[str, int] = {}
    for m in matrix:
        k = str(m.get("classification") or "")
        c[k] = c.get(k, 0) + 1
    return c


def _recommendations(
    matrix: List[Dict[str, Any]], readiness: Dict[str, Any], sa: Dict[str, Any]
) -> List[str]:
    recs: List[str] = []
    if not readiness["mount_present"]:
        recs.append("fstab / 実マウント状態と TENMON_BACKUP_ROOT / NAS_MOUNT_PATH の整合を確認")
    if not sa.get("scripts_present"):
        recs.append("vps_sync_and_verify 等の関連スクリプト欠落を確認（リポジトリ更新）")
    if any(m.get("classification") == "mounted_but_permission_denied" for m in matrix):
        recs.append("権限不足パスがある: sudo または ACL / 実行ユーザを確認")
    if any(m.get("classification") == "path_defined_but_unmounted" for m in matrix):
        recs.append("空ディレクトリのみの候補あり: 手動マウントまたは fstab 反映後に再診断")
    if readiness["mount_present"]:
        recs.append("少なくとも1候補が mounted_and_visible: 同期契約の実効性を別カードで確認可能")
    return recs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    api = _api_root()
    out = Path(args.out_dir) if args.out_dir else (api / "automation" / "out" / "storage_backup_nas_recovery_v1")
    out = out.resolve()
    blob = run_probe(api, out)
    marker = api / "automation" / "TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1"
    marker.write_text(
        f"{_utc()}\nTENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1\n{blob.get('primary_disconnection_reason')}\n",
        encoding="utf-8",
    )
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
