#!/usr/bin/env python3
"""
TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1
単一 verdict: source priority — lived recheck > autoloop > handoff（stale は参考のみ）
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1"

MAJOR_LIVED = {
    "url_sync_missing",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "continuity_fail",
    "duplicate_or_bleed_fail",
}

FINGERPRINT_FILES = [
    "web/src/hooks/useChat.ts",
    "web/src/components/gpt/GptShell.tsx",
    "web/src/components/gpt/ChatLayout.tsx",
    "web/src/api/chat.ts",
    "web/src/types/chat.ts",
]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def sha256_file(path: Path) -> str | None:
    try:
        h = hashlib.sha256()
        h.update(path.read_bytes())
        return h.hexdigest()
    except Exception:
        return None


def unified_fingerprint_sha256_v1(
    *,
    git_sha: str,
    tenmon_autoloop_exit: str,
    lived_ok: bool,
    autoloop_final_ready: bool,
    autoloop_exit_ok: bool,
    recheck_verdict: dict[str, Any],
    fingerprints: dict[str, str],
) -> str:
    """単一 verdict と regression guard に共通の SHA256（ソース優先順の結果を固定化）。"""
    payload = {
        "card": CARD,
        "git_sha": git_sha,
        "tenmon_autoloop_exit": tenmon_autoloop_exit,
        "lived_ok": lived_ok,
        "autoloop_final_ready": autoloop_final_ready,
        "autoloop_exit_ok": autoloop_exit_ok,
        "lived_recheck_verdict": recheck_verdict,
        "fingerprints_sha256_readonly": dict(sorted(fingerprints.items())),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("repo_root", type=str)
    ap.add_argument("--out-verdict", type=str, required=True)
    ap.add_argument("--out-regression", type=str, required=True)
    ap.add_argument("--git-sha", type=str, default="")
    args = ap.parse_args()

    root = Path(args.repo_root).resolve()
    auto = root / "api" / "automation"
    snap_path = auto / "pwa_seal_lived_snapshot.json"

    snap = read_json(snap_path)
    autoloop_ready = read_json(auto / "pwa_final_completion_readiness.json")
    autoloop_blockers_doc = read_json(auto / "pwa_final_completion_blockers.json")
    autoloop_state = read_json(auto / "pwa_final_autoloop_state.json")
    handoff = read_json(auto / "final_pwa_completion_readiness.json")

    env_verdict = os.environ.get("TENMON_LIVED_RECHECK_FINAL_VERDICT", "").strip()
    recheck_path = Path(env_verdict) if env_verdict else (auto / "pwa_lived_gate_recheck_final_verdict.json")
    recheck_verdict: dict[str, Any] = {}
    recheck_resolved = "none"
    if recheck_path.exists():
        recheck_verdict = read_json(recheck_path)
        recheck_resolved = "file"
    elif isinstance(snap.get("lived_recheck_verdict"), dict) and snap["lived_recheck_verdict"]:
        # ファイルが無い場合は pre-autoloop スナップショットの recheck を優先（stale 混入時のフォールバック）
        recheck_verdict = snap["lived_recheck_verdict"]
        recheck_resolved = "pwa_seal_lived_snapshot"

    # lived: snapshot の major + 明示 recheck verdict
    blk_pre = snap.get("blockers") if isinstance(snap.get("blockers"), list) else []
    lived_has_major = any(b in MAJOR_LIVED for b in blk_pre)
    lived_ok = not lived_has_major
    if recheck_verdict:
        lived_ok = bool(recheck_verdict.get("pass", lived_ok))
        maj = recheck_verdict.get("major_remaining") or []
        if isinstance(maj, list) and len(maj) > 0:
            lived_ok = False

    autoloop_exit_raw = os.environ.get("TENMON_AUTOLOOP_EXIT", "").strip()
    autoloop_exit_ok = autoloop_exit_raw == "" or autoloop_exit_raw == "0"
    try:
        autoloop_exit_int: int | None = int(autoloop_exit_raw) if autoloop_exit_raw != "" else None
    except ValueError:
        autoloop_exit_int = None

    autoloop_pass = bool(autoloop_ready.get("final_ready"))
    handoff_note = bool(handoff) and not handoff.get("final_pwa_completion_readiness", True)

    # 優先順: (1) lived recheck / snapshot major (2) final autoloop final_ready (3) handoff は参考のみ・統合判定に混ぜない
    # autoloop プロセスが非ゼロ終了なら readiness JSON が green でも FAIL（TENMON_AUTOLOOP_EXIT）
    unified_pass = autoloop_pass and lived_ok and autoloop_exit_ok

    fingerprints: dict[str, str] = {}
    for rel in FINGERPRINT_FILES:
        p = root / rel
        d = sha256_file(p)
        if d:
            fingerprints[rel] = d

    fp_unified = unified_fingerprint_sha256_v1(
        git_sha=(args.git_sha or "").strip(),
        tenmon_autoloop_exit=autoloop_exit_raw,
        lived_ok=lived_ok,
        autoloop_final_ready=autoloop_pass,
        autoloop_exit_ok=autoloop_exit_ok,
        recheck_verdict=recheck_verdict if isinstance(recheck_verdict, dict) else {},
        fingerprints=fingerprints,
    )

    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "git_sha": (args.git_sha or "").strip(),
        "unified_fingerprint_sha256": fp_unified,
        "tenmon_autoloop_exit": autoloop_exit_int,
        "verdict_source_priority": [
            "lived_recheck_executed",
            "final_autoloop_executed",
            "handoff_stale_report",
        ],
        "sources_used": {
            "pwa_seal_lived_snapshot": str(snap_path) if snap_path.exists() else None,
            "lived_recheck_verdict": str(recheck_path) if recheck_path.exists() else None,
            "lived_recheck_resolved_from": recheck_resolved,
            "pwa_final_completion_readiness": str(auto / "pwa_final_completion_readiness.json"),
            "pwa_final_completion_blockers": str(auto / "pwa_final_completion_blockers.json"),
            "pwa_final_autoloop_state": str(auto / "pwa_final_autoloop_state.json"),
            "handoff_final_pwa_completion_readiness": str(auto / "final_pwa_completion_readiness.json"),
        },
        "lived_recheck_verdict": recheck_verdict,
        "pwa_final_autoloop_state": autoloop_state,
        "signals": {
            "lived_ok": lived_ok,
            "autoloop_final_ready": autoloop_pass,
            "autoloop_exit_ok": autoloop_exit_ok,
            "handoff_suggests_incomplete": handoff_note,
            "unified_pass": unified_pass,
        },
        "readiness_snapshot": autoloop_ready,
        "blockers_snapshot": autoloop_blockers_doc.get("blockers", []),
        "pre_autoloop_blockers": blk_pre,
        "fingerprints_sha256_readonly": fingerprints,
        "autoloop_completion_final_ready": autoloop_pass,
        "final_ready": unified_pass,
        "cosmetic_residual_only": bool(autoloop_ready.get("cosmetic_residual_only")),
        "pass": unified_pass,
        "remaining_blockers": autoloop_blockers_doc.get("blockers", []),
    }

    out_v = Path(args.out_verdict)
    out_v.parent.mkdir(parents=True, exist_ok=True)
    out_v.write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # PASS のみ regression guard を発行（FAIL では上書きしない）
    out_g = Path(args.out_regression)
    if unified_pass:
        guard = {
            "card": CARD,
            "generated_at": verdict["generated_at"],
            "git_sha": verdict["git_sha"],
            "unified_fingerprint_sha256": fp_unified,
            "source_verdict_path": str(out_v.resolve()),
            "readiness_snapshot": autoloop_ready,
            "blockers_snapshot": autoloop_blockers_doc,
            "timestamp_utc": verdict["generated_at"],
            "fingerprints_sha256_readonly": fingerprints,
            "verdict_source_priority": verdict["verdict_source_priority"],
            "guard_rules": [
                "優先順: lived recheck > final autoloop > handoff/stale",
                "unified_pass=false のとき seal / regression を発行しない",
                "TENMON_AUTOLOOP_EXIT != 0 のとき JSON が green でも統合 FAIL",
            ],
        }
        out_g.write_text(json.dumps(guard, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": unified_pass, "verdict_path": str(out_v)}, ensure_ascii=False, indent=2))
    return 0 if unified_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
