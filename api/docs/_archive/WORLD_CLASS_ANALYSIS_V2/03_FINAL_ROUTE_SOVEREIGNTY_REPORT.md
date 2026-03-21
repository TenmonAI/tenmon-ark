# 03_FINAL_ROUTE_SOVEREIGNTY_REPORT — 完成版 主権競合レポート

**根拠**: ULTIMATE 03_ROUTE_SOVEREIGNTY_CONFLICT_REPORT、06_route_reason_counts.txt、08_probe_results.json、03 one-sound conflict evidence（chat.ts 行番号）。憶測禁止。

---

## 全主権 route 一覧（観測上位）

| count | routeReason |
|-------|-------------|
| 24 | TENMON_SCRIPTURE_CANON_V1 |
| 15 | DEF_FASTPATH_VERIFIED_V1 |
| 8 | NATURAL_GENERAL_LLM_TOP |
| 8 | EXPLICIT_CHAR_PREEMPT_V1 |
| 7 | TENMON_SUBCONCEPT_CANON_V1 |
| 7 | KATAKAMUNA_CANON_ROUTE_V1 |
| 7 | ABSTRACT_FRAME_VARIATION_V1 |
| 6 | R22_COMPARE_FOLLOWUP_V1 |
| 5 | NATURAL_FALLBACK |
| 4 | R22_ESSENCE_FOLLOWUP_V1, CONTINUITY_ANCHOR_V1, DEF_FASTPATH_PROPOSED_V1, WORLDVIEW_ROUTE_V1, R22_FUTURE_OUTLOOK_V1 |
| 3 | R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1, KOTODAMA_ONE_SOUND_GROUNDED_V4, KOTODAMA_ONE_SOUND_GROUNDED_V2, ... |
| 2 | KOTODAMA_ONE_SOUND_GROUNDED_V1, BOOK_PLACEHOLDER_V1, ... |
| 1 | DEF_LLM_TOP, DEF_CONCEPT_UNFIXED_V1, SUPPORT_PRODUCT_USAGE_V1, TRUTH_GATE_RETURN_V2, ... |

（完全一覧は 03_ROUTE_SOVEREIGNTY_CONFLICT_REPORT および 06_route_reason_counts.txt 参照。）

---

## 競合 route 一覧

- **一音言霊**: 同一入力種（〇の言霊とは何ですか）が KOTODAMA_ONE_SOUND_GROUNDED_V1（ヒで通過）と KOTODAMA_ONE_SOUND_GROUNDED_V2 / V4 および DEF_FASTPATH_VERIFIED_V1（フ・ミで落ち）に分かれる。chat.ts 内に 2829(V1), 2889-2932(V4), 4773-4775(V1/V2 条件), 5844-5860, 6011-6027, 7255, 7474-7596, 10406, 10456, 10505-10532(V2), 10609-10888(DEF_FASTPATH) 等のブロックが存在（03 one-sound conflict evidence）。
- **define 一般**: DEF_FASTPATH_VERIFIED_V1 と DEF_LLM_TOP の境界。言霊は DEF_FASTPATH、その他は DEF_LLM_TOP に流れ得る。
- **general**: NATURAL_GENERAL_LLM_TOP と TENMON_SCRIPTURE_CANON_V1 等の境界。probe i=17「天聞アークの構造は？」→ TENMON_SCRIPTURE_CANON_V1。

---

## placeholder / fallback / LLM top の残存一覧

| 種別 | routeReason 例 | 位置づけ |
|------|----------------|----------|
| placeholder | BOOK_PLACEHOLDER_V1 | 本を書いて/第1章/続きを書いて は同一固定文。本文未生成。 |
| placeholder | R11_GENERAL_RELATION_ROUTE_PLACEHOLDER_V1, R11_GENERAL_KNOWLEDGE_ROUTE_PLACEHOLDER_V1 | count 2 ずつ。 |
| fallback | NATURAL_FALLBACK (5), DEF_PROPOSED_FALLBACK_V1 (2) | 一般会話の落ち先。 |
| LLM top | NATURAL_GENERAL_LLM_TOP (8), DEF_LLM_TOP (1), N1_GREETING_LLM_TOP (3), N2_KANAGI_PHASE_TOP (3) | LLM に流れる入口。 |

---

## KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 の分裂整理

- **V1**: chat.ts 2829, 7255 等。ヒの言霊で probe 通過。count 2。
- **V2**: chat.ts 10505-10532, 10465 付近。count 3。
- **V4**: chat.ts 2889-2932。count 3。
- **DEF_FASTPATH 落ち**: フ・ミは「言霊とは、天地に鳴り響く五十連の音と…」の同一文で DEF_FASTPATH_VERIFIED_V1。一音専用の説明ではない。
- **裁定**: 一音言霊を **KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化**する。V2/V4 のブロックで同一 payload 生成（例: __buildKotodamaOneSoundPayloadV1）を呼び routeReason を V1 に統一するか、V2/V4 を削除し V1 の preempt のみに流す。acceptance: ヒ/フ/ミ/ハ/ヘ/ム で routeReason がすべて KOTODAMA_ONE_SOUND_GROUNDED_V1。

---

## DEF_FASTPATH_VERIFIED_V1 / DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP / BOOK_PLACEHOLDER_V1 の位置づけ

- **DEF_FASTPATH_VERIFIED_V1**: 言霊の定義の確定経路。一音のフ・ミが誤ってここに落ちている。count 15。残すが、一音は V1 に吸収する。
- **DEF_LLM_TOP**: count 1。一般 define が LLM に流れる入口。縮退の対象（P4 想定）。
- **NATURAL_GENERAL_LLM_TOP**: count 8。一般会話の LLM 入口。generic 化しやすい。縮退または天聞化の対象。
- **BOOK_PLACEHOLDER_V1**: 書籍モードの入口。現状は placeholder のみ。本文生成は CARD_BOOK_MODE_EXECUTION 等で後続。

---

## 残す route / 退避 route / 統合 route

- **残す**: SUPPORT_PRODUCT_USAGE_V1, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, DEF_FASTPATH_VERIFIED_V1（言霊総論用）, R22_COMPARE_ASK_V1, R22_ESSENCE_ASK_V1（仕様確定後）, BOOK_PLACEHOLDER_V1（実装まで維持）, CONTINUITY_ANCHOR_V1 等。
- **統合**: KOTODAMA_ONE_SOUND_GROUNDED_V2, V4 → KOTODAMA_ONE_SOUND_GROUNDED_V1 に統合。一音で DEF_FASTPATH に落ちる経路を V1 に寄せる。
- **退避（整理対象）**: DEF_LLM_TOP, NATURAL_GENERAL_LLM_TOP は文書化し、優先順序を明確にしたうえで、縮退カードで扱う。

---

## route 固定順の提案

1. support / explicit / katakamuna / abstract は現状順序を維持（既通過主権）。
2. 一音言霊を **DEF_FASTPATH や generic define より前**で単一ブロックにし、KOTODAMA_ONE_SOUND_GROUNDED_V1 のみ返す（03 の「一音言霊を generic define / DEF_FASTPATH_VERIFIED_V1 より前で固定捕捉」に合わせる）。
3. BOOK_PLACEHOLDER_V1 は現状のまま。follow-up（R22_*）は ask 卒業カードで仕様確定後に固定。

**次の1枚**: [04_FINAL_DB_REALITY_REPORT.md](./04_FINAL_DB_REALITY_REPORT.md)
