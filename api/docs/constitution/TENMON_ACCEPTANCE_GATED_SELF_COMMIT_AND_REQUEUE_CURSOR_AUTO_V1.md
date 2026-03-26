# TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1

## 目的

**acceptance PASS 時だけ**封印用の commit メッセージ候補と、次カード用の **queue 投入候補**を生成する。FAIL 時は **commit 候補・requeue 候補を一切作らない**（成功の捏造なし）。初版は **自動 `git commit` しない**。

## 実装

- `api/automation/acceptance_gated_self_commit_and_requeue_v1.py`

## CLI

```bash
python3 api/automation/acceptance_gated_self_commit_and_requeue_v1.py \
  --build-probe-result path/to/build_probe_rollback_result.json \
  --patch-plan path/to/cursor_patch_plan.json \
  --remote-cursor-queue path/to/remote_cursor_queue.json \
  [--output-file path/to/acceptance_commit_requeue_summary.json]
```

## ゲート（すべて満たすこと）

- `cursor_patch_plan.json` の **`ok` が true**
- `build_probe_rollback_result.json` の **`overall_pass` と `acceptance_pass` が true**
- **`rollback_executed` が true でないこと**（ロールバック発生後に PASS とみなさない）

入力 JSON が読めない / オブジェクトでない場合は **FAIL**。

## 出力 `acceptance_commit_requeue_summary.json`

| フィールド | PASS | FAIL |
|------------|------|------|
| `commit_ready` | true | false |
| `requeue_allowed` | true | false |
| `commit_message_candidate` | 文字列 | `null`（候補を作らない） |
| `next_queue_item_candidate` | オブジェクト | `null` |
| `gate_reason` | null | 失敗理由コード |
| `next_on_pass` | 固定次カード ID | 同左（参考） |

`next_queue_item_candidate` は API 投入用の素案（`card_name` / `card_body_md` / `state: ready` 等）。**キュー JSON への自動追記はしない**（契約維持・手動または後段オーケストレータで投入）。

## 終了コード

`commit_ready` が true のとき 0、それ以外 1。

## nextOnPass

`TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1`

## nextOnFail

停止。acceptance gated retry 1 枚のみ。
