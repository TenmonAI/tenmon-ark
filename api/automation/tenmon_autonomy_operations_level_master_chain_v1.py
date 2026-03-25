#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_AUTONOMY_OPERATIONS_LEVEL_MASTER_CHAIN_CURSOR_AUTO_V1

段階ゲート付き 3 カード連鎖:
  1. TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1
  2. TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1（watchdog 同梱）
  3. TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1（観測・方針記録のみ）

前段 PASS まで次へ進まない。FAIL 時は fail-next を 1 枚だけ JSON 出力し exit 1。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

MASTER = "TENMON_AUTONOMY_OPERATIONS_LEVEL_MASTER_CHAIN_CURSOR_AUTO_V1"
CARD1 = "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1"
CARD2 = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
CARD3 = "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1"

NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"

OUT_SUMMARY = "tenmon_autonomy_operations_level_master_chain_summary.json"
OUT_REPORT = "tenmon_autonomy_operations_level_master_chain_report.md"
OUT_FAIL_NEXT = "tenmon_autonomy_master_chain_fail_next_card.json"

CLOSED_VERDICT = "tenmon_self_build_real_closed_loop_proof_verdict.json"
AUTONOMY_VERDICT = "tenmon_operations_level_autonomy_enable_verdict.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def ensure_log_root(repo: Path) -> tuple[Path, bool]:
    """(log_root, is_standard_var_log) — 標準は /var/log/tenmon"""
    root = Path(os.environ.get("TENMON_LOG_ROOT", "/var/log/tenmon"))
    try:
        root.mkdir(parents=True, exist_ok=True)
        test = root / ".tenmon_log_probe"
        test.write_text("ok", encoding="utf-8")
        test.unlink(missing_ok=True)
        std = root.resolve() == Path("/var/log/tenmon").resolve()
        return root, std
    except OSError:
        fallback = repo / "api" / "automation" / "out" / "logs"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback, False


def run_cmd(
    argv: list[str],
    *,
    cwd: Path,
    log_file: Path,
    timeout: int = 900,
) -> dict[str, Any]:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("w", encoding="utf-8") as lf:
        pr = subprocess.run(
            argv,
            cwd=str(cwd),
            stdout=lf,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=timeout,
            check=False,
        )
    tail = ""
    try:
        tail = log_file.read_text(encoding="utf-8")[-6000:]
    except OSError:
        pass
    return {"argv": argv, "returncode": pr.returncode, "log_file": str(log_file), "log_tail": tail}


def blocker_taxonomy_remaining(summary: dict[str, Any]) -> list[str]:
    bad: list[str] = []
    for b in summary.get("remaining_blockers") or []:
        s = str(b).lower()
        if "repo_hygiene" in s:
            bad.append(str(b))
        elif "stale_sources" in s or "stale source" in s:
            bad.append(str(b))
        elif "product_failure" in s:
            bad.append(str(b))
    return bad


def main() -> int:
    ap = argparse.ArgumentParser(description=MASTER)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument(
        "--relax-execution-chain",
        action="store_true",
        help=f"{CARD1}: execution chain 未閉でも build+runtime で PASS",
    )
    ap.add_argument(
        "--allow-product-core",
        action="store_true",
        help="product core 触許可フラグ（観測のみ・safe_scope_enforced を false にする）",
    )
    ap.add_argument(
        "--skip-final-rejudge",
        action="store_true",
        help="最終 rejudge 再実行を省略し、既存 summary のみ評価（開発用）",
    )
    ap.add_argument("--hygiene-dry-run", action="store_true", help=f"{CARD2}: final_seal を dry-run")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    auto.mkdir(parents=True, exist_ok=True)

    log_root, log_under_var_tenmon = ensure_log_root(repo)
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    master_log_dir = log_root / f"card_{MASTER}" / ts
    master_log_dir.mkdir(parents=True, exist_ok=True)
    master_run_log = master_log_dir / "master_run.log"

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    def append_master_log(msg: str) -> None:
        with master_run_log.open("a", encoding="utf-8") as f:
            f.write(msg.rstrip() + "\n")

    append_master_log(f"[MASTER] {MASTER} ts={ts}")
    append_master_log(f"[ROOT] {repo}")

    # ----- CARD 1 -----
    c1_py = auto / "tenmon_self_build_real_closed_loop_proof_v1.py"
    c1_argv = ["python3", str(c1_py), "--repo-root", str(repo), "--base", args.base]
    if args.relax_execution_chain:
        c1_argv.append("--relax-execution-chain")
    r1 = run_cmd(c1_argv, cwd=repo, log_file=master_log_dir / "card1_closed_loop.log", timeout=900)
    v1 = read_json(auto / CLOSED_VERDICT)
    pass1 = bool(v1.get("real_closed_loop_proven"))
    stages.append({"card": CARD1, **r1, "pass": pass1, "verdict": str(auto / CLOSED_VERDICT)})
    append_master_log(f"[CARD1] pass={pass1} rc={r1['returncode']}")
    if not pass1:
        failed_card = CARD1

    # ----- CARD 2 (only if card1 pass) -----
    pass2 = False
    must_block: bool | None = None
    repo_clean: bool | None = None
    r2: dict[str, Any] = {}
    if failed_card is None:
        seal_sh = scripts / "tenmon_repo_hygiene_final_seal_v1.sh"
        if not seal_sh.is_file():
            failed_card = CARD2
            r2 = {"argv": [], "returncode": 99, "log_file": "", "log_tail": "missing seal script"}
            stages.append({"card": CARD2, **r2, "pass": False})
        else:
            c2_argv = ["bash", str(seal_sh)]
            if args.hygiene_dry_run:
                c2_argv.append("--dry-run")
            c2_argv.append("--stdout-json")
            r2 = run_cmd(c2_argv, cwd=repo, log_file=master_log_dir / "card2_hygiene_final_seal.log", timeout=900)
            wg = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
            must_block = bool(wg.get("must_block_seal", True))
            repo_clean = bool(wg.get("watchdog_clean", False))
            pass2 = (not must_block) and repo_clean and r2["returncode"] == 0
            stages.append(
                {
                    "card": CARD2,
                    **r2,
                    "pass": pass2,
                    "must_block_seal": must_block,
                    "repo_hygiene_clean": repo_clean,
                    "watchdog_verdict": str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"),
                }
            )
            append_master_log(
                f"[CARD2] pass={pass2} rc={r2['returncode']} must_block_seal={must_block} repo_hygiene_clean={repo_clean}"
            )
            if not pass2:
                failed_card = CARD2

    # ----- CARD 3（card1–2 連続 PASS のときのみ） -----
    pass3 = False
    autonomy_cycle_pass = False
    safe_scope_enforced = not bool(args.allow_product_core)
    r3: dict[str, Any] = {}
    if failed_card is None:
        autonomy_cycle_pass = True
        r3 = {"note": "no subprocess; observational gate"}
        pass3 = autonomy_cycle_pass and safe_scope_enforced
        out3 = {
            "card": CARD3,
            "generated_at": utc(),
            "autonomy_cycle_pass": autonomy_cycle_pass,
            "safe_scope_enforced": safe_scope_enforced,
            "allow_product_core_flag": bool(args.allow_product_core),
            "master_log_dir": str(master_log_dir),
            "notes": [
                "autonomy_cycle_pass: 当ランで card1→2 が連続 PASS",
                "safe_scope_enforced: --allow-product-core 無し",
            ],
        }
        write_json(auto / AUTONOMY_VERDICT, out3)
        stages.append({"card": CARD3, **r3, "pass": pass3, "verdict": str(auto / AUTONOMY_VERDICT)})
        append_master_log(
            f"[CARD3] pass={pass3} autonomy_cycle_pass={autonomy_cycle_pass} safe_scope={safe_scope_enforced}"
        )
        if not pass3:
            failed_card = CARD3
    else:
        stages.append(
            {
                "card": CARD3,
                "skipped": True,
                "reason": "prior_gate_failed",
                "pass": False,
            }
        )
        append_master_log(f"[CARD3] skipped (prior gate failed: {failed_card})")

    # ----- Final rejudge -----
    rejudge_rc: int | None = None
    summary_path = auto / "tenmon_latest_state_rejudge_summary.json"
    if failed_card is None and not args.skip_final_rejudge and not args.hygiene_dry_run:
        rj_py = auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py"
        if rj_py.is_file():
            rj = run_cmd(
                ["python3", str(rj_py), "--repo-root", str(repo), "--base", args.base],
                cwd=repo,
                log_file=master_log_dir / "final_rejudge.log",
                timeout=1200,
            )
            rejudge_rc = int(rj["returncode"])
            stages.append({"card": "final_rejudge_refresh", **rj, "pass": rejudge_rc == 0})

    summary = read_json(summary_path)
    bad_remain = blocker_taxonomy_remaining(summary)
    rejudge_blockers_clear = len(bad_remain) == 0
    if args.skip_final_rejudge or args.hygiene_dry_run:
        rejudge_blockers_clear = False
        bad_remain = sorted({*bad_remain, "final_rejudge_not_run_this_master_invocation"})

    card_logs_saved = log_under_var_tenmon and master_log_dir.is_dir() and any(master_log_dir.iterdir())

    real_closed = bool(read_json(auto / CLOSED_VERDICT).get("real_closed_loop_proven"))
    hygiene_sealable = (must_block is False) and (repo_clean is True)
    autonomy_proven = pass3 and autonomy_cycle_pass

    master_pass = (
        failed_card is None
        and real_closed
        and hygiene_sealable
        and autonomy_proven
        and rejudge_blockers_clear
        and card_logs_saved
        and not args.skip_final_rejudge
        and not args.hygiene_dry_run
    )

    fail_report_card = failed_card
    if not master_pass and not fail_report_card:
        fail_report_card = "TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1"

    summary_out: dict[str, Any] = {
        "master_card": MASTER,
        "generated_at": utc(),
        "master_pass": master_pass,
        "failed_card": failed_card,
        "retry_target_card": fail_report_card if not master_pass else None,
        "log_dir": str(master_log_dir),
        "stages": stages,
        "card1": {
            "card": CARD1,
            "real_closed_loop_proven": real_closed,
            "verdict_path": str(auto / CLOSED_VERDICT),
        },
        "card2": {
            "card": CARD2,
            "must_block_seal": must_block,
            "repo_hygiene_clean": repo_clean,
        },
        "card3": {
            "card": CARD3,
            "autonomy_cycle_pass": autonomy_cycle_pass,
            "safe_scope_enforced": safe_scope_enforced,
            "verdict_path": str(auto / AUTONOMY_VERDICT),
        },
        "final_acceptance": {
            "real_closed_loop_proven": real_closed,
            "repo_hygiene_sealable": hygiene_sealable,
            "autonomy_cycle_proven": autonomy_proven,
            "rejudge_remaining_blockers_taxonomy_clear": rejudge_blockers_clear,
            "rejudge_blockers_flagged": bad_remain,
            "tenmon_latest_state_rejudge_summary": str(summary_path),
            "card_logs_saved_under_var_log": card_logs_saved,
            "log_root": str(log_root),
        },
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": OUT_FAIL_NEXT,
        "policy": {
            "no_stale_truth": "each_stage appends current-run logs under log_dir",
            "product_core_locked_until_green": not bool(args.allow_product_core),
        },
    }

    write_json(auto / OUT_SUMMARY, summary_out)

    md_lines = [
        f"# {MASTER}",
        "",
        f"- generated_at: `{summary_out['generated_at']}`",
        f"- **master_pass**: `{master_pass}`",
        f"- log_dir: `{master_log_dir}`",
        "",
        "## Stages",
    ]
    for s in stages:
        md_lines.append(f"- **{s.get('card')}** pass=`{s.get('pass')}` rc=`{s.get('returncode', 'n/a')}`")
    md_lines.extend(
        [
            "",
            "## Final acceptance",
            f"- real_closed_loop_proven: `{real_closed}`",
            f"- repo_hygiene_sealable: `{hygiene_sealable}`",
            f"- autonomy_cycle_proven: `{autonomy_proven}`",
            f"- rejudge taxonomy blockers clear: `{rejudge_blockers_clear}`",
            f"- flagged: `{bad_remain}`",
            f"- card_logs_saved: `{card_logs_saved}`",
            "",
            "## Next",
            f"- **NEXT_ON_PASS**: `{NEXT_ON_PASS}`",
        ]
    )
    if not master_pass:
        md_lines.append(f"- **NEXT_ON_FAIL**: see `{OUT_FAIL_NEXT}`")
    (auto / OUT_REPORT).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    if not master_pass and fail_report_card:
        hint = ""
        if fail_report_card == CARD1:
            hint = (
                "api `npm run build`、BASE の `/api/health|audit|audit.build`、"
                "および `tenmon_self_build_execution_chain_v1.py` の chain_closed（必要なら `--relax-execution-chain` は開発のみ）。"
            )
        elif fail_report_card == CARD2:
            hint = "`tenmon_repo_hygiene_watchdog_v1.py` の seal_blockers を解消し `tenmon_repo_hygiene_final_seal_v1.sh` を再実行。"
        elif fail_report_card == CARD3:
            hint = "`--allow-product-core` を付けないこと。カード1–2 を先に緑にする。"
        else:
            if not rejudge_blockers_clear:
                hint = (
                    "`tenmon_latest_state_rejudge_summary.json` の remaining_blockers から "
                    "repo_hygiene / stale_sources / product_failure 系を解消（rejudge シェルを再実行）。"
                )
            elif not card_logs_saved:
                hint = "当ランのログを `/var/log/tenmon/card_*` へ保存できるよう権限を確認（`TENMON_LOG_ROOT` のフォールバックは master PASS 不可）。"
            else:
                hint = "`--skip-final-rejudge` / `--hygiene-dry-run` を外しフルランで再証明。"
        fail_next = {
            "source_master": MASTER,
            "failed_card": fail_report_card,
            "generated_at": utc(),
            "retry_card_markdown": f"# RETRY: {fail_report_card}\n\n{hint}\n",
            "single_retry_only": True,
        }
        write_json(auto / OUT_FAIL_NEXT, fail_next)

    append_master_log(f"[MASTER] master_pass={master_pass} failed={failed_card} fail_report={fail_report_card}")
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
