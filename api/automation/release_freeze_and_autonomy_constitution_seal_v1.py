#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_RELEASE_FREEZE_AND_AUTONOMY_CONSTITUTION_SEAL_CURSOR_AUTO_V1

overnight / scorecard / PWA lived seal / self-commit / morning list を集約し、
release freeze と autonomy constitution の単一真実源を残す。成功の捏造はしない。
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePath
from typing import Any

CARD = "TENMON_RELEASE_FREEZE_AND_AUTONOMY_CONSTITUTION_SEAL_CURSOR_AUTO_V1"
CONSTITUTION_CARD = "TENMON_AUTONOMY_CONSTITUTION_SEAL_V1"
OUT_JSON = "release_freeze_autonomy_seal_summary.json"
OUT_MD = "autonomy_constitution_seal_report.md"
NEXT_ON_PASS = "後段5枚完了"
NEXT_ON_FAIL_NOTE = "停止。release freeze retry 1枚のみ生成。"
RETRY_CARD = CARD

# 運用上の mainline / 保護参照（コード変更はしない。freeze 記録のみ）
DEFAULT_PROTECTED_RELPATHS = [
    "api/src/routes/chat.ts",
    "web/src/api/chat.ts",
    "web/src/types/chat.ts",
    "api/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py",
    "api/scripts/tenmon_continuous_self_improvement_os_master_bundle_v1.sh",
    "api/automation/release_freeze_and_autonomy_constitution_seal_v1.py",
]


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def _truthy_env(name: str) -> bool:
    v = (os.environ.get(name) or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _pick_overnight_path(repo: Path, auto: Path) -> tuple[Path, str]:
    env_p = os.environ.get("TENMON_OVERNIGHT_AUTONOMY_SUMMARY", "").strip()
    if env_p:
        p = Path(env_p).expanduser()
        if not p.is_absolute():
            if len(PurePath(p).parts) == 1:
                p = (auto / p).resolve()
            else:
                p = (repo / p).resolve()
        return p, "env"
    p1 = auto / "tenmon_continuous_self_improvement_overnight_daemon_summary.json"
    if p1.is_file():
        return p1, "daemon_default"
    p2 = auto / "tenmon_overnight_full_autonomy_summary.json"
    return p2, "full_autonomy_fallback"


def _newest_build_probe_result(auto: Path) -> tuple[Path | None, dict[str, Any]]:
    best: tuple[float, Path, dict[str, Any]] | None = None
    for p in auto.glob("out/**/build_probe_rollback_result.json"):
        if not p.is_file():
            continue
        try:
            st = p.stat().st_mtime
            d = _read_json(p)
            if not d:
                continue
            if best is None or st > best[0]:
                best = (st, p, d)
        except OSError:
            continue
    if best is None:
        return None, {}
    return best[1], best[2]


def _self_commit_evidence(auto: Path) -> tuple[dict[str, Any], dict[str, Any], Path | None, Path | None]:
    p_ac = auto / "out" / "acceptance_commit_requeue" / "acceptance_commit_requeue_summary.json"
    env_ac = os.environ.get("TENMON_ACCEPTANCE_COMMIT_SUMMARY_PATH", "").strip()
    if env_ac:
        p_ac = Path(env_ac).expanduser().resolve()
    ac = _read_json(p_ac)

    p_ts = auto / "out" / "true_self_commit" / "true_self_commit_summary.json"
    env_ts = os.environ.get("TENMON_TRUE_SELF_COMMIT_SUMMARY_PATH", "").strip()
    if env_ts:
        p_ts = Path(env_ts).expanduser().resolve()
    ts = _read_json(p_ts)

    upstream = ts.get("upstream_acceptance_gated") if isinstance(ts.get("upstream_acceptance_gated"), dict) else {}
    return ac, ts, p_ac if p_ac.is_file() or env_ac else None, p_ts if p_ts.is_file() or env_ts else None


def _acceptance_gated_commit_ready(ac: dict[str, Any], ts: dict[str, Any]) -> tuple[bool, str]:
    if ac.get("commit_ready") is True:
        return True, "acceptance_commit_requeue_summary"
    up = ts.get("upstream_acceptance_gated") if isinstance(ts.get("upstream_acceptance_gated"), dict) else {}
    if up.get("commit_ready") is True:
        return True, "true_self_commit_upstream"
    if not ac and not ts:
        return False, "missing_self_commit_summaries"
    if ac.get("commit_ready") is False and ac.get("gate_reason"):
        return False, f"gated:{ac.get('gate_reason')}"
    if ts and ts.get("commit_allowed") is not True and not up.get("commit_ready"):
        return False, "commit_not_allowed_or_upstream_false"
    return False, "commit_ready_false"


def _list_constitutions(repo: Path, docs: Path) -> list[str]:
    if not docs.is_dir():
        return []
    out = sorted(str(p.relative_to(repo)) for p in docs.glob("TENMON_*.md"))
    return out[:240]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    docs_const = api / "docs" / "constitution"
    auto.mkdir(parents=True, exist_ok=True)

    overnight_path, overnight_src = _pick_overnight_path(repo, auto)
    overnight = _read_json(overnight_path)

    sc_path = auto / "tenmon_worldclass_acceptance_scorecard.json"
    sc = _read_json(sc_path)

    pwa_path = auto / "pwa_worldclass_seal_summary.json"
    pwa = _read_json(pwa_path)

    morning_path = auto / "tenmon_high_risk_morning_approval_list.json"
    env_m = os.environ.get("TENMON_MORNING_APPROVAL_LIST_PATH", "").strip()
    if env_m:
        morning_path = Path(env_m).expanduser().resolve()
    morning = _read_json(morning_path)

    os_sum_path = auto / "tenmon_continuous_self_improvement_os_summary.json"
    os_sum = _read_json(os_sum_path)

    browser_path = auto / "tenmon_browser_ai_operator_runtime_summary.json"
    browser = _read_json(browser_path)

    bp_path, bp = _newest_build_probe_result(auto)

    ac, ts, ac_p_resolved, ts_p_resolved = _self_commit_evidence(auto)

    dialogue_path = auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"
    dialogue = _read_json(dialogue_path)
    d_out = dialogue.get("outputs") if isinstance(dialogue.get("outputs"), dict) else {}

    mainline_path = auto / "tenmon_conversation_worldclass_mainline_selector.json"
    mainline = _read_json(mainline_path)

    missing_inputs: list[str] = []
    for p, label in (
        (overnight_path, "overnight_autonomy_summary"),
        (sc_path, "scorecard"),
        (pwa_path, "pwa_worldclass_seal_summary"),
        (morning_path, "morning_approval_list"),
        (os_sum_path, "continuous_os_summary"),
        (browser_path, "browser_ai_runtime_summary"),
        (dialogue_path, "dialogue_acceptance_priority_loop"),
        (mainline_path, "mainline_selector"),
    ):
        if not p.is_file():
            missing_inputs.append(label)

    # --- 6 gates (evidence only) ---
    si_ok = bool(os_sum.get("continuous_pass") is True) and overnight_path.is_file()
    if overnight_path.is_file() and "last_master_pass" in overnight:
        si_ok = si_ok and bool(overnight.get("last_master_pass") is True)

    browser_ok = bool(browser.get("browser_ai_operator_runtime_pass") is True)

    bp_ok = bool(bp.get("overall_pass") is True) if bp else False

    gated_ok, gated_src = _acceptance_gated_commit_ready(ac, ts)

    pwa_ok = bool(pwa.get("seal_ready") is True)

    dialogue_ok = bool(d_out.get("worldclass_ready") is True and d_out.get("sealed_operable_ready") is True)

    gates: dict[str, Any] = {
        "self_improvement_loop_ready": si_ok,
        "browser_ai_consult_ready": browser_ok,
        "build_probe_rollback_ready": bp_ok,
        "acceptance_gated_commit_ready": gated_ok,
        "pwa_lived_proof_band_ok": pwa_ok,
        "worldclass_dialogue_band_ok": dialogue_ok,
    }

    blocked_reasons: list[str] = []
    if not si_ok:
        blocked_reasons.append("gate:self_improvement_loop_not_ready")
    if not browser_ok:
        fr = browser.get("fail_reason") or "browser_ai_operator_runtime_pass_false"
        blocked_reasons.append(f"gate:browser_ai_consult_not_ready:{fr}")
    if not bp_ok:
        if bp_path is None:
            blocked_reasons.append("gate:build_probe_rollback_no_artifact")
        else:
            blocked_reasons.append("gate:build_probe_rollback_not_pass")
    if not gated_ok:
        blocked_reasons.append(f"gate:acceptance_gated_commit_not_ready:{gated_src}")
    if not pwa_ok:
        blocked_reasons.append("gate:pwa_worldclass_seal_not_ready")
    if not dialogue_ok:
        blocked_reasons.append("gate:worldclass_dialogue_loop_not_ready")

    if not overnight_path.is_file():
        blocked_reasons.append("input:overnight_autonomy_summary_missing")
    if missing_inputs:
        blocked_reasons.append("input:missing_required_files:" + ",".join(sorted(missing_inputs)))

    autonomy_seal_ready = (
        all(bool(v) for v in gates.values())
        and overnight_path.is_file()
        and not missing_inputs
    )

    human_override = _truthy_env("TENMON_AUTONOMY_CONSTITUTION_SEAL_HUMAN_OVERRIDE")

    freeze_manifest: dict[str, Any] = {
        "mainline_selector_path": str(mainline_path),
        "mainline_next_best_card": mainline.get("next_best_card"),
        "protected_relpaths": DEFAULT_PROTECTED_RELPATHS,
        "operational_constitution_dir": str(docs_const),
        "operational_constitution_tenmon_md": _list_constitutions(repo, docs_const),
    }

    evidence: dict[str, Any] = {
        "overnight_summary_path": str(overnight_path),
        "overnight_summary_source": overnight_src,
        "scorecard_path": str(sc_path),
        "pwa_worldclass_seal_path": str(pwa_path),
        "morning_approval_list_path": str(morning_path),
        "continuous_os_summary_path": str(os_sum_path),
        "browser_ai_runtime_summary_path": str(browser_path),
        "build_probe_rollback_result_path": str(bp_path) if bp_path else None,
        "dialogue_loop_path": str(dialogue_path),
        "acceptance_commit_summary_path": str(ac_p_resolved) if ac_p_resolved else str(auto / "out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json"),
        "true_self_commit_summary_path": str(ts_p_resolved) if ts_p_resolved else str(auto / "out/true_self_commit/true_self_commit_summary.json"),
        "gates_evidence_digest": {
            "continuous_pass": os_sum.get("continuous_pass"),
            "overnight_last_master_pass": overnight.get("last_master_pass"),
            "browser_ai_operator_runtime_pass": browser.get("browser_ai_operator_runtime_pass"),
            "build_probe_overall_pass": bp.get("overall_pass"),
            "acceptance_gated_source": gated_src,
            "pwa_seal_ready": pwa.get("seal_ready"),
            "dialogue_outputs_worldclass_ready": d_out.get("worldclass_ready"),
            "dialogue_outputs_sealed_operable_ready": d_out.get("sealed_operable_ready"),
            "scorecard_worldclass_ready": sc.get("worldclass_ready"),
            "scorecard_overall_band": (sc.get("signals") or {}).get("overall_band") if isinstance(sc.get("signals"), dict) else None,
            "pwa_dialogue_worldclass_band": pwa.get("dialogue_worldclass_band"),
            "dialogue_overall_completion_band": d_out.get("overall_completion_band"),
        },
    }

    morning_items = morning.get("items") if isinstance(morning.get("items"), list) else []
    evidence["morning_approval_item_count"] = len(morning_items)

    summary: dict[str, Any] = {
        "card": CARD,
        "autonomy_constitution_card": CONSTITUTION_CARD,
        "generated_at": _utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "autonomy_seal_ready": autonomy_seal_ready,
        "input_fail_closed": bool(missing_inputs),
        "missing_required_inputs": sorted(missing_inputs),
        "human_override_applied": human_override,
        "blocked_reasons": sorted(set(blocked_reasons)),
        "gates": gates,
        "freeze_manifest": freeze_manifest,
        "inputs": {
            "overnight_autonomy_summary": str(overnight_path),
            "scorecard": str(sc_path),
            "pwa_lived_proof_seal_summary": str(pwa_path),
            "self_commit_summaries": {
                "acceptance_gated": str(ac_p_resolved) if ac_p_resolved else str(auto / "out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json"),
                "true_self_commit": str(ts_p_resolved) if ts_p_resolved else str(auto / "out/true_self_commit/true_self_commit_summary.json"),
            },
            "morning_approval_list": str(morning_path),
        },
        "evidence": evidence,
        "notes": [
            "autonomy_seal_ready は6ゲートすべてが evidence で true のときのみ true（捏造なし）。",
            "TENMON_AUTONOMY_CONSTITUTION_SEAL_HUMAN_OVERRIDE=1 で運用上 exit 0 にできるが gates / autonomy_seal_ready は変えない。",
            "freeze 後は mainline・protected paths・constitution 一覧を不用意に崩さないこと。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# Autonomy constitution seal — {CONSTITUTION_CARD} / {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- **autonomy_seal_ready**: `{autonomy_seal_ready}`",
        f"- input_fail_closed: `{bool(missing_inputs)}` missing: `{missing_inputs}`",
        f"- human_override_applied: `{human_override}`",
        "",
        "## Gates (evidence)",
        "",
        "| gate | ok |",
        "|------|----|",
    ]
    for k, v in gates.items():
        md_lines.append(f"| `{k}` | `{v}` |")
    md_lines.extend(
        [
            "",
            "## blocked_reasons",
            "",
        ]
    )
    if summary["blocked_reasons"]:
        for b in summary["blocked_reasons"]:
            md_lines.append(f"- `{b}`")
    else:
        md_lines.append("- (none)")
    md_lines.extend(
        [
            "",
            "## Inputs",
            "",
        ]
    )
    for ik, iv in summary["inputs"].items():
        if isinstance(iv, dict):
            md_lines.append(f"- **{ik}**:")
            for jk, jv in iv.items():
                md_lines.append(f"  - `{jk}`: `{jv}`")
        else:
            md_lines.append(f"- **{ik}**: `{iv}`")
    md_lines.extend(
        [
            "",
            "## Freeze manifest",
            "",
            "```json",
            json.dumps(freeze_manifest, ensure_ascii=False, indent=2),
            "```",
            "",
            "## next",
            "",
            f"- **next_on_pass**: {NEXT_ON_PASS}",
            f"- **next_on_fail**: {NEXT_ON_FAIL_NOTE}",
            f"- **retry_card**: `{RETRY_CARD}`",
            "",
        ]
    )
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(auto / OUT_JSON),
                "report": str(auto / OUT_MD),
                "autonomy_seal_ready": autonomy_seal_ready,
                "human_override_applied": human_override,
            },
            ensure_ascii=False,
        ),
        file=sys.stdout,
    )

    if autonomy_seal_ready:
        return 0
    if human_override:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
