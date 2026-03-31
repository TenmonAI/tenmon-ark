#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA_EXECUTOR_CURSOR_AUTO_V1
TENMON_OPENAI_REAL_CALL_BIND_CURSOR_AUTO_V1

多AIオーケストラの fail-closed 実行殻（初回: dry-run 決定的スタブ）。
- 主裁定層は GPT/天聞AI スロット（本番では外部に委譲; 未接続時は契約どおりのスタブのみ）
- Claude/Gemini/browser は補助スロット（スタブ出力は候補・監査表現に留める）

証拠束: /var/log/tenmon/multi_ai_autonomy/<TS>/（--evidence-base で変更可）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO = Path(__file__).resolve().parent
if str(_AUTO) not in sys.path:
    sys.path.insert(0, str(_AUTO))

try:
    import tenmon_env_loader_v1  # /etc/tenmon/llm.env を読む
except ImportError:
    pass

import multi_ai_card_synthesizer_v1 as synth_mod
import multi_ai_result_normalizer_v1 as norm_mod
import multi_ai_task_router_v1 as router_mod

CARD = "TENMON_MULTI_AI_ORCHESTRA_EXECUTOR_CURSOR_AUTO_V1"
NEXT_CARD = "TENMON_MULTI_AI_ORCHESTRA_DRYRUN_REPORT_ACCEPTANCE_CURSOR_AUTO_V1"
ROLE_FN = "multi_ai_role_contract_v1.json"
HOLD_FN = "multi_ai_hold_policy_v1.json"
RUNTIME_FN = "multi_ai_runtime_state.json"
PROGRESS_FN = "multi_ai_progress_report.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _log(evidence: Path, msg: str) -> None:
    evidence.mkdir(parents=True, exist_ok=True)
    with (evidence / "run.log").open("a", encoding="utf-8") as f:
        f.write(f"{_utc_iso()} {msg}\n")


def _repo_root() -> Path:
    return _AUTO.parents[1]


def _git_porcelain(repo: Path) -> tuple[list[str], int]:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        lines = [ln for ln in (r.stdout or "").splitlines() if ln.strip()]
        return lines, len(lines)
    except Exception:
        return [], -1


def _load_hold_policy(auto_dir: Path) -> dict[str, Any]:
    return _read_json(auto_dir / HOLD_FN)


def evaluate_hold(
    *,
    adopted_plan: dict[str, Any],
    claude_norm: dict[str, Any],
    gpt_norm: dict[str, Any],
    hold_policy: dict[str, Any],
    router_result: dict[str, Any],
    strict_vague: bool,
) -> tuple[bool, str]:
    auth = gpt_norm.get("execution_authority") if isinstance(gpt_norm.get("execution_authority"), dict) else {}
    if auth.get("authorized") is not True:
        return True, "execution_authority_not_authorized"

    targets = adopted_plan.get("target_paths") if isinstance(adopted_plan.get("target_paths"), list) else []
    patterns = hold_policy.get("path_patterns_hold") or []
    for t in targets:
        ts = str(t).replace("\\", "/")
        for pat in patterns:
            p = str(pat).replace("\\", "/")
            if p in ts or ts.endswith(p.rstrip("/")):
                return True, f"hold_path_pattern:{p}"

    for risk in claude_norm.get("design_risks") or []:
        if not isinstance(risk, dict):
            continue
        if str(risk.get("severity") or "").lower() == "high":
            return True, "claude_high_severity_risk"

    flags = router_result.get("flags") if isinstance(router_result.get("flags"), dict) else {}
    if strict_vague and flags.get("suggest_hold_vague_issue"):
        return True, "vague_issue_strict"

    return False, "ok"


def call_openai_real(prompt: str, evidence_dir: Path | str) -> dict[str, Any]:
    import os, json, urllib.request, pathlib

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set — fail-closed")
    data = json.dumps(
        {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000,
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        body = json.loads(res.read())
    pathlib.Path(evidence_dir, "gpt_real_response.json").write_text(
        json.dumps(body, ensure_ascii=False, indent=2)
    )
    return {
        "agent": "gpt_openai_real",
        "content": body["choices"][0]["message"]["content"],
    }


def _gpt_arbitration_dict_from_openai_content(content: str) -> dict[str, Any]:
    """モデル応答から adopted_plan 等を抽出（normalize_gpt_arbitration 用）。パース不能時は空 dict。"""
    s = (content or "").strip()
    try:
        j = json.loads(s)
        if isinstance(j, dict):
            return j
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try:
            j = json.loads(m.group(0))
            if isinstance(j, dict):
                return j
        except json.JSONDecodeError:
            pass
    return {}


def _optional_vps_audit(base: str, evidence: Path) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/audit"
    out: dict[str, Any] = {"url": url, "ok": None, "error": None}
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        j = json.loads(raw) if raw.strip() else {}
        out["ok"] = bool(j.get("ok")) if isinstance(j, dict) else False
        out["audit_body"] = j if isinstance(j, dict) else {}
    except urllib.error.HTTPError as e:
        out["error"] = f"HTTP {e.code}"
    except Exception as e:
        out["error"] = str(e)
    _write_json(evidence / "vps_audit_snapshot.json", out)
    return out


def run_loop(
    *,
    issue: str,
    evidence: Path,
    dry_run: bool,
    probe_vps: bool,
    vps_base: str,
    sync_automation_state: bool,
    strict_vague: bool,
) -> int:
    auto_dir = _AUTO
    repo = _repo_root()
    evidence.mkdir(parents=True, exist_ok=True)

    hold_policy = _load_hold_policy(auto_dir)
    porcelain_lines, n_git = _git_porcelain(repo)

    obs = {
        "issue_text": issue,
        "git_porcelain_lines": n_git,
        "git_porcelain_sample": porcelain_lines[:40],
        "repo_root": str(repo),
        "sources": ["git", "user_request"],
    }
    _write_json(evidence / "observation_bundle.json", obs)

    router_result = router_mod.route_task(issue_text=issue, observation=obs, auto_dir=auto_dir)
    _write_json(evidence / "task_router_result.json", router_result)
    _log(evidence, "router complete")

    gemini_raw = {"gemini_stub": True}
    g_norm = norm_mod.normalize_gemini_structure(gemini_raw, dry_run=dry_run)
    _write_json(evidence / "gemini_structure_normalized.json", g_norm)
    (evidence / "structured_summary.md").write_text(
        str(g_norm.get("structured_summary") or ""),
        encoding="utf-8",
    )
    _write_json(evidence / "comparison_table.json", {"rows": g_norm.get("comparison_table") or []})
    _write_json(evidence / "options.json", {"options": g_norm.get("options") or []})

    claude_raw = {"claude_stub": True, "gemini_options": g_norm.get("options")}
    c_norm = norm_mod.normalize_claude_audit(claude_raw, dry_run=dry_run)
    _write_json(evidence / "claude_audit_normalized.json", c_norm)
    (evidence / "acceptance_refined.md").write_text(
        str(c_norm.get("acceptance_refined") or ""),
        encoding="utf-8",
    )
    _write_json(evidence / "design_risks.json", {"risks": c_norm.get("design_risks") or []})

    default_targets = [
        "api/automation/multi_ai_orchestra_executor_v1.py",
        "api/automation/multi_ai_task_router_v1.py",
        "api/automation/multi_ai_result_normalizer_v1.py",
        "api/automation/multi_ai_card_synthesizer_v1.py",
        "api/automation/multi_ai_role_contract_v1.json",
        "api/automation/multi_ai_hold_policy_v1.json",
    ]
    observation_prompt = (
        "TENMON multi-ai orchestrator: arbitrate the following observation and issue.\n"
        "Return ONLY a valid JSON object with keys:\n"
        "adopted_plan: {option_id, summary, target_paths[], non_goals[]},\n"
        "rejected_options: [], center_decision: string,\n"
        "execution_authority: {authorized: bool, arbiter: string, constraints: []}.\n"
        "Scope: prefer api/automation. Do not propose changing 正典/正文/persona automatically.\n\n"
        + json.dumps(
            {
                "issue_text": issue[:8000],
                "git_porcelain_lines": n_git,
                "git_porcelain_sample": porcelain_lines[:40],
                "repo_root": str(repo),
            },
            ensure_ascii=False,
        )
    )

    if not dry_run:
        _log(evidence, "openai_real_call_attempt dry_run=False")
        try:
            _real = call_openai_real(observation_prompt, evidence)
        except RuntimeError as e:
            fb = {
                "schema": "MULTI_AI_FAILURE_BUNDLE_V1",
                "generatedAt": _utc_iso(),
                "verdict": "HOLD",
                "hold_reason": f"openai_real_failed:{e}",
            }
            _write_json(evidence / "failure_bundle.json", fb)
            _write_json(
                evidence / "multi_ai_runtime_state.json",
                {
                    "schema": "MULTI_AI_RUNTIME_STATE_V1",
                    "last_loop_id": evidence.name,
                    "last_verdict": "HOLD",
                    "hold_active": True,
                    "hold_reason": fb["hold_reason"],
                    "gpt_arbitration_completed": False,
                    "openai_http_attempted": True,
                    "last_evidence_dir": str(evidence),
                    "updatedAt": _utc_iso(),
                },
            )
            _log(evidence, f"HOLD {fb['hold_reason']}")
            if sync_automation_state:
                _write_json(auto_dir / RUNTIME_FN, _read_json(evidence / "multi_ai_runtime_state.json"))
            return 2
        _parsed = _gpt_arbitration_dict_from_openai_content(_real.get("content") or "")
        gpt_raw = {
            **_parsed,
            **_real,
            "gemini_options": g_norm.get("options"),
            "claude_risks": c_norm.get("design_risks"),
        }
        gpt_dry_flag = False
    else:
        gpt_raw = {"agent": "gpt_tenmon_stub"}
        gpt_dry_flag = True

    p_norm = norm_mod.normalize_gpt_arbitration(
        gpt_raw,
        dry_run=gpt_dry_flag,
        default_targets=default_targets,
    )
    _write_json(evidence / "gpt_arbitration_normalized.json", p_norm)
    adopted = p_norm.get("adopted_plan") if isinstance(p_norm.get("adopted_plan"), dict) else {}
    _write_json(evidence / "adopted_plan.json", adopted)
    _write_json(evidence / "rejected_options.json", {"items": p_norm.get("rejected_options") or []})
    (evidence / "center_decision.md").write_text(str(p_norm.get("center_decision") or ""), encoding="utf-8")
    _write_json(evidence / "execution_authority.json", p_norm.get("execution_authority") or {})

    hold, hold_reason = evaluate_hold(
        adopted_plan=adopted,
        claude_norm=c_norm,
        gpt_norm=p_norm,
        hold_policy=hold_policy,
        router_result=router_result,
        strict_vague=strict_vague,
    )

    merged = norm_mod.merge_normalized(
        {
            "observation": norm_mod.normalize_observation_bundle(
                {
                    **obs,
                    "git_porcelain_lines": n_git,
                }
            ),
            "gemini": g_norm,
            "claude": c_norm,
            "gpt": p_norm,
        }
    )
    _write_json(evidence / "normalized_results.json", merged)

    if hold:
        fb = {
            "schema": "MULTI_AI_FAILURE_BUNDLE_V1",
            "generatedAt": _utc_iso(),
            "verdict": "HOLD",
            "hold_reason": hold_reason,
            "adopted_plan": adopted,
        }
        _write_json(evidence / "failure_bundle.json", fb)
        _write_json(
            evidence / "multi_ai_runtime_state.json",
            {
                "schema": "MULTI_AI_RUNTIME_STATE_V1",
                "last_loop_id": evidence.name,
                "last_verdict": "HOLD",
                "hold_active": True,
                "hold_reason": hold_reason,
                "gpt_arbitration_completed": True,
                "cursor_card_ready": False,
                "vps_acceptance_completed": False,
                "last_evidence_dir": str(evidence),
                "updatedAt": _utc_iso(),
            },
        )
        _log(evidence, f"HOLD {hold_reason}")
        if sync_automation_state:
            _write_json(auto_dir / RUNTIME_FN, _read_json(evidence / "multi_ai_runtime_state.json"))
        return 2

    md, acc = synth_mod.synthesize_cursor_card(
        adopted_plan=adopted,
        claude_audit=c_norm,
        gemini_norm=g_norm,
        next_card_name=NEXT_CARD,
        auto_dir=auto_dir,
    )
    synth_mod.write_synthesized(evidence, md, acc)
    _log(evidence, "synthesized cursor card")

    vps_audit = {}
    if probe_vps:
        vps_audit = _optional_vps_audit(vps_base, evidence)
        _log(evidence, f"vps audit ok={vps_audit.get('ok')}")

    audit_ok = vps_audit.get("ok") if probe_vps else None
    fail_acceptance = probe_vps and audit_ok is not True

    verdict = "FAIL" if fail_acceptance else "PASS"
    acc_path = evidence / "acceptance_bundle.json"
    acc_merged = dict(_read_json(acc_path))
    acc_merged["vps_probe"] = vps_audit
    acc_merged["verdict"] = verdict
    _write_json(acc_path, acc_merged)

    progress = {
        "schema": "MULTI_AI_PROGRESS_REPORT_V1",
        "generatedAt": _utc_iso(),
        "current_phase": "card_synthesized",
        "loops_completed": 1,
        "last_verdict": verdict,
        "last_next_card": NEXT_CARD,
        "evidence_dir": str(evidence),
        "notes": (
            "dry-run スタブ経路（--dry-run 既定）。"
            "--no-dry-run 時は GPT のみ call_openai_real → gpt_real_response.json。Claude/Gemini は未接続スタブのまま。"
        ),
        "orchestra_dry_run": dry_run,
        "gpt_slot_openai_real_http": not dry_run,
    }
    _write_json(evidence / "multi_ai_progress_report.json", progress)

    runtime_state = {
        "schema": "MULTI_AI_RUNTIME_STATE_V1",
        "last_loop_id": evidence.name,
        "last_verdict": verdict,
        "last_card": CARD,
        "last_evidence_dir": str(evidence),
        "hold_active": False,
        "hold_reason": None,
        "gpt_arbitration_completed": True,
        "cursor_card_ready": True,
        "vps_acceptance_completed": bool(probe_vps and audit_ok is True),
        "updatedAt": _utc_iso(),
    }
    _write_json(evidence / "multi_ai_runtime_state.json", runtime_state)

    if fail_acceptance:
        _write_json(
            evidence / "failure_bundle.json",
            {
                "schema": "MULTI_AI_FAILURE_BUNDLE_V1",
                "verdict": "FAIL",
                "reason": "vps_audit_not_ok",
                "vps_audit": vps_audit,
            },
        )
        _log(evidence, "FAIL vps audit")
        if sync_automation_state:
            _write_json(auto_dir / RUNTIME_FN, runtime_state)
            _write_json(auto_dir / PROGRESS_FN, progress)
        return 1

    _log(evidence, "PASS")
    if sync_automation_state:
        _write_json(auto_dir / RUNTIME_FN, runtime_state)
        _write_json(auto_dir / PROGRESS_FN, progress)

    # 最小接続ヒント（schedule / cursor bridge は別カードで配線）
    _write_json(
        evidence / "schedule_cursor_bridge_hint.json",
        {
            "note": "schedule_executor_orchestrator_v1 / cursor_executor_bridge_v1 への接続は次カードで real-bind",
            "related_modules": [
                "schedule_executor_orchestrator_v1.py",
                "cursor_executor_bridge_v1.py",
                "schedule_acceptance_judge_v1.py",
            ],
        },
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--issue", default="multi_ai オーケストラ骨格を automation に追加し、証拠束を保存する（正典・正文・persona は不変更）")
    ap.add_argument(
        "--evidence-base",
        default="/var/log/tenmon/multi_ai_autonomy",
        help="証拠ルート（其の下に TS ディレクトリ）。--no-dry-run 時 gpt_real_response.json をここに保存",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="決定的スタブ（既定 True）。GPT/Claude/Gemini いずれも実 HTTP なし。",
    )
    ap.add_argument(
        "--no-dry-run",
        action="store_true",
        help="GPT スロットのみ OpenAI 実呼び出し（OPENAI_API_KEY 必須・fail-closed）。Claude/Gemini は未着手のまま。",
    )
    ap.add_argument("--probe-vps", action="store_true", help="GET /api/audit を実行")
    ap.add_argument("--vps-base", default=os.environ.get("TENMON_API_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--sync-automation-state", action="store_true", help="api/automation の runtime/progress を更新")
    ap.add_argument("--strict-vague-issue", action="store_true", help="課題が短すぎる場合 HOLD")
    args = ap.parse_args()
    dry_run = not args.no_dry_run

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    evidence = Path(args.evidence_base) / ts
    evidence.mkdir(parents=True, exist_ok=True)
    _log(evidence, f"start dry_run={dry_run} probe_vps={args.probe_vps}")

    code = run_loop(
        issue=str(args.issue),
        evidence=evidence,
        dry_run=dry_run,
        probe_vps=bool(args.probe_vps),
        vps_base=str(args.vps_base),
        sync_automation_state=bool(args.sync_automation_state),
        strict_vague=bool(args.strict_vague_issue),
    )
    print(json.dumps({"evidence_dir": str(evidence), "exit_code": code}, ensure_ascii=False))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
