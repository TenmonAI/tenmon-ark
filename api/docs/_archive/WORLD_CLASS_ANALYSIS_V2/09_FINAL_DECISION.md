# 09_FINAL_DECISION — 最終裁定

**根拠**: 00–08 の事実と裁定の集約。憶測禁止。route 名・ファイル名・DB count・probe 実測を必ず書く。

---

## 一段落での断定

**今の TENMON-ARK は何者か** — git head 99bf549fad124a269df0b27345a4ba0d16f3a0d1 の時点で、chat.ts 12,934 行・gates_impl 1,698 行を中心に、tenmonBrainstem / knowledgeBinder / threadCoreStore / kotodamaOneSoundLawIndex / abstractFrameEngine / responseProjector / notionCanon / bookContinuationMemory 等の core と canon JSON が揃い、support / explicit / katakamuna / abstract の主権が probe（08_probe_results.json）で通過しているが、一音言霊は KOTODAMA_ONE_SOUND_GROUNDED_V1 と V2/V4 および DEF_FASTPATH_VERIFIED_V1 に分裂し（ヒは V1、フ・ミは DEF_FASTPATH に落ち）、DB は監査時 7 テーブルすべて「no such table」であり、R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 は固定 1 文の ask 止まり、BOOK_PLACEHOLDER_V1 は本文生成なしの placeholder である、**「統合不足 ＋ 知識実体不足 ＋ 表面貫通不足」が主問題で、構造不足は副次**のシステムである。

**何が最も足りないか** — 最も足りないのは、**route 主権の統合（一音の V1/V2/V4 と DEF_FASTPATH への落ちの解消）** と **DB 実体（7 テーブル不在または 0 件による continuity/memory/evidence の未駆動）** および **follow-up の浅さ（要するに/本質は/比較するとの ask 止まり）** の三つであり、うち **probe で即効が見え、既通過主権を壊さずコードのみで完結する**のは一音統合である。

**最初の1カードは何か** — **CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1**。一音言霊を KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化し、ヒ/フ/ミ（およびハ・ヘ・ム）の probe で routeReason がすべて KOTODAMA_ONE_SOUND_GROUNDED_V1 となるようにする。対象は api/src/routes/chat.ts（および必要なら kotodamaOneSoundLawIndex.ts）。

**なぜそれが最短か** — (1) probe で即効が確認できる（フ・ミが DEF_FASTPATH ではなく V1 で返ることを 1 回の probe で検証可能）。(2) 既通過主権（support / explicit / katakamuna / abstract）を壊さず、chat.ts 内の分岐と routeReason の統一のみで完結する。(3) DB は「no such table」のため migration/接続の切り分けが別タスクであり、本カードの先行条件にならない。DB reality は 2 枚目として実施し、continuity/memory の検証は DB 解消後に可能になる。

**他を後回しにする理由** — DB reality は原因切り分け（実行時パス・migration 適用）が必要で、本カードより手数が多く、かつ「既通過主権を壊さない」という条件の下で即効が同じ probe で見えない。follow-up 深化は threadCenter が空のままでも仕様確定や 1 文追加は可能だが、深い効果を実測するには DB 解消が先の方がよい。canon surface penetration は 1 枚に絞るため 2 枚目以降とする。したがって最初の 1 枚は一音統合に固定する。

---

## 構築班への1段落指示

**最初に CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1 を実施すること。chat.ts 内で KOTODAMA_ONE_SOUND_GROUNDED_V2 / V4 および一音で DEF_FASTPATH_VERIFIED_V1 に落ちる経路を、同一の一音 payload 生成を呼び routeReason を KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一する。ヒ/フ/ミの言霊とは何ですか の probe でいずれも routeReason が KOTODAMA_ONE_SOUND_GROUNDED_V1 であること、および使い方を教えて・方向性1000字・カタカムナ・言霊・人生とは？ の probe が従来どおりであることを確認する。acceptance を満たすまで当該カードは封印しない。満たした場合のみ commit し、次に CARD_DB_REALITY_CHECK_AND_SEED_V1 に進むこと。**

---

## 次の1枚（1つだけ）

**cardId: CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1**

- **理由 3 点**: (1) probe で即効が可視（フ・ミが V1 で返る）。(2) 既通過主権を壊さず、コードのみで完結。(3) DB の「no such table」は別タスクのため、本カードのブロッカーにならない。

---

以上。00–09 の 10 本はすべて `/opt/tenmon-ark-repo/api/src/routes/WORLD_CLASS_ANALYSIS_V2/` に格納した。
