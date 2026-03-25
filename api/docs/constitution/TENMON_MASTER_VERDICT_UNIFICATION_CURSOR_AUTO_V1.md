# TENMON_MASTER_VERDICT_UNIFICATION_CURSOR_AUTO_V1

## 目的

worldclass / seal / orchestrator / forensic 系の **chat_ts 系最終判定を単一の master verdict に統一**し、  
live seal で pass しているのに standalone worldclass が `handoff_not_executed` で false になるような **false fail** を抑止する。

## 優先順位（固定）

1. live seal + runtime matrix（`/var/log/tenmon/card` または integration_seal の worldclass / final_verdict）
2. deep / ultra forensic の `integrated_master_verdict.json`
3. orchestrator `integrated_final_verdict.json`（軸が無い場合あり）
4. standalone `worldclass_report.json`（**最低優先**）

`runtime_observation_mode == handoff_not_executed` の standalone false は、live seal が true を出している軸では **採用しない**。

## 統一軸

- `chat_ts_static_100`
- `chat_ts_runtime_100`
- `surface_clean`
- `route_authority_clean`
- `longform_quality_clean`
- `density_lock`
- `chat_ts_overall_100`

各軸は `master_verdict.json` 内で `source` / `observed_at` / `live_or_handoff` / `confidence` を持つ。

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/verdict_source_priority_v1.json` | 優先ポリシー定義 |
| `api/automation/master_verdict_unifier_v1.py` | 統一ロジック |
| `api/scripts/master_verdict_unify_v1.sh` | VPS 実行 |

## 出力（既定 `api/automation/out/master_verdict_unification_v1/`）

- `master_verdict.json`
- `verdict_source_priority.json`（設定 + `resolved_at`）
- `verdict_conflict_report.json`
- `integrated_master_verdict.json`（下流互換）
- `integrated_verdict_priority.json`（マスターキャンペーン別名）
- `api/automation/TENMON_MASTER_VERDICT_UNIFICATION_VPS_V1`

## 下流参照

- `self_improvement_os_runner_v1.py`: `master_verdict.json` があれば `chat_ts_overall_100` に反映
- `kokuzo_learning_improvement_os_integrated_v1.py`: `integrated_learning_verdict.json` に `master_verdict_unification_path` を付与（ファイルが存在する場合）

## 実行

```bash
bash api/scripts/master_verdict_unify_v1.sh
```

## FAIL_NEXT

`TENMON_MASTER_VERDICT_UNIFICATION_RETRY_CURSOR_AUTO_V1`
