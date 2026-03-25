# TENMON_REMOTE_BUILD_RUNTIME_PROOF_CURSOR_AUTO_V1

## 目的

remote build / job normalizer / mac bridge / admin remote build の runtime proof を
**dry-run 最小経路**で実施し、「ファイルがある」から「橋が通る」へ進める。

## 実装ファイル

- `api/automation/remote_build_runtime_proof_v1.py`
- `api/scripts/remote_build_runtime_proof_v1.sh`
- `api/docs/constitution/TENMON_REMOTE_BUILD_RUNTIME_PROOF_CURSOR_AUTO_V1.md`

## ポリシー

- すべて dry-run / non-destructive
- 本番 deploy 自動化はしない
- 一般ユーザー UI は触らない

## 検証ステップ（runtime proof）

1. admin route existence check
2. job normalizer dry-run
3. mac bridge queue emit dry-run
4. receiver stub handshake dry-run

## 成果物（既定: `api/automation/out/remote_build_runtime_proof_v1/`）

- `remote_build_runtime_proof.json`
- `remote_build_missing_contracts.json`
- `remote_build_dryrun_trace.json`
- `TENMON_REMOTE_BUILD_RUNTIME_PROOF_VPS_V1`

## 判定

- `remote_build_missing_contracts.json` が空なら major path end-to-end を可視化できた状態
- 欠損がある場合は `fail_next_card` を
  `TENMON_REMOTE_BUILD_RUNTIME_PROOF_RETRY_CURSOR_AUTO_V1` として返す

## 実行

```bash
bash api/scripts/remote_build_runtime_proof_v1.sh --stdout-json
```

## FAIL_NEXT_CARD

`TENMON_REMOTE_BUILD_RUNTIME_PROOF_RETRY_CURSOR_AUTO_V1`

