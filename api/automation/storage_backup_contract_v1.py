#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Canonical contract / constants for storage / backup / NAS diagnosis (v1).
read-only; マウント強制やデータ削除は行わない。
"""
from __future__ import annotations

from typing import Any, Dict, List

CARD = "TENMON_STORAGE_BACKUP_CONTRACT_V1"

# 監査対象バックアップ・同期スクリプト（api ルート相対）
RELATED_SCRIPTS: List[str] = [
    "scripts/vps_sync_and_verify.sh",
    "scripts/vps_reclone_and_switch.sh",
    "scripts/vps_fix_live_directory.sh",
    "scripts/obs_evidence_bundle.sh",
]

# 固定候補（deep reveal と整合）
DEFAULT_PATH_CANDIDATES: List[str] = [
    "/mnt/nas",
    "/media/nas",
    "/srv/nas",
    "/Volumes/NAS",
    "/opt/tenmon-backup",
    "/backup",
    "/data/backup",
]

# 環境変数から候補パスを拾うキー（値が非空なら候補に追加）
ENV_PATH_KEYS: List[str] = [
    "TENMON_BACKUP_ROOT",
    "NAS_MOUNT_PATH",
    "TENMON_NAS_PATH",
    "BACKUP_ROOT",
    "NAS_PATH",
]

# 分類ラベル（マスター要件）
CLASSIFICATIONS: List[str] = [
    "mounted_and_visible",
    "path_defined_but_unmounted",
    "mounted_but_permission_denied",
    "candidate_not_found",
    "backup_script_only",
]

# readiness 4 軸
READINESS_AXES: List[str] = [
    "scripts_present",
    "mount_present",
    "writable_probe_skipped",
    "actual_sync_contract_present",
]


def contract_document() -> Dict[str, Any]:
    return {
        "version": 1,
        "card": CARD,
        "policy": "read_only_diagnosis_no_mount_change",
        "related_scripts": RELATED_SCRIPTS,
        "default_path_candidates": DEFAULT_PATH_CANDIDATES,
        "env_path_keys": ENV_PATH_KEYS,
        "classifications": CLASSIFICATIONS,
        "readiness_axes": READINESS_AXES,
    }
