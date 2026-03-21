# 02_FINAL_RESPONSE_INTELLIGENCE_REPORT — 完成版 返答知能レポート

**根拠**: chat.ts の行番号・固定文・routeReason / probe 確定結果。憶測禁止。

---

## 返答知能の層別診断

| 層 | 実体（ファイル・行） | 状態 |
|----|----------------------|------|
| 入力正規化 | normalizeCoreTermForRouting(message), trim, 末尾句読点除去。chat.ts 内で一音・define 等で使用。 | あり。 |
| route 判定 | tenmonBrainstem + chat.ts の if 連鎖。support → explicit → book placeholder → … → DEF_FASTPATH → … → DEF_CONCEPT_UNFIXED → R22_ESSENCE_ASK / R22_COMPARE_ASK → 他。 | あり。順序で優先が決まる。 |
| centerKey 決定 | ku.centerKey / threadCore.centerKey / threadCenter.center_key。binder で補完。 | あり。thread_center_memory 0 のため新規スレッドでは define で決めた center のみ。 |
| canon 参照 | getNotionCanonForRoute, getThoughtGuideSummary, buildScriptureLineageSummary, getBookContinuation。knowledgeBinder 経由。 | あり。canon JSON は読まれる。DB 0 のため lineage/ledger/book 実体は空。 |
| binder 反映 | buildKnowledgeBinder → applyKnowledgeBinderToKu。gates_impl および chat.ts 内で複数箇所。 | あり。 |
| 最終表現 | 固定文（__body*）, abstractFrameEngine の response, __buildKotodamaOneSoundPayloadV1 の response。R22_ESSENCE_ASK / R22_COMPARE_ASK は 1 文固定（chat.ts 8447, 8460）。BOOK_PLACEHOLDER_V1 は 1 文固定（7996）。 | 多くの経路で固定文。バリエーション不足。 |

---

## support / explicit / katakamuna / abstract / one-sound / general / book / follow-up の評価

| 領域 | routeReason（実測） | 評価（事実ベース） |
|------|---------------------|---------------------|
| support | SUPPORT_PRODUCT_USAGE_V1 等 | probe 通過。触らない。 |
| explicit | EXPLICIT_CHAR_PREEMPT_V1 | probe 通過。指定字数帯の長文テンプレ。 |
| katakamuna | KATAKAMUNA_CANON_ROUTE_V1 | probe 通過。 |
| abstract | ABSTRACT_FRAME_VARIATION_V1 | probe 通過。4 概念（人生/時間/命/真理）固定文。 |
| one-sound | KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 | 一部通過。分裂あり。一部は DEF_FASTPATH_VERIFIED_V1 に落ちる。 |
| general | NATURAL_GENERAL_LLM_TOP, NATURAL_FALLBACK | 未完。LLM 経路に流れる。 |
| book | BOOK_PLACEHOLDER_V1 | 未完。固定 1 文のみ。本文生成なし。 |
| follow-up | R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1, R22_ESSENCE_FOLLOWUP_V1, R22_COMPARE_FOLLOWUP_V1, CONTINUITY_ANCHOR_V1 | essence/compare **ask** は固定 1 文で浅い（8447, 8460）。follow-up は threadCenter 依存のため DB 0 では深掘り実体なし。 |

---

## GPT 超えに必要な理解層 / 圧縮層 / 表現層 / continuity 層

- **理解層**: 正規化と brainstem はある。文脈の圧縮・「何を聞かれているか」の明示的表現は少ない。DB 0 のため過去ターンの要約が存在しない。
- **圧縮層**: binder が canon/notion を ku に載せる。scripture_learning_ledger 0 のため学習結果の圧縮が空。
- **表現層**: 固定文が多い。抽象定義・一音・essence/compare ask はテンプレ。バリエーション・文体制御・「一問で締める」以外の着地が少ない。
- **continuity 層**: thread_center_memory 0 のため「前の center」が空。要するに/比較の深掘りが実体として効いていない。

---

## 一番弱い返答領域の特定

**裁定: follow-up の「ask」経路（R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1）が最も弱い。**

**理由（事実）**: chat.ts 8447 行で R22_ESSENCE_ASK_V1 は「【天聞の所見】要点を聞いています。いまの中心を一言で置くと、答えが締まります。」の 1 文のみ。8460 行で R22_COMPARE_ASK_V1 は「【天聞の所見】比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。」の 1 文のみ。probe 確定で「essence follow-up が浅い」「compare follow-up が浅い」とある。他主権（support, explicit, katakamuna, abstract）は複数文または字数を満たしているが、この 2 つは常に同一短文であり、世界最先端感を最も損ねる。

---

## ask 止まりの follow-up をどう卒業すべきか

- **オプション A**: 短文のまま主権として固定し、「促し」に特化した route と明示する（仕様確定）。
- **オプション B**: threadCenter が存在する場合に限り、別の 1 文を追加するか、正典の一句を挟む（1 変更 1 検証）。DB 0 の現状では threadCenter は空のため、まず DB reality を解消した上で検証する。
- **封印条件**: acceptance 未達なら封印。既通過主権（support, explicit, katakamuna, abstract）は変更しない。

**次の1枚**: [03_FINAL_ROUTE_SOVEREIGNTY_REPORT.md](./03_FINAL_ROUTE_SOVEREIGNTY_REPORT.md)
