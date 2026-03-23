# AUTO_BUILD_REPLAY_AUDIT_V1

## 目的

apply 相当の作業後に **git 差分・build ログ相当・supervisor 検証・キュー状態** を再収集し、指定カードの **allowed/forbidden** と照らして **replay 監査 JSON** に固定する。runtime サービスは変更しない（任意でローカル `npm run build` のみ）。

## 入力

| 入力 | 取得方法 |
|------|-----------|
| `card name` | `--card`（カタログの `allowedPaths` / `forbiddenPaths` / `nextOnPass` に使用） |
| git diff | `git diff --name-only HEAD` / `--stat` |
| build log | `--with-build` 時に `api/` で `npm run build` の stdout/stderr 末尾 |
| supervisor | `supervisor_v1.py --validate-only` の結果 + `_card_logs/**/result.json` の最新 |
| queue | `queue_store_v1.load_snapshot` |

## 出力

- `api/automation/reports/replay_audit_v1.json`
- `api/automation/reports/replay_audit_v1.md`（`--emit-report`）

含める項目: 変更ファイル一覧、path guard 結果、build 結果、audit（DAG/カタログ検証）、acceptance 合成、`finalStatus`（pass|fail|partial）、**`nextCardEligibility`**（通過時はカタログ `nextOnPass`）。

## CLI

```bash
python3 api/automation/replay_audit_v1.py --repo-root . --stdout-json
python3 api/automation/replay_audit_v1.py --repo-root . --emit-report --check-json
# ビルドログも取る場合
python3 api/automation/replay_audit_v1.py --repo-root . --with-build --emit-report
```

## 次カード

**AUTO_BUILD_MULTI_CARD_CAMPAIGN_V1**
