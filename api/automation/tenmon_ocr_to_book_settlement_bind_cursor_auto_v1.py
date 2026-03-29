#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1

TypeScript プローブ（settlement unit + judge 分離）を取得し、npm run check と併せて記録する。
封印は書かない（PASS 以外封印禁止）。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

CARD = "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_ocr_to_book_settlement_bind_result_v1.json"
OUT_MD = "tenmon_ocr_to_book_settlement_bind_report_v1.md"


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = (r.stdout or "") + (r.stderr or "")
        return r.returncode == 0, tail[-2000:]
    except Exception as e:
        return False, str(e)


def _emit_probe(api_dir: Path) -> tuple[dict | None, str | None]:
    script = api_dir / "scripts" / "tenmon_ocr_to_book_settlement_bind_emit_v1.ts"
    if not script.is_file():
        return None, f"missing_emit_script:{script}"
    try:
        r = subprocess.run(
            ["npx", "tsx", str(script.relative_to(api_dir))],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=120,
        )
        raw = (r.stdout or "").strip()
        if r.returncode != 0:
            return None, (r.stderr or r.stdout or "tsx_failed")[:2000]
        return json.loads(raw), None
    except json.JSONDecodeError as e:
        return None, f"json_decode:{e}"
    except Exception as e:
        return None, str(e)


def _write_md(path: Path, data: dict) -> None:
    eu = data.get("probe_payload") or {}
    unit = eu.get("example_unit") or {}
    meta = unit.get("extract_metadata") or {}
    js = unit.get("judge_split") or {}
    lines = [
        "# TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_REPORT_V1",
        "",
        f"- **acceptance_pass**: `{data.get('acceptance_pass')}`",
        f"- **npm_run_check_ok**: `{data.get('npm_run_check_ok')}`",
        f"- **probe_acceptance_pass**: `{eu.get('acceptance_pass')}`",
        "",
        "## settlement unit（例）",
        "",
        f"- **book_id**: `{meta.get('book_id')}`",
        f"- **source_hash**: `{meta.get('source_hash')}`",
        f"- **page_range**: `{meta.get('page_range')}`",
        f"- **engine**: `{meta.get('engine')}`",
        f"- **source_class**: `{meta.get('source_class')}`",
        f"- **extracted_ref**: `{meta.get('extracted_ref')}`",
        f"- **nas_locator**: `{json.dumps(meta.get('nas_locator'), ensure_ascii=False)}`",
        "",
        "### judge 6 束（キーのみ）",
        "",
        f"- source_facts: {len(js.get('source_facts') or [])} 行",
        f"- text_summary: len={len(js.get('text_summary') or '')}",
        f"- tradition_evidence: {len(js.get('tradition_evidence') or [])} 行",
        f"- tenmon_mapping: {len(js.get('tenmon_mapping') or [])} 行",
        f"- uncertainty_flags: {js.get('uncertainty_flags')}",
        f"- provisional_verdict: `{js.get('provisional_verdict')}`",
        "",
        "## reuse_safety",
        "",
        f"- `{unit.get('reuse_safety')}`",
        "",
        "## next",
        "",
        f"- **nextOnPass**: `{eu.get('nextOnPass')}`",
        f"- **nextOnFail**: `{eu.get('nextOnFail')}`",
        "",
    ]
    if not data.get("acceptance_pass"):
        lines.extend(["## failure_reasons", ""])
        for x in data.get("failure_reasons") or []:
            lines.append(f"- `{x}`")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    build_ok, build_tail = _npm_check(api)
    probe, err = _emit_probe(api)

    failure_reasons: list[str] = []
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")
    if probe is None:
        failure_reasons.append(f"probe_emit_failed:{err}")
    probe_pass = bool(probe and probe.get("acceptance_pass"))
    if probe is not None and not probe_pass:
        failure_reasons.extend(probe.get("failure_reasons") or ["probe_acceptance_false"])

    acceptance_pass = build_ok and probe is not None and probe_pass

    result = {
        "schema": "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_RESULT_V1",
        "card": CARD,
        "generated_at": probe.get("generated_at") if probe else None,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail,
        "probe_emit_error": err,
        "probe_payload": probe,
        "acceptance_pass": acceptance_pass,
        "failure_reasons": [] if acceptance_pass else failure_reasons,
        "nextOnPass": (probe or {}).get("nextOnPass") or "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1",
        "nextOnFail": (probe or {}).get("nextOnFail") or "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_RETRY_CURSOR_AUTO_V1",
        "observation_only": True,
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _write_md(auto / OUT_MD, result)

    print(json.dumps({"acceptance_pass": acceptance_pass, "npm_run_check_ok": build_ok}, ensure_ascii=False, indent=2))
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
