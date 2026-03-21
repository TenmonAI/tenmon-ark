# CURSOR_ACTION_BROKER_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH`  
**API:** `GET /api/audit/cursor-action-broker-v1` — **スキーマ提示のみ**（Cursor 実実行は行わない）  
**入出力:** `DecisionPlanV1` / `ExecutionDispatchV1` → **`CursorActionDispatchV1`**（`promptText` / `targetFiles` / `allowedActions` / `blockedActions` / `requiresHumanApproval` / `resultCapturePath` / `state`）  
**状態機械:** `cursor_idle` … `cursor_failed`（JSON で固定）  
**必須:** high-risk 自動 RUN 禁止、no-touch は broker で拒否、seal は本コンポーネント外  
**次カード:** `PROMPT_TO_CURSOR_COMPILER_V1`
