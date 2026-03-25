# CHAT_TRUNK_CONTINUITY_SPLIT_V1

実装: `api/src/routes/chat_refactor/continuity_trunk_v1.ts` の `tryContinuityTrunkPreemptGatePayloadV1`（非同期）。

対象 routeReason: `R22_NEXTSTEP_FOLLOWUP_V1`, `R22_ESSENCE_FOLLOWUP_V1`, `R22_COMPARE_FOLLOWUP_V1`, `CONTINUITY_ANCHOR_V1`。

`chat.ts` は `await` + `res.json(__tenmonGeneralGateResultMaybe(...))` のみ。
