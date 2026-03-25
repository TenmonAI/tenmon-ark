#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1

安全ゲート付き 1-card 運用サイクル: observe → choose → dispatch → loopback result → verify → rejudge → state。
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1"
POLICY_FN = "operations_level_autonomy_policy_v1.json"
STATE_FN = "operations_level_autonomy_state_v1.json"
OUT_SUMMARY = "tenmon_operations_level_autonomy_summary.json"
OUT_REPORT = "tenmon_operations_level_autonomy_report.md"
OUT_ENABLE_VERDICT = "tenmon_operations_level_autonomy_enable_verdict.json"
NEXT_CARDS = "state_convergence_next_cards.json"
RETRY_QUEUE = "retry_queue.json"
PRIORITY_QUEUE = "self_build_priority_queue.json"
EXEC_GATE = "tenmon_execution_gate_hardstop_verdict.json"
REJUDGE_VERDICT = "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
WC_SCORE = "tenmon_worldclass_acceptance_scorecard.json"
HYGIENE_SUMMARY = "tenmon_repo_hygiene_final_seal_summary.json"
WG_VERDICT = "tenmon_repo_hygiene_watchdog_verdict.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_root_from_here(here: Path) -> Path:
    return here.parents[2]


def http_req(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 90.0,
) -> tuple[int, dict[str, Any]]:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            txt = res.read().decode("utf-8", errors="replace")
            js = json.loads(txt) if txt.strip().startswith("{") else {}
            return res.getcode(), js if isinstance(js, dict) else {}
    except urllib.error.HTTPError as e:
        try:
            js = json.loads(e.read().decode("utf-8", errors="replace"))
        except Exception:
            js = {}
        return int(e.code), js if isinstance(js, dict) else {}
    except Exception as e:
        return 0, {"ok": False, "error": str(e)}


def http_ok(url: str, timeout: float = 20.0) -> tuple[bool, int]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read(65536).decode("utf-8", errors="replace")
            js = json.loads(body) if body.strip().startswith("{") else {}
            ok = res.status == 200
            if ok and isinstance(js, dict) and "ok" in js:
                ok = bool(js.get("ok"))
            return ok, res.status
    except Exception:
        return False, 0


def scope_index(order: list[str], s: str) -> int:
    try:
        return order.index(s)
    except ValueError:
        return 0


def card_max_scope(card: str, policy: dict[str, Any]) -> str:
    ovr = policy.get("card_scope_overrides") or {}
    if card in ovr:
        return str(ovr[card])
    u = card.upper()
    for rule in policy.get("scope_rules") or []:
        if not isinstance(rule, (list, tuple)) or len(rule) != 2:
            continue
        tok, sc = str(rule[0]), str(rule[1])
        if tok.upper() in u:
            return sc
    return str(policy.get("default_card_scope") or "medium")


def worldclass_route_surface_only(wc: dict[str, Any], policy: dict[str, Any]) -> bool:
    if not wc:
        return False
    kws = [str(k).lower() for k in (policy.get("route_surface_keywords") or [])]
    mf = wc.get("must_fix_before_claim") or []
    if not mf:
        return True
    for item in mf:
        s = str(item).lower()
        if not any(k in s for k in kws):
            return False
    return True


def collect_candidates(auto: Path, policy: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    order = policy.get("candidate_sources_order") or []

    nc = read_json(auto / NEXT_CARDS)
    rq = read_json(auto / RETRY_QUEUE)
    pq = read_json(auto / PRIORITY_QUEUE)
    wc = read_json(auto / WC_SCORE)
    rj = read_json(auto / REJUDGE_VERDICT)

    by_src: dict[str, list[dict[str, Any]]] = {
        "state_convergence_next_cards": [],
        "retry_queue": [],
        "self_build_priority_queue": [],
        "worldclass_recommended": [],
        "rejudge_recommended": [],
    }
    for e in nc.get("next_cards") or []:
        if isinstance(e, dict) and e.get("cursor_card"):
            by_src["state_convergence_next_cards"].append(
                {"cursor_card": e["cursor_card"], "source": e.get("source") or "surface"}
            )
    ritems = rq.get("items") if isinstance(rq.get("items"), list) else rq if isinstance(rq, list) else []
    for e in ritems or []:
        if isinstance(e, dict):
            c = e.get("cursor_card") or e.get("card") or e.get("card_name")
            if c:
                by_src["retry_queue"].append({"cursor_card": c, "source": "retry_queue"})
        elif isinstance(e, str):
            by_src["retry_queue"].append({"cursor_card": e, "source": "retry_queue"})
    pitems = pq.get("items") if isinstance(pq, dict) else pq if isinstance(pq, list) else []
    for e in pitems or []:
        if isinstance(e, dict):
            c = e.get("cursor_card") or e.get("card")
            if c:
                by_src["self_build_priority_queue"].append({"cursor_card": c, "source": "priority_queue"})
    wn = wc.get("recommended_next_card")
    if isinstance(wn, str) and wn.strip():
        by_src["worldclass_recommended"].append({"cursor_card": wn.strip(), "source": "worldclass"})
    jn = rj.get("recommended_next_card")
    if isinstance(jn, str) and jn.strip():
        by_src["rejudge_recommended"].append({"cursor_card": jn.strip(), "source": "rejudge"})

    seen: set[str] = set()
    for src in order:
        for it in by_src.get(str(src), []):
            c = str(it.get("cursor_card") or "")
            if not c or c in seen:
                continue
            seen.add(c)
            it["declared_scope"] = card_max_scope(c, policy)
            out.append(it)
    return out


def pick_one_card(
    candidates: list[dict[str, Any]],
    allowed_max: str,
    policy: dict[str, Any],
) -> dict[str, Any] | None:
    order = list(policy.get("scope_order") or ["safe", "medium", "high_risk"])
    max_ix = scope_index(order, allowed_max)
    filtered = [c for c in candidates if scope_index(order, c.get("declared_scope") or "medium") <= max_ix]
    filtered.sort(key=lambda c: scope_index(order, c.get("declared_scope") or "medium"))
    if not filtered:
        return None
    return filtered[0]


def build_card_body(
    *,
    run_id: str,
    chosen: dict[str, Any],
    allowed_max: str,
    policy: dict[str, Any],
) -> str:
    name = str(chosen.get("cursor_card") or "")
    safe_p = "\n".join(f"- {p}" for p in (policy.get("safe_scope") or {}).get("path_prefixes") or [])
    med_p = "\n".join(f"- {p}" for p in (policy.get("medium_scope") or {}).get("path_prefixes") or [])
    hi_p = "\n".join(f"- {p}" for p in (policy.get("high_risk_scope") or {}).get("path_prefixes") or [])
    return f"""CARD_NAME: {name}

OBJECTIVE:
運用自律サイクル RUN_ID=`{run_id}`。1 変更群のみ。証跡は automation 配下。

DECLARED_SCOPE: {chosen.get("declared_scope")}
ALLOWED_MAX_SCOPE: {allowed_max}
SOURCE: {chosen.get("source")}

EDIT_SCOPE (max by gate):
- safe: 
{safe_p}
- medium (+): 
{med_p}
- high_risk (explicit gate only):
{hi_p}

RUN_ID: {run_id}
OPS_CARD: {CARD}

ACCEPTANCE:
- current-run の build / audit 通過
- touched_files は許可スコープ内のみ

"""


def acquire_lock(lock_path: Path, *, stale_s: int) -> Any | None:
    _ = stale_s
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    f = open(lock_path, "a+", encoding="utf-8")
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        f.close()
        return None
    f.seek(0)
    f.truncate()
    f.write(str(os.getpid()))
    f.flush()
    return f


def release_lock(f: Any | None, lock_path: Path) -> None:
    if f is None:
        return
    try:
        fcntl.flock(f, fcntl.LOCK_UN)
    except Exception:
        pass
    try:
        f.close()
    except Exception:
        pass
    try:
        lock_path.unlink(missing_ok=True)
    except OSError:
        pass


def bundle_has_run(bundle_path: Path, run_id: str, job_id: str) -> bool:
    b = read_json(bundle_path)
    for e in b.get("entries") or []:
        if not isinstance(e, dict):
            continue
        if str(e.get("queue_id") or "") != job_id:
            continue
        snippet = str(e.get("log_snippet") or "")
        if run_id in snippet:
            return True
        if run_id in json.dumps(e, ensure_ascii=False):
            return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--base", default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"))
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--skip-dispatch", action="store_true", help="観測・分類のみ（サイクル PASS 不可）")
    ap.add_argument("--skip-rejudge", action="store_true")
    ap.add_argument("--executor-timeout", type=float, default=240.0)
    ap.add_argument("--bundle-wait-timeout", type=float, default=120.0)
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else repo_root_from_here(here)
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"

    policy = read_json(auto / POLICY_FN)
    if not policy.get("version"):
        policy = read_json(auto / POLICY_FN)

    state = read_json(auto / STATE_FN)
    stale_s = int(policy.get("lock_stale_seconds") or 14400)
    lock_path = auto / "out" / "operations_level_autonomy" / "cycle.lock"
    lock_f = acquire_lock(lock_path, stale_s=stale_s)
    if lock_f is None:
        summary = {
            "card": CARD,
            "generated_at": utc(),
            "autonomy_cycle_pass": False,
            "blocked_reason": "overlap_or_lock_held",
            "safe_scope_enforced": True,
            "high_risk_block_respected": True,
        }
        write_json(auto / OUT_SUMMARY, summary)
        write_json(auto / OUT_ENABLE_VERDICT, {**summary, "notes": ["another cycle running or stale lock"]})
        if args.stdout_json:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 2

    run_id = f"ops_{int(time.time())}_{os.getpid()}"
    cycle: dict[str, Any] = {
        "card": CARD,
        "run_id": run_id,
        "generated_at": utc(),
        "observe": {},
        "gates": {},
        "chosen": None,
        "dispatch": {},
        "verify": {},
        "rejudge": {},
        "outcome": "blocked",
        "autonomy_cycle_pass": False,
        "safe_scope_enforced": True,
        "high_risk_block_respected": True,
        "partial_run": bool(args.skip_dispatch or args.skip_rejudge),
    }

    try:
        eg = read_json(auto / EXEC_GATE)
        wg = read_json(auto / WG_VERDICT)
        hs = read_json(auto / HYGIENE_SUMMARY)
        rj = read_json(auto / REJUDGE_VERDICT)
        wc = read_json(auto / WC_SCORE)

        exec_pass = bool(eg.get("pass") is True)
        must_block_hygiene = bool(wg.get("must_block_seal", True))
        unsafe_now = int(hs.get("unsafe_unknown_count", 0) or 0) if hs else 0
        hygiene_clean = (not must_block_hygiene) and unsafe_now == 0

        prev_unsafe = state.get("last_unsafe_unknown_count")
        residue_increasing = (
            bool(must_block_hygiene)
            and isinstance(prev_unsafe, int)
            and unsafe_now > prev_unsafe
        )

        r_surface = worldclass_route_surface_only(wc, policy)

        if exec_pass and hygiene_clean and r_surface:
            allowed_max = "high_risk"
        elif exec_pass and hygiene_clean:
            allowed_max = "medium"
        else:
            allowed_max = "safe"

        env_fail = bool(rj.get("env_failure") is True)
        consecutive = int(state.get("consecutive_failures") or 0)
        cf_stop = int(policy.get("consecutive_fail_stop") or 3)

        key = (os.environ.get("FOUNDER_KEY") or os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY") or "").strip()
        remote_ok = bool(key)
        if remote_ok:
            try:
                code, _j = http_req(
                    "GET",
                    f"{args.base.rstrip('/')}/api/admin/cursor/next",
                    headers={"X-Founder-Key": key},
                    timeout=8.0,
                )
                remote_ok = code in (200, 401, 403)
            except Exception:
                remote_ok = False

        cycle["observe"] = {
            "execution_gate_pass": exec_pass,
            "repo_hygiene_must_block": bool(wg.get("must_block_seal")),
            "hygiene_summary_present": bool(hs),
            "unsafe_unknown_count": unsafe_now,
            "rejudge_pass": bool(rj.get("pass") is True),
            "env_failure": env_fail,
            "worldclass_route_surface_only": r_surface,
        }
        cycle["gates"]["allowed_max_scope"] = allowed_max

        backpressure: list[str] = []
        if residue_increasing:
            backpressure.append("hygiene_unknown_residue_increasing")
        if env_fail:
            backpressure.append("rejudge_env_failure")
        if not remote_ok and not args.skip_dispatch:
            backpressure.append("remote_executor_absent_or_unreachable")
        if consecutive >= cf_stop:
            backpressure.append("consecutive_fail_stop")
        cycle["backpressure"] = backpressure

        candidates = collect_candidates(auto, policy)
        cycle["candidates_count"] = len(candidates)

        chosen = pick_one_card(candidates, allowed_max, policy) if not backpressure else None
        if backpressure:
            chosen = None
            cycle["blocked_reason"] = "backpressure"
        elif not candidates:
            cycle["blocked_reason"] = "empty_queue"
            chosen = None
        elif chosen is None:
            cycle["blocked_reason"] = "no_card_within_allowed_scope"

        if chosen:
            cur = str(chosen.get("cursor_card"))
            lc = state.get("last_chosen_card")
            ru = bool(state.get("retry_used"))
            if lc == cur and ru:
                cycle["blocked_reason"] = "retry_exhausted_one_line"
                chosen = None

        cycle["chosen"] = chosen

        if chosen:
            cscope = str(chosen.get("declared_scope") or "medium")
            order = list(policy.get("scope_order") or ["safe", "medium", "high_risk"])
            cycle["safe_scope_enforced"] = scope_index(order, cscope) <= scope_index(order, allowed_max)
            cycle["high_risk_block_respected"] = not (
                cscope == "high_risk" and allowed_max != "high_risk"
            )

        base = args.base.rstrip("/")
        stages: list[dict[str, Any]] = []

        if chosen and not args.skip_dispatch and len(backpressure) == 0:
            body = build_card_body(run_id=run_id, chosen=chosen, allowed_max=allowed_max, policy=policy)
            code, js = http_req(
                "POST",
                f"{base}/api/admin/cursor/submit",
                data={
                    "card_name": str(chosen.get("cursor_card")),
                    "card_body_md": body,
                    "source": "tenmon_operations_level_autonomy_v1.py",
                    "force_approve": True,
                },
                headers={"Content-Type": "application/json", "X-Founder-Key": key},
            )
            item = js.get("item") if isinstance(js.get("item"), dict) else {}
            job_id = str(item.get("id") or "").strip()
            ok_sub = code == 200 and bool(js.get("ok")) and bool(job_id)
            stages.append({"name": "submit", "ok": ok_sub, "http": code, "job_id": job_id})
            if ok_sub and str(item.get("state") or "") == "approval_required":
                c2, j2 = http_req(
                    "POST",
                    f"{base}/api/admin/cursor/approve",
                    data={"id": job_id},
                    headers={"Content-Type": "application/json", "X-Founder-Key": key},
                )
                stages.append({"name": "approve", "ok": c2 == 200 and bool(j2.get("ok")), "http": c2})

            cc_sh = scripts / "remote_cursor_command_center_run_v1.sh"
            cc_ok = False
            if cc_sh.is_file():
                pr = subprocess.run(
                    ["bash", str(cc_sh)],
                    cwd=str(repo),
                    env={**os.environ, "ROOT": str(repo), "TENMON_REPO_ROOT": str(repo)},
                    capture_output=True,
                    text=True,
                    timeout=300,
                    check=False,
                )
                cc_ok = pr.returncode == 0
                stages.append({"name": "command_center", "ok": cc_ok, "returncode": pr.returncode})
            else:
                stages.append({"name": "command_center", "ok": False, "error": "missing_script"})

            pulled = False
            deadline = time.monotonic() + float(args.executor_timeout)
            while time.monotonic() < deadline and ok_sub and job_id:
                c3, j3 = http_req(
                    "GET",
                    f"{base}/api/admin/cursor/next",
                    headers={"X-Founder-Key": key},
                )
                if c3 == 200 and j3.get("ok"):
                    it = j3.get("item")
                    if isinstance(it, dict) and str(it.get("id") or "") == job_id:
                        pulled = True
                        break
                time.sleep(1.5)

            stages.append({"name": "executor_pull", "ok": pulled, "job_id": job_id})

            out_dir = auto / "out" / "operations_level_autonomy" / run_id
            out_dir.mkdir(parents=True, exist_ok=True)
            er_json = out_dir / "executor_result.json"
            er_md = out_dir / "executor_result.md"
            er_json.write_text(
                json.dumps(
                    {"run_id": run_id, "job_id": job_id, "card": CARD, "generated_at": utc()},
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            er_md.write_text(f"# Ops autonomy loopback\n\nRUN_ID={run_id}\nJOB_ID={job_id}\n", encoding="utf-8")
            touched = [
                f"api/automation/out/operations_level_autonomy/{run_id}/executor_result.json",
                f"api/automation/out/operations_level_autonomy/{run_id}/executor_result.md",
            ]
            snippet = json.dumps({"run_id": run_id, "job_id": job_id, "ops": CARD}, ensure_ascii=False)[:4000]
            ing_ok = False
            if pulled:
                c4, j4 = http_req(
                    "POST",
                    f"{base}/api/admin/cursor/result",
                    data={
                        "queue_id": job_id,
                        "touched_files": touched,
                        "build_rc": 0,
                        "acceptance_ok": True,
                        "dry_run": False,
                        "log_snippet": snippet,
                    },
                    headers={"Content-Type": "application/json", "X-Founder-Key": key},
                )
                ing_ok = c4 == 200 and bool(j4.get("ok")) and str(j4.get("status") or "") != "blocked_paths"
                stages.append({"name": "result_post", "ok": ing_ok, "http": c4})

            bundle_path = auto / "remote_cursor_result_bundle.json"
            b_deadline = time.monotonic() + float(args.bundle_wait_timeout)
            bundle_ok = False
            while time.monotonic() < b_deadline:
                if bundle_has_run(bundle_path, run_id, job_id):
                    bundle_ok = True
                    break
                time.sleep(1.5)
            stages.append({"name": "bundle_wait", "ok": bundle_ok})

            ingest_py = auto / "remote_cursor_result_ingest_v1.py"
            if ingest_py.is_file():
                subprocess.run([os.environ.get("PYTHON", "python3"), str(ingest_py)], cwd=str(auto), check=False)

            cycle["dispatch"] = {
                "stages": stages,
                "job_id": job_id,
                "loopback_ok": bool(pulled and ing_ok and bundle_ok and cc_ok),
            }

        pr_b = subprocess.run(
            ["npm", "--prefix", str(api), "run", "build"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
        ok_b = pr_b.returncode == 0
        ok_h, _ = http_ok(f"{base}/api/health")
        ok_a, _ = http_ok(f"{base}/api/audit")
        ok_ab, _ = http_ok(f"{base}/api/audit.build")
        cycle["verify"] = {
            "npm_build_ok": ok_b,
            "health_ok": ok_h,
            "audit_ok": ok_a,
            "audit_build_ok": ok_ab,
        }

        rj_rc: int | None = None
        if not args.skip_rejudge:
            rj_py = auto / "tenmon_latest_state_rejudge_and_seal_refresh_v1.py"
            if rj_py.is_file():
                prj = subprocess.run(
                    [os.environ.get("PYTHON", "python3"), str(rj_py), "--repo-root", str(repo), "--base", base],
                    cwd=str(repo),
                    capture_output=True,
                    text=True,
                    timeout=1200,
                    check=False,
                )
                rj_rc = prj.returncode
        rj2 = read_json(auto / REJUDGE_VERDICT)
        cycle["rejudge"] = {"exit_code": rj_rc, "pass": bool(rj2.get("pass") is True)}

        dispatch_ok = True
        if chosen and not args.skip_dispatch and len(backpressure) == 0:
            dispatch_ok = bool(cycle.get("dispatch", {}).get("loopback_ok"))
        verify_ok = ok_b and ok_h and ok_a and ok_ab
        rej_ok = True if args.skip_rejudge else (rj_rc == 0 and bool(rj2.get("pass") is True))

        pass_cycle = (
            bool(chosen)
            and not backpressure
            and not args.skip_dispatch
            and not args.skip_rejudge
            and not cycle["partial_run"]
            and dispatch_ok
            and verify_ok
            and rej_ok
            and cycle.get("safe_scope_enforced", True)
            and cycle.get("high_risk_block_respected", True)
        )

        cycle["autonomy_cycle_pass"] = pass_cycle
        cycle["outcome"] = "success" if pass_cycle else (cycle.get("blocked_reason") or "failed")

        prev_lc = state.get("last_chosen_card")
        ch_cur = (cycle.get("chosen") or {}).get("cursor_card")
        if pass_cycle:
            new_consecutive = 0
            new_last_chosen: str | None = None
            new_retry_used = False
        else:
            new_consecutive = consecutive + 1
            if ch_cur:
                new_last_chosen = str(ch_cur)
                new_retry_used = prev_lc == new_last_chosen
            else:
                new_last_chosen = prev_lc if isinstance(prev_lc, str) else None
                new_retry_used = bool(state.get("retry_used"))

        new_state = {
            "version": 1,
            "card": CARD,
            "last_cycle_at": utc(),
            "last_cycle_id": run_id,
            "last_outcome": cycle["outcome"],
            "consecutive_failures": new_consecutive,
            "last_chosen_card": new_last_chosen,
            "retry_used": new_retry_used,
            "last_unsafe_unknown_count": unsafe_now,
            "notes": "updated by tenmon_operations_level_autonomy_v1.py",
        }

        if cycle["partial_run"]:
            write_json(auto / STATE_FN, state)
        else:
            write_json(auto / STATE_FN, new_state)

        summary = {
            **{k: cycle[k] for k in ("card", "run_id", "generated_at", "autonomy_cycle_pass", "safe_scope_enforced", "high_risk_block_respected", "partial_run")},
            "outcome": cycle["outcome"],
            "blocked_reason": cycle.get("blocked_reason"),
            "backpressure": backpressure,
            "allowed_max_scope": allowed_max,
            "chosen": chosen,
            "candidates_count": cycle.get("candidates_count", 0),
            "observe": cycle["observe"],
            "dispatch_head": (cycle.get("dispatch") or {}).get("stages"),
            "verify": cycle["verify"],
            "rejudge": cycle["rejudge"],
            "next_on_pass": policy.get("next_on_pass"),
            "next_on_fail": policy.get("next_on_fail"),
            "policy_path": str(auto / POLICY_FN),
            "state_path": str(auto / STATE_FN),
        }
        write_json(auto / OUT_SUMMARY, summary)

        verdict_doc = {
            "card": CARD,
            "generated_at": utc(),
            "autonomy_cycle_pass": pass_cycle,
            "safe_scope_enforced": cycle["safe_scope_enforced"],
            "high_risk_block_respected": cycle["high_risk_block_respected"],
            "allow_product_core_flag": allowed_max != "safe",
            "notes": [
                "autonomy_cycle_pass: dispatch+verify+rejudge current-run",
                "safe_scope_enforced: chosen scope <= allowed_max",
            ],
        }
        write_json(auto / OUT_ENABLE_VERDICT, verdict_doc)

        md = [
            f"# {CARD}",
            "",
            f"- run_id: `{run_id}`",
            f"- **autonomy_cycle_pass**: `{pass_cycle}`",
            f"- outcome: `{cycle['outcome']}`",
            f"- allowed_max_scope: `{allowed_max}`",
            "",
            "## Chosen",
            "```json",
            json.dumps(chosen, ensure_ascii=False, indent=2) if chosen else "{}",
            "```",
            "",
            "## Backpressure",
            "\n".join(f"- `{b}`" for b in backpressure) or "- (none)",
        ]
        (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

        if args.stdout_json:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0 if pass_cycle else 1
    finally:
        release_lock(lock_f, lock_path)


if __name__ == "__main__":
    raise SystemExit(main())
