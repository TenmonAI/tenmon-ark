#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_QUALITY_AUTOFIX_FIRST_LOOP_CURSOR_AUTO_V1

probe / payload 契約確認 → worldclass runtime 観測 → 会話品質 lane 1 周（acceptance / ledger / policy / build / 任意 restart / audit / reprobe / 証跡）。
同一カードの短時間連打を抑止。supervisor / watch_loop の停止は要求しない。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from argparse import Namespace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_CONVERSATION_QUALITY_AUTOFIX_FIRST_LOOP_V1"
VERSION = 1

_AUTOMATION = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION.parent.parent
_STATE_REL = Path("api/automation/generated_cursor_apply/first_loop_invocations.jsonl")

if str(_AUTOMATION) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION))


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _safe_seg(s: str) -> str:
    x = re.sub(r"[^A-Za-z0-9._-]+", "_", (s or "x").strip())
    return x[:120] or "x"


def first_loop_evidence_root(ts: str | None = None) -> Path:
    t = ts or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return Path("/var/log/tenmon") / f"card_{_safe_seg(CARD)}" / t


def anti_repeat_first_loop(repo_root: Path, window_sec: int, force: bool) -> Tuple[bool, str]:
    if force or window_sec <= 0:
        return True, ""
    p = repo_root / _STATE_REL
    if not p.is_file():
        return True, ""
    lines = [x for x in p.read_text(encoding="utf-8", errors="replace").splitlines() if x.strip()]
    if not lines:
        return True, ""
    try:
        last = json.loads(lines[-1])
    except json.JSONDecodeError:
        return True, ""
    if last.get("card") != CARD:
        return True, ""
    try:
        from datetime import datetime as dt

        t0 = dt.fromisoformat(str(last.get("utc", "")).replace("Z", "+00:00"))
        t1 = dt.fromisoformat(_utc_now_iso().replace("Z", "+00:00"))
        delta = (t1 - t0).total_seconds()
        if 0 <= delta < window_sec:
            return False, f"first_loop_throttle:repeat_within_{window_sec}s"
    except Exception:
        return True, ""
    return True, ""


def verify_acceptance_payload_contract(rep: Dict[str, Any]) -> Tuple[bool, str]:
    required = (
        "ok",
        "acceptance_ok",
        "probe_complete_ok",
        "aggregate",
        "probes",
        "cardName",
        "version",
    )
    missing = [k for k in required if k not in rep]
    if missing:
        return False, f"missing_keys:{','.join(missing)}"
    if not isinstance(rep.get("aggregate"), dict):
        return False, "aggregate_not_object"
    if "pass" not in (rep.get("aggregate") or {}):
        return False, "aggregate.pass_missing"
    if not isinstance(rep.get("probes"), list):
        return False, "probes_not_array"
    return True, ""


def run_first_loop(args: argparse.Namespace) -> int:
    repo_root = Path(args.repo_root).resolve()
    ok_throttle, throttle_reason = anti_repeat_first_loop(repo_root, args.throttle_sec, args.force)
    if not ok_throttle:
        print(json.dumps({"ok": False, "error": throttle_reason, "fail_closed": True}, ensure_ascii=False, indent=2))
        return 2

    ev = Path(args.evidence_dir) if args.evidence_dir.strip() else first_loop_evidence_root()
    ev.mkdir(parents=True, exist_ok=True)

    from tenmon_conversation_acceptance_probe_v2 import build_full_report as build_acceptance_report

    # 1–2: acceptance payload 契約（実測 1 回でキー検証）
    acc_rep, _acc_rec = build_acceptance_report(args.chat_url, (args.thread_id or "").strip() or None)
    c_ok, c_err = verify_acceptance_payload_contract(acc_rep)
    step12 = {
        "step": "01_02_acceptance_payload_contract",
        "ok": c_ok,
        "error": c_err or None,
        "observed_keys": {k: k in acc_rep for k in ("ok", "acceptance_ok", "probe_complete_ok")},
    }
    (ev / "step_01_02_acceptance_payload_contract.json").write_text(
        json.dumps(step12, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (ev / "step_01_02_acceptance_report_snapshot.json").write_text(
        json.dumps(acc_rep, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if not c_ok:
        print(
            json.dumps(
                {"ok": False, "first_loop_card": CARD, "step_failed": step12, "evidence_root": str(ev)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 4

    # 3: worldclass runtime 行列（静的＋runtime の別系）
    step3: Dict[str, Any] = {"step": "03_worldclass_runtime", "ok": False, "error": None}
    try:
        from tenmon_chat_ts_worldclass_completion_report_v1 import build_report as build_worldclass_report

        wc = build_worldclass_report(args.chat_rel)
        v = wc.get("verdict") or {}
        step3["ok"] = True
        step3["runtime_observation_mode"] = v.get("runtime_observation_mode")
        step3["resolved_chat_ts_probe_base_url"] = v.get("resolved_chat_ts_probe_base_url")
        step3["chat_ts_runtime_100"] = v.get("chat_ts_runtime_100")
        (ev / "step_03_worldclass_report.json").write_text(
            json.dumps(wc, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        step3["error"] = str(e)
        (ev / "step_03_worldclass_error.txt").write_text(str(e), encoding="utf-8")

    (ev / "step_03_worldclass_runtime.json").write_text(
        json.dumps(step3, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 4–10: lane（acceptance 再実行含む・build / restart / audit / reprobe）
    from tenmon_conversation_quality_lane_v1 import run_lane

    lane_ns = Namespace(
        policy_path=args.policy_path,
        repo_root=str(repo_root),
        ledger=args.ledger,
        target_file=args.target_file,
        chat_url=args.chat_url,
        thread_id=args.thread_id,
        run_id=args.run_id.strip() or f"fl-{uuid.uuid4().hex[:12]}",
        run_build=True,
        build_timeout=args.build_timeout,
        reprobe_after_build=True,
        require_audit=args.require_audit,
        always_evidence=True,
        evidence_dir=str(ev),
        max_same_card_invocations=args.max_lane_same_card,
        force=args.force_lane,
        restart_after_build=args.restart_after_build,
        quiet=True,
    )
    lane_rc = run_lane(lane_ns)

    final_rc = int(lane_rc)
    if not step3.get("ok"):
        final_rc = max(final_rc, 5)

    lane_report_path = ev / "lane_report.json"
    lane_report: Dict[str, Any] = {}
    if lane_report_path.is_file():
        try:
            lane_report = json.loads(lane_report_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            lane_report = {}

    summary = {
        "schema": "tenmon_conversation_quality_autofix_first_loop_v1",
        "version": VERSION,
        "cardName": CARD,
        "generatedAt": _utc_now_iso(),
        "evidence_root": str(ev),
        "final_exit_code": final_rc,
        "steps": {
            "01_02_payload_contract": step12,
            "03_worldclass_runtime": step3,
            "04_10_lane_exit_code": lane_rc,
        },
        "lane_result_status": lane_report.get("result_status"),
        "acceptance_ok": lane_report.get("acceptance_ok"),
        "ledger_append_error": lane_report.get("ledger_append_error"),
        "patch_policy_deny_reason": lane_report.get("patch_policy_deny_reason"),
        "low_risk_patch_plan_suppressed": lane_report.get("low_risk_patch_plan_suppressed_by_policy"),
    }
    (ev / "first_loop_report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    p = repo_root / _STATE_REL
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {
                    "card": CARD,
                    "utc": _utc_now_iso(),
                    "evidence_root": str(ev),
                    "lane_rc": lane_rc,
                    "final_rc": final_rc,
                },
                ensure_ascii=False,
            )
            + "\n"
        )

    print(json.dumps({"ok": final_rc == 0, "summary": summary}, ensure_ascii=False, indent=2))

    return final_rc


def main() -> int:
    ap = argparse.ArgumentParser(description="Conversation quality autofix — first single loop")
    ap.add_argument("--repo-root", default=str(_REPO_ROOT))
    ap.add_argument("--evidence-dir", default="", help="default: /var/log/tenmon/card_<CARD>/<TS>/")
    ap.add_argument("--chat-url", default="")
    ap.add_argument("--thread-id", default="")
    ap.add_argument("--chat-rel", default="api/src/routes/chat.ts", help="worldclass build_report")
    ap.add_argument("--ledger", default="")
    ap.add_argument("--target-file", default="api/src/routes/chat.ts")
    ap.add_argument("--policy-path", default="")
    ap.add_argument("--run-id", default="")
    ap.add_argument("--build-timeout", default="600")
    ap.add_argument("--require-audit", action="store_true")
    ap.add_argument("--restart-after-build", action="store_true", help="lane: systemctl after build if env allows")
    ap.add_argument("--throttle-sec", type=int, default=120, help="min seconds between same-card runs (0=off)")
    ap.add_argument("--force", action="store_true", help="bypass first-loop throttle")
    ap.add_argument("--force-lane", action="store_true", help="bypass lane anti-repeat")
    ap.add_argument("--max-lane-same-card", type=int, default=0, help="0=off lane anti-repeat for this invocation")
    args = ap.parse_args()
    return run_first_loop(args)


if __name__ == "__main__":
    raise SystemExit(main())
