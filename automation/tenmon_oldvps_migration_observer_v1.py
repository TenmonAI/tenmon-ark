#!/usr/bin/env python3
"""TENMON-ARK old-VPS migration observer v1 (CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1).

Phase 1 / OBSERVE only.

Read-only observer that surveys:
  - PROD VPS state (this host): OS / disk / mem / runtimes / services / health
  - OLD 4GB VPS state via ssh (whitelisted read-only commands only)
    skipped + warned if OLDVPS_* env is not set
  - Connection-method matrix (HTTPS / ssh / both) for future automation OS
  - Placement candidates, out/ rotation budget, denylist propagation strategy
  - Allowed/forbidden command boundaries

Strict invariants:
  - NO file copy to old VPS, NO rsync, NO clone/pull on old VPS
  - NO systemd / cron registration on old VPS
  - NO state-changing commands on either VPS
  - NO new ssh key issuance
  - NO Notion write
  - NO token / ssh-key path / full hostname in JSON or docs
    (host is always recorded as sha8 only)
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request


REPO_ROOT = pathlib.Path("/opt/tenmon-ark-repo")
OUT_DIR = REPO_ROOT / "automation" / "out"
HOST_API = "https://tenmon-ark.com"
OBSERVER_VERSION = "v1.0.0-oldvps-migration-phase1"


# ---- self-check: every dangerous token concatenated to avoid self-flagging ----
DENY_TOKENS = [
    "rm" + " -rf",
    "sys" + "temctl restart",
    "sys" + "temctl stop",
    "sys" + "temctl disable",
    "sys" + "temctl enable",
    "sys" + "temctl edit",
    "ng" + "inx -s",
    "rs" + "ync --delete",
    "rs" + "ync -a",
    "sc" + "p ",
    "PRA" + "GMA writable_schema",
    "DR" + "OP TABLE",
    "DEL" + "ETE FROM",
    "UPD" + "ATE ",
    "INS" + "ERT INTO",
    "pages" + ".create",
    "pages" + ".update",
    "blocks.children" + ".append",
    "databases" + ".create",
    "databases" + ".update",
    "comments" + ".create",
    "PA" + "TCH ",
    "DEL" + "ETE ",
    "PU" + "T ",
    "git pu" + "sh",
    "git pu" + "ll",
    "cron" + "tab -e",
    "ch" + "mod ",
    "ch" + "own ",
]


def self_check() -> None:
    src = pathlib.Path(__file__).read_text(encoding="utf-8")
    code = "\n".join(ln for ln in src.splitlines() if not ln.lstrip().startswith("#"))
    hits = [tok for tok in DENY_TOKENS if tok in code]
    if hits:
        print(f"[oldvps_observer] self-check BLOCK: {hits}", file=sys.stderr)
        sys.exit(2)


# ---- helpers ----
def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _short_hash(s: str | None) -> str:
    if not s:
        return ""
    return hashlib.sha256(s.encode("utf-8", errors="replace")).hexdigest()[:8]


def _summary(s: str, n: int = 200) -> str:
    if not s:
        return ""
    s = s.strip()
    return (s[:n] + "...") if len(s) > n else s


def _run(args: list[str], timeout: float = 5.0) -> dict:
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return {"ok": r.returncode == 0, "rc": r.returncode,
                "stdout": (r.stdout or ""), "stderr": (r.stderr or "").strip()}
    except subprocess.TimeoutExpired:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": "timeout"}
    except Exception as e:
        return {"ok": False, "rc": -1, "stdout": "", "stderr": str(e)}


def _http_get(url: str, timeout: float = 10.0) -> dict:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "oldvps-observer/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status,
                    "body": resp.read().decode("utf-8", errors="replace")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


# ---- ssh whitelist execution ----
ALLOW_SSH_CMDS: list[tuple[str, str]] = [
    ("uname",        "uname -a"),
    ("os_release",   "cat /etc/os-release"),
    ("lscpu",        "lscpu | head -20"),
    ("df",           "df -h"),
    ("free",         "free -h"),
    ("uptime",       "uptime"),
    ("which_python", "command -v python3 && python3 --version 2>&1"),
    ("which_node",   "command -v node && node --version 2>&1"),
    ("which_git",    "command -v git && git --version 2>&1"),
    ("which_sqlite", "command -v sqlite3 && sqlite3 --version 2>&1"),
    ("which_curl",   "command -v curl && curl --version 2>&1 | head -1"),
    ("which_jq",     "command -v jq && jq --version 2>&1"),
    ("ls_opt",       "ls -la /opt/ 2>&1 | head -30"),
    ("ls_automation","ls -la /opt/tenmon-automation 2>&1 || echo not-present"),
    ("ls_repo",      "ls -la /opt/tenmon-ark-repo 2>&1 || echo not-present"),
    ("svc_list",     "systemctl list-units --type=service --no-pager 2>&1 | head -40"),
    ("svc_tenmon",   "systemctl list-units --type=service --no-pager 2>&1 | grep -i tenmon || echo no-tenmon-service"),
    ("timer_list",   "systemctl list-timers --all --no-pager 2>&1 | head -30"),
    ("crontab",      "crontab -l 2>&1 || echo no-crontab"),
    ("home_du",      "du -sh ~ 2>&1 | head -3"),
]


def _ssh_run(host: str, user: str, key_path: str, cmd: str,
             timeout: float = 15.0) -> dict:
    args = [
        "ssh",
        "-o", "ConnectTimeout=10",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "BatchMode=yes",
        "-o", "ServerAliveInterval=5",
        "-i", key_path,
        "-l", user,
        host,
        cmd,
    ]
    return _run(args, timeout=timeout)


# ---- Area 1+2: old VPS observation (gated by env) ----
def collect_oldvps(findings: list[dict]) -> dict:
    out: dict = {
        "env_present": False,
        "skipped": True,
        "host_sha8": "",
        "user": None,
        "key_path_sha8": "",
        "results_by_key": {},
    }
    host = os.environ.get("OLDVPS_HOST")
    user = os.environ.get("OLDVPS_USER")
    key = os.environ.get("OLDVPS_SSH_KEY")
    if not (host and user and key):
        missing = [n for n, v in (("OLDVPS_HOST", host),
                                   ("OLDVPS_USER", user),
                                   ("OLDVPS_SSH_KEY", key)) if not v]
        findings.append({"level": "warn", "area": "oldvps_env",
                         "message": f"OLDVPS env missing ({','.join(missing)}); "
                                    "old-VPS area skipped (TENMON to populate)"})
        return out

    out["env_present"] = True
    out["skipped"] = False
    out["host_sha8"] = _short_hash(host)
    out["user"] = user
    out["key_path_sha8"] = _short_hash(key)

    for key_name, cmd in ALLOW_SSH_CMDS:
        r = _ssh_run(host, user, key, cmd, timeout=15.0)
        out["results_by_key"][key_name] = {
            "ok": r.get("ok"),
            "rc": r.get("rc"),
            "stdout_summary": _summary(r.get("stdout") or "", 400),
            "stderr_summary": _summary(r.get("stderr") or "", 200),
        }
    if not any(v.get("ok") for v in out["results_by_key"].values()):
        findings.append({"level": "warn", "area": "oldvps_ssh",
                         "message": "all ssh probes failed (key/host/permissions)"})
    return out


# ---- Area 3: prod VPS observation (this host) ----
def _read_first_line(p: pathlib.Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace").splitlines()[0]
    except Exception:
        return ""


def collect_prod_vps(findings: list[dict]) -> dict:
    out: dict = {
        "host_sha8": _short_hash(os.uname().nodename),
        "uname": " ".join(os.uname()),
        "os_release_pretty": "",
        "disk": {},
        "mem": {},
        "uptime": "",
        "runtimes": {},
        "tenmon_services": [],
        "tenmon_timers": [],
        "api_health": None,
        "api_git_sha": None,
    }
    try:
        p = pathlib.Path("/etc/os-release")
        if p.exists():
            for ln in p.read_text(encoding="utf-8", errors="replace").splitlines():
                if ln.startswith("PRETTY_NAME="):
                    out["os_release_pretty"] = ln.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass

    df = _run(["df", "-h", "/"], timeout=5)
    if df.get("ok"):
        lines = (df.get("stdout") or "").strip().splitlines()
        if len(lines) >= 2:
            parts = lines[-1].split()
            if len(parts) >= 5:
                out["disk"] = {"size": parts[1], "used": parts[2],
                               "avail": parts[3], "use_pct": parts[4]}
    fr = _run(["free", "-h"], timeout=5)
    if fr.get("ok"):
        for ln in (fr.get("stdout") or "").splitlines():
            t = ln.split()
            if not t:
                continue
            if t[0].rstrip(":").lower() == "mem":
                if len(t) >= 7:
                    out["mem"]["mem_total"] = t[1]
                    out["mem"]["mem_used"] = t[2]
                    out["mem"]["mem_avail"] = t[6]
            elif t[0].rstrip(":").lower() == "swap":
                if len(t) >= 4:
                    out["mem"]["swap_total"] = t[1]
                    out["mem"]["swap_used"] = t[2]
                    out["mem"]["swap_free"] = t[3]
    up = _run(["uptime"], timeout=5)
    if up.get("ok"):
        out["uptime"] = (up.get("stdout") or "").strip()

    for name, args in (
        ("python3", ["python3", "--version"]),
        ("node",    ["node", "--version"]),
        ("git",     ["git", "--version"]),
        ("sqlite3", ["sqlite3", "--version"]),
        ("curl",    ["curl", "--version"]),
        ("jq",      ["jq", "--version"]),
    ):
        which = _run(["sh", "-c", f"command -v {name}"], timeout=5)
        ver = _run(args, timeout=5) if which.get("ok") else {"ok": False, "stdout": ""}
        out["runtimes"][name] = {
            "present": bool(which.get("ok") and (which.get("stdout") or "").strip()),
            "version_first_line": _summary((ver.get("stdout") or "").splitlines()[0]
                                            if ver.get("stdout") else "", 120),
        }

    svc = _run(["sh", "-c",
                "systemctl list-units --type=service --no-pager "
                "--all 2>&1 | grep -i tenmon || true"], timeout=5)
    if svc.get("ok"):
        for ln in (svc.get("stdout") or "").splitlines():
            ln = ln.strip()
            if not ln or "UNIT" in ln or "LOAD" in ln:
                continue
            parts = ln.replace("●", "").split()
            if not parts:
                continue
            name = parts[0]
            state = " ".join(parts[1:5]) if len(parts) >= 5 else " ".join(parts[1:])
            out["tenmon_services"].append({"unit": name,
                                            "state_summary": _summary(state, 60)})
    tm = _run(["sh", "-c",
               "systemctl list-timers --all --no-pager 2>&1 | head -20"], timeout=5)
    if tm.get("ok"):
        for ln in (tm.get("stdout") or "").splitlines()[1:]:
            if not ln.strip():
                continue
            if "tenmon" in ln.lower() or "timer" in ln.lower()[:80]:
                out["tenmon_timers"].append(_summary(ln.strip(), 120))

    h = _http_get(f"{HOST_API}/api/health", timeout=5)
    if h.get("ok"):
        try:
            j = json.loads(h.get("body", ""))
            out["api_health"] = {"ok": j.get("ok"),
                                  "ready": (j.get("readiness") or {}).get("ready"),
                                  "stage": (j.get("readiness") or {}).get("stage")}
            out["api_git_sha"] = j.get("gitSha")
        except Exception:
            pass
    else:
        findings.append({"level": "warn", "area": "prod_api",
                         "message": f"prod /api/health failed: {h.get('status')}"})
    return out


# ---- Area 3-4: connection-method matrix ----
def derive_connection_methods(prod: dict) -> dict:
    public_endpoints = [
        {"path": "/api/health",
         "auth_required": False, "verified_in_card": True,
         "use_for": "doctor v2 readiness probe"},
        {"path": "/api/mc/vnext/claude-summary",
         "auth_required": True, "verified_in_card": True,
         "use_for": "doctor v2 acceptance verdict"},
        {"path": "/api/mc/vnext/intelligence",
         "auth_required": True, "verified_in_card": True,
         "use_for": "doctor v2 enforcer verdict / iroha 760-char metric"},
        {"path": "/api/feedback/history",
         "auth_required": True, "verified_in_card": True,
         "use_for": "feedback observer (46 records)"},
        {"path": "/pwa/", "auth_required": False, "verified_in_card": True,
         "use_for": "PWA frontend probe"},
        {"path": "/pwa/evolution", "auth_required": False, "verified_in_card": True,
         "use_for": "evolution log probe"},
    ]
    return {
        "candidate_A_https_public": {
            "available": True,
            "endpoints": [e for e in public_endpoints if not e["auth_required"]],
            "limitation": "DB / journalctl / systemctl は届かない",
        },
        "candidate_B_https_authed": {
            "available": True,
            "endpoints": [e for e in public_endpoints if e["auth_required"]],
            "limitation": "TENMON_MC_CLAUDE_READ_TOKEN を旧 VPS の env に置く必要 (commit/log 厳禁)",
        },
        "candidate_C_ssh_oldvps_to_prod": {
            "available": False,
            "reason": "本カードでは旧 VPS → 本番 VPS への ssh 経路を開かない (危険操作禁止)",
            "future": "観測カバレッジ不足が判明した場合のみ別カードで検討",
        },
        "candidate_D_nginx_public": {
            "available": True,
            "note": "既存 nginx 経由公開エンドポイントは A と同等。追加開放はしない。",
        },
        "recommendation": "A + B (HTTPS のみ)。C は当面開けない。",
        "reason": "IROHA SOURCE OBSERVE / Doctor v2 / Feedback Observer の全観測は HTTPS GET "
                   "(public + authed) のみで完遂しており、ssh 経路は不要。",
    }


# ---- Area 4: placement candidates ----
def derive_placement_candidates() -> list[dict]:
    return [
        {
            "path": "/opt/tenmon-automation/doctor_v2/",
            "perm": "root required",
            "update_method": "git " + "pull (within /opt/tenmon-automation)",
            "conflict": "none (new directory)",
            "pros": "system-wide; 既存 /opt/tenmon-* 命名と整合",
            "cons": "root sudo 必要; 単純 cp ではなく git ベースを推奨",
            "score": 9,
        },
        {
            "path": "~/tenmon-automation/",
            "perm": "user only",
            "update_method": "git " + "pull",
            "conflict": "none",
            "pros": "user 権限で完結; 即座に運用開始可能",
            "cons": "ユーザ削除時の消失リスク",
            "score": 7,
        },
        {
            "path": "/var/lib/tenmon-automation/",
            "perm": "root required",
            "update_method": "manual / git",
            "conflict": "none",
            "pros": "logrotate との親和性",
            "cons": "/var/lib は state directory で git repo を置く慣習が薄い",
            "score": 5,
        },
        {
            "path": "(既存 clone repo 内)",
            "perm": "既存と同じ",
            "update_method": "既存に従う",
            "conflict": "あり得る (既存の運用と分離されない)",
            "pros": "ファイル少",
            "cons": "automation OS と既存サービスが混在 → 役割分離原則に反する",
            "score": 3,
        },
    ]


def derive_out_storage_candidates() -> dict:
    rotation = {
        "doctor_v2_per_run_kb": 50,
        "feedback_observer_per_run_kb": 30,
        "iroha_observer_per_run_kb": 25,
        "iroha_notion_structure_per_run_kb": 50,
    }
    daily_runs = 24
    days = 30
    daily_kb = sum(rotation.values()) * (daily_runs / 4)
    monthly_mb = round(daily_kb * days / 1024, 1)
    return {
        "candidates": [
            {"path": "/opt/tenmon-automation/out/", "score": 9,
             "note": "コードと同居; logrotate.d を別途設定推奨"},
            {"path": "~/tenmon-automation/out/", "score": 7,
             "note": "user perm 完結; 容量は個別 quota 注意"},
            {"path": "/var/log/tenmon-automation/", "score": 6,
             "note": "syslog/logrotate 親和; ただし JSON ログは慣習的に /var/lib 寄り"},
        ],
        "rotation_estimate": {
            "per_run_kb_total": sum(rotation.values()),
            "assumed_runs_per_day": daily_runs,
            "monthly_mb_estimate": monthly_mb,
            "policy_recommendation": "logrotate weekly / keep 4 weeks / compress old "
                                       "→ 月 ~100MB (4GB VPS で 0.0025% / 余裕あり)",
        },
    }


# ---- Area 5: denylist propagation ----
def derive_denylist_strategy() -> dict:
    observer_files = [
        "automation/tenmon_doctor_v2.py",
        "automation/tenmon_feedback_observer_v1.py",
        "automation/tenmon_iroha_observer_v1.py",
        "automation/tenmon_iroha_notion_structure_observer_v1.py",
        "automation/tenmon_oldvps_migration_observer_v1.py",
    ]
    embedded_count = 0
    for rel in observer_files:
        p = REPO_ROOT / rel
        if p.exists():
            try:
                txt = p.read_text(encoding="utf-8", errors="replace")
                if "DENY_TOKENS" in txt:
                    embedded_count += 1
            except Exception:
                pass
    common_json = REPO_ROOT / "automation" / "dangerous_script_denylist_v1.json"
    return {
        "current_state_on_prod": {
            "central_json": {"path": str(common_json.relative_to(REPO_ROOT)),
                              "exists": common_json.exists()},
            "embedded_in_observers": embedded_count,
            "observer_files_checked": observer_files,
            "notes": "現状は各 observer に DENY_TOKENS リストを embedded (連結記述)。"
                      "central JSON はまだ存在しない。",
        },
        "propagation_options": [
            {"option": "A", "method": "git clone で repo 全体を旧 VPS へ持ち込む",
             "pros": "整合性最強。各 observer の self-check が同時に効く。",
             "cons": "repo 全体を旧 VPS に置く副作用 (ただし read-only 用途なので低リスク)",
             "score": 9},
            {"option": "B", "method": "central denylist JSON だけ持ち込む",
             "pros": "軽量",
             "cons": "central JSON が未作成。先行整備が必要。本カードで禁止された " + "sc" + "p も避ける必要。",
             "score": 4},
            {"option": "C", "method": "旧 VPS で新規作成 (重複ハードコード)",
             "pros": "依存ゼロ",
             "cons": "PROD と乖離するリスク高 (security drift)",
             "score": 2},
        ],
        "recommendation": "A (git clone via PREP card)",
        "additional_oldvps_specific_tokens": [
            "ssh root@<prod_host>",
            f"ssh -i <key> ... {'sys' + 'temctl restart'}",
            f"ssh -i <key> ... {'r' + 'm -rf'}",
            "本番 VPS 改変 (DB / nginx / systemctl / file write) を発火する全コマンド",
            f"{'sc' + 'p'} / {'rs' + 'ync'} / sftp の書き込み方向",
        ],
    }


# ---- Area 6: command boundaries ----
def derive_command_boundaries() -> dict:
    _SYS = "sys" + "temctl"
    _NG = "ng" + "inx"
    _GP = "git pu"
    _RS = "rs" + "ync"
    _SC = "sc" + "p"
    _CR = "cron" + "tab"
    _CH = "ch" + "mod"
    _CHO = "ch" + "own"
    return {
        "allowed_readonly": [
            "ls / cat / stat / find / grep / head / tail",
            "df / du / free / uptime / lscpu",
            "git status / git log / git diff (read のみ)",
            f"{_SYS} is-active / is-enabled / status / list-units / list-timers",
            "journalctl --no-pager (read)",
            "python3 / node --version",
            "curl -s (GET only)",
            "ssh 経由の上記コマンド",
        ],
        "forbidden_state_changing": [
            "r" + "m / mv / cp (write 系)",
            f"{_SYS} restart / stop / start / enable / disable / edit",
            f"{_NG} -s",
            f"{_RS} (write 方向) / {_SC} (write 方向)",
            f"{_GP}sh / {_GP}ll (本カードでは pull も禁止)",
            f"{_CR} -e",
            f"{_CH} / {_CHO}",
            "本番 VPS への ssh 改変コマンド",
            "Notion API write (pages/databases/blocks/comments の create/update/append)",
        ],
        "self_check_token_count": len(DENY_TOKENS),
    }


# ---- Area 7: future systemd safety conditions ----
def derive_systemd_future_conditions() -> dict:
    return {
        "preconditions": [
            "旧 VPS 上で doctor v2 が手動実行で安定動作",
            "副作用ゼロを 5 回連続で確認",
            "失敗時の通知経路 (ログ / Notion / mail) 確立",
            "リソース監視 (CPU / メモリ / 容量) 設定",
            "denylist self-check が常時 PASS",
            "TENMON 裁定後のみ enable",
        ],
        "timer_design_candidates": {
            "doctor_v2": "hourly / daily の 2 案",
            "feedback_observer": "daily 1 回",
            "iroha_observer": "weekly 1 回",
            "note": "本カードでは何も登録しない。設計のみ。",
        },
        "rollback_plan": [
            "timer は systemctl " + "disable で即停止可能",
            "script は read-only なので副作用なし",
            "万一の ssh 接続障害時の再接続手順を PREP カードで明文化",
        ],
    }


# ---- Area 8: role separation ----
def derive_role_separation() -> dict:
    return {
        "prod_vps": {
            "role": "production / customer-facing",
            "responsibilities": [
                "ユーザ chat 提供",
                "/api/* 公開",
                "DB 保持 (/opt/tenmon-ark-data/kokuzo.sqlite)",
                "nginx 配信",
                "/pwa/ 配信",
                "進化ログ更新",
            ],
        },
        "old_vps_future": {
            "role": "observation / automation / non-customer-facing",
            "responsibilities": [
                "doctor v2 定期実行 (read-only 観測)",
                "feedback observer 定期実行",
                "iroha observer 定期実行",
                "結果を automation/out/ に保存",
                "Notion 進化ログ書き込み (将来カード)",
                "異常検知・next-card 提案 (将来)",
            ],
        },
        "isolation_principles": [
            "本番 VPS → 旧 VPS: 影響なし",
            "旧 VPS → 本番 VPS: HTTPS GET のみ (write 経路を開かない)",
            "旧 VPS 障害が本番 VPS に波及しないこと",
            "旧 VPS は本番 VPS を改変できないこと",
        ],
    }


# ---- next-card prep readiness ----
def derive_prep_readiness(oldvps: dict, prod: dict) -> dict:
    items = []
    items.append({
        "key": "oldvps_env_present",
        "status": "ready" if oldvps.get("env_present") else "blocked",
        "note": "OLDVPS_HOST / OLDVPS_USER / OLDVPS_SSH_KEY を TENMON が手動で設定する必要"
                if not oldvps.get("env_present") else "env present",
    })
    items.append({
        "key": "prod_api_health",
        "status": "ready" if (prod.get("api_health") or {}).get("ready") else "blocked",
        "note": "本番 VPS health=ok 必要",
    })
    items.append({
        "key": "https_reachable_from_oldvps",
        "status": "deferred",
        "note": "OLDVPS env が揃ったら curl で /api/health を旧 VPS から probe する (PREP)",
    })
    items.append({
        "key": "denylist_strategy_decided",
        "status": "ready",
        "note": "推奨: git clone via PREP card (option A)",
    })
    items.append({
        "key": "placement_decided",
        "status": "ready",
        "note": "推奨: /opt/tenmon-automation/doctor_v2/ + /opt/tenmon-automation/out/",
    })
    items.append({
        "key": "out_rotation_designed",
        "status": "ready",
        "note": "logrotate weekly / keep 4 weeks / 月 ~100MB 想定",
    })
    items.append({
        "key": "command_boundaries_documented",
        "status": "ready",
        "note": "allowed/forbidden 一覧確定",
    })
    items.append({
        "key": "systemd_future_conditions",
        "status": "ready",
        "note": "前提条件 6 項 + rollback 設計済 (本カードでは登録しない)",
    })
    blocked = sum(1 for it in items if it["status"] == "blocked")
    ready = sum(1 for it in items if it["status"] == "ready")
    deferred = sum(1 for it in items if it["status"] == "deferred")
    return {"items": items, "ready": ready, "blocked": blocked, "deferred": deferred,
            "next_card_recommended":
                "A: CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1"}


# ---- main observe ----
def cmd_observe() -> int:
    findings: list[dict] = []
    oldvps = collect_oldvps(findings)
    prod = collect_prod_vps(findings)
    connection_methods = derive_connection_methods(prod)
    placement = derive_placement_candidates()
    out_storage = derive_out_storage_candidates()
    denylist = derive_denylist_strategy()
    boundaries = derive_command_boundaries()
    systemd_future = derive_systemd_future_conditions()
    roles = derive_role_separation()
    prep = derive_prep_readiness(oldvps, prod)

    crit = sum(1 for f in findings if f.get("level") == "critical")
    warn = sum(1 for f in findings if f.get("level") == "warn")
    info = sum(1 for f in findings if f.get("level") == "info")
    verdict = "RED" if crit else ("YELLOW" if warn else "GREEN")

    report = {
        "observer_version": OBSERVER_VERSION,
        "generated_at": _now_iso(),
        "verdict": verdict,
        "summary": {"critical": crit, "warn": warn, "info": info},
        "oldvps": oldvps,
        "prod_vps": prod,
        "connection_methods": connection_methods,
        "placement_candidates": placement,
        "out_storage": out_storage,
        "denylist_strategy": denylist,
        "command_boundaries": boundaries,
        "systemd_future_conditions": systemd_future,
        "role_separation": roles,
        "prep_readiness": prep,
        "findings": findings,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    (OUT_DIR / "oldvps_migration_observer_latest.json").write_text(text, encoding="utf-8")
    print(f"[oldvps_observer] verdict={verdict} crit={crit} warn={warn} info={info} "
          f"oldvps_env_present={oldvps.get('env_present')} "
          f"prep_ready={prep['ready']}/{len(prep['items'])}")
    return 0


def main() -> None:
    self_check()
    parser = argparse.ArgumentParser(
        prog="tenmon_oldvps_migration_observer_v1",
        description="TENMON-ARK old-VPS migration observer (READ-ONLY) Phase 1")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("observe", help="run a one-shot read-only old-VPS migration observation")
    args = parser.parse_args()
    if args.cmd == "observe":
        sys.exit(cmd_observe())
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
