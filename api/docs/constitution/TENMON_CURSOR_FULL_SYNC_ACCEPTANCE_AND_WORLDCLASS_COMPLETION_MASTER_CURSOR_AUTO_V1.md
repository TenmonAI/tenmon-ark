# TENMON_CURSOR_FULL_SYNC_ACCEPTANCE_AND_WORLDCLASS_COMPLETION_MASTER_CURSOR_AUTO_V1

Cursor 完全同期 acceptance を親チェーンで判定し、会話autofixと最終受け入れまで接続する。

## 実行順

1. runtime execution contract
2. self build closed loop proof
3. repo hygiene final seal
4. operations autonomy
5. full sync acceptance gate（新規）
6. conversation worldclass autofix orchestrator（新規）
7. final completion/worldclass refresh
8. full sync worldclass final acceptance（新規）

FAIL 時は失敗 child の retry を1枚だけ生成して停止。

