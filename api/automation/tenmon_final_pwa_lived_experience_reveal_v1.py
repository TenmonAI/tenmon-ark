#!/usr/bin/env python3
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

api = Path(sys.argv[1])
outdir = Path(sys.argv[2])
base = sys.argv[3].rstrip("/")

def post_json(url: str, payload: dict, timeout: int = 120):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": e.code, "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": repr(e), "body": ""}

def parse_json_text(s: str):
    try:
        return json.loads(s)
    except Exception:
        return None

def first_nonempty(*vals):
    for v in vals:
        if v is not None and v != "":
            return v
    return None

def dig(obj, *path):
    cur = obj
    for p in path:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur

def has_meta_leak(text: str):
    rules = [
        "さっき見ていた中心",
        "いまの話を見ていきましょう",
        "いまは中心を保持したまま考えられています",
        "問いの型に合った返答面へ分ける段階",
        "一般知識について、今回は分析の立場で答えます",
        "shadow facts はまだ空",
        "この問いは一般知識 route へ入りました",
        "次の一手として、中心を一つ保ち",
        "次の一手として、判断軸を一つ選び",
    ]
    return [r for r in rules if r in (text or "")]

def has_duplicate_lines(text: str):
    lines = [x.strip() for x in (text or "").splitlines() if x.strip()]
    seen = set()
    for ln in lines:
        if len(ln) >= 8 and ln in seen:
            return True
        seen.add(ln)
    return False

def looks_scripture_toc_leak(text: str):
    bads = [
        "目次",
        "................................",
        "法華経 言灵解",
        "法華経 ⾔灵解",
        "という本文軸から入るのが自然",
    ]
    return any(b in (text or "") for b in bads)

def make_payload(message: str, thread_id=None):
    payload = {
        "message": message,
        "messages": [{"role": "user", "content": message}],
        "userId": "pwa-lived-experience-v1",
    }
    if thread_id:
        payload["threadId"] = thread_id
    return payload

probes = [
    ("time_longform_live", "時間の概念とはなんなのか？ わかりやすく長文で説明してみて"),
    ("one_sound_live", "言灵のヒの意味は？"),
    ("factual_live", "今の総理大臣は？"),
    ("sunrise_live", "日本の日出る国の意味は？"),
    ("worldview_live", "人生ってなんなの？"),
    ("scripture_live", "法華経とは何ですか？"),
    ("compare_live", "AIと人間の違いを比較して"),
    ("continuity_seed", "これから天聞アークの完成について話します。覚えておいて"),
    ("continuity_followup", "さっきの話を踏まえて次の一手をください"),
]

trace = {
    "base": base,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "probes": {},
}

follow_thread_id = None

for name, message in probes:
    payload = make_payload(message, follow_thread_id if name == "continuity_followup" else None)
    resp = post_json(base + "/api/chat", payload)
    parsed = parse_json_text(resp.get("body", "")) if resp.get("body") else None

    response_text = ""
    route_reason = None
    response_plan = None
    thread_id = None
    thread_center = None
    canonical = None
    projected = None
    finalize = None

    if isinstance(parsed, dict):
        response_text = first_nonempty(
            parsed.get("response"),
            parsed.get("answer"),
            parsed.get("text"),
            parsed.get("message"),
            dig(parsed, "result", "response"),
            dig(parsed, "result", "answer"),
        ) or ""

        route_reason = first_nonempty(
            dig(parsed, "decisionFrame", "ku", "routeReason"),
            dig(parsed, "ku", "routeReason"),
            parsed.get("routeReason"),
            dig(parsed, "responsePlan", "routeReason"),
        )

        response_plan = first_nonempty(
            dig(parsed, "decisionFrame", "ku", "responsePlan"),
            parsed.get("responsePlan"),
        )

        thread_id = first_nonempty(
            parsed.get("threadId"),
            dig(parsed, "decisionFrame", "ku", "threadCore", "threadId"),
        )

        thread_center = first_nonempty(
            dig(parsed, "decisionFrame", "ku", "threadCenter"),
            parsed.get("threadCenter"),
        )

        canonical = first_nonempty(
            parsed.get("canonicalResponse"),
            dig(parsed, "decisionFrame", "ku", "canonicalResponse"),
        )

        projected = first_nonempty(
            parsed.get("projectedResponse"),
            dig(parsed, "decisionFrame", "ku", "projectedResponse"),
        )

        finalize = first_nonempty(
            parsed.get("finalizeResponse"),
            dig(parsed, "decisionFrame", "ku", "finalizeResponse"),
        )

    trace["probes"][name] = {
        "request_payload": payload,
        "http": {
            "ok": resp.get("ok"),
            "status": resp.get("status"),
            "error": resp.get("error"),
        },
        "raw_body": resp.get("body", ""),
        "parsed": parsed,
        "observed": {
            "threadId": thread_id,
            "threadCenter": thread_center,
            "routeReason": route_reason,
            "responsePlan": response_plan,
            "rawResponse": response_text,
            "canonicalResponse": canonical,
            "projectedResponse": projected,
            "finalizeResponse": finalize,
            "response_len": len(response_text or ""),
        },
    }

    if name == "continuity_seed":
        follow_thread_id = thread_id

(outdir / "pwa_real_chat_single_source_trace.json").write_text(
    json.dumps(trace, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

gap_report = {"blockers": [], "probe_summary": {}}
bleed_report = {"blockers": [], "details": {}}

def summarize_probe(name: str):
    row = trace["probes"][name]
    text = row["observed"]["rawResponse"] or ""
    leaks = has_meta_leak(text)
    summary = {
        "routeReason": row["observed"]["routeReason"],
        "response_len": row["observed"]["response_len"],
        "meta_leaks": leaks,
        "duplicate_lines": has_duplicate_lines(text),
        "threadCenter": row["observed"]["threadCenter"],
        "threadId": row["observed"]["threadId"],
        "response_head": text[:500],
    }
    gap_report["probe_summary"][name] = summary

for n in [
    "time_longform_live",
    "one_sound_live",
    "factual_live",
    "sunrise_live",
    "worldview_live",
    "scripture_live",
    "compare_live",
    "continuity_followup",
]:
    summarize_probe(n)

if not ("【見立て】" in (trace["probes"]["time_longform_live"]["observed"]["rawResponse"] or "")
        and "【展開】" in (trace["probes"]["time_longform_live"]["observed"]["rawResponse"] or "")):
    gap_report["blockers"].append("time_longform_live:bad_surface")

one_sound_text = trace["probes"]["one_sound_live"]["observed"]["rawResponse"] or ""
if not any(k in one_sound_text for k in ["ヒ", "火", "光", "日"]):
    gap_report["blockers"].append("one_sound_live:bad_surface")

factual_text = trace["probes"]["factual_live"]["observed"]["rawResponse"] or ""
if has_meta_leak(factual_text) or "総理" not in factual_text:
    gap_report["blockers"].append("factual_live:bad_surface")

sunrise_text = trace["probes"]["sunrise_live"]["observed"]["rawResponse"] or ""
if has_meta_leak(sunrise_text):
    gap_report["blockers"].append("sunrise_live:bad_surface")

worldview_text = trace["probes"]["worldview_live"]["observed"]["rawResponse"] or ""
if has_meta_leak(worldview_text):
    gap_report["blockers"].append("worldview_live:bad_surface")

scripture_text = trace["probes"]["scripture_live"]["observed"]["rawResponse"] or ""
if looks_scripture_toc_leak(scripture_text):
    gap_report["blockers"].append("scripture_live:bad_surface")

compare_text = trace["probes"]["compare_live"]["observed"]["rawResponse"] or ""
if compare_text.count("比較の問いです。") >= 2 or has_duplicate_lines(compare_text):
    gap_report["blockers"].append("compare_live:bad_surface")

continuity_text = trace["probes"]["continuity_followup"]["observed"]["rawResponse"] or ""
if "直前ターンの中心（記録薄）" in continuity_text or "R22_NEXTSTEP_FOLLOWUP_V1" in continuity_text:
    gap_report["blockers"].append("continuity_followup:bad_surface")

for name in ("sunrise_live", "worldview_live", "scripture_live"):
    row = trace["probes"][name]
    text = row["observed"]["rawResponse"] or ""
    scripture_bleed = any(k in text for k in ["聖典・canon 軸", "いろは軸は", "中心束を固定"])
    bleed_report["details"][name] = {
        "routeReason": row["observed"]["routeReason"],
        "threadCenter": row["observed"]["threadCenter"],
        "scripture_bleed_surface": scripture_bleed,
        "response_head": text[:300],
    }
    if scripture_bleed:
        bleed_report["blockers"].append(f"{name}:scripture_bleed_surface")

(outdir / "pwa_probe_gap_report.json").write_text(
    json.dumps(gap_report, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
(outdir / "thread_center_bleed_report.json").write_text(
    json.dumps(bleed_report, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

out_root = api / "automation" / "out"
self_imp = out_root / "tenmon_self_improvement_os_v1"
kokuzo = out_root / "tenmon_kokuzo_learning_improvement_os_v1"

output_contract = {
    "self_improvement_os": {
        "exists": self_imp.exists(),
        "required": {
            "self_improvement_os_manifest.json": (self_imp / "self_improvement_os_manifest.json").exists(),
            "seal_governor_verdict.json": (self_imp / "seal_governor_verdict.json").exists(),
            "next_card_dispatch.json": (self_imp / "next_card_dispatch.json").exists(),
            "integrated_final_verdict.json": (self_imp / "integrated_final_verdict.json").exists(),
        },
    },
    "kokuzo_learning_os": {
        "exists": kokuzo.exists(),
        "required": {
            "integrated_learning_verdict.json": (kokuzo / "integrated_learning_verdict.json").exists(),
            "integrated_final_verdict.json": (kokuzo / "integrated_final_verdict.json").exists(),
            "learning_improvement_os_manifest.json": (kokuzo / "learning_improvement_os_manifest.json").exists(),
            "learning_steps.json": (kokuzo / "learning_steps.json").exists(),
            "next_card_dispatch.json": (kokuzo / "next_card_dispatch.json").exists(),
        },
    },
}
(outdir / "output_contract_normalization_report.json").write_text(
    json.dumps(output_contract, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

reflection = {
    "self_improvement_os_exists": self_imp.exists(),
    "kokuzo_learning_os_exists": kokuzo.exists(),
    "focused_next_cards_present": (kokuzo / "_learning_improvement_os" / "residual" / "focused_next_cards_manifest.json").exists(),
}

(outdir / "self_improvement_reflection_report.json").write_text(
    json.dumps(reflection, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

blockers = []
blockers.extend(gap_report["blockers"])
blockers.extend(bleed_report["blockers"])

nas = {
    "ready": False,
    "report_exists": (api / "automation" / "storage_backup_nas_recovery_report.json").exists(),
}
if nas["report_exists"]:
    try:
        nas = json.loads((api / "automation" / "storage_backup_nas_recovery_report.json").read_text(encoding="utf-8"))
    except Exception:
        nas = {"ready": False, "report_exists": True, "parse_error": True}

if not bool(nas.get("ready", False)):
    blockers.append("nas_ready")
if not all(output_contract["self_improvement_os"]["required"].values()):
    blockers.append("self_improvement_contract_incomplete")
if not all(output_contract["kokuzo_learning_os"]["required"].values()):
    blockers.append("kokuzo_learning_contract_incomplete")

readiness = {
    "final_ready": len(blockers) == 0,
    "blockers": blockers,
}
(outdir / "final_pwa_completion_readiness.json").write_text(
    json.dumps(readiness, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

verdict = {
    "ok": readiness["final_ready"],
    "final_ready": readiness["final_ready"],
    "blockers": blockers,
}
(outdir / "pwa_acceptance_final_verdict.json").write_text(
    json.dumps(verdict, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

next_cards = []
if any("scripture_bleed" in b for b in blockers):
    next_cards.append("TENMON_GENERAL_SCRIPTURE_BLEED_GUARD_V1")
if any(":bad_surface" in b for b in blockers):
    next_cards.append("TENMON_FINAL_PWA_SURFACE_LAST_MILE_CURSOR_AUTO_V1")
if "self_improvement_contract_incomplete" in blockers:
    next_cards.append("TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1")
if "kokuzo_learning_contract_incomplete" in blockers:
    next_cards.append("TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1")
if "nas_ready" in blockers:
    next_cards.append("TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1")

(outdir / "state_convergence_next_cards.json").write_text(
    json.dumps({"next_cards": next_cards[:5]}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

summary = {
    "ok": True,
    "blocker_count": len(blockers),
    "final_ready": readiness["final_ready"],
    "recommended_cards": next_cards[:5],
}
(outdir / "state_convergence_summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(json.dumps(summary, ensure_ascii=False, indent=2))
