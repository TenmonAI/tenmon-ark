#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CHAT_TS_WORLDCLASS_COMPLETION_REPORT_V1
TENMON_CONVERSATION_RUNTIME_PROBE_BOOTSTRAP_CURSOR_AUTO_V1

静的観測 + runtime probe 行列（canon 10 本）。CHAT_TS_PROBE_BASE_URL 未設定時は
既定 http://127.0.0.1:3000 に bootstrap し黙殺しない（report に resolved base を記録）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION = Path(__file__).resolve().parent
if str(_AUTOMATION) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION))

from chatts_metrics_v1 import collect_route_reason_hits
from chat_ts_probe_canon_v1 import runtime_probe_full_10

CARD = "TENMON_CHAT_TS_WORLDCLASS_COMPLETION_REPORT_V1"
VERSION = 1
DEFAULT_CHAT = "api/src/routes/chat.ts"
DEFAULT_CHAT_TS_PROBE_BASE_URL = "http://127.0.0.1:3000"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _safe_card_log_segment(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", (name or "CARD").strip())
    return s[:160] or "CARD"


def resolve_chat_ts_probe_base_url() -> tuple[str, Dict[str, Any]]:
    """
    CHAT_TS_PROBE_BASE_URL が空なら既定を採用。resolved URL とメタを返す（黙殺禁止）。
    """
    raw = (os.environ.get("CHAT_TS_PROBE_BASE_URL") or "").strip()
    default_applied = not bool(raw)
    resolved = (raw.rstrip("/") if raw else DEFAULT_CHAT_TS_PROBE_BASE_URL.rstrip("/"))
    meta: Dict[str, Any] = {
        "CHAT_TS_PROBE_BASE_URL_env_set": bool(raw),
        "default_base_url_applied": default_applied,
        "resolved_base_url": resolved,
        "default_base_url": DEFAULT_CHAT_TS_PROBE_BASE_URL,
    }
    return resolved, meta


def card_report_log_dir(ts: str | None = None) -> Path:
    """証跡: /var/log/tenmon/card_<CARD>/<TS>/"""
    t = ts or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return Path("/var/log/tenmon") / f"card_{_safe_card_log_segment(CARD)}" / t


def _read_chat(rel: str) -> str:
    p = _repo_root() / rel
    return p.read_text(encoding="utf-8", errors="replace")


def _count(re_pat: str, text: str) -> int:
    return len(re.findall(re_pat, text))


def _curl_json(url: str, timeout: float = 5.0) -> Dict[str, Any]:
    try:
        out = subprocess.run(
            ["curl", "-fsS", "--max-time", str(timeout), url],
            capture_output=True,
            text=True,
            check=False,
        )
        if out.returncode != 0:
            return {"ok": False, "error": out.stderr.strip() or f"exit {out.returncode}"}
        return {"ok": True, "body": out.stdout[:8000]}
    except OSError as e:
        return {"ok": False, "error": str(e)}


# CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1 と同一の観測集合
_GENERIC_PREAMBLE_MARKERS = (
    "この問いについて、今回は分析の立場で答えます。",
    "続きが求められているようですね。",
    "いまの答えは、典拠は",
    "一貫の手がかりは、",
)

# CHAT_TS_PROBE_CANON_V1（chat_ts_probe_canon_v1.json）— seal / route / longform と同一文言
_RUNTIME_PROBE_MESSAGES: Dict[str, str] = runtime_probe_full_10()


def _post_chat_json(chat_url: str, message: str, thread_id: str, timeout: float = 25.0) -> Dict[str, Any]:
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
            ku = ((data.get("decisionFrame") or {}).get("ku") or {}) if isinstance(data.get("decisionFrame"), dict) else {}
            rr = ku.get("routeReason") if isinstance(ku, dict) else None
            text = str(data.get("response") or "")
            three_arc = all(x in text for x in ("【見立て】", "【展開】", "【着地】"))
            return {
                "ok": True,
                "routeReason": rr,
                "len": len(text),
                "responseHead": text[:240],
                "three_arc_ok": three_arc,
                "has_generic_preamble": any(x in text for x in _GENERIC_PREAMBLE_MARKERS),
                "has_helper_tail": "（補助）次の一手" in text,
            }
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _discover_chat_post_url(base: str, timeout: float = 10.0) -> Optional[str]:
    b = base.rstrip("/")
    for path in ("/chat", "/api/chat"):
        url = b + path
        r = _post_chat_json(url, "ping", "probe-discovery", timeout=timeout)
        if r.get("ok"):
            return url
    return None


def _run_runtime_probe_matrix(base: str, chat_url_override: str) -> Tuple[Dict[str, Any], List[str]]:
    blockers: List[str] = []
    out: Dict[str, Any] = {}

    health = _curl_json(f"{base}/health")
    out["health"] = health
    if not health.get("ok"):
        blockers.append("health:not_ok")

    audit = _curl_json(f"{base}/api/audit")
    out["audit"] = audit
    if not audit.get("ok"):
        blockers.append("audit:not_ok")

    out["audit_build"] = _curl_json(f"{base}/api/audit.build")

    chat_url = (chat_url_override or "").strip().rstrip("/") or ""
    if not chat_url:
        chat_url = _discover_chat_post_url(base) or ""
    out["chat_url_used"] = chat_url or None

    if not chat_url:
        blockers.append("chat_url:undiscovered")
        for k in _RUNTIME_PROBE_MESSAGES:
            out[k] = {"ok": False, "error": "no_chat_url"}
        return out, blockers

    for name, msg in _RUNTIME_PROBE_MESSAGES.items():
        res = _post_chat_json(chat_url, msg, f"probe-{name}")
        out[name] = res
        if not res.get("ok"):
            blockers.append(f"{name}:not_ok")
            continue
        if res.get("has_generic_preamble"):
            blockers.append(f"{name}:generic_preamble")
        if res.get("has_helper_tail"):
            blockers.append(f"{name}:helper_tail")

    return out, blockers


def _route_authority_clean_from_matrix(
    matrix: Dict[str, Any], probe_blockers: List[str]
) -> Tuple[bool, List[str]]:
    """STAGE5: 主命題プローブが診断短答へ誤吸い込みしていないか。"""
    reasons: List[str] = []
    if "chat_url:undiscovered" in probe_blockers:
        return False, ["chat_url:undiscovered"]
    watch = ("compare_1", "longform_1", "selfaware_1", "scripture_1", "general_1")
    for name in watch:
        r = matrix.get(name)
        if not isinstance(r, dict) or not r.get("ok"):
            reasons.append(f"{name}:not_ok")
            continue
        rr = r.get("routeReason")
        if rr == "SYSTEM_DIAGNOSIS_PREEMPT_V1":
            reasons.append(f"{name}:system_diagnosis_misroute")
        if name == "general_1" and rr == "AI_DEF_LOCK_V1":
            reasons.append(f"{name}:ai_def_lock_misroute")
    return len(reasons) == 0, reasons


def _longform_quality_clean_from_matrix(
    matrix: Dict[str, Any], probe_blockers: List[str]
) -> Tuple[bool, List[str]]:
    """STAGE5: longform_1 が十分な厚みと（望ましい）三弧を持つか。"""
    if "chat_url:undiscovered" in probe_blockers:
        return False, ["chat_url:undiscovered"]
    r = matrix.get("longform_1")
    if not isinstance(r, dict) or not r.get("ok"):
        return False, ["longform_1:not_ok"]
    reasons: List[str] = []
    if r.get("routeReason") == "SYSTEM_DIAGNOSIS_PREEMPT_V1":
        reasons.append("longform_1:system_diagnosis")
    ln = int(r.get("len") or 0)
    if ln < 900:
        reasons.append(f"longform_1:too_short({ln})")
    if r.get("three_arc_ok"):
        return len(reasons) == 0, reasons
    if ln < 1400:
        reasons.append("longform_1:three_arc_missing_and_short")
    return len(reasons) == 0, reasons


def _density_lock_from_static(static: Dict[str, Any], advisory: List[str]) -> Tuple[bool, List[str]]:
    """STAGE5: synapse / seed 密度が advisory を起こしていない（静的閾値と整合）。"""
    syn = int(static.get("synapse_count") or 0)
    seed = int(static.get("seed_count") or 0)
    bad: List[str] = []
    if syn > 80:
        bad.append(f"synapse_count>{80}({syn})")
    if seed > 40:
        bad.append(f"seed_count>{40}({seed})")
    for a in advisory:
        if "synapse" in a or "seed" in a or "dense" in a:
            bad.append(f"advisory:{a}")
    return len(bad) == 0, bad


def build_report(chat_rel: str) -> Dict[str, Any]:
    text = _read_chat(chat_rel)
    lines = text.splitlines()
    n = len(lines)

    route_hits = collect_route_reason_hits(text)
    natural_general_hit_count = len(
        [h for h in route_hits if "NATURAL_GENERAL" in h.reason or h.reason == "NATURAL_GENERAL_LLM_TOP"]
    )
    route_reason_unique_count = len({h.reason for h in route_hits})

    # カード整合: orig = native bind + 旧来の const x = res.json( 形式
    orig_json_bind_count = _count(r"\b(?:const|let)\s+\w+\s*=\s*res\.json\s*\(", text)
    orig_json_bind_count += _count(
        r"__TENMON_NATIVE_RES_JSON\s*=\s*\(res as any\)\.json\.bind\(res\)", text
    )

    res_json_reassign_count = _count(r"\(res as any\)\.json\s*=", text)

    # helper / generic preamble 系（chat.ts 内の代表的インライン）
    helper_patterns = [
        r"（補助）",
        r"一貫の手がかり",
        r"いまの答えは",
        r"次の一手として、",
        r"generic preamble",
    ]
    helper_tail_string_count = sum(_count(p, text) for p in helper_patterns)

    response_projector_count = _count(
        r"\bresponseProjector\b|\bcleanLlmFrameV1\b|\bnormalizeDisplayLabel\b", text
    )
    finalize_reducer_count = _count(r"\bapplyFinalAnswerConstitutionAndWisdomReducerV1\s*\(", text)

    reply_definition_count = _count(r"\bconst\s+__reply\s*=", text)

    threadcore_hits = _count(r"\bthreadCore\b", text)
    threadcenter_hits = _count(r"\bthreadCenter\b", text)
    responseplan_hits = _count(r"\bresponsePlan\b", text)
    seed_hits = _count(r"\bgenerateSeed\b|khs_seeds_det_v1|kokuzo_seeds", text)
    synapse_hits = _count(r"writeSynapseLogV1|synapse_log|synapseTop", text)

    # 静的 100% 条件（カード A–C の数値閾値）
    remaining: List[str] = []
    if orig_json_bind_count != 1:
        remaining.append(f"orig_json_bind_count != 1 (got {orig_json_bind_count})")
    if res_json_reassign_count != 1:
        remaining.append(f"res_json_reassign_count != 1 (got {res_json_reassign_count})")
    if natural_general_hit_count >= 10:
        remaining.append(f"natural_general_hit_count >= 10 (got {natural_general_hit_count})")
    if helper_tail_string_count != 0:
        remaining.append(f"helper_tail_string_count != 0 (got {helper_tail_string_count})")
    if reply_definition_count != 1:
        remaining.append(f"reply_definition_count != 1 (got {reply_definition_count})")

    chat_ts_static_100 = len(remaining) == 0

    advisory: List[str] = []
    if synapse_hits > 80:
        advisory.append("surface_pipeline_still_duplicated_or_dense_synapse_hooks")
    if seed_hits > 40:
        advisory.append("learning_sideeffects_still_inline_seed_density")

    base, probe_bootstrap = resolve_chat_ts_probe_base_url()
    chat_url_override = os.environ.get("CHAT_TS_PROBE_CHAT_URL", "").strip()

    runtime_matrix, runtime_probe_blockers = _run_runtime_probe_matrix(base, chat_url_override)
    runtime_matrix["_probe_bootstrap"] = probe_bootstrap

    chat_ts_runtime_100 = len(runtime_probe_blockers) == 0

    # STAGE1 surface_bleed: 10 本すべて ok かつ generic_preamble / helper_tail なし
    surface_clean = False
    if "chat_url:undiscovered" not in runtime_probe_blockers:
        _bad = False
        for _name in _RUNTIME_PROBE_MESSAGES:
            _r = runtime_matrix.get(_name)
            if not isinstance(_r, dict) or not _r.get("ok"):
                _bad = True
                break
            if _r.get("has_generic_preamble") or _r.get("has_helper_tail"):
                _bad = True
                break
        surface_clean = not _bad

    route_authority_clean, route_authority_reasons = _route_authority_clean_from_matrix(
        runtime_matrix, runtime_probe_blockers
    )
    longform_quality_clean, longform_quality_reasons = _longform_quality_clean_from_matrix(
        runtime_matrix, runtime_probe_blockers
    )
    st_for_density = {
        "synapse_count": synapse_hits,
        "seed_count": seed_hits,
    }
    density_lock, density_reasons = _density_lock_from_static(st_for_density, advisory)

    overall_remaining = list(remaining)
    overall_remaining.extend(runtime_probe_blockers)
    overall_remaining.extend(advisory)
    if not route_authority_clean:
        overall_remaining.append("route_authority:not_clean")
        overall_remaining.extend(route_authority_reasons)
    if not longform_quality_clean:
        overall_remaining.append("longform_quality:not_clean")
        overall_remaining.extend(longform_quality_reasons)
    if not density_lock:
        overall_remaining.append("density_lock:not_clean")
        overall_remaining.extend(density_reasons)

    # STAGE5: overall は static / runtime / surface / route / longform / density を束ねる
    chat_ts_overall_100 = (
        chat_ts_static_100
        and chat_ts_runtime_100
        and surface_clean
        and route_authority_clean
        and longform_quality_clean
        and density_lock
    )

    return {
        "version": VERSION,
        "cardName": CARD,
        "generatedAt": _utc_now_iso(),
        "chatRelative": chat_rel,
        "runtime_probe_bootstrap": probe_bootstrap,
        "static": {
            "line_count": n,
            "natural_general_hit_count": natural_general_hit_count,
            "natural_general_token_substring_count": text.count("NATURAL_GENERAL_LLM_TOP"),
            "route_reason_unique_count": route_reason_unique_count,
            "orig_json_bind_count": orig_json_bind_count,
            "res_json_reassign_count": res_json_reassign_count,
            "helper_tail_string_count": helper_tail_string_count,
            "response_projector_count": response_projector_count,
            "finalize_reducer_count": finalize_reducer_count,
            "reply_definition_count": reply_definition_count,
            "threadCore_count": threadcore_hits,
            "threadCenter_count": threadcenter_hits,
            "responsePlan_count": responseplan_hits,
            "seed_count": seed_hits,
            "synapse_count": synapse_hits,
        },
        "runtime": runtime_matrix,
        "verdict": {
            "chat_ts_static_100": chat_ts_static_100,
            "chat_ts_runtime_100": chat_ts_runtime_100,
            "surface_clean": surface_clean,
            "route_authority_clean": route_authority_clean,
            "route_authority_reasons": route_authority_reasons,
            "longform_quality_clean": longform_quality_clean,
            "longform_quality_reasons": longform_quality_reasons,
            "density_lock": density_lock,
            "density_lock_reasons": density_reasons,
            "chat_ts_overall_100": chat_ts_overall_100,
            "chat_ts_100_percent_ready": chat_ts_overall_100,
            "remaining_blockers": overall_remaining,
            "static_blockers": remaining,
            "runtime_probe_blockers": runtime_probe_blockers,
            "advisory_warnings": advisory,
            # CHAT_TS_COMPLETION_SUPPLEMENT: seal 併用時は runtime / surface の正は merge 側（runtime_matrix / surface_audit）
            "runtime_observation_mode": (
                "live"
                if probe_bootstrap.get("CHAT_TS_PROBE_BASE_URL_env_set")
                else "live_default_base"
            ),
            "resolved_chat_ts_probe_base_url": probe_bootstrap.get("resolved_base_url"),
            "completion_criteria_ref": "STAGE5_merge_V1+CHAT_TS_COMPLETION_SUPPLEMENT_V1",
        },
    }


def write_runtime_next_pdca(repo_root: Path, verdict: Dict[str, Any]) -> None:
    """CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1: 未達時の次カード雛形。"""
    out = repo_root / "api/automation/generated_cursor_apply/CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    if verdict.get("chat_ts_overall_100"):
        out.write_text(
            "# CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1\n\n`chat_ts_overall_100` により次カード不要。\n",
            encoding="utf-8",
        )
        return
    static_b = verdict.get("static_blockers") or []
    runtime_b = verdict.get("runtime_probe_blockers") or []
    lines = [
        "# CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1",
        "",
        "目的: runtime / static の未達 blocker を最小diffで再閉鎖する。",
        "",
    ]
    if static_b:
        lines.append("## static_blockers")
        for b in static_b:
            lines.append(f"- {b}")
        lines.append("")
    if runtime_b:
        lines.append("## runtime_probe_blockers")
        for b in runtime_b:
            lines.append(f"- {b}")
        lines.append("")
    lines.append("## 次の優先順")
    if any("not_ok" in str(x) for x in runtime_b):
        lines.append("1. health / audit / chat URL / POST ペイロードを観測ログで修復")
    if any("generic_preamble" in str(x) or "helper_tail" in str(x) for x in runtime_b):
        lines.append("2. 該当 route の projector / finalize / surface でメタ文を除去")
    if static_b:
        lines.append("3. static 閾値（res_json / route literal 等）を trunk 化で充足")
    lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")


def build_postlock_report_slice_v1(rep: Dict[str, Any]) -> Dict[str, Any]:
    """POSTLOCK 用: worldclass report 単体から取れる観測片（seal の final とは別源。比較は maintenance スクリプトが実施）。"""
    v = rep.get("verdict") or {}
    st = rep.get("static") or {}
    return {
        "version": 1,
        "kind": "postlock_report_slice_v1",
        "generatedAt": rep.get("generatedAt"),
        "static": {
            "res_json_reassign_count": st.get("res_json_reassign_count"),
            "orig_json_bind_count": st.get("orig_json_bind_count"),
            "helper_tail_string_count": st.get("helper_tail_string_count"),
            "reply_definition_count": st.get("reply_definition_count"),
            "natural_general_hit_count": st.get("natural_general_hit_count"),
            "synapse_count": st.get("synapse_count"),
            "seed_count": st.get("seed_count"),
        },
        "report_verdict": {
            "chat_ts_static_100": bool(v.get("chat_ts_static_100")),
            "chat_ts_runtime_100": bool(v.get("chat_ts_runtime_100")),
            "surface_clean": bool(v.get("surface_clean")),
            "route_authority_clean": bool(v.get("route_authority_clean")),
            "longform_quality_clean": bool(v.get("longform_quality_clean")),
            "density_lock": bool(v.get("density_lock")),
            "chat_ts_overall_100": bool(v.get("chat_ts_overall_100")),
        },
    }


def emit_markdown(rep: Dict[str, Any]) -> str:
    v = rep.get("verdict") or {}
    st = rep.get("static") or {}
    lines = [
        f"# {rep.get('cardName')}",
        "",
        f"- generatedAt: `{rep.get('generatedAt')}`",
        f"- chat: `{rep.get('chatRelative')}`",
        "",
        "## Static",
        "",
        "```json",
        json.dumps(st, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Verdict",
        "",
        "```json",
        json.dumps(v, ensure_ascii=False, indent=2),
        "```",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chat-rel", default=DEFAULT_CHAT)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--write-md", type=str, default="", help="optional path under repo to write MD")
    ap.add_argument(
        "--write-next-pdca",
        action="store_true",
        help="write CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1.md when chat_ts_overall_100 is false",
    )
    ap.add_argument(
        "--write-postlock-report-slice",
        type=str,
        default="",
        help="POSTLOCK: report 観測片のみ JSON 出力（パスは repo 相対可）",
    )
    ap.add_argument(
        "--no-card-log-dir",
        action="store_true",
        help="skip writing /var/log/tenmon/card_<CARD>/<TS>/ (tests / read-only env)",
    )
    args = ap.parse_args()

    rep = build_report(args.chat_rel)
    v = rep.setdefault("verdict", {})
    if args.no_card_log_dir:
        v["card_artifact_log"] = {"skipped": True, "reason": "--no-card-log-dir"}
    else:
        log_dir = card_report_log_dir()
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            v["card_artifact_log"] = {"card_log_dir": str(log_dir), "card_log_ok": True}
            (log_dir / "worldclass_completion_report.json").write_text(
                json.dumps(rep, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            (log_dir / "worldclass_completion_report.md").write_text(
                emit_markdown(rep),
                encoding="utf-8",
            )
        except OSError as e:
            v["card_artifact_log"] = {
                "card_log_dir": str(log_dir),
                "card_log_ok": False,
                "card_log_error": str(e),
            }
    if args.write_next_pdca:
        write_runtime_next_pdca(_repo_root(), rep.get("verdict") or {})
    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    if args.write_md:
        p = _repo_root() / args.write_md
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(emit_markdown(rep), encoding="utf-8")
    if args.write_postlock_report_slice:
        p2 = _repo_root() / args.write_postlock_report_slice
        p2.parent.mkdir(parents=True, exist_ok=True)
        p2.write_text(
            json.dumps(build_postlock_report_slice_v1(rep), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    if not args.stdout_json and not args.write_md:
        print(json.dumps(rep.get("verdict"), ensure_ascii=False, indent=2))
    return 0 if rep["verdict"]["chat_ts_overall_100"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
