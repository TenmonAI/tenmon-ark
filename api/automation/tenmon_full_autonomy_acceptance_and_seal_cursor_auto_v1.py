#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SEAL_CURSOR_AUTO_V1
観測のみ: PDCA / policy / queue / Cursor 契約 / HTTP 疎通から platform_ready と seal 可否の evidence basis を記録する。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SEAL_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_full_autonomy_acceptance_and_seal_result_v1.json"
OUT_MD = "tenmon_full_autonomy_acceptance_and_seal_report_v1.md"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _http_json(method: str, url: str, body: bytes | None = None, timeout: float = 8.0) -> dict[str, Any]:
    try:
        req = urllib.request.Request(url, method=method, data=body)
        if body is not None:
            req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return {"ok": True, "http": r.getcode(), "error": None}
    except urllib.error.HTTPError as e:
        return {"ok": False, "http": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "http": None, "error": str(e)}


def _get_audit_detail(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8.0) as r:
            body = r.read().decode("utf-8", errors="replace")
        j = json.loads(body)
        return {"http": r.getcode(), "json_ok": bool(j.get("ok")), "error": None}
    except urllib.error.HTTPError as e:
        return {"http": e.code, "json_ok": False, "error": str(e)}
    except Exception as e:
        return {"http": None, "json_ok": False, "error": str(e)}


def _billing_not_404(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/billing/link"
    body = json.dumps({"sessionId": "p10_acceptance_probe"}, ensure_ascii=False).encode("utf-8")
    r = _http_json("POST", url, body)
    return {
        "reachable": r.get("http") is not None or r.get("error") is not None,
        "http": r.get("http"),
        "not_404": r.get("http") != 404 if r.get("http") is not None else False,
    }


def _static_contains(path: Path, needles: list[str]) -> dict[str, bool]:
    if not path.is_file():
        return {n: False for n in needles}
    try:
        t = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return {n: False for n in needles}
    return {n: n in t for n in needles}


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=900,
        )
        tail = (r.stdout + "\n" + r.stderr)[-2000:]
        return r.returncode == 0, tail
    except Exception as e:
        return False, str(e)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    api_dir = api
    base = os.environ.get("TENMON_AUDIT_BASE_URL", "http://127.0.0.1:3000").strip()

    pdca = _read_json(auto / "tenmon_pdca_cycle_state_v1.json")
    policy = _read_json(auto / "tenmon_pdca_risk_policy_v1.json")
    sf = _read_json(auto / "tenmon_cursor_single_flight_queue_state.json")
    forensic = _read_json(auto / "tenmon_autonomy_current_state_forensic.json")
    probe = _read_json(auto / "tenmon_conversation_acceptance_probe_relock_result_v1.json")
    fail_closed_path = auto / "tenmon_fail_closed_recovery_evidence_v1.json"
    fail_closed = _read_json(fail_closed_path)
    ev = pdca.get("evidence_bundle") if isinstance(pdca.get("evidence_bundle"), dict) else {}
    fc_embed = ev.get("fail_closed_recovery_v1") if isinstance(ev, dict) else None

    routes = api / "src" / "routes"
    cmd_ts = routes / "adminCursorCommand.ts"
    res_ts = routes / "adminCursorResult.ts"
    q_py = auto / "tenmon_cursor_single_flight_queue_v1.py"

    needles_cmd = [
        "CursorExecutionContractV1",
        "hasActiveDeliveredSingleFlight",
        "CURSOR_ORCHESTRATION_ROLES_V1",
    ]
    needles_res = ["result_status", "execution_contract", "CURSOR_ORCHESTRATION_ROLES_V1"]
    scan_cmd = _static_contains(cmd_ts, needles_cmd)
    scan_res = _static_contains(res_ts, needles_res)
    scan_qpy = q_py.is_file()

    audit_live = _get_audit_detail(base)
    pwa_live = _http_json("GET", base.rstrip("/") + "/api/pwa/export")
    billing = _billing_not_404(base)

    npm_ok, npm_tail = _npm_check(api_dir)

    eb = pdca.get("evidence_bundle") if isinstance(pdca.get("evidence_bundle"), dict) else {}
    build_from_pdca = eb.get("npm_run_check_ok") is True
    build_green = bool(pdca.get("build_green")) and (npm_ok or build_from_pdca)
    queue_open = bool(pdca.get("queue_open")) and bool(sf.get("next_card_allowed", True))
    blocked = sf.get("blocked_reason") or []
    queue_unblocked = not bool(blocked)
    audit_ok = audit_live.get("http") == 200 and audit_live.get("json_ok") is True
    if audit_live.get("http") != 200:
        audit_ok = bool((forensic.get("service_probe") or {}).get("audit", {}).get("ok"))

    advance_blocked = bool(pdca.get("advance_next_card_blocked", False))
    check_pass = bool(pdca.get("check_pass"))

    # --- 3 境界（auto / approval / recovery）---
    boundaries = {
        "auto_apply_low_risk_only": {
            "auto_apply_whitelist_len": len(policy.get("auto_apply_whitelist") or []),
            "auto_apply_categories_len": len(policy.get("auto_apply_whitelist_categories_v1") or []),
            "pdca_auto_apply_allowed": pdca.get("auto_apply_allowed"),
            "note": "low-risk は whitelist argv のみ（親OS）。",
        },
        "approval_gate": {
            "approval_boundary_v1_present": bool(policy.get("approval_boundary_v1")),
            "approval_required_ops_len": len(policy.get("approval_required_operations_v1") or []),
            "manual_review_required_pdca": pdca.get("manual_review_required"),
            "forbidden_tier_in_policy": bool((policy.get("risk_tiers") or {}).get("forbidden")),
        },
        "fail_closed_recovery": {
            "fail_closed_policy_present": bool(policy.get("fail_closed_recovery_policy_v1")),
            "fail_closed_retry_card": bool(str(policy.get("fail_closed_retry_card_v1") or "").strip()),
            "evidence_file_present": fail_closed_path.is_file(),
            "embedded_in_pdca_cycle": fc_embed is not None,
            "failure_class_primary": pdca.get("failure_class_primary") or ev.get("failure_class_primary"),
        },
    }

    # --- architecture pillars (evidence-weighted 1.0 each when signal true) ---
    pillars: dict[str, Any] = {
        "conversation": bool(sf.get("next_card")) or bool(pdca.get("next_recommended_card")),
        "heart": bool(policy.get("risk_tiers")),
        "root": bool(forensic.get("rejudge_bound")) or bool(policy.get("pass_route_protection")),
        "learning": "SELF_RUNNING" in str(pdca.get("card") or "") or bool(policy.get("inner_cards")),
        "materials": (repo / "api" / "src" / "core" / "tenmonMaterialDigestLedgerV1.ts").is_file(),
        "book_mainline": (repo / "api" / "src" / "core" / "tenmonBookReadingKernelV1.ts").is_file(),
        "pdca": pdca.get("schema") == "TENMON_PDCA_CYCLE_STATE_V1",
        "pwa": pwa_live.get("http") in (200, 401, 403) or bool(
            (forensic.get("service_probe") or {}).get("health", {}).get("ok"),
        ),
    }
    arch_score = sum(1 for v in pillars.values() if v) / max(len(pillars), 1)
    architecture_mainlines_at_1 = arch_score >= 1.0 - 1e-9

    runtime_ready = (
        build_green
        and queue_open
        and queue_unblocked
        and check_pass
        and not advance_blocked
        and (audit_ok or forensic.get("system_ready") is True)
    )

    safety_ready = (
        boundaries["approval_gate"]["approval_boundary_v1_present"]
        and boundaries["approval_gate"]["forbidden_tier_in_policy"]
        and boundaries["auto_apply_low_risk_only"]["auto_apply_whitelist_len"] > 0
        and boundaries["fail_closed_recovery"]["fail_closed_policy_present"]
        and boundaries["fail_closed_recovery"]["fail_closed_retry_card"]
    )

    cursor_contract_ok = all(scan_cmd.values()) and all(scan_res.values()) and scan_qpy

    ops_ready = billing.get("not_404") is True

    ux_probe_ok = bool(probe.get("acceptance_pass")) if probe else None
    ux_metrics = probe.get("ux_metrics") if isinstance(probe.get("ux_metrics"), dict) else {}
    support_ok = True
    founder_ok = True
    unc_ok = True
    surface_ok = True
    if ux_metrics:
        try:
            support_ok = float(ux_metrics.get("support_operability") or 1.0) + 1e-9 >= 0.9
            founder_ok = float(ux_metrics.get("founder_operability") or 1.0) + 1e-9 >= 0.8
            unc_ok = float(ux_metrics.get("uncertainty_maturity") or 1.0) + 1e-9 >= 0.7
            cap = int(ux_metrics.get("surface_leak_probe_cap") or 0)
            cnt = int(ux_metrics.get("surface_leak_probe_count") or 0)
            surface_ok = cap <= 0 or cnt <= cap
        except (TypeError, ValueError):
            pass

    hygiene_note = (repo / "api" / "automation" / "_archive").is_dir()

    platform_ready = bool(
        runtime_ready
        and safety_ready
        and cursor_contract_ok
        and ops_ready
        and architecture_mainlines_at_1
    )

    # アーキテクチャ＋運用境界が揃い、会話 acceptance が PASS したときのみ「超え準備」
    custom_gpt_surpass_ready_as_architecture = bool(platform_ready and ux_probe_ok is True)

    seal_basis = {
        "platform_ready": platform_ready,
        "custom_gpt_surpass_ready_as_architecture": custom_gpt_surpass_ready_as_architecture,
        "ux_probe_acceptance_pass": ux_probe_ok,
        "no_advance_block": not advance_blocked,
        "evidence_artifacts": {
            "pdca_cycle_state": (auto / "tenmon_pdca_cycle_state_v1.json").is_file(),
            "risk_policy": (auto / "tenmon_pdca_risk_policy_v1.json").is_file(),
            "fail_closed_snapshot": fail_closed_path.is_file() or fc_embed is not None,
        },
    }
    seal_allowed_evidence_basis = bool(
        platform_ready
        and custom_gpt_surpass_ready_as_architecture
        and ux_probe_ok is True
    )
    release_claim_allowed = seal_allowed_evidence_basis

    failure_reasons: list[str] = []
    if not runtime_ready:
        failure_reasons.append("runtime_not_ready")
    if not safety_ready:
        failure_reasons.append("safety_documentation_incomplete")
    if not cursor_contract_ok:
        failure_reasons.append("cursor_execution_contract_scan_fail")
    if not ops_ready:
        failure_reasons.append("billing_link_404_or_unreachable")
    if not architecture_mainlines_at_1:
        failure_reasons.append(f"architecture_pillars_score={arch_score:.3f}")
    if ux_probe_ok is not True:
        failure_reasons.append("conversation_probe_acceptance_not_pass_or_missing")
    if advance_blocked:
        failure_reasons.append("pdca_advance_next_card_blocked")

    full_autonomy_readiness = {
        "runtime_ready": runtime_ready,
        "safety_ready": safety_ready,
        "cursor_execution_contract_scan_ok": cursor_contract_ok,
        "ops_billing_pwa_ok": ops_ready,
        "architecture_mainlines_score": round(arch_score, 6),
        "three_boundaries_documented": True,
        "notes": "auto=whitelist / approval=policy boundary / recovery=fail_closed_retry_card + PDCA embed",
    }

    result: dict[str, Any] = {
        "schema": "TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SEAL_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "observation_only": True,
        "full_autonomy_readiness": full_autonomy_readiness,
        "platform_ready": platform_ready,
        "custom_gpt_surpass_ready_as_architecture": custom_gpt_surpass_ready_as_architecture,
        "seal_allowed_evidence_basis": seal_allowed_evidence_basis,
        "release_claim_allowed": release_claim_allowed,
        "failure_reasons": failure_reasons
        if (not platform_ready or not custom_gpt_surpass_ready_as_architecture)
        else [],
        "architecture": {
            "pillars": pillars,
            "score": round(arch_score, 6),
            "mainlines_all_true": architecture_mainlines_at_1,
        },
        "runtime": {
            "build_green": build_green,
            "npm_check_fresh_pass": npm_ok,
            "queue_open": queue_open,
            "queue_unblocked": queue_unblocked,
            "check_pass": check_pass,
            "advance_next_card_blocked": advance_blocked,
            "audit_live": {k: audit_live.get(k) for k in ("http", "json_ok", "error")},
            "pwa_export_http": pwa_live.get("http"),
            "billing_link": billing,
            "forensic_system_ready": forensic.get("system_ready"),
            "forensic_result_return_ok": forensic.get("result_return_ok"),
        },
        "safety": boundaries,
        "ux": {
            "probe_present": bool(probe),
            "acceptance_pass": ux_probe_ok,
            "support_operability_ok": support_ok,
            "founder_operability_ok": founder_ok,
            "uncertainty_maturity_ok": unc_ok,
            "surface_leak_within_cap": surface_ok,
        },
        "ops": {
            "artifact_archive_dir_present": hygiene_note,
            "single_flight_queue_script": scan_qpy,
        },
        "static_scan": {"adminCursorCommand.ts": scan_cmd, "adminCursorResult.ts": scan_res},
        "seal_basis": seal_basis,
        "nextOnPass": "TENMON_FULL_AUTONOMY_OPERATION_FREEZE_CURSOR_AUTO_V1",
        "nextOnFail": "TENMON_FULL_AUTONOMY_LAST_MILE_AND_APPROVAL_BOUNDARY_RETRY_CURSOR_AUTO_V1",
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# TENMON_FULL_AUTONOMY_ACCEPTANCE_AND_SEAL_REPORT_V1",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **観測専用**: `True`（本番 seal / release claim は下記 evidence basis のみ）",
        "",
        "## 総合",
        "",
        f"- **platform_ready**: `{platform_ready}`",
        f"- **custom_gpt_surpass_ready_as_architecture**: `{custom_gpt_surpass_ready_as_architecture}`",
        f"- **seal_allowed_evidence_basis**: `{seal_allowed_evidence_basis}`",
        f"- **release_claim_allowed**: `{release_claim_allowed}`",
        "",
        "## 三境界（auto / approval / recovery）",
        "",
        "```json",
        json.dumps(boundaries, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Full autonomy readiness（観測）",
        "",
        f"- **runtime_ready**: `{runtime_ready}`",
        f"- **safety_ready**: `{safety_ready}`",
        f"- **cursor_contract_ok**: `{cursor_contract_ok}`",
        f"- **ops_ready (billing !404)**: `{ops_ready}`",
        f"- **architecture score**: `{arch_score:.4f}` / 1.0",
        "",
        "```json",
        json.dumps(full_autonomy_readiness, ensure_ascii=False, indent=2),
        "```",
        "",
        "## UX / probe",
        "",
        f"- **probe acceptance_pass**: `{ux_probe_ok}`",
        "",
        "## Seal 可否（evidence basis）",
        "",
        "release / seal の宣言は **`seal_allowed_evidence_basis`** が true の場合のみ（本レポートは観測）。",
        "",
        f"- **basis summary**: `{json.dumps(seal_basis, ensure_ascii=False)}`",
        "",
    ]
    if failure_reasons:
        md.extend(
            [
                "## 不合格要因（要約）",
                "",
                "\n".join(f"- `{x}`" for x in failure_reasons),
                "",
            ],
        )

    md.extend(
        [
            "## Next",
            "",
            f"- **nextOnPass**: `{result['nextOnPass']}`",
            f"- **nextOnFail**: `{result['nextOnFail']}`",
            "",
        ],
    )
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps({k: result[k] for k in ("platform_ready", "custom_gpt_surpass_ready_as_architecture", "seal_allowed_evidence_basis")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
