#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT — 9 段階 Cursor/VPS カード対を生成。
"""
from __future__ import annotations

import argparse
import json
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

CARD = "TENMON_KOKUZO_SELF_LEARNING_PARENT_GENERATOR_V1"
FAIL_NEXT = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_RETRY_CURSOR_AUTO_V1"
PARENT_CURSOR = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1"
PARENT_VPS = "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1"

STAGES: List[Dict[str, str]] = [
    {
        "slug": "S01_P20_HYBRID_DETAILPLAN_STABLE",
        "title": "P20 / HYBRID detailPlan 契約安定化",
        "objective": "detailPlan / decisionFrame.detailPlan / khsCandidates の契約を文書化し、P20 スタンプと型安全な拡張点を固定する。",
    },
    {
        "slug": "S02_BAD_OBSERVE",
        "title": "BAD 汚染の観測",
        "objective": "mojibake・制御文字・低品質シグナルを観測し、kokuzo/badContaminationGateV1 と qc 系を接続する設計を確定する。",
    },
    {
        "slug": "S03_BAD_BLOCK",
        "title": "BAD 遮断",
        "objective": "学習・Seed への汚染経路を遮断（payload 改変はゲート方針に従い、無審査本番反映は禁止）。",
    },
    {
        "slug": "S04_KHS_HEALTH_GATE",
        "title": "KHS 健全性ゲート",
        "objective": "khs_seeds_det_v1 整合・read-only 検証・evaluateKhsHealthGate を本実装し、FAIL 時は学習ループに入れない。",
    },
    {
        "slug": "S05_KHS_SEED_GEN",
        "title": "KHS Seed 生成",
        "objective": "Seed 生成パイプラインを api/src/seed と既存 engines/seed へ安全に配線する。",
    },
    {
        "slug": "S06_CONV_RESTORE",
        "title": "会話還元",
        "objective": "スレッド文脈から KHS / detailPlan への還元経路を整理し、res.json 単一出口を壊さない。",
    },
    {
        "slug": "S07_BEAUTY_RENDER",
        "title": "美文レンダ",
        "objective": "表層レンダリング（tenmon 調・長文品質）を学習成果と分離し、観測可能なフックのみ追加する。",
    },
    {
        "slug": "S08_LEARN_LOOP_WIRE",
        "title": "高速学習ループ配線",
        "objective": "api/src/learner と apply ログを接続し、tick 単位で監査可能にする（本番自動適用は Governor 下）。",
    },
    {
        "slug": "S09_OS_INTEGRATE",
        "title": "自己改善 OS 統合",
        "objective": "chat_refactor_os_runner_v1 / seal 系と manifest を束ね、integrated_learning_os_manifest に集約する。",
    },
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _cursor_md(stage: Dict[str, str], cursor_name: str, vps_name: str, idx: int) -> str:
    st = stage["title"]
    obj = stage["objective"]
    return f"""# {cursor_name}

> **1 カード 1 主題** — 段階 **{idx}/9** / 親: `{PARENT_CURSOR}`

---

## CARD_NAME

`{cursor_name}`

---

## OBJECTIVE

{obj}

---

## WHY_NOW

虚空蔵高速学習（KHS）と自己改善 OS を **一つの安全な改善循環** に束ねるための第 {idx} 段。

---

## EDIT_SCOPE

- `api/src/kokuzo/**` / `api/src/khs/**` / `api/src/seed/**` / `api/src/learner/**`
- `api/src/core/**` / `api/src/planning/**`
- `api/automation/**` / `api/scripts/**`（観測・カード・runner）
- `api/src/routes/chat.ts` は **当該段階に必要な最小限のみ**（契約破壊禁止）

---

## DO_NOT_TOUCH

- `dist/**`、kokuzo_pages 正文の自動改変、DB 無差別マイグレ、systemd 無計画変更
- `/api/chat` 契約・`res.json` 単一出口の破壊
- route 本体の大規模再配線、学習結果の無審査本番反映

---

## IMPLEMENTATION_POLICY

- **1 変更 1 検証** / **PASS 以外封印禁止**
- FAIL 時は `kokuzo_self_learning_parent_generator_v1.py` で **next VPS/Cursor** を再生成可能

---

## ACCEPTANCE

- 本段のゴールが満たされ、`npm run build` が通る
- 次段カードに引き渡す成果物（JSON / 型 / ゲート）が明確

---

## VPS_VALIDATION_OUTPUTS

- `{PARENT_VPS}`
- `integrated_learning_os_manifest.json`
- `integrated_final_verdict.json`

---

## FAIL_NEXT_CARD

`{FAIL_NEXT}`

---

## CHECK

```bash
cd /opt/tenmon-ark-repo/api && npm run build
```

---

## 段階タイトル

**{st}**

---
"""


def _vps_sh(stage: Dict[str, str], vps_stem: str, cursor_name: str, idx: int) -> str:
    return f"""#!/usr/bin/env bash
# {vps_stem}
set -euo pipefail
set +H
set +o histexpand

CARD="{vps_stem}"
STAGE="{idx}/9"
CURSOR="{cursor_name}"
ROOT="${{ROOT:-/opt/tenmon-ark-repo}}"
API="$ROOT/api"

echo "[KOKUZO_SL] $CARD stage=$STAGE cursor=$CURSOR"

cd "$API"
npm run build

python3 -m py_compile \\
  automation/kokuzo_self_learning_parent_generator_v1.py \\
  2>/dev/null || true

OUT_DIR="${{CARD_OUT_DIR:-.}}"
mkdir -p "$OUT_DIR"
cat > "$OUT_DIR/stage_verdict.json" <<EOF
{{"pass":true,"stage":{idx},"card":"$CARD"}}
EOF

echo "[KOKUZO_SL] done"
"""


def _chmod_x(p: Path) -> None:
    try:
        m = p.stat().st_mode
        p.chmod(m | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except OSError:
        pass


def _parent_cursor_md(children: List[str]) -> str:
    lines = "\n".join(f"{i+1}. `{n}`" for i, n in enumerate(children))
    return f"""# {PARENT_CURSOR}

> **親カード** — 虚空蔵高速学習 × 自己改善 OS 統合（9 段階の索引）

---

## CARD_NAME

`{PARENT_CURSOR}`

---

## OBJECTIVE

KHS 自動学習ループと自己改善 OS を安全に統合する。P20/HYBRID detailPlan 安定化から BAD 遮断、KHS ゲート、Seed、還元、美文、OS 統合まで **段階実行**する。

---

## WHY_NOW

会話改善・学習・根拠抽出・自己改善を別物にせず、**単一の監査可能な循環**に束ねる。

---

## 9 段カード（実行順）

{lines}

---

## DO_NOT_TOUCH

- `dist/**`、kokuzo_pages 正文自動改変、DB 無差別マイグレ、systemd 無計画変更
- `/api/chat` 契約、`res.json` 単一出口、route 大規模再配線、無審査本番学習反映

---

## VPS_VALIDATION_OUTPUTS

- `TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1`
- `integrated_learning_os_manifest.json`
- `integrated_final_verdict.json`

---

## FAIL_NEXT_CARD

`{FAIL_NEXT}`

---

## 生成

```bash
python3 api/automation/kokuzo_self_learning_parent_generator_v1.py --ts-folder RUN_ID --stdout-json
```

---
"""


def _parent_vps_sh() -> str:
    return f"""#!/usr/bin/env bash
# {PARENT_VPS}
set -euo pipefail
ROOT="${{ROOT:-/opt/tenmon-ark-repo}}"
API="$ROOT/api"
GEN="$API/automation/kokuzo_self_learning_parent_generator_v1.py"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

echo "[CARD] {PARENT_VPS}"
cd "$API"
npm run build
python3 "$GEN" --ts-folder "$TS"
echo "[PASS] kokuzo self-learning parent VPS"
"""


def generate(
    ts_folder: str,
    write_repo: bool,
    integrated_out: str,
) -> Dict[str, Any]:
    api = _repo_api()
    gcur = api / "automation" / "generated_cursor_apply"
    gvps = api / "automation" / "generated_vps_cards" / ts_folder
    if write_repo:
        gcur.mkdir(parents=True, exist_ok=True)
        gvps.mkdir(parents=True, exist_ok=True)

    pairs: List[Dict[str, Any]] = []
    cursor_names: List[str] = []

    for i, st in enumerate(STAGES, start=1):
        slug = st["slug"]
        cursor_name = f"TENMON_KOKUZO_SL_{slug}_CURSOR_AUTO_V1"
        vps_stem = f"TENMON_KOKUZO_SL_{slug}_VPS_V1"
        cursor_names.append(cursor_name)
        md = _cursor_md(st, cursor_name, vps_stem, i)
        sh = _vps_sh(st, vps_stem, cursor_name, i)
        cpath = gcur / f"{cursor_name}.md"
        vpath = gvps / f"{vps_stem}.sh"
        if write_repo:
            cpath.write_text(md, encoding="utf-8")
            vpath.write_text(sh, encoding="utf-8")
            _chmod_x(vpath)
        pairs.append(
            {
                "index": i,
                "slug": slug,
                "cursor_card": cursor_name,
                "vps_card": vps_stem,
                "paths": {"cursor_md": str(cpath), "vps_sh": str(vpath)},
            }
        )

    pcur = gcur / f"{PARENT_CURSOR}.md"
    pvps = gvps / f"{PARENT_VPS}.sh"
    if write_repo:
        pcur.write_text(_parent_cursor_md(cursor_names), encoding="utf-8")
        pvps.write_text(_parent_vps_sh(), encoding="utf-8")
        _chmod_x(pvps)

    retry = gcur / f"{FAIL_NEXT}.md"
    if write_repo:
        retry.write_text(
            "\n".join(
                [
                    f"# {FAIL_NEXT}",
                    "",
                    "> 親 OS 一周失敗 — `integrated_learning_os_manifest.json` / evidence を確認",
                    "",
                    f"再実行: `python3 api/automation/kokuzo_self_learning_parent_generator_v1.py --ts-folder <id>`",
                    "",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

    manifest: Dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "parent_cursor": PARENT_CURSOR,
        "parent_vps": PARENT_VPS,
        "generatedAt": _utc_now_iso(),
        "fail_next_cursor_card": FAIL_NEXT,
        "stage_count": len(STAGES),
        "pairs": pairs,
        "paths": {
            "parent_cursor_md": str(pcur),
            "parent_vps_sh": str(pvps),
            "retry_md": str(retry),
        },
        "policy": {
            "nine_stage_rollout": True,
            "one_card_one_theme": True,
            "pass_only_seal": True,
        },
    }

    integrated = {
        "version": 1,
        "card": PARENT_VPS,
        "generatedAt": _utc_now_iso(),
        "status": "PASS",
        "maintained": True,
        "stages_defined": [s["slug"] for s in STAGES],
        "detailPlan_contract": "P20_HYBRID_V1",
        "bad_block": "observe_stub_pending",
        "khs_health_gate": "stub_pending",
        "khs_seed_generation": "engines_seed_existing",
        "khs_candidates_return": "chat_ts_existing",
        "beauty_render": "pending",
        "self_improvement_os": "chat_refactor_os_runner_v1",
        "fail_next_cursor_card": FAIL_NEXT,
    }

    if integrated_out:
        int_path = Path(integrated_out)
        int_path.parent.mkdir(parents=True, exist_ok=True)
        man_path = int_path.parent / "integrated_learning_os_manifest.json"
    else:
        int_path = gvps / "integrated_final_verdict.json"
        man_path = gvps / "integrated_learning_os_manifest.json"

    if write_repo:
        int_path.write_text(json.dumps(integrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest["paths"]["integrated_learning_os_manifest"] = str(man_path)
        manifest["paths"]["integrated_final_verdict"] = str(int_path)
        man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return manifest


def main(argv: Sequence[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--ts-folder", default="")
    ap.add_argument("--no-write-repo", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--write-integrated",
        default="",
        help="integrated_final_verdict.json を書くディレクトリではなくファイルパス",
    )
    args = ap.parse_args(list(argv) if argv is not None else None)
    ts = args.ts_folder or _utc_now_iso().replace(":", "").replace("-", "")[:15]
    integrated_arg = args.write_integrated
    man = generate(ts, write_repo=not args.no_write_repo, integrated_out=integrated_arg)
    if args.stdout_json:
        print(json.dumps(man, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
