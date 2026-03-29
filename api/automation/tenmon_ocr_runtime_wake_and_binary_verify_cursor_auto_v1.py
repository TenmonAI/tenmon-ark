#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_CURSOR_AUTO_V1

実バイナリ解決・軽量起動確認と、OCR/PDF 抽出経路の記録（観測専用・fail-closed）。
OCR 出力を truth と見なさない前提を成果物に明示する。
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_ocr_runtime_wake_and_binary_verify_result_v1.json"
OUT_MD = "tenmon_ocr_runtime_wake_and_binary_verify_report_v1.md"

# 1: PDF text layer → 2: raster + OCR → 3: 失敗時は不確実性・non_text 扱い
FALLBACK_EXTRACTION_ORDER: list[dict[str, str]] = [
    {"step": "1", "mode": "pdf_text_layer", "primary_tool": "pdftotext", "notes": "ingest_pdf_pages.sh / nas_pdf_pages_ingest_poppler_v1.py / ingest.ts embedded Python"},
    {
        "step": "2",
        "mode": "page_raster_ocr",
        "primary_tool": "tesseract",
        "notes": "ocr_page.sh（ImageMagick convert 前処理 + tesseract -l jpn+eng）。別系: ocrmypdf で PDF 再 OCR（パイプライン設計時）",
    },
    {"step": "3", "mode": "ocr_failure_uncertainty", "primary_tool": "none", "notes": "uncertainty / non_text_page — OCR を truth と見なさない"},
]

# ingest.ts フォールバックと整合（PyPDF → pypdf → pdftotext）
INGEST_TS_PYTHON_ORDER_NOTE = "ingest.ts: PyPDF2 → pypdf → pdftotext subprocess (per-page, timeout)"

OCR_QC_CONTRACT: dict[str, Any] = {
    "ocr_is_not_truth": True,
    "recommended_fields": [
        "source_hash",
        "page_range",
        "engine",
        "qc_summary",
        "extracted_ref",
        "nas_locator",
    ],
    "mapping_notes": {
        "source_hash": "本文バイト列やファイル+ページから導出した SHA256 等（kokuzo_pages.sha 等）",
        "page_range": "pdfPage または from-to（例: ingest のページ窓）",
        "engine": "tesseract / pdftotext / pypdf / PyPDF2 / ocrmypdf",
        "qc_summary": "例: ocr_page.sh の qc_json（jpRate, len, psm, prep）",
        "extracted_ref": "DB 行・kokuzo_pages / kokuzo_ocr_pages 等の参照キー",
        "nas_locator": "nas_relative_path / locator_ref / canonical_root（素材台帳と整合）",
    },
}


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _run_capture(argv: list[str], timeout: float = 12.0) -> tuple[int, str, str | None]:
    try:
        p = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out.strip()[:2000], None
    except FileNotFoundError as e:
        return -1, "", str(e)
    except subprocess.TimeoutExpired:
        return -124, "", "timeout"


def _probe_binary(
    name: str,
    version_argv: list[str],
    *,
    version_ok_if_output: bool = False,
) -> dict[str, Any]:
    path = shutil.which(name)
    rec: dict[str, Any] = {
        "name": name,
        "resolved_path": path,
        "ok": False,
        "version_probe_argv": version_argv,
        "version_snippet": None,
        "error": None,
    }
    if not path:
        rec["error"] = "not_in_path"
        return rec
    rc, blob, err = _run_capture([path, *version_argv])
    if err:
        rec["error"] = err
        return rec
    first = blob.splitlines()[0].strip() if blob else ""
    rec["version_snippet"] = first[:500] if first else None
    rec["probe_returncode"] = rc
    if version_ok_if_output:
        # poppler の -v は環境により非ゼロ終了でも版行が出る
        rec["ok"] = bool(first)
    else:
        rec["ok"] = rc == 0 and bool(first)
    if not rec["ok"] and not rec["error"]:
        rec["error"] = f"probe_rc={rc}_empty_output" if not first else f"probe_rc={rc}"
    return rec


def _probe_ocrmypdf() -> dict[str, Any]:
    name = "ocrmypdf"
    path = shutil.which(name)
    rec: dict[str, Any] = {
        "name": name,
        "resolved_path": path,
        "ok": False,
        "version_probe_argv": ["--version"],
        "version_snippet": None,
        "error": None,
    }
    if not path:
        rec["error"] = "not_in_path"
        return rec
    rc, blob, err = _run_capture([path, "--version"])
    if err:
        rec["error"] = err
        return rec
    first = blob.splitlines()[0].strip() if blob else ""
    rec["version_snippet"] = first[:500] if first else None
    rec["probe_returncode"] = rc
    rec["ok"] = bool(first) and rc == 0
    if not rec["ok"] and not rec["error"]:
        rec["error"] = "not_in_path" if not path else (f"probe_rc={rc}" if not first else f"probe_rc={rc}")
    return rec


def _check_shell_script(path: Path) -> dict[str, Any]:
    out: dict[str, Any] = {"path": str(path), "exists": path.is_file(), "bash_n_ok": False, "error": None}
    if not out["exists"]:
        out["error"] = "missing"
        return out
    r = subprocess.run(
        ["bash", "-n", str(path)],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    out["bash_n_ok"] = r.returncode == 0
    if not out["bash_n_ok"]:
        out["error"] = (r.stderr or r.stdout or "bash_n_failed").strip()[:400]
    return out


def _check_python_tool(path: Path) -> dict[str, Any]:
    out: dict[str, Any] = {"path": str(path), "exists": path.is_file(), "py_compile_ok": False, "error": None}
    if not out["exists"]:
        out["error"] = "missing"
        return out
    r = subprocess.run(
        [sys.executable, "-m", "py_compile", str(path)],
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    out["py_compile_ok"] = r.returncode == 0
    if not out["py_compile_ok"]:
        out["error"] = (r.stderr or r.stdout or "py_compile_failed").strip()[:400]
    return out


def _nas_touchpoints() -> dict[str, Any]:
    keys = (
        "TENMON_NAS_BOOKS_ROOT",
        "TENMON_NAS_CANONICAL_ROOT",
        "TENMON_DATA_DIR",
    )
    env_snapshot: dict[str, str | None] = {k: os.environ.get(k) for k in keys}
    return {
        "observed_env_keys": env_snapshot,
        "note": "NAS マウントは環境依存。パスは記録のみ（本検証ではマウント必須としない）。",
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    tesseract = _probe_binary("tesseract", ["--version"])
    pdftotext = _probe_binary("pdftotext", ["-v"], version_ok_if_output=True)
    pdfinfo = _probe_binary("pdfinfo", ["-v"], version_ok_if_output=True)
    convert_bin = _probe_binary("convert", ["-version"])
    ocrmypdf = _probe_ocrmypdf()

    ocr_page_sh = _check_shell_script(api / "scripts" / "ocr_page.sh")
    ingest_pdf_pages_sh = _check_shell_script(api / "scripts" / "ingest_pdf_pages.sh")
    nas_tool_py = _check_python_tool(api / "tools" / "nas_pdf_pages_ingest_poppler_v1.py")

    binaries = {
        "tesseract": tesseract,
        "ocrmypdf": ocrmypdf,
        "pdftotext": pdftotext,
        "pdfinfo": pdfinfo,
        "convert_imagemagick": convert_bin,
    }
    scripts = {
        "ocr_page_sh": ocr_page_sh,
        "ingest_pdf_pages_sh": ingest_pdf_pages_sh,
        "nas_pdf_pages_ingest_poppler_v1_py": nas_tool_py,
    }

    bin_ok = all(b.get("ok") for b in binaries.values())
    scripts_ok = (
        ocr_page_sh.get("bash_n_ok")
        and ingest_pdf_pages_sh.get("bash_n_ok")
        and nas_tool_py.get("py_compile_ok")
    )
    acceptance_pass = bool(bin_ok and scripts_ok)

    result: dict[str, Any] = {
        "schema": "TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "repo_root": str(repo),
        "ingest_ts_extraction_note": INGEST_TS_PYTHON_ORDER_NOTE,
        "fallback_extraction_order": FALLBACK_EXTRACTION_ORDER,
        "ocr_qc_contract": OCR_QC_CONTRACT,
        "binaries": binaries,
        "scripts": scripts,
        "nas_touchpoints": _nas_touchpoints(),
        "acceptance_pass": acceptance_pass,
        "failure_reasons": []
        if acceptance_pass
        else _collect_failures(binaries, scripts),
        "nextOnPass": "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1",
        "nextOnFail": "TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_RETRY_CURSOR_AUTO_V1",
        "observation_only": True,
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _write_report(auto / OUT_MD, result)

    print(json.dumps({"acceptance_pass": acceptance_pass, "binaries_ok": bin_ok, "scripts_ok": scripts_ok}, ensure_ascii=False, indent=2))
    return 0 if acceptance_pass else 2


def _collect_failures(binaries: dict[str, Any], scripts: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    for k, v in binaries.items():
        if not v.get("ok"):
            reasons.append(f"binary:{k}:{v.get('error') or 'not_ok'}")
    for k, v in scripts.items():
        if k.endswith("_sh"):
            if not v.get("bash_n_ok"):
                reasons.append(f"script:{k}:{v.get('error') or 'bash_n_failed'}")
        elif not v.get("py_compile_ok"):
            reasons.append(f"script:{k}:{v.get('error') or 'py_compile_failed'}")
    return reasons


def _write_report(md_path: Path, data: dict[str, Any]) -> None:
    lines = [
        f"# TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_REPORT_V1",
        "",
        f"- **generated_at**: `{data.get('generated_at')}`",
        f"- **acceptance_pass**: `{data.get('acceptance_pass')}`",
        f"- **OCR は truth ではない**（契約フラグ）: `{data.get('ocr_qc_contract', {}).get('ocr_is_not_truth')}`",
        "",
        "## バイナリ（解決パス + 版スニペット）",
        "",
    ]
    for k, v in (data.get("binaries") or {}).items():
        lines.append(f"- **{k}**: path=`{v.get('resolved_path')}` ok=`{v.get('ok')}` snippet=`{v.get('version_snippet')}` err=`{v.get('error')}`")
    lines.extend(["", "## スクリプト / ツール", ""])
    for k, v in (data.get("scripts") or {}).items():
        lines.append(f"- **{k}**: `{v.get('path')}` ok=`{v.get('bash_n_ok', v.get('py_compile_ok'))}` err=`{v.get('error')}`")
    lines.extend(
        [
            "",
            "## 抽出フォールバック順（運用契約）",
            "",
        ]
    )
    for row in data.get("fallback_extraction_order") or []:
        lines.append(f"- step **{row.get('step')}** `{row.get('mode')}` — tool `{row.get('primary_tool')}` — {row.get('notes')}")
    lines.extend(["", "## ingest.ts（API 経路）", "", f"- {data.get('ingest_ts_extraction_note')}", ""])
    lines.extend(["## OCR QC 付与フィールド（推奨）", ""])
    for f in (data.get("ocr_qc_contract") or {}).get("recommended_fields") or []:
        lines.append(f"- `{f}`")
    lines.extend(["", "## NAS 接点（環境変数スナップショット）", "", "```json", json.dumps(data.get("nas_touchpoints"), ensure_ascii=False, indent=2), "```", ""])
    lines.extend(["", "## next", "", f"- **nextOnPass**: `{data.get('nextOnPass')}`", f"- **nextOnFail**: `{data.get('nextOnFail')}`", ""])
    if not data.get("acceptance_pass"):
        lines.extend(["", "## failure_reasons", ""])
        for r in data.get("failure_reasons") or []:
            lines.append(f"- `{r}`")
    md_path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
