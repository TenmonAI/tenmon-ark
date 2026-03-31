#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_REGRESSION_LEDGER_CURSOR_AUTO_V1

acceptance probe v2 の結果を追記し、直前 run との差分で regression / stable / improved を記録する。
履歴は append のみ（上書き消去禁止）。壊れた ledger JSON はバックアップ保全後に初期化して継続可能。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_REGRESSION_LEDGER_V1"
LEDGER_VERSION = 1
DEFAULT_TARGET_FILE = "api/src/routes/chat.ts"
PROBE_CARD = "TENMON_CONVERSATION_ACCEPTANCE_PROBE_V2"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ledger_path(explicit: str | None) -> Path:
    if explicit and explicit.strip():
        return Path(explicit).resolve()
    return Path(__file__).resolve().with_name("tenmon_conversation_regression_ledger_v1.json")


def _parse_surface_len(detail: str) -> int:
    m = re.search(r"len=(\d+)", str(detail or ""))
    return int(m.group(1)) if m else 0


def probe_row_from_report_probe(p: Dict[str, Any]) -> Dict[str, Any]:
    """probe v2 の probes[] 要素から ledger 用スナップショット（会話本文は保存しない）。"""
    return {
        "probe_id": p.get("probe_id"),
        "message": p.get("message"),
        "probe_pass": bool(p.get("probe_pass")),
        "runner_ok": bool(p.get("runner_ok")),
        "runner_error": p.get("runner_error") or "",
        "route_reason_detail": p.get("route_reason_detail") or "",
        "center_label_detail": p.get("center_label_detail") or "",
        "continuity_detail": p.get("continuity_detail") or "",
        "grounding_mode_ok": bool(p.get("grounding_mode_ok")),
        "grounding_detail": p.get("grounding_detail") or "",
        "surface_score": int(p.get("surface_score") or 0),
        "surface_detail": p.get("surface_detail") or "",
        "response_len": _parse_surface_len(str(p.get("surface_detail") or "")),
        "generic_hits": int(p.get("generic_hits") or 0),
        "generic_strong": bool(p.get("generic_strong")),
        "not_generic_drift": bool(p.get("not_generic_drift")),
        "reasons_fail": list(p.get("reasons_fail") or []),
    }


def validate_probe_report(rep: Dict[str, Any]) -> Tuple[bool, str]:
    if not isinstance(rep, dict):
        return False, "report_not_object"
    if rep.get("cardName") != PROBE_CARD:
        return False, f"cardName_mismatch_expected_{PROBE_CARD}"
    probes = rep.get("probes")
    if not isinstance(probes, list) or len(probes) < 1:
        return False, "probes_missing_or_empty"
    agg = rep.get("aggregate")
    if not isinstance(agg, dict) or "pass" not in agg:
        return False, "aggregate_missing"
    return True, ""


def build_run_entry(
    rep: Dict[str, Any],
    target_file: str,
    ledger_note: str = "",
) -> Dict[str, Any]:
    probes = [probe_row_from_report_probe(p) for p in rep.get("probes") or [] if isinstance(p, dict)]
    agg = rep.get("aggregate") if isinstance(rep.get("aggregate"), dict) else {}
    return {
        "recorded_at": rep.get("generatedAt") or _utc_now_iso(),
        "ingested_at": _utc_now_iso(),
        "source_card": rep.get("cardName"),
        "probe_set_version": rep.get("probeSetVersion"),
        "target_file": target_file,
        "ledger_note": ledger_note,
        "bootstrap": rep.get("bootstrap"),
        "chat_url_used": rep.get("chat_url_used"),
        "discovery_error": rep.get("discovery_error"),
        "thread_id": rep.get("thread_id"),
        "probes": probes,
        "aggregate_verdict": {
            "pass": bool(agg.get("pass")),
            "probes_passing": int(agg.get("probes_passing") or 0),
            "probes_total": int(agg.get("probes_total") or 0),
            "surface_density_pass_count": int(agg.get("surface_density_pass_count") or 0),
            "any_strong_generic_drift": bool(agg.get("any_strong_generic_drift")),
            "fail_codes": list(agg.get("fail_codes") or []),
        },
        "fail_codes": list(agg.get("fail_codes") or []),
    }


def diff_runs(prev: Dict[str, Any], curr: Dict[str, Any]) -> Dict[str, Any]:
    pa = prev.get("aggregate_verdict") or {}
    ca = curr.get("aggregate_verdict") or {}
    prev_pass = bool(pa.get("pass"))
    curr_pass = bool(ca.get("pass"))
    prev_n = int(pa.get("probes_passing") or 0)
    curr_n = int(ca.get("probes_passing") or 0)

    if not prev:
        return {
            "compared_to_recorded_at": None,
            "trend": "baseline",
            "prev_aggregate_pass": None,
            "current_aggregate_pass": curr_pass,
            "delta_probes_passing": curr_n,
            "delta_surface_density_pass_count": int(ca.get("surface_density_pass_count") or 0),
            "any_strong_generic_drift_new": False,
            "per_probe_delta": [{"probe_id": p.get("probe_id"), "baseline_probe": True} for p in curr.get("probes") or []],
            "rollback_needed": False,
        }

    pp = {p["probe_id"]: p for p in prev.get("probes") or []}
    per_probe: List[Dict[str, Any]] = []
    any_generic_strong_new = False
    for cp in curr.get("probes") or []:
        pid = cp.get("probe_id")
        p0 = pp.get(pid)
        if not p0:
            per_probe.append(
                {
                    "probe_id": pid,
                    "baseline_probe": True,
                }
            )
            continue
        rr_changed = p0.get("route_reason_detail") != cp.get("route_reason_detail")
        ce_changed = p0.get("center_label_detail") != cp.get("center_label_detail")
        co_changed = p0.get("continuity_detail") != cp.get("continuity_detail")
        gr_changed = bool(p0.get("grounding_mode_ok")) != bool(cp.get("grounding_mode_ok"))
        gen_new = bool(cp.get("generic_strong")) and not bool(p0.get("generic_strong"))
        if gen_new:
            any_generic_strong_new = True
        per_probe.append(
            {
                "probe_id": pid,
                "route_reason_changed": rr_changed,
                "center_changed": ce_changed,
                "continuity_changed": co_changed,
                "grounding_changed": gr_changed,
                "grounding_was": bool(p0.get("grounding_mode_ok")),
                "grounding_now": bool(cp.get("grounding_mode_ok")),
                "surface_score_delta": int(cp.get("surface_score") or 0) - int(p0.get("surface_score") or 0),
                "response_len_delta": int(cp.get("response_len") or 0) - int(p0.get("response_len") or 0),
                "probe_pass_flipped_to_fail": bool(p0.get("probe_pass")) and not bool(cp.get("probe_pass")),
                "probe_pass_flipped_to_pass": not bool(p0.get("probe_pass")) and bool(cp.get("probe_pass")),
                "generic_strong_new": gen_new,
                "generic_hits_delta": int(cp.get("generic_hits") or 0) - int(p0.get("generic_hits") or 0),
            }
        )

    trend = "stable"
    if (
        (prev_pass and not curr_pass)
        or (curr_n < prev_n)
        or any_generic_strong_new
        or any(x.get("probe_pass_flipped_to_fail") for x in per_probe)
    ):
        trend = "regression"
    elif (
        (not prev_pass and curr_pass)
        or (curr_n > prev_n)
        or (bool(pa.get("any_strong_generic_drift")) and not bool(ca.get("any_strong_generic_drift")))
        or any(x.get("probe_pass_flipped_to_pass") for x in per_probe)
    ):
        trend = "improved"

    rollback_needed = trend == "regression" and not curr_pass

    return {
        "compared_to_recorded_at": prev.get("recorded_at"),
        "trend": trend,
        "prev_aggregate_pass": prev_pass,
        "current_aggregate_pass": curr_pass,
        "delta_probes_passing": curr_n - prev_n,
        "delta_surface_density_pass_count": int(ca.get("surface_density_pass_count") or 0)
        - int(pa.get("surface_density_pass_count") or 0),
        "any_strong_generic_drift_new": any_generic_strong_new,
        "per_probe_delta": per_probe,
        "rollback_needed": rollback_needed,
    }


def load_ledger(path: Path) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    """
    Returns (ledger_dict, recovery_meta_or_none).
    欠損ファイルは空 ledger テンプレ。壊 JSON は .bak へ退避してテンプレ＋recovery メタ。
    """
    recovery: Optional[Dict[str, Any]] = None
    if not path.is_file():
        return _empty_ledger_template(path), None
    raw = path.read_text(encoding="utf-8", errors="replace")
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("root_not_object")
        data.setdefault("schema", "tenmon_conversation_regression_ledger_v1")
        data.setdefault("version", LEDGER_VERSION)
        data.setdefault("target_file_default", DEFAULT_TARGET_FILE)
        data.setdefault("runs", [])
        if not isinstance(data["runs"], list):
            data["runs"] = []
        if "latest_summary" not in data:
            data["latest_summary"] = None
        return data, None
    except Exception as e:
        bak = path.with_suffix(path.suffix + f".corrupt_{_utc_now_iso().replace(':', '')}.bak")
        try:
            bak.write_text(raw, encoding="utf-8")
            backup_written = str(bak)
        except OSError:
            backup_written = ""
        recovery = {
            "reason": "json_parse_or_shape_error",
            "error": str(e),
            "backup_path": backup_written,
            "recovered_at": _utc_now_iso(),
        }
        base = _empty_ledger_template(path)
        base["corrupt_recovery"] = recovery
        return base, recovery


def _empty_ledger_template(path: Path) -> Dict[str, Any]:
    return {
        "schema": "tenmon_conversation_regression_ledger_v1",
        "version": LEDGER_VERSION,
        "target_file_default": DEFAULT_TARGET_FILE,
        "ledger_path": str(path),
        "runs": [],
        "latest_summary": None,
        "corrupt_recovery": None,
    }


def save_ledger(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def append_report_to_ledger(
    rep: Dict[str, Any],
    ledger_file: Path,
    target_file: str,
    ledger_note: str = "",
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """report を検証し runs に append、latest_summary を更新。返値 (full_ledger, latest_summary)。"""
    ok, reason = validate_probe_report(rep)
    if not ok:
        raise ValueError(f"invalid_probe_report:{reason}")

    ledger, recovery = load_ledger(ledger_file)
    if recovery:
        ledger["corrupt_recovery"] = recovery

    run = build_run_entry(rep, target_file=target_file, ledger_note=ledger_note)
    prev_run: Dict[str, Any] = ledger["runs"][-1] if ledger["runs"] else {}
    summary = diff_runs(prev_run, run)

    ledger["runs"].append(run)
    ledger["latest_summary"] = summary
    ledger["ledger_path"] = str(ledger_file.resolve())
    save_ledger(ledger_file, ledger)
    return ledger, summary


def main() -> int:
    ap = argparse.ArgumentParser(description="Conversation regression ledger v1")
    ap.add_argument("--ledger", default="", help="path to ledger JSON (default: alongside this script)")
    ap.add_argument("--target-file", default=DEFAULT_TARGET_FILE, help="tracked target path (metadata only)")
    ap.add_argument("--note", default="", help="optional note stored on the run entry")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--ingest", metavar="PATH", help="path to probe v2 full_report.json")
    src.add_argument("--ingest-stdin", action="store_true", help="read one JSON report from stdin")
    src.add_argument(
        "--run-probe-and-append",
        action="store_true",
        help="run tenmon_conversation_acceptance_probe_v2.build_full_report and append",
    )
    ap.add_argument("--stdout-json", action="store_true", help="print ledger or summary JSON")
    args = ap.parse_args()

    path = _ledger_path(args.ledger or None)

    try:
        if args.run_probe_and_append:
            _automation = Path(__file__).resolve().parent
            if str(_automation) not in sys.path:
                sys.path.insert(0, str(_automation))
            from tenmon_conversation_acceptance_probe_v2 import build_full_report

            rep, _records = build_full_report()
        elif args.ingest_stdin:
            rep = json.loads(sys.stdin.read())
        else:
            rep = json.loads(Path(args.ingest).read_text(encoding="utf-8", errors="replace"))

        ledger, summary = append_report_to_ledger(rep, path, args.target_file, args.note)
    except ValueError as e:
        err = {"ok": False, "error": str(e), "fail_closed": True}
        print(json.dumps(err, ensure_ascii=False, indent=2))
        return 1
    except OSError as e:
        err = {"ok": False, "error": f"os_error:{e}", "fail_closed": True}
        print(json.dumps(err, ensure_ascii=False, indent=2))
        return 1

    out = {
        "ok": True,
        "ledger_path": str(path.resolve()),
        "latest_summary": summary,
        "run_count": len(ledger.get("runs") or []),
    }
    if args.stdout_json:
        print(json.dumps({"append_result": out, "full_ledger": ledger}, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
