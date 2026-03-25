# TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_CURSOR_AUTO_V1

## 目的

dirty repo / massive untracked / backup sprawl を観測・分類し、
seal 入力を濁らせる要因を automated guard として固定する。

## 実装ファイル

- `api/automation/repo_hygiene_guard_v1.py`
- `api/scripts/repo_hygiene_guard_v1.sh`
- `api/docs/constitution/TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_CURSOR_AUTO_V1.md`

## 観測ポリシー

- read-only 観測のみ（実コード機能ロジックは変更しない）
- `git status --porcelain` を基準に dirty を分類
- `chat.ts.bak` 群は削除せず inventory として隔離観測

## 分類軸

- modify（working tree / index）
- untracked
- generated artifact
- backup sprawl
- runtime artifact
- code or config

## seal input guard

`seal_input_guard.json` には以下を固定出力する。

- `exclude_from_seal_input_globs`（seal 入力から除外すべきパス群）
- `blockers`
- `classification_summary`
- `rc`（blocker ありなら 1）

## 成果物（既定: `api/automation/out/repo_hygiene_guard_v1/`）

- `repo_hygiene_report.json`
- `seal_input_guard.json`
- `backup_sprawl_inventory.json`
- `TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_VPS_V1`

## 実行

```bash
bash api/scripts/repo_hygiene_guard_v1.sh --stdout-json
```

## FAIL_NEXT_CARD

`TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_RETRY_CURSOR_AUTO_V1`

