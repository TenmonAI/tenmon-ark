# AUTO_BUILD_QUEUE_SCHEDULER_V1

## 目的

`card_catalog_v1.json`・`card_dependency_graph_v1.json`（DAG）・Human Gate ストアを参照し、**決定的**に「次に実行してよいカード」を選ぶ。`parallelPolicy = single_flight`（同時に `running` は最大 1 件）を強制する。

本カードは **api/automation のみ**（runner / supervisor / CLI）。`chat.ts`・`client/**`・DB スキーマ・`dist/**` には触れない。

## キュー状態（カード単位）

| 状態 | 意味 |
|------|------|
| `queued` | スケジューラが候補にできる（依存・single_flight を満たす場合） |
| `running` | 現在パイプライン実行中（スナップショット上） |
| `completed` | 正常終了 |
| `failed` | 異常終了（下流は `blocked` に連鎖しうる） |
| `blocked` | 上流 `failed` などにより実行不可 |
| `waiting_human_gate` | 人間承認待ち（gate ファイルが `approved` になると `queued` に戻る） |

## 永続化

- 優先: `TENMON_AUTO_QUEUE_ROOT`（ディレクトリ）
- 次: `/var/log/tenmon/auto_queue/`（書き込み可のとき）
- フォールバック: `api/automation/_queue/`（リポジトリ内、`.gitignore` でスナップショットはコミットしない）

スナップショット: `queue_snapshot_v1.json`  
スキーマ: `api/automation/queue_state_schema_v1.json`

## 決定論的な「次のカード」

1. Human Gate: `waiting_human_gate` かつ `gateRequestId` が承認済みなら `queued` に同期（`gateRequestId` は再実行用に保持しうる）。
2. `running` が 1 件でもあれば `nextCard` は `null`（`single_flight_busy`）。
3. 候補は `state == queued` かつ **全前置ノードが `completed`**（DAG の `before` → `after` は「after が before に依存」）。
4. 候補が複数あるときは **`cardName` の辞書順で最小**を選ぶ。

CLI 例:

```bash
python3 api/automation/queue_scheduler_v1.py --init
python3 api/automation/queue_scheduler_v1.py --next
python3 api/automation/queue_scheduler_v1.py --status
```

## Runner / Supervisor 連携

- 環境変数 `TENMON_QUEUE_ENABLED=1` または `--queue` で有効化。
- Runner（`auto_build_runner_v1.run_pipeline`）が `try_begin_card` / `finish_from_runner_record` でスナップショットを更新（`try` / `finally`）。
- Supervisor がフォールバックで `gateRequestId` を付与した場合、`attach_human_gate_request` で `waiting_human_gate` に整合させる。

## 受け入れ（このカード）

- JSON スキーマが `queue_snapshot_v1.json` と整合していること
- `--init` でスナップショットが保存されること
- 未完了の依存があるカードは `--next` で選ばれないこと
- Human Gate 承認前は `waiting_human_gate` のまま選ばれず、承認後に `queued` へ戻り得ること
- 同優先度での選択が辞書順で決定的であること
- `single_flight` が runner の begin と scheduler の `--next` の両方で守られること
- `cd api && npm run build` が成功すること
