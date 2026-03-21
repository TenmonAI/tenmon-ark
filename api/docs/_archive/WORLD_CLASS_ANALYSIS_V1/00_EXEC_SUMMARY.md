# 00_EXEC_SUMMARY — 実行サマリ

**根拠**: git head 99bf549fad124a269df0b27345a4ba0d16f3a0d1 / 未封印差分（threadCoreStore.ts, kokuzo_schema.sql, chat.ts）/ DB 実測 0 件 / probe 確定結果のみ。憶測なし。

---

## 現状完成度

| 観測項目 | 実測 |
|----------|------|
| chat.ts | 12,934 行 |
| gates_impl.ts | 1,698 行 |
| 通過主権（probe 確定） | SUPPORT_PRODUCT_USAGE_V1, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, KOTODAMA_ONE_SOUND_GROUNDED_V1（一部） |
| DB（kokuzo.sqlite） | kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory いずれも **0 件** |
| canon JSON 群 | 存在確認済み |
| core モジュール | tenmonBrainstem, knowledgeBinder, threadCoreStore, kotodamaOneSoundLawIndex, abstractFrameEngine, responseProjector, scriptureLineageEngine, sourceGraph, notionCanon, bookContinuationMemory 存在 |

**完成度（実測ベース）**: ルーティング・正典参照・抽象定義・一音言霊の「入口」はある。記憶・学習・継続・書籍の「実体」は DB 0 件により未駆動。**約 40〜50%**（主権は通るが記憶/ledger/継続が空）。

---

## 最大の強み

1. **route 主権が複数確定している**  
   support / explicit / katakamuna / abstract frame / 一音の一部が probe で通過。chat.ts 内に `buildKnowledgeBinder` / `applyKnowledgeBinderToKu` / sourceGraph / notionCanon が接続されている（コード実体・probe 両方で確認）。
2. **正典・概念の参照路が存在する**  
   canon JSON 群・notionCanon・thoughtGuide・kotodamaOneSoundLawIndex・abstractFrameEngine がファイルとして存在し、binder 経由で ku に載る設計になっている。
3. **explicit 文字数指定が効いている**  
   EXPLICIT_CHAR_PREEMPT_V1 で指定字数帯の返答が返る（probe 確定）。

---

## 最大のボトルネック

**DB がすべて 0 件であること**（実測）。

- `thread_center_memory` 0 件 → continuity / threadCenter 依存の深掘りが実質なし。
- `scripture_learning_ledger` 0 件 → 学習履歴・解像度の蓄積なし。
- `kokuzo_pages` / `khs_laws` / `khs_units` 0 件 → 検索・法・ユニットの実体なし。
- `synapse_log` 0 件 → route 集計・監査が実行時ログに依存。
- `book_continuation_memory` 0 件 → 書籍継続は upsert 先が空。

これが「知識実体不足」と「記憶系未駆動」の**直接証拠**。構造ではなく**中身が空**。

---

## 今すぐ直すべき3点

1. **DB 0 件の原因特定と最小 seed 投入（CARD_DB_REALITY_CHECK_AND_SEED_V1）**  
   - kokuzo.sqlite のスキーマ・接続先・write path が本当に発火しているか確認。  
   - 未接続なら「どこで書くべきか」をファイル名・関数名で特定し、1 テーブルだけでも 1 件 insert して count で検証。

2. **一音言霊 route の統一（CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1）**  
   - 実測で KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 が共存。  
   - chat.ts 内で一音を返す箇所を 1 本の routeReason に寄せ、probe で「ヒ/フ/ミの言霊」がすべて同じ route で返るようにする。

3. **R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の「浅い」返答の仕様確認**  
   - 実体: chat.ts 8447 行・8460 行で固定短文 1 本のみ返している（要するに/比較の促し）。  
   - 「浅い」を「深くする」なら、ここを「短文のまま」とするか「条件付きで LLM または別テンプレ」に変えるかを 1 変更 1 検証で決める。

---

## 次の1枚

**CARD_DB_REALITY_CHECK_AND_SEED_V1**

- **理由**: 他ルートの「深さ」や「継続」「書籍」は、DB が 0 のままでは実体で検証できない。先に「なぜ 0 なのか」「1 件書けたら acceptance」までを実測で固める必要がある。
- **目的**: kokuzo.sqlite への write path の有無と、少なくとも 1 テーブルで 1 件 insert → count で確認。
- **acceptance**: 該当テーブルの COUNT が 1 以上になること。既通過主権の probe は変わらないこと。

---

**次の1枚**: [01_FULL_ARCHITECTURE_DECODE.md](./01_FULL_ARCHITECTURE_DECODE.md)
