# TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1

## 目的

各 OS 系ランナー（full_orchestrator / chat_refactor_os / self_improvement_os / kokuzo_learning_os / worldclass・seal）の成果物について、

- `api/automation/out/<system>/...`
- `/var/log/tenmon/card_<CARD>/<TS>/...`
- 明示 env（`TENMON_*_OUT_DIR`）
- `latest` 系 symlink

を **同一レジストリ** で解決し、`exists=false` の誤判定を減らす。

## 判定カテゴリ

| emission_state | 意味 |
|----------------|------|
| `not_emitted` | どこにも無い（optional は contract_ok のまま許容） |
| `emitted_in_log_only` | out に無いが `/var/log/tenmon` にある |
| `emitted_in_out_dir` | out のみ（正規） |
| `emitted_both_out_and_log` | 両方 |
| `emitted_but_contract_mismatch` | ファイルはあるが JSON/必須キー不一致 |

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/output_contract_registry_v1.py` | canonical 定義（単一ソース） |
| `api/automation/output_contract_snap_resolver_v1.py` | 探索順付きリゾルバ |
| `api/automation/output_contract_normalizer_v1.py` | レポート生成・`output_contracts.json` 互換束 |
| `api/scripts/output_contract_normalize_v1.sh` | VPS 実行 |

## 出力（既定 `api/automation/out/os_output_contract_normalize_v1/`）

- `output_contract_registry.json` — `source_resolved_from` 付き
- `output_contract_normalize_report.json`
- `output_contract_resolution_matrix.json`
- `integrated_contract_verdict.json`
- `output_contracts.json` — integrator と併用可能な束
- `api/automation/TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_VPS_V1` — マーカー

## integrator 連携

`tenmon_ultra_forensic_integrator_v1.py` は、正規化が先に実行されていれば `output_contract_registry.json` を読み、`output_contracts.json` に `source_resolved_from` インデックスをマージする。

## 実行

```bash
bash api/scripts/output_contract_normalize_v1.sh
```

## FAIL_NEXT

`TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_RETRY_CURSOR_AUTO_V1`
