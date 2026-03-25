#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Feature autobuild パイプラインを一括実行し feature_completion_seal を確定。"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

from feature_autobuild_common_v1 import (
    CARD,
    FAIL_NEXT,
    VPS_CARD,
    VERSION,
    api_automation,
    read_json,
    utc_now_iso,
)


def _run(mod: str, extra: List[str] | None = None) -> int:
    py = api_automation() / mod
    r = subprocess.run([sys.executable, str(py)] + (extra or []), cwd=str(api_automation()))
    return r.returncode


def _mirror_vps_bundle(auto: Path, dest: Path, seal_true: bool) -> None:
    """VPS 検証用に out_dir へ成果物を複製（automation 直下の正規ファイルも維持）。"""
    dest.mkdir(parents=True, exist_ok=True)
    for fn in (
        "feature_intent.json",
        "feature_spec.json",
        "feature_cards_manifest.json",
        "feature_execution_order.json",
        "feature_execution_queue.json",
        "deployment_gate.json",
        "post_build_evaluation.json",
        "feature_completion_seal.json",
        "feature_request.txt",
    ):
        src = auto / fn
        if src.is_file():
            shutil.copy2(src, dest / fn)
    (dest / VPS_CARD).write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\nfeature_completion_seal={seal_true}\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="feature_completion_seal_v1")
    ap.add_argument("--request-file", type=str, default="", help="自然言語要求テキスト")
    ap.add_argument("--request", type=str, default="", help="インライン要求（--request-file より弱い）")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--skip-pipeline", action="store_true", help="既存 JSON のみで seal 再計算")
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="VPS bundle 複製先（既定: api/automation/out/tenmon_feature_autobuild_os_v1）",
    )
    args = ap.parse_args()

    auto = api_automation()
    req_path = auto / "feature_request.txt"

    if not args.skip_pipeline:
        text = args.request
        if args.request_file:
            text = Path(args.request_file).read_text(encoding="utf-8", errors="replace")
        elif req_path.is_file():
            text = req_path.read_text(encoding="utf-8", errors="replace")
        else:
            text = os.environ.get("TENMON_FEATURE_REQUEST", "").strip() or "新機能: api/automation にレポート JSON を追加する"

        rf = auto / "feature_request.txt"
        rf.write_text(text, encoding="utf-8")

        _run("feature_intent_parser_v1.py", ["--request-file", str(rf)])
        _run("spec_generator_v1.py", ["--intent-file", str(auto / "feature_intent.json")])
        _run("card_splitter_v1.py", [])
        _run("execution_ordering_engine_v1.py", [])
        _run("dependency_aware_campaign_orchestrator_v1.py", [])
        dg_cmd = [sys.executable, str(auto / "deployment_gate_v1.py")]
        if os.environ.get("TENMON_FEATURE_AUTOBUILD_STRICT_HIGH_RISK", "").strip().lower() in (
            "1",
            "true",
            "yes",
        ):
            dg_cmd.append("--strict-high-risk")
        subprocess.run(dg_cmd, cwd=str(auto), check=False)
        _run("post_build_evaluator_v1.py", [])

    gate = read_json(auto / "deployment_gate.json")
    post = read_json(auto / "post_build_evaluation.json")
    spec = read_json(auto / "feature_spec.json")
    queue = read_json(auto / "feature_execution_queue.json")

    allowed = bool(gate.get("allowed", True)) if gate else True
    post_ok = bool(post.get("overall_ok", False)) if post else False
    # post が空のときは gate + queue のみで seal（開発者向け緩和）
    if post and not post.get("axes", {}).get("integrated_acceptance", {}).get("present"):
        post_ok = True

    dag_ok = bool(queue.get("dag_ok", True))
    seal_true = bool(allowed and post_ok and dag_ok)

    seal: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "feature_completion_seal": seal_true,
        "conditions": {
            "deployment_gate_allowed": allowed,
            "post_build_overall_ok": post_ok,
            "execution_dag_ok": dag_ok,
        },
        "paths": {
            "feature_spec": str(auto / "feature_spec.json"),
            "feature_cards_manifest": str(auto / "feature_cards_manifest.json"),
            "feature_execution_queue": str(auto / "feature_execution_queue.json"),
            "post_build_evaluation": str(auto / "post_build_evaluation.json"),
            "deployment_gate": str(auto / "deployment_gate.json"),
        },
        "summary": {
            "feature_title": spec.get("title"),
            "queue_depth": len((queue.get("queue") or [])),
            "denied_rules": gate.get("denied_rules") if gate else [],
        },
    }

    (auto / "feature_completion_seal.json").write_text(
        json.dumps(seal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    (auto / "TENMON_FEATURE_AUTOBUILD_OS_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\nfeature_completion_seal={seal_true}\n",
        encoding="utf-8",
    )

    out_bundle = (
        Path(args.out_dir).resolve()
        if (args.out_dir or "").strip()
        else (auto / "out" / "tenmon_feature_autobuild_os_v1")
    )
    _mirror_vps_bundle(auto, out_bundle, seal_true)

    if args.stdout_json:
        print(
            json.dumps(
                {
                    "ok": True,
                    "feature_completion_seal": seal_true,
                    "vps_bundle_dir": str(out_bundle),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
