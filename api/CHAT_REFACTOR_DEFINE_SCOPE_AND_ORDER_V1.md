# CHAT_REFACTOR_DEFINE_SCOPE_AND_ORDER_V1

- **baseline:** 9b389ad
- **branch:** 2026-03-04-e5hp

## 1. define 系対象

次の範囲を define 再編の対象とする。

- define fastpath
- scripture / definition boundary
- define 系 ku contract
- define 系 responsePlan

## 2. 実装順

| 段階 | 内容 |
|------|------|
| A | define scope doc |
| B | define fastpath の最小抽出 |
| C | scripture boundary の整理 |
| D | define batch seal |

## 3. non-negotiables

- `routeReason` を変えない
- PATCH29 acceptance を壊さない
- no-touch: `api/src/db/kokuzo_schema.sql`
- docs-only 文書は必要に応じて個別 commit 可（コード変更と混同しない）

## 4. 次カード候補

- CHAT_SAFE_REFACTOR_PATCH58_DEFINE_FASTPATH_EXTRACT_V1
