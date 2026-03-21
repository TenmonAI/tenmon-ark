# 03_ROUTE_SOVEREIGNTY_CONFLICT_REPORT — ルート主権競合レポート

**根拠**: chat.ts 内の routeReason 出現（grep 約 77 件）/ probe 確定結果 / 既存 CARD ドキュメント。憶測なし。

---

## 主権 route 一覧（probe で通過しているもの）

| routeReason | 用途 | 備考 |
|-------------|------|------|
| SUPPORT_PRODUCT_USAGE_V1 | 使い方案内 | 触らない。 |
| EXPLICIT_CHAR_PREEMPT_V1 | 指定文字数返答 | 触らない。 |
| KATAKAMUNA_CANON_ROUTE_V1 | カタカムナ定義 | 触らない。 |
| ABSTRACT_FRAME_VARIATION_V1 | 人生/時間/命/真理 | 触らない。 |
| KOTODAMA_ONE_SOUND_GROUNDED_V1 | 一音言霊（ヒ/フ/ミ等） | 一部のみ。V2/V4 と共存。 |

---

## 競合・残存 route 一覧

| routeReason / 呼称 | 実体 | 問題 |
|--------------------|------|------|
| DEF_FASTPATH_VERIFIED_V1 | define 系の kokuzo 検索 or 言霊固定文 | define 系に残存。一音と境界が曖昧な場合がある。 |
| R22_ESSENCE_ASK_V1 | 固定 1 文（chat.ts 8447） | 常に同じ短文。深掘りなし。 |
| R22_COMPARE_ASK_V1 | 固定 1 文（chat.ts 8460） | 同上。 |
| DEF_LLM_TOP | LLM に流す define 経路 | 残存。決定論的でない。 |
| NATURAL_GENERAL_LLM_TOP | 汎用 LLM 経路 | 残存。同上。 |
| BOOK_PLACEHOLDER_V1 | 固定 1 文（chat.ts 7996） | 本文生成なし。placeholder のまま。 |
| KOTODAMA_ONE_SOUND_GROUNDED_V2 | 一音の別ブロック（正規表現・response 骨格が異なる） | V1 と重複。 |
| KOTODAMA_ONE_SOUND_GROUNDED_V4 | 一音の別ブロック（存在する場合） | V1/V2 と重複。 |

---

## placeholder / fallback / LLM top の残存箇所（ファイル・行）

| 種別 | 場所 | 内容 |
|------|------|------|
| BOOK_PLACEHOLDER_V1 | chat.ts 7982–8020 | 本を書いて/章を書いて等で固定文 + upsertBookContinuation。本文なし。 |
| DEF_CONCEPT_UNFIXED_V1 | chat.ts 7275–7290 付近 | 定義未確定時の固定文 return。 |
| R22_ESSENCE_ASK_V1 | chat.ts 8443–8454 | 要するに/本質は等で固定 1 文。 |
| R22_COMPARE_ASK_V1 | chat.ts 8456–8468 | 違いは/比較して等で固定 1 文。 |
| DEF_LLM_TOP | chat.ts 内（grep で複数） | define が LLM に流れる経路。 |
| NATURAL_GENERAL_LLM_TOP | chat.ts / gates_impl 等 | 汎用会話が LLM に流れる経路。 |

---

## route 統合作戦（最小 diff 前提）

1. **一音言霊**: KOTODAMA_ONE_SOUND_GROUNDED_V1 に一本化。V2/V4 のブロックは「同じ routeReason で同じ payload を返す」ように寄せるか、V1 の helper（__buildKotodamaOneSoundPayloadV1）を唯一の出口にし、他はその呼び出しに置き換える。acceptance: ヒ/フ/ミの言霊で全て KOTODAMA_ONE_SOUND_GROUNDED_V1。
2. **DEF_FASTPATH と一音の境界**: 一音パターンは DEF_FASTPATH より前で preempt 済み（__oneSoundPayloadB / __oneSoundPayloadA）。境界は明確。DEF_FASTPATH は「言霊とは」等の一般 define 用に残す。
3. **essence/compare ask**: 現状は意図的に短文 preempt。深くするなら「threadCenter ありのときだけ別処理」等、1 変更 1 検証で拡張。まずは仕様確認のみでも可。
4. **BOOK_PLACEHOLDER**: 本文生成は別カード。今回は「placeholder のまま」とし、封印しない。

---

## 残すべき route / 退避すべき route

- **残す**: SUPPORT_*, EXPLICIT_CHAR_PREEMPT_V1, KATAKAMUNA_CANON_ROUTE_V1, ABSTRACT_FRAME_VARIATION_V1, DEF_FASTPATH_VERIFIED_V1（define 用）, R22_ESSENCE_ASK_V1, R22_COMPARE_ASK_V1（短文のままでも可）, BOOK_PLACEHOLDER_V1（名前だけでも可）。
- **統合する**: 一音 → KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一。V2/V4 は退避（削除または V1 への委譲）。
- **退避しない**: DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP は、現状の fallback として残す。削除は acceptance の外。

---

**次の1枚**: [04_DB_REALITY_AND_MEMORY_REPORT.md](./04_DB_REALITY_AND_MEMORY_REPORT.md)
