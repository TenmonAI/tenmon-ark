#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1
観測専用: 基底 reuse bench + 会話アップリフト補助プローブ + final_checks。
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

CARD = "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_reuse_bench_and_conversation_uplift_acceptance_result_v1.json"
OUT_MD = "tenmon_reuse_bench_and_conversation_uplift_acceptance_report_v1.md"
BEGIN = "<!-- REUSE_BENCH_UPLIFT_AUTO_BEGIN -->"
END = "<!-- REUSE_BENCH_UPLIFT_AUTO_END -->"


def _extract_json_object(text: str) -> dict | None:
    m = re.search(r"\n\{", text)
    start = m.start() + 1 if m else text.find("{")
    if start < 0:
        return None
    blob = text[start:].strip()
    try:
        dec = json.JSONDecoder()
        obj, _ = dec.raw_decode(blob)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        return None


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
    script = api_dir / "scripts" / "tenmon_reuse_bench_conversation_uplift_emit_v1.ts"
    if not script.is_file():
        return None, f"missing:{script}"
    try:
        r = subprocess.run(
            ["npx", "tsx", str(script.relative_to(api_dir))],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=180,
        )
        raw = (r.stdout or "") + (r.stderr or "")
        probe = _extract_json_object(raw)
        if probe is None:
            return None, (raw[:1500] if raw else "empty_output")
        return probe, None
    except Exception as e:
        return None, str(e)


def _patch_md(path: Path, data: dict) -> None:
    if not path.is_file():
        return
    raw = path.read_text(encoding="utf-8")
    if BEGIN not in raw or END not in raw:
        return
    probe = data.get("probe_payload") or {}
    results = probe.get("results") or []
    fc = probe.get("final_checks") or {}
    lines = [
        BEGIN,
        "",
        f"- **acceptance_pass**: `{data.get('acceptance_pass')}`",
        f"- **npm_run_check_ok**: `{data.get('npm_run_check_ok')}`",
        f"- **probe_acceptance_pass**: `{probe.get('acceptance_pass')}`",
        f"- **base_bench_acceptance_pass**: `{probe.get('base_bench_acceptance_pass')}`",
        "",
        "### final_checks",
        "",
    ]
    for k, v in sorted(fc.items()):
        lines.append(f"- `{k}`: `{v}`")
    lines.extend(["", "### プローブ要約", ""])
    for r in results:
        lines.append(
            f"- `{r.get('probe_id')}` ark=`{r.get('has_ark_reuse')}` book=`{r.get('primary_book_material_id')}` "
            f"reentry=`{r.get('ark_thread_reentry_book_id')}` unc_axes=`{r.get('thread_meaning_unresolved_axes')}`",
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
        "schema": "TENMON_REUSE_BENCH_CONVERSATION_UPLIFT_ACCEPTANCE_RESULT_V1",
        "card": CARD,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail,
        "probe_emit_error": err,
        "probe_payload": probe,
        "acceptance_pass": ok,
        "failure_reasons": [] if ok else fr,
        "nextOnPass": (probe or {}).get("nextOnPass")
        or "TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1",
        "nextOnFail": (probe or {}).get("nextOnFail")
        or "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_RETRY_CURSOR_AUTO_V1",
        "observation_only": True,
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _patch_md(auto / OUT_MD, result)

    print(json.dumps({"acceptance_pass": ok, "npm_run_check_ok": build_ok}, ensure_ascii=False, indent=2))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
