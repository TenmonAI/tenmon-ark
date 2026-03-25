#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION — OS 統合 runner
report 取り込み → acceptance → ledger → residual scorer → card generator → seal governor
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

CARD = "TENMON_SELF_IMPROVEMENT_OS_RUNNER_V1"
VPS_CARD = "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1"
FAIL_NEXT = "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1"
RETRY_MD_NAME = "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1.md"
STOPBLEED_CARD = "TENMON_SELF_IMPROVEMENT_OS_STOPBLEED_CURSOR_AUTO_V1"
STOPBLEED_VPS = "TENMON_SELF_IMPROVEMENT_OS_STOPBLEED_VPS_V1"
FAIL_NEXT_STOPBLEED = "TENMON_SELF_IMPROVEMENT_OS_STOPBLEED_RETRY_CURSOR_AUTO_V1"
RETRY_STOPBLEED_MD = "TENMON_SELF_IMPROVEMENT_OS_STOPBLEED_RETRY_CURSOR_AUTO_V1.md"

PARENT_CURSOR = "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1"
PARENT_VPS = "TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1"
FAIL_NEXT_PARENT = "TENMON_SELF_IMPROVEMENT_OS_PARENT_RETRY_CURSOR_AUTO_V1"

REGISTRY_JSON = "automation/out/os_output_contract_normalize_v1/output_contract_registry.json"
MASTER_VERDICT_JSON = "automation/out/master_verdict_unification_v1/master_verdict.json"


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


def _chat_ts_overall_with_master_unification(api: Path, seal_final_body: Dict[str, Any]) -> bool:
    """master_verdict_unifier が存在すれば真値をそこから（live seal 優先の統一結果）。"""
    mv = _read_json(api / MASTER_VERDICT_JSON)
    ax = (mv.get("axes") or {}).get("chat_ts_overall_100") or {}
    if isinstance(ax, dict) and ax.get("value") is not None:
        return bool(ax["value"])
    return bool(seal_final_body.get("chat_ts_overall_100"))


def _output_contract_refs(api: Path) -> Dict[str, Any]:
    p = api / REGISTRY_JSON
    return {
        "registry_path": str(p.relative_to(api)) if p.is_file() else None,
        "registry_present": p.is_file(),
    }


def _failure_reason_category(
    seal_rc: int,
    adopt: bool,
    rc_gov: int,
    rc_sc: int,
    rc_led: int,
    res_score_path: Path,
    gen_ok: bool,
    verdict_ok: bool,
) -> str:
    """runner 終了理由の粗分類（親カードの観測用）。contract / verdict / residual / generator に集約。"""
    if seal_rc != 0 or not adopt or rc_gov != 0 or rc_led != 0:
        return "contract_mismatch"
    if not verdict_ok:
        return "verdict_conflict"
    if rc_sc != 0 or not res_score_path.is_file():
        return "residual_missing"
    if not gen_ok:
        return "generator_error"
    return "ok"


def _mirror_parent_vps_outputs(api: Path, os_dir: Path, res_out: Path) -> None:
    dest = api / "automation/out/tenmon_self_improvement_os_parent_v1"
    dest.mkdir(parents=True, exist_ok=True)
    for fn in (
        "self_improvement_os_manifest.json",
        "integrated_final_verdict.json",
        "self_improvement_integrated_verdict.json",
        "next_card_dispatch.json",
        "os_fail_next_dispatch.json",
        "final_verdict.json",
    ):
        sp = os_dir / fn
        if sp.is_file():
            shutil.copy2(sp, dest / fn)
    rs = res_out / "residual_quality_score.json"
    if rs.is_file():
        shutil.copy2(rs, dest / "residual_quality_score.json")
    (api / "automation" / PARENT_VPS).write_text(
        f"{PARENT_VPS}\n{_utc_now_iso()}\nos_dir={os_dir}\n",
        encoding="utf-8",
    )


def _resolve_seal_dir(explicit: Optional[str]) -> Optional[Path]:
    if explicit:
        p = Path(explicit).resolve()
        return p if p.is_dir() else None
    try:
        r = subprocess.run(
            ["readlink", "-f", "/var/log/tenmon/card"],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        p = Path(r.stdout.strip())
        return p if p.is_dir() else None
    except Exception:
        return None


def _run(
    cmd: List[str],
    cwd: Optional[Path] = None,
    env: Optional[Dict[str, str]] = None,
) -> int:
    e = os.environ.copy()
    if env:
        e.update(env)
    r = subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=e, check=False)
    return int(r.returncode)


def _merge_dispatch(
    seal: Path,
    os_dir: Path,
    manifest: Dict[str, Any],
    adopt: bool,
) -> Dict[str, Any]:
    supp = _read_json(seal / "_completion_supplement" / "next_card_dispatch.json")
    dispatch: List[Dict[str, Any]] = []
    seen = set()
    for d in supp.get("dispatch") or []:
        if not isinstance(d, dict):
            continue
        key = (d.get("cursor_card"), d.get("vps_card"), d.get("blocker"))
        if key in seen:
            continue
        seen.add(key)
        dispatch.append(
            {
                "source": "completion_supplement",
                "blocker": d.get("blocker"),
                "cursor_card": d.get("cursor_card"),
                "vps_card": d.get("vps_card"),
                "stage_hint": d.get("stage_hint"),
            }
        )
    cur = manifest.get("cursor_card_name")
    vps = manifest.get("vps_card_name")
    if cur and vps:
        key = (cur, vps, "card_auto_generator")
        if key not in seen:
            dispatch.append(
                {
                    "source": "card_auto_generator",
                    "blocker": manifest.get("blocker_primary"),
                    "cursor_card": cur,
                    "vps_card": vps,
                    "stage_hint": manifest.get("focused_theme"),
                }
            )
    if not adopt:
        dispatch.insert(
            0,
            {
                "source": "seal_governor",
                "blocker": "adoption_sealed_false",
                "cursor_card": FAIL_NEXT,
                "vps_card": VPS_CARD,
                "stage_hint": "os_integration_retry",
            },
        )
    return {
        "version": 1,
        "card": "TENMON_OS_INTEGRATED_NEXT_CARD_DISPATCH_V1",
        "generatedAt": _utc_now_iso(),
        "adoption_sealed": adopt,
        "dispatch": dispatch,
    }


def _build_integrated_final_verdict(
    api: Path,
    seal_dir: Optional[Path],
    seal_final: Dict[str, Any],
    extra: Dict[str, Any],
) -> Dict[str, Any]:
    """forensic / Parent 04 系と同型に近い overall 束ね。master verdict / registry 参照を付与。"""
    mv = _read_json(api / MASTER_VERDICT_JSON)
    reg = _read_json(api / REGISTRY_JSON)
    overall_pass = _chat_ts_overall_with_master_unification(api, seal_final)
    return {
        "version": 1,
        "card": STOPBLEED_CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "generatedAt": _utc_now_iso(),
        "source": "self_improvement_os_runner_v1",
        "seal_dir": str(seal_dir) if seal_dir else None,
        "output_contract_registry_ref": (REGISTRY_JSON if reg else None),
        "master_verdict_unification_ref": (MASTER_VERDICT_JSON if mv else None),
        "static": {
            "ok": bool(seal_final.get("chat_ts_static_100")),
            "summary": {"chat_ts_static_100": seal_final.get("chat_ts_static_100")},
        },
        "runtime": {
            "ok": bool(seal_final.get("chat_ts_runtime_100")),
            "summary": {"chat_ts_runtime_100": seal_final.get("chat_ts_runtime_100")},
        },
        "surface": {
            "ok": bool(seal_final.get("surface_clean")),
            "summary": {"surface_clean": seal_final.get("surface_clean")},
        },
        "overall": {
            "ok": overall_pass,
            "pass": overall_pass,
            "integrated_self_improvement_pass": extra.get("runner_pass"),
        },
        "runner": extra,
    }


def _write_stopbleed_artifacts(
    api: Path,
    os_dir: Path,
    seal_dir: Optional[Path],
    seal_final: Dict[str, Any],
    steps: List[Dict[str, Any]],
    manifest_os: Dict[str, Any],
    nd: Dict[str, Any],
    fv_runner: Dict[str, Any],
    exit_code: int,
    res_out: Optional[Path] = None,
) -> None:
    os_dir.mkdir(parents=True, exist_ok=True)
    integrated = _build_integrated_final_verdict(
        api,
        seal_dir,
        seal_final,
        {"runner_pass": fv_runner.get("runner_pass"), "exit_code": exit_code, **fv_runner},
    )
    (os_dir / "integrated_final_verdict.json").write_text(
        json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    parent_iv = {
        **integrated,
        "artifact_role": "self_improvement_integrated_verdict",
        "parent_vps_marker": PARENT_VPS,
        "fail_next_parent": FAIL_NEXT_PARENT,
    }
    (os_dir / "self_improvement_integrated_verdict.json").write_text(
        json.dumps(parent_iv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    nd_body = json.dumps(nd, ensure_ascii=False, indent=2) + "\n"
    (os_dir / "next_card_dispatch.json").write_text(nd_body, encoding="utf-8")
    (os_dir / "os_fail_next_dispatch.json").write_text(nd_body, encoding="utf-8")
    (os_dir / "self_improvement_os_manifest.json").write_text(
        json.dumps(manifest_os, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (os_dir / "final_verdict.json").write_text(
        json.dumps(fv_runner, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    sb = {
        "version": 1,
        "card": STOPBLEED_CARD,
        "vps_marker": STOPBLEED_VPS,
        "fail_next_cursor_card": FAIL_NEXT_STOPBLEED,
        "generatedAt": _utc_now_iso(),
        "exit_code": exit_code,
        "runner_pass": exit_code == 0,
        "adoption_sealed": fv_runner.get("adoption_sealed"),
        "seal_exit_code": fv_runner.get("seal_exit_code"),
        "governor_exit_code": fv_runner.get("governor_exit_code"),
        "steps": steps,
        "paths": manifest_os.get("paths", {}),
    }
    (os_dir / "stopbleed_final_verdict.json").write_text(
        json.dumps(sb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (api / "automation" / STOPBLEED_VPS).write_text(
        f"{STOPBLEED_VPS}\n{_utc_now_iso()}\nexit={exit_code}\n",
        encoding="utf-8",
    )
    if res_out is not None:
        try:
            _mirror_parent_vps_outputs(api, os_dir, res_out)
        except Exception:
            pass


def _write_retry_stopbleed(api: Path, reason: str, seal_dir: str, os_dir: str) -> None:
    p = api / "automation" / "generated_cursor_apply" / RETRY_STOPBLEED_MD
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        "\n".join(
            [
                f"# {FAIL_NEXT_STOPBLEED}",
                "",
                "> Self Improvement OS stopbleed",
                f"> reason: `{reason}`",
                f"> seal_dir: `{seal_dir}`",
                f"> os_dir: `{os_dir}`",
                "",
                "## DO",
                "",
                "1. `stopbleed_final_verdict.json` / `integrated_final_verdict.json` を確認",
                "2. `card_auto_generator_v1.py` のエラー解消後に `self_improvement_os_run_v1.sh` を再実行",
                "",
            ]
        ),
        encoding="utf-8",
    )


def _write_retry_stub(api: Path, reason: str, seal_dir: str, os_dir: str) -> None:
    p = api / "automation" / "generated_cursor_apply" / RETRY_MD_NAME
    p.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            f"# {FAIL_NEXT}",
            "",
            "> **自動生成**（`self_improvement_os_runner_v1.py`）",
            f"> reason: `{reason}`",
            f"> seal_dir: `{seal_dir}`",
            f"> os_dir: `{os_dir}`",
            "",
            "## DO",
            "",
            "1. `evidence_bundle.json` / `seal_governor_verdict.json` を確認",
            "2. `next_card_dispatch.json` の **source 優先順**で Cursor → VPS",
            "3. 修正後 `self_improvement_os_run_v1.sh` を再実行",
            "",
            "## CHECK",
            "",
            "```bash",
            "jq . _self_improvement_os_integrated/seal_governor_verdict.json",
            "```",
            "",
        ]
    )
    p.write_text(body, encoding="utf-8")


def cmd_run(ns: argparse.Namespace) -> int:
    api = _repo_api()
    automation = api / "automation"
    scripts = api / "scripts"
    seal_script = scripts / "chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"
    ledger_py = automation / "improvement_ledger_v1.py"
    scorer_py = automation / "residual_quality_scorer_v1.py"
    cardgen_py = automation / "card_auto_generator_v1.py"
    gov_py = automation / "seal_governor_v1.py"

    steps: List[Dict[str, Any]] = []
    seal_rc = 0

    # 1) latest report（acceptance 前に既存 symlink があれば worldclass を読む）
    sd_arg = (ns.seal_dir or "").strip()
    seal_pre = _resolve_seal_dir(sd_arg or None)
    report_meta: Dict[str, Any] = {"phase": "pre", "path": None}
    if seal_pre and (seal_pre / "worldclass_report.json").is_file():
        wc0 = _read_json(seal_pre / "worldclass_report.json")
        report_meta = {
            "phase": "pre_existing_seal",
            "path": str(seal_pre / "worldclass_report.json"),
            "verdict_excerpt": {
                k: (wc0.get("verdict") or {}).get(k)
                for k in ("chat_ts_static_100", "surface_clean", "chat_ts_runtime_100")
            },
        }
    steps.append({"step": "report_ingest", "ok": True, "detail": report_meta})

    # 2) acceptance（worldclass report は seal 内で生成）
    if not ns.skip_seal:
        seal_rc = _run(["bash", str(seal_script)], cwd=str(api))
    else:
        seal_rc = int(ns.seal_exit_code)

    seal_dir = None
    if sd_arg:
        seal_dir = Path(sd_arg).resolve()
        if not seal_dir.is_dir():
            seal_dir = None
    if seal_dir is None:
        seal_dir = _resolve_seal_dir(None)
    if not seal_dir:
        steps.append({"step": "acceptance", "ok": False, "rc": seal_rc, "error": "no_seal_dir"})
        os_dir_fallback = Path("/tmp/tenmon_os_runner_missing_seal")
        fv = {
            "version": 1,
            "card": VPS_CARD,
            "runner_pass": False,
            "seal_exit_code": seal_rc,
            "adoption_sealed": False,
            "reason": "no_seal_dir",
            "governor_exit_code": -1,
        }
        nd_fail = {
            "version": 1,
            "card": "TENMON_OS_INTEGRATED_NEXT_CARD_DISPATCH_V1",
            "generatedAt": _utc_now_iso(),
            "adoption_sealed": False,
            "dispatch": [
                {
                    "source": "stopbleed",
                    "blocker": "no_seal_dir",
                    "cursor_card": FAIL_NEXT_STOPBLEED,
                    "vps_card": STOPBLEED_VPS,
                    "stage_hint": "fix_seal_symlink",
                }
            ],
        }
        manifest_fail = {
            "version": 1,
            "card": VPS_CARD,
            "generatedAt": _utc_now_iso(),
            "seal_dir": "",
            "os_dir": str(os_dir_fallback),
            "steps": steps,
            "paths": {},
        }
        _write_stopbleed_artifacts(api, os_dir_fallback, None, {}, steps, manifest_fail, nd_fail, fv, 1, None)
        _write_retry_stub(api, "no_seal_dir", "", str(os_dir_fallback))
        _write_retry_stopbleed(api, "no_seal_dir", "", str(os_dir_fallback))
        return 1

    os_dir = seal_dir / "_self_improvement_os_integrated"
    os_dir.mkdir(parents=True, exist_ok=True)

    steps.append({"step": "acceptance", "ok": seal_rc == 0, "rc": seal_rc})

    wc_post = _read_json(seal_dir / "worldclass_report.json")
    steps.append(
        {
            "step": "report_post_seal",
            "ok": bool(wc_post),
            "path": str(seal_dir / "worldclass_report.json"),
        }
    )

    # 3) ledger
    rc_led = _run(
        [
            sys.executable,
            str(ledger_py),
            "append-from-seal",
            "--seal-dir",
            str(seal_dir),
            "--card-name",
            VPS_CARD,
            "--seal-exit-code",
            str(seal_rc),
            "--stdout-json",
        ]
    )
    steps.append({"step": "improvement_ledger", "ok": rc_led == 0, "rc": rc_led})

    # 4) scoring
    res_out = os_dir / "residual_scorer"
    res_out.mkdir(parents=True, exist_ok=True)
    rc_sc = _run(
        [
            sys.executable,
            str(scorer_py),
            "score",
            "--seal-dir",
            str(seal_dir),
            "--out-dir",
            str(res_out),
            "--stdout-json",
        ]
    )
    steps.append({"step": "residual_quality_scorer", "ok": rc_sc == 0, "rc": rc_sc})

    # 5) card generation
    pri = res_out / "residual_priority_result.json"
    cg_extra: List[str] = []
    if pri.is_file():
        cg_extra.extend(["--priority-json", str(pri)])
    rc_cg = _run(
        [
            sys.executable,
            str(cardgen_py),
            "generate",
            "--seal-dir",
            str(seal_dir),
            "--out-dir",
            str(os_dir),
            "--ts-folder",
            ns.ts_folder or _utc_now_iso().replace(":", "").replace("-", "")[:15],
        ]
        + cg_extra
    )
    steps.append({"step": "card_auto_generator", "ok": rc_cg == 0, "rc": rc_cg})

    if rc_cg != 0 and not (os_dir / "card_manifest.json").is_file():
        (os_dir / "card_manifest.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "card": "TENMON_CARD_AUTO_GENERATOR_V1",
                    "generatedAt": _utc_now_iso(),
                    "error": "card_auto_generator_nonzero_exit",
                    "rc": rc_cg,
                    "cursor_card_name": None,
                    "vps_card_name": None,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    manifest = _read_json(os_dir / "card_manifest.json")

    # 6) seal governor
    rc_gov = _run(
        [
            sys.executable,
            str(gov_py),
            "--seal-dir",
            str(seal_dir),
            "--out-dir",
            str(os_dir),
            "--enforce-exit",
        ]
    )
    gov_body = _read_json(os_dir / "seal_governor_verdict.json")
    adopt = bool(gov_body.get("adoption_sealed"))
    steps.append({"step": "seal_governor", "ok": adopt and rc_gov == 0, "rc": rc_gov, "adoption_sealed": adopt})

    nd = _merge_dispatch(seal_dir, os_dir, manifest, adopt)

    ocref = _output_contract_refs(api)
    manifest_os: Dict[str, Any] = {
        "version": 1,
        "card": VPS_CARD,
        "parent_cursor_card": PARENT_CURSOR,
        "parent_vps_marker": PARENT_VPS,
        "fail_next_parent": FAIL_NEXT_PARENT,
        "generatedAt": _utc_now_iso(),
        "stopbleed_card": STOPBLEED_CARD,
        "stopbleed_vps_marker": STOPBLEED_VPS,
        "fail_next_stopbleed": FAIL_NEXT_STOPBLEED,
        "seal_dir": str(seal_dir),
        "os_dir": str(os_dir),
        "steps": steps,
        "output_contract_refs": ocref,
        "master_verdict_ref": MASTER_VERDICT_JSON if _read_json(api / MASTER_VERDICT_JSON) else None,
        "paths": {
            "seal_governor_verdict": str(os_dir / "seal_governor_verdict.json"),
            "evidence_bundle": str(os_dir / "evidence_bundle.json"),
            "next_card_dispatch": str(os_dir / "next_card_dispatch.json"),
            "os_fail_next_dispatch": str(os_dir / "os_fail_next_dispatch.json"),
            "integrated_final_verdict": str(os_dir / "integrated_final_verdict.json"),
            "self_improvement_integrated_verdict": str(os_dir / "self_improvement_integrated_verdict.json"),
            "stopbleed_final_verdict": str(os_dir / "stopbleed_final_verdict.json"),
            "residual_quality_score": str(res_out / "residual_quality_score.json"),
            "residual_priority_result": str(res_out / "residual_priority_result.json"),
            "card_manifest": str(os_dir / "card_manifest.json"),
            "worldclass_report": str(seal_dir / "worldclass_report.json"),
            "final_verdict_seal": str(seal_dir / "final_verdict.json"),
            "output_contract_registry": str(api / REGISTRY_JSON),
            "master_verdict_unification": str(api / MASTER_VERDICT_JSON),
        },
    }

    final_ok = adopt and seal_rc == 0
    seal_final_body = _read_json(seal_dir / "final_verdict.json")
    res_score_path = res_out / "residual_quality_score.json"
    manifest_cg = _read_json(os_dir / "card_manifest.json")
    gen_ok = rc_cg == 0 or bool(manifest_cg.get("cursor_card_name"))
    verdict_ok = _chat_ts_overall_with_master_unification(api, seal_final_body)

    manifest_os["failure_reason_category"] = _failure_reason_category(
        seal_rc,
        adopt,
        rc_gov,
        rc_sc,
        rc_led,
        res_score_path,
        gen_ok,
        verdict_ok,
    )

    fv = {
        "version": 1,
        "card": VPS_CARD,
        "runner_pass": False,
        "adoption_sealed": adopt,
        "maintained_sealed": adopt,
        "seal_exit_code": seal_rc,
        "governor_exit_code": rc_gov,
        "card_auto_generator_rc": rc_cg,
        "chat_ts_overall_100": verdict_ok,
        "failure_reason_category": manifest_os["failure_reason_category"],
    }
    # 成功: seal+governor OK、residual 成果物あり、master verdict OK、ledger OK、カード生成は rc==0 または manifest 実体あり
    success = (
        final_ok
        and rc_sc == 0
        and res_score_path.is_file()
        and gen_ok
        and verdict_ok
        and rc_led == 0
    )
    fv["runner_pass"] = success
    exit_code = 0 if success else 1
    _write_stopbleed_artifacts(
        api,
        os_dir,
        seal_dir,
        seal_final_body,
        steps,
        manifest_os,
        nd,
        fv,
        exit_code,
        res_out,
    )

    if not final_ok:
        _write_retry_stub(
            api,
            f"seal_rc={seal_rc} adoption={adopt} gov_rc={rc_gov}",
            str(seal_dir),
            str(os_dir),
        )
    if exit_code != 0:
        _write_retry_stopbleed(
            api,
            f"seal_rc={seal_rc} adoption={adopt} gov_rc={rc_gov} cardgen_rc={rc_cg}",
            str(seal_dir),
            str(os_dir),
        )

    if ns.stdout_json:
        print(json.dumps({"manifest": str(os_dir / "self_improvement_os_manifest.json"), **fv}, ensure_ascii=False, indent=2))

    return exit_code


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="フル OS パイプライン")
    r.add_argument("--seal-dir", default="", help="固定 seal（未指定は /var/log/tenmon/card）")
    r.add_argument("--skip-seal", action="store_true", help="acceptance をスキップ（検証用）")
    r.add_argument("--seal-exit-code", type=int, default=0, help="--skip-seal 時の想定 rc")
    r.add_argument("--ts-folder", default="", help="card generator の VPS サブフォルダ名")
    r.add_argument("--stdout-json", action="store_true")
    r.set_defaults(func=cmd_run)

    ns = ap.parse_args()
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
