# 09_FINAL_DECISION — 最終裁定

**根拠**: 00–08 の事実と裁定の集約。憶測禁止。

---

## 今の TENMON-ARK は何者か

- **事実**: git head 99bf549fad124a269df0b27345a4ba0d16f3a0d1。chat.ts 12,934 行、gates_impl 1,698 行。tenmonBrainstem, knowledgeBinder, threadCoreStore, kotodamaOneSoundLawIndex, abstractFrameEngine, responseProjector, scriptureLineageEngine, sourceGraph, notionCanon, bookContinuationMemory はすべて存在する。canon JSON 群 5 本が存在する。DB（/opt/tenmon-ark-repo/kokuzo.sqlite）の kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory はすべて 0 件である。
- **裁定**: TENMON-ARK は「複数主権 route が probe で通過し、正典・binder が接続されているが、DB 実体が 0 件のため記憶・継続・学習・書籍の実体が未駆動である」状態である。KHS を唯一の言灵中枢とする設計はあるが、KHS 実体（khs_laws, khs_units, kokuzo_pages）は未投入である。

---

## 何が足りないか

- **統合不足**: 一音言霊で KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 が並存し、一部が DEF_FASTPATH_VERIFIED_V1 に落ちる。
- **知識実体不足**: 全 7 テーブルが 0 件。thread_center_memory 0 → continuity の「前の center」が空。scripture_learning_ledger 0 → 学習蓄積なし。KHS 0 → 言灵中枢の実体なし。
- **表面貫通不足**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 は固定 1 文のみ。BOOK_PLACEHOLDER_V1 は本文生成なし。正典の一句が response に含まれる経路が限定的である。

---

## 最初の 1 カードは何か

**cardId: CARD_DB_REALITY_CHECK_AND_SEED_V1**

---

## なぜそれが最短か（3 点）

1. **他層の検証が DB 実体に依存する**: continuity, memory, book, ledger の「深さ」や「正しく書けているか」は、少なくとも 1 テーブルで 1 件が書けて COUNT で確認できるまで、実測で検証できない。DB が 0 のままでは、それらの改修の acceptance を「実体で」満たせない。
2. **原因未確定なら PATCH 禁止（Ark Equation）に合致する**: 「なぜ 0 なのか」を観測で特定し、1 テーブル 1 件 insert → COUNT で acceptance を満たすことは、cause を確定してから最小修正を行うという契約に合う。他カード（一音統合・follow-up 深化）は DB がなくても実施可能だが、世界最先端級の「継続・記憶・証拠」は DB が 0 のままでは達成できない。
3. **既通過主権を壊さない**: DB reality カードは、原則として新規スクリプトまたは seed のみで完結でき、アプリ本体の常時動作を変えずに acceptance（COUNT ≥ 1 + 既通過主権 probe 不変）を満たせる。リスクが最小で、次のカード（一音統合・follow-up）の先行条件を満たす。

---

## 他を後回しにする理由

- **一音統合**: 実施可能だが、DB が 0 のままでも「route の一貫性」は得られる。ただし「継続・記憶」の品質向上は DB 解消が先の方が検証しやすい。したがって DB reality を最初に打つ。
- **follow-up 深化**: threadCenter が空の現状では、深くする改修の効果を「前の center を参照した返答」で実測しにくい。DB で thread_center に 1 件書けた後に実施する方が、acceptance を明確に定義できる。
- **canon surface penetration**: DB に依存しないが、次の 1 枚を 1 つに絞るため、2 枚目以降とする。

---

## 構築班への 1 段落指示

**最初に CARD_DB_REALITY_CHECK_AND_SEED_V1 を実施すること。getDb("kokuzo") が指す DB ファイルパスを実行時で特定し、少なくとも 1 テーブル（thread_center_memory または book_continuation_memory）に 1 件 insert する path を 1 回実行して、そのテーブルの COUNT が 1 以上であることを確認する。既通過主権の probe は従来どおりであること。acceptance を満たすまで当該カードは封印しない。満たした場合のみ commit し、次に CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1 に進むこと。**

---

## 追加観測（このカードを打つ前に必要な場合の 1 セット）

- **観測**: 実行時（例: POST /api/chat が 1 回処理される過程）に、getDbPath("kokuzo") または getDb("kokuzo") が参照しているファイルの絶対パスを 1 回だけログに出力する（一時ログ 1 行）。そのパスが /opt/tenmon-ark-repo/kokuzo.sqlite と一致するか、または別のパスであるかを記録する。
- **用途**: 「0 件の DB」が本当に運用で使っているファイルかどうかを切り分ける。一致しない場合は、運用で使っている DB ファイルに対して COUNT と seed を実施する。

---

以上。00–09 の 10 本はすべて `/opt/tenmon-ark-repo/api/src/routes/FINAL_REPORT_V1/` に格納した。
