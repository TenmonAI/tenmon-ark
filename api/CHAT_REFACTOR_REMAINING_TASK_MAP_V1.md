# CHAT_REFACTOR_REMAINING_TASK_MAP_V1

- **baseline:** e6b1816
- **branch:** 2026-03-04-e5hp
- **no-touch:** `api/src/db/kokuzo_schema.sql`

## 完了済み（封印反映済み）

- entry batch
- general batch
- general implementation batch
- define implementation batch
- sealed runtime set / handoff 同期

## 残タスク（3系統へ圧縮）

### A. define/scripture boundary の最終残差

- define 側に残る scripture 境界判定・分岐の最終薄化
- routeReason / contract / 本文を不変で維持したまま整理

### B. residual / route sovereignty / NATURAL_GENERAL 最終掃除

- residual route の最終掃除
- NATURAL_GENERAL の主権固定（fallback 流入の最小化）
- acceptance を壊さない範囲で最小差分調整

### C. final handoff / final seal

- 残差解消後の handoff 最終同期
- sealed baseline / runtime set の最終封印

## 次カード候補（1つ）

- CHAT_SAFE_REFACTOR_PATCH65_RESIDUAL_FINAL_SWEEP_V1
