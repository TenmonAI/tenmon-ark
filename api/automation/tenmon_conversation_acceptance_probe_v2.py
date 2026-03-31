#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_ACCEPTANCE_PROBE_V2_CURSOR_AUTO_V1

会話品質 acceptance: routeReason / center / continuity / grounding / surface を
オブザーバブルに採点。runner と scorer はモジュール内で分離（同一ファイル・最小diff）。

PASS（aggregate）:
- 7 本中 6 本以上が per-probe 全項目合格
- いずれか 1 本でも generic drift 強発生 → 全体 FAIL
- surface_min_density_ok が True の本数が 5 未満 → 全体 FAIL

per-probe 合格には route_reason_ok / center_label_ok / continuity_ok を含む全採点項目が True。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_ACCEPTANCE_PROBE_V2"
VERSION = 2
PROBE_SET_VERSION = 1
DEFAULT_BASE_URL = "http://127.0.0.1:3000"

# --- 固定 7 本（central canon 改変禁止のためコード内定数のみ） ---
FIXED_PROBES: List[Dict[str, str]] = [
    {"id": "p1_lotus_what", "message": "法華経とは"},
    {"id": "p2_kotodama_what", "message": "言霊とは何か"},
    {"id": "p3_continuity_one_point", "message": "前の返答を受けて要点を一つだけ継続して"},
    {"id": "p4_kukai_vs_secretary", "message": "空海と言霊秘書はどう違うか"},
    {"id": "p5_grounded_concise", "message": "根拠つきで簡潔に"},
    {"id": "p6_progress_check", "message": "今の進め方は正しいか"},
    {"id": "p7_lotus_core_one_tier", "message": "法華経の核心を一段で"},
]

_GENERIC_PREAMBLE_MARKERS = (
    "この問いについて、今回は分析の立場で答えます。",
    "続きが求められているようですね。",
    "いまの答えは、典拠は",
    "一貫の手がかりは、",
)

_MIN_BODY_LEN = 80
_MIN_CONTINUITY_BODY = 100
_STRONG_DRIFT_THRESHOLD = 2
_SURFACE_PASS_MIN_SCORE = 3
_SURFACE_LONG_FALLBACK = 320


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _safe_card_log_segment(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", (name or "CARD").strip())
    return s[:160] or "CARD"


def card_log_dir(ts: str | None = None) -> Path:
    t = ts or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return Path("/var/log/tenmon") / f"card_{_safe_card_log_segment(CARD)}" / t


def resolve_probe_base_url() -> Tuple[str, Dict[str, Any]]:
    raw = (os.environ.get("CHAT_TS_PROBE_BASE_URL") or "").strip()
    resolved = (raw.rstrip("/") if raw else DEFAULT_BASE_URL.rstrip("/"))
    meta = {
        "CHAT_TS_PROBE_BASE_URL_env_set": bool(raw),
        "resolved_base_url": resolved,
        "default_base_url_applied": not bool(raw),
    }
    return resolved, meta


# =============================================================================
# Runner（HTTP / 生レスポンス収集のみ）
# =============================================================================


def _post_chat_full_json(chat_url: str, message: str, thread_id: str, timeout: float = 45.0) -> Dict[str, Any]:
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            data = json.loads(raw)
            return {"ok": True, "http_status": getattr(r, "status", 200), "raw": data, "raw_text": raw}
    except urllib.error.HTTPError as e:
        try:
            b = e.read().decode("utf-8", errors="replace")
        except Exception:
            b = ""
        return {"ok": False, "error": f"HTTP {e.code}", "http_status": e.code, "raw_text": b}
    except Exception as e:
        return {"ok": False, "error": str(e), "http_status": None, "raw_text": ""}


def discover_chat_post_url(base: str, timeout: float = 12.0) -> Optional[str]:
    b = base.rstrip("/")
    for path in ("/chat", "/api/chat"):
        url = b + path
        r = _post_chat_full_json(url, "ping", "probe-discovery-cap-v2", timeout=timeout)
        if r.get("ok"):
            return url
    return None


@dataclass
class ProbeRunRecord:
    probe_id: str
    message: str
    thread_id: str
    chat_url: str
    runner_ok: bool
    runner_error: str
    raw_response: Any = None
    raw_text_snippet: str = ""


def run_probe_matrix(
    base_url: str,
    chat_url_override: str = "",
    thread_id: Optional[str] = None,
    on_probe: Optional[Callable[[ProbeRunRecord], None]] = None,
) -> Tuple[List[ProbeRunRecord], str, Optional[str]]:
    """
    7 本を同一 thread で順次実行（継続 probe の実測用）。
    Returns: (records, chat_url_used, error_if_undiscovered)
    """
    tid = thread_id or f"cap-v2-{uuid.uuid4().hex[:12]}"
    chat_url = (chat_url_override or "").strip().rstrip("/") or ""
    err: Optional[str] = None
    if not chat_url:
        chat_url = discover_chat_post_url(base_url) or ""
    if not chat_url:
        err = "chat_url:undiscovered"
        out: List[ProbeRunRecord] = []
        for p in FIXED_PROBES:
            rec = ProbeRunRecord(
                probe_id=p["id"],
                message=p["message"],
                thread_id=tid,
                chat_url="",
                runner_ok=False,
                runner_error=err,
            )
            if on_probe:
                on_probe(rec)
            out.append(rec)
        return out, "", err

    records: List[ProbeRunRecord] = []
    for p in FIXED_PROBES:
        r = _post_chat_full_json(chat_url, p["message"], tid)
        raw = r.get("raw") if r.get("ok") else None
        rec = ProbeRunRecord(
            probe_id=p["id"],
            message=p["message"],
            thread_id=tid,
            chat_url=chat_url,
            runner_ok=bool(r.get("ok")),
            runner_error=str(r.get("error") or ""),
            raw_response=raw,
            raw_text_snippet=(r.get("raw_text") or "")[:12000],
        )
        if on_probe:
            on_probe(rec)
        records.append(rec)
    return records, chat_url, None


# =============================================================================
# Scorer（オブザーバブル指標のみ・主観採点なし）
# =============================================================================


def _ku_from_raw(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    df = raw.get("decisionFrame")
    if not isinstance(df, dict):
        return {}
    ku = df.get("ku")
    return ku if isinstance(ku, dict) else {}


def _response_text(raw: Any) -> str:
    if not isinstance(raw, dict):
        return ""
    return str(raw.get("response") or "")


def score_route_reason_ok(ku: Dict[str, Any]) -> Tuple[bool, str]:
    rr = ku.get("routeReason")
    if isinstance(rr, str) and rr.strip():
        return True, rr.strip()
    return False, ""


def score_center_label_ok(ku: Dict[str, Any]) -> Tuple[bool, str]:
    for k in ("centerLabel", "centerKey", "threadCenterKey", "threadCenterLabel"):
        v = ku.get(k)
        if isinstance(v, str) and v.strip():
            return True, k
    for k in ("centerMeaning", "centerClaim", "semanticNucleus"):
        v = ku.get(k)
        if isinstance(v, str) and v.strip():
            return True, k
    tcs = ku.get("thoughtCoreSummary")
    if isinstance(tcs, dict):
        cm = tcs.get("centerMeaning")
        if isinstance(cm, str) and cm.strip():
            return True, "thoughtCoreSummary.centerMeaning"
    return False, ""


def score_continuity_ok(probe_id: str, ku: Dict[str, Any], text: str) -> Tuple[bool, str]:
    rr = str(ku.get("routeReason") or "").strip()
    if probe_id == "p3_continuity_one_point":
        if rr == "CONTINUITY_ROUTE_HOLD_V1":
            return True, "route_continuity_hold"
        hints = ("前", "さき", "返答", "要点", "踏まえ", "続き", "いまの")
        if len(text.strip()) >= _MIN_CONTINUITY_BODY and sum(1 for h in hints if h in text) >= 2:
            return True, "text_continuity_heuristic"
        return False, "continuity_probe_unmet"
    if len(text.strip()) >= 40:
        return True, "default_min_body"
    return False, "body_too_short_for_coherence"


def score_grounding_mode_ok(raw: Dict[str, Any], ku: Dict[str, Any], text: str) -> Tuple[bool, str]:
    ev = raw.get("evidence")
    if ev not in (None, {}, []):
        return True, "top_level_evidence"
    if isinstance(ku.get("groundingSelector"), dict) and ku["groundingSelector"]:
        return True, "groundingSelector"
    gp = str(ku.get("grounding_policy") or "").strip()
    if gp:
        return True, "grounding_policy"
    for k in ("evidenceRefs", "lawsUsed", "evidenceIds", "lawTrace"):
        v = ku.get(k)
        if isinstance(v, list) and len(v) > 0:
            return True, k
    sp = str(ku.get("sourcePack") or "").strip()
    if sp:
        return True, "sourcePack"
    if isinstance(ku.get("binderSummary"), dict) and ku["binderSummary"]:
        return True, "binderSummary"
    # 本文に根拠・典拠の痕跡（存在有無のみ・括弧単独は誤検知になりやすいので除外）
    if "典拠" in text or "根拠" in text or "『" in text:
        return True, "text_grounding_markers"
    return False, "no_grounding_signals"


def score_surface_min_density_ok(text: str) -> Tuple[bool, int, str]:
    score = 0
    if "【見立て】" in text:
        score += 2
    if "【展開】" in text:
        score += 2
    if "【着地】" in text:
        score += 2
    score += min(text.count("・"), 5)
    score += min(len(text.splitlines()), 12) // 3
    ok = score >= _SURFACE_PASS_MIN_SCORE or len(text) >= _SURFACE_LONG_FALLBACK
    detail = f"score={score},len={len(text)}"
    return ok, score, detail


def score_generic_drift(text: str) -> Tuple[bool, int, bool]:
    """Returns: (not_generic_drift_ok, hit_count, is_strong_drift)."""
    hits = sum(1 for m in _GENERIC_PREAMBLE_MARKERS if m in text)
    if "（補助）次の一手" in text:
        hits += 1
    strong = hits >= _STRONG_DRIFT_THRESHOLD
    ok = hits == 0
    return ok, hits, strong


_STEP_PAT = re.compile(
    r"(次の一手|次に|まず|ステップ|【着地】|①|1[\.．、]\s*\S)",
    re.UNICODE,
)


def score_one_step_present(text: str) -> Tuple[bool, str]:
    if _STEP_PAT.search(text):
        return True, "step_marker"
    if len(text) >= 380:
        return True, "long_substantive"
    return False, "no_step_signal"


_EMPTY_CLAIM_PAT = re.compile(
    r"^(はい|いいえ|了解|わかりました|OK|Ok|ok)[。．!！?\s]*$",
    re.UNICODE,
)


def score_empty_claim_forbidden(text: str) -> Tuple[bool, str]:
    t = text.strip()
    if len(t) < 8:
        return False, "nearly_empty"
    if _EMPTY_CLAIM_PAT.match(t):
        return False, "trivial_ack_only"
    return True, "substantive"


def score_over_short_forbidden(text: str) -> Tuple[bool, str]:
    if len(text.strip()) >= _MIN_BODY_LEN:
        return True, f">={_MIN_BODY_LEN}"
    return False, f"len={len(text.strip())}"


@dataclass
class ProbeScoreCard:
    probe_id: str
    message: str
    thread_id: str
    runner_ok: bool
    runner_error: str
    route_reason_ok: bool
    route_reason_detail: str
    center_label_ok: bool
    center_label_detail: str
    continuity_ok: bool
    continuity_detail: str
    grounding_mode_ok: bool
    grounding_detail: str
    surface_min_density_ok: bool
    surface_score: int
    surface_detail: str
    not_generic_drift: bool
    generic_hits: int
    generic_strong: bool
    one_step_present: bool
    one_step_detail: str
    empty_claim_forbidden: bool
    empty_claim_detail: str
    over_short_forbidden: bool
    over_short_detail: str
    probe_pass: bool
    reasons_fail: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = {k: v for k, v in self.__dict__.items() if not k.startswith("_")}
        return d


def score_probe_record(rec: ProbeRunRecord) -> ProbeScoreCard:
    reasons: List[str] = []
    if not rec.runner_ok or rec.raw_response is None:
        card = ProbeScoreCard(
            probe_id=rec.probe_id,
            message=rec.message,
            thread_id=rec.thread_id,
            runner_ok=False,
            runner_error=rec.runner_error,
            route_reason_ok=False,
            route_reason_detail="",
            center_label_ok=False,
            center_label_detail="",
            continuity_ok=False,
            continuity_detail="runner_fail",
            grounding_mode_ok=False,
            grounding_detail="runner_fail",
            surface_min_density_ok=False,
            surface_score=0,
            surface_detail="runner_fail",
            not_generic_drift=False,
            generic_hits=0,
            generic_strong=False,
            one_step_present=False,
            one_step_detail="runner_fail",
            empty_claim_forbidden=False,
            empty_claim_detail="runner_fail",
            over_short_forbidden=False,
            over_short_detail="runner_fail",
            probe_pass=False,
            reasons_fail=["runner_not_ok"],
        )
        return card

    raw = rec.raw_response
    assert isinstance(raw, dict)
    text = _response_text(raw)
    ku = _ku_from_raw(raw)

    rr_ok, rr_d = score_route_reason_ok(ku)
    if not rr_ok:
        reasons.append("route_reason_ok")

    cl_ok, cl_d = score_center_label_ok(ku)
    if not cl_ok:
        reasons.append("center_label_ok")

    cont_ok, cont_d = score_continuity_ok(rec.probe_id, ku, text)
    if not cont_ok:
        reasons.append("continuity_ok")

    gr_ok, gr_d = score_grounding_mode_ok(raw, ku, text)
    if not gr_ok:
        reasons.append("grounding_mode_ok")

    surf_ok, surf_s, surf_d = score_surface_min_density_ok(text)
    if not surf_ok:
        reasons.append("surface_min_density_ok")

    gen_ok, gen_hits, gen_strong = score_generic_drift(text)
    if not gen_ok:
        reasons.append("not_generic_drift")

    step_ok, step_d = score_one_step_present(text)
    if not step_ok:
        reasons.append("one_step_present")

    emp_ok, emp_d = score_empty_claim_forbidden(text)
    if not emp_ok:
        reasons.append("empty_claim_forbidden")

    short_ok, short_d = score_over_short_forbidden(text)
    if not short_ok:
        reasons.append("over_short_forbidden")

    probe_pass = len(reasons) == 0 and not gen_strong

    return ProbeScoreCard(
        probe_id=rec.probe_id,
        message=rec.message,
        thread_id=rec.thread_id,
        runner_ok=True,
        runner_error="",
        route_reason_ok=rr_ok,
        route_reason_detail=rr_d,
        center_label_ok=cl_ok,
        center_label_detail=cl_d,
        continuity_ok=cont_ok,
        continuity_detail=cont_d,
        grounding_mode_ok=gr_ok,
        grounding_detail=gr_d,
        surface_min_density_ok=surf_ok,
        surface_score=surf_s,
        surface_detail=surf_d,
        not_generic_drift=gen_ok,
        generic_hits=gen_hits,
        generic_strong=gen_strong,
        one_step_present=step_ok,
        one_step_detail=step_d,
        empty_claim_forbidden=emp_ok,
        empty_claim_detail=emp_d,
        over_short_forbidden=short_ok,
        over_short_detail=short_d,
        probe_pass=probe_pass,
        reasons_fail=reasons + (["generic_strong_drift"] if gen_strong else []),
    )


@dataclass
class AggregateVerdict:
    pass_aggregate: bool
    probes_passing: int
    probes_total: int
    surface_density_pass_count: int
    any_strong_generic_drift: bool
    fail_codes: List[str]
    ledger_meta: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pass": self.pass_aggregate,
            "probes_passing": self.probes_passing,
            "probes_total": self.probes_total,
            "surface_density_pass_count": self.surface_density_pass_count,
            "any_strong_generic_drift": self.any_strong_generic_drift,
            "fail_codes": self.fail_codes,
            "ledger_meta": self.ledger_meta,
        }


def aggregate_probe_scores(cards: List[ProbeScoreCard]) -> AggregateVerdict:
    n = len(cards)
    passing = sum(1 for c in cards if c.probe_pass)
    surf_ok = sum(1 for c in cards if c.surface_min_density_ok)
    any_strong = any(c.generic_strong for c in cards)
    fail_codes: List[str] = []

    if any_strong:
        fail_codes.append("generic_drift_strong_any_probe")
    if surf_ok < 5:
        fail_codes.append("surface_min_density_ok_count_lt_5")
    if passing < 6:
        fail_codes.append("probe_pass_count_lt_6")

    ok = not fail_codes
    ledger_meta = {
        "card": CARD,
        "schema": "conversation_acceptance_probe_v2_aggregate_v1",
        "version": VERSION,
        "probe_set_version": PROBE_SET_VERSION,
        "generatedAt": _utc_now_iso(),
        "thresholds": {
            "min_probe_pass": 6,
            "min_surface_density_pass": 5,
            "strong_generic_hits": _STRONG_DRIFT_THRESHOLD,
            "min_body_len": _MIN_BODY_LEN,
        },
    }
    return AggregateVerdict(
        pass_aggregate=ok,
        probes_passing=passing,
        probes_total=n,
        surface_density_pass_count=surf_ok,
        any_strong_generic_drift=any_strong,
        fail_codes=fail_codes,
        ledger_meta=ledger_meta,
    )


# =============================================================================
# CLI / 成果物保存
# =============================================================================


def build_full_report(
    chat_url_override: str = "",
    thread_id: Optional[str] = None,
    on_probe: Optional[Callable[[ProbeRunRecord], None]] = None,
) -> Tuple[Dict[str, Any], List[ProbeRunRecord]]:
    base, bootstrap = resolve_probe_base_url()

    def _wrap(rec: ProbeRunRecord) -> None:
        if on_probe:
            on_probe(rec)

    records, chat_url, disc_err = run_probe_matrix(base, chat_url_override, thread_id, on_probe=_wrap)
    cards = [score_probe_record(r) for r in records]
    agg = aggregate_probe_scores(cards)
    probes_list = [c.to_dict() for c in cards]
    agg_dict = agg.to_dict()
    acceptance_ok = bool(agg_dict.get("pass"))
    probe_complete_ok = (not disc_err) and bool(probes_list) and all(bool(p.get("runner_ok")) for p in probes_list)

    report = {
        "version": VERSION,
        "cardName": CARD,
        "probeSetVersion": PROBE_SET_VERSION,
        "generatedAt": _utc_now_iso(),
        "bootstrap": bootstrap,
        "chat_url_used": chat_url or None,
        "discovery_error": disc_err,
        "thread_id": records[0].thread_id if records else thread_id,
        "probes": probes_list,
        "aggregate": agg_dict,
        "regression_ledger_hint": {
            "primary_key": "probe_id",
            "per_probe_scores": [c.probe_id for c in cards],
            "aggregate_schema": agg.ledger_meta.get("schema"),
        },
        # TENMON_CONVERSATION_QUALITY_AUTOFIX_LANE_V1: 機械可読ゲート
        "ok": probe_complete_ok,
        "acceptance_ok": acceptance_ok,
        "probe_complete_ok": probe_complete_ok,
    }
    return report, records


def _write_artifacts(root: Path, report: Dict[str, Any], raw_records: List[ProbeRunRecord]) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for rec in raw_records:
        if rec.raw_response is not None:
            (root / f"raw_probe_{rec.probe_id}.json").write_text(
                json.dumps(rec.raw_response, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    (root / "scores_per_probe.json").write_text(
        json.dumps(report["probes"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (root / "aggregate_verdict.json").write_text(
        json.dumps(report["aggregate"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (root / "run_summary.json").write_text(
        json.dumps(
            {
                "version": VERSION,
                "cardName": CARD,
                "generatedAt": report.get("generatedAt"),
                "bootstrap": report.get("bootstrap"),
                "chat_url_used": report.get("chat_url_used"),
                "aggregate_pass": report["aggregate"]["pass"],
                "regression_ledger_hint": report.get("regression_ledger_hint"),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (root / "full_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON conversation acceptance probe v2")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--chat-url", default="", help="override POST URL (else discover)")
    ap.add_argument("--thread-id", default="", help="fixed thread id (default: random)")
    ap.add_argument("--output-dir", default="", help="override artifact directory")
    ap.add_argument(
        "--no-card-log-dir",
        action="store_true",
        help="do not write under /var/log/tenmon/card_<CARD>/<TS>/",
    )
    args = ap.parse_args()

    tid = args.thread_id.strip() or None
    records_out: List[ProbeRunRecord] = []

    def _capture(rec: ProbeRunRecord) -> None:
        records_out.append(rec)

    report, _records = build_full_report(args.chat_url, tid, on_probe=_capture)
    agg = report["aggregate"]
    pass_agg = bool(agg.get("pass"))

    log_note: Dict[str, Any] = {}
    if not args.no_card_log_dir:
        out_root = Path(args.output_dir) if args.output_dir.strip() else card_log_dir()
        try:
            _write_artifacts(out_root, report, records_out)
            log_note = {"artifact_dir": str(out_root), "artifact_ok": True}
        except OSError as e:
            log_note = {"artifact_dir": str(out_root), "artifact_ok": False, "error": str(e)}
    else:
        log_note = {"skipped": True, "reason": "--no-card-log-dir"}

    report["artifact_log"] = log_note

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"aggregate": report["aggregate"], "artifact_log": log_note}, ensure_ascii=False, indent=2))

    return 0 if pass_agg else 1


if __name__ == "__main__":
    raise SystemExit(main())
