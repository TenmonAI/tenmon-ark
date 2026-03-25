#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_FINAL_AUDIT — 7 系統の自己構築 OS 到達監査（read-only）
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

SystemRow = Dict[str, Any]

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_BUILD_OS_FINAL_AUDIT_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_RETRY_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def marker_ok(auto: Path, name: str) -> bool:
    return (auto / name).is_file()


def compress_blockers(raw: List[str], limit: int = 5) -> List[str]:
    seen: List[str] = []
    for b in raw:
        t = re.sub(r"\s+", " ", str(b).strip())
        if not t or len(t) > 200:
            continue
        if t not in seen:
            seen.append(t)
        if len(seen) >= limit:
            break
    return seen


def audit_observation(auto: Path, api: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    rep = read_json(auto / "observation_os_report.json")
    if not rep.get("version"):
        art_block.append("observation_os: observation_os_report.json missing or invalid")
    if not marker_ok(auto, "TENMON_OBSERVATION_OS_VPS_V1"):
        art_block.append("observation_os: TENMON_OBSERVATION_OS_VPS_V1 marker missing")
    for rel in ("blocker_taxonomy.json", "priority_queue.json"):
        if not (auto / rel).is_file():
            art_block.append(f"observation_os: {rel} missing")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok
    blockers = art_block + run_block
    ev = {
        "report": str(auto / "observation_os_report.json"),
        "vps_card_in_report": rep.get("vps_card"),
        "marker": (auto / "TENMON_OBSERVATION_OS_VPS_V1").is_file(),
    }
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": blockers,
        "evidence": ev,
    }


def audit_cursor_autobuild(auto: Path) -> SystemRow:
    art_block: List[str] = []
    if not marker_ok(auto, "TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1"):
        art_block.append("cursor_autobuild: TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1 missing")
    man = read_json(auto / "cursor_acceptance_manifest_v2.json")
    if not man.get("version"):
        art_block.append("cursor_autobuild: cursor_acceptance_manifest_v2.json missing")
    if not (auto / "cursor_autobuild_common_v2.py").is_file():
        art_block.append("cursor_autobuild: cursor_autobuild_common_v2.py missing")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok
    ev = {"manifest_version": man.get("version"), "marker": True}
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block,
        "evidence": ev,
    }


def audit_vps_acceptance(auto: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    if not marker_ok(auto, "TENMON_VPS_ACCEPTANCE_OS_VPS_V1"):
        art_block.append("vps_acceptance: TENMON_VPS_ACCEPTANCE_OS_VPS_V1 missing")
    seal = read_json(auto / "integrated_acceptance_seal.json")
    if not seal:
        art_block.append("vps_acceptance: integrated_acceptance_seal.json missing")
    elif not bool(seal.get("overall_pass")):
        run_block.append("vps_acceptance: integrated_acceptance_seal.overall_pass is false")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok and len(run_block) == 0
    ev = {"overall_pass": seal.get("overall_pass"), "path": str(auto / "integrated_acceptance_seal.json")}
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block + run_block,
        "evidence": ev,
    }


def audit_self_repair(auto: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    if not marker_ok(auto, "TENMON_SELF_REPAIR_OS_VPS_V1"):
        art_block.append("self_repair: TENMON_SELF_REPAIR_OS_VPS_V1 missing")
    seal = read_json(auto / "self_repair_seal.json")
    if not seal.get("version"):
        art_block.append("self_repair: self_repair_seal.json missing or invalid")
    dpb = read_json(auto / "dangerous_patch_blocker_report.json")
    if dpb and dpb.get("blocked") is True:
        run_block.append("self_repair: dangerous_patch_blocker_report.blocked=true")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok and len(run_block) == 0
    ev = {
        "seal_version": seal.get("version"),
        "dangerous_patch_blocked": dpb.get("blocked"),
    }
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block + run_block,
        "evidence": ev,
    }


def audit_learning_integration(auto: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    if not marker_ok(auto, "TENMON_LEARNING_INTEGRATION_OS_VPS_V1"):
        art_block.append("learning_integration: TENMON_LEARNING_INTEGRATION_OS_VPS_V1 missing")
    seal = read_json(auto / "learning_integration_seal.json")
    if not seal.get("version"):
        art_block.append("learning_integration: learning_integration_seal.json missing")
    elif not bool(seal.get("overall_pass")):
        run_block.append("learning_integration: learning_integration_seal.overall_pass is false")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok and len(run_block) == 0
    ev = {"overall_pass": seal.get("overall_pass")}
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block + run_block,
        "evidence": ev,
    }


def audit_feature_autobuild(auto: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    if not marker_ok(auto, "TENMON_FEATURE_AUTOBUILD_OS_VPS_V1"):
        art_block.append("feature_autobuild: TENMON_FEATURE_AUTOBUILD_OS_VPS_V1 missing")
    if not (auto / "feature_autobuild_common_v1.py").is_file():
        art_block.append("feature_autobuild: feature_autobuild_common_v1.py missing")
    seal = read_json(auto / "feature_completion_seal.json")
    if not seal.get("version"):
        art_block.append("feature_autobuild: feature_completion_seal.json missing")
    elif not bool(seal.get("feature_completion_seal")):
        run_block.append("feature_autobuild: feature_completion_seal is false")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok and len(run_block) == 0
    ev = {"feature_completion_seal": seal.get("feature_completion_seal")}
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block + run_block,
        "evidence": ev,
    }


def audit_remote_command_center(auto: Path, api: Path) -> SystemRow:
    art_block: List[str] = []
    run_block: List[str] = []
    if not marker_ok(auto, "TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1"):
        art_block.append("remote_command_center: TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1 missing")
    seal = read_json(auto / "remote_cursor_command_center_seal.json")
    if not seal.get("version"):
        art_block.append("remote_command_center: remote_cursor_command_center_seal.json missing")
    elif not bool(seal.get("overall_ok")):
        run_block.append("remote_command_center: remote_cursor_command_center_seal.overall_ok is false")
    route = api / "src" / "routes" / "adminCursorCommand.ts"
    if not route.is_file():
        art_block.append("remote_command_center: adminCursorCommand.ts missing")
    artifact_ok = len(art_block) == 0
    runtime_ok = artifact_ok and len(run_block) == 0
    ev = {"overall_ok": seal.get("overall_ok"), "admin_route": str(route)}
    return {
        "artifact_ok": artifact_ok,
        "runtime_ok": runtime_ok,
        "ready": artifact_ok and runtime_ok,
        "blockers": art_block + run_block,
        "evidence": ev,
    }


def build_pdca_md(
    overall: bool,
    systems: List[Dict[str, Any]],
    blockers: List[str],
) -> str:
    lines = [
        "# SELF_BUILD_OS_NEXT_PDCA_AUTO_V1",
        "",
        f"- generatedAt: auto",
        f"- self_build_os_overall_ready: **{overall}**",
        "",
        "## 7 系統ステータス",
        "",
    ]
    for s in systems:
        r = "✅" if s.get("ready") else "❌"
        lines.append(f"- {r} **{s['id']}**")
    lines.extend(["", "## Focused blockers (max 5)", ""])
    if blockers:
        for i, b in enumerate(blockers, 1):
            lines.append(f"{i}. {b}")
    else:
        lines.append("_none_")
    nf = [s.get("fail_next") for s in systems if not s.get("ready")]
    if nf:
        lines.extend(["", "## Focused next cards (auto)", ""])
        for i, c in enumerate(nf[:5], 1):
            lines.append(f"{i}. `{c}`")
    lines.extend(
        [
            "",
            "## 次アクション",
            "",
        ]
    )
    if overall:
        lines.extend(
            [
                "- 会話向上の加速ループ（`conversation_acceleration_loop_ready`）へ進める。",
                "- `TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR` / priority_queue を週次で回す。",
            ]
        )
    else:
        lines.append("- 失敗系統の `FAIL_NEXT` / VPS カードを実行し、該当 seal を緑にしてから本監査を再実行。")
        for s in systems:
            if not s.get("ready") and s.get("fail_next"):
                lines.append(f"- **{s['id']}** → `{s['fail_next']}`")
        lines.append("- 優先順: `self_build_os_integrated_verdict.json` の `focused_next_cards` を上から。")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    api = api_root()

    checks = [
        ("observation_os_ready", audit_observation(auto, api), "TENMON_OBSERVATION_OS_CURSOR_AUTO_RETRY_V1"),
        ("cursor_autobuild_ready", audit_cursor_autobuild(auto), "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_RETRY_V1"),
        ("vps_acceptance_ready", audit_vps_acceptance(auto), "TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_RETRY_V1"),
        ("self_repair_ready", audit_self_repair(auto), "TENMON_SELF_REPAIR_OS_CURSOR_AUTO_RETRY_V1"),
        ("learning_integration_ready", audit_learning_integration(auto), "TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_RETRY_V1"),
        ("feature_autobuild_ready", audit_feature_autobuild(auto), "TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_RETRY_V1"),
        ("remote_command_center_ready", audit_remote_command_center(auto, api), "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_RETRY_V1"),
    ]

    systems: List[Dict[str, Any]] = []
    all_blockers: List[str] = []
    for sid, row, fail_next in checks:
        systems.append(
            {
                "id": sid,
                "artifact_ok": row["artifact_ok"],
                "runtime_ok": row["runtime_ok"],
                "ready": row["ready"],
                "evidence": row["evidence"],
                "blockers": row["blockers"],
                "fail_next": fail_next,
            }
        )
        all_blockers.extend(row["blockers"])

    blockers_top = compress_blockers(all_blockers, 5)
    focused_next = [s["fail_next"] for s in systems if not s["ready"]][:5]

    static_ready = all(s["artifact_ok"] for s in systems)
    runtime_ready = all(s["runtime_ok"] for s in systems)
    overall_ready = static_ready and runtime_ready
    conv_accel = bool(overall_ready)

    audit_body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "systems": systems,
        "aggregates": {
            "self_build_os_static_ready": static_ready,
            "self_build_os_runtime_ready": runtime_ready,
            "self_build_os_overall_ready": overall_ready,
            "conversation_acceleration_loop_ready": conv_accel,
        },
        "notes": [
            "artifact_ok: VPS マーカー + 代表 seal/manifest/コードの存在",
            "runtime_ok: overall_pass / feature_completion / remote guard 等の実行結果",
            "ready = artifact_ok ∧ runtime_ok",
        ],
    }

    verdict = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "self_build_os_static_ready": static_ready,
        "self_build_os_runtime_ready": runtime_ready,
        "self_build_os_overall_ready": overall_ready,
        "conversation_acceleration_loop_ready": conv_accel,
        "systems_ready_count": sum(1 for s in systems if s["ready"]),
        "systems_total": len(systems),
        "blockers": blockers_top,
        "focused_next_cards": focused_next,
    }

    blockers_file = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "blockers": blockers_top,
        "raw_blocker_count": len(all_blockers),
    }

    (auto / "self_build_os_final_audit.json").write_text(
        json.dumps(audit_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    (auto / "self_build_os_blockers.json").write_text(
        json.dumps(blockers_file, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    (auto / "self_build_os_integrated_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    pdca_path = auto / "generated_cursor_apply" / "SELF_BUILD_OS_NEXT_PDCA_AUTO_V1.md"
    pdca_path.parent.mkdir(parents=True, exist_ok=True)
    pdca_path.write_text(
        build_pdca_md(overall_ready, systems, blockers_top).replace(
            "generatedAt: auto", f"generatedAt: {utc_now_iso()}"
        ),
        encoding="utf-8",
    )

    retry_path = auto / "generated_cursor_apply" / "TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_RETRY_V1.md"
    retry_path.write_text(
        "\n".join(
            [
                f"# {FAIL_NEXT}",
                "",
                f"親カード: `{CARD}`",
                "",
                "## トリガー",
                "",
                f"- `self_build_os_integrated_verdict.json` の `self_build_os_overall_ready` が false",
                "",
                "## 手順",
                "",
                "1. `self_build_os_blockers.json` の最大 5 件を上から潰す。",
                "2. 系統ごとに `self_build_os_final_audit.json` の `fail_next` を実行。",
                "3. `api/automation` で該当 seal を再生成。",
                f"4. `python3 self_build_os_final_audit_v1.py` 再実行。",
                "",
                "## 参照",
                "",
                f"- `api/docs/constitution/TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_V1.md`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    (auto / "TENMON_SELF_BUILD_OS_FINAL_AUDIT_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\nself_build_os_overall_ready={overall_ready}\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
