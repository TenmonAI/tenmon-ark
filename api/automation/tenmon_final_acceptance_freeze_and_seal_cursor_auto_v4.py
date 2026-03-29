#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_CURSOR_AUTO_V4

surface / uncertainty / billing / real chat UX / hygiene を総合し、freeze 可能状態のみ seal_ready とする。
追加 API 実装なし。未解決は result / report に明示する。

環境変数:
  TENMON_FREEZE_SKIP_REAL_CHAT=1  — real chat subprocess をスキップ（ローカル欠損時のみ）
  TENMON_FREEZE_SKIP_HYGIENE=1   — hygiene subprocess をスキップ
  TENMON_REPO_ROOT, TENMON_AUDIT_BASE_URL
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_CURSOR_AUTO_V4"
OUT_JSON = "tenmon_final_acceptance_freeze_and_seal_result_v4.json"
OUT_MD = "tenmon_final_acceptance_freeze_and_seal_report_v4.md"

REAL_CHAT_SCRIPT = "tenmon_real_chat_ux_acceptance_cursor_auto_v2.py"
HYGIENE_SCRIPT = "tenmon_artifact_worktree_hygiene_and_relock_cursor_auto_v2.py"
REAL_CHAT_RESULT = "tenmon_real_chat_ux_acceptance_result_v2.json"
HYGIENE_RESULT = "tenmon_artifact_worktree_hygiene_and_relock_result_v2.json"

NEXT_ON_PASS_NOTE = "freeze / seal 実行・次 room へ継承（本スクリプトは記録のみ）"
NEXT_ON_FAIL_NOTE = (
    "fail を surface / uncertainty / billing / UX / hygiene のいずれか1系に帰し、最小差分で該当プローブのみ再実行"
)

# finalize.ts TENMON_SURFACE_LEAK_FINALIZE_V6_ANCHOR_PATTERNS 相当 + 行頭 verdict:（9 本）
FINALIZE_V6_AUDIT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("v6_root_reasoning", re.compile(r"^root_reasoning:", re.M)),
    ("v6_truth_structure", re.compile(r"^truth_structure:", re.M)),
    ("v6_verdict_eq", re.compile(r"^verdict=", re.M)),
    ("v6_center_fixed", re.compile(r"^center:\s*いまの中心一句を固定", re.M)),
    ("v6_rikutai_center", re.compile(r"^立脚の中心は「", re.M)),
    ("v6_jiku_rensetsu", re.compile(r"^次軸:\s*次観測:", re.M)),
    ("v6_chushin_meidai_pri", re.compile(r"^中心命題:\s*\(pri:", re.M)),
    ("v6_kono_ten_deha", re.compile(r"^この点では、", re.M)),
    ("v6_verdict_colon", re.compile(r"^verdict:", re.M)),
]

# 表層に出てはならない内部断片（real chat probe 同型）
SURFACE_LEAK_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("root_reasoning_colon", re.compile(r"root_reasoning\s*[:：]", re.I)),
    ("truth_structure_colon", re.compile(r"truth_structure\s*[:：]", re.I)),
    ("center_meta_colon", re.compile(r"(?:^|\n)\s*center\s*[:：]", re.I | re.M)),
    ("verdict_colon", re.compile(r"(?:^|\n)\s*verdict\s*[:：]", re.I | re.M)),
    ("次軸_meta", re.compile(r"次軸\s*[:：]", re.U)),
    ("次観測_meta", re.compile(r"次観測\s*[:：]", re.U)),
    ("中心命題_meta", re.compile(r"中心命題\s*[:：]", re.U)),
    ("thoughtCoreSummary_token", re.compile(r"\bthoughtCoreSummary\b", re.I)),
    ("threadCore_token", re.compile(r"\bthreadCore\b", re.I)),
    ("routeReason_token", re.compile(r"\brouteReason\b", re.I)),
    ("truthLayerArbitrationV1_token", re.compile(r"\btruthLayerArbitrationV1\b")),
    ("truthLayerArbitrationKernelV1_token", re.compile(r"\btruthLayerArbitrationKernelV1\b")),
]

UNCERTAINTY_SURFACE_RE = re.compile(
    r"根拠が限られ|現時点の根拠|可能性として述べ|いまの読みの範囲で述べ|未確定|断定は避け|史実としての断定は避け|"
    r"史料上断定|一義に確定しづらい|慎重に|推測に留め|確定しづらい",
    re.U,
)

FOUNDER_SURFACE_RE = re.compile(
    r"【受理】|【現状】|【更新・反映内容】|【次確認】|【承認確認】|構築・運用|反映・更新のたたき台|"
    r"受け取りました|更新候補|ドラフトとして|確定してよい|構築者向け|Founder向け",
    re.U,
)

# FINALIZE LEAK AUDIT 9 本（各応答が V6+表層 leak ゼロ = 1 点）
FINALIZE_AUDIT_PROBES: list[tuple[str, str, str]] = [
    ("fa_1_define_kotodama", "言霊とは何か", "define"),
    ("fa_2_define_hokekyo", "法華経とは何か", "define"),
    ("fa_3_define_sokushin", "即身成仏とは何か", "define"),
    ("fa_4_define_suika", "水火とは何か", "define"),
    ("fa_5_uncertainty", "稗田阿礼の実在と年代は、現存史料だけで一義に確定できますか", "uncertainty"),
    ("fa_6_support_billing", "課金表示がおかしい。請求とプランの状態を確認したい", "support"),
    ("fa_7_support_pwa", "PWA をホーム画面に追加できません。手順を教えてください", "support"),
    (
        "fa_8_founder",
        "Founder向け：現状報告と更新指示を一文ずつまとめて",
        "founder",
    ),
    ("fa_9_general", "今日は少し疲れています", "general"),
]


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _git_head_sha(repo: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=30,
        )
        return (r.stdout or "").strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=600,
        )
        return r.returncode == 0, ((r.stdout or "") + (r.stderr or ""))[-2000:]
    except Exception as e:
        return False, str(e)


def _get_audit(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8.0) as r:
            body = r.read().decode("utf-8", errors="replace")
        j = json.loads(body)
        return {"ok": bool(j.get("ok")), "http": r.getcode()}
    except Exception as e:
        return {"ok": False, "skipped": True, "error": str(e)}


def _billing_link_not_404(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/billing/link"
    body = json.dumps({"sessionId": "freeze_seal_v4"}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8.0) as r:
            return {"reachable": True, "http": r.getcode(), "not_404": True}
    except urllib.error.HTTPError as e:
        return {"reachable": True, "http": e.code, "not_404": e.code != 404}
    except Exception as e:
        return {"reachable": False, "http": None, "not_404": False, "error": str(e)}


def _post_chat(chat_url: str, message: str, thread_id: str, timeout: float = 90.0) -> tuple[int | None, str | None, str | None]:
    b = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=b,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.getcode(), None, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = str(e)
        return e.code, str(e), raw
    except Exception as e:
        return None, str(e), None


def _discover_chat_url(base: str) -> str | None:
    b = base.rstrip("/")
    for path in ("/api/chat", "/chat"):
        url = b + path
        code, _e, _ = _post_chat(url, "freeze_ping", "freeze-v4-discover", timeout=15.0)
        if code == 200:
            return url
    return None


def _parse_response(raw: str) -> tuple[str | None, dict[str, Any] | None]:
    try:
        j = json.loads(raw)
    except Exception:
        return None, None
    if not isinstance(j, dict):
        return None, None
    resp = j.get("response")
    if isinstance(resp, str):
        return resp, j
    return None, j


def _scan_v6(text: str) -> list[str]:
    return [name for name, pat in FINALIZE_V6_AUDIT_PATTERNS if pat.search(text)]


def _scan_surface_leaks(text: str) -> list[str]:
    return [name for name, pat in SURFACE_LEAK_PATTERNS if pat.search(text)]


def _support_bone_ok(text: str, route_reason: str) -> bool:
    if re.search(r"SUPPORT_", route_reason):
        return True
    return bool(re.search(r"サポート|請求|プラン|PWA|手順|ホーム画面|課金", text, re.U))


def _extract_route_reason(j: dict[str, Any] | None) -> str:
    if not j:
        return ""
    df = j.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict):
            rr = ku.get("routeReason")
            if isinstance(rr, str) and rr.strip():
                return rr.strip()
    return ""


def _run_subprocess_script(repo: Path, auto: Path, script_name: str, env: dict[str, str]) -> tuple[int, str]:
    script = auto / script_name
    if not script.is_file():
        return 99, f"missing_script:{script_name}"
    merged = {**os.environ, **env}
    try:
        r = subprocess.run(
            [sys.executable, str(script)],
            cwd=str(repo),
            env=merged,
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = ((r.stdout or "") + "\n" + (r.stderr or ""))[-4000:]
        return r.returncode, tail
    except Exception as e:
        return 98, str(e)


def _load_json(path: Path) -> dict[str, Any]:
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _classify_fail(reason: str) -> str:
    s = reason.lower()
    if "billing" in s or "404" in reason:
        return "billing"
    if "hygiene" in s or "archive_aligned" in s or "pycache" in s:
        return "hygiene"
    if "uncertainty" in s:
        return "uncertainty"
    if "real_chat" in s or "ux" in s or "continuity" in s or "kokuzo" in s:
        return "UX"
    if "finalize" in s or "leak" in s or "surface" in s or "v6_" in s:
        return "surface"
    return "surface"


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api_dir = repo / "api"
    auto = api_dir / "automation"
    base = os.environ.get("TENMON_AUDIT_BASE_URL", "http://127.0.0.1:3000").strip()

    skip_chat = os.environ.get("TENMON_FREEZE_SKIP_REAL_CHAT", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    skip_hygiene = os.environ.get("TENMON_FREEZE_SKIP_HYGIENE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    head_sha = _git_head_sha(repo)
    build_ok, build_tail = _npm_check(api_dir)
    audit = _get_audit(base)
    billing = _billing_link_not_404(base)
    chat_url = _discover_chat_url(base)

    pass_probes: list[str] = []
    failure_reasons: list[str] = []
    fail_buckets: dict[str, list[str]] = {
        "surface": [],
        "uncertainty": [],
        "billing": [],
        "UX": [],
        "hygiene": [],
    }

    unresolved: list[str] = []

    if build_ok:
        pass_probes.append("npm_run_check")
    else:
        failure_reasons.append("npm_run_check_failed")
        unresolved.append("TypeScript/npm check が失敗。ビルドエラーを解消してから再実行。")

    if audit.get("skipped"):
        pass_probes.append("api_audit_skipped_unreachable")
        unresolved.append("GET /api/audit に未到達（サーバ未起動）。VPS では起動後に再実行。")
    elif audit.get("ok"):
        pass_probes.append("api_audit_ok")
    else:
        failure_reasons.append("api_audit_not_ok")
        unresolved.append("GET /api/audit が ok=false。readiness を確認。")

    if billing.get("not_404"):
        pass_probes.append("billing_link_not_404")
    else:
        failure_reasons.append(f"billing_link_probe:{billing}")
        fail_buckets["billing"].append("billing_link_not_404")
        unresolved.append("POST /api/billing/link が 404。ルート復旧が必要。")

    finalize_rows: list[dict[str, Any]] = []
    finalize_clean = 0
    uncertainty_ok = False

    if not chat_url:
        failure_reasons.append("chat_url_unavailable")
        fail_buckets["UX"].append("chat_url_unavailable")
        unresolved.append("実チャット URL が取得できない。")
    else:
        pass_probes.append("chat_url_discovered")
        ts = int(time.time())
        for pid, msg, cat in FINALIZE_AUDIT_PROBES:
            tid = f"freeze-v4-{pid}-{ts}"
            code, err, raw = _post_chat(chat_url, msg, tid)
            text = ""
            rr = ""
            v6_hits: list[str] = []
            leak_hits: list[str] = []
            if code == 200 and raw:
                t, j = _parse_response(raw)
                rr = _extract_route_reason(j)
                if t is not None:
                    text = t
                    v6_hits = _scan_v6(t)
                    leak_hits = _scan_surface_leaks(t)
            ok_row = (
                code == 200
                and len(text) >= 20
                and len(v6_hits) == 0
                and len(leak_hits) == 0
            )
            if cat == "uncertainty" and code == 200 and text:
                uncertainty_ok = bool(UNCERTAINTY_SURFACE_RE.search(text)) and len(leak_hits) == 0
            if cat == "support" and code == 200 and text:
                ok_row = ok_row and _support_bone_ok(text, rr)
            if cat == "founder" and code == 200 and text:
                ok_row = ok_row and (bool(FOUNDER_SURFACE_RE.search(text)) or bool(re.search(r"FOUNDER|founder", rr, re.I)))
            if ok_row:
                finalize_clean += 1
                pass_probes.append(f"finalize_audit:{pid}")
            else:
                failure_reasons.append(
                    f"finalize_audit_fail:{pid}:http={code}:v6={v6_hits}:leaks={leak_hits}",
                )
                fail_buckets["surface"].append(pid)
                unresolved.append(
                    f"FINALIZE LEAK AUDIT 失敗: {pid}（v6={v6_hits or '—'} leaks={leak_hits or '—'}）",
                )
            finalize_rows.append(
                {
                    "id": pid,
                    "category": cat,
                    "http_status": code,
                    "error": err,
                    "routeReason": rr,
                    "v6_hits": v6_hits,
                    "surface_leak_hits": leak_hits,
                    "response_length": len(text),
                    "pass": ok_row,
                },
            )
            time.sleep(0.1)

    if uncertainty_ok:
        pass_probes.append("uncertainty_surface_probe")
    else:
        if chat_url:
            failure_reasons.append("uncertainty_probe_not_satisfied")
            fail_buckets["uncertainty"].append("uncertainty_surface")
            unresolved.append("uncertainty 系メッセージに自然な保留・限界の表層が見えない。")

    real_chat_ok = False
    real_chat_tail = ""
    if skip_chat:
        pass_probes.append("real_chat_subprocess_SKIPPED")
        unresolved.append("TENMON_FREEZE_SKIP_REAL_CHAT=1 — 本番 freeze ではスキップ禁止。")
        failure_reasons.append("real_chat_skipped_not_allowed_for_seal")
    else:
        rc, real_chat_tail = _run_subprocess_script(
            repo,
            auto,
            REAL_CHAT_SCRIPT,
            {"TENMON_REPO_ROOT": str(repo), "TENMON_AUDIT_BASE_URL": base},
        )
        real_chat_ok = rc == 0
        rc_json = _load_json(auto / REAL_CHAT_RESULT)
        if real_chat_ok:
            pass_probes.append("real_chat_ux_acceptance_v2_exit_0")
            if rc_json.get("acceptance_pass") is True:
                pass_probes.append("real_chat_ux_result_json_acceptance_pass")
            else:
                failure_reasons.append("real_chat_result_json_acceptance_not_true")
                fail_buckets["UX"].append("real_chat_json")
                unresolved.append("real_chat UX result JSON で acceptance_pass が true でない。")
        else:
            failure_reasons.append(f"real_chat_subprocess_exit_{rc}")
            fail_buckets["UX"].append("real_chat_subprocess")
            for x in rc_json.get("failure_reasons") or []:
                unresolved.append(f"real_chat: {x}")

    hygiene_ok = False
    hygiene_tail = ""
    if skip_hygiene:
        pass_probes.append("hygiene_subprocess_SKIPPED")
        unresolved.append("TENMON_FREEZE_SKIP_HYGIENE=1 — 本番 freeze ではスキップ禁止。")
        failure_reasons.append("hygiene_skipped_not_allowed_for_seal")
    else:
        hrc, hygiene_tail = _run_subprocess_script(
            repo,
            auto,
            HYGIENE_SCRIPT,
            {"TENMON_REPO_ROOT": str(repo), "TENMON_AUDIT_BASE_URL": base},
        )
        hygiene_ok = hrc == 0
        hj = _load_json(auto / HYGIENE_RESULT)
        if hygiene_ok:
            pass_probes.append("hygiene_v2_exit_0")
            if hj.get("acceptance_pass") is True:
                pass_probes.append("hygiene_result_json_acceptance_pass")
            else:
                failure_reasons.append("hygiene_result_json_acceptance_not_true")
                fail_buckets["hygiene"].append("hygiene_json")
                unresolved.append("hygiene result JSON で acceptance_pass が true でない。")
        else:
            failure_reasons.append(f"hygiene_subprocess_exit_{hrc}")
            fail_buckets["hygiene"].append("hygiene_subprocess")
            for x in hj.get("failure_reasons") or []:
                unresolved.append(f"hygiene: {x}")

    finalize_ratio = f"{finalize_clean}/9"
    finalize_leak_audit_pass = finalize_clean == 9

    env_unresolved = os.environ.get("TENMON_FREEZE_UNRESOLVED_JSON", "").strip()
    if env_unresolved:
        try:
            extra = json.loads(env_unresolved)
            if isinstance(extra, list):
                unresolved.extend(str(x) for x in extra)
            elif isinstance(extra, str):
                unresolved.append(extra)
        except Exception:
            unresolved.append(f"TENMON_FREEZE_UNRESOLVED_JSON parse error: {env_unresolved[:200]}")

    freeze_ready = (
        build_ok
        and audit.get("ok")
        and billing.get("not_404")
        and finalize_leak_audit_pass
        and uncertainty_ok
        and real_chat_ok
        and hygiene_ok
        and len(failure_reasons) == 0
    )

    if freeze_ready and not unresolved:
        pass_probes.append("unresolved_list_empty")

    result: dict[str, Any] = {
        "schema": "TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_V4",
        "card": CARD,
        "generated_at": _utc_iso(),
        "headSha": head_sha,
        "base_url": base,
        "chat_url": chat_url,
        "freeze_ready": freeze_ready,
        "seal_ready": freeze_ready,
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail[-1200:],
        "api_audit": audit,
        "billing_link_probe": billing,
        "finalize_leak_audit": {
            "label": "FINALIZE LEAK AUDIT（9 プローブ・各応答で V6 アンカー + 表層 leak ゼロ）",
            "ratio": finalize_ratio,
            "pass": finalize_leak_audit_pass,
            "probes": finalize_rows,
        },
        "uncertainty_probes_ok": uncertainty_ok,
        "real_chat_ux": {
            "subprocess_exit_0": real_chat_ok,
            "skipped": skip_chat,
            "tail": real_chat_tail[-2000:] if real_chat_tail else "",
        },
        "worktree_hygiene": {
            "subprocess_exit_0": hygiene_ok,
            "skipped": skip_hygiene,
            "tail": hygiene_tail[-2000:] if hygiene_tail else "",
        },
        "pass_probe_list": pass_probes,
        "failure_reasons": failure_reasons if not freeze_ready else [],
        "unresolved": unresolved if unresolved else [],
        "fail_buckets_hint": fail_buckets,
        "nextOnPass": NEXT_ON_PASS_NOTE,
        "nextOnFail": NEXT_ON_FAIL_NOTE,
        "next_phase_candidates": [
            "本番タグ付けと read-only 運用",
            "次 room への headSha + result json 引き渡し",
            "seal manifest の別カードで署名・保管",
        ],
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        "# TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_REPORT_V4",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **headSha**: `{head_sha}`",
        f"- **freeze_ready / seal_ready**: `{freeze_ready}`",
        f"- **FINALIZE LEAK AUDIT**: `{finalize_ratio}` (pass={finalize_leak_audit_pass})",
        f"- **uncertainty_probes_ok**: `{uncertainty_ok}`",
        f"- **billing /api/billing/link not_404**: `{billing.get('not_404')}`",
        f"- **npm run check**: {'PASS' if build_ok else 'FAIL'}",
        f"- **GET /api/audit ok**: `{audit.get('ok')}`",
        f"- **real chat UX v2 subprocess**: exit_0={real_chat_ok} skipped={skip_chat}",
        f"- **worktree hygiene v2 subprocess**: exit_0={hygiene_ok} skipped={skip_hygiene}",
        "",
        "## PASS プローブ一覧",
        "",
        "\n".join(f"- `{p}`" for p in pass_probes) if pass_probes else "- （なし）",
        "",
        "## 未解決（隠蔽なし）",
        "",
        "\n".join(f"- {u}" for u in unresolved) if unresolved else "- （なし）",
        "",
        "## 不合格理由（freeze 時）",
        "",
        "\n".join(f"- `{x}`" for x in failure_reasons) if failure_reasons else "- （なし）",
        "",
        "## finalize 9 プローブ詳細",
        "",
    ]
    for row in finalize_rows:
        md.append(
            f"- `{row['id']}`: pass={row['pass']} len={row['response_length']} "
            f"v6={row['v6_hits']} leaks={row['surface_leak_hits']} "
            f"rr=`{str(row.get('routeReason') or '')[:48]}`",
        )
    md.extend(
        [
            "",
            "## next",
            "",
            f"- **nextOnPass**: {NEXT_ON_PASS_NOTE}",
            f"- **nextOnFail**: {NEXT_ON_FAIL_NOTE}",
            "",
            "### fail バケット（再実行の帰属先）",
            "",
            f"```json\n{json.dumps(fail_buckets, ensure_ascii=False, indent=2)}\n```",
            "",
        ],
    )
    (auto / OUT_MD).write_text("\n".join(md), encoding="utf-8")

    print(
        json.dumps(
            {
                "freeze_ready": freeze_ready,
                "headSha": head_sha,
                "finalize_leak_audit": finalize_ratio,
                "failure_reasons": failure_reasons,
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return 0 if freeze_ready else 2


if __name__ == "__main__":
    raise SystemExit(main())
