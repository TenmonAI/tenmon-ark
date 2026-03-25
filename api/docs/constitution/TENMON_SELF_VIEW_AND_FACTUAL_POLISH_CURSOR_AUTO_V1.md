# TENMON_SELF_VIEW_AND_FACTUAL_POLISH_CURSOR_AUTO_V1

## 目的

self_view と factual（weather / correction / current）の表面を、routeReason 契約を維持したまま自然化し、天聞らしい一貫性を強める。

## 実装（`api/src/routes/chat.ts`）

- `AI_CONSCIOUSNESS_LOCK_V1` の返答文を一人称・水火/言霊/原典軸に寄せて更新（routeReason は不変）。
- `FACTUAL_WEATHER_V1` の返答を「現在/明日」の自然文へ変更し、失敗時文面を確認前提の丁寧文へ更新。
- `FACTUAL_CORRECTION_V1` の返答を「認識違い前提で確認→訂正」へ更新。
- `FASTPATH_GREETING_TOP` / `FASTPATH_GREETING_OVERRIDDEN` の汎用挨拶を天聞口調に統一。

## 非交渉条件

- 最小 diff
- `AI_CONSCIOUSNESS_LOCK_V1` / `FACTUAL_CURRENT_DATE_V1` / `FACTUAL_WEATHER_V1` / `FACTUAL_CORRECTION_V1` の routeReason を変更しない
- 定型文復活禁止
- `dist/` 直編集禁止

## 検証プローブ

- 君の思考を聞きたい（self_view）
- 今日の大分の天気は？（weather）
- 明日の福岡の天気は？（weather）
- それ違うよ、さっきの事実は誤りだよ（correction）
- 今日は何曜日？（current date）
