# TENMON_K1_AND_GENERAL_KNOWLEDGE_WORLDCLASS_REPAIR_CURSOR_AUTO_V1

## 目的

`K1_TRACE_EMPTY_GATED_V1` の極短文と `GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1` の薄い本文を、天聞軸（水火・言霊・正典）で補い、会話完成度を worldclass 方向へ寄せる。

## 実装（`api/src/routes/chat.ts`）

### A. K1 補完（`__tenmonK1PostFinalizeLlmEnrichV1`）

- `【天聞の所見】` 除く本文が **100 字未満** のときだけ `llmChat` で補完。
- 補完結果の本文も **100 字未満** なら採用しない（元の応答のまま）。
- システム指示: 水火・言霊・正典軸、効用論のみ・汎用スピリチュアル一般論・定型復唱を禁止。

### B. GENERAL_KNOWLEDGE

- 分岐（哲学 / 人物 / 水火 / 既定＋単独 llm）のあと、**本文が 150 字未満** なら **追加の `llmChat`** で 150〜300 字を目指す。
- 既定分岐の単独 llm 採用閾値を **130→150 字** に揃えたうえで、上記の **最低長ガード** を全分岐に適用。

## 検証（手動プローブ例）

- 空海の即身成仏とは（K1）
- 現代人のよくない点を教えて（GENERAL_KNOWLEDGE）
- 君の思考を聞きたい（self_view 系は別カード）
- 今日の大分の天気は？
- 言霊とは → 教えて

## NON-NEGOTIABLES

- `chat.ts` 以外の high-risk 変更は原則しない（本件は `chat.ts` のみ）
- success 捏造禁止
- `dist/` 直編集禁止

*Version: 1*
