# TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1

## 目的

事実質問（天気・日付・時刻・政局・ニュース等）で、前ターンの thread 中心に紐づく

「さっき見ていた中心（…）を土台に〜」「（…）を土台に、いまの話を見ていきましょう」

が **誤って前置きされる**のを防ぐ。  
**言霊・正典系の carry ロジック自体は別ブロック**で、`__skipContextCarry` は **factual パターン時のみ** true。

## 前提

- `TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_CURSOR_AUTO_V1` PASS。

## 非交渉

- 最小 diff、`chat.ts` の NATURAL general follow-up / carry 付近のみ。
- `routeReason` 契約を壊さない。
- factual / weather / date / news 系の **メッセージ**に対してのみ skip。
- `npm run build` PASS。

## 実装

`__msgCtxCarry` に対し `__skipContextCarry` を評価し、

`__threadCenterForGeneral && __isFollowupGeneral && outText` の **carry 前置き付与**を `!__skipContextCarry` のときだけ実行。

### Skip パターン（概要）

- 天気・気温・降水・気象・予報  
- 今日/明日/明後日 と 天気・日付・何日・曜日・予報の組み合わせ  
- 「日付」＋依頼表現  
- 何時・現在時刻・曜日  
- 総理・首相・大臣・内閣  
- ニュース  
- 「最新」＋ ニュース/政治/政局/世情（経典・解釈・教義・真言を含む文は除外）  
- 「現在」＋ 誰/総理/首相/ニュース  

## 受け入れ（運用プローブ）

次の発話で **context carry 前置きが 0 件**であること:

1. `今日の大分の天気は？`
2. `今日の日付を教えてください`
3. `今の総理は誰？`
4. `最新ニュースは？`

正典・概念の通常フォローでは carry が **従来どおり**付くこと。

## NEXT

- PASS → `TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1`
- FAIL → `TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_RETRY_CURSOR_AUTO_V1`
