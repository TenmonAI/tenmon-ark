# CHAT_REFACTOR_NEXT_ENGINEERING_HANDOFF_V1

96ccc99 を chat refactor sealed handoff point として明文化し、次工程へ安全に引き継ぐ。

## 1. current sealed baseline

**96ccc99**

## 2. 封印列

dc74b17 → be3f7ff → 4615619 → 09824dc → 7be4039 → 29e4ef5 → 31f54ce → 96ccc99

## 3. runtime 対象

- `api/src/routes/chat.ts`
- `api/src/routes/chat_refactor/majorRoutes.ts`
- `api/src/routes/chat_refactor/finalize.ts`
- `api/scripts/patch29_final_acceptance_sweep_v1.sh`

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
- `api/src/routes/chat_refactor/entry.ts`
- `api/src/routes/chat_refactor/general.ts`

## 6. 次工程の優先候補

- **A.** define / entry / general 再編
- **B.** 会話主権の本流強化
- **C.** residual / general fallback の更なる削減

## 7. 運用裁定

- chat refactor 系は **96ccc99** を handoff point とする。
- 以後の実装はこの点から分岐して進める。
- 本カードは docs-only のためコード変更は行わない。
