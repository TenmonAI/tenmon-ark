# RUNTIME_MAINLINE_KERNEL_SEAL_V1

## 目的

`chat.ts` 幹・`gates_impl`・`client` に触れず、**mainline 表面・計画・補修・監査連携**の核だけを単独バッチで封印する。

## このバッチに含めるパス（コミット可能単位）

| 区分 | パス |
|------|------|
| planning | `api/src/planning/responsePlanCore.ts`（`*.bak` は対象外） |
| chat_refactor | `api/src/routes/chat_refactor/**`（finalize / general / humanReadable / majorRoutes / define / entry 等） |
| mainline forensic repair | `api/src/routes/mainlineCompletionForensicRepairV1.ts` |
| seed / meta 監査系 | `api/src/routes/seedLearningEffectAuditV1.ts`, `api/src/routes/metaOptimizerBundleV1.ts` |
| core 連携 | `api/src/core/conversationDensityLedgerRuntimeV1.ts`, `evolutionLedgerV1.ts`, `kokuzoSeedLearningBridgeV1.ts`, `selfLearningRuleFeedbackV1.ts` |

## 明示的除外（本バッチ禁止）

- `api/src/routes/chat.ts`
- `api/src/routes/chat_parts/gates_impl.ts`
- `client/**`
- `api/src/db/kokuzo_schema.sql`
- `dist/**`

## 検証コマンド（staged に幹が混ざっていないか）

```bash
git diff --cached --name-only | rg 'chat\.ts$|gates_impl|client/|kokuzo_schema'
# 出力なしであること
```

## 次カード

`CHAT_TRUNK_SEAL_AND_REAUDIT_V1`
