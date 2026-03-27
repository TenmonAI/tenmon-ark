#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_PDCA_2H_FAILCLOSED_AUTOLOOP_CURSOR_AUTO_V1

会話本幹向け fail-closed PDCA オーケストレーター（観測・probe・既存 automation 呼び出し）。
コード編集は行わない。build/restart は環境変数で明示時のみ。

環境変数:
  TENMON_PDCA_BASE          API 基底 URL（既定 http://127.0.0.1:3000）
  TENMON_PDCA_MAX_LOOPS     既定 5
  TENMON_PDCA_MAX_SEC       既定 7200（2h）
  TENMON_PDCA_RUN_BUILD     1 で npm run build + audit gate 前に実行（restart は別途）
  TENMON_PDCA_SKIP_BUILD    1 で build をスキップ
  TENMON_PDCA_SKIP_PROBES   1 で HTTP probe をスキップ（JSON のみ・fail-closed）
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_PDCA_2H_FAILCLOSED_AUTOLOOP_CURSOR_AUTO_V1"
RUN_DIR_NAME = "conversation_pdca_2h_failclosed_autoloop_v1"
OUT_FINAL = "tenmon_conversation_pdca_2h_failclosed_autoloop_summary.json"


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _http_json(method: str, url: str, body: bytes | None = None, timeout: int = 45) -> dict[str, Any]:
    req = urllib.request.Request(url, method=method, data=body)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            code = int(getattr(r, "status", r.getcode()))
            j = json.loads(raw) if raw.strip() else {}
            return {"ok_http": 200 <= code < 300, "status": code, "json": j if isinstance(j, dict) else {}}
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok_http": False, "status": e.code, "json": {}, "raw": raw[:2000]}
    except Exception as e:
        return {"ok_http": False, "status": None, "error": str(e)[:200], "json": {}}


def _post_chat(base: str, message: str, thread_id: str) -> dict[str, Any]:
    base = base.rstrip("/")
    payload = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    return _http_json("POST", f"{base}/api/chat", payload, timeout=120)


def _route_reason(resp: dict[str, Any]) -> str:
    j = resp.get("json") if isinstance(resp.get("json"), dict) else {}
    ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j.get("decisionFrame"), dict) else {}
    return str(ku.get("routeReason") or "").strip()


def _ku(resp: dict[str, Any]) -> dict[str, Any]:
    j = resp.get("json") if isinstance(resp.get("json"), dict) else {}
    ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j.get("decisionFrame"), dict) else {}
    return ku if isinstance(ku, dict) else {}


def _response_text(resp: dict[str, Any]) -> str:
    j = resp.get("json") if isinstance(resp.get("json"), dict) else {}
    return str(j.get("response") or "")


def _gates(base: str) -> dict[str, Any]:
    base = base.rstrip("/")
    h = _http_json("GET", f"{base}/api/health", None, 20)
    a = _http_json("GET", f"{base}/api/audit", None, 20)
    ab = _http_json("GET", f"{base}/api/audit.build", None, 20)
    hj = h.get("json") or {}
    aj = a.get("json") or {}
    abj = ab.get("json") or {}
    ok = bool(
        h.get("ok_http")
        and aj.get("ok") is True
        and abj.get("ok") is True
        and (hj.get("ok") is True or hj.get("ok") is None)
    )
    return {"ok": ok, "health": h, "audit": a, "audit_build": ab}


def _is_selfaware_family(rr: str) -> bool:
    if not rr:
        return False
    if rr in ("AI_CONSCIOUSNESS_LOCK_V1", "TENMON_CONSCIOUSNESS_LOCK_V1"):
        return True
    if rr.startswith("R22_SELFAWARE_"):
        return True
    if rr == "R10_SELF_REFLECTION_ROUTE_V4_SAFE":
        return True
    return False


def _is_scripture_family(rr: str) -> bool:
    if not rr:
        return False
    if rr in ("TENMON_SCRIPTURE_CANON_V1", "K1_TRACE_EMPTY_GATED_V1", "KATAKAMUNA_CANON_ROUTE_V1", "SCRIPTURE_LOCAL_RESOLVER_V4"):
        return True
    if "SCRIPTURE" in rr or rr.startswith("K1_"):
        return True
    return False


def _is_general_drop(rr: str) -> bool:
    return rr in ("NATURAL_GENERAL_LLM_TOP", "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1")


def _run_npm_build(api: Path) -> dict[str, Any]:
    try:
        p = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(api),
            capture_output=True,
            text=True,
            timeout=600,
        )
        return {
            "ok": p.returncode == 0,
            "exit_code": p.returncode,
            "stderr_tail": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _run_py(auto: Path, api: Path, script: str) -> dict[str, Any]:
    p = auto / script
    if not p.is_file():
        return {"script": script, "skipped": True}
    r = subprocess.run(
        [sys.executable, str(p)],
        cwd=str(api),
        capture_output=True,
        text=True,
        timeout=600,
    )
    return {"script": script, "exit_code": r.returncode, "stdout_tail": (r.stdout or "")[-2500:]}


def _pwa_static_audit(repo: Path) -> dict[str, Any]:
    """web フロントの契約観測のみ（編集しない）。"""
    paths = [
        repo / "web" / "src" / "api" / "chat.ts",
        repo / "web" / "src" / "hooks" / "useChat.ts",
        repo / "web" / "src" / "pages" / "ChatPage.tsx",
    ]
    rows: list[dict[str, Any]] = []
    for p in paths:
        if not p.is_file():
            rows.append({"path": str(p), "exists": False})
            continue
        txt = p.read_text(encoding="utf-8", errors="replace")
        rows.append(
            {
                "path": str(p),
                "exists": True,
                "has_api_chat": bool(re.search(r"/api/chat", txt)),
                "has_thread_id": bool(re.search(r"threadId", txt, re.I)),
            }
        )
    ok = all(x.get("exists") and x.get("has_api_chat") and x.get("has_thread_id") for x in rows if x.get("exists"))
    return {"ok": ok, "files": rows}


def _autonomy_readiness_memo(auto: Path) -> dict[str, str]:
    """未完成点のメモ（既存 JSON があれば観測のみ）。master PDCA 採取項目と整合。"""
    q = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    bundle = _read_json(auto / "remote_cursor_result_bundle.json")
    base = {
        "planner": "partial",
        "queue": "partial",
        "single_flight": "partial",
        "queue_single_flight": "partial",
        "execution_gate": "partial",
        "result_return": "partial",
        "rollback": "partial",
        "forensic": "partial",
        "cursor_operator": "partial",
        "mac_operator": "partial",
        "failclosed_supervisor": "partial",
    }
    if isinstance(q.get("items"), list) and q.get("items"):
        base["queue"] = "observed"
        base["queue_single_flight"] = "observed"
        base["single_flight"] = "observed"
    if bundle.get("entries"):
        base["cursor_operator"] = "observed"
    return base


def _loop1_probes(base: str, ts: str) -> dict[str, Any]:
    tid = f"pdca_l1_{ts}"
    r1 = _post_chat(base, "水火の法則とは", f"{tid}_a")
    r2 = _post_chat(base, "言霊とは何かを簡潔に答えて", f"{tid}_b")
    tid_c = f"{tid}_c"
    _post_chat(base, "言霊とは何かを100字前後で答えて", tid_c)
    r3 = _post_chat(base, "その話の中心だけ保ったまま、一段深めて", tid_c)
    e1 = _route_reason(r1) == "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1"
    e2 = _route_reason(r2) == "DEF_FASTPATH_VERIFIED_V1"
    e3 = _route_reason(r3) == "CONTINUITY_ROUTE_HOLD_V1"
    return {
        "probes": [
            {"message": "水火の法則とは", "expected": "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1", "routeReason": _route_reason(r1), "ok": e1},
            {"message": "言霊とは何かを簡潔に答えて", "expected": "DEF_FASTPATH_VERIFIED_V1", "routeReason": _route_reason(r2), "ok": e2},
            {
                "message": "その話の中心だけ保ったまま、一段深めて",
                "expected": "CONTINUITY_ROUTE_HOLD_V1",
                "routeReason": _route_reason(r3),
                "ok": e3,
            },
        ],
        "pass": bool(e1 and e2 and e3),
    }


def _loop2_probes(base: str, ts: str) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    specs = [
        ("AIに意識はあるのか", "selfaware"),
        ("意識と自己認識は同じか", "selfaware"),
        ("法華経とは", "scripture"),
    ]
    for i, (msg, kind) in enumerate(specs, start=1):
        r = _post_chat(base, msg, f"pdca_l2_{ts}_{i}")
        rr = _route_reason(r)
        if kind == "selfaware":
            ok = _is_selfaware_family(rr) and not _is_general_drop(rr)
        else:
            ok = _is_scripture_family(rr) and not _is_general_drop(rr)
        rows.append({"message": msg, "kind": kind, "routeReason": rr, "ok": ok})
    return {"probes": rows, "pass": all(x["ok"] for x in rows)}


def _paragraph_count(text: str) -> int:
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return max(len(parts), 1 if text.strip() else 0)


def _loop3_probes(base: str, ts: str) -> dict[str, Any]:
    """surfaceContractV1 + 簡易本文チェック。"""
    tid1 = f"pdca_l3_{ts}_1"
    r_k = _post_chat(base, "言霊とは何かを100字前後で答えて", tid1)
    ku_k = _ku(r_k)
    sc_k = ku_k.get("surfaceContractV1") if isinstance(ku_k.get("surfaceContractV1"), dict) else {}
    txt_k = _response_text(r_k)
    pc = _paragraph_count(txt_k)
    ok_k = bool(pc >= 2 and (sc_k.get("mustIncludeCenterClaim") is True or len(txt_k) >= 40))

    r_w = _post_chat(base, "水火の法則とは", f"pdca_l3_{ts}_2")
    ku_w = _ku(r_w)
    sc_w = ku_w.get("surfaceContractV1") if isinstance(ku_w.get("surfaceContractV1"), dict) else {}
    ok_w = bool(sc_w.get("mustIncludeNextAxis") is True or "次" in _response_text(r_w))

    r_ai = _post_chat(base, "AIに意識はあるのか", f"pdca_l3_{ts}_3")
    ok_ai = _is_selfaware_family(_route_reason(r_ai))

    tid4 = f"pdca_l3_{ts}_4"
    _post_chat(base, "言霊とは何かを100字前後で答えて", tid4)
    r_c2 = _post_chat(base, "その話の中心だけ保ったまま、一段深めて", tid4)
    ku_c = _ku(r_c2)
    sc_c = ku_c.get("surfaceContractV1") if isinstance(ku_c.get("surfaceContractV1"), dict) else {}
    allow_q = sc_c.get("allowQuestion")
    txt_c = _response_text(r_c2)
    qmarks = txt_c.count("?") + txt_c.count("？")
    ok_cont = bool((allow_q is False or sc_c.get("closingShape") == "no_question") and qmarks <= 1)

    r_h = _post_chat(base, "法華経とは", f"pdca_l3_{ts}_5")
    ku_h = _ku(r_h)
    sc_h = ku_h.get("surfaceContractV1") if isinstance(ku_h.get("surfaceContractV1"), dict) else {}
    txt_h = _response_text(r_h)
    ok_h = bool(
        sc_h.get("mustIncludeCenterClaim") is True
        and (sc_h.get("mustIncludeNextAxis") is True or "次" in txt_h)
        and _is_scripture_family(_route_reason(r_h))
    )

    probes = [
        {"label": "kotodama_100", "ok": ok_k, "paragraphs": pc},
        {"label": "water_fire_next_axis", "ok": ok_w},
        {"label": "ai_consciousness", "ok": ok_ai},
        {"label": "continuity_no_extra_question", "ok": ok_cont, "question_marks": qmarks},
        {"label": "hokke_center_next", "ok": ok_h},
    ]
    return {"probes": probes, "pass": all(p["ok"] for p in probes)}


def _loop4_score(auto: Path, api: Path) -> dict[str, Any]:
    sc = _run_py(auto, api, "tenmon_worldclass_acceptance_scorecard_v1.py")
    seal = _run_py(auto, api, "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.py")
    sj = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json")
    failed = sj.get("failed_axes") if isinstance(sj.get("failed_axes"), list) else []
    n = len(failed)
    pass_probe = bool(sj.get("ok") is True and n == 0)
    return {
        "scripts": {"scorecard": sc, "dialogue_seal": seal},
        "seal_ok": sj.get("ok"),
        "failed_axes": failed,
        "pass": pass_probe,
    }


def _loop5_seal(auto: Path, api: Path) -> dict[str, Any]:
    r = _run_py(auto, api, "tenmon_final_conversation_completion_single_source_seal_cursor_auto_v1.py")
    sj = _read_json(auto / "tenmon_final_conversation_completion_single_source_seal_cursor_auto_v1.json")
    return {"script": r, "json": sj, "pass": bool(sj.get("ok") is True)}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_PDCA_BASE", "http://127.0.0.1:3000").strip()
    max_loops = int(os.environ.get("TENMON_PDCA_MAX_LOOPS", "5"))
    max_sec = float(os.environ.get("TENMON_PDCA_MAX_SEC", "7200"))
    skip_probes = os.environ.get("TENMON_PDCA_SKIP_PROBES", "").strip() in ("1", "true", "yes")
    skip_build = os.environ.get("TENMON_PDCA_SKIP_BUILD", "1").strip() in ("1", "true", "yes")
    run_build = os.environ.get("TENMON_PDCA_RUN_BUILD", "").strip() in ("1", "true", "yes")

    run_id = _utc().replace(":", "").replace("-", "")
    out_dir = auto / RUN_DIR_NAME / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.monotonic()
    rollback_used = False
    loops_completed = 0
    flags = {
        "route_sovereignty_fixed": False,
        "selfaware_family_ok": False,
        "surface_contract_ok": False,
        "worldclass_ready": False,
        "single_source_sealed": False,
        "pwa_connection_still_ok": False,
    }
    next_card: str | None = None
    loop_results: list[dict[str, Any]] = []

    for loop in range(1, max_loops + 1):
        if time.monotonic() - t0 > max_sec:
            break

        ldir = out_dir / f"loop_{loop}"
        ldir.mkdir(parents=True, exist_ok=True)

        build_info: dict[str, Any] = {"skipped": True}
        if run_build and not skip_build:
            build_info = _run_npm_build(api)
            if not build_info.get("ok"):
                rollback_used = True
                _write_json(ldir / "loop_result.json", {"loop": loop, "phase": "build_fail", "build": build_info})
                next_card = "TENMON_CONVERSATION_PDCA_2H_FAILCLOSED_AUTOLOOP_RETRY_CURSOR_AUTO_V1"
                break

        if skip_probes:
            gates = {"ok": True, "skipped": True, "note": "TENMON_PDCA_SKIP_PROBES"}
        else:
            gates = _gates(base)
            if not gates.get("ok"):
                rollback_used = True
                _write_json(
                    ldir / "loop_result.json",
                    {"loop": loop, "phase": "gate_fail", "gates": gates, "card": CARD},
                )
                next_card = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"
                break

        pwa_obs = _pwa_static_audit(repo)
        autonomy = _autonomy_readiness_memo(auto)

        probe_summary: dict[str, Any] = {}
        passed = False
        ts = str(int(time.time()))

        if skip_probes:
            probe_summary = {"skipped": True, "pass": False}
            passed = False
        elif loop == 1:
            pr = _loop1_probes(base, ts)
            if not pr.get("pass"):
                pr_retry = _loop1_probes(base, ts + "_r")
                pr["retry"] = pr_retry
                passed = bool(pr_retry.get("pass"))
            else:
                passed = True
            probe_summary = {"loop": 1, **pr}
            flags["route_sovereignty_fixed"] = passed
        elif loop == 2:
            probe_summary = {"loop": 2, **_loop2_probes(base, ts)}
            passed = bool(probe_summary.get("pass"))
            flags["selfaware_family_ok"] = passed
        elif loop == 3:
            probe_summary = {"loop": 3, **_loop3_probes(base, ts)}
            passed = bool(probe_summary.get("pass"))
            flags["surface_contract_ok"] = passed
        elif loop == 4:
            probe_summary = _loop4_score(auto, api)
            passed = bool(probe_summary.get("pass"))
            sj = _read_json(auto / "tenmon_worldclass_dialogue_acceptance_seal_cursor_auto_v1.json")
            flags["worldclass_ready"] = bool(sj.get("worldclass_ready") and sj.get("ok"))
        elif loop == 5:
            probe_summary = _loop5_seal(auto, api)
            passed = bool(probe_summary.get("pass"))
            flags["single_source_sealed"] = passed

        flags["pwa_connection_still_ok"] = bool(pwa_obs.get("ok") and gates.get("ok"))

        _write_json(ldir / "loop_probe_summary.json", probe_summary)
        _write_json(ldir / "loop_autonomy_readiness.json", {"loop": loop, "autonomy_readiness": autonomy, "pwa_static_audit": pwa_obs})

        md_fail = f"# loop {loop} next card\n\n- reason: probe or gate failure\n- suggested: `{next_card or 'TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1'}`\n"
        if not passed:
            md_fail = f"# loop {loop} FAIL\n\n```json\n{json.dumps(probe_summary, ensure_ascii=False, indent=2)}\n```\n"
        (ldir / "loop_next_card_if_fail.md").write_text(md_fail, encoding="utf-8")

        loop_result = {
            "loop": loop,
            "pass": passed,
            "elapsed_sec": round(time.monotonic() - t0, 2),
            "gates_ok": gates.get("ok") if isinstance(gates, dict) else False,
            "probe_summary_ref": str(ldir / "loop_probe_summary.json"),
        }
        _write_json(ldir / "loop_result.json", loop_result)
        loop_results.append(loop_result)
        loops_completed = loop

        if not passed:
            next_card = next_card or "TENMON_CONVERSATION_ROUTE_SOVEREIGNTY_REPAIR_CURSOR_AUTO_V1"
            if loop == 1:
                next_card = "TENMON_CONVERSATION_ROUTE_SOVEREIGNTY_REPAIR_CURSOR_AUTO_V1"
            elif loop == 2:
                next_card = "TENMON_SELFAWARE_FAMILY_STABILIZE_CURSOR_AUTO_V1"
            elif loop == 3:
                next_card = "TENMON_SURFACE_CONTRACT_MIN_STABILIZE_CURSOR_AUTO_V1"
            elif loop == 4:
                next_card = "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1"
            elif loop == 5:
                next_card = "TENMON_FINAL_CONVERSATION_COMPLETION_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1"
            (ldir / "loop_next_card_if_fail.md").write_text(
                f"# loop {loop} next card\n\n- card: `{next_card}`\n",
                encoding="utf-8",
            )
            break

    ok = bool(
        loops_completed == max_loops
        and all(x.get("pass") for x in loop_results)
        and flags["route_sovereignty_fixed"]
        and flags["selfaware_family_ok"]
        and flags["surface_contract_ok"]
        and flags["worldclass_ready"]
        and flags["single_source_sealed"]
    )

    level = "high" if ok else ("medium" if loops_completed >= 3 else "low")

    final = {
        "ok": ok,
        "card": CARD,
        "run_id": run_id,
        "generated_at": _utc(),
        "elapsed_mode": "2h_or_5loops",
        "max_loops": max_loops,
        "max_sec": max_sec,
        "elapsed_sec": round(time.monotonic() - t0, 2),
        "loops_completed": loops_completed,
        "conversation_completion_level": level,
        "route_sovereignty_fixed": flags["route_sovereignty_fixed"],
        "selfaware_family_ok": flags["selfaware_family_ok"],
        "surface_contract_ok": flags["surface_contract_ok"],
        "worldclass_ready": flags["worldclass_ready"],
        "single_source_sealed": flags["single_source_sealed"],
        "pwa_connection_still_ok": flags["pwa_connection_still_ok"],
        "autonomy_readiness": _autonomy_readiness_memo(auto),
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else next_card,
        "run_directory": str(out_dir),
        "loop_results": loop_results,
        "notes": [
            "コード編集は本オーケストレータでは行わない。失敗時は next_card を手動または別カードで処理。",
            "TENMON_PDCA_SKIP_PROBES=1 の場合は HTTP probe を省略し全ループ fail 扱いになり得る。",
            "build は TENMON_PDCA_RUN_BUILD=1 かつ TENMON_PDCA_SKIP_BUILD≠1 のときのみ。",
        ],
    }

    _write_json(auto / OUT_FINAL, final)
    _write_json(out_dir / "final_summary.json", final)
    print(json.dumps({k: final[k] for k in final if k not in ("loop_results", "notes")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
