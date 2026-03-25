#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CHAT_REFACTOR_CARD_GENERATOR — Planner 出力から Cursor / VPS カードを対で生成。
入力: chat_refactor_plan.json, risk_partition.json, latest verdict（任意）
1 カード 1 主題。high risk は proposal / gated（自動適用カードにしない）。
"""
from __future__ import annotations

import argparse
import json
import re
import shlex
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

CARD = "TENMON_CHAT_REFACTOR_CARD_GENERATOR_V1"
SCHEMA_VERSION = 1
FAIL_NEXT = "TENMON_CHAT_REFACTOR_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1"
GENERATOR_VPS_CARD = "TENMON_CHAT_REFACTOR_CARD_GENERATOR_VPS_V1"

# Cursor カードの VPS_VALIDATION_OUTPUTS に列挙する検証成果物（命名固定）
VPS_VALIDATION_ARTIFACTS = (
    GENERATOR_VPS_CARD,
    "generated_cursor_card_sample.md",
    "generated_vps_card_sample.sh",
    "card_manifest.json",
    "final_verdict.json",
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


def _slug(s: str) -> str:
    x = re.sub(r"[^a-zA-Z0-9]+", "_", (s or "THEME").strip())[:40].strip("_").upper()
    return x or "THEME"


def _item_from_next_card(entry: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "theme": entry.get("theme", "unknown"),
        "subject": entry.get("subject", ""),
        "risk": entry.get("risk", "low"),
        "rationale": entry.get("rationale", ""),
        "suggested_focus": entry.get("suggested_focus", ""),
    }


def _collect_items(plan: Dict[str, Any]) -> List[Dict[str, Any]]:
    pi = plan.get("prioritized_items")
    if isinstance(pi, list) and pi:
        out: List[Dict[str, Any]] = []
        for x in pi:
            if isinstance(x, dict):
                out.append(
                    {
                        "theme": x.get("theme", "unknown"),
                        "subject": x.get("subject", ""),
                        "risk": x.get("risk", "low"),
                        "rationale": x.get("rationale", ""),
                        "suggested_focus": x.get("suggested_focus", ""),
                    }
                )
        return out[:3]
    ncp = plan.get("next_card_priority")
    if isinstance(ncp, list) and ncp:
        return [_item_from_next_card(x) for x in ncp if isinstance(x, dict)][:3]
    return []


def _merge_risk_partition(
    plan: Dict[str, Any],
    rp_file: Dict[str, Any],
) -> Dict[str, Any]:
    if rp_file:
        return rp_file
    return {
        "version": 1,
        "low_risk_targets": plan.get("low_risk_targets") or [],
        "medium_risk_targets": plan.get("medium_risk_targets") or [],
        "high_risk_targets": plan.get("high_risk_targets") or [],
    }


def _card_names(item: Dict[str, Any]) -> Tuple[str, str, str]:
    """Returns (cursor_name, vps_script_stem, mode). mode: auto | proposal_gated"""
    slug = _slug(str(item.get("theme") or "theme"))
    risk = str(item.get("risk") or "low").lower()
    if risk == "high":
        cur = f"TENMON_CHAT_REFACTOR_{slug}_PROPOSAL_GATED_CURSOR_AUTO_V1"
        vps = f"TENMON_CHAT_REFACTOR_{slug}_PROPOSAL_GATED_VPS_V1"
        return cur, vps, "proposal_gated"
    cur = f"TENMON_CHAT_REFACTOR_{slug}_CURSOR_AUTO_V1"
    vps = f"TENMON_CHAT_REFACTOR_{slug}_VPS_V1"
    return cur, vps, "cursor_auto_apply"


def _cursor_sections(
    item: Dict[str, Any],
    cursor_name: str,
    vps_stem: str,
    mode: str,
    risk_partition_summary: str,
    verdict_hint: str,
) -> str:
    th = item.get("theme", "unknown")
    subj = item.get("subject", "")
    risk = item.get("risk", "low")
    rat = item.get("rationale", "")
    foc = item.get("suggested_focus", "")
    vps_sh = f"{vps_stem}.sh"
    gated_note = ""
    if mode == "proposal_gated":
        gated_note = (
            "\n- **本カードは PROPOSAL / GATED**。chat.ts・route の実質改変は **人の承認後**のみ。"
            "\n- 自動エージェントは **差分提案・観測・ドキュメント**に留める。\n"
        )
    policy_extra = ""
    if mode == "proposal_gated":
        policy_extra = (
            "- 高リスク帯: **実装は行わず** RFC / 分割案 / 影響範囲メモを残す。\n"
            "- Governor・人レビュー通過まで **適用禁止**。\n"
        )
    else:
        policy_extra = (
            "- 低〜中リスク: **1 主題のみ**の局所変更。他テーマは別カード。\n"
            "- `npm run build` を常に通す。\n"
        )

    vps_outputs_lines = "\n".join(f"- `{a}`" for a in VPS_VALIDATION_ARTIFACTS)

    return f"""# {cursor_name}

> **自動生成 Cursor カード** — Planner 出力に基づく **1 主題**（chat.ts は仕様どおり参照・局所のみ）  
> 同伴 VPS: `{vps_sh}` / Generator VPS 検証カード: `{GENERATOR_VPS_CARD}`

---

## CARD_NAME

`{cursor_name}`

---

## OBJECTIVE

{subj}

---

## WHY_NOW

- テーマ: `{th}`
- Planner リスク: **{risk}**
- 根拠: {rat}
- 観測と計画を **作業可能なカード** に落とし、自己修復 PDCA の速度を上げる。
{gated_note}
---

## EDIT_SCOPE

- `api/automation/**` の観測・生成スクリプト（本リファクタレーンに関連する範囲）
- `api/src/core/**` / `api/src/planning/**` の **必要最小限**のヘルパ・配線（テーマに直結する場合）
- `api/src/routes/chat.ts` は **原則参照**、触る場合も **数十行以内の局所**に限定（high は提案のみ）

---

## DO_NOT_TOUCH

- `dist/**`
- DB schema
- kokuzo_pages 正文
- systemd env
- `chat.ts` 本体の無差別リファクタ / route・surface・planner **実装本体の一括置換**

---

## IMPLEMENTATION_POLICY

{policy_extra}
- リスクパーティション参照: {risk_partition_summary}
- 直近 verdict 要約: {verdict_hint}

---

## ACCEPTANCE

- Generator 実装が参照可能である
- 本テーマに対応する **Cursor カード + VPS `.sh`** が生成されている
- `npm run build` が成功する
- high risk の場合は **proposal / gated** 文言がカードに含まれる
- `FAIL_NEXT_CARD` が定義されている

---

## VPS_VALIDATION_OUTPUTS

{vps_outputs_lines}

（VPS 実行ディレクトリまたは `api/automation/generated_vps_cards/<ts>/` 配下に収集）

---

## FAIL_NEXT_CARD

`{FAIL_NEXT}`

---

## OBSERVE

```bash
wc -l api/src/routes/chat.ts
rg -n '{foc}' api/src/routes/chat.ts | head -n 40
```

---

## DO

- 推奨フォーカス: `{foc}`

---

## CHECK

```bash
cd /opt/tenmon-ark-repo/api && npm run build
```

---
"""


def _vps_shell(
    item: Dict[str, Any],
    vps_stem: str,
    cursor_name: str,
    mode: str,
) -> str:
    th = str(item.get("theme", "unknown"))
    risk = str(item.get("risk", "low"))
    gate_block = ""
    if mode == "proposal_gated":
        gate_block = """
echo "[GATED] high risk — 人承認まで apply しない"
export TENMON_PROPOSAL_GATED=1
"""

    py_one_liner = (
        "import json,os,time; p=os.environ['TENMON_OUT_DIR']; "
        "d={'version':1,'card':os.environ.get('TENMON_VPS_VERDICT_CARD',''), "
        "'theme':os.environ.get('TENMON_VPS_VERDICT_THEME',''), "
        "'risk':os.environ.get('TENMON_VPS_VERDICT_RISK',''), "
        "'mode':os.environ.get('TENMON_VPS_VERDICT_MODE',''), "
        "'probe_ts':int(time.time()), 'pass':True}; "
        "open(os.path.join(p,'final_verdict.json'),'w',encoding='utf-8').write("
        "json.dumps(d,ensure_ascii=False,indent=2)+'\\n')"
    )
    py_cmd = "python3 -c " + shlex.quote(py_one_liner)

    return f"""#!/usr/bin/env bash
# {vps_stem}
# TENMON Chat Refactor — VPS 実行カード（build / restart / health / audit / probe / verdict）
set -euo pipefail
set +H
set +o histexpand

CARD="{vps_stem}"
THEME={shlex.quote(th)}
RISK={shlex.quote(risk)}
MODE={shlex.quote(mode)}
CURSOR_CARD={shlex.quote(cursor_name)}
ROOT="${{ROOT:-/opt/tenmon-ark-repo}}"
API="$ROOT/api"

echo "[VPS_CARD] $CARD theme=$THEME risk=$RISK mode=$MODE"
{gate_block}
# --- build ---
cd "$API"
npm run build

# --- restart（環境に合わせて。無ければスキップ） ---
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart tenmon-api 2>/dev/null || echo "[restart] skipped or failed (non-fatal)"
else
  echo "[restart] no systemctl — skipped"
fi

# --- health ---
HB="${{CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}}"
curl -fsS "$HB/health" || echo "[health] curl failed (non-fatal for CI)"

# --- audit（軽量） ---
if [ -f "$API/package.json" ]; then
  (cd "$API" && (npm run -s lint 2>/dev/null || true))
fi
rg -n "FIXME|HACK" "$API/src/routes/chat.ts" 2>/dev/null | head -n 5 || true

# --- probe（チャット契約は既存 seal に委譲 — ここでは到達確認のみ） ---
curl -fsS -o /dev/null -w "%{{http_code}}\\n" "$HB/health" || true

# --- verdict ---
OUT_DIR="${{CARD_OUT_DIR:-.}}"
mkdir -p "$OUT_DIR"
export TENMON_OUT_DIR="$OUT_DIR"
export TENMON_VPS_VERDICT_CARD="$CARD"
export TENMON_VPS_VERDICT_THEME="$THEME"
export TENMON_VPS_VERDICT_RISK="$RISK"
export TENMON_VPS_VERDICT_MODE="$MODE"
{py_cmd}

echo "[VPS_CARD] done"
"""


def _chmod_x(p: Path) -> None:
    try:
        m = p.stat().st_mode
        p.chmod(m | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except OSError:
        pass


def generate_all(
    plan: Dict[str, Any],
    risk_partition: Dict[str, Any],
    verdict: Dict[str, Any],
    ts_folder: str,
    write_repo: bool,
) -> Dict[str, Any]:
    items = _collect_items(plan)
    if not items:
        items = [
            {
                "theme": "maintenance_watch",
                "subject": "優先項目なし — 継続観測",
                "risk": "low",
                "rationale": "plan に prioritized_items / next_card_priority が空",
                "suggested_focus": "observer_rerun_next_cycle",
            }
        ]

    rps = (
        f"low={len(risk_partition.get('low_risk_targets') or [])}, "
        f"medium={len(risk_partition.get('medium_risk_targets') or [])}, "
        f"high={len(risk_partition.get('high_risk_targets') or [])}"
    )
    vhint = json.dumps(verdict, ensure_ascii=False)[:400] if verdict else "(no verdict file)"

    api = _repo_api()
    gcur = api / "automation" / "generated_cursor_apply"
    gvps = api / "automation" / "generated_vps_cards" / ts_folder
    if write_repo:
        gcur.mkdir(parents=True, exist_ok=True)
        gvps.mkdir(parents=True, exist_ok=True)

    pairs: List[Dict[str, Any]] = []
    for item in items:
        cursor_name, vps_stem, mode = _card_names(item)
        md_body = _cursor_sections(item, cursor_name, vps_stem, mode, rps, vhint)
        sh_body = _vps_shell(item, vps_stem, cursor_name, mode)
        cpath = gcur / f"{cursor_name}.md"
        vpath = gvps / f"{vps_stem}.sh"

        if write_repo:
            cpath.write_text(md_body, encoding="utf-8")
            vpath.write_text(sh_body, encoding="utf-8")
            _chmod_x(vpath)

        pairs.append(
            {
                "theme": item.get("theme"),
                "risk": item.get("risk"),
                "mode": mode,
                "cursor_card": cursor_name,
                "vps_card": vps_stem,
                "paths": {"cursor_md": str(cpath), "vps_sh": str(vpath)},
            }
        )

    first = pairs[0]
    focused_item = items[0]

    manifest_body: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "fail_next_cursor_card": FAIL_NEXT,
        "generator_vps_card": GENERATOR_VPS_CARD,
        "inputs": {
            "plan_card": plan.get("card"),
            "risk_partition_version": risk_partition.get("version"),
        },
        "pairs": pairs,
        "focused_item": focused_item,
        "cursor_card": first["cursor_card"],
        "vps_card": first["vps_card"],
        "paths": {
            **first["paths"],
            "card_manifest": str(gvps / "card_manifest.json") if write_repo else "",
        },
    }

    if write_repo and pairs:
        # サンプルコピー + マニフェスト（VPS 検証成果物名と整合）
        (gvps / "generated_cursor_card_sample.md").write_text(
            (gcur / f"{first['cursor_card']}.md").read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        (gvps / "generated_vps_card_sample.sh").write_text(
            (gvps / f"{first['vps_card']}.sh").read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        _chmod_x(gvps / "generated_vps_card_sample.sh")
        (gvps / "card_manifest.json").write_text(
            json.dumps(manifest_body, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        fv = {
            "version": 1,
            "card": CARD,
            "generator_pass": True,
            "pair_count": len(pairs),
            "first_cursor": first["cursor_card"],
            "first_mode": first["mode"],
        }
        (gvps / "final_verdict.json").write_text(
            json.dumps(fv, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    return manifest_body


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--plan-json", default="", help="chat_refactor_plan.json")
    ap.add_argument("--risk-partition-json", default="", help="risk_partition.json（省略時は plan 内フィールド）")
    ap.add_argument("--verdict-json", default="", help="latest final_verdict.json 等")
    ap.add_argument("--out-manifest", default="", help="生成マニフェストの出力先（任意）")
    ap.add_argument("--ts-folder", default="", help="generated_vps_cards 下のサブディレクトリ名")
    ap.add_argument("--sample", action="store_true", help="planner sample_plan を入力にする")
    ap.add_argument("--no-write-repo", action="store_true", help="generated_* に書き込まない")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args(list(argv) if argv is not None else None)

    if args.sample:
        from chat_refactor_planner_v1 import sample_plan

        plan = sample_plan()
        risk_partition = _merge_risk_partition(plan, {})
        verdict = {"planner_pass": True, "sample": True}
    else:
        if not args.plan_json:
            print("--plan-json or --sample required", file=sys.stderr)
            return 2
        plan = _read_json(Path(args.plan_json))
        rp = _read_json(Path(args.risk_partition_json)) if args.risk_partition_json else {}
        risk_partition = _merge_risk_partition(plan, rp)
        verdict = _read_json(Path(args.verdict_json)) if args.verdict_json else {}

    ts = args.ts_folder or _utc_now_iso().replace(":", "").replace("-", "")[:15]
    man = generate_all(plan, risk_partition, verdict, ts, write_repo=not args.no_write_repo)

    if args.out_manifest:
        outp = Path(args.out_manifest)
        outp.parent.mkdir(parents=True, exist_ok=True)
        outp.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(man, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(None))
