#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1

kokuzo learning + self improvement integration の canonical output contract を閉じる。
必須成果物を canonical に固定し、rc=1 の理由を blocker JSON へ明示する。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_VPS_V1"
FAIL_NEXT_CARD = "TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_RETRY_CURSOR_AUTO_V1"

REQUIRED_FILES = (
    "integrated_learning_verdict.json",
    "integrated_final_verdict.json",
    "learning_improvement_os_manifest.json",
    "learning_steps.json",
    "next_card_dispatch.json",
)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _write_json(path: Path, body: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _resolve_out_dir(arg_out: str) -> Path:
    api = _api_root()
    if arg_out.strip():
        return Path(arg_out).expanduser().resolve()
    env = os.environ.get("KOKUZO_LEARNING_IMPROVEMENT_OUT_DIR", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return (api / "automation" / "out" / "tenmon_kokuzo_learning_improvement_os_v1").resolve()


def _run_pipeline(out_dir: Path, stdout_json: bool) -> int:
    api = _api_root()
    runner = api / "automation" / "kokuzo_learning_improvement_os_integrated_v1.py"
    cmd = [sys.executable, str(runner), "--out-dir", str(out_dir)]
    if os.environ.get("KOKUZO_ALLOW_SYSTEMD_RESTART") == "1":
        cmd.append("--allow-systemd-restart")
    if stdout_json:
        cmd.append("--stdout-json")
    return subprocess.run(cmd, cwd=str(api)).returncode


def _derive_structural_ok(integrated_learning: Dict[str, Any], integrated_final: Dict[str, Any]) -> bool:
    imp = integrated_learning.get("improvement") if isinstance(integrated_learning.get("improvement"), dict) else {}
    gov = imp.get("seal_governor") if isinstance(imp.get("seal_governor"), dict) else {}
    if "structural_ok" in gov:
        return bool(gov.get("structural_ok"))
    g2 = integrated_final.get("governor") if isinstance(integrated_final.get("governor"), dict) else {}
    if "structural_ok" in g2:
        return bool(g2.get("structural_ok"))
    return False


def _build_integrated_final_if_missing(
    out_dir: Path, integrated_learning: Dict[str, Any], learning_steps: Dict[str, Any]
) -> Dict[str, Any]:
    structural_ok = _derive_structural_ok(integrated_learning, {})
    integrated_ok = bool(
        integrated_learning.get("integrated_verdict_ok")
        or integrated_learning.get("ok")
        or integrated_learning.get("maintained_sealed_candidate")
    )
    learning_chain_ok = bool(integrated_learning.get("learning_chain_ok"))
    outputless_partial = not (out_dir / "learning_steps.json").is_file()

    body: Dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "generatedAt": _now(),
        "source": "kokuzo_learning_os_contract_close_v1",
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT_CARD,
        "overall_loop_ok": bool(
            (integrated_learning.get("improvement") or {}).get("overall_loop_ok")
        ),
        "structural_ok": structural_ok,
        "learning_chain_ok": learning_chain_ok,
        "integrated_ok": integrated_ok and (not outputless_partial),
        "readiness": "partial" if (structural_ok and outputless_partial) else ("ready" if integrated_ok else "blocked"),
        "note": "generated_by_contract_close_due_to_missing_integrated_final_verdict",
        "learning_steps_ref": str(out_dir / "learning_steps.json"),
    }
    if learning_steps:
        body["minimum_steps"] = {
            "input_quality_ok": bool((learning_steps.get("input_quality") or {}).get("ok")),
            "seed_quality_ok": bool((learning_steps.get("seed_quality") or {}).get("ok")),
            "grounding_quality_ok": bool((learning_steps.get("grounding_quality") or {}).get("ok")),
            "conversation_return_ok": bool((learning_steps.get("conversation_return") or {}).get("ok")),
            "seal_result_ok": bool((learning_steps.get("seal_result") or {}).get("ok")),
        }
    return body


def _ensure_required_files(out_dir: Path) -> Tuple[Dict[str, bool], Dict[str, Any]]:
    present: Dict[str, bool] = {name: (out_dir / name).is_file() for name in REQUIRED_FILES}
    blockers: List[str] = []

    integrated_learning = _read_json(out_dir / "integrated_learning_verdict.json")
    learning_steps = _read_json(out_dir / "learning_steps.json")

    if not present["learning_steps.json"]:
        _write_json(
            out_dir / "learning_steps.json",
            {
                "version": 1,
                "card": CARD,
                "generatedAt": _now(),
                "source": "kokuzo_learning_os_contract_close_v1",
                "readiness": "partial",
                "note": "learning_steps_missing_from_upstream_output",
            },
        )
        present["learning_steps.json"] = True
        blockers.append("missing_learning_steps_upstream")

    if not present["integrated_final_verdict.json"]:
        _write_json(
            out_dir / "integrated_final_verdict.json",
            _build_integrated_final_if_missing(out_dir, integrated_learning, learning_steps),
        )
        present["integrated_final_verdict.json"] = True
        blockers.append("missing_integrated_final_verdict_upstream")

    if not present["learning_improvement_os_manifest.json"]:
        _write_json(
            out_dir / "learning_improvement_os_manifest.json",
            {
                "version": 1,
                "card": "TENMON_KOKUZO_LEARNING_IMPROVEMENT_OS_MANIFEST_V1",
                "generatedAt": _now(),
                "source": "kokuzo_learning_os_contract_close_v1",
                "vps_card": VPS_MARKER,
                "paths": {n.replace(".json", ""): str(out_dir / n) for n in REQUIRED_FILES},
                "note": "manifest_missing_from_upstream_output",
            },
        )
        present["learning_improvement_os_manifest.json"] = True
        blockers.append("missing_learning_improvement_manifest_upstream")

    if not present["integrated_learning_verdict.json"]:
        _write_json(
            out_dir / "integrated_learning_verdict.json",
            {
                "version": 1,
                "card": CARD,
                "generatedAt": _now(),
                "source": "kokuzo_learning_os_contract_close_v1",
                "integrated_verdict_ok": False,
                "readiness": "blocked",
                "note": "integrated_learning_verdict_missing_from_upstream_output",
            },
        )
        present["integrated_learning_verdict.json"] = True
        blockers.append("missing_integrated_learning_verdict_upstream")

    if not present["next_card_dispatch.json"]:
        _write_json(
            out_dir / "next_card_dispatch.json",
            {
                "version": 1,
                "card": CARD,
                "generatedAt": _now(),
                "integrated_verdict_ok": False,
                "fail_next_cursor_card": FAIL_NEXT_CARD,
                "dispatch": [
                    {
                        "source": "kokuzo_learning_contract_close",
                        "blocker": "missing_next_card_dispatch_upstream",
                        "cursor_card": FAIL_NEXT_CARD,
                        "vps_card": VPS_MARKER,
                    }
                ],
            },
        )
        present["next_card_dispatch.json"] = True
        blockers.append("missing_next_card_dispatch_upstream")

    return present, {"autofilled_blockers": blockers}


def _decide_rc_and_blockers(out_dir: Path, autofilled: List[str]) -> Tuple[int, Dict[str, Any]]:
    iv = _read_json(out_dir / "integrated_final_verdict.json")
    il = _read_json(out_dir / "integrated_learning_verdict.json")
    ls = _read_json(out_dir / "learning_steps.json")

    structural_ok = _derive_structural_ok(il, iv)
    output_contract_ok = all((out_dir / n).is_file() for n in REQUIRED_FILES)
    learning_steps_ok = bool(ls)
    integrated_ok = bool(
        iv.get("integrated_ok")
        or iv.get("ok")
        or il.get("integrated_verdict_ok")
        or il.get("ok")
    )
    outputless = structural_ok and (not learning_steps_ok)

    blockers: List[str] = []
    blockers.extend(autofilled)
    if not output_contract_ok:
        blockers.append("output_contract_incomplete")
    if outputless:
        blockers.append("structural_ok_but_outputless_partial")
    if not integrated_ok:
        blockers.append("integrated_verdict_not_ok")

    if structural_ok and not output_contract_ok:
        blockers.append("structural_ok_but_output_contract_incomplete")

    # 重複削除
    uniq = []
    seen = set()
    for b in blockers:
        if b not in seen:
            seen.add(b)
            uniq.append(b)

    rc = 0 if (output_contract_ok and integrated_ok and len(uniq) == 0) else 1
    readiness = "ready" if rc == 0 else ("partial" if structural_ok else "blocked")

    detail = {
        "version": 1,
        "card": CARD,
        "generatedAt": _now(),
        "vps_marker": VPS_MARKER,
        "fail_next_cursor_card": FAIL_NEXT_CARD if rc != 0 else None,
        "rc": rc,
        "readiness": readiness,
        "output_contract_ok": output_contract_ok,
        "integrated_ok": integrated_ok,
        "structural_ok": structural_ok,
        "blockers": uniq,
        "required_files": {n: (out_dir / n).is_file() for n in REQUIRED_FILES},
        "canonical_out_dir": str(out_dir),
    }
    return rc, detail


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="canonical out dir")
    ap.add_argument("--run-pipeline", action="store_true", help="先に統合 runner を実行")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    out_dir = _resolve_out_dir(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    pipeline_rc = None
    if args.run_pipeline:
        pipeline_rc = _run_pipeline(out_dir, args.stdout_json)

    present, meta = _ensure_required_files(out_dir)
    _ = present
    rc, blocker_body = _decide_rc_and_blockers(out_dir, meta.get("autofilled_blockers", []))
    blocker_body["pipeline_rc"] = pipeline_rc
    _write_json(out_dir / "kokuzo_learning_contract_blockers.json", blocker_body)

    _write_json(
        out_dir / "next_card_dispatch.json",
        {
            **_read_json(out_dir / "next_card_dispatch.json"),
            "contract_close": {
                "card": CARD,
                "rc": rc,
                "readiness": blocker_body.get("readiness"),
                "blockers_ref": str(out_dir / "kokuzo_learning_contract_blockers.json"),
                "fail_next_cursor_card": FAIL_NEXT_CARD if rc != 0 else None,
            },
        },
    )

    (out_dir / VPS_MARKER).write_text(
        json.dumps({"marker": VPS_MARKER, "generatedAt": _now(), "rc": rc}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps(blocker_body, ensure_ascii=False, indent=2))
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

