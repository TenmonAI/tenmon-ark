#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_POST_7PACK_TOTAL_REVEAL_AND_ACCEPTANCE_REPORT_V1

7群（A〜G）適用後の全景再監査: Git / build / health / chat.ts 静的 / DB / probes / automation 束。
出力: api/automation/reports/TENMON_POST_7PACK_TOTAL_REVEAL_V1/<UTC>/
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD_NAME = "TENMON_POST_7PACK_TOTAL_REVEAL_AND_ACCEPTANCE_REPORT_V1"
VERSION = 1

# 完成モデル照合（主要 trunk / core / planning / learning 系）
COMPLETION_MODEL_PATHS: List[str] = [
    "api/src/routes/chat_refactor/define_trunk_v1.ts",
    "api/src/routes/chat_refactor/scripture_trunk_v1.ts",
    "api/src/routes/chat_refactor/continuity_trunk_v1.ts",
    "api/src/routes/chat_refactor/support_selfdiag_trunk_v1.ts",
    "api/src/routes/chat_refactor/general_trunk_v1.ts",
    "api/src/routes/chat_refactor/infra_wrapper_trunk_v1.ts",
    "api/src/routes/chat.ts",
    "api/src/core/responseComposer.ts",
    "api/src/core/subconceptCanon.ts",
    "api/src/core/threadCore.ts",
    "api/src/core/threadCoreStore.ts",
    "api/src/planning/responsePlanCore.ts",
    "api/src/core/tenmonBrainstem.ts",
    "api/automation/workspace_observer_v1.py",
    "api/automation/execution_gate_v1.py",
    "api/automation/replay_audit_v1.py",
    "api/automation/cursor_applier_v1.py",
    "api/automation/campaign_executor_v1.py",
    "api/automation/full_autopilot_v1.py",
    "api/automation/queue_scheduler_v1.py",
    "api/automation/supervisor_v1.py",
    "api/automation/chatts_audit_suite_v1.py",
    "api/automation/chatts_trunk_domain_map_v1.py",
    "api/automation/chatts_exit_contract_lock_v1.py",
    "api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json",
    "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json",
    "api/automation/generated_cursor_apply/cursor_apply_manifest_v1.json",
]

# 必須プローブ（20本 + 余裕）
PROBE_SPECS: List[Dict[str, str]] = [
    {"id": "def_kotodama", "category": "define", "message": "言霊とは何ですか？"},
    {"id": "def_katakamuna", "category": "define", "message": "カタカムナとは何ですか？"},
    {"id": "def_secretary", "category": "define", "message": "言霊秘書とは何ですか？"},
    {"id": "def_soul", "category": "define", "message": "魂とは何ですか？"},
    {"id": "def_human", "category": "define", "message": "人間とは何ですか？"},
    {"id": "def_utahi", "category": "define", "message": "ウタヒとは？"},
    {"id": "wv_soul_exists", "category": "worldview", "message": "魂はあるのか？"},
    {"id": "wv_afterlife", "category": "worldview", "message": "死後の世界はあるのか？"},
    {"id": "wv_soul_vs_mind", "category": "worldview", "message": "魂と心の違いは？"},
    {"id": "wv_km_vs_kd", "category": "worldview", "message": "言霊とカタカムナの違いは？"},
    {"id": "judge_organize", "category": "judgement", "message": "この件をどう整理すればいい？"},
    {"id": "judge_fix_next", "category": "judgement", "message": "次に何を直せばいい？"},
    {"id": "judge_priority", "category": "judgement", "message": "何を優先すべき？"},
    {"id": "sup_tired", "category": "support", "message": "今日は少し疲れています"},
    {"id": "sup_continue", "category": "support", "message": "さっきの続きで整理して"},
    {"id": "sup_collapse", "category": "support", "message": "会話が崩れるのはなぜ？"},
    {"id": "sup_unconnected", "category": "support", "message": "いま何が未接続？"},
    {"id": "long_3000", "category": "longform", "message": "3000字で説明して"},
    {"id": "long_8000", "category": "longform", "message": "8000字で論じて"},
    {"id": "long_book_ch1", "category": "longform", "message": "本の第一章として書いて"},
    {"id": "extra_natural", "category": "extra", "message": "こんにちは。調子はどう？"},
    {"id": "extra_thanks", "category": "extra", "message": "ありがとう。今日の要点を3行で。"},
]


def _utc_ts() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _run(
    cmd: str,
    cwd: Path,
    log_fp,
    timeout: int = 900,
    env: Optional[Dict[str, str]] = None,
) -> Tuple[int, str]:
    log_fp.write(f"\n$ {cmd}\n(cwd={cwd})\n")
    log_fp.flush()
    e = os.environ.copy()
    if env:
        e.update(env)
    try:
        p = subprocess.run(
            cmd,
            shell=True,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=e,
        )
        out = (p.stdout or "") + ("\n" + p.stderr if p.stderr else "")
        log_fp.write(out)
        if len(out) > 120000:
            log_fp.write(f"\n... [truncated in log; full in capture files]\n")
        log_fp.flush()
        return p.returncode, out
    except subprocess.TimeoutExpired:
        log_fp.write("\n[TIMEOUT]\n")
        log_fp.flush()
        return 124, "timeout"


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _git_block(repo: Path, log_fp) -> Dict[str, Any]:
    code, br = _run("git rev-parse --abbrev-ref HEAD", repo, log_fp, timeout=30)
    code2, sha = _run("git rev-parse --short HEAD", repo, log_fp, timeout=30)
    code3, por = _run("git status --porcelain", repo, log_fp, timeout=60)
    lines = [ln for ln in por.splitlines() if ln.strip()]
    return {
        "branch": (br or "").strip() or None,
        "headShort": (sha or "").strip() or None,
        "porcelainLineCount": len(lines),
        "workingTreeDirty": len(lines) > 0,
        "porcelainSample": lines[:40],
    }


def _try_health(base: str, log_fp) -> Dict[str, Any]:
    out: Dict[str, Any] = {"base": base, "health": {}, "audit": {}}
    for path, key in (("/health", "health"), ("/api/audit", "audit")):
        url = base.rstrip("/") + path
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                code = resp.getcode()
                try:
                    parsed = json.loads(body)
                except json.JSONDecodeError:
                    parsed = None
                out[key] = {"httpStatus": code, "ok": code == 200, "json": parsed, "rawHead": body[:2000]}
        except Exception as e:
            out[key] = {"ok": False, "error": str(e)}
        log_fp.write(f"\n[HTTP] {url} -> {out[key]}\n")
        log_fp.flush()
    return out


def _probe_chat(base: str, message: str, thread_id: str, log_fp) -> Dict[str, Any]:
    url = base.rstrip("/") + "/api/chat"
    payload = json.dumps(
        {"message": message, "threadId": thread_id}, ensure_ascii=False
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    row: Dict[str, Any] = {
        "httpStatus": None,
        "ok": False,
        "error": None,
        "routeReason": None,
        "routeClass": None,
        "decisionMode": None,
        "responseHead": None,
        "responsePlanKeys": None,
        "threadCoreKeys": None,
        "synapseTopPresent": None,
        "responseLen": 0,
    }
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            code = resp.getcode()
            row["httpStatus"] = code
            if code != 200:
                row["error"] = f"http_{code}"
                row["rawHead"] = body[:800]
                return row
            try:
                obj = json.loads(body)
            except json.JSONDecodeError as e:
                row["error"] = f"json_parse:{e}"
                row["rawHead"] = body[:800]
                return row
            df = obj.get("decisionFrame") if isinstance(obj, dict) else None
            ku = (df or {}).get("ku") if isinstance(df, dict) else None
            if not isinstance(ku, dict):
                ku = {}
            resp_text = str(obj.get("response") or "")
            row["responseLen"] = len(resp_text)
            row["responseHead"] = resp_text[:240].replace("\n", "\\n")
            row["routeReason"] = ku.get("routeReason")
            row["routeClass"] = ku.get("routeClass")
            row["decisionMode"] = (df or {}).get("mode") if isinstance(df, dict) else None
            rp = ku.get("responsePlan")
            if isinstance(rp, dict):
                row["responsePlanKeys"] = sorted(str(k) for k in rp.keys())[:40]
            tc = ku.get("threadCore")
            if isinstance(tc, dict):
                row["threadCoreKeys"] = sorted(str(k) for k in tc.keys())[:40]
            st = ku.get("synapseTop")
            row["synapseTopPresent"] = st is not None
            row["ok"] = True
            row["_full"] = obj
    except urllib.error.HTTPError as e:
        row["httpStatus"] = e.code
        row["error"] = f"http_error:{e.code}"
        try:
            row["rawHead"] = e.read().decode("utf-8", errors="replace")[:800]
        except Exception:
            pass
    except Exception as e:
        row["error"] = str(e)
    return row


def _manifest_alignment(repo: Path) -> Dict[str, Any]:
    recipes_path = repo / "api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json"
    tasks_path = repo / "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json"
    apply_path = repo / "api/automation/generated_cursor_apply/cursor_apply_manifest_v1.json"
    rm = _load_json(recipes_path) or {}
    tm = _load_json(tasks_path) or {}
    am = _load_json(apply_path) or {}
    rb = {str(r.get("bundleId")) for r in (rm.get("recipes") or []) if isinstance(r, dict) and r.get("bundleId")}
    tb = {str(t.get("bundleId")) for t in (tm.get("tasks") or []) if isinstance(t, dict) and t.get("bundleId")}
    ab = {str(a.get("bundleId")) for a in (am.get("applies") or []) if isinstance(a, dict) and a.get("bundleId")}
    return {
        "recipeBundleIds": sorted(rb),
        "taskBundleIds": sorted(tb),
        "applyBundleIds": sorted(ab),
        "recipeCount": len(rb),
        "taskCount": len(tb),
        "applyCount": len(ab),
        "countsAligned": len(rb) == len(tb) == len(ab),
        # NOTE: | と - の優先順位により必ず括弧を付ける（tb | ab - rb は誤り）
        "missing_in_recipes": sorted((tb | ab) - rb),
        "missing_in_tasks": sorted((rb | ab) - tb),
        "missing_in_applies": sorted((rb | tb) - ab),
    }


def _db_counts(data_root: Path, log_fp) -> Dict[str, Any]:
    out: Dict[str, Any] = {"dataRoot": str(data_root), "databases": {}}
    if not data_root.is_dir():
        out["error"] = "data_root_missing"
        return out
    sqlite_files = list(data_root.glob("*.sqlite")) + list(data_root.glob("*.db"))
    priority = [p for p in sqlite_files if p.name == "kokuzo.sqlite"]
    rest = sorted(set(sqlite_files) - set(priority), key=lambda p: p.name)[:11]
    ordered = priority + rest
    preferred_tables = (
        "khs_laws",
        "khs_seed_clusters",
        "thread_center",
        "thread_centers",
        "book_continuation_memory",
        "scripture_learning_ledger",
        "kanagi_growth_ledger",
    )
    for dbp in ordered[:12]:
        key = dbp.name
        counts: Dict[str, Any] = {}
        code, q = _run(
            f'sqlite3 "{dbp}" ".tables"',
            data_root,
            log_fp,
            timeout=30,
        )
        if code != 0:
            counts["_tables_error"] = q[:500]
            out["databases"][key] = counts
            continue
        tables = [t for t in re.split(r"\s+", q.strip()) if t]
        for t in preferred_tables:
            if t not in tables:
                continue
            c3, n2 = _run(
                f'sqlite3 "{dbp}" "SELECT COUNT(*) FROM {t};"',
                data_root,
                log_fp,
                timeout=60,
            )
            if c3 == 0 and n2.strip().isdigit():
                counts[t] = int(n2.strip())
        for t in tables[:40]:
            if t in counts:
                continue
            c3, n2 = _run(
                f'sqlite3 "{dbp}" "SELECT COUNT(*) FROM {t};"',
                data_root,
                log_fp,
                timeout=60,
            )
            if c3 == 0 and n2.strip().isdigit():
                counts[t] = int(n2.strip())
        out["databases"][key] = counts
    return out


def _file_presence(repo: Path) -> Dict[str, Any]:
    rows = []
    for rel in COMPLETION_MODEL_PATHS:
        p = repo / rel
        rows.append({"path": rel, "exists": p.is_file(), "bytes": p.stat().st_size if p.is_file() else None})
    miss = [r["path"] for r in rows if not r["exists"]]
    return {"paths": rows, "missingCount": len(miss), "missing": miss, "allPresent": len(miss) == 0}


def _save_cmd_stdout(path: Path, text: str) -> None:
    try:
        obj = json.loads(text)
        _atomic_write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
    except json.JSONDecodeError:
        _atomic_write(path, json.dumps({"raw": text[:200000]}, ensure_ascii=False, indent=2) + "\n")


def build_summary(
    *,
    repo: Path,
    out_dir: Path,
    base_url: str,
    data_root: Path,
    skip_restart: bool,
    skip_probes: bool,
    skip_build: bool,
) -> Dict[str, Any]:
    log_path = out_dir / "run.log"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as log_fp:
        log_fp.write(f"[{CARD_NAME}] start {_utc_ts()}\nrepo={repo}\nout={out_dir}\n")

        git_info = _git_block(repo, log_fp)

        build_status = "SKIPPED"
        if not skip_build:
            code, _ = _run("npm run build", repo / "api", log_fp, timeout=900)
            build_status = "PASS" if code == 0 else "FAIL"

        restart_status = "SKIPPED"
        if not skip_restart:
            code, out = _run("systemctl restart tenmon-ark-api.service", Path("/"), log_fp, timeout=120)
            if code != 0 and ("Permission denied" in out or "Interactive authentication required" in out):
                restart_status = "SKIPPED_NO_PRIVILEGE"
            else:
                restart_status = "PASS" if code == 0 else "FAIL"
            _run("systemctl is-active tenmon-ark-api.service", Path("/"), log_fp, timeout=30)

        health_block = _try_health(base_url, log_fp)
        health_ok = bool((health_block.get("health") or {}).get("ok"))

        # Static tools → stdout files（明示 --repo-root / chat.ts は絶対パス。cwd=/root でも壊れない）
        rr = repo.resolve()
        chat_abs = (repo / "api/src/routes/chat.ts").resolve()

        def capture_py(
            script: str, out_name: str, extra: str = "", *, chatts: bool = False
        ) -> Tuple[int, str]:
            parts: List[str] = [
                "python3",
                f"api/automation/{script}",
                "--repo-root",
                str(rr),
            ]
            if chatts:
                parts += ["--chat-path", str(chat_abs)]
            if extra.strip():
                parts += shlex.split(extra)
            cmd = shlex.join(parts)
            code, text = _run(cmd, repo, log_fp, timeout=600)
            _save_cmd_stdout(out_dir / out_name, text)
            return code, text

        capture_py("chatts_audit_suite_v1.py", "chatts_audit_suite_stdout.json", "--stdout-json", chatts=True)
        capture_py("chatts_trunk_domain_map_v1.py", "chatts_trunk_domain_map_stdout.json", "--stdout-json", chatts=True)
        ec_code, ec_out = capture_py(
            "chatts_exit_contract_lock_v1.py",
            "chatts_exit_contract_lock_stdout.json",
            "--stdout-json --check-json",
            chatts=True,
        )

        capture_py("execution_gate_v1.py", "execution_gate_stdout.json", "--stdout-json")
        capture_py(
            "workspace_observer_v1.py",
            "workspace_observer_stdout.json",
            "--stdout-json --emit-report --skip-api-build",
        )
        capture_py(
            "replay_audit_v1.py",
            "replay_audit_stdout.json",
            shlex.join(
                [
                    "--repo-root",
                    str(rr),
                    "--card",
                    "CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL",
                    "--stdout-json",
                    "--emit-report",
                    "--check-json",
                ]
            ),
        )
        capture_py(
            "full_autopilot_v1.py",
            "full_autopilot_stdout.json",
            "--stdout-json --emit-report --skip-heavy",
        )

        ma = _manifest_alignment(repo)
        ma_file = dict(ma)
        ma_file["summaryForFinalStatus"] = {
            "missing_in_recipes": ma.get("missing_in_recipes") or [],
            "missing_in_tasks": ma.get("missing_in_tasks") or [],
            "missing_in_applies": ma.get("missing_in_applies") or [],
        }
        _atomic_write(out_dir / "manifest_alignment.json", json.dumps(ma_file, ensure_ascii=False, indent=2) + "\n")

        fp = _file_presence(repo)
        _atomic_write(out_dir / "completion_model_file_presence.json", json.dumps(fp, ensure_ascii=False, indent=2) + "\n")

        dbk = _db_counts(data_root, log_fp)
        _atomic_write(out_dir / "db_key_counts.json", json.dumps(dbk, ensure_ascii=False, indent=2) + "\n")

        # Probes
        probe_rows: List[Dict[str, Any]] = []
        probe_matrix_status = "SKIPPED"
        if not skip_probes:
            probe_matrix_status = "PASS"
            for spec in PROBE_SPECS:
                tid = f"p7_{spec['id']}"
                raw = _probe_chat(base_url, spec["message"], tid, log_fp)
                full = raw.pop("_full", None)
                entry = {
                    **spec,
                    "threadId": tid,
                    "httpStatus": raw.get("httpStatus"),
                    "ok": raw.get("ok"),
                    "error": raw.get("error"),
                    "routeReason": raw.get("routeReason"),
                    "routeClass": raw.get("routeClass"),
                    "decisionMode": raw.get("decisionMode"),
                    "responseHead": raw.get("responseHead"),
                    "responseLen": raw.get("responseLen"),
                    "responsePlanKeys": raw.get("responsePlanKeys"),
                    "threadCoreKeys": raw.get("threadCoreKeys"),
                    "synapseTopPresent": raw.get("synapseTopPresent"),
                }
                probe_rows.append(entry)
                if not raw.get("ok"):
                    probe_matrix_status = "FAIL"
                log_fp.write(f"\n[PROBE] {spec['id']} ok={raw.get('ok')} rr={raw.get('routeReason')}\n")
                log_fp.flush()

        _atomic_write(
            out_dir / "conversation_probe_matrix.json",
            json.dumps(
                {"version": 1, "generatedAt": _utc_ts(), "baseUrl": base_url, "probes": probe_rows},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
        )

        jq_lines = [
            "# conversation_probe_matrix.json 用 jq サンプル",
            'jq ".probes[] | {id, category, routeReason, routeClass, responseLen}" conversation_probe_matrix.json',
            'jq "[.probes[].routeReason] | unique" conversation_probe_matrix.json',
        ]
        (out_dir / "conversation_probe_jq.txt").write_text("\n".join(jq_lines) + "\n", encoding="utf-8")

        # MD table for probes
        md_lines = [
            f"# Conversation probe matrix ({len(probe_rows)} probes)",
            "",
            "| id | category | http | ok | routeReason | routeClass | mode | len | head |",
            "|---|---|--:|:--|---|---|---|---|---|",
        ]
        for e in probe_rows:
            h = str(e.get("responseHead") or "").replace("|", "\\|")[:80]
            md_lines.append(
                f"| {e.get('id')} | {e.get('category')} | {e.get('httpStatus')} | {e.get('ok')} | "
                f"`{e.get('routeReason')}` | `{e.get('routeClass')}` | `{e.get('decisionMode')}` | "
                f"{e.get('responseLen')} | {h} |"
            )
        (out_dir / "conversation_probe_matrix.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")

        # Load replay for acceptance
        replay_path = repo / "api/automation/reports/replay_audit_v1.json"
        replay_data = _load_json(replay_path) or {}
        ral = replay_data.get("replayAuditRuntimeLock") or {}
        replay_ok = bool((replay_data.get("acceptance") or {}).get("ok"))
        replay_lock_ok = bool(ral.get("acceptanceOk"))
        manifest_ok = (
            len(ma.get("missing_in_recipes") or []) == 0
            and len(ma.get("missing_in_tasks") or []) == 0
            and len(ma.get("missing_in_applies") or []) == 0
            and ma.get("countsAligned")
        )

        gate_data = _load_json(out_dir / "execution_gate_stdout.json") or {}
        gate_ok = gate_data.get("decision") == "executable"

        seal_readiness = "FAIL"
        probes_required_ok = probe_matrix_status == "PASS" and not skip_probes
        if (
            build_status == "PASS"
            and health_ok
            and probes_required_ok
            and replay_lock_ok
            and manifest_ok
            and gate_ok
            and ec_code == 0
            and fp.get("allPresent")
        ):
            seal_readiness = "PASS"

        probe_rr = []
        for e in probe_rows:
            probe_rr.append(
                {
                    "id": e.get("id"),
                    "routeReason": e.get("routeReason"),
                    "routeClass": e.get("routeClass"),
                    "category": e.get("category"),
                }
            )

        summary: Dict[str, Any] = {
            "version": VERSION,
            "cardName": CARD_NAME,
            "generatedAt": _utc_ts(),
            "repoRoot": str(repo),
            "git": git_info,
            "conversation_os": {
                "status": "PASS" if probe_matrix_status == "PASS" and ec_code == 0 else "REVIEW",
                "notes": [
                    f"chat.ts exit_contract check exit={ec_code}",
                    f"probes_ok={probe_matrix_status} count={len(probe_rows)}",
                    "soul/worldview/compare/support/longform はプローブ一覧参照",
                ],
            },
            "automation_os": {
                "status": "PASS" if gate_ok and manifest_ok else "REVIEW",
                "notes": [
                    f"execution_gate decision={gate_data.get('decision')}",
                    f"manifest_counts_aligned={ma.get('countsAligned')}",
                    "cursor_applier / campaign_executor はファイル存在・gate 連携で確認",
                ],
            },
            "canon_thought_os": {
                "status": "PASS" if fp.get("allPresent") else "FAIL",
                "notes": [
                    "subconceptCanon / responseComposer / responsePlanCore / threadCore は completion model に含む",
                    "chatts_audit_suite / trunk_domain_map / exit_contract の stdout を参照",
                ],
            },
            "learning_growth_os": {
                "status": "PASS" if dbk.get("databases") else "REVIEW",
                "notes": [
                    "db_key_counts.json に sqlite テーブル件数",
                    "ledger / thread_center / book はスキーマ差異により表が無い DB もあり得る",
                ],
            },
            "full_autonomous_ui_execution": {
                "status": "REVIEW",
                "notes": [
                    "full_autopilot_v1 stdout / reports を参照（--skip-heavy 時は workspace ライブ省略）",
                    "UI E2E は本スクリプト範囲外",
                ],
            },
            "site_concierge_voice": {
                "status": "REVIEW",
                "notes": [
                    "chat.ts に voiceGuard 経路あり（静的）",
                    "site / client / voice 実配線は別途デプロイ確認",
                ],
            },
            "manifest_alignment": {
                "missing_in_recipes": list(ma.get("missing_in_recipes") or []),
                "missing_in_tasks": list(ma.get("missing_in_tasks") or []),
                "missing_in_applies": list(ma.get("missing_in_applies") or []),
            },
            "probe_route_reasons": probe_rr,
            "acceptance": {
                "build": build_status,
                "restart": restart_status,
                "health": "PASS" if health_ok else "FAIL",
                "probe_matrix": probe_matrix_status,
                "replay": "PASS" if replay_ok else "FAIL",
                "replay_runtime_lock": "PASS" if replay_lock_ok else "FAIL",
                "manifest": "PASS" if manifest_ok else "FAIL",
                "exit_contract_lock": "PASS" if ec_code == 0 else "FAIL",
                "completion_file_presence": "PASS" if fp.get("allPresent") else "FAIL",
                "seal_readiness": seal_readiness,
                "note": "acceptance PASS 以外 seal 禁止。--skip-probes 時は probe_matrix!=PASS のため seal_readiness は FAIL。",
            },
            "overall_judgement": "",
            "seal_allowed": False,
        }

        all_pass = (
            build_status == "PASS"
            and health_ok
            and (probe_matrix_status == "PASS" and not skip_probes)
            and replay_ok
            and replay_lock_ok
            and manifest_ok
            and gate_ok
            and ec_code == 0
            and fp.get("allPresent")
            and restart_status in ("PASS", "SKIPPED", "SKIPPED_NO_PRIVILEGE")
        )
        summary["seal_allowed"] = bool(all_pass)
        summary["overall_judgement"] = "PASS" if all_pass else "FAIL_OR_PARTIAL"

        _atomic_write(out_dir / "final_status_summary.json", json.dumps(summary, ensure_ascii=False, indent=2) + "\n")

        # final_status_summary.md
        md = [
            f"# {CARD_NAME}",
            "",
            f"- **generatedAt**: `{summary['generatedAt']}`",
            f"- **overall_judgement**: **{summary['overall_judgement']}**",
            f"- **seal_allowed**: `{summary['seal_allowed']}`",
            "",
            "## Acceptance",
            "",
            "```json",
            json.dumps(summary["acceptance"], ensure_ascii=False, indent=2),
            "```",
            "",
            "## Git",
            "",
            "```json",
            json.dumps(summary["git"], ensure_ascii=False, indent=2),
            "```",
            "",
            "## OS summaries",
            "",
            "```json",
            json.dumps(
                {k: summary[k] for k in summary if k.endswith("_os") or k in ("full_autonomous_ui_execution", "site_concierge_voice")},
                ensure_ascii=False,
                indent=2,
            ),
            "```",
            "",
            "## Manifest alignment",
            "",
            "```json",
            json.dumps(summary["manifest_alignment"], ensure_ascii=False, indent=2),
            "```",
        ]
        (out_dir / "final_status_summary.md").write_text("\n".join(md) + "\n", encoding="utf-8")

        log_fp.write(f"\n[DONE] {_utc_ts()} judgement={summary['overall_judgement']}\n")
    return summary


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--out-dir", type=Path, default=None, help="Report directory (default: under reports/)")
    ap.add_argument("--base-url", default=os.environ.get("TENMON_API_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--data-root", type=Path, default=Path("/opt/tenmon-ark-data"))
    ap.add_argument("--skip-restart", action="store_true")
    ap.add_argument("--skip-probes", action="store_true")
    ap.add_argument("--skip-build", action="store_true")
    ap.add_argument(
        "--exit-zero",
        action="store_true",
        help="レポート生成後は常に終了コード 0（CI で成果物のみ欲しい場合）",
    )
    args = ap.parse_args()

    repo = (args.repo_root or _repo_root_from_here()).resolve()
    if args.out_dir:
        out_dir = args.out_dir.resolve()
    else:
        stamp = _utc_ts().replace(":", "").replace("-", "")
        out_dir = repo / "api" / "automation" / "reports" / "TENMON_POST_7PACK_TOTAL_REVEAL_V1" / stamp

    summary = build_summary(
        repo=repo,
        out_dir=out_dir,
        base_url=str(args.base_url),
        data_root=args.data_root.resolve(),
        skip_restart=bool(args.skip_restart),
        skip_probes=bool(args.skip_probes),
        skip_build=bool(args.skip_build),
    )
    print(json.dumps({"ok": True, "outDir": str(out_dir), "overall_judgement": summary.get("overall_judgement")}, indent=2))
    if args.exit_zero:
        return 0
    return 0 if summary.get("overall_judgement") == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
