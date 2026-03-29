#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_COMPLETION_AND_ARCHITECTURE_FULL_REPORT_CURSOR_AUTO_V1
repo 内完結・読取専用。git / 層 / leak / queue / PWA-NAS-learning を集約レポート化。
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_COMPLETION_AND_ARCHITECTURE_FULL_REPORT_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_completion_and_architecture_full_report_v1.json"
OUT_MD = "tenmon_completion_and_architecture_full_report_v1.md"

# FINAL conversation upgrade mainline（実装カード）+ 後段検証（acceptance probe は主線に含めない）
CONVERSATION_UPGRADE_MAINLINE_V1: list[tuple[str, str | None]] = [
    (
        "TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V1",
        "api/automation/tenmon_surface_leak_cleanup_result_v1.json",
    ),
    (
        "TENMON_SUPPORT_ROUTE_SHAPE_AND_TRIAGE_STABILIZATION_CURSOR_AUTO_V1",
        "api/automation/tenmon_support_route_shape_and_triage_stabilization_result_v1.json",
    ),
    (
        "TENMON_FOUNDER_UPDATE_MODE_AND_ANSWER_FRAME_CURSOR_AUTO_V1",
        "api/automation/tenmon_founder_update_mode_and_answer_frame_result_v1.json",
    ),
    (
        "TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_CURSOR_AUTO_V1",
        "api/automation/tenmon_uncertainty_and_confidence_surface_logic_result_v1.json",
    ),
]
ACCEPTANCE_VERIFICATION_CARD_V1 = "TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_CURSOR_AUTO_V1"

SCAN_ROOTS_REL = ("api/src", "api/automation", "site/src")
SKIP_DIR_NAMES = frozenset(
    {"node_modules", "dist", ".git", "__pycache__", ".venv", "venv", "out", "archive"}
)
MAX_FILE_BYTES = 800_000
MAX_MATCHES_PER_NEEDLE = 400
SAMPLES_PER_NEEDLE = 4

LEAK_NEEDLES: list[tuple[str, str]] = [
    ("routeEvidenceTraceV1", r"routeEvidenceTraceV1"),
    ("personaConstitutionRuntimeV1", r"personaConstitutionRuntimeV1"),
    ("verdictEngineV1", r"verdictEngineV1"),
    ("threadCore", r"\bthreadCore\b"),
    ("thoughtCoreSummary", r"thoughtCoreSummary"),
    ("inputCognitionSplitV1", r"inputCognitionSplitV1"),
    ("truthLayerArbitrationV1", r"truthLayerArbitrationV1"),
    ("omegaContract", r"omegaContract"),
    ("root_reasoning_colon", r"root_reasoning\s*[:：]"),
    ("truth_structure_colon", r"truth_structure\s*[:：]"),
    ("center_colon", r"(?:^|\n)\s*center\s*[:：]"),
    ("verdict_colon", r"verdict\s*[:：]"),
]

CORE_FILES: list[tuple[str, str]] = [
    ("inputSemanticSplitter", "api/src/core/inputSemanticSplitter.ts"),
    ("meaningArbitrationKernel", "api/src/core/meaningArbitrationKernel.ts"),
    ("threadMeaningMemory", "api/src/core/threadMeaningMemory.ts"),
    ("tenmonResponseProjector", "api/src/core/tenmonResponseProjector.ts"),
    ("truthLayerArbitrationKernel", "api/src/core/truthLayerArbitrationKernel.ts"),
]

LAYER_DEFS: dict[str, list[str]] = {
    "conversation_thought": [
        "api/src/core/inputSemanticSplitter.ts",
        "api/src/core/responseComposer.ts",
        "api/src/core/threadCore.ts",
        "api/src/core/thoughtGuide.ts",
        "api/src/core/tenmonConversationSurfaceV2.ts",
        "api/src/routes/chat_refactor/finalize.ts",
    ],
    "root_circuit": [
        "api/src/core/meaningArbitrationKernel.ts",
        "api/src/core/truthLayerArbitrationKernel.ts",
        "api/src/core/sourceLayerDiscernmentKernel.ts",
        "api/src/core/lineageAndTransformationJudgementEngine.ts",
        "api/src/core/misreadExpansionAndSpeculativeGuard.ts",
        "api/src/core/knowledgeBinder.ts",
    ],
    "learning_understanding": [
        "api/src/core/tenmonMaterialDigestLedgerV1.ts",
        "api/src/core/tenmonMaterialStudyPlannerV1.ts",
        "api/src/core/tenmonSelfLearningStudyLoopV1.ts",
        "api/src/core/tenmonSanskritComparativeKernelV1.ts",
        "api/src/core/tenmonStudyLedgerV1.ts",
    ],
    "materials_connection": [
        "api/src/core/tenmonNasArchiveBridgeV1.ts",
        "api/src/core/nasArchiveDualTierStorageV1.ts",
        "api/src/core/tenmonMaterialDigestLedgerV1.ts",
    ],
    "autonomy_pdca": [
        "api/automation/tenmon_cursor_single_flight_queue_state.json",
        "api/automation/tenmon_pdca_self_running_os_parent_v1.py",
        "api/automation/tenmon_pdca_cycle_state_v1.json",
        "api/automation/tenmon_autonomy_current_state_forensic.json",
    ],
}

PWA_PATHS = [
    "api/src/db/pwa_schema.sql",
    "site/src/pages/AppGate.tsx",
    "site/src/pages/LoginPage.tsx",
]
NAS_PATHS = [
    "api/src/core/nasArchiveDualTierStorageV1.ts",
    "api/src/core/tenmonNasArchiveBridgeV1.ts",
]
LEARNING_PATHS = [
    "api/src/core/tenmonMaterialDigestLedgerV1.ts",
    "api/src/core/tenmonMaterialStudyPlannerV1.ts",
    "api/src/core/tenmonSelfLearningStudyLoopV1.ts",
    "api/src/core/tenmonSanskritComparativeKernelV1.ts",
    "api/src/core/tenmonStudyLedgerV1.ts",
    "api/src/deepread/sanskritRootEngineV1.ts",
    "api/src/deepread/tenmonGodnameMapperV1.ts",
]

PROBE_MAP = [
    ("define_kotodama", "define_kotodama", "言霊とは何か"),
    ("define_hokekyo", "define_hokekyo", "法華経とは何か"),
    ("general_tired", "general_tired", "今日は少し疲れています"),
    ("general_organize", "general_organize", "この件をどう整理すればいい？"),
    ("symbolic_noah", "symbolic_noah", "これはノアの方舟と重なるのでは"),
    ("subconcept", "uncertainty_sparse", "稗田阿礼系・不確実性プロキシ"),
]


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _run_git(repo: Path, *args: str) -> tuple[int, str]:
    try:
        r = subprocess.run(
            ["git", *args],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except Exception as e:
        return 99, str(e)


def _safe_read_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"error": "invalid_json", "path": str(path)}


def _exists(repo: Path, rel: str) -> bool:
    return (repo / rel).is_file()


def _git_changed_files(repo: Path) -> tuple[list[str], str | None]:
    rc, out = _run_git(repo, "status", "--porcelain", "-z")
    if rc != 0:
        return [], out.strip() or "git_status_failed"
    raw = out.replace("\x00", "\n").strip()
    paths: list[str] = []
    for line in raw.splitlines():
        line = line.strip("\r")
        if not line:
            continue
        # porcelain: "XY path" (2 文字 + 空白) / "?? path" / 稀に "D path" (1 文字 + 空白)
        if line.startswith("??"):
            p = line[2:].lstrip()
        elif len(line) >= 3 and line[1] == " ":
            p = line[2:].lstrip()
        elif len(line) >= 4 and line[2] == " ":
            p = line[3:].lstrip()
        else:
            continue
        if " -> " in p:
            p = p.split(" -> ", 1)[-1].strip()
        if p:
            paths.append(p.replace("\\", "/"))
    return paths, None


def _bucket_ext(path: str) -> str:
    pl = path.lower()
    if pl.endswith(".json"):
        return "json"
    if pl.endswith(".md"):
        return "markdown"
    if pl.endswith(".py"):
        return "python"
    if pl.endswith((".ts", ".tsx")):
        return "typescript"
    return "other"


def _classify_abco(repo: Path, rel: str) -> str:
    r = rel.replace("\\", "/")
    if r.startswith("api/automation/") and (
        r.endswith(".json") or "result" in r or "report" in r or r.endswith("_state_v1.json")
    ):
        return "A_generated_state_report"
    if r.startswith("api/automation/") and (r.endswith(".py") or r.endswith(".sh")):
        return "B_automation_impl"
    if "api/src/routes/chat" in r or "chat_refactor" in r:
        return "C_conversation_core"
    if r.startswith("api/src/core/") and any(
        x in r for x in ("responseComposer", "tenmonResponseProjector", "inputSemantic", "finalize")
    ):
        return "C_conversation_core"
    return "O_other"


def _scan_leaks(repo: Path) -> dict[str, Any]:
    compiled = [(name, re.compile(pat)) for name, pat in LEAK_NEEDLES]
    counts: dict[str, int] = {n: 0 for n, _ in compiled}
    samples: dict[str, list[dict[str, str]]] = defaultdict(list)

    for root_rel in SCAN_ROOTS_REL:
        root = repo / root_rel
        if not root.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES]
            for fn in filenames:
                if not fn.endswith((".ts", ".tsx", ".js", ".mjs", ".py", ".md", ".json")):
                    continue
                fp = Path(dirpath) / fn
                try:
                    st = fp.stat()
                    if st.st_size > MAX_FILE_BYTES:
                        continue
                    text = fp.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
                rel = str(fp.relative_to(repo)).replace("\\", "/")
                for name, cre in compiled:
                    if counts[name] >= MAX_MATCHES_PER_NEEDLE:
                        continue
                    for m in cre.finditer(text):
                        counts[name] += 1
                        if len(samples[name]) < SAMPLES_PER_NEEDLE:
                            line_no = text[: m.start()].count("\n") + 1
                            snippet = text[m.start() : m.start() + 80].replace("\n", " ")
                            samples[name].append({"file": rel, "line": str(line_no), "snippet": snippet[:120]})
                        if counts[name] >= MAX_MATCHES_PER_NEEDLE:
                            break
    return {
        "needles": {n: counts[n] for n in counts},
        "total_hits": sum(counts.values()),
        "samples": {k: v for k, v in samples.items()},
        "scan_roots": list(SCAN_ROOTS_REL),
    }


def _leak_focus_api_src_only(repo: Path) -> int:
    """automation JSON のキー名で水増ししないよう、実装ソース帯のみでメタ行系を数える。"""
    root = repo / "api" / "src"
    if not root.is_dir():
        return 0
    needles = [
        re.compile(r"root_reasoning\s*[:：]"),
        re.compile(r"truth_structure\s*[:：]"),
        re.compile(r"(?:^|\n)\s*center\s*[:：]", re.M),
        re.compile(r"verdict\s*[:：]"),
    ]
    total = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES]
        for fn in filenames:
            if not fn.endswith((".ts", ".tsx")):
                continue
            fp = Path(dirpath) / fn
            try:
                if fp.stat().st_size > MAX_FILE_BYTES:
                    continue
                text = fp.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for cre in needles:
                total += len(cre.findall(text))
    return total


def _layer_inventory(repo: Path) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for layer, paths in LAYER_DEFS.items():
        present = [p for p in paths if _exists(repo, p)]
        n = len(paths)
        out[layer] = {
            "expected": n,
            "present": len(present),
            "missing": [p for p in paths if p not in present],
            "coverage_ratio": round(len(present) / n, 4) if n else 0.0,
            "paths_ok": present,
        }
    return out


def _probe_summary(repo: Path, auto: Path) -> dict[str, Any]:
    rel = auto / "tenmon_conversation_acceptance_probe_relock_result_v1.json"
    data = _safe_read_json(rel)
    rows: dict[str, Any] = {}
    if not data or "error" in data:
        return {"source": str(rel), "loaded": False, "rows": rows, "raw_error": data}
    manual = data.get("manual_probes") or []
    by_id = {str(x.get("id")): x for x in manual if isinstance(x, dict)}
    for probe_key, mid, _msg in PROBE_MAP:
        row = by_id.get(mid) or {}
        head = str(row.get("response_head") or "")
        rows[probe_key] = {
            "probe_id": probe_key,
            "manual_id": mid,
            "routeReason": row.get("routeReason"),
            "response_len": row.get("response_length"),
            "has_center_prefix": bool(re.search(r"(?:^|\n)\s*center\s*[:：]", head, re.I | re.M)),
            "has_root_reasoning": bool(re.search(r"root_reasoning\s*[:：]", head, re.I)),
            "has_truth_structure": bool(re.search(r"truth_structure\s*[:：]", head, re.I)),
            "has_next_axis": "次軸:" in head or "次軸：" in head,
            "has_next_observe": "次観測:" in head or "次観測：" in head,
            "has_one_step_like": bool(re.search(r"次の一手|次の一歩", head)),
            "probe_ok": row.get("probe_ok"),
            "internal_leaks": row.get("internal_leaks"),
        }
    return {
        "source": str(rel),
        "loaded": True,
        "acceptance_pass": data.get("acceptance_pass"),
        "probe_ok_count": data.get("probe_ok_count"),
        "ux_metrics": data.get("ux_metrics"),
        "overall_verdict": data.get("overall_verdict"),
        "rows": rows,
    }


def _queue_state(repo: Path, auto: Path) -> dict[str, Any]:
    p = auto / "tenmon_cursor_single_flight_queue_state.json"
    d = _safe_read_json(p)
    if not d or isinstance(d, dict) and d.get("error"):
        return {"path": str(p), "error": d}
    return {
        "path": str(p),
        "next_card_allowed": d.get("next_card_allowed"),
        "blocked_reason": d.get("blocked_reason"),
        "next_card": d.get("next_card"),
        "review_pressure": d.get("review_pressure"),
        "changed_file_count": d.get("changed_file_count"),
        "current_card": d.get("current_card"),
    }


def _file_state(repo: Path, paths: list[str], label: str) -> dict[str, Any]:
    st = [{"path": p, "present": _exists(repo, p)} for p in paths]
    pres = sum(1 for x in st if x["present"])
    return {
        "label": label,
        "items": st,
        "present_count": pres,
        "total": len(paths),
    }


def _artifact_mainline_done(repo: Path, rel: str | None, surface_leak_focus: int, card: str) -> bool:
    """主線完了: surface は leak または result の acceptance_pass のみ（npm PASS だけでは締めない）。"""
    if card == "TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V1":
        if surface_leak_focus < 25:
            return True
        if rel and (repo / rel).is_file():
            d = _safe_read_json(repo / rel)
            if isinstance(d, dict) and not d.get("error") and d.get("acceptance_pass") is True:
                return True
        return False
    if not rel or not (repo / rel).is_file():
        return False
    d = _safe_read_json(repo / rel)
    if not isinstance(d, dict) or d.get("error"):
        return False
    if d.get("acceptance_pass") is True:
        return True
    if str(d.get("npm_run_check") or "").strip().upper() == "PASS":
        return True
    return False


def _mainline_backlog(repo: Path, surface_leak_focus: int) -> list[str]:
    """主線 4 枚のうち未完了のみ、順序固定・最大 4 枚。"""
    out: list[str] = []
    for card, artifact_rel in CONVERSATION_UPGRADE_MAINLINE_V1:
        if _artifact_mainline_done(repo, artifact_rel, surface_leak_focus, card):
            continue
        out.append(card)
    return out[:4]


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    rc_s, short_out = _run_git(repo, "rev-parse", "--short", "HEAD")
    rc_f, full_out = _run_git(repo, "rev-parse", "HEAD")
    rc_st, status_short_out = _run_git(repo, "status", "--short")
    short_sha = short_out.strip().splitlines()[-1] if short_out.strip() and rc_s == 0 else None
    full_sha = full_out.strip().splitlines()[-1] if full_out.strip() and rc_f == 0 else None
    status_short = status_short_out if rc_st == 0 else f"git_status_error_rc_{rc_st}: {status_short_out[:500]}"
    changed, git_err = _git_changed_files(repo)
    buckets: dict[str, int] = defaultdict(int)
    for p in changed:
        buckets[_bucket_ext(p)] += 1
    abco: dict[str, list[str]] = defaultdict(list)
    for p in changed:
        abco[_classify_abco(repo, p)].append(p)

    core_status = {name: {"path": rel, "present": _exists(repo, rel)} for name, rel in CORE_FILES}
    root_kernel_exists = core_status.get("truthLayerArbitrationKernel", {}).get("present") is True

    surface_data = _scan_leaks(repo)
    leak_focus = _leak_focus_api_src_only(repo)

    probe = _probe_summary(repo, auto)
    probe_pass = probe.get("acceptance_pass") if probe.get("loaded") else None

    queue = _queue_state(repo, auto)
    review_p = float(queue.get("review_pressure") or 0) if isinstance(queue, dict) else 0.0
    n_changed = len(changed)

    pdca_exists = _exists(repo, "api/automation/tenmon_pdca_self_running_os_parent_v1.py")
    forensic_exists = _exists(repo, "api/automation/tenmon_autonomy_current_state_forensic.json")

    completion_bands: list[str] = ["COGNITION_PIPELINE_CONNECTED"]
    if n_changed > 100 or review_p > 0.85:
        completion_bands.append("WORKTREE_PRESSURED")
    if not root_kernel_exists:
        completion_bands.append("ROOT_KERNEL_MISSING")
    leak_open = leak_focus > 20 or (probe_pass is False)
    if leak_open:
        completion_bands.append("CORE_CONNECTED_BUT_SURFACE_OPEN")
    if probe_pass is True and leak_focus < 15:
        completion_bands.append("SURFACE_NEAR_ACCEPTANCE")

    primary_band = "CORE_CONNECTED_BUT_SURFACE_OPEN"
    if "WORKTREE_PRESSURED" in completion_bands and n_changed > 120:
        primary_band = "WORKTREE_PRESSURED"
    elif not root_kernel_exists:
        primary_band = "ROOT_KERNEL_MISSING"
    elif probe_pass is True and leak_focus < 10:
        primary_band = "SURFACE_NEAR_ACCEPTANCE"
    elif "CORE_CONNECTED_BUT_SURFACE_OPEN" in completion_bands:
        primary_band = "CORE_CONNECTED_BUT_SURFACE_OPEN"

    now_cards = _mainline_backlog(repo, leak_focus)
    next_on_pass = now_cards[0] if now_cards else ACCEPTANCE_VERIFICATION_CARD_V1

    assessment = {
        "platform_state": "TENMON_ARK_V1_OPERATIONAL_WITH_GAPS",
        "completion_band": primary_band,
        "completion_bands_all": completion_bands,
        "surface_state": "OPEN" if leak_open else "TIGHTENING",
        "root_state": "KERNEL_PRESENT" if root_kernel_exists else "KERNEL_MISSING",
        "continuity_state": "PROBE_DATA_AVAILABLE" if probe.get("loaded") else "UNKNOWN",
        "worktree_hygiene_state": "PRESSURED" if n_changed > 90 else "NORMAL",
        "conversation_upgrade_mainline": [c for c, _ in CONVERSATION_UPGRADE_MAINLINE_V1],
        "acceptance_verification_card": ACCEPTANCE_VERIFICATION_CARD_V1,
        "custom_gpt_surpass_blockers": [
            "surface_exit_and_user_facing_meta_tightening",
            "support_route_shape_and_triage_stabilization",
            "founder_update_mode_and_answer_frame",
            "uncertainty_and_confidence_surface_logic",
        ],
    }

    result: dict[str, Any] = {
        "schema": "TENMON_COMPLETION_AND_ARCHITECTURE_FULL_REPORT_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "git": {
            "rev_short": short_sha,
            "rev_full": full_sha,
            "status_short_sample": (status_short or "").strip()[:8000],
            "changed_file_count": n_changed,
            "changed_file_buckets": dict(buckets),
            "git_error": git_err,
        },
        "worktree": {
            "classification_abco": {k: v[:] for k, v in abco.items()},
            "classification_counts": {k: len(v) for k, v in abco.items()},
        },
        "layer_inventory": _layer_inventory(repo),
        "core_files": core_status,
        "surface_leaks": surface_data,
        "surface_leak_focus_score": leak_focus,
        "probe_summary": probe,
        "queue_state": queue,
        "pwa_state": _file_state(repo, PWA_PATHS, "pwa"),
        "nas_state": _file_state(repo, NAS_PATHS, "nas"),
        "learning_state": _file_state(repo, LEARNING_PATHS, "learning"),
        "autonomy_artifacts": {
            "pdca_parent_py": pdca_exists,
            "forensic_json": forensic_exists,
            "single_flight_queue_json": _exists(repo, "api/automation/tenmon_cursor_single_flight_queue_state.json"),
        },
        "assessment_summary": assessment,
        "conversation_upgrade_mainline_v1": [c for c, _ in CONVERSATION_UPGRADE_MAINLINE_V1],
        "acceptance_verification": {
            "card": ACCEPTANCE_VERIFICATION_CARD_V1,
            "role": "post_mainline_verification_not_implementation_card",
            "acceptance_pass": probe_pass,
        },
        "now_needed_cards": now_cards,
        "nextOnPass": next_on_pass,
        "nextOnFail": "TENMON_COMPLETION_AND_ARCHITECTURE_FULL_REPORT_RETRY_CURSOR_AUTO_V1",
    }

    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        "# TENMON 構築・architecture フルレポート",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **git HEAD (short)**: `{result['git']['rev_short']}`",
        "",
        "## 1. 現在地",
        "",
        f"- **completion_band（主）**: `{primary_band}`",
        f"- **bands**: {completion_bands}",
        f"- **platform_state**: `{assessment['platform_state']}`",
        f"- **changed files**: {n_changed}",
        "",
        "## 2. 何が通っているか",
        "",
        "- **COGNITION_PIPELINE_CONNECTED**（前提）",
        f"- **root kernel ファイル**: {'存在' if root_kernel_exists else '欠落'}",
        f"- **queue next_card_allowed**: `{queue.get('next_card_allowed')}`",
        f"- **npm**: 本レポートは `npm run check` を実行しません（read-only）。",
        "",
        "## 3. 何が未達か",
        "",
        f"- **surface_state**: {assessment['surface_state']}",
        f"- **probe acceptance_pass**: `{probe_pass}`",
        f"- **leak focus score**（root_reasoning/truth_structure/center/verdict 系ヒット数）: {leak_focus}",
        "",
        "## 4. surface leak 状況",
        "",
        f"- **scan 合計ヒット**: {surface_data['total_hits']}",
        "- **代表 needles**（先頭数件）:",
    ]
    for nk, c in sorted(surface_data["needles"].items(), key=lambda x: -x[1])[:8]:
        md_lines.append(f"  - `{nk}`: {c}")
    md_lines.extend(["", "## 5. root arbitration 状況", ""])
    md_lines.append(f"- **root_state**: `{assessment['root_state']}`")
    md_lines.append(f"- **truthLayerArbitrationKernel.ts**: {'present' if root_kernel_exists else 'missing'}")
    md_lines.extend(["", "## 6. PWA / NAS / learning / autonomy", ""])
    md_lines.append(f"- **PWA paths present**: {result['pwa_state']['present_count']}/{result['pwa_state']['total']}")
    md_lines.append(f"- **NAS paths present**: {result['nas_state']['present_count']}/{result['nas_state']['total']}（dual-tier は未配置の場合あり）")
    md_lines.append(f"- **learning paths present**: {result['learning_state']['present_count']}/{result['learning_state']['total']}")
    md_lines.append(f"- **autonomy**: pdca_py={pdca_exists}, forensic={forensic_exists}")
    md_lines.extend(["", "## 7. custom GPT 超えに対する残差", ""])
    for b in assessment["custom_gpt_surpass_blockers"]:
        md_lines.append(f"- {b}")
    md_lines.extend(
        [
            "",
            "## 8. conversation upgrade 主線（最大 4）",
            "",
            "採用順（実装カード）:",
        ],
    )
    for c in assessment["conversation_upgrade_mainline"]:
        md_lines.append(f"- `{c}`")
    md_lines.extend(["", "**未完了バックログ（now_needed_cards）:**", ""])
    for c in now_cards:
        md_lines.append(f"- `{c}`")
    md_lines.extend(
        [
            "",
            "## 9. 検証カード（主線の後段）",
            "",
            f"- `{ACCEPTANCE_VERIFICATION_CARD_V1}`（acceptance_pass=`{probe_pass}`）",
            "",
        ],
    )
    md_lines.extend(
        [
            "## layer coverage（要約）",
            "",
        ],
    )
    for layer, inv in result["layer_inventory"].items():
        md_lines.append(f"- **{layer}**: {inv['present']}/{inv['expected']} ({inv['coverage_ratio']})")
    md_lines.extend(
        [
            "",
            "## probe 行一覧（acceptance relock があれば）",
            "",
        ],
    )
    for pk, row in (probe.get("rows") or {}).items():
        md_lines.append(
            f"- **{pk}**: ok={row.get('probe_ok')} len={row.get('response_len')} "
            f"root_rs={row.get('has_root_reasoning')} truth_st={row.get('has_truth_structure')} one_step={row.get('has_one_step_like')}",
        )
    md_lines.extend(["", "---", "", f"- nextOnPass: `{result['nextOnPass']}`", f"- nextOnFail: `{result['nextOnFail']}`", ""])

    (auto / OUT_MD).write_text("\n".join(md_lines), encoding="utf-8")
    print(
        json.dumps(
            {
                "wrote": str(auto / OUT_JSON),
                "completion_band": primary_band,
                "nextOnPass": next_on_pass,
                "now_needed_cards": now_cards,
                "acceptance_verification_card": ACCEPTANCE_VERIFICATION_CARD_V1,
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
