#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1

multi_model_consensus の出力を、Cursor 向けの構造化 patch plan（JSON/MD）に変換する。
自由文の全文は載せず digest / ファイルリスト / 段階ステップのみとする。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1"

HIGH_RISK = frozenset({"high", "critical", "escrow", "high_risk", "severe", "blocker", "p0"})

DEFAULT_TESTS: list[dict[str, Any]] = [
    {
        "id": "build",
        "category": "build",
        "description": "リポジトリのビルド（例: api で npx tsc --noEmit、web で npm run build）",
    },
    {
        "id": "health",
        "category": "health",
        "description": "稼働確認: GET /api/health（または環境に合わせた health URL）",
    },
    {
        "id": "audit.build",
        "category": "audit.build",
        "description": "静的検証: python3 -m py_compile、lint、型チェックの該当スイート",
    },
    {
        "id": "probes",
        "category": "probes",
        "description": "スモーク / ルートプローブ（変更に関連する API・画面の最小確認）",
    },
]


def _norm_risk(s: str) -> str:
    t = " ".join(str(s or "").lower().split())
    if not t:
        return "unknown"
    if any(x in t for x in HIGH_RISK):
        return "high"
    if "medium" in t or "med" in t or "moderate" in t:
        return "medium"
    if "low" in t:
        return "low"
    return "unknown"


def _split_digest_items(s: str) -> list[str]:
    parts = re.split(r"[,;•]\s*|\n+", str(s or ""))
    return [p.strip() for p in parts if p.strip()]


def _change_scope_from_consensus(c: dict[str, Any]) -> str:
    level = str(c.get("consensus_level") or "unknown")
    cfs = c.get("conflicting_changes") or []
    fields = sorted({str(x.get("field")) for x in cfs if isinstance(x, dict) and x.get("field")})
    tail = f" conflicting_fields={fields}" if fields else ""
    return (f"consensus_level={level}{tail}")[:800]


def _reject_conditions_list(digest: str) -> list[str]:
    items = _split_digest_items(digest)
    if not items and digest.strip():
        return [digest.strip()[:400]]
    return [x[:400] for x in items[:24]]


def _rollback_hint(files: list[str]) -> str:
    if not files:
        return "rollback: no target files; revert last commit or restore from VCS manually"
    quoted = " ".join(json.dumps(f) for f in files[:40])
    return (
        f"rollback: git checkout -- {quoted} "
        f"または該当パスを最後に触ったコミットを revert。作業ツリーに未コミット変更のみの場合は個別に discard。"
    )[:1200]


def bridge_multi_model_consensus_to_patch_plan_v1(consensus: dict[str, Any]) -> dict[str, Any]:
    plan = consensus.get("recommended_primary_plan")
    if not isinstance(plan, dict):
        return {
            "ok": False,
            "card": CARD,
            "fail_reason": "missing_recommended_primary_plan",
            "approval_required": True,
            "problem": "",
            "target_files": [],
            "change_scope": "",
            "proposed_patch_steps": [],
            "risk_class": "unknown",
            "tests": list(DEFAULT_TESTS),
            "rollback_hint": _rollback_hint([]),
            "reject_conditions": [],
            "source_consensus_level": str(consensus.get("consensus_level") or ""),
            "manual_review_required_input": bool(consensus.get("manual_review_required")),
        }

    target_files = [str(x).strip() for x in (plan.get("target_files") or []) if str(x).strip()]
    if not target_files:
        return {
            "ok": False,
            "card": CARD,
            "fail_reason": "empty_target_files",
            "approval_required": True,
            "problem": str(plan.get("problem_digest") or "")[:400],
            "target_files": [],
            "change_scope": _change_scope_from_consensus(consensus),
            "proposed_patch_steps": [],
            "risk_class": _norm_risk(str(plan.get("risk") or "")),
            "tests": list(DEFAULT_TESTS),
            "rollback_hint": _rollback_hint([]),
            "reject_conditions": _reject_conditions_list(str(plan.get("reject_conditions_digest") or "")),
            "source_consensus_level": str(consensus.get("consensus_level") or ""),
            "manual_review_required_input": bool(consensus.get("manual_review_required")),
        }

    risk_class = _norm_risk(str(plan.get("risk") or ""))
    approval_required = risk_class == "high" or bool(consensus.get("manual_review_required"))
    scope = _change_scope_from_consensus(consensus)
    change_digest = str(plan.get("change_digest") or "")[:600]
    problem = str(plan.get("problem_digest") or "")[:600]

    steps: list[dict[str, Any]] = [
        {
            "id": 1,
            "kind": "verify_scope",
            "description": "合意された change_scope を確認（未解決の conflicting_changes があれば停止）",
            "refs": {"change_scope": scope},
        },
        {
            "id": 2,
            "kind": "apply_structured_edits",
            "description": "target_files のみを対象に、intent_digest に沿った最小 diff（自由文の一括貼り付け実装は禁止）",
            "targets": target_files,
            "intent_digest": change_digest,
        },
        {
            "id": 3,
            "kind": "run_tests_matrix",
            "description": "tests 配列の build / health / audit.build / probes を順に実行",
        },
    ]

    tests_out: list[dict[str, Any]] = [dict(x) for x in DEFAULT_TESTS]
    extra = _split_digest_items(str(plan.get("tests_digest") or ""))
    for i, label in enumerate(extra[:12]):
        tests_out.append(
            {
                "id": f"consensus_{i}",
                "category": "consensus.advice",
                "description": label[:300],
            }
        )

    out: dict[str, Any] = {
        "ok": True,
        "card": CARD,
        "fail_reason": None,
        "approval_required": bool(approval_required),
        "problem": problem,
        "target_files": target_files,
        "change_scope": scope,
        "proposed_patch_steps": steps,
        "risk_class": risk_class,
        "tests": tests_out,
        "rollback_hint": _rollback_hint(target_files),
        "reject_conditions": _reject_conditions_list(str(plan.get("reject_conditions_digest") or "")),
        "source": {
            "consensus_level": consensus.get("consensus_level"),
            "primary_provider": plan.get("source_provider"),
            "basis": plan.get("basis"),
            "manual_review_required_input": bool(consensus.get("manual_review_required")),
        },
    }
    return out


def _render_md(p: dict[str, Any]) -> str:
    lines = [
        f"# Cursor patch plan ({CARD})",
        "",
        f"- **ok**: {p.get('ok')}",
        f"- **approval_required**: {p.get('approval_required')}",
        f"- **risk_class**: {p.get('risk_class')}",
        "",
        "## problem (digest)",
        str(p.get("problem") or "(none)"),
        "",
        "## target_files",
    ]
    for f in p.get("target_files") or []:
        lines.append(f"- `{f}`")
    if not p.get("target_files"):
        lines.append("- _(none)_")
    lines.extend(
        [
            "",
            "## change_scope",
            "```",
            str(p.get("change_scope") or ""),
            "```",
            "",
            "## proposed_patch_steps",
        ]
    )
    for s in p.get("proposed_patch_steps") or []:
        lines.append(f"### step {s.get('id')}: {s.get('kind')}")
        lines.append(str(s.get("description") or ""))
        if s.get("targets"):
            lines.append("- targets: " + ", ".join(f"`{x}`" for x in s["targets"]))
        if s.get("intent_digest"):
            lines.append("- intent_digest: " + str(s["intent_digest"])[:400])
        lines.append("")
    lines.extend(["## tests", ""])
    for t in p.get("tests") or []:
        lines.append(f"- **{t.get('id')}** [{t.get('category')}]: {t.get('description')}")
    lines.extend(
        [
            "",
            "## rollback_hint",
            str(p.get("rollback_hint") or ""),
            "",
            "## reject_conditions",
        ]
    )
    for r in p.get("reject_conditions") or []:
        lines.append(f"- {r}")
    if p.get("fail_reason"):
        lines.extend(["", "## fail_reason", str(p.get("fail_reason"))])
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--multi-model-consensus", type=Path, required=True, help="multi_model_consensus.json")
    ap.add_argument("--output-json", type=Path, required=True)
    ap.add_argument("--output-md", type=Path, required=True)
    args = ap.parse_args()

    cp = args.multi_model_consensus.expanduser().resolve()
    if not cp.is_file():
        payload: dict[str, Any] = {
            "ok": False,
            "card": CARD,
            "fail_reason": "consensus_file_not_found",
            "approval_required": True,
            "problem": "",
            "target_files": [],
            "change_scope": "",
            "proposed_patch_steps": [],
            "risk_class": "unknown",
            "tests": list(DEFAULT_TESTS),
            "rollback_hint": _rollback_hint([]),
            "reject_conditions": [],
        }
    else:
        try:
            raw = json.loads(cp.read_text(encoding="utf-8"))
            consensus = raw if isinstance(raw, dict) else {}
            payload = bridge_multi_model_consensus_to_patch_plan_v1(consensus)
        except Exception as e:
            payload = {
                "ok": False,
                "card": CARD,
                "fail_reason": f"consensus_json_invalid:{e}",
                "approval_required": True,
                "problem": "",
                "target_files": [],
                "change_scope": "",
                "proposed_patch_steps": [],
                "risk_class": "unknown",
                "tests": list(DEFAULT_TESTS),
                "rollback_hint": _rollback_hint([]),
                "reject_conditions": [],
            }
    jpath = args.output_json.expanduser().resolve()
    mpath = args.output_md.expanduser().resolve()
    jpath.parent.mkdir(parents=True, exist_ok=True)
    mpath.parent.mkdir(parents=True, exist_ok=True)
    jpath.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    mpath.write_text(_render_md(payload), encoding="utf-8")
    print(json.dumps({"ok": payload.get("ok"), "fail_reason": payload.get("fail_reason")}, ensure_ascii=False), file=sys.stdout)

    return 1 if not payload.get("ok") else 0


if __name__ == "__main__":
    raise SystemExit(main())
