#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REMOTE_BUILD_JOB_NORMALIZER_V1
管理者ダッシュボード由来のカード本文を、Mac 側実行用の single source JSON に正規化する。
（実行層・Cursor 層は触らない）
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_REMOTE_BUILD_JOB_NORMALIZER_V1"
VERSION = 1

DEFAULT_DO_NOT_TOUCH = [
    "dist/**",
    "api/src/routes/chat.ts",
    "DB schema 大改修",
    "kokuzo_pages 正文",
]

DEFAULT_ACCEPTANCE = [
    "api で npm run build が成功する",
    "正規化 manifest が remote_build_job_schema_v1 に適合する",
    "危険パターンに該当しない（reject 時はジョブを採用しない）",
]

DEFAULT_FAIL_NEXT = "TENMON_REMOTE_BUILD_JOB_NORMALIZER_RETRY_CURSOR_AUTO_V1"

# (id, regex, note)
DANGER_PATTERNS: List[Tuple[str, re.Pattern[str], str]] = [
    ("rm_rf_root", re.compile(r"rm\s+-rf\s+[/~]|rm\s+-rf\s+\\"), "rm -rf 系"),
    ("dist_touch", re.compile(r"(^|\s)(dist/|\*\*/dist|\bdist\b\s*\*\*)", re.I), "dist 直接編集・触禁止圏"),
    ("secret_key", re.compile(r"(API_KEY|SECRET|PASSWORD|BEGIN\s+PRIVATE\s+KEY)\s*=", re.I), "秘密情報の露出疑い"),
    ("schema_force", re.compile(r"ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+|マイグレーション\s*強行", re.I), "DB schema 強行変更"),
    ("kokuzo_body", re.compile(r"kokuzo_pages.*正文|経典\s*本文\s*改変", re.I), "kokuzo 正文"),
    ("systemd_env", re.compile(r"\bsystemd\b|\.service\b|/etc/", re.I), "systemd / システム設定"),
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _strip_bullets(lines: List[str]) -> List[str]:
    out: List[str] = []
    for line in lines:
        t = line.strip()
        if not t:
            continue
        t = re.sub(r"^[-*•]\s+", "", t)
        t = re.sub(r"^\d+[.)]\s+", "", t)
        if t:
            out.append(t)
    return out


# 次セクション見出し（先頭アンカー）
_SECTION_BREAK = (
    "CARD_NAME",
    "OBJECTIVE",
    "目的",
    "EDIT_SCOPE",
    "DO_NOT_TOUCH",
    "ACCEPTANCE",
    "FAIL_NEXT_CARD",
    "FAIL_NEXT",
    "EXECUTION_MODE",
    "FILES",
    "FILE",
    "IMPLEMENTATION_POLICY",
    "WHY_NOW",
    "EDIT SCOPE",
    "スコープ",
)


def _section_after(text: str, labels: Tuple[str, ...]) -> Optional[str]:
    """最初にマッチしたセクション見出しの直後から次の大見出しまで。"""
    pattern = "|".join(re.escape(l) for l in labels)
    br = "|".join(re.escape(x) for x in _SECTION_BREAK)
    rx = re.compile(
        rf"(?im)^(?:#+\s*)?(?:{pattern})\s*:?\s*\n(?P<body>.*?)(?=^(?:#+\s*)?(?:{br})\b|\Z)",
        re.DOTALL | re.MULTILINE,
    )
    m = rx.search(text)
    if not m:
        return None
    return m.group("body").strip()


def _lines_from_section(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    return [ln.rstrip() for ln in raw.splitlines()]


def _parse_list_section(text: str, *labels: str) -> List[str]:
    sec = _section_after(text, labels)
    if not sec:
        return []
    return _strip_bullets(_lines_from_section(sec))


def _parse_card_name(text: str) -> Optional[str]:
    m = re.search(r"(?im)^(?:#+\s*)?CARD_NAME\s*:\s*(.+)$", text)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"(?im)^CARD\s*:\s*(.+)$", text)
    if m2:
        return m2.group(1).strip()
    return None


def _parse_objective(text: str) -> Optional[str]:
    m0 = re.search(r"(?im)^(?:#+\s*)?OBJECTIVE\s*:\s*(.+)$", text)
    if m0:
        one = m0.group(1).strip()
        if "\n" not in one[:4000]:
            return one[:8000]
    for lab in ("OBJECTIVE", "目的"):
        sec = _section_after(text, (lab,))
        if sec:
            para = sec.strip().split("\n\n")[0].strip()
            return para[:8000] if para else None
    return None


def _parse_fail_next(text: str) -> Optional[str]:
    m = re.search(
        r"(?im)^(?:#+\s*)?(?:FAIL_NEXT(?:_CARD)?|FAIL_NEXT_CARD)\s*:\s*(.+)$",
        text,
    )
    if m:
        return m.group(1).strip().strip("`")
    return None


def _parse_execution_mode(text: str) -> Optional[str]:
    m = re.search(r"(?im)^(?:#+\s*)?EXECUTION_MODE\s*:\s*(\w+)\s*$", text)
    if m:
        v = m.group(1).strip().lower()
        if v in ("dry_run", "apply", "manual"):
            return v
    return None


def scan_dangers(text: str) -> Tuple[List[str], List[str]]:
    """(matched_ids, human_reasons)"""
    matched: List[str] = []
    reasons: List[str] = []
    for pid, rx, note in DANGER_PATTERNS:
        if rx.search(text):
            matched.append(pid)
            reasons.append(f"{pid}: {note}")
    return matched, reasons


def normalize(
    *,
    job_id: str,
    card_name_in: str,
    card_body_md: str,
    target_scope_hint: str = "",
) -> Dict[str, Any]:
    text = (card_body_md or "").strip()
    combined = f"{card_name_in}\n{text}"

    card_name = _parse_card_name(text) or card_name_in.strip() or "TENMON_UNSCHEDULED_REMOTE_CARD_V1"
    objective = _parse_objective(text) or ""
    if not objective:
        objective = (text[:1200].strip() or "（本文から OBJECTIVE を抽出できず — raw を参照）")[:4000]

    edit_scope = _parse_list_section(text, "EDIT_SCOPE", "EDIT SCOPE", "スコープ")
    do_not_touch = _parse_list_section(text, "DO_NOT_TOUCH", "DO NOT TOUCH", "触らない")
    acceptance = _parse_list_section(text, "ACCEPTANCE", "受け入れ条件")
    files = _parse_list_section(text, "FILES", "FILE", "対象ファイル")

    defaults_applied: List[str] = []

    if not edit_scope:
        if target_scope_hint.strip():
            edit_scope = [x.strip() for x in re.split(r"[,;\n]+", target_scope_hint) if x.strip()]
        if not edit_scope:
            edit_scope = ["api/automation/**", "api/src/scripts/**", "api/docs/constitution/**"]
        defaults_applied.append("edit_scope")

    if not do_not_touch:
        do_not_touch = list(DEFAULT_DO_NOT_TOUCH)
        defaults_applied.append("do_not_touch")

    if not acceptance:
        acceptance = list(DEFAULT_ACCEPTANCE)
        defaults_applied.append("acceptance")

    fail_next = _parse_fail_next(text) or DEFAULT_FAIL_NEXT

    exec_mode = _parse_execution_mode(text)
    if not exec_mode:
        exec_mode = "manual"
        defaults_applied.append("execution_mode")

    if not files:
        # edit_scope からファイルっぽいものを files にも載せる
        files = [x for x in edit_scope if re.search(r"\.[a-z0-9]{1,8}$|/", x, re.I)]
        if not files:
            files = [edit_scope[0]] if edit_scope else ["(see edit_scope)"]
        defaults_applied.append("files")

    matched, danger_reasons = scan_dangers(combined)
    rejected = len(matched) > 0

    if rejected and exec_mode == "apply":
        exec_mode = "dry_run"
        defaults_applied.append("execution_mode_downgrade_rejected")

    manifest: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "job_id": job_id,
        "card_name": card_name,
        "objective": objective,
        "files": files,
        "edit_scope": edit_scope,
        "do_not_touch": do_not_touch,
        "acceptance": acceptance,
        "fail_next_card": fail_next,
        "execution_mode": exec_mode,
        "safety_flags": {
            "rejected": rejected,
            "reject_reasons": danger_reasons,
            "matched_danger_patterns": matched,
            "defaults_applied": defaults_applied,
        },
        "raw_card_body_md": text[:200_000],
        "normalized_at": _utc_now(),
    }
    return manifest


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_REMOTE_BUILD_JOB_NORMALIZER_V1")
    ap.add_argument("--job-id", default="", help="job id (default: auto)")
    ap.add_argument("--card-name", default="", help="fallback card name")
    ap.add_argument("--card-body", default="", help="markdown body")
    ap.add_argument("--card-body-file", type=Path, default=None)
    ap.add_argument("--target-scope-hint", default="", help="dashboard targetScope など")
    ap.add_argument("--stdin", action="store_true", help="read card body from stdin")
    ap.add_argument("--out", type=Path, default=None, help="normalized_remote_build_manifest.json")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--write-vps-fixtures",
        action="store_true",
        help="write normalization_accept_cases.json / normalization_reject_cases.json under out dir",
    )
    args = ap.parse_args()

    out_dir = _repo_root() / "api" / "automation" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = args.out or (out_dir / "normalized_remote_build_manifest.json")

    if args.write_vps_fixtures:
        accept_cases = [
            {
                "name": "minimal_objective_only",
                "card_name": "TENMON_TEST_ACCEPT_V1",
                "body": "# CARD_NAME: TENMON_TEST_ACCEPT_V1\n\nOBJECTIVE:\nAdd helper script under api/scripts.\n\nEDIT_SCOPE:\n- api/scripts/**\n",
            },
            {
                "name": "missing_fail_next_gets_default",
                "card_name": "TENMON_TEST_ACCEPT_V2",
                "body": "OBJECTIVE:\nDocument only.\n\nACCEPTANCE:\n- build passes\n",
            },
        ]
        reject_cases = [
            {
                "name": "dist_touch",
                "card_name": "BAD_DIST_V1",
                "body": "OBJECTIVE:\nEdit dist/index.html for test.\n",
            },
            {
                "name": "rm_rf",
                "card_name": "BAD_RM_V1",
                "body": "OBJECTIVE:\nCleanup: rm -rf /\n",
            },
        ]
        acc_out: List[Dict[str, Any]] = []
        for c in accept_cases:
            m = normalize(
                job_id=f"fixture_accept_{c['name']}",
                card_name_in=c["card_name"],
                card_body_md=c["body"],
            )
            acc_out.append({"case": c["name"], "expected_rejected": False, "manifest": m})
        rej_out: List[Dict[str, Any]] = []
        for c in reject_cases:
            m = normalize(
                job_id=f"fixture_reject_{c['name']}",
                card_name_in=c["card_name"],
                card_body_md=c["body"],
            )
            rej_out.append({"case": c["name"], "expected_rejected": True, "manifest": m})

        (out_dir / "normalization_accept_cases.json").write_text(
            json.dumps({"version": 1, "cases": acc_out}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (out_dir / "normalization_reject_cases.json").write_text(
            json.dumps({"version": 1, "cases": rej_out}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        marker = _repo_root() / "api" / "automation" / "TENMON_REMOTE_BUILD_JOB_NORMALIZER_VPS_V1"
        marker.write_text(f"TENMON_REMOTE_BUILD_JOB_NORMALIZER_VPS_V1\n{_utc_now()}\n", encoding="utf-8")
        if acc_out:
            out_path.write_text(
                json.dumps(acc_out[0]["manifest"], ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        vps_ok = True
        errs: List[str] = []
        for c in acc_out:
            if c["manifest"]["safety_flags"]["rejected"]:
                vps_ok = False
                errs.append(f"accept:{c['case']}:unexpected_reject")
        for c in rej_out:
            if not c["manifest"]["safety_flags"]["rejected"]:
                vps_ok = False
                errs.append(f"reject:{c['case']}:expected_reject")
        print(
            json.dumps(
                {
                    "ok": vps_ok,
                    "errors": errs,
                    "marker": str(marker),
                    "out_dir": str(out_dir),
                    "normalized_remote_build_manifest": str(out_path),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0 if vps_ok else 2

    body = args.card_body
    if args.stdin:
        body = sys.stdin.read()
    elif args.card_body_file:
        body = args.card_body_file.read_text(encoding="utf-8", errors="replace")

    job_id = args.job_id.strip() or f"nrb_{int(datetime.now(timezone.utc).timestamp())}_local"
    card_name_in = args.card_name.strip() or "TENMON_INBOUND_REMOTE_CARD_V1"

    manifest = normalize(
        job_id=job_id,
        card_name_in=card_name_in,
        card_body_md=body,
        target_scope_hint=args.target_scope_hint,
    )

    payload = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if args.stdout_json:
        print(payload.rstrip())
    else:
        out_path.write_text(payload, encoding="utf-8")
        print(str(out_path))

    return 0 if not manifest["safety_flags"]["rejected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
