# TENMON_EXISTING_8OS_REALIZATION_AUDIT_CURSOR_AUTO_V1

## 目的

既存 **8 親カード群**（P01〜P08）が「設計・ファイル群のみ」なのか、**runner / manifest / verdict / queue / 出力ディレクトリ**まで含めて実成立しているかを総監査し、不足を **blocker type** 別に切り出す。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts`
- route 本体
- DB schema
- `kokuzo_pages` 正文
- systemd / 環境ファイル

## 監査次元（各 OS 群）

- runner 存在（`.py` および可能なら `.sh`）
- runner 実行可能（`.sh` の `+x`、`.py` は存在で runnable とみなす）
- 出力ディレクトリ（該当群で定義されている場合 `api/out` / `api/automation/out` 配下の glob）
- manifest 相当 JSON（parse + 必須キー）
- verdict 相当 JSON（parse + 必須キー、P01 は manifest のみ）
- queue 相当 JSON（定義がある群のみ）
- **parseable JSON**（失敗時 `parse_failure`）

## Readiness 段階

| 値 | 意味 |
|----|------|
| `exists_only` | runner のみ |
| `runnable_no_outputs` | 実行可能だが必須成果物が通らない |
| `outputs_partial` | 一部のみ通過 |
| `integrated_ready` | 当該群のチェック項目すべて通過 |

## Blocker taxonomy

- `missing_runner`
- `runner_not_executable`
- `output_dir_missing`
- `manifest_missing`
- `verdict_missing`
- `output_contract_mismatch`
- `parse_failure`
- `queue_empty_unexpected`（`queue_expect_nonempty` 時）

## 成果物

| ファイル | 説明 |
|---------|------|
| `TENMON_EXISTING_8OS_REALIZATION_AUDIT_VPS_V1` | マーカー |
| `existing_8os_readiness_matrix.json` | 8 群 × readiness |
| `existing_8os_blockers.json` | type 別・フラット一覧 |
| `existing_8os_next_priority.json` | **次に効く Cursor カード 1〜3 枚**（重複除去） |

## 実行

```bash
chmod +x api/scripts/existing_8os_realization_audit_v1.sh
api/scripts/existing_8os_realization_audit_v1.sh
```

## FAIL NEXT

`TENMON_EXISTING_8OS_REALIZATION_AUDIT_RETRY_CURSOR_AUTO_V1`
