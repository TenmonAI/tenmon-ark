#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1

katakamunaSourceAuditClassificationV1 の束を取得し、npm run check と併せて記録する。
封印は書かない（PASS 以外封印禁止）。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

CARD = "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_katakamuna_source_audit_and_classification_result_v1.json"
OUT_MD = "tenmon_katakamuna_source_audit_and_classification_report_v1.md"


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


def _emit(api_dir: Path) -> tuple[dict | None, str | None]:
    script = api_dir / "scripts" / "tenmon_katakamuna_source_audit_emit_v1.ts"
    if not script.is_file():
        return None, f"missing:{script}"
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
        return None, f"json:{e}"
    except Exception as e:
        return None, str(e)


BEGIN = "<!-- KATAKAMUNA_AUDIT_AUTO_BEGIN -->"
END = "<!-- KATAKAMUNA_AUDIT_AUTO_END -->"


def _patch_md(path: Path, data: dict) -> None:
    if not path.is_file():
        return
    raw = path.read_text(encoding="utf-8")
    if BEGIN not in raw or END not in raw:
        return
    probe = data.get("probe_payload") or {}
    b = probe.get("bundle") or {}
    entries = b.get("entries") or []
    lines = [
        BEGIN,
        "",
        f"- **acceptance_pass**（自動化合成）: `{data.get('acceptance_pass')}`",
        f"- **npm_run_check_ok**: `{data.get('npm_run_check_ok')}`",
        f"- **probe_acceptance_pass**: `{probe.get('acceptance_pass')}`",
        f"- **entries_count**: `{len(entries)}`",
        f"- **nextOnPass**: `{b.get('nextOnPass')}`",
        f"- **nextOnFail**: `{b.get('nextOnFail')}`",
        "",
        "### エントリ（機械同期）",
        "",
    ]
    for e in entries:
        lines.append(
            f"- `{e.get('id')}` | `{e.get('source_class')}` | ref=`{e.get('extracted_ref')}`",
        )
    if not data.get("acceptance_pass"):
        lines.extend(["", "### failure_reasons", ""])
        for x in data.get("failure_reasons") or []:
            lines.append(f"- `{x}`")
    lines.extend(["", END])
    block = "\n".join(lines)
    pre, rest = raw.split(BEGIN, 1)
    _, post = rest.split(END, 1)
    path.write_text(pre + block + post, encoding="utf-8")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    build_ok, build_tail = _npm_check(api)
    probe, err = _emit(api)

    fr: list[str] = []
    if not build_ok:
        fr.append("npm_run_check_failed")
    if probe is None:
        fr.append(f"probe_emit_failed:{err}")
    probe_ok = bool(probe and probe.get("acceptance_pass"))
    if probe is not None and not probe_ok:
        fr.extend(probe.get("failure_reasons") or ["probe_acceptance_false"])

    ok = build_ok and probe is not None and probe_ok

    result = {
        "schema": "TENMON_KATAKAMUNA_SOURCE_AUDIT_CLASSIFICATION_RESULT_V1",
        "card": CARD,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail,
        "probe_emit_error": err,
        "probe_payload": probe,
        "acceptance_pass": ok,
        "failure_reasons": [] if ok else fr,
        "observation_only": True,
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _patch_md(auto / OUT_MD, result)

    print(json.dumps({"acceptance_pass": ok, "npm_run_check_ok": build_ok}, ensure_ascii=False, indent=2))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
