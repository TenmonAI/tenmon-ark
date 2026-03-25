# TENMON_CURSOR_WORKTREE_AUTOCOMPACT_AND_REVIEW_FLUSH_CURSOR_AUTO_V1

## 目的

Cursor Agent 実行で作業ツリーに揮発生成物が大量に載り、Review が数百ファイルに膨張する問題を抑止する。  
`api/automation` の **KEEP 対象以外**のレポート／summary／verdict／forensic 等を `out/archive/autocompact_<ts>/` へ退避し、**本当に見るべき差分**に近づける。

## 非交渉条件

- `chat.ts` / `finalize.ts` / `web/src/**` の本体改変は行わない
- **current-run 証跡**（`KEEP_EXACT_NAMES`）は移動しない
- success 捏造禁止（`--dry-run` で件数のみ確認可）
- `dist/` 直編集禁止

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_cursor_worktree_autocompact_v1.py
```

ドライラン:

```bash
python3 automation/tenmon_cursor_worktree_autocompact_v1.py --dry-run
```

## 動作

1. `git status --porcelain -uall` で変更パス数を **before** として記録
2. `generated_cursor_apply/` ディレクトリ一式を退避（存在する場合）
3. `out/` 直下の **`archive/` 以外**のサブツリー・ファイルを退避
4. `automation/` 直下の揮発ファイル（`*_summary.json` 等、KEEP 以外）を退避
5. **after** を再計測し、`tenmon_cursor_worktree_autocompact_summary.json` / `_report.md` を出力

## レビュー膨張ガード（レポート）

- 変更ファイル数 **> 120** … `review_blockers.review_file_count_gt_120` が true（次カード前に autocompact を推奨）
- **high_risk**（`chat.ts` / `finalize.ts` / `web/src/` パス）が **≥ 25** … `fail_fast.recommended` が true

## 出力

| ファイル | 内容 |
|---------|------|
| `api/automation/tenmon_cursor_worktree_autocompact_summary.json` | before/after・分類・退避一覧 |
| `api/automation/tenmon_cursor_worktree_autocompact_report.md` | 人間可読 |

## .gitignore

- `api/automation/out/archive/` および `**/watch_sessions/`、`run.log` / `nohup.log` を追加（揮発の再発防止）

*Version: 1*
