#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1

朝の single-source: overnight / heartbeat / scorecard / queue / bundle / morning list を観測し、
再武装は next_queue_rearm.json の候補のみ（remote_cursor_queue.json は書き換えない）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_CLOSED_LOOP_REAL_EXECUTION_SEAL_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ。"
OUT_REPORT_JSON = "daybreak_report.json"
OUT_REPORT_MD = "daybreak_report.md"
OUT_REARM = "next_queue_rearm.json"
OUT_REARM_SUMMARY = "daybreak_report_and_next_queue_rearm_summary.json"

CARD_RE = re.compile(r"TENMON_[A-Z0-9_]+_CURSOR_AUTO_V1")
PIPELINE_STEPS = (
    "forensic",
    "queue_dedup_backpressure",
    "role_router",
    "patch_plan_bridge",
    "build_probe_rollback_autoguard",
    "acceptance_gated_commit_requeue",
    "result_bind",
)


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def parse_iso(ts: str | None) -> datetime | None:
    if not ts or not isinstance(ts, str):
        return None
    s = ts.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def router_objective(step: dict[str, Any]) -> str:
    args = step.get("args") if isinstance(step.get("args"), list) else []
    for i, a in enumerate(args):
        if str(a) == "--objective" and i + 1 < len(args):
            return str(args[i + 1])
    return ""


def cards_for_cycle(cycle: dict[str, Any]) -> list[str]:
    steps = cycle.get("steps") if isinstance(cycle.get("steps"), dict) else {}
    rr = steps.get("role_router") if isinstance(steps.get("role_router"), dict) else {}
    return list(dict.fromkeys(CARD_RE.findall(router_objective(rr))))


def step_failed(step: dict[str, Any]) -> bool:
    if step.get("skipped"):
        return False
    return step.get("ok") is not True


def cycle_commit_path_ok(cycle: dict[str, Any]) -> bool:
    steps = cycle.get("steps") if isinstance(cycle.get("steps"), dict) else {}
    for k in ("acceptance_gated_commit_requeue", "result_bind"):
        st = steps.get(k) if isinstance(steps.get(k), dict) else {}
        if st.get("skipped"):
            continue
        if not st.get("ok"):
            return False
    return True


def cycle_any_hard_fail(cycle: dict[str, Any]) -> bool:
    steps = cycle.get("steps") if isinstance(cycle.get("steps"), dict) else {}
    for k in PIPELINE_STEPS:
        st = steps.get(k) if isinstance(steps.get(k), dict) else {}
        if step_failed(st):
            return True
    cons = steps.get("consensus") if isinstance(steps.get("consensus"), dict) else {}
    if step_failed(cons):
        return True
    sc = steps.get("scorecard") if isinstance(steps.get("scorecard"), dict) else {}
    if step_failed(sc):
        return True
    return False


def queue_items(queue: dict[str, Any]) -> list[dict[str, Any]]:
    raw = queue.get("items")
    return [x for x in raw if isinstance(x, dict)] if isinstance(raw, list) else []


def bundle_entries(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    raw = bundle.get("entries")
    return [x for x in raw if isinstance(x, dict)] if isinstance(raw, list) else []


def md_bullets(cards: list[str], empty_line: str) -> list[str]:
    return [f"- `{c}`" for c in cards] if cards else [empty_line]


def run_py(script: Path, cwd: Path, timeout: int = 600) -> dict[str, Any]:
    if not script.is_file():
        return {"ok": False, "exit_code": None, "missing": True, "script": str(script)}
    try:
        p = subprocess.run(
            [sys.executable, str(script)],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "script": str(script),
            "stderr_tail": (p.stderr or "")[-2000:],
        }
    except Exception as e:
        return {"ok": False, "exit_code": None, "script": str(script), "error": f"{type(e).__name__}: {e}"}


def _summary_quality_score(js: dict[str, Any]) -> int:
    if not isinstance(js, dict) or not js:
        return -1
    score = 0
    br = js.get("blocked_reason")
    if isinstance(br, list) and [str(x) for x in br] == ["end_local_reached"]:
        score += 8
    if js.get("last_master_pass") is True:
        score += 3
    cycles = js.get("cycles")
    if isinstance(cycles, int) and cycles > 1:
        score += 2
    if js.get("finished_normally") is True:
        score += 2
    if parse_iso(str(js.get("generated_at") or "")) is not None or parse_iso(str(js.get("finished_at") or "")) is not None:
        score += 1
    return score


def pick_best_overnight_summary_path(auto: Path, configured: Path) -> Path:
    candidates = [
        configured,
        auto / "tenmon_continuous_self_improvement_overnight_daemon_summary.json",
        auto / "overnight_full_pdca_summary.json",
    ]
    best_path = configured
    best_key = (-9999, -1.0)
    for p in candidates:
        js = read_json(p)
        st = p.stat() if p.is_file() else None
        mtime = st.st_mtime if st else -1.0
        key = (_summary_quality_score(js), mtime)
        if key > best_key:
            best_key = key
            best_path = p
    return best_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    p_summary_cfg = Path(os.environ.get("TENMON_DAYBREAK_OVERNIGHT_SUMMARY", str(auto / "overnight_full_pdca_summary.json")))
    p_summary = pick_best_overnight_summary_path(auto, p_summary_cfg)
    p_hb = Path(os.environ.get("TENMON_DAYBREAK_HEARTBEAT", str(auto / "overnight_full_pdca_heartbeat.json")))
    p_score = Path(os.environ.get("TENMON_DAYBREAK_SCORECARD", str(auto / "tenmon_worldclass_acceptance_scorecard.json")))
    p_queue = Path(os.environ.get("TENMON_DAYBREAK_REMOTE_QUEUE", str(auto / "remote_cursor_queue.json")))
    p_bundle = Path(os.environ.get("TENMON_DAYBREAK_RESULT_BUNDLE", str(auto / "remote_cursor_result_bundle.json")))
    p_morning = Path(os.environ.get("TENMON_DAYBREAK_MORNING_APPROVAL_LIST", str(auto / "tenmon_high_risk_morning_approval_list.json")))
    p_forensic = Path(os.environ.get("TENMON_DAYBREAK_FORENSIC", str(auto / "tenmon_autonomy_current_state_forensic.json")))
    p_priority = Path(
        os.environ.get(
            "TENMON_DAYBREAK_DIALOGUE_PRIORITY_LOOP",
            str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"),
        )
    )

    overnight = read_json(p_summary)
    hb = read_json(p_hb)
    scorecard = read_json(p_score)
    queue = read_json(p_queue)
    bundle = read_json(p_bundle)
    morning = read_json(p_morning)
    forensic = read_json(p_forensic)
    priority = read_json(p_priority)

    # latest truth refresh (best-effort, no fake run)
    refresh_steps = {
        "rejudge": run_py(auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py", repo / "api", timeout=900),
        "dialogue_priority": run_py(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py", repo / "api", timeout=900),
    }
    # refresh 後の値を再読込
    scorecard = read_json(p_score)
    forensic = read_json(p_forensic)
    priority = read_json(p_priority)

    overnight_started = parse_iso(str(overnight.get("started_at") or ""))
    score_gen = parse_iso(str(scorecard.get("generated_at") or ""))
    forensic_gen = parse_iso(str(forensic.get("generated_at") or ""))

    scorecard_stale_vs_overnight = False
    if overnight_started and score_gen and score_gen < overnight_started:
        scorecard_stale_vs_overnight = True

    forensic_stale_vs_overnight = False
    if overnight_started and forensic_gen and forensic_gen < overnight_started:
        forensic_stale_vs_overnight = True

    stale_success_risk_notes: list[str] = []
    if scorecard_stale_vs_overnight:
        stale_success_risk_notes.append(
            "scorecard.generated_at が overnight.started_at より古い — score を「夜間後の最新成功」として扱わない"
        )
    if forensic_stale_vs_overnight:
        stale_success_risk_notes.append(
            "forensic.generated_at が overnight.started_at より古い — next_best / safe_next の参照を stale とみなす"
        )

    tail = overnight.get("cycle_records_tail") if isinstance(overnight.get("cycle_records_tail"), list) else []
    cycles = [c for c in tail if isinstance(c, dict)]
    last_cycle = cycles[-1] if cycles else {}

    last_steps = last_cycle.get("steps") if isinstance(last_cycle.get("steps"), dict) else {}
    sc_step = last_steps.get("scorecard") if isinstance(last_steps.get("scorecard"), dict) else {}
    last_overnight_scorecard_step_failed = bool(sc_step and not sc_step.get("skipped") and sc_step.get("ok") is False)
    if last_overnight_scorecard_step_failed:
        stale_success_risk_notes.append(
            "最終 overnight サイクルで scorecard ステップが ok=false — ファイル上の score も「昨夜整合済み」としては使わない"
        )

    completed: set[str] = set()
    failed: set[str] = set()

    for cy in cycles:
        cs = cards_for_cycle(cy)
        if cycle_commit_path_ok(cy) and cs:
            completed.update(cs)
        if cycle_any_hard_fail(cy) and cs:
            failed.update(cs)

    for it in queue_items(queue):
        st = str(it.get("state") or "")
        card = str(it.get("cursor_card") or "").strip()
        if not card:
            continue
        if st == "executed":
            ca = parse_iso(str(it.get("completed_at") or ""))
            if overnight_started and ca and ca >= overnight_started:
                completed.add(card)
            elif overnight_started is None and ca:
                completed.add(card)
        if st == "rejected":
            failed.add(card)

    for e in bundle_entries(bundle):
        if e.get("acceptance_ok") is False:
            nc = e.get("next_card")
            if isinstance(nc, str):
                m = CARD_RE.search(nc)
                if m:
                    failed.add(m.group(0))
            qid = str(e.get("queue_id") or "")
            for it in queue_items(queue):
                if str(it.get("id") or it.get("job_id") or "") == qid:
                    cc = str(it.get("cursor_card") or "").strip()
                    if cc:
                        failed.add(cc)

    approval_required_cards: list[str] = []
    for it in queue_items(queue):
        if str(it.get("state") or "") == "approval_required":
            cc = str(it.get("cursor_card") or "").strip()
            if cc:
                approval_required_cards.append(cc)
    morning_items = morning.get("items") if isinstance(morning.get("items"), list) else []
    for mi in morning_items:
        if not isinstance(mi, dict):
            continue
        if mi.get("approval_required") is True:
            cid = str(mi.get("card_id") or "").strip()
            if cid:
                approval_required_cards.append(cid)
    approval_required_cards = sorted(set(approval_required_cards))

    ocards = cards_for_cycle(last_cycle) if last_cycle else []

    next_best_card: str | None = None
    next_best_sources: dict[str, Any] = {}
    sc_nb = str(scorecard.get("next_best_card") or scorecard.get("recommended_next_card") or "").strip() or None
    if sc_nb and not scorecard_stale_vs_overnight:
        next_best_card = sc_nb
        next_best_sources["scorecard"] = sc_nb

    fnb = str(forensic.get("next_best_card") or "").strip() or None
    if fnb and not forensic_stale_vs_overnight:
        next_best_sources["forensic"] = fnb
        if not next_best_card:
            next_best_card = fnb

    if ocards:
        next_best_sources["overnight_last_router_objective"] = ocards[0]
        if not next_best_card:
            next_best_card = ocards[0]
    if sc_nb and scorecard_stale_vs_overnight:
        next_best_sources["scorecard_ignored_stale"] = sc_nb

    hb_sig = hb.get("last_signals") if isinstance(hb.get("last_signals"), dict) else {}

    safe_next_cards: list[str] = []
    if isinstance(scorecard.get("safe_next_cards"), list):
        safe_next_cards.extend(
            str(x) for x in scorecard["safe_next_cards"] if isinstance(x, str) and CARD_RE.search(x)
        )
    if not safe_next_cards and isinstance(forensic.get("safe_next_cards"), list) and not forensic_stale_vs_overnight:
        safe_next_cards.extend(
            str(x) for x in forensic["safe_next_cards"] if isinstance(x, str) and CARD_RE.search(x)
        )
    safe_next_cards = list(dict.fromkeys(safe_next_cards))

    manual_gate_cards: list[str] = []
    manual_gate_cards.extend(approval_required_cards)
    if hb_sig.get("manual_review_required_consensus") is True and ocards:
        manual_gate_cards.append(ocards[0])
    manual_gate_cards = sorted(set(manual_gate_cards))

    pr_out = priority.get("outputs") if isinstance(priority.get("outputs"), dict) else {}
    pr_next = str(pr_out.get("next_best_card") or "").strip()
    if pr_next:
        next_best_card = pr_next
        next_best_sources["dialogue_priority_loop"] = pr_next
    pr_safe = pr_out.get("safe_next_cards") if isinstance(pr_out.get("safe_next_cards"), list) else []
    if pr_safe:
        safe_next_cards = list(
            dict.fromkeys([str(x) for x in pr_safe if isinstance(x, str) and CARD_RE.search(str(x))] + safe_next_cards)
        )
    pr_manual = pr_out.get("manual_gate_cards") if isinstance(pr_out.get("manual_gate_cards"), list) else []
    if pr_manual:
        manual_gate_cards = sorted(
            set(manual_gate_cards + [str(x) for x in pr_manual if isinstance(x, str) and CARD_RE.search(str(x))])
        )

    pending_cards: set[str] = set()
    for it in queue_items(queue):
        st = str(it.get("state") or "")
        if st in ("approval_required", "ready", "delivered"):
            cc = str(it.get("cursor_card") or "").strip()
            if cc:
                pending_cards.add(cc)

    queue_rearm_candidates: list[dict[str, Any]] = []

    def add_candidate(obj: dict[str, Any]) -> None:
        for ex in queue_rearm_candidates:
            if ex.get("cursor_card") == obj.get("cursor_card") and ex.get("suggested_action") == obj.get("suggested_action"):
                return
        queue_rearm_candidates.append(obj)

    for c in failed:
        if c in approval_required_cards:
            add_candidate(
                {
                    "cursor_card": c,
                    "suggested_action": "keep_approval_required",
                    "rationale": "失敗観測だが承認待ち — 自動 ready にしない",
                }
            )
        else:
            add_candidate(
                {
                    "cursor_card": c,
                    "suggested_action": "human_review_then_maybe_ready",
                    "rationale": "overnight/bundle/queue からの失敗観測 — 候補のみ（キューは変更しない）",
                }
            )

    if next_best_card and next_best_card not in pending_cards and next_best_card not in approval_required_cards:
        add_candidate(
            {
                "cursor_card": next_best_card,
                "suggested_action": "consider_enqueue_ready",
                "rationale": "next_best が pending に無い — 契約確認のうえ手動で queue へ",
            }
        )

    for c in approval_required_cards:
        add_candidate(
            {
                "cursor_card": c,
                "suggested_action": "await_human_approval",
                "rationale": "approval_required / morning list 観測",
            }
        )

    # 失敗観測を優先（同一カードが両方に載らないようにする）
    completed -= failed

    worldclass_score_percent_observed: float | None = None
    score_trust_for_morning = not scorecard_stale_vs_overnight and not last_overnight_scorecard_step_failed
    if isinstance(scorecard.get("score_percent"), (int, float)) and score_trust_for_morning:
        worldclass_score_percent_observed = float(scorecard["score_percent"])
    elif isinstance(hb_sig.get("worldclass_score_percent"), (int, float)) and score_trust_for_morning:
        worldclass_score_percent_observed = float(hb_sig["worldclass_score_percent"])

    sealed_obs = scorecard.get("sealed_operable_ready")
    world_obs = scorecard.get("worldclass_ready")
    if not score_trust_for_morning:
        sealed_obs = None
        world_obs = None

    report = {
        "card": CARD,
        "generated_at": utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "inputs": {
            "overnight_summary": {"path": str(p_summary), "exists": p_summary.is_file()},
            "heartbeat": {"path": str(p_hb), "exists": p_hb.is_file()},
            "scorecard": {"path": str(p_score), "exists": p_score.is_file(), "generated_at": scorecard.get("generated_at")},
            "remote_queue": {"path": str(p_queue), "exists": p_queue.is_file(), "updatedAt": queue.get("updatedAt")},
            "result_bundle": {"path": str(p_bundle), "exists": p_bundle.is_file(), "updatedAt": bundle.get("updatedAt")},
            "morning_approval_list": {"path": str(p_morning), "exists": p_morning.is_file(), "generated_at": morning.get("generated_at")},
            "forensic_supplemental": {
                "path": str(p_forensic),
                "exists": p_forensic.is_file(),
                "generated_at": forensic.get("generated_at"),
                "note": "safe_next / next_best 補完用の観測のみ（6 入力に追加の single-source 整合）",
            },
        },
        "stale_observation": {
            "scorecard_stale_vs_overnight": scorecard_stale_vs_overnight,
            "forensic_stale_vs_overnight": forensic_stale_vs_overnight,
            "last_overnight_scorecard_step_failed": last_overnight_scorecard_step_failed,
            "overnight_started_at": overnight.get("started_at"),
            "overnight_finished_at": overnight.get("finished_at"),
            "heartbeat_updated_at": hb.get("updated_at"),
        },
        "integrity_notes": stale_success_risk_notes,
        "completed_cards": sorted(completed),
        "failed_cards": sorted(failed),
        "approval_required_cards": approval_required_cards,
        "next_best_card": next_best_card,
        "next_best_resolution": next_best_sources,
        "safe_next_cards": safe_next_cards,
        "manual_gate_cards": manual_gate_cards,
        "dialogue_priority_refresh": {
            "path": str(p_priority),
            "next_best_card": pr_out.get("next_best_card"),
            "safe_next_cards": pr_out.get("safe_next_cards"),
            "manual_gate_cards": pr_out.get("manual_gate_cards"),
        },
        "refresh_steps": refresh_steps,
        "queue_rearm_candidates": queue_rearm_candidates,
        "worldclass_score_percent_observed": worldclass_score_percent_observed,
        "sealed_operable_ready_observed": sealed_obs,
        "worldclass_ready_observed": world_obs,
    }

    rearm_doc = {
        "card": CARD,
        "generated_at": report["generated_at"],
        "contract": "candidates_only — remote_cursor_queue.json は本スクリプトが変更しない",
        "queue_rearm_candidates": queue_rearm_candidates,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
    }

    blocked_reason = overnight.get("blocked_reason")
    blocked_norm = [str(x) for x in blocked_reason] if isinstance(blocked_reason, list) else []
    previous_run_finished_normally = blocked_norm == ["end_local_reached"]
    lock_path = Path(os.environ.get("TENMON_OVERNIGHT_LOCK_FILE", str(auto / ".tenmon_overnight_daemon.lock")))
    stop_path = Path(os.environ.get("TENMON_OVERNIGHT_STOP_FILE", str(auto / "tenmon_overnight_stop.signal")))
    lock_cleared = False
    stop_signal_cleared = False
    if previous_run_finished_normally:
        try:
            lock_path.unlink(missing_ok=True)
            lock_cleared = True
        except Exception:
            lock_cleared = False
        try:
            stop_path.unlink(missing_ok=True)
            stop_signal_cleared = True
        except Exception:
            stop_signal_cleared = False

    next_run_ready = bool(previous_run_finished_normally and lock_cleared and stop_signal_cleared)
    rearm_summary = {
        "card": CARD,
        "generated_at": report["generated_at"],
        "previous_run_finished_normally": previous_run_finished_normally,
        "lock_cleared": lock_cleared,
        "stop_signal_cleared": stop_signal_cleared,
        "next_run_ready": next_run_ready,
        "next_best_card": next_best_card,
        "safe_next_cards": safe_next_cards,
        "manual_gate_cards": manual_gate_cards,
        "previous_blocked_reason": blocked_norm,
        "dialogue_priority_refresh": report["dialogue_priority_refresh"],
    }
    rearm_doc.update(rearm_summary)

    lines = [
        f"# Daybreak report ({CARD})",
        "",
        f"- generated_at: `{report['generated_at']}`",
        f"- next_on_pass: **{NEXT_ON_PASS}**",
        "",
        "## Inputs (観測)",
        "",
    ]
    for k, v in report["inputs"].items():
        if isinstance(v, dict):
            lines.append(f"- **{k}**: `{v.get('path')}` exists={v.get('exists')}")
    lines.extend(
        [
            "",
            "## Stale / 正直性",
            "",
            f"- scorecard_stale_vs_overnight: **{scorecard_stale_vs_overnight}**",
            f"- forensic_stale_vs_overnight: **{forensic_stale_vs_overnight}**",
            f"- last_overnight_scorecard_step_failed: **{last_overnight_scorecard_step_failed}**",
        ]
    )
    for n in stale_success_risk_notes:
        lines.append(f"- ⚠ {n}")
    lines.append("")
    lines.append("## 進んだカード (completed_cards)")
    lines.append("")
    lines.extend(md_bullets(report["completed_cards"], "- _(なし)_"))
    lines.append("")
    lines.append("## 失敗カード (failed_cards)")
    lines.append("")
    lines.extend(md_bullets(report["failed_cards"], "- _(なし)_"))
    lines.append("")
    lines.append("## 承認待ち (approval_required_cards)")
    lines.append("")
    lines.extend(md_bullets(report["approval_required_cards"], "- _(なし)_"))
    lines.append("")
    lines.append("## next_best_card")
    lines.append("")
    lines.append(f"- `{next_best_card}`" if next_best_card else "- _(null)_")
    lines.append(f"- resolution: `{json.dumps(next_best_sources, ensure_ascii=False)}`")
    lines.append("")
    lines.append("## safe_next_cards")
    lines.append("")
    lines.extend(md_bullets(safe_next_cards, "- _(なし)_"))
    lines.append("")
    lines.append("## manual_gate_cards")
    lines.append("")
    lines.extend(md_bullets(manual_gate_cards, "- _(なし)_"))
    lines.append("")
    lines.append("## Queue 再武装候補")
    lines.append("")
    lines.append(f"候補のみ: `{OUT_REARM}`（`remote_cursor_queue.json` は本レポートが変更しない）")
    lines.append("")

    write_json(auto / OUT_REPORT_JSON, report)
    write_text(auto / OUT_REPORT_MD, "\n".join(lines) + "\n")
    write_json(auto / OUT_REARM, rearm_doc)
    write_json(auto / OUT_REARM_SUMMARY, rearm_summary)

    print(
        json.dumps(
            {
                "ok": True,
                "report": str(auto / OUT_REPORT_JSON),
                "rearm": str(auto / OUT_REARM),
                "summary": str(auto / OUT_REARM_SUMMARY),
                "next_run_ready": next_run_ready,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
