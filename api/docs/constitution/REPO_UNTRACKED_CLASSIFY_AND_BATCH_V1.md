# REPO_UNTRACKED_CLASSIFY_AND_BATCH_V1

目的: untracked / 変更の**次コミット単位**を固定し、seal 不可理由を具体化する（runtime と docs を混ぜない）。

## 分類軸

| バケット | 含むものの例 | 扱い |
|----------|----------------|------|
| **A constitution** | `api/docs/constitution/*.md` | `git add api/docs/constitution/` のみで **docs 専用コミット** |
| **B scripts / forensic** | `api/scripts/**/*.sh`, `api/scripts/lib/*.py` | **scripts 専用コミット**（実行権 `chmod +x` 確認） |
| **C runtime api** | `api/src/**/*.ts`（`kokuzo_schema.sql` 除外） | 論理別: `chat_refactor` / `planning` / `routes` / `core` に分割コミット推奨 |
| **D client** | `client/src/**` | **別 PR**（API と混在コミット禁止） |
| **E experimental / scratch** | リポジトリ直下 `ABSTRACT_*.txt`, `api/probe.*.json`（任意） | **quarantine**（リポ外 or `.gitignore`）または証跡専用コミット |
| **F routes 配下 md** | `api/src/routes/CARD_*.md` 等 | **docs 扱い**なら `docs/` へ移動検討、または `docs:` プレフィックスコミット |

## 推奨コミットバッチ順（混在禁止）

1. `A` のみ  
2. `B` のみ  
3. `C` をサブディレクトリ単位（例: `planning` → `chat_refactor` → 残り）  
4. `D` のみ  
5. `E` を処理してから再度 `git status`  

## seal 不可理由（具体）

- **untracked が 100 件超**かつ **runtime / docs / scratch が同一ステージに乗るリスク**があるため、現状は憲法の「docs/runtime 混在禁止」に違反しうる。
- **単一の「完成」コミット**に全バケットを載せないこと。

## 参照

- `REPO_CONVERGENCE_AND_SEAL_READINESS_V1.md`（前段の収束メモ）
