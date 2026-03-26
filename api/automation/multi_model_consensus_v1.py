#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1

GPT / Claude / Gemini の相談結果 JSON を比較し、一致・競合・推奨案を1つの JSON にまとめる。
生テキストは digest のみに縮約（フルテキストは出力に載せない）。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1"

PROVIDERS = ("gpt", "claude", "gemini")

HIGH_RISK_TOKENS = frozenset(
    {"high", "critical", "escrow", "high_risk", "severe", "blocker", "p0"}
)


def _digest(text: str, max_len: int = 480) -> str:
    t = " ".join(str(text or "").split())
    if len(t) <= max_len:
        return t
    return t[: max_len - 3] + "..."


def _norm_text(s: str) -> str:
    return " ".join(str(s or "").lower().split())


def _norm_key(s: str) -> str:
    return hashlib.sha256(_norm_text(s).encode("utf-8")).hexdigest()[:24]


def _as_str_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        parts = re.split(r"[\n,;]+", v)
        return [p.strip() for p in parts if p.strip()]
    return [str(v).strip()] if str(v).strip() else []


def _extract(blob: dict[str, Any]) -> dict[str, Any]:
    return {
        "problem": str(blob.get("problem", "")).strip(),
        "target_files": sorted(set(_as_str_list(blob.get("target_files")))),
        "proposed_change": str(blob.get("proposed_change", "")).strip(),
        "risk": str(blob.get("risk", "")).strip().lower(),
        "tests": sorted(set(_as_str_list(blob.get("tests")))),
        "reject_conditions": sorted(set(_as_str_list(blob.get("reject_conditions")))),
    }


def _load_advice(path: Path | None) -> tuple[dict[str, Any] | None, str | None]:
    if path is None:
        return None, "not_provided"
    if not path.is_file():
        return None, "missing_or_unreadable"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return None, "not_a_json_object"
        return _extract(raw), None
    except Exception as e:
        return None, f"parse_error:{e}"


def _is_high_risk(risk: str) -> bool:
    r = _norm_text(risk)
    if not r:
        return False
    return any(t in r for t in HIGH_RISK_TOKENS)


def _majority_groups(values: dict[str, str]) -> tuple[str | None, int, dict[str, list[str]]]:
    """norm_key -> list of providers with that normalized content."""
    buckets: dict[str, list[str]] = {}
    key_to_sample: dict[str, str] = {}
    for prov, val in values.items():
        nk = _norm_key(val) if val.strip() else "__empty__"
        buckets.setdefault(nk, []).append(prov)
        if nk not in key_to_sample:
            key_to_sample[nk] = val
    if not buckets:
        return None, 0, {}
    best_k, best_list = max(buckets.items(), key=lambda kv: len(kv[1]))
    return key_to_sample.get(best_k, ""), len(best_list), buckets


def _sets_equal_three(a: list[str], b: list[str], c: list[str]) -> bool:
    return a == b == c


def build_consensus_v1(
    advice_gpt: dict[str, Any] | None,
    advice_claude: dict[str, Any] | None,
    advice_gemini: dict[str, Any] | None,
) -> dict[str, Any]:
    slot = {
        "gpt": advice_gpt,
        "claude": advice_claude,
        "gemini": advice_gemini,
    }
    valid = {k: v for k, v in slot.items() if v is not None}
    agreed: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []

    if len(valid) < 2:
        return {
            "consensus_level": "insufficient_input",
            "agreed_changes": [],
            "conflicting_changes": [
                {"field": "_input", "detail": "need_at_least_two_valid_advice_json_files"}
            ],
            "recommended_primary_plan": None,
            "manual_review_required": True,
        }

    # --- target_files
    tf = {p: list(v["target_files"]) for p, v in valid.items()}
    if len({json.dumps(v, sort_keys=True) for v in tf.values()}) > 1:
        conflicts.append(
            {
                "field": "target_files",
                "rule": "target_files_mismatch_is_conflict",
                "by_provider": {p: tf[p] for p in sorted(tf.keys())},
            }
        )
    else:
        if tf:
            k0 = next(iter(tf))
            agreed.append(
                {
                    "field": "target_files",
                    "consensus": "unanimous" if len(valid) == 3 else "partial_2of3",
                    "providers": sorted(tf.keys()),
                    "value_digest": _digest(", ".join(tf[k0]), 200),
                }
            )

    # --- proposed_change (2/3 same norm => consensus on that field)
    pc = {p: v["proposed_change"] for p, v in valid.items()}
    _sample, maj_n, buckets = _majority_groups(pc)
    if maj_n >= 2:
        winners: list[str] = []
        for _nk, plist in buckets.items():
            if len(plist) == maj_n:
                winners = plist
                break
        agreed.append(
            {
                "field": "proposed_change",
                "consensus": "majority_2of3" if len(valid) == 3 and maj_n == 2 else "unanimous",
                "providers": sorted(winners),
                "value_digest": _digest(_sample or ""),
            }
        )
    # 3 割れ（多数派なし）のみ conflict。2/3 一致は agreed のみ。
    if len(buckets) > 1 and maj_n < 2:
        conflicts.append(
            {
                "field": "proposed_change",
                "rule": "no_majority_or_split_opinions",
                "digests_by_provider": {p: _digest(pc[p]) for p in sorted(pc.keys())},
            }
        )

    # --- problem
    pr = {p: v["problem"] for p, v in valid.items()}
    _, pr_maj, pr_buckets = _majority_groups(pr)
    if pr_maj >= 2:
        pr_winners = max(pr_buckets.values(), key=len)
        pr_sample = pr[pr_winners[0]]
        agreed.append(
            {
                "field": "problem",
                "consensus": "majority_2of3" if len(valid) == 3 and len(pr_winners) == 2 else "unanimous",
                "providers": sorted(pr_winners),
                "value_digest": _digest(pr_sample),
            }
        )
    elif len({_norm_key(x) for x in pr.values() if x.strip()}) > 1:
        conflicts.append(
            {
                "field": "problem",
                "rule": "problem_statement_diverges",
                "digests_by_provider": {p: _digest(pr[p]) for p in sorted(pr.keys())},
            }
        )

    # --- risk (not strict 2/3; flag conflict if all differ materially)
    risks = {p: v["risk"] for p, v in valid.items()}
    high_any = any(_is_high_risk(r) for r in risks.values())
    uniq_risk = { _norm_text(r) for r in risks.values() if r }
    if len(uniq_risk) > 1:
        conflicts.append(
            {
                "field": "risk",
                "rule": "risk_label_diverges",
                "by_provider": {p: risks[p] for p in sorted(risks.keys())},
            }
        )
    elif len(uniq_risk) == 1:
        agreed.append(
            {
                "field": "risk",
                "consensus": "unanimous",
                "providers": sorted(risks.keys()),
                "value_digest": _digest(next(iter(uniq_risk)), 120),
            }
        )

    # --- tests / reject_conditions: 2/3 identical sets
    for fname in ("tests", "reject_conditions"):
        mp = {p: json.dumps(valid[p][fname], sort_keys=True) for p in valid}
        rev = {}
        for p, js in mp.items():
            rev.setdefault(js, []).append(p)
        best = max(rev.values(), key=len) if rev else []
        if len(best) >= 2:
            agreed.append(
                {
                    "field": fname,
                    "consensus": "majority_2of3" if len(valid) == 3 and len(best) == 2 else "unanimous",
                    "providers": sorted(best),
                    "value_digest": _digest(", ".join(valid[best[0]][fname]), 200),
                }
            )
        if len(rev) > 1 and len(best) < len(valid):
            conflicts.append(
                {
                    "field": fname,
                    "rule": f"{fname}_set_mismatch",
                    "digests_by_provider": {p: _digest(", ".join(valid[p][fname]), 200) for p in sorted(valid)},
                }
            )

    tf_conflict = any(c.get("field") == "target_files" for c in conflicts)
    pc_conflict = any(c.get("field") == "proposed_change" for c in conflicts)

    if tf_conflict:
        consensus_level = "conflict"
    elif pc_conflict and maj_n < 2:
        consensus_level = "conflict"
    elif not conflicts:
        consensus_level = "full"
    else:
        consensus_level = "partial"

    # recommended_primary_plan: majority proposed_change provider; tie-break gpt > claude > gemini
    order = ["gpt", "claude", "gemini"]
    primary_src = None
    if maj_n >= 2:
        for nk, plist in sorted(
            buckets.items(),
            key=lambda kv: (-len(kv[1]), min((order.index(x) if x in order else 99) for x in kv[1])),
        ):
            if len(plist) >= 2:
                plist_sorted = sorted(plist, key=lambda x: order.index(x) if x in order else 99)
                primary_src = plist_sorted[0]
                break
    if primary_src is None:
        for p in order:
            if p in valid and valid[p]["proposed_change"].strip():
                primary_src = p
                break
    if primary_src is None:
        primary_src = next(iter(sorted(valid.keys())))

    v0 = valid[primary_src]
    recommended = {
        "basis": "majority_proposed_change" if maj_n >= 2 else "first_non_empty_or_gpt_priority",
        "source_provider": primary_src,
        "target_files": list(v0["target_files"]),
        "risk": v0["risk"],
        "change_digest": _digest(v0["proposed_change"]),
        "problem_digest": _digest(v0["problem"], 320),
        "tests_digest": _digest(", ".join(v0["tests"]), 200),
        "reject_conditions_digest": _digest(", ".join(v0["reject_conditions"]), 200),
    }

    manual = False
    if consensus_level in ("insufficient_input", "conflict"):
        manual = True
    if high_any and (tf_conflict or pc_conflict):
        manual = True

    return {
        "consensus_level": consensus_level,
        "agreed_changes": agreed,
        "conflicting_changes": conflicts,
        "recommended_primary_plan": recommended,
        "manual_review_required": manual,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--advice-gpt", type=Path, default=None, help="JSON path (optional if others suffice)")
    ap.add_argument("--advice-claude", type=Path, default=None)
    ap.add_argument("--advice-gemini", type=Path, default=None)
    ap.add_argument("--output-file", type=Path, required=True)
    args = ap.parse_args()

    g, eg = _load_advice(args.advice_gpt)
    c, ec = _load_advice(args.advice_claude)
    m, em = _load_advice(args.advice_gemini)

    out = build_consensus_v1(g, c, m)
    out["card"] = CARD
    out["inputs"] = {
        "advice_gpt": str(args.advice_gpt.expanduser().resolve()) if args.advice_gpt else None,
        "advice_claude": str(args.advice_claude.expanduser().resolve()) if args.advice_claude else None,
        "advice_gemini": str(args.advice_gemini.expanduser().resolve()) if args.advice_gemini else None,
        "load_errors": {k: v for k, v in {"gpt": eg, "claude": ec, "gemini": em}.items() if v},
    }

    op = args.output_file.expanduser().resolve()
    op.parent.mkdir(parents=True, exist_ok=True)
    op.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False), file=sys.stdout)

    return 1 if out.get("manual_review_required") else 0


if __name__ == "__main__":
    raise SystemExit(main())
