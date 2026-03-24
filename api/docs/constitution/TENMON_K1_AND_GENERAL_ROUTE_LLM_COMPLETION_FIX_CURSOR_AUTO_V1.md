# TENMON_K1_AND_GENERAL_ROUTE_LLM_COMPLETION_FIX_CURSOR_AUTO_V1

## 目的

テンプレ除去後に残る **K1 極短文** と **GENERAL_KNOWLEDGE の前置きのみ** を、`llmChat` で自然文化し、監査上の「中身の空洞化」を埋める（テンプレ再注入はしない）。

## 変更

### `chat.ts`

- **`__tenmonK1PostFinalizeLlmEnrichV1`**: `applyFinalAnswerConstitutionAndWisdomReducerV1` の**直後**、`routeReason === K1_TRACE_EMPTY_GATED_V1` かつ本文コアが **50 字未満** のときだけ LLM 補完（100〜200 字目安・`【天聞の所見】`・水火・言霊・正典軸）。技術系キーワード・プロバイダ未設定・失敗時は本文不変。
- **`res.json` / `__TENMON_FREECHAT_RESJSON_FINAL`**: 上記補完を `await` で通すため **async** 化。`reply` を **async** にし、`return await res.json` / `return await reply` を一貫。
- **事実経路の `GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1`（else 枝）**: 短文フォールバックのあと、プロバイダ OK なら `llmChat` で **150〜300 字・3〜5 文** の本文を生成（メタ前置きのみ禁止・具体必須）。

### `finalize.ts`（閾値のみ）

- **K1_TRACE_EMPTY_GATED_V1** の極短文判定を **100 → 50 字** に寄せ、`chat.ts` 側の補完閾値と整合。

## 非交渉

- `TECHNICAL_IMPLEMENTATION_V1` / `FACTUAL_CURRENT_DATE_V1` / `DEF_FASTPATH_VERIFIED_V1` を壊さない。
- テンプレ定型の再注入で水増ししない。
- dist 直編集禁止。

## 検証

- `npm run build` PASS。
- `api/automation/tenmon_k1_general_completion_*_v1.*` の current-run プローブ。
