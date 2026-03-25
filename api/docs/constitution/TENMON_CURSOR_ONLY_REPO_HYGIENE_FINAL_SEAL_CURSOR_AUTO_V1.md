# TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1

## 目的

リポジトリの衛生状態を **safe purge（allowlist のみ）**、**`.gitignore` 正規化**、**source / generated の分類（manifest）** で揃え、`tenmon_repo_hygiene_watchdog_verdict.must_block_seal` を解除可能な状態へ寄せる。

## 禁止事項（NON-NEGOTIABLE）

- `api/src/` / `web/src/` の追跡済みプロダクトコードを削除・巻き戻ししない
- `git clean -fdx` を使わない
- `.gitignore` を広げすぎて意図したソースを隠さない（generated パターンは `repo_hygiene_generated_patterns_v1.json` に限定）
- safe purge は `safe_relative_rmdirs` と「generated と判定された **untracked** のみ」に限定

## 分類

- **source**: `repo_hygiene_source_allowlist_v1.json`（prefix / glob / exact）
- **generated**: `repo_hygiene_generated_patterns_v1.json`（`gitignore_lines` + subtree / basename / exact purge）

## 実行（Phase D）

1. `api` で `npm run build`
2. `GET /api/health`, `GET /api/audit`, `GET /api/audit.build`（`TENMON_GATE_BASE`、既定 `http://127.0.0.1:3000`）
3. `api/automation/tenmon_repo_hygiene_watchdog_v1.py`
4. `api/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh`

エントリ: `api/scripts/tenmon_repo_hygiene_final_seal_v1.sh` または  
`python3 api/automation/tenmon_repo_hygiene_final_seal_v1.py --repo-root <repo>`  
（`--skip-gates` / `--skip-watchdog` / `--skip-rejudge` で局所実行可）

終了コード（抜粋）: `0` は衛生・gate・watchdog・rejudge まで通過。rejudge 失敗時は `7`。gate 失敗 `2`、watchdog block `3`、不安全残存 `4`／生成残渣 `5`／system verdict 上の hygiene 系ブロッカー `6`。

## 条件付きコミット（Phase E）

`TENMON_REPO_HYGIENE_FINAL_SEAL_COMMIT=1` かつ summary が `seal_candidate_ready=true` のときのみ、衛生関連ファイルに限り `git commit`（メッセージ固定: `seal(repo): normalize hygiene after real closed-loop proof`）。

## 成果物

- `api/automation/tenmon_repo_hygiene_final_seal_summary.json`
- `api/automation/tenmon_repo_hygiene_final_seal_report.md`
- `api/automation/tenmon_repo_hygiene_final_seal_verdict.json`（詳細）

## NEXT

- **PASS**: `TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1`
- **FAIL / 再試行**: `TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_RETRY_CURSOR_AUTO_V1`
