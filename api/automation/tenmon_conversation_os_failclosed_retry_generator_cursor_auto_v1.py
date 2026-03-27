#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_OS_FAILCLOSED_RETRY_GENERATOR_CURSOR_AUTO_V1

Conversation OS trace レポートを読み、欠落があれば retry card を 1枚だけ生成する。
観測専用: product core 直接変更は行わない。
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_OS_FAILCLOSED_RETRY_GENERATOR_CURSOR_AUTO_V1"
TRACE_REPORT = "tenmon_conversation_os_trace_and_forensic_cursor_auto_v1.json"
OUT_JSON = "tenmon_conversation_os_failclosed_retry_generator_cursor_auto_v1.json"

DEFAULT_LAYER_FILES: dict[str, list[str]] = {
    "canon": ["api/src/core/scriptureCanon.ts", "api/src/core/conceptCanon.ts"],
    "constitution": ["api/src/routes/audit.ts", "api/src/health/readiness.ts"],
    "lawgraph": ["api/src/core/sourceGraph.ts", "api/src/core/tenmonFractalLawKernelV1.ts"],
    "persona_constitution": ["api/src/core/personaConstitution.ts", "api/src/routes/chat_refactor/personaSurfaceV77.ts"],
    "routing": ["api/src/routes/chat_refactor/general_trunk_v1.ts", "api/src/routes/chat_refactor/majorRoutes.ts"],
    "evidence_binder": ["api/src/core/knowledgeBinder.ts", "api/src/planning/responsePlanCore.ts"],
    "surface_projector": ["api/src/routes/chat_refactor/finalize.ts", "api/src/projection/responseProjector.ts"],
    "thread_center": ["api/src/core/threadCore.ts", "api/src/core/threadCoreCarryProjectionV1.ts"],
    "verdict": ["api/src/core/tenmonVerdictEngineV1.ts", "api/src/core/knowledgeBinder.ts"],
    "longform": ["api/src/core/tenmonLongformComposerV1.ts"],
    "lexicon": ["api/src/core/userLexiconMemoryV1.ts"],
    "deepread": ["api/src/deepread/sanskritAlignmentJudgeV1.ts", "api/src/deepread/sanskritGodnameIngestV1.ts"],
    "infra": ["api/src/index.ts", "api/src/routes/audit.ts"],
}


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    _atomic_write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _sanitize_name(s: str) -> str:
    t = re.sub(r"[^a-zA-Z0-9_]+", "_", s.strip().lower())
    t = re.sub(r"_+", "_", t).strip("_")
    return t or "unknown"


def _pick_layer_from_issue(issue: str) -> str:
    x = issue.lower()
    if "evidence_binder" in x or "binder" in x or "sourcepack" in x:
        return "evidence_binder"
    if "surface" in x:
        return "surface_projector"
    if "routing" in x or "routereason" in x:
        return "routing"
    if "persona" in x:
        return "persona_constitution"
    if "lawgraph" in x:
        return "lawgraph"
    if "canon" in x:
        return "canon"
    if "constitution" in x:
        return "constitution"
    if "thread" in x or "centerkey" in x or "centermeaning" in x:
        return "thread_center"
    if "verdict" in x:
        return "verdict"
    if "longform" in x:
        return "longform"
    if "lexicon" in x:
        return "lexicon"
    if "deepread" in x or "alignment" in x:
        return "deepread"
    if "health" in x or "audit" in x or "build" in x:
        return "infra"
    return "evidence_binder"


def _extract_candidate_failures(trace: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    for m in trace.get("missing_layers") or []:
        ms = str(m).strip()
        if ms:
            out.append({"issue": ms, "layer": _pick_layer_from_issue(ms), "missing_fields": [ms]})

    for p in trace.get("probes") or []:
        if not isinstance(p, dict):
            continue
        msg = str(p.get("message") or "")
        k1 = [str(x) for x in (p.get("missing_observation_keys") or []) if str(x).strip()]
        k2 = [str(x) for x in (p.get("deepread_missing") or []) if str(x).strip()]
        for k in k1:
            out.append(
                {
                    "issue": f"probe:{msg}:missing:{k}",
                    "layer": _pick_layer_from_issue(k),
                    "missing_fields": [k],
                }
            )
        for k in k2:
            out.append(
                {
                    "issue": f"probe:{msg}:deepread:{k}",
                    "layer": _pick_layer_from_issue(k),
                    "missing_fields": [k],
                }
            )

    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for row in out:
        key = f"{row.get('layer')}|{','.join(row.get('missing_fields') or [])}|{row.get('issue')}"
        if key in seen:
            continue
        seen.add(key)
        uniq.append(row)
    return uniq


def _render_retry_card(*, target_layer: str, missing_fields: list[str], minimal_files: list[str], reason: str, card_name: str) -> str:
    mf = sorted({x for x in minimal_files if x})
    lines = [
        f"# {card_name}",
        "",
        f"> parent_trace: `TENMON_CONVERSATION_OS_TRACE_AND_FORENSIC_CURSOR_AUTO_V1`",
        f"> target_layer: `{target_layer}`",
        f"> generated_by: `{CARD}`",
        "",
        "## Objective",
        "欠落観測項目を fail-closed で最小差分修復し、Conversation OS trace を再実行して欠落を解消する。",
        "",
        "## Failure Snapshot",
        f"- reason: `{reason}`",
        f"- missing_fields: {json.dumps(missing_fields, ensure_ascii=False)}",
        "",
        "## Minimal Files (strict)",
    ]
    for p in mf[:5]:
        lines.append(f"- `{p}`")
    lines.extend(
        [
            "",
            "## Constraints",
            "- fail-closed",
            "- broad rewrite 禁止",
            "- product core の意味変更禁止",
            "- `api/src/routes/chat.ts` の広域改修禁止",
            "- `web/src/**` は触らない",
            "",
            "## Acceptance",
            f"- target layer `{target_layer}` の欠落項目が trace report で解消される",
            "- 1 failure = 1 retry card を維持（本カードのみ）",
            "- `api/automation/tenmon_conversation_os_trace_and_forensic_cursor_auto_v1.py` 再実行で確認可能",
            "",
            "## Rollback Condition",
            "- build / audit いずれか失敗、または欠落項目が増加した場合は変更を rollback",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    generated_dir = auto / "generated_cursor_apply"
    trace_path = auto / TRACE_REPORT
    out_path = auto / OUT_JSON

    trace = _read_json(trace_path)
    if not trace:
        out = {
            "ok": False,
            "card": CARD,
            "retry_generator_ready": False,
            "single_retry_policy_ready": True,
            "generated_retry_card": None,
            "no_retry_needed": False,
            "rollback_used": False,
            "nextOnPass": None,
            "nextOnFail": None,
            "error": f"trace_report_not_found_or_invalid:{trace_path}",
        }
        _atomic_write_json(out_path, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    candidates = _extract_candidate_failures(trace)
    if not candidates:
        out = {
            "ok": True,
            "card": CARD,
            "retry_generator_ready": True,
            "single_retry_policy_ready": True,
            "generated_retry_card": None,
            "no_retry_needed": True,
            "rollback_used": False,
            "nextOnPass": None,
            "nextOnFail": None,
        }
        _atomic_write_json(out_path, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    picked = candidates[0]
    target_layer = str(picked.get("layer") or "evidence_binder")
    missing_fields = [str(x) for x in (picked.get("missing_fields") or []) if str(x).strip()] or ["unknown_missing"]
    reason = str(picked.get("issue") or "unknown_issue")
    minimal_files = DEFAULT_LAYER_FILES.get(target_layer) or ["api/src/core/knowledgeBinder.ts"]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    retry_card_name = f"TENMON_CONVERSATION_OS_RETRY_{target_layer.upper()}_CURSOR_AUTO_V1"
    file_name = f"{stamp}_{_sanitize_name(retry_card_name)}.md"
    retry_path = generated_dir / file_name

    body = _render_retry_card(
        target_layer=target_layer,
        missing_fields=missing_fields,
        minimal_files=minimal_files,
        reason=reason,
        card_name=retry_card_name,
    )
    _atomic_write(retry_path, body)

    out = {
        "ok": True,
        "card": CARD,
        "retry_generator_ready": True,
        "single_retry_policy_ready": True,
        "generated_retry_card": str(retry_path.relative_to(repo)),
        "no_retry_needed": False,
        "rollback_used": False,
        "nextOnPass": None,
        "nextOnFail": None,
        "picked_failure": {
            "target_layer": target_layer,
            "missing_fields": missing_fields,
            "reason": reason,
        },
        "trace_report": str(trace_path.relative_to(repo)),
    }
    _atomic_write_json(out_path, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
