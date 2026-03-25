# TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_CURSOR_AUTO_V1

TENMON-ARK と Cursor の実行契約を固定するカード。

## 目的

- queue submit
- cursor receive
- objective resolve
- scoped execution
- result bundle return
- ingest
- rejudge

を同一 runtime contract で運用可能にする。

## 固定対象

- job schema: `cursor_runtime_job_schema_v1.json`
- result schema: `cursor_runtime_result_schema_v1.json`
- scope policy: `cursor_runtime_scope_policy_v1.json`
- integrated contract: `cursor_runtime_execution_contract_v1.json`
- capability manifest: `cursor_runtime_capability_manifest_v1.json`
- runtime state: `cursor_runtime_state_v1.json`

## 実行

```bash
api/scripts/tenmon_cursor_runtime_execution_contract_v1.sh
```

## 非交渉条件

- queue json 手編集禁止
- result bundle 直書き禁止
- fixture proof を success 扱いしない
- current-run evidence 必須
- high-risk は gate green まで禁止
- stale verdict を真実源にしない
- PASS 以外 seal 禁止

