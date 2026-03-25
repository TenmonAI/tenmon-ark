# TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1

## 目的

Mac 上で **Cursor** を起動し、**安全なサンドボックスファイル**を開き、**指示を貼り付け**、**明示的判定のうえで 1 パッチのみ**適用し、**`api` で `npm run build`** まで current-run で通す。

## 前提

- `TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1` が PASS（`tenmon_browser_ai_operator_runtime_summary.json` の `browser_ai_operator_runtime_pass`）。

## 非交渉

- **最初は safe target のみ**: リポジトリ相対パスが **`api/automation/**`** のみ（`cursor_operator_v1.is_safe_automation_target`）。
- **`chat.ts` 直撃禁止**（パス部分一致で拒否）。
- **ビルド失敗時はコミットしない**（スクリプトはコミットしない。ビルド失敗時はサンドボックスを元に戻す）。
- **current-run diff 保存**（`api/automation/out/cursor_operator_runtime/cursor_operator_diff_*.patch`）。
- **accept / apply は明示的判定後**: パッチ適用前に安全パス検証を通過した場合のみ `SANDBOX_STATE` を 1 行更新。

## サンドボックス

- 既定: `api/automation/out/cursor_operator_sandbox/CURSOR_OPERATOR_SANDBOX_V1.txt`（`api/automation/out/` は `.gitignore`）。
- 内容: `SANDBOX_STATE=idle` → 成功時のみ `patched`（1 行）。ビルド失敗時は `idle` に巻き戻し。

## フロー（Phase A–E）

| Phase | 内容 |
|-------|------|
| A | `open -a Cursor <sandbox>` |
| B | クリップボード経由で指示を貼付（既定: `Cmd+L` でチャット寄りにフォーカスし `Cmd+V`） |
| C | `apply_sandbox_patch_explicit` で `idle`→`patched` を1箇所のみ |
| D | `api/` で `npm run build` |
| E | unified diff・build rc・変更ファイル・`apply_success` を summary に記録 |

## 環境変数

| 変数 | 説明 |
|------|------|
| `TENMON_CURSOR_OPERATOR_INSTRUCTION` | 貼り付ける指示文 |
| `TENMON_CURSOR_OPERATOR_CHAT_HOTKEY` | チャットフォーカス（例: `command,l`） |
| `TENMON_CURSOR_OPERATOR_UI_SETTLE_SEC` | 起動後待ち（既定 2.5） |
| `TENMON_CURSOR_OPERATOR_SKIP_GUI` | `1` で貼付をスキップ（失敗扱い） |
| `TENMON_CURSOR_OPERATOR_BUILD_TIMEOUT_SEC` | ビルドタイムアウト（既定 600） |

## 受け入れ（summary）

- `cursor_open_ok`
- `file_open_ok`
- `instruction_injected`
- `patch_applied`（ビルド成功後もパッチが保持されている場合のみ True）
- `build_verify_ok`
- `cursor_operator_runtime_pass`

## NEXT

- PASS → `TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1`
- FAIL → `TENMON_CURSOR_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1`
