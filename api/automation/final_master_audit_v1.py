#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARENT_08: 親1〜7 + 学習ブリッジを束ねた最終監査・完成度・封印 MD / retry 生成。
chat.ts / DB / systemd 非改変。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_RETRY_CURSOR_AUTO_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _marker_ok(auto: Path, name: str) -> bool:
    return (auto / name).is_file()


Verdict = str  # completed | partially_completed | blocked | dangerous


def audit_observe_manifest(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_VPS_V1"
    m = _read(auto / "self_build_manifest.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_01_vps_marker")
    if not m:
        blockers.append("missing_self_build_manifest.json")
    if _marker_ok(auto, marker) and m.get("version"):
        v = "completed" if m.get("roots_observed") else "partially_completed"
    elif m.get("version"):
        v = "partially_completed"
    return (
        {
            "cluster": "observe_manifest",
            "parent": "P01",
            "verdict": v,
            "marker": marker,
            "evidence": {"manifest_version": m.get("version"), "has_roots": bool(m.get("roots_observed"))},
        },
        blockers,
    )


def audit_taxonomy_priority(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_VPS_V1"
    pq = _read(auto / "self_build_priority_queue.json")
    tax = _read(auto / "self_build_blocker_taxonomy.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_02_vps_marker")
    if not pq:
        blockers.append("missing_self_build_priority_queue.json")
    if not tax:
        blockers.append("missing_self_build_blocker_taxonomy.json")
    if _marker_ok(auto, marker) and pq.get("version") and tax.get("version"):
        v = "completed"
    elif pq.get("version") or tax.get("version"):
        v = "partially_completed"
    return (
        {
            "cluster": "taxonomy_priority",
            "parent": "P02",
            "verdict": v,
            "marker": marker,
            "evidence": {
                "priority_queue_card": pq.get("card"),
                "counts": pq.get("counts"),
            },
        },
        blockers,
    )


def audit_cursor_kernel(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_VPS_V1"
    kr = _read(auto / "cursor_kernel_result.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_03_vps_marker")
    if not kr:
        blockers.append("missing_cursor_kernel_result.json")
    if kr.get("overall_pass") is False:
        blockers.append("cursor_kernel_overall_pass_false")
        v = "partially_completed" if _marker_ok(auto, marker) else "blocked"
    elif kr.get("overall_pass") is True and _marker_ok(auto, marker):
        v = "completed"
    elif kr:
        v = "partially_completed"
    return (
        {
            "cluster": "cursor_automation_kernel",
            "parent": "P03",
            "verdict": v,
            "marker": marker,
            "evidence": {"overall_pass": kr.get("overall_pass"), "bundle_pass": kr.get("bundle_pass")},
        },
        blockers,
    )


def audit_vps_acceptance(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_VPS_V1"
    kr = _read(auto / "vps_acceptance_kernel_result.json")
    iv = _read(auto / "integrated_final_verdict.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_04_vps_marker")
    if not kr:
        blockers.append("missing_vps_acceptance_kernel_result.json")
    ov = True
    if isinstance(iv.get("overall"), dict):
        ov = bool(iv["overall"].get("pass", iv["overall"].get("ok", True)))
    kpass = bool(kr.get("overall_pass", True))
    if not kpass or not ov:
        blockers.append("vps_or_integrated_verdict_fail")
        v = "partially_completed" if _marker_ok(auto, marker) else "blocked"
    elif _marker_ok(auto, marker) and kpass and ov:
        v = "completed"
    elif kr or iv:
        v = "partially_completed"
    return (
        {
            "cluster": "vps_acceptance_kernel",
            "parent": "P04",
            "verdict": v,
            "marker": marker,
            "evidence": {"kernel_overall_pass": kpass, "integrated_overall_pass": ov},
        },
        blockers,
    )


def _integrated_overall_ok(auto: Path) -> bool:
    iv = _read(auto / "integrated_final_verdict.json")
    if isinstance(iv.get("overall"), dict):
        return bool(iv["overall"].get("pass", iv["overall"].get("ok", True)))
    seal = _read(auto / "integrated_acceptance_seal.json")
    return bool(seal.get("overall_pass", True))


def audit_self_repair(auto: Path, dpb: Dict[str, Any], fc: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_VPS_V1"
    sr = _read(auto / "self_repair_result.json")
    bridge = _read(auto / "learning_quality_bridge.json")
    seal05 = _read(auto / "self_repair_loop_parent_05_seal.json")
    v: Verdict = "blocked"
    fts = list(fc.get("fail_types") or [])
    integ_ok = _integrated_overall_ok(auto)
    # 危険: ブロックされた dangerous patch かつ acceptance も落ちている（開発ツリー汚れのみでは dangerous にしない）
    if dpb.get("blocked") and not integ_ok:
        v = "dangerous"
        blockers.append("dangerous_patch_blocked_and_integrated_fail")
    elif dpb.get("blocked") and "dangerous_patch" in fts:
        blockers.append("dangerous_patch_blocked_worktree_note")
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_05_vps_marker")
    if not sr and not seal05:
        blockers.append("missing_self_repair_loop_artifacts")
    if v == "dangerous":
        pass
    elif _marker_ok(auto, marker) and (sr.get("paths") or seal05.get("artifacts")):
        v = "completed"
    elif _marker_ok(auto, marker) and (sr.get("card") or bridge.get("version") or seal05):
        v = "partially_completed"
    elif sr or bridge or seal05:
        v = "partially_completed"
    return (
        {
            "cluster": "self_repair_loop",
            "parent": "P05",
            "verdict": v,
            "marker": marker,
            "evidence": {
                "has_self_repair_result": bool(sr),
                "learning_bridge_unified": (bridge.get("scores") or {}).get("unified_score"),
                "fail_types": fts[:12],
            },
        },
        blockers,
    )


def audit_learning_bridge(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    lis = _read(auto / "learning_integration_seal.json")
    lqb = _read(auto / "learning_quality_bridge.json")
    clb = _read(auto / "conversation_learning_bridge.json")
    v: Verdict = "blocked"
    if not lqb and not lis:
        blockers.append("missing_learning_quality_bridge_and_integration_seal")
    if lis.get("overall_pass") is False:
        blockers.append("learning_integration_seal_fail")
        v = "partially_completed"
    elif lqb.get("version") and lis.get("version"):
        v = "completed" if lis.get("overall_pass", True) else "partially_completed"
    elif lqb.get("version") or lis.get("version"):
        v = "partially_completed"
    return (
        {
            "cluster": "learning_improvement_bridge",
            "parent": "P05+P06_learning",
            "verdict": v,
            "marker": None,
            "evidence": {
                "learning_integration_pass": lis.get("overall_pass"),
                "bridge_verdict": lis.get("bridge_verdict") or clb.get("verdict"),
                "unified_score": (lqb.get("scores") or {}).get("unified_score"),
            },
        },
        blockers,
    )


def audit_feature_remote(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_VPS_V1"
    rq = _read(auto / "remote_admin_queue.json")
    gate = _read(auto / "approval_gate_result.json")
    plan = _read(auto / "feature_autobuild_plan.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_06_vps_marker")
    if not rq and not gate:
        blockers.append("missing_remote_admin_queue_and_gate")
    if _marker_ok(auto, marker) and (rq.get("version") or gate.get("version")):
        v = "completed" if rq.get("items") is not None else "partially_completed"
    elif rq or gate or plan:
        v = "partially_completed"
    return (
        {
            "cluster": "feature_autobuild_remote_admin",
            "parent": "P06",
            "verdict": v,
            "marker": marker,
            "evidence": {"queue_version": rq.get("version"), "has_plan": bool(plan.get("cursor_cards"))},
        },
        blockers,
    )


def audit_scheduled_evolution(auto: Path) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    marker = "TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_AND_FREQUENCY_CONTROL_VPS_V1"
    st = _read(auto / "scheduled_evolution_state.json")
    rf = _read(auto / "recommended_frequency.json")
    v: Verdict = "blocked"
    if not _marker_ok(auto, marker):
        blockers.append("missing_parent_07_vps_marker")
    if not st:
        blockers.append("missing_scheduled_evolution_state.json")
    if _marker_ok(auto, marker) and st.get("stage") is not None:
        v = "completed"
    elif st or rf:
        v = "partially_completed"
    return (
        {
            "cluster": "scheduled_evolution_governor",
            "parent": "P07",
            "verdict": v,
            "marker": marker,
            "evidence": {"stage": st.get("stage"), "runs_per_day": rf.get("runs_per_day")},
        },
        blockers,
    )


def compute_readiness(auto: Path, clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
    lqb = _read(auto / "learning_quality_bridge.json")
    lis = _read(auto / "learning_integration_seal.json")
    clb = _read(auto / "conversation_learning_bridge.json")
    uni = float((lqb.get("scores") or {}).get("unified_score") or 0)
    cr = float((lis.get("metrics") or {}).get("conversation_return_quality") or 0)
    conv = int(round(min(100, uni * 0.5 + cr * 0.5)))
    if clb.get("verdict") == "gap":
        conv = max(0, conv - 10)

    completed_n = sum(1 for c in clusters if c.get("verdict") == "completed")
    partial_n = sum(1 for c in clusters if c.get("verdict") == "partially_completed")
    self_build = int(round(min(100, completed_n * 8 + partial_n * 4)))

    sr_cluster = next((x for x in clusters if x["cluster"] == "self_repair_loop"), {})
    if sr_cluster.get("verdict") == "completed":
        self_repair = 90
    elif sr_cluster.get("verdict") == "partially_completed":
        self_repair = 60
    elif sr_cluster.get("verdict") == "dangerous":
        self_repair = 15
    else:
        self_repair = 30

    fr = next((x for x in clusters if x["cluster"] == "feature_autobuild_remote_admin"), {})
    remote = 85 if fr.get("verdict") == "completed" else 55 if fr.get("verdict") == "partially_completed" else 25

    se = _read(auto / "scheduled_evolution_state.json")
    stage = int(se.get("stage") or 1)
    sched = int(round(min(100, 20 + stage * 16)))

    overall = int(
        round(
            conv * 0.2
            + self_build * 0.2
            + self_repair * 0.2
            + remote * 0.15
            + sched * 0.15
            + (100 if completed_n >= 7 else 70 if completed_n >= 5 else 40) * 0.1
        )
    )
    return {
        "conversation_readiness": conv,
        "self_build_readiness": self_build,
        "self_repair_readiness": self_repair,
        "remote_admin_readiness": remote,
        "scheduled_evolution_readiness": sched,
        "overall_master_readiness": min(100, max(0, overall)),
        "clusters_completed": completed_n,
        "clusters_partial": partial_n,
    }


def master_verdict(clusters: List[Dict[str, Any]], readiness: Dict[str, Any]) -> Verdict:
    if any(c.get("verdict") == "dangerous" for c in clusters):
        return "dangerous"
    if any(c.get("verdict") == "blocked" for c in clusters):
        return "blocked"
    comp = sum(1 for c in clusters if c.get("verdict") == "completed")
    part = sum(1 for c in clusters if c.get("verdict") == "partially_completed")
    ov = int(readiness.get("overall_master_readiness") or 0)
    if comp == len(clusters) and ov >= 78:
        return "completed"
    if comp + part == len(clusters) and ov >= 55:
        return "partially_completed"
    if ov >= 45:
        return "partially_completed"
    return "blocked"


def build_seal_md(master: Verdict, readiness: Dict[str, Any], clusters: List[Dict[str, Any]], blockers: List[str]) -> str:
    lines = [
        "# TENMON — Final Master Completion Seal (PARENT_08)",
        "",
        f"- **CARD**: `{CARD}`",
        f"- **Generated**: {utc_now_iso()}",
        f"- **Master verdict**: `{master}`",
        f"- **overall_master_readiness**: {readiness.get('overall_master_readiness')}",
        "",
        "## Readiness",
        "",
        "| axis | score |",
        "|------|-------|",
        f"| conversation_readiness | {readiness.get('conversation_readiness')} |",
        f"| self_build_readiness | {readiness.get('self_build_readiness')} |",
        f"| self_repair_readiness | {readiness.get('self_repair_readiness')} |",
        f"| remote_admin_readiness | {readiness.get('remote_admin_readiness')} |",
        f"| scheduled_evolution_readiness | {readiness.get('scheduled_evolution_readiness')} |",
        "",
        "## Cluster verdicts",
        "",
    ]
    for c in clusters:
        lines.append(f"- **{c['cluster']}** ({c.get('parent')}): `{c.get('verdict')}`")
    lines.append("")
    if master == "completed":
        lines.append("## Seal status")
        lines.append("")
        lines.append("**SEAL_GRANTED** — 自己構築 OS 実装圏到達（監査上の完了）。運用継続は別途 PDCA。")
    elif master == "partially_completed":
        lines.append("## Seal status")
        lines.append("")
        lines.append("**SEAL_CONDITIONAL** — 一部未達。`final_master_blockers.json` を潰し再監査。")
    else:
        lines.append("## Seal status")
        lines.append("")
        lines.append("**SEAL_WITHHELD** — blocked / dangerous。`FAIL_NEXT_CARD` を実行。")
        lines.append("")
        lines.append(f"- **FAIL_NEXT**: `{FAIL_NEXT}`")
    if blockers:
        lines.extend(["", "## Blockers (summary)", ""])
        for b in blockers[:40]:
            lines.append(f"- {b}")
    lines.append("")
    return "\n".join(lines)


def write_retry_md(auto: Path, master: Verdict, blockers: List[str], clusters: List[Dict[str, Any]]) -> None:
    path = auto / "generated_cursor_apply" / f"{FAIL_NEXT}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            f"# {FAIL_NEXT}",
            "",
            f"_Auto-generated by `final_master_audit_v1.py` at {utc_now_iso()}_",
            "",
            f"**Master verdict**: `{master}`",
            "",
            "## Cluster snapshot",
            "",
        ]
        + [f"- `{c['cluster']}` → `{c.get('verdict')}`" for c in clusters]
        + [
            "",
            "## Blockers",
            "",
        ]
        + ([f"- {b}" for b in blockers] if blockers else ["- (none listed)"])
        + [
            "",
            "## Next actions",
            "",
            "1. 各親カード VPS マーカーと参照 JSON を揃える",
            "2. `integrated_final_verdict.json` / learning bridge を緑にする",
            "3. `python3 final_master_audit_v1.py` を再実行",
            "",
        ]
    )
    path.write_text(body, encoding="utf-8")


def run_audit() -> Dict[str, Any]:
    auto = api_automation()
    dpb = _read(auto / "dangerous_patch_blocker_report.json")
    fc = _read(auto / "fail_classification.json")

    all_blockers: List[str] = []
    clusters: List[Dict[str, Any]] = []
    per_cluster_blockers: Dict[str, List[str]] = {}

    for fn in (
        audit_observe_manifest,
        audit_taxonomy_priority,
        audit_cursor_kernel,
        audit_vps_acceptance,
        lambda a: audit_self_repair(a, dpb, fc),
        audit_learning_bridge,
        audit_feature_remote,
        audit_scheduled_evolution,
    ):
        c, bl = fn(auto)
        clusters.append(c)
        per_cluster_blockers[c["cluster"]] = list(bl)
        for b in bl:
            all_blockers.append(f"{c['cluster']}:{b}")

    readiness = compute_readiness(auto, clusters)
    master = master_verdict(clusters, readiness)

    audit_body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT,
        "master_verdict": master,
        "clusters": clusters,
        "inputs_note": "read-only JSON / VPS markers under api/automation",
    }
    (auto / "final_master_audit.json").write_text(
        json.dumps(audit_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    readiness_body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "master_verdict": master,
        **readiness,
        "dimensions_note": "0-100 heuristic; overall は軸とクラスタ達成度の合成",
    }
    (auto / "final_master_readiness.json").write_text(
        json.dumps(readiness_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    block_body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "master_verdict": master,
        "blockers": all_blockers,
        "cluster_blockers": per_cluster_blockers,
    }
    (auto / "final_master_blockers.json").write_text(
        json.dumps(block_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    seal_md = build_seal_md(master, readiness, clusters, all_blockers)
    (auto / "final_master_seal.md").write_text(seal_md, encoding="utf-8")

    if master != "completed":
        write_retry_md(auto, master, all_blockers, clusters)

    (auto / VPS_MARKER).write_text(f"{VPS_MARKER}\n{utc_now_iso()}\nmaster={master}\n", encoding="utf-8")

    parent_apply = auto / "generated_cursor_apply" / "TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_CURSOR_AUTO_V1.md"
    parent_apply.parent.mkdir(parents=True, exist_ok=True)
    parent_apply.write_text(
        "\n".join(
            [
                "# TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL",
                "",
                f"CARD_NAME: {CARD}",
                "",
                "## VPS_VALIDATION_OUTPUTS",
                f"- `{VPS_MARKER}`",
                "- `final_master_audit.json`",
                "- `final_master_readiness.json`",
                "- `final_master_blockers.json`",
                "- `final_master_seal.md`",
                "",
                "## FAIL_NEXT_CARD",
                f"`{FAIL_NEXT}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return {
        "ok": True,
        "master_verdict": master,
        "overall_master_readiness": readiness.get("overall_master_readiness"),
        "paths": {
            "audit": str(auto / "final_master_audit.json"),
            "readiness": str(auto / "final_master_readiness.json"),
            "blockers": str(auto / "final_master_blockers.json"),
            "seal_md": str(auto / "final_master_seal.md"),
            "vps_marker": str(auto / VPS_MARKER),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="final_master_audit_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    out = run_audit()
    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
