# TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_V1

## 目的

`chat.ts` の巨大化・責務重複・surface bleed・route drift を **継続観測**し、**focused PDCA 用 Cursor/VPS カード**へ落とす統治層を置く。  
**高リスクな chat.ts 自動改変は行わない**（Governor が gate）。

## 4 層

| 層 | モジュール | 役割 |
|----|------------|------|
| **Architecture Observer** | `chat_architecture_observer_v1.py`（`tenmon_*` はラッパー） | 観測束 10 項目＋分割 JSON |
| **Refactor Planner** | `chat_refactor_planner_v1.py`（`tenmon_*` はラッパー） | escape / リスク帯 / `next_card_priority` 1〜3 |
| **Refactor Card Generator** | `chat_refactor_card_generator_v1.py`（`tenmon_*` は委譲） | **最大 3 件・1 主題ずつ** Cursor/VPS カード生成 |
| **Refactor Governor** | `chat_refactor_governor_v1.py`（`tenmon_*` は委譲） | `auto_apply` / `proposal_only` / `human_gate` / `rollback` を JSON 判定 |

## 統合 runner

| コンポーネント | パス |
|----------------|------|
| Python（OS 統合） | `chat_refactor_os_runner_v1.py` |
| Python（旧カード名） | `tenmon_chat_refactor_autonomous_runner_v1.py`（OS runner へ委譲） |
| VPS シェル（OS） | `api/scripts/chat_refactor_os_run_v1.sh` |
| VPS シェル（旧） | `api/scripts/chat_refactor_autonomous_governor_run_v1.sh` |

### 一周の流れ

1. Observer → `chat_architecture_observation.json`  
2. Planner → `chat_refactor_plan.json`  
3. Generator → `chat_refactor_generator_manifest.json` + `generated_cursor_apply` / `generated_vps_cards`  
4. Governor → `chat_refactor_governor_verdict.json`（`--enforce-exit` で非 PASS 時 exit 1）

### 成果物（`--out-dir`）

- `chat_refactor_governor_manifest.json` — ステップ一覧
- `integrated_final_verdict.json` — 集約採否
- 失敗時: `generated_cursor_apply/TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_RETRY_CURSOR_AUTO_V1.md`

### サンプル一周（chat.ts 非読）

```bash
python3 api/automation/tenmon_chat_refactor_autonomous_runner_v1.py --out-dir /tmp/cr_demo --demo --stdout-json
```

## 編集境界

- `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**` のみ。
- **触らない:** `dist/**`, DB, kokuzo 正文, systemd env, `/api/chat` 契約, **chat.ts 大規模改修**, runtime route 本体, **res.json 単一出口契約**。

## カード

- `TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_CURSOR_AUTO_V1`
- `TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_VPS_V1`
- `TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_RETRY_CURSOR_AUTO_V1`
