#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1
改善履歴を JSONL に追記（1 行 1 エントリ）。seal 成果物・任意 JSON・touch リストから機械可読エントリを生成。
観測と ledger 追記のみ。product core 非改変。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_R1_20A_DETAILPLAN_STABILIZE_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_IMPROVEMENT_LEDGER_RETRY_CURSOR_AUTO_V1"
SCHEMA_VERSION = 1
DEFAULT_JSONL = "improvement_ledger_entries_v1.jsonl"
TAIL_FOR_RECURRENCE = 80

# append-json 最低限（longform は seal 由来では残すが任意入力ではデフォルト補完）
ENTRY_MIN_KEYS = frozenset(
    {
        "card_name",
        "touched_files",
        "blocker_types",
        "acceptance_result",
        "runtime_result",
        "surface_result",
        "route_result",
        "density_result",
        "recurrence_signals",
        "next_card",
        "summary_human_ja",
        "summary_machine",
        "outcome_class",
    }
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_jsonl_path() -> Path:
    return _repo_api() / "automation" / DEFAULT_JSONL


def _runtime_matrix_summary(runtime: Dict[str, Any]) -> Dict[str, Any]:
    ok_n = tot = 0
    failed: List[str] = []
    for k, row in runtime.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if row.get("ok"):
            ok_n += 1
        else:
            failed.append(str(k))
    ratio = (ok_n / tot) if tot else 0.0
    return {
        "probe_total": tot,
        "probe_ok": ok_n,
        "probe_ok_ratio": round(ratio, 4),
        "failed_probe_names": failed,
        "chat_ts_runtime_100": bool(tot > 0 and ok_n == tot),
    }


def _surface_summary(final: Dict[str, Any], surface: Dict[str, Any]) -> Dict[str, Any]:
    noise_rows = 0
    noise_hits_total = 0
    if isinstance(surface, dict):
        for _k, row in surface.items():
            if not isinstance(row, dict) or not row.get("ok"):
                continue
            hits = row.get("noise_hits") or []
            if hits:
                noise_rows += 1
                noise_hits_total += len(hits)
    return {
        "surface_clean": bool(final.get("surface_clean")),
        "noise_rows": noise_rows,
        "noise_hits_total": noise_hits_total,
    }


def _route_summary(final: Dict[str, Any], route_audit: Dict[str, Any]) -> Dict[str, Any]:
    flags = route_audit.get("flags") if isinstance(route_audit.get("flags"), dict) else {}
    return {
        "route_authority_clean": bool(final.get("route_authority_clean")),
        "audit_flags": flags,
    }


def _longform_summary(final: Dict[str, Any], lf_audit: Dict[str, Any]) -> Dict[str, Any]:
    lf = lf_audit.get("longform_1") if isinstance(lf_audit.get("longform_1"), dict) else {}
    return {
        "longform_quality_clean": bool(final.get("longform_quality_clean")),
        "longform_1": {
            "response_len": lf.get("response_len"),
            "has_mitate": lf.get("has_mitate"),
            "has_tenkai": lf.get("has_tenkai"),
            "has_rakuchi": lf.get("has_rakuchi"),
            "looks_system_diagnosis_short": lf.get("looks_system_diagnosis_short"),
        },
    }


def _density_summary(final: Dict[str, Any], density: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "density_lock": bool(final.get("density_lock")),
        "density_lock_reasons": list(density.get("density_lock_reasons") or []),
        "advisory_warnings": list(density.get("advisory_warnings") or []),
    }


def _next_cards_from_supplement(supp: Dict[str, Any]) -> Tuple[str, str, List[Dict[str, Any]]]:
    cands: List[Dict[str, Any]] = []
    for d in supp.get("dispatch") or []:
        if not isinstance(d, dict):
            continue
        cands.append(
            {
                "cursor_card": str(d.get("cursor_card") or ""),
                "vps_card": str(d.get("vps_card") or ""),
                "from_blocker": str(d.get("blocker") or ""),
            }
        )
    primary_c = cands[0]["cursor_card"] if cands else ""
    primary_v = cands[0]["vps_card"] if cands else ""
    return primary_c, primary_v, cands


def _read_os_fail_next(seal: Path) -> Tuple[str, str]:
    p = seal / "_self_improvement_os" / "os_fail_next_dispatch.json"
    d = _read_json(p)
    return str(d.get("fail_next_cursor_card") or ""), str(d.get("fail_next_vps_hint") or "")


def _load_touched_files(path: Optional[Path], git_ref: Optional[str], repo: Path) -> List[str]:
    out: List[str] = []
    if path and path.is_file():
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            s = line.strip()
            if s and not s.startswith("#"):
                out.append(s)
    if git_ref:
        try:
            r = subprocess.run(
                ["git", "-C", str(repo), "diff", "--name-only", git_ref],
                capture_output=True,
                text=True,
                check=False,
                timeout=60,
            )
            if r.returncode == 0 and r.stdout:
                out.extend([x.strip() for x in r.stdout.splitlines() if x.strip()])
        except Exception:
            pass
    # de-dupe preserve order
    seen = set()
    dedup: List[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            dedup.append(x)
    return dedup


def _tail_jsonl_entries(jsonl: Path, n: int) -> List[Dict[str, Any]]:
    if not jsonl.is_file():
        return []
    lines = jsonl.read_text(encoding="utf-8", errors="replace").splitlines()
    tail = lines[-n:] if len(lines) > n else lines
    entries: List[Dict[str, Any]] = []
    for ln in tail:
        ln = ln.strip()
        if not ln:
            continue
        try:
            entries.append(json.loads(ln))
        except Exception:
            continue
    return entries


def _recurrence_for_blockers(
    jsonl: Path, current_blockers: List[str], tail: int
) -> Tuple[Dict[str, int], List[str], int]:
    prev = _tail_jsonl_entries(jsonl, tail)
    counts: Counter[str] = Counter()
    for ent in prev:
        for b in ent.get("blocker_types") or []:
            if isinstance(b, str) and b:
                counts[b] += 1
    cur_set = [b for b in current_blockers if isinstance(b, str) and b]
    per_current: Dict[str, int] = {}
    notes: List[str] = []
    for b in cur_set:
        per_current[b] = int(counts.get(b, 0))
        if counts.get(b, 0) >= 2:
            notes.append(f"blocker_repeat_tail:{b}×{counts[b]}")
    return per_current, notes, len(prev)


def _outcome_class(
    acceptance: str, recurrence_notes: List[str], overall_ok: bool
) -> str:
    if overall_ok:
        return "success"
    if any("blocker_repeat_tail:" in n for n in recurrence_notes):
        return "recurrence"
    if acceptance == "fail":
        return "failure"
    return "partial"


def _blocker_fingerprint(blockers: List[str]) -> str:
    if not blockers:
        return "none"
    return "|".join(sorted(set(blockers)))


def build_entry_from_seal(
    seal_dir: Path,
    card_name: str,
    touched_files: List[str],
    seal_exit_code: int,
    jsonl_path: Path,
) -> Dict[str, Any]:
    seal_dir = seal_dir.resolve()
    final = _read_json(seal_dir / "final_verdict.json")
    surface = _read_json(seal_dir / "surface_audit.json")
    runtime = _read_json(seal_dir / "runtime_matrix.json")
    route_audit = _read_json(seal_dir / "route_authority_audit.json")
    lf_audit = _read_json(seal_dir / "longform_audit.json")
    density = _read_json(seal_dir / "density_lock_verdict.json")
    supp = _read_json(seal_dir / "_completion_supplement" / "next_card_dispatch.json")

    blockers = list(final.get("blockers") or [])
    if not isinstance(blockers, list):
        blockers = []

    overall_ok = bool(final.get("chat_ts_overall_100"))
    acceptance = "pass" if overall_ok else "fail"
    if not final:
        acceptance = "unknown"

    rt = _runtime_matrix_summary(runtime)
    sf = _surface_summary(final, surface)
    rr = _route_summary(final, route_audit)
    lf = _longform_summary(final, lf_audit)
    dn = _density_summary(final, density)

    pc, pv, cands = _next_cards_from_supplement(supp)
    os_c, os_v = _read_os_fail_next(seal_dir)
    if not pc and os_c:
        pc, pv = os_c, os_v or ""
    if os_c and all(c.get("cursor_card") != os_c for c in cands):
        cands.append(
            {"cursor_card": os_c, "vps_card": os_v or "", "from_blocker": "self_improvement_os_dispatch"}
        )

    rec_counts, rec_notes, compared = _recurrence_for_blockers(jsonl_path, blockers, TAIL_FOR_RECURRENCE)
    outcome = _outcome_class(acceptance, rec_notes, overall_ok)

    axes_ok = {
        "runtime": bool(rt.get("chat_ts_runtime_100")),
        "surface": bool(sf.get("surface_clean")),
        "route": bool(rr.get("route_authority_clean")),
        "longform": bool(lf.get("longform_quality_clean")),
        "density": bool(dn.get("density_lock")),
        "static": bool(final.get("chat_ts_static_100")),
    }
    failed_axes = [k for k, v in axes_ok.items() if not v]
    effective_axes = [k for k, v in axes_ok.items() if v]

    summary_machine: Dict[str, Any] = {
        "axes_ok": axes_ok,
        "effective_axes": effective_axes,
        "failed_axes": failed_axes,
        "blocker_fingerprint": _blocker_fingerprint(blockers),
        "seal_exit_code": seal_exit_code,
    }

    if overall_ok:
        human = (
            f"[成功] {card_name}: overall 100。効いた軸: {','.join(effective_axes) or '—'}。"
        )
    else:
        human = (
            f"[未達] {card_name}: blockers={len(blockers)}件。"
            f" 失敗軸: {','.join(failed_axes) or '—'}。"
            f" 次候補: {pc or '（dispatch 要確認）'}"
        )
        if rec_notes:
            human += " 再発傾向: " + "; ".join(rec_notes[:3])

    next_obj: Dict[str, Any] = {
        "primary_cursor": pc,
        "primary_vps": pv,
        "candidates": cands,
    }
    entry: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "entry_id": str(uuid.uuid4()),
        "recorded_at": _utc_now_iso(),
        "ledger_card": CARD,
        "card_name": card_name,
        "source_kind": "seal_dir",
        "seal_dir": str(seal_dir),
        "outcome_class": outcome,
        "acceptance_result": acceptance,
        "blocker_types": blockers,
        "runtime_result": rt,
        "surface_result": sf,
        "route_result": rr,
        "longform_result": lf,
        "density_result": dn,
        "recurrence_signals": {
            "blocker_recurrence_counts": rec_counts,
            "notes": rec_notes,
            "compared_tail_entries": compared,
        },
        "next_card": next_obj,
        "next_card_primary_cursor": pc,
        "touched_files": touched_files,
        "summary_human_ja": human,
        "summary_machine": summary_machine,
    }
    return entry


def append_jsonl(jsonl: Path, entry: Dict[str, Any]) -> None:
    jsonl.parent.mkdir(parents=True, exist_ok=True)
    with jsonl.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _normalize_append_json_entry(raw: Dict[str, Any]) -> Dict[str, Any]:
    """append-json: 必須キー検査と longform / next_card_primary 補完（捏造なし・欠損は null/空で明示）。"""
    missing = sorted(ENTRY_MIN_KEYS - set(raw.keys()))
    if missing:
        raise ValueError(f"missing_keys:{','.join(missing)}")
    out = dict(raw)
    if "longform_result" not in out:
        out["longform_result"] = {
            "longform_quality_clean": None,
            "longform_1": {},
        }
    if "schema_version" not in out:
        out["schema_version"] = SCHEMA_VERSION
    if "entry_id" not in out:
        out["entry_id"] = str(uuid.uuid4())
    if "recorded_at" not in out:
        out["recorded_at"] = _utc_now_iso()
    if "ledger_card" not in out:
        out["ledger_card"] = CARD
    nc = out.get("next_card")
    if isinstance(nc, dict) and "next_card_primary_cursor" not in out:
        out["next_card_primary_cursor"] = str(nc.get("primary_cursor") or "")
    return out


def emit_sample_entry() -> Dict[str, Any]:
    pc = "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1"
    pv = "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1"
    return {
        "schema_version": SCHEMA_VERSION,
        "entry_id": "sample-entry-id-replace-me",
        "recorded_at": _utc_now_iso(),
        "ledger_card": CARD,
        "card_name": "TENMON_IMPROVEMENT_LEDGER_SAMPLE_V1",
        "source_kind": "cli_minimal",
        "seal_dir": "/var/log/tenmon/card_EXAMPLE/20260101T000000Z",
        "outcome_class": "failure",
        "acceptance_result": "fail",
        "blocker_types": ["surface_noise_remaining"],
        "runtime_result": {
            "probe_total": 10,
            "probe_ok": 10,
            "probe_ok_ratio": 1.0,
            "failed_probe_names": [],
            "chat_ts_runtime_100": True,
        },
        "surface_result": {"surface_clean": False, "noise_rows": 2, "noise_hits_total": 3},
        "route_result": {"route_authority_clean": True, "audit_flags": {}},
        "longform_result": {
            "longform_quality_clean": True,
            "longform_1": {
                "response_len": 2000,
                "has_mitate": True,
                "has_tenkai": True,
                "has_rakuchi": True,
                "looks_system_diagnosis_short": False,
            },
        },
        "density_result": {
            "density_lock": True,
            "density_lock_reasons": [],
            "advisory_warnings": [],
        },
        "recurrence_signals": {
            "blocker_recurrence_counts": {"surface_noise_remaining": 2},
            "notes": ["blocker_repeat_tail:surface_noise_remaining×2"],
            "compared_tail_entries": 5,
        },
        "next_card": {
            "primary_cursor": pc,
            "primary_vps": pv,
            "candidates": [
                {
                    "cursor_card": pc,
                    "vps_card": pv,
                    "from_blocker": "surface_noise_remaining",
                }
            ],
        },
        "next_card_primary_cursor": pc,
        "touched_files": ["api/automation/example.py"],
        "summary_human_ja": "[未達] サンプル: surface にノイズ残存。次は Stage1 surface カード。",
        "summary_machine": {
            "axes_ok": {
                "runtime": True,
                "surface": False,
                "route": True,
                "longform": True,
                "density": True,
                "static": True,
            },
            "effective_axes": ["runtime", "route", "longform", "density", "static"],
            "failed_axes": ["surface"],
            "blocker_fingerprint": "surface_noise_remaining",
            "seal_exit_code": 1,
        },
    }


def cmd_append_from_seal(ns: argparse.Namespace) -> int:
    seal = Path(ns.seal_dir).resolve()
    jsonl = Path(ns.jsonl_out).resolve() if ns.jsonl_out else _default_jsonl_path()
    repo = Path(ns.repo_root).resolve() if ns.repo_root else _repo_api().parent
    touched = _load_touched_files(
        Path(ns.touched_files).resolve() if ns.touched_files else None,
        ns.git_since,
        repo,
    )
    card = ns.card_name or ns.card or "UNKNOWN_CARD"
    entry = build_entry_from_seal(seal, card, touched, int(ns.seal_exit_code), jsonl)
    if ns.dry_run:
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        return 0
    append_jsonl(jsonl, entry)
    if ns.stdout_json:
        print(
            json.dumps(
                {
                    "appended": True,
                    "entry_id": entry["entry_id"],
                    "jsonl": str(jsonl),
                    "next_on_pass": NEXT_ON_PASS,
                    "retry_card": RETRY_CARD,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


def cmd_append_json(ns: argparse.Namespace) -> int:
    jsonl = Path(ns.jsonl_out).resolve() if ns.jsonl_out else _default_jsonl_path()
    raw = Path(ns.entry_json).read_text(encoding="utf-8", errors="replace")
    entry = json.loads(raw)
    if not isinstance(entry, dict):
        print(json.dumps({"ok": False, "error": "entry_json_must_be_object"}, ensure_ascii=False), file=sys.stderr)
        return 2
    try:
        entry = _normalize_append_json_entry(entry)
    except ValueError as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False), file=sys.stderr)
        return 2
    if ns.dry_run:
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        return 0
    append_jsonl(jsonl, entry)
    if ns.stdout_json:
        print(
            json.dumps(
                {
                    "appended": True,
                    "entry_id": entry.get("entry_id"),
                    "jsonl": str(jsonl),
                    "next_on_pass": NEXT_ON_PASS,
                    "retry_card": RETRY_CARD,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


def cmd_emit_sample(ns: argparse.Namespace) -> int:
    sample = emit_sample_entry()
    out = Path(ns.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(sample, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if ns.stdout_json:
        print(
            json.dumps(
                {
                    "wrote": str(out),
                    "next_on_pass": NEXT_ON_PASS,
                    "next_on_fail_note": NEXT_ON_FAIL_NOTE,
                    "retry_card": RETRY_CARD,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_seal = sub.add_parser("append-from-seal", help="seal ディレクトリからエントリを生成して JSONL 追記")
    p_seal.add_argument("--seal-dir", required=True)
    p_seal.add_argument("--card-name", default="", help="記録するカード名（例: TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1）")
    p_seal.add_argument("--card", default="", help="--card-name の別名")
    p_seal.add_argument("--seal-exit-code", type=int, default=0)
    p_seal.add_argument("--touched-files", default="", help="改行区切りの触ったファイルリスト")
    p_seal.add_argument("--git-since", default="", help="repo ルートから git diff --name-only <ref>")
    p_seal.add_argument("--repo-root", default="", help="git ルート（既定: tenmon-ark-repo）")
    p_seal.add_argument("--jsonl-out", default="")
    p_seal.add_argument("--dry-run", action="store_true")
    p_seal.add_argument("--stdout-json", action="store_true")
    p_seal.set_defaults(func=cmd_append_from_seal)

    p_json = sub.add_parser("append-json", help="任意のエントリ JSON をそのまま追記")
    p_json.add_argument("--entry-json", required=True)
    p_json.add_argument("--jsonl-out", default="")
    p_json.add_argument("--dry-run", action="store_true")
    p_json.add_argument("--stdout-json", action="store_true")
    p_json.set_defaults(func=cmd_append_json)

    p_samp = sub.add_parser("emit-sample", help="スキーマ準拠のサンプル JSON を出力")
    p_samp.add_argument("--out", required=True)
    p_samp.add_argument("--stdout-json", action="store_true")
    p_samp.set_defaults(func=cmd_emit_sample)

    ns = ap.parse_args(argv)
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
