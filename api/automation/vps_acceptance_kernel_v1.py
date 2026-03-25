#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_04 — VPS acceptance + seal + forensics + rollback を一体運用する kernel。
既存 vps_acceptance_os_v1 を子プロセスで実行し、4 軸 verdict と正本 JSON を api/automation に集約。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api() -> Path:
    return Path(__file__).resolve().parents[1]


def _repo() -> Path:
    return _api().parents[1]


def _auto() -> Path:
    return _api() / "automation"


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _surface_from_final(fv: Dict[str, Any], seal_skipped: bool) -> Dict[str, Any]:
    if seal_skipped or not fv:
        return {
            "ok": True,
            "skipped": True,
            "note": "no final_verdict or seal skipped",
        }
    sc = fv.get("surface_clean")
    wc = fv.get("worldclass_surface_clean")
    if sc is None and wc is None:
        ok = bool(fv.get("chat_ts_overall_100", False))
    else:
        ok = bool(sc is not False and wc is not False)
    return {
        "ok": ok,
        "surface_clean": sc,
        "worldclass_surface_clean": wc,
        "chat_ts_overall_100": fv.get("chat_ts_overall_100"),
    }


def _derive_blockers(
    integrated: Dict[str, Any],
    surface_block: Dict[str, Any],
) -> List[str]:
    out: List[str] = []
    axes = integrated.get("axes") or {}
    st = (axes.get("static") or {}).get("summary") or {}
    if not st.get("ok", True):
        out.append(f"static_build_fail:npm_rc={st.get('npm_build_rc')}")
    rt = (axes.get("runtime") or {}).get("summary") or {}
    if not rt.get("ok", True):
        out.append(
            "runtime_fail:"
            + ",".join(
                k
                for k, v in (
                    ("health", rt.get("health_ok")),
                    ("audit", rt.get("audit_ok")),
                    ("matrix", rt.get("runtime_matrix_all_ok")),
                )
                if v is False
            )
        )
    sc = (axes.get("seal_contract") or {}).get("summary") or {}
    if sc and not sc.get("skipped") and not sc.get("ok", True):
        out.append("seal_contract_fail")
    if not surface_block.get("skipped") and surface_block.get("ok") is False:
        out.append("surface_worldclass_fail")
    if not out and not integrated.get("overall_pass"):
        out.append("overall_pass_false")
    return out[:12]


def _write_retry_md(auto: Path, blockers: List[str], snap: Path) -> None:
    ga = auto / "generated_cursor_apply"
    ga.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {FAIL_NEXT}",
        "",
        f"> 親カード: `{CARD}`",
        f"> snapshot: `{snap}`",
        "",
        "## BLOCKERS",
    ]
    for b in blockers or ["unknown"]:
        lines.append(f"- {b}")
    lines.extend(
        [
            "",
            "## EVIDENCE",
            f"- `failure_forensics_bundle.json`（api/automation）",
            f"- `{snap}/vps_acceptance_report.json`",
            "",
            "## DO",
            "1. forensics を確認",
            "2. `rollback_planner` 出力があれば人手で判断",
            "3. `python3 vps_acceptance_kernel_v1.py` を再実行",
            "",
        ]
    )
    (ga / f"{FAIL_NEXT}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=str, default="", help="スナップショット先（既定: out/tenmon_vps_acceptance_kernel_v1/<ts>）")
    ap.add_argument("--skip-seal-script", action="store_true", help="seal bash 省略（runtime まで）")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api()
    auto = _auto()
    repo = _repo()
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snap = Path(args.out_dir).resolve() if args.out_dir else (api / "out" / "tenmon_vps_acceptance_kernel_v1" / ts)
    snap.mkdir(parents=True, exist_ok=True)

    vps_py = auto / "vps_acceptance_os_v1.py"
    cmd = [sys.executable, str(vps_py), "--out-dir", str(snap)]
    if args.skip_seal_script:
        cmd.append("--skip-seal-script")
    rc_child = subprocess.run(cmd, cwd=str(auto), check=False).returncode

    integrated = _read_json(snap / "integrated_acceptance_seal.json")
    seal_skipped = bool((integrated.get("axes") or {}).get("seal_contract", {}).get("summary", {}).get("skipped"))
    final_path = snap / "seal" / "final_verdict.json"
    final = _read_json(final_path)

    surface_block = _surface_from_final(final, seal_skipped or args.skip_seal_script)

    static_ok = bool((integrated.get("axes") or {}).get("static", {}).get("summary", {}).get("ok", False))
    runtime_ok = bool((integrated.get("axes") or {}).get("runtime", {}).get("summary", {}).get("ok", False))
    integrated_pass = bool(integrated.get("overall_pass", False))
    surface_ok = bool(surface_block.get("ok", True))
    overall_pass = integrated_pass and surface_ok

    blockers = _derive_blockers(integrated, surface_block) if not overall_pass else []
    if not overall_pass and not blockers:
        blockers = ["vps_acceptance_kernel: no_detail_child_rc=%s" % rc_child]

    integrated_final: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "snapshot_dir": str(snap),
        "static": {
            "ok": static_ok,
            "summary": (integrated.get("axes") or {}).get("static", {}).get("summary", {}),
        },
        "runtime": {
            "ok": runtime_ok,
            "summary": (integrated.get("axes") or {}).get("runtime", {}).get("summary", {}),
        },
        "surface": surface_block,
        "seal_contract": (integrated.get("axes") or {}).get("seal_contract", {}),
        "overall": {
            "ok": overall_pass,
            "pass": overall_pass,
            "integrated_acceptance_overall_pass": integrated_pass,
            "surface_ok": surface_ok,
        },
        "final_verdict_path": str(final_path) if final_path.is_file() else None,
    }
    if not overall_pass:
        integrated_final["blockers"] = blockers
        integrated_final["next_card"] = FAIL_NEXT
        integrated_final["evidence"] = {
            "failure_forensics_bundle": str(auto / "failure_forensics_bundle.json"),
            "vps_acceptance_report": str(snap / "vps_acceptance_report.json"),
            "runtime_probe_matrix": str(auto / "runtime_probe_matrix.json"),
        }

    final_text = json.dumps(integrated_final, ensure_ascii=False, indent=2) + "\n"
    (auto / "integrated_final_verdict.json").write_text(final_text, encoding="utf-8")
    # 互換名（ACCEPTANCE / 旧ツール向け）
    (auto / "final_verdict.json").write_text(final_text, encoding="utf-8")

    forensics_src = snap / "failure_forensics_bundle.json"
    forensics_stable = auto / "failure_forensics_bundle.json"
    if forensics_src.is_file():
        forensics_stable.write_text(forensics_src.read_text(encoding="utf-8"), encoding="utf-8")

    kernel_result = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": _utc(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "child_vps_acceptance_rc": rc_child,
        "overall_pass": overall_pass,
        "snapshot_dir": str(snap),
        "paths": {
            "integrated_final_verdict": str(auto / "integrated_final_verdict.json"),
            "final_verdict": str(auto / "final_verdict.json"),
            "vps_acceptance_kernel_result": str(auto / "vps_acceptance_kernel_result.json"),
            "failure_forensics_bundle": str(forensics_stable),
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
        },
        "notes": [
            "本体フローは vps_acceptance_os_v1.py（build/restart/health/audit/matrix/seal）",
            "PASS 時 seal は子プロセス内の worldclass seal スクリプトが final_verdict を生成",
        ],
    }
    (auto / "vps_acceptance_kernel_result.json").write_text(
        json.dumps(kernel_result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    (auto / "TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_VPS_V1").write_text(
        f"{VPS_CARD}\n{_utc()}\noverall_pass={overall_pass}\n",
        encoding="utf-8",
    )

    if not overall_pass:
        _write_retry_md(auto, blockers, snap)
    else:
        stub = auto / "generated_cursor_apply" / f"{FAIL_NEXT}.md"
        stub.parent.mkdir(parents=True, exist_ok=True)
        stub.write_text(
            f"# {FAIL_NEXT}\n\noverall_pass=true — retry 不要。\n",
            encoding="utf-8",
        )

    if args.stdout_json:
        print(json.dumps({"ok": True, "overall_pass": overall_pass, "snapshot": str(snap)}, ensure_ascii=False, indent=2))
    return 0 if overall_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
