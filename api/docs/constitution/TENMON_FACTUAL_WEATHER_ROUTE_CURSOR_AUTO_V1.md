# TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1

## 目的

天気・地域に関する質問に、**定型の所見文ではなく** `FACTUAL_WEATHER_V1` 経由で、外部ソース（wttr.in）に基づく短文回答を返す。

## 前提

- `TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1` PASS。

## 非交渉

- 最初は **無料ソース 1 本**（wttr.in）でよい。
- 取得失敗時は **「取得失敗」と正直に**伝える（別の事実を捏造しない）。
- **location は簡易抽出**でよい。取れなければ**地域を聞き返す**。
- carry / scripture 系ルーティングと**混ぜない**。
- `npm run build` PASS。

## 実装

### Phase A — detector

`classifyGeneralFactCodingRouteV1` にて、次を含むメッセージを天気 factual とする:

- `天気` / `気温` / `降水` / `気象` / `予報`
- `雨` / `晴れ` / `曇り`

（正典除外パターンの**後**、日付 factual より**前**に評価。）

### Phase B — route

- **`routeReason`**: `FACTUAL_WEATHER_V1`（`ROUTE_FACTUAL_WEATHER_V1`）

### Phase C — provider

- `api/src/core/weatherRouteV1.ts`: `extractWeatherLocationV1`（日本の主要都市・県名の簡易マッチ）と `fetchWeatherWttrInV1`（`wttr.in?format=j1`）。
- `明日` を含む場合は**翌日予報**を優先。

## 受け入れ（運用プローブ）

- `今日の大分の天気は？` — 地域付きで factual 応答、`ku.routeReason` が **`FACTUAL_WEATHER_V1`**。
- `東京の気温は？`
- `明日の福岡の天気`
- `今日の天気は？`（地域なし）— **都市名を聞き返す**。

## NEXT

- PASS → `TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1`
- FAIL → `TENMON_FACTUAL_WEATHER_ROUTE_RETRY_CURSOR_AUTO_V1`
