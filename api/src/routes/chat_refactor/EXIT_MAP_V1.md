# EXIT_MAP_V1

主要出口種別（観測ログ `FINALIZE_EXIT_MAP_V1` の `exitKind` で固定）

- `reply`
- `gate_json` （`return res.json(__tenmonGeneralGateResultMaybe(...))`）
- `single_exit_gate_json` （`finalizeSingleExitV1(...)` 経由）
- `plain_json` （`return res.json({...})`）
- `grounded_reply` （`return reply(buildGroundedResponse(...))` または groundingMode 有りの reply）

観測ログ項目（ログ `[FINALIZE_EXIT_MAP_V1]` に出力）

- `routeReason`
- `routeClass`
- `answerLength`
- `answerMode`
- `answerFrame`
- `hasResponsePlan`
- `exitKind`
- `responseHead`

