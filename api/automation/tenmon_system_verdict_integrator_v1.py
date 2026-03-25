#!/usr/bin/env python3
"""
TENMON_SELF_AUDIT_OS_SINGLE_VERDICT_CURSOR_AUTO_V1
複数 subsystem JSON を単一の tenmon_system_verdict.json に統合する（product 改修ではない）。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SELF_AUDIT_OS_SINGLE_VERDICT_CURSOR_AUTO_V1"

AUTO = Path(__file__).resolve().parent
REPO = AUTO.parent.parent


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def read_json_list(path: Path) -> list[Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, list) else []
    except Exception:
        return []


def band_from_flags(
    *,
    code_present: bool,
    runtime_proven: bool,
    accepted_complete: bool,
    env_failure: bool,
) -> str:
    if env_failure:
        return "red_env"
    if accepted_complete:
        return "green"
    if runtime_proven and code_present:
        return "yellow"
    if code_present:
        return "yellow"
    return "red"


def pick_blockers(raw: Any, limit: int = 12) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
        if len(out) >= limit:
            break
    return out


def normalize_subsystem(
    key: str,
    src: dict[str, Any],
    *,
    source_files: list[str],
    env_failure: bool,
) -> dict[str, Any]:
    """unfinished report のサブシステム断片を正規化。"""
    cp = bool(src.get("code_present", True))
    rp = bool(src.get("runtime_proven", src.get("mounted_by_http", False)))
    ac = bool(src.get("accepted_complete", False))
    b = str(src.get("band") or "").strip() or band_from_flags(
        code_present=cp, runtime_proven=rp, accepted_complete=ac, env_failure=env_failure
    )
    blk_raw = src.get("blockers")
    blockers = pick_blockers(blk_raw if isinstance(blk_raw, list) else [])
    return {
        "code_present": cp,
        "runtime_proven": rp,
        "accepted_complete": ac,
        "band": b,
        "primary_blockers": blockers,
        "source_files": list(source_files),
    }


def build_self_audit_os(report: dict[str, Any], env_failure: bool) -> dict[str, Any]:
    vsi = report.get("verdict_source_integrity") or {}
    split = bool(vsi.get("split", True))
    reasons = vsi.get("reasons") or []
    overall = str(report.get("overall_band") or "")
    cp = True
    rp = not split
    ac = not split and overall in ("sealed_operable", "accepted_complete_sealed")
    b = band_from_flags(code_present=cp, runtime_proven=rp, accepted_complete=ac, env_failure=env_failure)
    blockers: list[str] = []
    if split:
        blockers.append("verdict_source_split_not_single")
    blockers.extend(str(x) for x in reasons if x)
    if overall and overall not in ("sealed_operable",):
        blockers.append(f"overall_band={overall}")
    return {
        "code_present": cp,
        "runtime_proven": rp,
        "accepted_complete": ac,
        "band": b,
        "primary_blockers": pick_blockers(blockers, 24),
        "source_files": [
            str(AUTO / "tenmon_total_unfinished_completion_report.json"),
        ],
    }


def build_self_repair_os(
    report: dict[str, Any],
    sb_verdict: dict[str, Any],
    master: dict[str, Any],
    env_failure: bool,
) -> dict[str, Any]:
    blockers = pick_blockers(sb_verdict.get("blockers"))
    cp = True
    rp = bool(sb_verdict.get("self_build_os_runtime_ready")) or bool(master.get("self_repair_readiness", 0) >= 50)
    ac = bool(sb_verdict.get("self_build_os_overall_ready")) and not any(
        "dangerous_patch" in str(b).lower() for b in (sb_verdict.get("blockers") or [])
    )
    b = band_from_flags(code_present=cp, runtime_proven=rp, accepted_complete=ac, env_failure=env_failure)
    if not blockers and report.get("unfinished_blockers_by_system"):
        ubs = report["unfinished_blockers_by_system"]
        if isinstance(ubs, dict):
            for k, v in ubs.items():
                if "repair" in k.lower() and isinstance(v, list):
                    blockers.extend(str(x) for x in v[:8])
    return {
        "code_present": cp,
        "runtime_proven": rp,
        "accepted_complete": ac,
        "band": b,
        "primary_blockers": blockers or ["self_repair_verdict_pending"],
        "source_files": [
            str(AUTO / "self_build_os_integrated_verdict.json"),
            str(AUTO / "final_master_readiness.json"),
        ],
    }


def build_remote_admin_cursor_bridge(report: dict[str, Any], env_failure: bool) -> dict[str, Any]:
    """cursor_card_insert_ui + local_cursor_bridge + remote_build_dashboard を統合。"""
    keys = ("cursor_card_insert_ui", "local_cursor_bridge", "remote_build_dashboard")
    parts: list[str] = []
    subs: list[dict[str, Any]] = []
    blockers: list[str] = []
    src_files: list[str] = []
    for k in keys:
        sub = report.get(k)
        if not isinstance(sub, dict):
            continue
        parts.append(k)
        subs.append(sub)
        blockers.extend(pick_blockers(sub.get("blockers")))
        for ev in sub.get("evidence") or []:
            if isinstance(ev, str) and ev.startswith("/") and ":" in ev:
                src_files.append(ev.split(":")[0])
    src_files = sorted(set(src_files))[:24]
    cp = any(bool(s.get("code_present", True)) for s in subs) if subs else True
    rp = any(bool(s.get("runtime_proven")) for s in subs) if subs else False
    ac = all(bool(s.get("accepted_complete")) for s in subs) if subs else False
    b = band_from_flags(code_present=cp, runtime_proven=rp, accepted_complete=ac, env_failure=env_failure)
    return {
        "code_present": cp,
        "runtime_proven": rp,
        "accepted_complete": ac,
        "band": b,
        "primary_blockers": pick_blockers(blockers) or (["remote_admin_runtime_proof_incomplete"] if not ac else []),
        "source_files": src_files
        or [
            str(REPO / "api/src/routes/adminCursorCommand.ts"),
            str(REPO / "api/src/routes/adminRemoteBuild.ts"),
        ],
        "merged_from": parts,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--repo-root",
        type=str,
        default=str(REPO),
        help="repo root (default: inferred)",
    )
    ap.add_argument(
        "--soft-exit-ok",
        action="store_true",
        help="常に exit 0（verdict の pass だけで判定したい CI 向け）",
    )
    args = ap.parse_args()
    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"

    unfinished = read_json(auto / "tenmon_total_unfinished_completion_report.json")
    priority_q = read_json_list(auto / "unfinished_priority_queue.json")
    vps = read_json(auto / "vps_acceptance_report.json")
    final_master = read_json(auto / "final_master_readiness.json")
    learning_audit = read_json(auto / "learning_acceptance_audit.json")
    sb_int = read_json(auto / "self_build_os_integrated_verdict.json")
    pwa_final = read_json(auto / "pwa_final_completion_readiness.json")
    pwa_lived = read_json(auto / "pwa_lived_completion_readiness.json")

    # lived truth 優先: env_failure 判定も lived + runtime_env を主とする
    env_failure = bool(
        unfinished.get("runtime_env", {}).get("env_failure")
        or pwa_lived.get("env_failure")
    )

    subsystems: dict[str, dict[str, Any]] = {}

    # conversation_backend
    cb = unfinished.get("conversation_backend")
    if isinstance(cb, dict):
        summ = cb.get("summary") or {}
        cp = True
        rp = bool(summ.get("chat_ts_overall_100") or summ.get("runner_pass"))
        ac = bool(summ.get("adoption_sealed") and summ.get("maintained_sealed"))
        b = str(cb.get("band") or band_from_flags(
            code_present=True, runtime_proven=rp, accepted_complete=ac, env_failure=env_failure
        ))
        blk = []
        if not summ.get("runner_pass", True):
            blk.append("conversation_runner_not_pass")
        if not summ.get("chat_ts_overall_100", True):
            blk.append("chat_ts_overall_not_100")
        subsystems["conversation_backend"] = {
            "code_present": True,
            "runtime_proven": bool(summ.get("chat_ts_overall_100") or summ.get("runner_pass")),
            "accepted_complete": ac,
            "band": b,
            "primary_blockers": pick_blockers(blk) or pick_blockers(cb.get("blockers")),
            "source_files": [
                str(auto / "tenmon_total_unfinished_completion_report.json"),
            ],
        }

    # pwa_code_constitution
    pcc = unfinished.get("pwa_code_constitution")
    if isinstance(pcc, dict):
        subsystems["pwa_code_constitution"] = normalize_subsystem(
            "pwa_code_constitution",
            {
                **pcc,
                "code_present": True,
                "runtime_proven": str(pcc.get("band")) == "green",
                "accepted_complete": str(pcc.get("band")) == "green" and pcc.get("score") == pcc.get("max"),
            },
            source_files=[str(auto / "tenmon_total_unfinished_completion_report.json")],
            env_failure=env_failure,
        )

    # pwa_lived_proof
    plp = unfinished.get("pwa_lived_proof")
    if isinstance(plp, dict):
        fr = plp.get("final_readiness") or {}
        plp_blk = pick_blockers(fr.get("postfix_blockers") or plp.get("postfix_blockers"))
        sub = normalize_subsystem(
            "pwa_lived_proof",
            {
                **plp,
                "code_present": True,
                "runtime_proven": bool(fr.get("final_ready")),
                "accepted_complete": bool(fr.get("final_ready")) and not env_failure,
                "blockers": plp_blk,
            },
            source_files=[
                str(auto / "pwa_final_completion_readiness.json"),
                str(auto / "pwa_lived_completion_readiness.json"),
            ],
            env_failure=env_failure,
        )
        sub["primary_blockers"] = plp_blk or sub.get("primary_blockers") or []
        subsystems["pwa_lived_proof"] = sub

    subsystems["self_audit_os"] = build_self_audit_os(unfinished, env_failure)
    subsystems["self_repair_os"] = build_self_repair_os(unfinished, sb_int, final_master, env_failure)

    sbo = unfinished.get("self_build_os")
    if isinstance(sbo, dict):
        subsystems["self_build_os"] = normalize_subsystem(
            "self_build_os",
            {
                **sbo,
                "code_present": bool(sbo.get("code_present", True)),
                "runtime_proven": bool(sbo.get("runtime_proven")),
                "accepted_complete": bool(sbo.get("accepted_complete")),
            },
            source_files=[
                str(auto / "self_build_os_integrated_verdict.json"),
                str(auto / "tenmon_total_unfinished_completion_report.json"),
            ],
            env_failure=env_failure,
        )

    subsystems["remote_admin_cursor_bridge"] = build_remote_admin_cursor_bridge(unfinished, env_failure)

    lsi = unfinished.get("learning_self_improvement")
    if isinstance(lsi, dict):
        rs = lsi.get("runtime_seal")
        rp_learn = False
        if isinstance(rs, dict):
            rp_learn = int(rs.get("exit_code", 1)) == 0
        else:
            rp_learn = bool(rs)
        subsystems["learning_self_improvement"] = normalize_subsystem(
            "learning_self_improvement",
            {
                **lsi,
                "code_present": True,
                "runtime_proven": rp_learn,
                "accepted_complete": bool(lsi.get("accepted_complete")),
            },
            source_files=[
                str(auto / "learning_acceptance_audit.json"),
                str(auto / "tenmon_total_unfinished_completion_report.json"),
            ],
            env_failure=env_failure,
        )

    # Supplement learning from learning_acceptance_audit.json
    if learning_audit and "learning_self_improvement" in subsystems:
        lap = bool(learning_audit.get("overall_pass", learning_audit.get("integrated_acceptance_pass")))
        sub = subsystems["learning_self_improvement"]
        sub["accepted_complete"] = sub.get("accepted_complete") and lap
        sub["source_files"].append(str(auto / "learning_acceptance_audit.json"))

    overall_band = str(unfinished.get("overall_band") or "unknown")

    # lived truth primary: completion gate は lived readiness 単独で評価
    completion_gate = bool(pwa_lived.get("final_ready"))
    os_gate = bool(final_master.get("overall_master_readiness", 0) >= 85) and bool(vps.get("overall_pass"))

    pq = priority_q or unfinished.get("priority_queue") or []
    final_card = ""
    if isinstance(pq, list) and pq:
        first = pq[0]
        if isinstance(first, dict):
            final_card = str(first.get("cursor_card") or "")

    required = (
        "conversation_backend",
        "pwa_code_constitution",
        "pwa_lived_proof",
        "self_audit_os",
        "self_repair_os",
        "self_build_os",
        "remote_admin_cursor_bridge",
        "learning_self_improvement",
    )
    for name in required:
        if name not in subsystems:
            subsystems[name] = {
                "code_present": False,
                "runtime_proven": False,
                "accepted_complete": False,
                "band": "unknown",
                "primary_blockers": ["missing_source_in_tenmon_total_unfinished_completion_report"],
                "source_files": [],
            }

    all_accepted = all(bool(s.get("accepted_complete")) for s in subsystems.values())
    pass_unified = all_accepted and not env_failure and completion_gate

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pass": pass_unified,
        "env_failure_separated": env_failure,
        "overall_band": overall_band,
        "completion_gate": completion_gate,
        "os_gate": os_gate,
        "final_recommended_card": final_card or "TENMON_POST_COMPLETION_OS_6CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1",
        "subsystems": subsystems,
        "sources_mirrored": {
            "tenmon_total_unfinished_completion_report.json": str(auto / "tenmon_total_unfinished_completion_report.json"),
            "unfinished_priority_queue.json": str(auto / "unfinished_priority_queue.json"),
            "vps_acceptance_report.json": str(auto / "vps_acceptance_report.json"),
            "final_master_readiness.json": str(auto / "final_master_readiness.json"),
            "learning_acceptance_audit.json": str(auto / "learning_acceptance_audit.json"),
            "self_build_os_integrated_verdict.json": str(auto / "self_build_os_integrated_verdict.json"),
            "pwa_final_completion_readiness.json": str(auto / "pwa_final_completion_readiness.json"),
            "pwa_lived_completion_readiness.json": str(auto / "pwa_lived_completion_readiness.json"),
        },
        "notes": [
            "過去の個別 report は削除せず、本ファイルを単一真実源として運用する。",
            "env_failure と product failure は subsystems と env_failure_separated で分離して読む。",
        ],
    }

    out_path = auto / "tenmon_system_verdict.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# TENMON system verdict (integrated)",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- **pass**: `{out['pass']}`",
        f"- **overall_band**: `{overall_band}`",
        f"- **env_failure_separated**: `{env_failure}`",
        f"- **completion_gate**: `{completion_gate}`",
        f"- **os_gate**: `{os_gate}`",
        f"- **final_recommended_card**: `{out['final_recommended_card']}`",
        "",
        "## Subsystems",
        "",
        "| subsystem | band | code_present | runtime_proven | accepted_complete |",
        "|-----------|------|--------------|----------------|-------------------|",
    ]
    for name, s in subsystems.items():
        md_lines.append(
            f"| `{name}` | {s.get('band')} | {s.get('code_present')} | {s.get('runtime_proven')} | {s.get('accepted_complete')} |"
        )
    md_lines.extend(["", "## Primary blockers (top-level)", ""])
    for name, s in subsystems.items():
        blk = s.get("primary_blockers") or []
        if blk:
            md_lines.append(f"- **{name}**: " + ", ".join(f"`{b}`" for b in blk[:8]))
    md_lines.append("")
    md_lines.append(f"- single JSON: `{out_path}`")
    md_path = auto / "tenmon_system_verdict.md"
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "pass": pass_unified, "path": str(out_path)}, ensure_ascii=False, indent=2))

    if args.soft_exit_ok:
        return 0
    return 0 if pass_unified else 1


if __name__ == "__main__":
    raise SystemExit(main())
