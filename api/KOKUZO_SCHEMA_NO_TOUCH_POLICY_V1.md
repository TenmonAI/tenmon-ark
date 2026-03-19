# KOKUZO_SCHEMA_NO_TOUCH_POLICY_V1

**対象ファイル:** `api/src/db/kokuzo_schema.sql`  
**封印基準点:** be3f7ff（chat refactor 封印系列）

## 方針

`api/src/db/kokuzo_schema.sql` は **be3f7ff 系列の chat refactor 封印対象ではない**。この系列では **add / commit しない**。

## 理由

- chat refactor 封印（dc74b17 → be3f7ff）の範囲は「chat 経路・majorRoutes・finalize の実行依存の確定」に限定する。
- kokuzo_schema の変更は DB スキーマ・別機能の変更であり、chat refactor の acceptance（PATCH29）の成否と直結しない。
- 封印系列に混ぜると「clean checkout → build → restart → acceptance」の再現範囲が曖昧になり、封印の意味が薄れる。

## 運用規則

1. **be3f7ff 系列での扱い:** `kokuzo_schema.sql` に変更があっても、このカード群では `git add` / `git commit` しない。
2. **build:** 既存の copy-assets 等で `src/db/kokuzo_schema.sql` は `dist/` にコピーされる。**runtime が参照するのは dist 側**。未 commit の変更が dist に反映されていれば、その状態で API は動作する。
3. **別カードでの扱い:** kokuzo_schema を正式に変更・追跡する場合は、別ブランチ／別カードで「DB スキーマ変更」として行う。

## runtime 対象 / 非対象

| 項目 | 内容 |
|------|------|
| **runtime 対象** | アプリが読みに使うのは **ビルド成果物**（例: `api/dist/db/kokuzo_schema.sql`）である。未 commit のまま `npm run build` すれば dist にその内容がコピーされるため、**その時点の working tree の内容で runtime は動く**。 |
| **非対象（封印対象外）** | 上記ファイルを **git 履歴に含めるかどうか**は、chat refactor 封印の対象外。封印の「再現できる状態」には「kokuzo_schema を commit した状態」は含めない。 |

## まとめ

- **no-touch:** be3f7ff 系列では `api/src/db/kokuzo_schema.sql` を add/commit しない。
- **理由:** 封印範囲の純化と、再現範囲の明確化。
- **runtime:** 動作確認は working tree + build の dist に依存。commit の有無は runtime の起動・acceptance の判定からは分離する。
