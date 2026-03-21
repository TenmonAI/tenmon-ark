# REPO_SEAL_BATCH_COMMIT_V1

目的: **未追跡・混在差分**を憲法どおりのバッチに分け、**同一 commit 内での docs/runtime 混在を禁止**しつつ seal readiness を前進させる。

## 実行済みバッチ（このカードでコミット）

| # | ラベル | パス / 内容 | 検証 |
|---|--------|-------------|------|
| A | **constitution** | `api/docs/constitution/**/*.md`（OS / 収束 / lock / 本計画） | `git diff --cached --name-only` が `api/docs/constitution/` のみ |
| B | **ignore probes** | `.gitignore` に `api/probe.*.json` | 観測物が index に乗らない |
| C | **quarantine** | `quarantine/experimental_cursor_abstracts/` + ルート `ABSTRACT_*.txt` 移動 | 本番 mainline コミットと分離 |
| D | **scripts** | `api/scripts/**`（`lib/*.py` 含む）+ `api/tools/tenmon_full_internal_circuit_report_v1.py` | 必要なら `chmod +x *.sh` |

### 記録コミット（参照用）

- `docs(constitution): ...` → `7eb0a85`
- `chore: gitignore api/probe.*.json ...` → `3b1f264`
- `chore(quarantine): ...` → `733a759`
- `chore(scripts): ...` → `7740719`

## 保留バッチ（次 PR / 別コミット列）

| # | ラベル | パス | 注意 |
|---|--------|------|------|
| E | **runtime api — mainline 核** | `api/src/planning/`, `api/src/routes/chat_refactor/`（`humanReadableLawLayerV1.ts` 等） | `M` と `??` をまとめず、**サブディレクトリ単位**でコミット |
| F | **runtime api — chat 幹** | `api/src/routes/chat.ts`, `gates_impl.ts` | 高リスク。**単独コミット + build + supreme** |
| G | **runtime api — その他 core/routes** | `api/src/core/`, `api/src/routes/*.ts`（未追跡） | 機能単位で分割 |
| H | **routes 配下 md（docs 相当）** | `api/src/routes/**/*.md`, `WORLD_CLASS_*` 等 | **docs 扱い**なら `docs:` コミットに寄せるか `api/docs/` へ移設検討 |
| I | **client** | `client/src/**` | **API と同一コミット禁止** |
| J | **experimental** | `api/src/founder/`, `api/src/scripts/` 等 | 通過定義なしのものは **quarantine または別ブランチ** |

## no-touch

- `api/src/db/kokuzo_schema.sql` — **変更・ステージングしない**

## seal 判定（このカード後）

- ルートのスクラッチ txt と probe JSON のノイズは削減。
- **runtime の `M` / 大量 `??` は未コミットのため seal 未達** — バッチ E〜J を順に潰すこと。

## 次カード

`MAINLINE_SUPREME_REAUDIT_AFTER_SEAL_V1`（runtime バッチを一通した後、baseline 比較で錯覚なく確認）
