# TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_V1

## 目的

会話完成系・`chat.ts` 自己改善系・虚空蔵高速学習系・maintenance / improvement / supplement 系の **既存 verdict を読みだけ**、
**優先順位・next 1〜3 カード・pending・blocked** を一意に出す司令塔（本体改修は持たない）。

## 入力（既定の探索）

| 入力 | 既定パス / 環境変数 |
|------|---------------------|
| Runtime seal | `readlink -f /var/log/tenmon/card` または `TENMON_ORCHESTRATOR_SEAL_DIR` / `--seal-dir` |
| Kokuzo learning-improvement | `api/automation/out/tenmon_kokuzo_learning_improvement_os_v1` または `--kokuzo-out-dir` |
| 自己改善統合 | `seal/_self_improvement_os/integrated_final_verdict.json` または kokuzo 配下 `_learning_improvement_os/` |
| Residual focused | `seal/_self_improvement_os/residual/focused_next_cards_manifest.json` |
| Completion supplement | `seal/_completion_supplement/next_card_dispatch.json` |

## 実行

```bash
bash api/scripts/full_orchestrator_v1.sh
# または
python3 api/automation/full_orchestrator_v1.py --stdout-json
```

## 出力（`api/automation/out/tenmon_full_orchestrator_v1/`）

| ファイル | 内容 |
|----------|------|
| `TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_VPS_V1` | VPS マーカー |
| `full_orchestrator_manifest.json` | 入力パス・系統別メタ・typed blockers |
| `full_orchestrator_queue.json` | `next_queue`（最大 3）・`pending_queue`・`manual_apply_required` |
| `blocked_cards.json` | 前提欠落（例: seal 未解決）+ manual_apply 一覧 |
| `integrated_final_verdict.json` | 司令塔の統合スコア（ready / defer） |

## Blocker タイプ（集約）

- `surface` / `route` / `longform` / `density`
- `learning_input_quality` / `learning_seed_quality`
- `seal_contract`（runtime / governor / 構造欠落 等）

## 方針

- **タイプ優先順**は `full_orchestrator_v1.py` 内 `TYPE_PRIORITY`（seal_contract → surface → … → learning）
- **高リスクカード**は `next_queue` に載っても `auto_apply_allowed: false`（`manual_apply_required` に重複記載）
- 失敗時の Cursor 追従: `TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_RETRY_CURSOR_AUTO_V1`

## 関連

- Dispatch レジストリ: `api/automation/chat_ts_completion_dispatch_registry_v1.json`
- 自己改善 dispatch: `api/automation/self_improvement_os_dispatch_v1.json`
