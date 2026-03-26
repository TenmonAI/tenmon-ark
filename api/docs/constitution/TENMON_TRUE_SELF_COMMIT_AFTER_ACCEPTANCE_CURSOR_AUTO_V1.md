# TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1

## 目的

acceptance **PASS** 後の段階から、条件付きで **真の self-commit** まで閉じる（既定は **commit スクリプト生成のみ**）。**acceptance PASS 以外は commit 禁止**。FAIL / rollback / human override 時は **no-commit**。**git history 汚染禁止**（無検証の自動 commit を既定で無効化）。成功の捏造はしない。

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/true_self_commit_after_acceptance_v1.py` | 厳格ゲート・override・`git_commit_*.sh` / メッセージファイル・任意実実行 |
| `api/automation/acceptance_gated_self_commit_and_requeue_v1.py` | 従来の upstream 要約 `build_summary_v1` + **`strict_autoguard_steps_pass`**（steps 検証） |

## 厳格 PASS 条件（true self-commit）

`build_probe_rollback_result.json` に **`steps` 配列**があり、次がすべて `ok: true`（`skipped` の step は従来ロジックに準拠）:

- `build`
- `health`（`/api/health` 相当）
- `audit.build`（`/api/audit.build` 相当）
- `probes`（target probes）

さらに upstream と同様:

- `cursor_patch_plan.ok === true`
- `overall_pass` / `acceptance_pass` が true
- **`rollback_executed` が true でない**

`steps` 欠落・不足は **fail-closed**（`strict_missing_*`）。

## Human override

- 既定: `api/automation/tenmon_autonomy_human_override.signal`（`TENMON_TRUE_SELF_COMMIT_OVERRIDE_FILE` で上書き可）
- 存在時: **self-commit 停止**、`fail_requeue_candidate` のみ

## Commit 実行

- 既定: **`api/automation/out/true_self_commit/git_commit_<ts>.sh`** と **`commit_message_<ts>.txt`** のみ生成（**`remote_cursor_queue.json` は変更しない**）。
- 実実行: **`TENMON_TRUE_SELF_COMMIT_EXECUTE=1`**（または `true` / `yes`）かつ `target_files` から解決した **安全パス**（`dist` 除外・リポジトリ内ファイル）に対して `git add` → `git commit -F`。

## Commit メッセージ

- `card_id`（`TENMON_CURSOR_CARD` または patch plan）
- `route`（先頭 `target_files` 等）
- `domain`（`risk_class` / `domain`）
- `acceptance_summary`（厳格ゲート要約）

## 出力

- **`api/automation/out/true_self_commit/true_self_commit_summary.json`**（`--output-dir` で変更可）
- 必須キー: `commit_executed`, `commit_sha`, `commit_skipped_reason`, `commit_allowed`, `upstream_acceptance_gated`, `fail_requeue_candidate` / `pass_requeue_candidate`

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/true_self_commit_after_acceptance_v1.py \
  --build-probe-result path/to/build_probe_rollback_result.json \
  --patch-plan path/to/cursor_patch_plan.json \
  --remote-cursor-queue path/to/remote_cursor_queue.json
```

終了コード: `commit_allowed` なら **0**、それ以外 **1**。

## nextOnPass

`TENMON_PWA_LIVED_PROOF_WORLDCLASS_SEAL_CURSOR_AUTO_V1`

## nextOnFail

停止。self-commit retry 1 枚のみ生成。
