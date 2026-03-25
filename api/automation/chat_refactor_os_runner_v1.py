#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chat Refactor OS — Observer / Planner / Card Generator / Governor を一周し、
acceptance・worldclass 参照を束ねて manifest / final_verdict を出す（chat.ts 非改変）。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# --- OS 統合（本カード）---
OS_CARD = "TENMON_CHAT_REFACTOR_OS_RUNNER_V1"
OS_VPS_CARD = "TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1"
OS_FAIL_NEXT = "TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_RETRY_CURSOR_AUTO_V1"
OS_RETRY_MD = "TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_RETRY_CURSOR_AUTO_V1.md"

# --- 後方互換（旧 autonomous カード名）---
LEGACY_CARD = "TENMON_CHAT_REFACTOR_AUTONOMOUS_RUNNER_V1"
LEGACY_VPS_CARD = "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_VPS_V1"
LEGACY_FAIL_NEXT = "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_RETRY_CURSOR_AUTO_V1"
LEGACY_RETRY_MD = "TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_RETRY_CURSOR_AUTO_V1.md"


@dataclass(frozen=True)
class RunnerBranding:
    runner_card: str
    vps_card: str
    fail_next: str
    retry_md: str
    manifest_basename: str  # chat_refactor_os_manifest.json vs chat_refactor_governor_manifest.json


BRANDING_OS = RunnerBranding(
    runner_card=OS_CARD,
    vps_card=OS_VPS_CARD,
    fail_next=OS_FAIL_NEXT,
    retry_md=OS_RETRY_MD,
    manifest_basename="chat_refactor_os_manifest.json",
)
BRANDING_AUTONOMOUS = RunnerBranding(
    runner_card=LEGACY_CARD,
    vps_card=LEGACY_VPS_CARD,
    fail_next=LEGACY_FAIL_NEXT,
    retry_md=LEGACY_RETRY_MD,
    manifest_basename="chat_refactor_governor_manifest.json",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _run_py(args: List[str]) -> int:
    r = subprocess.run([sys.executable] + args, check=False)
    return int(r.returncode)


def _run_bash(script: Path, api_root: Path, extra_env: Dict[str, str]) -> int:
    env = {**os.environ, **extra_env}
    r = subprocess.run(["bash", str(script)], cwd=str(api_root), env=env, check=False)
    return int(r.returncode)


def _write_retry(api: Path, branding: RunnerBranding, reason: str, out_dir: Path) -> None:
    p = api / "automation" / "generated_cursor_apply" / branding.retry_md
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        "\n".join(
            [
                f"# {branding.fail_next}",
                "",
                f"> Chat Refactor OS runner — reason=`{reason}`",
                f"> out_dir: `{out_dir}`",
                "",
                "## DO",
                "",
                "1. `evidence_bundle.json` / `governance_verdict.json` / `next_card_dispatch.json` を確認",
                "2. medium / high は **カード実行まで**（自動適用しない）",
                "3. `chat_refactor_os_run_v1.sh` を再実行（または `--demo` で観測のみ一周）",
                "",
                "## VPS_VALIDATION_OUTPUTS",
                "",
                f"- `{OS_VPS_CARD}`",
                "- `chat_refactor_os_manifest.json`",
                "- `governance_verdict.json`",
                "- `card_manifest.json`",
                "- `integrated_final_verdict.json`",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _resolve_card_link() -> str:
    """`/var/log/tenmon/card` がシンボリックリンクならその先（直近 seal 等）。"""
    link = Path("/var/log/tenmon/card")
    try:
        if link.is_symlink():
            return str(link.resolve())
    except OSError:
        pass
    return ""


def cmd_run(ns: argparse.Namespace, branding: RunnerBranding) -> int:
    api = _repo_api()
    auto = api / "automation"
    out = Path(ns.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    ts = ns.ts_folder or _utc_now_iso().replace(":", "").replace("-", "")[:15]

    obs_py = auto / "chat_architecture_observer_v1.py"
    plan_py = auto / "chat_refactor_planner_v1.py"
    gen_py = auto / "chat_refactor_card_generator_v1.py"
    gov_py = auto / "chat_refactor_governor_v1.py"
    seal_sh = api / "scripts" / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"

    obs_path = out / "chat_architecture_observation.json"
    plan_path = out / "chat_refactor_plan.json"
    gen_man_path = out / "chat_refactor_generator_manifest.json"
    card_man_path = out / "card_manifest.json"
    gov_path = out / "chat_refactor_governor_verdict.json"
    gov_gv_path = out / "governance_verdict.json"

    steps: List[Dict[str, Any]] = []
    failed_at: Optional[str] = None

    # 1 architecture observe
    if ns.demo:
        rc = _run_py([str(obs_py), "--sample", "--out-dir", str(out)])
        steps.append({"step": "architecture_observe", "rc": rc, "demo": True})
        if rc != 0:
            failed_at = "architecture_observe"
    else:
        extra: List[str] = []
        if ns.chat_path:
            extra = ["--chat-path", ns.chat_path]
        rc = _run_py([str(obs_py), "--out-dir", str(out)] + extra)
        steps.append({"step": "architecture_observe", "rc": rc})
        if rc != 0:
            failed_at = "architecture_observe"

    # 2 refactor plan
    if failed_at is None:
        if ns.demo:
            rc = _run_py([str(plan_py), "--sample", "--out-dir", str(out)])
            steps.append({"step": "refactor_plan", "rc": rc, "demo": True})
        else:
            arch_rep = out / "chat_architecture_report.json"
            if not arch_rep.is_file():
                arch_rep = obs_path
            pl_extra: List[str] = []
            rj = os.environ.get("CHAT_REFACTOR_PLANNER_RESIDUAL_JSON", "")
            if rj:
                pl_extra.extend(["--residual-quality-json", rj])
            rc = _run_py(
                [str(plan_py), "--architecture-report", str(arch_rep), "--out-dir", str(out)] + pl_extra
            )
            steps.append({"step": "refactor_plan", "rc": rc})
        if rc != 0:
            failed_at = "refactor_plan"

    # 3 card generate
    if failed_at is None:
        verdict_path = out / "final_verdict.json"
        gen_cmd = [
            str(gen_py),
            "--plan-json",
            str(plan_path),
            "--out-manifest",
            str(gen_man_path),
            "--ts-folder",
            ts,
        ]
        if verdict_path.is_file():
            gen_cmd.extend(["--verdict-json", str(verdict_path)])
        rc = _run_py(gen_cmd + ([] if ns.write_repo else ["--no-write-repo"]))
        steps.append({"step": "card_generate", "rc": rc})
        if rc != 0:
            failed_at = "card_generate"
        else:
            if gen_man_path.is_file():
                card_man_path.write_text(gen_man_path.read_text(encoding="utf-8"), encoding="utf-8")

    # 4 governance
    gov_body: Dict[str, Any] = {}
    if failed_at is None:
        rp_path = out / "risk_partition.json"
        gov_cmd = [
            str(gov_py),
            "--observation-json",
            str(obs_path),
            "--plan-json",
            str(plan_path),
            "--generator-manifest",
            str(gen_man_path),
            "--out-verdict",
            str(gov_path),
            "--enforce-exit",
        ]
        if rp_path.is_file():
            gov_cmd.extend(["--risk-partition-json", str(rp_path)])
        rc = _run_py(gov_cmd)
        gov_body = _read_json(gov_path)
        steps.append({"step": "governance_decide", "rc": rc, "governor_pass": gov_body.get("governor_pass")})
        if rc != 0 or not gov_body.get("governor_pass"):
            failed_at = "governance_decide"

    # 5 acceptance / seal handoff（任意）
    acceptance_rc: Optional[int] = None
    acceptance_note = ""
    worldclass_path = os.environ.get("CHAT_REFACTOR_OS_WORLDCLASS_JSON", "").strip()
    runtime_matrix_path = os.environ.get("CHAT_REFACTOR_OS_RUNTIME_MATRIX_JSON", "").strip()
    if failed_at is None and ns.run_acceptance_seal:
        if not seal_sh.is_file():
            acceptance_rc = 127
            acceptance_note = "seal_script_missing"
        else:
            acceptance_rc = _run_bash(
                seal_sh,
                api,
                {"CARD": "CHAT_REFACTOR_OS_BUNDLED_ACCEPTANCE_V1"},
            )
            acceptance_note = "ran_chat_ts_runtime_acceptance_and_worldclass_seal_v1"
        steps.append(
            {
                "step": "acceptance_seal_handoff",
                "rc": acceptance_rc,
                "note": acceptance_note,
            }
        )
        if acceptance_rc != 0:
            failed_at = "acceptance_seal_handoff"
    elif failed_at is None:
        steps.append(
            {
                "step": "acceptance_seal_handoff",
                "rc": 0,
                "skipped": True,
                "note": "use --run-acceptance-seal or set CHAT_REFACTOR_OS_WORLDCLASS_JSON / RUNTIME_MATRIX refs",
            }
        )

    # 参照パス（既存成果物の束ね）
    ref_paths: Dict[str, str] = {}
    if worldclass_path and Path(worldclass_path).is_file():
        ref_paths["worldclass_report"] = worldclass_path
    if runtime_matrix_path and Path(runtime_matrix_path).is_file():
        ref_paths["runtime_matrix"] = runtime_matrix_path
    card_link = _resolve_card_link()
    if card_link:
        ref_paths["tenmon_card_symlink"] = card_link

    pol = gov_body.get("policy") if isinstance(gov_body.get("policy"), dict) else {}
    auto_apply = bool(pol.get("auto_apply_allowed"))
    risk = str(gov_body.get("risk") or "")
    maintained = failed_at is None and bool(gov_body.get("governor_pass"))
    acceptance_ok = (acceptance_rc is None) or (acceptance_rc == 0)
    sealed_candidate = (
        maintained
        and bool(gov_body.get("seal_allowed"))
        and auto_apply
        and risk == "low"
        and acceptance_ok
    )

    os_manifest: Dict[str, Any] = {
        "version": 1,
        "card": branding.runner_card,
        "vps_card": branding.vps_card,
        "generatedAt": _utc_now_iso(),
        "out_dir": str(out),
        "ts_folder": ts,
        "steps": steps,
        "policy": {
            "auto_apply_low_risk_only": True,
            "medium_high_cards_only": True,
        },
        "acceptance": {
            "shell_run": bool(ns.run_acceptance_seal),
            "shell_rc": acceptance_rc,
            "reference_paths": ref_paths,
        },
        "paths": {
            "observation": str(obs_path),
            "plan": str(plan_path),
            "generator_manifest": str(gen_man_path),
            "card_manifest": str(card_man_path),
            "chat_refactor_governor_verdict": str(gov_path),
            "governance_verdict": str(gov_gv_path) if gov_gv_path.is_file() else str(out / "governance_verdict.json"),
            "next_card_dispatch": str(out / "next_card_dispatch.json"),
            "rollback_decision": str(out / "rollback_decision.json"),
        },
    }
    man_path = out / branding.manifest_basename
    man_path.write_text(json.dumps(os_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    integrated = {
        "version": 1,
        "card": branding.vps_card,
        "integrated_final_verdict": {
            "runner_completed": maintained,
            "governor_pass": bool(gov_body.get("governor_pass")),
            "integrated_cycle_ok": bool(gov_body.get("integrated_cycle_ok")),
            "automation_adoption_chat_ts": bool(gov_body.get("automation_adoption_chat_ts")),
            "maintained": maintained,
            "sealed_candidate": sealed_candidate,
            "failed_at": failed_at,
            "risk": risk,
            "auto_apply_allowed": auto_apply,
        },
        "fail_next_cursor_card": branding.fail_next,
    }
    int_path = out / "integrated_final_verdict.json"
    int_path.write_text(json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    overall_pass = maintained and failed_at is None
    planner_fv = out / "final_verdict.json"
    if planner_fv.is_file():
        pfv = out / "planner_final_verdict.json"
        try:
            pfv.write_text(planner_fv.read_text(encoding="utf-8"), encoding="utf-8")
        except OSError:
            pass
    final_v = {
        "version": 1,
        "card": branding.vps_card,
        "status": "PASS" if overall_pass else "FAIL",
        "maintained": maintained,
        "sealed_candidate": sealed_candidate,
        "failed_at": failed_at,
        "fail_next_cursor_card": branding.fail_next,
        "paths": {
            "os_manifest": str(man_path),
            "governance_verdict": os_manifest["paths"]["governance_verdict"],
            "card_manifest": str(card_man_path),
            "integrated_final_verdict": str(int_path),
        },
    }
    (out / "final_verdict.json").write_text(json.dumps(final_v, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if not overall_pass:
        nd = _read_json(out / "next_card_dispatch.json")
        ev = {
            "version": 1,
            "card": branding.runner_card,
            "generatedAt": _utc_now_iso(),
            "failed_at": failed_at,
            "steps": steps,
            "governance_verdict_path": os_manifest["paths"]["governance_verdict"],
            "governor_verdict_path": str(gov_path),
            "next_card_dispatch": nd,
            "fail_next_cursor_card": branding.fail_next,
        }
        (out / "evidence_bundle.json").write_text(json.dumps(ev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        _write_retry(api, branding, str(failed_at), out)

    if ns.stdout_json:
        print(
            json.dumps(
                {
                    "manifest": str(man_path),
                    "integrated": str(int_path),
                    "final_verdict": str(out / "final_verdict.json"),
                },
                ensure_ascii=False,
                indent=2,
            )
        )

    return 0 if overall_pass else 1


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=OS_CARD)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--demo", action="store_true", help="サンプル観測で一周（chat.ts 非読）")
    ap.add_argument("--chat-path", default="", help="観測対象 chat.ts（--demo 時は無視）")
    ap.add_argument("--ts-folder", default="")
    ap.add_argument(
        "--no-write-repo",
        action="store_true",
        help="生成カードを generated_* に書かない（検証用）",
    )
    ap.add_argument(
        "--run-acceptance-seal",
        action="store_true",
        help="chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh を実行（本番 API 前提・重い）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    return ap.parse_args()


def main() -> int:
    ns = parse_args()
    ns.write_repo = not ns.no_write_repo
    return cmd_run(ns, BRANDING_OS)


if __name__ == "__main__":
    raise SystemExit(main())
