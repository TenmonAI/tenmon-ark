# TENMON_CHAT_SUBCONCEPT_MISFIRE_AND_TEMPLATE_LEAK_FIX_CURSOR_AUTO_V1

## 目的

`TENMON_SUBCONCEPT_CANON_V1` の誤着火（self_view / weather / correction）、`finalize.ts` 由来の定型テンプレ追記、および自己内省系で一人称が立たない問題を **最小 diff** で止血する。

## 変更

### `chat.ts`

- `__shouldBlockSubconceptPromotionForMetaOrFactualV1`: 訂正・`classifyGeneralFactCodingRouteV1` の天気/日付/人物/トレンド・地名（大分）＋天気・時事フレーズ・自己内省では concept→SUBCONCEPT 昇格を行わない。
- `__classifySubconceptSurface` に `self_view_introspection` を追加し、`__shapeSubconceptCanonicalBody` で **私** を用いた短文を返す（残存 SUBCONCEPT 経路向け）。
- **self_view 早期出口**（feeling の直後）: `AI_CONSCIOUSNESS_LOCK_V1` + 一人称本文。
- **訂正**: `__isFactualCorrectionUserMessageV1` に `ちがう` / `それは違` 等、本文を「確認し、訂正前提で見直します。」に更新。`ku.routeClass: analysis`。
- **`__skipContextCarry`**: 天気・時事・訂正・self_view 系で `さっき見ていた中心` 前置きを付けない（カード指定パターンを統合）。

### `finalize.ts`

- `K1_TRACE_EMPTY_GATED_V1` の極短文補完: 技術系キーワード以外は **追記 tail を空**。
- `stripSurfaceTemplateLeakFinalizeV1` の除去パターンを強化: `さっき見ていた中心（…）を土台に…` / `（…）を土台に…`（行頭）/ `【天聞の所見】いまは中心を保持したまま…` / 語義軸・現代では…・立場で答えます 等。
- **scripture essence 経路**: `stripScripturePlaceholderAndTraceV1(composed)` 直後に定型 5 種の `.replace` 連鎖。
- **`isDensityEligibleKu`**: `AI_CONSCIOUSNESS_LOCK_V1` / `FACTUAL_CORRECTION_V1` / `FACTUAL_WEATHER_V1` / `FACTUAL_CURRENT_*` / `R22_LIGHT_FACT_*` を密度契約対象外にし、finalize で本文が膨らまないようにする。

### `responsePlanCore.ts`

- `resealFinalMainlineSurfaceV1` 早期 return: 上記に加え `FACTUAL_CURRENT_DATE_V1` / `FACTUAL_CURRENT_PERSON_V1` / `FACTUAL_RECENT_TREND_V1`（semantic 主命題マージで短文が汚染・二重化しない）。

## 非交渉

- `DEF_FASTPATH_VERIFIED_V1` / `CONTINUITY_ROUTE_HOLD_V1` / `TECHNICAL_IMPLEMENTATION_V1` / `FACTUAL_CURRENT_DATE_V1` の既存正常経路を壊さない。
- dist 直編集禁止。

## 検証

- `npm run build` PASS。
