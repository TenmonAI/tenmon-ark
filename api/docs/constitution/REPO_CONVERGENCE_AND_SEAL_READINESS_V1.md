# REPO_CONVERGENCE_AND_SEAL_READINESS_V1

生成: Council 貫通実行に伴うスナップショット（参照のみ）。

## 裁定（一言）

**今すぐ seal 不可** — 追跡外ファイル・ルート配下の大量 untracked と、未コミットの runtime 変更が混在しているため。先に分類コミットまたは quarantine が必要。

## 変更済み（tracked / `M`）の例

- `api/src/planning/responsePlanCore.ts` — mainline 表面・長文化
- `api/src/routes/chat_refactor/finalize.ts` — finalize 単一出口
- `api/src/routes/chat.ts` 等 — 高リスク経路（別カードで個別レビュー推奨）

## 未追跡（`??`）の分類方針

| カテゴリ | 例 | 推奨 |
|----------|-----|------|
| constitution / OS docs | `api/docs/constitution/*.md` | **残す** — `git add` で docs のみコミット |
| 監査 shell / lib | `api/scripts/*.sh`, `api/scripts/lib/*.py` | **残す** — scripts バンドルでコミット |
| ルートの ABSTRACT_*.txt | リポジトリ直下 | **quarantine または削除候補** — リポ外アーカイブ推奨 |
| `api/src/routes/*.md` CARD_* | 設計メモ | **docs 扱い** で `routes` に置くなら命名規約を文書化 |
| `api/probe.*.json` | 証跡 | **残す / または .gitignore**（本番不要なら） |
| `api/src/founder/`, `client/...` | 機能コード | **runtime** — 別 PR でレビュー |

## 次の一手（収束）

1. `ABSTRACT_*.txt` を repo 外へ移動 or `.gitignore`
2. `api/docs/constitution` と `api/scripts` をバッチで `git add`（kokuzo_schema は触らない）
3. `api/src` の変更を mainline / memory / chat に論理分割コミット
4. `npm run build` + health + supreme audit を再実行して seal 判定

## HEAD（記録時）

`ba665cdbca3c3316ac00ab74c9b1a6d57e0a7e00`（環境により異なる場合あり）
