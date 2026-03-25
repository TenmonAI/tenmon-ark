#!/usr/bin/env python3
"""
TENMON_FINAL_PWA_SURFACE_LAST_MILE_CURSOR_AUTO_V1
実PWA representative probes → trace / duplication / bleed / readiness → verdict / next PDCA
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD_ID = "TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1"


def post_json(url: str, payload: dict, timeout: int = 180) -> dict[str, Any]:
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


def make_payload(message: str, thread_id: str | None = None) -> dict:
    payload: dict = {
        "message": message,
        "messages": [{"role": "user", "content": message}],
        "userId": "tenmon-final-pwa-surface-last-mile-v1",
    }
    if thread_id:
        payload["threadId"] = thread_id
    return payload


def extract_observed(parsed: dict | None) -> dict[str, Any]:
    response_text = ""
    route_reason = None
    response_plan = None
    thread_id = None
    thread_center = None
    canonical = None
    projected = None
    finalize = None
    if isinstance(parsed, dict):
        response_text = (
            first_nonempty(
                parsed.get("response"),
                parsed.get("answer"),
                parsed.get("text"),
                parsed.get("message"),
                dig(parsed, "result", "response"),
                dig(parsed, "result", "answer"),
            )
            or ""
        )
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
            dig(parsed, "decisionFrame", "ku", "threadCenterKey"),
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
    return {
        "threadId": thread_id,
        "threadCenter": thread_center,
        "routeReason": route_reason,
        "responsePlan": response_plan,
        "rawResponse": response_text,
        "canonicalResponse": canonical,
        "projectedResponse": projected,
        "finalizeResponse": finalize,
        "response_len": len(response_text or ""),
    }


# --- duplication ---

_RE_SENT = re.compile(r"[。．\n]+")


def split_sentences(t: str) -> list[str]:
    t = re.sub(r"\s+", " ", (t or "").strip())
    parts = _RE_SENT.split(t)
    return [p.strip() for p in parts if len(p.strip()) >= 8]


def detect_duplicate_sentences(text: str) -> list[str]:
    sents = split_sentences(text)
    seen: dict[str, int] = {}
    dups: list[str] = []
    for s in sents:
        seen[s] = seen.get(s, 0) + 1
    for s, c in seen.items():
        if c >= 2:
            dups.append(s[:200])
    return dups


def detect_duplicate_trailing_questions(text: str) -> bool:
    lines = [x.strip() for x in (text or "").splitlines() if x.strip()]
    qs = [ln for ln in lines if ln.endswith("?") or ln.endswith("？")]
    if len(qs) < 2:
        return False
    tail = qs[-3:]
    return len(set(tail)) < len(tail)


def helper_tail_markers() -> list[str]:
    return [
        "（補助）次の一手",
        "次の一手として",
        "comfort",
        "余韻で足りる",
    ]


def detect_helper_tail_dup(text: str) -> bool:
    t = text or ""
    hits = sum(1 for m in helper_tail_markers() if m in t)
    return hits >= 2


def detect_semantic_close_dup(text: str) -> bool:
    """末尾付近の同一・類似クローズ（定型二重）"""
    paras = [p.strip() for p in (text or "").split("\n\n") if p.strip()]
    if len(paras) < 2:
        return False
    tails = [p[-min(len(p), 100) :] for p in paras[-3:]]
    for i in range(len(tails)):
        for j in range(i + 1, len(tails)):
            if tails[i] == tails[j] and len(tails[i]) >= 20:
                return True
    return False


# --- bleed ---

_SCRIPTURE_LEAK = re.compile(
    r"(聖典|法華経|空海|カタカムナ|いろは|言霊|言灵|kotodama|scripture|canon\s*軸|中心束を固定)",
    re.I,
)

def scripture_center_label_exposed(thread_center: Any, surface: str, probe_kind: str) -> bool:
    if probe_kind in ("scripture", "continuity", "nextstep", "longform"):
        return False
    if thread_center is None:
        return False
    tc = json.dumps(thread_center, ensure_ascii=False)
    if not re.search(r'"centerType"\s*:\s*"scripture"|scripture|法華|言霊|kotodama|経典', tc, re.I):
        return False
    # 表面に聖典軸ラベルが残る
    if re.search(r"(立脚の中心は「[^」]{0,80}(法華|聖典|経典|言霊))", surface or ""):
        return True
    if "聖典" in (surface or "") and "canon" in (surface or "").lower():
        return True
    return False


def projected_scripture_shift(
    canonical: str | None, projected: str | None, finalize: str | None, surface: str
) -> bool:
    c = canonical or ""
    p = projected or finalize or ""
    if not p or not c:
        return False
    # projected だけが聖典語彙に寄った
    if (not _SCRIPTURE_LEAK.search(c)) and _SCRIPTURE_LEAK.search(p) and _SCRIPTURE_LEAK.search(surface or ""):
        return True
    return False


def route_carry_leak(surface: str) -> list[str]:
    bad: list[str] = []
    t = surface or ""
    if re.search(r"\bR22_[A-Z0-9_]{8,}\b", t):
        bad.append("route_token_literal")
    if "routeReason" in t or "responsePlan" in t:
        bad.append("internal_field_name")
    if "sourcePack" in t and "KHSL" in t:
        bad.append("sourcepack_leak")
    return bad


def classify_bleed(
    *,
    probe_name: str,
    probe_kind: str,
    observed: dict[str, Any],
) -> dict[str, Any]:
    surface = str(observed.get("rawResponse") or "")
    can = observed.get("canonicalResponse")
    proj = observed.get("projectedResponse")
    fin = observed.get("finalizeResponse")
    tc = observed.get("threadCenter")
    cls: dict[str, Any] = {"A_thread_center_carry": False, "B_projector_shift": False, "C_tail_dup": False}
    if scripture_center_label_exposed(tc, surface, probe_kind):
        cls["A_thread_center_carry"] = True
    if projected_scripture_shift(
        can if isinstance(can, str) else None,
        proj if isinstance(proj, str) else None,
        fin if isinstance(fin, str) else None,
        surface,
    ):
        cls["B_projector_shift"] = True
    if detect_helper_tail_dup(surface) or detect_semantic_close_dup(surface):
        cls["C_tail_dup"] = True
    cls["route_carry"] = route_carry_leak(surface)
    return cls


def read_gate_status(gate_path: Path | None) -> dict[str, Any]:
    if not gate_path or not gate_path.is_file():
        return {
            "health_ok": False,
            "audit_ok": False,
            "audit_build_ok": False,
            "missing_file": True,
        }
    try:
        return json.loads(gate_path.read_text(encoding="utf-8"))
    except Exception:
        return {"health_ok": False, "audit_ok": False, "audit_build_ok_ok": False, "parse_error": True}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("api", type=str, help="api root path")
    ap.add_argument("outdir", type=str, help="log output dir (also writes api/automation/*.json)")
    ap.add_argument("base", type=str, help="base url e.g. http://127.0.0.1:3000")
    ap.add_argument("--gate-json", type=str, default="", help="optional gate_status.json from shell")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--max-loops", type=int, default=1, help="reserved: probe repeat (default 1)")
    args = ap.parse_args()

    api = Path(args.api)
    outdir = Path(args.outdir)
    base = args.base.rstrip("/")
    automation = api / "automation"
    automation.mkdir(parents=True, exist_ok=True)

    gate_path = Path(args.gate_json) if args.gate_json else (outdir / "gate_status.json")
    gate = read_gate_status(gate_path if gate_path.is_file() else None)

    health_ok = bool(gate.get("health_ok", False))
    audit_ok = bool(gate.get("audit_ok", False))
    audit_build_ok = bool(gate.get("audit_build_ok", gate.get("audit_build_ok_ok", False)))

    trace: dict[str, Any] = {
        "card": CARD_ID,
        "base": base,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "gate": gate,
        "probes": {},
    }

    # Probe plan: (name, message, kind, thread_mode)
    # thread_mode: new | carry | reuse
    plan: list[tuple[str, str, str, str]] = [
        ("general_factual", "今の総理大臣は？", "general", "new"),
        ("general_philosophical", "時間の概念とはなんなのか？", "general", "new"),
        ("worldview", "人生ってなんなの？", "general", "new"),
        ("continuity_seed", "これから会話の続きの話をします。覚えておいて", "seed", "new"),
        (
            "continuity",
            "さっきの話を踏まえて次の一手をください",
            "continuity",
            "carry",
        ),
        ("nextstep", "次の一手だけを明確にください", "nextstep", "new"),
        ("compare", "AとBの違いは？", "general", "new"),
        ("scripture_kotodama", "言灵のヒの意味は？", "scripture", "new"),
        ("general_after_scripture", "今の総理大臣は？", "general", "reuse"),
        ("longform", "わかりやすく長文で説明してみて", "longform", "new"),
    ]

    thread_after_seed: str | None = None
    thread_scripture: str | None = None

    for name, message, kind, mode in plan:
        tid: str | None = None
        if mode == "carry":
            tid = thread_after_seed
        elif mode == "reuse":
            tid = thread_scripture
        payload = make_payload(message, tid)
        ep = base + "/api/chat"
        resp = post_json(ep, payload)
        parsed = parse_json_text(resp.get("body", "")) if resp.get("body") else None
        obs = extract_observed(parsed if isinstance(parsed, dict) else None)
        if name == "continuity_seed":
            thread_after_seed = obs.get("threadId") if isinstance(obs.get("threadId"), str) else thread_after_seed
        if name == "scripture_kotodama":
            thread_scripture = obs.get("threadId") if isinstance(obs.get("threadId"), str) else thread_scripture

        trace["probes"][name] = {
            "endpoint": ep,
            "request_payload": payload,
            "probe_kind": kind,
            "http": {
                "ok": resp.get("ok"),
                "status": resp.get("status"),
                "error": resp.get("error"),
            },
            "raw_body": resp.get("body", "")[:80000],
            "parsed": parsed,
            "observed": obs,
            "bleed_class": classify_bleed(probe_name=name, probe_kind=kind, observed=obs),
            "duplication": {
                "duplicate_sentences": detect_duplicate_sentences(str(obs.get("rawResponse") or "")),
                "duplicate_trailing_questions": detect_duplicate_trailing_questions(str(obs.get("rawResponse") or "")),
                "helper_tail_dup": detect_helper_tail_dup(str(obs.get("rawResponse") or "")),
                "semantic_close_dup": detect_semantic_close_dup(str(obs.get("rawResponse") or "")),
            },
        }

    # --- reports ---
    dup_report: dict[str, Any] = {"by_probe": {}, "summary": []}
    bleed_report: dict[str, Any] = {"by_probe": {}, "summary": []}
    gap_report: dict[str, Any] = {"blockers": [], "per_probe": {}}

    for pname, row in trace["probes"].items():
        surf = str(row["observed"]["rawResponse"] or "")
        d = row["duplication"]
        dup_report["by_probe"][pname] = d
        if d["duplicate_sentences"]:
            gap_report["blockers"].append(f"{pname}:dup_sentence")
            dup_report["summary"].append(pname)
        if d["duplicate_trailing_questions"]:
            gap_report["blockers"].append(f"{pname}:dup_trailing_q")
        if d["helper_tail_dup"]:
            gap_report["blockers"].append(f"{pname}:helper_tail_dup")
        if d["semantic_close_dup"]:
            gap_report["blockers"].append(f"{pname}:semantic_close_dup")

        bc = row["bleed_class"]
        bleed_report["by_probe"][pname] = bc
        if bc.get("A_thread_center_carry"):
            gap_report["blockers"].append(f"{pname}:bleed_A")
            bleed_report["summary"].append(f"{pname}:A")
        if bc.get("B_projector_shift"):
            gap_report["blockers"].append(f"{pname}:bleed_B")
            bleed_report["summary"].append(f"{pname}:B")
        if bc.get("C_tail_dup"):
            gap_report["blockers"].append(f"{pname}:bleed_C")
            bleed_report["summary"].append(f"{pname}:C")
        for rc in bc.get("route_carry") or []:
            gap_report["blockers"].append(f"{pname}:route_carry:{rc}")

        # Heuristic: general 表に聖典ラベルが乗った疑い（厳しめ）
        if pname in ("general_factual", "general_after_scripture", "compare") and (
            re.search(r"(立脚の中心は「[^」]{0,40}(法華|聖典|経典|言霊)", surf)
            or "聖典・canon" in surf
            or "canon 軸" in surf
        ):
            gap_report["blockers"].append(f"{pname}:surface_scripture_noise")

    surface_duplicate_clean = not any(
        ":dup_" in b or ":helper_tail" in b or ":semantic_close" in b for b in gap_report["blockers"]
    )
    surface_bleed_clean = not any(
        ":bleed_" in b or "surface_scripture_noise" in b for b in gap_report["blockers"]
    )
    surface_lastmile_clean = not any(":route_carry:" in b for b in gap_report["blockers"])

    gap_report["blockers"] = sorted(set(gap_report["blockers"]))

    if not health_ok:
        gap_report["blockers"].append("gate:health")
    if not audit_ok:
        gap_report["blockers"].append("gate:audit")
    if not audit_build_ok:
        gap_report["blockers"].append("gate:audit_build")
    gap_report["blockers"] = sorted(set(gap_report["blockers"]))

    final_ready = (
        health_ok
        and audit_ok
        and audit_build_ok
        and surface_duplicate_clean
        and surface_bleed_clean
        and surface_lastmile_clean
    )

    readiness = {
        "card": CARD_ID,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "audit_build_ok": audit_build_ok,
        "surface_duplicate_clean": surface_duplicate_clean,
        "surface_bleed_clean": surface_bleed_clean,
        "surface_lastmile_clean": surface_lastmile_clean,
        "final_ready": final_ready,
        "blockers": gap_report["blockers"],
    }

    verdict = {
        "ok": final_ready,
        "final_ready": final_ready,
        "blockers": gap_report["blockers"],
        "card": CARD_ID,
    }

    # Write automation dir (canonical copies)
    (automation / "final_pwa_surface_trace.json").write_text(
        json.dumps(trace, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "final_pwa_surface_gap_report.json").write_text(
        json.dumps(gap_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "final_pwa_surface_bleed_report.json").write_text(
        json.dumps(bleed_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "final_pwa_surface_duplication_report.json").write_text(
        json.dumps(dup_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "final_pwa_surface_acceptance_verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (automation / "final_pwa_surface_readiness.json").write_text(
        json.dumps(readiness, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # next PDCA md
    gen_dir = automation / "generated_cursor_apply"
    gen_dir.mkdir(parents=True, exist_ok=True)
    next_cards: list[str] = []
    if not final_ready:
        if any("bleed" in b for b in gap_report["blockers"]):
            next_cards.append("TENMON_SURFACE_BLEED_CLASS_ABC_PATCH_V1")
        if any("dup_" in b or "helper" in b for b in gap_report["blockers"]):
            next_cards.append("TENMON_SURFACE_DEDUPE_TAIL_V1")
        if any(b.startswith("gate:") for b in gap_report["blockers"]):
            next_cards.append("TENMON_GATE_HEALTH_AUDIT_RECOVERY_V1")
        next_cards = next_cards[:3]
    pdca_body = "\n".join(
        [
            f"# TENMON_FINAL_PWA_SURFACE_LAST_MILE_NEXT_PDCA_AUTO_V1",
            f"",
            f"- generated_at: {trace.get('generated_at')}",
            f"- final_ready: {final_ready}",
            f"- blockers: {gap_report['blockers']}",
            f"- next_cards (max 3): {next_cards}",
            f"",
        ]
    )
    (gen_dir / "TENMON_FINAL_PWA_SURFACE_LAST_MILE_NEXT_PDCA_AUTO_V1.md").write_text(pdca_body, encoding="utf-8")

    # VPS marker
    (automation / "TENMON_FINAL_PWA_SURFACE_LAST_MILE_VPS_V1").write_text(
        f"{CARD_ID}\n{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n",
        encoding="utf-8",
    )

    # Mirror to outdir
    for fn in [
        "final_pwa_surface_trace.json",
        "final_pwa_surface_gap_report.json",
        "final_pwa_surface_bleed_report.json",
        "final_pwa_surface_duplication_report.json",
        "final_pwa_surface_acceptance_verdict.json",
        "final_pwa_surface_readiness.json",
    ]:
        try:
            (outdir / fn).write_text((automation / fn).read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    summary = {
        "ok": final_ready,
        "final_ready": final_ready,
        "blocker_count": len(gap_report["blockers"]),
        "blockers": gap_report["blockers"],
        "next_cards": next_cards,
    }
    out = json.dumps(summary, ensure_ascii=False, indent=2)
    if args.stdout_json:
        print(out)
    else:
        print(out)
    return 0 if final_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
