#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1

Stage1 観測 + acceptance 判定。必須 probe のみ再実行。
出力: api/automation/reports/TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1/<UTC>/
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
from typing import Any, Dict, List, Optional, Set, Tuple

CARD = "TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1"
VERSION = 1

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]

FORENSIC_CARD = "TENMON_CONVERSATION_DEEP_BLOCKER_FORENSIC_V1"


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


def _http_json(method: str, url: str, body: Optional[bytes] = None, timeout: int = 25) -> Dict[str, Any]:
    req = urllib.request.Request(url, method=method, data=body)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return {
                "ok": True,
                "status": resp.getcode(),
                "json": json.loads(raw) if raw.strip() else None,
            }
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok": False, "status": e.code, "error": str(e), "raw": raw[:1200]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _norm_ws(s: str) -> str:
    return re.sub(r"\s+", "", str(s or ""))


def _merged_tail_dup(text: str) -> bool:
    paras = [p.strip() for p in re.split(r"\n{2,}", str(text or "")) if p.strip()]
    if len(paras) < 3:
        return False
    for i in range(2, len(paras)):
        merged = _norm_ws(paras[i - 2] + paras[i - 1])
        if len(merged) >= 32 and _norm_ws(paras[i]) == merged:
            return True
    return False


def _probe_specs(ts: str) -> List[Dict[str, str]]:
    cont = f"s1-cont-{ts}"
    nxt = f"s1-next-{ts}"
    return [
        {"id": "continuity_seed", "threadId": cont, "message": "カタカムナとは何ですか？"},
        {"id": "continuity_followup_1", "threadId": cont, "message": "さっきの話の続きで、水火だけ一言で言って"},
        {"id": "next_step_seed", "threadId": nxt, "message": "この件をどう整理すればいい？"},
        {"id": "next_step_1", "threadId": nxt, "message": "その整理の次の一手は？"},
        {"id": "next_step_2", "threadId": nxt, "message": "その一手を今日中に一つに絞ると？"},
        {"id": "support_dense_1", "threadId": f"s1-iso-{ts}-sd", "message": "いま心が折れそうで、何から整えればいいか分からない"},
        {"id": "selfaware_dense_1", "threadId": f"s1-iso-{ts}-sa", "message": "あなたは何者として応答の責任を負っているの？"},
        {"id": "worldview_1", "threadId": f"s1-iso-{ts}-wv", "message": "天聞の世界観を一文でどう置く？"},
        {"id": "judge_1", "threadId": f"s1-iso-{ts}-j1", "message": "この件をどう整理すればいい？"},
        {"id": "why_break", "threadId": f"s1-iso-{ts}-wb", "message": "会話が崩れるのはなぜ？"},
        {"id": "longform_3k", "threadId": f"s1-iso-{ts}-3k", "message": "3000字で言霊を本質から説明して"},
        {"id": "longform_8k", "threadId": f"s1-iso-{ts}-8k", "message": "8000字でカタカムナと言霊の関係を章立てで書いて"},
    ]


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
        "responseHead": "",
        "helper_tail_bad": False,
        "generic_preamble_bad": False,
        "center_preamble_bad": False,
        "repetition_bad": False,
        "merged_duplicate_paragraph_bad": False,
        "ref_bundle_leak_bad": False,
        "fallback_bleed": False,
        "longform_shortfall": False,
        "error": None,
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
    row["rr"] = ku.get("routeReason")
    row["responseHead"] = resp[:500].replace("\n", "\\n")
    row["ok"] = True
    row["helper_tail_bad"] = "（補助）" in resp
    row["generic_preamble_bad"] = bool(
        re.search(r"この問いについて、今回は(定義|分析)の立場で答えます。", resp)
    )
    row["center_preamble_bad"] = len(re.findall(r"【中心】", resp[:1200])) >= 2
    paras = [p.strip() for p in re.split(r"\n\n+", resp) if p.strip()]
    seen: Set[str] = set()
    dup = False
    for p in paras:
        if p in seen:
            dup = True
            break
        seen.add(p)
    row["repetition_bad"] = dup
    row["merged_duplicate_paragraph_bad"] = _merged_tail_dup(resp)
    row["ref_bundle_leak_bad"] = bool(
        re.search(r"一貫の手がかりは|いまの答えは、典拠は|参照束（内部名は省略）", resp)
    )
    row["fallback_bleed"] = row["rr"] == "NATURAL_GENERAL_LLM_TOP"
    if probe_id == "longform_3k":
        row["longform_shortfall"] = len(resp) < 2400
    elif probe_id == "longform_8k":
        row["longform_shortfall"] = len(resp) < 6000
    return row


def _surface_family(rr: Optional[str]) -> str:
    s = str(rr or "")
    if s == "NATURAL_GENERAL_LLM_TOP":
        return "fallback_general"
    if "JUDGEMENT" in s:
        return "judgement"
    if "KANAGI" in s or "SUPPORT_" in s:
        return "support"
    if "NEXTSTEP" in s or "CONTINUITY" in s or "ESSENCE_FOLLOWUP" in s:
        return "continuity_nextstep"
    if "WORLDVIEW" in s:
        return "worldview"
    if "SELFAWARE" in s or "CONSCIOUSNESS_META" in s:
        return "selfaware"
    if "EXPLICIT_CHAR" in s:
        return "longform"
    return "other"


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
        _atomic_write(out_dir / "baseline_build_stage1.log", blog)
    else:
        _atomic_write(out_dir / "baseline_build_stage1.log", "[skip-build]")

    health = _http_json("GET", args.base_url.rstrip("/") + "/health", None, 15)
    audit = _http_json("GET", args.base_url.rstrip("/") + "/api/audit", None, 25)
    health_ok = bool(health.get("ok") and (health.get("json") or {}).get("status") == "ok")
    audit_ok = bool(audit.get("ok") and audit.get("status") == 200)

    specs = _probe_specs(utc.replace(":", ""))
    probes: List[Dict[str, Any]] = []
    for sp in specs:
        probes.append(_probe_row(args.base_url, sp["id"], sp["message"], sp["threadId"]))

    def cnt(key: str) -> int:
        return sum(1 for p in probes if p.get("ok") and p.get(key))

    n_ok = sum(1 for p in probes if p.get("ok"))
    runtime_surface_blockers = (
        cnt("helper_tail_bad")
        + cnt("generic_preamble_bad")
        + cnt("center_preamble_bad")
        + cnt("repetition_bad")
        + cnt("merged_duplicate_paragraph_bad")
        + cnt("ref_bundle_leak_bad")
    )
    fallback_n = cnt("fallback_bleed")

    by_fam: Dict[str, List[Dict[str, Any]]] = {}
    for p in probes:
        if not p.get("ok"):
            continue
        fam = _surface_family(p.get("rr"))
        by_fam.setdefault(fam, []).append(
            {
                "probe": p.get("probe"),
                "rr": p.get("rr"),
                "helper_tail_bad": p.get("helper_tail_bad"),
                "generic_preamble_bad": p.get("generic_preamble_bad"),
                "ref_bundle_leak_bad": p.get("ref_bundle_leak_bad"),
                "fallback_bleed": p.get("fallback_bleed"),
            }
        )

    forensic_note = (
        f"{FORENSIC_CARD}: repo 内スクリプト未検出（任意: 追加後に本レポートへ path を追記）"
    )

    baseline_summary = {
        "card": CARD,
        "version": VERSION,
        "generatedAt": gen_at,
        "build_ok": build_ok,
        "health_ok": health_ok,
        "audit_ok": audit_ok,
        "forensic": forensic_note,
        "reference_runners": [
            "api/automation/conversation_full_completion_pdca_autoloop_v1.py",
            "api/automation/final_seal_autopilot_v3.py",
        ],
        "probe_count": len(probes),
        "probe_ok": n_ok,
        "aggregates": {
            "runtime_surface_blockers": runtime_surface_blockers,
            "fallback_bleed_count": fallback_n,
            "helper_tail_bad": cnt("helper_tail_bad"),
            "generic_preamble_bad": cnt("generic_preamble_bad"),
            "center_preamble_bad": cnt("center_preamble_bad"),
            "repetition_bad": cnt("repetition_bad"),
            "merged_duplicate_paragraph_bad": cnt("merged_duplicate_paragraph_bad"),
            "ref_bundle_leak_bad": cnt("ref_bundle_leak_bad"),
            "longform_shortfall": cnt("longform_shortfall"),
        },
        "acceptance_thresholds": {
            "runtime_surface_blockers_max": 12,
            "require_zero": [
                "fallback_bleed",
                "helper_tail_bad",
                "generic_preamble_bad",
                "center_preamble_bad",
                "repetition_bad",
            ],
        },
    }

    pass_blockers = runtime_surface_blockers <= 12
    pass_fb = fallback_n == 0
    pass_ht = cnt("helper_tail_bad") == 0
    pass_gp = cnt("generic_preamble_bad") == 0
    pass_cp = cnt("center_preamble_bad") == 0
    pass_rep = cnt("repetition_bad") == 0
    pass_all = (
        build_ok
        and health_ok
        and audit_ok
        and pass_blockers
        and pass_fb
        and pass_ht
        and pass_gp
        and pass_cp
        and pass_rep
    )

    patch_plan = f"""# patch_plan_stage1 — {CARD}

## 本サイクルで入れた変更（観測に基づく surface のみ）

- `api/src/core/tenmonConversationSurfaceV1.ts`
  - `STRIP_HELPER_TAIL_ROUTES_V1` に `NATURAL_GENERAL_LLM_TOP` / `DEF_LLM_TOP` を追加
  - `GENERIC_RUNTIME_PREAMBLE_ROUTES_V1` に同上（mission 行の表出抑止）
  - `applyRuntimeSurfaceRepairV1`: 上記2 route のみ `stripInternalFootingParagraphsV1` + `参照束（内部名は省略）` 行除去 + 隣接段落 dedupe

## 触っていないもの（契約）

- `DEF_FASTPATH_VERIFIED_V1` / `TENMON_SCRIPTURE_CANON_V1` / `TENMON_SUBCONCEPT_CANON_V1` / `SOUL_FASTPATH_VERIFIED_V1` / `KATAKAMUNA_CANON_ROUTE_V1` の **本文核・routeReason** は変更なし

## 次サイクル（未達時）

- `chat.ts` / `majorRoutes.ts` の **route bleed**（NATURAL 落下）を **1 箇所**に寄せて修正
- `finalize.ts` と二重に同型修正を重ねないこと

## 検証

`npm run build` → API restart → 本スクリプト再実行
"""

    patch_result = {
        "generatedAt": gen_at,
        "appliedThemes": ["STAGE1_SURFACE_BLEED_V1"],
        "touchedFiles": ["api/src/core/tenmonConversationSurfaceV1.ts"],
        "note": "chat.ts / finalize.ts / majorRoutes.ts / responseComposer.ts は本パッチでは未変更",
    }

    cycle_summary = {
        "generatedAt": gen_at,
        "acceptance": {
            "runtime_surface_blockers_ok": pass_blockers,
            "fallback_bleed_zero": pass_fb,
            "helper_tail_zero": pass_ht,
            "generic_preamble_zero": pass_gp,
            "center_preamble_zero": pass_cp,
            "repetition_zero": pass_rep,
            "build_ok": build_ok,
            "health_ok": health_ok,
            "audit_ok": audit_ok,
            "probes_rerun_ok": n_ok == len(probes),
            "stage1_pass": pass_all,
        },
        "metrics": baseline_summary["aggregates"],
    }

    verdict = f"""# stage1_verdict ({utc})

## 判定

- **STAGE1_PASS**: **{pass_all}**
- runtime_surface_blockers: **{runtime_surface_blockers}** (threshold <= 12) → {pass_blockers}
- fallback_bleed: **{fallback_n}** (required 0) → {pass_fb}
- helper / generic / center / repetition: **{cnt("helper_tail_bad")} / {cnt("generic_preamble_bad")} / {cnt("center_preamble_bad")} / {cnt("repetition_bad")}** (required 0 each)

## 次カード

- 達成時: `TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1`
- 未達時: 本カード継続（route bleed 1 点修正から）

---
観測は実行中 API に依存する。**restart 後**に再実行すること。
"""

    _atomic_write(out_dir / "baseline_summary_stage1.json", baseline_summary)
    _atomic_write(out_dir / "surface_family_matrix_stage1.json", {"generatedAt": gen_at, "byFamily": by_fam})
    _atomic_write(out_dir / "patch_plan_stage1.md", patch_plan)
    _atomic_write(out_dir / "patch_result_stage1.json", patch_result)
    _atomic_write(out_dir / "cycle_summary_stage1.json", cycle_summary)
    _atomic_write(out_dir / "stage1_verdict.md", verdict)
    _atomic_write(out_dir / "run.log", f"{CARD} utc={utc} stage1_pass={pass_all}\n")

    try:
        sys_log = Path("/var/log/tenmon") / f"card_{CARD}" / utc
        sys_log.mkdir(parents=True, exist_ok=True)
        (sys_log / "run.log").write_text(f"{CARD} utc={utc}\n", encoding="utf-8")
    except OSError:
        pass

    print(json.dumps(cycle_summary["acceptance"], ensure_ascii=False, indent=2))
    return 0 if pass_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
