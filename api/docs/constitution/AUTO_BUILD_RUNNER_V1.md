# AUTO_BUILD_RUNNER_V1

## 目的

`card_catalog_v1.json` を読み、**1 カードずつ** PDCA パイプラインを実行する。

## 固定パイプライン

`OBSERVE` → `PRECHECK` → `PATCH` → `BUILD` → `DEPLOY` → `RESTART` → `AUDIT` → `ACCEPTANCE` → `CLASSIFY` → `STOP | NEXT`

- v1: `DEPLOY` / `RESTART` / `AUDIT` はプレースホルダ（ログのみ）。
- `PATCH`: 実コード編集は **実装せず**（`dry-run` 既定 / 非 dry-run は外部 Cursor 想定）。

## patch executor（class）

| class | 振る舞い |
|-------|----------|
| docs | `allowedPaths` のみ |
| runtime_refactor / runtime_safe_patch | `allowedPaths` のみ min_diff |
| client | `client/**` のみ |
| quarantine / archive | `move_only` |
| human_gate | **実行せず停止**（`human_judgement_required`） |
| audit / schema | `none` または JSON/ドキュメント min_diff |

## acceptance selector

`acceptanceProfile` → `npm run build` / `curl /health` / `client vite build` / full スクリプト（`acceptance_selector_v1.py`）。

## 記録

各実行で **git sha before/after**, **changed files**, **allowed/forbidden 判定**, **build/health/acceptance** を JSON に集約（Supervisor がログへ書き出し）。

## 禁止

- `forbiddenPaths` 接触 → **FAIL**
- `mixed_commit`（`api/src` + `client` + `non_runtime` の複合）→ **FAIL**  
  ※ `api/docs` と `api/automation` は同一バケット（非 runtime）。

## 自動 rollback

`rollbackStrategy.autoRollbackAllowed` が true かつ class が `runtime_refactor` / `client` / `docs_only` のみ自動 `git` 戻しを想定（v1 は手動推奨）。

## 実行例

```bash
cd /opt/tenmon-ark-repo/api/automation
python3 auto_build_runner_v1.py --repo-root ../.. --card AUTO_BUILD_CONDUCTOR_V1 --dry-run
python3 auto_build_runner_v1.py --repo-root ../.. --card CLIENT_BUILD_REGRESSION_GUARD_V1 --dry-run --execute-checks
```

## 次カード

`AUTO_BUILD_SUPERVISOR_V1`
