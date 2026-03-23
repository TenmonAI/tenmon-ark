# TENMON_CONVERSATION_COMPLETION_CAMPAIGN_V1

## 目的

実チャットの表面を「天聞AI」寄りに寄せる。**automation / growth / storage は拡張しない。**

## 変更の柱

1. **世界観（戦争・核の未来問い）**: 先に不確実性と直接答え、言霊テンプレ前置きを避ける（`WORLDVIEW_ROUTE_V1` 先行分岐）。
2. **哲学定義（人間とは）**: `DEF_LLM_TOP` 前の抽象定義束に「人間」を追加（`ABSTRACT_FRAME_VARIATION_V1`）。
3. **ウタヒ**: `subconceptCanon` に `utahi_kotodama` を追加し `resolveSubconceptQuery` で `TENMON_SUBCONCEPT_CANON_V1` へ接続。
4. **finalize / responsePlan**: `WORLDVIEW_ROUTE_V1` / `DEF_LLM_TOP` / `NATURAL_GENERAL_LLM_TOP` / `TENMON_SUBCONCEPT_CANON_V1` / `KANAGI_CONVERSATION_V1` / `R22_JUDGEMENT_PREEMPT_V1` / `ABSTRACT_FRAME_VARIATION_V1` では、先頭の「立脚の中心は…」固定・「一貫の手がかりは…」糊付け・立脚前置 generic 糊付けを抑止。実根拠なし時は「根は、参照は…」行も省略。

## 不変

- `routeReason` 文字列の追加は原則なし（既存列挙のみ使用）。
- `decisionFrame.ku` は object のまま。
- `kokuzo_schema.sql` は no-touch。

## 次カード

`TENMON_CONVERSATION_FINAL_SEAL_V1`
