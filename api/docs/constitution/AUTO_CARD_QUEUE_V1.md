# AUTO_CARD_QUEUE_V1

## 目的

主線 EXIT（`CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`）以降の次段構築を、**手動列挙ではなく公式の card queue** として固定する。

- `card_catalog_v1.json` の **`queueSpineV1.cards`**: 並び順付きスパイン（単一ソース）
- `card_dependency_graph_v1.json`: EXIT から `RESPONSE_FINALIZER_EXTRACT_V1` へ戻るまでの **DAG 辺**
- 各カードの **`nextOnPass`**: スパインと一致
- `queue_scheduler_v1.py`: 実行可能カード（queued かつ前件完了）を **スパイン順**で選び、同順位のみ辞書順

## スパイン先頭

`AUTO_CARD_QUEUE_V1` → `AUTO_CARD_RUNNER_V1` → … → `R10_CANON_GAP_SELF_LOOP_V1` → `RESPONSE_FINALIZER_EXTRACT_V1`

## 観測

- `python3 api/automation/queue_scheduler_v1.py --repo-root . --next` … `reason` = `queue_spine_v1_order_then_lexicographic`（該当時）
- `python3 api/automation/full_autopilot_v1.py --repo-root . --stdout-json` … `runNext.queueSpineV1`（`head` / `nextIncompleteInQueueSnapshot` / `cards`）

## 禁止

- `chat.ts` / `chat_refactor/**` / `chat_parts/**` / `client/**` / `dist/**` / `kokuzo_schema.sql` への変更（本カードの `forbiddenPaths`）

## 次カード

`AUTO_CARD_RUNNER_V1`
