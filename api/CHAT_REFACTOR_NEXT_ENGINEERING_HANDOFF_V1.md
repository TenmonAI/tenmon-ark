# CHAT_REFACTOR_NEXT_ENGINEERING_HANDOFF_V1

d7e0a52 を chat refactor sealed handoff point として明文化し、次工程へ安全に引き継ぐ。

## 1. current sealed baseline

**d7e0a52**

## 2. 封印列

dc74b17 → be3f7ff → 4615619 → 09824dc → 7be4039 → 259b979 → 6a29b55 → b4fe15a → d9bf4d9 → d7e0a52

## 3. runtime 対象

- `api/src/routes/chat.ts`
- `api/src/routes/chat_refactor/majorRoutes.ts`
- `api/src/routes/chat_refactor/finalize.ts`
- `api/src/routes/chat_refactor/entry.ts`
- `api/scripts/patch29_final_acceptance_sweep_v1.sh`
- `api/scripts/chat_refactor_runner_v1.sh`

## 4. no-touch

- `api/src/db/kokuzo_schema.sql`

## 5. 未追跡で封印列に含めないもの

- `probe*.json`
- `ABSTRACT_CENTER_*.txt`
- `CARD_*.md`
- `WORLD_CLASS_ANALYSIS_*`
- `FINAL_REPORT_V1`
- `RECONCILE_AUDIT_V1`
- `api/src/routes/chat_refactor/define.ts`
- `api/src/routes/chat_refactor/general.ts`

## 6. 次工程の優先候補

- **A.** define / general 実装（entry は封印済み）
- **B.** 会話主権の本流強化
- **C.** residual route fix / R22_SYSTEM_DIAGNOSIS_ROUTE_V1 の整理

## 7. 運用裁定

- chat refactor 系は **d7e0a52**（general バッチ P49/P50/P51 封印後）を handoff point とする。
- 以後の実装はこの点から分岐して進める。
- 本カードは docs-only のためコード変更は行わない。
