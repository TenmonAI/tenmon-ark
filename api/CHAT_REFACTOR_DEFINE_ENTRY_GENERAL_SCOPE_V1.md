# CHAT_REFACTOR_DEFINE_ENTRY_GENERAL_SCOPE_V1

次工程の本実装に入る前に、define / entry / general の責務境界を 1 文書に固定する。stub を安全に実装ラインへ変えるための設計基準を明文化する。

## 1. baseline

- **current sealed baseline:** 80c1ddb
- **chat refactor handoff point:** 80c1ddb

## 2. 対象 stub

- `api/src/routes/chat_refactor/define.ts`
- `api/src/routes/chat_refactor/entry.ts`
- `api/src/routes/chat_refactor/general.ts`

## 3. define の責務

- define / scripture / definition fastpath
- 用語定義系の ku contract
- define 系 responsePlan の責務

## 4. entry の責務

- request body 解釈
- message / threadId / mode / profile の入口正規化
- reply 前の入力正規化

## 5. general の責務

- natural general shrink
- systemdiag / future / judgement / essence の general 系整理
- grounding selector / residual fallback の境界

## 6. import 方針

- chat.ts は薄い orchestrator に寄せる
- runtime 対象は必要最小の import に限定
- stub は将来 import されるが、このカードではコード変更しない

## 7. 実装順

- **A.** entry
- **B.** general
- **C.** define

## 8. non-negotiables

- routeReason を変えない
- PATCH29 acceptance を壊さない
- no-touch: `api/src/db/kokuzo_schema.sql`
- docs-only、このカードでは build/restart 不要

## 9. 次カード候補

- **CHAT_SAFE_REFACTOR_PATCH41_ENTRY_EXTRACTION_MIN_V1**
