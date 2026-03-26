#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1

queued cards を単線化: ゲート通過時のみ next を1本決定。
観測専用（product core 非改変）。
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_single_flight_queue_state.json"
OUT_MD = "tenmon_cursor_single_flight_queue_report.md"
NEXT_ON_PASS = "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_RETRY_CURSOR_AUTO_V1"

REVIEW_FILE_MAX = 120
HIGH_RISK_MAX = 25
QUEUE_PENDING_MAX = 3  # 4枚以上同時待ちを禁止（0..3 許容）
AUTOCOMPACT_MAX_AGE_H = 72.0

HIGH_RISK_SUBSTR = (
    "api/src/routes/chat.ts",
    "api/src/routes/chat_refactor/finalize.ts",
    "web/src/",
)

# 優先順位（小さいほど先）— card_id へマッチ
TIER_RULES: tuple[tuple[re.Pattern[str], int], ...] = (
    (re.compile(r"(WATCH|RESULT_BUNDLE|REMOTE_CURSOR|ACCEPTANCE|FORENSIC|PRIORITY_LOOP|REJUDGE|SEAL_REFRESH)", re.I), 1),
    (re.compile(r"(CONVERSATION_QUALITY|QUALITY_ANALYZER|AUTO_PRIORITY|state_convergence|GENERATED_CARD)", re.I), 2),
    (re.compile(r"(K1_|K1_TRACE|GENERAL_KNOWLEDGE)", re.I), 3),
    (re.compile(r"(SELF_VIEW|FACTUAL_|POLISH|WEATHER_CORRECTION)", re.I), 4),
    (re.compile(r"(WORLDCLASS|DIALOGUE_ACCEPTANCE|LOOP)", re.I), 5),
)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_iso(s: Any) -> datetime | None:
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _git_paths(repo: Path) -> tuple[list[str], bool]:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode != 0:
            return [], False
    except Exception:
        return [], False
    out: list[str] = []
    for line in (r.stdout or "").splitlines():
        line = line.strip("\r")
        if len(line) < 3:
            continue
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[-1].strip()
        if path:
            out.append(path.replace("\\", "/"))
    return out, True


def _classify_git(paths: list[str]) -> dict[str, Any]:
    high = 0
    docs_auto_only = True
    for p in paths:
        pl = p.lower()
        if any(h in p for h in HIGH_RISK_SUBSTR):
            high += 1
            docs_auto_only = False
        elif not (
            pl.startswith("api/docs/")
            or pl.startswith("api/automation/")
            or pl.startswith("api/scripts/")
            or pl.endswith(".md")
            or pl.startswith(".gitignore")
        ):
            docs_auto_only = False
    return {"high_risk_count": high, "auto_accept_candidate": bool(paths) and docs_auto_only and high == 0}


def _tier(card_id: str) -> int:
    for pat, tier in TIER_RULES:
        if pat.search(card_id):
            return tier
    return 99


def _sort_key_cid(card_id: str) -> tuple[int, int, str]:
    """tier 内サブ順 → カード名で deterministic に一意化。"""
    t = _tier(card_id)
    sub = 0
    if t == 3:
        if re.search(r"(K1_|K1_TRACE)", card_id, re.I):
            sub = 0
        elif re.search(r"GENERAL_KNOWLEDGE", card_id, re.I):
            sub = 1
        else:
            sub = 5
    return (t, sub, card_id)


def _collect_candidates(repo: Path) -> list[str]:
    auto = repo / "api" / "automation"
    seen: list[str] = []
    loop = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json")
    out = loop.get("outputs") if isinstance(loop.get("outputs"), dict) else {}
    for c in out.get("safe_next_cards") or []:
        if isinstance(c, str) and c.strip():
            seen.append(c.strip())
    nb_loop = out.get("next_best_card")
    if isinstance(nb_loop, str) and nb_loop.strip():
        seen.append(nb_loop.strip())
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    nb = forensic.get("next_best_card")
    if isinstance(nb, str) and nb.strip():
        seen.append(nb.strip())
    for c in forensic.get("safe_next_cards") or []:
        if isinstance(c, str) and c.strip():
            seen.append(c.strip())
    sc = _read_json(auto / "tenmon_conversation_quality_priority_summary.json")
    for c in sc.get("recommended_next_cards") or []:
        if isinstance(c, str) and c.strip():
            seen.append(c.strip())
    conv = _read_json(auto / "state_convergence_next_cards.json")
    for c in conv.get("next_cards") or []:
        if isinstance(c, str) and c.strip():
            seen.append(c.strip())
    mainline = _read_json(auto / "tenmon_conversation_worldclass_mainline_selector.json")
    for c in mainline.get("safe_next_cards") or []:
        if isinstance(c, str) and c.strip():
            seen.append(c.strip())
    nb_ml = mainline.get("next_best_card")
    if isinstance(nb_ml, str) and nb_ml.strip():
        seen.append(nb_ml.strip())
    # unique 保持順 → tier 昇順・カード名でソートし先頭 1 本を next に固定
    out_l: list[str] = []
    for x in seen:
        if x not in out_l:
            out_l.append(x)
    out_l.sort(key=_sort_key_cid)
    return out_l


def _pending_queue_items(q: dict[str, Any]) -> list[dict[str, Any]]:
    """主線 single-flight: released_fixture / ignored_fixture は pending に含めない（fixture drain 退避）。"""
    items = q.get("items") if isinstance(q.get("items"), list) else []
    pending_states = frozenset({"approval_required", "ready", "delivered"})
    out: list[dict[str, Any]] = []
    for x in items:
        if not isinstance(x, dict):
            continue
        if str(x.get("state") or "") == "released_fixture":
            continue
        if x.get("ignored_fixture") is True:
            continue
        if str(x.get("state") or "") in pending_states:
            out.append(x)
    return out


def _delivered_without_bundle(queue: dict[str, Any], bundle: dict[str, Any]) -> list[str]:
    items = queue.get("items") if isinstance(queue.get("items"), list) else []
    entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    qids_in_bundle = {str(e.get("queue_id")) for e in entries if isinstance(e, dict)}
    bad: list[str] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        if str(it.get("state") or "") != "delivered":
            continue
        iid = str(it.get("id") or "")
        if iid and iid not in qids_in_bundle:
            bad.append(iid)
    return bad


def _current_card_pipeline(pending: list[dict[str, Any]]) -> Any:
    """approval_required → ready → delivered の順で最古を current とみなす。"""
    order = {"approval_required": 0, "ready": 1, "delivered": 2}

    def _k(x: dict[str, Any]) -> tuple[int, str]:
        st = str(x.get("state") or "")
        return (order.get(st, 99), str(x.get("createdAt") or ""))

    if not pending:
        return None
    head = sorted(pending, key=_k)[0]
    return head.get("cursor_card")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    paths, git_ok = _git_paths(repo)
    n_changed = len(paths)
    cls = _classify_git(paths)
    high_n = int(cls["high_risk_count"])

    ac_path = auto / "tenmon_cursor_worktree_autocompact_summary.json"
    ac = _read_json(ac_path)
    ac_time = _parse_iso(ac.get("generated_at"))
    ac_stale = ac_time is None or (datetime.now(timezone.utc) - ac_time).total_seconds() > AUTOCOMPACT_MAX_AGE_H * 3600
    ac_review_ok = not bool((ac.get("review_blockers") or {}).get("review_file_count_gt_120")) if ac else False
    autocompact_ok = bool(ac) and not ac_stale and ac_review_ok

    q = _read_json(auto / "remote_cursor_queue.json")
    b = _read_json(auto / "remote_cursor_result_bundle.json")
    pending = _pending_queue_items(q)
    queue_depth = len(pending)

    delivered_gap = _delivered_without_bundle(q, b)

    blocked: list[str] = []
    if not git_ok:
        blocked.append("git_status_unavailable")
    if n_changed > REVIEW_FILE_MAX:
        blocked.append(f"review_pressure:changed_files>{REVIEW_FILE_MAX}")
    if high_n > HIGH_RISK_MAX:
        blocked.append(f"high_risk_count>{HIGH_RISK_MAX}")
    if queue_depth > QUEUE_PENDING_MAX:
        blocked.append(f"queue_pending>{QUEUE_PENDING_MAX}")
    if not autocompact_ok:
        if not ac:
            blocked.append("autocompact_summary_missing_or_stale")
        elif ac_stale:
            blocked.append("autocompact_summary_stale_run_tenmon_cursor_worktree_autocompact_v1")
        elif not ac_review_ok:
            blocked.append("autocompact_review_file_count_gt_120_run_autocompact_first")
    if delivered_gap:
        blocked.append("delivered_queue_ids_without_bundle_entry:" + ",".join(delivered_gap[:8]))

    rp_git = min(1.0, n_changed / float(REVIEW_FILE_MAX)) if REVIEW_FILE_MAX else 0.0
    rp_high = min(1.0, high_n / float(HIGH_RISK_MAX)) if HIGH_RISK_MAX else 0.0
    rp_queue = min(1.0, queue_depth / float(QUEUE_PENDING_MAX)) if QUEUE_PENDING_MAX else 0.0
    review_pressure = round(max(rp_git, rp_high, rp_queue), 4)

    candidates = _collect_candidates(repo)
    current_card = _current_card_pipeline(pending)

    next_card: str | None = None
    next_allowed = len(blocked) == 0
    if next_allowed and candidates:
        next_card = candidates[0]

    state: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "current_card": current_card,
        "queued_cards": [str(x.get("cursor_card") or "") for x in pending if x.get("cursor_card")][:16],
        "queue_pending_count": queue_depth,
        "blocked_reason": blocked,
        "changed_file_count": n_changed,
        "review_pressure": review_pressure,
        "review_pressure_detail": {
            "changed_files_ratio": round(rp_git, 4),
            "high_risk_ratio": round(rp_high, 4),
            "queue_pending_ratio": round(rp_queue, 4),
        },
        "next_card_allowed": next_allowed,
        "next_card": next_card,
        "candidates_ranked": candidates[:24],
        "gates": {
            "git_status_ok": git_ok,
            "review_file_max": REVIEW_FILE_MAX,
            "high_risk_max": HIGH_RISK_MAX,
            "queue_pending_max": QUEUE_PENDING_MAX,
            "autocompact_present": bool(ac),
            "autocompact_stale": ac_stale,
            "autocompact_review_ok": ac_review_ok,
        },
        "git_classification": cls,
        "manual_review_recommended": high_n > 0,
        "inputs": {
            "autocompact_summary": str(ac_path),
            "remote_queue": str(auto / "remote_cursor_queue.json"),
            "result_bundle": str(auto / "remote_cursor_result_bundle.json"),
            "worldclass_loop": str(auto / "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json"),
            "forensic": str(auto / "tenmon_autonomy_current_state_forensic.json"),
            "conversation_quality": str(auto / "tenmon_conversation_quality_priority_summary.json"),
            "state_convergence": str(auto / "state_convergence_next_cards.json"),
            "worldclass_mainline_selector": str(auto / "tenmon_conversation_worldclass_mainline_selector.json"),
        },
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{state['generated_at']}`",
        f"- **next_card_allowed**: `{next_allowed}`",
        f"- **next_card**: `{next_card}`",
        f"- **changed_file_count**: {n_changed}",
        f"- **review_pressure**: {review_pressure}",
        f"- **queue_pending_count**: {queue_depth}",
        "",
        "## blocked_reason",
        "",
    ]
    for br in blocked:
        md.append(f"- {br}")
    if not blocked:
        md.append("- (none)")
    md.extend(["", "## Queued (pending states)", ""])
    for qc in state["queued_cards"][:12]:
        md.append(f"- `{qc}`")
    md.extend(
        [
            "",
            "## chain",
            "",
            f"- **next_on_pass**: `{NEXT_ON_PASS}`",
            f"- **retry_card** (fail 時 1 枚): `{RETRY_CARD}`",
            f"- {NEXT_ON_FAIL_NOTE}",
            "",
        ]
    )
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(auto / OUT_JSON),
                "next_card_allowed": next_allowed,
                "blocked_reason": blocked,
                "current_card": current_card,
                "queued_cards": state["queued_cards"],
                "next_card": next_card,
                "review_pressure": review_pressure,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
