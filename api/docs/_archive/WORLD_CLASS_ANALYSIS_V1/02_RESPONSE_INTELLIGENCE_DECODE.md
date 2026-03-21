# 02_RESPONSE_INTELLIGENCE_DECODE — 返答知能デコード

**根拠**: chat.ts 実体（行番号・固定文）/ probe 確定結果のみ。憶測なし。

---

## 返答知能の分解

| 層 | 実体 | 状態 |
|----|------|------|
| 入力正規化 | normalizeCoreTermForRouting(message), trim, 末尾句読点除去 | あり。一音・define で使用。 |
| route 判定 | tenmonBrainstem + chat.ts 内の if 連鎖（support → explicit → book → … → DEF_FASTPATH → … → DEF_CONCEPT_UNFIXED） | あり。複数 route が並列に存在し、順序で優先が決まる。 |
| centerKey 決定 | ku.centerKey / threadCore.centerKey / threadCenter.center_key / binder で補完 | あり。thread_center が 0 件のため、新規スレッドでは define で決めた center のみ。 |
| canon 参照 | getNotionCanonForRoute, getThoughtGuideSummary, buildScriptureLineageSummary, getBookContinuation | あり。中身は canon JSON と DB。DB 0 のため lineage/ledger/book の実体は空。 |
| binder 反映 | buildKnowledgeBinder → applyKnowledgeBinderToKu | あり。sourcePack / notionCanon / thoughtGuideSummary 等が ku に載る。 |
| 最終表現 | 固定文（__body*）, abstractFrameEngine の response, __buildKotodamaOneSoundPayloadV1 の response | あり。LLM を使わない経路はほぼ固定文。 |

---

## routeReason ごとの品質差（実測）

| routeReason | 返答の実体 | 品質メモ |
|-------------|------------|----------|
| SUPPORT_PRODUCT_USAGE_V1 | 固定短文（使い方案内） | probe 通過。十分。 |
| EXPLICIT_CHAR_PREEMPT_V1 | 指定字数帯の長文テンプレ（見立て→展開→着地） | probe 通過。文字数は満たす。 |
| KATAKAMUNA_CANON_ROUTE_V1 | 正典ベースの定義 | probe 通過。 |
| ABSTRACT_FRAME_VARIATION_V1 | abstractFrameEngine の 4 概念（人生/時間/命/真理）固定文 | probe 通過。 |
| KOTODAMA_ONE_SOUND_GROUNDED_V1（一部） | __buildKotodamaOneSoundPayloadV1 または DEF 直前 preempt の短文 | 通過するが、V1/V2/V4 が共存し一貫していない。 |
| R22_ESSENCE_ASK_V1 | 固定 1 文「要点を聞いています。いまの中心を一言で置くと、答えが締まります。」（chat.ts 8447） | 浅い。常に同一文。 |
| R22_COMPARE_ASK_V1 | 固定 1 文「比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。」（chat.ts 8460） | 浅い。常に同一文。 |
| DEF_FASTPATH_VERIFIED_V1 | kokuzo DB 検索または LLM 経路。DB 0 のため実質 LLM 側に流れる可能性 | define 系に残存。 |
| BOOK_PLACEHOLDER_V1 | 固定 1 文「長文執筆モードに入る前提で受け取りました。…」（chat.ts 7996） | 本文生成なし。placeholder。 |
| DEF_CONCEPT_UNFIXED_V1 | 固定の「未確定定義」文（260 字程度で打ち切り） | LLM を使わない fallback。 |
| DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP | LLM 呼び出し | 残存。深いが非決定論的。 |

---

## abstract / support / one-sound / general / book / follow-up の評価

- **abstract**: 4 概念のみ。abstractFrameEngine の固定文。表現は整っているがバリエーションなし。
- **support**: 十分。触らない。
- **one-sound**: ヒ/フ/ミで動くが、route が V1/V2/V4 に分散。統合すると一貫する。
- **general**: NATURAL_GENERAL_LLM_TOP 等に流れると LLM 依存。threadCenter なし時の essence/compare は固定短文。
- **book**: 入口と routeReason のみ。本文生成なし。
- **follow-up**: thread_center_memory が 0 のため「前のターンの center」が空。continuity の深掘りが実体として効いていない。

---

## GPT 超えに足りない層（実測から推せる不足）

| 層 | 現状 | 不足 |
|----|------|------|
| 理解層 | 正規化 + brainstem + 多数 preempt | 文脈の圧縮・要約・「何を聞かれているか」の明示的表現が少ない。 |
| 圧縮層 | binder が canon/notion を ku に載せる | DB 0 のため学習・ledger の圧縮結果が空。continuity の要約がない。 |
| 表現層 | 固定文 + 一部 LLM | バリエーション・文体制御・「一問で締める」以外の着地が少ない。 |

※「推せる不足」は、実装実体（固定文の多さ・DB 0・thread_center 0）から導いたもので、憶測の範囲を最小にしている。

---

**次の1枚**: [03_ROUTE_SOVEREIGNTY_CONFLICT_REPORT.md](./03_ROUTE_SOVEREIGNTY_CONFLICT_REPORT.md)
