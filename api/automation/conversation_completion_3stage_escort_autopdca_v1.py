#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_V1

3 枚の completion カードを順固定で追従。未達なら同段を再試行し、
Stage3 中に Stage1/2 再発が観測されたら該当段へ戻す親オーケストレーター。

観測中心（パッチ適用は別工程）。各 cycle: build → restart → health/audit →
full_completion → final_seal → 悪化検査 → 現行段の stage ランナー 1 本のみ。
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_V1"
VERSION = 1

_AUTOMATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AUTOMATION_DIR.parents[1]

STAGE1_CARD = "TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1"
STAGE2_CARD = "TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1"
STAGE3_CARD = "TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1"
FULL_PDCA_CARD = "TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1"
FINAL_SEAL_CARD = "TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3"


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


def _run_shell(cmd: str, cwd: Path, timeout: int = 900) -> Tuple[int, str]:
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


def _http_json(method: str, url: str, timeout: int = 20) -> Dict[str, Any]:
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.getcode(), "json": json.loads(raw) if raw.strip() else None}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _latest_child_dir(base: Path) -> Optional[Path]:
    if not base.is_dir():
        return None
    dirs = [p for p in base.iterdir() if p.is_dir() and not p.name.startswith(".")]
    if not dirs:
        return None
    return max(dirs, key=lambda p: p.name)


def _copy_tree_summary(src: Path, dst: Path, globs: Tuple[str, ...]) -> List[str]:
    """主要 JSON/MD のみコピー（軽量）。"""
    dst.mkdir(parents=True, exist_ok=True)
    copied: List[str] = []
    for pattern in globs:
        for f in src.glob(pattern):
            if f.is_file():
                out = dst / f.name
                try:
                    out.write_bytes(f.read_bytes())
                    copied.append(str(out.relative_to(dst.parent.parent)))
                except OSError:
                    pass
    return copied


def _run_py(
    script: Path,
    repo: Path,
    extra_args: str,
    cwd: Path,
    timeout: int,
) -> Tuple[int, str]:
    cmd = f"{sys.executable} {_sq(str(script))} --repo-root {_sq(str(repo))} {extra_args}"
    return _run_shell(cmd, cwd, timeout=timeout)


def _single_next_theme(active_stage: int, full_baseline: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """patch_plan は次の 1 テーマのみ（世界観より contract/surface 優先）。"""
    if active_stage == 1:
        return {
            "stage": 1,
            "theme_id": "STAGE1_SURFACE_BLEED_SINGLE",
            "title": "surface / fallback / helper / repetition の 1 点のみ",
            "hint": "cycle_summary_stage1.json と baseline_summary の aggregates を参照し 1 ファイルに寄せる",
        }
    if active_stage == 2:
        return {
            "stage": 2,
            "theme_id": "STAGE2_CONTINUITY_UNKNOWN_SINGLE",
            "title": "continuity / unknown bridge / one_step の 1 点のみ",
            "hint": "cycle_summary_stage2.json の metics で最も悪い 1 指標だけを狙う",
        }
    return {
        "stage": 3,
        "theme_id": "STAGE3_AUTONOMOUS_SEAL_SINGLE",
        "title": "replay / workspace ready / seal ゲートの 1 点のみ",
        "hint": "ready_for_apply_forensic / replay_acceptance_forensic を参照",
        "priority_from_full_pdca": (full_baseline or {}).get("priority_top3"),
    }


def _final_stop_ok(
    fcs: Optional[Dict[str, Any]],
    seal_accept: Optional[Dict[str, Any]],
    wo_strict_ready: bool,
    workspace_clean: bool,
    replay_ok: bool,
    *,
    strict_unknown_bridge: bool,
) -> Tuple[bool, List[str]]:
    """最終到達基準 + 停止条件。"""
    miss: List[str] = []
    if not fcs:
        miss.append("missing_full_completion_summary")
        return False, miss
    score_keys = [
        "conversation_os_completion",
        "continuity_completion",
        "surface_completion",
        "autonomous_completion",
    ]
    if strict_unknown_bridge:
        score_keys.append("unknown_bridge_completion")
    for k in score_keys:
        v = fcs.get(k)
        if v != 100:
            miss.append(f"{k}_not_100(got_{v})")
    if not fcs.get("seal_ready"):
        miss.append("seal_ready_false")
    if not fcs.get("seal_allowed"):
        miss.append("seal_allowed_false")
    sm = seal_accept or {}
    mech = sm.get("sealMechanical") if isinstance(sm.get("sealMechanical"), dict) else {}
    if mech:
        if not mech.get("SEAL_ALLOWED"):
            miss.append("sealMechanical_SEAL_ALLOWED_false")
    if not wo_strict_ready:
        miss.append("readyForApply_not_strict_true")
    if not workspace_clean:
        miss.append("workspace_not_clean")
    if not replay_ok:
        miss.append("replay_acceptance_not_true")
    return len(miss) == 0, miss


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=Path, default=_REPO_ROOT)
    ap.add_argument("--base-url", default=os.environ.get("TENMON_PROBE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--session-utc", default=None, help="セッション直下フォルダ名（既定: 自動 UTC）")
    ap.add_argument("--max-cycles", type=int, default=30)
    ap.add_argument("--skip-build", action="store_true")
    ap.add_argument(
        "--restart-cmd",
        default=None,
        help="各 cycle 前に実行する再起動コマンド（exit 0 を期待）",
    )
    ap.add_argument("--assume-restart-ok", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="1 cycle だけ観測して終了")
    ap.add_argument(
        "--strict-unknown-bridge-100",
        action="store_true",
        help="unknown_bridge_completion=100 も必須（既定では full PDCA のプレースホルダを許容）",
    )
    args = ap.parse_args()

    repo = args.repo_root.resolve()
    session = args.session_utc or _utc_folder()
    escort_root = repo / "api" / "automation" / "reports" / CARD / session
    escort_root.mkdir(parents=True, exist_ok=True)

    log_lines: List[str] = []

    def lg(m: str) -> None:
        log_lines.append(m)

    # 段別「最後に PASS した」ランレポート（成果物用）
    last_pass: Dict[int, Optional[Path]] = {1: None, 2: None, 3: None}
    rollback_log: List[Dict[str, Any]] = []
    matrix_rows: List[Dict[str, Any]] = []
    guard_events: List[Dict[str, Any]] = []
    deterioration_cycles: List[Dict[str, Any]] = []
    prev_fcs: Optional[Dict[str, Any]] = None

    active = 1
    script1 = _AUTOMATION_DIR / "conversation_completion_stage1_surface_bleed_pdca_v1.py"
    script2 = _AUTOMATION_DIR / "conversation_completion_stage2_continuity_unknown_pdca_v1.py"
    script3 = _AUTOMATION_DIR / "conversation_completion_stage3_autonomous_seal_pdca_v1.py"
    script_full = _AUTOMATION_DIR / "conversation_full_completion_pdca_autoloop_v1.py"
    script_seal = _AUTOMATION_DIR / "final_seal_autopilot_v3.py"

    max_c = 1 if args.dry_run else max(1, args.max_cycles)

    for cycle in range(1, max_c + 1):
        ctag = f"cycle_{cycle:04d}"
        cdir = escort_root / ctag
        cdir.mkdir(parents=True, exist_ok=True)
        gen_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        lg(f"=== {ctag} active_stage={active} ===")

        # --- build
        build_ok = True
        blog = ""
        if not args.skip_build:
            bc, blog = _run_shell("npm run build", repo / "api", timeout=900)
            build_ok = bc == 0
        _atomic_write(cdir / "cycle_build.log", blog or "[skip-build]")

        # --- restart
        restart_ok = bool(args.assume_restart_ok)
        if args.restart_cmd:
            rc, rout = _run_shell(args.restart_cmd, repo, timeout=180)
            restart_ok = rc == 0
            _atomic_write(cdir / "cycle_restart.log", rout[-4000:])
        elif args.assume_restart_ok:
            _atomic_write(cdir / "cycle_restart.log", "[assume-restart-ok]\n")
        else:
            _atomic_write(
                cdir / "cycle_restart.log",
                "[skipped] pass --restart-cmd or --assume-restart-ok\n",
            )

        time.sleep(1)

        # --- health / audit
        health = _http_json("GET", args.base_url.rstrip("/") + "/health", 15)
        audit = _http_json("GET", args.base_url.rstrip("/") + "/api/audit", 25)
        health_ok = bool(health.get("ok") and (health.get("json") or {}).get("status") == "ok")
        audit_ok = bool(audit.get("ok") and audit.get("status") == 200)
        _atomic_write(
            cdir / "cycle_health_audit.json",
            {"health_ok": health_ok, "audit_ok": audit_ok, "health": health, "audit": audit},
        )

        # full PDCA
        fu = f"{session}-{ctag}-full"
        full_extra = f"{_sq('--base-url')} {_sq(args.base_url)} {_sq('--utc')} {_sq(fu)}"
        if args.skip_build or build_ok:
            full_extra += " --skip-build"
        fc, fout = _run_py(script_full, repo, full_extra, _AUTOMATION_DIR, 1200)
        _atomic_write(cdir / "full_pdca.stdout.log", fout[-12000:])
        full_dir = repo / "api" / "automation" / "reports" / FULL_PDCA_CARD / fu
        fcs_path = full_dir / "final_completion_summary.json"
        fcs = _load_json(fcs_path)
        baseline_full = _load_json(full_dir / "baseline_summary.json")

        # final seal
        su = f"{session}-{ctag}-seal"
        seal_parts = [
            f"{_sq('--base-url')} {_sq(args.base_url)}",
            f"{_sq('--utc')} {_sq(su)}",
            f"--cycle {cycle}",
        ]
        if args.assume_restart_ok:
            seal_parts.append("--assume-restart-ok")
        if args.skip_build or build_ok:
            seal_parts.append("--skip-build")
        seal_extra = " ".join(seal_parts)
        sc, sout = _run_py(script_seal, repo, seal_extra, _AUTOMATION_DIR, 1200)
        _atomic_write(cdir / "final_seal.stdout.log", sout[-12000:])
        seal_dir = repo / "api" / "automation" / "reports" / FINAL_SEAL_CARD / su
        acc_path = seal_dir / "acceptance_summary.json"
        acc = _load_json(acc_path)
        if str(_AUTOMATION_DIR) not in sys.path:
            sys.path.insert(0, str(_AUTOMATION_DIR))
        from seal_contract_normalize_v1 import replay_acceptance_ok, workspace_ready_apply_safe

        wo_obs = _AUTOMATION_DIR / "workspace_observer_v1.py"
        woc, woo = _run_py(
            wo_obs,
            repo,
            "--stdout-json --emit-report --skip-api-build",
            _AUTOMATION_DIR,
            300,
        )
        try:
            wo_snap = json.loads(woo.strip() or "{}")
        except json.JSONDecodeError:
            wo_snap = _load_json(repo / "api" / "automation" / "reports" / "workspace_snapshot_v1.json") or {}

        ra_script = _AUTOMATION_DIR / "replay_audit_v1.py"
        rac, rao = _run_py(ra_script, repo, "--stdout-json --emit-report", _AUTOMATION_DIR, 300)
        try:
            ra_snap = json.loads(rao.strip() or "{}")
        except json.JSONDecodeError:
            ra_snap = _load_json(repo / "api" / "automation" / "reports" / "replay_audit_v1.json") or {}

        replay_ok = replay_acceptance_ok(ra_snap)
        wo_apply_safe = workspace_ready_apply_safe(wo_snap)
        wo_strict = wo_snap.get("readyForApply") is True
        git_info = wo_snap.get("git") if isinstance(wo_snap.get("git"), dict) else {}
        workspace_clean = not bool(git_info.get("dirty"))

        # deterioration: compare key metrics
        det: Dict[str, Any] = {
            "cycle": cycle,
            "active_stage_before_guard": active,
            "regressed": False,
            "notes": [],
        }
        if prev_fcs and fcs:
            for key in ("surface_completion", "continuity_completion", "conversation_os_completion"):
                a, b = prev_fcs.get(key), fcs.get(key)
                if isinstance(a, (int, float)) and isinstance(b, (int, float)) and b < a - 3:
                    det["regressed"] = True
                    det["notes"].append(f"{key}_dropped:{a}->{b}")
                    guard_events.append(
                        {
                            "cycle": cycle,
                            "kind": "metric_regression",
                            "detail": det["notes"][-1],
                            "rollback_recommended": True,
                        }
                    )
                    rollback_log.append(
                        {
                            "cycle": cycle,
                            "from_stage": active,
                            "to_stage": active,
                            "reason": f"metric_regression:{det['notes'][-1]}",
                            "rollback_queue_note": "patch が悪化候補 — git revert / 手動ロールバック理由を残すこと",
                        }
                    )
        prev_fcs = fcs

        # --- regression: re-run stage1/2 as guards when advanced
        s1_exit, s2_exit = 0, 0
        if active >= 2:
            x1, o1 = _run_py(
                script1,
                repo,
                f"{_sq('--base-url')} {_sq(args.base_url)} --skip-build",
                _AUTOMATION_DIR,
                600,
            )
            s1_exit = x1
            _atomic_write(cdir / "guard_stage1_rerun.log", o1[-8000:])
            if x1 != 0:
                det["regressed"] = True
                det["notes"].append("stage1_guard_failed")
                rollback_log.append(
                    {
                        "cycle": cycle,
                        "from_stage": active,
                        "to_stage": 1,
                        "reason": "stage1_acceptance_failed_while_advanced",
                    }
                )
                active = 1

        if active >= 3 and s1_exit == 0:
            x2, o2 = _run_py(
                script2,
                repo,
                f"{_sq('--base-url')} {_sq(args.base_url)} --skip-build",
                _AUTOMATION_DIR,
                600,
            )
            s2_exit = x2
            _atomic_write(cdir / "guard_stage2_rerun.log", o2[-8000:])
            if x2 != 0:
                det["regressed"] = True
                det["notes"].append("stage2_guard_failed")
                rollback_log.append(
                    {
                        "cycle": cycle,
                        "from_stage": active,
                        "to_stage": 2,
                        "reason": "stage2_acceptance_failed_while_stage3",
                    }
                )
                active = 2

        _atomic_write(cdir / "deterioration_guard.json", det)

        # priority_top3 再計算済み（full baseline に内包）
        if baseline_full and baseline_full.get("priority_top3"):
            _atomic_write(cdir / "priority_top3.json", baseline_full["priority_top3"])

        single_theme = _single_next_theme(active, baseline_full)
        _atomic_write(
            cdir / "patch_plan.json",
            {
                "generatedAt": gen_at,
                "cycle": cycle,
                "active_stage": active,
                "next_single_theme_only": single_theme,
                "principle": "1_theme_1_verify_per_patch",
            },
        )

        # --- run exactly one stage runner（この時点の active）
        runner_stage = active
        st_script = {1: script1, 2: script2, 3: script3}[runner_stage]
        st_extra = f"{_sq('--base-url')} {_sq(args.base_url)}"
        if args.skip_build or build_ok:
            st_extra += " --skip-build"
        st_exit, st_out = _run_py(st_script, repo, st_extra, _AUTOMATION_DIR, 900)
        _atomic_write(cdir / f"stage{runner_stage}_runner.stdout.log", st_out[-8000:])

        st_card = {1: STAGE1_CARD, 2: STAGE2_CARD, 3: STAGE3_CARD}[runner_stage]
        latest_stage_dir = _latest_child_dir(repo / "api" / "automation" / "reports" / st_card)
        stage_pass = st_exit == 0
        if stage_pass:
            last_pass[runner_stage] = latest_stage_dir

        if runner_stage == 1 and stage_pass:
            active = 2
        elif runner_stage == 2 and stage_pass:
            active = 3

        row = {
            "cycle": cycle,
            "build_ok": build_ok,
            "restart_ok": restart_ok,
            "health_ok": health_ok,
            "audit_ok": audit_ok,
            "full_pdca_exit": fc,
            "final_seal_exit": sc,
            "workspace_observer_exit": woc,
            "replay_audit_exit": rac,
            "stage_ran": f"S{runner_stage}",
            "stage_runner_exit": st_exit,
            "stage_pass": stage_pass,
            "active_stage_after_cycle": active,
            "wo_readyForApply": wo_snap.get("readyForApply"),
            "wo_readyForApplyApplySafe": wo_snap.get("readyForApplyApplySafe"),
            "wo_apply_safe_normalized": wo_apply_safe,
            "replay_ok_normalized": replay_ok,
            "latest_stage_report": str(latest_stage_dir.relative_to(repo)) if latest_stage_dir else None,
        }
        matrix_rows.append(row)

        deterioration_cycles.append(det)
        _atomic_write(
            escort_root / "deterioration_guard.json",
            {"version": 1, "per_cycle": deterioration_cycles, "events": guard_events},
        )

        state = {
            "version": VERSION,
            "card": CARD,
            "sessionUtc": session,
            "generatedAt": gen_at,
            "active_stage": active,
            "last_pass_stage_dirs": {str(k): str(v) for k, v in last_pass.items() if v},
            "cycle": cycle,
        }
        _atomic_write(escort_root / "full_stage_state.json", state)
        _atomic_write(escort_root / "stage_progress_matrix.json", {"rows": matrix_rows})
        _atomic_write(
            escort_root / "rollback_reason.json",
            {"version": 1, "events": rollback_log},
        )

        merged_summary = {
            "version": VERSION,
            "card": CARD,
            "sessionUtc": session,
            "cycle": cycle,
            "full_completion_summary": fcs,
            "final_seal_acceptance_summary": acc,
            "workspace_observer_excerpt": {
                "readyForApply": wo_snap.get("readyForApply"),
                "readyForApplyApplySafe": wo_snap.get("readyForApplyApplySafe"),
                "dirty": (wo_snap.get("git") or {}).get("dirty"),
                "applySafeForAutonomousSeal": (wo_snap.get("git") or {})
                .get("dirtyClassification", {})
                .get("applySafeForAutonomousSeal"),
            },
            "replay_excerpt": {
                "acceptanceOk": ra_snap.get("acceptanceOk"),
                "finalStatus": ra_snap.get("finalStatus"),
            },
        }
        _atomic_write(escort_root / "full_completion_summary.json", merged_summary)

        seal_md_src = seal_dir / "seal_recommendation.md"
        if seal_md_src.is_file():
            _atomic_write(escort_root / "seal_recommendation.md", seal_md_src.read_text(encoding="utf-8"))
        world_md = seal_dir / "final_worldclass_verdict.md"
        if world_md.is_file():
            _atomic_write(escort_root / "final_worldclass_verdict.md", world_md.read_text(encoding="utf-8"))

        stop_ok, stop_miss = _final_stop_ok(
            fcs,
            acc,
            wo_strict,
            workspace_clean,
            replay_ok,
            strict_unknown_bridge=bool(args.strict_unknown_bridge_100),
        )
        if runner_stage == 3 and stage_pass and stop_ok:
            lg(f"STOP: all criteria met at cycle {cycle}")
            for sn, pth in (
                ("stage1_final", last_pass[1]),
                ("stage2_final", last_pass[2]),
                ("stage3_final", last_pass[3]),
            ):
                if pth and pth.is_dir():
                    _copy_tree_summary(pth, escort_root / sn, ("*.json", "*.md", "*.log"))
            _atomic_write(escort_root / "stop_verdict.json", {"ok": True, "cycle": cycle, "checks": stop_miss})
            _atomic_write(escort_root / "escort_run.log", "\n".join(log_lines) + "\n")
            print(json.dumps({"ok": True, "stopped": True, "cycle": cycle}, indent=2))
            return 0

        if args.dry_run:
            break

    _atomic_write(
        escort_root / "stop_verdict.json",
        {"ok": False, "reason": "max_cycles_or_dry_run", "active_stage": active},
    )
    _atomic_write(escort_root / "escort_run.log", "\n".join(log_lines) + "\n")
    print(json.dumps({"ok": False, "stopped": False, "active_stage": active}, indent=2))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
