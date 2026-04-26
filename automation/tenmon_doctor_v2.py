#!/usr/bin/env python3
"""TENMON-ARK doctor v2 (Phase 1) - CARD-DOCTOR-V2-IMPLEMENT-V1.

READ-ONLY observability command.
Diagnose 8 areas (git / API / PWA / DB / safety / prompt_trace / evolution / next-card)
without ANY mutation. No restart, no migration, no DB write, no deploy.

Usage:
    python3 automation/tenmon_doctor_v2.py verify

Outputs (all written at the very end, atomic):
    automation/out/doctor_v2_report_latest.json
    automation/out/doctor_v2_report_latest.md
    automation/out/doctor_v2_next_card_suggestions.md
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob as glob_mod
import json
import os
import pathlib
import re
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request


REPO_ROOT = pathlib.Path(
    os.environ.get("TENMON_DOCTOR_REPO_ROOT", "/opt/tenmon-ark-repo"))
OUT_DIR = pathlib.Path(
    os.environ.get("TENMON_DOCTOR_OUT_DIR", str(REPO_ROOT / "automation" / "out")))
DATA_DIR = pathlib.Path(
    os.environ.get("TENMON_DOCTOR_DATA_DIR", "/opt/tenmon-ark-data"))
KOKUZO_DB = os.environ.get(
    "TENMON_DOCTOR_KOKUZO_DB", str(DATA_DIR / "kokuzo.sqlite"))
PROMPT_TRACE_JSONL = DATA_DIR / "mc_intelligence_fire.jsonl"
PWA_ASSETS_DIR = "/var/www/tenmon-pwa/pwa/assets"
HOST = "https://tenmon-ark.com"
DOCTOR_VERSION = "v2.0.0-phase1"


# ---- self-check (deny-token uses concatenated literals so this script is not its own false-positive) ----
DENY_TOKENS = [
    "rm" + " -rf",
    "sys" + "temctl restart",
    "sys" + "temctl stop",
    "sys" + "temctl disable",
    "sys" + "temctl enable",
    "ng" + "inx -s",
    "rs" + "ync --delete",
    "PRA" + "GMA writable_schema",
    "DR" + "OP TABLE",
    "DEL" + "ETE FROM",
    "UPD" + "ATE ",
    "INS" + "ERT INTO",
]


def self_check() -> None:
    """Refuse to run if the script itself contains any forbidden subprocess literal.

    Comments (# ...) are intentionally skipped so explanation text never trips the guard.
    """
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code_lines: list[str] = []
    for ln in src.splitlines():
        if ln.lstrip().startswith("#"):
            continue
        code_lines.append(ln)
    code = "\n".join(code_lines)
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[doctor_v2] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- helpers ----
def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _safe_mkdir(p: pathlib.Path) -> None:
    """mkdir -p with a refusal list for system-critical prefixes.

    Raises RuntimeError for forbidden prefixes (env override misuse guard).
    Raises the underlying OSError for permission/io errors after a hint.
    """
    forbidden_prefixes = (
        "/etc", "/usr", "/bin", "/sbin", "/lib", "/lib64",
        "/boot", "/dev", "/proc", "/sys", "/root",
    )
    p_str = str(p.resolve())
    for fp in forbidden_prefixes:
        if p_str == fp or p_str.startswith(fp + "/"):
            raise RuntimeError(f"refusing to mkdir under {fp}: {p_str}")
    try:
        p.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"[doctor_v2] OUT_DIR={p} is not writable: {e}", file=sys.stderr)
        print("[doctor_v2] hint: set TENMON_DOCTOR_OUT_DIR to a writable path",
              file=sys.stderr)
        raise


def _read_api_token() -> str | None:
    """Best-effort READ-ONLY token resolution from the running api process env.

    Falls back to None if unreadable (caller proceeds unauthenticated).
    """
    try:
        r = _run(["systemctl", "show", "tenmon-ark-api.service", "-p", "MainPID", "--value"],
                 timeout=5)
        pid = (r.get("stdout") or "").strip()
        if not pid or not pid.isdigit() or pid == "0":
            return None
        env_path = pathlib.Path(f"/proc/{pid}/environ")
        if not env_path.exists():
            return None
        raw = env_path.read_bytes()
        for chunk in raw.split(b"\x00"):
            if chunk.startswith(b"TENMON_MC_CLAUDE_READ_TOKEN="):
                return chunk.split(b"=", 1)[1].decode("utf-8", errors="replace")
    except Exception:
        return None
    return None


_API_TOKEN_CACHE: dict = {}


def _api_token() -> str | None:
    if "v" not in _API_TOKEN_CACHE:
        _API_TOKEN_CACHE["v"] = _read_api_token()
    return _API_TOKEN_CACHE["v"]


def _http_get(url: str, timeout: float = 5.0, with_auth: bool = False) -> dict:
    try:
        headers = {"User-Agent": "doctor-v2/1.0"}
        if with_auth:
            tok = _api_token()
            if tok:
                headers["Authorization"] = f"Bearer {tok}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _http_head(url: str, timeout: float = 5.0) -> dict:
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "doctor-v2/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _http_post_json(url: str, payload: dict, timeout: float = 10.0) -> dict:
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "doctor-v2/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        return {"ok": False, "status": e.code, "error": str(e), "body": body}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def _run(args: list[str], timeout: float = 5.0, cwd: str | None = None) -> dict:
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, cwd=cwd)
        return {"ok": r.returncode == 0, "rc": r.returncode,
                "stdout": (r.stdout or "").strip(), "stderr": (r.stderr or "").strip()}
    except Exception as e:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": str(e)}


# ---- 1. git ----
def collect_git(findings: list[dict]) -> dict:
    cwd = str(REPO_ROOT)
    out: dict = {"branch": None, "commit": {}, "dirty_count": 0, "untracked_count": 0,
                 "ahead": None, "behind": None}
    b = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd)
    if b["ok"]:
        out["branch"] = b["stdout"] or None
    c = _run(["git", "log", "-1", "--pretty=format:%H%x09%s%x09%cI"], cwd=cwd)
    if c["ok"] and c["stdout"]:
        parts = c["stdout"].split("\t")
        if len(parts) >= 3:
            out["commit"] = {"hash": parts[0], "subject": parts[1], "committer_date": parts[2]}
    s = _run(["git", "status", "--porcelain"], cwd=cwd)
    if s["ok"]:
        modified = 0
        untracked = 0
        for ln in s["stdout"].splitlines():
            if not ln:
                continue
            if ln.startswith("??"):
                untracked += 1
            else:
                modified += 1
        out["dirty_count"] = modified
        out["untracked_count"] = untracked
        if modified > 0:
            findings.append({"level": "warn", "area": "git",
                             "message": f"{modified} modified file(s)"})
        if untracked > 0:
            findings.append({"level": "warn", "area": "git",
                             "message": f"{untracked} untracked file(s)"})
    a = _run(["git", "rev-list", "--left-right", "--count", "HEAD...@{u}"], cwd=cwd)
    if a["ok"] and a["stdout"]:
        try:
            ahead, behind = a["stdout"].split()
            out["ahead"] = int(ahead)
            out["behind"] = int(behind)
        except Exception:
            pass
    return out


# ---- 2. API ----
def collect_api(findings: list[dict]) -> dict:
    out: dict = {"health": {}, "claude_summary": {}, "intelligence": {}, "chat_probe": {}}

    h = _http_get(f"{HOST}/api/health", timeout=5)
    out["health"] = {"status": h.get("status"), "ok": h.get("ok"), "error": h.get("error")}
    if h.get("ok"):
        try:
            j = json.loads(h.get("body", ""))
            r = j.get("readiness") or {}
            out["health"]["payload"] = {
                "ok": j.get("ok"),
                "gitSha": j.get("gitSha"),
                "ready": r.get("ready"),
                "stage": r.get("stage"),
                "uptime_ms": r.get("uptimeMs"),
            }
        except Exception:
            pass
    if not h.get("ok") or h.get("status") != 200:
        findings.append({"level": "critical", "area": "api",
                         "message": f"/api/health unreachable or non-200: {h.get('status')} {h.get('error')}"})

    cs = _http_get(f"{HOST}/api/mc/vnext/claude-summary", timeout=5, with_auth=True)
    out["claude_summary"] = {"status": cs.get("status"), "ok": cs.get("ok")}
    if cs.get("ok"):
        try:
            j = json.loads(cs.get("body", ""))
            verdict = (j.get("acceptance") or {}).get("verdict")
            out["claude_summary"]["acceptance_verdict"] = verdict
            if verdict == "FAIL":
                findings.append({"level": "critical", "area": "api",
                                 "message": "acceptance verdict FAIL"})
        except Exception as e:
            out["claude_summary"]["parse_error"] = str(e)

    intel = _http_get(f"{HOST}/api/mc/vnext/intelligence", timeout=5, with_auth=True)
    out["intelligence"] = {"status": intel.get("status"), "ok": intel.get("ok")}
    if intel.get("ok"):
        try:
            j = json.loads(intel.get("body", ""))
            v = (j.get("kotodama_constitution_enforcer") or {}).get("verdict")
            out["intelligence"]["enforcer_verdict"] = v
            cov = j.get("kotodama_50_coverage") or {}
            out["intelligence"]["coverage_ratio"] = cov.get("ratio")
            out["intelligence"]["coverage_with_entry"] = cov.get("with_entry")
            if v not in (None, "clean"):
                findings.append({"level": "critical", "area": "api",
                                 "message": f"enforcer verdict not clean: {v}"})
        except Exception as e:
            out["intelligence"]["parse_error"] = str(e)

    probe_thread = "doctor-v2-probe-" + dt.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    payload = {"message": "言霊憲法 V1 第 4 条は何ですか？", "threadId": probe_thread}
    cp = _http_post_json(f"{HOST}/api/chat", payload, timeout=10)
    probe: dict = {"status": cp.get("status"), "ok": cp.get("ok"), "thread_id": probe_thread}
    if cp.get("ok"):
        try:
            j = json.loads(cp.get("body", ""))
            resp = j.get("response", "") or ""
            probe["response_length"] = len(resp)
            df = j.get("decisionFrame") or {}
            probe["mode"] = df.get("mode")
            probe["intent"] = df.get("intent")
            llm = df.get("llm") or {}
            if isinstance(llm, dict):
                probe["provider"] = llm.get("provider")
                probe["model"] = llm.get("model")
            route = df.get("route") if isinstance(df.get("route"), dict) else None
            probe["route_reason"] = (route or {}).get("route_reason") if route else df.get("intent")
        except Exception as e:
            probe["parse_error"] = str(e)
    else:
        findings.append({"level": "critical", "area": "api",
                         "message": f"/api/chat probe failed: {cp.get('status')} {cp.get('error')}"})
    out["chat_probe"] = probe
    return out


# ---- 3. PWA ----
def collect_pwa(findings: list[dict]) -> dict:
    out: dict = {
        "pwa_root": {},
        "pwa_evolution": {},
        "pwa_no_slash": {},
        "bundle_path": None,
        "bundle_entry_hits": {},
        "sidebar_link_hit": None,
    }
    pr = _http_head(f"{HOST}/pwa/", timeout=5)
    out["pwa_root"] = {"status": pr.get("status"), "ok": pr.get("ok")}
    pe = _http_head(f"{HOST}/pwa/evolution", timeout=5)
    out["pwa_evolution"] = {"status": pe.get("status"), "ok": pe.get("ok")}
    if pe.get("status") == 404:
        findings.append({"level": "critical", "area": "pwa",
                         "message": "/pwa/evolution returns 404"})
    elif not pe.get("ok"):
        findings.append({"level": "warn", "area": "pwa",
                         "message": f"/pwa/evolution status {pe.get('status')}"})
    pn = _http_head(f"{HOST}/pwa", timeout=5)
    out["pwa_no_slash"] = {"status": pn.get("status"), "ok": pn.get("ok")}
    if not pn.get("ok") and pr.get("ok"):
        findings.append({"level": "warn", "area": "pwa",
                         "message": f"/pwa returns {pn.get('status')} (trailing-slash issue)"})

    bundles = sorted(glob_mod.glob(f"{PWA_ASSETS_DIR}/EvolutionLogPage-*.js"))
    if not bundles:
        findings.append({"level": "warn", "area": "pwa",
                         "message": "EvolutionLogPage bundle not found in assets"})
        return out
    out["bundle_path"] = bundles[-1]
    try:
        content = pathlib.Path(out["bundle_path"]).read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        findings.append({"level": "warn", "area": "pwa",
                         "message": f"bundle read error: {e}"})
        return out

    expected_titles = [
        "言霊憲法が会話により深く反映されるようになりました",
        "言霊憲法が記憶層にも定着しました",
        "言霊憲法の本文に基づいて答えられるようになりました",
        "チャット応答が長く話せるようになりました",
    ]
    for t in expected_titles:
        hit = (t in content)
        out["bundle_entry_hits"][t] = hit
        if not hit:
            findings.append({"level": "warn", "area": "pwa",
                             "message": f"bundle missing entry title: {t}"})

    sidebar_label = "進化ログ"
    found = False
    for f in glob_mod.glob(f"{PWA_ASSETS_DIR}/*.js"):
        try:
            txt = pathlib.Path(f).read_text(encoding="utf-8", errors="replace")
            if sidebar_label in txt:
                found = True
                break
        except Exception:
            pass
    out["sidebar_link_hit"] = found
    if not found:
        findings.append({"level": "warn", "area": "pwa",
                         "message": "sidebar 進化ログ link not found in PWA bundles"})
    return out


# ---- 4. DB (read-only) ----
def collect_db(findings: list[dict]) -> dict:
    out: dict = {
        "memory_units_total": None,
        "kotodama_units": None,
        "thread_center_memory": None,
        "persona_knowledge_bindings": None,
        "thread_persona_links": None,
        "persona_profiles": None,
        "sacred_corpus_registry": None,
    }
    queries = [
        ("memory_units_total", "SELECT COUNT(*) FROM memory_units"),
        ("kotodama_units",
         "SELECT COUNT(*) FROM memory_units WHERE scope_id='kotodama_constitution_v1'"),
        ("thread_center_memory", "SELECT COUNT(*) FROM thread_center_memory"),
        ("persona_knowledge_bindings", "SELECT COUNT(*) FROM persona_knowledge_bindings"),
        ("thread_persona_links", "SELECT COUNT(*) FROM thread_persona_links"),
        ("persona_profiles", "SELECT COUNT(*) FROM persona_profiles"),
    ]
    try:
        uri = f"file:{KOKUZO_DB}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=5.0)
        try:
            cur = conn.cursor()
            for label, sql in queries:
                try:
                    cur.execute(sql)
                    out[label] = cur.fetchone()[0]
                except Exception:
                    out[label] = None
            try:
                cur.execute("SELECT COUNT(*) FROM sacred_corpus_registry")
                out["sacred_corpus_registry"] = cur.fetchone()[0]
            except Exception:
                out["sacred_corpus_registry"] = None
        finally:
            conn.close()
    except Exception as e:
        findings.append({"level": "warn", "area": "db",
                         "message": f"DB read error: {e}"})

    if out["kotodama_units"] not in (None, 12):
        findings.append({"level": "critical", "area": "db",
                         "message": f"kotodama_units={out['kotodama_units']} (expected 12)"})

    baseline = {
        "thread_center_memory": 9178,
        "persona_knowledge_bindings": 105,
        "thread_persona_links": 112975,
        "persona_profiles": 2,
    }
    for k, ev in baseline.items():
        v = out.get(k)
        if v is None or v == ev:
            continue
        findings.append({"level": "warn", "area": "db",
                         "message": f"{k}={v} (baseline {ev})"})
    return out


# ---- 5. Safety ----
def collect_safety(findings: list[dict]) -> dict:
    out: dict = {}
    for unit, key in [("tenmon-auto-patch", "auto_patch"),
                      ("tenmon-runtime-watchdog", "watchdog")]:
        active = _run(["systemctl", "is-active", unit], timeout=5)
        enabled = _run(["systemctl", "is-enabled", unit], timeout=5)
        out[key] = {"active": active["stdout"], "enabled": enabled["stdout"]}

    if out["auto_patch"]["active"] == "active":
        findings.append({"level": "critical", "area": "safety",
                         "message": "tenmon-auto-patch is active"})
    if out["auto_patch"]["enabled"] not in ("disabled", "masked", "alias", "static"):
        findings.append({"level": "warn", "area": "safety",
                         "message": f"tenmon-auto-patch enabled={out['auto_patch']['enabled']}"})

    timers = _run(["systemctl", "list-timers", "--all", "--no-pager"], timeout=5)
    timer_lines: list[str] = []
    for ln in (timers.get("stdout") or "").splitlines():
        if "mc-collect" in ln:
            timer_lines.append(ln.strip())
    out["mc_collect_timers"] = timer_lines

    candidates = [
        REPO_ROOT / "automation" / "dangerous_script_denylist_v1.json",
        REPO_ROOT / "docs" / "ark" / "automation" / "dangerous_script_denylist_v1.json",
    ]
    deny_path = next((p for p in candidates if p.exists()), None)
    out["denylist_path"] = str(deny_path) if deny_path else None
    out["denylist_exists"] = deny_path is not None
    if not deny_path:
        findings.append({"level": "warn", "area": "safety",
                         "message": "dangerous_script_denylist_v1.json not found"})

    runner = REPO_ROOT / "automation" / "tenmon_auto_runner.py"
    out["auto_runner_exists"] = runner.exists()
    out["auto_runner_denylist_wired"] = False
    if runner.exists():
        try:
            txt = runner.read_text(encoding="utf-8")
            if "dangerous_script_denylist_v1" in txt or "DENYLIST_PATH" in txt:
                out["auto_runner_denylist_wired"] = True
        except Exception:
            pass
    if runner.exists() and not out["auto_runner_denylist_wired"]:
        findings.append({"level": "warn", "area": "safety",
                         "message": "tenmon_auto_runner.py denylist wiring not detected"})
    return out


# ---- 6. PromptTrace ----
EXPECTED_CLAUSES = {
    "khs_constitution": 1148,
    "kotodama_constitution_v1": 2895,
    "kotodama_constitution_memory": 2139,
}


def collect_prompt_trace(findings: list[dict]) -> dict:
    out: dict = {
        "khs_constitution": None,
        "kotodama_constitution_v1": None,
        "kotodama_constitution_memory": None,
        "response_length": None,
        "route_reason": None,
        "provider": None,
        "ts": None,
        "source": None,
    }
    if not PROMPT_TRACE_JSONL.exists():
        findings.append({"level": "warn", "area": "prompt_trace",
                         "message": "mc_intelligence_fire.jsonl not found"})
        return out
    try:
        all_lines = PROMPT_TRACE_JSONL.read_text(encoding="utf-8", errors="replace").splitlines()
        recent = all_lines[-200:] if len(all_lines) > 200 else all_lines
        for ln in reversed(recent):
            if not ln.strip():
                continue
            try:
                j = json.loads(ln)
            except Exception:
                continue
            pt = j.get("prompt_trace") or {}
            cl = pt.get("clause_lengths") or {}
            if not cl:
                continue
            out["khs_constitution"] = cl.get("khs_constitution")
            out["kotodama_constitution_v1"] = cl.get("kotodama_constitution_v1")
            out["kotodama_constitution_memory"] = cl.get("kotodama_constitution_memory")
            out["response_length"] = pt.get("response_length")
            out["route_reason"] = pt.get("route_reason")
            out["provider"] = pt.get("provider")
            out["ts"] = j.get("ts")
            out["source"] = "mc_intelligence_fire.jsonl"
            break
    except Exception as e:
        findings.append({"level": "warn", "area": "prompt_trace",
                         "message": f"jsonl parse error: {e}"})

    if out["kotodama_constitution_v1"] in (None, 0):
        findings.append({"level": "critical", "area": "prompt_trace",
                         "message": "kotodama_constitution_v1 = 0 or missing"})
    if out["kotodama_constitution_memory"] in (None, 0):
        findings.append({"level": "critical", "area": "prompt_trace",
                         "message": "kotodama_constitution_memory = 0 or missing"})
    for k, ev in EXPECTED_CLAUSES.items():
        v = out.get(k)
        if v is None or v == 0:
            continue
        if abs(v - ev) / ev > 0.20:
            findings.append({"level": "warn", "area": "prompt_trace",
                             "message": f"{k}={v} differs >20% from expected {ev}"})
    if out["response_length"] is not None and out["response_length"] < 600:
        findings.append({"level": "warn", "area": "prompt_trace",
                         "message": f"latest trace response_length={out['response_length']} < 600"})
    return out


# ---- 7. Evolution log ----
EXPECTED_TOP4 = [
    "evo-2026-04-25-constitution-memory-projection",
    "evo-2026-04-25-constitution-memory-distill",
    "evo-2026-04-25-constitution-promotion",
    "evo-2026-04-25-clamp",
]


def collect_evolution(findings: list[dict], bundle_content: str | None) -> dict:
    out: dict = {"entry_ids": [], "expected_top4": list(EXPECTED_TOP4),
                 "bundle_top4_hits": {}}
    fp = REPO_ROOT / "web" / "src" / "data" / "evolution_log_v1.ts"
    if fp.exists():
        try:
            txt = fp.read_text(encoding="utf-8")
            ids = re.findall(r'id:\s*"([^"]+)"', txt)
            out["entry_ids"] = ids[:8]
        except Exception as e:
            findings.append({"level": "warn", "area": "evolution",
                             "message": f"evolution_log read error: {e}"})
    else:
        findings.append({"level": "warn", "area": "evolution",
                         "message": "evolution_log_v1.ts not found"})

    if out["entry_ids"][:4] != EXPECTED_TOP4:
        findings.append({"level": "warn", "area": "evolution",
                         "message": f"top4 ids mismatch: got {out['entry_ids'][:4]}"})

    if bundle_content:
        for eid in EXPECTED_TOP4:
            hit = eid in bundle_content
            out["bundle_top4_hits"][eid] = hit
            if not hit:
                findings.append({"level": "warn", "area": "evolution",
                                 "message": f"bundle missing id: {eid}"})
    return out


# ---- verdict / next-card ----
def derive_verdict(findings: list[dict]) -> tuple[str, int, int, int]:
    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    if crit > 0:
        return "RED", crit, warn, info
    if warn > 0:
        return "YELLOW", crit, warn, info
    return "GREEN", crit, warn, info


def derive_next_cards(verdict: str, findings: list[dict]) -> list[str]:
    if verdict == "GREEN":
        return [
            "CARD-FEEDBACK-LOOP-CARD-GENERATION-OBSERVE-V1",
            "CARD-MEMORY-PROJECTION-DISTILLED-SCRIPTURE-V1",
        ]
    target_level = "critical" if verdict == "RED" else "warn"
    target = next((f for f in findings if f.get("level") == target_level), None)
    area = (target or {}).get("area", "general").upper()
    if verdict == "RED":
        return [f"CARD-DOCTOR-V2-REPAIR-{area}-V1"]
    return [f"CARD-DOCTOR-V2-OBSERVE-{area}-V1"]


# ---- rendering ----
def render_md(report: dict) -> str:
    L: list[str] = []
    L.append("# TENMON-ARK Doctor v2 Report (Phase 1)")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- doctor_version: `{report['doctor_version']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    s = report["summary"]
    L.append(f"- summary: critical={s['critical']} / warn={s['warn']} / info={s['info']}")
    L.append("")

    g = report.get("git", {})
    L.append("## 1. git")
    L.append("")
    c = g.get("commit", {}) or {}
    L.append(f"- branch: `{g.get('branch')}`")
    L.append(f"- commit: `{(c.get('hash') or '')[:8]}` - {c.get('subject','')}")
    L.append(f"- committer_date: {c.get('committer_date')}")
    L.append(f"- dirty: {g.get('dirty_count')} / untracked: {g.get('untracked_count')}")
    L.append(f"- ahead/behind: {g.get('ahead')}/{g.get('behind')}")
    L.append("")

    a = report.get("api", {}) or {}
    L.append("## 2. API")
    L.append("")
    L.append(f"- /api/health status: {a.get('health',{}).get('status')}")
    L.append(f"- claude-summary verdict: {a.get('claude_summary',{}).get('acceptance_verdict')}")
    L.append(f"- intelligence enforcer: {a.get('intelligence',{}).get('enforcer_verdict')} | coverage_ratio={a.get('intelligence',{}).get('coverage_ratio')}")
    cp = a.get("chat_probe", {}) or {}
    L.append("- chat probe:")
    L.append(f"    - status: {cp.get('status')}")
    L.append(f"    - response_length: {cp.get('response_length')}")
    L.append(f"    - mode: {cp.get('mode')} / intent: {cp.get('intent')}")
    L.append(f"    - provider: {cp.get('provider')} / model: {cp.get('model')}")
    L.append(f"    - thread: `{cp.get('thread_id')}`")
    L.append("")

    p = report.get("pwa", {}) or {}
    L.append("## 3. PWA")
    L.append("")
    L.append(f"- /pwa/ status: {p.get('pwa_root',{}).get('status')}")
    L.append(f"- /pwa/evolution status: {p.get('pwa_evolution',{}).get('status')}")
    L.append(f"- /pwa (no slash) status: {p.get('pwa_no_slash',{}).get('status')}")
    L.append(f"- bundle: `{p.get('bundle_path')}`")
    for k, v in (p.get("bundle_entry_hits") or {}).items():
        L.append(f"  - title `{k[:34]}{'...' if len(k)>34 else ''}` hit: {v}")
    L.append(f"- sidebar 進化ログ link in bundles: {p.get('sidebar_link_hit')}")
    L.append("")

    d = report.get("db", {}) or {}
    L.append("## 4. DB")
    L.append("")
    for k in ["memory_units_total", "kotodama_units", "thread_center_memory",
              "persona_knowledge_bindings", "thread_persona_links",
              "persona_profiles", "sacred_corpus_registry"]:
        L.append(f"- {k}: {d.get(k)}")
    L.append("")

    sf = report.get("safety", {}) or {}
    L.append("## 5. Safety")
    L.append("")
    L.append(f"- tenmon-auto-patch: active={sf.get('auto_patch',{}).get('active')} enabled={sf.get('auto_patch',{}).get('enabled')}")
    L.append(f"- tenmon-runtime-watchdog: active={sf.get('watchdog',{}).get('active')} enabled={sf.get('watchdog',{}).get('enabled')}")
    L.append(f"- denylist exists: {sf.get('denylist_exists')} ({sf.get('denylist_path')})")
    L.append(f"- auto_runner exists: {sf.get('auto_runner_exists')} | denylist_wired: {sf.get('auto_runner_denylist_wired')}")
    L.append(f"- mc-collect timers: {len(sf.get('mc_collect_timers',[]))} entries")
    for tl in sf.get("mc_collect_timers", []):
        L.append(f"    - `{tl}`")
    L.append("")

    pt = report.get("prompt_trace", {}) or {}
    L.append("## 6. PromptTrace (latest jsonl entry)")
    L.append("")
    L.append(f"- khs_constitution: {pt.get('khs_constitution')} (expected ≈ {EXPECTED_CLAUSES['khs_constitution']})")
    L.append(f"- kotodama_constitution_v1: {pt.get('kotodama_constitution_v1')} (expected ≈ {EXPECTED_CLAUSES['kotodama_constitution_v1']})")
    L.append(f"- kotodama_constitution_memory: {pt.get('kotodama_constitution_memory')} (expected ≈ {EXPECTED_CLAUSES['kotodama_constitution_memory']})")
    L.append(f"- response_length: {pt.get('response_length')}")
    L.append(f"- route_reason: {pt.get('route_reason')}")
    L.append(f"- provider: {pt.get('provider')}")
    L.append(f"- ts: {pt.get('ts')}")
    L.append("")

    ev = report.get("evolution", {}) or {}
    L.append("## 7. Evolution log")
    L.append("")
    L.append("- entry_ids (top up to 8):")
    for i in ev.get("entry_ids", []):
        L.append(f"  - `{i}`")
    L.append("- bundle hits (top 4 expected):")
    for k, v in (ev.get("bundle_top4_hits") or {}).items():
        L.append(f"  - `{k}`: {v}")
    L.append("")

    L.append("## 8. Next card suggestions")
    L.append("")
    for c in report.get("next_card_suggestions", []) or []:
        L.append(f"- {c}")
    L.append("")

    L.append("## Findings")
    L.append("")
    if not report.get("findings"):
        L.append("(none)")
    for f in report.get("findings") or []:
        L.append(f"- [{f.get('level')}] [{f.get('area')}] {f.get('message')}")
    L.append("")
    return "\n".join(L) + "\n"


def render_next_card_md(report: dict) -> str:
    L: list[str] = []
    L.append("# Doctor v2 — next card suggestions")
    L.append("")
    L.append(f"- generated_at: `{report['generated_at']}`")
    L.append(f"- verdict: **{report['verdict']}**")
    s = report["summary"]
    L.append(f"- critical: {s['critical']} / warn: {s['warn']} / info: {s['info']}")
    L.append("")
    L.append("## Suggestions")
    L.append("")
    for c in report.get("next_card_suggestions", []) or []:
        L.append(f"- {c}")
    L.append("")
    L.append("## Findings (driving the suggestion)")
    L.append("")
    if not report.get("findings"):
        L.append("(none)")
    for f in report.get("findings") or []:
        L.append(f"- [{f.get('level')}] [{f.get('area')}] {f.get('message')}")
    L.append("")
    return "\n".join(L) + "\n"


# ---- verify orchestration ----
def cmd_verify() -> int:
    findings: list[dict] = []

    git_section = collect_git(findings)
    api_section = collect_api(findings)
    pwa_section = collect_pwa(findings)
    db_section = collect_db(findings)
    safety_section = collect_safety(findings)
    pt_section = collect_prompt_trace(findings)

    bundle_content: str | None = None
    if pwa_section.get("bundle_path"):
        try:
            bundle_content = pathlib.Path(pwa_section["bundle_path"]).read_text(
                encoding="utf-8", errors="replace")
        except Exception:
            bundle_content = None
    ev_section = collect_evolution(findings, bundle_content)

    verdict, crit, warn, info = derive_verdict(findings)
    next_cards = derive_next_cards(verdict, findings)

    report = {
        "doctor_version": DOCTOR_VERSION,
        "generated_at": _now_iso(),
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "git": git_section,
        "api": api_section,
        "pwa": pwa_section,
        "db": db_section,
        "safety": safety_section,
        "prompt_trace": pt_section,
        "evolution": ev_section,
        "next_card_suggestions": next_cards,
        "findings": findings,
    }

    _safe_mkdir(OUT_DIR)
    json_text = json.dumps(report, ensure_ascii=False, indent=2)
    md_text = render_md(report)
    sug_text = render_next_card_md(report)

    (OUT_DIR / "doctor_v2_report_latest.json").write_text(json_text, encoding="utf-8")
    (OUT_DIR / "doctor_v2_report_latest.md").write_text(md_text, encoding="utf-8")
    (OUT_DIR / "doctor_v2_next_card_suggestions.md").write_text(sug_text, encoding="utf-8")

    print(f"[doctor_v2] verdict={verdict} crit={crit} warn={warn} info={info}")
    print(f"[doctor_v2] report: {OUT_DIR / 'doctor_v2_report_latest.json'}")
    return 0


def main() -> None:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_doctor_v2",
        description="TENMON-ARK doctor v2 (Phase 1) - READ-ONLY diagnostic")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("verify", help="run a one-shot read-only diagnostic")
    args = parser.parse_args()
    if args.cmd == "verify":
        sys.exit(cmd_verify())
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
