#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_AUTONOMY_PREFLIGHT_AND_ALLOWLIST_CURSOR_AUTO_V1

autonomy supervisor /（任意）schedule executor 起動前の fail-closed preflight。
結果は multi_ai_autonomy_preflight_result_v1.json に保存。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MULTI_AI_AUTONOMY_PREFLIGHT_AND_ALLOWLIST_CURSOR_AUTO_V1"
RESULT_FN = "multi_ai_autonomy_preflight_result_v1.json"
ALLOW_FN = "multi_ai_autonomy_allowlist_v1.json"
DENY_FN = "multi_ai_autonomy_denylist_v1.json"
RUNTIME_FN = "multi_ai_autonomy_runtime_state.json"
PROGRESS_FN = "multi_ai_autonomy_progress_report.json"
QUEUE_FN = "multi_ai_autonomy_queue.json"
GUARDRAIL_FN = "multi_ai_autonomy_guardrail_contract_v1.json"
VERDICT_SCHEMA_FN = "multi_ai_autonomy_verdict_schema_v1.json"
BRIDGE_SCRIPT = "cursor_executor_bridge_v1.py"
SCHED_SCRIPT = "schedule_executor_orchestrator_v1.py"
SUPERVISOR_SCRIPT = "multi_ai_autonomy_supervisor_v1.py"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _repo_root(auto_dir: Path) -> Path:
    return auto_dir.parents[1]


def _git_head(repo: Path) -> tuple[str, str, str | None]:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        full = (r.stdout or "").strip()
        if not full:
            return "", "", "empty"
        short = full[:12] if len(full) >= 12 else full
        return full, short, None
    except Exception as e:
        return "", "", str(e)


def _porcelain(repo: Path) -> tuple[list[str], str | None]:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        lines = [ln for ln in (r.stdout or "").splitlines() if ln.strip()]
        return lines, None
    except Exception as e:
        return [], str(e)


def _head_matches(current_full: str, expected: str) -> bool:
    exp = (expected or "").strip().lower()
    cur = (current_full or "").strip().lower()
    if not exp or not cur:
        return False
    if cur == exp:
        return True
    if len(exp) >= 7 and (cur.startswith(exp) or exp.startswith(cur[: len(exp)])):
        return True
    if len(exp) < 7 and cur.startswith(exp):
        return True
    return False


def _audit(base_url: str) -> dict[str, Any]:
    url = base_url.rstrip("/") + "/api/audit"
    out: dict[str, Any] = {"skipped": False, "ok": None, "http_code": None, "error": None, "url": url}
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            code = resp.getcode()
            body = resp.read(8000).decode("utf-8", errors="replace")
        try:
            j = json.loads(body)
            ok = bool(j.get("ok")) if isinstance(j, dict) else 200 <= code < 300
        except Exception:
            ok = 200 <= code < 300
        out["ok"] = ok
        out["http_code"] = code
    except urllib.error.HTTPError as e:
        out["ok"] = False
        out["http_code"] = e.code
        out["error"] = str(e)
    except Exception as e:
        out["ok"] = False
        out["error"] = str(e)
    return out


def load_allowlist_denylist(auto_dir: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    return _read_json(auto_dir / ALLOW_FN), _read_json(auto_dir / DENY_FN)


def is_autonomy_card_permitted(card_id: str, allow: dict[str, Any], deny: dict[str, Any]) -> tuple[bool, str]:
    cid = (card_id or "").strip()
    if not cid.startswith("TENMON_") or not cid.endswith("_CURSOR_AUTO_V1"):
        return False, "invalid_card_id_pattern"
    for sub in deny.get("card_id_substrings") or []:
        s = str(sub)
        if s and s in cid:
            return False, f"deny_substring:{s}"
    for ex in deny.get("exact_card_ids") or []:
        if cid == str(ex):
            return False, f"deny_exact:{ex}"
    allowed = allow.get("allowed_card_ids") if isinstance(allow.get("allowed_card_ids"), list) else []
    if cid not in allowed:
        return False, "not_in_allowlist"
    return True, "ok"


def _queue_cards(queue: dict[str, Any]) -> list[str]:
    co = queue.get("card_order")
    if not isinstance(co, list):
        return []
    return [str(x) for x in co if isinstance(x, str) and x.startswith("TENMON_")]


def run_preflight(
    *,
    auto_dir: Path,
    base_url: str | None,
    expected_head: str | None,
    allow_missing_expected_head: bool,
    allow_dirty_repo: bool,
    allow_no_audit: bool,
    write_result: bool,
    allow_empty_queue: bool = False,
) -> tuple[dict[str, Any], int]:
    repo = _repo_root(auto_dir)
    checks: list[dict[str, Any]] = []
    verdict = "PASS"
    exit_hint = 0

    def add(cid: str, ok: bool, detail: str) -> None:
        checks.append({"id": cid, "ok": ok, "detail": detail})
        nonlocal verdict, exit_hint
        if not ok:
            verdict = "FAIL"
            exit_hint = 1

    # Contract files
    gf = auto_dir / GUARDRAIL_FN
    try:
        g = json.loads(gf.read_text(encoding="utf-8")) if gf.is_file() else {}
        add("guardrail_contract_present", gf.is_file() and g.get("schema") == "MULTI_AI_AUTONOMY_GUARDRAIL_CONTRACT_V1", str(gf))
    except Exception as e:
        add("guardrail_contract_parse", False, str(e))

    vf = auto_dir / VERDICT_SCHEMA_FN
    try:
        v = json.loads(vf.read_text(encoding="utf-8")) if vf.is_file() else {}
        add("verdict_schema_present", vf.is_file() and v.get("schema") == "MULTI_AI_AUTONOMY_VERDICT_SCHEMA_V1", str(vf))
    except Exception as e:
        add("verdict_schema_parse", False, str(e))

    allow, deny = load_allowlist_denylist(auto_dir)
    try:
        json.loads((auto_dir / ALLOW_FN).read_text(encoding="utf-8")) if (auto_dir / ALLOW_FN).is_file() else {}
        add("allowlist_parse", (auto_dir / ALLOW_FN).is_file(), str(auto_dir / ALLOW_FN))
    except Exception as e:
        add("allowlist_parse", False, str(e))

    try:
        json.loads((auto_dir / DENY_FN).read_text(encoding="utf-8")) if (auto_dir / DENY_FN).is_file() else {}
        add("denylist_parse", (auto_dir / DENY_FN).is_file(), str(auto_dir / DENY_FN))
    except Exception as e:
        add("denylist_parse", False, str(e))

    for fn, schema_key, schema_val in (
        (RUNTIME_FN, "schema", "MULTI_AI_AUTONOMY_RUNTIME_STATE_V1"),
        (PROGRESS_FN, "schema", "MULTI_AI_AUTONOMY_PROGRESS_REPORT_V1"),
        (QUEUE_FN, "schema", "MULTI_AI_AUTONOMY_QUEUE_V1"),
    ):
        p = auto_dir / fn
        try:
            d = json.loads(p.read_text(encoding="utf-8")) if p.is_file() else {}
            add(f"json_{fn}", p.is_file() and d.get(schema_key) == schema_val, str(p))
        except Exception as e:
            add(f"json_{fn}", False, str(e))

    q = _read_json(auto_dir / QUEUE_FN)
    qcards = _queue_cards(q)
    if not qcards:
        if allow_empty_queue:
            add("queue_card_order_nonempty", True, "allow_empty_queue:infinite_growth_or_equiv")
        else:
            add("queue_card_order_nonempty", False, "card_order empty or missing")
    else:
        bad: list[str] = []
        for c in qcards:
            ok, why = is_autonomy_card_permitted(c, allow, deny)
            if not ok:
                bad.append(f"{c}:{why}")
        add("queue_cards_allowlisted", len(bad) == 0, "; ".join(bad) if bad else "ok")

    full, short, err = _git_head(repo)
    add("git_head_resolved", bool(full) and not err, err or full[:40])

    exp = (expected_head or os.environ.get("TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD") or "").strip()
    sealed_ok: bool | None = None
    if not exp:
        sealed_ok = None
        if allow_missing_expected_head:
            add("sealed_head_configured", True, "allowed_missing_expected_head")
        else:
            add("sealed_head_configured", False, "expected_head_required_cli_or_env_TENMON_MULTI_AI_AUTONOMY_EXPECTED_HEAD")
    else:
        sealed_ok = _head_matches(full, exp)
        add("sealed_head_matches", sealed_ok, f"expected={exp} current={short}")

    lines, perr = _porcelain(repo)
    if perr:
        add("git_porcelain", False, perr)
    elif allow_dirty_repo:
        add("git_porcelain_clean", True, f"allowed_dirty lines={len(lines)}")
    else:
        add("git_porcelain_clean", len(lines) == 0, f"lines={len(lines)}")

    audit_snap: dict[str, Any] | None = None
    if not base_url or not str(base_url).strip():
        if allow_no_audit:
            audit_snap = {"skipped": True, "ok": None, "note": "TENMON_PREFLIGHT_ALLOW_NO_AUDIT"}
            add("api_audit", True, "audit_skipped_allowed")
        else:
            audit_snap = {"skipped": True, "ok": None, "error": "base_url_required"}
            add("api_audit", False, "api_base_url_required_for_preflight_PASS")
    else:
        audit_snap = _audit(str(base_url).strip())
        add("api_audit", audit_snap.get("ok") is True, str(audit_snap.get("error") or audit_snap.get("http_code")))

    add("cursor_bridge_script", (auto_dir / BRIDGE_SCRIPT).is_file(), str(auto_dir / BRIDGE_SCRIPT))
    add("schedule_orchestrator_script", (auto_dir / SCHED_SCRIPT).is_file(), str(auto_dir / SCHED_SCRIPT))
    add("multi_ai_supervisor_script", (auto_dir / SUPERVISOR_SCRIPT).is_file(), str(auto_dir / SUPERVISOR_SCRIPT))

    q_allow_ok: bool | None = None
    for c in checks:
        if c.get("id") == "queue_cards_allowlisted":
            q_allow_ok = bool(c.get("ok"))
            break

    result: dict[str, Any] = {
        "schema": "MULTI_AI_AUTONOMY_PREFLIGHT_RESULT_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "verdict": verdict,
        "exit_code_hint": exit_hint,
        "git_head_full": full,
        "git_head_short": short,
        "expected_head": exp or None,
        "sealed_head_ok": sealed_ok,
        "repo_clean": len(lines) == 0 if not perr else None,
        "porcelain_lines": lines[:80],
        "audit": audit_snap,
        "checks": checks,
        "queue_allowlist_ok": q_allow_ok,
        "suggested_next_card": "TENMON_MULTI_AI_AUTONOMY_PREFLIGHT_STAMP_BIND_CURSOR_AUTO_V1",
        "preflight_checklist": [
            "git_head_current",
            "expected_sealed_head",
            "git_status_porcelain",
            "api_audit",
            "runtime_progress_queue_json_schema",
            "cursor_bridge_schedule_supervisor_scripts",
            "guardrail_contract_verdict_schema",
            "queue_vs_allowlist_denylist",
        ],
        "start_allowed_when": [
            "verdict=PASS",
            "sealed_head_matches または明示的に missing head 許可",
            "repo_clean または dirty 許可",
            "audit ok または no-audit 許可",
            "queue 内カードが allowlist かつ deny 非該当",
        ],
        "start_blocked_when": [
            "いずれかの checks[].ok が false",
            "未登録カードが queue に含まれる",
        ],
    }

    if write_result:
        _write_json(auto_dir / RESULT_FN, result)

    return result, exit_hint


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--api-base-url", type=str, default=os.environ.get("TENMON_API_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument("--expected-head", type=str, default="")
    ap.add_argument(
        "--allow-missing-expected-head",
        action="store_true",
        help="封印 SHA 未指定でも続行（開発用。本番 fail-closed 非推奨）",
    )
    ap.add_argument("--allow-dirty-repo", action="store_true")
    ap.add_argument("--allow-no-audit", action="store_true", help="base URL なしでも PASS 扱い（開発用）")
    ap.add_argument(
        "--allow-empty-queue",
        action="store_true",
        help="card_order 空でも PASS（infinite growth 生成レーン等）",
    )
    ap.add_argument("--no-write-result", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    auto_dir = Path(args.auto_dir) if args.auto_dir else here
    base_url = (args.api_base_url or "").strip() or None
    exp = (args.expected_head or "").strip() or None

    allow_miss = bool(args.allow_missing_expected_head) or os.environ.get(
        "TENMON_PREFLIGHT_ALLOW_MISSING_SEALED_HEAD", ""
    ).strip() == "1"
    allow_dirty = bool(args.allow_dirty_repo) or os.environ.get("TENMON_PREFLIGHT_ALLOW_DIRTY_REPO", "").strip() == "1"
    allow_no_audit = bool(args.allow_no_audit) or os.environ.get("TENMON_PREFLIGHT_ALLOW_NO_AUDIT", "").strip() == "1"

    res, code = run_preflight(
        auto_dir=auto_dir,
        base_url=base_url,
        expected_head=exp,
        allow_missing_expected_head=allow_miss,
        allow_dirty_repo=allow_dirty,
        allow_no_audit=allow_no_audit,
        write_result=not args.no_write_result,
        allow_empty_queue=bool(args.allow_empty_queue),
    )
    print(json.dumps({"verdict": res.get("verdict"), "exit_code": code, "result_path": str(auto_dir / RESULT_FN)}, ensure_ascii=False))
    sys.exit(code)


if __name__ == "__main__":
    main()
