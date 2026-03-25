#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CARD_AUTO_GENERATOR_CURSOR_AUTO_V1
Ledger / Residual / final_verdict から focused Cursor/VPS カードを 1 主題ずつ生成。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import tenmon_chat_ts_residual_quality_score_v1 as _rq

CARD = "TENMON_CARD_AUTO_GENERATOR_V1"
SCHEMA_VERSION = 1
FAIL_NEXT = "TENMON_CARD_AUTO_GENERATOR_RETRY_CURSOR_AUTO_V1"
PARENT_VPS = "TENMON_CARD_AUTO_GENERATOR_VPS_V1"

THEME_TO_INTERNAL = {
    "surface": "surface_clean",
    "route": "route_authority_clean",
    "longform": "longform_quality_clean",
    "density": "density_lock",
    "supplement_seal": "surface_clean",
}

THEME_LABELS = {
    "surface": "Stage1 surface / ノイズ・表層品質",
    "route": "Stage2 route 主権・レーン整合",
    "longform": "Stage3 longform 構造（見立て・展開・楽着）",
    "density": "Stage5 density / static / baseline 周辺",
    "supplement_seal": "Completion supplement / seal 整合・dispatch",
}


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


def _slug(s: str) -> str:
    x = re.sub(r"[^a-zA-Z0-9]+", "_", (s or "BLOCKER").strip())[:48].strip("_").upper()
    return x or "BLOCKER"


def theme_from_blocker(blocker: str) -> str:
    bl = str(blocker).lower()
    if "surface" in bl or "worldclass_surface" in bl:
        return "surface"
    if "longform" in bl:
        return "longform"
    if "density_lock" in bl or "static_not" in bl:
        return "density"
    if "supplement" in bl or ("merged" in bl and "completion" in bl):
        return "supplement_seal"
    if "route" in bl or "runtime_probe" in bl:
        return "route"
    if "baseline" in bl or "postlock" in bl:
        return "density"
    return "route"


INTERNAL_TO_THEME: Dict[str, str] = {
    "surface_clean": "surface",
    "route_authority_clean": "route",
    "longform_quality_clean": "longform",
    "density_lock": "density",
    "baseline_reflection": "density",
}


def _final_verdict_from_seal(seal_dir: Path) -> Dict[str, Any]:
    """final_verdict.json が無い場合は worldclass_report.verdict を合成する（欠損 seal 対策）。"""
    fv = _read_json(seal_dir / "final_verdict.json")
    if fv:
        return fv
    wr = _read_json(seal_dir / "worldclass_report.json")
    vd = wr.get("verdict")
    if isinstance(vd, dict) and vd:
        return dict(vd)
    return {}


def _ledger_last_hint(jsonl: Path, tail: int = 5) -> str:
    if not jsonl.is_file():
        return ""
    try:
        raw = jsonl.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""
    lines = [x.strip() for x in raw.splitlines() if x.strip()]
    if not lines:
        return ""
    tail = max(0, min(int(tail), 500))
    tail_lines = lines[-tail:] if len(lines) > tail else lines
    for ln in reversed(tail_lines):
        try:
            o = json.loads(ln)
        except Exception:
            continue
        h = o.get("summary_human_ja")
        if isinstance(h, str) and h:
            return h[:500]
    return ""


def _pick_focus(
    final: Dict[str, Any],
    priority: Dict[str, Any],
) -> Tuple[str, str, str, str]:
    """returns theme, blocker_primary, cursor_ref, vps_ref"""
    if not final:
        final = {}
    fb = list(final.get("blockers") or [])
    b_from_final = str(fb[0]) if fb else ""

    blocker = ""
    bp = priority.get("blocker_priority_top3") or []
    if bp and isinstance(bp[0], dict):
        blocker = str(bp[0].get("blocker") or "")

    actions = priority.get("next_actions") or []
    if isinstance(actions, list) and actions and isinstance(actions[0], dict):
        a0 = actions[0]
        cur = str(a0.get("cursor_card") or "")
        vps = str(a0.get("vps_card") or "")
        ia = str(a0.get("internal_axis") or "")
        b_use = blocker or b_from_final or "runtime_probe_failure_remaining"
        if ia in INTERNAL_TO_THEME and cur and vps:
            return INTERNAL_TO_THEME[ia], b_use, cur, vps
        if cur and vps:
            return theme_from_blocker(b_use), b_use, cur, vps

    b0 = blocker or b_from_final or "runtime_probe_failure_remaining"
    th = theme_from_blocker(b0)
    if th == "supplement_seal":
        return th, b0, "CHAT_TS_COMPLETION_SUPPLEMENT_CURSOR_AUTO_V1", "CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1"
    ia = THEME_TO_INTERNAL.get(th, "route_authority_clean")
    cur, vps = _rq.AXIS_CARD_PAIRS.get(ia, _rq.AXIS_CARD_PAIRS["route_authority_clean"])
    return th, b0, cur, vps


def build_cursor_md(
    auto_cursor_name: str,
    theme: str,
    blocker: str,
    cursor_ref: str,
    vps_ref: str,
    ledger_hint: str,
    residual_hint: str,
) -> str:
    label = THEME_LABELS.get(theme, theme)
    why_ledger = ledger_hint or "（ledger テールにヒントなし）"
    why_residual = residual_hint or "（residual priority 未読取または空）"

    return f"""# {auto_cursor_name}

> **自動生成 Cursor カード**（1 カード 1 主題: **{label}**）  
> 参照実装カード: `{cursor_ref}` / VPS: `{vps_ref}`

---

## CARD_NAME

`{auto_cursor_name}`

---

## OBJECTIVE

blocker **`{blocker}`** を **{label}** レーンで解消し、次 seal で `chat_ts_overall_100` に近づける最小 diff を行う。

---

## WHY_NOW

- Ledger ヒント: {why_ledger}
- Residual / 優先度ヒント: {why_residual}
- 人手カード起票のボトルネックを避け、**focused PDCA** を即時開始するため。

---

## EDIT_SCOPE

- `api/automation/**` / `api/scripts/**` / `api/docs/constitution/**` の **当該主題に必要な最小ファイルのみ**
- 生成カードの再生成は `card_auto_generator_v1.py` に委譲可能

---

## DO_NOT_TOUCH

- `dist/**`
- DB schema
- `kokuzo_pages` 正文
- `chat.ts` / route 実装本体の **一括・無関係な大改修**
- 既存 acceptance seal シェルの **主契約（引数・必須成果物の破壊的変更）**

---

## IMPLEMENTATION_POLICY

- **1 カード 1 主題** — 本カードは **{theme}** のみ。他軸は別カードへ分離。
- 参照カード `{cursor_ref}` の方針に従い、**観測 → 最小修正 → VPS 再検証**。
- 迷ったら residual の次点 `next_actions` に回す。

---

## ACCEPTANCE

- 変更は当該 blocker / 軸に対応する **再現手順付き**
- `npm run build` が通る
- 親 VPS カードの **health / audit / probe** 節を満たす実行ログを残す

---

## VPS_VALIDATION_OUTPUTS

- `{PARENT_VPS}`（集約）または `{vps_ref}`
- seal ログ配下の `final_verdict.json` / `runtime_matrix.json`
- 本生成物ペア: `generated_vps_cards/**` の対応 `.sh`

---

## FAIL_NEXT_CARD

`{FAIL_NEXT}`

---

## OBSERVE

```bash
# 直近 seal
readlink -f /var/log/tenmon/card
jq '.blockers' "$SEAL/final_verdict.json"
```

---

## DO

- `{cursor_ref}` の **EDIT_SCOPE** に従い、**{label}** に限定して修正する。

---

## CHECK

```bash
cd /opt/tenmon-ark-repo/api && npm run build
```

---

## ACT

- 修正後、**`{vps_ref}`** または worldclass seal で再検証する。

---
"""


def build_vps_sh(
    auto_vps_name: str,
    theme: str,
    blocker: str,
    cursor_card: str,
) -> str:
    return f"""#!/usr/bin/env bash
# {auto_vps_name} — 自動生成 VPS カード（theme={theme}, blocker={blocker[:80]})
set -euo pipefail
set +H
set +o histexpand

ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
BASE="${{CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}}"
CARD="{auto_vps_name}"

echo "[VPS_CARD] $CARD"
echo "[THEME] {theme}"

cd "$API"
echo "=== build ==="
npm run build

echo "=== restart (systemd) ==="
sudo systemctl restart tenmon-ark-api.service || true
sleep 2

echo "=== health ==="
curl -fsS "$BASE/health" | head -c 2000 || true
echo

echo "=== audit ==="
curl -fsS "$BASE/api/audit" | head -c 2000 || true
echo

echo "=== probe (chat discover) ==="
python3 - <<'PY'
import json, sys, urllib.request, urllib.error
base = sys.argv[1].rstrip("/")
for path in ("/chat", "/api/chat"):
    url = base + path
    try:
        body = json.dumps({{"message": "ping", "threadId": "card-auto-gen"}}).encode()
        req = urllib.request.Request(url, data=body, method="POST",
            headers={{"Content-Type": "application/json"}})
        with urllib.request.urlopen(req, timeout=15) as r:
            print(path, r.status)
            sys.exit(0)
    except Exception as e:
        print(path, "fail", e)
print("no_chat_url")
sys.exit(1)
PY
"$BASE" || true

echo "=== verdict hint ==="
echo "詳細判定は chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh またはテーマ別 VPS を実行。"
echo "実装指示 Cursor カード: {cursor_card}"
echo "[DONE] $CARD"
"""


def generate_bundle(
    seal_dir: Path,
    priority_path: Optional[Path],
    ledger_path: Path,
    ledger_tail_hint_lines: int,
    out_sample_dir: Optional[Path],
    write_repo: bool,
    ts_folder: str,
) -> Tuple[Dict[str, Any], str, str]:
    seal_dir = seal_dir.resolve()
    final = _final_verdict_from_seal(seal_dir)
    priority: Dict[str, Any] = {}
    if priority_path and priority_path.is_file():
        priority = _read_json(priority_path)
    else:
        cand = seal_dir / "_residual_quality_scorer_v1" / "residual_priority_result.json"
        if cand.is_file():
            priority = _read_json(cand)

    theme, blocker, cursor_ref, vps_ref = _pick_focus(final, priority)
    slug = _slug(blocker)
    auto_cursor = f"AUTO_GEN_{theme.upper()}_{slug}_CURSOR_AUTO_V1"
    auto_vps = f"AUTO_GEN_{theme.upper()}_{slug}_VPS_V1"

    ledger_hint = _ledger_last_hint(ledger_path, ledger_tail_hint_lines)
    residual_hint = ""
    if priority.get("blocker_priority_top3"):
        residual_hint = json.dumps(priority["blocker_priority_top3"][:2], ensure_ascii=False)

    cursor_body = build_cursor_md(
        auto_cursor, theme, blocker, cursor_ref, vps_ref, ledger_hint, residual_hint
    )
    vps_body = build_vps_sh(auto_vps, theme, blocker, auto_cursor)

    gen_cursor = _repo_api() / "automation" / "generated_cursor_apply"
    gen_vps_root = _repo_api() / "automation" / "generated_vps_cards" / ts_folder
    gen_cursor.mkdir(parents=True, exist_ok=True)
    gen_vps_root.mkdir(parents=True, exist_ok=True)

    cursor_repo_path = gen_cursor / f"{auto_cursor}.md"
    vps_repo_path = gen_vps_root / f"{auto_vps}.sh"

    if write_repo:
        cursor_repo_path.write_text(cursor_body, encoding="utf-8")
        vps_repo_path.write_text(vps_body, encoding="utf-8")

    sample_cursor = ""
    sample_vps = ""
    if out_sample_dir:
        out_sample_dir = Path(out_sample_dir)
        out_sample_dir.mkdir(parents=True, exist_ok=True)
        sample_c = out_sample_dir / "generated_cursor_card_sample.md"
        sample_v = out_sample_dir / "generated_vps_card_sample.sh"
        sample_c.write_text(cursor_body, encoding="utf-8")
        sample_v.write_text(vps_body, encoding="utf-8")
        sample_cursor = str(sample_c)
        sample_vps = str(sample_v)

    manifest: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "focused_theme": theme,
        "blocker_primary": blocker,
        "cursor_card_name": auto_cursor,
        "vps_card_name": auto_vps,
        "fail_next_card": FAIL_NEXT,
        "inputs": {
            "seal_dir": str(seal_dir),
            "ledger_jsonl": str(ledger_path),
            "residual_priority_json": str(priority_path) if priority_path else str(seal_dir / "_residual_quality_scorer_v1" / "residual_priority_result.json"),
            "final_verdict_json": str(seal_dir / "final_verdict.json"),
        },
        "outputs": {
            "cursor_md_repo_path": str(cursor_repo_path),
            "vps_sh_repo_path": str(vps_repo_path),
            "cursor_md_sample_path": sample_cursor,
            "vps_sh_sample_path": sample_vps,
        },
        "ledger_tail_hint": ledger_hint[:300] if ledger_hint else "",
        "residual_hint": residual_hint[:500] if residual_hint else "",
    }
    return manifest, cursor_body, vps_body


def cmd_generate(ns: argparse.Namespace) -> int:
    ts = ns.ts_folder or _utc_now_iso().replace(":", "").replace("-", "")[:15]
    seal = Path(ns.seal_dir).resolve()
    out_dir = Path(ns.out_dir).resolve() if ns.out_dir else (seal / "_card_auto_generator_v1")
    prio = Path(ns.priority_json).resolve() if ns.priority_json else None
    ledger = Path(ns.ledger_jsonl).resolve() if ns.ledger_jsonl else (_repo_api() / "automation" / "improvement_ledger_entries_v1.jsonl")

    tail_ln = max(0, min(int(ns.ledger_tail_lines), 500))

    manifest, _, _ = generate_bundle(
        seal,
        prio,
        ledger,
        tail_ln,
        out_dir,
        not ns.no_write_repo,
        ts,
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    man_path = out_dir / "card_manifest.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fv_final = _final_verdict_from_seal(seal)
    fv = {
        "version": 1,
        "card": PARENT_VPS,
        "card_auto_generator_pass": True,
        "cursor_card_name": manifest.get("cursor_card_name"),
        "vps_card_name": manifest.get("vps_card_name"),
        "chat_ts_overall_100": bool(fv_final.get("chat_ts_overall_100")),
    }
    (out_dir / "final_verdict.json").write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if ns.stdout_json:
        print(json.dumps({"manifest": str(man_path), **fv}, ensure_ascii=False, indent=2))
    return 0


def cmd_sample(ns: argparse.Namespace) -> int:
    """サンプル blocker のみで seal 最小ダミーを使い生成（リポジトリにも書き込む）。"""
    import tempfile

    out_s = Path(ns.out_dir).resolve()
    tmp = Path(tempfile.mkdtemp(prefix="tenmon_cardgen_"))
    try:
        final = {
            "version": 1,
            "blockers": [ns.blocker or "surface_noise_remaining"],
            "chat_ts_overall_100": False,
            "surface_clean": False,
            "route_authority_clean": True,
            "longform_quality_clean": True,
            "density_lock": True,
        }
        (tmp / "final_verdict.json").write_text(json.dumps(final, indent=2), encoding="utf-8")
        priority = {
            "next_actions": [
                {
                    "priority": 1,
                    "internal_axis": "surface_clean",
                    "cursor_card": "CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1",
                    "vps_card": "CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1",
                    "from_blocker": ns.blocker or "surface_noise_remaining",
                }
            ],
            "blocker_priority_top3": [
                {"blocker": ns.blocker or "surface_noise_remaining", "weight": 10.0}
            ],
        }
        (tmp / "residual_priority_result.json").write_text(json.dumps(priority, indent=2), encoding="utf-8")

        ts = "SAMPLE_" + _utc_now_iso().replace(":", "").replace("-", "")[:15]
        manifest, _, _ = generate_bundle(
            tmp,
            tmp / "residual_priority_result.json",
            _repo_api() / "automation" / "improvement_ledger_entries_v1.jsonl",
            3,
            out_s,
            not ns.no_write_repo,
            ts,
        )
        man_path = out_s / "card_manifest.json"
        man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out_s / "final_verdict.json").write_text(
            json.dumps(
                {
                    "version": 1,
                    "card": PARENT_VPS,
                    "card_auto_generator_pass": True,
                    "sample": True,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        if ns.stdout_json:
            print(json.dumps({"manifest": str(man_path)}, ensure_ascii=False, indent=2))
        return 0
    finally:
        import shutil

        shutil.rmtree(tmp, ignore_errors=True)


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="seal + 任意 priority からカード生成")
    g.add_argument("--seal-dir", required=True)
    g.add_argument("--priority-json", default="")
    g.add_argument("--ledger-jsonl", default="")
    g.add_argument("--ledger-tail-lines", type=int, default=8)
    g.add_argument(
        "--out-dir",
        default="",
        help="card_manifest.json / final_verdict / sample md sh（未指定時 <seal>/_card_auto_generator_v1）",
    )
    g.add_argument("--ts-folder", default="", help="generated_vps_cards 下のサブディレクトリ名")
    g.add_argument("--no-write-repo", action="store_true", help="サンプルのみ out-dir、repo へは書かない")
    g.add_argument("--stdout-json", action="store_true")
    g.set_defaults(func=cmd_generate)

    s = sub.add_parser("sample", help="サンプル blocker で Cursor/VPS を生成")
    s.add_argument("--blocker", default="surface_noise_remaining")
    s.add_argument("--out-dir", required=True)
    s.add_argument("--no-write-repo", action="store_true")
    s.add_argument("--stdout-json", action="store_true")
    s.set_defaults(func=cmd_sample)

    ns = ap.parse_args(argv)
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
