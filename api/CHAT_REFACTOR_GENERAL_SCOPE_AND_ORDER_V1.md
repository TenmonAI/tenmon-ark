# CHAT_REFACTOR_GENERAL_SCOPE_AND_ORDER_V1

- **baseline:** 26de958
- **branch:** 2026-03-04-e5hp

## 1. general 系対象

次の範囲を general 再編の対象とする。

- systemdiag
- future
- judgement
- essence
- natural general shrink
- residual fallback

## 2. runtime 対象ファイル

| パス |
|------|
| `api/src/routes/chat.ts` |
| `api/src/routes/chat_refactor/majorRoutes.ts` |
| `api/src/routes/chat_refactor/finalize.ts` |
| `api/src/routes/chat_refactor/entry.ts` |
| `api/scripts/patch29_final_acceptance_sweep_v1.sh` |
| `api/scripts/chat_refactor_runner_v1.sh` |

## 3. 実装順

| 段階 | 内容 |
|------|------|
| A | general scope doc |
| B | systemdiag / future の抽出 |
| C | judgement / essence の抽出 |
| D | natural general shrink / residual fallback 整理 |
| E | general batch seal |

## 4. non-negotiables

- `routeReason` を変えない
- PATCH29 acceptance を壊さない
- no-touch: `api/src/db/kokuzo_schema.sql`
- docs-only 文書は必要に応じて個別 commit 可（コード変更と混同しない）

## 5. 次カード候補

- CHAT_SAFE_REFACTOR_PATCH49_GENERAL_SYSTEM_FUTURE_EXTRACT_V1
