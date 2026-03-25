#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_V1 — 全 OS の成果物を同一レジストリで解決し、
exists=false の誤判定を減らすための正規化レポートを生成する。
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from output_contract_registry_v1 import CANONICAL_SYSTEMS, registry_document
from output_contract_snap_resolver_v1 import resolve_artifact

CARD = "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_V1"
FAIL_NEXT = "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def run_normalize(out_dir: Path, api_root: Path) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    artifacts_out: Dict[str, Any] = {}
    matrix: List[Dict[str, Any]] = []
    counts: Dict[str, int] = {}

    for sys_id, spec in CANONICAL_SYSTEMS.items():
        for art in spec.get("artifacts") or []:
            fn = art["filename"]
            keys = list(art.get("required_json_keys") or [])
            opt = bool(art.get("optional"))
            key = f"{sys_id}:{fn}"
            sr = resolve_artifact(sys_id, fn, keys, api_root, optional=opt)
            d = asdict(sr)
            d["path"] = str(sr.path) if sr.path else None
            artifacts_out[key] = {
                "system": sys_id,
                "filename": fn,
                "optional": opt,
                "source_resolved_from": sr.source_resolved_from,
                "emission_state": sr.emission_state,
                "contract_ok": sr.contract_ok,
                "contract_detail": sr.contract_detail,
                "path": d["path"],
                "alternate_hits": sr.alternate_hits,
            }
            matrix.append(
                {
                    "key": key,
                    "system": sys_id,
                    "filename": fn,
                    "source_resolved_from": sr.source_resolved_from,
                    "emission_state": sr.emission_state,
                    "contract_ok": sr.contract_ok,
                    "path": d["path"],
                }
            )
            st = sr.emission_state
            counts[st] = counts.get(st, 0) + 1

    # output_contracts 互換束（integrator と同じキー意図 + source_resolved_from）
    orch = api_root / "automation" / "out" / "tenmon_full_orchestrator_v1"
    contracts_bundle: Dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "registry_version": 1,
        "artifacts": artifacts_out,
        "source_resolved_from_index": {
            k: v["source_resolved_from"] for k, v in artifacts_out.items()
        },
    }
    for name in ("full_orchestrator_queue.json", "full_orchestrator_manifest.json"):
        p = orch / name
        k = f"orchestrator_{name.replace('.json', '')}"
        if p.is_file():
            raw: Any = json.loads(p.read_text(encoding="utf-8", errors="replace"))
            if isinstance(raw, dict):
                raw = dict(raw)
                raw["_meta"] = {"source_resolved_from": f"out_dir:{p.relative_to(api_root)}"}
                contracts_bundle[k] = raw

    report = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "emission_state_counts": counts,
        "required_failures": [
            k
            for k, v in artifacts_out.items()
            if not v["optional"] and (not v["contract_ok"] or v["emission_state"] == "not_emitted")
        ],
        "notes": [
            "emitted_in_log_only は out 未配置だが /var/log/tenmon に実体あり（exists=false 誤判定の候補）。",
            "source_resolved_from で採用パスを追跡。",
        ],
    }

    req_fail = len(report["required_failures"])
    opt_mismatch = sum(
        1
        for v in artifacts_out.values()
        if v["optional"] and not v["contract_ok"] and v["contract_detail"] != "optional_absent"
    )
    if req_fail == 0 and opt_mismatch == 0:
        overall = "aligned"
    elif req_fail == 0:
        overall = "partial"
    else:
        overall = "drift"

    integrated = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "overall": overall,
        "required_artifact_failures": req_fail,
        "optional_contract_issues": opt_mismatch,
        "systems": {},
        "false_negative_risk": "low" if overall == "aligned" else ("medium" if overall == "partial" else "high"),
        "fail_next_card": FAIL_NEXT,
    }

    for sys_id in CANONICAL_SYSTEMS:
        keys = [k for k in artifacts_out if k.startswith(sys_id + ":")]
        rows = [artifacts_out[k] for k in keys]
        ok_req = all(
            r["contract_ok"] or r.get("optional") for r in rows if not r.get("optional")
        )
        integrated["systems"][sys_id] = {
            "aligned": ok_req,
            "artifacts": {r["filename"]: r["emission_state"] for r in rows},
        }

    reg_doc = registry_document()
    (out_dir / "output_contract_registry.json").write_text(
        json.dumps(
            {
                **reg_doc,
                "resolved_artifacts": artifacts_out,
                "source_resolved_from_index": contracts_bundle["source_resolved_from_index"],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (out_dir / "output_contract_normalize_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "output_contract_resolution_matrix.json").write_text(
        json.dumps({"version": 1, "generated_at": _utc(), "rows": matrix}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out_dir / "integrated_contract_verdict.json").write_text(
        json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    # integrator 互換の束（source_resolved_from 付き）
    (out_dir / "output_contracts.json").write_text(
        json.dumps(contracts_bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    return {
        "ok": True,
        "out_dir": str(out_dir),
        "overall": overall,
        "outputs": [
            "output_contract_registry.json",
            "output_contract_normalize_report.json",
            "output_contract_resolution_matrix.json",
            "integrated_contract_verdict.json",
            "output_contracts.json",
        ],
    }


def merge_registry_into_output_contracts(integrator_contracts: Dict[str, Any], api: Path) -> Dict[str, Any]:
    """tenmon_ultra_forensic_integrator 等から呼び出し、正規化済みレジストリをマージする。"""
    reg_path = api / "automation" / "out" / "os_output_contract_normalize_v1" / "output_contract_registry.json"
    if not reg_path.is_file():
        return integrator_contracts
    try:
        reg = json.loads(reg_path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return integrator_contracts
    idx = reg.get("source_resolved_from_index") or {}
    integrator_contracts["output_contract_registry_ref"] = str(reg_path.relative_to(api))
    integrator_contracts["source_resolved_from"] = idx
    return integrator_contracts


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="default: api/automation/out/os_output_contract_normalize_v1",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()
    api = _api_root()
    out = Path(args.out_dir) if args.out_dir else (api / "automation" / "out" / "os_output_contract_normalize_v1")
    out = out.resolve()
    blob = run_normalize(out, api)
    marker = api / "automation" / "TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_VPS_V1"
    marker.write_text(f"{_utc()}\n{CARD}\noverall={blob.get('ok')}\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(blob, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
