#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1

4 サブステップを固定順で検証（途中入力なし）。FAIL で停止。
- 1: watch loop real/dry 証跡
- 2: K1 probes
- 3: SUBCONCEPT probes
- 4: GENERAL probes

各サブステップ後: npm run build（api）, 任意 systemctl restart, health / audit.build,（最後に chat probes）
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
from pathlib import Path
from typing import Any

CARD = "TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_dialogue_no_midrun_vps_autobundle_summary.json"
OUT_MD = "tenmon_dialogue_no_midrun_vps_autobundle_report.md"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_cmd(cmd: list[str], cwd: Path, timeout: int) -> dict[str, Any]:
    try:
        cp = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
        m = (cp.stdout or "") + (cp.stderr or "")
        return {"ok": cp.returncode == 0, "exit_code": cp.returncode, "tail": m[-8000:]}
    except Exception as e:
        return {"ok": False, "exit_code": None, "tail": str(e)[:500]}


def http_json(url: str, timeout: float = 20.0) -> tuple[bool, Any]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
        return True, json.loads(raw)
    except Exception:
        return False, None


def post_chat(base: str, message: str, thread_id: str, timeout: float = 120.0) -> dict[str, Any]:
    url = f"{base.rstrip('/')}/api/chat"
    pl = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=pl, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
        return {"ok": True, "data": json.loads(body)}
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return {"ok": False, "http_code": e.code, "body_tail": body[-2000:]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}


def substep_watch(repo: Path, api: Path) -> dict[str, Any]:
    sh = api / "scripts" / "tenmon_cursor_watch_loop.sh"
    text = sh.read_text(encoding="utf-8", errors="replace") if sh.is_file() else ""
    hard = any(line.strip() == "export CURSOR_EXECUTOR_DRY_RUN=1" for line in text.splitlines())
    has_want = "want_real" in text
    has_dry_flag = "dry_run_flag" in text and "CURSOR_EXECUTOR_DRY_RUN" in text
    has_executor_real = "executor_real_run" in text
    bn = run_cmd(["bash", "-n", str(sh)], api, 60)
    return {
        "name": "substep_1_watch_loop",
        "ok": bn.get("ok") and not hard and has_want and has_dry_flag and has_executor_real,
        "bash_n": bn,
        "hardcoded_dry_run_literal": hard,
        "grep_signals": {"want_real": has_want, "dry_run_flag_export": has_dry_flag, "executor_real_run_log": has_executor_real},
    }


def post_build_health(api: Path, base: str, skip_systemd: bool) -> dict[str, Any]:
    b = run_cmd(["npm", "run", "build"], api, 600 * 1000 // 1000)
    out: dict[str, Any] = {"npm_build": b}
    if not b.get("ok"):
        out["ok"] = False
        return out
    if not skip_systemd:
        sr = run_cmd(["sudo", "-n", "systemctl", "restart", "tenmon-ark-api.service"], Path("/"), 120)
        out["systemctl_restart"] = sr
        if not sr.get("ok"):
            out["ok"] = False
            return out
    hok, h = http_json(f"{base.rstrip('/')}/api/health")
    aok, a = http_json(f"{base.rstrip('/')}/api/audit.build")
    out["health_ok"] = hok
    out["audit_build_ok"] = aok
    out["ok"] = bool(hok and aok)
    return out


def check_k1_response(data: dict[str, Any], message: str, strict_k1: bool) -> tuple[bool, str]:
    df = data.get("decisionFrame") if isinstance(data.get("decisionFrame"), dict) else {}
    ku = df.get("ku") if isinstance(df.get("ku"), dict) else {}
    rr = str(ku.get("routeReason") or "")
    resp = str(data.get("response") or "")
    core = re.sub(r"^【天聞の所見】\s*", "", resp).replace(" ", "")
    if len(core) < 140:
        return False, f"short_body_len={len(core)}"
    if has_dup_sentence(resp):
        return False, "sentence_dup"
    banned = ("考えてみては", "いかがでしょうか", "どう思いますか", "あなたはどう", "君はどう")
    if any(x in resp for x in banned):
        return False, "generic_closing_hit"
    if strict_k1:
        if rr != "K1_TRACE_EMPTY_GATED_V1":
            return False, f"routeReason={rr}"
    else:
        canonish = (
            rr == "K1_TRACE_EMPTY_GATED_V1"
            or rr == "TENMON_SCRIPTURE_CANON_V1"
            or rr == "TRUTH_GATE_RETURN_V2"
        )
        factual_person = "楢崎" in message and ("FACTUAL" in rr or "PERSON" in rr or "DEF_" in rr)
        if not (canonish or factual_person):
            return False, f"routeReason={rr}_not_in_relaxed_allowlist"
    return True, "ok"


def has_dup_sentence(text: str) -> bool:
    sents = [x.strip() for x in re.split(r"(?<=[。！？])", text) if x.strip()]
    if len(sents) < 2:
        return False
    norm = [re.sub(r"\s+", "", s) for s in sents]
    return len(norm) != len(set(norm))


def check_general_response(data: dict[str, Any], need_first_person: bool) -> tuple[bool, str]:
    resp = str(data.get("response") or "")
    core = re.sub(r"^【天聞の所見】\s*", "", resp).replace(" ", "")
    if len(core) < 140:
        return False, f"short_len={len(core)}"
    if need_first_person and "私" not in resp and "天聞" not in resp:
        return False, "missing_first_person_or_tenmon_axis"
    only_generic = bool(re.match(r"^【天聞の所見】[^。]{0,80}ですか[？?]?\s*$", resp.strip()))
    if only_generic:
        return False, "only_question_close"
    return True, "ok"


def check_subconcept_response(data: dict[str, Any]) -> tuple[bool, str]:
    resp = str(data.get("response") or "")
    if not resp.strip():
        return False, "empty"
    leak = ("さっき見ていた中心", "語義・作用・読解", "現代では、概念を押さえたうえで")
    if any(x in resp for x in leak):
        return False, "template_leak"
    return True, "ok"


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    base = os.environ.get("TENMON_AUTOBUNDLE_API_BASE", "http://127.0.0.1:3000").strip().rstrip("/")
    skip_sd = os.environ.get("TENMON_AUTOBUNDLE_SKIP_SYSTEMD_RESTART", "").strip().lower() in ("1", "true", "yes")
    strict_k1 = os.environ.get("TENMON_AUTOBUNDLE_STRICT_K1_PROBES", "0").strip().lower() in ("1", "true", "yes")

    steps: list[dict[str, Any]] = []
    failed: str | None = None

    s1 = substep_watch(repo, api)
    steps.append(s1)
    if not s1.get("ok"):
        failed = "substep_1_watch"
    else:
        v = post_build_health(api, base, skip_sd)
        steps.append({"name": "post_substep_1_build_health", **v})
        if not v.get("ok"):
            failed = "post_substep_1_build_health"

    if failed is None:
        k1_probes = [
            "空海の即身成仏とは何か",
            "法華経の核心を教えてください",
            "楢崎皐月は何をした人ですか",
        ]
        k1_results: list[dict[str, Any]] = []
        for i, msg in enumerate(k1_probes):
            tid = f"autobundle_k1_{int(time.time())}_{i}"
            pr = post_chat(base, msg, tid)
            ok_probe = False
            detail = ""
            if pr.get("ok") and isinstance(pr.get("data"), dict):
                ok_probe, detail = check_k1_response(pr["data"], msg, strict_k1)
            k1_results.append({"message": msg, "post_ok": pr.get("ok"), "check_ok": ok_probe, "detail": detail})
            if not ok_probe:
                failed = f"substep_2_k1_probe_{i}"
                steps.append({"name": "substep_2_k1", "probes": k1_results})
                break
        if failed is None:
            steps.append({"name": "substep_2_k1", "probes": k1_results})
            v2 = post_build_health(api, base, skip_sd)
            steps.append({"name": "post_substep_2_build_health", **v2})
            if not v2.get("ok"):
                failed = "post_substep_2_build_health"

    if failed is None:
        sc_msgs = [
            "私は言霊の研究をしています",
            "もう少し深めてください",
            "前の返答を受けて要点を一つだけ継続して",
        ]
        sc_results: list[dict[str, Any]] = []
        for i, msg in enumerate(sc_msgs):
            tid = f"autobundle_sc_{int(time.time())}_{i}"
            pr = post_chat(base, msg, tid)
            ok_probe = False
            detail = ""
            if pr.get("ok") and isinstance(pr.get("data"), dict):
                ok_probe, detail = check_subconcept_response(pr["data"])
            sc_results.append({"message": msg, "post_ok": pr.get("ok"), "check_ok": ok_probe, "detail": detail})
            if not ok_probe:
                failed = f"substep_3_subconcept_probe_{i}"
                steps.append({"name": "substep_3_subconcept", "probes": sc_results})
                break
        if failed is None:
            steps.append({"name": "substep_3_subconcept", "probes": sc_results})
            v3 = post_build_health(api, base, skip_sd)
            steps.append({"name": "post_substep_3_build_health", **v3})
            if not v3.get("ok"):
                failed = "post_substep_3_build_health"

    if failed is None:
        g_msgs = [
            ("現代人のよくない点を教えて", False),
            ("君の思考を聞きたい", True),
            ("水火の法則とは何ですか", False),
        ]
        g_results: list[dict[str, Any]] = []
        for i, (msg, fp) in enumerate(g_msgs):
            tid = f"autobundle_gk_{int(time.time())}_{i}"
            pr = post_chat(base, msg, tid)
            ok_probe = False
            detail = ""
            if pr.get("ok") and isinstance(pr.get("data"), dict):
                ok_probe, detail = check_general_response(pr["data"], fp)
            g_results.append({"message": msg, "post_ok": pr.get("ok"), "check_ok": ok_probe, "detail": detail})
            if not ok_probe:
                failed = f"substep_4_general_probe_{i}"
                steps.append({"name": "substep_4_general", "probes": g_results})
                break
        if failed is None:
            steps.append({"name": "substep_4_general", "probes": g_results})
            v4 = post_build_health(api, base, skip_sd)
            steps.append({"name": "post_substep_4_build_health", **v4})
            if not v4.get("ok"):
                failed = "post_substep_4_build_health"

    ok_all = failed is None
    out = {
        "card": CARD,
        "generated_at": utc(),
        "ok": ok_all,
        "failed_at": failed,
        "api_base": base,
        "skip_systemd_restart": skip_sd,
        "strict_k1_probes": strict_k1,
        "steps": steps,
        "next_on_pass": "TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1",
        "next_on_fail_note": "停止。retry 1枚のみ生成。",
    }
    write_json(auto / OUT_JSON, out)
    md = [f"# {CARD}", "", f"- ok: `{ok_all}`", f"- failed_at: `{failed}`", "", "## steps", ""]
    for s in steps:
        md.append(f"- {s.get('name')}: ok=`{s.get('ok')}`")
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps({"ok": ok_all, "path": str(auto / OUT_JSON), "failed_at": failed}, ensure_ascii=False))
    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
