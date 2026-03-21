# 00_FINAL_EXEC_SUMMARY — 完成版 エグゼサマリ

**根拠**: `/var/log/tenmon/report_TENMON_ULTIMATE_REARCHITECT_REPORT_V1/20260317T004538Z` 配下の 00–09、`report_TENMON_FULL_CONSTRUCTION_AUDIT_V1/20260317T003451Z`、`card_TENMON_FULL_ARCHITECTURE_REPORT_V1/20260317T003633Z`、`card_TENMON_RESPONSE_INTELLIGENCE_REPORT_V1/20260317T003649Z` の実測。憶測禁止。

---

## 現状完成度（%帯）

**62/100 帯**（00_EXEC_SUMMARY.md の completion_estimate: 62/100 を採用。FULL_CONSTRUCTION_AUDIT SUMMARY の score_estimate: 64/100、FULL_ARCH_SUMMARY の overall_progress_percent: 65 と同程度。）

**理由（構造・probe・DB 実測）**:
- **構造**: chat.ts 12,934 行（key_file_sizes.txt）、routeReason 327 箇所、placeholder 115 箇所（chat_summary.json）。core モジュール（tenmonBrainstem, knowledgeBinder, threadCoreStore, kotodamaOneSoundLawIndex, abstractFrameEngine, responseProjector, notionCanon, bookContinuationMemory）は存在。
- **probe**: 08_probe_results.json で「使い方を教えて」→ SUPPORT_PRODUCT_USAGE_V1、「今後の方向性を1000字で」→ EXPLICIT_CHAR_PREEMPT_V1、「カタカムナとは何ですか」→ KATAKAMUNA_CANON_ROUTE_V1、「人生とは？」「時間とは何？」「命とは何？」「真理とは何？」→ ABSTRACT_FRAME_VARIATION_V1、「ヒの言霊とは何ですか」→ KOTODAMA_ONE_SOUND_GROUNDED_V1 は通過。「フの言霊」「ミの言霊」は DEF_FASTPATH_VERIFIED_V1 に落ちる。「言霊とは？ 要するに？」「本質は？」は routeReason null（TRUTH_GATE_RETURN_V2）。「人生とは？ 比較すると？」→ R22_COMPARE_ASK_V1。「本を書いて」「第1章を書いて」「続きを書いて」→ BOOK_PLACEHOLDER_V1。
- **DB 実測**: 04_DB_REALITY_AND_MEMORY_REPORT および 07_count_*.txt で、kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory のいずれも **"Error: in prepare, no such table"**。0 件ではなくテーブル不在または監査時 DB パス不一致。

---

## 主裁定（何が主問題か）

**主問題は「構造不足」ではなく、「統合不足 ＋ 知識実体不足 ＋ 表面貫通不足」である。**

- **統合不足**: 一音言霊が KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 に分裂し、フ・ミは DEF_FASTPATH_VERIFIED_V1 に落ちる（probe 実測）。03 の route count で KOTODAMA_ONE_SOUND_GROUNDED_V1=2, V2=3, V4=3。競合 route の解消が未了。
- **知識実体不足**: DB 全 7 テーブルが「no such table」または未投入。KHS / kokuzo / ledger / continuity / book memory の実体が駆動していない。
- **表面貫通不足**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 は固定 1 文（ask 止まり）。BOOK_PLACEHOLDER_V1 は本文生成なし。正典の一句が response に貫通する経路が限定的。

---

## 最大の強み

- support / explicit / katakamuna / abstract の主権が probe で通過している（08_probe_results.json）。
- Binder / Projector / Brainstem / threadCoreStore / bookContinuationMemory の器と canon JSON が揃っている（01_FULL_ARCHITECTURE_DECODE、FULL_CONSTRUCTION_AUDIT module metrics）。
- 単なる LLM ラッパではなく route sovereignty が設計されている（chat.ts 内 routeReason 327 箇所）。

---

## 最大のボトルネック

- **chat.ts の巨大化**（12,934 行）：主権固定と薄いルータ化の阻害要因（LIKELY_BLOCKERS、01 裁定）。
- **route 主権競合**：一音の V1/V2/V4 と DEF_FASTPATH への落ち（03 one-sound conflict evidence）。
- **DB 実体**：「no such table」により、0 件か migration 未適用か runtime DB 不一致の切り分けが未了。
- **follow-up の浅さ**：要するに / 本質は で routeReason null、比較すると で R22_COMPARE_ASK_V1 の固定 1 文。
- **book placeholder 残存**：BOOK_PLACEHOLDER_V1 は同一固定文のみ（probe i=14,15,16）。

---

## 今すぐ直すべき3点

1. **一音言霊 route 統合**（KOTODAMA_ONE_SOUND_GROUNDED_V1 に一本化し、ヒ/フ/ミ/ハ/ヘ/ムが generic 落ちしないようにする）。
2. **follow-up intelligence 深化**（R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の仕様確定または条件付き 1 文追加。ask 止まり卒業）。
3. **DB reality check と seed / ingest 経路確定**（「no such table」の原因切り分け：runtime DB パス、migration 適用有無、1 テーブル 1 件 insert の実証）。

---

## 次の1枚（1つに絞る）

**CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1**

- 一音言霊を KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化する。
- 対象: api/src/routes/chat.ts（および必要なら kotodamaOneSoundLawIndex.ts）。
- acceptance: ヒ / フ / ミ（およびハ・ヘ・ム）の probe で routeReason がすべて KOTODAMA_ONE_SOUND_GROUNDED_V1 となり、support / explicit / katakamuna / abstract は非破壊。
- 理由: 元レポート 00_EXEC の「次の1枚」と一致。probe で即効が確認でき、既通過主権を壊さず、コードのみで完結する。DB は「no such table」のため migration/接続の切り分けが別タスクとなり、本カードの先行条件にならない。

**次の1枚**: [01_FINAL_ARCHITECTURE_DECODE.md](./01_FINAL_ARCHITECTURE_DECODE.md)
