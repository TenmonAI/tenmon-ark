#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1

Stage1 達成後: 継続リンク・one_step 可視・unknown bridge を観測。
出力: api/automation/reports/TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1/<UTC>/
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1"
VERSION = 1

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]

CONTINUITY_PROBES = frozenset(
    {"continuity_followup_1", "continuity_followup_2", "next_step_1", "next_step_2"}
)


def _utc_folder() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _atomic_write(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    if isinstance(obj, str):
        tmp.write_text(obj, encoding="utf-8")
    else:
        tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _run_shell(cmd: str, cwd: Path, timeout: int = 600) -> Tuple[int, str]:
    p = subprocess.run(
        cmd,
        shell=True,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def _sq(s: str) -> str:
    return shlex.quote(s)


def _http_json(method: str, url: str, body: Optional[bytes] = None, timeout: int = 90) -> Dict[str, Any]:
    req = urllib.request.Request(url, method=method, data=body)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.getcode(), "json": json.loads(raw) if raw.strip() else None}
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok": False, "status": e.code, "error": str(e), "raw": raw[:1200]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _route_surface_family(rr: Optional[str]) -> str:
    s = str(rr or "").strip()
    if not s:
        return "unknown"
    if s == "NATURAL_GENERAL_LLM_TOP":
        return "fallback_general"
    if "UNKNOWN_TERM_BRIDGE" in s:
        return "unknown_bridge"
    if "JUDGEMENT" in s:
        return "judgement"
    if "NEXTSTEP" in s or "CONTINUITY" in s or "ESSENCE_FOLLOWUP" in s:
        return "continuity_nextstep"
    if "WORLDVIEW" in s:
        return "worldview"
    if "SELFAWARE" in s or "CONSCIOUSNESS" in s:
        return "selfaware"
    if "COMPARE" in s:
        return "compare"
    if "DEF_" in s or "FASTPATH" in s or "SUBCONCEPT" in s or "SCRIPTURE" in s or "KATAKAMUNA" in s:
        return "define_scripture"
    return "other"


def _probe_specs(ts: str) -> List[Dict[str, str]]:
    cont = f"s2-cont-{ts}"
    nxt = f"s2-next-{ts}"
    return [
        {"id": "continuity_followup_1", "threadId": cont, "message": "さっきの話の続きで、水火だけ一言で言って"},
        {"id": "continuity_followup_2", "threadId": cont, "message": "その続きを五十音一言法則に接続して"},
        {"id": "next_step_seed", "threadId": nxt, "message": "この件をどう整理すればいい？"},
        {"id": "next_step_1", "threadId": nxt, "message": "その整理の次の一手は？"},
        {"id": "next_step_2", "threadId": nxt, "message": "その一手を今日中に一つに絞ると？"},
        {"id": "compare_1", "threadId": f"s2-iso-{ts}-c1", "message": "言霊とカタカムナの違いを教えて"},
        {"id": "compare_2", "threadId": f"s2-iso-{ts}-c2", "message": "魂と心の違いは？"},
        {
            "id": "unknown_term_1",
            "threadId": f"s2-iso-{ts}-u1",
            "message": "コトタマデルタセンサーとは何ですか？",
        },
        {
            "id": "unknown_term_2",
            "threadId": f"s2-iso-{ts}-u2",
            "message": "テンモン観測用語_ZETAって何を指す？",
        },
        {"id": "worldview_1", "threadId": f"s2-iso-{ts}-wv", "message": "天聞の世界観を一文でどう置く？"},
        {
            "id": "selfaware_dense_1",
            "threadId": f"s2-iso-{ts}-sa",
            "message": "あなたは何者として応答の責任を負っているの？",
        },
    ]


def _density_stage2(row: Dict[str, Any]) -> Dict[str, Any]:
    text = str(row.get("_text") or "")[:8000]
    probe = str(row.get("probe") or "")
    one_step = bool(re.search(r"次|一手|どちら|どれから|今日|今週", text))
    cont_link = True
    if probe == "continuity_followup_1":
        cont_link = bool(re.search(r"水|火", text))
    elif probe == "continuity_followup_2":
        cont_link = bool(re.search(r"五十|いろは|音|一言", text))
    prior = "【前回の芯】" in text
    delta = "【いまの差分】" in text
    nxf = "【次の一手】" in text
    carry_surface = prior and delta and nxf
    ub = 0
    if probe.startswith("unknown_term"):
        keys = [r"観測", r"近傍", r"読みの方向", r"次に必要な", r"保留"]
        ub = sum(1 for k in keys if re.search(k, text))
    return {
        "heuristicVersion": "stage2_v1",
        "one_step_visibility": one_step,
        "continuity_link_hit": cont_link,
        "carry_three_markers_hit": carry_surface,
        "unknown_bridge_density": ub,
    }


def _probe_row(base: str, probe_id: str, message: str, thread_id: str) -> Dict[str, Any]:
    url = base.rstrip("/") + "/api/chat"
    payload = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    t0 = time.time()
    r = _http_json("POST", url, payload, timeout=120)
    row: Dict[str, Any] = {
        "probe": probe_id,
        "threadId": thread_id,
        "message": message,
        "ok": False,
        "latency_s": round(time.time() - t0, 3),
        "rr": None,
        "hasResponsePlan": False,
        "rp_rr": None,
        "hasThreadCoreInFrame": False,
        "route_reason_mismatch": False,
        "continuity_bad": False,
        "fallback_bleed": False,
        "error": None,
        "_text": "",
    }
    if not r.get("ok") or r.get("status") != 200:
        row["error"] = r.get("error") or f"http_{r.get('status')}"
        return row
    obj = r.get("json") or {}
    df = obj.get("decisionFrame") if isinstance(obj, dict) else None
    ku = (df or {}).get("ku") if isinstance(df, dict) else None
    if not isinstance(ku, dict):
        ku = {}
    resp = str(obj.get("response") or "")
    row["_text"] = resp
    row["rr"] = ku.get("routeReason")
    rp = ku.get("responsePlan")
    row["hasResponsePlan"] = isinstance(rp, dict) and len(rp) > 0
    if isinstance(rp, dict):
        row["rp_rr"] = rp.get("routeReason")
    tc = ku.get("threadCore")
    row["hasThreadCoreInFrame"] = isinstance(tc, dict) and len(tc) > 0
    row["route_reason_mismatch"] = bool(row["rr"] and row["rp_rr"] and row["rr"] != row["rp_rr"])
    row["fallback_bleed"] = row["rr"] == "NATURAL_GENERAL_LLM_TOP"
    fam = _route_surface_family(row.get("rr"))
    if probe_id in CONTINUITY_PROBES and row["fallback_bleed"]:
        row["continuity_bad"] = True
    if probe_id in CONTINUITY_PROBES and fam == "fallback_general":
        row["continuity_bad"] = True
    row["ok"] = True
    row["density"] = _density_stage2(row)
    row["surfaceFamily"] = fam
    del row["_text"]
    return row


def _continuity_reset_audit(repo: Path, gen_at: str) -> Dict[str, Any]:
    files = [
        "api/src/core/threadCoreCarryProjectionV1.ts",
        "api/src/core/threadCoreLinkSurfaceV1.ts",
        "api/src/core/threadCore.ts",
        "api/src/core/tenmonGateThreadContextV1.ts",
        "api/src/core/tenmonBrainstem.ts",
        "api/src/routes/chat_refactor/continuity_trunk_v1.ts",
        "api/src/routes/chat_refactor/general_trunk_v1.ts",
    ]
    out: Dict[str, Any] = {"generatedAt": gen_at, "card": CARD, "files": {}}
    for rel in files:
        p = repo / rel
        out["files"][rel] = {
            "exists": p.is_file(),
            "bytes": p.stat().st_size if p.is_file() else 0,
        }
    return out


def _unknown_bridge_audit_static(repo: Path, gen_at: str) -> Dict[str, Any]:
    p = repo / "api" / "src" / "routes" / "chat_refactor" / "general_trunk_v1.ts"
    raw = p.read_text(encoding="utf-8", errors="replace") if p.is_file() else ""
    return {
        "generatedAt": gen_at,
        "TENMON_UNKNOWN_TERM_BRIDGE_V1_in_general_trunk": "TENMON_UNKNOWN_TERM_BRIDGE_V1" in raw,
        "STAGE2_UNKNOWN_TERM_MARKERS_V1": "STAGE2_UNKNOWN_TERM_MARKERS_V1" in raw,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--base-url", default=os.environ.get("TENMON_PROBE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--repo-root", type=Path, default=_REPO_ROOT)
    ap.add_argument("--utc", default=None)
    ap.add_argument("--skip-build", action="store_true")
    args = ap.parse_args()

    repo = args.repo_root.resolve()
    utc = args.utc or _utc_folder()
    out_dir = repo / "api" / "automation" / "reports" / CARD / utc
    out_dir.mkdir(parents=True, exist_ok=True)
    gen_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    build_ok = True
    if not args.skip_build:
        bc, blog = _run_shell("npm run build", repo / "api", timeout=900)
        build_ok = bc == 0
        _atomic_write(out_dir / "baseline_build_stage2.log", blog)
    else:
        _atomic_write(out_dir / "baseline_build_stage2.log", "[skip-build]")

    health = _http_json("GET", args.base_url.rstrip("/") + "/health", None, 15)
    health_ok = bool(health.get("ok") and (health.get("json") or {}).get("status") == "ok")

    specs = _probe_specs(utc.replace(":", ""))
    probes: List[Dict[str, Any]] = []
    for sp in specs:
        probes.append(_probe_row(args.base_url, sp["id"], sp["message"], sp["threadId"]))

    ok_rows = [p for p in probes if p.get("ok")]
    n_ok = len(ok_rows)
    dn = max(n_ok, 1)

    cont_rows = [p for p in ok_rows if p.get("probe") in ("continuity_followup_1", "continuity_followup_2")]
    ct = max(len(cont_rows), 1)
    cont_rate = round(100 * sum(1 for p in cont_rows if p.get("density", {}).get("continuity_link_hit")) / ct, 2)

    one_step_rate = round(100 * sum(1 for p in ok_rows if p.get("density", {}).get("one_step_visibility")) / dn, 2)

    unk_rows = [p for p in ok_rows if str(p.get("probe", "")).startswith("unknown_term")]
    uk = max(len(unk_rows), 1)
    unk_avg = sum(p.get("density", {}).get("unknown_bridge_density", 0) for p in unk_rows) / uk
    unknown_bridge_completion = round(min(100, 20 * unk_avg), 2)

    continuity_bad_n = sum(1 for p in ok_rows if p.get("continuity_bad"))
    rr_mismatch_n = sum(1 for p in ok_rows if p.get("route_reason_mismatch"))
    miss_rp = sum(1 for p in ok_rows if not p.get("hasResponsePlan"))
    miss_tc = sum(1 for p in ok_rows if not p.get("hasThreadCoreInFrame"))

    carry_matrix = {
        "generatedAt": gen_at,
        "probes": [
            {
                "probe": p.get("probe"),
                "rr": p.get("rr"),
                "surfaceFamily": p.get("surfaceFamily"),
                "carry_three_markers_hit": (p.get("density") or {}).get("carry_three_markers_hit"),
                "continuity_link_hit": (p.get("density") or {}).get("continuity_link_hit"),
                "one_step_visibility": (p.get("density") or {}).get("one_step_visibility"),
            }
            for p in ok_rows
        ],
    }

    pass_cont = cont_rate >= 92
    pass_os = one_step_rate >= 96
    pass_ub = unknown_bridge_completion >= 90
    pass_cb = continuity_bad_n <= 1
    pass_rr = rr_mismatch_n == 0
    pass_rp = miss_rp == 0
    pass_tcf = miss_tc == 0
    pass_all = (
        build_ok
        and health_ok
        and pass_cont
        and pass_os
        and pass_ub
        and pass_cb
        and pass_rr
        and pass_rp
        and pass_tcf
    )

    patch_plan = f"""# patch_plan_stage2 — {CARD}

## 本サイクル

- `threadCoreLinkSurfaceV1.ts`: Stage2 3点表面（前回の芯／いまの差分／次の一手）+ 水火・五十音エコー
- `chat.ts`: 継続・next・compare 先取り応答を上記フォーマットへ統一、unknown bridge 出口を `general_trunk_v1` から接続
- `general_trunk_v1.ts`: `TENMON_UNKNOWN_TERM_BRIDGE_V1`
- `responsePlanCore.ts`: unknown bridge surface + `clampKuRouteClassToAnswerFrameV1`
- `threadCoreCarryProjectionV1.ts`: unknown bridge carry 型
- `continuity_trunk_v1.ts`: chat と同型の表面（将来配線用）

## 検証

`npm run build` → API restart → 本スクリプト
"""

    patch_result = {
        "generatedAt": gen_at,
        "appliedThemes": ["STAGE2_CONTINUITY_UNKNOWN_V1"],
        "touchedFiles": [
            "api/src/core/threadCoreLinkSurfaceV1.ts",
            "api/src/routes/chat.ts",
            "api/src/routes/chat_refactor/general_trunk_v1.ts",
            "api/src/routes/chat_refactor/continuity_trunk_v1.ts",
            "api/src/planning/responsePlanCore.ts",
            "api/src/core/threadCoreCarryProjectionV1.ts",
        ],
    }

    cycle_summary = {
        "generatedAt": gen_at,
        "acceptance": {
            "continuity_link_hit_rate_ok": pass_cont,
            "one_step_visibility_rate_ok": pass_os,
            "unknown_bridge_completion_ok": pass_ub,
            "continuity_bad_ok": pass_cb,
            "route_reason_mismatch_ok": pass_rr,
            "responsePlan_missing_ok": pass_rp,
            "threadCore_missing_ok": pass_tcf,
            "build_ok": build_ok,
            "health_ok": health_ok,
            "stage2_pass": pass_all,
        },
        "metrics": {
            "continuity_link_hit_rate": cont_rate,
            "one_step_visibility_rate": one_step_rate,
            "unknown_bridge_completion": unknown_bridge_completion,
            "continuity_bad_count": continuity_bad_n,
            "route_reason_mismatch_count": rr_mismatch_n,
            "responsePlan_missing_count": miss_rp,
            "threadCore_missing_count": miss_tc,
        },
    }

    verdict = f"""# stage2_verdict ({utc})

## 判定

- **STAGE2_PASS**: **{pass_all}**
- continuity_link_hit_rate: **{cont_rate}** (>= 92) → {pass_cont}
- one_step_visibility_rate: **{one_step_rate}** (>= 96) → {pass_os}
- unknown_bridge_completion: **{unknown_bridge_completion}** (>= 90) → {pass_ub}
- continuity_bad: **{continuity_bad_n}** (<= 1) → {pass_cb}
- route_reason_mismatch: **{rr_mismatch_n}** → {pass_rr}
- responsePlan missing: **{miss_rp}** → {pass_rp}
- threadCore missing: **{miss_tc}** → {pass_tcf}

## 次カード

- 達成時: `TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1`
- Stage1 再発時: Stage1 へ戻す

---
観測は実行中 API に依存。**restart 後**に再実行すること。
"""

    _atomic_write(out_dir / "continuity_reset_audit_stage2.json", _continuity_reset_audit(repo, gen_at))
    _atomic_write(out_dir / "unknown_bridge_audit_stage2.json", _unknown_bridge_audit_static(repo, gen_at))
    _atomic_write(out_dir / "carry_projection_matrix_stage2.json", carry_matrix)
    _atomic_write(out_dir / "patch_plan_stage2.md", patch_plan)
    _atomic_write(out_dir / "patch_result_stage2.json", patch_result)
    _atomic_write(out_dir / "cycle_summary_stage2.json", cycle_summary)
    _atomic_write(out_dir / "stage2_verdict.md", verdict)
    _atomic_write(out_dir / "baseline_probes_stage2.json", {"generatedAt": gen_at, "probes": probes})
    _atomic_write(out_dir / "run.log", f"{CARD} utc={utc} stage2_pass={pass_all}\n")

    print(json.dumps(cycle_summary["acceptance"], ensure_ascii=False, indent=2))
    return 0 if pass_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
