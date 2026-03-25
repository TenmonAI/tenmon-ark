# TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1

## 目的

`K1_TRACE_EMPTY_GATED_V1` で finalize 後の本文が極端に短いときだけ、LLM で **100〜220 字程度**の密度ある自然文に補い、空海・法華経・楢崎系など原典軸の問いに耐える応答にする。

## 実装（`api/src/routes/chat.ts`）

`__tenmonK1PostFinalizeLlmEnrichV1`:

- `【天聞の所見】` を除いた本文（空白正規化後）が **80 字以上**なら補完しない。
- **80 字未満**のときだけ `llmChat`。技術系キーワードのみの問いは対象外（従来どおり）。
- 補完結果の本文が **100 字未満**なら採用せず元の応答のまま。
- システム指示: 水火・言霊・正典軸、問いへの踏み込み、効用論のみ・汎用スピ・定型復唱を禁止。
- `routeReason` は変更しない。

## 検証プローブ（例）

- 空海の即身成仏とは
- 法華経の核心とは
- 楢崎のカタカムナ理解を説明して
- 言霊とは何か
- 言霊とは → 教えて（最後は別ルートの可能性あり）

## NON-NEGOTIABLES

- `dist/` 直編集禁止
- success 捏造禁止

*Version: 1*
