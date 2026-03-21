# 06_REARCHITECT_PLAN — 改訂ロードマップ

**根拠**: 00–05 の裁定。1 カード = 1 目的。acceptance 未達なら封印しない。

---

## P0: DB 実体

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| CARD_DB_REALITY_CHECK_AND_SEED_V1 | kokuzo.sqlite の write path 特定と、1 テーブルで 1 件 insert → COUNT 確認 | 必要なら api/src/db または接続設定。可能なら script のみ。 | 指定テーブル COUNT ≥ 1。既通過主権 probe 不変。 | 接続先を誤ると本番 DB を触る。 | acceptance 未達。 |

---

## P1: ルート主権

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1 | 一音言霊を KOTODAMA_ONE_SOUND_GROUNDED_V1 に一本化 | chat.ts（V2/V4 ブロックを V1 委譲または削除） | ヒ/フ/ミの言霊で全て routeReason=KOTODAMA_ONE_SOUND_GROUNDED_V1。support/explicit/katakamuna 不変。 | 一音の一部パターンで regression。 | acceptance 未達。 |
| CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1 | DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP 等の整理（文書化または優先度の明確化） | 主に doc / コメント。必要なら chat.ts の分岐順のみ。 | 既通過主権不変。route 一覧が doc と一致。 | 順序変更で意図しない fallback。 | acceptance 未達。 |

---

## P2: follow-up 知能

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1 | R22_ESSENCE_ASK / R22_COMPARE_ASK の返答を、条件付きで深くする（または仕様確定） | chat.ts（該当 return ブロック） | threadCenter あり時は従来どおり or 拡張短文。なし時は現状維持 or 1 文追加。既通過主権不変。 | 深くしすぎて LLM 必須にしない。 | acceptance 未達。 |

---

## P3: 正典の表面貫通

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| CARD_CANON_SURFACE_PENETRATION_V1 | notionCanon / thoughtGuide の一文を response に含める経路を 1 つ追加 | chat.ts または responseProjector / gates_impl | 1 route で「正典の一句」が response に含まれる。既通過主権不変。 | 長文化・重複。 | acceptance 未達。 |

---

## P4: 抽象・文体

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| RESPONSE_FRAME_VARIATION_ENGINE_V2 | 抽象定義のバリエーション追加 | abstractFrameEngine.ts, chat.ts | 4 概念で response が 2 パターン以上。 | 既存 abstract の regression。 | acceptance 未達。 |
| BEAUTIFUL_JAPANESE_SURFACE_ENGINE_V1 | 文体・締まりの整形を 1 経路に適用 | responseProjector または chat の 1 ブロック | 1 route で末尾の問いが整う。 | 他 route への波及。 | acceptance 未達。 |

---

## P5: 書籍モード

| カード名 | 目的 | 編集対象 | acceptance | リスク | 封印条件 |
|----------|------|----------|------------|--------|----------|
| CARD_BOOK_MODE_REAL_EXECUTION_V2 | 章・続きの本文生成を 1 パターンで実装 | chat.ts, bookContinuationMemory, 必要なら新モジュール | 「続きを書いて」で 1 回、前回要約に基づく本文が返る。 | 長文生成の品質。 | acceptance 未達。 |

---

## P6–P8

- **P6**: NOTION_THOUGHTCORE_RESPONSE_PROJECTOR_V1（notion と thoughtCore を projector に渡す）。
- **P7**: scripture_learning_ledger への write 発火と 1 件確認。
- **P8**: 監査・メトリクスの定期レポート（スクリプトのみ）。

いずれも「目的・編集対象・acceptance・リスク・封印条件」を同じ形式で定義してから着手。

---

**次の1枚**: [07_CURSOR_ACTION_PROMPT.md](./07_CURSOR_ACTION_PROMPT.md)
