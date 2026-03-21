# 03_FINAL_ROUTE_SOVEREIGNTY_REPORT — 完成版 ルート主権レポート

**根拠**: routeReason 観測上位リスト / probe 確定結果 / chat.ts 内の routeReason 出現。憶測禁止。

---

## 全主権 route 一覧（probe で通過しているもの）

| routeReason | 用途 |
|-------------|------|
| SUPPORT_PRODUCT_USAGE_V1 | 使い方案内。触らない。 |
| EXPLICIT_CHAR_PREEMPT_V1 | 指定文字数返答。触らない。 |
| KATAKAMUNA_CANON_ROUTE_V1 | カタカムナ定義。触らない。 |
| ABSTRACT_FRAME_VARIATION_V1 | 人生/時間/命/真理。触らない。 |
| KOTODAMA_ONE_SOUND_GROUNDED_V1 | 一音言霊（一部）。統合対象。 |

---

## 競合 route 一覧

| routeReason | 問題（事実） |
|-------------|--------------|
| KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 | 観測で 3 つが並存。一音言霊で同一ドメインに複数 route。 |
| DEF_FASTPATH_VERIFIED_V1 | define 系に残存。一音の一部がここに落ちる（probe 確定）。 |
| DEF_LLM_TOP | define 系一般問がここに流れる（未完）。 |
| NATURAL_GENERAL_LLM_TOP | general がここに流れる（未完）。 |
| R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1 | 固定 1 文で浅い（chat.ts 8447, 8460）。 |
| BOOK_PLACEHOLDER_V1 | 本文生成なし。placeholder。 |
| DEF_CONCEPT_UNFIXED_V1 | 定義未確定時の固定文 fallback。 |

---

## placeholder / fallback / LLM top の残存一覧

| 種別 | routeReason / 箇所 | 内容（事実） |
|------|--------------------|--------------|
| placeholder | BOOK_PLACEHOLDER_V1 | chat.ts 7982–8020。本を書いて/章を書いて等で固定 1 文 + upsertBookContinuation。本文なし。 |
| fallback | DEF_CONCEPT_UNFIXED_V1 | 定義未確定時の固定文 return。 |
| fallback | R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1 | 要するに/比較で固定 1 文。 |
| LLM top | DEF_LLM_TOP | define が LLM に流れる経路。 |
| LLM top | NATURAL_GENERAL_LLM_TOP | 汎用会話が LLM に流れる経路。 |

---

## KOTODAMA_ONE_SOUND_GROUNDED_V1 / V2 / V4 の分裂整理

- **事実**: routeReason 観測で V1, V2, V4 がすべて出現。chat.ts 内に __buildKotodamaOneSoundPayloadV1（helper）、DEF_FASTPATH 直前の __oneSoundPayloadB、DEF_CONCEPT_UNFIXED 直前の __oneSoundPayloadA、および V2 用の別ブロック（正規表現・response 骨格が異なる）が存在する。
- **裁定**: 一音言霊は **KOTODAMA_ONE_SOUND_GROUNDED_V1** に 1 本化する。V2/V4 のブロックは同一 payload 生成（または __buildKotodamaOneSoundPayloadV1）を呼び、routeReason を V1 に統一するか、V2/V4 を削除し V1 の preempt のみに流す。acceptance: ヒ/フ/ミの言霊で全て routeReason === "KOTODAMA_ONE_SOUND_GROUNDED_V1"。

---

## DEF_FASTPATH_VERIFIED_V1 / DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP / BOOK_PLACEHOLDER_V1 の位置づけ

| routeReason | 位置づけ |
|-------------|----------|
| DEF_FASTPATH_VERIFIED_V1 | 言霊等の define 用の主権 route。kokuzo DB 検索または固定文。一音はここより前で preempt すべき。 |
| DEF_LLM_TOP | 定義系で DB 等で決まらない場合の LLM 経路。残すが、新規 LLM 依存は禁止のため拡張しない。 |
| NATURAL_GENERAL_LLM_TOP | 汎用会話の LLM 経路。同上。 |
| BOOK_PLACEHOLDER_V1 | 書籍モードの入口。本文生成は未実装。placeholder のまま。退避せず、拡張は別カード。 |

---

## 残す route / 退避 route / 統合 route

- **残す**: SUPPORT_*, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, DEF_FASTPATH_VERIFIED_V1, R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1, BOOK_PLACEHOLDER_V1, DEF_LLM_TOP, NATURAL_GENERAL_LLM_TOP（fallback として）、DEF_CONCEPT_UNFIXED_V1。
- **統合**: 一音 → KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一。V2, V4 は退避（削除または V1 への委譲）。
- **退避**: 一音の「別名」route（V2, V4）をコード上で V1 に寄せる。削除は acceptance 確認後にのみ。

---

## route 固定順の提案

1. support（最優先）
2. explicit（文字数指定）
3. book placeholder（本を書いて等）
4. feeling/impression 等の preempt
5. **一音言霊**（__oneSoundPayloadB → DEF_FASTPATH 直前、__oneSoundPayloadA → DEF_CONCEPT 直前。一音はここで確定）
6. DEF_FASTPATH_VERIFIED_V1（define）
7. … 他 define / concept
8. DEF_CONCEPT_UNFIXED_V1
9. R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1
10. その他 judgement / continuity 等
11. DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP（最後の fallback）

**次の1枚**: [04_FINAL_DB_REALITY_REPORT.md](./04_FINAL_DB_REALITY_REPORT.md)
