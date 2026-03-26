#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_BROWSER_AI_CONSULT_TO_PATCHPLAN_MAINLINE_CURSOR_AUTO_V1

browser AI 相談 → role router →（任意）第2プロバイダ → consensus → patch plan bridge を 1 本化。
成功の捏造なし・fail-closed。Mac（Darwin）専用（browser_ai_operator 契約）。
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_AUTO_DIR = Path(__file__).resolve().parent
if str(_AUTO_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTO_DIR))

from model_advice_to_patch_plan_bridge_v1 import _render_md, bridge_multi_model_consensus_to_patch_plan_v1
from model_role_router_v1 import route_model_role_v1
from multi_model_consensus_v1 import build_consensus_v1

CARD = "TENMON_BROWSER_AI_CONSULT_TO_PATCHPLAN_MAINLINE_CURSOR_AUTO_V1"
SUMMARY_NAME = "browser_ai_patchplan_mainline_summary.json"
RETRY_CARD = CARD
NEXT_ON_PASS = "TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。consult-mainline retry 1枚のみ生成。"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _digest(text: str, max_len: int = 480) -> str:
    t = " ".join(str(text or "").split())
    if len(t) <= max_len:
        return t
    return t[: max_len - 3] + "..."


def _as_str_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        parts = re.split(r"[\n,;]+", v)
        return [p.strip() for p in parts if p.strip()]
    return [str(v).strip()] if str(v).strip() else []


def _normalize_advice_blob(raw: dict[str, Any], *, objective: str, target_files: list[str], risk_class: str) -> dict[str, Any]:
    tf = _as_str_list(raw.get("target_files")) or list(target_files)
    return {
        "problem": str(raw.get("problem") or objective).strip() or str(objective).strip(),
        "target_files": sorted({str(x).strip() for x in tf if str(x).strip()}),
        "proposed_change": str(raw.get("proposed_change") or raw.get("proposed_patch") or "").strip(),
        "risk": str(raw.get("risk") or risk_class or "").strip().lower(),
        "tests": sorted({str(x).strip() for x in _as_str_list(raw.get("tests"))}),
        "reject_conditions": sorted({str(x).strip() for x in _as_str_list(raw.get("reject_conditions"))}),
    }


_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _extract_json_object(text: str) -> dict[str, Any] | None:
    t = str(text or "").strip()
    if not t:
        return None
    try:
        j = json.loads(t)
        return j if isinstance(j, dict) else None
    except json.JSONDecodeError:
        pass
    m = _JSON_FENCE.search(t)
    if m:
        try:
            j = json.loads(m.group(1).strip())
            return j if isinstance(j, dict) else None
        except json.JSONDecodeError:
            return None
    i, depth = t.find("{"), 0
    if i < 0:
        return None
    for j in range(i, len(t)):
        if t[j] == "{":
            depth += 1
        elif t[j] == "}":
            depth -= 1
            if depth == 0:
                try:
                    j2 = json.loads(t[i : j + 1])
                    return j2 if isinstance(j2, dict) else None
                except json.JSONDecodeError:
                    return None
    return None


def _parse_browser_operator_output(path: Path, *, objective: str, target_files: list[str], risk_class: str) -> tuple[dict[str, Any] | None, str]:
    if not path.is_file():
        return None, "browser_output_missing"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return None, f"browser_output_invalid_json:{e}"
    if raw.get("ok") is not True:
        return None, f"browser_operator_not_ok:{raw.get('reason') or 'unknown'}"
    cap = str(raw.get("captured_text") or "").strip()
    if not cap:
        return None, "no_captured_text_manual_review_required"
    blob = _extract_json_object(cap)
    if not blob:
        return None, "advice_json_not_found_in_captured_text"
    adv = _normalize_advice_blob(blob, objective=objective, target_files=target_files, risk_class=risk_class)
    if not adv["proposed_change"]:
        return None, "empty_proposed_change_after_parse"
    return adv, ""


def _ui_provider_to_slot(name: str) -> str:
    n = str(name or "").strip().lower()
    if n == "chatgpt":
        return "gpt"
    return n if n in ("claude", "gemini") else n


def _single_provider_consensus(advice: dict[str, Any], slot: str) -> dict[str, Any]:
    return {
        "consensus_level": "single_provider",
        "agreed_changes": [],
        "conflicting_changes": [],
        "recommended_primary_plan": {
            "basis": "single_browser_consult",
            "source_provider": slot,
            "target_files": list(advice["target_files"]),
            "risk": advice["risk"],
            "change_digest": _digest(advice["proposed_change"]),
            "problem_digest": _digest(advice["problem"], 320),
            "tests_digest": _digest(", ".join(advice["tests"]), 200),
            "reject_conditions_digest": _digest(", ".join(advice["reject_conditions"]), 200),
        },
        "manual_review_required": True,
    }


def _build_prompt(objective: str, target_files: list[str], risk_class: str, context_summary: str) -> str:
    tf = "\n".join(f"- {x}" for x in target_files) if target_files else "(none — infer minimal scope if needed)"
    ctx = context_summary.strip() or "(none)"
    return f"""You are assisting with a code change plan for TENMON-ARK.

## Objective
{objective.strip()}

## Target files (hints)
{tf}

## Risk class
{risk_class.strip()}

## Context summary
{ctx}

## Required response format
Reply with ONE JSON object only (no prose outside JSON), with exactly these keys:
- problem (string, concise)
- target_files (array of repo-relative paths)
- proposed_change (string, concrete implementation intent — no full file dumps)
- risk (string: low|medium|high|critical)
- tests (array of strings, verification steps)
- reject_conditions (array of strings, when to abort)

JSON:"""


def _run_browser_operator(
    *,
    py: str,
    operator_py: Path,
    provider: str,
    prompt_file: Path,
    output_file: Path,
    timeout: int,
) -> tuple[int, str]:
    cmd = [py, str(operator_py), "--provider", provider, "--prompt-file", str(prompt_file), "--output-file", str(output_file)]
    try:
        cp = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        tail = ((cp.stdout or "") + (cp.stderr or ""))[-4000:]
        return int(cp.returncode), tail
    except Exception as e:
        return 1, f"{type(e).__name__}:{e}"


def _write_retry_stub(auto: Path, reason: str, evidence: list[str]) -> None:
    gen = auto / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)
    p = gen / f"{RETRY_CARD}.md"
    body = "\n".join(
        [
            f"# {RETRY_CARD} (retry)",
            "",
            f"> generated_at: `{_utc()}`",
            f"> reason: `{reason}`",
            "",
            "## evidence",
            "",
            *[f"- `{x}`" for x in evidence[:30]],
            "",
        ]
    )
    p.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--objective", default="", help="相談目的")
    ap.add_argument("--target-files", default="", help="カンマ/改行区切りのパス")
    ap.add_argument("--risk-class", default="medium")
    ap.add_argument("--context-summary", default="", help="追加コンテキスト")
    ap.add_argument("--domain", default="", help="role router 用ドメインラベル（任意）")
    ap.add_argument("--input-json", type=Path, default=None, help="objective/target_files/risk_class/context_summary を上書き")
    ap.add_argument("--out-dir", type=Path, default=None)
    ap.add_argument("--cursor-patch-plan", type=Path, default=None, help="既定: api/automation/cursor_patch_plan.json")
    ap.add_argument("--timeout-sec", type=int, default=int(os.environ.get("TENMON_BROWSER_AI_MAINLINE_TIMEOUT_SEC", "600")))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    out_dir = (args.out_dir or (auto / "out" / "browser_ai_patchplan_mainline")).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    patch_out = (args.cursor_patch_plan or (auto / "cursor_patch_plan.json")).expanduser().resolve()
    md_out = patch_out.with_suffix(".md")

    objective = str(args.objective or "")
    target_files = [x.strip() for x in re.split(r"[\n,;]+", str(args.target_files or "")) if x.strip()]
    risk_class = str(args.risk_class or "medium")
    context_summary = str(args.context_summary or "")
    domain = str(args.domain or "")

    if args.input_json is not None:
        ip = args.input_json.expanduser().resolve()
        if not ip.is_file():
            summary = {"card": CARD, "generated_at": _utc(), "ok": False, "fail_reason": "input_json_not_found"}
            (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"ok": False, **summary}, ensure_ascii=False))
            return 1
        try:
            blob = json.loads(ip.read_text(encoding="utf-8"))
        except Exception as e:
            summary = {"card": CARD, "generated_at": _utc(), "ok": False, "fail_reason": f"input_json_invalid:{e}"}
            (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"ok": False, **summary}, ensure_ascii=False))
            return 1
        if isinstance(blob, dict):
            objective = str(blob.get("objective", objective))
            tf = blob.get("target_files")
            if isinstance(tf, list):
                target_files = [str(x).strip() for x in tf if str(x).strip()]
            elif isinstance(tf, str) and tf.strip():
                target_files = [x.strip() for x in re.split(r"[\n,;]+", tf) if x.strip()]
            risk_class = str(blob.get("risk_class", risk_class))
            context_summary = str(blob.get("context_summary", context_summary))
            domain = str(blob.get("domain", domain))

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "inputs": {
            "objective": objective,
            "target_files": target_files,
            "risk_class": risk_class,
            "context_summary": context_summary,
            "domain": domain,
        },
        "ok": False,
        "fail_reason": None,
        "steps": {},
    }

    if platform.system().lower() != "darwin":
        summary["fail_reason"] = "non_darwin_browser_operator_unavailable"
        (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        _write_retry_stub(auto, summary["fail_reason"], [str(out_dir / SUMMARY_NAME)])
        print(json.dumps({"ok": False, "fail_reason": summary["fail_reason"]}, ensure_ascii=False))
        return 1

    route = route_model_role_v1(objective, target_files, risk_class, domain)
    route["card"] = "TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1"
    summary["steps"]["role_router"] = route
    if route.get("manual_review_required") or not route.get("primary_provider"):
        summary["fail_reason"] = str(route.get("reason") or "router_manual_review_or_unroutable")
        (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        _write_retry_stub(auto, summary["fail_reason"], [str(out_dir / SUMMARY_NAME)])
        print(json.dumps({"ok": False, "fail_reason": summary["fail_reason"]}, ensure_ascii=False))
        return 1

    primary_ui = str(route["primary_provider"])
    secondary_ui = [str(x) for x in (route.get("secondary_providers") or []) if str(x).strip()]
    requires_consensus = bool(route.get("requires_consensus"))
    run_second = bool(requires_consensus and secondary_ui)

    prompt_text = _build_prompt(objective, target_files, risk_class, context_summary)
    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    work = out_dir / f"run_{run_id}"
    work.mkdir(parents=True, exist_ok=True)
    prompt_path = work / "consult_prompt.txt"
    prompt_path.write_text(prompt_text, encoding="utf-8")

    operator_py = auto / "browser_ai_operator_v1.py"
    py = sys.executable
    timeout = max(60, int(args.timeout_sec))

    out1 = work / f"browser_out_{primary_ui}.json"
    rc1, tail1 = _run_browser_operator(
        py=py, operator_py=operator_py, provider=primary_ui, prompt_file=prompt_path, output_file=out1, timeout=timeout
    )
    summary["steps"]["browser_primary"] = {"provider": primary_ui, "exit_code": rc1, "output": str(out1), "tail": tail1}
    adv1, err1 = _parse_browser_operator_output(out1, objective=objective, target_files=target_files, risk_class=risk_class)
    if adv1 is None:
        summary["fail_reason"] = f"primary_advice_parse_failed:{err1}"
        (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        _write_retry_stub(auto, summary["fail_reason"], [str(out1), str(work)])
        print(json.dumps({"ok": False, "fail_reason": summary["fail_reason"]}, ensure_ascii=False))
        return 1

    slot1 = _ui_provider_to_slot(primary_ui)
    adv2: dict[str, Any] | None = None
    slot2: str | None = None
    if run_second:
        sec_ui = secondary_ui[0]
        out2 = work / f"browser_out_{sec_ui}.json"
        rc2, tail2 = _run_browser_operator(
            py=py, operator_py=operator_py, provider=sec_ui, prompt_file=prompt_path, output_file=out2, timeout=timeout
        )
        summary["steps"]["browser_secondary"] = {"provider": sec_ui, "exit_code": rc2, "output": str(out2), "tail": tail2}
        adv2, err2 = _parse_browser_operator_output(out2, objective=objective, target_files=target_files, risk_class=risk_class)
        if adv2 is None:
            summary["fail_reason"] = f"secondary_advice_parse_failed:{err2}"
            (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            _write_retry_stub(auto, summary["fail_reason"], [str(out2), str(work)])
            print(json.dumps({"ok": False, "fail_reason": summary["fail_reason"]}, ensure_ascii=False))
            return 1
        slot2 = _ui_provider_to_slot(sec_ui)

    gpt_a: dict[str, Any] | None = None
    cl_a: dict[str, Any] | None = None
    gm_a: dict[str, Any] | None = None
    if slot1 == "gpt":
        gpt_a = adv1
    elif slot1 == "claude":
        cl_a = adv1
    else:
        gm_a = adv1

    if adv2 is not None and slot2:
        if slot2 == "gpt":
            gpt_a = adv2
        elif slot2 == "claude":
            cl_a = adv2
        else:
            gm_a = adv2

    if run_second:
        consensus = build_consensus_v1(gpt_a, cl_a, gm_a)
    else:
        consensus = _single_provider_consensus(adv1, slot1)

    consensus["card"] = "TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1"
    consensus_path = work / "multi_model_consensus.json"
    consensus_path.write_text(json.dumps(consensus, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary["steps"]["consensus"] = {
        "path": str(consensus_path),
        "consensus_level": consensus.get("consensus_level"),
        "manual_review_required": consensus.get("manual_review_required"),
    }

    payload = bridge_multi_model_consensus_to_patch_plan_v1(consensus)
    patch_out.parent.mkdir(parents=True, exist_ok=True)
    patch_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_out.write_text(_render_md(payload), encoding="utf-8")
    summary["cursor_patch_plan_path"] = str(patch_out)
    summary["patch_plan_ok"] = bool(payload.get("ok"))

    clvl = str(consensus.get("consensus_level") or "")
    consensus_blocked = clvl in ("insufficient_input", "conflict")
    summary["ok"] = bool(payload.get("ok")) and not consensus_blocked
    if consensus_blocked:
        summary["fail_reason"] = f"consensus_fail_closed:{clvl}"
    elif not payload.get("ok"):
        summary["fail_reason"] = str(payload.get("fail_reason") or "bridge_not_ok")
    else:
        summary["fail_reason"] = None

    (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps({"ok": summary["ok"], "path": str(patch_out), "summary": str(out_dir / SUMMARY_NAME)}, ensure_ascii=False))

    if not summary["ok"]:
        _write_retry_stub(auto, str(summary.get("fail_reason") or "patch_plan_not_ok"), [str(patch_out), str(out_dir / SUMMARY_NAME)])
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
