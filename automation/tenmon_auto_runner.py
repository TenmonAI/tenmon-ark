#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import pathlib
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request
from typing import Any

LOCK_PATH = "/var/lock/tenmon_auto_runner.lock"
STATE_PATH = "/var/log/tenmon/auto_state.json"


def utc_ts() -> str:
    return dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def utc_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


class RunnerError(Exception):
    def __init__(self, stage: str, message: str, exit_code: int = 1):
        super().__init__(message)
        self.stage = stage
        self.exit_code = exit_code


class Logger:
    def __init__(self, log_path: pathlib.Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.fp = self.log_path.open("a", encoding="utf-8")

    def write(self, msg: str = "") -> None:
        print(msg)
        self.fp.write(msg + "\n")
        self.fp.flush()

    def close(self) -> None:
        self.fp.close()


def run_cmd(
    cmd: str,
    *,
    cwd: str | None,
    logger: Logger,
    env: dict[str, str] | None = None,
    timeout: int = 1800,
) -> subprocess.CompletedProcess[str]:
    logger.write(f"$ {cmd}")
    p = subprocess.run(
        ["bash", "-lc", cmd],
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        timeout=timeout,
    )
    if p.stdout:
        logger.write(p.stdout.rstrip("\n"))
    if p.stderr:
        logger.write(p.stderr.rstrip("\n"))
    return p


def http_json(url: str, payload: dict[str, Any] | None = None, timeout: int = 20) -> dict[str, Any]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def parse_git_status(repo: str) -> list[str]:
    p = subprocess.run(
        ["bash", "-lc", "git status --porcelain"],
        cwd=repo,
        text=True,
        capture_output=True,
        timeout=60,
    )
    lines = p.stdout.splitlines()
    out: list[str] = []
    for line in lines:
        if len(line) < 4:
            continue
        out.append(line[3:])
    return out


def path_allowed(path_text: str, allow_rules: list[str]) -> bool:
    for rule in allow_rules:
        if rule.endswith("/"):
            if path_text == rule[:-1] or path_text.startswith(rule):
                return True
        else:
            if path_text == rule:
                return True
    return False


def bad_dirty_paths(repo: str, allow_rules: list[str]) -> list[str]:
    dirty = parse_git_status(repo)
    return [p for p in dirty if not path_allowed(p, allow_rules)]


def load_json(path: pathlib.Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: pathlib.Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def classify_failure(stage: str, exit_code: int, message: str) -> str:
    if stage == "apply" and exit_code == 90:
        return "apply_not_wired"
    if stage == "precheck":
        return "precheck_fail"
    if stage == "apply":
        return "apply_fail"
    if stage == "build":
        return "build_fail"
    if stage == "restart":
        return "restart_fail"
    if stage == "audit":
        return "audit_fail"
    if stage == "probe":
        return "probe_fail"
    if stage == "repo":
        return "repo_dirty_fail"
    return "unknown_fail"


def write_freeze(
    *,
    card_name: str,
    logdir: pathlib.Path,
    repo: str,
    audit_json: dict[str, Any] | None,
    next_card: str | None,
    status: str,
) -> None:
    git_sha = subprocess.check_output(
        ["bash", "-lc", "git rev-parse --short HEAD"], cwd=repo, text=True
    ).strip()
    git_status = subprocess.check_output(
        ["bash", "-lc", "git status --short"], cwd=repo, text=True
    ).strip()
    freeze_path = pathlib.Path(f"/var/log/tenmon/{card_name}_AUTO_FREEZE_V1.txt")
    body = [
        f"# {card_name} AUTO FREEZE",
        f"- status: {status}",
        f"- generated_at_utc: {utc_iso()}",
        f"- git_sha: {git_sha}",
        f"- logdir: {logdir}",
        f"- next_card: {next_card or ''}",
        "",
        "## audit",
        json.dumps(audit_json or {}, ensure_ascii=False, indent=2),
        "",
        "## git_status",
        git_status,
        "",
    ]
    freeze_path.write_text("\n".join(body), encoding="utf-8")


def find_next_card(queue: dict[str, Any], state: dict[str, Any]) -> dict[str, Any] | None:
    cards: list[dict[str, Any]] = queue.get("cards", [])
    current_name = state.get("current_card")
    statuses = state.setdefault("cards", {})

    if current_name:
        for c in cards:
            if c["name"] == current_name and c.get("enabled", True):
                return c

    for c in cards:
        if not c.get("enabled", True):
            continue
        if statuses.get(c["name"], {}).get("status") != "pass":
            return c
    return None


def run_card(queue: dict[str, Any], state: dict[str, Any], card: dict[str, Any]) -> int:
    repo = queue["repo"]
    api = queue["api"]
    base_url = queue["base_url"]
    service = card.get("restart_service") or queue.get("service")
    global_allow = queue.get("global_allowed_dirty_paths", [])
    card_allow = card.get("allowed_dirty_paths", [])
    allow_rules = global_allow + card_allow

    card_name = card["name"]
    ts = utc_ts()
    logdir = pathlib.Path(f"/var/log/tenmon/card_{card_name}/{ts}")
    logger = Logger(logdir / "run.log")
    logger.write(f"[CARD] {card_name}")
    logger.write(f"[TIME_UTC] {ts}")

    statuses = state.setdefault("cards", {})
    statuses.setdefault(card_name, {})
    statuses[card_name]["last_started_at"] = utc_iso()

    audit_json = None

    try:
        logger.write("")
        logger.write("== OBS 0) identity ==")
        p = run_cmd("git rev-parse --short HEAD && git status --short", cwd=repo, logger=logger)
        if p.returncode != 0:
            raise RunnerError("precheck", "git identity failed", p.returncode)

        logger.write("")
        logger.write("== OBS 1) audit ==")
        audit_json = http_json(f"{base_url}/api/audit")
        logger.write(json.dumps(audit_json, ensure_ascii=False, indent=2))

        for cmd in card.get("precheck", []):
            logger.write("")
            logger.write("== PRECHECK ==")
            p = run_cmd(cmd, cwd=repo, logger=logger)
            if p.returncode != 0:
                raise RunnerError("precheck", f"precheck failed: {cmd}", p.returncode)

        apply_cmd = card.get("apply_cmd")
        if apply_cmd:
            logger.write("")
            logger.write("== APPLY ==")
            env = os.environ.copy()
            env.update(
                {
                    "CARD_NAME": card_name,
                    "REPO": repo,
                    "API": api,
                    "BASE_URL": base_url,
                    "LOGDIR": str(logdir),
                    "CARD_PROMPT_FILE": str(card.get("prompt_file", "")),
                }
            )
            p = run_cmd(apply_cmd, cwd=repo, logger=logger, env=env)
            if p.returncode != 0:
                raise RunnerError("apply", f"apply failed: {apply_cmd}", p.returncode)

        if card.get("build", True):
            logger.write("")
            logger.write("== BUILD ==")
            p = run_cmd("npm -s run build", cwd=api, logger=logger)
            if p.returncode != 0:
                raise RunnerError("build", "npm build failed", p.returncode)

        if service:
            logger.write("")
            logger.write("== RESTART + AUDIT ==")
            p = run_cmd(f"sudo systemctl restart {service}", cwd=repo, logger=logger)
            if p.returncode != 0:
                raise RunnerError("restart", f"systemctl restart {service} failed", p.returncode)
            time.sleep(int(card.get("settle_seconds", 2)))
            audit_json = http_json(f"{base_url}/api/audit")
            logger.write(json.dumps(audit_json, ensure_ascii=False, indent=2))
            expected_stage = card.get("audit_stage", "READY")
            if audit_json.get("stage") != expected_stage and audit_json.get("readiness", {}).get("stage") != expected_stage:
                raise RunnerError("audit", f"audit stage mismatch: expected {expected_stage}", 1)

        for probe in card.get("probes", []):
            logger.write("")
            logger.write(f"== PROBE {probe['message']} ==")
            res = http_json(
                f"{base_url}/api/chat",
                payload={"message": probe["message"], "threadId": probe["threadId"]},
                timeout=30,
            )
            logger.write(json.dumps(res, ensure_ascii=False, indent=2))
            ku = (((res.get("decisionFrame") or {}).get("ku")) or {})
            rr = ku.get("routeReason")
            if probe.get("expect_route") and rr != probe["expect_route"]:
                raise RunnerError("probe", f"route mismatch: {rr} != {probe['expect_route']}", 1)
            mf = ku.get("meaningFrame") or {}
            if probe.get("expect_topicClass") and mf.get("topicClass") != probe["expect_topicClass"]:
                raise RunnerError("probe", f"topicClass mismatch: {mf.get('topicClass')} != {probe['expect_topicClass']}", 1)
            if probe.get("expect_intention_schema"):
                intent = ku.get("intention") or {}
                if intent.get("schema") != probe["expect_intention_schema"]:
                    raise RunnerError("probe", "intention schema mismatch", 1)
            for text in probe.get("expect_contains", []):
                if text not in (res.get("response") or ""):
                    raise RunnerError("probe", f"response missing text: {text}", 1)

        logger.write("")
        logger.write("== REPO STATUS CHECK ==")
        bad_paths = bad_dirty_paths(repo, allow_rules)
        if bad_paths:
            logger.write("bad_dirty_paths=" + json.dumps(bad_paths, ensure_ascii=False, indent=2))
            raise RunnerError("repo", "repo has unexpected dirty paths", 1)
        logger.write("repo_dirty_ok=true")

        statuses[card_name]["status"] = "pass"
        statuses[card_name]["last_passed_at"] = utc_iso()
        statuses[card_name]["gitSha"] = audit_json.get("gitSha") if audit_json else ""
        next_card = card.get("next_on_pass")
        state["current_card"] = next_card or ""
        write_freeze(
            card_name=card_name,
            logdir=logdir,
            repo=repo,
            audit_json=audit_json,
            next_card=next_card,
            status="pass",
        )
        logger.write("")
        logger.write(f"[PASS] {card_name}")
        logger.write(f"[NEXT] {next_card or '(auto-next by queue order)'}")
        return 0

    except RunnerError as e:
        cls = classify_failure(e.stage, e.exit_code, str(e))
        statuses[card_name]["status"] = "fail"
        statuses[card_name]["last_failed_at"] = utc_iso()
        statuses[card_name]["fail_stage"] = e.stage
        statuses[card_name]["fail_class"] = cls
        statuses[card_name]["fail_message"] = str(e)
        next_card = card.get("next_on_fail") or card_name
        state["current_card"] = next_card
        write_freeze(
            card_name=card_name,
            logdir=logdir,
            repo=repo,
            audit_json=audit_json,
            next_card=next_card,
            status=f"fail:{cls}",
        )
        logger.write("")
        logger.write(f"[FAIL] stage={e.stage} class={cls} message={e}")
        logger.write(f"[NEXT_ON_FAIL] {next_card}")
        return e.exit_code or 1

    except Exception as e:
        statuses[card_name]["status"] = "fail"
        statuses[card_name]["last_failed_at"] = utc_iso()
        statuses[card_name]["fail_stage"] = "runner"
        statuses[card_name]["fail_class"] = "runner_exception"
        statuses[card_name]["fail_message"] = str(e)
        state["current_card"] = card_name
        logger.write("")
        logger.write("[FAIL] runner_exception")
        logger.write(traceback.format_exc())
        write_freeze(
            card_name=card_name,
            logdir=logdir,
            repo=repo,
            audit_json=audit_json,
            next_card=card_name,
            status="fail:runner_exception",
        )
        return 1

    finally:
        save_json(pathlib.Path(STATE_PATH), state)
        logger.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue", required=True)
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--interval", type=int, default=120)
    args = ap.parse_args()

    lock_fp = open(LOCK_PATH, "w")
    try:
        fcntl.flock(lock_fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("[SKIP] another runner instance is active")
        return 0

    queue = load_json(pathlib.Path(args.queue), {})
    if queue.get("schema") != "TENMON_AUTO_QUEUE_V1":
        print("[ERROR] queue schema mismatch")
        return 2

    state = load_json(pathlib.Path(STATE_PATH), {"schema": "TENMON_AUTO_STATE_V1", "cards": {}, "current_card": ""})

    def _tick() -> int:
        card = find_next_card(queue, state)
        if not card:
            print("[INFO] no enabled pending cards")
            return 0
        return run_card(queue, state, card)

    if args.once:
        return _tick()

    while True:
        _tick()
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())