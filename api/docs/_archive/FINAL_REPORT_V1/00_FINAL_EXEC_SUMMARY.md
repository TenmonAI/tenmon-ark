# 00_FINAL_EXEC_SUMMARY — 完成版 実行サマリ

**根拠の出所**: git head 99bf549fad124a269df0b27345a4ba0d16f3a0d1 / 未封印差分（threadCoreStore.ts, kokuzo_schema.sql, chat.ts）/ DB 実測（kokuzo.sqlite 全テーブル 0 件）/ routeReason 観測上位リスト / probe 確定結果。憶測禁止。

---

## 現状完成度（%帯）

**裁定: 40〜50% 帯**

**理由（事実に紐づく）**:
- **構造**: chat.ts 12,934 行・gates_impl 1,698 行。core モジュール（tenmonBrainstem, knowledgeBinder, threadCoreStore, kotodamaOneSoundLawIndex, abstractFrameEngine, responseProjector, scriptureLineageEngine, sourceGraph, notionCanon, bookContinuationMemory）はすべて存在し行数も確定観測と一致。
- **probe**: SUPPORT_PRODUCT_USAGE_V1, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, KOTODAMA_ONE_SOUND_GROUNDED_V1（一部）が通過。つまり「入口」の主権は複数成立している。
- **DB 実測**: kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory はいずれも 0 件。記憶・ledger・継続・書籍の「実体」が存在しない。
- よって「ルートと正典参照の接続」はあるが「記憶・継続・学習の駆動」がない状態であり、完成度は 40〜50% 帯と裁定する。

---

## 主裁定（何が主問題か）

**裁定: 主問題は「統合不足」＋「知識実体不足」＋「表面貫通不足」であり、「構造不足」は副次的である。**

**理由（事実）**:
- **統合不足**: routeReason 観測で KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 が並列に存在。probe で「一音言霊の一部が DEF_FASTPATH_VERIFIED_V1 に落ちる」と確定。同一ドメイン（一音言霊）に複数 route が割り当てられており、統合されていない。
- **知識実体不足**: DB 実測で全 7 テーブルが 0 件。thread_center_memory 0 → continuity の「前ターン center」が空。scripture_learning_ledger 0 → 学習履歴なし。kokuzo_pages / khs_laws / khs_units 0 → KHS 実体なし。器（スキーマ・関数）は存在するが中身が空。
- **表面貫通不足**: probe 確定で「essence follow-up が R22_ESSENCE_ASK_V1 で浅い」「compare follow-up が R22_COMPARE_ASK_V1 で浅い」とある。chat.ts 実体では両者とも固定 1 文のみ返している（8447 行・8460 行）。BOOK_PLACEHOLDER_V1 は本文生成なし。正典・binder は ku に載るが、最終 response が固定文で貫通していない。
- **構造不足が副次**: chat.ts 肥大は事実だが、既通過主権は成立しており、「壊れている」のは主に「統合・実体・表面」である。構造の薄い orchestrator 化は中長期であり、今回の最短ボトルネックではない。

---

## 最大の強み

1. **複数主権 route が probe で通過している**（事実: SUPPORT_PRODUCT_USAGE_V1, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, KOTODAMA_ONE_SOUND_GROUNDED_V1 一部）。
2. **canon JSON 群 5 本が存在し、binder 経由で ku に接続されている**（事実: tenmon_concept_canon_v1.json, tenmon_scripture_canon_v1.json, tenmon_subconcept_canon_v1.json, tenmon_thought_guide_v1.json, tenmon_persona_constitution_v1.json OK。knowledgeBinder.ts で getNotionCanonForRoute / getThoughtGuideSummary 等を呼んでいる）。
3. **/api/chat と /api/audit が契約聖域として存在し、decisionFrame.ku は object 固定・decisionFrame.llm は null 固定の前提が既存設計と整合する**（契約・基準文書に合致）。

---

## 最大のボトルネック

**裁定: DB 全テーブル 0 件**

**理由**: thread_center_memory が 0 のため loadThreadCore / threadCenter 依存の continuity が実質なし。scripture_learning_ledger が 0 のため学習・解像度の蓄積なし。book_continuation_memory が 0 のため書籍継続が空。KHS 中核（khs_laws, khs_units, kokuzo_pages）も 0 のため言灵中枢の実体が未投入。すべて「器はあるが中身が空」であり、他ボトルネック（一音分裂・follow-up 浅さ）の一部も、DB が効けば検証・改善可能になる。

---

## 今すぐ直すべき3点

1. **DB 0 件の原因特定と最小 1 件 seed**（cardId: CARD_DB_REALITY_CHECK_AND_SEED_V1）  
   - 根拠: 全 7 テーブル 0 件の実測。write path 未発火 / 別 DB 参照 / seed 未投入のいずれかを切り分け、1 テーブルで COUNT ≥ 1 を達成する。
2. **一音言霊 route の 1 本化**（cardId: CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1）  
   - 根拠: routeReason 観測で KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 が並存。probe で「一音の一部が DEF_FASTPATH_VERIFIED_V1 に落ちる」。同一 routeReason に統一し、ヒ/フ/ミの言霊で全て KOTODAMA_ONE_SOUND_GROUNDED_V1 を返す。
3. **R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の仕様確定**  
   - 根拠: 「essence follow-up が浅い」「compare follow-up が浅い」は固定 1 文（chat.ts 8447・8460）に起因。短文のまま主権として固定するか、条件付きで 1 文追加するかを 1 変更 1 検証で決める。

---

## 次の1枚（1つに絞る）

**cardId: CARD_DB_REALITY_CHECK_AND_SEED_V1**

- **理由**: (1) 他層（continuity, memory, book, ledger）の検証はすべて DB 実体に依存する。(2) 一音統合・follow-up 深化は DB がなくても可能だが、世界最先端級の「継続・記憶・証拠」は DB が 0 のままでは達成できない。(3) 原因未確定のまま PATCH 禁止（Ark Equation）に照らし、まず「なぜ 0 か」を観測で確定し、1 テーブル 1 件 insert → COUNT で acceptance を満たすことが最短の契約適合行動である。

**次の1枚**: [01_FINAL_ARCHITECTURE_DECODE.md](./01_FINAL_ARCHITECTURE_DECODE.md)
