# TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_CURSOR_AUTO_V1

## 目的

**失敗分類（fail classifier）**・**rollback 計画**・**alternate strategy（最小 diff 別角度）**・**anti-regression memory**・**学習品質ブリッジ（conversation / seed / evidence 統合）**を一つのループに束ね、失敗時に壊れたまま進まず **別角度の最小 diff 再試行** と **低品質学習入力の検知** を可能にする。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts` 本体
- route 本体
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約

## 失敗分類（最低限）

| 型 | 概要 |
|----|------|
| `build_fail` | 静的軸 build / check 失敗 |
| `restart_fail` | systemd / forensics に failed・inactive |
| `health_fail` | runtime health 非 OK |
| `audit_fail` | audit 非 OK |
| `runtime_probe_fail` | runtime matrix 非 OK（`route_probe_fail` と併記互換） |
| `surface_noise_fail` | seal_contract 非 OK（`surface_regression` と併記互換） |
| `route_authority_fail` | probe matrix に 401/403 / forbidden 兆候 |
| `learning_quality_fail` | `learning_quality_bridge.json` の unified スコアが閾値未満 |

既存の `dangerous_patch` / `runtime_regression` も `FAIL_TYPES` に含まれる。

## 実装

| モジュール | 役割 |
|-----------|------|
| `improvement_quality_bridge_v1.py` | `learning_quality_report` / seed / evidence / `conversation_learning_bridge` → **`learning_quality_bridge.json`** |
| `fail_classifier_v1.py` | 上記ブリッジと `runtime_probe_matrix.json` を参照して分類 |
| `rollback_planner_v1.py` | git log 提案（観測のみ）— ループが **`rollback_plan.json`** に統合 |
| `self_repair_loop_v1.py` | オーケストレーション・dangerous 候補の `git checkout`（**`TENMON_AUTO_ROLLBACK_DANGEROUS=1` のときのみ**） |
| `alternate_strategy_generator_v1.py` | **`alternate_strategy.json`** |
| `anti_regression_memory_v1.py` | **`anti_regression_memory.json`**（`--from-dangerous` で変更ファイル fingerprint） |
| `self_repair_seal_v1.py` | 従来 seal（ループ終端で実行、`TENMON_SELF_REPAIR_SEAL_SKIP_ANTI_REGRESSION=1` で二重追記回避） |

## 成果物（VPS / automation）

| ファイル | 説明 |
|---------|------|
| `TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_VPS_V1` | マーカー |
| `self_repair_result.json` | ループ各ステップの要約 |
| `rollback_plan.json` | git 提案 + dangerous パス別 `git checkout` 候補 + 自動実行結果 |
| `anti_regression_memory.json` | 失敗型 + 変更 fingerprint |
| `learning_quality_bridge.json` | 統合スコア・閾値 |
| `self_repair_loop_parent_05_seal.json` | PARENT_05 用 seal（既存 `self_repair_seal.json` と併存） |

## 実行

```bash
cd api/automation && python3 self_repair_loop_v1.py
# ブリッジのみ:
python3 improvement_quality_bridge_v1.py
```

## 環境変数

- `TENMON_AUTO_ROLLBACK_DANGEROUS=1` — **許可パスのみ** `git checkout -- <path>`（`chat.ts` / schema / `kokuzo_pages` / `dist` は禁止）
- `TENMON_SELF_REPAIR_CYCLE_COMPLETE=1` — `self_repair_seal` の厳格完結フラグ（従来どおり）
- ループが子で設定: `TENMON_SELF_REPAIR_SEAL_SKIP_ANTI_REGRESSION=1`

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_05_SELF_REPAIR_AND_IMPROVEMENT_LOOP_RETRY_CURSOR_AUTO_V1` — `generated_cursor_apply/` に `.md` 生成
