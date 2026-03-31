# -*- coding: utf-8 -*-
"""
TENMON_PROBE_OK_BOOLEAN_BIND_CURSOR_AUTO_V1

relock 系 probe JSON のトップレベル `ok` を null にせず、既存フィールドから boolean のみ合成する。
fail-closed: 条件未充足は False。捏造で True にしない。
"""
from __future__ import annotations

from typing import Any


def apply_relock_probe_ok_fields(result: dict[str, Any]) -> None:
    """
    result を in-place 更新: ok (bool), ok_checks (dict), ok_reason (str)。
    既存の schema / acceptance_pass / audit / ux_metrics のみ参照する。
    """
    checks: dict[str, Any] = {}
    reasons: list[str] = []

    checks["present"] = bool(result.get("generated_at")) and bool(result.get("schema"))
    if not checks["present"]:
        reasons.append("missing_generated_at_or_schema")

    ap = result.get("acceptance_pass")
    if ap is True:
        checks["acceptance_pass"] = True
    else:
        checks["acceptance_pass"] = False
        if ap is False:
            reasons.append("acceptance_pass_false")
        else:
            reasons.append("acceptance_pass_absent_or_null")

    audit = result.get("audit")
    if isinstance(audit, dict) and audit.get("ok") is True:
        checks["audit_ok"] = True
    else:
        checks["audit_ok"] = False
        reasons.append("audit_ok_not_true")

    far: dict[str, Any] = {}
    um = result.get("ux_metrics")
    if isinstance(um, dict):
        inner = um.get("full_autonomy_system_ready")
        if isinstance(inner, dict):
            far = inner
    bool_vals = [v for k, v in far.items() if k != "score" and isinstance(v, bool)]
    if bool_vals:
        checks["sealed_operable_ready"] = all(bool_vals)
        if not checks["sealed_operable_ready"]:
            reasons.append("full_autonomy_system_ready_subcheck_not_all_true")
    else:
        checks["sealed_operable_ready"] = False
        reasons.append("full_autonomy_system_ready_bools_missing")

    ok = all(v is True for v in checks.values())
    result["ok"] = bool(ok)
    result["ok_checks"] = checks
    base = "; ".join(reasons) if reasons else "all_required_subchecks_pass"
    fr = result.get("failure_reasons")
    if not ok and isinstance(fr, list) and fr:
        tail = "; ".join(str(x) for x in fr[:12])
        result["ok_reason"] = f"{base} | failure_reasons: {tail}"
    else:
        result["ok_reason"] = base
