# AUTO_BUILD_CONDUCTOR_V1

Build Automation Council — **conductor 層**（machine-readable カード定義）。

## 目的

- 全改善カードを **JSON** で定義し、Runner / Supervisor が同じ契約で駆動できるようにする。
- **PDCA Dev Core** 固定、**1 変更 = 1 検証**、**acceptance PASS 以外は封印禁止**。

## スキーマ（`api/automation/card_schema_v1.json`）

- **cardName** — 一意 ID（`CARD_V1` 形式）
- **class** — `audit` | `docs` | `runtime_refactor` | `runtime_safe_patch` | `client` | `quarantine` | `archive` | `schema` | `human_gate`
- **objective** — 人間可読の目的
- **allowedPaths** / **forbiddenPaths** — glob パターン（Runner が diff 検証）
- **requiresHumanJudgement** — 正典 / thought guide / persona constitution / KHS 意味改変は **true**（自動確定禁止）
- **prechecks** / **postchecks** — 観測・コマンド
- **patchStrategy.mode** — `none` | `min_diff` | `move_only` | `external_cursor` | `human_prompt_only`
- **acceptanceProfile** — `build_only` | `api_health` | `smoke_min` | `route_regression` | `client_build` | `full_acceptance`
- **nextOnPass** / **nextOnFail** — 次カードまたは `STOP`
- **rollbackStrategy** — `autoRollbackAllowed` + scope（`runtime_refactor` / `client` / `docs_only` / `none`）
- **sealPolicy** — `requiresAcceptancePass`, `mixedCommitForbidden`

## カタログ（`card_catalog_v1.json`）

- 自動化対象カードを **25 件以上**登録（例: CHAT 幹線、route audit、client guard、archive 等）。

## 依存グラフ（`card_dependency_graph_v1.json`）

- **DAG のみ**（`before` → `after`）。循環は `supervisor_v1.py --validate` で検出し **FAIL 停止**。

## 依存解決方針

- `after` のカードは、すべての `before` 連結成分が **completed** になるまで **pending**。
- 独立ノード（辺なし）はいつでもキュー投入可（ただし **human_gate** は常に手動承認後）。

## mixed commit 防止

- 1 コミットあたり **単一根**（`api/docs/` OR `api/src/` OR `client/` OR `api/automation/` の単独、またはカードが明示した **allowedPaths のみ**）。
- Runner / Supervisor が **changed files** を根別に分類し、複数根なら **mixed_commit** で **FAIL 停止**（証拠束保存）。

## human gate 方針

- `requiresHumanJudgement: true` または class `human_gate` → **PATCH 実行せず**プロンプト出力で停止。
- 正典本文・thought guide・persona constitution の**意味内容は human_judgement_required**（自動確定しない）。

## fail stop 方針

- **FAIL** 時は `/var/log/tenmon/card_<CARD>/<TS>/`（未作成時は `TENMON_CARD_LOG_ROOT` または `api/automation/_card_logs/`）に **run.log**, **result.json**, **diff_summary.json**, **acceptance_summary.json** を保存して **停止**。
- **forbiddenPaths** 接触 → 即 **FAIL**。

## 検証

```bash
python3 -m json.tool api/automation/card_schema_v1.json >/dev/null
python3 -m json.tool api/automation/card_catalog_v1.json >/dev/null
python3 -m json.tool api/automation/card_dependency_graph_v1.json >/dev/null
python3 api/automation/supervisor_v1.py --validate-only
```

## 次カード

`AUTO_BUILD_RUNNER_V1`（runner 実装）
